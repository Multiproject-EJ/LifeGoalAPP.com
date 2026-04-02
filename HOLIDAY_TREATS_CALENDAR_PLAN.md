# Holiday Treats Calendar — Living Dev Plan v2.0

> **Purpose:** Living design & engineering plan for the Holiday Treats Calendar feature.
> **Replaces:** v1 plan (initial concept through Phase 4 backend completion).
> **Last updated:** 2026-04-02
> **Owner:** Product + Engineering

---

## Vision

The Holiday Treats Calendar is the app's **primary daily engagement engine** — a holiday-specific advent/countdown calendar that lives inside the Daily Treats section and is always accessible as one of the 4 circular offer cards in the Today tab's Time-Bound Offers row.

**Core loop:**
> Open the app → see today's calendar door → tap to reveal → optional habit bonus door → collect reward → come back tomorrow.

**What makes it work:**
1. **Daily anticipation** — one door per day, unknown reward, always something new
2. **Variable rewards** — most days are small or empty (build-up), a few are genuinely exciting
3. **Completion arc** — short or long, you're always building toward the final door
4. **Habit reinforcement** — a second bonus door rewards users who completed a habit that day
5. **Always-on** — when no holiday is active, the Personal Quest Calendar fills the gap so the feature is never dark

---

## Calendar Types

### 1. Holiday Calendars
Tied to the user's **Holiday Preferences** (Settings → Holiday Preferences). Only enabled holidays show a calendar.

### 2. Personal Quest Calendar 🧭
The **always-on fallback**. When `getActiveAdventMeta()` returns `null` (no holiday countdown is currently running), the Personal Quest Calendar activates automatically. It is never "off". Types:

| Variant | Doors | Trigger |
|---|---|---|
| **Weekly Sprint** | 7 | Auto-generated every Monday; theme based on user's most-active life area |
| **14-Day Challenge** | 14 | User picks a focus area (Focus Reset, Body Builder, Mind Month, etc.) |
| **Birthday Calendar** 🎂 | 7 | Activates in the 7 days before the user's birthday (if set in profile); final door = guaranteed 1 💎 Diamond |

### 3. Future: Special Event Calendars
Admin-seeded short calendars for app milestones, new feature launches, or seasonal events outside the main holiday list. Uses `season_type = 'special_event'`.

---

## Supported Holidays

| `holiday_key` | Theme name | Doors | Countdown window | Notes |
|---|---|---|---|---|
| `christmas` | Christmas Advent | **25** | Dec 1 → Dec 25 | Gold standard — keep as-is |
| `new_year` | New Year Countdown | **7** | Dec 26 → Jan 1 | Tight and exciting |
| `valentines_day` | Valentine's Countdown | **5** | Feb 10 → Feb 14 | Extended from 3 for more build-up |
| `easter` | Easter Countdown | **8** | Palm Sunday → Easter Sunday | Movable; always Holy Week (8 days) |
| `eid_mubarak` | Eid Mubarak Countdown | **3** | 3 days of Eid al-Fitr | Lunar, movable; seed exact date per year |
| `halloween` | Halloween Countdown | **7** | Oct 25 → Oct 31 | Cut from 31 — final week only |
| `thanksgiving` | Thanksgiving Countdown | **4** | Mon → Thu of Thanksgiving week | Cut from 28 — just the week |
| `hanukkah` | Hanukkah Countdown | **8** | Night 1 → Night 8 | Exactly right — 8 nights |
| `st_patricks_day` | St. Patrick's Day Countdown | **3** | Mar 15 → Mar 17 | Minor holiday, 3 days |

> **Design rule:** Windows over ~10 days require an exceptionally compelling reason. Anticipation peaks in the final week. Anything longer must earn its length through reward design (Christmas is the only justified 25-door calendar).

> **Movable feasts:** Easter, Eid Mubarak, and Thanksgiving have variable dates each year. The `ADVENT_META` config uses approximate demo windows; production `daily_calendar_seasons` rows must be seeded with exact dates per year.

### Emoji Palettes

| `holiday_key` | Emojis |
|---|---|
| `christmas` | 🎄 ⭐ 🎁 🦌 🔔 ❄️ 🕯️ 🍪 🧦 ☃️ |
| `new_year` | 🎉 🥂 🎆 🎊 ⭐ ✨ 🎇 🕛 🥳 🌟 |
| `valentines_day` | 💘 ❤️ 🌹 💌 💝 🍫 💕 ✨ 🎀 💗 |
| `easter` | 🐣 🌸 🥚 🐰 🌷 🦋 🌼 🍀 ✨ 🌈 |
| `eid_mubarak` | 🌙 🕌 ✨ 🤲 ⭐ 🕯️ 🌟 💛 🎉 🪔 |
| `halloween` | 🎃 👻 🕷️ 🦇 🕯️ 💀 🕸️ 🍬 🧙 🌙 |
| `thanksgiving` | 🦃 🍂 🌽 🥧 🍁 🌾 🥕 🙏 🍎 🍠 |
| `hanukkah` | 🕎 ✡️ 🕯️ 💙 ⭐ 🎁 🪙 🥞 🌟 ✨ |
| `st_patricks_day` | ☘️ 🍀 🌈 🟢 🎩 🪙 🍺 ✨ 🌿 ⭐ |

---

## Reveal Mechanics (Three Types, Used Creatively)

Rather than every door using the same interaction, three mechanics are assigned strategically to create variety and an escalating sense of occasion.

### 🃏 Mechanic A — Card Flip
**Used for:** Standard daily doors on most calendars.
- Door face shows: holiday emoji + day number
- Tap → 3D CSS flip animation (front = door, back = reward card)
- Fast, satisfying, premium-feeling
- Default mechanic

### ✋ Mechanic B — Physical Scratch
**Used for:** The **final door** of every calendar (the holiday date itself), and occasional **bonus doors**.
- Canvas scratch overlay — but the destination beneath is a fully designed reward card, not plain text
- On reveal: confetti burst (CSS) for Tier 2+, full-screen diamond flash for Tier 5
- Keeps the scratch mechanic alive but reserved for special moments

### 📦 Mechanic C — Unwrap / Envelope
**Used for:** Gift-wrapped holidays (Christmas, Valentine's, Birthday) and **symbol collection bonus rewards**.
- Door shown as a wrapped gift or sealed envelope
- Tap → ribbon dissolves / envelope unfolds (CSS animation) → reward card slides up
- Best for occasions where the *presentation* of the gift matters as much as the contents

### Mechanic Assignment by Calendar

| Calendar | Standard doors | Final door | Symbol bonus reward |
|---|---|---|---|
| 🎄 Christmas | Card Flip | **Scratch** | Unwrap |
| 🎉 New Year | Card Flip | **Scratch** | Scratch |
| 💘 Valentine's | Card Flip | **Unwrap** | Unwrap |
| 🐣 Easter | Unwrap | **Scratch** | Card Flip |
| 🌙 Eid Mubarak | Unwrap | **Unwrap** | Unwrap |
| 🎃 Halloween | Card Flip | **Scratch** | Scratch |
| 🦃 Thanksgiving | Card Flip | **Unwrap** | Card Flip |
| 🕎 Hanukkah | Card Flip | **Unwrap** | Unwrap |
| ☘️ St. Patrick's | Card Flip | **Scratch** | Card Flip |
| 🧭 Personal Quest | Card Flip | **Scratch** | Unwrap |

---

## Reward Structure

**Principle:** Only two currencies. Clean, clear, desirable.
- 🪙 **Gold** — primary currency (50–900 per door)
- 💎 **Diamond** — premium currency (1 💎 = 1,000 🪙); max 1–3 per calendar, final door only

### Reward Tiers

| Tier | Type | Gold/Diamond | Frequency | Animation |
|---|---|---|---|---|
| **Type 1** | Empty — build-up | None | ~40% of doors (longer calendars only) | Standard reveal; holiday-flavoured "nothing" copy |
| **Type 2** | Small Gold | 50–150 🪙 | ~35% of doors | Standard reveal |
| **Type 3** | Medium Gold | 200–500 🪙 | ~20% of doors | Shimmer on reward card |
| **Type 4** | Large Gold | 600–900 🪙 | ~4% of doors (penultimate door) | Confetti burst (CSS) |
| **Type 5** | Diamond | 1–3 💎 | Final door only, all calendars | Full-screen flash + diamond rain (CSS) |

**Rules for empty doors (Type 1):**
- Never used on short calendars (≤5 doors)
- Never on the last 3 doors of any calendar
- Never 2 empty days in a row
- The reveal animation still plays in full — the absence of a reward is discovered, not telegraphed
- Empty door copy is holiday-flavoured: *"The elves are saving the good stuff for later 🎄"* / *"Boo! Nothing here... yet 🎃"*

### Reward Schedule by Calendar Length

**Short (3–5 doors):** Valentine's, Eid, St. Patrick's, Thanksgiving
```
Day 1:          Small Gold (Type 2)
Day 2:          Medium Gold (Type 3)
Day N-1:        Large Gold (Type 4)          [only if ≥4 doors]
Day N (final):  💎 1 Diamond (Type 5)       [Scratch mechanic]
```

**Medium (7–9 doors):** New Year, Halloween, Easter, Hanukkah
```
~30% empty, ~30% small gold, ~25% medium gold, 1× large gold (penultimate), 1× diamond (final)
Example 7-door: Empty, Small, Empty, Medium, Small, Large, 💎Diamond
```

**Long (25 doors):** Christmas only
```
Days 1–10:   ~50% empty, small gold, 1× medium gold
Days 11–20:  ~30% empty, small/medium gold, 1× more medium gold
Days 21–23:  2× medium gold, 1× large gold
Day 24:      Large Gold (penultimate — second-best reward)
Day 25:      💎 2–3 Diamonds (Christmas! — the big reveal) [Scratch mechanic]
```
### The Reward Card (Beneath Scratch / Flip / Unwrap)

Every door opens to a designed reward card component, not plain text:
```
┌─────────────────────────────────┐
│  ✦✦  UNCOMMON  ✦✦               │  ← rarity badge (colour-coded)
│                                 │
│         🪙                      │  ← large central icon
│      250 Gold                   │  ← reward label
│                                 │
│  "The Christmas spirit rewards  │  ← holiday flavour text
│   the dedicated. 🎄"            │
│                                 │
│       [ Claim Reward ]          │  ← button (dismisses + awards)
└─────────────────────────────────┘
```

Rarity colours:
- Type 1 (Empty): grey — `✦ Common` — *"Nothing today"*
- Type 2 (Small Gold): soft blue — `✦ Common`
- Type 3 (Medium Gold): green — `✦✦ Uncommon`
- Type 4 (Large Gold): orange — `✦✦✦ Rare`
- Type 5 (Diamond): purple/gold shimmer — `💎 Legendary`

---

## Symbol Meta-Game (Bonus Layer)

Each door also awards a **seasonal symbol** (visual collection mechanic, always free, no currency cost to participate).

- Collect **3 of the same symbol** → trigger a **bonus gold reward** (100–200 🪙), awarded immediately via `awardDailyTreatGold()`
- Collect **the complete set** of all unique symbols for the season → unlock a **season badge** (cosmetic only, no currency value)
- This is **entirely bonus** — it does not replace door rewards, it layers on top
- The existing symbol tracker UI in `CountdownCalendarModal` remains; it must be wired to actually fire the gold bonus (currently it computes `symbolReward` but never dispatches it — see Bug #4)

---

## The Two-Door System (Habit Gate)

Each day has one **free door** and one **bonus door**. This is the key engagement lever.
```
FREE DOOR (always available — no conditions)
  → Any time of day, no habit required
  → Always Type 1 (empty) or Type 2 (small gold)
  → Card Flip mechanic
  → Visually: standard door

BONUS DOOR 🎁 (habit-gated)
  → Unlocked when user completes ≥1 habit today
  → Always Type 3–5 (medium gold, large gold, or diamond on final day)
  → Scratch or Unwrap mechanic
  → Visually: warm gold glow + 🎁 lock icon until unlocked, then pulses
  → Copy when locked: "Complete a habit to unlock your bonus treat 🎁"
  → Copy when unlocked: "Your bonus treat is ready! ✨"
```
**Why this works:**
- Users who open the app and do nothing still get *something* (retention preserved)
- Users who complete habits get a meaningfully better reward (behaviour reinforced)
- No user is ever blocked or frustrated — the free door is always available
- The bonus door makes habit completion feel immediately rewarding

### Optional Journal / Check-in Doors
On specific days of **longer calendars** (max 2–3 times per 25-door season, never on consecutive days), a bonus door can require a journal entry or mood check-in instead of a habit:
- Clearly marked in advance with a 📓 or ✅ icon on the door
- Reward is always Type 4 (Large Gold) or Type 5 (Diamond)
- Never mandatory to advance the calendar — the free door always counts for progression
- Copy: *"Write today's journal entry to unlock this special reward 📓"*

---

## Visual Design

### Door Grid States

| State | Visual |
|---|---|
| **Locked** (future) | Desaturated, 🔒, reduced opacity — visible but clearly unreachable |
| **Available** (past, not yet opened) | Full colour, holiday emoji, subtle shimmer — openable |
| **Today** (free door) | Pulsing ring in holiday accent colour — the primary CTA |
| **Today** (bonus door) | Warm gold glow + 🎁 icon if locked; full pulse if habit done |
| **Missed** (past, never opened) | Greyed out with a soft ✗ — not clickable, clearly skipped |
| **Opened** (revealed) | Flat, muted, checkmark overlay — memory of what was found |

Door cards have: raised card aesthetic (box-shadow + slight gradient on face), visible hinge/number, holiday emoji on face.

### Holiday Background in the Calendar Dialog

All holidays have intro background images at `/Holiday Themes/Bg/`. These **must** also apply inside the calendar dialog itself (currently only Halloween has a `calendarBackgroundUrl`). Update `holidayThemeAssets.ts` to set `calendarBackgroundUrl` for all holidays. The existing gradient overlay (`linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.88))`) handles readability.

### Ambient CSS Animations (no external library)

| Holiday | Animation |
|---|---|
| 🎄 Christmas | Slow-falling snow particles (CSS keyframe circles, 3–5 elements) |
| 🎃 Halloween | Slow bat silhouettes drifting left-to-right |
| 💘 Valentine's | Floating heart particles |
| 🎉 New Year | Subtle sparkle / star twinkle |
| 🐣 Easter | Gentle floating petal/flower drift |
| All others | Static — keep it clean |

### Scratch Layer Theming
The canvas scratch surface in `ScratchCardReveal` currently uses a plain blue gradient. The scratch layer colour should match the holiday's accent colour (passed as a prop from `CountdownCalendarModal`).

---

## Data Model

### Supabase Tables (migrations 0135, 0177, + new migration needed)

| Table | Purpose |
|---|---|
| `daily_calendar_seasons` | One row per season; `holiday_key` links to holiday prefs; new `season_type` column |
| `daily_calendar_hatches` | Per-day reward definitions; new `door_type`, `reward_currency`, `reward_amount` columns |
| `daily_calendar_progress` | Per-user open state within a season |
| `daily_calendar_rewards` | Immutable audit trail of claimed rewards |

**New columns needed (migration):**

`daily_calendar_seasons`:
```sql
season_type   text NOT NULL DEFAULT 'holiday'
  -- 'holiday' | 'personal_quest' | 'birthday' | 'special_event'
user_id_owner uuid REFERENCES auth.users(id) ON DELETE CASCADE
  -- NULL = admin-seeded holiday; set = personal/birthday calendar
```

`daily_calendar_hatches`:
```sql
door_type        text NOT NULL DEFAULT 'free'
  -- 'free' | 'bonus'
reward_currency  text
  -- 'gold' | 'diamond' | NULL (empty door)
reward_amount    integer
  -- gold amount, or number of diamonds; NULL for empty doors
reward_tier      integer
  -- 1=empty, 2=small_gold, 3=medium_gold, 4=large_gold, 5=diamond
reveal_mechanic  text NOT NULL DEFAULT 'flip'
  -- 'flip' | 'scratch' | 'unwrap'
```

### RLS (unchanged)
- `daily_calendar_seasons` / `daily_calendar_hatches`: read-only for authenticated users (admin-seeded rows); users can read their own personal rows
- `daily_calendar_progress`: users CRUD only their own rows
- `daily_calendar_rewards`: users read/insert only their own rows (immutable)

---

## Backend — Edge Function

`supabase/functions/treat-calendar/index.ts`

| Endpoint | Method | Purpose |
|---|---|---|
| `/treat-calendar?holiday_key=...` | GET | Returns season + hatches + user progress for a holiday |
| `/treat-calendar?season_type=personal_quest` | GET | Returns active personal quest season for the user |
| `/treat-calendar/open` | POST | Opens a hatch; validates day + door_type, records reward |

**POST body:** `{ season_id: string, day_index: number, door_type: 'free' | 'bonus' }`
**Validation:**
- `day_index` must equal server-computed today index (server is source of truth — never trust client date)
- Duplicate opens for same `(season_id, day_index, door_type)` are rejected (409)
- Bonus door open requires server-side verification that user completed ≥1 habit today (query `habit_logs_v2` for today's date)

---

## Client Service (`src/services/treatCalendarService.ts`)

| Export | Purpose |
|---|---|
| `fetchCurrentSeason(userId, holidayKey?)` | Active season + hatches + progress; falls back to personal quest if no holiday active |
| `fetchUserProgress(userId, seasonId)` | Progress for a given season |
| `openTodayHatch(userId, seasonId, dayIndex, doorType)` | Claim a door; demo or edge function; returns `{ reward_currency, reward_amount, reward_tier }` |
| `getActiveAdventMeta(enabledHolidays?)` | Returns active holiday window or `null` |
| `getPersonalQuestSeason(userId)` | Returns or generates the current personal quest season |
| `isHabitCompletedToday(userId)` | Returns boolean — used to gate the bonus door UI |
| `HolidayKey` type | Union of all supported holiday_key strings |
| `ADVENT_META[]` | Static config: theme, corrected date ranges, emoji palettes |

**Server is source of truth for day index.** The client must not use `new Date().getDate()` or `computeTodayDayIndex()` to decide which day to open. The server's `today_day_index` from `fetchCurrentSeason()` response is the only valid value.

---

## Bug Fixes Required (Pre-Requisite for All New Work)

These must be resolved before building any new feature. All existing behaviour is unreliable until these are fixed.

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| **1** | State lives in localStorage for real users | `canUseSupabaseData()` returns false for many users, silently forcing demo path | Audit `canUseSupabaseData()` — ensure authenticated users always hit the Supabase edge function |
| **2** | Timezone / midnight mismatch | `getLocalDateKey(new Date())` uses client local time; server computes `today_day_index` independently — they can disagree near midnight | Use server's `today_day_index` as the only source of truth; remove client-side day computation from gating logic |
| **3** | Past "available" doors rendered as buttons but silently fail | `revealScratchCardForDay` returns `null` if `targetDay > state.dayInCycle`; the UI still renders them as tappable | Add explicit `missed` state to the door grid for past days the user did not open; they are not clickable |
| **4** | Symbol tracker never triggers rewards | `symbolReward` is computed in `scratchCard.ts` but nothing calls `awardDailyTreatGold()` on symbol completion | Wire `symbolReward` result to dispatch the gold bonus immediately after reveal |
| **5** | Scratch layer has no holiday theming | `drawScratchLayer()` creates a static blue gradient regardless of holiday | Accept holiday accent colour as a prop; use it to tint the scratch surface |
| **6** | `dayInCycle` is calendar-month-based, not advent-window-based | `syncScratchCardState` sets `dayInCycle = today.getDate()` (day of calendar month); advent windows are shorter than a month | Replace with server's `today_day_index` once the Supabase path is fixed |

---

## Implementation Phases

### 🔴 Phase A — Foundation Fixes
*Must ship first. Nothing else builds cleanly on top of current bugs.*

- [ ] Fix `canUseSupabaseData()` so authenticated users always hit the server path
- [ ] Use server `today_day_index` as the only gating source; remove `computeTodayDayIndex()` from client gating logic
- [ ] Add `missed` door state to the grid UI for past unopened doors (greyed out, not clickable)
- [ ] Wire `symbolReward` → `awardDailyTreatGold()` so symbol collection bonuses actually pay out
- [ ] Scratch layer colour accepts holiday accent prop; passes holiday key down from modal

### 🟡 Phase B — Corrected Windows + Personal Quest Calendar
*Makes the feature always-on and fixes the too-long countdowns.*

- [ ] Update `ADVENT_META` in `treatCalendarService.ts` with corrected windows per spec above (Halloween 7 days, Easter 8 days, Thanksgiving 4 days, Valentine's 5 days, St. Patrick's 3 days, Eid 3 days)
- [ ] Add migration: `season_type`, `user_id_owner` columns on `daily_calendar_seasons`
- [ ] Build `getPersonalQuestSeason(userId)` service — generates/returns a 7-day personal quest season
- [ ] Wire fallback in `CountdownCalendarModal`: when `getActiveAdventMeta()` returns `null`, load personal quest season instead of showing empty state
- [ ] Personal Quest Calendar: 7-door weekly sprint, auto-themed to user's most-active life area

### 🟠 Phase C — Two-Door System + Habit Gate
*The core engagement mechanic.*

- [ ] Add migration: `door_type`, `reward_currency`, `reward_amount`, `reward_tier`, `reveal_mechanic` columns on `daily_calendar_hatches`
- [ ] Build `isHabitCompletedToday(userId)` — query `habit_logs_v2` for today's completions
- [ ] Update `buildDemoSeasonData()` to generate two doors per day (free + bonus) with correct reward tiers
- [ ] Update `CountdownCalendarModal` to render two-door layout: free door always openable, bonus door shows lock/unlock state
- [ ] Update edge function `/treat-calendar/open` to accept `door_type` and validate habit completion server-side for bonus doors
- [ ] Visual: bonus door pulsing gold glow when unlocked; 🎁 lock icon when not yet unlocked

### 🟢 Phase D — Reward Structure + Economy Wiring
*Ties the calendar to the real app economy.*

- [ ] Rewrite `buildDemoSeasonData()` reward generation using Type 1–5 tiers per the schedule above
- [ ] Remove XP as a calendar reward type entirely — only `gold` and `diamond`
- [ ] Wire diamond awards through `splitGoldBalance()` / `GOLD_PER_DIAMOND` from `src/constants/economy.ts`
- [ ] Build `RewardCard` component: rarity badge, large central icon, reward label, holiday flavour text, Claim button
- [ ] Replace inline reward text in `ScratchCardReveal.tsx` with `RewardCard`
- [ ] Flavour text bank: 3–5 lines per holiday, selected by reward tier

### 🔵 Phase E — Three Reveal Mechanics
*The signature interaction layer.*

- [ ] Build `CalendarDoorFlip.tsx` — CSS 3D card flip (front = door, back = `RewardCard`); no external library
- [ ] Build `CalendarDoorUnwrap.tsx` — CSS envelope/gift unwrap animation; slides reveal `RewardCard`
- [ ] Refactor `ScratchCardReveal.tsx` — destination beneath scratch is now `RewardCard`, not plain text
- [ ] `CountdownCalendarModal` selects mechanic per door: read `reveal_mechanic` from hatch data; default `flip` for standard, `scratch` for final, `unwrap` for bonus/symbol
- [ ] Confetti burst (CSS keyframes) for Type 4 rewards on reveal
- [ ] Diamond rain + full-screen flash (CSS) for Type 5 / Diamond rewards on reveal

### 🟣 Phase F — Visual Polish
*Makes the feature feel alive and premium.*

- [ ] Update `holidayThemeAssets.ts`: set `calendarBackgroundUrl` for all holidays (use the existing `/Holiday Themes/Bg/` images)
- [ ] Wire `calendarBackgroundUrl` into `CountdownCalendarModal` dialog panel (currently only Halloween is wired)
- [ ] CSS ambient animations: Christmas snow, Halloween bats, Valentine's hearts, New Year sparkle, Easter petals
- [ ] Door grid: raised card style (box-shadow, gradient face), opened/missed visual states, glow on today's doors
- [ ] Birthday Calendar (🎂 variant of Personal Quest): themed for user's birthday week; final door guaranteed 1 💎

### ⚪ Phase G — QA + Launch
- [ ] Timezone + DST boundary testing (server `today_day_index` as truth should eliminate most issues)
- [ ] Accessibility audit: keyboard navigation, ARIA labels on all door states, contrast ratios
- [ ] Performance: canvas scratch on low-end mobile, CSS animation frame rate
- [ ] Demo parity: all new features work correctly in demo/unauthenticated mode
- [ ] Release checklist + monitoring (calendar open rate, bonus door unlock rate, final door completion rate)

---

## Non-Goals (v2)

- Real-money purchases or gambling mechanics (ever)
- Catch-up mechanic for missed days — if you missed it, it is marked as `missed` and that is final
- Multiplayer competition or leaderboards tied to calendar rewards
- Admin UI for creating/editing seasons (manual SQL for now; future phase)
- More than 3 diamonds as a reward on any single door

---

## Decision Log

- **2026-04-02**: Full redesign (v2). Corrected countdown windows (Halloween 7d, Easter 8d, etc.). Replaced generic monthly scratch card with three reveal mechanics (flip/scratch/unwrap) assigned per calendar. Introduced Two-Door System (free + habit-gated bonus). Simplified rewards to Gold + Diamond only (removed XP/shards/cosmetics). Added Personal Quest Calendar as always-on fallback. Added `season_type` + `door_type` + `reward_tier` + `reveal_mechanic` to data model. Documented 6 pre-existing bugs as mandatory Phase A fixes.
- **2026-03-08**: Pivoted from generic monthly rolling calendar to holiday-specific advent countdown. Each season tied to `holiday_key` from Holiday Preferences settings.
- **2026-02-04**: Added themed monthly styling based on cycle index.
- **2026-02-03**: Added month-end rollover callout once the final hatch is opened.
- **2026-01-29**: Synced calendar hatches to local month/day cadence with missed-day states.
- **2025-01-01**: Initial plan drafted as monthly scratch-card calendar.

---

## Changelog

- **2026-04-02**: v2 redesign. See Decision Log above.
- **2026-03-08**: Fully wired UI to holiday data. Redesigned as holiday-specific advent calendar. Added `holiday_key` column (migration 0177). Consolidated old plan docs into this file.
- **2026-02-04**: Themed monthly styling added.
- **2026-02-01**: Scratch-card reveal canvas added.
- **2026-01-29**: Reward reveal status messaging and daily open gating.
- **2026-01-28**: Persisted scratch-card progress helpers.
- **2025-01-01**: Initial plan + RNG utilities + weighted symbol picker.