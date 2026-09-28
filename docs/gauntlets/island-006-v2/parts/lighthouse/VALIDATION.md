# Lighthouse and library — individual building pass

User approved continuation after the tavern. All implementation remains in the isolated island006 worktree; shared Claude checkout untouched.

## Visual gauntlet
- Eleven matched orthographic baseline and final views, including rear, top and clay; final qa/finish-v002.
- Generated four-view target is secondary inferred. Full prompt, image and provenance saved; target has an opaque background despite the requested transparency.
- Macro correction: tower door fit .73 → .90; copper cap alignment .79 → .90. Other critical scores at least .85.
- Finish correction: independently reviewed masonry readability .80 → .90 after separating face normals. Beacon .88 → .87 after a small optic simplification; no critical regression over .05. Final critical scores .87–.90.
- Four assembled world views approved: entrances clear, quay conifers removed, neighboring cottage shifted along shore with matching windows. No visible eave/footing overlap or floating foundation. Market foreground occlusion remains in some angles.
- Canonical board overview captured separately. The context lab contains actual world geometry but omits the gameplay board.

## Validation
- TypeScript no-emit and Vite production build pass. Existing large-chunk build warning remains.
- All 45 landmark/level/quality combinations produce finite, nonempty geometry and transforms.
- Architecture guards: zero violations, three pre-existing allowlist warnings.
- Island006 portrait refreshed from final board overview; four targeted voyage-map/portrait tests pass.
- git diff --check passes. No gameplay behavior changes; full service suite not rerun. Prior baseline failures are documented in parent test-delta.json.

## Budget and limits
Level3 low: 12,208 triangles; medium/high: 13,936 triangles; 39 material batches. Within 14k/45 targets. Renderer shadow passes are additional. Physical-device timing is not measured.

The runtime materials and courses are cleaner and more regular than the inferred concept. This is a reviewed game interpretation, not exact image parity. No merge or deployment performed.
