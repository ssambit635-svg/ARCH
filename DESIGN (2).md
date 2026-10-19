# HackerRank - Online Coding Tests and Technical Interviews

## Overview

**Product:** HackerRank - Online Coding Tests and Technical Interviews
**URL:** https://www.hackerrank.com/
**Surface type:** marketing
**Audience:** Business decision-makers and potential customers
**Brand character:** Conversion-focused marketing presence with a balanced color system and 3 typefaces.

### Design Principles

- Consistency over novelty — reuse existing patterns before inventing new ones.
- Token-driven — every visual decision references a token, not a magic number.
- Accessible by default — compliance is a baseline, not a feature.

## Colors

| Token | Value | Role |
|-------|-------|------|
| --border-color | `#05C770` | Border |
| color-1 | `#000000` | Text Primary |
| color-3 | `#AEF96C` | Accent |
| color-4 | `#FFFFFF` | Text Light |

## Typography

**Font stack:** Kalice, Satoshi, Times New Roman

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 14px | Captions, metadata |
| text-sm | 16px | Labels, secondary text |
| text-base | 24px | Body text (default) |
| text-lg | 40px | Subheadings, emphasis |
| text-xl | 72px | Section headings |

**Weight scale:** 400 · 500
**Line heights:** 88px · 14px · 24px · 28.5px · 19.84px · 36px · 52px

## Spacing

**Base unit:** 4px

`space-1: 2px` · `space-2: 4px` · `space-3: 5px` · `space-4: 8px` · `space-5: 10px` · `space-6: 12px` · `space-7: 16px` · `space-8: 20px` · `space-9: 24px` · `space-10: 28px` · `space-11: 40px` · `space-12: 44px` · `space-13: 48px` · `space-14: 56px` · `space-15: 72px` · `space-16: 104px`

## Shapes

**Border radius:** `radius-sm: 1px` · `radius-md: 4px` · `radius-lg: 1000px`

## Elevation

- **shadow-sm:** `rgba(255, 255, 255, 0.4) 0px 1px 8.5px 0px inset`

## Motion

- **duration-fast:** `all`
- **duration-fast:** `none`
- **duration-base:** `transform 0.2s`
- **duration-base:** `filter 0.25s, opacity 0.25s`
- **duration-base:** `padding 0.25s`
- **duration-base:** `transform 0.3s, opacity 0.2s`
- **duration-slow:** `background-color 0.4s cubic-bezier(0.44, 0, 0.56, 1), border-color 0.4s cubic-bezier(0.44, 0, 0.56, 1), box-shadow 0.4s cubic-bezier(0.44, 0, 0.56, 1)`
- **duration-slow:** `0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both hr1-rise`
- **duration-slow:** `0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.75s both hr1-rise`
- **duration-slow:** `1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both hr1-word`
- **duration-slow:** `1s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both hr1-word`
- **duration-slow:** `1s cubic-bezier(0.22, 1, 0.36, 1) 0.33s both hr1-word`
- **duration-slow:** `1s cubic-bezier(0.22, 1, 0.36, 1) 0.42s both hr1-word`
- **duration-slow:** `1s cubic-bezier(0.22, 1, 0.36, 1) 0.51s both hr1-word`
- **duration-slow:** `45s linear infinite hr1-ticker`

## Components

- **Buttons:** 26 detected
- **Links:** 89 detected
- **Inputs:** 89 detected
- **Navigation:** 1 elements
- **Lists:** 14 detected
- **Code blocks:** 3 detected
- **Forms:** 1 detected
- **Images:** 199 detected

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
- Do not mix border-radius values. Pin to the detected set (1px, 4px, 1000px).
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
- Include known page component density: - **Buttons:** 26 detected
- **Links:** 89 detected
- **Inputs:** 89 detected
- **Navigation:** 1 elements
- **Lists:** 14 detected
- **Code blocks:** 3 detected
- **Forms:** 1 detected
- **Images:** 199 detected

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
