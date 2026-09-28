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

**Code Assist → Thinker (`mode: "scaffold"`)** is always the native engine, even under
`arch-hybrid`. It classifies a short request (CRUD route, Zod schema, Prisma model, webhook,
status machine, unit test, React form), emits **one small snippet**, the **file path**, and
**what will break if you paste it blindly**. It is a support tool for humans and coding agents,
not a multi-file coding agent and not vibe-coding.

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
| **Code-fix knowledge** (optional) | `npm run model:fetch-code` → `model-data/code-corpus.jsonl` — SWE-bench / SWE-bench Verified (MIT) + ManySStuBs4J | code-fix drafts: "how real bugs like this were fixed" references and fix steps (code tasks only) |
| **Code-review knowledge** (optional) | `npm run model:fetch-review` → `model-data/review-corpus.jsonl` — ronantakizawa/github-codereview (MIT) + Microsoft CodeReviewer (Apache-2.0) | Code Assist grounding: what human reviewers said about similar code (code tasks only) |

The code/review corpora enrich retrieval for code tasks only (`CODE_FIX`, Code Assist). The four
incident tasks (summary / triage / status update / postmortem) always use the exact V2 knowledge
mix — team history + pattern library + public postmortems — so their behaviour and JSON contracts
(`EngineOutput`) are unchanged. Licenses and compliance: `docs/legal/TRAINING-DATA-LICENSES.md`;
the model's own license: `docs/legal/ARCH-MODEL-LICENSE.md`.

Models:
- **Category**: multinomial Naive Bayes over 22 categories (deploy, database, dns, certificate, …).
- **Severity**: Naive Bayes over LOW / MEDIUM / HIGH / CRITICAL. It starts from built-in examples and
  then learns *your* team's final severities.
- **Retrieval**: TF-IDF vectors (top 48 terms, L2-normalized) with cosine similarity.
- **Evaluation**: a deterministic 20% holdout (FNV hash of the document id). Accuracy is shown on
  `/dashboard/model` next to a majority-class baseline, so you can see whether it is actually learning.

With 342 public postmortems the category holdout accuracy is about **77% across 22 classes**. Training
takes about 200 ms and the artifact is about 550 KB of JSON, stored in `arch_models.artifact`.

**Tenancy:** every organization has its own model, trained only on its own incidents. The shared
corpora and pattern library are read-only and contain no customer data. A test asserts that one
organization's text never appears in another's artifact.

### Retraining is a background job (never inside a web request)

```
/dashboard/model "Retrain now"  ──or──  POST /api/copilot/model/train
        │  permission copilot.train + per-org rate limit
        ▼
  arch_model_jobs  (PENDING)            ← web request returns 202 here, nothing trained yet
        │  npm run worker claims the row (atomic update, multi-worker safe)
        ▼
  train candidate → score = 0.6·severityAcc + 0.4·categoryAcc (holdout)
        │
        ├─ beats the active model  → version ACTIVE, serves immediately
        └─ does not beat it        → version REJECTED (kept in the registry)
        ▼
  audit arch_model.train {version, promoted, score, previousVersion…}
```

**Model registry** (`arch_model_versions`): every training run is a row with its artifact, metrics
and evaluation. `status` is `ACTIVE` (serving), `SUPERSEDED` (was serving) or `REJECTED` (lost the
evaluation). `arch_models` is the pointer to the active version.

**Promotion rule:** the first trained model always serves; afterwards a candidate serves only if
its holdout score strictly beats the active model's (exact ties promote when the candidate was
trained on strictly more of the team's incidents). A losing run is still registered, so admins can
see *why* nothing changed.

**Rollback / manual activation:** any registry version can be put back in service —
`POST /api/copilot/model/rollback` (previous version) or
`POST /api/copilot/model/versions/:id/activate` (any version). Both write an `arch_model.activate`
audit entry with `fromVersion → version`, so the audit log shows which version was serving at any
time.

**Scheduled:** every `ARCH_MODEL_RETRAIN_MINUTES` (default 60) the worker enqueues jobs for
organizations that resolved incidents since their last training, then drains the queue. The CLI
equivalent is `npm run model:train`, which trains synchronously (a CLI process, not a web request).

## 3. What each Copilot task does on the ARCH model

| Task | How |
|---|---|
| Summary | Picks the highest-signal timeline sentences (cause, mitigation, metrics) plus the predicted category |
| Triage | Weighted vote: classifier (0.45 × confidence), error-rate bucket (0.4), impact words (0.35), severities of similar past team incidents (0.12 each) and inertia for the current severity (0.25). The rationale lists the evidence. The assignee choice uses the same opaque refs as before. |
| Status update | Status-aware, customer-safe templates. Internal details never go in, and the same scrubbing as before runs afterwards. |
| Postmortem | Timeline from real entries, impact from duration and signals. Root cause comes from causal sentences or, failing that, from the closest past incident (labelled as a hypothesis). Action items come from the pattern library and past approved postmortems. |
| **Code fix** (new) | Diagnoses a pasted stack trace or snippet (29 error signatures across Node, Python, Go, Java, .NET, Postgres and Kubernetes), then gives the first frame in your code, fixes and a patch when a safe mechanical fix exists |

### Chat with ARCH (`/dashboard/chat`)

The conversational surface of the same model. `src/server/ai/arch-model/chat.ts` is the pure
engine: it classifies the question (greeting, identity, open queue, recent history, incident
search, explain, stats, services, roster, runbook, lessons, advice, code request, concept, tech fact,
unknown), fills language-aware templates (English or Hinglish, matched to the question) and returns
`{answer, intent, confidence, citations, suggestions, lang}`. It has no database and no network —
the service hands it a snapshot.

General engineering questions ("which language is the oldest?", "what does 503 mean?", "what is the
CAP theorem?") are answered from `arch-model/tech-knowledge.ts` — the built-in pack — and carry a
`reference` citation so a reader can tell general knowledge from workspace knowledge. The router is
deliberately narrow: the pack is consulted for `concept_explain` (except the ops concepts that get
workspace-aware answers), `unknown`, and for definition questions that would otherwise be swallowed by
the `advice` or `explain_incident` intents. A matching floor and a workspace-marker check keep "our
cache incident yesterday" and "we keep seeing 503s after the deploy" on the incident path. Teaching it
a new topic means appending one entry to that file — no engine change, and the pack data is asserted
well formed (unique ids, resolvable related ids, both languages) in `tests/arch-chat-engine.test.ts`.

`src/server/services/archChat.service.ts` builds that snapshot per turn: status/severity counts
(open-only severity mix), the open queue (25, severity-sorted), the 25 newest resolved incidents,
services with open counts, the roster with assignment load, 30-day resolve durations and the
trained model. For retrieval-shaped intents it adds the model's own dense similarity search
(`similarDense`, team docs first at a 0.1 floor, pattern library and public postmortems behind) and
`retrieveKnowledge` over the workspace knowledge base. Learned details (category, root cause,
mitigation, prevention) come from the trained artifact's `team:` docs, so enriching an answer
costs zero extra queries. The corpus read behind retrieval is cached per organization for 8 s and
invalidated on ingest/reindex/delete.

Persistence is `ArchChatSession` / `ArchChatMessage` (migration `20260928000000_v8_arch_chat`),
always scoped to `(organizationId, userId)`; a session id that is not yours is a `404`. A turn
stores the user message, the ARCH message (with intent, confidence, citations, suggestions,
provider `arch`, model name and `latencyMs`) and bumps the session. Audit entries record shape
only — never the content. Code generation is refused by the engine itself (intent
`code_request`), not by a prompt, and the refusal points at Code Assist.

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

`npm run model:fetch-public|fetch-code|fetch-review` (or `model:fetch-all`) download to your
server at run time. **Nothing third-party is committed to this repository.** Every fetch writes
`model-data/datasets-manifest.json`, regenerates `model-data/THIRD-PARTY-NOTICES.md` and saves the
datasets' license texts under `model-data/licenses/`.

| Source | Licence | Used for |
|---|---|---|
| [danluu/post-mortems](https://github.com/danluu/post-mortems) | **none** (all rights reserved) | postmortem summaries + links |
| [icco/postmortems](https://github.com/icco/postmortems) | **GPL-3.0** | structured postmortem entries |
| [hjacobs/kubernetes-failure-stories](https://github.com/hjacobs/kubernetes-failure-stories) | **none** | Kubernetes failure index |
| [saystone/awesome-postmortem](https://github.com/saystone/awesome-postmortem) | **CC0** (per listing; index entries only) | famous outages index |
| [SWE-bench](https://github.com/princeton-nlp/SWE-bench) (+ Verified) | **MIT** | real issue→PR bug fixes (code-fix drafts) |
| [ManySStuBs4J](https://zenodo.org/records/3653444) | tool **Apache-2.0**; verify Zenodo record | Java buggy→fixed line pairs |
| [ronantakizawa/github-codereview](https://huggingface.co/datasets/ronantakizawa/github-codereview) | **MIT** | human review comments |
| [Microsoft CodeReviewer](https://huggingface.co/microsoft/codereviewer) | **Apache-2.0** | review comment ↔ code-change pairs |

The trained artifact keeps a 280-character snippet and the source URL per document. **Check these
licences before using the corpora commercially** — full analysis in
[`docs/legal/TRAINING-DATA-LICENSES.md`](../legal/TRAINING-DATA-LICENSES.md); the model's own
license is [`docs/legal/ARCH-MODEL-LICENSE.md`](../legal/ARCH-MODEL-LICENSE.md). The model works
without any of it: the pattern library is original ARCH text, and your own incidents are yours.

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
  arch-model/chat.ts        pure Chat with ARCH engine: intents, EN/Hinglish answers, citations,
                            conversational memory merge (typed > stored > account name)
  arch-model/tech-knowledge.ts  V10/V10.3 built-in tech knowledge pack: 161 general topics across 16
                            families (aliases + keywords + cues, EN/Hinglish, related) and the scored
                            matcher (alias phrase > cue > keyword, confidence floor so workspace
                            questions are never shadowed), plus the comparison composer
                            (matchTechComparison + techComparisonDigest) and the nearest-topic
                            suggester used by the "not in the pack" fallback
  code/analyzer.ts          language detection, stack-trace diagnosis, rules, safe fixes, scrubSecrets
  code/review.ts            Code Assist input/output
  arch-native.ts            AI_PROVIDER="arch" and the hybrid fallback wrapper
  local-llm.ts              Ollama / OpenAI-compatible local client, isLocalEndpoint, health check
src/server/services/archModel.service.ts   corpora, train/eval/promote, jobs, registry, status
src/server/services/archChat.service.ts    chat sessions + grounded turns (send, regenerate)
src/server/services/codeAssist.service.ts  Code Assist (+ retrieval over the code corpora)
src/server/repositories/archModel.repository.ts  active model + versions registry + job queue
src/server/repositories/archChat.repository.ts   chat sessions/messages, (organizationId, userId)-scoped
scripts/arch-model/  fetch-public-incidents.mjs · fetch-code-corpus.mjs · fetch-review-corpus.mjs
                     · lib/datasets.mjs · train.ts · eval.ts · export-finetune.ts
tests/arch-model.test.ts (pure) · tests/arch-copilot.test.ts + tests/arch-model-registry.test.ts (real DB)
tests/arch-chat-engine.test.ts (pure) · tests/arch-chat.test.ts (service, real DB)
```

Database tables (V3): `arch_models` (active pointer), `arch_model_versions` (registry —
migration `20260925180000_v3_model_registry`), `arch_model_jobs` (background training queue).
V8 adds `arch_chat_sessions` / `arch_chat_messages` (migration `20260928000000_v8_arch_chat`).
V9 adds `arch_chat_memory` (migration `20260928120000_v9_chat_memory`) — what ARCH remembers about
one member across conversations: name, role, tech stack and notes, one row per (organization, user),
editable and deletable by that member from the chat's Memory panel. It is *not* training data: only
approve/edit/dismiss feedback trains the model.

The rule from V2 still holds: **nothing in `src/server/ai/` touches the database or reads files.**
Services load data through tenant-scoped repositories and pass it in.

## 10. Honest limitations

- The native engine **does not write new prose**. It selects, classifies and fills templates. That
  makes it predictable and hard to make hallucinate, but its drafts — and chat answers — read like
  structured notes. Use `arch-hybrid` for fluent writing and real code rewrites. Chat deliberately
  stays on the native engine: for this audience, a grounded answer beats a fluent guess.
- Chat knows what its workspace has seen; it will not invent history. If your incidents are not
  resolved (or the model has not trained yet), "have we seen this before?" falls back to the
  pattern library and labels the difference.
- Accuracy grows with data. Below about 10 resolved incidents, severity accuracy is not measured
  and the model leans on built-in examples.
- Code Assist rules are heuristics. They catch common incident-causing patterns, not every bug, and
  are not a replacement for tests or a security review.
