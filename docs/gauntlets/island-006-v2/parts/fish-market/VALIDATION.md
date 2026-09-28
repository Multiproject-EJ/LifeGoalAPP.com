# Waterfront fish market — individual building pass

User approved continuation after guild hall. Root handled integration, one serialized builder owned the new module, and an independent read-only reviewer judged all views. Work remains in isolated island006 worktree; shared checkout untouched.

## Visual gauntlet
- Eleven matched orthographic before/after views, including sides, rear, top and clay. Final finish-v001.
- Four-view concept generated with built-in ImageGen, secondary inferred. Full prompt, image, hash and alpha audit saved. Output has an opaque backdrop despite requested transparency.
- Macro correction: four gable-tie ends pierced the roof. Shortening both ties improved roof attachment .79 → .90; other critical scores remained at least .87.
- Assembly baseline exposed lighthouse quay intersecting the market door/counter area, with boats inside pier supports. Shifted market factory outboard from x0 to -2.5 in unchanged dock coordinates. Added a short supported access spur and repositioned two decorative boats. Lighthouse geometry and transform remain unchanged.
- Corrected assembly scores .88–.90. World angles0/180/270 provide useful contact evidence;90 is occluded by neighboring buildings.
- Finish passes all11 views at .86–.91: fish contained in trays, clear central lane/rear door/bridge landing, supported sign, clean roof contacts and connected canopy hem.

## Validation
- TypeScript no-emit and Vite production build pass; existing large-chunk warning remains.
- Runtime validator now includes the separate fish market:54 landmark/market × level × quality combinations pass finite, nonempty geometry and transform checks.
- Architecture guard passes with zero violations and three existing allowlist warnings.
- Map portrait refreshed; four targeted voyage-map/portrait tests pass. git diff --check passes.
- Five previously accepted landmark module hashes unchanged. Existing fish-market construction group/socket IDs preserved, attachment socket positions aligned with new geometry. No gameplay state/action changes.
- Full service suite not repeated for this visual pass. Earlier baseline failures remain documented in parent test-delta.json.

## Budget and limits
Fish-market factory at level3: low8,608 triangles, medium/high9,504 triangles,33 material batches. Within14k/45 target. Existing external berth and new access spur are additional scene geometry; spur72 triangles/1batch. Physical-device frame timing remains unmeasured.

Materials remain cleaner and more regular than the concept, especially slate color bands, timber grain and fish/sign detail. Whole-island diagnostic overview distance increased to1.65 to include the outboard market; the earlier1.35 view clips its left edge. Production camera is unchanged, so final island-wide camera tuning remains for the assembly pass. Generated target is not exact parity authority. No merge or deployment performed.
