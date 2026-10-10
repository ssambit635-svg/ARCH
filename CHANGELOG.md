# Changelog

All notable changes to ARCH are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Rules for this file:
- One entry per release, written for a **customer** to read, not for a compiler.
- Security fixes are always listed, with a severity and the affected versions.
- Breaking changes get their own section and a migration note.
- If a release contains nothing a customer would care about, say so in one line instead of padding it.

---

## [Unreleased]

### Breaking — invitation API reports the email queue accurately

- `POST /api/organizations/:id/invitations` replaces the inaccurate `emailSent` field with
  `emailQueued`. Migrate clients to read the new field. When `emailQueued` is true, the raw
  invitation URL is omitted; when false, an absolute one-time URL is returned for manual sharing.
- Invitation list/create responses now include only public metadata; `tokenHash` and other internal
  invitation fields are no longer serialized.

### Changed — more room for the workspace, with navigation you can hide

- The desktop sidebar can be hidden from the top bar or with `Ctrl+B` / `⌘B`; the preference is
  remembered in a cookie and read before the dashboard renders. The workspace expands into the
  space it frees.
- The mobile navigation now behaves as a modal drawer: it traps keyboard focus, closes on Escape or
  backdrop click, restores focus to its opener, and prevents the page behind it from scrolling.
- Increased the spacing and type scale across the authenticated shell and shared controls for a more
  comfortable working surface.

### Changed — status and contributor docs describe the shipped product

- Added a plain-language current-status guide that separates organization dashboard numbers from
  unverified product-wide metrics, distinguishes offline model evaluation from customer outcomes,
  and explains early-access limits.
- Replaced blueprint-era contributor instructions with current application setup, architecture,
  security, and verification guidance. No team-seat quota was added: plan limits remain unvalidated
  draft pricing, not an enforced product limit.

### Improved — team-member management

- Search the organization roster by name or email and filter by role; filtered totals and empty
  results are announced accessibly. The roster remains tenant-scoped and role changes still go
  through server authorization.
- Managers can revoke pending invites, which is recorded in the audit log. Invitation status changes
  use a conditional database transition so accepting and revoking the same invitation cannot both
  succeed.
- Removed the duplicate invite button, reset invite form state when its modal closes, and stop
  returning a raw invite token to the manager when the invitation email is queued.

### Changed — the setup steps sit in a real terminal window

- The quick-start commands were a pale panel on a cream page. They now render as a terminal window:
  a dark chrome bar with the three macOS window buttons, a title, a copy control, and a body set in
  the monospace face with a coral `$` prompt, dimmed comment line and a blinking caret after the
  last command. It stays dark in both themes, and the copy button and horizontally scrollable body
  keep their keyboard affordances.

### Removed — the Python CLI is no longer advertised

- The landing page told visitors to run `pip install ./clients/python`, `arch login` and
  `arch incidents list`. That package is not published, so the page no longer suggests it. The code
  in `clients/python` is untouched; `tests/marketing-minimal.test.ts` now fails if the page
  advertises an unpublished client again.

### Added — a living lattice behind "Built to stay in your control"

- The section keeps its composed desktop scene and its three principles. Behind it, a canvas field
  of drifting nodes links together and passes signals along the links — ink on the cream half of the
  fade, warm ember once the field turns coral — and the cursor joins the lattice as it moves across
  the section. A second, smaller graph runs inside the service window, clustered around the three
  service pills.
- It is decoration only: hidden from assistive tech, frozen to a single frame under
  `prefers-reduced-motion: reduce`, paused whenever it scrolls out of view or the tab is hidden, and
  capped at 96 nodes per canvas.

### Fixed — the closing frame's text is readable

- The footer's statement, links and legal line were all white on a cream-to-coral fade. Where the
  letters actually sit, that measured between 1.5:1 and 2.5:1 against the background — well under
  the 4.5:1 a 12–14px link needs — which is why the bottom of the page read as blank.
- The statement now sits in a deep ink on the pale half of the fade (5.1:1 or better everywhere it
  can land), and the orange is raised: the field reaches a saturated coral by mid-height and closes
  on ember rather than washing back out to a lighter orange.
- The contact, legal and product links plus the legal bar share a solid ember band, so their white
  text stays above 5:1 no matter how tall the footer grows when the columns stack on a phone.

### Changed — the landing page says what it is and shows it

- **The hero leads with the product, not the poetry.** "Incident response for engineering teams.
  Self-hosted. Human-reviewed AI." is now the headline, with the type set so "Incident response"
  never breaks across lines; "Through the noise. Into clarity." moved to a small subline.
- **The page no longer repeats "clarity."** It appeared four times (hero subline, workflow
  description, closing headline, browser title). It now appears once, in the hero subline. Section
  copy that leaned on it was rewritten around what the software does: repeats fold into one
  incident, context arrives with the alert, a responder approves each draft, and the workflow
  interlude reads "Your monitoring finds it. ARCH runs the response."
- **Illustrations out, product screens in.** The night-mountain reveal film and poster that owned the
  hero, and the dragon logo film that closed the page, are removed from the repository
  (`public/arch-alpine-*`, `public/arch-dragon-*`) along with the `AmbientVideo` component, which had
  no other caller. In their place the hero shows a real capture of an open incident — severity,
  blast radius, the deployments before it, the timeline — and the closing section shows the
  published status page a customer would read. Both are captured from a local workspace at 2× and
  shipped as WebP in `public/product/`; the dragon mark stays as the brand mark in the navigation
  and footer.
- **Every marketing image is described.** The screenshots carry a specific alt description, an
  intrinsic width and height, and a caption stating the data is sample data. The decorative brand
  marks keep `alt=""` and now also declare `aria-hidden="true"`, so an empty alt is always a
  deliberate choice rather than a missing one — `tests/marketing-minimal.test.ts` enforces that for
  every image on the page.
- `tests/marketing-media.test.ts` now checks the screens themselves: WebP signature, intrinsic size
  (2× the declared CSS box), non-trivial file size, a caption, and that the retired films and their
  poster files cannot reappear.

### Changed — a footer that closes the page properly

- The footer is now a sitemap instead of a single row: the brand beside a one-line summary, three
  link columns (Product, Developers, Get started), and a legal bar carrying the copyright, the
  licence note and a back-to-top control. Type sizes, spacing and hover states follow the same
  rhythm as the rest of the page, and the layout collapses to one column, then to paired columns,
  on narrow screens.
- The `ARCH.` wordmark closing the page is set in the Orbitron display face at its heaviest weight and
  stretched across the full width, so the letterforms read as thick and wide rather than thin.
- The diagonal shards that cut through the wordmark are gone. In their place the lettering fades and
  blurs out towards the bottom until it disappears, ending the page without a hard edge.

### Changed — supplied home-page video

- The home-page hero now plays the supplied `wwm.mp4` with a matching poster frame. The
  browser copy keeps the original video quality, removes audio and uses fast-start delivery;
  the original upload is unchanged. One-shot playback and reduced-motion/save-data fallbacks remain.

### Changed — blue and ruled, with a navigation that gets out of the way

- Brought the deep blue accent back as a flat, unglowing detail: blue hairlines between sections and
  the container rails, a blue eyebrow marker, blue-tinted iconography, selection, focus ring, link
  hover, and the half-faded `ARCH.` wordmark closing the footer.
- Restored the bordered structure: every section closes on a rule and carries vertical container
  rails, the console preview, lifecycle rows, terminal, CLI note and disclosure list are ruled, and
  the technology row is the classic ruled tile grid again with the Vengeance UI isometric stack that
  presses down when it is clicked.
- Display headings and the wordmark now use the Orbitron typeface the rest of the product uses.
- The navigation bar hides itself ten seconds after it appears, returns when the pointer reaches the
  top edge, on hover or on keyboard focus, and repeats as long as the page is open. Footer link
  `Top` jumps back to the hero.

### Changed — a quieter product surface

- Replaced the disappearing, pill-heavy marketing navbar with persistent navigation, a single theme control, and an accessible mobile menu.
- Removed blue glows, decorative grid borders, nested feature-card effects, hero incident/status badges, and hard-coded demo status links. The original mountain reveal and robot mascot remain.
- Added a focused, interactive incident preview and simplified the workflow to the four states the application actually supports. Marketing themes stay isolated from the authenticated console.
- Corrected setup and terminal examples to match the real development command and Python CLI. Videos retain poster fallbacks and do not autoplay for reduced-motion or save-data users.
- Rebuilt the README around product capabilities, a labeled preview, accurate setup, architecture, verification, and the proprietary license. Detailed local setup and legacy secret rotation now live in `docs/DEVELOPMENT.md`.

### Changed — the landing hero film

- **The hero background was re-encoded from the newer source clip.** Same night-mountain
  reveal, same 4-second one-shot, same silent 1920×1080 H.264 delivery and the same code
  path (`Hero` → `AmbientVideo`) — the peaks are just crisper and the star field cleaner
  than the previous master. Its poster frame was re-cut from the same clip, so the still
  shown before autoplay now matches the first frame exactly.

### Changed — the landing page shows real data only

- **Live GitHub star count.** The header's ★ pill no longer shows a typed-in number (`2.4k`). It reads
  this repository's real stargazer count from GitHub through `GET /api/github-stars`, keeps it fresh
  while the page is open (every 2 minutes; the server asks GitHub at most every 5), and shows a plain
  "Star" — never an invented figure — when GitHub cannot be asked. A private repository needs
  `GITHUB_TOKEN` on the server for the count to be readable (see `.env.example`).
- **Removed the claims nothing backed:** the "2M+ active alerts routed" counter and the logo strip
  (Mintlify, Sentry, BrowserStack, Sarvam AI, Vercel) — none of them is a partner or sponsor of ARCH.
  ARCH's own Sentry webhook support is unchanged; only the logo is gone.
- **Removed the 3D hero ball** (and with it `hero-blob.tsx`). Three.js is no longer used by any page.
- **Tech Stack row now lists what ARCH is really built on** — 15 tiles, same isometric-stack look, each
  one tied to a dependency or file in this repository and checked by `tests/marketing-tech-stack.test.ts`,
  so it cannot drift into marketing.

### Changed — the entire visual language ("Mission Control")

- **The indigo→violet gradient scheme is gone.** ARCH shipped with two accent colours, decorative
  blur orbs, gradient-filled display type and coloured drop-shadows — which contradicted our own
  `docs/go-to-market/BRAND-GUIDE.md` ("one strong signal colour", "never add gradients" to the mark,
  "status colours never used for decoration"). The palette is rebuilt on that original intent.
- **Graphite base, one accent, severity as data.** Surfaces are near-zero-chroma graphite rather
  than blue-black; sodium (`#ffb627`) is the single decorative hue and marks ARCH itself; red /
  orange / amber / green / sky belong to incident and service state and appear nowhere else. No
  glow, no aurora, no gradient text.
- **Body text is no longer blue.** `slate-*` is remapped to a stone neutral across the product —
  ~550 utility classes set text colour from a blue-gray ramp, and body copy is where the cast showed.
- **New display typeface.** Space Grotesk (variable) for headlines and large numbers, alongside the
  existing Inter and JetBrains Mono. Self-hosted like the others, so `next build` still never calls
  fonts.googleapis.com and an air-gapped machine still builds.
- **New logotype.** A load-bearing arch whose keystone is a live signal, with the incident pulse
  running inside it. Two stroke weights and one accent — no gradient fill, which the previous mark
  had.
- **The landing page is rebuilt** as a scroll-driven story: a boot sequence, full-bleed graded
  footage, a live WebGL service-dependency graph showing an incident propagating, a pinned
  four-step lifecycle scrub (ingest → respond → publish → prove) with real artefacts, the native
  engine's agent loop and Verified Fix evidence, an interactive topology inspector with blast-radius
  walk, a capability grid, a self-host terminal, and attribution for every asset.
- **Motion is opt-out.** Everything above is disabled under `prefers-reduced-motion: reduce`: no
  curtain, no autoplay video (the poster still shows), a flat dependency list instead of WebGL, and
  reveals resolving straight to their end state so no content is stranded off-screen.
- **The product dashboard is unchanged in behaviour.** Roughly 800 existing utility classes inherit
  the new palette through `@theme` aliases rather than being rewritten, so no feature logic moved.
  `indigo-*` and `violet-*` still resolve (to sodium) so a stray class cannot reintroduce blue.
- **Contrast fix.** Remapping the palette left white text sitting on a sodium background in seven
  places (1.59:1). Those controls are now bone-on-ink (17.9:1); the primary button is bone-on-ink
  everywhere.

### Added — marketing asset pipeline

- Real stock footage (Pexels licence) and real CC-BY Sketchfab models, both attributed in the
  footer and in the stage HUD. Footage streams from the CDN at runtime and is not vendored into git.
- `SketchfabStage` accepts any model `uid`, so a model can be swapped without a code change.
- `docs/go-to-market/BRAND-GUIDE.md` §4–§10 rewritten to describe what actually ships, including
  measured contrast ratios and the motion non-negotiables.


### Removed — external AI is gone, end to end (breaking for hybrid users)

- **No Ollama, no local LLM, no hybrid mode, no vendors.** The `arch-hybrid` provider, the
  Ollama/llama.cpp clients (`local-llm.ts`, `local-chat.ts`), the hybrid chat agent and the
  `openai.ts` / `anthropic.ts` adapters were deleted from the codebase. `AI_PROVIDER` now accepts
  only `arch` (the native engine, the default) or `mock` (tests); any other value — including old
  `.env` files with `AI_PROVIDER="arch-hybrid"` — fails at boot with a readable error.
- **Config removed.** `AI_API_KEY`, `AI_MODEL`, `LOCAL_LLM_*` and `LOCAL_CHAT_*` variables are gone
  from `.env.example` and the schema; `docker-compose.yml` no longer ships an `ollama` service.
  Migration: delete those lines from your `.env` and (if you used hybrid) set `AI_PROVIDER="arch"`.
- **`ARCH_OFFLINE_ONLY`** now only gates public-URL knowledge fetching — external AI vendors are no
  longer a setting at all.

### Added — V11 · ARCH Agent (planner, native tools, self-correction)

- **Task planning via raw prompts.** Complex chat prompts are intercepted and prefixed with a
  chain-of-thought system prompt; the reply is scanned for `<thinking>` / `<plan>` tags and the
  steps are managed server-side. Members only ever see the final, tag-free answer.
- **Native tool execution without a framework.** A plain dictionary of functions (`calculator`,
  `current_time`, `list_files`, `read_file` — workdir-confined, secret-refusing, output-redacted)
  called through one JSON structure (`{"tool": …, "arguments": …}`); the result is fed back to the
  engine for the next step.
- **Self-correction loop for generated Python.** The script is extracted from the reply, written to
  a temporary `.py` file and run with the Python subprocess in a credential-free environment with a
  hard timeout; failures are sent back to the engine as *"The code failed with this error: … Fix
  it."* until it passes or `ARCH_AGENT_MAX_FIX_ATTEMPTS` runs out. Chat answers show the verified
  script and its real output; production/feature code still routes to Code Assist.
- **Tests.** `tests/agent-planner.test.ts`, `tests/agent-tools.test.ts`,
  `tests/agent-self-correct.test.ts` (real Python subprocess) and `tests/agent-loop.test.ts`,
  plus chat-level end-to-end cases — 551 tests green.

### Added — V10.4 · more conversational, private chat beyond the pack

- **Planning without exposing hidden reasoning.** A small intent-based task plan guides answers; ARCH
  does not request, store or display chain-of-thought, and chat has no tools that can execute code or
  change workspace state.
- **Answer feedback.** Members can mark an answer helpful or not helpful, or clear a rating. It is
  private evaluation metadata only — not automatically included in training data or model fine-tuning.
- **No required paid API.** The native engine is the only model; hybrid local generation was removed
  in V11 (see above), so there is nothing external to configure or pay for.

### Added — V10.3 · the pack grows to 161 topics, and answers comparisons

The honest limit from V10 has not changed — a curated pack is not a pretrained model. What changed is
the size of the canon, and what the pack does with a question that names *two* topics instead of one:
**161 hand-written topics across 16 families**, still offline, still cited, still ₹0 per answer.

- **+72 topics.** New coverage that engineers actually ask for: **languages** (JVM and bytecode, Rust
  ownership and borrow checking, memory-managed mobile targets, SQL as a language, compiled vs
  interpreted vs JIT, functional vs object-oriented), **web** (CORS, cookies and storage, cache
  headers, CDNs, pagination, API versioning, API gateways, the event loop, browser performance,
  accessibility, i18n, SEO, feature flags), **databases** (isolation levels and dirty reads,
  normalisation, NoSQL families, search engines and inverted indexes, time-series data, partitioning,
  backups/PITR, locks and deadlocks), **infra** (Dockerfiles and image size, Kubernetes networking,
  autoscaling, triage on a Linux box, SSH and bastions, cron and schedulers, immutable artefacts),
  **distributed systems** (consensus and quorums, distributed locks, sagas, message ordering,
  consistent hashing, CRDTs), **security** (zero trust, JWT vs sessions, injection and XSS/CSRF,
  password hashing, RBAC/ABAC, audit logging, threat modelling), **engineering** (TDD, code review,
  technical debt, debugging, documentation), **data** (ETL/ELT, warehouse/lake/lakehouse, stream
  processing, data quality, governance and PII), **AI** (transformers, embeddings and vector search,
  fine-tuning vs RAG, MLOps, agents and tool use, cost and guardrails), **performance** (profiling and
  flame graphs, slow-query tuning), **computer-science fundamentals** (data structures and Big-O,
  compilers and ASTs) and **emerging tech** (quantum computing, blockchains, IoT/embedded, game
  development).
- **Comparison questions are composed from both entries.** "Redis vs Postgres — which should I use?"
  now answers with *both* topics, each in its own words, with **both** citations, and one line that
  says plainly that the two pack entries are being quoted rather than a verdict generated. When a
  single entry already covers both sides (Docker vs Kubernetes, REST vs GraphQL) that entry is the
  answer — no stitched-together pair.
- **A near miss is no longer a dead end.** When a question is genuinely outside the pack, the honest
  fallback now names the **closest topics** it does cover and offers them as follow-ups — as a hint,
  not as an answer: no citation is invented, confidence stays `low`, and a question with no shared
  vocabulary ("what is good for lunch") still gets no invented suggestion at all.
- **Definition questions win against a workspace intent that only matched a word.** "what is a service
  mesh" used to be answered as a *services* question, "how do you do a postmortem" as *lessons*,
  "what is a document database" as a *runbook* one and "explain the twelve-factor app" with a recent
  incident. Definition wording now goes to the pack; wording about *this* workspace ("our runbook",
  "what services are degraded right now?") stays with the workspace.
- **Data hygiene, enforced by a test.** One alias now belongs to exactly one topic — leaked aliases
  ("what is a cdn" living inside the caching entry, duplicate `cors`/`jwt`/`xss`/`bcrypt`/`zero trust`
  phrases) were fixed, and the data-shape test fails if a leak comes back.
- **Measured, not asserted:** 497 tests green (41 in the chat engine), `npm run smoke:api` 124/124, and
  a fresh **89-question battery** (one question per topic family, written *after* the pack was built)
  answered **89/89** from the pack; the original 79-question canon and the 10-question precision set
  still pass.

### Added — V10 · a built-in tech knowledge pack (and an honest limit)

"Can it answer any tech question in the world?" — a curated pack cannot equal a pretrained model's
coverage, and pretending otherwise would be the one thing an incident tool must never do. What V10
does instead: answer the canon — the 89 questions engineers actually ask — offline, deterministically,
with a citation, in English or Hinglish, and say plainly when a topic is outside the pack. No vendor,
no API key, no model download, still ₹0 per answer.

- **89 built-in topics across 11 families** (`src/server/ai/arch-model/tech-knowledge.ts`):
  languages (oldest language, Go vs Rust, choosing a stack), web (HTTP status codes, REST/GraphQL/gRPC,
  DNS, TLS, caching, HTTP/2 vs 3, TCP, rate limiting, backpressure), databases (SQL vs NoSQL, ACID, CAP,
  eventual consistency, Postgres vs MySQL, indexes and N+1, replication and sharding, migrations,
  connection pools, event sourcing/CQRS, OLTP vs OLAP, hot partitions, Bloom filters), infra (Docker vs
  Kubernetes, pods and probes, Helm and operators, service mesh, CI/CD and IaC, queues/Kafka, serverless,
  monolith vs microservices), cloud (IaaS/PaaS, why the bill is big), ops (MTTR and error budgets, SLO/SLI
  burn rate, alert fatigue, on-call, postmortems, runbooks, idempotency, retries and circuit breakers,
  deploy strategies, observability, chaos, change management, toil, 12-factor), security (authn vs authz,
  OAuth/OIDC/JWT/SAML, MFA and zero trust, encryption vs hashing, secrets and HMAC, network controls and
  DDoS, OWASP attacks, supply chain), testing (test pyramid, incident regression tests, load and capacity),
  systems (processes/threads, GC and leaks, deadlocks and races, virtual memory/cgroups/OOM), engineering
  practice (code review, design docs and ADRs, tech debt, agile/estimates, monorepo vs polyrepo) and AI
  (how LLMs work, RAG, hallucination, local vs API, judging an AI feature) — plus the ARCH-specific topics.
- **Every answer carries a "Tech pack" citation** — so a reader can tell general knowledge from
  workspace knowledge, which is the distinction that matters when deciding whether to act on a reply.
- **It answers the question you asked, not the previous one.** A complete new question inside a
  conversation ("what is quantum tunnelling in GPUs?") no longer inherits the subject of the turn
  before it; genuine follow-ups ("and the fix?", "uska root cause kya tha?") still do. Questions the
  pack cannot cover keep the honest fallback, mid-conversation as well as at the start.
- **It says what it does not know.** Outside the pack, the fallback names how many topics are built in,
  suggests the closest family, and points at Knowledge sources for your own docs — instead of inventing
  a fact or answering a different question.
- **Workspace questions are never shadowed.** Matching is scored (alias phrase > cue > keyword) with a
  confidence floor, so "our cache incident yesterday" stays an incident question and "what is open right
  now?" is still the open queue.
- **It understands how engineers actually ask.** Acronyms, articles and either/or phrasings are
  normalised ("what is *the* CAP theorem", "websocket *or* polling"), a bare topic name is treated as a
  question ("redis", "kafka"), and the Hinglish definition shape — "docker kya hai", "redis kaise kaam
  karta hai", "slo burn rate kya hota hai" — routes to knowledge instead of to triage advice or the app
  walkthrough. Ops concepts that ARCH answers with *your* numbers (MTTR, SLO/SLI, runbooks, error
  budget, MTTD/MTBF) keep the workspace-aware answer even when the classifier is unsure, and the error
  budget concept now has its own explanation rather than falling through to postmortems. Definition questions that merely contain an error code ("what does HTTP
  503 mean?") go to the pack; the same words about your own estate ("we keep seeing 503s after the
  deploy — what do we do?") stay with the incident advisor.
- **Growing it is a data change, not a code change.** Append an entry (title, aliases, keywords, EN +
  Hinglish answer, related topics) and it is live in chat and in tests; the engine's matching never
  changes. For the long tail beyond the pack, the opt-in local model (`AI_PROVIDER=arch-hybrid`) stays
  the documented path — it runs on the same server, free, but slower and only as good as the model your
  hardware can hold.
- **Also fixed in this release:** asking "who is on call tonight?" in a workspace with no members now
  says that the roster is empty and where to invite people, instead of recycling the empty-incidents
  line; and "explain the CAP theorem" answers the theorem rather than listing your recent incidents.


### Added — V9 · memory that is actually saved (and yours to delete)

Asked "what do you remember about me?", ARCH used to answer from whatever happened to still be in
the last 12 turns — and said "I have saved that" when nothing had been saved anywhere. V9 makes the
sentence true: the facts live in the workspace database, survive the conversation, and appear in a
Memory panel you control. Still no vendor, no API key, and nothing leaves your server.

- **Memory across conversations.** Introduce yourself once ("mera naam Vikram hai, hum Postgres aur
  Redis use karte hain") and *every* later chat knows it — including "which language should I use
  for microservices?", which now factors in the stack you told it about. The facts are stored per
  member (`arch_chat_memory`, migration `20260928120000_v9_chat_memory`): name, role, tech stack and
  notes, bounded to 25 notes / 12 stack items.
- **A Memory panel, not a black box** (`Memory` in the chat header): see exactly what ARCH stored,
  add a note by hand, forget a single item, or **Forget everything**. Reading needs `copilot.read`;
  changing needs `copilot.generate`. "What ARCH knows about you" is a list you can edit — that is
  the only version of memory a team should accept.
- **"Clear memory" really clears it** — in chat or in the panel. The row keeps a `clearedAt`
  timestamp so the panel can say when it was last wiped, but the facts are gone, immediately, for
  every future conversation.
- **Nothing is guessed and nothing is shared.** Memory is filled only from what the member types
  (plus the account name as a last-resort fallback), is visible only to that member, and never
  trains the model — chat turns are still not training rows. Every add and wipe is audited with
  metadata only: counts and booleans, never the text.

### Added — Chat P1 · the mechanics every chat has: copy, export, and "Try again"

The V8 chat answered well but you could not *handle* an answer: no copy button, no way to retry a
weak answer without retyping the question, nothing to paste into a postmortem. Chat P1 closes that
opening minute of use — code only, still ₹0 per turn, still nothing leaving the server.

- **"Try again" on the last answer.** One click re-asks the same question against the workspace *as
  it is now* — declare an incident after asking "what is open?", hit Try again, and the answer
  includes it. The stored answer is rewritten in place (`POST /api/copilot/chat/sessions/{id}/regenerate`):
  the transcript keeps one answer per question, the message count does not drift, and the retry is
  audited with shape only — intent, confidence, latency — never the text.
- **Copy an answer, copy the whole chat, export it.** Each answer has a Copy button; the header
  copies the conversation or downloads it as a Markdown file (title, turns, and the sources each
  answer cited) — ready to paste into a postmortem or a handover doc. Entirely client-side.
- **It reads like a chat.** The newest answer reveals itself over a few hundred milliseconds instead
  of appearing fully formed (respecting `prefers-reduced-motion`), and the shortcuts are the
  familiar ones: `⌘/Ctrl+Shift+O` new chat, `⌘/Ctrl+K` search, `Esc` to close.
- **The wider plan is written down.** [`docs/product/AI-GAP-ANALYSIS.md`](docs/product/AI-GAP-ANALYSIS.md)
  is the honest diff between ARCH's own AI and ChatGPT — what is already better (grounding,
  privacy, cost, audit), what is closeable for ₹0 (this release is phase P1 of five), and what ₹0
  can never buy. The smoke suite covers `regenerate` too.

### Added — V8 · Chat with ARCH: your own model, in a real chat

Until now ARCH's own model was visible mostly through the incident panel and the model page — a
new workspace saw "train on your incidents" and nothing conversational. V8 adds the missing
surface: **Chat with ARCH** at `/dashboard/chat`, a ChatGPT-style assistant that runs on ARCH's
native engine — no external vendor, no API key, nothing leaving the server.

- **A real chat product, not a demo panel.** Conversations are stored per member: previous
  sessions in a sidebar (grouped Today / Yesterday / 7 days / 30 days, with search), an inline
  rename, delete one or clear all, and a transcript that keeps the thread across follow-ups. The
  first message names the chat automatically (60 characters); a human rename always wins over the
  auto-title. Sessions are private to their creator even inside one organization — a foreign id
  answers `404`, and the recents list never leaks someone else's chat.
- **Grounded answers with clickable evidence.** Every turn loads the workspace picture (open
  queue, recent resolutions, services, roster, 30-day resolve times) and, when the question needs
  it, the ARCH model's own similarity search over your incidents plus your knowledge base, pattern
  library and public postmortems. Answers cite what they used — incident, runbook, pattern,
  postmortem, workspace totals — and each citation links to the row it came from. No invented
  incidents: follow-up turns recall the subject you were discussing ("what did we learn from
  it?"), and an empty workspace gets the honest "nothing to ground this on yet" plus how to fix
  it.
- **Conversation, English or Hinglish.** Greetings, thanks, "who is on the team?", "kya open
  hai?", "kaise ho bhai", "what should I do next?" — ARCH answers in the language you asked in.
  Stats answers report an open-only severity mix and a 30-day resolve-time window so "Open now: 0"
  and "HIGH: 3" can never contradict each other.
- **No code generation, by design.** A code request is refused with the reason (a wrong snippet
  pasted into production is worse than no snippet) and redirected to Code Assist — Review, Fix or
  Thinker — which have the repository, the tests and the review loop. This is enforced in the
  engine with its own test, not a prompt instruction.
- **Free, offline, rate-limited and audited.** The engine is deterministic retrieval + templates,
  so warm answers land in tens of milliseconds and it works with `ARCH_OFFLINE_ONLY=true`.
  Reading your chats needs `copilot.read`; sending, renaming and deleting need `copilot.generate`
  (VIEWER gets `403`). A per-organization limit (`AI_RATE_LIMIT_PER_MINUTE`, 60-second window)
  answers `429` like the rest of Copilot, and the audit log records session create/rename/delete
  and message shape — intent, confidence, latency, characters — never the conversation itself.
- **The model page now leads to it.** `/dashboard/model` gets a **Chat with ARCH** button, the
  sidebar's Intelligence group lists chat first, and the command palette opens it.
- **Knowledge retrieval got a cache while we were here.** The retrieval corpus (chunks + metadata)
  is cached per organization for 8 seconds and invalidated on ingest, reindex and delete, so a
  burst of questions does not re-read and re-rank the whole knowledge base every turn. Chat's
  reliability is covered by 22 engine tests (intents, Hinglish, empty-workspace honesty, code
  refusal, citations) and 19 service tests against a real database (persistence order, per-user
  privacy, tenant isolation, sticky renames, delete/clear, rate limit, VIEWER `403`, latency
  budget).
- Testing guidance for a solo founder — alpha on your own data, beta with 3–7 friendly users,
  then load and failure-injection testing — is new in [`docs/ALPHA-TESTING.md`](docs/ALPHA-TESTING.md);
  the smoke suite now covers chat too (122 checks).

### Fixed — "Could not create your account" when the database is reachable but not migrated

- **Sign-up and sign-in now tell you when migrations are missing.** `npm run dev:next`, `npm start`
  and a new hosted PostgreSQL don't apply migrations. The database still answered connections, so
  ARCH skipped its "database is down" message. Then creating the account failed because the `users`
  table didn't exist, and all you saw was "Could not create your account. Please try again."
  `/register` and `/login` now say the tables are missing or out of date and tell you to run
  `npm run db:migrate`. A database role without permission on the tables, and a busy connection
  pool, get their own messages too.
- **`npm run db:migrate` works against managed PostgreSQL.** It used to connect to the `postgres`
  maintenance database first, and it removed `?sslmode=require` from `DATABASE_URL` when doing so.
  Hosts that require SSL or restrict that database (Neon, Supabase, Render, Railway…) failed before
  any migration ran. It now connects straight to your database with the URL unchanged. It only uses
  the maintenance database when it has to create a missing local database.
- **Two sign-ups at the same moment no longer fail with the generic error.** Prisma 7 reports
  unique-index conflicts in a new format, and the duplicate-email check didn't recognise it. A second
  sign-up for the same email now gets "An account with that email already exists". Two sign-ups
  creating the same organization name now retry with the next free slug (`acme-inc-2`).
- **Any failure left unexplained now has a traceable Error ID.** The form shows a short Error ID. The
  server logs a matching line with the Prisma/PostgreSQL error codes and the table, column or
  constraint involved. It never logs passwords, form data, email addresses or connection strings.

### Fixed — sign-in / sign-up on a fresh machine (and a build that needs no network)

Signing in or creating an account is the first thing anyone does with ARCH, so a failure there is
the whole product failing. Four real causes, all fixed:

- **`npm run dev` now brings up the whole stack.** It used to start Next.js alone and assume a
  database was already running, so on a fresh checkout (or a preview container) every page worked
  until you submitted the sign-up form, which then failed with "Could not create your account.
  Please try again." — because there was no PostgreSQL to write to. `npm run dev` now generates the
  Prisma client, starts a database if none is reachable (Docker-managed or embedded) and applies
  migrations before Next.js. `npm run dev:next` keeps the old "Next.js only" behaviour.
- **Auth failures now say what is actually wrong.** If the database is unreachable, `/login` and
  `/register` answer "ARCH can't reach its database … start PostgreSQL (`npm run db:up`, or
  `npm run dev`)" instead of "Invalid email or password." / "Please try again." The same condition
  returns `503 SERVICE_UNAVAILABLE` from the API instead of a generic `500`.
- **`next build` no longer needs the internet.** Inter and JetBrains Mono were loaded with
  `next/font/google`, which downloads from fonts.googleapis.com during the build; on an air-gapped
  or egress-restricted machine the build failed outright, and in dev mode Next retried the download
  on *every* render. Both variable fonts are now self-hosted from `src/app/fonts/` (OFL-1.1, licence
  files included) with `next/font/local`, so the build is network-free and every render is local.
- **The dev server is much less likely to run out of memory.** Extracting Turbopack source maps for
  each lazily-compiled route grew the server by roughly 90 MB per route — around 3.5 GB and an OOM
  kill after ~40 routes on a 4 GB machine, which took the whole preview down mid-session.
  Development now runs with `turbopackSourceMaps`/`turbopackInputSourceMaps` off plus
  `turbopackMemoryEviction: 'full'`: a full walk of the API surface peaks near 2 GB in warm runs
  instead of being killed at 3.5 GB. It is not a hard guarantee — a cold dev server compiling ~80
  routes can still climb past 3 GB — so run the whole `smoke:api` sweep against a production build
  (`npm run build && npm run start`), which answers the same 122 checks from ~300 MB.
  `ARCH_DEV_SOURCE_MAPS="true"` restores full stack traces when memory is not the constraint;
  production builds are unaffected.

### Added — password visibility toggle

- **Show/hide on every password field.** New `PasswordInput` (`src/components/ui/form.tsx`) adds an
  eye button to the sign-in and create-account forms. It is a real `<button type="button">` (never
  submits the form), keeps the caret and the typed value, and announces its state with
  `aria-pressed` plus a changing `aria-label`. A mistyped password is the most common failed
  sign-in, and on a phone there is no way to check one without this.
- **A clear hand-off after sign-up.** If the automatic sign-in that follows registration fails, the
  form redirects to `/login?registered=1` with "Account created. Sign in with the password you just
  chose." instead of leaving the person on a form that looks like nothing happened.

### Added — `npm run smoke:api`

- **One command that proves the backend works.** `scripts/smoke-api.mjs` registers a throwaway
  account, signs in through the real Auth.js credentials callback, and walks every API surface —
  projects, services, incidents (+ timeline, correlation, similar, blast radius), the full Copilot
  set, status pages (create → publish → anonymous read), HMAC-signed webhook ingestion, dependencies,
  changes, SLOs, knowledge sources, repo connections, the v1 bearer API, invitations and member
  removal — plus the negative paths (anonymous 401, cross-tenant 404, duplicate email 409, short
  password 422, malformed email 422, unsigned webhook 401, revoked token 401). 108 checks, non-zero
  exit on failure, `SMOKE_VERBOSE=1` for per-check output and `SMOKE_RSS=1` for per-request memory.
  It only creates `smoke-*` rows and refuses to run against a server it cannot reach.

### Added — Dashboard experience rebuild + ARCH V1.1 identity

- **New app shell.** Grouped sidebar navigation (Respond / Intelligence / Reliability / System) with
  an open-incident badge, glass topbar with breadcrumbs, a ⌘K command palette (jump to incidents,
  services and pages), a global toast stack for every mutation, and a mobile drawer + account menu.
- **Overview rebuilt.** Greeting header, all-clear/triage hero banner, stat cards with real 14-day
  sparklines, a "needs attention" incident table, an activity feed with actor avatars, live service
  health, quick actions, and an ARCH V1.1 spotlight card.
- **Incident workspace rebuilt.** Sticky header with a one-click state-machine dropdown, response
  timeline, template comment composer (⌘/Ctrl+Enter to post), triage rail, and blast-radius links
  that jump to the affected service.
- **New service detail page** (`/dashboard/services/[id]`). Live status with pin/derive controls,
  open + resolved incident feeds, and a details rail — every service name in the dashboard links to it.
- **New component structure.** `components/ui` (button, avatar, dialog, toast, tabs, segmented
  control, stat, sparkline, skeleton, logo), `components/organization` (dropdown org selector,
  invite modal with one-time copyable link, member table), `components/incident` (state dropdown,
  comment box, rich incident rows), `components/permission` (server-side `PermissionGate` wrapper),
  and `components/statuspage` (public badge, uptime bars, customer-safe incident list).
- **Settings go tabbed.** General / People / Webhooks / API tokens under `?tab=` links; People gets
  the invite modal and avatar member rows.
- **ARCH V1.1 naming.** The native intelligence is now called ARCH V1.1 everywhere responders see
  it — sidebar, response drafts, Ask panel, timeline badges, Code Assist and the model page
  (single constant in `src/lib/brand.ts`). API routes and permission names are unchanged.
- **Auth pages redesigned.** Split-screen sign-in / register with a brand panel; onboarding and
  invitation screens match the new language.
- **Landing site rebuilt.** Sticky nav, hero with a live CSS product mock, stats, how-it-works,
  an ARCH V1.1 spotlight section, feature grid, honest scope cards, and a closing CTA.
- **Public status pages rebuilt.** 90-day uptime bars computed from real incident spans, a
  resolved-incident history feed (new `recentResolvedForServices` query), redesigned active
  incident cards, and customer-safe wording throughout — still fully cached, no session.

### Added — V7 · Incident correlation, change-aware blast radius, and a conversational ARCH

- **Incident correlation & dedup.** Every alert now gets a content *fingerprint* — the title is
  normalized (hosts, numbers, timestamps, UUIDs and framing words removed; 4xx/5xx codes kept) and
  hashed with the source and service. Two visible results: (1) a repeating alert with the same
  signature collapses onto the open incident even when the sender sends no `dedupeKey` — the alert
  storm stops being nine incidents; (2) a new **Repeat alerts & shared root cause** panel on the
  incident page groups every occurrence of one signature and shows the strongest root-cause
  evidence ARCH has — a resolved twin's recorded cause ("same alert signature", fact) or a
  same-failure-family hypothesis ("hypothesis", labelled as such). Nothing merges or closes by
  itself; grouping is advisory and always shows its evidence level.
- **Change-aware blast radius.** `GET /api/changes/:id/blast-radius` answers "yeh service affect
  hoga?": from a deploy/commit, ARCH walks the service dependency map outwards and lists every
  downstream service ordered by graph distance, with the change-risk score and recent incidents on
  the affected set. Shown inline in the Change-risk panel ("Blast radius — who is downstream?").
  Read-only — it never blocks a deploy.
- **Ask ARCH — the conversational incident copilot.** A chat panel on the incident workspace,
  powered entirely by the native engine (no language model, no cost). New in the brain:
  - **Basic conversation**: greetings ("hi", "kaise ho?"), thanks, and "what can you do?" — real
    questions still win over small talk ("thanks — what's the status?" is a status question).
  - **Problem-solving advice, not code**: describe any ops problem ("database slow hai, kya
    karu?", "API latency is spiking — how do I reduce it?") and ARCH answers with a structured
    approach — what it usually is, what to check first, what usually fixes it, prevention — from
    12 built-in playbooks (database, cache, latency, errors, queues, disk, memory, network, auth,
    deploys, traffic, outages), enriched with your runbooks when they match. It advises and says
    where to verify; it never writes code or acts on anything.
  - **Follow-up memory**: short follow-ups ("what about the database?", "aur phir?") resolve
    against the last few turns of the conversation.
  - **Honest fallback**: an unrecognized question that is plainly asking for help gets the generic
    triage approach instead of "I did not understand"; everything else still recaps the incident
    and offers follow-ups.
- The Verified Fix runner (patch → isolated sandbox → test evidence → human approval → PR, never
  auto-applied) was reviewed for this release and left as-is: sandbox isolation, timeouts, unsafe-
  patch detection and the no-apply guarantee were already covered by tests.

### Added — Native Thinker + read-only GitHub Repo Insight

- **Code Assist → Thinker (`scaffold`).** Native, no LLM: intent + one small boilerplate snippet
  (CRUD route, Zod, Prisma, webhook, status machine, test, form) plus file path, paste-risks, and
  what the human still owns. Always native even under `arch-hybrid`. Not a coding agent.
- **Repo Insight.** Connected GitHub repos can be *read* (tree subset + analyzer + GitHub how-tos
  such as making a repo private). ARCH never pushes, branches, or opens a PR from Insight.
  Verified Fix remains the only write path, and still needs human approval.

### Added — V6 · Your own knowledge base, learning from corrections, and honest risk scores

- **Copilot can cite your runbooks.** New **Knowledge** page (`/dashboard/knowledge`, `knowledge.*`
  permissions): paste a runbook, a doc or a note, or fetch a public documentation page, and ARCH
  chunks it, embeds it on your server and retrieves the relevant passages when a responder asks for
  a summary, triage, status update, postmortem or code fix. Drafts cite the source by name, and a
  citation only appears once it clears a relevance floor — otherwise Copilot says it has no source.
  Retrieval is hybrid: dense similarity over ARCH's own embeddings catches a runbook that describes
  the same failure in different words, keyword matching keeps exact error codes findable. There is
  no external vector database and no embedding API; the "external database" is your own Postgres.
- **Nothing is fetched while a responder is waiting.** Fetching is a human action (the button on the
  Knowledge page, or `npm run knowledge:fetch -- --org … --user …`), it is SSRF-guarded (http/https
  only, no credentials, localhost/`.internal`/private/link-local addresses refused on every DNS
  record, ≤3 redirects each re-checked, 10s timeout, 2MB cap, HTML stripped of `script`/`style`),
  rate-limited at 10/min per organization, audited as `knowledge.fetch`, and switched off entirely
  by `ARCH_OFFLINE_ONLY`.
- **Confidence you can trust.** Severity and category predictions are now temperature-calibrated on
  your own held-out incidents, so a reported 80% means 80%. The ARCH Model page shows the fitted
  temperature, and says "not fitted yet" instead of pretending.
- **The model learns from corrections.** Approving a draft teaches it it was right; editing or
  dismissing one teaches it what was wrong; changing an incident's severity by hand records what
  ARCH would have said and the label you chose instead. Corrections train at 3× weight, and the
  model page shows the feedback breakdown (approved / edited / dismissed / corrections).
- **Drift is visible, and never promoted.** A candidate model that regresses on measured holdout
  accuracy is flagged as drift in the audit log and on the model page, with the version that
  regressed and by how much — and it does not start serving.
- **"Have we seen this before?"** on every incident: similar past incidents with what fixed them and
  how long they took, plus the matching runbook passages. Cross-tenant and org-scoped throughout.
- **"Which change caused this?"** on the declare-incident page: recent changes ranked by the
  probability that your own history associates that kind of change with an incident within the hour,
  with the reasons (change type, time of day, size, service). Below 20 changes ARCH says it does not
  know instead of guessing, and it never blocks or rolls anything back — it is a ranking aid.
- **A verified fix now proves itself.** ARCH generates a failing test from the diagnosis, runs it
  against the code at the pinned commit, applies the patch, and runs it again. The badge says
  `PASSED` only when the test failed before and passed after; the panel shows both runs and the
  generated test. When the repository contents cannot be read, the run falls back to patch-only
  verification and says so with the reason rather than implying proof.
- **Guardrails are documented and enforced.** `docs/engineering/AI-GUARDRAILS.md` lists every rule
  — draft-only, minimal org-scoped context, redaction, 15s timeout + 1 retry, 20 calls/min per org,
  audit on every generate/approve/dismiss, the offline lock, the fetch guard and the reproduction
  rule — with the file that enforces it and the test that fails if it stops being true.
- **An eval harness with a golden set.** `tests/arch-eval.test.ts` scores a hand-written set of 34
  incidents covering all 22 failure families, asserts the base model stays above 75%, and asserts
  that training on your own incidents reaches 100% — the same set `npm run model:eval` prints.

### Migration notes — V6
- Run `npm run db:migrate`. It adds `knowledge_sources` + `knowledge_chunks` (the RAG store),
  `arch_model_feedback` (corrections and draft feedback) and `change_events` (deploy-risk features),
  and adds the reproduction columns to `fix_verifications`. Nothing else is required — an empty
  knowledge base simply means Copilot has nothing to cite.
- Model artifacts stay **format 1**: an already-trained model keeps serving, and picks up
  calibration on its next retrain (a missing calibration defaults to a temperature of 1).

### Added — sign-in

- **"Continue with GitHub" on the sign-in page.** Set `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` in
  `.env` (setup steps are documented next to the keys in `.env.example`) and the button appears on
  `/login`; leave them blank and the page is unchanged. GitHub sign-ins create the local user on
  first login, so RBAC, memberships and audit logs work exactly as for email/password accounts, and
  a failed or misconfigured attempt lands back on `/login` with a plain-English message instead of
  a stack trace.

### Added — developer tooling

- **`npm run github:debug -- --repo owner/name --symptom "…"` explores a repository and ranks the
  files most likely to hold your bug.** It reads the real commit tree from GitHub, drops
  vendored/generated/lock paths, scores the rest against your symptom (or `--issue N`), then runs
  the same `analyzeCode()` rules Code Assist uses and ranks the findings by how close they sit to a
  line that mentions the symptom. Output is Markdown (stdout or `--out report.md`) or `--json`.
  Reads only — a `contents:read` token, no model in the loop, independent of `ARCH_OFFLINE_ONLY`.

### Fixed

- **A live-looking GitHub PAT was committed in `.env.example` again.** It is back to a placeholder.
  Any token that has been in git history should be treated as leaked and rotated at
  <https://github.com/settings/tokens>. Placeholder values are ignored at runtime, so copying the
  example file can no longer flip ARCH into "real" GitHub mode.
- **Verified-fix commits were prefixed twice** (`fix(arch): fix(arch): …`). The subject is prefixed once
  and stays within 72 characters.
- **A 422 from GitHub that was not "branch already exists" force-updated the ref.** Only a leftover
  branch is reused.
- **Repo access checks warned "read-only" when GitHub omitted the permissions block.** That warning
  now fires only when GitHub actually said `push: false`.
- **A rejected GitHub token threw instead of returning a check the dashboard can show.** `GET /api/github`
  and `npm run github:check` report the failure and exit non-zero.
- **Assignment updates were stored as status-change emails.** Assignment-only changes now use
  `INCIDENT_ASSIGNED`, and the inviter is notified when an invitation is accepted (`INVITATION_ACCEPTED`).
- **`/api/health` reported version 0.2.0** and could echo a database URL. It now reports the package
  version, a redacted database error, and whether GitHub is configured (no token, no network probe).
- **Resend calls had no deadline** and unknown `EMAIL_PROVIDER` values failed silently. Requests time
  out after 15s, provider errors are scrubbed, and a missing key falls back to the console adapter
  with a warning.

### Added — V4.1 · Real GitHub PR creation (M1 + M4 completed)

- **"Approve & create PR" actually opens a pull request now.** Previously `createPullRequest`
  returned a fabricated `https://github.com/{org}/{repo}/pull/{random}` URL *in every mode* —
  including when a real token was configured — so the dashboard and the audit log claimed a PR
  existed that never did. With `GITHUB_TOKEN` set, ARCH now runs the real flow via Octokit:
  resolve the base (pinned commit SHA, the M1 `repo@commit` guarantee, falling back to the base
  branch head), read every file the patch touches **at that commit**, apply the hunks, then push
  one blob per file → one tree → one commit → `refs/heads/arch/fix-*` → a **draft pull request**
  (`GITHUB_PR_DRAFT="true"`).
- **The patch is turned into real file contents in-process** (`src/server/services/github-patch.ts`),
  because GitHub's Git Data API takes blobs, not diffs. Hunks that don't fit the pinned commit abort
  with a conflict the human can act on — nothing is pushed, and the audit log gets a
  `pr.create_failed` entry. A `\ No newline at end of file` marker, multi-file diffs, markdown
  fences around the patch and ±120-line hunk drift are all handled.
- **Repo connect and commit pinning are now validated against GitHub.** Connecting a repo the
  token cannot see fails at connect time (404 with the reason), short commit pins are resolved to
  full 40-char SHAs (a 7-char pin used to explode at approval time, because `git createRef` only
  takes full SHAs), the repository's actual default branch is used instead of a blind `main`
  guess, archived repos are refused, and a read-only token is recorded as a warning in the
  audit note. Duplicate connections are matched case-insensitively (`Acme/Api` IS `acme/api`).
- **New configuration:** `GITHUB_MODE` (`auto`/`mock`/`real`; `auto` = real when a token is set),
  `GITHUB_API_BASE_URL` (GitHub Enterprise), `GITHUB_TIMEOUT_MS`, `GITHUB_PR_DRAFT`. This is
  deliberately **independent of `ARCH_OFFLINE_ONLY`**: that flag is the AI privacy lock (which
  model may see incident data), while opening a PR is an explicit human-approved push. You no
  longer have to permit external AI vendors to get real pull requests — the AI lock stays ON.
- **See the problem before the approval depends on it:** `/dashboard/repos` gains a GitHub token
  panel (mode, masked token, live token probe, repo-access check), `GET/POST /api/github`
  reports the same (`repo.manage` required to probe a repo), and
  `npm run github:check` runs the whole diagnosis from the command line — including
  `--preview-patch fix.patch`, which proves a patch still applies to the pinned commit **without
  pushing anything**.
- **PR state sync from GitHub:** `POST /api/incidents/:id/copilot/pull-requests/sync`
  re-reads every PR ARCH opened for an incident and stores `MERGED`/`CLOSED`, so the UI stops
  claiming "OPEN" for a PR a human merged last week (audited as `pr.sync`).
- **Offline mode is honest.** Mock PRs are recorded with status `MOCK` and *no* URL instead of a
  dead github.com link; the incident panel says so plainly.

### Security — V4.1

- **A live `ghp_…` PAT was committed in `.env.example`** (the one file users are told to copy)
  and is in git history on the default branch — treat it as leaked: revoke it at
  <https://github.com/settings/tokens>. New `tests/secret-hygiene.test.ts` fails CI if any
  token-shaped string appears in tracked files again, and `.env.example` carries placeholders
  only, with a "never put the real token here" warning. In production ARCH now refuses to boot
  with a `replace-with…` placeholder token, refuses `GITHUB_MODE="real"` without a token, and
  requires an `https://` GitHub API base URL.
- Error messages from GitHub are scrubbed of token-shaped strings (`ghp_…`, `github_pat_…`,
  `x-access-token:…@`) before they are logged or returned — a failing request used to echo the
  credential back into ARCH's logs.

### Compatibility — V4.1
- Existing tests, mock mode and the draft→approve flow are unchanged; the suite runs hermetically
  (it pins `GITHUB_MODE=mock`/`GITHUB_TOKEN=""`, so an exported token on the developer machine can
  no longer make tests hit api.github.com). Default behaviour with no token configured is still the
  offline record, exactly as before.


### Added — V3.1 · Model registry, background training and more training data

- **Retraining is now a background job.** "Retrain now" (and `POST /api/copilot/model/train`)
  queues a job and returns `202 Accepted` immediately — training never runs inside a web request.
  The worker claims the job, trains a candidate, evaluates it and promotes it **only if it beats
  the model currently serving** the workspace. Losing runs are kept as `REJECTED` with the reason.
- **Model registry.** Every training run is kept as a version (`arch_model_versions`, migration
  `20260925180000_v3_model_registry`) with its artifact, metrics and evaluation. The new registry
  table on `/dashboard/model` lists every version; OWNER/ADMIN can activate any of them
  (**rollback**), via `POST /api/copilot/model/rollback` or
  `POST /api/copilot/model/versions/:id/activate`.
- **Version audit trail.** Every train/promote/reject and every activation writes an audit entry
  including `fromVersion → version`, so the audit log shows which model version was serving at any
  point in time.
- **More training data** — the model gets smarter with every corpus you download (git-ignored,
  fetched at run time, license texts and notices saved alongside):
  - `npm run model:fetch-code` — real bug-fix knowledge: **SWE-bench / SWE-bench Verified (MIT)**
    and **ManySStuBs4J (Apache-2.0)**. Feeds code-fix suggestions (stack trace → patch).
  - `npm run model:fetch-review` — human code-review knowledge: **github-codereview (MIT)** and
    **Microsoft CodeReviewer (Apache-2.0)**. Grounds Code Assist answers in what real reviewers said.
  - `npm run model:fetch-public` now also indexes **saystone/awesome-postmortem (CC0)**.
- **License documents.** `docs/legal/TRAINING-DATA-LICENSES.md` (every dataset, verified license,
  commercial-use guidance) and `docs/legal/ARCH-MODEL-LICENSE.md` (the ARCH Model's own license /
  model card: ownership, draft-only acceptable use, no warranty).

### Compatibility — V3.1
- **`EngineOutput` is unchanged.** The four V2 features (summary, triage, status update,
  postmortem) keep their exact JSON contracts and knowledge mix; the code/review corpora enrich
  only code tasks (`CODE_FIX`, Code Assist).
- **Safeguards unchanged.** Everything stays draft-only with human approval, organization-scoped
  data, redaction and audit trail. Code-fix patches are displayed and posted as text after
  approval — never applied to a repository.

### Migration notes — V3.1
- Run `npm run db:migrate`. It adds `arch_model_versions` + `arch_model_jobs` and points
  `arch_models` at the registry. Existing models keep serving; their first retrain registers v1.
- Start the worker (`npm run worker`) — it now drains the training queue as well as notifications.

### Added — V3 · ARCH's own AI (no external AI vendors)
- **ARCH Copilot now runs on ARCH's own model by default.** Summaries, triage, status-update drafts
  and postmortems are produced on your server. Incident data is no longer sent to OpenAI or
  Anthropic. No API key, no GPU and no per-call cost.
- **It learns from your team.** Each workspace gets its own model, trained on its resolved incidents
  and approved postmortems (never on another workspace's data). Drafts point to similar past
  incidents, what fixed them and how long they took. The model retrains automatically as incidents
  are resolved; admins can retrain on demand and see its measured accuracy on the new
  **ARCH Model** page.
- **Code fix suggestions** in the incident Copilot panel. Paste a stack trace, error log or code
  snippet to get a diagnosis, the likely cause, fix steps and a patch when a safe fix exists. It is
  a draft, like everything else.
- **Code Assist** (new page). Review code for the bugs that cause incidents (missing timeouts,
  swallowed errors, SQL injection, hard-coded secrets, retry storms), get a safer version, or get a
  stack trace explained. Code is not stored, and secrets are never echoed back.
- **Optional local LLM.** Point ARCH at a free open-source model on your own machine (for example
  Qwen2.5-Coder-7B via Ollama, which runs on CPU with 16 GB RAM) for more fluent drafts and code
  rewrites. ARCH falls back to its own model if the LLM is slow or unavailable.
- **Privacy lock.** `ARCH_OFFLINE_ONLY` (on by default) refuses external AI vendors and any
  non-private model URL.

### Changed
- `AI_PROVIDER` now defaults to `arch` (was `mock`). The external `openai` / `anthropic` providers
  require `ARCH_OFFLINE_ONLY="false"`.

### Migration notes
- Run `npm run db:migrate`. It adds the `arch_models` table and the `CODE_FIX` suggestion type.
- No configuration is required. To use a local LLM, see `docs/engineering/ARCH-MODEL.md`.

### Added — V2 · ARCH Copilot (milestones M1–M3 of `AGENTS-V2.md`)
- **AI drafts in the incident workspace.** Ask ARCH Copilot for an incident summary (at most five
  bullets), a triage suggestion (severity and assignee), a customer-safe status-page update, or a
  blameless postmortem with Timeline / Impact / Root cause / Action items.
- **Humans stay in charge.** Every draft waits for review. Responders, admins and owners can edit
  and approve it — which posts it to the timeline (and therefore to your status page, for status
  updates) or applies the triage — or dismiss it. Viewers can read drafts but not act on them.
  Reviewer and time are recorded, and dismissed drafts stay in the audit trail.
- **Privacy by default.** Only the incident title, severity, status, timing, affected service and
  timeline entries are sent to the AI provider, after passwords, API keys, tokens, connection-string
  credentials and email addresses are redacted. Names, ids and other organizations' data are never
  sent. Status drafts are scrubbed of internal hostnames, IP addresses and URLs.
- **Predictable behaviour.** 15-second timeout, one automatic retry, then a friendly error; a limit
  of 20 AI calls per minute per organization; token usage recorded on every draft and audit entry.
- **Bring your own provider.** OpenAI or Anthropic via `AI_PROVIDER` / `AI_API_KEY`; the default
  `mock` provider works offline with no key.

### Changed
- New `503 SERVICE_UNAVAILABLE` error code for failures of external dependencies (the AI provider).
- Database migration `20260925000000_v2_ai_suggestions` adds the `ai_suggestions` table.

### Planned — v1.1, P1 features
Slack notifications behind `FEATURE_SLACK_NOTIFICATIONS`, on-call schedules and escalation, custom
status page domains, two-factor authentication, and the first monitoring integrations.

See [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) for the full milestone plan.

---

## [0.2.0] — 2026-09-22

**P0 feature-complete: ARCH now runs.** Milestones 1–10 of `AGENTS.md` are implemented and the whole
P0 scope of `docs/product/FEATURES.md` works end to end — register, create an organization, invite
your team, open an incident from the dashboard or from an incoming alert, resolve it, and let your
customers watch on a status page.

### Added
- **Authentication** — email/password registration and login (bcrypt, JWT sessions via Auth.js v5),
  optional GitHub OAuth, protected `/dashboard/*` routes, and a `GET /api/health` endpoint that
  reports database reachability for uptime checks.
- **Multi-tenancy** — organizations, memberships and invitations. The creator becomes OWNER; the last
  OWNER can never be demoted or removed; invitations are single-use, expire after 7 days and can only
  be accepted by the person they were sent to.
- **Roles and permissions** — OWNER, ADMIN, RESPONDER, VIEWER, enforced server-side on every request
  and asserted cell-by-cell in the test suite. Insufficient role is `403`; a resource belonging to
  another organization is `404` so ids cannot be probed.
- **Projects and services** — CRUD, with a service status (`OPERATIONAL`, `DEGRADED`, `PARTIAL_OUTAGE`,
  `OUTAGE`, `MAINTENANCE`) that follows open incidents automatically and can be pinned manually.
- **Incidents** — create, assign, triage, comment. Status moves through
  `INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED`, may skip forward, and can be reopened from
  RESOLVED. Illegal transitions are rejected with `409` and a list of what *is* allowed. Every write
  records a timeline event and an audit entry in the same database transaction.
- **Timeline** — one chronological history per incident: creation, status changes, assignments,
  comments, with the actor marked as a person or as `webhook:<provider>`.
- **Filters and pagination** — search across title and description, filter by status, severity, open
  state and project; paginated server-side.
- **Public status page** — `/{slug}` with per-service components, active incidents and their latest
  update. Publish and unpublish from the dashboard; an unpublished page is `404` for everyone.
- **Webhook ingestion** — `POST /api/webhooks/{provider}` for GitHub, Sentry and Grafana payloads,
  HMAC-verified before parsing, replay-protected by timestamp tolerance, idempotent by delivery id and
  by provider dedupe key, and fully logged per endpoint so failures can be diagnosed.
- **Email notifications** — a Postgres-backed outbox: incident and invitation emails are queued inside
  the same transaction as the change that caused them, then delivered by `npm run worker` with retries
  and a visible PENDING → SENT/FAILED state. Console adapter in development.
- **Audit log** — an admin-only, paginated, append-only record of every meaningful action.
- **Hardening** — rate limiting on registration, login, webhook ingestion and public status reads;
  Zod validation on every input; loading, empty and error states throughout the dashboard and on the
  public status page; structured error envelopes with stable codes.
- **Developer experience** — `npm run setup` (embedded PostgreSQL when Docker is unavailable),
  repeatable SQL migrations, `npm run db:seed` demo data for four roles, and 104 tests covering the
  permission matrix, incident transitions, tenant isolation and webhook signatures.

### Known limitations (disclosed, not hidden)
- Notifications are email-only; Slack is behind a feature flag and not wired to a real workspace yet.
- The background worker is a polling loop started with `npm run worker`; scheduling is the deployer's
  job until the managed deployment exists.
- No on-call schedules, escalation policies or SMS/voice paging — those are v1.2 scope.

---

## [0.1.0] — 2026-09-23

**Documentation and architecture baseline.** No application code yet — this release freezes the
blueprint that the build follows.

### Added
- **Product definition** — `docs/product/PRD.md` (scope, requirements, risks, success criteria),
  `docs/product/FEATURES.md` (every feature marked Must/Should/Later), and
  `docs/product/USER-STORIES.md` (stories with testable acceptance criteria).
- **Plain-English product explanation** — `docs/EXPLAINED-SIMPLY.md`: the whole product explained
  without jargon, including the journey of one alert from webhook to post-mortem.
- **Roadmap and economics** — `docs/product/ROADMAP.md` (10 milestones to v1.0, with estimates and a
  launch gate), `docs/product/PRICING.md` (plans, limits, unit economics, market positioning),
  `docs/product/METRICS.md` (north-star metric and KPI tree).
- **Engineering documentation** — `docs/engineering/ARCHITECTURE.md` (layers, request lifecycle,
  tenancy enforcement, state machine, decision log), `docs/engineering/SECURITY-AND-COMPLIANCE.md`
  (threat model, controls, honest compliance status),
  `docs/engineering/OPERATIONS-RUNBOOK.md` (deploy, rollback, backup/restore, our own incident process).
- **Go-to-market** — `docs/go-to-market/GTM-PLAN.md`, `COMPETITIVE-ANALYSIS.md` (verified September 2026
  pricing), and `BRAND-GUIDE.md`.
- **Legal set (templates, pending counsel review)** — Privacy Policy, Terms of Service, Data Processing
  Addendum, Service Level Agreement, Cookie Policy, Acceptable Use Policy, and a placeholder checklist
  in `docs/legal/README-NOTES.md`.
- **Support set** — `docs/support/FAQ.md`, `SUPPORT-POLICY.md`, `CUSTOMER-ONBOARDING.md`.
- **Repository hygiene** — `AGENTS.md` (the engineering build contract), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`, `.gitignore`, `.env.example`.

### Decisions frozen in this release
- Modular monolith on Next.js App Router, PostgreSQL 16 with Prisma, Auth.js for identity.
- Organization-scoped tenancy enforced at the repository layer; cross-tenant access returns **404**.
- Incident state machine `INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED` with legal forward skips
  and a recorded reopen.
- HTTP-verified webhook ingestion with HMAC-before-parse and idempotent handling.
- Email behind an adapter; no external job runner until notifications require one.
- **No AI features in v1.** Not the differentiator, and it adds data-handling risk before trust exists.
- Pricing per **organization**, not per seat — the primary competitive wedge.

### Known limitations (disclosed, not hidden)
- No SOC 2 / ISO 27001 certification; the security posture is documented honestly instead.
- No HIPAA support and no card-data handling; both are prohibited by the Acceptable Use Policy.
- No two-factor authentication until v1.2; no SAML/SSO until v2 (gated).
- No on-call paging, escalation policies, or SMS/voice notification in v1.
- No monitoring or detection; ARCH ingests alerts, it does not generate them.
- Legal documents require placeholder replacement and counsel review before publication.

---

## How to write an entry

```markdown
## [1.2.0] — YYYY-MM-DD

### Added
- Custom status page domains (`status.yourcompany.com`) on Growth and Scale plans.

### Fixed
- Status page no longer briefly shows a stale service status after an incident is resolved. (#412)

### Security
- Patched a cross-tenant read in the audit export endpoint (Severity: High). All versions before
  1.2.0 were affected; no evidence of exploitation. Thank you to [reporter].
```
