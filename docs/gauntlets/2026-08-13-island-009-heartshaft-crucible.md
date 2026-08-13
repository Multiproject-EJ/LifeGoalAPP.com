# Island 009 — Heartshaft Crucible Gauntlet

Status: **approved direction; production active**

Island role: **ordinary island** (009 is not an every-fifth creature Arena)

Selected reference: `docs/visual-references/island-009-heartshaft-crucible/island-009-heartshaft-crucible-goal-v1.png`

## Mission

Build Island 009 as a complete playable procedural Three.js volcanic world
whose identity comes from an immense open vertical crater and a connected
industrial-volcanic mechanism network. Preserve the canonical Island Run shell,
real `spark36_ring`, camera, progression, rewards, Build flow and caretaker.

## Player outcome

On first phone overview the player sees all 36 clean tiles around the open
Heartshaft, can distinguish all five landmark functions immediately, and can
orbit without discovering hidden flat facades or scenery that blocks the route.
The island should feel alive because its mechanisms answer one another across
the caldera rather than because many unrelated particles were added.

## Visual authority and reference limits

The selected image is a goal/inspiration image, not runtime art and not geometry
authority. Its approximate tile count, perspective, hidden sides and apparent
scale are non-authoritative. Runtime uses exactly 36 real wedge tiles and the
camera-locked plot positions. Rear construction, crater depth and mechanism
attachments must be inferred and proven in left/right/rear renders.

The reference is admitted conditionally for procedural reconstruction: it has a
strong overview silhouette and visible materials, but it is a complex scene
rather than an isolated object and cannot prove unseen engineering. The target
is a coherent stylized reconstruction, not pixel-identical photogrammetry.

## Locked composition

- Central plot: the Heartshaft Crucible alone inside the ring.
- Rear-left external plot: Blastglass Incubator (Hatchery).
- Rear-right external plot: Great Fuse (Habit).
- Front-left external plot: Memory Press (Wisdom).
- Front-right external plot: Seismic Switchyard (Mystery).
- Four satellite plots remain outside the protected ring corridor and use the
  camera-locked mirrored footprints.

## Five landmark families

1. **Hatchery — Blastglass Incubator**
   - asymmetric copper furnace nursery;
   - crimson heatproof-glass egg capsules on a vertical carousel;
   - L1 one finished furnace pod, L2 working carousel, L3 full incubation stack
     with vents and salamander supports.
2. **Habit — The Great Fuse**
   - iconic tall segmented metal fuse with black ceramic collars;
   - completion energy travels through a copper conduit toward the centre;
   - L1 grounded fuse socket, L2 charged segmented tower, L3 flywheel, gauges
     and full spark-transfer crown.
3. **Mystery — Seismic Switchyard**
   - asymmetric pipes, pistons, gauges, branching valves and violet chamber;
   - L1 pressure manifold, L2 switching engine, L3 multi-cylinder crystal
     pressure yard with controlled reveal/flame choreography.
4. **Wisdom — The Memory Press**
   - slender obsidian-and-brass archive workshop;
   - rotating rune bands align before a press stamps heated knowledge plates;
   - L1 plate desk and one band, L2 operational press, L3 full three-band
     scriptorium with heat-glass accents.
5. **Boss — The Heartshaft Crucible**
   - a vast crater descending through layered basalt to a small magma heart;
   - three asymmetric gantry arms reach over the open void without forming a
     roof; chains suspend a skeletal ignition ring with a large open centre;
   - L1 observation rig and exposed shaft, L2 three-arm operational gantry, L3
     full ignition ring, counterweights, maintenance platforms and deep pulse.
   - It is machinery over an inaccessible shaft, not a creature Arena, stadium
     or traversable battle floor.

## Connected ambience

- Great Fuse segments charge in sequence and send a spark along the conduit.
- Incubator capsules rotate slowly and respond with a heat pulse.
- Memory Press rune bands align, then stamp one glowing plate.
- Switchyard pistons, gauges and valves change pressure in a bounded pattern.
- The three central gantries rotate subtly and lower/raise the ignition ring;
  the magma heart and distant lava falls brighten in response.
- Layered ember motes, heat shimmer, ash wisps, low fire-lilies, crystals and
  cooled rope-lava support the mechanisms without entering the tile corridor.
- Reduced motion freezes moving machinery in a readable safe pose and removes
  rapid spark/ash motion.

## Palette and materials

- graphite basalt and obsidian;
- black steel, antique copper and restrained brass;
- molten yellow-orange and ember crimson;
- violet magma crystal at Mystery;
- tiny heat-tempered teal glass accents at Wisdom/Hatchery;
- no ocean blue, ordinary greenery or Flower Kingdom material carryover.

## Non-negotiables and forbidden shortcuts

- Preserve canonical gameplay authority and 36-tile topology.
- No gameplay writes or progression logic in the world/component layer.
- No floating island, ocean, water, cloud sea or void beneath terrain.
- No central palace, covered crater, conventional colosseum or arena floor.
- No satellite landmark inside the ring and no scenery on playable tiles.
- Do not copy/recolour Island 005 or Island 008 geometry.
- All five landmarks require genuinely additive L1/L2/L3 silhouettes.
- No push, merge, PWA deployment, TestFlight upload or App Store submission
  without Eivind's explicit permission.

## Milestones and acceptance evidence

1. **Intake/source pack:** selected master, image analysis, admission,
   pre-spec assessment, 3x3 detail inventory, sculpt spec and state gate.
2. **Representative blockout:** unique routed world, full caldera/root, real
   36-tile ring, deep open shaft, five unmistakable landmark masses; prove with
   map-stripped phone overview and left/right orbit.
3. **Heartshaft risk slice:** L1/L2/L3 open-shaft/gantry hierarchy, visible depth,
   stable attachments, route clearance and boss focus view.
4. **Landmarks one by one:** Hatchery, Habit, Mystery, Wisdom with three levels,
   entrances, focus sockets, colliders and action-ready part metadata.
5. **Living world:** elapsed-time mechanisms, connected pulse sequence,
   reduced-motion state and real cost scaling across Low/Medium/High.
6. **Release candidate evidence:** phone overview/orbits/focus/levels/motion,
   TypeScript, production build, Island Run tests, architecture guard,
   geometry/routing contracts, `git diff --check`, PWA/Capacitor safety checks.

## Budgets

Use the Island 007 High ceiling unless a stricter measured value is achievable:
approximately 175 maximum draw calls, 180k maximum triangles, 50 FPS average,
p95 frame time at most 29 ms and slow frames at most 15%. The crater illusion
must prefer layered low-segment rings, instancing and emissive materials over
expensive transparency, shadowed lights or dense particles.

## Rollback and stop conditions

Island 009 remains isolated behind its authored-world route. A device-only or
visual failure can be rolled back by removing the runtime 009 route and world
factory without changing saves or canonical gameplay.

Stop and revise if the crater reads as a flat dark disk, gantries cover the
shaft, the centre reads as an arena, any satellite enters the route corridor,
the full ring does not fit the phone overview, L1/L2/L3 swap identities, or
High exceeds the documented mobile ceiling without a safe Auto downgrade.

## Handoff

Resume by reading the repository contracts, this Gauntlet and the selected
master, then run:

`python3 /Users/ejmac/.codex/skills/img2threejs/forge/next.py --state .img2threejs/island-009/state.json .img2threejs/island-009/object-sculpt-spec.json`

Continue from the exact reported step; never reconstruct progress from chat.
