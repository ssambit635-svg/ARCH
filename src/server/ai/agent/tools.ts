/**
 * Native tool execution — a plain registry of functions, no framework.
 *
 * The model is taught one JSON structure (`{"tool": …, "arguments": …}`); the main loop parses it
 * with `parseToolCall`, runs the matching entry from the dictionary with `executeToolCall`, and
 * feeds the result back into the conversation. There is no LangChain, no plugin loader and no
 * network tool: every entry is a Python-free, dependency-free function compiled into ARCH.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { redact } from '../guardrails';

export type ToolArguments = Record<string, unknown>;

export type ToolDefinition = {
  name: string;
  /** One line the model is shown when the tool instruction is built. */
  description: string;
  /** JSON-schema style parameter spec — the contract `arguments` must satisfy. */
  parameters: Record<string, { type: 'string' | 'number' | 'integer'; description: string; required?: boolean }>;
  /** Run it. Returns printable text (errors are returned, not thrown, so they feed back to the model). */
  execute(args: ToolArguments): Promise<string> | string;
};

export type ToolCall = { tool: string; arguments: ToolArguments };

export type ToolExecResult = { ok: boolean; result: string };

const MAX_RESULT_CHARS = 6_000;

function clipResult(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_RESULT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_RESULT_CHARS)}\n… (truncated, ${trimmed.length} chars total)`;
}

function missingParam(name: string): string {
  return `Tool call is missing the required argument "${name}".`;
}

// -------------------------------------------------------------------------------------------------
// calculator — own expression parser (never eval/Function, never shell)
// -------------------------------------------------------------------------------------------------

const ALLOWED_EXPRESSION = /^[-+*/%().,\d\s_a-z]+$/i;
const FUNCTIONS = new Set(['abs', 'min', 'max', 'round', 'floor', 'ceil', 'sqrt', 'pow']);
const CONSTANTS = new Map<string, number>([
  ['pi', Math.PI],
  ['e', Math.E],
]);

export type ExpressionResult = { ok: true; value: number } | { ok: false; error: string };

/**
 * Recursive-descent evaluator for arithmetic: numbers, + - * / % // **, parentheses, and a
 * whitelist of math functions. Anything else (identifiers, brackets, calls) is a hard error —
 * this is how a "calculate" tool stays free of `eval` and code execution.
 */
export function evaluateExpression(input: string): ExpressionResult {
  const expression = (input ?? '').trim();
  if (!expression) return { ok: false, error: 'Expression is empty.' };
  if (!ALLOWED_EXPRESSION.test(expression)) {
    return { ok: false, error: 'Expression may only contain numbers and arithmetic operators (+ - * / % // ** ( ) ).' };
  }

  let pos = 0;
  const fail = (message: string): ExpressionResult => ({ ok: false, error: message });

  const skip = () => {
    while (pos < expression.length && /\s/.test(expression[pos]!)) pos += 1;
  };

  const parseNumber = (): number | null => {
    skip();
    const match = /^(\d+(?:\.\d+)?|\.\d+)/.exec(expression.slice(pos));
    if (!match) return null;
    pos += match[0].length;
    return Number(match[0]);
  };

  const parsePrimary = (): number | null => {
    skip();
    if (pos >= expression.length) return null;
    const char = expression[pos]!;
    if (char === '(') {
      pos += 1;
      const value = parseExpression();
      if (value === null) return null;
      skip();
      if (expression[pos] !== ')') return null;
      pos += 1;
      return value;
    }
    if (char === '-' || char === '+') {
      pos += 1;
      const value = parsePrimary();
      return value === null ? null : char === '-' ? -value : value;
    }
    const number = parseNumber();
    if (number !== null) return number;
    const identifier = /^[a-z_]+/i.exec(expression.slice(pos));
    if (identifier) {
      const name = identifier[0].toLowerCase();
      pos += identifier[0].length;
      const constant = CONSTANTS.get(name);
      if (constant !== undefined) return constant;
      if (!FUNCTIONS.has(name)) return null;
      skip();
      if (expression[pos] !== '(') return null;
      pos += 1;
      const args: number[] = [];
      skip();
      if (expression[pos] !== ')') {
        for (;;) {
          const arg = parseExpression();
          if (arg === null) return null;
          args.push(arg);
          skip();
          if (expression[pos] === ',') {
            pos += 1;
            continue;
          }
          break;
        }
      }
      skip();
      if (expression[pos] !== ')') return null;
      pos += 1;
      return applyFunction(name, args);
    }
    return null;
  };

  const parsePower = (): number | null => {
    const base = parsePrimary();
    if (base === null) return null;
    skip();
    if (expression.startsWith('**', pos)) {
      pos += 2;
      const exponent = parsePower();
      if (exponent === null) return null;
      return base ** exponent;
    }
    return base;
  };

  const parseTerm = (): number | null => {
    let value = parsePower();
    if (value === null) return null;
    for (;;) {
      skip();
      // Floor division before the single-char operators: "//" would otherwise be read as "/" twice.
      if (expression.startsWith('//', pos)) {
        pos += 2;
        const right = parsePower();
        if (right === null) return null;
        value = Math.floor(value / right); // x//0 → ±Infinity, caught by the final finite check
        continue;
      }
      const operator = expression[pos];
      if (operator === '*' || operator === '/' || operator === '%') {
        pos += 1;
        const right = parsePower();
        if (right === null) return null;
        value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
        continue;
      }
      break;
    }
    return value;
  };

  const parseExpression = (): number | null => {
    let value = parseTerm();
    if (value === null) return null;
    for (;;) {
      skip();
      const operator = expression[pos];
      if (operator !== '+' && operator !== '-') break;
      pos += 1;
      const right = parseTerm();
      if (right === null) return null;
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const value = parseExpression();
  if (value === null) return fail(`Could not parse the expression: ${expression}`);
  skip();
  if (pos < expression.length) return fail(`Unexpected input at position ${pos}: ${expression.slice(pos, 20)}`);
  if (!Number.isFinite(value)) return fail('The result is not a finite number (division by zero or overflow).');
  return { ok: true, value };
}

function applyFunction(name: string, args: number[]): number {
  switch (name) {
    case 'abs':
      return Math.abs(args[0] ?? 0);
    case 'min':
      return Math.min(...(args.length ? args : [0]));
    case 'max':
      return Math.max(...(args.length ? args : [0]));
    case 'round':
      return args.length >= 2 ? Number(args[0]!.toFixed(args[1]!)) : Math.round(args[0] ?? 0);
    case 'floor':
      return Math.floor(args[0] ?? 0);
    case 'ceil':
      return Math.ceil(args[0] ?? 0);
    case 'sqrt':
      return Math.sqrt(args[0] ?? 0);
    case 'pow':
      return (args[0] ?? 0) ** (args[1] ?? 0);
    default:
      return Number.NaN;
  }
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(10)));
}

// -------------------------------------------------------------------------------------------------
// File tools — confined to a work directory, credentials refused, output redacted
// -------------------------------------------------------------------------------------------------

/** File names that must never be read by a tool, even inside the workdir. */
const SECRET_FILE_PATTERN = /(^|[/\\])(\.env|\.env\.[\w.-]+|[\w.-]*\.pem|[\w.-]*\.key|id_rsa|id_ed25519|[\w.-]*(?:credential|secret|password|passwd)[\w.-]*|[\w.-]*\.(?:p12|pfx|keystore|jks))$/i;

function resolveInside(workdir: string, relative: string): { ok: true; full: string } | { ok: false; error: string } {
  const base = path.resolve(workdir);
  const full = path.resolve(base, relative.replace(/^[/\\]+/, ''));
  const rel = path.relative(base, full);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) return { ok: true, full };
  return { ok: false, error: `Path escapes the agent work directory: ${relative}` };
}

export type NativeToolOptions = {
  /** Directory list/read are confined to. Relative paths resolve against process.cwd(). */
  workdir: string;
  now?: () => Date;
};

export function createNativeTools(options: NativeToolOptions): Record<string, ToolDefinition> {
  const workdir = options.workdir;
  const now = options.now ?? (() => new Date());

  const listFiles: ToolDefinition = {
    name: 'list_files',
    description: 'List files and folders inside the agent work directory (one level deep).',
    parameters: {
      path: { type: 'string', description: 'Sub-path inside the work directory. Omit for the root.' },
    },
    async execute(args) {
      const relative = typeof args.path === 'string' ? args.path : '';
      const resolved = resolveInside(workdir, relative);
      if (!resolved.ok) throw new Error(resolved.error);
      let entries: string[];
      try {
        // The agent workdir is runtime data, not a build-time asset to trace into deployments.
        const dirEntries = await fs.readdir(/* turbopackIgnore: true */ resolved.full, { withFileTypes: true });
        entries = dirEntries
          .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
          .sort((a, b) => a.localeCompare(b));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException | undefined)?.code;
        // A fresh install has no work directory yet — report that as a normal (friendly)
        // result instead of surfacing a raw ENOENT that would echo the server's absolute path.
        if (code === 'ENOENT') return `The directory "${relative || '.'}" does not exist yet — nothing to list.`;
        throw new Error(`Could not list "${relative || '.'}": ${code === 'EACCES' ? 'permission denied' : 'unreadable directory'}`);
      }
      if (!entries.length) return `No entries in "${relative || '.'}".`;
      return clipResult(`${relative || '.'} (${entries.length} entries):\n${entries.join('\n')}`);
    },
  };

  const readFile: ToolDefinition = {
    name: 'read_file',
    description: 'Read a text file from the agent work directory. Credentials and secrets are refused.',
    parameters: {
      path: { type: 'string', description: 'File path relative to the work directory (required).' },
      max_chars: { type: 'integer', description: 'Optional cap on characters returned (default 4000, max 8000).' },
    },
    async execute(args) {
      if (typeof args.path !== 'string' || !args.path.trim()) throw new Error(missingParam('path'));
      const relative = args.path.trim();
      // Containment first: nothing else matters until we know the path stays inside.
      const resolved = resolveInside(workdir, relative);
      if (!resolved.ok) throw new Error(resolved.error);
      if (SECRET_FILE_PATTERN.test(relative)) {
        throw new Error(`Refusing to read "${relative}": the file name looks like it holds credentials.`);
      }
      const cap = Math.min(Math.max(typeof args.max_chars === 'number' && Number.isFinite(args.max_chars) ? Math.floor(args.max_chars) : 4000, 100), 8_000);
      let raw: string;
      try {
        raw = await fs.readFile(/* turbopackIgnore: true */ resolved.full, 'utf8');
      } catch (error) {
        const code = (error as NodeJS.ErrnoException | undefined)?.code;
        if (code === 'ENOENT') throw new Error(`Could not read "${relative}": the file does not exist in the work directory.`);
        throw new Error(`Could not read "${relative}": ${code === 'EACCES' ? 'permission denied' : 'unreadable file'}`);
      }
      if (raw.includes('\0')) throw new Error(`"${relative}" looks like a binary file — refusing.`);
      // Redact credentials that happen to live in an allowed file, then clip.
      return clipResult(redact(raw.slice(0, cap * 2)).slice(0, cap));
    },
  };

  const calculator: ToolDefinition = {
    name: 'calculator',
    description: 'Evaluate an arithmetic expression, e.g. "12 * 8 + 4" or "sqrt(196) / 2".',
    parameters: { expression: { type: 'string', description: 'Arithmetic expression to evaluate (required).' } },
    execute(args) {
      if (typeof args.expression !== 'string' || !args.expression.trim()) throw new Error(missingParam('expression'));
      const result = evaluateExpression(args.expression);
      if (!result.ok) throw new Error(result.error);
      return formatNumber(result.value);
    },
  };

  const currentTime: ToolDefinition = {
    name: 'current_time',
    description: 'The current date/time, optionally in a specific IANA timezone.',
    parameters: { timezone: { type: 'string', description: 'IANA timezone like "UTC" or "Asia/Kolkata". Omit for server time.' } },
    execute(args) {
      const timezone = typeof args.timezone === 'string' && args.timezone.trim() ? args.timezone.trim() : undefined;
      const date = now();
      if (timezone) {
        try {
          const formatted = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZoneName: 'short',
          }).format(date);
          return `${formatted} (${timezone})`;
        } catch {
          throw new Error(`Unknown timezone "${timezone}". Use an IANA name like "UTC" or "Asia/Kolkata".`);
        }
      }
      return date.toISOString();
    },
  };

  return { calculator, current_time: currentTime, list_files: listFiles, read_file: readFile };
}

// -------------------------------------------------------------------------------------------------
// Teaching + parsing the JSON structure
// -------------------------------------------------------------------------------------------------

/** The exact JSON structure the model is taught to emit when it wants a tool. */
export function buildToolInstruction(tools: Record<string, ToolDefinition>): string {
  const catalogue = Object.values(tools)
    .map((tool) => {
      const params = Object.entries(tool.parameters)
        .map(([name, spec]) => `"${name}": ${spec.type}${spec.required ? ' (required)' : ''} — ${spec.description}`)
        .join('; ');
      return `- ${tool.name}: ${tool.description} Arguments: ${params || 'none'}`;
    })
    .join('\n');
  return `Native tools available on this server (run with this exact JSON structure, nothing else):\n${catalogue}\nTo call one, respond with a single JSON object and no prose: {"tool": "<name>", "arguments": {…}}`;
}

/**
 * Find the tool-call JSON structure in a model completion. Tolerates markdown fences and prose
 * around the object (models wrap things), but the structure itself must parse and look right —
 * anything else returns null and the loop treats the text as a normal answer.
 */
export function parseToolCall(text: string): ToolCall | null {
  const source = text ?? '';
  const marker = source.search(/"tool"\s*:/);
  if (marker === -1) return null;
  const start = source.lastIndexOf('{', marker);
  if (start === -1) return null;

  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const tool = record.tool ?? record.name;
  if (typeof tool !== 'string' || !tool.trim()) return null;
  const rawArgs = record.arguments ?? record.args ?? {};
  if (!rawArgs || typeof rawArgs !== 'object' || Array.isArray(rawArgs)) return null;
  return { tool: tool.trim(), arguments: rawArgs as ToolArguments };
}

/** Execute a parsed call against the registry. Errors come back as text so the model can react. */
export async function executeToolCall(call: ToolCall, tools: Record<string, ToolDefinition>): Promise<ToolExecResult> {
  const tool = tools[call.tool];
  if (!tool) {
    return { ok: false, result: `Unknown tool "${call.tool}". Available tools: ${Object.keys(tools).join(', ')}.` };
  }
  try {
    const result = await tool.execute(call.arguments);
    const text = typeof result === 'string' ? result : String(result);
    return { ok: true, result: clipResult(text) };
  } catch (error) {
    return { ok: false, result: `Tool "${call.tool}" failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// -------------------------------------------------------------------------------------------------
// Request detection (used by the native model to decide *which* tool to call)
// -------------------------------------------------------------------------------------------------

export type DetectedTool = ToolCall;

const QUESTION_PREFIX = /^(?:what(?:'s| is| are)?|calculate|compute|evaluate|eval|solve|kitna|hisaab|nateeja)\b[:\s]*/i;

/**
 * Detect a tool-worthy request inside a raw prompt. Arithmetic only fires when the expression
 * actually contains an operator (so "in 2024" is never a calculation), and file requests must
 * name a real file (or explicitly ask for a listing).
 */
export function detectToolRequest(input: string): DetectedTool | null {
  const text = input.trim();

  // --- arithmetic -------------------------------------------------------------------------
  // ISO dates ("2024-03-01") read as subtraction — blank them out before scanning for math.
  const candidate = text
    .replace(QUESTION_PREFIX, ' ')
    .replace(/[?.!]+$/, '')
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, ' ');
  const startMatch = /(?:\d+(?:\.\d+)?\s*(?:[-+*/%]|\*\*|\/\/)\s*)+(?:\d+(?:\.\d+)?|\()/.exec(candidate) ?? /(?:sqrt|abs|pow|floor|ceil)\s*\(/i.exec(candidate);
  if (startMatch) {
    const expression = consumeExpression(candidate.slice(startMatch.index));
    if (expression && /[-+*/%]|\*\*|\/\/|\b(?:sqrt|abs|pow|floor|ceil|round|min|max)\b/.test(expression)) {
      const evaluated = evaluateExpression(expression);
      if (evaluated.ok) return { tool: 'calculator', arguments: { expression } };
    }
  }

  // --- clock (only when a timezone is named; bare date/time asks stay on the engine) -------
  if (/\b(?:time|date|samay|waqt)\b/i.test(text)) {
    const tz = /\b([A-Za-z][A-Za-z+-]+\/[A-Za-z][\w+-]+(?:\/[A-Za-z][\w+-]+)*)\b/.exec(text);
    if (tz) return { tool: 'current_time', arguments: { timezone: tz[1]! } };
  }

  // --- files ------------------------------------------------------------------------------
  const wantsList = /\b(?:list|show|display|konsi|kitni)\b[^.?!]{0,40}\bfiles?\b|\bfiles?\s+(?:in|ki list|present)\b/i.test(text);
  if (wantsList) return { tool: 'list_files', arguments: {} };
  const fileMatch = /[\w./\\-]+\.(?:txt|md|json|log|csv|tsv|ya?ml|toml|ini|ts|js|py|sh)\b/i.exec(text);
  if (fileMatch && /\b(?:read|open|show|display|fetch|dekha|padh)\b/i.test(text)) {
    return { tool: 'read_file', arguments: { path: fileMatch[0].replace(/^\.?\//, '') } };
  }
  return null;
}

/**
 * Take the longest valid arithmetic prefix of `slice`: digits, operators, parentheses, and known
 * math identifiers only. Prose after the expression ("12 * 8 + 4 and explain…") stops the scan at
 * the first unknown word, so real calculations are caught without swallowing the sentence.
 */
function consumeExpression(slice: string): string | null {
  const token = /\s*(?:(\d+(?:\.\d+)?)|([+\-*/%,()]|\*\*)|([A-Za-z_]+))/y;
  let out = '';
  let depth = 0;
  let index = 0;
  while (index < slice.length) {
    token.lastIndex = index;
    const match = token.exec(slice);
    if (!match || (match[1] === undefined && match[2] === undefined && match[3] === undefined)) break;
    if (match[1] !== undefined) {
      out += match[1];
    } else if (match[2] !== undefined) {
      if (match[2] === '(') depth += 1;
      if (match[2] === ')') {
        if (depth === 0) break;
        depth -= 1;
      }
      out += match[2];
    } else if (match[3] !== undefined) {
      const name = match[3].toLowerCase();
      if (!new Set(['sqrt', 'abs', 'pow', 'floor', 'ceil', 'round', 'min', 'max', 'pi', 'e']).has(name)) break;
      out += name;
    }
    index = token.lastIndex;
  }
  const expression = out.trim().replace(/\s+/g, ' ').replace(/^[,+\-*/%]+/, '');
  return expression || null;
}
