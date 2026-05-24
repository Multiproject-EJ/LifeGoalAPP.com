# Mobile Footer ↔ Game Mode Controller Decoupling Investigation

_Date: 2026-05-24_

## Scope
Investigated current mobile game-mode preference, footer controller layout state, and GameBoardOverlay orchestration in:

- `src/App.tsx`
- `src/components/MobileFooterNav.tsx`
- `src/index.css` (mobile footer styles)
- `docs/15_GAME_OVERLAY_UX_AND_FOOTER_CONTROLS.md`

No code behavior changes were made as part of this investigation.

---

## Current state map

### A) Persisted preference state
- Canonical persisted preference is `gamificationEnabled` from `useGamification(...)` in `App.tsx`.
- Local UI state `isMobileMenuImageActive` is initialized in App state and then synced from `gamificationEnabled` via effect:
  - `setIsMobileMenuImageActive(gamificationEnabled)`.
- Preference writes happen through `updateGamificationEnabled(userId, nextIsActive)` inside `handleGameModePreferenceChange`, followed by `refreshGamificationProfile()`.

### B) Overlay open state
- Overlay visibility state is `showGameBoardOverlay` in `App.tsx`.
- `GameBoardOverlay` receives `isOpen={showGameBoardOverlay}` and is closed by `onClose={() => setShowGameBoardOverlay(false)}`.

### C) Footer visual/controller mode state
- `MobileFooterNav` receives `isDiodeActive={isMobileMenuImageActive}` in both mobile render branches.
- In `MobileFooterNav`, `isDiodeActive` controls whether controller/image classes are applied.
- CSS switches between:
  - flat/glass base surface (`.mobile-footer-nav__surface`), and
  - controller-image surface (`.mobile-footer-nav__surface--image`) with themed controller art.

### D) Coupling today
- `isMobileMenuImageActive` currently drives both:
  1) persisted “game mode ON/OFF” semantics, and
  2) footer controller/image visual mode (`isDiodeActive`).
- `showGameBoardOverlay` is separately controlled, but _not_ used to gate the footer controller layout today.

---

## Current click/hold/toggle flow

## 1) `handleMobileGameStatusClick`
Defined in `App.tsx`.

Current behavior:
- If mobile footer is collapsed, expands and returns.
- If `isMobileMenuImageActive` is false, forcibly sets `showGameBoardOverlay(false)` and returns.
- Otherwise toggles overlay open/closed: `setShowGameBoardOverlay(prev => !prev)`.

Implication:
- Status click cannot open overlay unless game mode preference is already ON.

## 2) `handleMobileGameStatusHoldToggle`
Defined in `App.tsx`.

Current behavior:
- Computes `nextIsActive = !isMobileMenuImageActive`.
- Delegates to `handleGameModePreferenceChange(nextIsActive)`.

## 3) `handleGameModePreferenceChange`
Defined in `App.tsx` (`useCallback(async (nextIsActive) => { ... })`).

Current side effects (in order):
1. `setIsMobileMenuImageActive(nextIsActive)`.
2. Visual flash trigger (`triggerMobileMenuFlash()`).
3. Forces navigation context:
   - `setActiveWorkspaceNav('planning')`
   - `setShowMobileHome(true)`
4. Closes menus/overlays:
   - `setIsMobileMenuOpen(false)`
   - `setShowGameBoardOverlay(false)`
   - `setShowMobileGamification(false)`
5. If authenticated, persists setting via `updateGamificationEnabled(userId, nextIsActive)`.
6. Refreshes profile (`refreshGamificationProfile()`).

Implication:
- Turning game mode ON currently **closes** the game overlay and forces user to Today/home-planning branch.

---

## What `isMobileMenuImageActive` controls today

It currently controls all of the following:

1. Footer/controller visual mode by being passed directly as `isDiodeActive` into `MobileFooterNav`.
2. Mobile overlay and toggle visual classes/text in menu/gamification overlays (`GAME MODE (ON/OFF)` and diode toggle classes).
3. Behavioral guards around footer collapse/scroll interactions and journal-specific footer treatment in multiple derived conditions.
4. Eligibility to open game status overlay on status click (`handleMobileGameStatusClick`).
5. Together with `gamificationEnabled`, contributes to `isGameModeActive` used for points badge behavior.

Summary: it is both a persisted-mode proxy and a broad UI-mode switch.

---

## What `isDiodeActive` controls inside `MobileFooterNav`

`isDiodeActive` currently controls:

- Whether footer renders in controller/image layout classes:
  - `.mobile-footer-nav--diode-on`
  - `.mobile-footer-nav__surface--image`
- Whether “diode off” compact status variant is used (`isCompactGameStatus = !isDiodeActive`):
  - status card shows compact icon-only style when false.
- Whether diamond counter is shown and animated/faded.
- Whether controller fade timers / reveal behavior are active.
- Whether hold accent color uses game-mode palette.
- Whether energy-focus modifier class can apply while energy menu is open.
- Menu-button ornament differences (orb styling and icon variants).

Net: `isDiodeActive` is the primary switch for controller-vs-flat footer presentation and related micro-interactions.

---

## Where key handlers are defined and side effects

- `handleMobileGameStatusClick`: `src/App.tsx`.
  - Side effects: may expand footer, may close overlay when game mode OFF, otherwise toggles overlay.

- `handleMobileGameStatusHoldToggle`: `src/App.tsx`.
  - Side effects: toggles game mode preference by calling `handleGameModePreferenceChange`.

- `handleGameModePreferenceChange`: `src/App.tsx`.
  - Side effects: local state update, visual flash, forced mobile-home navigation, close menu, close game overlay, close mobile gamification, persist preference, refresh profile.

---

## Is `GameBoardOverlay` mounted in all mobile app branches?

Yes — effectively in both primary mobile rendering branches in `App.tsx`.

Observed:
- A `GameBoardOverlay` instance appears in one large branch near the mobile-frame path.
- Another `GameBoardOverlay` instance appears in the alternate/mobile-home composition path.
- Both are controlled by the same `showGameBoardOverlay` state.

Therefore it is not limited to a single “mobile-home-only” branch.

---

## Can we open overlay from non-home mobile workspace without forcing navigation to Today?

**Technically yes**, with a small behavior change.

Why:
- Overlay is app-root overlay, not route-push based, matching canonical UX doc intent.
- It already opens via simple `setShowGameBoardOverlay(true)` in multiple contexts.

Current blocker:
- `handleGameModePreferenceChange` currently force-navigates to planning/today and closes overlay.

If we remove/guard those side effects for ON transitions, overlay can open safely from non-home workspaces without route coercion.

---

## Proposed state map (aligned to desired UX)

Recommended separation:

1. **Persisted preference**: keep `isMobileMenuImageActive` (synced to `gamificationEnabled`) as “Game Mode ON/OFF preference.”
2. **Overlay open state**: keep `showGameBoardOverlay` as runtime UI state.
3. **Footer controller layout state (derived)**:

```ts
const isFooterControllerLayoutActive = isMobileMenuImageActive && showGameBoardOverlay;
```

Pass to footer:

```tsx
<MobileFooterNav isDiodeActive={isFooterControllerLayoutActive} ... />
```

Outcome:
- Game mode can stay ON persistently while footer remains flat unless overlay is open.

---

## Implementation risks

1. **Hidden coupling risk**: existing conditions that assume `isMobileMenuImageActive` means controller layout may need review to avoid regressions in collapse/flash/scroll behavior.
2. **Forced navigation side-effects**: removing/adjusting `setActiveWorkspaceNav('planning')` + `setShowMobileHome(true)` changes long-standing behavior and may affect analytics expectations.
3. **Dual overlay instances risk**: because overlay is rendered in two branches, ensure both footer instances receive the same derived `isDiodeActive` and close/open behavior remains synchronized.
4. **Energy menu/status compact transitions**: switching diode visual state based on overlay open/close will trigger compact/full status transitions; verify no jarring flicker during close animations.
5. **OFF transition semantics**: turning game mode OFF should still close overlay; ON should open overlay. This asymmetric behavior must be explicit to avoid accidental regressions.

---

## Exact files likely needing changes

1. `src/App.tsx`
   - Add derived `isFooterControllerLayoutActive`.
   - Pass derived value to both `MobileFooterNav` instances.
   - Update `handleGameModePreferenceChange` ON path to open overlay instead of closing, and to avoid forced navigation for this flow.
   - Preserve OFF behavior to close overlay.
   - Confirm close/navigate-away handlers keep setting `showGameBoardOverlay(false)` so footer returns flat.

2. `src/components/MobileFooterNav.tsx`
   - Likely no structural changes required if `isDiodeActive` semantics remain “controller layout active now.”
   - Optional prop rename later for clarity, but not required in minimal slice.

3. `src/index.css`
   - Likely no required changes for minimal decoupling; styles already react to diode classes.
   - Only touch if any transition/flicker polish is needed.

4. `docs/15_GAME_OVERLAY_UX_AND_FOOTER_CONTROLS.md`
   - Potential small clarifying update if implementation semantics are codified (“game mode preference vs active controller layout”).

---

## Recommended smallest safe PR slice

1. **State derivation only** in `App.tsx`:
   - Introduce `isFooterControllerLayoutActive = isMobileMenuImageActive && showGameBoardOverlay`.
2. **Wire footer props**:
   - Replace `isDiodeActive={isMobileMenuImageActive}` with derived value in both mobile footer renders.
3. **Adjust preference-change behavior minimally**:
   - In `handleGameModePreferenceChange(true)`: open overlay (`setShowGameBoardOverlay(true)`), do not force planning/today navigation.
   - In `handleGameModePreferenceChange(false)`: close overlay (`setShowGameBoardOverlay(false)`), keep persistence sync.
4. **No CSS refactor initially**.
5. **Add focused tests** (or at minimum integration assertions) around:
   - ON => overlay opens.
   - OFF => overlay closes.
   - overlay close while ON => footer flat, mode still ON.
   - ON from non-home workspace => overlay opens without workspace jump.

This is the narrowest change that achieves the requested decoupling while minimizing blast radius.

---

## PASS / FAIL recommendation

**PASS (recommended to implement)** with the minimal slice above.

Rationale:
- Matches desired UX exactly.
- Aligns with canonical overlay approach (persistent app-root overlay, no forced navigation).
- Keeps persistence model intact while isolating controller layout to overlay-open runtime state.
- Requires mostly `App.tsx` wiring changes, limiting risk.
