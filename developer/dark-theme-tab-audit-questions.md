# Dark Theme Tab/Submenu Audit – Open Questions

Per your direction, everything below has been implemented as dark-safe by default.
These are the few items you might *optionally* want brighter later for brand/UX reasons.

## Questions to review together
1. **Google auth button in dark theme**
   - Current implementation keeps it dark-themed for consistency.
   - Question: should this button preserve a lighter/brand-native white treatment for recognizability?

2. **Primary gradient chips/buttons in goal filters**
   - Active filters/chips are currently dark-surface with cyan/purple glow.
   - Question: do you want stronger contrast (brighter gradient) for active state visibility?

3. **Vision board stage overlay opacity**
   - Current implementation uses dark translucent surface to avoid bright panel feel.
   - Question: should the overlay be even more transparent so background art is more visible?

## Coverage included in this pass
- Workspace stage shell and onboarding hint
- Goal list menus, filters, search, nav chips/buttons (submenu-like controls)
- Auth mode pills and auth divider styling
- Previously hardened placeholders, goal forms/cards, status pills, CTA and callouts
