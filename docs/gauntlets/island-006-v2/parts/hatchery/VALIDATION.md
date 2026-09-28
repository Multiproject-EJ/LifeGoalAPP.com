# Net-house hatchery — individual building pass

User authorized continuing house by house after the boatwright. The hatchery cottage, nursery pools, canopy and yard were rebuilt as one coupled building in the isolated worktree. Other buildings and gameplay stayed unchanged during this pass.

## Visual evidence
- Eleven locked camera/lighting views before and after, including opposite sides, top and clay.
- Built-in ImageGen generated a four-view inferred target with genuine alpha, 1254×1254. Full prompt and SHA-256 provenance saved beside it. It is a concept reference, not runtime evidence or exact hidden-view authority.
- Macro gate: roof/gable continuity .76 → .89; door fit .81 → .90; quay pile contact .83 → .90. Structure accepted independently.
- Finish gate: doorway access .74 → .89; life ring/window clearance .78 → .88. No visible regression. All scored categories .85 or above.
- Island overview: grounded shoreline placement and clear board route; nearby roofs are close in projection. Close-up context revealed an existing conifer in the nursery. A rotated hatchery-footprint exclusion now removes overlapping foliage instances while preserving all other tree placements. Final context packet: qa/island-context-v002, independently approved after the correction.

## Verification
- TypeScript no-emit: pass.
- Production Vite build: pass, existing large-chunk warning.
- Architecture guards: pass, zero violations, three pre-existing allowlist warnings.
- All 45 landmark × construction level × quality combinations checked for finite nonempty geometry and transforms.
- Island006 map portrait refreshed from canonical board wider overview; only its manifest entry changes. Portrait freshness test results: qa/portrait-tests-final.log (4 passed, 0 failed).
- No gameplay behavior changed, so no new gameplay tests added. Existing full-suite baseline issues remain documented in the parent gauntlet test-delta.json; the whole suite was not rerun for this visual-only pass.

## Geometry budget
L3 hatchery: Low 12,564 triangles; Medium/High 13,472 triangles; 33 batches per tier. Within proposed 14k / 45 targets. Counts exclude shadow pass duplication. This is desktop browser evidence at a phone viewport, not measured physical-phone frame time.

## Remaining visual difference
The procedural finish is cleaner and more regular than the generated concept. Slate, masonry and ropes are real geometry; finer weathering and handmade irregularity remain available for a later polish pass. No claim of exact concept parity.

## Review
review/index.html contains matched before/after views, actual island context and clearly separated generated goal. No merge or deployment; Claude's shared checkout stays untouched.
