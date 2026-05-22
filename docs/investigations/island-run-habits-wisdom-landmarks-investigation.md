# Island Run Investigation: Habits + Wisdom Landmarks (120-island mode)

Date: 2026-05-22  
Scope: Investigation-only (no gameplay/storage/economy changes)

## 1) File map

### 1.1 Where the 120-island landmark definitions live
- Canonical 5-stop landmark plan (Hatchery → Habit → Mystery → Wisdom → Boss) is generated in `generateIslandStopPlan` in `src/features/gamification/level-worlds/services/islandRunStops.ts`.
- This file also defines stop IDs, stop kinds, and Mystery content rotation.

### 1.2 Where landmark/stop types are defined
- Stop IDs and `IslandStopPlanEntry` are defined in `islandRunStops.ts`.
- Contract-v2 stop types/statuses (`active`, `ticket_required`, etc.) are defined in `islandRunContractV2StopResolver.ts`.

### 1.3 Where Habits and Wisdom are configured
- **Habit landmark** configuration (title/description/kind `fixed_habit`) is in `islandRunStops.ts`.
- **Wisdom landmark** configuration (title/description/kind `fixed_wisdom`) is in `islandRunStops.ts`.
- Wisdom encounter content cards are defined in `wisdomTreeCards.ts` and selected per island via modulo indexing (`getWisdomTreeCardForIsland`).
- Habit stop modal content/placeholder rendering is in `IslandRunBoardPrototype.tsx`.

### 1.4 Where landmark progress/build state is stored
- Active authoritative gameplay record is `IslandRunGameStateRecord` in `islandRunStateStore.ts` (read via `useIslandRunState`).
- Landmark progression data includes:
  - `stopStatesByIndex` (objective + build completion state)
  - `stopBuildStateByIndex` (build-level spend progress)
  - `completedStopsByIsland`
  - `stopTicketsPaidByIsland`
- Stop completion helper/guard logic lives in `islandRunStopCompletion.ts`.

### 1.5 Where click/open/build/complete actions are handled
- Stop tap/open routing and modal opening: `handleStopOpenRequest` in `IslandRunBoardPrototype.tsx`.
- Ticket payment flow: `handlePayStopTicket` (UI), `payStopTicket` (service), and `applyStopTicketPayment` (canonical store action).
- Stop completion flow: `handleCompleteActiveStop` and `applyStopObjectiveProgress`.
- Wisdom-specific interaction callback: `WisdomTreeCardEncounter` → `onComplete` callback in board prototype.

---

## 2) Current behavior

## 2.1 Habit landmark

- **What it is**
  - Stop 2 / index 1 in the canonical plan; `stopId: 'habit'`, `kind: 'fixed_habit'`, marked `isBehaviorStop: true`.

- **What opens when tapped**
  - Tapping opens the stop modal through common stop tap routing.
  - If stop is playable, the Habit section shows placeholder copy and an “Open Habit Placeholder” button.

- **Build/upgrade/complete requirements**
  - Opening requires prior stop objective completion + ticket payment rules (same shared stop-ticket system as other non-hatchery stops).
  - Completion uses shared `handleCompleteActiveStop` path; blocked if ticket unpaid or if not currently active stop under contract-v2 sequencing.

- **Rewards/economy effects**
  - On first objective completion via contract-v2, shared stop-complete reward path awards shard rewards (`awardShards('stop_complete')` and wallet shard increment).
  - No direct habit-specific essence/diamond/dice conversion logic found in the Habit modal segment itself.

- **Real data integration vs presentational**
  - Current Habit landmark modal is explicitly placeholder/presentational in-board.
  - No direct query/check against live habits tables in this modal flow.

- **Per-island uniqueness**
  - Habit landmark is a fixed template in all islands (same stop type/title/placeholder behavior).

## 2.2 Wisdom landmark

- **What it is**
  - Stop 4 / index 3 in canonical plan; `stopId: 'wisdom'`, `kind: 'fixed_wisdom'`.

- **What opens when tapped**
  - Tapping opens shared stop modal.
  - When playable, renders `WisdomTreeCardEncounter` with an island-selected wisdom card.

- **Build/upgrade/complete requirements**
  - Opening uses same ticket and sequence rules as other non-hatchery stops.
  - Completion is achieved by selecting a WisdomTree choice and clicking “Carry this wisdom onward,” which calls board `onComplete` and then shared `handleCompleteActiveStop`.

- **Rewards/economy effects**
  - Base stop completion path includes shared stop-complete shard rewards.
  - Additional Wisdom-only optional CTA: spend diamonds for essence bonus (`WISDOM_ESSENCE_BONUS_COST_DIAMONDS` -> `WISDOM_ESSENCE_BONUS_AMOUNT`) then complete stop.
  - **Important risk:** this Wisdom bonus updates runtime essence via direct `setRuntimeState` in UI instead of canonical action service.

- **Real data integration vs presentational**
  - Wisdom content is game-local card text + choices from static `WISDOM_TREE_CARDS`; no persistence into journal/knowledge store in this path.

- **Per-island uniqueness**
  - Wisdom uses reusable card templates; island number selects card by deterministic modulo, so islands rotate through fixed pool rather than unique authored content per island.

---

## 3) State flow trace (tap → UI → action → persistence → visual)

## 3.1 Habit landmark flow
1. User taps Habit orbit landmark button.  
2. `handleStopOpenRequest(stopId)` resolves lock/ticket state and opens modal focus.  
3. If playable, Habit placeholder UI renders with “Open Habit Placeholder” CTA.  
4. User eventually triggers shared complete action (`handleCompleteActiveStop`) from the stop flow.  
5. `handleCompleteActiveStop` enforces:
   - ticket paid check via `getStopCompletionBlockReason`
   - active-stop-only progression via `resolveCanonicalContractV2Stops`  
6. It updates `stopStatesByIndex` objective completion through canonical action `applyStopObjectiveProgress(...)`.  
7. Store commit path goes through `commitIslandRunState` in state store action pipeline.  
8. React state (`setRuntimeState`) updates UI chips/modal/landmark state.

## 3.2 Wisdom landmark flow
1. User taps Wisdom orbit landmark button -> same `handleStopOpenRequest`.  
2. Wisdom modal renders `WisdomTreeCardEncounter`.  
3. In encounter component, user picks a choice (`handleChoiceSelect` local UI state), then taps “Carry this wisdom onward.”  
4. Parent `onComplete` callback in board sets landing text and calls `handleCompleteActiveStop`.  
5. Shared stop completion action path executes canonical `applyStopObjectiveProgress` + store commit.  
6. Visual state updates via board/runtime state rerender.

### Wisdom optional bonus side-path
- In Wisdom modal, optional bonus CTA spends diamonds and increments essence directly in component `setRuntimeState` (legacy/direct UI mutation pattern), then calls completion.

---

## 4) Architecture risks against migration guardrails

## 4.1 Direct UI gameplay writes
- **Ticket payment path:** largely migrated to canonical action (`applyStopTicketPayment`).
- **Stop objective completion:** uses canonical action (`applyStopObjectiveProgress`).
- **Risk found:** Wisdom bonus CTA directly mutates gameplay essence in UI (`setRuntimeState({...essence...})`) rather than using canonical `islandRunStateActions` service.

## 4.2 Canonical migration alignment (IslandRunGameStateRecord/store/action)
- Habits/Wisdom open/complete progression mostly aligns with contract-v2 stop resolver + actions.
- There is still mixed authority in `IslandRunBoardPrototype.tsx` (component-local writes + canonical actions coexisting), matching known migration-phase reality.

## 4.3 Legacy completion rule dependency
- Completion checks still include compatibility helpers (`completedStopsByIsland`, hatchery-effective completion helper behavior), while contract-v2 uses `stopStatesByIndex` objective flags.
- No new custom legacy rule appears specific to Habit/Wisdom; they rely on shared completion helpers.

## 4.4 Duplicated logic
- Habit and Wisdom both rely on shared modal/stop completion pipelines.
- Wisdom has an extra local economy side-path (diamond->essence bonus) not abstracted into shared service, increasing divergence risk vs other landmark types.

---

## 5) Product/design notes for future “more meaningful” improvements (safe guidance only)

## 5.1 Safest: visual-only improvements
- Improve card visuals, iconography, copy tone, and micro-animations in Habit/Wisdom modal sections without changing state/action/economy logic.
- Keep completion trigger contract unchanged (`handleCompleteActiveStop` callbacks).

## 5.2 Safe modal/copy improvements
- Replace placeholder wording with clearer UX education text.
- Add non-functional progress hints (“complete in app” instructions) without changing completion backend logic.

## 5.3 Moderate-risk (still feasible) content-linking
- Habit landmark could surface read-only snapshot of today’s real habit data (counts, names) if strictly display-only first.
- Wisdom could offer optional “save to journal” entry path if implemented through existing journal services and only after explicit UX acceptance.

## 5.4 Higher-risk changes (defer / separate PRs)
- Any changes that alter ticket costs, reward amounts, or completion criteria.
- Any automatic completion linkage to real habits/journal that changes progression semantics.
- Any mutation-path refactor touching store action ordering, runtime migrations, or persistence layers.

---

## 6) Final recommendations

### PASS/FAIL for “safe to cosmetically improve”
- **PASS (with constraints).** Cosmetic/UI/copy updates for Habit and Wisdom appear safe **if** no gameplay mutation paths, ticket/economy math, or completion criteria are changed.

### “Do not touch” list
- `islandRunStopTickets.ts` ticket cost curve and payment preconditions.
- `islandRunContractV2StopResolver.ts` sequencing semantics.
- `applyStopObjectiveProgress` / `applyStopTicketPayment` canonical commit path.
- Storage schema/state shape fields (`stopStatesByIndex`, `completedStopsByIsland`, `stopTicketsPaidByIsland`, build state).
- Supabase/runtime migrations and persistence wiring.

### Suggested next PR slices (safest → riskiest)
1. **UI-only copy/layout pass** for Habit/Wisdom modal sections in board prototype.
2. **Wisdom encounter polish** (animation/wording/accessibility) with no economy/state changes.
3. **Read-only real-data preview** in Habit modal (display today habit names/count only).
4. **Migration hygiene PR**: move Wisdom diamond->essence bonus into canonical action service while preserving exact economy values.
5. **Real objective integration PR**: enforce Habit/Wisdom completion based on real app actions/content (highest risk).

### Exact files inspected
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/features/gamification/level-worlds/services/islandRunStops.ts`
- `src/features/gamification/level-worlds/services/wisdomTreeCards.ts`
- `src/features/gamification/level-worlds/services/islandRunStopTickets.ts`
- `src/features/gamification/level-worlds/services/islandRunStopCompletion.ts`
- `src/features/gamification/level-worlds/services/islandRunContractV2StopResolver.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
- `src/features/gamification/level-worlds/hooks/useIslandRunState.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.tsx`
- `src/features/gamification/level-worlds/services/islandRunProgression.ts`

### Exact validation commands run
- `npm run build`
