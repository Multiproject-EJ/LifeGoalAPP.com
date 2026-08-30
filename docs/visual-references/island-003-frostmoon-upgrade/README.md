# Island 003 — Frostmoon Haven visual upgrade reference packet

Status: **approved style implemented; ambience, landmark turnarounds, and Frostwell cutaway captured**

## Authority order

1. `003-source-current-production.png` is the exact current runtime baseline.
2. Eivind's 2026-08-27 decisions are authoritative for the upgrade:
   - replace saturated blue roofs with warm raw copper and dark bronze;
   - do not use aurora/northern lights;
   - begin in daylight, pass through a short late-day blizzard, clear into dusk, and settle into cozy night;
   - activate warm yellow windows, lanterns, chimneys and fireplaces as night approaches.
3. Images under `secondary-inferred/ambience/` are generated visual hypotheses selected to communicate that direction. They guide materials, lighting, weather and mood but do not override current landmark footprints, board geometry or unseen construction.
4. Landmark turnarounds under `secondary-inferred/landmark-turnarounds/` are approved production hypotheses for material language and silhouette. Hidden sides may not override canonical footprints or gameplay sockets without an explicit decision.

## Approved ambience order

1. `003-ambience-day-v001.png`
2. `003-ambience-late-day-blizzard-v001.png`
3. `003-ambience-clearing-dusk-v001.png`
4. `003-ambience-cozy-night-v001.png`

The cycle is presentation-only. It must use elapsed-time animation, remain quality-scalable, preserve phone route readability, and provide a reduced-motion state without rapid weather/camera motion.

Validated Three.js captures live under `runtime-evidence/` for day, blizzard, dusk, night, 235 m drilling, and the 500 m freshwater approach.

## Landmark turnaround set

- `003-aurora-keep-turnaround-v001.png` and `003-aurora-keep-night-proof-v001.png`
- `003-snowfeather-roost-turnaround-v001.png`
- `003-hearthguard-yard-turnaround-v001.png`
- `003-moonwell-observatory-turnaround-v001.png`
- `003-frostfire-archive-turnaround-v001.png`

The proper name **Aurora Keep** is retained, but no aurora or northern-light effect is permitted in the sky treatment.

## Landmark-by-landmark clarity pass

The current runtime landmark silhouettes are not yet approved as finished architecture. The clarity pass begins with `secondary-inferred/landmark-goals/003-snowfeather-roost-l3-goal-v002.png`, the approved representative L3 hatchery target that makes incubation nests, eggs, heat fittings, the entrance, and the rear service elevation legible. Geometry production began after explicit approval on 2026-08-28. The real Frostmoon Three.js preview was then reviewed from multiple angles; the representative slice conditionally passes the gameplay-distance identity gate, with final rear part coverage and interaction checks still open. Evidence is saved under `runtime-evidence/2026-08-28-snowfeather/`. `secondary-inferred/landmark-goals/003-hearthguard-yard-l3-goal-v002.png` is the next proposed goal and awaits user approval. The remaining order is Moonwell Observatory → Frostfire Archive → Aurora Keep.

## Frostwell mission evidence

- `003-runtime-cutaway-235m-v001.png`: side-section mid-drill proof with layered ice, segmented shaft, translucent bore and helical cutting bit.
- `003-runtime-cutaway-500m-v001.png`: freshwater-lens approach proof with the cyan proximity cue.

The cinematic temporarily isolates the mission section from the surface world, eases to a scene-owned side camera socket, and restores normal visibility when the mission focus closes. Canonical mission progress remains owned by the existing action/service path.

## Production route

- Current world: `src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts`
- Landmark identities: Snowfeather Roost, Hearthguard Yard, Moonwell Observatory, Frostfire Archive and Aurora Keep.
- Turnaround admission state: `.img2threejs/island-003-frostmoon-upgrade/`
- Frostwell mission cutaway production track: `.img2threejs/island-003-frostwell/cutaway-gauntlet/`.
