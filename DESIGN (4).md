# Linear – The system for product development

## Overview

**Product:** Linear – The system for product development
**URL:** https://linear.app/
**Surface type:** e-commerce
**Audience:** Consumers and shoppers
**Brand character:** Product-focused shopping experience with a rich, diverse color palette and a complementary two-font typographic system.

### Design Principles

- Trust signals first — credibility reduces friction more than clever copy.
- Clear path to action — one primary CTA per view, never stacked.
- Speed over polish — perceived performance is part of the design system.

## Colors

| Token | Value | Role |
|-------|-------|------|
| color-7 | `#E5E5E6` | Surface |
| color-2 | `#62666D` | Text Primary |
| color-3 | `#8A8F98` | Text Secondary |
| color-1 | `#121414` | Background Dark |
| color-4 | `#D0D6E0` | Text Light |
| color-5 | `#E2E4E6` | Text Light |
| color-6 | `#E2E4E7` | Text Light |
| color-8 | `#F7F8F8` | Text Light |
| color-9 | `#FFFFFF` | Text Light |

## Typography

**Font stack:** Inter Variable, Berkeley Mono

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 12px | Captions, metadata |
| text-sm | 13px | Labels, secondary text |
| text-base | 15px | Body text (default) |
| text-lg | 20px | Subheadings, emphasis |
| text-xl | 64px | Section headings |

**Weight scale:** 400 · 510 · 590
**Line heights:** 64px · 26.6px · 28px · 24px · 21px · 14px · 16px · 20px · 16.8px · 19.5px · 32px · 0px

## Spacing

**Base unit:** 4px

`space-1: 1px` · `space-2: 2px` · `space-3: 4px` · `space-4: 6px` · `space-5: 7px` · `space-6: 8px` · `space-7: 10px` · `space-8: 11px` · `space-9: 12px` · `space-10: 15px` · `space-11: 16px` · `space-12: 19px` · `space-13: 23px` · `space-14: 24px` · `space-15: 29px` · `space-16: 31px` · `space-17: 32px` · `space-18: 46px` · `space-19: 48px` · `space-20: 69px` · `space-21: 72px` · `space-22: 77px` · `space-23: 199px` · `space-24: 1319px`

## Shapes

**Border radius:** `radius-sm: 2px` · `radius-md: 4px` · `radius-lg: 6px` · `radius-xl: 8px` · `radius-full: 9px` · `radius-6: 12px` · `radius-7: 16px` · `radius-full: 50%` · `radius-9: 400px` · `radius-full: 9999px`

## Elevation

- **shadow-sm:** `rgba(255, 255, 255, 0.05) 0px 0px 0px 1px inset`
- **shadow-md:** `rgba(0, 0, 0, 0.2) 0px 0px 0px 1px`
- **shadow-lg:** `rgba(0, 0, 0, 0) 0px 8px 2px 0px, rgba(0, 0, 0, 0.01) 0px 5px 2px 0px, rgba(0, 0, 0, 0.04) 0px 3px 2px 0px, rgba(0, 0, 0, 0.07) 0px 1px 1px 0px, rgba(0, 0, 0, 0.08) 0px 0px 1px 0px`

## Motion

- **duration-fast:** `all`
- **duration-fast:** `color`
- **duration-fast:** `fill`
- **duration-fast:** `none`
- **duration-fast:** `color 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **duration-fast:** `border-color 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **duration-fast:** `transform 0.15s`
- **duration-fast:** `background 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **duration-fast:** `transform 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **duration-fast:** `background 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94), color 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **duration-fast:** `filter 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **duration-fast:** `border 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94), color 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **duration-fast:** `filter 0.16s cubic-bezier(0.25, 0.46, 0.45, 0.94)`

## Components

- **Buttons:** 76 detected
- **Links:** 74 detected
- **Inputs:** 2 detected
- **Navigation:** 2 elements
- **Lists:** 10 detected
- **Code blocks:** 7 detected
- **Images:** 257 detected

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
- Do not mix border-radius values. Pin to the detected set (2px, 4px, 6px, 8px, 9px, 12px, 16px, 50%, 400px, 9999px).
- Do not stack more than one primary CTA per viewport.
- Do not use red for non-error UI — reserve it for destructive actions and warnings.
- Do not ship components without defining hover, focus-visible, and disabled states.

## Writing Tone

Persuasive, benefit-driven, trustworthy. Active voice, urgency without pressure.

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
- Include known page component density: - **Buttons:** 76 detected
- **Links:** 74 detected
- **Inputs:** 2 detected
- **Navigation:** 2 elements
- **Lists:** 10 detected
- **Code blocks:** 7 detected
- **Images:** 257 detected

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
