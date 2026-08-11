# Islands 002–003 Detail, Ambience, and Live Release Gauntlet

## Status

Approved by Eivind on 2026-08-11. Embellishment implementation and local
phone-sized visual QA are complete; live release gates are in progress until
the verified build is published to `main`/GitHub Pages and synchronized to the
iOS Capacitor app.

## Mission and observable outcome

Raise Celestial Sky Kingdom and Frostmoon Haven from complete playable pilots
to richer living worlds without changing Island Run gameplay geometry. The
release is complete when both islands retain the canonical 36-tile route and
five interactive landmarks, show materially richer architecture, scenery,
fauna, and restrained ambience on a phone, preserve smooth iOS-oriented
performance tiers, and the exact verified source is available through the PWA
and the refreshed Capacitor iOS build.

## Sources of truth

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`
- `docs/gauntlets/2026-08-11-islands-002-003-actual-3d-worlds.md`
- The two admitted art-direction references and their `.img2threejs` evidence.

## Non-negotiables

- Do not move, duplicate, resize, or replace the canonical 36-tile route.
- Do not add gameplay writes, local gameplay mirrors, or island-specific token
  movement logic to the renderer.
- Preserve all five landmark roots, camera targets, click metadata, and L1–L3
  continuity.
- Scenery and fauna are non-blocking visual systems: they cannot obscure tiles,
  token landings, build targets, caretaker, labels, or the touch camera.
- Motion uses deterministic phases, honors reduced motion through the existing
  scene lifecycle, and does not move hit targets.
- Low quality preserves biome identity and at least one life cue. Medium/High
  may add density, particles, material response, and secondary inhabitants.
- No database, persistence-schema, payment, account, or economy migration.

## Detail and life contract

### Island 002 — Celestial Sky Kingdom

- Architectural: stronger sapphire/gold roof language, facade relief, arches,
  balustrades, finials, window rhythm, and readable palace hierarchy.
- Scenery: terraced sky gardens, clipped hedges, flower beds, crystal fountains,
  cloud shelves, floating islets, waterfalls, and distant sky structures.
- Fauna: small cloud birds and one or more stylized celestial creature systems
  that orbit or rest outside the route.
- Ambience: cloud drift, waterfall shimmer, crystal/fountain pulse, foliage
  sway, bird flight, and slow distant-islet motion.

### Island 003 — Frostmoon Haven

- Architectural: richer timber framing, stone footings, indigo roof layering,
  brass trim, warm window rhythm, icicles, snow caps, and keep hierarchy.
- Scenery: fractured snow shelves, rock clusters, frozen pools/cascades,
  lantern paths, wood piles, pines, alpine peaks, and aurora depth.
- Fauna: small snow birds and restrained alpine wildlife outside the route.
- Ambience: snowfall, chimney smoke, aurora movement, ice shimmer, lantern
  pulse, tree sway, and distant wildlife motion.

## Performance budgets

- High phone target: stable 50–60 FPS in the local 602×1328 proof frame.
- Low phone target: stable 55–60 FPS in the 376×830 proof frame.
- Preserve one renderer, one canonical board, and quality-scaled density.
- Prefer instancing or shared geometry for repeated foliage/fauna/ornament.
- Remove micro density before macro identity when a performance correction is
  required.

## Milestones and evidence

1. Baseline screenshots and performance telemetry for both High and Low.
2. Celestial detail/scenery/fauna/ambience pass with overview and orbit proof.
3. Frostmoon detail/scenery/fauna/ambience pass with overview and orbit proof.
4. L1/L2/L3, reduced-motion, live-shell, interaction-clearance, and phone checks.
5. TypeScript, production build, architecture guard, Island Run tests, runtime
   asset validators, console inspection, and `git diff --check`.
6. Intentional release commit pushed to `main`; GitHub Pages workflow reaches a
   successful deployment and the public PWA is smoke-tested.
7. `cap sync ios` copies the same production bundle to `ios/App/App/public`;
   the connected iPhone app is installed/launched when device tooling is
   available.

## Local visual QA record

Completed on 2026-08-11 in the camera-locked phone proof at L3:

- Island 002 High: 60 FPS, 883 draw calls, approximately 102k triangles at
  602×1328. Overview, left orbit, and right orbit passed without route or
  landmark clipping.
- Island 002 Low: 60 FPS, 481 draw calls, approximately 47k triangles at
  376×830. The palace silhouette, sapphire/gold identity, and a restrained life
  layer remain readable.
- Island 003 High: 60 FPS, 1038 draw calls, approximately 85k triangles at
  602×1328. Overview, left orbit, and right orbit passed without route or
  landmark clipping.
- Island 003 Low: 60 FPS, 551 draw calls, approximately 39k triangles at
  376×830. The keep silhouette, snow/timber identity, and restrained life layer
  remain readable.
- Geometry contract: 7/7 checks passed for both islands.
- Browser console: no warnings or errors during the final Island 002 and 003
  proof sequence.
- Final High overview captures are stored under each island's
  `.img2threejs/.../evidence/` directory for the release review.

## Release gate record

- TypeScript `--noEmit`: passed.
- Production Vite build: passed.
- Island art assets, render wiring, camera template kit, visual production
  briefs, and audio assets: passed.
- Island Run architecture guard: passed with zero violations (the three
  reported allowlisted legacy warnings are unchanged).
- Island Run service corpus: 1718 passed, 3 failed. The three failures are the
  previously documented Island 001 fixed-plot/final-camera baseline failures;
  the new Island 002/003, routing, arena, build-open, tile, and creature tests
  passed.
- `git diff --check`: passed.

## Authority and release boundary

Eivind explicitly authorized publishing this visual release to the production
PWA and refreshing/installing the iOS Capacitor app. Publishing is limited to
the verified HabitGame repository changes required for the current Island Run
work. No secrets, permissions, Supabase migrations, purchases, or App Store
submission are authorized.

## Rollback

- Revert the release commit to restore the prior live worlds.
- The release contains no save migration, so PWA rollback is one GitHub Pages
  deployment and iOS rollback is one Capacitor resync/build.

## Stop conditions

- New architecture violation, build failure, new Island Run behavioral failure,
  route/tile obstruction, severe phone framing regression, or High-tier
  sustained performance below budget.
- Unavailable GitHub authentication, failed Pages deployment, unavailable iOS
  signing/device tooling, or a release diff containing unreviewed unrelated
  files must be reported rather than concealed.
