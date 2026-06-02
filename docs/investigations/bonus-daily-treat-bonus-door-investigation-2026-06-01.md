# Bonus Daily Treat / Bonus Door Investigation (2026-06-01)

## Investigation summary

The Bonus Daily Treat / Bonus Door is not a separate modal or reward system. It is a same-day `bonus` hatch inside the existing Daily Treat / Personal Quest calendar flow, rendered by `CountdownCalendarModal` and backed by the shared treat-calendar service and Supabase edge function.

The visual that currently reads as a Day card / wrapped gift comes from the `CalendarDoorUnwrap` reveal mechanic. For normal Personal Quest days, free doors use the shared `CalendarDoorFlip` reveal; bonus doors use `CalendarDoorUnwrap` unless it is the final day, where both free and bonus Personal Quest hatches use scratch.

The perceived slowness is primarily from two places:

1. The UI starts by waiting for `openTodayHatch(...)` to return before it can show the authoritative reward amount and mechanic.
2. The unwrap mechanic adds an intentional 800 ms timeout before replacing the wrapped gift with the reward card.

There is no evidence that the claim button itself performs additional reward persistence. Rewards are persisted/opened and credited before the user taps **Claim Reward**; `onClaim` only dismisses the reveal view.

## File map

### Entry, modal launch, and app-level state

| File | Relevant symbols | Notes |
| --- | --- | --- |
| `src/App.tsx` | `showCalendarPlaceholder`, `calendarLaunchMode`, `launchDailyTreatsMenu`, `openPersonalQuestDailyTreatsCalendar`, `refreshDailyTreatsOpenedState`, `countdownCalendarModal` | Launches the Daily Treat calendar in `personal_quest` mode, refreshes today free/bonus open state, and passes `islandRunSession` into the modal. |
| `src/features/habits/DailyHabitTracker.tsx` | `onOpenDailyTreat`, `hasOpenedDailyTreatsToday`, `hasOpenedDailyTreatBonusToday`, `hasDailyTreatBonusDoorToday`, `isDailyTreatBonusReady` | Surfaces the Daily Treat offer state in Today/Rewards UI and makes the offer actionable when the bonus door is ready. |
| `src/features/habits/MobileHabitHome.tsx` | `onOpenDailyTreat`, `hasOpenedDailyTreatsToday`, `hasOpenedDailyTreatBonusToday`, `hasDailyTreatBonusDoorToday` | Pass-through for mobile Today home. |

### Calendar UI and reveal components

| File | Relevant symbols | Notes |
| --- | --- | --- |
| `src/features/gamification/daily-treats/CountdownCalendarModal.tsx` | `CountdownCalendarModal`, `handleOpenDoor`, `handleClaimReward`, `PRESS_ANIMATION_DELAY_MS`, `revealState`, `CalendarDoorFlip`, `CalendarDoorUnwrap`, `CalendarDoorScratch` | Main UI for Daily Treat, holiday calendars, bonus same-day door state, reward reveal, reward crediting, sounds, and body scroll lock. |
| `src/features/gamification/daily-treats/CalendarDoorUnwrap.tsx` | `CalendarDoorUnwrap`, `handleUnwrap`, `variant` | Wrapped gift/envelope reveal. Bonus doors pass `variant="gift"`; free unwrap doors pass `variant="envelope"`. Contains the intentional 800 ms delay. |
| `src/features/gamification/daily-treats/CalendarDoorFlip.tsx` | `CalendarDoorFlip`, `handleFlip` | Shared card-flip reveal for normal free doors and some holiday bonus mechanics. Contains a 600 ms post-flip callback timer and sound/haptic hooks. |
| `src/features/gamification/daily-treats/CalendarDoorScratch.tsx` | `CalendarDoorScratch`, `SCRATCH_ACTIONS_TO_REVEAL`, `handleRevealNow` | Shared canvas scratch reveal for final-day/scratch mechanics. Requires 18 scratch actions or a manual reveal. |
| `src/features/gamification/daily-treats/RewardCard.tsx` | `RewardCard`, `getRewardIcon`, `getRewardLabel`, `getFlavourText` | Shared reward display and claim button for all reveal mechanics. |
| `src/features/gamification/daily-treats/ScratchCardReveal.tsx` | `ScratchCardReveal` | Legacy scratch-card reveal kept for fallback/backward compatibility; not the current Personal Quest bonus-door reveal. |

### Reward, progress, gating, and persistence

| File | Relevant symbols | Notes |
| --- | --- | --- |
| `src/services/treatCalendarService.ts` | `DoorType`, `RevealMechanic`, `CalendarHatch`, `CalendarProgress`, `generateRewardSchedule`, `buildPersonalQuestSeasonData`, `getRevealMechanic`, `getPersonalQuestSeason`, `fetchCurrentSeason`, `openTodayHatch`, `isHabitCompletedToday`, `getHatchesForDay`, `computeStreak` | Shared calendar service. Defines `free` vs `bonus`, reward schedules, generated hatch mechanics/amounts, progress, same-day bonus state, and service wrapper for the edge function. |
| `supabase/functions/treat-calendar/index.ts` | `/open` POST handler | Production authority for opening hatches: validates door type/day, validates bonus habit completion, inserts reward audit, upserts free/bonus progress, and returns authoritative reward details. |
| `src/services/dailyTreats.ts` | `awardDailyTreatDice`, `awardDailyTreatGold` | Credits dice/gold/Island Run dice through existing economy helpers. Must not be altered for a visual-only implementation. |
| `src/features/gamification/level-worlds/services/islandRunStateActions.ts` | `applyEssenceAward` | Used when a calendar gold reward should become Island Run Essence in Island Run sessions. Must not be altered for a visual-only implementation. |

### Styling and assets

| File/path | Relevant symbols/assets | Notes |
| --- | --- | --- |
| `src/index.css` | `.daily-treats-calendar`, `.daily-treats-calendar__hatch--bonus-ready`, `.door-unwrap`, `.door-flip`, `.door-scratch`, `.reward-card`, reduced-motion blocks | All current modal, grid, bonus-ready, reveal, scratch, and reward-card CSS lives here. There are older and newer style blocks for some reveal classes; later declarations override earlier ones. |
| `public/icons/DAILY TREAT/dailymomentum_title.webp` | title image | Used as the Personal Quest / Daily Momentum title image. |
| `public/icons/DAILY TREAT/dailymomentumnight.webp` | calendar background | Used as the Personal Quest background image. |
| `src/services/holidayThemeAssets.ts` | `getHolidayThemeAssets` | Provides holiday background image URLs for holiday-mode calendars. |

## Is Bonus Daily Treat separate from normal Daily Treat?

No. It shares the same modal, hatches, progress, reward display components, and reward crediting path.

Shared pieces:

- Both free and bonus opens call `handleOpenDoor(dayIndex, doorType, hatch)` in `CountdownCalendarModal`.
- Both go through `openTodayHatch(userId, seasonId, dayIndex, doorType)`.
- Both render one of the same reveal components based on authoritative `hatch.reveal_mechanic`: `CalendarDoorFlip`, `CalendarDoorUnwrap`, or `CalendarDoorScratch`.
- Both render the same `RewardCard` after reveal.
- Both use the same reward-crediting helpers: `awardDailyTreatDice`, `awardDailyTreatGold`, and `applyEssenceAward` for Island Run Essence sessions.

What is separate:

- Progress is tracked separately: normal free doors use `opened_days`; bonus doors use `opened_bonus_days`.
- Bonus availability is gated by same-day habit completion and by the existence of a `bonus` hatch for the current day.
- The Today offer state distinguishes `hasOpenedDailyTreatsToday`, `hasOpenedDailyTreatBonusToday`, and `hasDailyTreatBonusDoorToday`.
- The grid uses a special `.daily-treats-calendar__hatch--bonus-ready` visual when today’s free door has already been opened, the bonus hatch exists, habit completion is true, and the bonus door has not been opened.

## Current user flow diagram

```mermaid
flowchart TD
  A[User taps Daily Treat / Daily Treats offer] --> B[App.launchDailyTreatsMenu]
  B --> C[openPersonalQuestDailyTreatsCalendar]
  C --> D[CountdownCalendarModal opens in personal_quest mode]
  D --> E[Modal loads scratch fallback state, Personal Quest season, quest habit, habit completion]
  E --> F{Today free door opened?}
  F -- No --> G[User taps Day N free button]
  G --> H[handleOpenDoor(day, 'free', freeHatch)]
  F -- Yes + bonus hatch + habit complete + bonus not opened --> I[Day N tile becomes glowing same-day bonus button]
  I --> J[User taps glowing Day N bonus button]
  J --> K[handleOpenDoor(day, 'bonus', bonusHatch)]
  H --> L[Set revealState immediately with cached hatch]
  K --> L
  L --> M[Call openTodayHatch]
  M --> N{Error?}
  N -- Yes --> O[Show doorError and return to calendar]
  N -- No --> P[Replace reveal hatch with authoritative reward from server/service]
  P --> Q[Credit reward: dice, gold, or Island Run Essence]
  Q --> R[Refresh season data]
  R --> S[Dispatch lifegoal:treat-calendar-opened]
  S --> T[Reveal modal renders mechanic]
  T --> U{Mechanic}
  U -- flip --> V[User taps card; 600 ms post-flip callback]
  U -- unwrap --> W[User taps gift/envelope; 800 ms unwrap timeout]
  U -- scratch --> X[User scratches 18 actions or taps reveal]
  V --> Y[RewardCard shown]
  W --> Y
  X --> Y
  Y --> Z[User taps Claim Reward / Continue]
  Z --> AA[handleClaimReward clears revealState]
  AA --> AB[Calendar grid returns with updated opened state]
```

## Exact flow details

1. `App.tsx` launches Daily Treats by calling `launchDailyTreatsMenu`, which marks Daily Treats as seen and then calls `openPersonalQuestDailyTreatsCalendar`.
2. `openPersonalQuestDailyTreatsCalendar` sets `calendarLaunchMode` to `personal_quest` and opens `CountdownCalendarModal` via `showCalendarPlaceholder`.
3. On modal open, `CountdownCalendarModal`:
   - plays `shop_open` once,
   - locks `document.body.style.overflow`,
   - loads scratch fallback state,
   - fetches Personal Quest season data with `getPersonalQuestSeason(userId)`,
   - loads the Quest Habit with `getQuestHabit(userId)`,
   - checks same-day habit completion with `isHabitCompletedToday(userId, qh?.habitId)`.
4. The calendar grid computes `todayFreeOpened`, `todayBonusOpened`, and `todayBonusHatch` from `seasonData.progress` and `getHatchesForDay(...)`.
5. If the free door is open, a bonus hatch exists, habit completion is true, and the bonus is not open, the same Day tile becomes the bonus-ready button.
6. Tapping the bonus-ready tile calls `handleOpenDoor(day, 'bonus', bonusHatch)`.
7. `handleOpenDoor` immediately sets `revealState` with the cached hatch so the calendar grid is replaced by the reveal shell while persistence is in flight.
8. `handleOpenDoor` awaits `openTodayHatch(...)`.
9. The returned reward is treated as authoritative. The modal replaces the cached hatch in `revealState` with the returned currency, amount, tier, payload, and reveal mechanic.
10. The modal credits rewards client-side after the open succeeds:
    - `gold` becomes Island Run Essence when `islandRunSession` exists via `applyEssenceAward(...)`;
    - otherwise `gold` goes through `awardDailyTreatGold(...)`;
    - `dice` goes through `awardDailyTreatDice(...)`;
    - Personal Quest free-door streak bonus dice are also awarded through `awardDailyTreatDice(...)`.
11. The modal refreshes season data, dispatches `lifegoal:treat-calendar-opened`, and renders the mechanic chosen by `hatch.reveal_mechanic`.
12. For the current Bonus Daily Treat in Personal Quest, non-final days use `CalendarDoorUnwrap` with `variant="gift"`.
13. After the user unwraps/reveals and taps `RewardCard`’s **Claim Reward**, `handleClaimReward` only clears `revealState` and returns to the calendar.

## Where the slow behavior is coming from

### Intentional timers

- `CalendarDoorUnwrap` waits 800 ms before showing the reward card. This is the primary intentional delay for the wrapped gift bonus experience.
- `CalendarDoorFlip` waits 600 ms after flip start before firing `onRevealComplete`, reward burst sound, and haptics. The reward card is mounted on the back face immediately, but the flip transition itself is 600 ms.
- Legacy scratch fallback paths use `PRESS_ANIMATION_DELAY_MS = 180` before calling `revealScratchCardForDayWithPersistence(...)`. The modern season-data `handleOpenDoor` path does not use this 180 ms delay.
- `CalendarDoorScratch` hides confetti after 2000 ms and requires 18 scratch actions before auto-reveal unless the user taps **Reveal without scratching**.

### Animation delays/transitions

- `.door-unwrap--unwrapping .door-unwrap__wrapper` applies `unwrap-shake 0.4s` and `unwrap-fade 0.8s`. This matches the 800 ms timeout in `CalendarDoorUnwrap`.
- `.door-unwrap__content` then animates in for 0.5 s after the gift disappears.
- `.door-flip__inner` has a 0.6 s transform transition.
- The reward reveal dialog scales in over 260 ms.
- Bonus-ready grid tile glow/sheen loops are 2.8 s and 3.6 s respectively, but these are ambient loops rather than blocking timers.

### State waiting

- On initial modal open, rendering is withheld while `activeAdvent === undefined`. In Personal Quest mode, that means no modal body is shown until the async loader has decided there is no holiday advent and has fetched/generated the Personal Quest season.
- Bonus-door readiness also waits for `isHabitCompletedToday(...)`. If this check is slow, the bonus-ready state may appear late.

### Async reward claim/open

- The authoritative open call is awaited in `handleOpenDoor` before the final reveal data is known.
- Production `openTodayHatch` calls the `treat-calendar/open` edge function; demo/local mode updates localStorage.
- After a successful open, the modal awaits a season refresh before finishing `handleOpenDoor`.
- Reward credit helpers are not uniformly awaited: `applyEssenceAward(...)` and `awardDailyTreatGold(...)` are fire-and-forget in this component, while `awardDailyTreatDice(...)` is called synchronously without `await`.
- The user-facing **Claim Reward** button is not the slow persistence step; claim only clears local `revealState`.

## Reward logic in use, and what must not change

Do not change any of the following in a visual/animation PR:

1. `treatCalendarService.ts` reward tiers and amount ranges:
   - tier 1 empty = 0,
   - tier 2 = 50-150 gold,
   - tier 3 = 200-500 gold,
   - tier 4 = 600-900 gold,
   - tier 5 = 25-75 dice.
2. Personal Quest free-door schedule: 7-day weekly sprint with dice every day, starting at 25 dice and increasing by 10 per day.
3. Personal Quest bonus-door generation: one same-day bonus hatch per day, habit-gated, at least one tier above the free hatch with minimum tier 3; tier 5 pays dice, otherwise gold.
4. Holiday calendar bonus generation and final-day long-calendar 75 dice behavior.
5. `openTodayHatch(...)` validation, progress tracking, and server call shape.
6. Edge function validation:
   - `door_type` must be `free` or `bonus`,
   - `day_index` must match today,
   - bonus doors require completed habit server-side,
   - free and bonus opened state are tracked separately.
7. Client reward crediting:
   - `awardDailyTreatDice(...)`,
   - `awardDailyTreatGold(...)`,
   - `applyEssenceAward(...)`,
   - streak bonus dice via `computeStreak(...)`.
8. Database schema and telemetry/economy source labels.
9. Island Run economy behavior. Visual work must not add UI-side gameplay writes or bypass canonical Island Run reward paths.

## Current images, icons, and visual assets

### Image files

- Personal Quest / Daily Momentum modal title: `public/icons/DAILY TREAT/dailymomentum_title.webp`.
- Personal Quest / Daily Momentum modal background: `public/icons/DAILY TREAT/dailymomentumnight.webp`.
- Holiday calendars use `getHolidayThemeAssets(...)` image URLs, including New Year, Valentine’s, St Patrick’s Day, Easter, Eid, Halloween, Hanukkah, and Christmas assets under `/Holiday Themes/...`.

### Emoji/icon visuals

- Bonus-ready same-day grid tile uses `🎁` as the hatch symbol.
- Bonus amount labels use `🎲` for dice, `✨` for non-dice bonus amount labels.
- `CalendarDoorUnwrap` wrapper uses `🎁` for `variant="gift"` and `💌` for `variant="envelope"`.
- `RewardCard` uses:
  - `🎲` for dice,
  - `🟣` for Personal Quest non-dice rewards/Essence,
  - `🪙` for non-Personal-Quest gold,
  - `✦` for empty doors.
- Personal Quest generated hatches use rotating emoji: `🧭`, `⭐`, `🏆`, `🎯`, `💪`, `🌟`, `✨`, `🔥`, `💎`, `🚀`.
- Holiday calendars use the holiday emoji arrays in `treatCalendarService.ts`.

## Sound and haptic hooks

Existing hooks:

- `CountdownCalendarModal` plays `playIslandRunSound('shop_open')` once when the modal opens.
- `CalendarDoorFlip` plays `playIslandRunSound('egg_open')` and `triggerIslandRunHaptic('egg_open')` when the card is flipped.
- `CalendarDoorFlip` plays `playIslandRunSound('reward_bar_claim_burst')` and `triggerIslandRunHaptic('reward_claim')` after the 600 ms flip callback.

Gaps:

- `CalendarDoorUnwrap` currently has no sound or haptic calls.
- `CalendarDoorScratch` currently has no sound or haptic calls.
- `RewardCard` claim currently has no sound or haptic call.

A future visual-only PR can add sound/haptic hooks to unwrap if it uses existing `playIslandRunSound` / `triggerIslandRunHaptic` events and does not alter reward or persistence flow.

## Reduced-motion handling

There is reduced-motion handling, but it is incomplete for the Bonus Daily Treat unwrap path.

Existing reduced-motion CSS:

- Disables animation for `.daily-treats-calendar--reward-reveal`, `.daily-treats-calendar__dialog--reward-reveal`, `.door-flip`, `.door-flip__sparkle`, and `.door-flip__reveal-spark`.
- Removes `.door-flip__inner` transition and swaps front/back layout for flipped state.
- Disables bonus-ready grid tile glow and sheen animations.

Missing/incomplete reduced-motion coverage:

- `.door-unwrap--unwrapping .door-unwrap__wrapper` still has shake/fade animations.
- `.door-unwrap__content` still has the 0.5 s reveal animation.
- The JavaScript 800 ms unwrap timeout still runs even for users who prefer reduced motion.
- `.door-scratch__diamond-flash` and `.door-scratch__confetti-piece` animations are not covered by the later reduced-motion block.

## Risk list

1. **Reward divergence risk**: Do not show a locally invented amount before `openTodayHatch(...)` returns; the current code intentionally replaces cached hatch data with authoritative server/service reward data.
2. **Double-open risk**: Do not create new open/claim paths. The existing service and edge function guard duplicate opens and track `opened_days` vs `opened_bonus_days` separately.
3. **Bonus gating risk**: Do not bypass server-side habit validation for bonus doors. Client `habitCompleted` is only UI readiness; production authority is the edge function.
4. **Economy risk**: Do not alter `awardDailyTreatDice`, `awardDailyTreatGold`, `applyEssenceAward`, `computeStreak`, reward tiers, amount ranges, or source labels.
5. **Island Run architecture risk**: Do not add direct gameplay writes from UI components. Keep Island Run economy mutations inside existing service/action helpers.
6. **State-refresh risk**: `handleOpenDoor` currently refreshes `seasonData` and dispatches `lifegoal:treat-calendar-opened`; removing either can make Today offer badges stale.
7. **Reduced-motion risk**: Merely changing CSS animations without addressing the 800 ms JS timeout may still feel slow for reduced-motion users.
8. **Modal UX risk**: Any reveal redesign must keep the modal viewport-fixed, centered, and body-scroll locked.
9. **Shared component risk**: `CalendarDoorUnwrap`, `RewardCard`, and shared CSS can affect holiday calendars and free unwrap doors, not only Bonus Daily Treat. Scope selectors/props carefully if changing only bonus visuals.

## Safest implementation plan

### Principles

- Treat this as a visual/interaction-layer change only.
- Keep `openTodayHatch(...)`, reward generation, database progress, telemetry/economy labels, and Island Run reward helpers unchanged.
- Preserve authoritative server reward display: continue to render the final amount from returned reward data.
- Prefer additive visual props/classes over rewriting the shared calendar service.
- Add tests for routing/state guardrails only if behavior changes; for pure CSS/animation, validate with build and existing daily-treat routing checks.

### Recommended small implementation slices

#### Slice 1 — Bonus unwrap responsiveness only

- Add a bonus-specific visual prop/class to `CalendarDoorUnwrap` from `CountdownCalendarModal` when `doorType === 'bonus'`.
- Reduce or eliminate the 800 ms unwrap timeout for bonus only, or make it respect reduced motion.
- Add sound/haptic calls to `CalendarDoorUnwrap.handleUnwrap` using existing sound helper events if product wants stronger feedback.
- Do not touch reward amount logic, `openTodayHatch`, or reward helpers.

#### Slice 2 — Bonus gift visual polish

- Improve only the gift presentation: bow/ribbon shape, glow, burst particles, reward-card entrance, and bonus-specific copy.
- Scope CSS under a new bonus-specific class to avoid changing holiday envelope/free unwrap visuals.
- Keep the `RewardCard` API and reward labels unchanged unless copy-only changes are explicitly approved.

#### Slice 3 — Reduced-motion completion

- Add reduced-motion handling for unwrap and scratch reveal animations.
- In JS, reveal immediately or with a near-zero timeout when `prefers-reduced-motion: reduce` is active.
- Ensure CSS disables unwrap shake/fade, unwrap reveal, confetti, and diamond flash animations.

#### Slice 4 — Loading-state clarity without changing persistence

- If the edge-function wait is noticeable, show a fast “opening…” shell or shimmer while `openTodayHatch` is pending, but do not show a final reward amount until the authoritative response is available.
- Avoid adding a second claim/persist step; keep claim as reveal dismissal only.

## Validation run during investigation

- `npm run test:daily-treats-routing`
- `npm run build`
