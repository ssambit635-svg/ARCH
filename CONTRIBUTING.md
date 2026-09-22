# Contributing to ARCH

Thanks for wanting to help. This repository is currently the **product blueprint** — documentation
that the application is built from. There is no application code yet; the build starts at Milestone 1
in [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md).

---

## Ways to contribute right now

| Contribution | Where |
|---|---|
| Report a documentation error or contradiction | Open an issue quoting the file and line |
| Improve clarity of a document | A pull request with a short rationale |
| Challenge an architectural decision | Open an issue referencing the decision number in `docs/engineering/ARCHITECTURE.md` §13 |
| Report a security concern | **Do not open a public issue** — see [`SECURITY.md`](SECURITY.md) |
| Suggest a feature | Open an issue; it gets considered against `docs/product/FEATURES.md` |

**Before proposing a new feature, read the out-of-scope lists.** `docs/product/PRD.md` §2,
`docs/product/ROADMAP.md`, and the exclusions in `docs/product/FEATURES.md` exist to protect the v1
scope. Proposals that re-litigate them need new evidence, not enthusiasm.

---

## The one rule that matters: docs and code never disagree

If you change behaviour, update the document in the **same** pull request. Specifically:

| If you change… | Update… |
|---|---|
| A database model or enum | `AGENTS.md` §4 (schema) and `docs/product/PRD.md` §7 |
| An API route or its permissions | `AGENTS.md` §5 and §6 |
| A permission rule | `AGENTS.md` §6 and `docs/EXPLAINED-SIMPLY.md` §5 |
| A feature's scope | `docs/product/FEATURES.md` and `docs/product/PRD.md` |
| Pricing, limits or plan behaviour | `docs/product/PRICING.md` and `docs/support/FAQ.md` |
| Security posture or a new subprocessor | `docs/engineering/SECURITY-AND-COMPLIANCE.md`, `docs/legal/PRIVACY-POLICY.md`, `docs/legal/DATA-PROCESSING-ADDENDUM.md` |
| Retention windows | Privacy Policy, DPA and SLA together — **all three, always** |
| Anything shipped to customers | `CHANGELOG.md` |

A contradiction between documents is a bug of the same severity as a failing test.

---

## Working on the application (once Milestone 1 lands)

### Setup
```bash
npm install
docker compose up -d          # PostgreSQL on :5432
npx prisma migrate dev
npm run dev                   # http://localhost:3000
```

### Non-negotiable engineering rules
Full list in [`AGENTS.md`](AGENTS.md) §9. The short version:

1. **TypeScript strict.** No `any` in service or repository signatures.
2. **Validate every external input with Zod** — bodies, query params, webhook payloads.
3. **Tenant safety:** repositories take `organizationId` as a **required** parameter. There is no
   `findById(id)` — only `findById(organizationId, id)`.
4. **Authorize server-side on every mutation** via `requirePermission`. Never trust an org id, role or
   permission from the client.
5. **Cross-tenant access returns 404**, never 403 — do not confirm that another tenant's resource exists.
6. **Transactions for multi-write operations** (incident + event + audit + notification).
7. **Webhooks: verify HMAC before parsing.** Store secret hashes only. Reject stale timestamps.
8. **Never log or return** tokens, password hashes, webhook secrets or customer content.
9. **Small vertical slices:** database → server logic → API → UI → test, in one pull request.
10. **Every screen ships loading, empty and error states.** Forms are accessible (labelled, keyboard
    operable, focus visible).

### Tests that must pass before merge
- **Permission matrix** — each role × each action, allowed and denied.
- **Tenant isolation** — cross-org ID, cross-org slug, tampered body org id → 404 or ignored.
- **Incident state machine** — every legal transition works, every illegal one is rejected.
- **Webhook signatures** — valid accepted; invalid, stale, or missing rejected with nothing stored.

If a change makes one of these fail, the change as written is wrong — not the test.

---

## Commit and pull request conventions

**Commit style:** `type(scope): summary` — `feat(incidents): add reopen transition`,
`fix(auth): reject expired reset tokens`, `docs(pricing): correct Growth seat count`.

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `security`.

**Pull requests:**
- One vertical slice per PR. If it needs the word "and" twice in the description, split it.
- Describe: what changed, why, what you tested, and what you deliberately left out.
- Reference the milestone (`ROADMAP.md` #5) or the story (`US-4.2`).
- Never merge your own PR without a written self-review explaining the risk. With a small team that
  is the only review available — so it must be honest.
- A rollback is a success, not a failure. Say so in the PR if you are unsure.

---

## Documentation style

- Short sentences, active voice, second person.
- Numbers over adjectives. "200 ms p95" beats "fast".
- No unearned superlatives: best-in-class, seamless, world-class, revolutionary.
- Every document has an **owner** and a **last reviewed** date at the bottom.
- Tables for anything comparative; diagrams in plain ASCII so they survive in any editor.
- Write so a new engineer can act on it in their first week without asking anyone.

---

## Code of conduct

Participation is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). In short: be the kind of
reviewer you needed when you were learning.

---

## Licensing

This repository is **proprietary** — see [`LICENSE`](LICENSE). Contributing does not transfer
ownership; by opening a pull request you confirm you have the right to submit the contribution and
agree that it is licensed under the same terms.

---

*Owner: Engineering · Review cadence: 90 days*
