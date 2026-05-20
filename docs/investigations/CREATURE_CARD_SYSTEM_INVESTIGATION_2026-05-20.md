# Creature Card System Investigation

**Investigation Date:** 2026-05-20  
**Status:** Snapshot — subject to future upgrades  
**Purpose:** Document existing card/card-like UI systems before implementing app-rendered Creature Cards

---

## Executive Summary

The repository has multiple card-like UI systems across creature, identity, and Player's Hand domains. The closest existing creature-specific surface is the Sanctuary selected detail (`.island-run-sanctuary-fullcard`), but it lacks card metadata fields like power, moves, passive, quote, and foil. A hybrid approach is recommended: create a separate creature-specific card component while reusing existing visual language, and store static card metadata in a new `creatureCardCatalog.ts`.

---

## 1. Existing Card-Like Components

| File path | Component/function | Renders | Generic/reusable? | Domain | CSS? | Reuse for Creature Cards? |
|---|---|---|---|---|---|---|
| `src/features/gamification/level-worlds/components/CreatureGridCard.tsx` | `CreatureGridCard` | Minimal square creature tile with image, rarity stars, active marker, locked label | Partly reusable, but grid-specific | Creature/Sanctuary | Yes: `LevelWorlds.css` `.island-run-sanctuary-card*` | Reuse for grid only; not enough for full Creature Card |
| `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx` | `CreatureHatchRevealModal` | Reveal modal with creature art, name, rarity, set companion CTA | Not generic; reveal-specific | Creature/Hatchery | Yes: `.island-run-hatch-reveal*` | Visual reference only |
| `src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx` | `FirstSessionCreaturePackModal` | Starter pack modal and multiple mini creature cards | Not generic; onboarding pack-specific | Creature/Onboarding | Yes: `.island-run-first-creature-pack*` | Good mini-card visual reference; not full card skeleton |
| `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` | inline selected Sanctuary detail | Full-screen selected creature detail sheet with a `.island-run-sanctuary-fullcard` hero | Not extracted | Creature/Sanctuary | Yes: `.island-run-sanctuary-detail*`, `.island-run-sanctuary-fullcard*` | **Best existing Creature Card-like surface** |
| `src/features/gamification/ScoreTab.tsx` | `CreatureSanctuaryScoreHubView` | Read-only gallery cards for all catalog creatures | Not generic | Creature/Score collections | Yes: `gamification.css` `.score-tab__sanctuary-card*` | Visual reference only; no real art, uses emoji placeholders |
| `src/features/identity/deck/ArchetypeCard.tsx` | `ArchetypeCard`, `ArchetypeCardDetail` | Archetype card with icon, role, stars, suit, drive/copy | Domain-specific; uses inline styles | Identity archetypes | Partial CSS in `deck.css`, but much inline | Good conceptual reference; not directly reusable |
| `src/features/identity/deck/PlayerDeck.tsx` | `PlayerDeck` | 5-card archetype hand + detail modal | Domain-specific | Identity archetypes | Mostly inline | Layout inspiration only |
| `src/features/identity/PersonalityTest.tsx` | inline trait cards | Trait-card grid with strength/growth copy | Not extracted | Identity traits | Yes: `index.css` `.identity-hub__trait-card*` | Copy/layout reference only |
| `src/features/players_hand/spark-preview/PlayersHandSparkPreview.tsx` | `PlayersHandSparkPreview` | Fan/grid/fullscreen Player's Hand card overlay, flip-card detail | Somewhat reusable visually, domain data-specific | Player's Hand | Yes: `PlayersHandSparkPreview.css` | Strong visual/system reference; likely too coupled to Player's Hand data |
| `src/features/players_hand/spark-preview/PlayersHandRevealCeremony.tsx` | `PlayersHandRevealCeremony` | Small reveal row of cards | Not generic | Player's Hand reveal | Yes: `PlayersHandRevealCeremony.css` | Animation/reference only |

### Key Finding

**No generic, reusable card component exists.** The closest creature-specific surface is the inline Sanctuary detail in `IslandRunBoardPrototype.tsx`, which renders a `.island-run-sanctuary-fullcard` hero but lacks card metadata fields.

---

## 2. Existing Creature Sanctuary Detail View

**Primary File:** `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

### State

- `showSanctuaryPanel` — controls modal visibility
- `selectedSanctuaryCreatureId` — selected creature ID
- `showPerfectCompanionReason` — explanation toggle
- `hatchReveal` — hatch reveal modal data
- `activeCompanionId` — current active companion
- `creatureCollection` — owned creature runtime entries
- `creatureTreatInventory` — treat counts

### Data Flow

```
collectedCreatures = getCreatureManifestEntries(session.user.id)
selectedSanctuaryCreature = collectedCreatures.find(...selectedSanctuaryCreatureId...)
art via resolveCreatureArtManifest(selectedSanctuaryCreature.creature)
```

### Current UI

- Modal/backdrop: `.island-run-sanctuary-detail-sheet`
- Card-like hero: `.island-run-sanctuary-fullcard`
- Creature art cutout
- Tier + ship zone
- Name
- Hardcoded star text (currently `★★★★★`)
- Found-near-island + habitat
- Active companion pill or set companion button
- Expandable details/actions section
- Bond level/progress/last fed/copies
- Companion bonus and specialty text
- Compare vs active companion
- Perfect Companion explanation
- Bond reward ready block
- Feed buttons
- Set/remove active companion buttons

### Actions Inside Detail

- Set active companion
- Remove active companion
- Feed creature
- Claim bond milestone reward
- View Perfect Companion reason
- Compare selected vs active
- Back to roster/close detail

### Important

Hatch collect/sell is **not** inside the selected detail card — those flows are elsewhere.

---

## 3. Existing Data Available to Card UI

| Field | Exists today? | Source | Notes |
|---|---:|---|---|
| creature id | Yes | `creatureCatalog.ts`, runtime collection | Static species ID and owned record ID |
| imageKey | Yes | `creatureCatalog.ts` | Usually same as ID |
| name | Yes | `creatureCatalog.ts` | Static |
| tier/rarity | Yes | `creatureCatalog.ts`, egg tier | `common`, `rare`, `mythic` |
| affinity | Yes | `creatureCatalog.ts` | Drives archetype/weakness bridge |
| habitat | Yes | `creatureCatalog.ts` | Display flavor |
| shipZone | Yes | `creatureCatalog.ts` | `zen`, `energy`, `cosmic` |
| owned/copies | Yes | `IslandRunGameStateRecord.creatureCollection` / legacy local mirror | `copies` |
| bond XP | Yes | creature collection runtime/local entry | `bondXp` |
| bond level | Yes | creature collection runtime/local entry | `bondLevel` |
| active companion | Yes | `activeCompanionId` | Runtime + local mirror |
| perfect companion status | Yes | `perfectCompanionIds`, `perfectCompanionReasons` | Computed from fit engine |
| art path | Yes | `creatureImageManifest.ts` | `/assets/creatures/{imageKey}.webp` |
| fallback image path | Yes | `creatureImageManifest.ts` | PNG + silhouette + emoji |
| **card power** | **No** | **Docs only** | **Not implemented** |
| **card number** | **No** | **Docs only** | **Not implemented** |
| **element/type** | Partial | habitat/shipZone/docs | No explicit field |
| **personality role** | Partial | affinity + docs | No card role field |
| **passive** | **No** | **Docs only** | **Concept only** |
| **move 1** | **No** | **Docs/design only** | **Not implemented** |
| **signature move** | **No** | **Docs only for first 8 concepts** | **Not implemented** |
| **strengths** | Partial | `creatureFitEngine.ts`, archetype bridge | Dynamic fit output, not card copy |
| **weaknesses** | Partial | `creatureArchetypeBridge.ts` | Weakness support tags by affinity |
| **flavor quote** | **No** | **Docs only** | **First 8 have quotes in docs** |
| **shiny/extra rare variant** | **No** | **None** | **No runtime or static field** |
| **background template / foil type** | Partial | `creatureImageManifest.ts` has background path by affinity/zone | No card template/foil field |

### Supabase Truth

- Creature ownership is embedded in `island_run_runtime_state.creature_collection`.
- No normalized creature/card metadata table exists.
- Relevant columns: `creature_collection`, `active_companion_id`, `creature_treat_inventory`, `perfect_companion_ids`, `perfect_companion_reasons`, `per_island_eggs`, `egg_reward_inventory`.

---

## 4. Card Skeleton vs Missing Card Data

### Classification

Closest code-truth is a combination of:

- **E) The Sanctuary detail already has a card-like surface but needs data/layout refinement.**
- **D) Player's Hand / Archetype card systems can inspire styling, but are not directly reusable.**
- **C) Existing creature card-like skeletons lack creature-card metadata.**

It is **not** A. Card/card-like UI definitely exists.

It is **not** safe to directly reuse the Player's Hand or trait-card prototype components because they are tied to archetype/trait data, inline styles, separate CSS assumptions, and in one case prototype dependencies/class conventions.

### Best Existing Skeleton

The Sanctuary selected detail `.island-run-sanctuary-fullcard` (inline in `IslandRunBoardPrototype.tsx`) is the best creature-specific skeleton, but it lacks card metadata fields like power, card number, passive/moves, quote, element, and foil.

---

## 5. CSS / Visual System Investigation

| CSS file | Classes | Used by | Reusable? |
|---|---|---|---|
| `src/features/gamification/level-worlds/LevelWorlds.css` | `.island-run-sanctuary-card`, `.island-run-sanctuary-card--minimal`, `.island-run-sanctuary-card__minimal-frame--common/rare/mythic`, `.island-run-sanctuary-card__minimal-art`, `.island-run-sanctuary-card__minimal-stars` | `CreatureGridCard` | Tightly coupled to Sanctuary grid |
| same | `.island-run-sanctuary-detail-sheet`, `.island-run-sanctuary-detail`, `.island-run-sanctuary-fullcard`, `.island-run-sanctuary-fullcard--rare/mythic`, `.island-run-sanctuary-fullcard__hero`, `.island-run-sanctuary-fullcard__art` | selected creature detail in `IslandRunBoardPrototype.tsx` | **Best candidate to reuse/extract** |
| same | `.island-run-hatch-reveal`, `.island-run-hatch-reveal__card`, `.island-run-hatch-reveal__card--rare/mythic`, `.island-run-hatch-reveal__hero` | `CreatureHatchRevealModal` | Reveal-specific |
| same | `.island-run-first-creature-pack`, `.island-run-first-creature-pack__card`, `.island-run-first-creature-pack__grid`, `.island-run-first-creature-pack__creature`, rarity modifiers | `FirstSessionCreaturePackModal` | Pack/onboarding-specific |
| `src/styles/gamification.css` | `.score-tab__sanctuary-card`, rarity/locked/active modifiers | `CreatureSanctuaryScoreHubView` | Good gallery styling, not full card |
| `src/features/players_hand/spark-preview/PlayersHandSparkPreview.css` | `.players-hand-spark-preview__card`, `.players-hand-spark-overlay__focus-card`, `.players-hand-spark-overlay__focus-face`, grid/story cards | `PlayersHandSparkPreview` | Strong visual reference, data-specific |
| `src/features/players_hand/spark-preview/PlayersHandRevealCeremony.css` | `.players-hand-reveal__card` | `PlayersHandRevealCeremony` | Reveal-only reference |
| `src/features/identity/deck/deck.css` | `.archetype-card`, `.player-deck__card`, `.player-deck__grid` | Identity deck components | Not fully used because many styles are inline |
| `src/index.css` | `.identity-hub__trait-card`, `.identity-hub__trait-grid`, `.identity-hub__trait-band` | inline trait cards in `PersonalityTest.tsx` | Reference only |

---

## 6. Recommended Reuse Strategy

### Recommendation: **4. Reuse visual language but create a separate creature-specific component.**

### Why

- A creature-specific detail surface already exists, but it is embedded in `IslandRunBoardPrototype.tsx`.
- Creature cards need art cutouts, rarity, ship zone, habitat, affinity, ownership, bond, and future card metadata.
- Player's Hand card components have useful fan/flip/detail styling but are too coupled to archetype/trait models.
- `CreatureGridCard`, hatch reveal, and first-session pack cards are too narrow.
- Creating a separate `CreatureCard` component avoids modifying grid/hatch/economy flows while allowing app-rendered metadata.

### Secondary Option

Extract the existing `.island-run-sanctuary-fullcard` structure into a reusable component, but keep the first implementation narrow.

---

## 7. Data Architecture Recommendation

### Best Initial Architecture

**Hybrid static card metadata + runtime ownership state**, implemented as a separate static `creatureCardCatalog.ts`.

### Comparison

| Option | Recommendation |
|---|---|
| Extend `creatureCatalog.ts` | Avoid for now; it currently powers hatch/species/gameplay identity. Adding card copy risks mixing presentation with gameplay catalog. |
| **Create `creatureCardCatalog.ts`** | **Best next step. Static, editable, no DB migration, can cover first 8, separate from ownership.** |
| Reuse docs only | Not enough; UI needs typed data and fallbacks. |
| Database table | Too early; needs migrations/admin/editing paths and increases risk. |
| **Hybrid static metadata + runtime ownership state** | **Best model. Static card definitions live in frontend config; owned status/bond/active/shiny later come from runtime state.** |

### Initial Metadata Structure

Static card definitions should include only display/card fields:

```typescript
interface CreatureCardMetadata {
  creatureId: string;
  cardNumber: number;
  element: string;
  speciesIdentity: string;
  personalityRole: string;
  traitStrengthened: string;
  weaknessBalanced: string;
  passiveName: string;
  passiveText: string;
  move1Name: string;
  move1Text: string;
  signatureMoveName: string;
  signatureMoveText: string;
  flavorQuote: string;
  backgroundTemplate: string;
  foilType?: string;
}
```

### What NOT to Include

Do **not** put ownership, copies, bond, active companion, rewards, hatch status, or economy values in this static config.

---

## 8. Smallest Safe Next PR

After this investigation, the smallest safe implementation PR would include:

### Files Likely Touched

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  - only to render the new card in selected creature detail
- `src/features/gamification/level-worlds/LevelWorlds.css`
  - add scoped card classes or reuse fullcard classes carefully

### New Files Likely Needed

- `src/features/gamification/level-worlds/components/CreatureCard.tsx`
- `src/features/gamification/level-worlds/services/creatureCardCatalog.ts`

### Reuse/Extract Strategy

- Use the existing selected-detail `.island-run-sanctuary-fullcard` visual direction.
- Do not reuse Player's Hand components directly.
- Optionally use `CreatureGridCard` only for roster/grid, not full card.

### Must NOT Touch

- Hatch collect/sell handlers
- Egg tier selection
- Creature ownership persistence
- Supabase migrations
- `islandRunStateActions.ts` economy actions
- Sanctuary grid behavior
- Reward/bond/economy calculations

### Manual QA Checklist

- [ ] Open Sanctuary with no creatures
- [ ] Open Sanctuary with a first-8 creature and verify app-rendered card appears
- [ ] Open Sanctuary with a non-first-8 creature and verify fallback/current detail still works
- [ ] Set active companion from detail
- [ ] Feed creature and verify bond UI still updates
- [ ] Claim bond reward if ready
- [ ] Hatch collect reveal still works
- [ ] Sell egg still works
- [ ] First-session creature pack still works
- [ ] Mobile detail sheet scroll/close still works
- [ ] Missing creature art still falls back correctly

### Build/Test Commands

```bash
npm run build
npm run test:island-run
npm run check:island-run-architecture-guards
```

---

## 9. Risk Notes

### High-Risk Areas

- **Duplicating card components:** There are already creature grid, hatch reveal, pack, score hub, Sanctuary detail, Player's Hand, and trait cards. A new component should be explicitly creature-card-specific and not recreate grid/reveal behavior.

- **Mixing card UI data with runtime ownership:** Static card text/stats should not live in `creatureCollection` or runtime state.

- **Putting economy values in React UI:** Existing code still has some migration-era UI-side economy effects; do not expand that pattern.

- **Breaking hatch/collect/sell flows:** Creature card UI should be read-only display at first.

- **Changing Sanctuary grid behavior:** Grid already has `CreatureGridCard`; the next PR should only affect selected detail.

- **Adding DB schema too early:** Card metadata is static/product content for now and does not need Supabase.

### Medium-Risk Areas

- **CSS specificity conflicts:** New card styles should be scoped or reuse existing fullcard classes carefully.

- **Art fallback paths:** Ensure missing art still degrades to emoji/silhouette.

- **Mobile scroll performance:** Detail sheet contains scrollable content; test on actual devices.

---

## Appendices

### Related Documentation

- `docs/CREATURE_PERSONALITY_DEX_V1.md` — first 8 creature card concepts
- `docs/CREATURE_CARD_DESIGN_SYSTEM_V1.md` — visual design system
- `docs/CREATURE_IMAGE_PRODUCTION_GUIDE.md` — art production workflow
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md` — gameplay/UI separation

### Key Architecture Findings

From prior investigation (cited in problem statement):

> The repo already has creature identity, collection, active companion, bond fields, art manifest, hatch reveal/card UI primitives, and Perfect Companion layers. Future work should avoid adding duplicate UI/state systems and should keep gameplay/economy separate from React UI.

### Recommended Data Separation

```
creatureCatalog.ts          // species/gameplay identity (unchanged)
creatureCardCatalog.ts      // app-rendered card copy/stats (new)
runtime state               // owned instance state: copies, bond, active companion (unchanged)
```

---

**End of Investigation Snapshot — 2026-05-20**
