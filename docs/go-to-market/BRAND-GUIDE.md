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

## 4. Colour palette — "Mission Control"

> **Status of this section:** describes what ships. The previous spec described a light theme
> (Paper `#F8FAFC`, Ink `#0F172A`) that was never implemented; the product shipped dark, then
> drifted into an indigo→violet gradient scheme with **two** accents, decorative blur orbs and
> gradient-filled display type — which broke non-negotiables 1, 5 and the "one accent" rule below.
> The palette has been rebuilt around the original intent: *calm control room*.

ARCH is read at 3am, next to a terminal and a Grafana board. It is dark, and it is dark on purpose.

**The four rules, in order of importance:**

1. **The base is graphite, not blue-black.** Near-zero chroma. If a surface reads as "blue" in a
   screenshot, it is wrong — a blue base is what makes every severity colour harder to trust.
2. **Exactly one decorative hue: sodium signal.** It marks ARCH itself — the logotype keystone,
   focus rings, active navigation, the scroll-progress rule, `ARCH V1.1`. Nothing else.
3. **Severity hues are data.** They appear on state, never on a headline, a hero wash or a shadow.
4. **No glow.** No `blur-[130px]` orbs, no coloured drop-shadows, no gradient-filled display type.
   Depth comes from hairlines, film grain, elevation, and specular light that behaves like light
   (real IBL on 3D geometry) rather than a CSS bloom.

**Graphite ramp** (`--color-ink-*`, surfaces):

| Token | Hex | Use |
|---|---|---|
| `ink-1000` | `#050607` | page background |
| `ink-950` | `#08090b` | section alternation, panels |
| `ink-900` | `#0c0e10` | cards, terminal bodies |
| `ink-850` / `ink-800` | `#111316` / `#16191d` | raised rows, hovers |
| `ink-700` | `#24282e` | disabled, deep dividers |

**Text** (bone, never pure white — pure white on graphite vibrates):

| Token | Hex | Contrast on `ink-950` | Use |
|---|---|---|---|
| `bone` | `#f4f3f0` | 17.9:1 | headlines, primary text, primary buttons |
| `ash-200` | `#c7cbd0` | 11.3:1 | body copy |
| `ash-300` | `#a5abb3` | 7.7:1 | secondary copy |
| `ash-400` | `#858c95` | 5.7:1 | tertiary copy — AA at any size |
| `ash-500` | `#6a717a` | 3.9:1 | **large text or metadata only** (AA large) |
| `ash-600`/`ash-700` | `#525862` / `#3d424a` | <3:1 | decorative rules, disabled — never load-bearing copy |

**Sodium signal** — the one accent:

| Token | Hex | Note |
|---|---|---|
| `signal-500` | `#ffb627` | primary accent, 11.3:1 on graphite |
| `signal-300` | `#ffd47a` | accent text on a dark wash |
| `signal-700` | `#b5760a` | pressed / disabled accent |

> **Contrast trap, and why it matters:** `bone` on `signal-500` is **1.59:1**. White text on the
> accent is unreadable, so the accent is never a button *background* carrying light text — the
> primary button is bone-on-ink. The only text that may sit on sodium is `ink-1000` (11.3:1).

**Severity & service state** (semantic only):

| State | Hex | Shape + label requirement |
|---|---|---|
| CRITICAL / OUTAGE | `#ff4438` | filled dot + word |
| HIGH / DEGRADED | `#ff8a1f` | half-filled dot + word |
| MEDIUM | `#ffd60a` | ring dot + word |
| LOW | `#93a1b0` | hollow dot + word |
| RESOLVED / OPERATIONAL | `#2fbf71` | filled dot + word |
| MONITORING / MAINTENANCE | `#38bdf8` | clock + word |

> **Accessibility rule (unchanged, and now enforced):** status is *always* communicated by
> **colour + shape + text label**. Colour alone is a WCAG failure and, in an incident, a misread
> status is a real operational problem.

**Legacy aliases.** `abyss-*`, `arch-*`, `indigo-*`, `violet-*` and `slate-*` are *remapped* onto
this palette inside `@theme` in `src/app/globals.css` rather than deleted. Roughly 800 existing
utility classes across 38 components referenced the old scheme; remapping the scales retired all of
them at once and keeps a stray `text-indigo-400` from reintroducing blue in a future diff. `slate-*`
was remapped to a stone neutral specifically because it is a blue-gray and body copy is where the
blue was most visible. **Do not add new `indigo-*`/`violet-*` classes** — use `signal-*` or `ink-*`.

---

## 5. Typography

| Use | Font | Tracking |
|---|---|---|
| Display (marketing headlines, big numbers) | **Space Grotesk** variable | `-0.03em` to `-0.055em` |
| UI + body | Inter variable | default |
| Code, IDs, timestamps, labels, tabular data | JetBrains Mono | `+0.08em` to `+0.24em` uppercase |

All three are **self-hosted** from `src/app/fonts/` (OFL-1.1). `next/font/google` is not used
anywhere: `next build` must never call fonts.googleapis.com, or an air-gapped install cannot build.
Space Grotesk is vendored from `@fontsource-variable/space-grotesk`, which stays a dependency so the
provenance and the update path are explicit.

**Mono is a structural choice, not a decorative one.** Every number in a grid is `arch-tabular`
(`font-variant-numeric: tabular-nums`) so a live value updating in place cannot shift its column.
Micro-labels are uppercase mono at `0.14em`–`0.24em`; that contrast against tight-tracked display
type is what makes the page read as instrumentation.

**Scale:** marketing display is fluid — `clamp(2.9rem, 8.4vw, 7.4rem)` for the hero, `clamp(2.1rem,
4.6vw, 3.6rem)` for section heads. Product UI stays on the fixed scale: 0.75 caption · 0.875 small ·
1.0 body · 1.25 h3 · 1.5 h2 · 2.0 h1.
**Weight:** 400 body, 500 emphasis, 600 headings and display. Never 700+ except a hero or a
single-word logotype. **Line height:** 1.7–1.75 marketing body, 1.55 product body, 0.9–1.0 display.
Never justify text.

---

## 6. Logo & mark rules

The mark is **a load-bearing arch whose keystone is a live signal**, with the incident pulse still
running inside it. The keystone is separated from the arch by a hairline gap because the keystone is
the one stone you never remove — the same way the audit trail is the one record ARCH never loses.

- Two stroke weights (2.1 arch, 1.7 pulse) and one accent. **No gradient fill, no drop shadow** —
  this restores the rule the previous mark broke, and it is also practical: a gradient mark turns to
  mud at 16px in a sidebar.
- Wordmark: **ARCH** in Space Grotesk 600, letter-spacing `+0.20em`, all caps, `bone`.
- Clear space: minimum the height of the "A" on all sides. Minimum size: 80 px wide digital, 20 mm print.
- On dark: `bone` arch, `signal-500` keystone and pulse. On light (documents, print): Arch Slate arch,
  `signal-700` keystone. Never on a busy photo without a scrim.
- **Never:** stretch, rotate, add gradients/shadows/outlines, outline the letters, recolour the
  keystone to a severity hue, or place the wordmark inside another shape.
- The `ARCH V1.1` chip is a hairline border + a live dot + mono caps. It is a subsystem label, not a
  badge you sell with.

---

## 7. Visual language

- **Layout:** generous whitespace, one idea per screen, left-aligned. Marketing is asymmetric and
  editorial; the hero is deliberately *not* centred. Grid: 4 px base unit, 8 px rhythm, 1400px max.
- **Components:** 8 px radius on controls, 12–14 px on panels. **Subtle borders over heavy shadows**;
  shadows only for elevation that means something (modals, palettes, the boot curtain).
- **The hairline is the primary structural element.** `1px` at `rgb(255 255 255 / 0.075)`, with a
  brighter `0.14` top edge on panels to imply a light source above. Panels get `.arch-panel`.
- **Film grain** (`.arch-grain`, SVG turbulence at 3.2% opacity) sits over the marketing surface. It
  is what separates "dark theme" from "photographed surface", and it kills banding across the hero
  video and the WebGL canvas.
- **Hover is an edge, not a bloom.** `.card-lift` moves 2px and brightens its border; `.arch-sheen`
  sweeps a specular highlight. Neither changes hue.
- **Charts:** line charts for trends, stacked bars for status history, hairline sparklines in stat
  cells. Never pie charts for time.
- **Empty states:** one sentence of what to do next, plus a single primary action.
- **Status page aesthetic:** maximum legibility, zero decoration. A customer reading it is anxious —
  give them a headline, a status, and a time. No grain, no 3D, no scroll animation on `/status/*`.

---

## 8. Imagery & 3D

- **Real artefacts over illustrations.** The lifecycle section shows the signed webhook, the
  incident timeline, the rendered status page and the hash-chained audit ledger — depictions of
  behaviour the product actually has. Never mock a UI we don't have.
- **Footage:** real stock video, Pexels licence (free for commercial use, no attribution required),
  served from the Pexels CDN at runtime. Clips are graded — `saturate(0.42) contrast(1.18)
  brightness(0.72)` plus a warm soft-light pass and a vignette — so they sit in the graphite palette
  instead of arriving with a stock blue cast. Footage is *not* vendored into git; large binaries stay
  out of the repository (see the `model-data/` precedent in `.gitignore`).
- **3D:** the hero and topology stages are **procedural** — a service-dependency graph built from a
  20-line adjacency list, lit by a runtime IBL studio (`Lightformer`s inside drei's `<Environment>`),
  so there is no HDRI to download and an air-gapped install renders identically. Procedural beats a
  baked asset here because it can be *shaped by data*: it shows a real blast radius.
- **Sketchfab** is used for physical assets that benefit from a scanned model, via `SketchfabStage`.
  Models are **CC-BY**, which requires credit — the author is named and linked in the stage HUD *and*
  in the footer. Swapping in a model means changing `uid` and the attribution line.
- **Attribution block** lives in the footer of the marketing site: footage authors, model authors and
  licence, and the typefaces. Keep it there when assets change.
- No stock photos of people in headsets pointing at monitors.

---

## 9. Motion

Motion is part of the brand, and it is disciplined about two things: it must be **earned by meaning**,
and it must **stop** when the visitor asks it to.

| Signature | Where | Why |
|---|---|---|
| Boot sequence | first visit only | staged as a subsystem boot log; also holds the curtain while footage buffers and WebGL compiles |
| Lenis smooth scroll | marketing surface | one eased scroll feel; shares a single rAF loop with ScrollTrigger so pins never lag a frame |
| Pinned scroll story | `#lifecycle` | scrubs the four moves; artefacts swap on the same timeline as the copy |
| Line-mask reveal | headlines | each line translates up from behind its own overflow clip |
| Scramble decode | hero keyword | noise resolving into a signal — the product's own gesture |
| Ken Burns drift | hero footage | 34s, ±12% scale; reads as camera movement, not a zoom |
| Live WebGL topology | hero, `#topology` | a failing node heating its dependents ring by ring |
| Blend-mode cursor | fine pointers only | `mix-blend-mode: difference`, so it never needs a colour |
| Counters, marquee, sheen | proof, integrations | instrument behaviour, not decoration |

**Non-negotiables for motion:**

1. **`prefers-reduced-motion: reduce` disables all of it** — no curtain, no scramble, no autoplay
   video (the poster still shows), no WebGL graph (a flat dependency list replaces it), and reveals
   resolve straight to their end state so nothing is stranded off-screen.
2. **The boot gate.** Reveals wait for the curtain to lift (`BootProvider` in
   `src/components/marketing/boot-gate.ts`). Without it the hero's reveal completes behind the
   preloader and the most expensive moment on the page happens where nobody can see it.
3. **Never animate a layout property** on a scroll-driven element. Transform and opacity only.
4. **The public status page gets no scroll animation.** See §7.
5. The preloader has a **hard ceiling** (3.2s) and never shows twice in a session. A preloader that
   can strand a visitor is worse than no preloader.

---

## 10. Applying the brand (quick reference)

| Place | Rule |
|---|---|
| Landing page H1 | "The room where the incident ends." |
| Browser title | `ARCH — incident response for developer teams` |
| Email subject | `[ARCH] Checkout API — CRITICAL incident opened` |
| Status page header | Org name, then "System status", then current overall status |
| Error page | What broke, what to do, a link to the ARCH status page |
| Social card | Wordmark on `ink-1000`, one-line tagline, no feature list, no gradient |
| Docs | Plain markdown, monospace for code, no marketing voice |

---

## 11. Brand non-negotiables

1. Never overstate capability — no security badge we don't hold, no uptime figure we don't measure.
2. Never show a status as colour-only.
3. Never blame anyone in customer-facing communication.
4. Never use a customer's name or logo without written permission.
5. Never let the public status page look "designed" at the cost of being instantly readable.
6. Write the docs like a person. If a paragraph would embarrass us in a code review, rewrite it.

---

*Owner: Founders · Review cadence: 90 days*
