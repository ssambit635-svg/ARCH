# ARCH — V2 Agent Context (AGENTS-V2.md)

Read AGENTS.md first (V1 spec still applies). This file defines V2.

## V2 goal
Add ARCH Copilot (AI assistance inside the incident workspace) +
Slack/status-page improvements. Nothing else.

## New environment variables
AI_API_KEY=""            # OpenAI or Anthropic key
AI_PROVIDER="openai"     # switchable adapter
AI_MODEL="gpt-4o-mini"   # default model
AI_MAX_TOKENS="1000"
AI_TIMEOUT_MS="15000"

## New data model (Prisma additions)
- AiSuggestion(id, organizationId, incidentId, type, promptTokens,
  completionTokens, model, status[PENDING|APPROVED|DISMISSED],
  output Json, createdById, createdAt, reviewedById, reviewedAt)
- Add enum AiSuggestionType: SUMMARY | TRIAGE | STATUS_UPDATE | POSTMORTEM

## New API routes
POST   /api/incidents/:id/copilot/summary      # OWNER/ADMIN/RESPONDER
POST   /api/incidents/:id/copilot/triage
POST   /api/incidents/:id/copilot/status-draft
POST   /api/incidents/:id/copilot/postmortem
GET    /api/incidents/:id/copilot/suggestions
POST   /api/copilot/suggestions/:id/approve
POST   /api/copilot/suggestions/:id/dismiss
POST   /api/integrations/slack/oauth-callback   # P1
POST   /api/status-pages/:id/subscribe          # P1

## Copilot architecture
src/server/ai/
  provider.ts        # interface: generate(system, user): Promise<string>
  openai.ts          # implementation
  anthropic.ts       # implementation
  prompts.ts         # all prompt templates live HERE only
  guardrails.ts      # redaction, size limits, timeout

Flow: route → permission check (existing permissions.ts) →
build MINIMAL tenant-scoped context → guardrails.redact() →
provider.generate() → persist AiSuggestion (status=PENDING) →
return draft to UI → human approves/dismisses.

## Hard rules for AI code
1. AI output is ALWAYS a draft. Never auto-apply to incidents,
   status pages, or notifications. Human approval required.
2. Send ONLY the minimum context: incident title, severity,
   timeline entries. NEVER send: passwords, tokens, API keys,
   other organizations' data, full database rows.
3. All context MUST be scoped by organizationId via existing
   repositories — no raw queries in ai/.
4. Every AI call: 15s timeout, retry once, then surface a
   friendly error. Log token usage on AiSuggestion.
5. Per-org rate limit: 20 AI calls/minute (reuse rate-limiter).
6. Every generate + approve/dismiss writes an audit log entry.
7. AI calls must work in dev with AI_PROVIDER="mock"
   (returns canned text) so tests don't need a real API key.
8. Prompts never interpolate user input directly — pass as
   labeled variables to prevent prompt injection.

## Acceptance criteria
- Summary: given an incident with ≥5 events, returns ≤5 bullets, <10s.
- Triage: returns {severity, assigneeId} suggestion; assigneeId must
  be an actual member of the org or the field is omitted.
- Status draft: returns customer-safe text with NO internal hostnames.
- Postmortem: sections = Timeline / Impact / Root cause / Action items.
- Approve: only OWNER/ADMIN/RESPONDER; VIEWER gets 403. Approval is
  recorded with reviewer id + timestamp.
- Dismiss: removes from pending list, keeps record for audit.
- Cross-tenant: org A token on org B incident → 404 (existing rule).
- Tests: mock provider; cover redaction, rate limit, approval
  permissions, cross-tenant isolation, timeout path.

## Milestones (build in this order)
M1: AI provider adapter + guardrails + mock provider + AiSuggestion
    table + rate limit.  [done when: mock call persists a PENDING row]
M2: Summary + Triage endpoints + incident-page Copilot panel.
    [done when: acceptance criteria met + tests pass]
M3: Status-update draft + Postmortem generator + approve/dismiss UI.
    [done when: approved draft can be posted as timeline event/status
     update, fully audited]
M4 (P1): Slack notifications, password reset, status-page subscribers,
    uptime history.
    [each ships with tests, one at a time]

## Implementation status
- [x] M1 — `src/server/ai/{provider,openai,anthropic,mock,prompts,guardrails,context,schemas}.ts`,
      `AiSuggestion` + migration `20260925000000_v2_ai_suggestions`, per-org rate limit.
- [x] M2 — summary + triage endpoints, Copilot panel on `/dashboard/incidents/[id]`.
- [x] M3 — status draft + postmortem, approve/dismiss (API + UI), approved drafts posted to the
      timeline (status updates surface on the public status page), triage applied via
      `updateIncident`, all audited. Tests: `tests/copilot.test.ts`, `tests/copilot-guardrails.test.ts`.
- [ ] M4 (P1) — Slack notifications, password reset, status-page subscribers, uptime history.

Implementation notes:
- `provider.generate(system, user, options)` returns `{ text, promptTokens, completionTokens, model }`
  (not a bare string) so token usage can be logged on every AiSuggestion.
- Extra env knob: `AI_RATE_LIMIT_PER_MINUTE` (default 20). `AI_PROVIDER` defaults to `mock`.
- Permissions: `copilot.read` (all roles), `copilot.generate` + `copilot.review` (OWNER/ADMIN/RESPONDER).

## V3 addendum: ARCH's own AI (implemented)
The external-vendor dependency is replaced; every V2 rule above still applies. Full spec:
`docs/engineering/ARCH-MODEL.md`.
- `AI_PROVIDER`: `arch` (default: ARCH native model, no LLM, no network) · `arch-hybrid` (local LLM
  via Ollama or an OpenAI-compatible server, with native fallback) · `mock` · `openai` ·
  `anthropic`. `ARCH_OFFLINE_ONLY=true` (default) refuses vendors and non-private `LOCAL_LLM_URL`s.
- New: `ArchModel` (one per org, `arch_models`, migration `20260925120000_v3_arch_model`),
  `AiSuggestionType.CODE_FIX`, permission `copilot.train` (OWNER/ADMIN).
- New routes: `POST /api/incidents/:id/copilot/code-fix`, `POST /api/copilot/code-review`,
  `GET /api/copilot/model`, `POST /api/copilot/model/train`. New pages: `/dashboard/code` and
  `/dashboard/model`.
- The worker retrains stale org models every `ARCH_MODEL_RETRAIN_MINUTES`.
- **V3.1 (registry + background training):** `ArchModelVersion` (registry) + `ArchModelJob`
  (training queue), migration `20260925180000_v3_model_registry`. Retraining is enqueued from the
  web layer (202) and executed by the worker: train → evaluate on holdout → promote only if the
  candidate beats the active model; rollback via `POST /api/copilot/model/rollback` or
  `POST /api/copilot/model/versions/:id/activate`. Every train/activate is audited with
  from→to versions. `EngineOutput` unchanged; code tasks additionally retrieve from the optional
  code/review corpora (`model:fetch-code` / `model:fetch-review`, licenses in
  `docs/legal/TRAINING-DATA-LICENSES.md`; model license `docs/legal/ARCH-MODEL-LICENSE.md`).
- Rules added:
  - Code Assist is stateless, and its audit entries hold metadata only.
  - LLMs only ever receive `scrubSecrets(code)`.
  - Training never reads Copilot-authored timeline entries, so the model does not learn from itself.
  - Nothing in `src/server/ai/` touches the DB or the filesystem.
- "Code generation, debugging" is no longer out of scope, but only as **drafts and suggestions**:
  nothing is applied to a repository.

## Out of scope for V2
AI auto-resolving incidents, auto-publishing status updates, code
generation, debugging, hosting, billing, microservices, mobile apps.
