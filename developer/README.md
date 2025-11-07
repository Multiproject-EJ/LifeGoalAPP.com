# LifeGoalApp Developer Notes

This folder centralizes the working plan for the visual refresh of LifeGoalApp. It captures the reusable design system, file structure, and implementation guidance so that any contributor can confidently apply the new glassmorphic style across the application.

## Project Vision
- Deliver a futuristic, immersive UI with frosted-glass surfaces, soft shadows, rounded cards, and smooth motion.
- Provide both Light and Dark themes that respect the user's OS preference while still allowing manual toggling.
- Build modular, reusable UI components (cards, buttons, toggles, tabs, nav, modals) that can be composed across pages like Dashboard, Habits, Goals, and Vision Board.
- Maintain existing routes and JavaScript logic—only enhance markup and styles.

## Delivery Checklist
The core deliverables for this restyle include:
1. **Design tokens and theme styles** in `/src/styles` using plain CSS modules (no frameworks).
2. **Reusable scripts** for theme toggling and interactive widgets in `/src/scripts`.
3. **Reusable markup patterns** for navigation bars, grids, cards, modals, tabs, and toggles.
4. **Page migrations** that wrap content in containers, adopt the new grid, and replace legacy controls with the shared components.

Refer to [`style-guide.md`](./style-guide.md) for the detailed system specifications and [`style-update-checklist.md`](./style-update-checklist.md) for a page-by-page validation workflow.

## Working Notes
- All spacing, typography, radii, and color decisions originate from CSS variables in `tokens.css` to ensure consistency.
- Follow the responsive grid guidance (1 → 2 → 3 columns) to maintain a cohesive layout from mobile to desktop.
- Animate interactions subtly: button hovers lift slightly, cards float up on hover, modals fade/scale into view.
- Keep accessibility a priority: ensure focus states are visible, targets are at least 44px, and color contrast meets WCAG guidelines.

When updating or creating pages, always consult the checklist and record the page status so the team can track migration progress.
