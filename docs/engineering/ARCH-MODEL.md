# ARCH Model — ARCH's own AI (V3)

> **What this is:** ARCH Copilot and Code Assist without OpenAI or Anthropic. Incident data and code
> stay on your server. Free, CPU-only, no API key.
>
> **What this is not:** a from-scratch GPT/Claude-class language model. Nobody can train one of those
> for free on a CPU. ARCH combines (1) a small model it trains itself on your incidents with
> (2) an *optional* open-source LLM that runs on your own machine.

---

## 1. The two engines

| | `AI_PROVIDER="arch"` (default) | `AI_PROVIDER="arch-hybrid"` |
|---|---|---|
| What runs | **ARCH native model**: classifiers + retrieval + templates, in pure TypeScript | A local LLM (Ollama / llama.cpp) writes the draft, grounded on the ARCH model's knowledge |
| Hardware | Any server ARCH already runs on (a few MB of RAM per organization model) | 8–16 GB RAM, CPU only, with a 7B model at Q4 (default `qwen2.5-coder:7b`) |
| Latency | 5–100 ms | 10–90 s on CPU (the ARCH model answers if it takes longer than `LOCAL_LLM_TIMEOUT_MS`) |
| Network | none | only to `LOCAL_LLM_URL`, which must be a private or localhost address while `ARCH_OFFLINE_ONLY=true` |
| Quality | Factual and extractive. Every sentence comes from your timeline, your history or the curated pattern library. | Fluent, rewrites code, and follows instructions |
| Setup | none | `ollama pull qwen2.5-coder:7b` |

Both engines produce **the same JSON contracts**, validated by the same Zod schemas
(`src/server/ai/schemas.ts`) as the old vendor adapters. Everything that existed before still works
unchanged: drafts, human approval, audit, rate limits and redaction. `openai` and `anthropic` still
exist, but they are refused while `ARCH_OFFLINE_ONLY="true"` (the default).

```
                       ┌──────────── copilot.service / codeAssist.service ────────────┐
incident (tenant-      │ buildCopilotContext → redact → + attachment (secrets scrubbed)│
scoped repositories) ──▶ + knowledge = buildKnowledge(org's ARCH model, context)       │
                       │ buildPrompt ──▶ provider.generate ──▶ schema validation ──▶ draft
                       └───────────────────────────────┬──────────────────────────────┘
                                                       │
                     arch: archDraft(task, context)  ◀─┴─▶  arch-hybrid: local LLM
                     (no LLM, deterministic)                  └─ on error / timeout / invalid JSON
                                                                 → archDraft (fallback)
```

## 2. What the ARCH model learns

Training happens in `src/server/ai/arch-model/train.ts`. It is pure: no DB and no files. The service
`archModel.service.ts` gathers the data.

| Source | Where | Used for |
|---|---|---|
| **Your resolved incidents** | `incidents` + human timeline notes (Copilot-generated entries are excluded) + *approved* postmortems | severity classifier, similar-incident retrieval (root cause, fix, time to resolve), team statistics |
| **Pattern library** | `arch-model/knowledge.ts`: 44 failure patterns across 22 categories, written for ARCH (original text) | category classifier, fixes and prevention, and knowledge on day one |
| **Public postmortems** (optional) | `npm run model:fetch-public` → `model-data/public-incidents.jsonl` (git-ignored) | category classifier, "this looks like the 2017 X outage" references |

Models:
- **Category**: multinomial Naive Bayes over 22 categories (deploy, database, dns, certificate, …).
- **Severity**: Naive Bayes over LOW / MEDIUM / HIGH / CRITICAL. It starts from built-in examples and
  then learns *your* team's final severities.
- **Retrieval**: TF-IDF vectors (top 48 terms, L2-normalized) with cosine similarity.
- **Evaluation**: a deterministic 20% holdout (FNV hash of the document id). Accuracy is shown on
  `/dashboard/model` next to a majority-class baseline, so you can see whether it is actually learning.

With 342 public postmortems the category holdout accuracy is about **77% across 22 classes**. Training
takes about 200 ms and the artifact is about 550 KB of JSON, stored in `arch_models.artifact`.

**Tenancy:** every organization has its own row, trained only on its own incidents. The public
corpus and pattern library are shared, read-only and contain no customer data. A test asserts that
one organization's text never appears in another's artifact.

**Retraining:** the worker retrains organizations that resolved incidents since their last training,
every `ARCH_MODEL_RETRAIN_MINUTES` (default 60). OWNER/ADMIN can also click **Retrain now** on
`/dashboard/model`. The CLI equivalent is `npm run model:train`. Each training run writes an
`arch_model.train` audit entry.

## 3. What each Copilot task does on the ARCH model

| Task | How |
|---|---|
| Summary | Picks the highest-signal timeline sentences (cause, mitigation, metrics) plus the predicted category |
| Triage | Weighted vote: classifier (0.45 × confidence), error-rate bucket (0.4), impact words (0.35), severities of similar past team incidents (0.12 each) and inertia for the current severity (0.25). The rationale lists the evidence. The assignee choice uses the same opaque refs as before. |
| Status update | Status-aware, customer-safe templates. Internal details never go in, and the same scrubbing as before runs afterwards. |
| Postmortem | Timeline from real entries, impact from duration and signals. Root cause comes from causal sentences or, failing that, from the closest past incident (labelled as a hypothesis). Action items come from the pattern library and past approved postmortems. |
| **Code fix** (new) | Diagnoses a pasted stack trace or snippet (29 error signatures across Node, Python, Go, Java, .NET, Postgres and Kubernetes), then gives the first frame in your code, fixes and a patch when a safe mechanical fix exists |

## 4. Code Assist (`/dashboard/code`, `POST /api/copilot/code-review`)

Paste code or a stack trace and choose **Review**, **Fix** or **Explain**.

- `src/server/ai/code/analyzer.ts` runs 35+ checks covering the bugs that cause incidents: SQL
  injection, missing timeouts, swallowed errors, retry storms, hard-coded secrets, `SELECT *`,
  `await` in loops, bare `except`, `== None` and more. It also applies safe fixes automatically:
  timeouts, `===`, logging in empty catch blocks, and secrets replaced with env lookups.
- **Secrets:** the analyzer sees the raw code, so it can report them. Any LLM only ever receives
  `scrubSecrets(code)`. Improved code never contains the secret.
- **Stateless:** the code is not stored. The audit entry `copilot.code_review` records only mode,
  language, line count, finding counts and the model used.
- **Permissions and limits:** requires `copilot.generate` (RESPONDER+), shares the Copilot rate limit
  (20/min per organization) and accepts at most 20,000 characters.

## 5. Running a local LLM (optional, free, CPU)

```bash
# Option A — native install: https://ollama.com
ollama pull qwen2.5-coder:7b
# Option B — Docker (bound to 127.0.0.1 only)
docker compose --profile ai up -d
docker compose exec ollama ollama pull qwen2.5-coder:7b

# Optional tuned profile (low temperature, 8k context)
ollama create arch-copilot -f ai/Modelfile

# .env
AI_PROVIDER="arch-hybrid"
LOCAL_LLM_URL="http://127.0.0.1:11434"
LOCAL_LLM_MODEL="qwen2.5-coder:7b"      # or arch-copilot
```

`LOCAL_LLM_API="openai"` works with llama.cpp `llama-server`, LM Studio, vLLM and LocalAI.

| RAM | Suggested model | Licence |
|---|---|---|
| 8 GB | `qwen2.5-coder:3b`, `llama3.2:3b` | Qwen research licence (check it for commercial use) / Llama 3.2 community licence |
| **16 GB** | **`qwen2.5-coder:7b`** (default) | Apache-2.0 |
| 32 GB+ | `qwen2.5-coder:14b` | Apache-2.0 |

`/dashboard/model` shows whether the LLM is reachable and whether the model has been pulled.

## 6. Fine-tuning the local LLM on your incidents (optional)

```bash
npm run model:export-finetune -- --org <organization-slug>
# → model-data/finetune/<slug>.jsonl   (git-ignored; contains your incident history)
```

Each line is `{"messages":[system, user, assistant]}`: the exact prompt ARCH sends at runtime,
paired with a draft a responder **approved** (their edited text when they edited it) or, for triage,
the severity the team settled on. The format works with Unsloth, Axolotl and most LoRA tooling. You
need a few hundred examples before a LoRA is worth it; train it wherever you like (Colab or a rented
GPU for an hour), convert it to GGUF and point `FROM` in `ai/Modelfile` at it.

## 7. Public data: sources and licences

`npm run model:fetch-public` downloads to your server at run time. **Nothing third-party is
committed to this repository.**

| Source | Licence | Note |
|---|---|---|
| [danluu/post-mortems](https://github.com/danluu/post-mortems) | **none** (all rights reserved) | ~12k-star curated list of summaries |
| [icco/postmortems](https://github.com/icco/postmortems) | **GPL-3.0** | 240+ structured entries with categories |
| [hjacobs/kubernetes-failure-stories](https://github.com/hjacobs/kubernetes-failure-stories) | **none** | Kubernetes-specific incidents |

The trained artifact keeps a 280-character snippet and the source URL per document. **Check these
licences before using the public corpus commercially.** The model works without it: the pattern
library is original ARCH text, and your own incidents are yours.

## 8. Environment

| Variable | Default | |
|---|---|---|
| `AI_PROVIDER` | `arch` | `arch` · `arch-hybrid` · `mock` · `openai` · `anthropic` |
| `ARCH_OFFLINE_ONLY` | `true` | Refuses external vendors and non-private `LOCAL_LLM_URL` values |
| `LOCAL_LLM_URL` | `http://127.0.0.1:11434` | |
| `LOCAL_LLM_API` | `ollama` | or `openai` (OpenAI-compatible local servers) |
| `LOCAL_LLM_MODEL` | `qwen2.5-coder:7b` | |
| `LOCAL_LLM_TIMEOUT_MS` | `90000` | After this the ARCH model answers |
| `LOCAL_LLM_CONTEXT` | `8192` | `num_ctx` for Ollama |
| `ARCH_MODEL_DATA_DIR` | `model-data` | Public corpus and fine-tune exports (git-ignored) |
| `ARCH_MODEL_RETRAIN_MINUTES` | `60` | `0` = never (manual or CLI only) |

**Behind a TLS-intercepting proxy?** If `npm run model:fetch-public` fails with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, run it with
`NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`.

## 9. Code map

```
src/server/ai/
  arch-model/text.ts        tokenizer, stemming, stopwords, sentence tools
  arch-model/knowledge.ts   22 categories + 44 failure patterns + severity examples (original)
  arch-model/train.ts       Naive Bayes + TF-IDF training, holdout metrics, artifact format
  arch-model/runtime.ts     ArchModelRuntime: classify, similar; baseArchModel()
  arch-model/engine.ts      buildKnowledge + archDraft(task) for every Copilot task
  code/analyzer.ts          language detection, stack-trace diagnosis, rules, safe fixes, scrubSecrets
  code/review.ts            Code Assist input/output
  arch-native.ts            AI_PROVIDER="arch" and the hybrid fallback wrapper
  local-llm.ts              Ollama / OpenAI-compatible local client, isLocalEndpoint, health check
src/server/services/archModel.service.ts   training data, train/retrain, cache, status
src/server/services/codeAssist.service.ts  Code Assist
src/server/repositories/archModel.repository.ts
scripts/arch-model/  fetch-public-incidents.mjs · train.ts · eval.ts · export-finetune.ts
tests/arch-model.test.ts (pure) · tests/arch-copilot.test.ts (real DB)
```

The rule from V2 still holds: **nothing in `src/server/ai/` touches the database or reads files.**
Services load data through tenant-scoped repositories and pass it in.

## 10. Honest limitations

- The native engine **does not write new prose**. It selects, classifies and fills templates. That
  makes it predictable and hard to make hallucinate, but its drafts read like structured notes. Use
  `arch-hybrid` for fluent writing and real code rewrites.
- Accuracy grows with data. Below about 10 resolved incidents, severity accuracy is not measured
  and the model leans on built-in examples.
- Code Assist rules are heuristics. They catch common incident-causing patterns, not every bug, and
  are not a replacement for tests or a security review.
