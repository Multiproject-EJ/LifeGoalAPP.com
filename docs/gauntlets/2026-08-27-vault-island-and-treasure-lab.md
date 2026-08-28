# Vault Island and Treasure Lab Gauntlet

Status: active first-slice contract
Date: 2026-08-27
Owner: Eivind

## Mission

Create a phone-sized 3D lab for the special Vault Island and a reusable Treasure Lab for desirable 3D collectible figures. The first slice must prove the visual system can support luxury materials, click-to-inspect treasures, reveal/shine motion, and later placement into the Vault Island without touching canonical Island Run gameplay state.

## Sources Of Truth

- Confirmed source image: `docs/visual-references/island-special-vault-treasure/treasure-island-source.png`
- Source SHA-256: `5f2841dcf97303c7e8cf8091d0c02a0c22f24904eeea41044df68ab4a583fa57`
- Reference manifest: `docs/visual-references/island-special-vault-treasure/manifest.v1.json`
- Gameplay guardrails:
  - `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
  - `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
  - `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
  - `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`

## Non-Negotiables

- No gameplay state writes in lab code.
- No new `runtimeState` gameplay mirrors.
- No coupling treasures to tile indices or stop progression.
- Original OneDrive/source image outranks all generated reference sheets.
- Generated island and treasure sheets are secondary-inferred modeling aids only.
- Lab routes are dev-only until a runtime integration contract is approved.

## Scope

Included now:

- Vault Island phone lab route.
- Treasure Lab phone route or combined route with several representative treasures.
- Reusable procedural treasure model families.
- Basic material presets: gold, silver, marble, enamel, crystal/gem, pearl/ivory.
- Click/inspect mode with zoomed 3D treasure and value-style museum card.
- First reveal/shine/spin animation pass.
- Evidence manifests and at least one browser render screenshot.

Deferred:

- Actual reward economy wiring.
- Treasure persistence.
- Placement customization persistence.
- Interior navigation as gameplay.
- Full 120-island treasure frequency tuning.
- Native/iOS capture.

Explicitly excluded:

- Casino mechanics, betting, or real-money framing.
- Any production deployment.

## Part Inventory Summary

Representative first slice:

1. Vault Island exterior macro assembly.
2. Treasure family 001: Crown Relic.
3. Treasure family 002: Compass/Astrolabe Relic.
4. Treasure family 003: Crystal Obelisk or Jeweled Egg.
5. Treasure lab gallery shell with inspect/reveal controls.

Full inventory is tracked in `docs/visual-references/island-special-vault-treasure/gauntlet/part-inventory.v1.json`.

## Acceptance Evidence

First slice passes when:

- `npm run build` completes or any failure is clearly unrelated/pre-existing.
- Dev route renders a nonblank WebGL canvas at phone aspect.
- Screenshot shows recognizable Vault Island or Treasure Lab geometry.
- At least three treasures have distinct silhouette and material identity.
- Click/inspect mode changes camera/selection state without console errors.
- Gauntlet manifests identify source authority, generated-reference authority, and single-view limits.

## Quality Gates

- Macro silhouette before micro decoration.
- Worst-view rule: front, three-quarter, side/rear orbit sanity, and phone proof must all remain readable before more treasures are scaled up.
- Treasure families must remain desirable at phone scale: large silhouette, strong material contrast, restrained sparkle, and clean pedestal.
- Every treasure should become an action-ready part: named root, clickable meshes, stable pivot, display pedestal, reveal animation anchor, and future placement socket.

## Rollback

The first slice is additive dev-only code. Rollback is deleting the new dev route, model files, and reference packet additions. Do not alter existing gameplay runtime files beyond route registration.

## Handoff

Resume by reading this file, the reference manifest, the source README, and the current lab files. Run the lab locally, capture phone screenshots, critique the least flattering view, then change one bounded family or material system at a time.
