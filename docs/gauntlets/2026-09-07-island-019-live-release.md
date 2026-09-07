# Island 019 — approved live release, 2026-09-07

## Authorization and scope

Eivind explicitly requested: “great, push to main now, live”. This publishes the
current reviewed island, not a declaration that the broader 10/10 design goal is
complete. Source work: `codex/island-019-coaster-carnival-20260830`, including its
latest uncommitted d019–d021 runtime improvements. Integrated into a clean branch
from main `3fe7e6ed`; unrelated canonical-workspace edits were not included.

## Runtime changes

- Runtime Island 019 routes to the authored Coaster Carnival world by default.
- The all-angle world is enabled without `island19CircuitF=1`; explicit
  `island19CircuitF=0` remains a diagnostic legacy-presentation rollback.
- The ride follows continuous geometry beneath this island and through its ocean
  tube, with the larger treasure grotto, front/middle seats, pacing and filtered
  camera, purpose-built palace opening, sky ambience and latest park details.
- Sound precedes the menu; Exit Island Run is inside the menu, not the top bar.
- Main's Island 020 and runtime Island 008/018 reassignment are preserved.
- No database migrations, credentials, deployment configuration or gameplay
  persistence architecture changes are part of this release.

## Asset selection

The current exterior is `coaster-carnival-exterior-v009.glb` and its v008 atlas.
Retired exterior versions, rejected Guardian model binaries, Blender working
files and historical screenshot archives are not shipped. Existing referenced
legacy fallback images remain available. Source evidence remains in the original
Island 019 worktree.

## Known quality limits

Publication is user-approved despite remaining art/performance work. The d021
overview measured about 245 draw calls / 238,066 triangles, above the 175 / 180k
target. Treasure-room art and several island details still need refinement.
The focused park-detail review is not a whole-island 10/10 approval.

## Release verification

Architecture and audio asset guards pass. The complete Island Run suite passes
2,040/2,040 tests after updating three stale integration/asset expectations.
The production Vite bundle builds successfully (existing chunk-size warnings).
The no-flag rear/overview/left/right/phone survey has no JavaScript errors.
The no-flag ride reaches completion and idle with no JavaScript errors; 2,689
sampled frames have median 16.7 ms and p95 16.8 ms, with 29 frames above 50 ms
on the concurrently compiling desktop. This is not a phone performance pass.
Six 1,800-interval clearance traces report zero hits; they are sampled traces,
not a continuous collision-volume proof. Full-app `tsc -b --pretty false` passes.
Successful Pages deployment and a matching live asset remain mandatory before
declaring the release live.
