# Dual Journey Ladder Game Overlay Plan

Date: 2026-06-05  
Scope: Investigation and build plan only. Do not implement gameplay, economy, reward, dice, or schema changes in this phase.

## Current overlay state

The current mobile game overlay is intentionally minimal:

- `src/components/GameBoardOverlay.tsx` owns the overlay shell and animation state.
- `src/styles/game-board-overlay.css` owns the fullscreen backdrop, slide-up content, island scene image, and centered PLAY button styling.
- `src/App.tsx` owns the overlay state and passes all display props into `GameBoardOverlay`.
- The overlay currently renders only:
  - background/island scene image from `islandSceneSrc`
  - a centered `PLAY` button
- `GameBoardOverlayProps` already includes many richer overlay props (`essenceBalance`, `rewardBarProgress`, `islandNumber`, `islandDisplayName`, creature counts, spin/lucky roll fields), but the current component only consumes `isOpen`, `onClose`, `onPlayClick`, and `islandSceneSrc`.

Important files:

- `src/components/GameBoardOverlay.tsx:5-36` — prop surface already has data needed for progress display.
- `src/components/GameBoardOverlay.tsx:74-99` — current rendered overlay content and PLAY button.
- `src/styles/game-board-overlay.css:36-57` — fullscreen content container and animation.
- `src/styles/game-board-overlay.css:117-147` — centered PLAY button styling.
- `src/App.tsx:534-545` — overlay display state in the app shell.
- `src/App.tsx:4983-5028` — primary `GameBoardOverlay` render path and props.

## Existing PLAY launch path

The PLAY button behavior is currently simple and should remain byte-for-byte equivalent in behavior during the first implementation PR:

1. User opens the game overlay via mobile Game mode.
2. `App.tsx` renders `<GameBoardOverlay isOpen={showGameBoardOverlay} ... />`.
3. `GameBoardOverlay` renders a `<button>` with `onClick={onPlayClick}`.
4. `App.tsx` supplies `onPlayClick` that:
   - closes the overlay with `setShowGameBoardOverlay(false)`
   - sets `setReopenGameBoardOverlayOnLevelWorldsClose(true)`
   - sets `setLevelWorldsEntryPanel('default')`
   - opens Island Run with `setShowLevelWorldsFromEntry(true)`

Source references:

- `src/components/GameBoardOverlay.tsx:90-97` — PLAY button wiring.
- `src/App.tsx:4986-4991` — launch behavior.
- `src/App.tsx:4749-4755` — overlay reopens after Level Worlds closes when requested.
- `src/App.tsx:1437-1445` and `src/App.tsx:2437-2440` — Game mode/footernav paths that open the overlay.

Hard rule for implementation: keep the `onPlayClick` callback contract intact. Any redesign should wrap additional visual UI around the existing button, not move gameplay launch logic into a new adapter or child component.

## Available data sources

### Island Run / Adventure Journey data

Authoritative Island Run state lives in the Island Run state store, not in the overlay:

- `src/features/gamification/level-worlds/hooks/useIslandRunState.ts:1-16` documents this hook as the single React entry point for authoritative gameplay state.
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:197-327` defines `IslandRunGameStateRecord`.
- Key available fields include:
  - `currentIslandNumber`
  - `cycleIndex`
  - `completedStopsByIsland`
  - `tokenIndex`
  - `dicePool`
  - `essence`
  - `rewardBarProgress`
  - `rewardBarThreshold`
  - `activeTimedEvent`
  - `creatureCollection`
- The persistent table is `island_run_runtime_state` (`src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:329`).
- Island names are available through `getIslandDisplayName()` in `src/features/gamification/level-worlds/services/islandNames.ts:1-137` with 120 named islands.
- `src/features/gamification/level-worlds/services/islandRunProgression.ts:3-13` provides helper logic for required stops and next island on expiry.

Current overlay-level Island Run reads are display-only and local-storage based in `App.tsx`:

- `src/App.tsx:570-594` parses a runtime snapshot and derives:
  - `overlayEssenceBalance`
  - `overlayRewardBarProgress`
  - `overlayRewardBarThreshold`
  - `overlayActiveTimedEventType`
  - `overlayActiveTimedEventExpiresAtMs`
  - `overlayIslandNumber`
  - `overlayIslandDisplayName`
  - `currentIslandBackgroundSrc`
- `src/App.tsx:595-610` derives the overlay island timer label.

Recommended Adventure ladder source for Slice 1: use the existing overlay props already derived in `App.tsx` plus a small read-only adapter that can label completed/current/locked islands from `currentIslandNumber` and `getIslandDisplayName()`. Do not read or write dice, token movement, rewards, or stop completion from the overlay.

### Combined Journey Level data

Combined level/progress already exists as the main gamification profile level, loaded through `useGamification()`:

- `src/App.tsx:811-820` calls `useGamification(supabaseSession)` and receives `levelInfo`, `profile`, XP helpers, and profile refresh.
- `src/hooks/useGamification.ts:61-66` fetches the gamification profile and computes level info from `profileData.total_xp`.
- `src/services/gamification.ts:86-101` computes `currentLevel`, `currentXP`, `xpForCurrentLevel`, `xpForNextLevel`, `xpProgress`, and `progressPercentage`.
- `src/types/gamification.ts:13-30` defines `GamificationProfile` with `total_xp`, `current_level`, `current_streak`, `total_points`, and `zen_tokens`.
- `src/App.tsx:1180-1197` already formats a mobile footer Game status from `levelInfo`, `overlayIslandNumber`, and `overlayIslandDisplayName`.

Recommended Combined Journey source for Slice 1: reuse `levelInfo` and `gamificationProfile` from `App.tsx` as display props. Do not create a new level system. Treat “Combined Journey Level” as a presentation label for existing app XP until product explicitly defines a new progression formula.

### Real Life Journey data

Available real-life data is spread across existing services:

- Goals:
  - `src/services/goals.ts:33-35` uses the `goals` table row/insert/update types.
  - `src/services/goals.ts:86-110` shows goal fields available for local placeholder rows, including `title`, `description`, `target_date`, `status_tag`, `life_wheel_category`, `start_date`, `estimated_duration_days`, `timing_notes`, `why_it_matters`, `priority_level`, and environment fields.
  - `src/services/goals.ts:365` exports `fetchGoals()`.
- Habits:
  - `src/services/habitsV2.ts:37-40` exports `HabitV2Row`, `HabitLogV2Row`, and habit lifecycle types.
  - `src/services/habitsV2.ts:108-146` shows key habit fields available for local placeholder rows, including `title`, `emoji`, `type`, `target_num`, `target_unit`, `goal_id`, `domain_key`, `status`, schedule, environment fields, intent, and duration fields.
  - `src/services/habitsV2.ts:318` exports `listHabitsV2()`.
  - `src/services/habitsV2.ts:659` exports `listHabitLogsForRangeMultiV2()` for completion/log-derived display.
- Aggregated life-signal patterns:
  - `src/features/profile-strength/profileStrengthData.ts:3-10` imports check-ins, goals, habits, journal, vision board, and personality history.
  - `src/features/profile-strength/profileStrengthData.ts:74-87` defines metrics for goal category counts and habit domain counts.
  - `src/features/profile-strength/profileStrengthData.ts:89-124` derives goal coverage/quality/recency.
  - `src/features/profile-strength/profileStrengthData.ts:126-150` derives habit coverage/quality/recency.

Recommended Real Life ladder source for Slice 1: read existing goals and active habits only, then normalize them into display-safe milestone cards. If data is missing, show placeholder milestones such as “Set your first Life Goal” or “Build a 3-day habit streak” without writing new records.

## Proposed visual architecture

The overlay should become a progress overview shell around the existing PLAY button:

### Left column: Real Life Journey ladder

Purpose: show real-world progress without requiring new schema.

Card states:

- Completed: visible real goal/habit milestone with completed styling.
- Current/next: visible by name and reward copy.
- Locked future: solid grey/contour card with `?`, generic title, and no sensitive user details.

Display examples:

- Completed goal: goal title + category + “Milestone reached”.
- Completed habit: habit title + domain + “Habit active” or recent completion count if logs are loaded.
- Next milestone: “Complete 3 check-ins this week” or “Finish: {goal.title}” when enough data exists.
- Locked: grey silhouette card with `?` and “Future real-life milestone”.

### Middle column: Combined Journey Level

Purpose: present the existing gamification XP level as the shared bridge between life progress and Adventure progress.

Content:

- Current level from `levelInfo.currentLevel`.
- XP progress from `levelInfo.xpProgress` and derived XP needed.
- Progress bar from `levelInfo.progressPercentage`.
- Next level reward copy as display-only placeholder first, for example “Next reward: bonus gold / island boost preview”.
- Existing PLAY button remains centered in this column and keeps its current `onPlayClick` behavior.

Important: do not award XP, alter XP formulas, or add level reward grants from this overlay. This is a read-only progress visualization.

### Right column: Adventure Journey ladder

Purpose: show Island Run progress from existing island state.

Card states:

- Completed islands: island number/name for islands before `currentIslandNumber`.
- Current/next island: current island visible by name and display reward copy.
- Locked future islands: grey/contour silhouettes with `?`.

Display examples:

- Completed: “Island 1 · First Light Shore”.
- Current: “Island {currentIslandNumber} · {overlayIslandDisplayName}”.
- Next: `getIslandDisplayName(currentIslandNumber + 1)` when below 120.
- Locked: “?” silhouette card.

For the “reward” text, use display-safe placeholder copy in Slice 1 unless a stable read-only reward metadata service already exists for the intended island milestone. Avoid coupling to dice/economy/reward action services.

## Display adapter plan

Create a read-only adapter layer before changing visual components. The adapter should transform existing data into display models only.

Recommended adapter outputs:

```text
DualJourneyOverlayViewModel
- realLifeLadder: JourneyMilestoneCard[]
- combinedLevel: CombinedJourneyLevelCard
- adventureLadder: JourneyMilestoneCard[]
- playButton: passthrough existing onPlayClick behavior
```

Recommended card shape:

```text
JourneyMilestoneCard
- id
- kind: real_life | adventure
- state: completed | current | next | locked
- title
- subtitle
- rewardLabel
- iconOrSilhouette
- source: goal | habit | island | placeholder
```

Adapter safety rules:

1. Accept already-loaded `levelInfo`, `gamificationProfile`, and overlay island props from `App.tsx`.
2. Load goals/habits through existing services only if the overlay is open and the user is authenticated.
3. Never call Island Run mutation services from the overlay adapter.
4. Never write to `island_run_runtime_state`, `goals`, `habits_v2`, `gamification_profiles`, or reward tables.
5. Missing data must produce placeholders, not errors or blocking spinners.
6. Keep adapter output deterministic and snapshot-testable.
7. Avoid schema changes for Slice 1.

Recommended file placement for implementation:

- `src/components/GameBoardOverlay.tsx` — visual composition only.
- `src/styles/game-board-overlay.css` — responsive layout and card states.
- `src/components/game-board-overlay/dualJourneyOverlayAdapter.ts` or `src/features/gamification/level-worlds/services/dualJourneyOverlayAdapter.ts` — display-only adapter.
- Optional later: `src/components/game-board-overlay/DualJourneyLadder.tsx`, `CombinedJourneyLevelPanel.tsx`, `JourneyMilestoneCard.tsx` if the component gets too large.

## Mobile layout options

### Option A: Three-column desktop/tablet, stacked mobile

- Wide screens: left ladder, middle level/PLAY, right ladder.
- Mobile portrait: middle level/PLAY first, then two ladder sections below as horizontal carousels or compact vertical stacks.
- Lowest risk for accessibility and responsive overflow.

### Option B: Mobile tabbed ladder sections

- Top: Combined Journey Level and PLAY.
- Below: segmented tabs: `Real Life` / `Adventure`.
- Each tab shows its ladder cards.
- Best when vertical space is tight and the footer remains visible.

### Option C: Mobile side-by-side mini rails

- Top: level/progress and PLAY.
- Bottom: two compressed rails side-by-side.
- More visually close to the concept, but higher risk for small screens and card readability.

Recommendation: implement Option A first, with CSS breakpoints that stack the columns. If screen height becomes constrained, degrade to Option B via a follow-up PR.

## Slice plan

### Slice 0 — investigation document

- Create this markdown plan only.
- No runtime code changes.

### Slice 1 — display-only adapter and static overlay composition

Goal: render the dual-ladder concept around the existing PLAY button with placeholder-safe data.

Tasks:

- Add a display-only adapter that accepts existing overlay props and `levelInfo`.
- Add static/placeholder real-life ladder data when goals/habits are not loaded.
- Add Adventure ladder derived only from `overlayIslandNumber` and `getIslandDisplayName()`.
- Add Combined Journey panel derived only from `levelInfo`.
- Render the existing PLAY button in the middle panel using the same prop callback.
- Add CSS for completed/current/next/locked cards.
- Add unit tests for adapter output.

Do not:

- Change Island Run board, dice, movement, rewards, economy, or state actions.
- Add schema/migrations.
- Add XP reward behavior.

### Slice 2 — real goals/habits read integration

Goal: replace placeholder real-life ladder inputs with existing read-only data.

Tasks:

- Load goals via `fetchGoals()` only when overlay opens.
- Load active habits via `listHabitsV2()` only when overlay opens.
- Normalize goals/habits into milestone cards.
- Add empty/loading/error states that still render the PLAY button.
- Ensure data loading cannot block PLAY.

### Slice 3 — richer milestone ordering and rewards copy

Goal: improve ladder meaning without schema changes.

Tasks:

- Define deterministic sorting for goals/habits: completed/on-track/current/next placeholders.
- Use existing goal status and habit lifecycle fields to choose completed/current styling.
- Add display-only reward labels such as “+XP opportunity”, “streak boost”, or “reflection reward” only as preview copy.
- Review whether any reward copy implies a real grant; remove or label “preview” if unclear.

### Slice 4 — mobile polish and accessibility

Goal: make the overlay usable in mobile frame and browser mobile widths.

Tasks:

- Validate safe-area padding and footer overlap.
- Add keyboard/focus order: close/backdrop, PLAY, ladder controls/cards.
- Add `aria-label` or hidden labels for locked `?` cards.
- Test long goal/habit names, no data, one item, many items, Island 120, and demo/no-session states.

### Slice 5 — optional future persistence/schema review

Only consider schema changes after the display concept proves useful.

Possible future additions:

- Persist curated ladder milestones instead of deriving them every render.
- Add explicit real-life milestone completion records.
- Add a product-owned combined journey reward ladder.

Do not include this in the first implementation PR unless product explicitly approves it.

## Testing plan

### Automated tests

Add/keep tests that prove the new overlay is display-only:

- Adapter unit tests:
  - no goals/habits returns placeholder Real Life ladder
  - current island returns completed/current/locked Adventure cards
  - Island 120 does not generate invalid future island labels
  - missing `levelInfo` falls back to Level 1 / 0 XP safely
  - locked cards render `?` and no private data
- Component tests if the repo test setup supports React component rendering:
  - PLAY button remains present and calls `onPlayClick` exactly once
  - clicking locked cards does not call gameplay/economy callbacks
  - loading/error real-life data states still keep PLAY enabled
- Existing Island Run service tests:
  - run `npm run test:island-run` after implementation code changes
  - ensure no failures in roll, reward, progression, state store, lucky roll, and economy tests
- Build:
  - run `npm run build` after implementation code changes

### Manual QA

Required scenarios:

1. Open mobile Game mode overlay.
2. Confirm PLAY launches Island Run exactly as before.
3. Close Island Run and confirm overlay reopen behavior remains as before.
4. Confirm no dice count, token position, reward bar, island number, or current island state changes merely by opening/closing the overlay.
5. Confirm overlay works with:
   - no goals/habits
   - several active goals/habits
   - long goal/habit names
   - current island 1
   - current island 120
   - no authenticated session/demo-safe state
6. Confirm grey/contour locked cards show `?` and do not expose placeholder internals.

### State immutability checks

Before and after opening/closing the overlay without pressing PLAY, compare these Island Run fields:

- `currentIslandNumber`
- `cycleIndex`
- `tokenIndex`
- `dicePool`
- `rewardBarProgress`
- `rewardBarThreshold`
- `essence`
- `completedStopsByIsland`
- `activeTimedEvent`

They should be unchanged.

## Risks and hard constraints

Hard constraints:

- Do not change 120 Island Run gameplay logic.
- Do not change dice/economy/reward logic.
- Keep PLAY behavior intact.
- Treat the overlay as visual/progress display only.
- Use adapter/mock/display-safe placeholders when data is missing.
- Do not introduce schema changes unless a later plan clearly justifies them.

Risks:

- `GameBoardOverlayProps` currently exposes more props than are rendered; wiring new UI could accidentally imply features that are disabled or not live.
- Loading goals/habits in `App.tsx` could increase app-shell complexity; isolate derived display logic in an adapter and only fetch on overlay open.
- Real-life “completed milestone” semantics are not yet canonical. Avoid claiming completion unless based on clear status/log data.
- Reward copy may be mistaken for real grants. Use “preview” or “next reward” copy carefully until reward product rules exist.
- Small mobile screens may not fit three columns. Start with responsive stacking and preserve the PLAY button’s prominence.
- Island Run state has strict architecture warnings; any future implementation must not add new gameplay-state writes or duplicate dice/reward logic in the overlay.

## Recommended first implementation PR

Title: `Add display-only dual journey overlay shell`

Scope:

- Add a display-only adapter for dual journey overlay cards.
- Render three sections in `GameBoardOverlay`:
  - Real Life Journey ladder with placeholders
  - Combined Journey Level using existing `levelInfo`
  - Adventure Journey ladder using existing island display props
- Keep the existing PLAY button callback and behavior unchanged.
- Add CSS for card states and responsive layout.
- Add adapter tests.

Explicitly out of scope:

- Goal/habit writes.
- Island Run gameplay changes.
- Dice/economy/reward changes.
- Schema changes.
- New level formulas or reward grants.

Success criteria:

- PLAY launches Level Worlds/Island Run exactly as before.
- Opening/closing the overlay does not mutate Island Run state.
- The overlay renders useful progress placeholders with no real-life data.
- The overlay enhances with existing island and level data.
- Build and Island Run tests pass after implementation.
