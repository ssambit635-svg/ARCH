# AI guardrails — what ARCH is allowed to do, and where that is enforced

ARCH ships three AI surfaces: **Copilot** (incident drafts), **Code Assist** (review + fixes) and the
**ARCH model** (ARCH's own classifier, trained on your incidents). Every one of them is a *draft
machine*. This document lists the rules, the exact place each one is enforced in code, and the test
that would fail if it stopped being true.

If you change one of these files, the corresponding test is the contract. Do not "fix" a failing
guardrail test by weakening the rule.

## 0. The one-paragraph version

Nothing ARCH writes is applied without a human pressing approve. Nothing leaves your infrastructure
unless you explicitly point Copilot at an external provider — and `ARCH_OFFLINE_ONLY=true` blocks
that by default. Optional generative chat is private-only: it can call a private local model endpoint,
never a public chat API. Model calls are rate-limited, audited and time-bounded; Copilot vendor
contexts are redacted, while chat gets a bounded personal transcript and selected tenant-scoped
retrieval (not account email or other members' data). ARCH does not browse the internet while a
responder is waiting. Code that ARCH writes is only ever executed inside a throwaway sandbox with
no credentials, and a fix is only called *verified* when a generated test fails before the patch
and passes after it.

## 1. Drafts are drafts

| Rule | Enforced in | Test |
| --- | --- | --- |
| An AI suggestion is `PENDING` until a human reviews it; there is no code path that applies one automatically. | `src/server/services/copilot.service.ts` (`approveSuggestion` / `dismissSuggestion`), `src/server/services/verifiedFix.service.ts` | `tests/copilot.test.ts`, `tests/verified-fix.test.ts` |
| Only the reviewer's decision moves the status, and a second reviewer cannot re-decide the same draft. | `aiSuggestionRepository.review` (compare-and-set on `PENDING`) | `tests/copilot.test.ts` |
| A PR is opened only after a human approves a verification, never on generation. | `verifiedFix.service.ts` | `tests/verified-fix.test.ts` |
| Customer-facing drafts have internal hostnames and IPs stripped. | `sanitizeCustomerText()` in `src/server/ai/guardrails.ts` | `tests/copilot-guardrails.test.ts` |

## 2. Minimal, org-scoped context

| Rule | Enforced in | Test |
| --- | --- | --- |
| A Copilot provider receives only the incident, its timeline, its service, and a bounded number of similar incidents — never the org's whole history. | `LIMITS` in `src/server/ai/guardrails.ts` (`maxTimelineEntries: 60`, `maxSimilarIncidents: 4`, `maxContextChars: 16_000`), `buildContext()` in `src/server/ai/context.ts` | `tests/copilot-guardrails.test.ts` |
| Chat generation receives a bounded conversation, explicitly stored member memory and selected tenant-scoped evidence; account email and other members' data are excluded. | `buildUserPrompt()` in `src/server/ai/arch-model/chat-agent.ts`, `answerQuestion()` in `archChat.service.ts` | `tests/arch-chat-agent.test.ts`, `tests/arch-chat.test.ts` |
| Every repository takes `organizationId` as a required first parameter; a row belonging to another org is not readable. | all of `src/server/repositories/*` | `tests/tenant-isolation.test.ts`, `tests/v6-rag-learning.test.ts` |
| Copilot credentials and personal fields are redacted *before* the text reaches a provider, local or remote. Chat is sent only to a private local model endpoint. | `redact()` in `src/server/ai/guardrails.ts`, `getLocalChatModel()` in `local-chat.ts` | `tests/copilot-guardrails.test.ts`, `tests/local-chat.test.ts` |
| Similar incidents and retrieved knowledge are always filtered to the caller's organization. | `retrieveKnowledge()` in `src/server/services/knowledge.service.ts`, `insights.service.ts` | `tests/v6-rag-learning.test.ts`, `tests/arch-chat.test.ts` |

## 3. Pure domain logic; narrow IO adapters

The classifiers, retrieval ranking, prompt planning and answer composition stay pure: they do not
import a database client, repository or filesystem API. Database reads and tenant-scoped context
assembly live in services. Network access is limited to explicit provider adapters: Copilot's
configured provider, the private-only local chat adapter, and human-triggered knowledge fetches.

| Rule | Enforced in | Test |
| --- | --- | --- |
| No `@/lib/db`, `fs`, or repository imports under `src/server/ai/`. | code review + the module boundaries in `train.ts`, `runtime.ts`, `embeddings.ts`, `chunking.ts`, `retrieve.ts`, `risk.ts`, `reproduction.ts` | `tests/arch-model.test.ts`, `tests/arch-rag.test.ts`, `tests/arch-eval.test.ts` |
| Provider network IO is isolated to adapters; hybrid chat accepts only a private `LOCAL_LLM_URL` and refuses redirects. | `src/server/ai/local-llm.ts`, `src/server/ai/local-chat.ts`, `getLocalChatModel()` | `tests/local-chat.test.ts`, `tests/copilot-guardrails.test.ts` |
| DB reads and tenant context assembly stay in services; public-document fetch is human-triggered and SSRF-guarded. | `src/server/services/*`, `knowledge.service.ts` | `tests/v6-rag-learning.test.ts`, `tests/arch-chat.test.ts` |

## 4. Bounded calls

| Rule | Value | Enforced in | Test |
| --- | --- | --- | --- |
| Per-attempt timeout | 15 s (`AI_TIMEOUT_MS`) | `callWithGuardrails()` in `src/server/ai/guardrails.ts` | `tests/copilot.test.ts` |
| Retries | 1 (`LIMITS.attempts = 2`) | same | `tests/copilot.test.ts` |
| Per-organization rate limit | 20 calls/min (`AI_RATE_LIMIT_PER_MINUTE`) | `enforceRateLimit(copilotRateLimitKey(organizationId), …)` in `copilot.service.ts` | `tests/copilot.test.ts` |
| Context size | 16 000 chars, 60 timeline entries, 4 similar incidents | `LIMITS` | `tests/copilot-guardrails.test.ts` |

## 5. Where the data can go

| Rule | Enforced in | Test |
| --- | --- | --- |
| `ARCH_OFFLINE_ONLY=true` (the default) refuses every external AI vendor. | `src/server/ai/provider.ts` | `tests/copilot-guardrails.test.ts` |
| A local LLM URL must resolve to a private address; a public `LOCAL_LLM_URL` is refused while offline-only is on. | `isLocalEndpoint()` in `src/server/ai/local-llm.ts`, checked in `provider.ts` | `tests/copilot-guardrails.test.ts` |
| Switching to an external provider is an explicit, audited configuration change — not something a request can do. | `env.AI_PROVIDER` + `ARCH_OFFLINE_ONLY` in `src/lib/env.ts` | — |
| The native classifier/retriever runs in-process. Optional chat generation calls only a private local adapter; it never sends chat to a public model service. | `src/server/ai/arch-model/chat.ts`, `chat-agent.ts`, `local-chat.ts` | `tests/arch-model.test.ts`, `tests/local-chat.test.ts`, `tests/arch-chat-agent.test.ts` |

## 6. Audit

| Rule | Enforced in |
| --- | --- |
| Every generate is audited (`copilot.generate`) with the task, the provider, the model and the latency. | `copilot.service.ts` |
| Every approve and every dismiss is audited (`copilot.approve` / `copilot.dismiss`), including what was applied. | `copilot.service.ts` |
| Every public-document fetch is audited (`knowledge.fetch`), and so is every delete and re-index. | `knowledge.service.ts` |
| Every training run, promotion, rejection, rollback and drift finding is audited (`arch_model.*`). | `archModel.service.ts` |
| Incident corrections are audited (`arch_model.feedback`); private chat sends, regenerations and ratings log shape only, never question/answer text. Chat ratings are not training examples. | `modelLearning.service.ts`, `archChat.service.ts` | `tests/arch-chat.test.ts` |
| A generated patch is only executed in the sandbox, and the run is audited with its evidence hash. | `sandbox.service.ts`, `verifiedFix.service.ts` |

## 7. V6 — knowledge retrieval and fetching

RAG exists so Copilot can cite *your* runbooks instead of guessing. The risk it introduces is not
"the model reads something wrong" — it is "the model fetches something it should not".

| Rule | Enforced in | Test |
| --- | --- | --- |
| **No fetching at inference time.** Retrieval is a local read of chunks already embedded in your Postgres. `fetchKnowledgeUrl` is only reachable from a human-triggered action or the `knowledge:fetch` script. | `retrieveKnowledge()` (DB only) vs `fetchKnowledgeUrl()` (action only) in `knowledge.service.ts` | `tests/v6-rag-learning.test.ts` |
| `http`/`https` only; no credentials in the URL; `file:`, `ftp:`, `gopher:` etc. refused. | `assertPublicUrl()` | `tests/v6-rag-learning.test.ts` |
| Localhost, `.internal`, `.local`, and every private / loopback / link-local / CGNAT address the DNS record resolves to are refused — this is the SSRF guard, and it resolves *all* A records, not just the first. | `assertPublicUrl()` | `tests/v6-rag-learning.test.ts` |
| At most 3 redirects, and each hop is re-checked against the same rules. | `fetchKnowledgeUrl()` | `tests/v6-rag-learning.test.ts` |
| 10 s timeout, 2 MB cap, `text/plain` / `text/html` / `application/xhtml` only, and the HTML is stripped of `script`/`style` before chunking. | `KNOWLEDGE_LIMITS`, `htmlToText()` | `tests/v6-rag-learning.test.ts` |
| 10 fetches per minute per organization, and every fetch is audited. | `enforceRateLimit` + `writeAudit` | `tests/v6-rag-learning.test.ts` |
| The whole fetch path is disabled by `ARCH_OFFLINE_ONLY`. | `knowledgeFetchEnabled()` | `tests/v6-rag-learning.test.ts` |
| A citation must clear a relevance floor before Copilot may cite it; below the floor it says it has no source. | `isCitable()` in `src/server/ai/rag/retrieve.ts` | `tests/arch-rag.test.ts` |
| Retrieved passages are labelled as knowledge, and a hypothesis stays a hypothesis in the draft. | `copilot.service.ts` (draft text), `tests/arch-copilot.test.ts` | — |

## 8. V6 — generated code and reproduction

| Rule | Enforced in | Test |
| --- | --- | --- |
| A patch is never executed anywhere but a sandbox with no production credentials, a hard timeout, and an escape check. | `sandbox.service.ts` | `tests/verified-fix.test.ts` |
| Destructive commands (`rm -rf /`, fork bombs, disk wipes, credential exfiltration) are rejected before execution. | safety rules in `sandbox.service.ts` | `tests/verified-fix.test.ts`, `tests/v6-rag-learning.test.ts` |
| A generated test may not escape the sandbox working directory (`../../etc/passwd`). | `reproduction.ts` path check | `tests/v6-rag-learning.test.ts` |
| **A fix is only `PASSED` when the generated test fails before the patch and passes after it.** A test that never failed is not evidence. | `reproduction.ts` + `verifyFix` in `verifiedFix.service.ts` | `tests/v6-rag-learning.test.ts` |
| When the repository contents at the pinned commit cannot be read, the run falls back to patch-only verification and records `reproduction.ran = false` with the reason. ARCH never guesses. | `verifiedFix.service.ts` | `tests/v6-rag-learning.test.ts` |
| The panel shows the reproduction evidence (fail-before / pass-after) next to the patch, so a reviewer can see the proof rather than trust the badge. | `src/components/incidents/verified-fix-panel.tsx` | — |

## 9. V6 — learning from humans

| Rule | Enforced in | Test |
| --- | --- | --- |
| A human correction outranks the model's own guess: feedback trains at 3× weight. | `trainArchModel(input, { feedback })` in `src/server/ai/arch-model/train.ts` | `tests/v6-rag-learning.test.ts` |
| Approving, editing or dismissing a draft records feedback; a severity override records one too, computed by re-classifying the incident after the fact. | `copilot.service.ts`, `incident.service.ts` → `modelLearning.service.ts` | `tests/v6-rag-learning.test.ts` |
| Learning failures never break the responder's flow — every write is wrapped and logged. | `save()` in `modelLearning.service.ts` | — |
| A candidate model that regresses on measured holdout accuracy is flagged as drift and never promoted. | `detectDrift()` in `archModel.service.ts` | `tests/v6-rag-learning.test.ts` |
| Promotion requires beating the serving model on the promotion score; a tie is not a promotion. | `trainOrganizationModel()` | `tests/arch-model-registry.test.ts` |

## 10. V6 — deploy-risk prediction

| Rule | Enforced in | Test |
| --- | --- | --- |
| A risk score is a ranking aid, never a gate: nothing blocks a deploy or a rollback because of it. | `changeRisk.service.ts` + `src/app/dashboard/incidents/new/page.tsx` | `tests/arch-rag.test.ts` |
| With fewer than 20 changes or no incidents in the window, ARCH reports `fallback` and says it does not know. | `scoreChangeRisk()` in `src/server/ai/arch-model/risk.ts` | `tests/arch-rag.test.ts` |
| The features are categorical (type, hour bucket, weekday, size bucket, author kind, service, family) — no individual engineer is profiled beyond "human vs bot". | `changeFeatures()` | `tests/arch-rag.test.ts` |

## 11. Honest limitations

- **The ARCH model is small and shallow.** Naive Bayes over TF-IDF features: fast, auditable, and
  wrong in ways a transformer would not be. It is there so the product works with no GPU, no vendor
  and no bill — not because it is state of the art. See `docs/engineering/ARCH-MODEL.md` §10.
- **Calibration is a single temperature** fitted on your holdout. It fixes systematic
  over-confidence; it does not make every individual prediction honest.
- **Retrieval is lexical plus a small dense index**, not a vector database. With a few thousand
  chunks that is fine; it is not built for millions.
- **The reproduction test is generated from the diagnosis**, so it tests what ARCH *believes* is
  wrong. It proves the patch fixes *that*, not that the diagnosis was right.
- **The fetcher is an SSRF surface by design.** It is guarded, audited, rate-limited and off by
  default in offline mode — but if you add a new network call anywhere in ARCH, the same guard has
  to apply, and this document has to gain a row.
