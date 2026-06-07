# Creature Hatch Bond Question Investigation

Date: 2026-06-07  
Scope: Investigation/report only. No gameplay, economy, reward, schema, AI, movement, dice, tickets, reward bar, telemetry-authority, or Wisdom Stop changes were implemented.

## Executive summary

- **PASS for MVP without schema changes.**
- The Hatchery already has a ready-to-collect step, a revealed-creature modal, and an idempotent terminal transition for `ready -> collected|sold`.
- The safest insertion point is **inside the existing hatch reveal modal after the creature reveal is visible**, not before the terminal transition commits.
- Creature ownership is already committed before the reveal modal is shown; the Bond Question should be display-only for MVP and must not gate or retry the ownership commit.
- A static/template resolver can use existing creature metadata (`id`, `name`, `tier`, `habitat`, `affinity`, `shipZone`) and local component state only.

## 1) Current egg hatch flow/modal implementation

### Hatchery ready state

- Main Hatchery UI is in `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:10591-10720`.
- The ready-to-resolve branch is selected when `selectedHatcheryDisplayEgg && selectedHatcheryEggStage >= 4` (`IslandRunBoardPrototype.tsx:10646`).
- The player can currently:
  - collect the creature with `handleCollectCreature` (`IslandRunBoardPrototype.tsx:10673-10682`), or
  - sell the egg via `handleSellEggForChoice` (`IslandRunBoardPrototype.tsx:10683-10712`).
- Pending/ready eggs are derived from `runtimeState.perIslandEggs` in `hatcheryPendingEggs` (`IslandRunBoardPrototype.tsx:6208-6236`).
- The selected egg is normalized into `selectedHatcheryDisplayEgg`, `selectedHatcheryEggStage`, and `canResolveSelectedHatcheryEgg` (`IslandRunBoardPrototype.tsx:6253-6275`).

### Egg-ready banner / animation

- There is an egg-ready banner with an egg hatch video at `IslandRunBoardPrototype.tsx:11610-11624`.
- Its CTA opens the Hatchery stop (`requestActiveStopTransition('hatchery', 'egg_ready_banner')`) at `IslandRunBoardPrototype.tsx:11629-11634`.
- This banner is not the ownership commit point; it only directs the user to the Hatchery.

### Creature reveal modal

- The reveal modal component is `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx:4-59`.
- It currently shows:
  - creature name and score (`CreatureHatchRevealModal.tsx:29-32`),
  - creature art (`CreatureHatchRevealModal.tsx:33-43`),
  - rarity/stars (`CreatureHatchRevealModal.tsx:44`),
  - `Added to Sanctuary` confirmation (`CreatureHatchRevealModal.tsx:45`),
  - `Set as Companion` and `Continue` actions (`CreatureHatchRevealModal.tsx:47-55`).
- The board renders it from `hatchReveal` state at `IslandRunBoardPrototype.tsx:12916-12931`.

## 2) Hatch completion and creature ownership commit points

### UI collection handler

- `handleCollectCreature` lives at `IslandRunBoardPrototype.tsx:6647-6753`.
- It guards readiness and current-island ownership resolution:
  - no selected egg or stage below 4 returns early (`6648-6650`),
  - remote island eggs cannot be resolved from the current island (`6650` via `canResolveSelectedHatcheryEgg`),
  - terminal `collected`/`sold` eggs return early (`6651-6653`),
  - a synchronous ref guard blocks double-click/StrictMode duplicate awards (`6654-6661`; ref defined at `1527-1534`).

### Canonical terminal transition

- `resolveReadyEggTerminalTransition` is the canonical hatchery terminal transition in `src/features/gamification/level-worlds/services/islandRunStateActions.ts:3083-3195`.
- It enforces `ready -> collected|sold` and returns no-op for repeated terminal calls (`islandRunStateActions.ts:3084-3088`, `3131-3141`).
- For collection, it calls `addCreatureToRuntimeCollection` when `collectedCreatureId` is present (`islandRunStateActions.ts:3143-3154`).
- It updates the egg ledger to terminal status, updates `creatureCollection`, applies any reward deltas, increments `runtimeVersion`, and commits through `commitIslandRunState` (`islandRunStateActions.ts:3155-3194`).

### Runtime creature ownership

- Runtime creature ownership is stored in `IslandRunGameStateRecord.creatureCollection` (`src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:257`).
- Runtime collection entries include `creatureId`, copies, collection timestamps, island number, bond XP/level, and milestone/form markers (`islandRunGameStateStore.ts:72-88`).
- `addCreatureToRuntimeCollection` updates existing copies or prepends a new entry in `src/features/gamification/level-worlds/services/islandRunCreatureCollectionLedger.ts:4-45`.

### Legacy/local mirror

- `handleCollectCreature` also calls `setCreatureCollection(collectCreatureForUser(...))` at `IslandRunBoardPrototype.tsx:6693-6698`.
- `collectCreatureForUser` writes to localStorage in `src/features/gamification/level-worlds/services/creatureCollectionService.ts:103-143`.
- That service explicitly states localStorage is non-authoritative and only retained for legacy fallback/UI convenience (`creatureCollectionService.ts:4-10`).

## 3) Existing hatch reveal step and safe question insertion point

There is an existing reveal step: `hatchReveal` is set immediately after collection state is updated (`IslandRunBoardPrototype.tsx:6693-6699`) and rendered as `CreatureHatchRevealModal` (`IslandRunBoardPrototype.tsx:12916-12931`).

Safest MVP insertion:

1. Keep `handleCollectCreature` and `resolveReadyEggTerminalTransition` unchanged.
2. Let the terminal transition and creature ownership commit happen first.
3. Extend the reveal modal to run a local display sequence:
   - reveal creature/art,
   - show exactly one Bond Question,
   - let user choose one button answer or skip,
   - show one short in-character response,
   - then expose/enable normal completion (`Continue`, optional `Set as Companion`).

Why this is safe:

- It does not interrupt the reward/ownership commit path.
- If the user closes/navigates after the commit, ownership is already safe.
- It keeps “one hatch = one question max” scoped to one `hatchReveal` modal instance.
- It avoids touching sell logic; sold eggs should not ask a newly revealed creature question.

## 4) Does the hatch flow know revealed creature id/name/metadata?

Yes.

- `resolveHatchedCreatureWithPerfectCompanionBias` returns a full `CreatureDefinition` in `IslandRunBoardPrototype.tsx:6609-6645`.
- `handleCollectCreature` has the resolved creature before commit (`IslandRunBoardPrototype.tsx:6663`).
- `hatchReveal` currently stores `creatureId`, `creatureName`, and `rarity` (`IslandRunBoardPrototype.tsx:1875`, `6699`).
- The render path can resolve art from the creature id via `CREATURE_CATALOG.find(...)` and `resolveCreatureArtManifest(...)` (`IslandRunBoardPrototype.tsx:12922-12925`).
- Core metadata exists in `CreatureDefinition`: `id`, `imageKey`, `name`, `tier`, `habitat`, `affinity`, `shipZone` (`src/features/gamification/level-worlds/services/creatureCatalog.ts:5-13`).
- `getCreatureById` and `CREATURE_CATALOG` already provide catalog lookup (`creatureCatalog.ts:102-140`).

Recommendation: widen `hatchReveal` state to either include the full resolved creature metadata needed by the question resolver or derive it once with `getCreatureById(hatchReveal.creatureId)` in the modal render path. Avoid repeated `CREATURE_CATALOG.find(...)` calls while editing.

## 5) Where the new Hatch Bond Question resolver should live

Recommended service:

- `src/features/gamification/level-worlds/services/creatureHatchBondQuestionResolver.ts`

Rationale:

- This is display/content logic, not economy or ownership logic.
- It can be pure and easily covered by existing service-test infrastructure.
- It stays near creature catalog/metadata services without coupling to React.
- It keeps Wisdom Stop files untouched.

Suggested responsibilities:

- Accept a minimal `CreatureDefinition`-like input and deterministic context such as `hatchKey`/`creatureId`.
- Return exactly one static/template question with:
  - short prompt,
  - 2-3 button choices,
  - optional skip label,
  - short in-character response per choice,
  - short skip response.
- Use authored templates keyed by `affinity`, `shipZone`, or `tier`, with safe fallback.
- No AI calls, no network calls, no persistence, no schema writes.

Suggested component boundary:

- Extend `CreatureHatchRevealModal` or add a small child component beside it, e.g. `CreatureHatchBondQuestionPanel`, under `src/features/gamification/level-worlds/components/`.
- Keep all answer/skip state inside the modal instance.

## 6) Can MVP be static/template-only with no schema changes?

Yes.

- The MVP requirement does not need durable answer history yet.
- The reveal modal can own ephemeral answer state with `useState`.
- Existing creature catalog metadata is sufficient for templated copy.
- The Hatchery already knows the creature by the time the modal is shown.
- No schema changes are required unless later requirements need analytics of answers, long-term bond memory, rewards, or replay protection across browser reloads.

Safe non-schema place?

- For MVP, do **not** persist answers.
- Avoid localStorage for answers unless a later product requirement explicitly asks for resume/replay behavior. LocalStorage would be non-authoritative and could create confusing “answered” state without schema authority.
- The only acceptable MVP state is per-modal React state: answer selected/skipped during this reveal session.

## 7) Files likely needing edits for MVP implementation

Likely production files:

1. `src/features/gamification/level-worlds/services/creatureHatchBondQuestionResolver.ts`
   - New pure static/template resolver.
2. `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx`
   - Add the local reveal/question/response UI sequence.
   - Add props for creature id/metadata or a resolved question model.
   - Ensure one question max per modal instance.
3. `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
   - Pass creature id/metadata or resolved question into the modal.
   - Optionally clean up repeated catalog/art lookups while touching this area.
4. `src/index.css` or the relevant stylesheet section if modal styling requires new classes.

Likely test files:

1. `src/features/gamification/level-worlds/services/__tests__/creatureHatchBondQuestionResolver.test.ts`
   - New pure resolver tests.
2. `src/features/gamification/level-worlds/services/__tests__/runIslandRunServiceTests.ts` or equivalent service test aggregator
   - Include the new resolver test if tests are manually aggregated.
3. Existing state-action tests if implementation touches terminal transition behavior; otherwise avoid touching them.

Files to avoid for MVP:

- Supabase migrations/schema files.
- `resolveReadyEggTerminalTransition` and reward/ownership logic.
- Dice, essence, tickets, reward bar, movement, Island Run economy, telemetry authority.
- Wisdom Stop files (`WisdomTreeCardEncounter.tsx`, `wisdomTreeCards.ts`, Wisdom render branch) unless a later PR explicitly changes Wisdom.

## 8) Tests that should be added

### Pure resolver tests

Add service tests for `creatureHatchBondQuestionResolver`:

- Returns exactly one question model per call.
- Every question has short prompt, button choices, and skip response.
- Choice ids are stable and unique.
- Unknown/partial creature metadata falls back safely.
- Templates vary safely by affinity/shipZone/tier if implemented.
- No persistence/network/AI dependencies.

### Hatch flow regression tests

Because there are no existing component tests under `src/features/gamification/level-worlds/components`, prefer pure/service tests first. If UI test infrastructure is added later, cover:

- `CreatureHatchRevealModal` initially shows the creature reveal before the question.
- Selecting an answer shows exactly one response and does not show another question.
- Skipping shows exactly one skip response and does not show another question.
- `Continue` completes/close behavior still calls the original `onClose`.
- `Set as Companion` remains available only when provided and still calls `onSetCompanion`.

### Ownership/terminal safety tests

Only needed if implementation changes collection flow. If it does, add/extend `islandRunStateActions` coverage to ensure:

- `resolveReadyEggTerminalTransition` still commits creature ownership before any UI-only question state matters.
- Repeated terminal calls remain no-op (`already_terminal`).
- Sold eggs do not produce collection/question behavior.

Validation command for service tests is `npm run test:island-run` (`package.json:23`, `scripts/run-island-run-service-tests.mjs:59-69`).

## 9) Risks/blockers

### Primary risk: interrupting hatch completion

Do not place the question before `resolveReadyEggTerminalTransition` or inside the canonical transition. The question is UI-only and should never decide whether a creature is owned.

### Duplicate question risk

React re-renders could re-resolve templates. Keep answer state in the modal and pass a stable question model or deterministic resolver input. The modal should not advance to a second prompt after answer/skip.

### Reload/close behavior

If the user closes or reloads after collection but before answering, the creature is already owned and the modal may disappear. That is acceptable for MVP if answers are not persisted. Do not attempt localStorage replay unless explicitly scoped.

### Sell path ambiguity

The product says “newly revealed creature asks” during hatch. Current Hatchery offers sell vs collect before reveal. MVP should only ask after `Collect Creature`; selling an egg should continue to skip creature reveal/question unless product clarifies that sell also reveals the creature.

### Multi-egg/Egg Mania

`hatcheryPendingEggs` can contain multiple eggs (`IslandRunBoardPrototype.tsx:6208-6236`). Each collected egg creates a separate `hatchReveal` instance. The one-question rule should be per `hatchReveal`, not global per visit.

### Modal stacking

`hatchReveal` participates in modal attention ownership (`IslandRunBoardPrototype.tsx:9311-9335`). Keep the question inside that modal rather than opening a second modal.

### Existing first-creature onboarding hint

First creature collection may set `showPerfectCompanionOnboardingHint` (`IslandRunBoardPrototype.tsx:6718-6738`). Because `hatchReveal` already owns attention, verify the hint does not visually compete after the question flow closes.

### Metadata fallback

The current modal repeatedly looks up catalog/art by id (`IslandRunBoardPrototype.tsx:12922-12925`). If a creature id is missing, the UI falls back to silhouette/emoji. The question resolver also needs a generic fallback.

## 10) Recommended PR sequence

1. **PR 1: Static resolver + tests**
   - Add `creatureHatchBondQuestionResolver.ts`.
   - Add pure service tests.
   - No UI wiring, no schema changes.

2. **PR 2: Hatch reveal modal UI sequence**
   - Extend `CreatureHatchRevealModal` with reveal → one question → one response → continue.
   - Wire the resolver from `IslandRunBoardPrototype` using the revealed creature id/metadata.
   - Preserve `handleCollectCreature`, terminal transition, rewards, ownership, and sell path.

3. **PR 3: Polish/QA follow-up**
   - Add CSS polish and accessibility refinements if not included in PR 2.
   - Add UI/component coverage if a React test harness is introduced.
   - Manually QA first hatch, duplicate clicks, Egg Mania/multiple eggs, Set as Companion, skip, and reload-after-collect.

## Recommended MVP scope

- Static/template-only Hatch Bond Question shown only inside the Hatchery creature reveal modal after `Collect Creature` succeeds.
- One question per hatch reveal modal instance.
- Button answers plus skip.
- One short in-character response.
- No answer persistence.
- No AI calls.
- No changes to rewards, ownership semantics, dice, essence, tickets, reward bar, movement, Island Run economy, telemetry authority, schema, or Wisdom Stop.

## PASS/FAIL on whether this can proceed without schema changes

**PASS.** This can proceed without schema changes for MVP because the feature can be implemented as ephemeral UI state plus static resolver content using existing creature metadata.

## Proposed PR sequence

1. Static Hatch Bond Question resolver and service tests.
2. Hatch reveal modal UI wiring after successful collection commit.
3. Polish/accessibility/manual QA follow-up, with schema/persistence deferred until durable answer history is explicitly required.
