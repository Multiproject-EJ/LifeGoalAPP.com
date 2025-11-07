# Glassmorphic Design System Overview

This document summarizes the design system used to restyle LifeGoalApp. It consolidates the implementation notes from the Codex prompt into an actionable reference for engineers and designers.

## 0. Objectives
- Establish a cohesive, futuristic UI built on a glassmorphic aesthetic.
- Support responsive layouts from mobile (single column) to desktop (three columns).
- Provide reusable components and utilities for navigation, cards, buttons, toggles, tabs, and modals.
- Keep all existing application logic intact while refactoring markup/styling.

## 1. Core File Structure
Create and maintain the following assets:
```
/public/assets/icons/        # SVG icons
/public/assets/fonts/        # Optional font files (e.g., Inter, Roboto)
/src/styles/tokens.css
/src/styles/base.css
/src/styles/components.css
/src/styles/utilities.css
/src/styles/theme.css
/src/scripts/ui-theme.js
/src/scripts/ui-components.js
```

## 2. Design Tokens (`src/styles/tokens.css`)
Define CSS custom properties for spacing, radii, shadow, typography, transitions, and light/dark theme colors. Key highlights:
- Spacing scale based on 8px increments.
- Rounded corners (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`).
- Elevation shadows (`--shadow-1`, `--shadow-2`, `--shadow-glow`).
- Typography sizes (`--fs-xs` through `--fs-xl`) and default UI font stack.
- Light theme defaults plus overrides inside `:root[data-theme="dark"]`.
- Glass-specific values for blur and saturation.

Refer to the inline sample in the original prompt for the complete token list.

## 3. Base Layer (`src/styles/base.css`)
- Import `tokens.css`.
- Normalize box sizing, set the global background gradient, and apply typography smoothing.
- Implement the responsive grid utility (1 → 2 columns at 768px, 3 columns at 1120px).
- Define heading styles and focus-visible outlines.
- Provide the reusable `.glass` class that applies the frosted surface, border, and shadow treatment.

## 4. Components (`src/styles/components.css`)
- Import `base.css` to inherit tokens and foundational styles.
- Define reusable `.card` structure (with hover lift), `.btn` variants, `.toggle`, `.tabs`, `.navbar`, and `.modal` primitives.
- Emphasize subtle animations using the transition tokens.

## 5. Utilities (`src/styles/utilities.css`)
- Lightweight utility classes such as `.hidden`, `.row`, `.right`, `.muted`, `.center`, `.mt-4`, `.mb-4`, and `.w-full` to cover common layout tweaks.

## 6. Theme Aggregator (`src/styles/theme.css`)
- Import the component and utility layers.
- Apply optional global refinements (e.g., thin scrollbars) for polish.

## 7. Scripts
- `src/scripts/ui-theme.js`: Handles prefers-color-scheme detection, local storage persistence, and `[data-action="toggle-theme"]` handlers.
- `src/scripts/ui-components.js`: Provides click-driven toggle switches and simple drag-and-drop behavior for elements within `[data-grid]` containers.

## 8. Page Integration Guidelines
- Include theme CSS and scripts in every page `<head>`:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="/src/styles/theme.css">
  <script defer src="/src/scripts/ui-theme.js"></script>
  <script defer src="/src/scripts/ui-components.js"></script>
  ```
- Wrap main content in `.container` and use `.grid` for widgets.
- Convert blocks into `.card glass` sections with `.card__header`, `.card__title`, `.card__meta`, and `.btn` actions.
- Replace binary controls with `.toggle` switches and modals with the shared `.modal` pattern.
- Ensure interactive elements meet accessibility criteria and maintain original functionality.

## 9. Sample Markup Patterns
Include examples for:
- Navbar with theme toggle.
- Dashboard grid with draggable cards.
- Tabs for filtering.
- Modal dialog structure.

The sample snippets from the prompt should be adapted as canonical patterns when updating pages.

## 10. QA Expectations
- Test both themes, mobile-to-desktop breakpoints, drag & drop, toggles, and modals.
- Confirm color contrast and that no horizontal scrolling occurs on mobile.
- Validate keyboard and touch accessibility across interactive controls.

Keep this guide updated as the system evolves. Any deviations should be documented here to preserve a single source of truth for LifeGoalApp's visual language.
