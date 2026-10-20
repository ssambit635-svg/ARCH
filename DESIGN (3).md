# Stripe | Financial Infrastructure to Grow Your Revenue

## Overview

**Product:** Stripe | Financial Infrastructure to Grow Your Revenue
**URL:** https://stripe.com/in
**Surface type:** marketing
**Audience:** Business decision-makers and potential customers
**Brand character:** Conversion-focused marketing presence with a rich, diverse color palette and single-typeface typography.

### Design Principles

- Consistency over novelty — reuse existing patterns before inventing new ones.
- Token-driven — every visual decision references a token, not a magic number.
- Accessible by default — compliance is a baseline, not a feature.

## Colors

| Token | Value | Role |
|-------|-------|------|
| color-8 | `#E5EDF5` | Surface |
| color-1 | `#061B31` | Text Primary |
| color-2 | `#000EFF` | Text Primary |
| color-3 | `#50617A` | Text Primary |
| color-5 | `#64748D` | Text Secondary |
| color-4 | `#533AFD` | Accent |
| color-6 | `#7F7DFC` | Accent |
| color-7 | `#81B81A` | Accent |
| color-9 | `#FFFFFF` | Text Light |

## Typography

**Font stack:** sohne-var

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 11px | Captions, metadata |
| text-sm | 14px | Labels, secondary text |
| text-base | 16px | Body text (default) |
| text-lg | 21px | Subheadings, emphasis |
| text-xl | 26px | Section headings |
| text-2xl | 32px | Section headings |
| text-3xl | 40px | Section headings |

**Weight scale:** 300 · 400
**Line heights:** 46.299px · 35.2px · 23.0496px · 14px · 16px · 20px

## Spacing

**Base unit:** 4px

`space-1: 2px` · `space-2: 3px` · `space-3: 4px` · `space-4: 6px` · `space-5: 8px` · `space-6: 10px` · `space-7: 11px` · `space-8: 12px` · `space-9: 13px` · `space-10: 14px` · `space-11: 16px` · `space-12: 17px` · `space-13: 18px` · `space-14: 20px` · `space-15: 24px` · `space-16: 28px` · `space-17: 36px` · `space-18: 40px` · `space-19: 51px` · `space-20: 60px` · `space-21: 64px` · `space-22: 96px`

## Shapes

**Border radius:** `radius-sm: 1px` · `radius-md: 3px` · `radius-lg: 4px` · `radius-xl: 5px` · `radius-full: 6px` · `radius-6: 100%`

## Elevation

- **shadow-sm:** `rgba(50, 50, 93, 0.12) 0px 16px 32px 0px`

## Motion

- **duration-fast:** `all`
- **duration-fast:** `opacity cubic-bezier(0.4, 0, 0.2, 1), transform cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-fast:** `none`
- **duration-fast:** `z-index 0.1s steps(1)`
- **duration-fast:** `opacity 0.15s linear`
- **duration-base:** `color 0.24s cubic-bezier(0.45, 0.05, 0.55, 0.95), background-color 0.24s cubic-bezier(0.45, 0.05, 0.55, 0.95), border-color 0.24s cubic-bezier(0.45, 0.05, 0.55, 0.95)`
- **duration-base:** `opacity 0.24s cubic-bezier(0.45, 0.05, 0.55, 0.95)`
- **duration-base:** `fill 0.24s cubic-bezier(0.45, 0.05, 0.55, 0.95)`
- **duration-base:** `transform 0.25s cubic-bezier(0.6, 0, 0.2, 0.5)`
- **duration-base:** `opacity 0.25s linear`
- **duration-base:** `background-color 0.3s cubic-bezier(0.25, 1, 0.5, 1), color 0.3s cubic-bezier(0.25, 1, 0.5, 1), outline-color 0.3s cubic-bezier(0.25, 1, 0.5, 1), border 0.3s cubic-bezier(0.25, 1, 0.5, 1)`
- **duration-base:** `color 0.3s cubic-bezier(0.25, 1, 0.5, 1)`
- **duration-base:** `fill 0.3s cubic-bezier(0.25, 1, 0.5, 1)`
- **duration-base:** `stroke 0.3s cubic-bezier(0.25, 1, 0.5, 1)`
- **duration-base:** `transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)`
- **duration-slow:** `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)`
- **duration-slow:** `--hover-progress 0.6s cubic-bezier(0.65, 0, 0.35, 1)`
- **duration-slow:** `transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)`
- **duration-slow:** `clip-path 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)`
- **duration-slow:** `transform 1s cubic-bezier(0.16, 1, 0.3, 1)`

## Components

- **Buttons:** 29 detected
- **Links:** 184 detected
- **Navigation:** 1 elements
- **Lists:** 5 detected
- **Images:** 215 detected

## Do's and Don'ts

### Do

- Reference tokens by name, not raw values — agents and developers should use `color.text.primary`, not `#171717`.
- Define all interactive states: default, hover, focus-visible, active, disabled.
- Use the spacing scale for all padding, margin, and gap values.
- Write content in sentence case. Reserve ALL CAPS for acronyms only.
- Test every component at the smallest and largest breakpoint before shipping.

### Don't

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values. Pin to the detected set (1px, 3px, 4px, 5px, 6px, 100%).
- Do not use full-uppercase text for body or paragraph content.
- Do not nest interactive elements (e.g. buttons inside links).
- Do not ship components without defining hover, focus-visible, and disabled states.

## Writing Tone

Concise, confident, implementation-focused. Avoid filler preambles.

## Authoring Workflow

When creating or updating a component guideline for this system, follow this sequence:

1. **State the intent** — one sentence on what the component does and why it exists.
2. **Map tokens** — list every color, spacing, typography, and radius token the component uses. No raw values.
3. **Define anatomy** — break the component into named parts (container, label, icon, etc.) with their token assignments.
4. **Specify states** — document every state: default, hover, focus-visible, active, disabled, loading, error, empty.
5. **Describe interactions** — keyboard, pointer, and touch behavior, including edge cases (long content, overflow, truncation).
6. **Add accessibility criteria** — write testable pass/fail checks (e.g. "focus ring must be visible at 3:1 contrast").
7. **List anti-patterns** — concrete examples of misuse with a brief explanation of why each is wrong.
8. **Close with a QA checklist** — a mechanical list of verifiable items (see Definition of Done below).

## Required Output Structure

Every component guideline produced from this system must contain these sections, in order:

1. Overview — purpose, when to use, when not to use.
2. Tokens and foundations — all referenced tokens from the tables above.
3. Anatomy and variants — named parts, variant matrix, responsive behavior.
4. States and interactions — full state table, keyboard/pointer/touch behavior.
5. Accessibility — ARIA attributes, contrast requirements, focus management, screen reader behavior.
6. Content guidelines — copy length, tone, capitalisation, placeholder text rules.
7. Anti-patterns — explicit examples of what not to build, with reasoning.

## Component Requirements

Every component built against this system must:

- Reference only tokens defined in the tables above — no hardcoded hex, px, or font values.
- Define all interactive states: default, hover, focus-visible, active, disabled, loading, error.
- Specify responsive behavior at the smallest and largest supported breakpoint.
- Handle edge cases: empty state, overflow / truncation, maximum content length.
- Include keyboard navigation (Tab, Enter, Escape, Arrow keys where applicable).
- Document ARIA roles, labels, and live-region behavior where relevant.
- Include known page component density: - **Buttons:** 29 detected
- **Links:** 184 detected
- **Navigation:** 1 elements
- **Lists:** 5 detected
- **Images:** 215 detected

## Definition of Done

A component is not complete until every item below is checked:

- Renders correctly in its default state (smoke test).
- All states documented and visually verified (hover, focus, disabled, loading, error, empty).
- All visual values use design tokens — zero hardcoded values.
- Keyboard navigation works without a pointer.
- No critical accessibility violations (contrast, ARIA, focus order).
- Tested at smallest and largest breakpoint.
- Anti-patterns section lists at least one concrete misuse example.
- Documentation covers purpose, usage, props/API, and limitations.
