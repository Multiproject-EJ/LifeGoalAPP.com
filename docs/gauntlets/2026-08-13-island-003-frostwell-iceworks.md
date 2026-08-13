# Island 003 Frostwell Iceworks Gauntlet

## Status

Approved in concept by Eivind on 2026-08-13. The representative gameplay and
actual-3D vertical slice is in implementation. Publishing, deployment, live
database mutation, and App Store submission are not authorized.

## Mission

Give Frostmoon Haven a signature restoration mission that converts ordinary
board play into a visible public work:

1. three stable Island 003 route tiles are Frostwell drill tiles;
2. landing on one grants one pressure-wheel spin, whose canonical result drives
   the ice drill 15–75 metres toward a 500-metre freshwater basin;
3. after breakthrough, the player may fund the Frostwell fishing and freshwater
   technology with one substantial Essence payment;
4. payment triggers a short magical-mechanical construction burst;
5. the completed iceworks then runs continuously, lowering alternating empty
   and full fish buckets and moving fresh water through visible pipework.

The mission is a parallel island restoration track. It does not replace or
short-circuit the five canonical landmarks, their tickets, the Hatchery egg,
building levels, the Boss, or island-clear rules.

## Sources of truth

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`
- `docs/gauntlets/2026-08-11-islands-002-003-actual-3d-worlds.md`
- the current playable Island 003 overview at the canonical phone camera
- `.img2threejs/island-003-frostwell/` state, specification, and evidence

## Product contract

### Mission phases

| Phase | Canonical state | Player-visible result |
| --- | --- | --- |
| Drilling | `0..499` metres plus queued spins | wheel spins and the auger descends through a visible ice shaft |
| Breakthrough | `500` metres | water glow and funding affordance awaken |
| Funding | breakthrough plus sufficient Essence | one explicit confirmation; no accidental spend |
| Construction | funded | short reversible presentation burst; canonical state is already complete |
| Operating | built | fish lift, buckets, water reservoir, and pipe flow animate continuously |

### Economy default

Recommended first tuning: **1,000 Essence base**, scaled by the existing
effective-island Essence multiplier. This should feel substantially larger than
an early landmark ticket without introducing a new currency. The exact number
is a tuning constant and must use the shared cost/readout language.

### Drill-tile and wheel definition

Exactly three route positions—zero-based indices `8`, `17`, and `27` on the
canonical `spark36_ring`—grant one queued spin when landed on. They remain
ordinary route positions and are deliberately clear of every expandable
landmark-door cluster. A mutex-protected action consumes one spin, resolves one
of `15/20/25/30/40/50/60/75` metres, caps progress at 500 m, and commits the
result. React animates the authoritative result but never chooses it.

## Architecture and persistence

- Add one versioned, per-island signature-mission ledger to the canonical
  `IslandRunGameStateRecord` and its local/Supabase persistence mapping.
- Grant the spin in the same mutex-protected canonical roll action commit so
  dice spend, token movement, and the landing credit cannot split.
- Resolve and consume the wheel spin in a dedicated mutex-protected action.
- Fund through a dedicated mutex-protected action service that re-reads the
  canonical record, checks Island 003, breakthrough, already-built status, and
  current Essence before one commit.
- React reads canonical state and owns presentation only: panel visibility,
  construction burst timing, camera focus, and reduced-motion handling.
- Render code receives a derived phase/progress view; it never writes gameplay.
- Old saves and older remote rows default safely to zero progress and unbuilt.

## Actual-3D specification

### Placement

Place the iceworks completely off the island board on a separate slab of
frozen ocean, centred in the north ocean behind Frostmoon in the locked
overview. A narrow timber utility pier and insulated pipe bridge point south
toward Frostmoon Haven, but neither the building nor its
machinery may occupy island terrain, a tile, the token path, a landmark plot,
or the controller's screen area. The bore reaches an under-ice freshwater
basin beneath the 500 metre ocean shelf; it is not an on-board well.

### Required named parts

- detached sea-ice platform, fractured bore pad, and dark 500 m shaft throat;
- narrow utility pier and insulated service pipes leading back toward the
  island without crossing the route;
- timber/brass A-frame drill mast with flywheel and helical auger;
- twenty radial depth lamps plus a modal shaft/readout that visibly accumulates
  through drilling;
- post-payment timber fishery deck and snow-loaded roof;
- freshwater cistern with translucent cyan fill;
- brass/copper pipe network with moving cyan flow pulses;
- twin cable loops with alternating empty and fish-filled lift buckets;
- net drum, landing trough, warm work lamps, steam, and breakthrough plume;
- stable click target, focus target, named animation pivots, and part hierarchy.

### Visual states

- **Drilling:** open drill rig; auger rotates and descends with canonical depth.
- **Ready:** drill at full depth; water shines below; construction outline pulses.
- **Operating:** the whole fishery is present and alive. It must read as an
  additive construction, not a swapped unrelated prop.
- **Construction burst:** 1.5–2.2 seconds of snow/ice shards, amber sparks,
  cyan vapour, lift, and scale settle. Reduced motion uses a brief glow/fade.

### Quality and performance

- Preserve the existing Island 003 High/Low identity and budgets.
- Reuse geometries/materials and instancing for repeated fish/buckets/bolts.
- High/Medium may show both cable loops, fish detail, steam, and water pulses.
- Low keeps the drill/fishery silhouette, one lift loop, and one pipe-flow cue.
- No new renderer, physics engine, baked board, raster dependency, or gameplay
  hit geometry.

## Acceptance evidence

- pure tests for the three tile indices, wheel result, depth, phase, cost,
  idempotency, insufficient funds, and old
  save normalization;
- canonical roll-action tests prove only drill-tile landings grant one spin;
- persistence/backend round-trip or mapping tests cover the new ledger;
- phone overview plus left/right orbit in drilling and operating states;
- Island003-only north drill camera with central-landmark occlusion fade. The
  camera remains parked after closing so the player can inspect the real 3D
  rig; the standard magnifier explicitly returns to overview;
- viewport-safe lower minigame tray that leaves a clear upper 3D stage, with a
  large half-wheel, hub spin button, animated auger, ice shaft, chips, depth
  readout, and reduced-motion-safe authoritative result;
- route-clearance and landmark-click spot checks;
- reduced-motion and Low-quality proof;
- strict Island Run TypeScript, architecture guard, relevant service tests,
  production PWA build, and Capacitor iOS copy.

## Rollback and stop conditions

- The renderer addition and mission ledger/action are independently reversible.
- A missing mission field must always normalize to the untouched phase.
- Stop on a new gameplay-authority violation, persistence conflict, route
  obstruction, new test regression, material phone-performance loss, or an
  img2threejs hard stop.
- Do not claim release readiness from an unverified blockout or deploy without
  explicit authorization.
