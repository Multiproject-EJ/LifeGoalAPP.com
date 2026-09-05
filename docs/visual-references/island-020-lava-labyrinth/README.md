# Island 020 — Lava Labyrinth visual-production packet

Status: reopened for an actual-3D family v3 rebuild after Eivind rejected the plate-led result on closer inspection. Admission inventory awaits explicit approval before geometry.

## Authority order

1. `020-source.png` — immutable whole-island composition, architecture, palette, terrain, atmosphere, and visible-landmark authority supplied by Eivind on 2026-08-30.
2. Deterministic exact-source crops under `derived-crops/` after approval.
3. Explicit Eivind decisions recorded in `user-decisions.v1.jsonl` after they are made.
4. Generated hidden-side or boss studies under `secondary-inferred/`; these may explain unseen construction but may never override visible source pixels.
5. Runtime captures under `work/island-visual-library/island-020-lava-labyrinth/evidence/`; these are diagnostic current-state evidence, never identity authority.

The baked `ISLAND 043` label, counters, panels, tile symbols, and approximate route in the concept are not runtime authority. Eivind's filename/request assigns runtime Island 020, and HabitGame's canonical 36-tile board, UI, progression, currencies, and state actions remain unchanged.

## Source provenance note

The OneDrive `_workflow/020/status.json` ledger references a missing `020-source.png` with SHA-256 `016daf03bb3a6146c6ab4ba643f15ce3110ec30e33e844bba5a5f7669e447607`. Eivind explicitly attached `New 020.png`, SHA-256 `ed22a7b4b8f1d1a1ab729c982c95898380fd7a2aa3852dfb7cd72d78854f87b8`, in the current request. The attached file is therefore preserved here as the active exact source; the ledger mismatch is recorded, not silently rewritten.

## Admission checkpoint

`baseline.v1.json`, `part-inventory.v1.json`, `workflow-manifest.v1.json`, and the dated Gauntlet complete the mandatory pre-production decomposition. The recommended first slice is the central Crucible Citadel/Arena family (`p07`–`p10`) placed against a minimal clay island shell, because it carries the source's strongest identity and the highest cross-view risk.

Eivind approved the inventory, Island 020 retheme, mission direction, and representative slice on 2026-08-30. Production may proceed under the dated Gauntlet and recorded worker boundaries.

## Final lava and heat-lighting pass

The accepted hybrid now adds one elapsed-time, shared-texture GPU overlay that drives cliff lava downward and upper labyrinth channels centre-outward. Heat bounce is derived only around molten pixels, while the existing forge and under-island lights receive slow bounded thermal variation. Reduced motion freezes the shader at one deterministic pose.

The pass adds one draw call, two triangles, and zero texture bytes. Live low-tier evidence measured 163 calls and 31k visible triangles against the 175-call gate. The full Island Run suite passes 1,918/1,918, and the architecture and camera-kit guards pass. The independent Quality Lord approved the pass; its record is `hybrid-family-v2/quality-lord-lava-lookdev-v2.json`.

## User-directed lava-volume v3

Eivind reopened the accepted v2 because it was much better but still lacked convincing integration. The first v3 experiment added cliff-tube volume and a separate route-rim mesh. Visual flow and heat passed, but the independent gate stopped it at a projected 177 high-tier calls against the hard 175-call limit; the regular tubes also risked cylindrical spokes.

The accepted bounded correction retires both added renderables. Periodic plate advection, multi-scale ribbons, hot-core/cooling-edge separation, and local molten-neighbour halos now provide flow and perceptual depth. Existing tile materials receive the thermal response, so v3 adds zero draw calls, zero triangles, and zero texture bytes above v2. Live evidence measured 173 calls / 45k triangles on High and 163 calls / 31k on Low. The independent Quality Lord passed the corrected result; its record is `hybrid-family-v2/quality-lord-lava-volume-v3.json`.

## Current actual-3D rebuild

The preceding Quality-Lord pass is historical evidence, not the current acceptance authority: Eivind's later direct inspection found that the 3D work still looked bad. The hybrid is therefore retired as the final runtime representation, and the earlier procedural-radial family remains retired for generic/flat geometry.

Resume from `actual-3d-family-v3/workflow-manifest.v2.json`, `baseline.v2.json`, `part-inventory.v2.json`, the dated actual-3D Gauntlet, and `.img2threejs/island-020-actual-3d-v3/state.json`. This family forbids an environment plate and requires a closed terrain volume, coherent rear elevations, a functional three-ring labyrinth, physically contained lava and multi-angle evidence.

## V11 lava-material realism correction

Eivind reopened the visually accepted V10 on 2026-09-04 because its lava still read as artificial. The bounded V11 correction freezes the V10 city, maze, mission, controls and camera while replacing the flat un-tonemapped lava response. The new material separates dark cooled rafts, deep molten mass, orange openings, narrow yellow fissures and sparse white-hot cores; flow is domain-warped across macro, meso and micro scales, vertical faces move under gravity, and view-dependent highlights keep the surface from reading as a flat emissive decal. The river core is now a lit, tone-mapped material, and heat-light changes remain localized to the canals.

All 1,919 Island Run tests, TypeScript, production build, architecture guard and diff check pass. This is not yet visually approved: the automated V11 capture did not write evidence, and no screenshot score is inferred from code. The current record is `actual-3d-family-v9-architectural-kit/parts/macro-slice/qc/v11-lava-lookdev-implementation.v1.json`; fresh overview, high-survey and orbit captures remain the next gate.

## V12 molten-surface motion correction

Eivind approved the V11 direction and asked to continue on 2026-09-05. V12 keeps the rectilinear city, functional labyrinth, 36-tile route, mission, controls and camera frozen. It adds restrained two-frequency vertex displacement to the authored canals and gravity-facing falls, replaces the magma-sea triangle fan with a quality-scaled grid carrying displaced wave normals, and lets the four local canal lights drift slightly across nearby masonry. Reduced motion resolves all three systems to one deterministic thermal pose.

The FBM shader now compiles at four octaves on High, three on Medium and two on Low. The sea grid adds no draw calls and adds 600 / 1,520 / 3,136 triangles over V11 on Low / Medium / High; the complete scene still passes its existing 170-draw-call and 190k-triangle gates at every tier. All 1,919 Island Run tests, TypeScript, production build, architecture guard and diff check pass. V12 remains formally unscored until fresh runtime images can be captured; its implementation record is `actual-3d-family-v9-architectural-kit/parts/macro-slice/qc/v12-lava-surface-motion-implementation.v1.json`.
