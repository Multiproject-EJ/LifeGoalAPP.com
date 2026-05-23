# Welcome Pack Onboarding Reward Investigation (Island Run / HabitGame)

## Summary recommendation: **CAUTION**

This is feasible with strong reuse of existing systems, but not “drop-in safe” without careful state-plumbing and one-time idempotency design.

Why CAUTION:
- Island Run already has a **first-session one-time pack pipeline** (5 cards + one-time claim semantics) that is a close match for the desired “Welcome Pack” concept, and it already uses canonical action locking + canonical state commits. Reusing/adapting this pattern is the safest route.
- Reward grants for dice/essence/tickets currently happen through **different action paths** across services. There is no single dedicated “reward bundle transaction” helper for this exact trio, so implementation should add one canonical action service to apply all three rewards + claim marker in one locked commit.
- Event tickets are event-scoped (`minigameTicketsByEvent[eventId]`) and depend on an active event id; “20 tickets to currently active event” is safe only if active event resolution and fallback behavior are explicit.

---

## Current architecture map

## 1) New player / first-run state authority

- Canonical gameplay state record is `IslandRunGameStateRecord`, persisted via game-state store and Supabase row projection.
- Existing first-run/onboarding-related fields include:
  - `firstRunClaimed`
  - `firstSessionTutorialState`
  - `dailyHeartsClaimedDayKey`
  - `onboardingDisplayNameLoopCompleted`
- These fields are persisted in the runtime table projection (`first_run_claimed`, `first_session_tutorial_state`, etc.) and merged during local/remote reconciliation.

## 2) Existing first-session creature pack flow (very relevant)

- Already implemented one-time onboarding pack action:
  - `claimFirstSessionCreaturePackReward(...)`
  - Gated by tutorial state (`first_creature_pack_available`) and island/cycle (`island 1`, `cycle 0`)
  - Uses `withIslandRunActionLock(...)` to serialize reads/writes.
  - Writes one canonical state commit (`commitIslandRunState`) containing:
    - Added creature collection entries
    - Dice bonus
    - Tutorial state advancement to claimed
- Existing UI modal for this flow:
  - `FirstSessionCreaturePackModal`
  - Intro/open/reveal/continue phases, card-grid reveal behavior.

## 3) Reward ownership paths

- Dice and essence can be granted by direct canonical state mutation in action services (e.g., `applyFirstRunStarterRewards` and other action modules).
- Event-ticket authority is canonical `minigameTicketsByEvent[eventId]` (not `spinTokens`) per runtime contract and reward claim path.
- Reward-bar claim service (`executeIslandRunClaimRewardAction`) already routes minigame token awards to:
  - `minigameTicketsByEvent[activeEventId]` when active event exists
  - fallback to legacy `spinTokens` only when no active event id is available.

## 4) Event-active detection

- Event engine owns active event parsing and rotation wrappers (`parseEventId`, `getActiveEvent`, `advanceEventIfExpired`).
- Active event on runtime record includes `eventId/eventType/started/expires/version`.
- Ticket ledgers are scoped per event id via `minigameTicketsByEvent`.

## 5) Celebration/modal ecosystem

Relevant reusable surfaces:
- `FirstSessionCreaturePackModal` (pack-focused onboarding reveal UX)
- `CreaturePackOpeningPrototypeModal` (cinematic reveal progression; marked dev/prototype)
- Existing Island Run stop/onboarding celebration modal styling classes in `IslandRunBoardPrototype.tsx` + `LevelWorlds.css` (dense/readable/onboarding modal variants)

Conclusion: there is enough visual and behavioral precedent to implement “Welcome Pack” as a reward/celebration modal rather than info popup.

---

## Relevant files/components/services

### First-run / onboarding / claim-state
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunFirstSessionTutorialUi.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

### Pack open / random card selection / collection
- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts`
- `src/features/gamification/level-worlds/services/islandRunCreatureCollectionLedger.ts`
- `src/features/gamification/level-worlds/services/creatureCatalog.ts`
- `src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx`
- `src/features/gamification/level-worlds/components/CreaturePackOpeningPrototypeModal.tsx`

### Reward and ticket grants
- `src/features/gamification/level-worlds/services/islandRunClaimRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunEventEngine.ts`
- `src/features/gamification/level-worlds/services/islandRunMinigameLauncherService.ts`

---

## Existing reusable systems

## A) One-time claim + lock safety pattern (reuse strongly)

Best existing pattern is `claimFirstSessionCreaturePackReward`:
- explicit eligibility gate
- idempotent “already claimed” return path
- mutex lock
- single canonical commit

This is the nearest architecture fit for welcome-pack once-only semantics.

## B) 5-card randomized pack resolution

Already implemented deterministic slot/tier weighting + creature selection with duplicate handling and collection ledger updates. Desired “5 random cards” can map to this existing pattern with new source/version constants instead of inventing a separate randomization subsystem.

## C) Reward/celebration presentation patterns

`FirstSessionCreaturePackModal` and existing Island Run celebration-style overlays already support non-generic “reward reveal” framing.

---

## Proposed safest implementation approach (no code in this investigation)

1. Add a **dedicated canonical welcome-pack action service** (future slice) that:
   - performs eligibility check
   - resolves 5 random cards
   - applies card collection updates
   - applies `+150 dice`, `+2000 essence`, and `+20 active-event tickets` (or fallback strategy)
   - writes one claim marker
   - commits once under action lock

2. Keep UI as a pure intent + display layer:
   - UI opens welcome-pack reveal
   - UI requests canonical action once
   - UI renders response payload
   - UI never writes gameplay fields directly

3. Reuse modal patterns from existing onboarding/pack/reward surfaces for visual consistency.

---

## One-time claim strategy

## Recommended flag location

Server-backed canonical state field in `IslandRunGameStateRecord` (persisted in `island_run_runtime_state`) is safest.

Rationale:
- localStorage-only flags are vulnerable to reinstall/device divergence.
- profile metadata-only flags are weaker for gameplay-atomic grants than runtime state commits.
- runtime record already supports canonical lock + single commit semantics.

## Idempotency requirements

- Keep explicit claim marker in runtime state (e.g., dedicated boolean or claim-id ledger).
- Action should return `already_claimed` without side effects when repeated.
- Must run under `withIslandRunActionLock(userId, ...)`.

## Multi-device/race risk

- Per-device lock serializes local actions, but cross-device concurrent opens still require persisted idempotent marker check at write/hydration boundaries.
- Existing merge/commit coordinator helps, but claim action should still be designed “safe to retry” and “safe to race”.

---

## Reward grant strategy

## Required bundle
- 150 dice
- 2000 essence
- 20 event tickets (active event scoped)

## Safety approach

- Grant all reward fields in the same canonical action commit as claim marker.
- Avoid splitting into independent writes (prevents partial-grant states if app closes mid-flow).
- Update lifetime counters consistently for essence grants if that is current contract behavior in corresponding grant paths.

## Atomicity note

There is no dedicated current helper that grants exactly this bundle as a single abstract “reward bundle”. A dedicated canonical action is advisable.

---

## Event ticket strategy (including no-active-event fallback)

## Current technical truth
- Timed-event tickets are event-id keyed (`minigameTicketsByEvent[eventId]`).
- Event id availability can be null/stale until event engine ensures/rotates active event.

## Safe strategy options

1. **Preferred:** Ensure active event first via canonical event engine path, then credit `minigameTicketsByEvent[resolvedEventId] += 20`.
2. If still no active event resolvable at claim time (rare/offline edge), choose explicit fallback policy:
   - **Defer grant** with pending marker until event is resolvable (safest economy semantics), or
   - fallback to legacy `spinTokens` (least preferred, because contract direction is event-scoped tickets).

Recommendation: defer-ticket-credit fallback is cleaner than moving value into legacy `spinTokens` for this new welcome source.

---

## UI/modal strategy

- Use a dedicated “Welcome Pack” celebration modal surface (title exactly “Welcome Pack”), but compose from existing reward/pack modal styling patterns.
- Keep it reward-forward:
  - first reveal cards
  - then show reward summary block in same celebration modal
  - include explicit lines for `+150 dice`, `+20 [Active Event Name] tickets`, `+2000 essence`
- Avoid using a plain informational dialog style.

Potential reuse candidates:
- `FirstSessionCreaturePackModal` for onboarding card reveal skeleton
- existing Island Run celebration/stop modal style classes for premium/cozy visual consistency

---

## Risks and edge cases

1. **Duplicate grants across devices** if claim marker is not canonical/idempotent.
2. **Partial grants** if reward fields are split into multiple writes.
3. **No active event at claim moment** causing ticket ambiguity.
4. **Tutorial-state coupling risk** if welcome-pack state is overloaded into existing first-session tutorial chain without careful transitions.
5. **Regression risk** if UI writes gameplay directly instead of canonical actions.

---

## Suggested PR slicing plan

## Slice A — Investigation/docs only
- Add this investigation report.

## Slice B — UI-only mock (no grants)
- Add welcome modal UX shell behind dev gate or static mock path.
- No gameplay mutations.

## Slice C — One-time claim state plumbing
- Add canonical claim marker field and transition rules.
- No reward grants yet.

## Slice D — Card pack open flow wiring
- Reuse existing random-card pipeline for welcome source.
- No dice/essence/ticket grants yet (or gated).

## Slice E — Canonical reward bundle grant
- Add single locked action that commits full bundle + claim marker atomically.
- Add explicit event-ticket fallback handling.

## Slice F — Validation/tests
- Unit tests for idempotency, race retry safety, no-active-event fallback, payload correctness.
- Integration tests for first-open path and “already claimed” behavior.

---

## Tests/checks needed (future implementation)

- One-time claim idempotency test (repeat call returns already_claimed; no extra rewards)
- Cross-state eligibility test (fresh user eligible; progressed user not eligible)
- Card count/content test (5 cards deterministic/valid for seed)
- Reward totals test (+150 dice/+2000 essence/+20 tickets)
- Active-event routing test (credits correct `minigameTicketsByEvent[eventId]`)
- No-active-event fallback test (defer or explicit fallback contract)
- Offline/retry behavior test (no duplicate rewards after reconnect)

---

## Explicit list of files inspected

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunFirstSessionTutorialUi.ts`
- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts`
- `src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx`
- `src/features/gamification/level-worlds/components/CreaturePackOpeningPrototypeModal.tsx`
- `src/features/gamification/level-worlds/services/islandRunClaimRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunEventEngine.ts`
- `src/features/gamification/level-worlds/services/islandRunMinigameLauncherService.ts`
- `src/features/gamification/level-worlds/components/IslandRunMinigameLauncher.tsx`
- `src/features/gamification/level-worlds/services/islandRunAdminDevPackGrantAction.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` (targeted search/read segments)
- `src/features/gamification/level-worlds/LevelWorlds.css` (targeted search/read segments)



## Slice B implementation note (2026-05-23)

- Added a UI-only Welcome Pack prototype modal surface for visual testing only.
- The prototype is dev-triggered and does not grant dice, essence, tickets, cards, or mutate canonical gameplay state.
- No onboarding auto-wiring or migration/state schema changes were introduced in this slice.

## Slice C implementation note (2026-05-23)

- Added canonical one-time claim state plumbing only via `welcomePackClaimed` on `IslandRunGameStateRecord`.
- Added pure eligibility helpers (`isWelcomePackClaimed`, `getWelcomePackEligibility`) for future locked claim flow wiring.
- Added backward-compatible hydration/serialization behavior for legacy saved records that do not include the new field (defaults to `false` when missing).
- Added targeted tests for default eligibility, claimed ineligibility, and legacy-state compatibility.
- No reward grants, card grants, pack opens, economy mutations, or first-launch/onboarding auto-trigger wiring were introduced in this slice.
- Added a physical DB column migration for `welcome_pack_claimed` because Island Run runtime persistence is schema-bound to `public.island_run_runtime_state` (RPC + typed row projection), not JSON-only blob storage.

## Slice D implementation note (2026-05-23)

Slice D is now implemented as a dedicated canonical locked action service for Welcome Pack **starter cards only**:
- Added a canonical action that claims a 5-card Welcome Pack using the existing creature-pack randomization pipeline pattern and commits once under `withIslandRunActionLock`.
- The action sets `welcomePackClaimed = true` on successful claim and returns an idempotent `already_claimed` result on repeats.
- The action returns a UI-friendly reveal payload containing the 5 granted cards.

Explicitly **not included** in Slice D:
- No dice grants.
- No essence grants.
- No event ticket grants.
- No reward bar mutations.
- No automatic first-launch/onboarding wiring.

## Slice E1 implementation note (2026-05-23)

- Wired the dev-only Welcome Pack prototype modal path to invoke the canonical `claimWelcomePackStarterCards` action from the Island Run debug flow.
- The modal now prefers and displays the actual 5-card reveal payload returned by the real claim action, while keeping the static placeholder view as fallback before claim.
- Added explicit already-claimed handling in the modal and disabled repeat claim attempts there.
- Added loading/error handling and overlap protection so repeated clicks do not start concurrent claim requests.
- Still no dice grants, no essence grants, and no event ticket grants in this flow.
- Still no automatic first-launch/onboarding wiring and no changes to normal user-visible onboarding surfaces.
