# ARCH — Brand guide

**Version:** 1.0 · **Owner:** Founders · **Last reviewed:** 2026-09-23

---

## 1. The name

**ARCH** — always uppercase, always four letters, never "Arch" or "ARCH." or "ARCH inc".

Why the name works: an *arch* is a structure that holds weight by distributing it — which is exactly
what an incident process does for a team under pressure. It is short, pronounceable in one syllable,
not a made-up spelling, and unlikely to be confused with a competitor.

**Usage rules**

| Correct | Incorrect |
|---|---|
| ARCH | Arch, arch, A.R.C.H |
| the ARCH status page | the ARCH's status page |
| an ARCH organization | an Arch org |
| ARCH's audit log | Archs audit log |

- **Pronounced:** "arch" (as in *architecture*), one syllable.
- **Never** pluralise with an apostrophe: "ARCH orgs", not "ARCH's orgs" for plural.
- When ambiguity with a common word matters (legal documents, press), write "ARCH (the Service)" at
  first mention, then "ARCH".
- **Tagline (primary):** *Where your team goes when your application breaks.*
- **Secondary line (pricing wedge):** *Priced per organization. Everyone can be in the room.*

---

## 2. Who we sound like

**Voice:** a senior engineer who has been paged at 3 a.m. and has no patience for marketing language.
Calm, specific, unimpressed by buzzwords. Helpful before impressive.

**Tone by context:**

| Context | Tone | Example |
|---|---|---|
| Marketing site | Confident, plain, benefit-first | "Publish a status page your customers can actually read." |
| Public status page | Neutral, factual, no blame, no jargon | "Checkout is slow for some users. We are investigating. Next update in 30 minutes." |
| Incident updates | Short sentences, times, no speculation | "Rolled back at 14:05 UTC. Error rate returning to baseline." |
| Documentation | Instructional, second person, no fluff | "Create a project, then add a service for each thing you monitor." |
| Error messages | What happened, what to do next, never blame the user | "That project name is taken in this organization. Try 'checkout-api' instead." |
| Bills & legal | Precise, boring, unambiguous | — |
| Post-mortems | Blameless, concrete, own the failure | "We shipped a migration without a rollback rehearsal. That changes this week." |

---

## 3. Writing rules

1. **Short sentences.** If a sentence needs a comma to survive, split it.
2. **Active voice, always.** "ARCH records the change", not "the change is recorded."
3. **Second person.** "You", "your team" — never "the user".
4. **Numbers over adjectives.** "200 ms p95" beats "blazing fast". "25 seats included" beats
   "generous limits".
5. **No unearned superlatives.** Best-in-class, world-class, enterprise-grade, revolutionary, seamless,
   next-generation, AI-powered — all banned. If a claim cannot be verified with a link, cut it.
6. **Name the limitation before the customer finds it.** Trust is the product.
7. **No jargon into customer-facing text.** On the public status page write "slow", not "latency
   degradation". In docs, define a term on first use.
8. **Times always carry a zone.** "14:05 UTC (19:35 IST)".
9. **Say what happens next.** Every update, email and error message ends with the next step or the
   next update time.
10. **Never blame the customer, a provider by name, or an engineer.** Systems fail; we explain, we
    don't assign fault publicly.

**Words we use:** incident, responder, timeline, status page, severity, monitored service, audit log,
organization, tenant-safe, reproducible, rollback, post-mortem, blameless.

**Words we avoid:** outage-pocalypse, war room (unless quoting a customer), hero, rockstar, ninja,
"just", "simply", "obviously", "our proprietary algorithm".

---

## 4. Colour palette

Grounded in "calm control room": deep slate neutrals, one strong signal colour, and status colours
that are unambiguous — including for the ~8% of men with colour vision deficiency.

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary | Arch Slate | `#1B2430` | Backgrounds, headers, primary text on light |
| Primary (light) | Slate 700 | `#334155` | Secondary text, borders |
| Accent | Signal Indigo | `#4F46E5` | Primary buttons, links, focus rings — one accent only |
| Surface | Paper | `#F8FAFC` | Page background |
| Surface (raised) | White | `#FFFFFF` | Cards, modals |
| Border | Line | `#E2E8F0` | Dividers, input borders |
| Text | Ink | `#0F172A` | Body copy |
| Text (muted) | Slate 500 | `#64748B` | Metadata, timestamps |

**Status colours (never used for decoration — status only):**

| Status | Hex | Shape/icon requirement |
|---|---|---|
| OPERATIONAL | `#15803D` | Filled circle + word |
| DEGRADED | `#B45309` | Half-filled circle + word |
| OUTAGE | `#B91C1C` | Crossed circle + word |
| MAINTENANCE | `#1D4ED8` | Clock icon + word |

> **Accessibility rule:** status is *always* communicated by **colour + shape + text label**. Colour
> alone is a WCAG failure and, in an incident, a misread status is a real operational problem.

Contrast: all body text must meet WCAG AA (4.5:1) on its background; large text minimum 3:1.

---

## 5. Typography

| Use | Font | Fallback stack |
|---|---|---|
| UI + body | Inter | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Headlines (marketing only) | Inter, tight tracking (-0.02em) | same |
| Code, IDs, timestamps in logs | JetBrains Mono | `ui-monospace, SFMono-Regular, Menlo, monospace` |

**Scale (rem):** 0.75 caption · 0.875 small · 1.0 body · 1.25 h3 · 1.5 h2 · 2.0 h1 · 2.5 hero.
**Weight:** 400 body, 500 emphasis, 600 headings. Never 700+ except the hero.
**Line height:** 1.6 body, 1.25 headings. Never justify text.

---

## 6. Logo & mark rules

- Wordmark: **ARCH** in Inter 600, letter-spacing +0.05em, all caps.
- Clear space: minimum the height of the "A" on all sides.
- Minimum size: 80 px wide digital, 20 mm print.
- On dark backgrounds: white wordmark. On light: Arch Slate. Never on a busy photo without a scrim.
- **Never:** stretch, rotate, add gradients/shadows/outlines, outline the letters, or place the
  wordmark inside another shape.
- The mark (an arch/keystone glyph) is optional and never appears without the wordmark until the brand
  is recognised.

---

## 7. Visual language

- **Layout:** generous whitespace, one idea per screen, left-aligned. Grid: 4 px base unit, 8 px rhythm.
- **Components:** rounded corners 8 px (cards), 6 px (inputs/buttons); subtle borders over heavy
  shadows; shadows only for elevation that means something (modals, dropdowns).
- **Charts:** line charts for trends, stacked bars for status history. Never pie charts for time.
- **Empty states:** always include one sentence of what to do next, plus a single primary action.
- **Status page aesthetic:** maximum legibility, zero decoration. A customer reading it is anxious —
  give them a headline, a status, and a time.

---

## 8. Imagery

- Real screenshots of the product, on realistic data. Never mock a UI we don't have.
- Diagrams drawn as we draw them in the docs: simple lines, labels, no 3D, no "cloud" clipart.
- No stock photos of people in headsets pointing at monitors.
- Illustrations, if used at all: single-weight line, two colours (Slate + Signal Indigo), geometric,
  grounded in the arch motif.

---

## 9. Applying the brand (quick reference)

| Place | Rule |
|---|---|
| Landing page H1 | "Where your team goes when your application breaks." |
| Browser title | `ARCH — Incident management & status pages` |
| Email subject | `[ARCH] Checkout API — CRITICAL incident opened` |
| Status page header | Org name, then "System status", then current overall status |
| Error page | What broke, what to do, a link to the ARCH status page |
| Social card | Wordmark on Arch Slate, one-line tagline, no feature list |
| Docs | Plain markdown, monospace for code, no marketing voice |

---

## 10. Brand non-negotiables

1. Never overstate capability — no security badge we don't hold, no uptime figure we don't measure.
2. Never show a status as colour-only.
3. Never blame anyone in customer-facing communication.
4. Never use a customer's name or logo without written permission.
5. Never let the public status page look "designed" at the cost of being instantly readable.
6. Write the docs like a person. If a paragraph would embarrass us in a code review, rewrite it.

---

*Owner: Founders · Review cadence: 90 days*
