# Creature Emotion Narrative Investigation (2026-06-29)

Status: documentation/design investigation only. No runtime implementation, schema migration, gameplay behavior, creature state, technology state, triggers, rewards, UI component, AI call, or personal-data read was introduced.

## 1. Executive findings

**Verdict: PASS WITH CONDITIONS.** The repo already has a workable creature companion foundation for display-only narrative variation, but it does **not** yet have a canonical normalized creature emotion model.

Key findings:

1. The live creature catalogue contains **45 creatures**: 15 common, 15 rare, and 15 mythic.
2. Every catalogue creature has an `affinity`, `habitat`, `shipZone`, `tier`, `id`, `imageKey`, and `name`, so every creature has at least a lightweight symbolic identity.
3. Existing creature identity is closer to **personality/archetype support** than emotional-capacity modeling.
4. Active companion state already exists as `activeCompanionId` in authoritative Island Run runtime state.
5. Runtime creature collection entries persist ownership, copies, timestamps, bond XP/level, feeding time, form level, and claimed milestones, but do not persist emotion/personality profile fields.
6. The best near-term story resolver should read the active companion and catalogue metadata, choose one display-only family variant, and fall back to generic copy when no companion or no matching capacity exists.
7. A new normalized emotional-capacity field is recommended, but as catalogue/type metadata first. No SQL migration is required unless product later wants player-specific creature emotional growth or per-creature mutable emotion state.
8. The smallest scalable model is: canonical beat + companion presentation family + fallback copy. Do not author full creature-specific story trees.

## 2. Relevant PRs and documents

### Git history reviewed

Recent/historical commits and PR merges touching relevant systems include:

- `0287628` — Add Island 2 (Pebble Bay) narrative proposal.
- `7b7c0cf` — Generalize narrative reaction layer to be island-agnostic.
- `fb58a2e` — Wire Island 1 boss-midpoint beat.
- `6ccdabd` — Wire Island 1 narrative reaction beats.
- `00c3d4c` — Author remaining Island 1 narrative beat content.
- `fe30fab` / PR #2959 — new-player game loop merge.
- `66dbaa6` — polished 3x3 tech collection modal and full-grid celebration.
- `965a0ae` / PR #2950 — Concord technology investigation.
- `a0b2590` — add Concord technology investigation.
- `6810a56` — document inhabitant communication investigation.
- `71eb8bb`, `94ce45a`, `6966077`, `ea90044`, `07a3ec7c` — Island 1 narrative/resolution/finale/content contract commits.

These were not treated as titles-only evidence. Runtime code and docs were inspected.

### Documents inspected

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/CREATURE_PERSONALITY_DEX_V1.md`
- `docs/CREATURE_DEX_EXCELLENCE_AUDIT_V1.md`
- `docs/PERFECT_COMPANION_BUILD_PHASES.md`
- `docs/PERFECT_COMPANION_NEXT_NOW.md`
- `docs/investigations/creature-sanctuary-companion-regen-investigation.md`
- `docs/investigations/creature-companion-wisdom-stop-plan.md`
- `docs/investigations/creature-pack-dice-regen-architecture.md`
- `docs/investigations/creature-card-system-v2-data-model.md`
- `docs/gameplay/ISLAND_RUN_INHABITANT_COMMUNICATION_INVESTIGATION_2026-06-26.md`
- `docs/gameplay/island-001-narrative-content-contract.md`
- `docs/investigations/holistic-island-storytelling-system-audit.md`

Best current explanation of intended creature emotional/personality direction: **`docs/CREATURE_PERSONALITY_DEX_V1.md`**, supported by `docs/investigations/creature-sanctuary-companion-regen-investigation.md` and `docs/investigations/creature-companion-wisdom-stop-plan.md`.

## 3. Current creature personality/emotion architecture

### Runtime files inspected

- `src/features/gamification/level-worlds/services/creatureCatalog.ts`
- `src/features/gamification/level-worlds/services/creatureCardCatalog.ts`
- `src/features/gamification/level-worlds/services/creatureCardV2Adapter.ts`
- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts`
- `src/features/gamification/level-worlds/services/creatureFitEngine.ts`
- `src/features/gamification/level-worlds/services/creatureCollectionService.ts`
- `src/features/gamification/level-worlds/services/creatureSanctuaryAdapter.ts`
- `src/features/gamification/level-worlds/services/companionRegenModifier.ts`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- Player Hand/archetype files under `src/features/identity/archetypes` and `src/features/players_hand/trait-card-hand-main`.

### What exists today

| Layer | Exists today | Notes |
|---|---:|---|
| Species identity | Yes | `id`, `imageKey`, `name`. |
| Rarity | Yes | `tier`: common, rare, mythic. |
| Habitat | Yes | Free-text habitat labels such as Zen Garden, Hydro Deck, Astral Dome. |
| Ship zone | Yes | Normalized `zen`, `energy`, `cosmic`. |
| Affinity | Yes | Free-text-ish controlled labels such as Builder, Grounded, Visionary, Oracle. |
| Archetype bridge | Yes | Affinity maps to Player Hand archetype IDs. |
| Weakness support tags | Yes | Six normalized support tags. |
| Perfect Companion fit | Yes | Scores strength match, healing match, zone match, rarity bonus. |
| Bond progression | Yes | Runtime bond XP/level and milestones. |
| Feeding | Yes | Treat inventory/feed paths and cooldown/display state. |
| Emotional profile | No canonical field | Emotional roles exist in docs/proposals, not runtime catalogue. |
| Creature dialogue | Planned/partial | Wisdom encounter investigation recommends display-only resolver. |
| AI companion | Planned separately | AI docs exist; not canonical Island Run authored story. |

### Required questions answered

1. **What creature personality or emotional data exists today?** Existing data is `affinity`, `shipZone`, `habitat`, archetype mappings, weakness-support tags, card copy, and proposed emotional-role copy in docs. There is no persisted normalized emotion model.
2. **Which fields are canonical and persisted?** Runtime creature collection, active companion, perfect companion IDs/reasons, bond XP/level, last fed, copies, form level, and claimed milestones are persisted in Island Run runtime state.
3. **Which fields are static catalogue metadata?** `id`, `imageKey`, `name`, `tier`, `habitat`, `affinity`, `shipZone`, card metadata, art manifests, affinity-to-archetype mappings, and weakness-support mappings.
4. **Which qualities are inferred from player trait cards?** Perfect Companion `strengthMatch`, `healingMatch`, matched archetypes, matched weakness tags, and preferred zone fit are inferred from Player Hand/archetype context.
5. **Which qualities are merely display copy?** Card flavor quotes, passive names/text, stat lines, emotional-role lines in docs, sanctuary labels, and proposed creature wisdom copy.
6. **Does every creature already have a personality or emotional identity?** Every creature has an affinity-based personality identity. Only the first eight have a detailed personality-dex treatment; remaining creatures have backlog placeholders. No creature has a canonical emotional-capacity object.
7. **Are there normalized emotion IDs, free-text descriptions, archetypes, specialties, or no emotion model?** There are normalized weakness-support tags and ship zones, free-text affinity/habitat labels, archetype bridge IDs, and specialty/bonus effects. There are no normalized emotion IDs.
8. **How is the active companion stored?** As `activeCompanionId: string | null` in `IslandRunGameStateRecord`, serialized as `active_companion_id`; legacy localStorage fallback exists but is non-authoritative.
9. **Can narrative presentation safely read the active companion?** Yes, if it reads canonical state/store snapshot and catalogue metadata only, and treats missing/stale IDs as fallback/no-companion.
10. **Can companion data influence display-only story selection without gameplay mutation?** Yes. A pure resolver can map active companion catalogue data to copy variants without writing runtime state or rewards.
11. **What happens when no companion is active?** Existing UI shows Active: None or no active sanctuary card. A story resolver should use no-companion fallback copy where Captain Ivo or an inhabitant carries the beat.
12. **What happens if the player owns no creature matching the island ideal counter-capacity?** The island must still complete normally. Use fallback capacities, active companion’s nearest family, or no-companion copy. Never require a specific creature.
13. **How many creatures and personality combinations currently exist?** 45 catalogue creatures. Current affinity labels form about 23 affinity identities; fit combinations derive from Player Hand archetype intersections plus six weakness-support tags and three ship zones, not from a fixed emotional combination table.
14. **Which existing services should a future story resolver use?** `useIslandRunState`/store snapshot for reads, `getCreatureById`, `CREATURE_CATALOG`, `getCreatureCardMetadata`, `creatureSanctuaryAdapter` concepts, `creatureArchetypeBridge`, and `creatureFitEngine` for optional mapping. It should not use legacy localStorage services as authority.
15. **Is a new normalized emotional-capacity field recommended?** Yes, for authored narrative selection and consistency.
16. **Would adding it require a migration, or only catalogue/type changes?** Catalogue/type changes only if static. Migration only if mutable per-player/per-creature emotional state is persisted.
17. **Which PR or document best explains intended creature emotion system?** `docs/CREATURE_PERSONALITY_DEX_V1.md` best explains intent; `creature-sanctuary-companion-regen-investigation.md` validates current data and active companion state.
18. **What is the smallest implementation model that avoids unique story trees for every creature?** Group creatures into 4 presentation families, resolve deterministic display copy from active companion profile, and use shared fallback copy.

## 4. Canonical versus display-only data

### Canonical and persisted today

- `creatureCollection`: ownership entries.
- `activeCompanionId`: current selected companion.
- `perfectCompanionIds` and `perfectCompanionReasons`: computed recommendations.
- Bond state: `bondXp`, `bondLevel`, `lastFedAtMs`, `claimedBondMilestones`.
- Form state: `formLevel`, `claimedFormRewards` where present.
- Treat inventory.

### Static catalogue metadata today

- Creature ID/name/art key.
- Tier, habitat, affinity, ship zone.
- Card metadata: title, quotes, passive names/text, power labels, stat line, theme.
- Affinity-to-archetype and affinity-to-weakness-support bridge.
- Art manifests and image fallback metadata.

### Display-only today

- Flavor quote, passive copy, card title/stat line.
- Sanctuary descriptive labels.
- Proposed emotional roles in docs.
- Wisdom/companion encounter copy proposals.

## 5. Active companion access

Recommended read pattern for future narrative:

```ts
const activeCompanionId = islandRunState.activeCompanionId;
const activeCompanion = activeCompanionId ? getCreatureById(activeCompanionId) : null;
const isOwned = activeCompanionId
  ? islandRunState.creatureCollection.some((entry) => entry.creatureId === activeCompanionId && entry.copies > 0)
  : false;
```

If `activeCompanionId` is null, stale, or unowned, return `companion: null` and select no-companion copy. Do not clear or repair state from the narrative resolver; cleanup belongs to canonical action services.

## 6. Recommended emotional taxonomy

### Evaluation of proposed taxonomy

The proposed 12-capacity shape maps well to the story ambition, but it would duplicate existing affinity labels if added without a bridge. It should be adopted as **content metadata**, not gameplay state.

Recommended capacities:

```ts
type CreatureEmotionalCapacity =
  | 'calm'
  | 'curiosity'
  | 'courage'
  | 'playfulness'
  | 'generosity'
  | 'hope'
  | 'patience'
  | 'honesty'
  | 'tenderness'
  | 'determination'
  | 'self_trust'
  | 'connection';

type CreatureEmotionalProfile = {
  primaryCapacity: CreatureEmotionalCapacity;
  secondaryCapacity?: CreatureEmotionalCapacity;
  stressPattern?: string;
  teachingStyle?: string;
};
```

### Firm recommendation

**Adopt the 12 capacity IDs as static catalogue-adjacent metadata, grouped into 4 presentation families for runtime display selection.**

Presentation families:

1. **Steadying**: `calm`, `patience`, `tenderness`.
2. **Opening**: `curiosity`, `playfulness`, `hope`.
3. **Brave Action**: `courage`, `determination`, `honesty`.
4. **Relational Voice**: `generosity`, `connection`, `self_trust`.

Why not fewer than 12? The islands need distinct counter-capacities across curiosity/trust, release/play, generosity, hope/courage, and self-trust. Four IDs would be too blunt for authored story design.

Why not use affinity only? Affinity currently mixes role, archetype, and vibe. `Guardian`, `Builder`, and `Visionary` are useful but do not directly answer whether a creature models calm, generosity, hope, or self-trust.

Suggested bridge examples:

| Existing affinity | Likely capacities |
|---|---|
| Grounded / Steady / Peacemaker | calm, patience, connection |
| Explorer / Dreamer / Visionary | curiosity, hope, playfulness |
| Champion / Challenger / Rebel / Catalyst | courage, determination, honesty |
| Nurturer / Caregiver / Mentor / Guardian | tenderness, generosity, connection |
| Sage / Oracle / Cosmic | honesty, calm, hope |
| Builder / Architect / Strategist | determination, patience, self_trust |

## 7. Story resolver recommendation

### Resolver contract

```ts
type CompanionNarrativeFamily =
  | 'steadying'
  | 'opening'
  | 'brave_action'
  | 'relational_voice'
  | 'fallback'
  | 'none';

type CompanionStoryVariant = {
  family: CompanionNarrativeFamily;
  line: string;
  gesture?: string;
};
```

Inputs:

- canonical island beat ID;
- active companion ID from state;
- owned creature collection for validation;
- static catalogue emotional profile or affinity bridge;
- optional deterministic seed from `userId + islandNumber + beatId + creatureId`.

Rules:

1. Pure function; no writes.
2. Deterministic for the same state.
3. If no active/owned companion, select no-companion line.
4. If no ideal capacity match, use family fallback.
5. Never alter rewards, stop completion, build state, boss state, technology state, or runtime state.
6. Never gate completion on companion ownership.

## 8. Migration/schema impact

### No migration required for recommended PR 2

If `emotionalProfile` is added to `CreatureDefinition` or a catalogue-adjacent config file, it is static content. It ships as TypeScript data and tests. No SQL migration is required.

### Migration required only if later scope expands

A migration would be needed only for:

- per-user companion emotional growth;
- creature mood history;
- learned dialogue memory;
- persistent story variant seen-state per companion;
- AI-personalized companion memory.

Those are explicitly out of scope for the Story Bible V2 proposal.

## 9. Risks

1. **Semantic duplication**: emotional capacities could duplicate affinity unless documented as story-facing presentation metadata.
2. **Gameplay-authority creep**: companion variants could accidentally become hidden requirements. Mitigation: resolver tests and content validation forbid rewards/actions/mutations.
3. **Legacy localStorage confusion**: old creature services still exist. Future narrative must read canonical runtime state, not localStorage authority.
4. **Combinatorial content growth**: unique lines for 45 creatures across all beats will not scale. Use families and fallback copy.
5. **Privacy creep**: optional AI companion layer must remain separate from authored island content and require explicit privacy review.

## 10. Final verdict

**PASS WITH CONDITIONS.** Proceed with Story Bible V2 and static emotional taxonomy. Add catalogue emotional profiles only in a later PR after content review. Do not add schema migrations, gameplay changes, reward changes, or companion requirements.
