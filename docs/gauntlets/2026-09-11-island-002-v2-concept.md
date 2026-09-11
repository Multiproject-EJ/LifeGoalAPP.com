# Island 002 V2 — Celestial Sky Kingdom

Status: V2 concept approved and local implementation authorized by Eivind on 11 September 2026 ("please do update it do v2! begin the work! now"). Production and visual validation are in progress. No release claim.

## Recommended experience

A grand floating royal city being reunited. Solspire Palace anchors a living central island; four distinctive garden districts drift home and mechanically lock into the kingdom. Keep the luminous ivory, sapphire, and gold identity. Give the world monumental architecture, deep hanging landscapes, and a satisfying sense of weight during docking.

## Current evidence and authority

Baseline source: released-main commit `1c1908751df10b9de8896bd89209540190146876`. Captures in `island-002-v2/baseline/` show the existing Three.js world, not a proposed V2 rendering. URLs, phone viewport, and short renderer samples are recorded in `capture-manifest.json`.

Current runtime routing assigns runtime island 002 to world source 002. The active factory is `src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts`. Its signature mission is the Great Re-Docking: 20 accepted rolls, with the hatchery, habit, wisdom, and event districts locking at rolls 5, 10, 15, and 20. Retain those mechanics as the recommended default.

The original 002/003 production document references `.img2threejs/island-002-celestial/evidence/`, but that directory was absent in the inspected root and released-main worktrees. The canonical external island intake folder covers 011–120; no 002 original was found there. Existing V1 screenshots and current runtime are the available visual evidence. Recover the original supplied reference, if available, before any fidelity claim. A new V2 concept should be explicitly identified as a redesign.

## V1 visual assessment

- The clear color identity and five readable landmark positions are worth retaining.
- Broad, nearly flat green shelves and simple conifers make the landscape feel sparse and artificial. Add authored elevation and distinct planting communities.
- Repeated circular bases make the outer landmarks feel like display pieces. Tie each building into its own terrain, docks, gardens, and paths.
- Solspire has a recognizable castle silhouette, but needs a richer sequence of terraces, halls, galleries, and roof masses to feel like a capital.
- At 0 rolls, outer districts clip beyond the left and right edges of the 430px overview. V2 needs framing that accommodates the separated arrangement as well as the docked city.
- Close palace views show visually noisy roof and masonry detail. Review material scale and depth artifacts before adding finer ornament.
- Waterfalls and floating rocks establish the setting; they need stronger depth, contact details, mist, and a layered cloud horizon.
- The initial High preview showed roughly 1,100 draw calls. This is a short browser sample, not a formal performance result; geometry batching must be part of V2 from the start.

## Landmark direction

| Landmark | Recommended V2 identity | Readable movement or life |
| --- | --- | --- |
| Solspire Palace | A terraced royal citadel: broad arrival stair, arcaded court, sapphire great hall, asymmetric spires, gold roof ridges, and balcony gardens. Fit its richer silhouette within the canonical center footprint. | Banners, warm inhabited windows, a slow celestial crown mechanism; a restrained celebration when all districts dock. |
| Cloudnest Conservatory | A glass-and-gold aviary around a living cloud tree, with visible nests, fern terraces, curved greenhouse ribs, and hanging vines. | Birds launch and return; leaves and nest pennants move in the wind. |
| Winged Resolve Court | An open sky-training academy with a clear practice floor, wing-shaped pylons, wind vanes, and a suspended training ring. | Training mechanisms and wind ribbons communicate its purpose without obscuring the floor. |
| Skybound Archive | A cliff-built library with stacked reading galleries, a sapphire observatory roof, telescope balcony, and visible book-filled interiors. | Slow orrery and telescope movement, warm reading lights, occasional page-like particles. |
| Astral Gate | A monumental portal dock: offset rotating celestial rings held in a substantial carved frame, with a clear arrival platform and crystal stabilizers. | Rings align as its district docks; portal light gains depth and settles after completion. |

## Terrain and planting

Create fractured rock strata, irregular ledges, hanging roots, and recessed cloud-lit undersides. Keep the playable route readable and clear. Plant in designed clusters: windswept trees, flowering shrubs, ferns, grasses, and trailing vines, using distinct canopy shapes and color variation instead of simply increasing identical tree counts. Concentrate detail near stairs, retaining walls, water sources, and landmark entrances.

Add a coherent water system: palace spring, garden channels, ledge cascades, and waterfalls fading into drifting mist. Use distant floating islands at several depths, occasional airship traffic, and slow cloud shadows. Maintain a quiet background behind the board and preserve unobstructed phone framing.

## Great Re-Docking choreography

Preserve 20 rolls and the four existing thresholds. Make each stage physically legible:

1. The active district approaches incrementally; tethers tighten, capstans turn, and stabilizers counter its gentle sway.
2. At its fifth roll, docking guides align. The platform brakes, compresses its buffers, and engages visible locking latches.
3. A bridge settles into place and a light pulse travels toward the palace. Let each landmark answer with its own brief animation.
4. The final district completes a kingdom-wide illumination, bell response, and airship salute. Return promptly to the playable overview.

Keep timing interruptible and state-driven. Reloads and replay resets must produce the correct settled arrangement. Reduced motion should retain alignment, locking, and completion information through short transitions rather than camera sweeps or repeated flashes. No new reward or island-clear gate is proposed.

## Content issue to resolve

`narrative/definitions/island002Narrative.ts` still identifies Island 002 as Pebble Bay and uses Tidefolk / Last Word / Maelis story beats, while the 3D world and newer docking mission are celestial. The older narrative proposal alone is not authority to rename the current world. Confirm where those beats surface, then agree a coherent sky-world adaptation before changing story canon. Preserve valid characters and narrative themes where possible.

## Proposed execution contract

### First reviewable milestone: art direction

Produce a clearly labeled V2 whole-island concept at the current gameplay camera, a five-landmark design sheet, and a four-frame docking storyboard. Use the real V1 captures as layout evidence. Keep the canonical 36-tile route, five landmark identities, and center footprint explicit; do not bake board tiles or HUD into runtime scenery. Review the proposed silhouettes and planting before broad asset production.

### Production after direction is agreed

- Build each landmark with genuinely additive L1/L2/L3 states and complete rear geometry.
- Upgrade terrain, vegetation, clouds, waterfalls, and docking apparatus as separately reviewable parts.
- Integrate through existing world factories and canonical mission actions. No new React gameplay writes or runtime-state mirrors.
- Batch repeated/static geometry; use instancing and quality tiers that preserve identity on Low.
- Keep click targets, camera focus, board clearance, and docking presentation synchronized with the existing canonical contract.

### Completion evidence

Use matching V1/V2 phone views for overview, all landmarks, rear/orbits, and both separated and docked arrangements. Check all build levels, each docking threshold, replay/reload, reduced motion, and Low/High tiers. Run relevant gameplay tests for any behavior changes, architecture guards, TypeScript, production build, and the Island Run regression suite. Run the shared device profiler against the actual target budgets; report physical-device evidence separately from desktop emulation. A beautiful overview alone is not completion.

### Boundaries

This concept work does not authorize an Island 002 production deployment. Preserve Island 001 and unrelated islands. Current deliverable is a grounded V2 proposal and V1 evidence; exact animation timings, asset budgets, and story adaptation remain production decisions to resolve against the approved design and shared contracts.
