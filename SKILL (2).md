---
name: design-system-stripe-financial-infrastructure-to-grow-your-revenue
description: >
  Apply the Stripe | Financial Infrastructure to Grow Your Revenue design system when building or updating UI.
  Use when creating components, choosing colors or typography,
  or reviewing designs for marketing interfaces.
---

# Stripe | Financial Infrastructure to Grow Your Revenue — Design System Skill

## When to Use

- Building new UI components for Stripe | Financial Infrastructure to Grow Your Revenue.
- Reviewing or updating existing component styles.
- Choosing colors, typography, or spacing for marketing pages.
- Checking designs against the extracted token set.

## Context

- **Product:** Stripe | Financial Infrastructure to Grow Your Revenue — https://stripe.com/in
- **Surface:** marketing
- **Audience:** Business decision-makers and potential customers
- **Character:** Conversion-focused marketing presence with a rich, diverse color palette and single-typeface typography.

## Tokens

### Colors

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

### Typography

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

### Spacing

**Base unit:** 4px

`space-1: 2px` · `space-2: 3px` · `space-3: 4px` · `space-4: 6px` · `space-5: 8px` · `space-6: 10px` · `space-7: 11px` · `space-8: 12px` · `space-9: 13px` · `space-10: 14px` · `space-11: 16px` · `space-12: 17px` · `space-13: 18px` · `space-14: 20px` · `space-15: 24px` · `space-16: 28px` · `space-17: 36px` · `space-18: 40px` · `space-19: 51px` · `space-20: 60px` · `space-21: 64px` · `space-22: 96px`

### Shapes

**Border radius:** `radius-sm: 1px` · `radius-md: 3px` · `radius-lg: 4px` · `radius-xl: 5px` · `radius-full: 6px` · `radius-6: 100%`

### Elevation

- **shadow-sm:** `rgba(50, 50, 93, 0.12) 0px 16px 32px 0px`

### Motion

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

## Component Inventory

- **Buttons:** 29 detected
- **Links:** 184 detected
- **Navigation:** 1 elements
- **Lists:** 5 detected
- **Images:** 215 detected

## Constraints

### Always

- Use tokens from the tables above — do not introduce new values.
- Include hover, focus-visible, and disabled states for interactive elements.
- Follow the 4px spacing grid.
- Meet WCAG 2.2 AA contrast minimums.

### Never

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values. Pin to the detected set (1px, 3px, 4px, 5px, 6px, 100%).
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
