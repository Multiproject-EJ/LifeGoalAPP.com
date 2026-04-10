# Launcher Menu Upgrade Feasibility Analysis

## Request evaluated
You want the mobile launcher menu to be simplified into this structure:

1. **Player's Hand** (top quick action, already present)
2. **My Quest** (new larger grouped button)
   - opens a popup/submenu containing:
   - Health Goals
   - Habits
   - Routines
   - Goals
   - Check-ins
   - Contracts
3. Three standalone buttons:
   - Coach
   - Settings
   - Feedback & Support (single grouped button)
4. **Profile strength** (bottom card, already present)

## Feasibility verdict
**Yes — this upgrade is feasible with low-to-medium implementation risk** in the current codebase.

The launcher is centrally driven from `src/App.tsx`, and it already has:
- a generated mobile menu item list (`mobileMenuNavItems`),
- modal-specific item handling (`modalKey` for feedback/support),
- click handlers and hold behaviors for menu entries,
- existing quick-action and profile-strength regions.

That means the requested grouping can be implemented without major architecture changes.

## Why this is feasible in current architecture

### 1) Menu items are already composed from a data model
`mobileMenuNavItems` is built through `useMemo`, combining workspace-derived entries and extra entries (coach/feedback/support). This is a strong fit for introducing grouped items (`my-quest`, `feedback-support`) without rewriting the menu system.

### 2) The launcher grid is rendered from one list map
The popup grid rendering maps over `mobileMenuNavItems` and routes actions by item ID. Adding grouped-button behavior can be done by extending the click path for new IDs.

### 3) Feedback and support already open separate modals
There is an existing dedicated function for feedback/support modal routing (`openFeedbackSupportFromMobileMenu`). A combined **Feedback & Support** entry can call this same function from a small chooser sheet.

### 4) Existing hierarchy already matches your desired anchors
- **Player's Hand** exists in the header area.
- **Profile strength** already exists in the launcher bottom settings area.
So only the middle launcher grid needs restructuring.

## Recommended implementation shape (minimal disruption)

### A) Add two grouped launcher entries
Add these mobile menu items:
- `my-quest` (large tile style)
- `feedback-support` (single tile that opens submenu)

### B) Remove duplicated quest-related tiles from top-level launcher grid
Keep these as submenu targets under My Quest instead of top-level buttons:
- `body` (Health Goals)
- `habits`
- `routines`
- `support` (currently "Life Goals")
- `planning` (can represent Check-ins)
- `contracts`

### C) Create two lightweight popups/sheets
- **My Quest popup**: a compact action list for the 6 quest items.
- **Feedback & Support popup**: two actions (Feedback, Support).

You can implement this with local state booleans in `App.tsx` first, then optionally extract reusable popup components later.

### D) Keep existing navigation handlers
Route submenu item clicks back to `handleMobileNavSelect(...)` so behavior remains consistent with current navigation/auth/game-overlay rules.

## UX and naming clarifications to confirm
Before implementation, confirm these mappings:

1. **"Goals" vs existing labels**  
   In code, long-term goals currently use nav id `support` with label "Life Goals". If you want "Goals" wording, this should be renamed in launcher copy.

2. **"Check-ins" target**  
   Most likely maps to `planning` (Today / check-in flow), but confirm exact desired destination.

3. **"Settings" button location**  
   Settings exists as `account`; keep as top-level standalone tile as requested.

4. **Large button behavior**  
   If "My Quest" should be visually larger than other tiles, add a modifier class like `mobile-menu-overlay__item--large` and CSS rules for spanning columns.

## Risk assessment
- **Functional risk: Low** (mainly menu routing and local UI state).
- **Regression risk: Medium-Low** (touches a core launcher surface; test mobile navigation thoroughly).
- **Performance risk: Low** (small state/UI additions only).

## Test checklist (after implementation)
1. Open launcher; verify only requested top-level structure appears.
2. Tap **My Quest**; verify all 6 submenu entries open expected destinations.
3. Tap **Feedback & Support**; verify both modal paths open correctly.
4. Verify coach/settings still work.
5. Verify Player's Hand and Profile strength behavior unchanged.
6. Verify hold-tooltip interactions are either disabled or intentionally supported for grouped tiles.
7. Mobile responsive check for iPhone narrow widths and common Android widths.

## Conclusion
This upgrade is **practical and should be straightforward** in the current launcher architecture. Most work is in menu data composition, a pair of submenu popups, and small styling updates.
