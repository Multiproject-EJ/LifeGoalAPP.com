# Page Migration Checklist

Use this reusable checklist to confirm that each page in LifeGoalApp adheres to the glassmorphic design system. Duplicate the checklist section for every page you migrate and record the status in the table below.

## Page Tracking
| Page | Owner | Status | Notes |
|------|-------|--------|-------|
| Dashboard | | ☐ Pending / ☐ In Progress / ☐ Complete | |
| Habits | | ☐ Pending / ☐ In Progress / ☐ Complete | |
| Goals | | ☐ Pending / ☐ In Progress / ☐ Complete | |
| Vision Board | | ☐ Pending / ☐ In Progress / ☐ Complete | |
| ... | | | |

## Checklist
- [ ] **Include shared assets**: `theme.css`, `ui-theme.js`, and `ui-components.js` are linked in the `<head>`.
- [ ] **Container layout**: Main content wrapped in `.container`; widget areas use `.grid` with responsive breakpoints.
- [ ] **Cards & surfaces**: Major sections use `.card glass` with `.card__header`, `.card__title`, and optional `.card__meta`.
- [ ] **Buttons**: Actions leverage `.btn`, `.btn--primary`, or `.btn--ghost` variants; hover and focus states verified.
- [ ] **Toggles & controls**: Binary controls converted to `.toggle` components with accessible labels.
- [ ] **Navigation**: Shared `.navbar` or `.tabs` patterns are applied where relevant.
- [ ] **Modals**: Any dialogs use the standardized `.modal` structure and animation behavior.
- [ ] **Utilities**: Apply utility classes (`.row`, `.muted`, `.mt-4`, etc.) instead of ad-hoc inline styles where possible.
- [ ] **Responsive review**: Layout tested at mobile, tablet, and desktop widths; no horizontal scrolling.
- [ ] **Theme verification**: Confirm Light and Dark themes render correctly and the toggle persists preference.
- [ ] **Interaction QA**: Drag-and-drop widgets, toggles, and modals function with mouse, keyboard, and touch.
- [ ] **Accessibility**: Focus outlines visible, touch targets ≥ 44px, and color contrast meets WCAG guidelines.

Update this document as pages are completed to maintain transparency on the migration progress.
