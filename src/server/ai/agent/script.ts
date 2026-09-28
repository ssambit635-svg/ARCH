/**
 * Python code the native engine can actually produce — fixed templates, numeric literals only.
 *
 * A template is never assembled from user text: the script body is a constant, and every value
 * interpolated into it has already been validated as a finite number (or a bounded list of them).
 * That is what makes "the model wrote a script, ARCH ran it" safe without a container runtime.
 *
 * `repairScript` is the deterministic half of the self-correction loop: when the engine is handed
 * "The code failed with this error: …", it applies a real static repair for the error class it
 * recognises, and returns null when it honestly cannot fix it (the loop then reports `exhausted`
 * instead of pretending).
 */

/** What the script answers, with code that is ready to execute. */
export type ScriptDraft = { title: string; code: string };

const MAX_NUMBERS = 500;

function numbersIn(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?/g) ?? [];
  return matches
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .slice(0, MAX_NUMBERS);
}

function format(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

function statsScript(values: number[]): ScriptDraft {
  const literal = `[${values.map(format).join(', ')}]`;
  return {
    title: 'Summary statistics',
    code: `"""ARCH agent — summary statistics over the values supplied in the prompt."""
values = ${literal}

count = len(values)
total = sum(values)
mean = total / count if count else 0
ordered = sorted(values)

def percentile(data, pct):
    if not data:
        return 0
    k = (len(data) - 1) * (pct / 100)
    low = int(k)
    high = min(low + 1, len(data) - 1)
    weight = k - low
    return data[low] * (1 - weight) + data[high] * weight

print(f"count={count}")
print(f"sum={total:g}")
print(f"mean={mean:g}")
print(f"min={ordered[0]:g}")
print(f"max={ordered[-1]:g}")
print(f"p50={percentile(ordered, 50):g}")
print(f"p95={percentile(ordered, 95):g}")
`,
  };
}

function errorRateScript(errors: number, total: number): ScriptDraft {
  return {
    title: 'Error rate',
    code: `"""ARCH agent — error rate calculation."""
errors = ${format(errors)}
total = ${format(total)}

if total <= 0:
    print("error_rate=undefined (total must be positive)")
else:
    rate = errors / total
    print(f"errors={errors}")
    print(f"total={total}")
    print(f"error_rate={rate:.6f}")
    print(f"error_percent={rate * 100:.4f}%")
`,
  };
}

function factorialScript(n: number): ScriptDraft {
  return {
    title: 'Factorial',
    code: `"""ARCH agent — factorial."""
n = ${format(Math.max(0, Math.trunc(n)))}

if n > 20:
    print(f"n={n}")
    print("result=too large for exact float display; computing iteratively anyway")
result = 1
for i in range(2, int(n) + 1):
    result *= i
print(f"{int(n)}! = {result}")
`,
  };
}

function fibonacciScript(n: number): ScriptDraft {
  const count = Math.max(1, Math.min(200, Math.trunc(n)));
  return {
    title: 'Fibonacci sequence',
    code: `"""ARCH agent — fibonacci sequence."""
count = ${count}

sequence = []
a, b = 0, 1
for _ in range(count):
    sequence.append(a)
    a, b = b, a + b
print(f"first {count} fibonacci numbers:")
print(", ".join(str(x) for x in sequence))
`,
  };
}

/**
 * Decide whether this prompt is a script task and, if so, produce the draft. Returns null when
 * the ask is not a bounded computation — the agent then answers normally (or the engine's
 * "use Code Assist" reply stands, depending on the surface).
 */
export function scriptForTask(task: string): ScriptDraft | null {
  const text = task.trim();
  if (!text) return null;
  const wantsScript = /\bpython\b|\bscript\b|\.py\b/i.test(text);
  if (!wantsScript) return null;
  // Production/feature code ("a function to retry requests") is Code Assist's job — the script
  // path only fires for bounded numeric/computational asks that can be verified by running them.
  if (/\b(?:function|class|api|endpoint|server|webhook|component|react|database query|sql query)\b/i.test(text)) return null;

  if (/\b(?:percentile|p95|p99|p50|median)\b/i.test(text)) {
    // Drop "p95" itself so 95 is not mistaken for one of the data points.
    const values = numbersIn(text.replace(/\bp\d+\b/gi, ' '));
    if (values.length >= 3) return statsScript(values);
  }
  if (/\b(?:error rate|failure rate|success rate|percentage)\b/i.test(text)) {
    // "12 out of 300", "12/300", "12 of 300"
    const ratio = /(\d+)\s*(?:out of|of|\/)\s*(\d+)/i.exec(text);
    if (ratio) {
      const errors = Number(ratio[1]);
      const total = Number(ratio[2]);
      if (Number.isFinite(errors) && Number.isFinite(total) && total > 0 && errors >= 0) return errorRateScript(errors, total);
    }
  }
  if (/\bfactorial\b/i.test(text)) {
    const n = numbersIn(text)[0];
    if (n !== undefined && n >= 0 && n <= 170) return factorialScript(n);
  }
  if (/\bfibonacci\b/i.test(text)) {
    const n = numbersIn(text)[0];
    if (n !== undefined && n > 0) return fibonacciScript(n);
  }
  if (/\b(?:average|mean|statistics|stats|sum)\b/i.test(text)) {
    const values = numbersIn(text);
    if (values.length >= 2) return statsScript(values);
  }
  return null;
}

/**
 * Deterministic repair for the fix round of the self-correction loop. Recognised error classes get
 * a real static fix; everything else returns null (the loop reports the honest outcome).
 */
export function repairScript(code: string, error: string): string | null {
  if (!code || !error) return null;

  // NameError: name 'X' is not defined  → add the stdlib import that defines it.
  const nameError = /NameError: name '([A-Za-z_]\w*)' is not defined/.exec(error);
  if (nameError) {
    const name = nameError[1]!;
    const stdlibImport: Record<string, string> = {
      math: 'import math',
      statistics: 'import statistics',
      json: 'import json',
      re: 'import re',
      os: 'import os',
      sys: 'import sys',
      random: 'import random',
      datetime: 'from datetime import datetime',
      Counter: 'from collections import Counter',
      defaultdict: 'from collections import defaultdict',
      heapq: 'import heapq',
      itertools: 'import itertools',
      functools: 'import functools',
    };
    // Names defined *inside* the math/statistics modules: "from math import sqrt" fixes sqrt(16)
    // where a bare "import math" would not.
    const MATH_NAMES = new Set(['sqrt', 'sin', 'cos', 'tan', 'log', 'log2', 'log10', 'exp', 'floor', 'ceil', 'pi', 'e', 'tau', 'degrees', 'radians', 'factorial', 'gcd', 'pow', 'trunc']);
    const STAT_NAMES = new Set(['mean', 'median', 'stdev', 'pstdev', 'variance', 'mode']);
    const importLine = stdlibImport[name] ?? (MATH_NAMES.has(name) ? `from math import ${name}` : STAT_NAMES.has(name) ? `from statistics import ${name}` : undefined);
    if (importLine && !code.includes(importLine)) {
      // Insert after the module docstring (if any) so PEP 257 style stays valid.
      const docstring = /^"""[\s\S]*?"""\n/.exec(code);
      const at = docstring ? docstring[0].length : 0;
      return `${code.slice(0, at)}${importLine}\n${code.slice(at)}`;
    }
    return null;
  }

  // SyntaxError / IndentationError → a broken statement cannot be repaired statically; the honest
  // answer is to regenerate a known-good skeleton only when the code still parses as a template.
  if (/SyntaxError|IndentationError/.test(error)) {
    // Common cause: a stray non-ASCII quote or an ellipsis placeholder in a generated line.
    const repaired = code
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/…\s*$/gm, '');
    if (repaired !== code && !/[“”‘’…]/.test(repaired)) return repaired;
    return null;
  }

  // ZeroDivisionError → guard the single division the traceback points at, when we can see it.
  if (/ZeroDivisionError/.test(error)) {
    const lineMatch = /line (\d+)/.exec(error);
    if (lineMatch) {
      const lines = code.split('\n');
      const index = Number(lineMatch[1]) - 1;
      const line = lines[index];
      if (line && /\/(?!=)/.test(line) && !line.includes('if ')) {
        lines[index] = line.replace(/^(.*?)([A-Za-z_][\w.\[\]]*)\s*\/\s*([A-Za-z_][\w.\[\]]*)(.*)$/, (_all, left, lhs, rhs, right) =>
          `${left}(${lhs} / ${rhs} if ${rhs} else 0)${right}`,
        );
        if (lines[index] !== line) return lines.join('\n');
      }
    }
    return null;
  }

  return null;
}
