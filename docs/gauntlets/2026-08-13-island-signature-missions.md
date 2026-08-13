# Island Run Signature Missions — Execution Contract

## Status

Design contract only. The shared 3D interaction fixes may ship independently;
mission persistence, rewards, and completion gates require a separate canonical
gameplay slice.

## Mission

Give every ordinary authored island one memorable restoration problem that the
player can see changing as normal board play continues. Every fifth island
keeps its creature/boss battle as the signature event instead of adding a
second competing mission.

## Non-negotiables

- The canonical five-stop sequence and 36-tile board remain unchanged.
- Mission progress is driven by canonical gameplay events, never React-local
  mirrors. A mission may reserve canonical, tested tile indices when landing
  on those tiles is the explicitly authored event.
- A roll-based mission counts accepted canonical roll completions, not visual
  frames, taps, or approximate board laps.
- Mission visuals may react to progress but never become gameplay authority.
- Reduced motion replaces travel/impact choreography with a readable staged
  transition; it never hides mission state.
- Mission completion must not silently block Boss/travel until the economy,
  cadence, migration, and player-recovery behavior are explicitly approved.

## Recommended shared model

Use one versioned per-island record in canonical Island Run state:

```ts
type IslandSignatureMissionProgress = {
  missionId: string;
  version: 1;
  progress: number;
  target: number;
  completedAtMs: number | null;
};
```

The renderer receives a normalized `0..1` presentation value. A mutex-protected
service observes eligible canonical events and writes progress atomically.
Definitions contain content and presentation thresholds only—no callbacks,
wallet mutations, or tile indices.

## Cadence recommendation

For the Celestial space kingdom, use **20 completed rolls**, not 20 complete
laps. Twenty laps of a 36-tile board would require roughly 720 movement steps
and could approach one hundred rolls, which is too punitive for a visual
restoration mission.

## Authored mission roster

| Island | Signature mission | Observable restoration |
| --- | --- | --- |
| 001 — First Light Kingdom | **Assemble the Concord** | Nine recovered components activate a universal communication instrument; existing Concord authority remains canonical. |
| 002 — Celestial Sky Kingdom | **The Great Re-Docking** | Four landmark islands begin detached but tethered by luminous cables. Each group of five completed rolls winches one platform inward; rolls 5/10/15/20 trigger a clamp-lock animation. |
| 003 — Frostmoon Haven | **Frostwell Iceworks** | Three drill tiles grant pressure-wheel spins that drive an offshore auger 15–75 metres toward a 500-metre freshwater basin. After breakthrough, one substantial technology payment constructs a fishery and freshwater depot in a snow-and-spark burst; fish buckets and cyan water pipes then operate continuously. |
| 004 — Crown Citadel / repaired citadel world | **Raise the Broken Causeway** | Recovered masonry and bridge spans rise from the water in three large sections, reconnecting the four outer plots to the central citadel without moving gameplay tiles. |
| 005 — Sunshore Arena | **Arena guardian battle** | Existing every-fifth boss/creature event; no second signature mission. |
| 006 — Moonveil Nexus | **Rephase the Moon Mirrors** | Five giant mirrors rotate into alignment one at a time, forming a visible beam chain that stabilizes the central moon core. |
| 007 — Abyssal Pearl Kingdom | **Restore the Breathline** | A bubble-pressure network advances through four districts; domes clear, fauna return, and the pearl heart emits a final oxygen pulse. |
| 008 — Everblossom Kingdom | **The Great Pollination** | Butterflies carry light between landmark flower families; each stage opens a new border bloom, activates springs, and finally blossoms the central crown. |
| 009 — Heartshaft Crucible | **Restart the Ignition Chain** | The Great Fuse, conduits, Incubator, Memory Press, Switchyard, gantries, ignition ring, and magma heart activate in that visible sequence. |
| 010 and every fifth island | **Arena guardian battle** | Boss/creature battle remains the main island event. |

## Celestial vertical slice

1. Start with four outer landmark platform roots offset away from their final
   positions. Keep the canonical route, plot interaction proxies, camera
   targets, and cables fixed/usable.
2. Animate cables with sagged curves whose end sockets stay attached to the
   platform and central docking collars.
3. At progress 1–4, 6–9, 11–14, and 16–19, advance the active platform by a
   small deterministic winch stage after the roll presentation settles.
4. At 5/10/15/20, play a short authored lock sequence: pull-in, clamp close,
   light pulse, restrained camera acknowledgement, then return control.
5. Final state exactly matches the approved Island 002 layout; old saves with
   no mission record default to an explicitly chosen migration state rather
   than inferred roll history.

## Acceptance evidence

- Unit tests for event eligibility, idempotency, thresholds, save hydration,
  migration, and completed-state replay.
- Phone overview plus stage 0/5/10/15/20 captures.
- Landmark taps work in detached and docked states.
- Cable and platform bounds never intersect the protected route or camera.
- Reduced-motion and app-background/resume tests.
- Architecture guard, full service tests, production PWA build, and Capacitor
  iOS device verification before any live release.

## Open decisions before implementation

- Does mission completion grant only spectacle/story, or a separate reward?
- Is it required before the Boss, or an optional parallel restoration track?
- For existing players already past an island, should the mission start
  complete, replayable, or available as a return expedition?
