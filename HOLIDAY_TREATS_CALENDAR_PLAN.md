# Holiday Treats Advent Calendar — Living Dev Plan

> **Purpose:** Living plan for the Holiday Treats Advent Calendar feature.  
> **Replaces:** `DAILY_TREATS_COUNTDOWN_CALENDAR_PLAN.md` (initial concept) + `MONTHLY_TREAT_CALENDAR_DEV_PLAN.md` (monthly rolling scratch-card plan).  
> **Last updated:** 2026-03-08  
> **Owner:** Product + Engineering

---

## Concept

The Holiday Treats Advent Calendar is a **holiday-specific countdown calendar** inside the Daily Treats menu.  
Unlike a generic rolling monthly calendar, each advent season is tied to a specific holiday from the user's **Holiday Preferences** settings (e.g., Christmas, Halloween, Easter).

- **One hatch per day** counting down to the holiday date.
- **Holiday theming:** emojis, colours, and door count match the holiday (Christmas = 25 doors Dec 1–25, Halloween = 31 doors Oct 1–31, etc.).
- **User-controlled:** only holidays the user has enabled in Settings → Holiday Preferences display a calendar.
- **Surprise reward:** each door hides XP, a shard, a cosmetic, a bonus, or a mystery reward.
- **Advent gating:** today's door unlocks at midnight; past doors are locked (no catch-up in v1).

---

## Supported Holidays

| holiday_key       | Theme name                 | Doors | Countdown window    | Emoji palette                        |
|-------------------|----------------------------|-------|---------------------|--------------------------------------|
| `christmas`       | Christmas Advent           | 25    | Dec 1 → Dec 25      | 🎄 ⭐ 🎁 🦌 🔔 ❄️ 🕯️ 🍪 🧦 ☃️        |
| `halloween`       | Halloween Countdown        | 31    | Oct 1 → Oct 31      | 🎃 👻 🕷️ 🦇 🕯️ 💀 🕸️ 🍬 🧙 🌙        |
| `easter`          | Easter Countdown           | ~38  | Mar 18 → Apr 25 (approx) | 🐣 🌸 🥚 🐰 🌷 🦋 🌼 🍀 ✨ 🌈          |
| `valentines_day`  | Valentine's Countdown      | 14    | Feb 1 → Feb 14      | 💘 ❤️ 🌹 💌 💝 🍫 💕 ✨ 🎀 💗          |
| `new_year`        | New Year Countdown         | 7     | Dec 26 → Jan 1      | 🎉 🥂 🎆 🎊 ⭐ ✨ 🎇 🕛 🥳 🌟          |
| `thanksgiving`    | Thanksgiving Countdown     | ~28  | Nov 1 → Nov 28 (4th Thu) | 🦃 🍂 🌽 🥧 🍁 🌾 🥕 🙏 🍎 🍠          |
| `hanukkah`        | Hanukkah Countdown         | 9     | Dec 14 → Dec 22     | 🕎 ✡️ 🕯️ 💙 ⭐ 🎁 🪙 🥞 🌟 ✨          |
| `st_patricks_day` | St. Patrick's Day Countdown| 8     | Mar 10 → Mar 17     | ☘️ 🍀 🌈 🟢 🎩 🪙 🍺 ✨ 🌿 ⭐          |

> **Note on movable feasts:** Easter and Thanksgiving have variable dates each year. The countdown windows shown above are approximate demo ranges. Production advent seasons should be seeded with the exact year-specific dates via the `daily_calendar_seasons` table.



| Symbol     | Name     | Weight | Reward tier    |
|------------|----------|--------|----------------|
| 🎁         | gift     | 5      | common         |
| 🍀         | clover   | 5      | common         |
| 🌟         | star     | 3      | medium         |
| 💎         | gem      | 3      | medium         |
| ⚡         | lightning| 2      | rare           |
| 🎉         | party    | 2      | rare           |
| 🏆         | trophy   | 1      | very rare      |
| 👑         | crown    | 1      | very rare      |

Holiday-specific symbols (e.g., 🎄 for Christmas) replace the generic palette for that season.

---

## Data Model

### Supabase tables (migrations 0135 + 0177)

| Table                        | Purpose                                      |
|------------------------------|----------------------------------------------|
| `daily_calendar_seasons`     | One row per holiday advent season; `holiday_key` links to holiday prefs |
| `daily_calendar_hatches`     | Per-day reward definitions for a season      |
| `daily_calendar_progress`    | Per-user open state within a season          |
| `daily_calendar_rewards`     | Immutable audit trail of claimed rewards     |

**`daily_calendar_seasons` key columns:**
- `holiday_key text` — matches `holiday_preferences.holidays` keys (migration 0177)
- `starts_on date` — first day of countdown
- `ends_on date` — holiday date (last door)
- `status text` — `'active' | 'archived' | 'draft'`

### RLS
- `daily_calendar_seasons` / `daily_calendar_hatches`: read-only for authenticated users
- `daily_calendar_progress`: users CRUD only their own rows
- `daily_calendar_rewards`: users read/insert only their own rows (immutable)

---

## Backend — Edge Function

`supabase/functions/treat-calendar/index.ts`

| Endpoint                          | Method | Purpose                                                  |
|-----------------------------------|--------|----------------------------------------------------------|
| `/treat-calendar?holiday_key=...` | GET    | Returns season + hatches + user progress for a holiday   |
| `/treat-calendar/open`            | POST   | Opens today's hatch; validates day, records reward       |

**POST body:** `{ season_id: string, day_index: number }`  
**Validation:** `day_index` must equal the server-computed day index for today; duplicate opens are rejected (409).

---

## Client Service

`src/services/treatCalendarService.ts`

| Export                                          | Purpose                                              |
|-------------------------------------------------|------------------------------------------------------|
| `fetchCurrentSeason(userId, holidayKey?)`       | Active season + hatches + progress; demo fallback    |
| `fetchUserProgress(userId, seasonId)`           | Progress for a given season                          |
| `openTodayHatch(userId, seasonId, dayIndex)`    | Claim today's reward; demo or edge function          |
| `HolidayKey` type                               | Union of all supported holiday_key strings           |
| `ADVENT_META[]`                                 | Static config: theme, date range, emoji palette      |

**Demo mode:** `buildDemoSeasonData()` picks the currently-active advent (by date); defaults to Christmas Advent if no holiday countdown is running today.

---

## Milestones & Status

### Phase 1 — Product + Design ✅
- [x] Define holiday list + emoji palettes
- [x] Confirm advent cadence (daily open, no catch-up v1)
- [x] Decide on holiday_key → holiday prefs mapping

### Phase 2 — RNG & Logic ✅
- [x] Weighted symbol picker (`crypto.getRandomValues`)
- [x] Number generation + 3-of-a-kind detection
- [x] Cycle/progress persistence helpers (localStorage)

### Phase 3 — UI/UX ✅
- [x] Advent grid view (holiday-themed hatch doors)
- [x] Scratch-card reveal component (canvas)
- [x] Reward reveal animation + copy
- [x] Month-end / last-door rollover screen

### Phase 4 — Backend ✅
- [x] Supabase migration 0135 — `daily_calendar_*` tables + RLS
- [x] Supabase migration 0177 — `holiday_key` column on `daily_calendar_seasons`
- [x] `treat-calendar` edge function (GET + POST /open)
- [x] `treatCalendarService.ts` client with demo/production parity
- [x] `getDemoTreatCalendarData()` — Christmas Advent demo with 7 pre-opened doors
- [x] `database.types.ts` — all 5 new tables registered for strict TS typing

### Phase 5 — QA + Launch ⏳
- [ ] Timezone + DST boundary testing
- [ ] Verify `today_day_index` server ↔ client consistency
- [ ] Accessibility audit (labels, keyboard, contrast)
- [ ] Performance check for scratch canvas
- [ ] Release checklist + monitoring

---

## Non-Goals (v1)
- Real-money gambling mechanics
- Multiplayer competition or leaderboards
- Catch-up mechanic for missed days
- Admin UI for creating/editing seasons (manual SQL for now)

---

## Decision Log
- **2026-03-08**: Pivoted from generic monthly rolling calendar to holiday-specific advent countdown. Each season now tied to a `holiday_key` from the user's Holiday Preferences settings.  
- **2026-02-04**: Added themed monthly styling based on cycle index.  
- **2026-02-03**: Added month-end rollover callout once the final hatch is opened.  
- **2026-01-29**: Synced calendar hatches to local month/day cadence with missed-day states.  
- **2025-01-01**: Initial plan drafted as monthly scratch-card calendar.

---

## Changelog
- 2026-03-08: Redesigned as holiday-specific advent calendar. Added `holiday_key` column (migration 0177), rewrote `treatCalendarService.ts` with `ADVENT_META` config, updated edge function with `holiday_key` filter, updated demo data to Christmas Advent. Consolidated `DAILY_TREATS_COUNTDOWN_CALENDAR_PLAN.md` + `MONTHLY_TREAT_CALENDAR_DEV_PLAN.md` into this file.
- 2026-02-04: Themed monthly styling added.
- 2026-02-01: Scratch-card reveal canvas added.
- 2026-01-29: Reward reveal status messaging and daily open gating.
- 2026-01-28: Persisted scratch-card progress helpers.
- 2025-01-01: Initial plan + RNG utilities + weighted symbol picker.
