# Dark Theme Analysis – Pass 5 (Mobile overlays)

## Scope reviewed
- Mobile menu overlay profile dashboard and settings rows.
- Mobile overlay buttons/close controls and menu tiles.

## Confirmed dark-theme issues found
1. **Profile dashboard cards/chips remained bright in dark mode**
   - Several profile dashboard surfaces used near-white gradients/backgrounds.
2. **Ring center and metric rows had light interior surfaces**
   - The ring center and metrics/highlights could look like white patches in dark contexts.
3. **Overlay controls/buttons had mixed dark handling**
   - Some controls had dark overrides, but hover/close/settings states were inconsistent.

## Fixes applied in this pass
- Added dark-glass overrides for profile dashboard, metrics, highlights, ring center, and key text hierarchy.
- Unified settings/account/close/control button surfaces and hover/focus states with dark token-based surfaces.
- Hardened menu item tile buttons to avoid light leaks in dark mode.

## Next analysis targets
1. Remaining popovers/modals outside mobile menu overlay.
2. Cross-check compact/responsive breakpoints for any light-only fallback remnants.
