# PWA Local Storage Sync Audit — 2026-06-02

Status: Chunk 2 in progress (Quest Habit fixed; habit bonus spin reward gate fixed; broader reward-gate audit remains)

## Purpose

Find places where a logged-in user can see different account/gameplay state across devices because the PWA stores user-scoped state only in `localStorage`/`sessionStorage`.

## Classification rubric

- **Account/gameplay state**: should sync across devices. Local storage may be used only as a cache/offline fallback.
- **Device UX preference**: may stay local if the product intentionally treats each device separately.
- **One-time local affordance**: local is usually fine (coachmarks, dismissed hints, local debug flags).
- **Demo/local-only data**: local is fine when gated to demo/no-Supabase paths.

## Fixed so far

### Quest Habit selection

- Previous behavior: one Quest Habit per browser/device via `lifegoal:quest_habit:{userId}`.
- Problem: Quest Habit gates the Daily Momentum / Personal Quest bonus door, so iPad and iPhone could disagree about which habit unlocks the same account-level reward.
- Fix direction implemented: account-level server row in `public.user_quest_habits`, with `localStorage` retained as cache/offline fallback and last-write-wins reconciliation via `updated_at`.

### Daily Spin habit-completion bonus

- Previous behavior: Today surfaces used `lifegoal:daily-spin-habit-bonus:{userId}:{date}` as the only once-per-day reward marker.
- Problem: iPad and iPhone could each grant the habit bonus spin because the idempotency marker was device-local.
- Fix direction implemented: `public.daily_spin_habit_bonus_claims` plus `claim_daily_spin_habit_bonus()` provide a server-side idempotency ledger and atomic spin-state update. LocalStorage remains only a demo/offline/cache marker.

## Similar issues found in chunk 1

### 1. Reminder preference services: likely account settings, currently local-only in places

Files:
- `src/services/todaysWinsReminderPrefs.ts`
- `src/services/dreamJournalReminderPrefs.ts`
- `src/services/yesterdayRecapPrefs.ts`
- `src/services/dailyLifeUpgradePrefs.ts`

Assessment:
- **Enabled/window settings** feel like account preferences if exposed as settings. Consider server-backed preferences with local cache.
- **Last-shown / last-collected cycle values** can reasonably be device-local if they only suppress repeated modals on that device. If they gate rewards, they must be server-backed.

Recommended next case-by-case decision:
1. Split each service into two categories:
   - user preference (`enabled`, reminder window): sync across devices.
   - presentation throttle (`last shown`): keep local unless reward-sensitive.
2. Migrate account preferences to a shared user preferences table or feature-specific tables.

### 2. Habit reminder preferences: mostly correct pattern already

File:
- `src/services/habitReminderPrefs.ts`

Assessment:
- This already uses a local offline record plus queued mutation model and syncs to remote via the reminder edge function.
- This is a good reference pattern for future preference migrations.

Recommended action:
- Keep this architecture; use it as a model for account-level preference sync.

### 3. Daily reward claim flags in Today habit surfaces: partially fixed, broader pass still needed

Files:
- `src/features/habits/DailyHabitTracker.tsx`
- `src/features/habits/UnifiedTodayView.tsx`
- `src/services/treatCalendarService.ts`

Assessment:
- Habit bonus spin idempotency is now server-backed.
- Other localStorage keys still appear to suppress repeated local claims/popups or support demo/local mode.
- Any remaining key that prevents duplicate rewards or marks a reward as claimed should be server-authoritative. Local-only reward gates can diverge across iPad/iPhone.

Recommended next chunk:
- Continue auditing keys containing `claim`, `claimed`, `opened`, `bonus`, `treat`, `egg`, and `reward`.
- Categorize each as:
  - server-backed already,
  - local presentation-only,
  - reward duplication risk.

### 4. Island Run localStorage/sessionStorage surfaces: defer to Island Run architecture rules

Files:
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- Island Run services/docs listed in AGENTS.md

Assessment:
- Island Run has active split-authority guardrails and migration policy.
- Do not casually move Island Run state without following canonical state/action rules.

Recommended next chunk:
- Audit only with the Island Run architecture contract open.
- Separate debug/coachmark local storage from gameplay runtime state.

## Suggested audit chunks after this PR

1. **Reward gates and claim flags**: daily spin, daily treats, eggs, welcome packs, daily life upgrades.
2. **User-facing preferences**: reminder windows, recap enablement, notification/display preferences.
3. **Gameplay/runtime state**: Island Run, Zen Garden, power-ups, minigames; classify demo-only vs authenticated account state.
4. **Presentation-only local flags**: coachmarks, dismissed banners, sound/haptic preferences; leave local unless product wants account sync.

## Best-practice policy recommendation

For logged-in users:

- Server is the source of truth for gameplay/reward/account settings.
- Local storage is acceptable as a cache, optimistic UI layer, or device-only preference.
- Any local cache for account state should include an `updatedAt` timestamp and a reconciliation policy.
- Single-value account settings can use last-write-wins.
- Reward claim/anti-duplication state should use server-side idempotency, not localStorage.
