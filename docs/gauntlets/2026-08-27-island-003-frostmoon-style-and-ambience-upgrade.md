# Island 003 Frostmoon copper style and ambience upgrade

Status: **awaiting decomposition approval**
Date: 2026-08-27

## Observable outcome

Island 003 keeps its established frozen-island layout and five Level 3 landmark identities, but replaces the blue roof family with warm raw copper and dark bronze. It begins in crisp arctic daylight, passes through a short late-day blizzard, clears through an ordinary peach/violet dusk without northern lights, and settles into a cozy moonlit night with warm windows, contained hearths, route lanterns and restrained chimney smoke.

## Sources of truth

- The four canonical Island Run contracts and `AGENTS.md`.
- `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md` and camera-locked kit.
- The exact user goal and hashed baseline under `.img2threejs/island-003-frostmoon-upgrade/`.
- The durable selected visual packet under `docs/visual-references/island-003-frostmoon-upgrade/`.
- Current production captures remain authoritative for landmark silhouettes and footprints.

## Non-negotiables

- No northern lights or aurora-like ribbon sky effect.
- No blue roof family and no green verdigris; use warm raw copper and dark bronze.
- No gameplay write, progress mirror or mission authority enters the renderer.
- Preserve the board route, island footprint, landmark roles and recognizability.
- The blizzard is short, late-day, ambience-only and interruption-safe.
- Reduced Motion keeps the selected phase readable without celestial travel or dense weather motion.
- Low quality retains the copper silhouette, phase lighting and one clear weather cue.

## Representative vertical slice

Use Aurora Keep because it exposes the largest roof family, layered silhouette and boss-scale night read. Produce a neutral-day five-view turnaround plus a night material proof while preserving its current main hall, turrets and entry-wing proportions. Only after this slice passes should the common material systems and turnaround language spread to the other four landmarks.

## Proposed sequence

1. Approve the 25-entry inventory and Aurora Keep representative slice.
2. Generate the Aurora Keep neutral turnaround and day/night material proof.
3. Lock common copper, snow, timber/stone and warm-window rules.
4. Generate the remaining four Level 3 landmark packets.
5. Implement the shared material and deterministic ambience systems in Three.js.
6. Capture day, blizzard, dusk and night runtime evidence at phone and desktop sizes.
7. Run architecture guard, relevant tests, strict TypeScript and production build.

## Acceptance evidence

- Every landmark remains recognizable from its current production view and the rear sanity view.
- Copper roofs remain distinct from snow in day, blizzard, dusk and night.
- Night windows and hearths read warmly without flattening the island or clipping exposure.
- The short blizzard does not obscure route readability or modal/board UI.
- No aurora appears in any phase.
- Preview phase is deterministic and production timing is bounded and pause-safe.
- Existing Island 003 gameplay behavior and mission state remain unchanged.

## Rollback

Keep the upgrade behind shared presentation/material and ambience boundaries. If a slice fails, restore the existing Island 003 material and sky configuration without touching canonical gameplay or saves.

## Approval checkpoint

Production turnarounds and geometry are not authorized by this draft alone. Approval should confirm:

1. the 25-entry inventory and Aurora Keep first slice;
2. raw copper/dark bronze with no verdigris;
3. contained hearth/fireplace cues rather than exposed outdoor fire;
4. current runtime silhouettes and footprints as the geometry authority;
5. day → short late-day blizzard → clearing dusk → cozy night, with no aurora.
