# Creature Cards / Creature Dex Production Investigation — Part II

## 1) Executive summary

This repo already contains a substantial **Creature Sanctuary + card foundation**, plus onboarding/reward flows for first-session and welcome packs.

Key findings:

- A concrete creature registry exists in code: `CREATURE_CATALOG` with **45 creatures** (15 common / 15 rare / 15 mythic), each currently defined by `id`, `imageKey`, `name`, `tier`, `habitat`, `affinity`, `shipZone`.
- A full “production-quality metadata dex” is **not fully complete** yet: the card metadata layer is only curated for a subset (8 creatures), while the rest use generated fallback text.
- Card rendering already exists in multiple UI surfaces:
  - `CreatureGridCard` (minimal sanctuary grid)
  - `CreatureCard` (detailed card with richer metadata)
  - Hatch reveal and pack reveal modal cards
- Reward flows already grant creatures/cards through canonical services:
  - first session creature pack claim action
  - welcome pack claim/full-claim actions
  - egg reward inventory open action
- Supabase/runtime state already has creature-related fields (collection, active companion, treat inventory, egg reward inventory, onboarding/welcome-pack flags).

Build validation:

- `npm run build` **passed** (with pre-existing Vite chunk warnings only).

---

## 2) Current file/component map

### Core creature/domain registries & schemas

- `src/features/gamification/level-worlds/services/creatureCatalog.ts`
  - Creature definitions, tier pools, deterministic egg selection, early-featured pool logic.
- `src/features/gamification/level-worlds/services/creatureCardCatalog.ts`
  - Card metadata schema + curated metadata + fallback generator.
- `src/features/gamification/level-worlds/services/creatureStageCatalog.ts`
  - Stage definition hooks for creature stage art support (separate from base catalog).
- `src/features/gamification/level-worlds/services/creatureImageManifest.ts`
  - Canonical path generation for creature cutouts/frames/backgrounds/placeholders.

### Sanctuary / card UI components

- `src/features/gamification/level-worlds/components/CreatureGridCard.tsx`
  - Minimal grid card (image + lock/active + stars).
- `src/features/gamification/level-worlds/components/CreatureCard.tsx`
  - Rich card face (name, rarity, art window, power/stat/passive/quote).
- `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx`
  - Hatch reveal card-like presentation.
- `src/features/gamification/level-worlds/components/CreaturePackOpeningPrototypeModal.tsx`
  - Pack reveal ceremony using `CreatureCard`.
- `src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx`
  - First-session 5-card reveal modal.
- `src/features/gamification/level-worlds/components/WelcomePackModal.tsx`
  - Welcome-pack claim/reveal modal.

### Sanctuary model adapters/services

- `src/features/gamification/level-worlds/services/creatureSanctuaryAdapter.ts`
  - Derives sanctuary gallery cards + summary from canonical runtime record.
- `src/features/gamification/level-worlds/services/creatureCollectionService.ts`
  - Legacy localStorage fallback collection service (explicitly marked non-authoritative for economy state).
- `src/features/gamification/level-worlds/services/islandRunCreatureCollectionLedger.ts`
  - Canonical collection ledger mutation helpers.

### Reward/pack/egg services (card grant sources)

- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackClaimAction.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackFullClaimAction.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackRewardBundleAction.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackEligibility.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackOnboardingUi.ts`
- `src/features/gamification/level-worlds/services/islandRunCreaturePackResolver.ts`
- `src/features/gamification/level-worlds/services/islandRunAdminDevPackGrantAction.ts`
- `src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts`
- `src/features/gamification/level-worlds/services/islandRunTreasurePathEggReward.ts`

### Main integration surface

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  - Hosts Sanctuary panel UI, hatch reveal modal, first-session pack modal, welcome pack modal, and prototype pack opening flow.

### Supabase migrations related to creature state

- `supabase/migrations/0168_island_run_egg_state_columns.sql`
- `supabase/migrations/0169_island_run_per_island_eggs.sql`
- `supabase/migrations/0191_island_run_creature_collection_sync.sql`
- `supabase/migrations/0236_add_egg_reward_inventory.sql`
- `supabase/migrations/0240_add_welcome_pack_claimed_column.sql`
- `supabase/migrations/0241_add_welcome_pack_reward_bundle_claimed_column.sql`

---

## 3) Existing creature data model

### A) Base creature registry

`CreatureDefinition` currently includes:

- `id`
- `imageKey`
- `name`
- `tier` (`common | rare | mythic`)
- `habitat`
- `affinity`
- `shipZone` (`zen | energy | cosmic`)

This is the current canonical identity layer.

### B) Card metadata model

`CreatureCardMetadata` currently includes:

- `creatureId`
- `displayName`
- `shortTitle`
- `rarityLabel`
- `flavorQuote`
- `passiveName`
- `passiveText`
- `powerLabel`
- `statLine`
- `theme` object with:
  - `tier`
  - `shipZone`
  - `accent`
  - `template`

Status:

- Curated metadata exists for only a subset (8 named creatures).
- Remaining creatures use fallback metadata generation.

### C) Runtime/sync state model for owned creatures

`IslandRunGameStateRecord` already contains:

- `creatureCollection: CreatureCollectionRuntimeEntry[]`
- `activeCompanionId: string | null`
- `creatureTreatInventory` (`basic`, `favorite`, `rare`)
- `eggRewardInventory: EggRewardInventoryEntry[]`
- onboarding/claim flags:
  - `firstSessionTutorialState`
  - `welcomePackClaimed`
  - `welcomePackRewardBundleClaimed`

`CreatureCollectionRuntimeEntry` currently tracks:

- `creatureId`, `copies`
- collection timestamps/island provenance
- `bondXp`, `bondLevel`, `lastFedAtMs`
- `claimedBondMilestones`
- optional `grantIds` audit markers

---

## 4) Existing Creature Dex status: **PARTIAL**

### Why PARTIAL (not FULL)

What exists:

- Full 45-creature base registry exists and is usable in production logic.
- Deterministic selection by egg tier/seed/island exists.
- Runtime ownership/collection/active-companion persistence exists.
- Sanctuary gallery adapter exists.
- Card metadata schema exists.

What is missing for “FULL production Dex”:

- Full curated per-creature card metadata for all 45 (currently partial + fallbacks).
- A complete production-backed “card backside/deep metadata” schema integrated for every creature.
- Mature stage/form/card-variant dex layer (docs discuss it, but runtime catalog is still base-identity oriented).

---

## 5) Existing card rendering flow

### Flow layers

1. **Creature identity source**
   - `creatureCatalog.ts` provides creature definition.

2. **Card metadata resolve**
   - `getCreatureCardMetadata(creature)` returns curated metadata (if present) or fallback metadata.

3. **Art manifest resolve**
   - `resolveCreatureArtManifest(creature)` returns cutout/frame/background/silhouette paths.

4. **Render surfaces**
   - Minimal grid cards: `CreatureGridCard`
   - Rich detailed card: `CreatureCard`
   - Reveal modals (first-session/welcome/hatch/prototype) render simplified or full card styles depending on modal.

### Current “simple front” readiness

Already feasible today:

- A simple front card can use `name`, `rarityLabel/tier`, and one to two basic stats labels from current metadata (`powerLabel`, `statLine`) while swapping image assets via `imageKey` + manifest paths.

---

## 6) Existing modal / pack / reward flow

### First-session creature pack flow

- Tutorial state machine includes:
  - `first_creature_pack_available`
  - `first_creature_pack_opened`
  - `first_creature_pack_claimed`
- `FirstSessionCreaturePackModal` handles intro/open/reveal/already-claimed/error phases.
- Claim action grants cards and dice through canonical state action path.

### Welcome pack flow

- Eligibility + auto-show gating service exists.
- `WelcomePackModal` supports claim pending/error/already claimed/partial claim states.
- Full claim action coordinates:
  - creature cards
  - dice/essence/event-ticket bundle behavior (with “no active event” fallback behavior).

### Egg reward inventory flow

- Treasure/egg rewards can create inventory vouchers (`eggRewardInventory`).
- Opening an egg inventory entry resolves a creature and writes to canonical collection.

### Hatch reveal / set companion flow

- Hatch reveal modal displays creature art and supports “Set as Companion”.
- Companion activation writes via canonical action services.

---

## 7) Current asset path conventions

From code and docs:

- Creature cutout (webp): `/assets/creatures/{imageKey}.webp`
- Creature cutout fallback (png): `/assets/creatures/{imageKey}.png`
- Rarity frame: `/assets/creature-frames/{tier}.webp`
- Background: `/assets/creature-backgrounds/{affinity-or-zone}.webp`
- Placeholder silhouette: `/assets/creature-placeholders/silhouette.webp`

Egg hatch animation references also appear under:

- `/assets/creatures/egg-hatch/...`

Conventions are centralized in `creatureImageManifest.ts` and aligned with `docs/CREATURE_IMAGE_PRODUCTION_GUIDE.md`.

---

## 8) Gaps and risks

### Data/content gaps

- Most creatures still rely on fallback metadata text rather than curated production card copy.
- No fully standardized production “deep metadata/backside schema” wired for all 45 entries.
- Stage/form/card-variant dex strategy is documented but not fully modeled in the base runtime card/dex surface.

### UX/system risks

- Sanctuary/card integration is heavily concentrated inside `IslandRunBoardPrototype.tsx` (large integration surface).
- Mixed legacy fallback service presence (`creatureCollectionService.ts`) can cause confusion if new work accidentally treats it as authoritative.
- Pack/reward flows are distributed across multiple services; card schema changes should avoid side effects in claim/action paths.

### Scope safety risks for future work

- Any creature card production pass should avoid touching:
  - gameplay reward economy logic,
  - Island Run progression/state contracts,
  - Supabase schema/migrations,
  - ticket/dice/essence balancing code.

---

## 9) Recommended production plan

### Safe target architecture for “simple front-facing card + dynamic metadata”

1. Keep `creatureCatalog` as the stable **identity/source roster**.
2. Keep `creatureImageManifest` as the stable **asset path resolver**.
3. Expand `creatureCardCatalog` into the stable **card metadata authority**.
4. Continue rendering simple front card using:
   - image (from manifest)
   - name
   - rarity
   - minimal stat labels
5. Put deeper fields on backside/modal/tooltip metadata (same source object, different view).

### Practical sequencing

- Phase A: metadata completion only
  - Fill curated metadata for all 45 creatures (no gameplay effects).
- Phase B: front-card template hardening
  - Lock one simple reusable card-front component contract.
- Phase C: backside/deep metadata panel
  - Add/read deeper copy fields without changing reward/economy.
- Phase D: optional stage/form extension
  - Add separate card-variant metadata layer (without altering base creature IDs).

---

## 10) Suggested PR slices

1. **PR Slice 1 — Metadata completion (no UI change)**
   - Expand `creatureCardCatalog` to full curated metadata coverage for all current creatures.
   - Add tests validating metadata completeness and no missing key fields.

2. **PR Slice 2 — Simple front-card template unification**
   - Standardize a single “front face” template component using dynamic manifest + metadata.
   - Keep existing reveal/sanctuary flows but switch to the unified face where safe.

3. **PR Slice 3 — Backside/deep metadata panel**
   - Add optional details panel/backside model (supportive copy fields only).
   - No reward or economy coupling.

4. **PR Slice 4 — Dex status & filtering polish**
   - Improve dex UX status labels (owned/locked/active) and zone/tier filters using existing adapter outputs.

5. **PR Slice 5 — Stage/variant scaffolding (optional, future)**
   - Introduce additive variant-level metadata model for stage/form cards.
   - Keep base 45-creature IDs unchanged.

---

## Validation

Command run:

- `npm run build`
  - **Result: PASS**
  - Notes: Build succeeded. Existing warnings were Vite chunk-size/dynamic-import warnings, not creature-specific failures.
