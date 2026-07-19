# 2026-06-29 Supersession Amendment

Status: historical investigation retained, but its hybrid construction recommendation is superseded. Current canonical design is the direct nine-fragment model: Luma Isle has nine island-specific physical Concord fragments, each maps to one 3x3 slot, each reveals one ninth of a coherent Concord image, and all nine distinct slots complete The Concord. There is no current six-general-component requirement and no separate Echo Crystal, Meaning Lens, or Concord Core gameplay gate. Those names may remain lore-only or visual subassembly labels.

The existing 3x3 technology collection persistence and reward behavior remains the gameplay foundation; future implementation should observe full-grid completion through canonical gameplay state and must not let narrative content grant technology unlocks.

# The Concord Repository Investigation (2026-06-27)

Status: Documentation and investigation only. No runtime implementation is included.

## 1. Executive verdict

**SUPERSEDED PASS WITH CONDITIONS (2026-06-29):** The historical recommendation below has been replaced by the direct nine-fragment Concord model. The Concord should still proceed as the first Island Run technology, but it should reuse the existing per-island 3×3 tech collection grid as nine island-specific invention fragments, not as generic construction progress. The current grid is real, persisted, and already has user-facing collection/reward UI, but its collection order is tied to board tile index modulo 9 and its economy pays dice line/full-board bonuses. Therefore, The Concord should not depend on arbitrary row/column completion for named story parts.

SUPERSEDED historical recommendation: **Option C — Hybrid model**:

SUPERSEDED historical detail: - the existing 3×3 board tech grid supplies general `Ancient Components` progress;
SUPERSEDED historical detail: - the Echo Crystal, Meaning Lens, and Concord Core are authored Island 1 milestone rewards;
- activation requires both the required component IDs and a defined general piece count;
- existing line/full-board dice rewards remain until a separate economy-change PR explicitly retunes them.

## 2. Current technology-grid architecture

- The grid is currently defined inside `IslandRunBoardPrototype.tsx` as a local board feature, not a standalone technology domain. Constants define a 3×3 grid, +10 dice per newly completed line, +100 dice on full board, and eight line definitions: three rows, three columns, two diagonals.
- The active collection state is mirrored in component refs/state: `collectedTechTileIndicesRef`, `rewardedTechCollectionLinesRef`, `collectedTechTileIndices`, `rewardedTechCollectionLines`, and `techCollectionModal`.
- The persisted source of truth is the canonical game-state record fields `techCollectionByIsland` and `techCollectionRewardedLinesByIsland`.
- The grid renders only as a transient modal after a pickup. There is no persistent Technology screen or Workshop.
- The modal opens from `maybeCollectTechItem` immediately after an eligible tile pickup, displays the 3×3 grid, labels the event as “Tech build collection,” and explains that completed rows/columns/diagonals grant dice.
- The modal is portal-rendered, uses the Island Run stop-modal backdrop/shell classes, auto-dismisses quickly for normal pickups, lingers for line/full-board rewards, and can be dismissed by click or Continue.

## 3. Current piece collection flow

- `maybeCollectTechItem(tileType, landingTileIndex)` is called after tile reward handling in the board landing flow.
- Eligible tile types are exactly `currency`, `chest`, `micro`, and `card`.
- Piece creation is deterministic from the landed tile index, not random. `resolveTechCollectionSlot` maps `Math.abs(Math.floor(tileIndex)) % min(9, tileCount)`.
- Duplicate pieces are possible at the tile level but ignored at the grid level: if the resolved slot is already in `previousCollected`, the function returns without UI, reward, or persistence.
- Slot selection is therefore predictable but board-topology dependent. On the default 36-tile ring, many physical tiles alias to the same nine slots.
- Collection state is updated locally first, then persisted through `applyTechCollectionState`.
- The code currently also uses `applyTokenHopRewards` for dice rewards and then `setRuntimeState(rewardRecord)`, so the grid is not fully isolated from legacy board-side gameplay mutation patterns.

## 4. Current reward behavior

- Newly completed rows/columns/diagonals pay +10 dice each.
- Full-board completion currently adds +100 dice whenever `nextCollected.size >= 9` during a new pickup event.
- Rewarded line indices are tracked and never pay twice after reload/sync.
- Full-board completion does **not** have a separate rewarded ledger. Because full board is only reached on the ninth distinct slot and no tenth distinct slot can be collected, it effectively pays once under the current implementation. If future code allowed resets or alternate collection events against an already-full set, this should be explicitly guarded.
- There is no current named technology reward, component grant, device unlock, channel unlock, or workshop progression connected to these rewards.

## 5. Current persistence, hydration, reset, and travel behavior

- The canonical record documents `techCollectionByIsland` as an outer island-number string key whose value is collected 0–8 grid slots.
- The canonical record documents `techCollectionRewardedLinesByIsland` as an outer island-number string key whose value is rewarded 0–7 line indices.
- Default state initializes both ledgers to `{}`.
- Sanitization drops malformed entries, clamps index values to max-exclusive bounds, dedupes, sorts, and prunes empty buckets.
- Hydration reads both DB columns: `tech_collection_by_island` and `tech_collection_rewarded_lines_by_island`.
- Legacy fallback hydration also reads these fields from legacy data shapes.
- Remote/local merge unions both ledgers, preserving progress from either source.
- Patch persistence merges per-island maps, which is safe for additive collection but cannot delete nested island keys except through full-record canonical commits.
- `applyTechCollectionState` can delete the active island bucket when passed empty arrays because it commits a full next record through the canonical store.
- Reset clears both ledgers.
- Travel does not clear the ledger globally; because keys are per island, a return to the same island number sees the same collected grid unless reset logic clears it.
- The current comments call the grid “per-island” and “island visit,” but implementation keys only by island number, not visit/cycle/session. This is important for Concord: do not assume it resets on travel or cycle without adding and testing that policy.

## 6. Recommended Concord construction model

SUPERSEDED: Choose **Option C — Hybrid model**. Current design chooses direct nine-fragment construction.

Rationale:

- Story pacing: named components need authored emotional beats, not arbitrary tile aliases.
- Predictability: the 3×3 grid is deterministic but depends on landed tile indices and eligible tile types; row completion order is not a good narrative spine.
- Current rewards: rows/columns/diagonals already pay dice; replacing them with named story parts would silently alter economy and player expectation.
- Full-grid completion: current full-board bonus is not a semantically meaningful technology-complete marker and has no separate full-grid ledger.
- Onboarding complexity: first-session already teaches roll, essence, Hatchery, celebration, low-dice phase, and first creature pack. Hybrid lets general pieces accrue quietly while named beats appear at controlled moments.
- Future technologies: a general piece count can become reusable technology material without making every technology a row/column bingo board.

SUPERSEDED historical MVP requirement: `requiredGeneralPieceCount: 6` for early tuning, with activation blocked until all three named components are acquired. Use the existing nine-slot count as the source for general pieces; avoid creating a duplicate “technology-piece ledger.”

## 7. Recommended Island 1 progression timing

The current first-session tutorial already has a dense sequence: `not_started` → `awaiting_first_roll` → `first_roll_consumed` → `first_essence_rewarded` → `hatchery_l1_built` → `hatchery_l1_celebrated` → `normal_play_until_low_dice` → `first_creature_pack_available` → `first_creature_pack_claimed` → `complete`.

Recommended timing:

1. **Dormant device discovery:** after the first communication-failure story beat, before or alongside the first roll tutorial, as display-only narrative. Keep it short.
SUPERSEDED historical detail: 2. **Echo Crystal:** after Hatchery Level 1 is built and after the existing Hatchery celebration has cleared. This avoids stacking rewards on the build celebration.
SUPERSEDED historical detail: 3. **Meaning Lens:** after the first creature pack is claimed, because it pairs naturally with reading creature emotion/intent.
SUPERSEDED historical detail: 4. **Concord Core:** after a separate Island 1 milestone, preferably after the player has made meaningful board/Hatchery progress beyond the first-session tutorial. Candidate: first completion of the active Hatchery objective / egg set-to-hatch, not merely Hatchery L1.
5. **Activation celebration:** after the final named component and required general piece count are both satisfied, queued behind existing blocking overlays.
6. **First full conversation:** immediately after activation animation resolves, entering the existing Caretaker inhabitant flow.
7. **Creature Channel introduction:** after first translated Caretaker conversation, as a short channel-detected beat; do not open a creature chat in the same stack unless an active companion exists and no blocking overlay is active.

Onboarding overload mitigation: do not add new interactive UI before the first roll and Hatchery L1 are understood. Let general pieces collect silently through the existing modal copy until the technology progress modal is introduced.

## 8. Locked Talk behavior

MVP recommendation: **visible but locked**.

- Keep the top-menu entry visible as “Talk to Caretaker,” but before Concord activation open a lightweight locked/partial explanation: “Requires The Concord” plus one distorted/non-verbal cue.
- Do not remove the existing Talk entry in this documentation PR or first state PR.
- Do not allow the full retro conversation before activation for new users once the feature is live.
- For richer future behavior, route pre-unlock Talk into one or two authored partial-communication scenes with distorted words, gestures, and symbols. Do not build a general partial-translation engine for arbitrary conversations.

## 9. Canonical state recommendation

Add the smallest global technology progress state to the JSON-backed Island Run game-state record in a later implementation PR:

```ts
type IslandRunTechnologyId = 'the-concord';
type IslandRunTechnologyStatus = 'undiscovered' | 'discovered' | 'assembling' | 'ready_to_activate' | 'active';
type IslandRunTechnologyProgress = {
  technologyId: IslandRunTechnologyId;
  status: IslandRunTechnologyStatus;
  acquiredComponentIds: string[];
  activatedAtMs: number | null;
};
```

Answers:

- Progress should be **global**, because The Concord is permanent after Island 1.
- Activation should remain permanent across travel and later islands.
- SUPERSEDED: named components should be stored separately from the 3×3 grid; the grid remains the general-piece source. Current design has no separate named-component gameplay gates; the grid slots are the nine Concord fragments.
- Adding fields to the existing JSON/local record is straightforward, but DB persistence requires adding explicit columns only if stored outside existing JSON columns. If added as top-level DB columns, hydrate select and write mapping must change and a migration is required. MVP should prefer the current JSON-backed record pattern only if it is already persisted by the store; otherwise schedule a migration PR.
- Defaults, sanitizers, hydration, merge, write mapping, reset, local store serialization, runtime backend patch typing, and tests must be updated.
- Reset should clear technology progress for a fresh-start run, except admin/dev snapshots should intentionally choose whether to seed active progress.
- Demo sessions should follow the same canonical state path and may seed active The Concord only for demo presets that already start beyond the intended milestone.
- Old/missing fields should sanitize to an absent/undiscovered state unless compatibility rules infer active status.
- Architecture guards should ban technology mutation in UI components and content definitions.

## 10. Canonical action recommendation

Add dedicated canonical technology actions rather than overloading `applyTechCollectionState`:

- `applyIslandRunTechnologyDiscovered({ technologyId, source, nowMs })`
- `applyIslandRunTechnologyComponentGrant({ technologyId, componentId, source, nowMs })`
- `applyIslandRunTechnologyActivation({ technologyId, source, nowMs })`

Each action should return a result object such as `{ ok, changed, status, reason, record }`, commit through `commitIslandRunState`, and be idempotent.

`applyTechCollectionState` should remain dedicated to the grid. A pure requirement resolver can read both `record.techCollectionByIsland['1']?.length` and `record.technologyProgressById['the-concord']`, but the grid persistence action should not become a named-component or activation action.

## 11. Technology registry design

Recommended folder:

```text
src/features/gamification/level-worlds/technologies/
  islandTechnologyTypes.ts
  islandTechnologyRegistry.ts
  islandTechnologyValidation.ts
  islandTechnologyAccess.ts
  definitions/theConcordTechnology.ts
  __tests__/
```

Registry APIs:

- `getIslandTechnologyDefinition(id)`
- `listIslandTechnologyDefinitions()`
- `getIslandTechnologyComponentDefinition(id)`
- `resolveIslandTechnologyRequirements(definition, record)`
- `getTechnologyAccess(record, technologyId)`

Definitions may include IDs, copy, requirements, channel IDs, source hints, and asset IDs. They must not contain callbacks, action names, reward IDs, tile indices, mutation functions, or conversation node content. This keeps the system content-driven without becoming a generic crafting engine.

## 12. Progress UI recommendation

MVP host: **new Concord progress modal launched from a top-menu Technology/Concord entry after discovery**, with summary affordance inside the existing tech pickup modal.

Why:

- The current pickup modal is transient and too small for named components, channels, and activation readiness.
- A full Workshop is premature for one technology.
- A top-menu entry matches the existing Talk entry pattern and avoids board clutter.
- The modal can communicate dormant/assembling/active state, named component slots, general piece count, next requirement, and channel readiness.

## 13. Component acquisition flow

Use one presentation surface per reward:

SUPERSEDED historical detail: - Echo Crystal: small technology-acquisition panel after the Hatchery L1 celebration clears.
SUPERSEDED historical detail: - Meaning Lens: small acquisition panel after first creature pack claim resolves.
SUPERSEDED historical detail: - Concord Core: narrative reward panel after the chosen Island 1 milestone.

Each acquisition panel should include the component name, one sentence of function, and a “View Concord” CTA. Do not also show a reward modal, story reader, and build celebration for the same component.

## 14. Activation celebration flow

Functional flow:

```text
final requirement completed → activation eligible marker/result → blocking overlays clear → activation overlay opens → dormant device appears → components power on → Retro Communication Mode Activated → channels revealed → canonical active state already committed → first Caretaker line → inhabitant flow opens → return to board
```

Recommendations:

- A dedicated `ConcordActivationCelebration` presentation component should own the animation.
- A board-level overlay coordinator or queue should own when it can open.
- Activation state should be committed before or at animation start; gameplay unlock must not depend on finishing animation.
- Replay prevention should use canonical active state plus optional UI-only “celebration seen” marker if needed.
- Reduced motion should skip pulsing/flicker and use static step cards.
- Interruption should resume to either activation overlay or the now-active Talk prompt, but never duplicate activation.

## 15. Conversation gating

Use a pure access helper in the technology domain and apply it defensively:

- top-menu selector: disabled/locked copy before active;
- board integration: routes locked Talk to partial/locked explanation;
- `IslandInhabitantFlow`: defensive guard to prevent full translated flow before access;
- conversation content definitions: remain read-only and never mutate technology state.

Recommended helper: `canUseIslandCommunication(record, { channelId: 'inhabitant' | 'creature' })`, implemented over `getTechnologyAccess(record, 'the-concord')`.

## 16. Partial-translation recommendation

Choose **authored story-only partial communication**.

A full conditional translation engine is unnecessary for MVP and risks becoming a second dialogue engine. Use two or three bespoke narrative/dialogue beats before activation: communication failure, Echo sound-only cue, Meaning intent cue. After activation, route into the existing retro conversation flow.

## 17. Creature Channel MVP

Smallest useful proof:

- After Concord activation, the active companion card/sanctuary detail can show “Talk” if an active companion exists.
- Support one authored generic companion conversation for the current active companion, using creature name/personality/card metadata for display only.
- If no active companion exists, show “Choose a companion to open the Creature Channel.”
- No AI chat, no infinite chat, no bond mutation, no feeding mutation, no sanctuary economy changes.
- Defer wild creatures, hatchlings, guardians, personality branching, and bond rewards.

## 18. Narrative integration

Recommended flow:

```text
Island 1 communication-failure narrative beat → existing board tech collection accrues general pieces → authored named component acquisitions → activation celebration → translated retro Caretaker conversation
```

Use `IslandStoryReader` for major story/cinematic episodes, `IslandNarrativeDialogue` for short authored beats, `IslandInhabitantFlow` for the premium-to-retro caretaker flow, the Concord progress modal for device status, and the activation celebration only for the final unlock. Narrative definitions must remain display-only.

## 19. Overlay/collision strategy

Priority from highest to lowest:

1. system/auth/purchase-critical prompts;
2. travel and island-clear/boss resolution;
3. StoryReader / narrative dialogue;
4. Hatchery/build/stop mandatory modals and celebrations;
5. creature pack / reward claim / egg-ready surfaces;
6. Concord activation celebration;
7. inhabitant flow / creature talk;
8. Concord progress modal and top-menu informational surfaces;
9. transient pickup overlays.

Rules:

- Never stack activation over another modal.
- Queue activation while board movement, stop rewards, Hatchery celebration, creature pack, shop, market, sanctuary, minigames, boss, travel, or story surfaces are active.
- Use fixed viewport portal overlays and lock background scroll.
- Restore focus to the triggering control or board top-menu.
- Reduced motion replaces flicker/pulse with static states.
- If interrupted, resume by rechecking canonical state and pending UI marker; do not rerun grants.

## 20. Migration and backward compatibility

Policy:

- Users already beyond the intended activation milestone should receive active Concord through lazy compatibility, not lose Talk access.
- Users on Island 1 before that milestone keep existing grid progress and enter the new progression at the closest safe status.
- Users with partial or completed tech grids keep those grids; do not reset them.
- Users who already used Talk to Caretaker should not suddenly lose access. Infer active state for those with clear post-milestone progress or add a one-time backfill marker.
- Demo/admin snapshots should explicitly seed technology progress in their preset data.
- Reset users start undiscovered.

Prefer sanitizer-derived lazy compatibility plus a canonical marker written only by a later migration/action PR. Avoid destructive backfills.

## 21. Existing 3×3 reward compatibility

SUPERSEDED historical detail: Keep the existing line and full-board dice rewards for the MVP. Re-labeling the pieces as `Ancient Components` is safe only if the dice reward copy remains visible. If economy changes are desired later, create a separate economy PR with telemetry and migration notes.

After Concord activation, continue allowing per-island tech grid rewards unless/until a broader technology system defines future uses. Do not silently remove +10 line rewards or +100 full-grid rewards.

## 22. Complete asset inventory

| Asset | Suggested filename | Runtime path | Dimensions | Aspect | Transparency | Format | Loading | Priority | Status |
|---|---|---:|---:|---:|---|---|---|---|---|
| Dormant Concord | `concord-dormant.webp` | `/assets/islands/island-001/technologies/the-concord/concord-dormant.webp` | 1536×1536 | 1:1 | yes | WebP | lazy/preload before activation | P0 | Missing |
| Assembling Concord | `concord-assembling.webp` | same folder | 1536×1536 | 1:1 | yes | WebP | lazy | P0 | Missing |
| Activated Concord | `concord-active.webp` | same folder | 1536×1536 | 1:1 | yes | WebP | preload for activation | P0 | Missing |
| Device icon | `concord-icon.webp` | same folder | 256×256 | 1:1 | yes | WebP | eager after discovery | P0 | Missing |
| Silhouette | `concord-silhouette.webp` | same folder | 1024×1024 | 1:1 | yes | WebP | lazy | P1 | Missing |
| Blueprint | `concord-blueprint.webp` | same folder | 1600×1000 | 16:10 | no/optional | WebP | lazy | P1 | Missing |
| Activation hero | `concord-activation-hero.webp` | same folder | 1920×1080 | 16:9 | no | WebP | preload when ready | P0 | Missing |
| Screen mask/insert | `concord-screen-mask.png` | same folder | 1200×800 | 3:2 | yes | PNG/WebP | eager for activation | P1 | Missing |
SUPERSEDED historical detail: | Echo Crystal | `component-echo-crystal.webp` | same folder | 512×512 | 1:1 | yes | WebP | eager on acquisition | P0 | Missing |
SUPERSEDED historical detail: | Meaning Lens | `component-meaning-lens.webp` | same folder | 512×512 | 1:1 | yes | WebP | eager on acquisition | P0 | Missing |
SUPERSEDED historical detail: | Concord Core | `component-concord-core.webp` | same folder | 512×512 | 1:1 | yes | WebP | eager on acquisition | P0 | Missing |
| Ancient Component | `component-ancient-piece.webp` | same folder | 256×256 | 1:1 | yes | WebP | eager | P0 | Missing; current UI uses emoji ⚙️ |
| Empty slot | `component-slot-empty.svg` | same folder | 256×256 | 1:1 | yes | SVG | inline/lazy | P1 | Missing |
| Completed slot | `component-slot-complete.svg` | same folder | 256×256 | 1:1 | yes | SVG | inline/lazy | P1 | Missing |
| Inhabitant Channel | `channel-inhabitant.svg` | same folder | 256×256 | 1:1 | yes | SVG | lazy | P1 | Missing |
| Creature Channel | `channel-creature.svg` | same folder | 256×256 | 1:1 | yes | SVG | lazy | P1 | Missing |
| Expedition Channel | `channel-expedition.svg` | same folder | 256×256 | 1:1 | yes | SVG | lazy | P2 | Missing |
| Archive Channel | `channel-archive.svg` | same folder | 256×256 | 1:1 | yes | SVG | lazy | P2 | Missing |
| Unknown Signal | `channel-unknown.svg` | same folder | 256×256 | 1:1 | yes | SVG | lazy | P2 | Missing |
| Locked state | `channel-locked.svg` | same folder | 256×256 | 1:1 | yes | SVG | lazy | P1 | Missing |
| Signal flicker | CSS/SVG effect | component-owned CSS | n/a | n/a | n/a | CSS/SVG | code-split | P1 | Missing |
| Power pulse | CSS effect | component-owned CSS | n/a | n/a | n/a | CSS | code-split | P1 | Missing |
| Translation scan | CSS effect | component-owned CSS | n/a | n/a | n/a | CSS | code-split | P1 | Missing |
| Online glow | CSS effect | component-owned CSS | n/a | n/a | n/a | CSS | code-split | P1 | Missing |
| Retro Mode activation screen | `retro-mode-activated.webp` | same folder | 1600×900 | 16:9 | no | WebP | preload for activation | P0 | Missing |
| Retro conversation frames | existing CSS/components | `IslandRetroConversation.tsx` / CSS | responsive | n/a | n/a | CSS/HTML | existing | P0 | Exists |
| Caretaker inhabitant data | existing definitions | `island001Inhabitants.ts` | n/a | n/a | n/a | TS | existing | P0 | Exists |
| Caretaker conversations | existing definitions | `island001Conversations.ts` | n/a | n/a | n/a | TS | existing | P0 | Exists |
| Island 1 scenes | existing public assets | `/assets/islands/island-001/...` | mixed | mixed | mixed | WebP | existing | P0 | Exists for board/background/landmarks/boss/scenery |
| Device concepts | n/a | n/a | n/a | n/a | n/a | n/a | n/a | P0 | Not found |

## 23. Image-production order

1. Final Concord device shape.
2. Dormant device.
3. Activated device.
4. Partially assembled device.
SUPERSEDED historical detail: 5. Echo Crystal.
SUPERSEDED historical detail: 6. Meaning Lens.
SUPERSEDED historical detail: 7. Concord Core.
8. Ancient Component.
9. Technology progress modal mockup.
10. Activation celebration mockup.
11. Device-framed retro conversation mockup.
12. Channel icons.
13. Partial-translation states.

Must be approved before coding: final device shape, dormant/active states, three named components, ancient component icon, progress modal mockup, activation celebration mockup.

## 24. Implementation PR stack

1. **Technology content domain** — types, registry, validators, Concord definition, pure requirement resolvers, no runtime mutation.
2. **Canonical Concord state** — progress field, defaults, sanitization, hydration, merge/write mapping, reset/demo/admin handling, canonical actions, tests.
3. **Concord progress UI in isolation** — progress modal, component slots, general piece count, locked/active channel display, no grants.
4. **Island 1 acquisition wiring** — named component grant sources, existing-grid requirement integration, locked Talk state, no activation celebration.
5. **Activation and communication unlock** — activation overlay/queue, permanent unlock, first translated Caretaker flow, defensive gating.
6. **Creature Channel proof** — one active-companion authored conversation, no AI, no bond/economy mutation.
7. **Economy/UX retune follow-up if needed** — optional separate PR for tech-grid reward copy or reward amounts.

## 25. Risks and mitigations

| Risk | Mitigation |
|---|---|
| First-session overload | Delay named components until after existing tutorial beats clear. |
| Unpredictable grid completion | Use grid count only; named parts come from authored milestones. |
| Duplicate reward grants | Dedicated idempotent actions and component ID sets. |
| Existing users lose Talk | Lazy compatibility infers active for established/post-milestone users. |
| Renderer-side gameplay mutation | All grants/activation through canonical actions; add guards. |
| Hatchery celebration conflict | Queue component panels and activation after Hatchery overlay closes. |
| Modal stacking | Central blocking helper/queue; fixed portal overlays only. |
| Two technology systems | Reuse existing grid as general pieces; add only one small registry/state domain. |
| Oversized crafting engine | Single-tech definitions and pure resolvers; no recipes/callbacks. |
| Unclear locked Talk | Visible locked Talk with explanation and optional partial cue. |
| Asset workload | Approve P0 assets before UI coding; use CSS effects for P1 effects. |
| Retro content obscured | Device frame only around activation/tutorial, not every conversation page. |
| Creature scope creep | One active-companion authored talk only; no AI/bond rewards. |
| Persistence conflicts | Update sanitize/hydrate/merge/write/reset tests in state PR. |
| Travel/reset ambiguity | Global active Concord; reset clears only fresh-start; grid remains per-island. |
| Economy changes | Keep current dice rewards unless separate economy PR. |
| Auto-activation wrong time | Activation action requires both named components and general count, queue UI separately. |

## 26. Open questions

SUPERSEDED historical detail: 1. What exact Island 1 milestone should grant the Concord Core: egg set-to-hatch, Island Heart activation, or a new objective?
2. Should compatibility infer active Concord from current island number > 1, Talk usage, Hatchery completion, or a stricter milestone?
3. Should the required general piece count be 6, 9, or tuned from analytics?
4. Should the current grid copy be renamed before or after the Concord progress modal ships?
5. Which active companion should receive the first authored Creature Channel line if multiple starter creatures exist?
6. Is a global overlay coordinator planned soon enough to host activation queueing, or should Concord add a narrow blocker helper first?

## 27. PASS, PASS WITH CONDITIONS, or FAIL

**PASS WITH CONDITIONS.** The Concord is compatible with the repository if implemented through a small canonical technology domain, a superseded hybrid construction model, idempotent actions, existing-grid reuse, explicit locked Talk behavior, and careful overlay queueing. Do not implement it by adding UI-local gameplay writes, a second dialogue engine, a separate tech-piece ledger, or a generic crafting engine.
