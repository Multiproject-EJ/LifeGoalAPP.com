# Creature Arena Battle and Exclusive Eggs Gauntlet

## Status

Active implementation contract. The radial-tile top-face repair, Island 005
actual-3D Crown Drifter pilot, arena presentation cadence, and M2 pure battle
rules are implemented and verified locally. Canonical persistence, exclusive
egg rewards, and the playable battle UI remain gated milestones and must not be
represented as complete.

## Implementation evidence — 2026-08-11

- Exactly 24 every-fifth-island arena slots derive from the canonical
  120-island manifest.
- The Crown Drifter appears from Boss landmark Level 1, roams the center, and
  occasionally approaches the player through a presentation-only service.
- `islandRunCreatureArenaBattle.ts` now owns the deterministic, side-effect-free
  turn rules: quick and power attacks, focus, guard, island-bound shields,
  charged-attack telegraphs, health, victory, defeat, and animation-ready
  resolution events.
- Shield pickup plans accept eligible tile indices from the canonical tile map;
  they never infer a fixed board size or repurpose landmark progression.
- The stable arena roster now reserves 24 unique creature identities without
  pretending that the 23 future 3D assets are already implemented.
- Crown Drifter is excluded from ordinary egg and creature-pack candidate
  pools, including the pack fallback path; explicit development fixtures and
  the arena source remain allowed.
- Runtime Island 005 now routes to the authored tropical Sunwheel Arena world
  (legacy visual source `002`), while runtime Island 004 routes to the former
  Crown Citadel world (legacy visual source `005`). Runtime identity continues
  to own story, progression, rewards, arena cadence and persistence; the visual
  source selects geometry and materials only. Island 002 deliberately returns
  to its existing 2D fallback until its replacement 3D world is authored.
- The live-shell visual check confirms 005 = tropical arena, 004 = citadel, and
  002 = safe fallback. Two routing tests lock the separation and prevent a
  future scenery reassignment from moving creature rewards between islands.
- Fifteen arena contract and battle-engine tests and two visual-routing tests
  pass. The full Island Run suite is at 1,718 passing with the same three
  pre-existing Island 1 fixed-camera failures.
- TypeScript and Island Run architecture guards pass with no new violations.

The next slice is the persistence half of M3: add a species-locked arena egg
record and commit first-victory rewards idempotently through canonical actions.

## Mission

Turn every fifth Island Run island into a creature arena while preserving the canonical five-stop island progression. Beating an arena creature awards an egg locked to that exact species. The other four islands in each group retain the same board structure but use a larger, highly distinctive guardian landmark in the center instead of an arena.

## Authoritative inputs

- Island Run architecture and gameplay contracts in `docs/gameplay/`.
- Island 005 actual-3D world, camera, landmark, movement and quality-tier foundation.
- Creature definitions in `src/features/gamification/creatures/data/creatureCatalog.ts`.
- Existing egg and pack resolvers, which currently require source-gating before any species can become arena-exclusive.
- UI references:
  - `docs/visual-references/creature-arena/island-005-battle-command-v1.png`
  - `docs/visual-references/creature-arena/island-005-power-charge-v1.png`
  - `docs/visual-references/creature-arena/island-005-victory-egg-v1.png`

## Non-negotiables

- Preserve canonical Boss stop 5 as the island's final gate. Arena combat is one Boss-stop presentation, not a new parallel progression path.
- Islands divisible by five use a creature arena: 005, 010, 015, through 120. Other islands use a themed guardian landmark and their configured Boss challenge.
- An arena species is excluded from every ordinary card-pack pool, generic egg pool and fallback reward pool before the arena becomes earnable.
- First arena victory grants a species-locked egg. Opening it must resolve to its stored creature ID and must never reroll by tier or seed.
- Arena shields are island-bound battle charges, capped at three, and are not the existing persistent Body Habit Shield wallet currency.
- Shield placement is deterministic per island, with zero to three shield pickup tiles. Charges do not accumulate across islands.
- Gameplay state is read through canonical stores and changed only through canonical action/services. React renderers do not own battle, reward or inventory writes.
- Battles are short, readable and fair on a phone. Reduced-motion and low-quality modes preserve timing and gameplay information.
- No arena reward may be granted twice because of retries, refreshes, duplicate animation callbacks or interrupted persistence.

## Arena cadence and center rule

For each five-island chapter:

1. Islands 1-4: impressive themed guardian landmark at the center.
2. Island 5: creature arena at the center.
3. All five: the same canonical 36-tile route, five-stop progression and camera/interactivity foundation.

The arena roster contains 24 species for Islands 005-120. Island 005 may pilot Crown Drifter only after its existing ordinary egg and pack eligibility is removed. Long term, prefer adding purpose-built arena species so reserving 24 creatures does not impoverish the normal 45-creature reward pool.

## Battle loop

1. Enter the arena and reveal both creatures, health bars, available shield charges and the opponent's next-move telegraph.
2. Choose one action: standard attack, quick attack, guard/shield, or focus/charge.
3. Lock both actions and play a short anticipation beat.
4. Resolve initiative and animate actions in order.
5. Apply shield reduction, damage, status and health changes through the pure battle engine.
6. Pause briefly on the resulting state before accepting the next command.
7. Repeat for approximately five to eight turns or 45-90 seconds.
8. On victory, run an idempotent reward service and present the exact-species egg celebration.

Powerful attacks must be telegraphed before impact. The opponent visibly charges for one turn, the UI names the incoming move, the environment reacts subtly, and the player gets a meaningful opportunity to guard, spend a shield or race the attack. The impact animation then lands once and health is subtracted only when the canonical resolution event fires.

## Shield rules

- Each island config declares `arenaShieldPickupCount` from zero through three and deterministic eligible tile IDs.
- Tile pickup adds one island-bound arena shield charge up to the cap of three.
- Guard can be free but weaker; spending an arena shield gives stronger reduction and may block a status effect.
- The battle command screen always shows remaining charges before confirmation.
- A loss permits a fair retry with a defined reset policy; no paid currency is required to make the encounter winnable.

## Reward and acquisition model

- Add explicit creature acquisition eligibility by source, or equivalent source-specific filters, for at least `genericEgg`, `cardPack`, `arena`, and fallback pools.
- Add a locked creature identifier to the arena egg inventory record.
- Generic egg and pack resolvers must prove that the 24-species arena roster has an empty intersection with their candidate pools.
- Arena reward IDs are deterministic from player, island, arena cycle and victory, and are persisted idempotently.
- Repeat victories must follow an explicit later-cycle policy, such as bond progress or species shards; they must not silently mint unlimited first-clear eggs.

## Gauntlet milestones

1. **M0 - Ring integrity:** outward-wound tapered tile geometry, visible top/side/bottom faces, no overlap flicker, automated normal-direction checks and phone visual proof.
2. **M1 - Reference admission:** approve command, charge/guard and victory/egg screens plus the Island 005 arena creature.
3. **M2 - Pure rules:** implement and exhaustively test initiative, actions, telegraphs, damage, shield reduction, status, win/loss and deterministic replay.
4. **M3 - Canonical persistence:** source-gate creatures, create species-locked eggs, add island-bound shields and make victory rewards idempotent.
5. **M4 - UI vertical slice:** implement Island 005 command/reveal/result states with input locking, reduced motion and phone-safe layout.
6. **M5 - 3D integration:** creature staging, camera beats, charge and impact animations, arena reactions, audio/haptics hooks and interruption recovery.
7. **M6 - Scale template:** configure all 24 arena islands without copying battle logic or weakening normal creature pools.
8. **M7 - Final proof:** real-device iOS Capacitor and PWA performance, economy invariants, save/restore, retry, offline/interruption and full Island Run regression suite.

## Acceptance tests

- Every tapered tile renders a top surface and all six faces point outward under normal back-face culling.
- Exactly every fifth island uses an arena and all other centers use guardian landmarks.
- Arena roster intersect generic egg candidates equals zero.
- Arena roster intersect card-pack candidates equals zero, including fallback branches.
- Winning Island 005 always creates the configured Island 005 species egg exactly once.
- Opening that egg always yields the configured species.
- No island can award or hold more than three arena shield charges.
- UI cannot accept a second command during reveal, charge, impact or health-resolution locks.
- Save/restore during every battle phase produces the same deterministic outcome without duplicate damage or rewards.

## Stop conditions

- Stop if arena combat introduces gameplay writes in React UI components.
- Stop if an arena species remains obtainable from a normal pack, generic egg or fallback pool.
- Stop if the battle is only an animation without a meaningful defensive response to charged attacks.
- Stop if the arena reuses the global Body Habit Shield wallet.
- Stop on hidden tile tops, z-fighting, duplicate rewards, nondeterministic restores or unreadable phone framing.

## Rollback

Keep arena scheduling, roster, battle service, reward source-gating and renderer integration behind isolated configuration/feature boundaries. Disabling the arena mode restores the existing canonical Boss stop without rewriting saves or affecting the 3D islands.
