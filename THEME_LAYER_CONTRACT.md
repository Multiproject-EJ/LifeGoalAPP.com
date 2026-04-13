# Theme Layer Contract

This document defines the stable layer names and CSS hooks used by the mobile-framed workspace UI.
Use these names in theme specs, tickets, and implementation plans.

## 1) App Backdrop Layer
- **Purpose:** Global app/environment background behind all frame and content layers.
- **Primary hook:** `.app--workspace`
- **Current source:** `src/index.css`

## 2) Frame Viewport Layer
- **Purpose:** Defines bounded device-like viewport (phone frame lock on tablet/desktop).
- **Primary hooks:**
  - `.app--mobile-frame`
  - `.workspace-shell`
  - `--mobile-frame-width`
  - `--mobile-frame-height`
- **Behavior note:** On phone widths (`max-width: 720px`), frame is reset to full viewport width/height.

## 3) Today Canvas Layer
- **Purpose:** Today tab canvas/background inside frame viewport.
- **Primary hook:** `.mobile-habit-home`
- **Theme note:** Use this for theme wallpapers/ambient effects for Today tab.

## 4) Main Content Card Layer
- **Purpose:** Primary content surface above Today canvas.
- **Primary hooks:**
  - `.habit-checklist-card__board-body`
  - theme variants under dark themes (`[data-theme='...'] .mobile-habit-home .habit-checklist-card__board-body`)
- **Theme note:** Keep this layer optionally semi-transparent when wallpaper effects are desired.

## 5) Persistent Footer Controller Layer
- **Purpose:** Fixed bottom controller/navigation UI.
- **Primary hook:** `.mobile-footer-nav`
- **Behavior note:**
  - framed-center rules apply in locked frame mode
  - phone-width override sets edge-to-edge (`left: 0; right: 0`)

## 6) Fullscreen-Within-Frame Overlay Layer
- **Purpose:** Modal/overlay experiences that should be "fullscreen" within the currently active bounds (frame or viewport).
- **Primary hooks:**
  - `.level-worlds-entry-modal`
  - `.game-board-overlay`
  - `.game-board-overlay__backdrop`
  - `.game-board-overlay__content`

## Authoring Rules for Theme Work
1. Do not change frame geometry variables (`--mobile-frame-width`, `--mobile-frame-height`) when only styling themes.
2. Prefer wallpaper/animation on **Today Canvas Layer** first.
3. Adjust opacity/blur of **Main Content Card Layer** per-theme for readability.
4. Keep **Persistent Footer Controller Layer** dimensions/positioning stable across tabs.
5. Keep overlay bounds aligned with **Fullscreen-Within-Frame Overlay Layer** rules.

## Suggested Theme Spec Language
- "Apply animated wallpaper to **Today Canvas Layer** (`.mobile-habit-home`)."
- "Use 88% opacity on **Main Content Card Layer** (`.habit-checklist-card__board-body`) in Night themes."
- "Do not modify **Frame Viewport Layer** sizing variables in this ticket."

---

If new structural layers are introduced, update this file before implementing theme-specific assets.
