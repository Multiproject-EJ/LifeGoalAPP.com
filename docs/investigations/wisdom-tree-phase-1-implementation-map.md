# Wisdom Tree Phase 1 Implementation Map

## Scope

- Investigation only.
- No code was implemented.
- No migrations were created.
- No gameplay, economy, dice, essence, reward, boss, tile, minigame-ticket, or AI logic was changed.

## PASS/FAIL confidence

**PASS with one product/architecture caveat.**

Phase 1 is feasible as a static, non-AI Wisdom Landmark card encounter that calls the existing stop-completion flow after the player chooses a card option.

**Caveat and recommendation:** the current Wisdom Landmark UI already contains an unfinished diamond-to-essence bonus branch in `IslandRunBoardPrototype.tsx`. For the Phase 1 implementation PR, the recommended path is to replace only the unfinished Wisdom placeholder with the static card encounter and **not** alter the bonus/economy branch unless the PR explicitly includes product approval to retire it. If product requires Wisdom to show only one card encounter, get that approval first and document the existing bonus removal as a deliberate cleanup, not an incidental UI change.

## Current Wisdom Landmark flow

### 1) Where `stopId: 'wisdom'` is defined

- `src/features/gamification/level-worlds/services/islandRunStops.ts:19-37`
  - `IslandStopPlanEntry.stopId` includes `'wisdom'`.
  - `kind` includes `'fixed_wisdom'`.
- `src/features/gamification/level-worlds/services/islandRunStops.ts:97-113`
  - The canonical stop sequence is documented as Hatchery → Habit → Mystery → Wisdom → Boss.
- `src/features/gamification/level-worlds/services/islandRunStops.ts:148-154`
  - The returned Wisdom stop is:
    - `stopId: 'wisdom'`
    - `title: '📖 Wisdom Landmark'`
    - `description: 'A short story, questionnaire, or learning moment to reflect on.'`
    - `kind: 'fixed_wisdom'`
    - `isBehaviorStop: false`

### 2) Where the Wisdom Landmark button is rendered

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:3860-3922`
  - Builds `orbitStopVisuals` from `islandStopPlan`.
  - Each stop becomes an orbit landmark visual with:
    - `id`
    - `label`
    - `state`
    - `stopId`
    - `icon`
    - ticket cost / attention hint fields.
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:8818-8840`
  - Passes `orbitStopVisuals` into `BoardStage`.
  - `onStopClick` calls `handleStopOpenRequest(stopId)`.
- `src/features/gamification/level-worlds/components/board/BoardStage.tsx:78-85`
  - `BoardStage` accepts `orbitStopVisuals`, `activeStopId`, and `onStopClick`.
- `src/features/gamification/level-worlds/components/board/BoardOrbitStops.tsx:47-132`
  - Renders each orbit landmark as a `<button className="island-orbit-stop ...">`.
  - Activates the stop from `onPointerUp` and `onClick`.

### 3) What opens when the Wisdom Landmark is tapped

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:3718-3755`
  - `handleStopOpenRequest(stopId)` is the orbit-stop click dispatcher.
  - It always opens the stop modal, even for locked/ticket states, and surfaces guidance inside the modal.
  - It calls `requestActiveStopTransition(stopId, 'orbit_stop_click')`.
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:2197-2203`
  - `requestActiveStopTransition(...)` sets `activeStopId`.
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:3858`
  - `activeStop` is derived from `activeStopId` and `islandStopPlan`.
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9200-9247`
  - The shared stop modal renders when an `activeStop` exists.
  - It displays title, description, lock/ticket/build/completion banners, and stop-specific content.

### 4) Current Wisdom stop content

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9498-9538`
  - The Wisdom block currently renders for `activeStopId === 'wisdom' && openedStopIsPlayable`.
  - It shows:
    - heading: `📖 Wisdom Stop`
    - generic copy about story/reflection/questionnaire content
    - a diamond-to-essence bonus branch when the player has enough diamonds
    - an “Open Wisdom Placeholder” secondary button.
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9503-9527`
  - Existing caveat: the bonus branch directly adjusts diamonds/essence React/runtime mirrors and completes the stop.
  - Do **not** build Phase 1 on this path.
  - Phase 1 should replace only the unfinished placeholder unless product explicitly approves retiring this existing bonus branch as a deliberate economy/UX cleanup.
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9530-9535`
  - The current placeholder button opens `resolveIslandRunPlaceholderDescriptor('wisdom_stop_unfinished')`.

### 5) How a stop is completed today

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:7008-7176`
  - `handleCompleteActiveStop()` owns stop objective completion.
  - It:
    1. Requires `activeStopId`.
    2. Checks ticket/completion blockers with `getStopCompletionBlockReason(...)`.
    3. In Contract V2 mode, verifies the selected stop is the active stop.
    4. Marks the objective complete via `applyStopObjectiveProgress(...)`.
    5. Calls `setRuntimeState(nextRuntimeState)` with the returned canonical record.
    6. Awards existing stop-completion shards if the objective was not already complete.
    7. For non-boss stops, calls `updateCompletedStopsWithSync(...)`, clears mystery reward state, sets landing text, and closes the modal with `setActiveStopId(null)`.
- `src/features/gamification/level-worlds/services/islandRunStopCompletion.ts:69-111`
  - `getStopCompletionBlockReason(...)` blocks missing hatchery egg, unresolved boss, or unpaid ticket.
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
  - `applyStopObjectiveProgress(...)` is the canonical action service used by `handleCompleteActiveStop`.

### 6) Which callback/action should mark Wisdom complete

For Phase 1, the Wisdom Tree component should **not** write gameplay state. It should call a parent callback such as `onComplete(message)` after the player selects a choice.

The parent callback in `IslandRunBoardPrototype.tsx` should:

1. Set cozy landing text if desired.
2. Call the existing `handleCompleteActiveStop()`.

This mirrors existing Mystery-stop patterns:

- Breathing: `setLandingText(...); handleCompleteActiveStop();`
  - `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9414-9417`
- Action challenge: `setLandingText(...); handleCompleteActiveStop();`
  - `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9431-9434`
- Reflection composer: `onSaved` sets landing text then calls `handleCompleteActiveStop()`.
  - `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9441-9448`

## Exact safest files to touch for Phase 1

### Recommended touch set

1. `src/features/gamification/level-worlds/services/wisdomTreeCards.ts` **(new)**
   - Static handcrafted card library.
   - Deterministic card picker by island number.
   - Pure TypeScript only.
   - No AI, network, Supabase, gameplay writes, or economy logic.

2. `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.tsx` **(new)**
   - Presentational interactive card encounter.
   - Owns only UI-local state:
     - selected choice id
     - reveal/response state
     - optional journal note if Phase 1 includes journal save.
   - Calls `onComplete(...)`; does not call Island Run services directly.

3. `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
   - Import `WisdomTreeCardEncounter`.
   - Replace the current playable Wisdom placeholder area with the card component.
   - Pass:
     - selected static card
     - `islandNumber`
     - `onComplete={(message) => { setLandingText(message); handleCompleteActiveStop(); }}`
   - Do not add new gameplay writes.
   - Do not touch dice/essence/reward/boss/tile logic.

4. `src/features/gamification/level-worlds/LevelWorlds.css`
   - Add `.wisdom-tree-*` classes.
   - Reuse existing modal/button styling where possible.
   - Keep safe-area behavior consistent with `.island-stop-modal` and the Island Run shell.

### Optional touch set

5. `src/features/gamification/level-worlds/services/__tests__/wisdomTreeCards.test.ts` **(new, optional but recommended)**
   - Tests deterministic card selection.
   - Tests each card has 2–3 choices and a valid category.
   - Tests no duplicate choice IDs per card.

6. `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.test.tsx` **(only if component test infrastructure already exists)**
   - Only add if there is already a supported React test pattern in the repo.
   - Do not introduce new test libraries for this PR.

## Exact files NOT to touch

### Dice / movement / roll

- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts`
- `src/features/gamification/level-worlds/services/islandRunContractV2Energy.ts`
- `src/features/gamification/level-worlds/services/islandRunEconomy.ts`

### Essence / build / reward bar

- `src/features/gamification/level-worlds/services/islandRunContractV2EssenceBuild.ts`
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts`
- `src/features/gamification/level-worlds/services/islandRunEventEngine.ts`
- `src/features/gamification/level-worlds/services/islandRunClaimRewardAction.ts`

### Runtime state schema / persistence

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts`
- `src/features/gamification/level-worlds/services/islandRunCommitActionService.ts`
- Any `supabase/migrations/**`

### Boss / minigames / tickets

- `src/features/gamification/level-worlds/services/bossService.ts`
- `src/features/gamification/level-worlds/services/islandRunBossEncounter.ts`
- `src/features/gamification/level-worlds/services/islandRunMinigameService.ts`
- `src/features/gamification/level-worlds/services/islandRunMinigameLauncherService.ts`
- `src/features/gamification/level-worlds/services/minigameTicketStore.ts` if present; otherwise do not touch `src/services/minigameTicketStore.ts`.
- `supabase/functions/create-checkout-session-minigame-ticket/index.ts`

### Tiles / encounters / board topology

- `src/features/gamification/level-worlds/services/islandBoardTileMap.ts`
- `src/features/gamification/level-worlds/services/islandBoardLayout.ts`
- `src/features/gamification/level-worlds/services/encounterService.ts`
- `src/features/gamification/level-worlds/components/board/BoardStage.tsx`
- `src/features/gamification/level-worlds/components/board/BoardOrbitStops.tsx`

### AI services / endpoints

- `src/services/aiTaskRouting.ts`
- `src/services/aiEntitlementService.ts`
- `src/services/aiQuotaService.ts`
- `src/services/aiSettings.ts`
- `src/services/habitAiSuggestions.ts`
- `src/services/environmentAiSuggestions.ts`
- `supabase/functions/suggest-goal/index.ts`
- `supabase/functions/goal-coach-chat/index.ts`
- Any new AI function or OpenAI call.

## Modal/component design

### Recommended component name

`WisdomTreeCardEncounter`

### Recommended mount point

Mount inside the existing shared stop modal in `IslandRunBoardPrototype.tsx`, specifically in the current Wisdom block:

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9498-9538`

Do not mount a separate full-screen modal for Phase 1. The stop modal already handles locked/ticket/open states and is already opened by the orbit landmark flow.

### Recommended props

```ts
type WisdomTreeCardEncounterProps = {
  card: WisdomTreeCard;
  islandNumber: number;
  onComplete: (message: string) => void;
  onClose?: () => void;
};
```

If optional journal save is included:

```ts
type WisdomTreeCardEncounterProps = {
  card: WisdomTreeCard;
  islandNumber: number;
  userId: string;
  onComplete: (message: string) => void;
  onJournalSaved?: (message: string) => void;
};
```

### Recommended local state shape

```ts
type WisdomTreeEncounterState = {
  selectedChoiceId: string | null;
  phase: 'choosing' | 'revealed';
  journalNote: string;
  isSavingJournal: boolean;
  journalError: string | null;
};
```

For the strict Phase 1 MVP with no journal save:

```ts
type WisdomTreeEncounterState = {
  selectedChoiceId: string | null;
  phase: 'choosing' | 'revealed';
};
```

### Close and completion behavior

- Before a choice:
  - The existing modal close/back action can close the stop modal without progress.
- After a choice:
  - Reveal the response copy.
  - Show a primary CTA such as `Carry this wisdom onward`.
  - CTA calls `onComplete(message)`.
- Parent behavior:
  - `setLandingText(message)`
  - `handleCompleteActiveStop()`
- Component must not import or call:
  - `applyStopObjectiveProgress`
  - `persistIslandRunRuntimeStatePatch`
  - any economy/tile/reward actions.

## Static content model

Recommended static TypeScript shape:

```ts
export type WisdomTreeCategory =
  | 'Flame'
  | 'Hearth'
  | 'Tide'
  | 'Storm'
  | 'Bloom'
  | 'Mirror';

export type WisdomTreeChoice = {
  id: string;
  label: string;
  response: string;
};

export type WisdomTreeCard = {
  id: string;
  category: WisdomTreeCategory;
  title: string;
  storyLine: string;
  choices: WisdomTreeChoice[];
  journalPrompt?: string;
};
```

Recommended card-library helper:

```ts
export function getWisdomTreeCardForIsland(islandNumber: number): WisdomTreeCard;
```

Selection rules:

- Deterministic by island number for stable QA.
- No random live generation.
- No localStorage.
- No persistence.
- No player profile reads in Phase 1.
- Each card should have 2–3 choices.

## Optional journal save investigation

### Recommendation

**Defer optional journal save from the first Phase 1 PR.**

Reason:

- The playable goal only requires a card choice and normal stop completion.
- Adding journal save increases UI state, async error handling, and user decision time.
- The existing Mystery reflection composer already covers journal-style Island Run reflection.
- Deferring keeps Phase 1 small, reversible, and focused on replacing the unfinished Wisdom placeholder.

### If journal save is included in a follow-up

Reuse:

- `src/features/gamification/level-worlds/components/IslandRunReflectionComposer.tsx:95-134`
  - Existing pattern for `createJournalEntry(...)`.
- `src/services/journal.ts`
  - Existing Supabase/demo/offline journal service.

Recommended tags:

- `island-run`
- `wisdom-tree`
- `wisdom-landmark`
- `island-${islandNumber}`
- `wisdom-${card.category.toLowerCase()}`

Failure behavior:

- Journal save failure must not block stop completion.
- Show inline message: “Could not save the note, but your Wisdom card is complete.”
- Never retry automatically in a loop.
- Never write journal state into Island Run runtime state.

## Mobile UX recommendation

### Safe-area behavior

Reuse current stop modal shell:

- `src/features/gamification/level-worlds/LevelWorlds.css:2887-2900`
  - `.island-stop-modal-backdrop` is fixed, centered, scrollable, and uses backdrop blur.
- `src/features/gamification/level-worlds/LevelWorlds.css:2902-2917`
  - `.island-stop-modal` is width-limited, scrollable, and max-height constrained.
- `src/features/gamification/level-worlds/LevelWorlds.css:20-32`
  - Island Run shell already uses `100dvh` and `env(safe-area-inset-*)`.

Phase 1 should add content classes inside the existing modal rather than adding a new modal layer.

### CSS patterns to reuse

- Buttons:
  - `.island-stop-modal__btn`
  - `.island-stop-modal__btn--action`
  - `.island-stop-modal__btn--primary`
  - `.island-stop-modal__btn--secondary`
- Action rows:
  - `.island-stop-modal__actions`
  - `.island-stop-modal__actions--balanced`
  - `.island-stop-modal__actions--aligned`
  - `.island-stop-modal__actions--anchored`
- Card container:
  - `.island-hatchery-card` as a structural precedent, but add dedicated `.wisdom-tree-card` classes for visual identity.

### Animation/reveal patterns to copy

Best fit:

- `ShardClaimModal`
  - `src/features/gamification/level-worlds/components/ShardClaimModal.tsx:15-57`
  - `src/features/gamification/level-worlds/LevelWorlds.css:1198-1244`
  - Copy the gentle shimmer/pop idea, not the reward framing.

Secondary inspiration:

- `CreatureHatchRevealModal`
  - `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx:22-56`
  - Good for magical reveal card composition.

Do not use for Phase 1:

- `ScratchCardReveal`
  - `src/features/gamification/daily-treats/ScratchCardReveal.tsx`
  - It is tactile and fun, but introduces canvas/pointer complexity unnecessary for Phase 1.

## Exact implementation sequence

1. **Add static card library**
   - Create `wisdomTreeCards.ts`.
   - Add category/card/choice types.
   - Add 6–12 handcrafted cards.
   - Add deterministic `getWisdomTreeCardForIsland(islandNumber)`.

2. **Add presentational encounter component**
   - Create `WisdomTreeCardEncounter.tsx`.
   - Render card category, title, story line, and 2–3 choice buttons.
   - On choice, reveal response.
   - Final CTA calls `onComplete(...)`.

3. **Integrate into Wisdom stop**
   - In `IslandRunBoardPrototype.tsx`, import component and card selector.
   - In the `activeStopId === 'wisdom' && openedStopIsPlayable` block, render the card encounter.
   - Parent `onComplete` sets landing text and calls `handleCompleteActiveStop()`.

4. **Add CSS**
   - Add `.wisdom-tree-card-*` classes to `LevelWorlds.css`.
   - Reuse existing modal button/action classes.
   - Include reduced-motion-safe reveal animation.

5. **Add pure service tests if practical**
   - Test card library invariants.
   - Avoid adding new test tools.

6. **Validate**
   - Run build/tests/guards listed below.

## Open questions / blockers

1. **Current Wisdom essence bonus**
   - The existing Wisdom stop includes a diamond-to-essence bonus branch.
   - Phase 1 requirements say no reward mechanics.
   - Decision needed:
     - Keep it untouched and accept that Wisdom is not purely one card encounter yet; or
     - Explicitly approve retiring/hiding that unfinished bonus path as part of the Phase 1 PR.

2. **Journal save timing**
   - Recommendation is to defer.
   - If product wants it immediately, define whether completion happens before or after save.

3. **Card count for MVP**
   - Minimum playable: 6 cards, one per category.
   - Better first PR: 12 cards for less repetition across 120 islands.

4. **Content approval**
   - Copy should be reviewed for cozy, non-clinical tone before implementation.

## Risk list

1. **Accidental gameplay write**
   - Mitigation: component only calls `onComplete`; parent uses existing `handleCompleteActiveStop`.
2. **Economy regression**
   - Mitigation: do not touch dice, essence, reward bar, ticket, boss, or tile files.
3. **Existing Wisdom bonus conflict**
   - Mitigation: product decision before implementation; do not quietly alter economy behavior.
4. **Modal overflow on mobile**
   - Mitigation: reuse existing stop modal shell and scroll behavior.
5. **Content feels too clinical**
   - Mitigation: handcrafted copy reviewed against Wisdom Tree UX doc.
6. **Stop completion blocked by ticket/sequence**
   - Mitigation: mount only under `openedStopIsPlayable`; keep existing lock/ticket modal copy.
7. **Source-guard brittleness**
   - Mitigation: small edit in Wisdom block only; do not move build/roll/essence functions.

## Recommended PR scope

### Include

- Static card library.
- Wisdom Tree card component.
- Minimal integration inside the existing Wisdom stop modal.
- CSS for card layout/reveal.
- Optional pure tests for card library.

### Exclude

- AI calls.
- Supabase migrations.
- New tables.
- New runtime state fields.
- Dice/essence/reward changes.
- Boss/minigame/ticket changes.
- Journal save in the first PR unless explicitly requested.
- Feature gating unless product wants a hidden/demo rollout first.

## Validation checklist

Run these for the implementation PR:

1. Install dependencies if needed:
   - `npm ci`
2. Build:
   - `npm run build`
3. Island Run service tests:
   - `npm run test:island-run`
4. Architecture guards:
   - `npm run check:island-run-architecture-guards`
5. Diff whitespace check:
   - `git --no-pager diff --check`

If only the documentation map changes, `git --no-pager diff --check` is sufficient locally, plus the repository's standard automated PR review/security scan; CodeQL is expected to skip documentation-only changes as trivial.

## Recommended Phase 1 PR

The implementation PR should include:

- Add `src/features/gamification/level-worlds/services/wisdomTreeCards.ts`.
- Add `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.tsx`.
- Add `.wisdom-tree-*` styles in `src/features/gamification/level-worlds/LevelWorlds.css`.
- Update only the Wisdom stop content block in `IslandRunBoardPrototype.tsx`.
- Render one static card for the current island.
- Let the player choose one of 2–3 options.
- Reveal a short cozy response.
- Complete the Wisdom stop by calling the existing parent callback that runs `handleCompleteActiveStop()`.
- Add pure card-library tests if they fit existing test tooling.

The implementation PR should **not** include:

- Any AI call or AI endpoint.
- Any Supabase migration or table.
- Any new Island Run runtime-state field.
- Any direct UI call to `persistIslandRunRuntimeStatePatch`.
- Any dice, essence, reward-bar, shard, boss, tile, ticket, or minigame logic change.
- Any infinite chat or regeneration loop.
- Any journal save unless explicitly approved as part of the same PR.
- Any broad refactor of `IslandRunBoardPrototype.tsx` outside the Wisdom block.
