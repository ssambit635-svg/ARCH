# ARCH Agent — planner, native tools, self-correction (V11)

> **What this is:** the agent layer that sits between a raw prompt and ARCH's native engine.
> Chain-of-thought planning through raw prompts, a plain dictionary of native functions, and a
> self-correction loop that runs generated Python in a sandboxed subprocess. **No external AI:
> no Ollama, no OpenAI, no Anthropic, no second model.** Everything below is TypeScript compiled
> into this repository (the loop's *runtime primitive* is the process spawner — the script it
> executes is plain Python 3).

Code: `src/server/ai/agent/` · Tests: `tests/agent-*.test.ts` + the agent cases in
`tests/arch-chat.test.ts`.

---

## 1. Task planning via raw prompts (`planner.ts`)

When a user submits a complex prompt the planner **intercepts it before the engine** and prefixes a
custom system prompt that forces chain-of-thought:

```text
<thinking> … what is being asked, what is known, what could go wrong … </thinking>
<plan><step>first step</step><step>next step</step></plan>
<answer> the final, user-facing answer only </answer>
```

- `needsPlanning()` decides interception deterministically: length, multi-part questions
  ("… and what should I do next?"), step-by-step/compare/migrate/debug phrasing, numbered lists,
  multiple question marks. Greetings and one-line status asks skip the loop entirely.
- `interceptPrompt()` returns the prompt plus the forced system prefix.
- `parsePlannedOutput()` **scans the output for exactly those tags**: thinking (kept private),
  ordered plan steps (bounded: 12 × 300 chars), and the answer with every tag stripped and clipped.
  Untagged replies degrade gracefully — everything becomes the answer, nothing leaks.

The plan is *managed*, not displayed: steps drive the loop, the member only ever sees the answer.

## 2. Native tool execution (`tools.ts`)

No LangChain, no plugin system — a standard dictionary of functions:

| Tool | Does | Guardrails |
|---|---|---|
| `calculator` | evaluates arithmetic (`12 * 8 + 4`, `sqrt(196) / 2`, `//`, `**`, `%`) | own recursive-descent parser — never `eval`, never a shell; identifiers outside a whitelist are rejected |
| `current_time` | current date/time, optional IANA timezone | validated through `Intl`, unknown zones rejected |
| `list_files` | lists the agent work directory | confined to `ARCH_AGENT_WORKDIR` (path-escape proof), sorted, capped |
| `read_file` | reads a text file | containment check first, credential-shaped names (`.env`, `*.pem`, `id_rsa`, …) refused, output passed through `redact()` and clipped |

The model is taught one JSON structure (`buildToolInstruction`):

```json
{"tool": "calculator", "arguments": {"expression": "12 * 8 + 4"}}
```

`parseToolCall()` pulls that object out of prose or fences; `executeToolCall()` validates the name
against the registry and runs it. **Errors are returned as text** (`Unknown tool …`,
`Path escapes the agent work directory …`) so they flow back to the engine as feedback instead of
crashing the turn.

## 3. The self-correction loop (`self-correct.ts`)

The spec, implemented:

1. `extractPythonCode()` pulls the ```python block out of the model's response.
2. `runPythonScript()` writes it to a **temporary `.py` file** (`os.tmpdir()/arch-agent-*/script.py`)
   and runs it with the **Python subprocess** (`python3`, falling back to `python`).
   - env is credential-free: `PATH`, `HOME`=temp dir, `PYTHONUNBUFFERED` — `DATABASE_URL`,
     `AUTH_SECRET` etc. are *not* passed (asserted by tests against the real test env);
   - hard timeout (default 5 s) with SIGKILL, output bounded to 20 k chars;
   - the temp directory is removed in a `finally`, every run.
3. If the subprocess fails, the exact error string is bundled into a new prompt and sent back:

   ````text
   The code failed with this error: <stderr | stdout | timeout note | exit code>. Fix it.

   Task: <original task>
   Previous attempt:
   ```python
   <failing code>
   ```
   ````

4. Repeat until the script exits 0 or `ARCH_AGENT_MAX_FIX_ATTEMPTS` (default 3) executions are
   spent — then the loop reports `exhausted` with the last error, never a fake success.

## 4. The loop itself (`loop.ts`)

`runAgentTurn()` runs one bounded turn (default 6 steps):

```
intercept (CoT prefix) → engine.generate → scan <thinking>/<plan>
  ├─ tool JSON?   → execute → feed "Tool result (name): …" back → next step
  ├─ python code? → self-correction loop → feed "Code execution result: …" back → next step
  │                (code executes at most once per turn — presentation re-embeds are never re-run)
  └─ neither      → final answer, tags stripped → done
```

Step budget exhausted → the last response is presented safely and the result is marked
`budget_exhausted`. The loop is model-agnostic: `AgentModel` is one function.

## 5. Who speaks the protocol (`native.ts`, `script.ts`)

ARCH's own engine answers under the protocol — there is no generative model behind it:

- first turn → thinking (from real analysis notes: intent, citations, retrieved counts) + plan +
  the grounded engine answer, **or** tool JSON when `detectToolRequest()` spots arithmetic/a file
  ask, **or** a Python block when `scriptForTask()` matches a bounded computation (p95/percentile,
  error rate, average/stats, factorial, fibonacci — numeric literals only, never interpolated user
  text);
- tool result fed back → final answer containing the exact result;
- fix prompt → `repairScript()` applies a real static repair for the error class it recognises
  (missing `from math import …`, smart-quote/ellipsis syntax slips, a visible division line) and
  **returns null when it honestly cannot fix it** — the loop then reports `exhausted`;
- script green → final answer with the code and its real output, labelled as verified.

`scriptForTask` deliberately refuses feature/production code ("a function to retry requests", API
endpoints): that is Code Assist's job. Chat's engine-level refusal for code requests is unchanged
(tests pin it); the script path only fires for bounded, runnable computations.

## 6. Where it runs for a user

Chat (`archChat.service.ts → runChatAgent`) intercepts when `needsPlanning(prompt)` **or** a tool
request **or** a script draft matches, runs exactly one agent turn (20 s budget), and falls back to
the untouched native answer if anything throws. `provider` stays `arch`; citations stay honest
(script answers replace the refusal wholesale and carry none).

```bash
# .env — the only agent knobs
ARCH_AGENT_WORKDIR="model-data"     # list/read confinement (never secrets)
ARCH_AGENT_MAX_FIX_ATTEMPTS="3"
```

The model dashboard (`/dashboard/model`) shows the "ARCH Agent (built in)" card: planner, tools,
self-correction — all native, no setup.

## 7. Security model (short version)

- **No network**: the loop, the tools and the engine are in-process; nothing to MITM, no key.
- **File tools**: containment (`path.relative` check) → secret-name refusal → `redact()` → clip.
- **Calculator**: grammar-level whitelist; `__import__`, `${…}`, `1; import os` are parse errors.
- **Python**: fixed templates with validated numeric literals only; temp dir; credential-free env;
  SIGKILL timeout; output caps; `finally` cleanup. The agent's `read`/`list` cannot reach outside
  `ARCH_AGENT_WORKDIR`, and the sandbox credential list (`sandbox.service.ts`) still applies to
  verification runs.
- **Rate limits/permissions**: the agent rides on chat's existing `copilot.generate` permission and
  per-organization rate limit.

## 8. Tests (the hard kind)

| File | Proves |
|---|---|
| `tests/agent-planner.test.ts` | interception heuristics, forced CoT prompt, tag scan incl. messy/partial/oversized outputs |
| `tests/agent-tools.test.ts` | expression parser + injection refusal, JSON structure parsing, registry execution, confinement/secret/redaction |
| `tests/agent-self-correct.test.ts` | **real Python**: pass, traceback, timeout kill, env scrubbing, temp cleanup; the exact fix prompt text; attempt budget; `no_code` |
| `tests/agent-loop.test.ts` | scripted generative models (tags, tool JSON, failing code), feedback transcripts, step budget, native protocol model states |
| `tests/arch-chat.test.ts` (agent block) | end to end on a real DB: tag-free complex answer, calculator result in the answer, **verified script with real output**, fast path untouched |
