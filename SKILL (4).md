---
name: design-system-aceternity-ui
description: >
  Apply the Aceternity UI design system when building or updating UI.
  Use when creating components, choosing colors or typography,
  or reviewing designs for marketing interfaces.
---

# Aceternity UI — Design System Skill

## When to Use

- Building new UI components for Aceternity UI.
- Reviewing or updating existing component styles.
- Choosing colors, typography, or spacing for marketing pages.
- Checking designs against the extracted token set.

## Context

- **Product:** Aceternity UI — https://ui.aceternity.com/live-preview/hero-with-background-and-navbar
- **Surface:** marketing
- **Audience:** Business decision-makers and potential customers
- **Character:** Conversion-focused marketing presence with a rich, diverse color palette and a complementary two-font typographic system.

## Tokens

### Colors

| Token | Value | Role |
|-------|-------|------|
| --surface-ring | `#A11216` | Surface |
| --surface-ring | `#1A4BC2` | Surface |
| --surface-edge-top | `#56565B` | Surface |
| --surface-lit | `#B81A1F` | Surface |
| --surface-edge-bottom | `#1C54D6` | Surface |
| --surface-edge-bottom | `#2259DC` | Surface |
| --surface-base | `#C8161B` | Surface |
| --surface-edge-bottom | `#CD262B` | Surface |
| --surface-lit | `#D0262B` | Surface |
| --surface-lit | `#2867F2` | Surface |
| --surface-lit | `#2A69F4` | Surface |
| --surface-base | `#3A7BFF` | Surface |
| --surface-base | `#3F80FF` | Surface |
| --surface-edge-top | `#E45C60` | Surface |
| --surface-edge-top | `#77A5FF` | Surface |
| --surface-edge-top | `#7BA8FF` | Surface |
| --surface-lit | `#EAEAEC` | Surface |
| --surface-base | `#F2F2F3` | Surface |
| --accent | `#F4F4F5` | Accent |
| --border | `#27272A` | Border |

_Showing 20 of 23 detected colors. Full palette available in the extension._

### Typography

**Font stack:** __Local_x2wexs, system-ui

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 12px | Captions, metadata |
| text-sm | 14px | Labels, secondary text |
| text-base | 16px | Body text (default) |
| text-lg | 18px | Subheadings, emphasis |
| text-xl | 24px | Section headings |
| text-2xl | 96px | Section headings |

**Weight scale:** 400 · 500 · 700
**Line heights:** 32px · 96px · 24px · 28px · 20px · 16px

### Spacing

**Base unit:** 4px

`space-1: 1px` · `space-2: 2px` · `space-3: 4px` · `space-4: 6px` · `space-5: 8px` · `space-6: 12px` · `space-7: 16px` · `space-8: 24px` · `space-9: 32px` · `space-10: 40px` · `space-11: 44px` · `space-12: 56px`

### Shapes

**Border radius:** `radius-sm: 3.35544e+07px` · `radius-md: 5px` · `radius-lg: 6px` · `radius-xl: 8px` · `radius-full: 10px` · `radius-full: 50%`

### Elevation

- **shadow-sm:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0 0 0 / 0.3) 0px 10px 15px -3px, oklab(0 0 0 / 0.3) 0px 4px 6px -4px`
- **shadow-md:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.999994 0.0000455678 0.0000200868 / 0.1) 0px 0px 0px 1px, oklab(0.999994 0.0000455678 0.0000200868 / 0.1) 0px 1px 3px 0px, oklab(0.999994 0.0000455678 0.0000200868 / 0.1) 0px 1px 2px -1px`
- **shadow-lg:** `rgba(0, 0, 0, 0.06) 0px 1px 6px 0px, rgba(0, 0, 0, 0.16) 0px 2px 32px 0px`

### Motion

- **duration-fast:** `all`
- **duration-fast:** `none`
- **duration-fast:** `transform 0.1s linear, opacity 0.08s linear`
- **duration-fast:** `0.15s cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-fast:** `color 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), outline-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), fill 0.15s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-from 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-via 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-to 0.15s cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-fast:** `transform 0.167s cubic-bezier(0.33, 0, 0, 1)`
- **duration-base:** `0.2s linear`
- **duration-slow:** `transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), translate 0.4s cubic-bezier(0.4, 0, 0.2, 1), scale 0.4s cubic-bezier(0.4, 0, 0.2, 1), rotate 0.4s cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-slow:** `0.4s cubic-bezier(0, 0, 0.2, 1)`
- **duration-slow:** `clip-path 0.4s cubic-bezier(0, 0, 0.2, 1)`
- **duration-slow:** `2s cubic-bezier(0.4, 0, 0.6, 1) infinite pulse`

## Component Inventory

- **Buttons:** 5 detected
- **Links:** 7 detected
- **Navigation:** 2 elements
- **Lists:** 1 detected
- **Images:** 7 detected

## Constraints

### Always

- Use tokens from the tables above — do not introduce new values.
- Include hover, focus-visible, and disabled states for interactive elements.
- Follow the 4px spacing grid.
- Meet WCAG 2.2 AA contrast minimums.

### Never

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values. Pin to the detected set (3.35544e+07px, 5px, 6px, 8px, 10px, 50%).
- Do not use full-uppercase text for body or paragraph content.
- Do not nest interactive elements (e.g. buttons inside links).
- Do not ship components without defining hover, focus-visible, and disabled states.

## Tone

Concise, confident, implementation-focused. Avoid filler preambles.

## Authoring Workflow

When creating or documenting a component for this system:

1. State intent — one sentence on purpose.
2. Map tokens — list every token the component uses.
3. Define anatomy — named parts with token assignments.
4. Specify states — default, hover, focus-visible, active, disabled, loading, error, empty.
5. Describe interactions — keyboard, pointer, touch, edge cases.
6. Add a11y criteria — testable pass/fail checks.
7. List anti-patterns — concrete misuse examples.
8. Close with the Definition of Done checklist.

## Output Structure

Component guidelines must contain, in order:

1. Overview (purpose, when to use, when not to use)
2. Tokens and foundations
3. Anatomy, variants, responsive behavior
4. States and interactions
5. Accessibility (ARIA, contrast, focus, screen reader)
6. Content guidelines (copy rules, tone)
7. Anti-patterns with reasoning

## Component Requirements

- Reference only tokens from the tables above.
- Define all states: default, hover, focus-visible, active, disabled, loading, error.
- Handle edge cases: empty, overflow, truncation, max content.
- Include keyboard navigation behavior.
- Document ARIA roles and labels.

## Definition of Done

- Default state renders (smoke test).
- All states visually verified.
- Zero hardcoded visual values — tokens only.
- Keyboard navigation works without pointer.
- No critical a11y violations.
- Tested at min and max breakpoint.
- At least one anti-pattern documented.
- Purpose, usage, and limitations documented.
