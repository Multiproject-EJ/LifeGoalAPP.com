# Primary expedition ship — habitat controller direction

Status: **150 m living/walker macro direction approved for procedural blockout; hidden surfaces remain provisional**
Working asset ID: `VEH-SHIP-PRIMARY-CANDIDATE-01`
Updated: 2026-08-16

## Product decision captured

The primary expedition ship is a controller-shaped mobile workplace and home,
not a tiny shuttle and not a city-scale mothership. It is a mobile inhabited
campus roughly one-third the length of a very large cruise ship. The current
working envelope is about 150 m wide and 90 m deep in expanded living mode,
with a 52 m inhabited hull and about 78 m total height while standing on two
powered grip/front legs and two rear stabilizers. Hypersonic mode pulls the same occupied volumes into an
approximately 128 m-wide envelope. This modest physical nesting preserves a
plausible pressure-habitat volume; the fictional travel field supplies the final
effective compression rather than mechanically crushing the ship. Its identity comes from the relationship
between five stable zones:

1. a vast circular central garden and creature commons;
2. a monumental living tree at the garden's heart;
3. a Sky Terrace above the tree canopy;
4. a fabrication, builder and vehicle-garage wing;
5. a creature-habitat, home and specialist-room wing.

Homes, offices, diplomatic rooms, workshops and circulation decks wrap tightly
around the garden and continue through both controller handles. This is dense
vertical mixed-use architecture: four or five occupied levels, a useful garage,
and a large atrium—not a ship containing a whole city. The selected white,
charcoal and warm-amber images are now shape, scale and spatial authority. The
older orange/charcoal expedition-comic tests remain material and mood evidence
only.

These numbers are a working design coordinate system, not a claim that the
cinematic references are orthographic. They must be reconciled in the later
room-by-room deck blueprint.

The calibrated visual target is a four-level botanical resort / shopping
gallery: clearly grander than an office building, but well below city or
mothership scale. The Great Tree occupies roughly three levels and supports a
spiral/in-trunk stair, crown timber terrace, partial foliage wall, small
pavilion, tea seating and soft observatory lounges. The upper steering house
sits above and behind that terrace.

The Great Tree is a massive, broad-crowned oak rather than a decorative atrium
tree. Its crown terrace and pavilion are part of the scale calibration: a person
can lie in an observatory lounge under the foliage and look through the large
panoramic pressure window toward sky or space. The tree terrace is not the base
of the bridge. Steering and administration are sealed into the outer controller
shoulders so no command-room box occupies or roofs over the garden void.

Haven has one open wraparound pressure-glass system. It descends across the
front, continues along both sides, arches above the tree into a glazed roof and
promenade, and returns toward the rear. Gallery decks form an open U and stop
before the front glass; a full circular balcony and decorative front window grid
are prohibited. Sparse primary ribs are allowed. In fast-space mode the glass
is covered by sequenced, Iron-Man-like micro-armor scales and the exterior may
close into a very strong PS5-controller likeness.

Implementation calibration: the occupied atrium decks, inhabited architecture
and garden use one shared `0.84` visual frame inside the full-size pressure
shell. This is the approved way to recover the exterior/interior proportion;
do not independently miniaturize rooms or scale the sanctuary during a mode
transition. `src/assets/Blue_darkcontroller.webp` is the literal front-planform
authority for the closed speed shell, including its white grips, dark bridge,
blue touch surface and open lower centre.

## Inhabited vertical program

The central habitat now has one ordered five-zone program. These are real named
scene-graph volumes and inspection anchors, not labels pasted onto the cutaway:

1. `DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE` is the lowest service level.
   It contains the vehicle garage, machine workbenches and fabrication modules;
   the unoccupied working envelope draws inward and flattens before the fast
   travel shell locks.
2. `DECK_01_PREMIUM_CREATURE_HABITAT` is a warm, upper-class creature commons
   above the workshop, with soft nests, social coves, bathing and a garden
   overlook.
3. `DECK_02_ZEN_GARDEN_COMMONS` is the civic heart: the Great Tree, running
   water, reflection pool, seating, tea, quiet coves and tree circulation.
4. `DECK_03_MIXED_USE_RESIDENTIAL_RING` wraps the sanctuary with many
   apartments plus cinema, gym, chill zones, stores, tea rooms and community
   lounges. Repetition should communicate a large inhabited campus without
   making it city-scale.
5. `CROWN_COMMAND_AND_ADMINISTRATION` places three-floor panoramic steering
   houses in the forward bays of both outer controller shoulders and three-floor
   administration suites in the rear shoulder bays. These are genuine sealed
   rooms inside the shoulder pressure masses, never boxes inside the Zen garden.

The decks are vertically separated inside the compact `0.84` frame. The Great
Tree may pass through their central circulation opening, but service, creature,
garden and crown floor plates must not occupy the same height. True interior
camera anchors exist at the fabrication level, creature commons, garden floor,
upper galleries, steering house and administration side.

## Transformation contract

One persistent scene graph must support three truthful configurations without
teleporting rooms or swapping vehicle meshes:

### Expanded living / walking configuration

- unmistakable low, broad controller silhouette;
- central garden protected inside a glazed or closable atrium;
- Great Tree and Sky Terrace visible as the visual heart;
- glass transit bridges connect the central ring to both wings;
- fabrication bays and habitat decks remain readable from the exterior;
- the two grip nacelles become massive powered front legs while two lighter rear
  stabilizers complete the terrain stance;
- the central keel drive and two gimballed grip drives carry hover mass and
  unload individual feet during walking and jumping;
- cars, people, service robots and ordinary doors communicate inhabited-campus
  scale.

Walker is a sealed mobile configuration. The transparent front, side, roof and
rear pressure glass remains closed around the habitat, but fast-space physical
armor stays parked. The Haven-only luxury terraces, their glass rails,
furniture, planting and support beams retract fully into the side cassettes
before walking, hovering or ordinary flight begins.

### Docked / service configuration

- the controller shell stands on a central service/landing column in the large
  fabrication hangar;
- selected shell panels lift to expose stacked office, habitat and builder
  floors for maintenance;
- twin service/engine towers rise from the shoulder volumes;
- the central garden remains protected rather than expanding into an outdoor
  city;
- garage doors and maintenance access open without moving occupied floors.
- two large semi-circular garden balconies deploy from the ship sides, with
  retractable glass rails, planted edges, bars, lounge seating and warm lights;
- the landing/service column extends downward to the ground. In every mobile
  mode it telescopes downward into the belly cassette and never rises into the
  Great Tree or occupied garden volume.

### Hypersonic flight configuration

- both controller wings fold inward and streamline around the fixed centre
  spine through named shoulder hinges;
- the Great Tree garden stays upright inside four closable shield shutters;
- power towers and the landing keel telescope into protected sockets;
- occupied deck cassettes remain inside their clearance envelopes;
- two grip/front lower legs and two rear stabilizers telescope into armored
  travel recesses before shell closure;
- the central keel drive and both grip drives align for forward travel and
  remain available for hover, approach and landing;
- the silhouette becomes more aerodynamic without pretending the ship is a
  small fighter.

No occupied deck, home, garden or habitat may rotate through another volume.
Any transformation is staged through named pivots and clearance envelopes, not
shape morphing or hidden replacement meshes.

## Proposed animation-ready hierarchy

```text
EXPEDITION_SHIP_ROOT
├── CENTER_SPINE
│   ├── BRIDGE_OBSERVATION
│   ├── GARDEN_ATRIUM
│   │   ├── GREAT_TREE
│   │   ├── CREATURE_COMMONS
│   │   └── SKY_TERRACE_LIFT
│   ├── GARDEN_PETALS_[01..08]
│   └── LANDING_KEEL
├── LEFT_FABRICATION_WING
│   ├── OUTER_SHELL_SERVICE_HINGE
│   ├── CREATION_HALLS
│   ├── BUILDER_FLOOR
│   ├── VEHICLE_GARAGE
│   └── GARAGE_DOORS
├── RIGHT_HABITAT_WING
│   ├── OUTER_SHELL_SERVICE_HINGE
│   ├── CREATURE_DECKS
│   ├── HOMES_AND_OFFICES
│   └── SPECIALIST_ROOMS
├── WALKER_LEG_FRONT_LEFT
├── WALKER_LEG_FRONT_RIGHT
├── WALKER_LEG_REAR_LEFT
├── WALKER_LEG_REAR_RIGHT
├── TRANSIT_BRIDGE_LEFT
├── TRANSIT_BRIDGE_RIGHT
├── ENGINE_AND_POWER_RING
├── LEFT_MAIN_ENGINE
├── RIGHT_MAIN_ENGINE
├── CENTRAL_KEEL_DRIVE
├── EFFECT_SOCKETS
│   ├── THRUST_LEFT
│   ├── THRUST_RIGHT
│   ├── BOOST_TRAIL
│   └── DOWNWASH_ORIGIN
└── CAMERA_ANCHORS
    ├── ENTRY_POV
    ├── GARDEN_REVEAL
    ├── SKY_TERRACE_REVEAL
    ├── TRANSFORM_HERO
    ├── TRAVEL_POV
    └── ISLAND_APPROACH_HANDOFF
```

## Camera and gameplay handoff

The entry sequence should be one continuous spatial story:

1. player/avatar enters through the landing keel;
2. camera follows into the central garden;
3. welcome gifts appear only after the garden reveal;
4. camera rises through the Great Tree to the Sky Terrace;
5. exterior camera reveals the full controller-shaped ship;
6. service panels close and the ship transitions into its approved travel pose;
7. travel POV uses the same bridge/observation camera anchor;
8. the approach camera matches the destination island's overview direction and
   hands off without a discontinuous cut.

The avatar system should be a separate reusable rig with a stable seat, standing
and camera-eye anchor. Customization must not be authored into ship geometry.

## Propulsion and environment-interaction contract

Travel propulsion, heavy hover lift and fast-response leg stabilization are
three separate coherent systems:

- the port grip, starboard grip and central keel annular drives own idle,
  cruise, boost, hover and jump thrust animation;
- the two grip drives gimbal between rearward cruise and downward mobility
  vectors while the central keel drive maintains the sanctuary load line;
- the two powered grip/front legs and two rear stabilizers expose local trim
  sockets for final contact and step unloading;
- a slow diagonal four-beat gait lets the hull walk while hip, knee and ankle
  compensation keeps the garden floor level;
- thrust animation may use emissive plasma cores, exhaust cones, heat haze and
  restrained camera vibration, all reduced or removed for reduced motion;
- the ship exposes a presentation-only downwash signal containing world-space
  origin, surface normal, radius, strength and phase;
- the destination environment—not the ship—turns that signal into concentric
  water rings, spray, snow dust, loose leaves, hangar dust or lava heat
  distortion;
- ripple rings expand, attenuate and respawn from the live projected hover
  point, so they remain correct when the ship drifts laterally;
- no environment effect mutates Island Run gameplay state.

## Reference authority

- Primary scale and exterior goal:
  `references/03-primary-exterior-cutaway.jpg`
- Approved shape cues for expanded living mode are the first two exterior views
  of `references/06-transformation-movement-goal-v2.png`.
- Current 150 m walker candidate:
  `expedition-ship-150m-walker-living-mode-candidate-v1.png`
- Docked/service configuration:
  `references/01-docked-upright-controller-shell.jpg`
- Alternate compact garden shell:
  `references/02-compact-garden-shell.jpg`
- Internal deck and POV map:
  `references/04-deck-adjacency-pov-sheet.jpg`
- Central atrium and Sky Terrace:
  `references/05-central-atrium-sky-terrace.jpg`
- Current calibrated scale, Haven glazing and closed speed-mode authority:
  `references/11-calibrated-haven-interior-speed-authority-v1.png`
- Current shoulder-room placement and exterior authority:
  `references/12-shoulder-command-exterior-authority-v1.png`
- Current helm, administration, Haven balcony and tree-terrace POV authority:
  `references/13-inhabited-room-pov-authority-v1.png`
- Mixed lower-deck exploration:
  `references/14-workshop-and-creature-exploration-mixed-v1.png`. Only the
  top-left garage and top-right engineering bench are approved. The lower-left
  contributes only its green bathing/water-feature cue; its room architecture
  is not the creature habitat. The lower-right ship/section is rejected and
  must not inform geometry, scale or transformation.
- Creature-habitat candidate pending explicit approval:
  `references/15-premium-creature-habitat-candidate-v1.png`. This preserves a
  bounded Deck 01 room, uses a modest green bathing stream, and overlooks the
  real central garden without becoming a second atrium.
- `references/08-mega-atrium-tree-city-concept-v1.png` through `10` are
  overscale exploration only and must not determine dimensions.
- Generated exploration only (rejected as far too large):
  `habitgame-expedition-ship-habitat-controller-candidate-v1.png`
- Interior material/mood candidate: visual-bible expedition comic Direction B.
- Luma approach art is scale and arrival-mood evidence only.
- `EXPEDITION_SHIP.md` in the story visual bible currently marks the ship's
  visual identity as open; this candidate must be reviewed before being promoted
  to canonical authority.

## Current production gate

The macro rig, three poses, four-leg/tri-drive hierarchy, compact sanctuary,
wraparound Haven glass and controller-authority speed shell are implemented.
The five-zone inhabited program is now represented in the same persistent model
and remains inside the mobile geometry budget. The next slice is visual rather
than architectural discovery: refine the smooth exterior fairings against the
game controller asset, give each deck a stronger material/furniture identity,
improve the panoramic command rooms, and replace remaining blockout-scale dark
planes with a coherent warm resort interior. No new deck may be added until its
need is proven against the current goal images and mobile budget.
