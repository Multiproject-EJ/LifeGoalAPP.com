# Round lantern tavern — individual building pass

User approved continuation after hatchery. Tavern rebuilt as one coupled building while the boatwright and hatchery geometry remained frozen. All changes are in the isolated island006 worktree.

## Visual gauntlet
- Eleven fixed orthographic before/after views, including opposite sides, top and clay.
- Generated four-view target: built-in ImageGen, secondary inferred, transparent PNG. Full prompt, dimensions, alpha audit and SHA-256 saved in isolation manifest.
- Macro gate: roof continuity .77 → .88 after rounding the perimeter between eight hips; terrace contact .82 → .88 after seating pads within quay.
- Finish attachment gate: .79 → .89 after trimming timber tips and connecting sign hanger.
- Optimization exposed open shadow coverage. A second bounded finish family repaired the thin roof backing shadow side: .76 → .91. Final all-view approval in finish-review-r03.json, no visible regression.
- Assembly discovered an existing decorative cottage inside the tavern plot. Omitted that cluster and its supplementary windows, preserving every other cluster index and placement. Excluded conifers from tavern footprint.
- Correctly centered world-context angles 0/90/270 approved clear footprint and separation. Angle180 is blocked by guild roof and is invalid evidence. Generic board focus views are retained as rejected diagnostic framing; final wide canonical board view shows route context.

## Runtime verification
- TypeScript no-emit: pass. Vite production build: pass, existing large-chunk warning. Logs in qa/.
- All 45 landmark × level × quality combinations produce finite, nonempty geometry and transforms.
- Architecture guards: zero violations, three pre-existing allowlist warnings.
- Island006 map portrait refreshed from final canonical-board overview; targeted voyage-map/portrait tests: 4 passed, 0 failed (qa/portrait-tests.log).
- No gameplay behavior, root landmark transform or event scale .72 changed. No new gameplay tests added for this visual pass. Full-suite baseline issues remain documented in parent test-delta.json; full suite not rerun.

## Budget
Low: 12,726 triangles. Medium/High: 13,686 triangles. 30 material batches. Within proposed 14k/45 limits. Duplicate hip layer and unseen tile undersides removed; continuous backing remains and casts solid two-sided shadows. Shadow duplication is excluded from authored geometry counts. Physical-device frame timing remains unmeasured.

## Remaining gap
The runtime materials and masonry are cleaner and more regular than the inferred target. Approval is for this game interpretation, not exact concept parity. No merge/deployment; shared Claude checkout untouched.
