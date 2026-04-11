# Island Run PWA ↔ Spark Renderer Integration Plan

## A. Executive summary

- Keep **all gameplay truth and progression logic** in the PWA (contract-v2 domain), and treat Spark as a **pure renderer/presentation runtime** that consumes a typed, versioned view model.
- Integrate in **small, reversible slices behind flags**, starting with a renderer shell that reads live state but owns no logic.
- Define a strict **BoardRendererContractV1** with immutable snapshots + callback intents. Spark renders, PWA validates/applies.
- Build missing Spark capabilities first (60-tile pathing, stop/build visuals, reward/event HUD, animation system), but only against mock contract data so assumptions are tested early.
- Use guardrails to prevent drift (no Spark-owned game state, no duplicate reducers, no hidden progression rules in animation code).

## B. Ownership split

### PWA owns (source of truth)

1. **Gameplay state + progression rules**
   - Sequential stop progression rules.
   - Dice movement legality and final resolved tile position.
   - Stop completion/build gating rules.
   - Essence accrual/spend validation.

2. **Event and reward systems**
   - Active timed event lifecycle (start/end/rotation).
   - Reward bar progress truth, thresholds, tiering, claimability.
   - Claim resolution and persistence side effects.

3. **Runtime orchestration + persistence**
   - Save/load, migration, and session hydration.
   - Remote sync (if any), analytics events, anti-cheat validation.
   - Feature flag decisions (v1/v2, old/new renderer).

4. **Action resolution pipeline**
   - Intent acceptance/rejection (`roll`, `claimReward`, `spendEssence`, `openStop`).
   - Conflict handling, cooldown checks, resource checks.
   - Returned authoritative post-action state.

5. **Canonical board model definitions**
   - Board profile metadata (tile count, stop map, topology).
   - Mapping from progression state to render-ready state.

### Spark owns (renderer/presentation)

1. **Board scene rendering**
   - Tile/path drawing, depth layers, lighting/parallax polish.
   - Token visual state and movement animation playback.
   - Stop/building models and environment composition.

2. **HUD presentation layer**
   - Reward bar component visuals.
   - Event strip/timer presentation.
   - Active stop card/panel visuals and transitions.
   - Essence badge display and micro-feedback.

3. **Interaction presentation + input dispatch**
   - Hit targets and interaction affordances.
   - Dispatching user intents to PWA callbacks.
   - Loading/disabled/error visual states provided by PWA flags.

4. **Animation language**
   - Movement easing, landing anticipation, feed/claim effects.
   - Celebration/impact VFX tied to PWA-provided event hooks.

> Rule: Spark may stage ephemeral animation state, but it must never become gameplay authority.

## C. Renderer contract proposal

## Contract shape: `BoardRendererContractV1`

Use a single typed payload with stable sections:

1. **`meta`**
   - `contractVersion: 'v1'`
   - `boardProfileId`
   - `seed` (optional deterministic animation seed)
   - `timestampMs`

2. **`board`**
   - `tileCount` (target supports ~60)
   - `tiles: Array<{ id, index, type, state, worldPos?, tags? }>`
   - `paths: Array<{ fromTileId, toTileId, style }>` (supports non-linear topology)
   - `cameraAnchors` / layout hints (optional)

3. **`token`**
   - `currentTileIndex`
   - `isMoving`
   - `movementPreview?: { pathTileIndices, mode: 'dice' }`
   - `lastMoveResult?: { rolled, startTileIndex, endTileIndex }`

4. **`stops`**
   - `activeStop: { id, index, type, status, isOpenable, isBuildable }`
   - `buildProgress: { current, required, percent }`
   - `stopList: Array<{ id, index, type, status, progress }>`

5. **`resources`**
   - `essence: { current, spendable, deltaPreview? }`

6. **`rewardBar`**
   - `eventId`
   - `progress`, `nextThreshold`, `tier`, `isClaimable`, `pendingClaimCount`
   - Optional segment data for richer visuals.

7. **`event`**
   - `active: boolean`
   - `label`
   - `endsAtMs` + `remainingMs`
   - `themeKey` (visual skinning)

8. **`ui`**
   - `flags: { canRoll, canClaimReward, canSpendEssence, canOpenStop }`
   - `busy: { roll, claim, spend, openStop }`
   - `errors?: { code, message, scope }[]`

9. **`cosmetics`**
   - Sticker/minigame token badges, rarity glow tokens, etc. (pure display metadata)

10. **`callbacks`** (intent-only)
   - `onRollRequested()`
   - `onClaimRewardRequested()`
   - `onSpendEssenceRequested({ amount })`
   - `onOpenActiveStopRequested()`
   - `onTileTapped({ tileId })`
   - `onStopTapped({ stopId })`

## Contract principles

- **Unidirectional flow:** PWA → Spark state snapshot; Spark → PWA intents.
- **No mutation from Spark:** Spark cannot directly alter contract state.
- **Versioned evolution:** add `BoardRendererContractV2+` later without breakage.
- **Animation hooks over logic hooks:** expose animation cues/events, not rule engines.

## D. Spark gap analysis

Before first transplant, Spark should refine these against mocked `BoardRendererContractV1` data:

1. **60-tile capable path system**
   - Support larger topology, spacing density, and readability at multiple zoom levels.
   - Ensure path segmentation allows non-60-tile assumptions.

2. **Layered scene architecture**
   - Background/midground/interactive/FX/UI overlay layering.
   - Deterministic z-index/depth strategy to avoid future collision bugs.

3. **Stop/build visual primitives**
   - Larger stop nodes/buildings with explicit active/locked/buildable/complete states.
   - Build progress ring/bar that maps cleanly to contract values.

4. **Reward bar visual system**
   - Event-bound styling, threshold marker states, claimable pulse state.
   - Compact + expanded variants for HUD responsiveness.

5. **Event HUD + timer treatment**
   - One active timed event banner/strip with urgency states near expiry.

6. **Active stop panel treatment**
   - Focus panel that shows stop status, build progress, Essence spend CTA.

7. **Token movement polish**
   - Dice-result movement playback, landing anticipation, settle states.
   - Interrupted-state recovery (new snapshot arrives mid-animation).

8. **Feed/claim animation patterns**
   - Essence spend feedback, reward bar fill/claim burst, and non-blocking sequencing.

9. **State-diff animation adapter**
   - A small adapter that compares previous/current snapshot and selects animations.
   - Keeps animation triggers declarative and logic-free.

## E. Best first transplant slice

**Recommendation: transplant the renderer shell + board path/tiles + token display (read-only) first.**

Why this is safest:

1. **Lowest gameplay risk**
   - No action callbacks required at first; PWA remains full authority.

2. **Validates hardest structural assumption early**
   - Confirms Spark can consume live topology/tile/token state from PWA.

3. **Creates integration seams once**
   - Establishes contract plumbing, lifecycle, and hydration mechanics early.

4. **High visual impact, small blast radius**
   - Immediate confidence from upgraded scene quality without touching progression semantics.

Not first: reward bar or stop action panel. Those are tightly coupled to event/build truth and should follow after contract stability.

## F. Staged migration plan

### Stage 0 — Contract freeze + fixtures
- Finalize `BoardRendererContractV1` schema in PWA.
- Build fixture snapshots (idle, mid-move, claimable, low essence, stop buildable, event ending soon).
- Create a contract validator + snapshot diff tests.

### Stage 1 — Spark renderer shell behind flag (read-only)
- Mount Spark board scene in PWA behind feature flag.
- Bind to live tile/token state only.
- Disable all gameplay interactions in Spark UI.

### Stage 2 — Live topology/token parity
- Add full board profile/topology feed (toward ~60-tile readiness).
- Validate path accuracy and token location parity against current renderer.
- Add fallback-to-old-renderer kill switch.

### Stage 3 — Stop visuals + active stop presentation (still intent-light)
- Introduce stop/building visuals and active stop highlighting.
- Render build progress and Essence display from PWA truth.
- Optional non-mutating interactions (focus/select only).

### Stage 4 — Reward bar + event HUD visuals
- Add event strip/timer and reward bar read model.
- Display claimability and threshold markers from PWA fields.
- Keep claim action routed to existing PWA handlers.

### Stage 5 — Intent callbacks (controlled write path)
- Enable `roll`, `claimReward`, `spendEssence`, `openStop` callbacks.
- All callbacks go through PWA action pipeline with busy/error echoes back to Spark.
- Add analytics parity checks between old/new UI paths.

### Stage 6 — Animation system hardening
- Wire state-diff animation adapter for landing/feed/claim sequences.
- Guarantee deterministic handling for rapid state updates.
- Add reduced-motion/accessibility variants.

### Stage 7 — Gradual rollout + default swap
- Internal dogfood → % rollout → full flag flip.
- Monitor mismatch dashboards (tile, reward, essence, stop status parity).
- Keep rollback flag until stability window is met.

## G. Main risks and guardrails

1. **Risk: Spark drifts into gameplay logic**
   - Guardrail: strict contract boundary + lint rule/codeowners on Spark preventing progression calculations.

2. **Risk: 60-tile assumptions diverge from current PWA board data**
   - Guardrail: board profile adapter in PWA with snapshot tests for multiple tile counts/topologies.

3. **Risk: duplicate state between Spark and PWA**
   - Guardrail: Spark stores animation-only ephemeral state; all game truth fields are read-only props.

4. **Risk: event/reward mismatch**
   - Guardrail: one canonical reward/event selector in PWA feeds both old and new HUD during overlap period.

5. **Risk: stop/build panel mismatch with progression rules**
   - Guardrail: explicit booleans (`isBuildable`, `isOpenable`, `canSpendEssence`) from PWA; Spark never infers.

6. **Risk: animation race conditions on rapid updates**
   - Guardrail: state-diff animation adapter with interrupt policy (`merge`, `cancel`, `fast-forward`).

7. **Risk: migration fatigue / big-bang pressure**
   - Guardrail: stage gates with objective exit criteria and rollback plan per stage.

## Suggested next work in Spark (before swap)

1. Implement contract fixture viewer scene.
2. Build 60-tile-ready path renderer + camera framing.
3. Ship stop/build visual components with all key states.
4. Build reward bar + event strip in visual-only mode.
5. Implement token landing + feed/claim animation prototypes driven by snapshot diffs.
6. Run side-by-side visual QA against PWA fixture exports.
