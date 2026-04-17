# TODAY TAB — TIME-BOUND OFFERS & CIRCULAR BUTTONS — CANONICAL DESIGN

> **Status:** Canonical. Authored 2026-03-03.
> **This file wins** if any other doc under `docs/` conflicts on the topics covered here.
> Supersedes all earlier descriptions of the today-tab offer row, daily-treat calendar placement, and vision-star entry flow.

---

## 1. Overview

The Today tab gets an upgraded "Time-Bound Offers Row" — a persistent row of **4 circular buttons** that surfaces all time-limited actions the player can take right now. These replace the old in-line sections for Vision Star, Daily Treat Calendar, etc. — all of those now live inside pop-ups opened from these circles.

---

## 2. The 4-Circle Offer Row

### 2a. Layout

- Exactly **4 circles** displayed in a single horizontal row, always visible in the Today tab (below the greeting / habits section, above the habit list).
- Each circle is the **same size** — the row determines their diameter (fill the row with equal spacing, similar to the bank/currency button style already used elsewhere).
- Each circle has:
  - A **type icon** (see types below)
  - A **timer badge** (countdown, e.g. "2h 14m") overlaid at the bottom, or a "✓ Done" state overlay
  - A **label** below the circle (short, 1–2 words)

### 2b. Offer types

| ID | Label | Icon | Timer source | Notes |
|---|---|---|---|---|
| `island_run` | Island Run | 🏝️ | Island countdown timer | Opens Island Run |
| `vision_star` | Vision Star | 🌟 | Vision Star claim window timer | Opens Vision Star pop-up |
| `daily_treat` | Daily Treat | 🎁 | Resets daily at midnight UTC | Opens Calendar pop-up |
| `egg_hatch` | Egg Ready | 🥚 | None (permanent while ready) | Opens egg hatchery directly; only shown when egg is ready to collect. Sorted above `todays_offer`. Red badge clears once the circle is opened for today on the current island. |
| `todays_offer` | Today's Offer | 🛍️ | None (permanent) | Opens checkout |
| `mystery_stop` | Mystery | 🎭 | None (permanent until claimed) | Opens the mystery stop modal; only shown if one is available |

> Note: `lucky_roll`, `spin_wheel`, and `boss_challenge` are not implemented as Today-tab
> circles. The boss stop is accessed from the Island Run board directly.

### 2c. Queue logic

- The row always shows **exactly 4** circles.
- Items populate the row from the **active/uncollected** pool.
- If more than 4 active items exist simultaneously, only the first 4 are shown (by expiry: soonest first, then by `sortPriority` ascending).
- **Queue shift:** When an item expires (not when it's collected), it leaves the row and the next item in the queue enters.
- **If fewer than 4 items are available** (all collected or all shown): remaining circles show placeholder "Waiting ⏳" items. The row never shrinks below 4.

### 2d. egg_hatch freshness and check-off rules

- The `egg_hatch` circle shows a **red notification badge** when the egg is ready AND the player has not yet opened the circle today on the current island.
- When the player taps the egg_hatch circle, the hatchery modal opens and the circle is **marked as seen** (via localStorage key `lifegoal:egg_hatch_viewed:{userId}:{date}:{islandNumber}`). The red badge disappears.
- Once seen, the circle's `sortPriority` drops so other unchecked circles take precedence.
- The circle can still be tapped after being seen (button is not disabled) but shows no red badge.
- The seen state resets automatically at midnight UTC, when the island number changes, or on a new day.

### 2e. Entry flow

- `egg_hatch`, `vision_star`, `island_run`, and `daily_treat` all open their content directly (no teaser modal).
- `mystery_stop` uses a teaser pop-up on first open; subsequent opens go directly to content.
- `todays_offer` opens a checkout modal.

---

## 3. Daily Treat Calendar — Moved Out of Game Overlay

The `CountdownCalendarModal` **is no longer surfaced inside the game overlay**. It is now accessed exclusively via the Today tab's offer circle (`daily_treat`).

Lucky Roll follows the same consistency principle in reverse: it is now treated as a **conditional reward surface**, so it should only appear in the Today tab when the player actually has Lucky Roll access.

The calendar remains the same component (`CountdownCalendarModal`). Only the entry point changes:
- **Old:** Game overlay → "Daily Hatch" button → `CountdownCalendarModal`
- **New:** Today tab → daily_treat circle → teaser pop-up → `CountdownCalendarModal`

The `onDailyHatchClick` handler in `GameBoardOverlay` should be updated to redirect to the today tab's daily_treat offer circle, or simply removed from the game overlay. The `showCalendarPlaceholder` state flag and its existing modal wiring can be reused from the new entry point.

---

## 4. Today Tab Layout (updated canonical order)

1. Greeting / status bar
2. **Time-Bound Offers Row** (4 circles — new)
3. Today's habits list (unchanged)
4. Quick-gains / energy section (unchanged)

---

## 5. Implementation Slices

| Slice | What gets built |
|---|---|
| T1A | `TimeBoundOfferRow` component: 4-circle row, circle component with icon/timer/collected state, queue logic. Static mock data. |
| T1B | Wire real data sources into queue: daily_treat (calendar open state), lucky_roll (heartsRemaining), spin_wheel (spinsRemaining), vision_star (timer from VisionStarSpecial service). |
| T1C | Two-layer pop-up flow: teaser bottom-sheet component + session-skip logic (direct to Layer 2 on second open). |
| T1D | Remove daily hatch from game overlay; redirect to today tab daily_treat circle. |
| T1E | Wire boss/egg_hatch/mystery_stop circles dynamically from island run state. |
