# Holiday Treats Calendar — Living Dev Plan v2.0

> **Purpose:** Living design & engineering plan for the Holiday Treats Calendar feature.
> **Replaces:** v1 plan (initial concept through Phase 4 backend completion).
> **Last updated:** 2026-04-03
> **Owner:** Product + Engineering

---

## Vision

The Holiday Treats Calendar is the app's **primary daily engagement engine** — a holiday-specific advent/countdown calendar that lives inside the Daily Treats section and is always accessible as the daily check-in anchor point.

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

> **Design rule:** Windows over ~10 days require an exceptionally compelling reason. Anticipation peaks in the final week. Anything longer must earn its length through reward design (Christmas is the only justified exception at 25 doors).

> **Movable feasts:** Easter, Eid Mubarak, and Thanksgiving have variable dates each year. The `ADVENT_META` config uses approximate demo windows; production `daily_calendar_seasons` rows must be seeded with correct dates each year.

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
- The existing symbol tracker UI in `CountdownCalendarModal` remains; it must be wired to actually fire the gold bonus (currently it computes `symbolReward` but never dispatches it — see Bug #4 below)

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

All holidays have intro background images at `/Holiday Themes/Bg/`. These **must** also apply inside the calendar dialog itself (currently only Halloween has a `calendarBackgroundUrl`). Update `holidayThemeAssets.ts` — all 9 holidays need a `calendarBackgroundUrl` entry pointing to their respective background image.

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
The canvas scratch surface in `ScratchCardReveal` currently uses a plain blue gradient. The scratch layer colour should match the holiday's accent colour (passed as a prop from `CountdownCalendarModal` down through the reveal mechanic component).

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

## ⚡ Current Implementation Status (as of 2026-04-03)

> This section records exactly what was shipped in PR #1555 and what remains outstanding. Use this as the handoff brief for any agent session picking up this work.

### ✅ What was shipped in PR #1555 (merged 2026-04-03)

**New files created:**
- `src/components/CalendarDoorFlip.tsx` — CSS 3D card-flip reveal mechanic
- `src/components/CalendarDoorScratch.tsx` — canvas scratch card with confetti burst; holiday-coloured gradient surface via `getHolidayGradient()`
- `src/components/CalendarDoorUnwrap.tsx` — CSS gift/envelope unwrap animation
- `src/components/RewardCard.tsx` — rarity badge + holiday-flavoured copy + Claim button, used as the destination card inside all three reveal mechanics

**Modified files:**
- `src/components/CountdownCalendarModal.tsx` — major overhaul: reads `CalendarSeasonData`, uses `today_day_index` from server, renders `missed` door state, two-door layout, routes to correct reveal mechanic per hatch, Personal Quest fallback when no holiday active
- `src/services/treatCalendarService.ts` — added `computeDoorStatus()`, `getHatchesForDay()`, `isHabitCompletedToday()` (queries `habit_logs_v2`), `openTodayHatch()` with `door_type`, `REWARD_TIER_INFO`, `getEmptyDoorFlavour()`, full `CalendarSeasonData` / `CalendarHatch` / `DoorType` / `DoorStatus` types
- `src/assets/holidayThemeAssets.ts` — `accentColor` + `secondaryColor` added for all holidays; all `calendarBackgroundUrl` entries now filled in (was only Halloween before)
- `src/index.css` — ~512 lines added for `RewardCard`, `DoorFlip`, `DoorScratch`, `DoorUnwrap`, bonus door states, missed door state, Personal Quest theme

**Bug fixes landed:**
- ✅ Bug 2 — `todayIndex` now sourced from server `today_day_index`; client no longer re-derives it
- ✅ Bug 3 — `missed` door state: `computeDoorStatus()` returns `'missed'`, rendered as non-clickable `<div>` with `✗` icon
- ✅ Bug 5 — Scratch layer is now holiday-coloured via `getHolidayGradient()` in `CalendarDoorScratch.tsx`

---

### ❌ What is still missing — MUST be done before the feature is production-ready

#### 🔴 BLOCKER 1 — `canUseSupabaseData()` is synchronous; real authenticated users fall to demo mode

**File:** `src/lib/supabaseClient.ts`

**Root cause:** `canUseSupabaseData()` checks `activeSession` which is set by `setSupabaseSession()`. If the Supabase auth state restore is async (which it is — `supabase.auth.getSession()` is a Promise), `activeSession` can still be `null` at the moment `treatCalendarService.ts` checks it, silently routing real users to the demo/localStorage path.

**Required fix:**

Add `canUseSupabaseDataAsync()` to `src/lib/supabaseClient.ts`:
```typescript
export async function canUseSupabaseDataAsync(): Promise<boolean> {
  if (!hasSupabaseCredentials()) return false;
  // If we already have a confirmed active session, fast-path
  if (activeSession) return true;
  // Otherwise await the client's own session check
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      activeSession = data.session; // cache it
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
```
Then in `src/services/treatCalendarService.ts`, replace every call to `canUseSupabaseData()` with `await canUseSupabaseDataAsync()`. The affected functions are:
- `fetchCurrentSeason()`
- `fetchUserProgress()`
- `openTodayHatch()`
- `isHabitCompletedToday()` (already async, just needs the import swap)

Also update imports in `treatCalendarService.ts`:
```typescript
import { canUseSupabaseDataAsync, getSupabaseClient } from '../lib/supabaseClient';
```

**Impact:** Without this fix, every authenticated user who opens the calendar before the session is confirmed in `activeSession` will see demo data and any reward claims will not persist to Supabase. This is the single highest-priority unresolved bug.

---

#### 🔴 BLOCKER 2 — Supabase migration missing for v2 columns

**Root cause:** PR #1555 built the full UI and service layer for the two-door system and reward tiers, but did **not** add a Supabase migration. The new columns (`door_type`, `reward_currency`, `reward_amount`, `reward_tier`, `reveal_mechanic` on `daily_calendar_hatches`; `season_type`, `user_id_owner` on `daily_calendar_seasons`) do not exist in the database. All production queries for these columns will silently return `null`.

**Required fix:**

Create `supabase/migrations/0178_calendar_v2_columns.sql` with:
```sql
-- Migration 0178: Holiday Treats Calendar v2 columns
-- Adds two-door system, reward tiers, reveal mechanics, and season type to calendar tables.

-- daily_calendar_seasons: season type + personal/birthday calendar owner
ALTER TABLE daily_calendar_seasons
  ADD COLUMN IF NOT EXISTS season_type   text NOT NULL DEFAULT 'holiday'
    CHECK (season_type IN ('holiday', 'personal_quest', 'birthday', 'special_event')),
  ADD COLUMN IF NOT EXISTS user_id_owner uuid REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN daily_calendar_seasons.season_type IS
  'holiday = admin-seeded holiday calendar; personal_quest = user weekly sprint; birthday = birthday week calendar; special_event = app milestone';
COMMENT ON COLUMN daily_calendar_seasons.user_id_owner IS
  'NULL for admin-seeded holiday seasons. Set to user id for personal_quest and birthday seasons.';

-- daily_calendar_hatches: two-door system + reward structure + reveal mechanic
ALTER TABLE daily_calendar_hatches
  ADD COLUMN IF NOT EXISTS door_type       text NOT NULL DEFAULT 'free'
    CHECK (door_type IN ('free', 'bonus')),
  ADD COLUMN IF NOT EXISTS reward_currency text
    CHECK (reward_currency IN ('gold', 'diamond') OR reward_currency IS NULL),
  ADD COLUMN IF NOT EXISTS reward_amount   integer,
  ADD COLUMN IF NOT EXISTS reward_tier     integer
    CHECK (reward_tier BETWEEN 1 AND 5 OR reward_tier IS NULL),
  ADD COLUMN IF NOT EXISTS reveal_mechanic text NOT NULL DEFAULT 'flip'
    CHECK (reveal_mechanic IN ('flip', 'scratch', 'unwrap'));

COMMENT ON COLUMN daily_calendar_hatches.door_type IS
  'free = always available; bonus = requires habit completion that day';
COMMENT ON COLUMN daily_calendar_hatches.reward_currency IS
  'gold | diamond | NULL (empty door / Type 1)';
COMMENT ON COLUMN daily_calendar_hatches.reward_amount IS
  'Gold coins (50–900) or diamond count (1–3). NULL for empty doors.';
COMMENT ON COLUMN daily_calendar_hatches.reward_tier IS
  '1=empty, 2=small_gold (50-150), 3=medium_gold (200-500), 4=large_gold (600-900), 5=diamond';
COMMENT ON COLUMN daily_calendar_hatches.reveal_mechanic IS
  'flip = CSS card flip; scratch = canvas scratch card; unwrap = gift/envelope CSS animation';

-- Unique constraint: one free door and one bonus door per (season, day)
ALTER TABLE daily_calendar_hatches
  DROP CONSTRAINT IF EXISTS daily_calendar_hatches_season_day_doortype_unique,
  ADD CONSTRAINT daily_calendar_hatches_season_day_doortype_unique
    UNIQUE (season_id, day_index, door_type);

-- RLS: personal quest seasons — users can read their own, admins can read all
-- (existing RLS policy for daily_calendar_seasons covers read for all authenticated users;
--  personal quest seasons with user_id_owner set should also be readable by their owner)
-- No RLS change needed if existing policy is: FOR SELECT TO authenticated USING (true)
-- If policy is more restrictive, add:
-- CREATE POLICY "users_read_own_personal_seasons" ON daily_calendar_seasons
--   FOR SELECT TO authenticated
--   USING (user_id_owner = auth.uid() OR user_id_owner IS NULL);
```

**Also update `database.types.ts`** to register the new columns for TypeScript strict typing. The types for `daily_calendar_seasons` and `daily_calendar_hatches` `Row`, `Insert`, and `Update` interfaces need the new fields.

---

#### 🔴 BLOCKER 3 — Edge function does not handle `door_type` or habit gate server-side

**File:** `supabase/functions/treat-calendar/index.ts`

**Root cause:** The edge function's `/open` endpoint was written before the two-door system. It only accepts `{ season_id, day_index }` and does not:
- Accept or validate `door_type`
- Check `habit_logs_v2` server-side before allowing a bonus door open
- Enforce the unique constraint on `(season_id, day_index, door_type)` at the application layer

**Required fix:**

Update the POST `/open` handler to:
```typescript
// Expected body shape (v2)
const body = await req.json() as {
  season_id: string;
  day_index: number;
  door_type: 'free' | 'bonus';
};

// 1. Validate door_type
if (!['free', 'bonus'].includes(body.door_type)) {
  return new Response(JSON.stringify({ error: 'Invalid door_type' }), { status: 400 });
}

// 2. For bonus doors: verify habit completion server-side
if (body.door_type === 'bonus') {
  const today = new Date().toISOString().split('T')[0]; // UTC date
  const { data: habitLogs, error: habitError } = await supabase
    .from('habit_logs_v2')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .limit(1);

  if (habitError || !habitLogs?.length) {
    return new Response(
      JSON.stringify({ error: 'Bonus door requires a completed habit today' }),
      { status: 403 }
    );
  }
}

// 3. Check for duplicate open (409)
const { data: existing } = await supabase
  .from('daily_calendar_progress')
  .select('id')
  .eq('season_id', body.season_id)
  .eq('day_index', body.day_index)
  .eq('door_type', body.door_type)   // <-- new: include door_type in dupe check
  .eq('user_id', userId)
  .single();

if (existing) {
  return new Response(JSON.stringify({ error: 'Already opened' }), { status: 409 });
}

// 4. Fetch the hatch for this day + door_type
const { data: hatch } = await supabase
  .from('daily_calendar_hatches')
  .select('*')
  .eq('season_id', body.season_id)
  .eq('day_index', body.day_index)
  .eq('door_type', body.door_type)  // <-- new
  .single();
```

Also update `daily_calendar_progress` insert to include `door_type`:
```typescript
await supabase.from('daily_calendar_progress').insert({
  season_id: body.season_id,
  day_index: body.day_index,
  door_type: body.door_type,   // <-- new
  user_id: userId,
  opened_at: new Date().toISOString(),
  reward_payload: hatch.reward_payload,
});
```

> **Note:** `daily_calendar_progress` may also need a `door_type` column added via migration if it doesn't already have one. Check the schema; add it to migration 0178 if missing.

---

#### 🟡 REMAINING — Phases B–F work that is not yet started

These items are correctly planned above but have zero implementation. Listed here for clarity so any agent session knows the full outstanding scope:

| Phase | Item | Status |
|---|---|---|
| **B** | Update `ADVENT_META` windows in `treatCalendarService.ts` to corrected lengths (Halloween 7d, Easter 8d, Thanksgiving 4d, Valentine's 5d, St. Patrick's 3d, Eid 3d) | ❌ Not done |
| **B** | `getPersonalQuestSeason(userId)` — generates/returns a 7-day weekly sprint season | ❌ Not done |
| **B** | Wire Personal Quest fallback in `CountdownCalendarModal` (empty state currently shown when no holiday active) | ❌ Not done |
| **D** | Rewrite `buildDemoSeasonData()` to use Type 1–5 reward tiers per schedule | ❌ Not done |
| **D** | Remove XP as a calendar reward type; only `gold` and `diamond` | ❌ Not done |
| **D** | Wire diamond awards through `splitGoldBalance()` / `GOLD_PER_DIAMOND` from `src/constants/economy.ts` | ❌ Not done |
| **D** | Flavour text bank: 3–5 lines per holiday per reward tier | ❌ Not done |
| **F** | CSS ambient animations (Christmas snow, Halloween bats, Valentine's hearts, New Year sparkle, Easter petals) | ❌ Not done |
| **F** | Door grid: raised card style (box-shadow, gradient face), full opened/missed visual states | ❌ Not done |
| **F** | Birthday Calendar variant (birthday week, final door guaranteed 1 💎) | ❌ Not done |
| **G** | Full QA: timezone/DST, accessibility audit, canvas performance, demo parity | ❌ Not done |

---

## Bug Fixes Required (original list, updated status)

| # | Bug | Root Cause | Fix | Status |
|---|---|---|---|---|
| **1** | State lives in localStorage for real users | `canUseSupabaseData()` is sync; returns false before async session resolves | Add `canUseSupabaseDataAsync()` to `supabaseClient.ts`; use it in all `treatCalendarService` functions | ❌ **Not fixed — see Blocker 1 above** |
| **2** | Timezone / midnight mismatch | `getLocalDateKey()` uses client time; server computes `today_day_index` independently | Use server's `today_day_index` from `fetchCurrentSeason` as the only gate | ✅ Fixed in PR #1555 |
| **3** | Past doors clickable but silently fail | UI rendered them as buttons even when `revealScratchCardForDay` returned null | `computeDoorStatus()` returns `'missed'`; missed doors are non-clickable `<div>` | ✅ Fixed in PR #1555 |
| **4** | Symbol tracker never triggers rewards | `symbolReward` computed but `awardDailyTreatGold()` never called | Wire `symbolReward` → `awardDailyTreatGold()` in `CountdownCalendarModal` on symbol completion | ❌ **Not fixed** |
| **5** | Scratch layer has no holiday theming | `drawScratchLayer()` uses static blue gradient | `getHolidayGradient()` in `CalendarDoorScratch.tsx` uses holiday accent colour | ✅ Fixed in PR #1555 |
| **6** | `dayInCycle` calendar-month-based, not advent-window-based | `syncScratchCardState` set `dayInCycle = today.getDate()` | Server `today_day_index` now used as the only source of truth | ✅ Fixed in PR #1555 |

---

## Implementation Phases (updated status)

### 🔴 Phase A — Foundation Fixes
- [x] Use server `today_day_index` as the only gating source; remove `computeTodayDayIndex()` from client gating logic
- [x] Add `missed` door state to the grid UI for past unopened doors (greyed out, not clickable)
- [x] Scratch layer colour accepts holiday accent prop; passes holiday key down from modal
- [ ] **Fix `canUseSupabaseDataAsync()` — see Blocker 1 above** ← must ship next
- [ ] Wire `symbolReward` → `awardDailyTreatGold()` so symbol collection bonuses actually pay out ← must ship next

### 🟡 Phase B — Corrected Windows + Personal Quest Calendar
*Makes the feature always-on and fixes the too-long countdowns.*

- [ ] Update `ADVENT_META` in `treatCalendarService.ts` with corrected windows per spec above
- [ ] Add migration 0178: `season_type`, `user_id_owner` on `daily_calendar_seasons` ← see Blocker 2
- [ ] Build `getPersonalQuestSeason(userId)` service — generates/returns a 7-day personal quest season
- [ ] Wire fallback in `CountdownCalendarModal`: when `getActiveAdventMeta()` returns `null`, load personal quest season instead of showing empty state
- [ ] Personal Quest Calendar: 7-door weekly sprint, auto-themed to user's most-active life area

### 🟠 Phase C — Two-Door System + Habit Gate
*The core engagement mechanic.*

- [x] `isHabitCompletedToday(userId)` built in `treatCalendarService.ts`
- [x] Two-door layout in `CountdownCalendarModal` (free + bonus door UI)
- [x] Bonus door pulsing gold glow when unlocked; 🎁 lock icon when not yet unlocked
- [ ] Add migration 0178: `door_type`, `reward_currency`, `reward_amount`, `reward_tier`, `reveal_mechanic` on `daily_calendar_hatches` ← see Blocker 2
- [ ] Update `buildDemoSeasonData()` to generate two doors per day with correct reward tiers
- [ ] Update edge function `/treat-calendar/open` to accept `door_type` and validate habit completion server-side ← see Blocker 3

### 🟢 Phase D — Reward Structure + Economy Wiring
*Ties the calendar to the real app economy.*

- [x] `RewardCard` component built with rarity badge, holiday flavour text, Claim button
- [x] Three reveal mechanics (`CalendarDoorFlip`, `CalendarDoorScratch`, `CalendarDoorUnwrap`) built and routing in modal
- [ ] Rewrite `buildDemoSeasonData()` reward generation using Type 1–5 tiers per the schedule above
- [ ] Remove XP as a calendar reward type entirely — only `gold` and `diamond`
- [ ] Wire diamond awards through `splitGoldBalance()` / `GOLD_PER_DIAMOND` from `src/constants/economy.ts`
- [ ] Flavour text bank: 3–5 lines per holiday, selected by reward tier

### 🔵 Phase E — Three Reveal Mechanics
*The signature interaction layer.*

- [x] `CalendarDoorFlip.tsx` — CSS 3D card flip built
- [x] `CalendarDoorUnwrap.tsx` — CSS envelope/gift unwrap animation built
- [x] `CalendarDoorScratch.tsx` (refactor of `ScratchCardReveal.tsx`) — destination is `RewardCard`, holiday-coloured scratch surface
- [x] `CountdownCalendarModal` selects mechanic per door from `hatch.reveal_mechanic`
- [x] Confetti burst (CSS keyframes) for Type 4 rewards on reveal
- [x] Diamond rain + full-screen flash (CSS) for Type 5 / Diamond rewards on reveal

### 🟣 Phase F — Visual Polish
*Makes the feature feel alive and premium.*

- [x] `holidayThemeAssets.ts`: `calendarBackgroundUrl` set for all holidays
- [x] `calendarBackgroundUrl` wired into `CountdownCalendarModal` dialog panel
- [ ] CSS ambient animations: Christmas snow, Halloween bats, Valentine's hearts, New Year sparkle, Easter petals
- [ ] Door grid: raised card style (box-shadow, gradient face), full opened/missed visual states, glow on today's doors
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

- **2026-04-03**: Documented implementation status post-PR #1555. Identified 3 remaining blockers: async `canUseSupabaseData()`, missing migration 0178, edge function not handling `door_type`. Full handoff notes added to plan for agent continuity.
- **2026-04-02**: Full redesign (v2). Corrected countdown windows (Halloween 7d, Easter 8d, etc.). Replaced generic monthly scratch card with three reveal mechanics (flip/scratch/unwrap) assigned by holiday and door position. Added Personal Quest Calendar as always-on fallback. Two-door system (free + habit-gated bonus) formalised.
- **2026-03-08**: Pivoted from generic monthly rolling calendar to holiday-specific advent countdown. Each season tied to `holiday_key` from Holiday Preferences settings.
- **2026-02-04**: Added themed monthly styling based on cycle index.
- **2026-02-03**: Added month-end rollover callout once the final hatch is opened.
- **2026-01-29**: Synced calendar hatches to local month/day cadence with missed-day states.
- **2025-01-01**: Initial plan drafted as monthly scratch-card calendar.

---

## Changelog

- **2026-04-03**: Added implementation status section (post-PR #1555 audit). Documented 3 blockers with exact code fixes. Updated phase checklists with current ✅/❌ states. Updated bug fix table with statuses.
- **2026-04-02**: v2 redesign. See Decision Log above.
- **2026-03-08**: Fully wired UI to holiday data. Redesigned as holiday-specific advent calendar. Added `holiday_key` column (migration 0177). Consolidated old plan docs into this file.
- **2026-02-04**: Themed monthly styling added.
- **2026-02-01**: Scratch-card reveal canvas added.
- **2026-01-29**: Reward reveal status messaging and daily open gating.
- **2026-01-28**: Persisted scratch-card progress helpers.
- **2025-01-01**: Initial plan + RNG utilities + weighted symbol picker.