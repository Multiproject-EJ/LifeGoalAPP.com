# CANONICAL "APP DAY" — ONE DAY BOUNDARY FOR ALL FEATURES

> **Status:** Canonical. Authored 2026-06-29.
> Single source of truth for "when does a day roll over" across the app.

## 1. The rule

A **day = the user's local civil day**, rolling over at their **local midnight**.

This matches what "my day" means to a person and is already what the streak
calculator and the Today-tab habit logic use. Every user-facing feature that
resets daily (habits, timed bonuses, daily treats, daily-spin habit bonus,
vision star, etc.) must agree on this one boundary.

## 2. The single source of truth

Use `src/utils/appDay.ts` for all day logic. Do **not** re-derive "today" with
`new Date().toISOString().slice(0, 10)` (that is **UTC**, not the user's day) and
do **not** copy local `formatISODate`/`parseISODate` helpers into feature files.

| Helper | Meaning |
|---|---|
| `formatISODate(date)` | Local `YYYY-MM-DD` key (NOT UTC) |
| `parseISODate(key)` | Parse a key to a Date at **local** midnight |
| `addDays(date, n)` | Add/subtract whole days |
| `getTodayKey(now?)` | The canonical "today" key |
| `getDayStartMs(date?)` | Epoch ms at local midnight of that day |
| `getNextDayBoundaryMs(now?)` | Epoch ms at the next local midnight |

## 3. What was the problem

The app derived "today" two ways:
- **Local**: `getHours()` time-of-day windows (habit rhythm/early-bird bonuses),
  streaks, the Today tab's `formatISODate`/`parseISODate`, `habitMonthlyQueries`.
- **UTC**: `toISOString().slice(0, 10)` and `getNextUtcMidnightMs()` (Today-tab
  offer-row expiry, egg/offer localStorage keys, the daily-spin habit-bonus
  default key, and several duplicated `formatISODate` copies).

For any user not on UTC, "a new day" rolled over at two different moments —
e.g. the timed-bonus windows felt local while the offer circles / treats reset
at an odd local hour.

## 4. Migrated to the canonical module

- `DailyHabitTracker` — offer-row expiry + egg/offer keys now use the local day.
- Duplicated `formatISODate` helpers unified to `appDay` (were UTC):
  `QuickActionsFAB`, `BodyHaircutWidget`, `VisionBoard`, `ProgressDashboard`,
  `LifeWheelCheckins`; plus `habitMonthlyQueries` (already local).
- Daily-spin habit bonus: `dailySpin.formatDailySpinHabitBonusDate` +
  `UnifiedTodayView` claim now use the local key, matching `DailyHabitTracker`
  (the `claim_date` is a client-supplied idempotency key, so this is safe).
- `HabitsModule` auto-progress "already shifted today" guard.

## 5. Deliberately NOT migrated yet (coordinated follow-up)

These touch a **server contract** (Postgres `current_date`, RPCs, unique
constraints) or are **analytics bucketing** where UTC is intentional. Flipping
them in isolation could desync daily-uniqueness near midnight or fragment
analytics across timezones, so they need a coordinated client+server change:

- DB date columns written client-side: `meditation` (`session_date`/`start_date`),
  `habitsV2` logs, `gamification` streak day, the daily-spin **wheel state**
  rollover (`getStateDayKey`), `routines` logs, journal `entry_date`,
  vision-board daily game `session_date`, habit-experiment protocol dates.
- Telemetry/analytics date keys (`telemetry`, `islandRun*Telemetry`,
  `worldAnalytics`) — keep UTC for stable server-side aggregation.

When migrating these, verify the matching server-side day definition first.
