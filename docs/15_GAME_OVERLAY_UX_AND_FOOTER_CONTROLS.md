# GAME OVERLAY UX & FOOTER CONTROLS — CANONICAL DESIGN

> **Status:** Canonical. Authored 2026-03-03.
> **This file wins** if any other doc under `docs/` conflicts on the topics covered here.

---

## 1. Game Overlay — Always Persistent (Play Button Loads Overlay Immediately)

When the player taps the **Play button** (game controller icon in footer), the game overlay loads **immediately as a persistent overlay** — it does not navigate away or push a new route. The overlay sits on top of the current screen.

### 1a. Technical approach

- **Preferred:** The overlay is already mounted in the React tree at app root level (always present, just hidden/shown via `isOpen` prop). Tapping Play sets `isOpen = true` — no navigation, no remount, instant display.
- This avoids the "white flash on navigate" issue common with route-push approaches.
- The `LevelWorldsHub` / `IslandRunBoardPrototype` should be rendered inside `GameBoardOverlay` (or a dedicated `IslandRunOverlay`) that is always mounted but conditionally visible.
- Loading state: if the island run state is still hydrating, show a brief skeleton/spinner within the overlay rather than blocking the overlay open.

### 1b. Overlay structure

```
GameBoardOverlay (full-screen, z-index top)
├── TopBar (island name, cycle, timer countdown)
├── IslandRunBoardPrototype (17-tile board + token)
├── StopModals (conditionally rendered on top of board)
├── HUD row: [Coins] [Diamonds] [Hearts] [Shields] [Shards] [Dice count]
└── Permanent utility icons (Creature Collection + Garage) and active reward icons (Spin/Lucky Roll only when available)
```

---

## 2. Footer Controller — Tap Controller Image to Collapse

### 2a. Behaviour

When the footer is in **game mode** (expanded, `isDiodeActive = true`, showing the controller background image):

- Tapping any of the action **buttons** (spin, hatch, bank, etc.) triggers the relevant action (existing behaviour, unchanged).
- Tapping the **controller background image itself** (i.e. the user taps on the controller art but NOT on any button) → the controller/footer **hides downward** (collapses to compact/hidden state).

### 2b. Implementation hint

- The controller background `<div>` / `<img>` should be the target. Wrap it in a `<button>` or add an `onClick` handler.
- Use `event.target === event.currentTarget` check (or pointer-event CSS layering) to distinguish "tap on background" vs "tap bubbled up from a child button".
- On tap: call the existing collapse/hide handler (e.g. `setIsMobileFooterCollapsed(true)` or equivalent).

---

## 3. Mind & Body Energy Popup — Direction Change

### 3a. Old behaviour
The Mind / Body options popped out **to the right** from the energy button in the footer.

### 3b. New canonical behaviour
The Mind / Body options pop up **above** the energy button — upward, not sideways.

- The popup container should be absolutely positioned **above** (negative `bottom` offset from the button's container), centred on the button.
- Animation: slide up + fade in (upward translate + opacity transition).
- On collapse: slide down + fade out.
- The popup should not overflow off-screen top on short devices — add a max-height + scroll if needed, but in practice 2 items (Mind, Body) fit easily.

---

## 4. Summary of UX Changes This Doc Governs

| Change | Where | Status |
|---|---|---|
| Overlay persistent (no nav on Play) | `GameBoardOverlay` + `App.tsx` | Planned (slice G1A) |
| Controller tap-to-collapse | `MobileFooterNav.tsx` | Planned (slice G1B) |
| Energy popup goes upward | `MobileFooterNav.tsx` CSS | Planned (slice G1C) |

### 4a. Overlay icon consistency update

- The **holiday calendar** does **not** belong in the game overlay.
- The overlay’s reward rail should only show **currently active** reward icons:
  - Daily Spin (only if a spin is available)
  - Lucky Roll (only if the reward is active/unlocked)
- The overlay’s persistent utility rail should prioritize:
  - **Creature Collection / Sanctuary**
  - **Garage**

See `docs/18_LUCKY_ROLL_ISLAND_RUN_REFACTOR.md` for the Lucky Roll-specific availability contract.
