# Island Run Art Positioning Contract

Status: **Active visual-layout policy**  
Scope: Island Run board artwork, island visual manifests, and future island-00x art production.

## Purpose

Island Run supports many island-specific artwork sets while preserving one canonical board movement surface. This contract defines which visuals may vary per island and which board geometry must remain fixed across all 120 islands.

## Fixed globally: board tile circle

The board tile circle is canonical gameplay geometry and must stay fixed across all islands.

Do not make these per-island:

- tile anchor positions
- token movement path geometry
- tile count assumptions outside the active board topology profile
- tile-to-landmark progression semantics
- stop or landmark completion rules

The visual board circle/plate can use island-themed image assets, but it must remain aligned to the canonical board circle. Its purpose is visual presentation only; it must not redefine gameplay tile positions or movement math.

## Per-island: visual art layers

Each island may position and size these independently in its own `public/assets/islands/island-00x/island-art.json` manifest:

- landmarks
- boss artwork
- scenery and decorative art layers
- ambient/background scene art
- the larger `sceneSpace`
- the `playableBoardRect` that maps the canonical board into the island scene

These fields are visual-only and may vary by island to support bespoke artwork composition.

## Manifest placement expectations

Use manifest coordinates for island-specific art placement:

- `x` and `y` represent the center point of the artwork in manifest coordinate space.
- `width` and `height` represent rendered artwork size in manifest coordinate space.
- `zBand` controls visual layering only (`back`, `mid`, `front`).
- landmark `stopIndex` links the visual asset to the canonical stop/landmark state, but does not make the landmark a board tile.

## Board circle/plate expectations

The board circle/plate image is shared gameplay framing, not a movable island prop.

Allowed:

- use different island-themed board circle/plate image files
- use renderer-supported visual scaling where needed to align art
- keep the board art aligned with the canonical playable board rectangle

Avoid:

- adding per-island tile-anchor overrides
- adding per-island board movement path overrides
- using board-circle art coordinates to change gameplay behavior
- coupling landmark progression to visual board-circle art

## Relationship to canonical gameplay rules

This visual contract inherits the canonical Island Run gameplay rules:

- board topology is profile/config-driven
- movement uses the active board topology profile
- landmarks/stops are external gameplay structures
- landmark progression must not depend on landing on specific tile indices
- UI art must not become an alternate gameplay authority

## Future art production rule

The layer inventory, camera/style lock, source/runtime naming split, and approval gates are defined in `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`. Machine-readable island briefs live under `tools/island-art-factory/briefs/`.

When adding island artwork for new `island-00x` folders:

1. Keep the canonical tile circle stable.
2. Place landmarks, boss, and scenery through the island manifest.
3. Treat all manifest art placement as visual-only.
4. Do not add gameplay state writes or progression logic to artwork rendering components.
5. If a visual requirement appears to need moving the tile ring, first redesign the island art around the fixed canonical board.
