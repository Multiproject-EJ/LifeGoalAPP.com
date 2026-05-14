# Island Run First-Session Onboarding Implementation Plan

Status: **planning only**. Do not implement gameplay code, UI code, migrations, or schema changes from this document until a follow-up implementation PR is explicitly requested.

## 1. Goal

Combine two first-session onboarding investigations into one coherent Island Run flow:

1. First-time deterministic Island 1 roll that lands on an essence tile.
2. Essence reward that grants exactly enough essence to build hatchery L1.
3. Guided hatchery L1 build with only the Build affordance emphasized.
4. Post-build celebration/reward.
5. Normal early Island 1 rolling.
6. Low-dice rescue hook that opens a first Creature Pack only after the hatchery tutorial is complete.
7. Four-card reveal in a 2-by-2 layout.
8. Guaranteed +100 dice pack bonus.
9. First pack marked claimed.
10. Normal gameplay continues.

The two features should share one persisted tutorial state machine and one canonical action approach. UI should only render state and dispatch canonical actions.

## 2. Product sequence

Final first-session sequence:

1. Brand-new player enters Island Run.
2. Runtime tutorial state enters the first-roll tutorial path.
3. First roll is deterministic and lands on a configured essence tile.
4. Essence reward grants exactly the amount required to afford hatchery L1.
5. Roll/tile reward UI resolves.
6. Board UI highlights the Build button only.
7. Player opens the Build modal.
8. Player builds hatchery to L1.
9. Canonical build action records hatchery L1 completion and advances tutorial state.
10. UI shows hatchery L1 celebration/reward.
11. Player dismisses celebration and continues normal Island 1 rolling.
12. After the hatchery tutorial is complete, each completed roll evaluates the low-dice rescue gate.
13. When dice reaches the configured low threshold while the player can still afford the next roll, the first Creature Pack becomes eligible.
14. UI shows the first Creature Pack prompt.
15. Player opens the pack.
16. Canonical pack action resolves and persists the 4-card pack contents, grants creatures, grants +100 dice, and marks the pack claimed.
17. UI animates the pack opening and reveals 4 cards in a 2-by-2 layout.
18. UI shows +100 dice as a guaranteed bonus line.
19. Player continues normal gameplay.

## 3. Final tutorial state machine

Use a single persisted tutorial state machine for the whole first-session Island 1 flow. The state machine should live in Island Run runtime state, not in component state, localStorage-only UI flags, or the existing broad `firstRunClaimed` marker.

The state machine should be monotonic for completed milestones. It may have transient UI presentation statuses, but reward grants must be idempotent and tied to persisted grant records.

### 3.1 Exact suggested tutorial states

Top-level state field:

- `not_started`
- `enter_island_pending`
- `first_roll_ready`
- `first_roll_in_progress`
- `first_essence_reward_pending`
- `first_essence_reward_claimed`
- `hatchery_build_prompt_ready`
- `hatchery_build_modal_opened`
- `hatchery_l1_build_in_progress`
- `hatchery_l1_built`
- `hatchery_l1_celebration_pending`
- `hatchery_l1_celebration_seen`
- `normal_rolls_before_pack`
- `first_pack_eligible`
- `first_pack_prompt_seen`
- `first_pack_opening`
- `first_pack_revealed`
- `first_pack_claimed`
- `completed`
- `skipped`

Recommended transition summary:

| From | To | Trigger |
|---|---|---|
| `not_started` | `enter_island_pending` | brand-new player enters Island Run and tutorial feature is enabled |
| `enter_island_pending` | `first_roll_ready` | Island 1 runtime state is hydrated and safe to roll |
| `first_roll_ready` | `first_roll_in_progress` | player taps Roll |
| `first_roll_in_progress` | `first_essence_reward_pending` | deterministic roll lands and tile reward is ready |
| `first_essence_reward_pending` | `first_essence_reward_claimed` | canonical essence grant commits |
| `first_essence_reward_claimed` | `hatchery_build_prompt_ready` | reward UI settles |
| `hatchery_build_prompt_ready` | `hatchery_build_modal_opened` | player opens Build modal |
| `hatchery_build_modal_opened` | `hatchery_l1_build_in_progress` | player confirms hatchery L1 build |
| `hatchery_l1_build_in_progress` | `hatchery_l1_built` | canonical build action commits |
| `hatchery_l1_built` | `hatchery_l1_celebration_pending` | build success result returns to UI |
| `hatchery_l1_celebration_pending` | `hatchery_l1_celebration_seen` | player dismisses celebration |
| `hatchery_l1_celebration_seen` | `normal_rolls_before_pack` | UI unblocks normal rolling |
| `normal_rolls_before_pack` | `first_pack_eligible` | low-dice rescue gate passes after a roll |
| `first_pack_eligible` | `first_pack_prompt_seen` | prompt is rendered or explicitly acknowledged |
| `first_pack_prompt_seen` | `first_pack_opening` | player taps Open Pack |
| `first_pack_opening` | `first_pack_revealed` | canonical pack action commits and reveal UI starts |
| `first_pack_revealed` | `first_pack_claimed` | player continues from reveal |
| `first_pack_claimed` | `completed` | tutorial has no remaining first-session steps |
| any pre-`completed` state | `skipped` | player is not eligible, already progressed beyond safe tutorial assumptions, feature is disabled before flow start, or recovery cannot safely continue without retroactive grants |

### 3.2 Recovery states

Include recovery semantics instead of relying on UI assumptions:

- If refresh occurs during `first_roll_in_progress`, recompute from persisted dice, token index, and tutorial roll result fields.
- If refresh occurs during `first_essence_reward_pending`, either show the reward pending UI or complete an idempotent canonical claim.
- If refresh occurs during `hatchery_l1_build_in_progress`, read persisted stop/build state and move to `hatchery_l1_built` or back to `hatchery_build_modal_opened`.
- If refresh occurs during `first_pack_opening`, use persisted pack contents and claim status to move to `first_pack_revealed`.
- If the player no longer qualifies for tutorial gating because of existing progressed state, move to `skipped` or `completed` without granting retroactive rewards.

## 4. Persisted fields needed

Add one persisted runtime field in PR 1 of the implementation sequence, preferably a JSON object on the Island Run runtime record:

- `tutorialState`

Suggested shape:

- `tutorialState.version`
- `tutorialState.flowId`
- `tutorialState.status`
- `tutorialState.startedAtMs`
- `tutorialState.completedAtMs`
- `tutorialState.skippedAtMs`
- `tutorialState.skipReason`
- `tutorialState.currentStep`
- `tutorialState.firstRoll`
  - `status`
  - `targetTileIndex`
  - `targetTileKind`
  - `dieOne`
  - `dieTwo`
  - `total`
  - `startedAtMs`
  - `resolvedAtMs`
- `tutorialState.firstEssenceReward`
  - `status`
  - `essenceAmount`
  - `claimedAtMs`
- `tutorialState.hatcheryBuild`
  - `status`
  - `targetIslandNumber`
  - `targetStopIndex`
  - `targetLevel`
  - `requiredEssence`
  - `modalOpenedAtMs`
  - `builtAtMs`
  - `celebrationSeenAtMs`
- `tutorialState.firstCreaturePack`
  - `status`
  - `packId`
  - `seed`
  - `creatureIds`
  - `diceBonus`
  - `eligibleAtMs`
  - `promptSeenAtMs`
  - `openedAtMs`
  - `revealedAtMs`
  - `claimedAtMs`
- `tutorialState.featureFlagsSnapshot`
  - `islandRunFirstSessionOnboardingEnabled`
  - `islandRunDeterministicFirstRollEnabled`
  - `islandRunGuidedHatcheryBuildEnabled`
  - `islandRunFirstCreaturePackEnabled`
  - `islandRunFirstPackLowDiceRescueEnabled`

Persist the field alongside existing Island Run runtime state so the same canonical commit can update dice, essence, stop/build state, creature collection, and tutorial milestones atomically when needed.

Do not persist authoritative tutorial progression in:

- React component local state.
- localStorage-only UI flags.
- creature collection entries.
- `firstRunClaimed`.
- profile-level `onboarding_complete`.

## 5. Canonical action boundaries

All gameplay-affecting transitions should happen through canonical action services and the Island Run action mutex.

### 5.1 `startFirstSessionTutorial`

Purpose:

- Initializes `tutorialState` for eligible brand-new Island 1 players.
- Does not grant currencies.
- Does not roll.
- Idempotently returns existing state if already started, completed, or skipped.

### 5.2 `executeIslandRunRollAction` with tutorial override

Purpose:

- Keeps rolling authority in the roll action path.
- Allows the first tutorial roll to use persisted deterministic dice results or a deterministic target resolver.
- Spends dice through the normal dice path.
- Persists token movement and tutorial first-roll result together.

Guardrails:

- Only active when `tutorialState.currentStep === 'first_roll_ready'`.
- Only active on Island 1, cycle 0, brand-new state.
- Must not introduce deterministic behavior for normal rolls.

### 5.3 `claimFirstEssenceTutorialReward`

Purpose:

- Grants exactly the essence required to build hatchery L1.
- Updates essence lifetime earned if the economy contract requires it.
- Advances tutorial state to the build prompt.
- Commits through the same canonical state path as other reward grants.

Guardrails:

- Idempotent.
- Requires first deterministic roll to have resolved.
- Must not grant dice.
- Must not mark `firstRunClaimed`.

### 5.4 `openTutorialBuildModalMarker`

Purpose:

- Records that the player opened the guided build modal if product needs this milestone persisted.
- Does not spend essence or complete a build.

This can be omitted if the modal-open milestone is only presentation state. If persisted, keep it as tutorial progress only.

### 5.5 Canonical hatchery L1 build action

Purpose:

- Builds hatchery to L1 using the existing canonical stop/build progression boundary.
- Spends the tutorial-granted essence.
- Marks `tutorialState.hatcheryBuild.status = 'built'`.
- Advances the tutorial to celebration.

Guardrails:

- UI must not write stop/build state directly.
- Do not couple hatchery build completion to board tile indices.
- If the current build action is not yet canonical enough, create a service-level wrapper rather than writing from the component.

### 5.6 `markHatcheryL1CelebrationSeen`

Purpose:

- Records dismissal of the hatchery L1 celebration.
- Advances tutorial state into normal early rolling before pack eligibility.

Guardrails:

- Does not grant gameplay rewards unless a separate reward is explicitly approved.

### 5.7 `evaluateFirstCreaturePackEligibility`

Purpose:

- Runs after roll resolution and any immediate tile reward state settles.
- If eligible, marks the first pack as eligible.

Eligibility gates:

- Island 1.
- Cycle 0.
- tutorial feature enabled.
- tutorial state is at or after `hatchery_l1_celebration_seen`.
- `firstCreaturePack.status` is not opened, revealed, claimed, or skipped.
- dice is at low threshold while still sufficient for the next roll cost.
- player is not inside another blocking tutorial or reward modal.

### 5.8 `openFirstCreaturePackReward`

Purpose:

- Runs under the Island Run action mutex.
- Reads the latest canonical runtime state.
- Resolves and persists 4 card creature IDs.
- Grants creatures to `creatureCollection`.
- Grants +100 dice.
- Marks the pack opened/revealed/claimed status as appropriate.
- Bumps runtime version and commits once.

Guardrails:

- Idempotent.
- Returns `already_opened` or equivalent without granting again.
- Does not call localStorage creature collection helpers.
- Does not use dev-only dice grant helpers.
- Does not modify egg terminal transition logic unless the product explicitly turns the pack into an egg reward.

## 6. How to avoid conflicts with existing `firstRunClaimed` starter reward flow

Current `firstRunClaimed` should remain a broad legacy starter reward marker until intentionally retired. The new tutorial state should not overload it.

Recommended policy:

- Keep `firstRunClaimed` as-is for existing users and legacy starter reward compatibility.
- Add `tutorialState` as the granular source of truth for staged first-session onboarding.
- Gate the new flow on both player eligibility and tutorial state, not only on `firstRunClaimed`.
- Do not set `firstRunClaimed` as a side effect of deterministic roll, essence grant, hatchery build, or first pack claim unless a later migration explicitly maps old starter rewards into the new flow.
- Do not use `firstRunClaimed` to mean "first creature pack claimed".
- Add migration/backfill rules that choose one of:
  - existing progressed users get `tutorialState.status = 'skipped'`;
  - users with `firstRunClaimed = true` and no meaningful Island 1 progress get a conservative `skipped` state;
  - only brand-new rows with no starter claim and no Island 1 progress enter `not_started`.

## 7. Existing first-run rewards: remain, move, or replace

Recommended handling:

### Remain temporarily

- Existing `firstRunClaimed` marker.
- Existing first-run starter reward flow for users outside the new feature flag or migration cohort.
- Existing story prologue and display-name markers.

### Move into the new tutorial flow later

- Any first-run essence grant that exists only to bootstrap early Island 1 progress.
- Any renderer-side first-run reward presentation that duplicates canonical state writes.
- Any Build button affordance logic that should become derived from tutorial state.

### Replace after parity is proven

- Broad first-run starter grants for players in the new first-session onboarding cohort.
- Any starter dice/essence amounts that conflict with the deterministic first roll and exact hatchery L1 essence requirement.

### Do not replace

- Profile-level `onboarding_complete`; it serves broader app onboarding and is intentionally separate.
- Story prologue seen state; it may remain a separate presentation milestone.
- Display-name loop completion; it should not be coupled to Island 1 reward claims.

## 8. Feature flags

Feature-flag each slice so the rollout can be staged and reverted independently:

- `islandRunFirstSessionOnboardingEnabled`
- `islandRunDeterministicFirstRollEnabled`
- `islandRunGuidedHatcheryBuildEnabled`
- `islandRunFirstCreaturePackEnabled`
- `islandRunFirstPackLowDiceRescueEnabled`

Rollout order:

1. Internal/dev only.
2. New test accounts only.
3. Small brand-new-user cohort.
4. Full brand-new-user rollout.
5. Legacy starter reward replacement only after metrics and support checks pass.

Persist a feature flag snapshot inside tutorial state when the flow starts, so refreshes and mid-session flag changes do not strand players.

## 9. Implementation PR sequence

### PR 1 — Tutorial state foundation

Scope:

- Add persisted `tutorialState` runtime shape.
- Add hydration/default/backfill logic.
- Add selectors/helpers for tutorial state.
- No gameplay behavior changes.
- No UI behavior changes except optional debug readout.

Tests:

- default new record has safe tutorial defaults.
- existing records hydrate without tutorial state.
- malformed tutorial state falls back safely.
- progressed users are skipped or completed according to migration policy.
- runtime version increments on tutorial-state writes.

### PR 2 — Tutorial action shell and feature flags

Scope:

- Add feature flags.
- Add `startFirstSessionTutorial`.
- Add idempotent tutorial transition helpers.
- Add no-op/ineligible results for non-new users.

Tests:

- disabled feature returns ineligible/no-op.
- non-Island-1 users are ineligible.
- cycle > 0 users are ineligible.
- existing progressed users do not enter the flow.
- repeated start calls do not duplicate state.

### PR 3 — Deterministic first roll

Scope:

- Extend roll action path to support the tutorial first-roll override.
- Persist deterministic dice result and target tile metadata.
- Keep normal rolls random.

Tests:

- first tutorial roll lands on the intended essence tile.
- first roll spends normal dice cost.
- normal rolls remain random/non-overridden.
- refresh after deterministic roll preserves result.
- action is blocked or no-ops outside the exact tutorial state.

### PR 4 — First essence reward claim

Scope:

- Add canonical first essence tutorial reward claim.
- Grant exactly the hatchery L1 requirement.
- Advance tutorial state to build prompt.

Tests:

- grants exact required essence.
- updates lifetime essence if required.
- double claim does not duplicate essence.
- claim cannot run before first roll resolves.
- claim cannot run outside Island 1 tutorial state.

### PR 5 — Guided hatchery L1 build

Scope:

- Route guided build through canonical action boundary.
- Highlight Build button only from derived tutorial state.
- Build hatchery L1 and advance tutorial state.

Tests:

- only Build affordance is emphasized during prompt state.
- non-Build gameplay actions are blocked only where product requires it.
- hatchery L1 build spends exact essence and persists build completion.
- duplicate build submission does not double spend.
- refresh after build resumes at celebration or completed build state.

### PR 6 — Hatchery L1 celebration

Scope:

- Add celebration presentation controlled by tutorial state.
- Add canonical marker for celebration seen.
- Transition to normal early rolling after dismissal.

Tests:

- celebration appears once after successful build.
- dismissal persists.
- refresh after dismissal does not show celebration again.
- normal rolling is available after dismissal.

### PR 7 — First pack eligibility

Scope:

- Add low-dice rescue eligibility evaluation after roll resolution.
- Gate on hatchery tutorial completion.
- Mark pack eligible in tutorial state.
- Do not open or grant pack yet.

Tests:

- low dice before hatchery completion does not trigger pack.
- low dice after hatchery completion triggers eligibility.
- out-of-dice prompt does not preempt pack eligibility when dice can still afford next roll.
- higher multiplier scenarios use effective roll cost or remaining affordable rolls.
- eligibility does not repeat after opened/claimed/skipped.

### PR 8 — First pack canonical claim

Scope:

- Add `openFirstCreaturePackReward`.
- Resolve 4-card controlled-random pack.
- Persist pack contents.
- Grant creatures and +100 dice atomically.
- Mark first pack claimed/opened.

Tests:

- grants exactly 4 creature cards.
- guarantees a curated common card.
- grants +100 dice exactly once.
- duplicate opens return already-opened without extra grants.
- pack contents are stable after refresh.
- duplicate owned creatures are handled through canonical collection semantics.
- action never uses localStorage creature collection helpers.

### PR 9 — First pack UI reveal

Scope:

- Add pack prompt, opening animation, 2-by-2 reveal, and +100 dice bonus line.
- UI dispatches only canonical action.
- UI reads tutorial state and action result.

Tests:

- prompt appears only when eligible.
- Open Pack button disables while action is pending.
- reveal shows 4 cards in a 2-by-2 layout.
- +100 dice appears as a separate bonus line.
- Continue resumes normal gameplay without regranting.

### PR 10 — Legacy starter reward cohort migration

Scope:

- Decide whether new-cohort players still receive old starter rewards.
- If replacing, disable old starter reward for the new tutorial cohort only.
- Keep legacy users stable.

Tests:

- old cohort behavior remains unchanged.
- new cohort does not receive conflicting starter grants.
- users already mid-flow are not moved backward.
- `firstRunClaimed` remains compatible.

## 10. Risk controls

Primary risks:

- Double-granting essence, dice, or creature cards.
- Stranding players on refresh during tutorial transitions.
- Overloading `firstRunClaimed` and making legacy starter rewards ambiguous.
- UI writing gameplay state directly.
- Deterministic roll affecting normal gameplay.
- Creature pack firing before hatchery tutorial completion.
- Low-dice pack competing with existing out-of-dice/shop prompts.
- Pack contents changing after refresh.
- Feature flag changes mid-session changing the active flow.

Controls:

- All reward grants must be idempotent and persisted.
- All gameplay writes must go through canonical action services.
- Pack open and reward grant must commit dice, creature collection, and tutorial state in one state transition.
- Tutorial state should record enough data to recover after refresh.
- Feature flag snapshot should be persisted at tutorial start.
- Existing users should default to skipped/completed, not retroactive grant.
- Keep first-run starter reward migration for a late PR after parity is tested.
- Add architecture guard tests/checks where new files touch Island Run runtime state.

## 11. Architecture guardrails

Follow the active Island Run architecture contracts:

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`

Specific guardrails for this onboarding flow:

- Do not add gameplay writes directly inside React UI components.
- Do not call `persistIslandRunRuntimeStatePatch` from UI for tutorial gameplay fields.
- Do not introduce new runtime-state mirrors in UI components.
- Do not duplicate dice, essence, creature, reward, or stop progression logic locally in components.
- Do not couple the hatchery build tutorial to board tile indices.
- Do not use localStorage creature collection helpers as the authoritative pack grant path.
- Do not use dev-only dice grant helpers for the +100 pack bonus.
- Do not make the first pack part of the egg terminal transition path unless the product explicitly changes it from a pack to an egg.

## 12. Validation expectations

Docs-only planning PR:

- No build/test required unless repository policy changes.
- Run final code-review/security validation before opening the PR.

Implementation PRs:

- `npm run test:island-run`
- `npm run check:island-run-architecture-guards`
- `npm run check:island-run-lucky-roll-dev-overlay`
- `npm run build`

Add narrower tests per PR as listed above before broad validation.
