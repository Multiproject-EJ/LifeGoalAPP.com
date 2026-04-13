# Theme Layer Contract

This document defines structural layer ownership and naming for the mobile workspace UI.
Use these names in specs/tickets to avoid ambiguity about geometry vs paint vs overlay responsibilities.

## 1) System UI Strip Layer (non-DOM)
- **Selectors/hooks:** N/A (OS/browser-composited strip, e.g. Safari top browser/status area).
- **Responsibility:** Platform-provided chrome above app DOM.
- **Owns:** Overlay behavior (non-CSS app layer).
- **Should touch real viewport edges:** Yes (outside app DOM control).

## 2) Root-level Viewport Backing Layer
- **Selectors/hooks:**
  - `:root` token `--root-viewport-backing`
  - `html`
  - `body`
- **Responsibility:** Paint visible browser-exposed viewport areas that are outside in-app surfaces.
- **Owns:** Paint only (root document backing, not app content geometry).
- **Should touch real viewport edges:** Yes (this is the document-level edge paint).
- **Reality check:** In browser mode, exposed top/bottom bands belong to this layer (`body`/document backing), not screen-specific canvases.

## 3) Physical Viewport Owner Layer
- **Selectors/hooks:**
  - `.app--mobile-home-frame.app--mobile-frame`
  - `.app--mobile-home-frame.app--mobile-frame .workspace-shell`
- **Responsibility:** Decide whether active route/mode reaches true viewport top/bottom.
- **Owns:** Geometry ownership for route/mode.
- **Should touch real viewport edges:** Yes in Today mobile full-screen mode.

## 4) App Backdrop Layer
- **Selectors/hooks:** `.app--workspace`
- **Responsibility:** Global in-app environmental paint behind shell/content.
- **Owns:** Paint.
- **Should touch real viewport edges:** Not guaranteed. It can fill app bounds, but does not own browser-exposed document edges.

## 5) Frame Geometry Layer
- **Selectors/hooks:**
  - `.app--mobile-frame`
  - `--mobile-frame-width`
  - `--mobile-frame-height`
- **Responsibility:** Bounded framed-phone geometry for preview/framed contexts.
- **Owns:** Geometry.
- **Should touch real viewport edges:** Not always; context-dependent by route/mode.

## 6) Workspace Shell Bounds Layer
- **Selectors/hooks:**
  - `.workspace-shell`
  - `.app--mobile-frame .workspace-shell`
- **Responsibility:** Immediate content bounds and shell height application.
- **Owns:** Geometry bounds.
- **Should touch real viewport edges:** Only when viewport-owner rules require full-height mode.

## 7) Screen Canvas Layer (Today implementation)
- **Selectors/hooks:** `.mobile-habit-home`
- **Responsibility:** Screen-level canvas/background and in-flow content spacing.
- **Owns:** Paint + in-flow spacing.
- **Should touch real viewport edges:** Only when upstream geometry allows it.

## 8) Top Board/Header Surface Layer
- **Selectors/hooks:**
  - `.habit-checklist-card__board`
  - `.habit-checklist-card__board-head`
- **Responsibility:** First major in-content surface at top of Today screen.
- **Owns:** Paint/content surface.
- **Should touch real viewport edges:** No (depends on canvas/shell insets).

## 9) Footer / Gamepad Overlay Zone
- **Selectors/hooks:** `.mobile-footer-nav` (and route-specific fixed overlay companions).
- **Responsibility:** Persistent bottom control surface and overlay alignment.
- **Owns:** Overlay behavior.
- **Should touch real viewport edges:** Bottom edge alignment in mobile contexts.

## 10) Fullscreen-Within-Frame Overlay Layer
- **Selectors/hooks:**
  - `.level-worlds-entry-modal`
  - `.game-board-overlay`
  - `.game-board-overlay__backdrop`
  - `.game-board-overlay__content`
- **Responsibility:** Experiences that should fill active frame/viewport bounds.
- **Owns:** Overlay geometry + paint.
- **Should touch real viewport edges:** Match currently active frame/viewport owner.

## Root backing vs in-app backgrounds (explicit rule)
- **Root-level Viewport Backing Layer (`html`/`body`)** is responsible for any browser-exposed bands.
- **App Backdrop Layer (`.app--workspace`)** is responsible for ambience behind app shell/content only.
- **Screen Canvas Layer** is screen-specific and must not be used to "fix" browser-exposed root document bands.

## Authoring Rules (Structural + Theme)
1. Always identify **Physical Viewport Owner Layer** before changing in-app paint layers.
2. If the issue is in browser-exposed top/bottom bands, fix **Root-level Viewport Backing Layer** first (`:root` token + `html`/`body` paint).
3. Do not change **Frame Geometry Layer** variables in theme-only tickets.
4. Treat **App Backdrop Layer** as environmental in-app paint, not a substitute for root backing or content geometry ownership.
5. Use **Screen Canvas Layer** for screen-level wallpaper/ambient styling only after viewport ownership is correct.
6. Keep **Footer / Gamepad Overlay Zone** position rules stable unless the ticket is explicitly about control geometry.
7. If a ticket changes which layer touches viewport edges, update this contract first.

---

If structural ownership changes, update this file in the same PR before theme-specific work.
