# Expedition Ship lower-deck interior systems — reference analysis

Reference: `references/14-workshop-and-creature-exploration-mixed-v1.png`

## Identification and suitability

The reference is a four-panel concept sheet for two related architectural
interiors inside the established expedition ship: a fabrication garage and a
multispecies creature sanctuary. It is an environment/vehicle-interior object
target (`primaryDomain: object`) rather than a literal four-view orthographic
model. Confidence is 0.96 for the intended room programs and 0.72 for exact
hidden geometry. It is suitable as a conditional procedural Three.js authority:
the major volumes, material families and identity systems are visible, while
exact dimensions, the rear of each room and the relationship between the four
panels remain inferred.

## Overall form and silhouette

Both rooms occupy broad, low, rounded-rectangular pressure volumes. The workshop
is bilaterally organized around an open vehicle/service floor and circular lift.
The sanctuary is asymmetric and organic, organized around shallow water basins,
curved lounge islands and planted perimeter architecture. Neither should be
modeled as a collection of isolated boxes on an empty plane: the reference's
identity comes from continuous wall, ceiling, floor and furnishing systems.

## Macro, meso and micro hierarchy

### Fabrication garage

- Macro: pressure shell, open service floor, perimeter engineering wall,
  overhead gantry/rail system, vehicle-scale access opening.
- Meso: rotary service lift, continuous curved workbench, tool/storage bays,
  robotic arms, suspended maintenance ring, diagnostic hologram station,
  floor service channels.
- Micro: drawer and cabinet seams, warm task-light strips, cyan diagnostic
  accents, articulated joints, tool silhouettes, clamp pads and cable runs.

### Creature sanctuary

- Macro: pressure shell, planted terrain floor, shallow water system, curved
  residence/lounging architecture, open social/foraging area.
- Meso: linked bathing pools, low waterfalls/rills, upholstered nest islands,
  privacy arches, planted retaining edges, overhead garden apertures.
- Micro: cushion seams, stones, low ground cover, shrubs, trailing plants,
  water-edge lights and small habitat shelves.

## Spatial relationships

- `<engineering wall, wraps, service floor>` with continuous flush/overlap
  contact rather than floating cabinets.
- `<overhead gantry, spans, rotary lift>` with socketed supports embedded in the
  pressure ceiling.
- `<robot arms, attach-to, workbench and ceiling rails>` through visible pivot
  joints.
- `<water basins, embed-in, sanctuary terrain>` with raised planted banks and
  rounded coping.
- `<residence arches, grow-from, planted perimeter>` with embedded bases.
- `<soft nest islands, sit-on, dry terrain>` without intersecting water paths.

## Materials and finish

- Workshop structure: dark metallic/anodized shell, metalness 0.65–0.9,
  roughness 0.24–0.42, broken by bronze trim and warm task lighting.
- Workshop floor: dark satin composite/metal, roughness 0.28–0.5, with distinct
  service-channel and rotary-lift geometry rather than painted lines alone.
- Sanctuary terrain: dark warm stone/composite, metalness 0–0.12, roughness
  0.62–0.88.
- Sanctuary upholstery: green/neutral textile, metalness 0, roughness 0.78–0.96,
  visibly thicker and softer than the current pads.
- Water: transparent cyan-green volume with bounded low roughness, not a flat
  emissive plate.
- Shared glass: low-tint transparent pressure glazing with dark structural
  mullions and restrained reflections.

## Identity-defining features

1. Workshop perimeter reads as one dense continuous engineering system.
2. A circular vehicle/engine service lift anchors the garage floor.
3. Overhead maintenance rings and articulated manipulators create vertical
   machinery density.
4. Sanctuary water forms a linked inhabited landscape rather than one bowl.
5. Curved privacy arches and soft nest islands support multiple creature sizes.
6. Plants occupy floor, retaining edges and upper structure in several height
   bands.
7. Warm practical lights and small cyan diagnostics provide localized hierarchy;
   broad white hotspots are not part of the target.

## Uncertainty and limits

Exact dimensions and hidden rear geometry are undetermined. The lower-right
cutaway is inspirational rather than authoritative for the already-approved
PS5-controller ship envelope; it must not introduce a different outer ship.
Creatures are intentionally excluded from this phase. The current six-storey
program, Great Tree protected volume, garage/creature floor allocation and
existing Haven shell remain fixed constraints.

## First implementation slice

Replace the highest-impact empty-plane cues without changing the pressure-room
envelopes: build a continuous workshop perimeter bench/tool-wall system and a
continuous sanctuary terrain-water-residence system. Review from the existing
inside-room cameras before spending triangles on micro fasteners or exterior
work.
