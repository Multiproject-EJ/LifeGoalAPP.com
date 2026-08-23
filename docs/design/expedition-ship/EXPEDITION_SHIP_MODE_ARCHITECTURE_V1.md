---
id: expedition-ship-mode-architecture-v1
type: design-contract
status: concept-direction
updated: 2026-08-20
---

# Expedition Ship mode architecture

## Intent

The expedition ship is a transforming sanctuary with the mechanical delight of
a precision transforming vehicle. It is not a robot carrying a garden. The
inhabited sanctuary is the persistent core; a reusable exoskeleton changes
configuration around it for living, terrain, ocean, atmosphere, space, and
hyperspeed.

User-confirmed direction:

- transformer / micro-machine-like nested transformation;
- an unmistakable PlayStation 5 hand-controller-derived core planform in every
  configuration, becoming nearly literal in fast-space / hyperspeed mode;
- distinct living and travel families;
- walking, ocean, comfortable low-speed atmosphere, fast-space, and
  super-compressed hyperspeed modes;
- the result should feel futuristic, clever, cool, and internally coherent.
- a three-drive propulsion layout: one central underside drive and one drive
  integrated into each hand-grip nacelle;
- the hand-grip nacelles are also the walking, hover, jump, and landing
  mobility chassis.

## Non-negotiable invariant

The Great Tree, root garden, pressure vessel, and occupied decks never fold,
shrink, teleport, swap, or pass through another volume.

The controller lineage is invariant, while its strictness changes by mode.
Expanded Haven and Walker may lift the centre canopy, open the glazing and
deploy the grip mobility chassis. Fast-space and hyperspeed must close into the
strongest PS5-controller likeness. From above and in the primary three-quarter
view, the family must retain:

- a broad central bridge / body;
- two strong shoulder masses;
- two long sweeping hand-grip nacelles;
- the characteristic pinched waist between the bridge and grips.

Travel armor may seal gaps and the grips may rotate or draw inward. No mode may
turn the ship into an oval capsule, generic seed, cylinder, or ordinary
aerospace fuselage. Buttons, sticks, logos, and literal interface details are
not required; in speed mode the controller's sculpted outer planform is.

Only unoccupied external systems transform:

- armor and radiator cassettes;
- terraces and their support rails;
- observation and service towers;
- walker / landing gear;
- propulsion nacelles;
- lift emitters, hydrofoils, shutters, and thermal belly panels.

Hyperspeed does not mechanically crush the sanctuary. The ship first reaches
its smallest nested physical configuration, then its field coils compress the
surrounding travel metric. This is a fictional propulsion assumption, not a
claim of present-day engineering.

## Structural architecture

1. A continuous central torsion ring surrounds the sanctuary pressure vessel.
2. A deep keel joins the ring to the four corner mobility bearings and the two
   propulsion nacelles.
3. All leg, engine, landing, and transformation loads bypass occupied rooms.
4. The Great Tree's root-water reservoir sits low in the core and serves as
   life-support storage, radiation shielding, thermal mass, and adjustable
   ballast.
5. The garden deck is inertially isolated from high-frequency leg, engine, and
   wave loads.
6. The central glazing is a near-continuous transparent-ceramic pressure layer.
   It descends across the front, continues along both sides, arches over the
   Great Tree as a glazed roof/promenade, and returns toward the rear. Sparse
   primary ribs carry load; a decorative window grid is prohibited in Haven.
7. Side and rear galleries form an open U around the tree. They terminate before
   the front glazing rather than completing a circular balcony wall.

## Vertical inhabited program

The compact pressure habitat contains five ordered zones, from keel to crown:

1. **Retractable fabrication and garage** — the lowest level holds vehicle
   access, machine workbenches and fabrication equipment. Its occupied core is
   fixed; only the unoccupied loading/work envelope and exterior garage belly
   retract before travel armor closes.
2. **Premium creature habitat** — a comfortable residential commons above the
   workshop, with nests, social coves, warm bathing and views toward the garden.
3. **Zen garden commons** — the Great Tree, running water, reflection pool,
   seating, tea and quiet coves form the primary civic destination.
4. **Mixed-use residential ring** — many apartments surround the garden with a
   cinema, gym, chill zones, stores, tea rooms and community lounges distributed
   through the open U-shaped galleries.
5. **Command and administration shoulders** — large panoramic three-floor
   steering houses occupy the forward bays inside both outer controller
   shoulders; three levels of administration occupy the rear shoulder bays.
   Their floors, walls and pressure glass are contained by the shoulder masses
   and may not project into the central garden atrium.

The scene graph names these zones `DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE`,
`DECK_01_PREMIUM_CREATURE_HABITAT`, `DECK_02_ZEN_GARDEN_COMMONS`,
`DECK_03_MIXED_USE_RESIDENTIAL_RING`, and
`CROWN_COMMAND_AND_ADMINISTRATION`. Their vertical order is contractual. They
may share the Great Tree's protected central circulation opening but may not
collapse into overlapping office-like slabs. Human-eye inspection anchors must
remain available on the workshop, creature, garden, gallery, steering and
administration levels.

## Calibrated inhabited scale and visual language

The 150 m exterior contains a medium-large inhabited campus: approximately a
four-level botanical resort or premium shopping gallery. It is deliberately
larger and more generous than an office atrium, but it is not a city or
mothership. The Great Tree spans roughly three occupied levels rather than all
of an eight-storey megastructure.

The tree is also circulation and destination architecture:

- a broad stair wraps around the trunk and partly passes through inhabited
  openings inside it;
- primary boughs support a large timber crown terrace;
- dense greenery creates a partial foliage wall around the terrace edge;
- a small tree-integrated pavilion, tea seating and soft lie-down lounges face
  the panoramic glass;
- the shoulder-mounted steering houses remain spatially separate from the tree
  terrace, preserving its near-180-degree sky/universe view.

The project design system reinforces clean futuristic glass, rounded continuous
surfaces, restrained cyan/teal-blue accents and soft motion. The ship translates
that language into white ceramic armor, dark graphite load paths, warm amber
inhabited rooms, continuous structural glass and a small number of crisp blue
power seams. Haven should feel open and calm; speed mode should feel seamless,
precise and controller-like. Repeated cage mullions, exposed mechanical noise,
boxy office stacks and arbitrary sci-fi greebling are outside the style.

## Tri-drive mobility architecture

The ship has three primary propulsion units:

1. **Central keel drive** — mounted below the sanctuary on the structural
   centerline. It supplies primary lift, pitch control, load balancing, and
   center-of-mass-aligned cruise thrust.
2. **Port grip drive** — integrated into the left hand-grip nacelle.
3. **Starboard grip drive** — integrated into the right hand-grip nacelle.

The three drives gimbal between rearward cruise thrust and downward mobility
assist. Differential thrust from the grip drives supplies roll and yaw; the
central drive keeps the sanctuary deck level.

Each grip nacelle is a persistent mobility chassis containing:

- one gimballed primary drive;
- one powered front-leg mechanism whose upper armored mass is the grip itself;
- one adaptive front foot / landing pad;
- suspension, power, and transformation hardware;
- an underside recess that seals the articulated lower leg in travel modes.

Two lighter rear stabilizer legs deploy from the shoulder/keel bearing line.
Together with the two powered grip/front-leg assemblies they create four ground
contacts. This makes the controller handles the functional origin of locomotion
without pretending that four identical legs live inside two handles. The grip
nacelles remain visibly recognizable in every mode.

Walking is normally actuator-driven. Propulsion assists only when useful:

- unloading a foot during a step;
- stabilizing on weak or broken terrain;
- extending a stride across a gap;
- jumping an obstacle;
- cushioning a landing;
- briefly hovering or translating without ground contact.

Near people, buildings, soil, or water, the drives use a low-velocity,
distributed lift regime rather than a concentrated hot rocket plume. High
energy space propulsion engages only after safe clearance. The exact lift
physics remains a fictional technology assumption to be specified consistently
for HabitGame.

## Layered retractable shield architecture

The Great Tree atrium uses five protection layers. Shield parts remain attached
to the ship and deploy from persistent cavities; they do not appear, detach, or
occupy living space.

1. **Permanent wraparound pressure window** — transparent ceramic remains fixed
   across the front, sides, roof promenade and rear return in every mode.
2. **Retractable front window armor** — four overlapping leaves park in the
   shoulder, upper-bridge, and lower-ring bays. Left and right leaves sweep
   inward while upper and lower leaves close vertically on concentric guide
   tracks. Compression latches interlock them into one load-spreading plate.
3. **Flowing wraparound armor scales** — small morphing-composite plates emerge
   from the white shell shoulders and structural arches in a sequenced wave,
   interlocking across the side, roof and rear glass like a fitted second skin.
4. **Deployable seam protection** — short sacrificial micrometeoroid / thermal
   panels extend around vulnerable shoulder, grip, terrace, and service seams.
5. **Conformal active shield** — small emitter vanes extend from the shoulders,
   grips, underside, and central ring. They project a close-fitting field that
   traces the controller silhouette rather than a generic spherical bubble.

The protection sequence is:

`living-open → front-leaves-extracting → wrap-scales-flowing → physical-armor-locked → conformal-field-active`.

The armor may retain a narrow protected electrochromic observation band in
ordinary travel. Hyperseed and severe-hazard states close it completely. The
three-drive power system feeds the emitter network through the central torsion
ring so shield loads remain distributed rather than concentrated on the
window.

## Mode family

### Living family

#### Haven

- Four supports crouch low and wide.
- Two large semi-circular garden terraces roll out from the port and starboard
  sides. Bars, lounge seating, lights and dense planting deploy with them;
  transparent rails rise from the floor and their support beams unfold below.
- Armor / radiator cassettes open.
- Observation towers extend.
- Atrium shutters park around the central ring.
- Propulsion remains quiet; heat rejection and social space take priority.

#### Sealed shelter

- Occupied core remains stationary.
- Terraces retract, towers lower, and atrium shutters close.
- Legs remain grounded.
- Used for severe weather, ocean pressure, dust, radiation, or emergency
  isolation.

### Travel family

#### Terrain walker

- Haven's two luxury garden terraces are fully rolled into the side hulls;
  their glass rails telescope into the deck and their supports fold before the
  first step.
- The permanent panoramic pressure glass remains closed around the front,
  sides, roof and rear, so Walker is transparent but never open to atmosphere.
  Fast-space physical armor remains parked.
- Each hand-grip mobility chassis becomes one powered front leg; two lighter
  rear stabilizer legs deploy from the shoulder/keel line, providing exactly
  four ground contacts.
- Paired enclosed linear actuators and magnetorheological dampers carry load.
- Broad three-segment feet adapt to terrain.
- A diagonal four-beat gait keeps three useful support vectors under the hull.
- The two grip drives vector downward to unload active steps; the central keel
  drive stabilizes the sanctuary deck.
- Walking is the energy-efficient rough-terrain mode; propulsion supplies
  jumping, soft landing, brief hover, and hazard crossing.

The Haven landing/service column is a downward-folding telescope. It retracts
into the belly cassette for Walker, atmosphere and space modes; no part of that
column may move upward through the Zen garden, tree roots or crown terrace.

#### Ocean

- The two grip/front lower legs and two rear stabilizers Z-fold into persistent
  travel recesses; their foot structures reconfigure as four streamlined
  hydrofoil / ballast surfaces.
- The hull floats low with a broad stable waterplane.
- The three drives switch to a quiet magnetohydrodynamic or pump-jet water
  regime.
- Root-water tanks participate in trim and ballast.
- Full sealing supports surface travel and controlled submersion; depth limits
  remain to be specified.

#### Comfort atmospheric cruise

- Walking struts nest into flush grip-nacelle recesses.
- White shoulder cassettes extend into broad lifting surfaces.
- The central keel drive and two vectored grip drives provide stable
  low-downwash flight.
- The inertial garden mount prioritizes comfort over acceleration.
- The atrium may remain visible behind electrochromic glazing at low speed.

#### Fast space

- Terraces, towers, legs, and lift surfaces seal flush.
- The central keel drive and both grip drives align as a three-engine cluster
  through the combined center of mass.
- Atrium armor closes, leaving a protected observation band.
- Radiator edges remain available when thermal conditions permit.
- This is a high-speed vacuum cruise body, not yet the hyperspeed state.

#### Hyperseed

- Every empty external mechanism nests around the unchanged sanctuary core.
- Grip nacelles rotate inward only within a bounded range that preserves the
  two-grip controller silhouette; armor cassettes overlap and belly panels
  interlock.
- The result is the densest armored version of the controller-shaped ship, not
  an oval seed or capsule.
- Concentric coils in the torsion ring establish the fictional compression
  field around the ship.
- The physical core does not shrink; exterior spacetime is the compressed
  travel medium.

## Multifunction mapping

| Controller-derived feature | Living function | Travel function |
| --- | --- | --- |
| Twin grips | homes, workshops, utilities | power and propulsion nacelles |
| Shoulder shells | weather cover, shade, radiator faces | armor, lifting surface, thermal shell |
| Central bridge | Great Tree atrium and commons | protected inertial sanctuary core |
| Four corner mechanisms | foundations and access | legs, landing gear, hydrofoils, belly panels |
| Central underside drive | quiet utility core | lift, balance, cruise, jump stabilization |
| Left and right grip drives | grip utilities and mobility service | thrust, steering, hover and jump assist |
| Root-water reservoir | ecology and wellbeing | shielding, thermal mass, trim, ballast |
| Ring seams | shutters and service circulation | transformation rails and field coils |

## Current visual evidence

- `src/assets/Blue_darkcontroller.webp` — literal in-game front-planform
  authority for the closed speed shell. It outranks generated concepts for the
  white-grip, dark-bridge, blue-touch-surface and open-lower-centre silhouette;
- `habitgame-expedition-ship-controller-shape-lock-v4.png` — current
  supporting controller-volume authority for non-front views;
- `habitgame-expedition-ship-living-walker-master-v2.png` — supporting
  sanctuary and living-mode reference;
- `habitgame-expedition-ship-engineering-master-v3.png`
- `habitgame-expedition-ship-transformation-sequence-v3.png`
- `habitgame-expedition-ship-transport-modes-v3.png`
- `habitgame-expedition-ship-tri-drive-mobility-v5.png` — propulsion-layout,
  hover, jump, two powered handle/front-leg masses and two rear-stabilizer
  evidence; exact joint clearances are not proven by this generated sheet.
- `habitgame-expedition-ship-retractable-shield-sequence-v6.png` — current
  physical window-armor and conformal active-shield deployment authority.
- `references/11-calibrated-haven-interior-speed-authority-v1.png` — current
  authority for the middle-scale four-level habitat, open wraparound Haven
  glazing, non-circular gallery termination and PS5-like closed speed body.
- `references/08-mega-atrium-tree-city-concept-v1.png`, `09`, and `10` are
  overscale exploration only. They may inform individual amenities and transform
  choreography, but they do not set the ship's scale or deck count.

These are concept references, not dimensionally consistent engineering
drawings. The six-mode sheet establishes relationships and mode identity; a
future orthographic package must resolve exact clearances and shared pivots.
The capsule-like Fast Space and Hyperseed silhouettes in
`habitgame-expedition-ship-transport-modes-v3.png` are explicitly rejected;
that image is mode-function evidence only and not exterior shape authority.

The current implementation uses a shared `0.84` visual scale for the inhabited
atrium, galleries and garden inside the full-size outer shell. This is a static
proportion calibration, not travel-mode compression: the sanctuary's local
scale and orientation remain unchanged throughout animation.

## Next engineering gate

Before resuming detailed Three.js construction:

1. freeze the sanctuary core dimensions and protected volume;
2. define the torsion ring, keel, and four bearing coordinates;
3. allocate collision-free storage envelopes for all four leg modules;
4. prove terrace, tower, shutter, shell, and nacelle motion as simple swept
   volumes;
5. produce consistent front, side, top, rear, and underside views for Haven,
   Walker, Ocean, Atmosphere, Fast Space, and Hyperseed;
6. only then rewrite the procedural blockout and transformation hierarchy.
