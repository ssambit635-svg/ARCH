# Authentication surface

**Routes:** `/login`, `/register` · **Code:** `src/components/auth/` · **Reviewed:** 2026-10-23

## Overview

The authentication hand-off should feel like the next page of the public site, not an abrupt
jump into the dark console. It uses the existing painted dawn, warm paper, graphite ink, ember
accent, and the hero action’s sunbeam mark. The landing page itself is unchanged.

The form is the primary task. A secondary, explicitly illustrative incident window introduces the
workflow on desktop; it is hidden at 960px and below. Nothing needs a scroll reveal or JavaScript
to become visible. The authenticated console and onboarding keep their own styling.

## Tokens and foundations

`auth.css` is scoped to `.auth-surface`. Its `--auth-*` public palette mirrors the marketing
`--mk-*` palette; `tests/auth-surface.test.ts` enforces equality for shared colours. Keeping the
small auth sheet independent avoids loading the marketing page’s CSS and animation dependencies
on a sign-in route.

- Surfaces: `--auth-bg`, `--auth-bg-soft`, `--auth-surface`, `--auth-surface-2`, `--auth-hover`.
- Text: `--auth-fg`, `--auth-muted`, `--auth-subtle`.
- Rules: `--auth-line`, `--auth-line-strong`; controls use the higher-contrast
  `--auth-control-line` so their boundaries remain visible on white and paper.
- Accent and focus: `--auth-accent`, `--auth-accent-strong`, `--auth-focus`, `--auth-sunbeam`.
- Feedback: `--auth-negative` / `--auth-negative-soft`, `--auth-positive` /
  `--auth-positive-soft`, `--auth-caution`.
- The fixed `--auth-win-*` palette belongs only to the dark sample window. Blue is used only for
  the labelled Monitoring state; it is not a second brand accent.
- Self-hosted Inter for controls, Space Grotesk for headings, Geist Mono for metadata. No new
  font, image, icon service, animation library, or runtime dependency is introduced.

## Anatomy and variants

1. Header: the public ARCH wordmark, current early-access version, documentation, and home link.
2. Authentication card: decorative window chrome, route links styled as a mode switch, one `h1`,
   then the real form. Mode links use `aria-current="page"`, not fake tab semantics.
3. Sign-in: email/password plus GitHub **only when the server supplies its configured action**.
   There is no non-working SSO, magic-link, passkey, or password-reset button.
4. Registration: email, optional name and organization, and a password with the real 10-character
   minimum. An organization creates an owned team, not a public status page. No speculative slug
   or `/status/{slug}` link is shown.
5. Help: a native disclosure with account-access or local-setup guidance, plus a real docs link.
6. Showcase: four selectable incident states, a sample timeline and a human-reviewable AI draft.
7. Footer: privacy, terms, and security documentation. These links are not a certification or an
   uptime promise.

## States and interactions

| State | Behaviour |
|---|---|
| Default | Visible form, explicit labels, password-manager autocomplete, masked password |
| Hover | Subtle surface/border changes; only the submit mark rotates |
| Focus | Ember outline on light surfaces; warm light outline inside the dark window |
| Submitting | Action button is disabled, labelled with progress, and reports `aria-busy` |
| Validation failure | Server summary receives focus; fields expose `aria-invalid` and point to their error text |
| Invalid credentials | Clear retryable error, preserved email/password in component memory, re-enabled submit |
| OAuth failure | An announced error; already signed-in users can return to Settings |
| Registration fallback | If auto sign-in fails, the existing `registered=1` success note explains what to do |
| Password visibility | A real non-submit toggle reports its pressed state and controls the password input |
| Caps Lock | A textual warning is shown when the keyboard reports the lock modifier |
| Password minimum | A length meter describes only the minimum; it never claims password strength |
| Reduced motion | No decorative animation, rotation transition or spinner rotation; progress text remains |
| No JavaScript | Native forms and server actions still support email/password sign-in |

The sample lifecycle uses one roving tab stop. Left/Right wrap, Home/End select the first/last
state, and focus follows selection. It never cycles automatically. The panel is labelled by its
selected tab and is keyboard-focusable.

The form comes first at every breakpoint. On small screens it stands alone, inputs use 16px text
to avoid mobile focus zoom, and the password toggle remains a 44px target. Tall forms and errors
scroll naturally; no fixed-height card or page overflow clipping can hide the submit button.

## Authentication boundaries

Server pages pass server actions into the client forms. Validation, credential checks, rate
limits, database diagnostics and session creation remain on the server. Typed credentials live
only in component memory; never put them in browser storage or logs.

`src/lib/auth-redirect.ts` is shared by both pages and all three sign-in/registration actions.
Only same-site paths survive; absolute/protocol-relative URLs, backslashes, control characters
and non-string query input fall back to `/dashboard`. Switching modes preserves a safe callback,
and an already signed-in visitor returns to it. Invitation tokens are not printed in page copy.

Authentication routes are marked `noindex, nofollow`. Development responses permit preview
iframes; production retains `frame-ancestors 'none'`, `X-Frame-Options: DENY`, HSTS and the no-eval
CSP. `tests/preview-security.test.ts` guards this separation.

## Accessibility and QA

Automated regression tests cover palette parity, light/dark AA text contrast, control boundary
contrast, labels/autocomplete, optional fields, notices, same-site callback handling, sample
labelling, and tab structure. Existing real-database auth/OAuth tests remain the source of truth
for account and session behaviour.

Before changing the surface, also check in a browser:

- 320, 390, 768, 960, 1024, 1280 and 1440px widths; no horizontal scrolling.
- Tab navigation, sample tab arrow keys, password reveal/hide, and the help disclosure.
- Pending, failed credentials, linked validation errors, OAuth errors, and registration success.
- Callback preservation from an invitation through both mode links.
- Registration with a blank organization, automatic sign-in, and subsequent password sign-in.
- Reduced motion, JavaScript-disabled sign-in, and an automated accessibility scan of both forms.

## Content and anti-patterns

Use short, welcoming, task-specific copy. Keep “Sample data” and the illustrative caption visible
beside the preview. Never bring back invented availability/latency/accuracy numbers, SHA-256
verification claims, customer logos, compliance badges, or language implying autonomous fixes.
Do not add a recovery/provider control before its end-to-end flow actually exists. Do not turn
the sign-in page into a second marketing page on a phone.
