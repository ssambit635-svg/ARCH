---
name: design-system-vengeance-ui
description: >
  Apply the Vengeance UI design system when building or updating UI.
  Use when creating components, choosing colors or typography,
  or reviewing designs for documentation interfaces.
---

# Vengeance UI — Design System Skill

## When to Use

- Building new UI components for Vengeance UI.
- Reviewing or updating existing component styles.
- Choosing colors, typography, or spacing for documentation pages.
- Checking designs against the extracted token set.

## Context

- **Product:** Vengeance UI — https://www.vengenceui.com/
- **Surface:** documentation
- **Audience:** Technical users
- **Character:** Developer-oriented knowledge base with a balanced color system and 4 typefaces.

## Tokens

### Colors

| Token | Value | Role |
|-------|-------|------|
| color-1 | `#050608` | Background Dark |
| color-2 | `#FFFFFF` | Text Light |

### Typography

**Font stack:** Inter, Orbitron, ui-sans-serif, Geist Mono

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 9px | Captions, metadata |
| text-sm | 10px | Labels, secondary text |
| text-base | 12px | Body text (default) |
| text-lg | 14px | Subheadings, emphasis |
| text-xl | 16px | Section headings |
| text-2xl | 18px | Section headings |
| text-3xl | 20px | Section headings |
| text-4xl | 30px | Section headings |
| text-9 | 36px | General use |

**Weight scale:** 400 · 500 · 600 · 700
**Line heights:** 18px · 36px · 28px · 45px · 20px · 11px · 24px · 15px · 16px · 14px · 10px · 16.5px · 12.75px · 13.3px · 13.5px

### Spacing

**Base unit:** 8px

`space-1: 2px` · `space-2: 4px` · `space-3: 6px` · `space-4: 8px` · `space-5: 10px` · `space-6: 12px` · `space-7: 14px` · `space-8: 16px` · `space-9: 24px` · `space-10: 32px` · `space-11: 48px` · `space-12: 56px` · `space-13: 96px` · `space-14: 120px`

### Shapes

**Border radius:** `radius-sm: 0px 0px 27.2px 27.2px` · `radius-md: 3.35544e+07px` · `radius-lg: 4px` · `radius-xl: 6px` · `radius-full: 8px` · `radius-6: 12px` · `radius-7: 18.4px` · `radius-8: 21.6px` · `radius-9: 23.2px` · `radius-10: 24.8px` · `radius-11: 27.2px 27.2px 0px 0px` · `radius-12: 37.6px` · `radius-13: 44px`

### Elevation

- **shadow-sm:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px`
- **shadow-md:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 255, 255, 0.8) 0px 1px 0px 0px inset`
- **shadow-lg:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 255, 255, 0.06) 0px 1px 0px 0px inset`
- **shadow-xl:** `lab(100 -0.0000298023 0.0000119209 / 0.05) 0px 1px 0px 0px inset`
- **shadow-5:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 255, 255, 0.32) 0px 10px 24px -14px`
- **shadow-6:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(0, 0, 0) 0px 24px 54px -38px, rgba(255, 255, 255, 0.043) 0px 1px 0px 0px inset`
- **shadow-7:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 255, 255, 0.08) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.75) 0px 10px 26px -18px`
- **shadow-8:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(0, 0, 0) 0px 18px 45px -32px`
- **shadow-9:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(0, 0, 0) 0px 14px 36px -30px, rgba(255, 255, 255, 0.043) 0px 1px 0px 0px inset`
- **shadow-10:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(0, 0, 0) 0px 28px 64px -44px, rgba(255, 255, 255, 0.043) 0px 1px 0px 0px inset`
- **shadow-11:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 255, 255, 0.035) 0px 1px 0px 0px inset`
- **shadow-12:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(0, 0, 0) 0px 24px 72px -48px, rgba(255, 255, 255, 0.043) 0px 1px 0px 0px inset`
- **shadow-13:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 255, 255, 0.35) 0px 1px 0px 0px inset`
- **shadow-14:** `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(0, 0, 0) 0px 22px 52px -40px, rgba(255, 255, 255, 0.035) 0px 1px 0px 0px inset`

### Motion

- **duration-fast:** `all`
- **duration-fast:** `none`
- **duration-fast:** `0s -0.55s`
- **duration-fast:** `0s -1.1s`
- **duration-fast:** `0s -1.65s`
- **duration-fast:** `0s -2.2s`
- **duration-fast:** `0s -0.4s`
- **duration-fast:** `0s -1.8s`
- **duration-fast:** `0s -0.8s`
- **duration-fast:** `0s -1.5s`
- **duration-fast:** `opacity 0.1s`
- **duration-fast:** `color 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), outline-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), fill 0.15s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-from 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-via 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-to 0.15s cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-fast:** `0.15s`
- **duration-fast:** `0.15s cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-fast:** `transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), translate 0.15s cubic-bezier(0.4, 0, 0.2, 1), scale 0.15s cubic-bezier(0.4, 0, 0.2, 1), rotate 0.15s cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-fast:** `transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)`
- **duration-base:** `color 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), outline-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), fill 0.3s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-from 0.3s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-via 0.3s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-to 0.3s cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-base:** `0.3s`
- **duration-slow:** `0.48s cubic-bezier(0.16, 1, 0.3, 1) both hero-face-preview-in`
- **duration-slow:** `1.05s steps(1) infinite motion-caret`
- **duration-slow:** `7.5s linear infinite motion-core-ring`

## Component Inventory

- **Buttons:** 5 detected
- **Links:** 92 detected
- **Lists:** 3 detected
- **Code blocks:** 1 detected
- **Images:** 181 detected

## Constraints

### Always

- Use tokens from the tables above — do not introduce new values.
- Include hover, focus-visible, and disabled states for interactive elements.
- Follow the 8px spacing grid.
- Meet WCAG 2.2 AA contrast minimums.

### Never

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values. Pin to the detected set (0px 0px 27.2px 27.2px, 3.35544e+07px, 4px, 6px, 8px, 12px, 18.4px, 21.6px, 23.2px, 24.8px, 27.2px 27.2px 0px 0px, 37.6px, 44px).
- Do not center-align body text or code blocks.
- Do not use more than two font weights on a single page.
- Do not ship components without defining hover, focus-visible, and disabled states.

## Tone

Clear, precise, developer-oriented. Prefer short sentences and imperative verbs.

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
