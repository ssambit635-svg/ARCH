# Marketing surface — UI specification

**Owner:** Founders · **Last reviewed:** 2026-10-19 · **Code:** `src/components/marketing/`

This is the working specification for the public site. It replaces the loose design-tool exports
that used to sit at the repository root (`DESIGN.md`, `SKILL.md` and their copies) with the rules
the code actually follows. When this document and the CSS disagree, the CSS is the bug.

---

## 1. Direction

A light, engineered product site. Paper background, white panels, hairline rules, one blue signal
and one warm close. The layout borrows the discipline of a documentation-heavy marketing page —
generous spacing, a soft 12–16px panel language, pill actions, a restrained type scale — and keeps
ARCH's own voice, display face and colour.

The public surface is intentionally **not** the graphite console. A visitor meets the product inside
a framed capture and inside a dark application window, so the page reads as a shopfront in front of
a dark workshop.

## 2. Page order (the argument)

| # | Section | Component | Job |
|---|---|---|---|
| 1 | Hero | `hero.tsx` | Say what ARCH is in one sentence, show a real screen |
| 2 | Proof strip | `proof.tsx` | Four checkable facts, directly under the hero |
| 3 | Pillars | `pillars.tsx` | What changes when an alert arrives |
| 4 | Workspace | `workspace.tsx` | An interactive incident window (dark) |
| 5 | Workflow | `workflow.tsx` | Four lifecycle states as tabs |
| 6 | Engine | `engine.tsx` | The native engine, limits included (dark) |
| 7 | Control | `control.tsx` | One incident across phone, terminal and channel |
| 8 | Status proof | `status-proof.tsx` | The page a customer reads |
| 9 | Deploy | `deploy.tsx` | Real commands, real terminal, verified stack |
| 10 | Footer | `footer.tsx` | One ember CTA and the practical links |

## 3. Tokens

All tokens are defined on `.mk` and overridden by `.mk-light .mk`. Dark bands remap the same names
with `.mk-on-dark`.

| Token | Light | Dark band | Role |
|---|---|---|---|
| `--mk-bg` | `#f6f4ef` | `#05070d` | page / band background |
| `--mk-surface` | `#ffffff` | `#0b1018` | panels, cards |
| `--mk-surface-2` | `#fbfaf6` | `#111827` | window chrome, inset panels |
| `--mk-fg` | `#10131a` | `#f4f6fa` | headings and body |
| `--mk-muted` | `#4f5561` | `#b3bccb` | secondary copy |
| `--mk-subtle` | `#5b6270` | `#a5aec0` | labels, captions |
| `--mk-line` | `#e3ddd2` | `#1d2b42` | hairlines |
| `--mk-accent` | `#3b8ef4` | `#7fb3ff` | dots, meters, marks (decorative) |
| `--mk-accent-strong` | `#1c5cc0` | `#9cc6ff` | accent text, hover |
| `--mk-primary` | `#10131a` | `#f4f6fa` | primary button background |
| `--mk-focus` | `#1c5cc0` | `#9cc6ff` | focus outline |

`tests/marketing-minimal.test.ts` computes WCAG contrast for `fg`, `muted` and `subtle` on every
neutral surface in both token sets. A palette change that drops below 4.5:1 fails the suite.

## 4. Type

| Role | Face | Size / tracking |
|---|---|---|
| Display (h1, h2, proof numbers) | Space Grotesk (self-hosted) | `clamp()` scale, weight 500, tracking −0.03 to −0.055em, line-height 1.04–1.1 |
| UI and body | Inter (self-hosted) | 16px base, body copy 15–17px / 1.65 |
| Labels, metadata, code | Geist Mono (self-hosted) | 9–12px, uppercase 0.08–0.14em |
| Wordmark | Orbitron | 19px, weight 600, tracking 0.1em |

No `next/font/google` calls. All faces are vendored in `src/app/fonts/` (OFL-1.1).

## 5. Components

### Buttons

- One pill system: `height: 46px`, `padding-inline: 22px`, `border-radius: 999px`,
  `font-size: 14px`, `font-weight: 600`, optional 14px arrow.
- Variants: primary (ink), ghost (hairline border), small (38px, used in the navigation),
  large (52px, used in the footer). There is no accent fill: blue is a decorative accent only and
  must never carry button text.
- Hover: background shifts, 1px lift. Active: lift returns to 0. Focus: 2px outline, 3px offset.
- A view never shows two primary buttons in the same cluster. The second action is a ghost button
  or a text link.

### Panels

- Flat surface + `1px` hairline + 12–18px radius. No box shadow anywhere on the surface.
- Window chrome (bar + dots + URL) is used for the hero capture, the workspace and the stage panes,
  and is always `aria-hidden` when it is decorative.

### Tabs (workflow)

- A segmented container with a hairline, 12px radius and 4px padding.
- Selected tab: ink background, paper text, `aria-selected="true"`, roving `tabIndex`.
- The panel is a real `role="tabpanel"` with `aria-labelledby` pointing at the active tab.

### Interactive previews

- The workspace list uses real `<button>` elements with `aria-pressed`, `aria-controls`, and an
  `aria-live="polite"` detail region.
- Captions say "Interactive preview · illustrative data". Never imply a live feed.

## 6. Layout

- Container: `max-width: 1240px`, `padding-inline: 32px` (24/20px on smaller screens).
- Vertical rhythm: `padding-block: 104px` per section (80/64px below 960px); white bands carry
  `border-block: 1px solid` hairline.
- Hero: two columns above 960px (`1fr / 1.06fr`), stacked below; `min-height: 100svh`.
- Breakpoints: 1120, 960, 760, 560.

## 7. Motion

- GSAP + ScrollTrigger + SplitText, one owner (`gsap-reveal.tsx`).
- Heading lines mask in once; copy and cards rise 22px with a short stagger; panels drift 34px with
  a scrub; the footer wordmark rises.
- No pinning, no smooth-scroll hijack, no preloader, no custom cursor.
- `prefers-reduced-motion: reduce` returns early and the page renders in its final state.
- The service field canvas freezes and the terminal caret stops.

## 8. Media rules

- Two product captures only: `public/product/incident-workspace.webp` and
  `public/product/status-page.webp`, both 2×, both captioned "Sample data".
- No video, no 3D model, no avatar set, no design-tool exports in the repository.
- `tests/marketing-media.test.ts` fails if a retired upload comes back.

## 9. Accessibility checklist

- Every image has a meaningful `alt`; decorative images are `alt=""` **and** `aria-hidden="true"`.
- Heading order is `h1` once (hero), `h2` per section, `h3` inside cards.
- Focus is visible on every interactive element.
- The mobile disclosure starts `hidden` and reports `aria-expanded`.
- Status colour is always accompanied by a word ("CRITICAL", "Monitoring", "Resolved").
- Contrast is enforced by test, not by eye.

## 10. Extending the surface

1. Add the section component under `src/components/marketing/` and mount it in
   `src/app/(marketing)/page.tsx` in argument order.
2. Use existing tokens and classes; do not introduce a colour or radius.
3. Add the section id to `NAV_ITEMS` only if it is a primary destination.
4. Extend `tests/marketing-minimal.test.ts` with the behaviour that matters (state, labelling,
   honesty), not a snapshot.
5. Keep scratch files out of git. If it is not shipped by the site, it does not belong in `public/`.
