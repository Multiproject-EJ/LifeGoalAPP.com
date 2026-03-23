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
| `vision_star` | Vision Star | 🌟 | Vision Star claim window timer | Opens Vision Star pop-up |
| `daily_treat` | Daily Treat | 🎁 | Resets daily at midnight UTC | Opens Calendar pop-up (moved here from game overlay) |
| `lucky_roll` | Lucky Roll | 🎲 | Only while unlocked / monthly free window is active | Opens Lucky Roll |
| `spin_wheel` | Spin Wheel | 🎡 | Only while a spin is still available | Opens Spin Wheel |
| `boss_challenge` | Boss | ⚔️ | None (permanent until completed) | Opens island run boss modal; only shown if boss is available |
| `egg_hatch` | Egg Ready | 🥚 | None (permanent) | Opens egg hatchery pop-up; only shown if egg is hatched/ready |
| `mystery_stop` | Mystery | 🎭 | None (permanent until claimed) | Opens the mystery stop modal; only shown if one is available |

### 2c. Queue logic

- The row always shows **exactly 4** circles.
- Items populate the row from the **active/uncollected** pool.
- If more than 4 active items exist simultaneously, only the first 4 (by expiry: soonest first) are shown. The rest wait in queue.
- **Queue shift:** When an item expires (not when it's collected), it leaves the row and the next item in the queue enters.
- **Lucky Roll / Spin Wheel special rule:** These are only shown while actionable. When not currently available, they should be hidden instead of lingering as permanent “done” fixtures.
- **If fewer than 4 items are available** (all collected or all shown): remaining circles show the most recently collected items in "collected" state. The row never shrinks below 4 — it always shows 4 circles.
- Items **never disappear from the row until they expire** — collected items remain visible as "done" until expiry, then drop off.

### 2d. Entry flow: every item opens a pop-up

All items now open a **two-layer pop-up flow**:

**Layer 1 — Teaser pop-up:**
- Small bottom sheet or card pop-up
- Shows the item's icon, title, brief description, timer countdown
- CTA button: e.g. "Open Vision Star →" or "Claim Daily Treat →"
- Tapping the CTA opens Layer 2

**Layer 2 — Content pop-up:**
- The full content experience (what used to be inline in the today tab, or the full modal)
- For Vision Star: the image + star claim UI (existing VisionStarSpecial content)
- For Daily Treat: the full CountdownCalendar modal (moved here)
- For Lucky Roll: opens Lucky Roll
- For Spin Wheel: opens Spin Wheel
- All other types: their respective modals

> **UX note:** The teaser pop-up can be skipped if the user has already seen it for that session — opening the same circle a second time in the same session goes directly to Layer 2.

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
