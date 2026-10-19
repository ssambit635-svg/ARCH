---
name: design-system-hackerrank-online-coding-tests-and-technical-interviews
description: >
  Apply the HackerRank - Online Coding Tests and Technical Interviews design system when building or updating UI.
  Use when creating components, choosing colors or typography,
  or reviewing designs for marketing interfaces.
---

# HackerRank - Online Coding Tests and Technical Interviews — Design System Skill

## When to Use

- Building new UI components for HackerRank - Online Coding Tests and Technical Interviews.
- Reviewing or updating existing component styles.
- Choosing colors, typography, or spacing for marketing pages.
- Checking designs against the extracted token set.

## Context

- **Product:** HackerRank - Online Coding Tests and Technical Interviews — https://www.hackerrank.com/
- **Surface:** marketing
- **Audience:** Business decision-makers and potential customers
- **Character:** Conversion-focused marketing presence with a balanced color system and 3 typefaces.

## Tokens

### Colors

| Token | Value | Role |
|-------|-------|------|
| --border-color | `#05C770` | Border |
| color-1 | `#000000` | Text Primary |
| color-3 | `#AEF96C` | Accent |
| color-4 | `#FFFFFF` | Text Light |

### Typography

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

### Spacing

**Base unit:** 4px

`space-1: 2px` · `space-2: 4px` · `space-3: 5px` · `space-4: 8px` · `space-5: 10px` · `space-6: 12px` · `space-7: 16px` · `space-8: 20px` · `space-9: 24px` · `space-10: 28px` · `space-11: 40px` · `space-12: 44px` · `space-13: 48px` · `space-14: 56px` · `space-15: 72px` · `space-16: 104px`

### Shapes

**Border radius:** `radius-sm: 1px` · `radius-md: 4px` · `radius-lg: 1000px`

### Elevation

- **shadow-sm:** `rgba(255, 255, 255, 0.4) 0px 1px 8.5px 0px inset`

### Motion

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

## Component Inventory

- **Buttons:** 26 detected
- **Links:** 89 detected
- **Inputs:** 89 detected
- **Navigation:** 1 elements
- **Lists:** 14 detected
- **Code blocks:** 3 detected
- **Forms:** 1 detected
- **Images:** 199 detected

## Constraints

### Always

- Use tokens from the tables above — do not introduce new values.
- Include hover, focus-visible, and disabled states for interactive elements.
- Follow the 4px spacing grid.
- Meet WCAG 2.2 AA contrast minimums.

### Never

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values. Pin to the detected set (1px, 4px, 1000px).
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
