# Theme Layer Contract

This document defines structural layer ownership and naming for the mobile workspace UI.
Use these names in specs/tickets to avoid ambiguity about geometry vs paint vs overlay responsibilities.

## 1) System UI Strip Layer (non-DOM)
- **Selectors/hooks:** N/A (OS-composited strip; e.g. iOS standalone status bar behavior)
- **Responsibility:** Platform-provided system chrome above app DOM.
- **Owns:** Overlay behavior (non-CSS app layer).
- **Should touch real viewport edges:** Yes (outside app DOM control).

## 2) Physical Viewport Owner Layer
- **Selectors/hooks:**
  - `.app--mobile-home-frame.app--mobile-frame`
  - `.app--mobile-home-frame.app--mobile-frame .workspace-shell`
- **Responsibility:** Decide whether the active route reaches true viewport top/bottom.
- **Owns:** Geometry ownership for route/mode.
- **Should touch real viewport edges:** Yes in Today mobile full-screen mode.

## 3) App Backdrop Layer
- **Selectors/hooks:** `.app--workspace`
- **Responsibility:** Global environmental paint behind frame/shell/content.
- **Owns:** Paint.
- **Should touch real viewport edges:** Can paint full viewport, but is not the primary content edge owner.

## 4) Frame Geometry Layer
- **Selectors/hooks:**
  - `.app--mobile-frame`
  - `--mobile-frame-width`
  - `--mobile-frame-height`
- **Responsibility:** Bounded framed-phone geometry for preview/framed contexts.
- **Owns:** Geometry.
- **Should touch real viewport edges:** Not always; context-dependent by route/mode.

## 5) Workspace Shell Bounds Layer
- **Selectors/hooks:**
  - `.workspace-shell`
  - `.app--mobile-frame .workspace-shell`
- **Responsibility:** Immediate content bounds and shell height application.
- **Owns:** Geometry bounds.
- **Should touch real viewport edges:** Only when viewport-owner rules require full-height mode.

## 6) Today Canvas Layer
- **Selectors/hooks:** `.mobile-habit-home`
- **Responsibility:** Today tab canvas/background and content spacing.
- **Owns:** Paint + in-flow content spacing.
- **Should touch real viewport edges:** Only when upstream geometry allows it.

## 7) Top Board/Header Surface Layer
- **Selectors/hooks:**
  - `.habit-checklist-card__board`
  - `.habit-checklist-card__board-head`
- **Responsibility:** First major in-content surface at top of Today screen.
- **Owns:** Paint/content surface.
- **Should touch real viewport edges:** No (depends on canvas/shell insets).

## 8) Footer / Gamepad Overlay Zone
- **Selectors/hooks:** `.mobile-footer-nav` (and route-specific fixed overlay companions)
- **Responsibility:** Persistent bottom control surface and overlay alignment.
- **Owns:** Overlay behavior.
- **Should touch real viewport edges:** Bottom edge alignment in mobile contexts.

## 9) Fullscreen-Within-Frame Overlay Layer
- **Selectors/hooks:**
  - `.level-worlds-entry-modal`
  - `.game-board-overlay`
  - `.game-board-overlay__backdrop`
  - `.game-board-overlay__content`
- **Responsibility:** Experiences that should fill active frame/viewport bounds.
- **Owns:** Overlay geometry + paint.
- **Should touch real viewport edges:** Match currently active frame/viewport owner.

## Authoring Rules (Structural + Theme)
1. Always identify **Physical Viewport Owner Layer** before changing paint layers.
2. Do not change **Frame Geometry Layer** variables in theme-only tickets.
3. Treat **App Backdrop Layer** as environmental paint, not a substitute for content geometry ownership.
4. Use **Today Canvas Layer** for wallpaper/ambient styling only after viewport ownership is correct.
5. Keep **Footer / Gamepad Overlay Zone** position rules stable unless the ticket is explicitly about control geometry.
6. If a ticket changes which layer touches viewport edges, update this contract first.

---

If structural ownership changes, update this file in the same PR before theme-specific work.
