# Islands 002–003 Actual-3D World Gauntlet

## Status

Implemented and locally verified on 2026-08-11. Both worlds pass the shared
phone, progression, performance, architecture, and canonical-layout visual
gates. They are ready for Eivind's in-app art-direction review; deployment was
not part of this task.

## Mission

Replace Island 002's temporary 2D fallback and author Island 003 as two
distinct, explorable Three.js worlds in the canonical Island Run shell:

- **Island 002 — Celestial Sky Kingdom:** luminous white stone, sapphire roofs,
  gold filigree, floating rock platforms, cloud falls, and airy gardens.
- **Island 003 — Frostmoon Haven:** snow-loaded dark timber, indigo roofs,
  violet astronomy magic, ice channels, warm lanterns, and alpine forest.

The supplied images are art-direction references, not geometry extractions.
They are single three-quarter views, so hidden sides and undersides are
explicitly inferred and must be checked from rear and orbit views.

## Sources of truth

- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- The shared camera, Spark36 tile geometry, player movement, build mode, and
  mobile quality profiles in the existing Island 001/004/005 renderer.
- Stable reference copies under `.img2threejs/island-002-celestial/evidence/`
  and `.img2threejs/island-003-frostmoon/evidence/`.

## Non-negotiables

- Runtime island number owns story, progression, rewards, persistence, and
  arena cadence. A visual-world source never changes gameplay identity.
- Use the canonical 36-tile route and tapered raised tile geometry. Do not bake
  a second board, player piece, controls, labels, or HUD into scenery.
- Each island has the same five canonical landmark IDs and three genuinely
  additive build levels. L1 is not a miniaturised L3.
- Islands 002 and 003 are ordinary islands: their centre is an impressive
  guardian landmark, not a creature arena.
- Landmarks remain external to tile progression. React receives no new
  gameplay writes or local gameplay mirrors.
- Low quality preserves identity, navigation, moving clouds/snow or equivalent
  life cues; Medium and High add density and material response.
- Reduced motion removes nonessential drift without hiding state.
- Preserve the approved 001/004/005 worlds and the runtime 005 arena creature.

## Authored landmark identities

| Stop | Island 002 — Celestial | Island 003 — Frostmoon |
| --- | --- | --- |
| Hatchery | Cloudnest Conservatory | Snowfeather Roost |
| Habit | Winged Resolve Court | Hearthguard Yard |
| Mystery/Event | Astral Gate | Moonwell Observatory |
| Wisdom | Skybound Archive | Frostfire Archive |
| Boss | Solspire Palace | Aurora Keep |

## Quality contract

### Island 002 identity systems

- five separated floating rock masses with tapering undersides and connected
  pale-stone bridges;
- white/ivory architecture with sapphire roofs and readable gold edge bands;
- cloud banks below the playable world, elevated distant clouds, and several
  waterfalls disappearing into cloud;
- restrained grass, conifers, flowers, blue banners, violet/cyan crystals;
- unique landmark silhouettes: domed hatchery, open training court, portal,
  library tower, and multi-tower palace.

### Island 003 identity systems

- one fractured alpine island with snow shelves, icy ravines, and dark rock
  cliffs; no open tropical water language;
- dark timber/stone architecture, indigo snow-loaded roofs, brass, violet
  crystal, and warm amber windows;
- snow pines, chimney smoke, snowfall, frozen cascades, and a subtle aurora;
- unique landmark silhouettes: nest lodge, fenced training yard, crystal
  observatory, round archive tower, and central Aurora Keep.

### Blocking failures

- palette swap or copied landmark silhouette from another island;
- missing/flat tile top faces, z-fighting, route obstruction, or landmark-hit
  target drift;
- one build level merely scaling another;
- clouds intersecting the water/terrain or snow/ice clipping through tiles;
- centre arena on 002 or 003;
- unreadable phone framing, broken rear geometry, or severe Low-tier identity
  loss;
- new canonical-state or gameplay write violations.

## Milestones and evidence

1. **Intake and spec:** stable references, image analysis, suitability,
   admission, detail inventory, material plan, strict quality contract.
2. **World adapters:** explicit runtime→world routing for 001–005, with
   002/003 restored to unique source packs and 004/005 retaining their approved
   reassignment.
3. **Landmarks:** five factories per island, each with L1/L2/L3 continuity,
   stable roots, click metadata, and camera targets.
4. **Terrain and ambience:** biome-specific plate treatment, bridges, distant
   scenery, vegetation, water/cloud/ice systems, and deterministic animation.
5. **Board integration:** island palette, lighting/fog, build mode, camera tour,
   token movement, caretaker, and quality selection all work in the canonical
   shell.
6. **Gauntlet review:** overview plus five landmark views, rear/orbit checks,
   L1/L2/L3 comparison, Low/High and reduced-motion spot checks.
7. **Regression:** TypeScript, production build, architecture guard, relevant
   contracts, full Island Run tests, and `git diff --check`.

## Performance budgets

- One WebGL renderer and one canonical board per scene.
- Prefer instancing for snow, flowers, foliage, crystals, windows, and repeated
  posts; compact static landmark geometry after authorship.
- Low tier removes micro density before macro identity and never removes all
  biome motion.
- Keep camera paths outside distant-cloud, mountain, and floating-islet belts.
- Do not add raster runtime assets unless optimized WebP evidence justifies
  them; these pilots default to procedural geometry and materials.

## Rollback

World routing is one reversible service. If either world cannot pass a gate,
that runtime island returns to the existing 2D fallback without touching saves,
story, rewards, or the completed 3D worlds.

## Stop conditions

- Stop on an img2threejs hard gate, renderer crash, new architecture violation,
  corrupted routing identity, or inability to keep the canonical route clear.
- Do not declare both islands complete from desktop-only or overview-only proof.

## Final verification record

- Island 002 and Island 003 each render five distinct landmarks with additive
  L1/L2/L3 construction states in the shared 36-tile board, camera, token,
  caretaker, build-mode, and quality-profile shell.
- High-tier phone evidence was captured at 602×1328 for overview, left orbit,
  right orbit, and all three construction levels. Low-tier phone evidence was
  captured at 376×830.
- Local browser telemetry remained at 60 FPS in the captured High and Low
  reviews. After the final art-density pass, Island 002 measured about 93k
  triangles on High and 44k on Low; Island 003 measured about 67k on High and
  34k on Low.
- Deterministic multi-angle collapse diagnostics found no degenerate orbit view
  for either world. Manual review covered rear geometry, roof/snow continuity,
  landmark readability, route clearance, and cloud/mountain placement.
- The original reference silhouettes do not pass literal pixel-overlap Tier 1
  (IoU 0.6632 for 002; 0.6669 for 003). This is the expected and documented
  result because the references are inspiration compositions with different
  topology, while the playable deliverables must preserve the canonical
  36-tile Island Run layout. They were therefore reviewed against the declared
  biome, palette, material, landmark, and ambience contract instead.
- TypeScript, production build, `git diff --check`, and the Island Run
  architecture guard pass. The full Island Run suite passes 1718 tests and
  retains three pre-existing Island 001 layout failures unrelated to these
  worlds.
