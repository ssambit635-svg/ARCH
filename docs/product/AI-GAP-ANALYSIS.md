# ARCH AI vs ChatGPT — the honest diff, and the zero-cost plan

**Version:** 1.0 · **Owner:** Product / Founders · **Last reviewed:** 2026-09-28
**Audience:** internal — engineering, founders, sales. §8 is the only part written to be repeated
outside this repo.

> **Ground rule** (same as [`COMPETITIVE-ANALYSIS.md`](../go-to-market/COMPETITIVE-ANALYSIS.md)):
> every ChatGPT claim below is a *published, verifiable* OpenAI fact, and every ARCH claim is a line
> of code in this repository. Opinions are labelled. Re-verify the ChatGPT column before it is used
> in anything customer-facing — that product ships weekly.

**The question this document answers:** "ChatGPT jaisa bana do, but zero cost." What is actually
the difference between the two, what can we close for ₹0, what can never be closed for ₹0, and in
what order do we do it?

---

## 0. The one-paragraph answer

ChatGPT is a **frontier general-purpose language model wrapped in a consumer product**. ARCH is a
**grounded workspace copilot wrapped in an incident-management product**. The single expensive thing
in ChatGPT — the model — is not what makes it *feel* like ChatGPT to a user. Streaming, regenerate,
copy/export, memory, projects, voice input, file reading, feedback and shortcuts are **product
surface**, and almost all of that surface is buildable on a CPU, with no API key, no GPU and no
vendor. What we cannot copy at ₹0 is **frontier-level pretrained knowledge, reasoning depth and
multimodality** — those still require data centres. A small open-weight model can add general
knowledge without an API bill, but it has a much lower quality ceiling and needs local compute.

So the strategy is one sentence: **match the shape, not the weights.** Close the product surface
feature by feature (this is where users notice the difference in the first 60 seconds), keep
ARCH's workspace grounding and privacy boundaries as the moat (the native path cites supplied
records; optional chat generation stays on a private endpoint; actions still require human approval),
and use a *small local* model — still ₹0 in licence — only where fluency genuinely matters. Everything below is that plan, with phases and acceptance tests.

---

## 1. What the two things actually are

| | **ChatGPT** | **ARCH AI (V10.4)** |
|---|---|---|
| Core | Frontier LLM (hundreds of billions of parameters, RLHF-tuned) | Deterministic native engine for workspace facts + the built-in agent loop (planner, native tools, sandboxed Python) |
| Where it runs | OpenAI data centres, GPU clusters | Your server only — CPU-only, one process, no second model |
| Training data | Trillions of tokens of the public web, books, code | *Your* resolved incidents for the native classifier and a built-in failure-pattern/tech library |
| Knowledge | World knowledge, frozen at a training cutoff | Workspace facts from tenant-scoped retrieval plus the built-in cited tech pack |
| Per turn | Priced per token (rupees per question, per seat, per month) | ₹0 per turn; compute, RAM and disk are yours |
| Answers | Generated prose, can be fluent and wrong | Native answers stay deterministic and cited; complex prompts get a server-managed plan before the answer |
| Data path | Prompt leaves your machine | Nothing leaves: no AI vendor adapter exists in the binary (`ARCH_OFFLINE_ONLY` additionally blocks public knowledge fetches) |
| Determinism | Sampling; same question may answer differently | Always deterministic — one engine, same input, same output |
| Latency | Seconds | Tens of milliseconds (one sandboxed Python run when a script is requested) |
| Where it lives | A chat product | Inside the incident, plus `/dashboard/chat`, Code Assist, `/dashboard/model` |
| Optional upgrade | — | None needed: planner, tools and code execution are built in; a derivative training set can be exported with `model:export-finetune` |

**Read that table again before any planning.** We are not behind on *one* axis; we are a different
kind of system. The gap that matters commercially is only the one a user notices while doing their
job — and that gap is mostly product surface.

---

## 2. The diff, capability by capability

Legend — **Closeable at ₹0?**
`✅ yes (code only)` · `🟡 yes, but needs a machine (8–16 GB RAM, still ₹0 licence)` ·
`🔶 partially — 60–80% of the effect at ₹0` · `⛔ no, not at ₹0`.

### 2.1 Chat mechanics (the first minute of use)

| Capability | ChatGPT | ARCH today | ₹0? | How we close it | Phase |
|---|---|---|---|---|---|
| Persisted conversations, sidebar, rename, delete | ✅ | ✅ shipped (V8) | — | — | done |
| Streaming / typewriter output | ✅ token stream | Instant answer, no reveal | ✅ | Client-side reveal on the newest answer (the engine is already fast; nothing to stream) | **P1** |
| Regenerate answer ("Try again") | ✅ | ❌ | ✅ | `POST …/sessions/{id}/regenerate` — re-run the same question, replace the stored answer in place | **P1** |
| Copy answer / copy whole chat | ✅ | ❌ | ✅ | Clipboard button on each answer + `Export .md` (client-side Blob, no server cost) | **P1** |
| Keyboard shortcuts (new chat, search) | ✅ | ❌ | ✅ | `⌘/Ctrl+Shift+O` new chat, `⌘/Ctrl+K` search, `Esc` close | **P1** |
| Edit a message and resend | ✅ | ❌ | ✅ | Truncate the transcript after that user message, re-answer, audit as one event | P2 |
| Full-text search across *message bodies* | ✅ | title + preview only | ✅ | Postgres `ILIKE`/FTS over `arch_chat_messages` (org + user scoped) — no extension needed | P2 |
| Message feedback (👍/👎) | ✅ | ✅ **V10.4** — one private rating per answer | ✅ | Store shape-only evaluation metadata; do not turn a one-click rating into a supervised target or silently train on chat text | shipped (V10.4) |
| Branching / edit fork | ✅ | ❌ | ✅ | Requires a parent-pointer on messages — cheap in schema, expensive in UI clarity; only if asked | P4 |
| Share a conversation by link | ✅ | ❌ | ✅ | Org-scoped read-only share token; must respect "chats are personal" — needs a deliberate decision first | P4 |
| Temporary chat (no history) | ✅ | ❌ | ✅ | A session flag that skips persistence | P4 |
| Stop generating | ✅ | n/a (answers are instant) | — | Nothing to stop | — |
| Model picker | ✅ (GPT-5.x tiers) | One engine, by design (`AI_PROVIDER` accepts `arch` / `mock` only) | ✅ | No picker until a second engine earns its keep — there is no second engine in the binary | P4 |

### 2.2 Memory, personalization, projects

| Capability | ChatGPT | ARCH today | ₹0? | How we close it | Phase |
|---|---|---|---|---|---|
| Remembers facts across sessions | ✅ (memory profile + past-chat references) | ✅ **shipped (V9)** — facts persist in `arch_chat_memory`, survive the 12-turn window, and are governed by a Memory panel (list / add / forget one / forget everything) | — | Done. Next: use remembered facts in more answers (tone, default language, service names) | P2·done |
| Custom instructions | ✅ | Memory panel exists; tone/language defaults not yet | ✅ | Extend the same panel: "how ARCH should answer you" (tone, language default) | P2 (partly shipped) |
| Projects / folders with scoped memory | ✅ (project-only memory, files) | ❌ | ✅ | ARCH already has the real project concept — **Project**. Group chats by project instead of inventing folders | P3 |
| Memory references past chats | ✅ | ❌ | 🔶 | Retrieval over your own transcripts with the same embedding code we already run; honest ceiling: our retriever, not a reasoning model | P4 |
| Scheduled/recurring tasks | ✅ | 🟡 worker exists, no user-facing schedules | 🔶 | Only useful with a delivery channel (Slack/email); park until integrations land | P5 |

### 2.3 Inputs and outputs (modality)

| Capability | ChatGPT | ARCH today | ₹0? | How we close it | Phase |
|---|---|---|---|---|---|
| Voice input (speech → text) | ✅ advanced voice, audio model | ❌ | ✅ | **Browser Web Speech API** — dictation into the composer, client-side, zero server cost, no vendor | **P3** |
| Voice output (text → speech) | ✅ | ❌ | 🟡 | Browser `speechSynthesis` on the client (free), or a local TTS binary; OS-quality voice, not GPT-Live quality | P3 |
| Read a file you attach (PDF/DOCX/CSV) | ✅ | ❌ in chat (Code Assist has attachments for stack traces) | 🔶 | Text/log/markdown/JSON drag-drop with in-browser extraction + a size cap; PDF text extraction is doable but is where quality drops | P3 |
| Screenshot / image understanding | ✅ vision | ❌ | 🟡 | Small local VLM (e.g. moondream/LLaVA-class) can *describe* an image on CPU; reading a dashboard screenshot reliably needs a bigger model | P5 |
| Generated images | ✅ | ❌ | ⛔ | Diffusion on CPU is minutes-per-image; this is not our product | — |
| Tables, charts, canvas editing | ✅ | ❌ | 🔶 | Markdown tables in answers (renderer change) are cheap; **charts from your incident data** are cheap *and* on-domain — better than a generic canvas | P3 |
| Code generation | ✅ | ❌ **by design** (refuses, redirects to Code Assist) | — | This stays. A wrong snippet pasted into production is worse than no snippet; Code Assist has the repo, the tests and the review loop | never |

### 2.4 Knowledge and grounding

| Capability | ChatGPT | ARCH today | ₹0? | How we close it | Phase |
|---|---|---|---|---|---|
| Answers about the world | ✅ | 🟡 **V10 · V10.3** — the native 161-topic cited tech pack stays deterministic; there is deliberately no general-purpose generator | 🔶 | Keep widening the cited pack (new topics are one entry each) rather than bolting on a second model. Workspace questions stay retrieval-grounded and cited | **shipped, pack keeps growing** |
| Answers about *your* incidents, runbooks, services, roster | 🟡 only if you paste them | ✅ **this is the product** | — | Keep widening the corpus (SLOs, changes, dependencies, postmortems) rather than widening the model | ongoing |
| Citations you can click | ✅ (web + memory sources) | ✅ incident / runbook / pattern / postmortem | — | Add citations for SLO, change and dependency rows as they enter answers | P3 |
| Web browsing / deep research | ✅ | ❌ deliberately (SSRF-bounded fetch is a human action, not inference) | 🔶 | A **"research this incident" action** that fetches a URL the human names, shows what it read, then answers — human-in-the-loop version of the same outcome | P4 |
| Long context (100k+) | ✅ | 🟡 12 turns of history + retrieval over the whole corpus | 🔶 | Retrieval already covers more history than a context window does; raise the turn window and add transcript memory when tests show it helps | P3 |
| Multi-step reasoning / maths / novel code | ✅ | 🟡 **V11** — the agent loop plans complex prompts (`<thinking>`/`<plan>` scanned server-side), runs exact maths through the native calculator tool, and executes verified Python scripts in a sandbox; hidden chain-of-thought is never shown | 🟡 | Bounded computations are covered at ₹0; open-ended novel code stays in Code Assist (repo context + review loop). No arbitrary-Python escape hatch: scripts come from fixed templates with numeric literals only | **shipped (V11, bounded)** |

### 2.5 Actions in the world (where an ops product actually wins)

| Capability | ChatGPT | ARCH today | ₹0? | How we close it | Phase |
|---|---|---|---|---|---|
| Takes actions (agent mode, computer use, tools) | ✅ increasingly | ❌ chat only advises | ✅ **and this is our advantage** | **Draft → approve → apply**, reusing the V2 `AiSuggestion` machinery: "declare an incident from this description", "draft the status update and publish after approval", "resolve this incident". Human approves; the audit log records both halves | **P4** |
| Runs code in a sandbox | ✅ code interpreter | 🟡 reproduction sandbox exists for verified fixes | 🔶 | Already built for V4 fixes; opening it to chat is a security decision, not a feature decision | P4 |
| Connectors (email, drives, repos) | ✅ | 🟡 GitHub only | 🔶 | Add providers when customers ask; each is an integration, not an AI feature | P5 |

### 2.6 Trust, safety, platform

| Capability | ChatGPT | ARCH today | ₹0? | Notes |
|---|---|---|---|---|
| Data never leaves the deployment | ⛔ (it is a cloud service) | ✅ by default | — | **Our strongest single line in a security review** |
| Per-user privacy inside one tenant | 🟡 workspace + projects | ✅ chat sessions are per member, foreign id → `404` | — | Keep it |
| Audit trail | ⛔ | ✅ generate/regenerate/feedback events store metadata only | — | Export is client-side; chat text is never copied into the audit log |
| Deterministic, testable output | ⛔ sampling | ✅ native path is golden-set + unit tested; hybrid path has adapter/grounding tests | — | Native answers are deterministic; local generations can vary |
| Rate limiting / abuse control | ✅ | ✅ per organization, `429` | — | Same budget as Copilot |
| Hallucinated facts | 🟡 reduced, still possible | ✅ native path uses selected rows; 🟡 hybrid is a small generative model | — | Hybrid reflection and source mapping help, but verify general facts and advice before acting |
| Cost per active user | per seat + per token | ₹0 marginal | — | Price and cost are aligned for us; this is why our pricing page works |

---

## 3. The four walls — what ₹0 cannot buy

Say these out loud in every internal review, so nobody promises them by accident:

1. **Pretrained world knowledge.** ChatGPT can explain a Kubernetes error it has never seen in your
   workspace. ARCH knows only what it was handed — retrieval and templates cannot manufacture
   knowledge that was never written down. V10 narrowed this honestly; **V10.3 widened it to 161
   hand-written topics across 16 families** (offline, cited, EN + Hinglish) and made the pack compose
   comparisons from two entries, while the reply still says plainly when a topic is outside it and now
   names the closest topics it does cover. That is coverage by authorship, not by training — the long tail stays
   with the opt-in local model, and the pack grows one data entry at a time.
2. **Frontier reasoning.** Novel debugging, maths, multi-hop inference, writing a new algorithm.
   A quantised 7B local model narrows this gap on *familiar* tasks and does not close it on new
   ones — and on a CPU it is 5–50× slower than the hosted product.
3. **Multimodality at quality.** Real screenshot understanding, image generation, video, real-time
   voice conversation with interruption. Small local VLMs describe; they do not read.
4. **Scale economics.** Frontier inference needs GPUs. We can be cheap *because* we are narrow; the
   moment we try to be broad we inherit their cost structure and lose our only advantage.

**Corollary:** every phase below must survive the question *"does this make ARCH better at
incidents, or does it just look more like ChatGPT?"* If the answer is the second one, it goes to
the bottom of the list.

---

## 4. What ARCH already does better (keep saying this)

- **The native path cannot invent your incidents.** It uses only the workspace snapshot and retrieved
  rows, with citations. Hybrid chat is more fluent but still a small generative model: it is instructed
  to ground workspace claims, reviewed once, and may be wrong about general facts. Verify before acting.
- **Nothing leaves the building.** `ARCH_OFFLINE_ONLY=true` is the default; the *only* place a local
  LLM is allowed is a private address.
- **Free at the margin.** No tokens, no seats, no quota. A 25-person team can ask 10 000 questions a
  month and the bill does not move — which is also why we can say "everyone can be in the tool".
- **Private per person.** Your chats are yours even inside your own organization — a foreign id is
  `404`, not "someone else's reading list".
- **Auditable by design.** Native mode is deterministic and tested; hybrid generations record their
  provider, model and latency, while feedback audit events store rating shape only, never chat text.
- **Hinglish by default.** The team here writes in both languages; ARCH answers in the language it
  was asked in, including for ops advice.
- **It advises; a human acts.** Nothing on the incident, the status page or a repository changes
  without an approval, and the audit log records who approved it.

---

## 5. What "₹0" actually means — four tiers

| Tier | Cost | Examples | Rule |
|---|---|---|---|
| **T1 — code only** | ₹0 forever, CPU | Regenerate, copy, export, shortcuts, search, feedback, memory page, markdown tables, voice *input*, share links | Ship these freely |
| **T2 — free licence, needs a machine** | ₹0 in licence; 8–16 GB RAM, no GPU | *(removed in V11)* the optional local-LLM tier is gone — one engine only | Never reintroduced without a new decision record |
| **T3 — free but slow** | ₹0, minutes of CPU per answer | Bigger quantised models, small local VLMs for image description | Not in the product; documented as an idea only |
| **T4 — actually costs money** | rupees per token | OpenAI/Anthropic APIs | **No adapter exists in the binary** — cannot be switched on |

Everything in §6 is T1 unless marked otherwise. **Every phase must leave the product fully
functional with `ARCH_OFFLINE_ONLY=true` and no local LLM installed** — the models are an upgrade,
never a dependency.

---

## 6. The phased plan (one vertical slice per phase)

### P1 — "It feels like a chat" *(this release)*
Regenerate (`POST …/sessions/{id}/regenerate`, replaces the answer in place), copy an answer, copy
the chat, export as Markdown, keyboard shortcuts, and a short reveal on the newest answer.
**Acceptance:** a user can retry a bad answer without typing again; the transcript still has exactly
one answer per question; the audit log records the retry without the text.
**Why first:** visible in the first minute, zero dependencies, zero risk to grounding.

### P2 — "It learns from you" *(T1 · first slice shipped as V9)*

**Shipped:** persistent per-member memory with a panel to read, edit and wipe it — see
[`README.md`](../../README.md#native-does-not-mean-autonomous) and the V9 entry in
`CHANGELOG.md`. **Still open:** thumbs up/down with reasons, edit-and-resend, and message-body search.

Thumbs up/down + a three-chip reason ("wrong", "outdated", "missed my incident") on every answer,
stored as a correction row and fed into the existing 3×-weight learning loop; edit-and-resend;
full-text search across message bodies; a **Memory page** (view/edit/delete everything ARCH
remembers, plus default language/tone).
**Acceptance:** a downvote measurably changes the next answer (test), a user can delete every memory
row in one click, and search finds a phrase from the middle of an old conversation.
**Risk to watch:** feedback pollution — one annoyed click must not retrain a model. Corrections stay
weighted, attributed and reversible.

### P3 — "It hears, reads and shows" *(T1 for text, 🟡 for voice)*
Dictation into the composer (Web Speech API, client-side), read-aloud for answers
(`speechSynthesis`), attach a `.log`/`.txt`/`.json`/`.md` file or a pasted stack trace *in chat*
(reusing the Code Assist attachment pipeline), markdown tables in answers, incident charts on
request, and project-scoped chat groups.
**Acceptance:** a browser-only user can create an incident from a pasted log without touching a
keyboard; no new vendor appears in `package.json` and the CSP story is unchanged.
**Honest ceiling:** OS dictation quality, not GPT-Live.

### P4 — "It can do things, with your permission" *(T1)*
The feature that actually beats ChatGPT for our buyer: **workspace actions as drafts.**
"Declare an incident from this description" → a `PENDING` suggestion → RESPONDER approves → the
normal incident service runs (timeline, audit, status page, notifications). Same for status-update
drafts, resolve, assign, publish a postmortem, and "research this URL and summarise it" (a human
names the URL; the SSRF guard stays). Plus branch/fork and share-link if users ask for them.
**Acceptance:** every action is a human approval, writes the same audit entries as the manual path,
and can be refused by role exactly like the manual path.
**Why it wins:** ChatGPT's agent mode touches *your computer*; ours touches *your incident*, inside
your permissions, with your audit trail.

### V10.4 → V11 — *"Fluent on a local model" removed*
V10.4 briefly shipped opt-in hybrid chat (`AI_PROVIDER="arch-hybrid"`); **V11 deleted that path**
along with every other second-model adapter. The task-plan idea survived and was rewritten as the
V11 agent planner: the plan is built and parsed server-side from ARCH's own state, never from a
generative model.

**Still true:** there is no generator to be wrong with — every workspace claim is extractive and
cited. General-facts answers come from the built-in tech pack and say so when the pack has nothing.

### Explicitly not on the plan
Image generation · web browsing at inference time · autonomous actions without approval · a general
chatbot detached from a workspace · training a frontier model · paying per token by default.

---

## 7. How we prove any of this

1. **Golden set first.** Every phase adds cases to the chat eval (intent, grounding, refusal,
   language, latency). No phase ships on vibes.
2. **Grounding test, not just a prompt.** Native workspace answers use the supplied snapshot. In
   hybrid mode, invented citation ids are dropped and cited ids map only to retrieved sources; this
   does not prove that every general-world statement from a small model is true or entailed.
3. **The unplugged rule.** `npm test` and `npm run model:eval` must pass with no local model
   installed and no network.
4. **Latency budget.** Chat turns stay in the "instant" band (target < 300 ms warm); a phase that
   pushes a normal answer past ~1.5 s does not ship by default.
5. **Audit parity.** Anything new that writes state gets an audit entry with metadata only.

---

## 8. How to say it out loud

**Internal one-liner:** *"We are not building a smaller ChatGPT. We are building the assistant that
already knows your incidents — and can prove every sentence."*

**To a customer who asks "is this ChatGPT?":**
> "No. ARCH is an incident-management assistant. Its default engine is deterministic and uses your
> tenant-scoped incidents, runbooks and history; those workspace answers include source citations.
> If you enable it, a small open-weight model can make open-ended chat more natural while staying on
> your private infrastructure — no paid API, but it uses local compute and can still be wrong about
> general facts. Either way, ARCH never takes an operational action without a human approval."

**What we do not say:** "as good as ChatGPT" · "no hallucinations" · "we have an LLM" · anything
about parameter counts or benchmarks we have not run ourselves.

---

## 9. Decision log & review

| Date | Decision | Why |
|---|---|---|
| 2026-09-28 | Strategy: match the useful shape, not frontier weights | Open weights make local inference free of API fees, but compute and frontier-level quality are not free |
| 2026-09-28 | P1 shipped: regenerate, copy/export, shortcuts, reveal | First-minute parity, no dependency, no grounding risk |
| 2026-09-28 | Code generation stays refused in chat | A wrong snippet in production is worse than no snippet; Code Assist owns that job |
| 2026-09-28 | Local LLM stays an opt-in upgrade, never a dependency | Keeps the offline/free guarantee true for every deployment |
| 2026-09-28 | Memory is stored, visible and deletable (V9) before feedback/learning (P2) | "I will remember that" must be true before any model tuning — trust first, and the panel is what makes memory acceptable to a team |
| 2026-09-28 | No neural network or local LLM in the default path | Native chat stays CPU-only, instant and deterministic; V10.4 adds a separate opt-in local generation path, not a replacement for grounding |

**Next review:** after P2 lands (or any time a customer asks for something ChatGPT-shaped that is
not in §2).
