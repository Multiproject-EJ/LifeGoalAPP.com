# Cactus Canyon — source image analysis

Reference: `docs/visual-references/island-013-cactus-canyon/013-source.png`

## 1. Identification and classification

The target is a complete stylized architectural environment: a floating
frontier railway settlement on a red-rock mesa. Primary domain: `object`.
Form language: architectural, hard-surface, mechanical and geological with
sparse botanical modules. Structure kind: compound scene hierarchy with many
repeated rail, timber, rock and cactus systems. Intended use: interactive
real-time browser world with animated scenery. Confidence: 0.99.

## 2. Overall form and silhouette

The main terrain is an asymmetric, roughly oval mesa with a broad upper shelf
and a fractured vertical underside. A concentric railway establishes two dark
elliptical bands around the pale town clearing. The central civic tower is the
dominant vertical mass; a rear-right windmill is the second-tallest thin
silhouette; a rear-left water tower and front-right sheriff office create
distinct secondary peaks. Tall distant buttes repeat vertically behind the
island at decreasing scale and saturation.

The visible view is a high front three-quarter perspective close to the game's
approved overview. Exact perspective is not canonical; the live phone camera
and 36-tile board determine implementation framing.

## 3. Macro → meso → micro decomposition

Macro assemblies:

1. fractured floating mesa and pale upper ground shelf;
2. concentric double railway, tunnel and bridge/edge supports;
3. central Cactus Crown Union Station/bell-tower complex;
4. four satellite landmark sites: waterworks, ranch windmill, signal yard and
   sheriff/archive;
5. locomotive ambience system;
6. near/mid/far canyon buttes and sunset sky;
7. sparse cactus/fence/frontier-prop dressing.

Meso systems:

- stepped sandstone ledges and vertical strata bands;
- paired steel rails, repeated sleepers, fasteners and trestle supports;
- locomotive boiler, cab, tender, wheels, rods, chimney and steam emitters;
- frontier timber frames, gabled roofs, porches, stairs and warm windows;
- windmill tower, hub, radial blades and ranch workshop;
- water tank, conical roof, trestle legs and pipe/depot service platform;
- sheriff porch/sign roofline, map room and records-safe accent;
- signal/corral ring, switching lever, signal mast and fence;
- repeated saguaro/barrel cacti, fence posts, crates and small sheds.

Micro feature groups:

- sandstone strata grooves, broken-edge chips and cavity-darkened seams;
- timber plank seams, cross-bracing, worn edges and iron fasteners;
- rail sleepers, spikes, metal edge highlights and soot/dust stains;
- locomotive wheel rims, connecting rods, brass bands, amber cab windows and
  black chimney soot;
- window mullions, roof shingles, bells, flags, signs as non-text silhouettes;
- cactus arm joints, ribs/spines and varied green/value families;
- steam wisps, dust puffs and subtle heat-haze layers.

## 4. Spatial relationships

- The town ground sits flush on the mesa shelf; the fractured cliff shell
  continues below and around its edge.
- The railway surrounds the canonical route context but remains visually and
  geometrically separate from live tiles.
- The locomotive is constrained to the outer rail spline; wheels and rods are
  attached to the engine chassis, and steam emitters socket into the chimney.
- The Union Station embeds into the central civic foundation while remaining
  below/inside the live route's protected visual system.
- Water tower legs embed into a timber service deck; the tank overlaps the
  trestle and supports a conical roof.
- The windmill tower embeds beside/behind its ranch workshop; the rotor hinges
  on a hub socket and rotates in its own local plane.
- Satellite buildings embed into authored plot terrain and face the central
  route; cacti/fences remain outside the protected corridor.
- Distant buttes sit behind the playable island in multiple depth layers and do
  not rotate with an orbiting camera as a billboarded foreground ring.

## 5. Materials and surface response

- Sandstone/cliff: dielectric, matte roughness approximately 0.72–0.9, low
  frequency terracotta/ochre variation, meso strata relief, cavity AO and edge
  chips.
- Ground/sand: dielectric, roughness 0.78–0.92, pale orange/cream albedo with
  low-contrast mottling; no high-contrast fake path inside the route.
- Timber: dielectric, roughness 0.62–0.82, dark brown base, longitudinal grain,
  lighter edge wear and dark plank seams.
- Rail/iron: metalness 0.75–1, roughness 0.28–0.48, dark grey albedo with narrow
  sun-facing highlights and soot/rust local overrides.
- Brass/copper: metalness 0.75–0.95, roughness 0.2–0.4, used sparingly on train,
  bell and machinery accents.
- Window glass: opaque emissive/satin approximation for mobile, amber and
  occasional muted blue accents; no expensive full transmission required.
- Cacti: dielectric, roughness 0.58–0.78, varied sage/olive greens with rib
  relief and restrained highlight.

## 6. Colour and finish

Large masses progress from pale cream/orange ground through saturated
terracotta cliff bands to lower-value dark timber/rail rings. The sky and far
buttes are peach/pink and lower contrast through haze. Metal and amber windows
provide narrow dark/bright accents. The implementation must preserve warm
value separation rather than collapsing all surfaces to one beige.

## 7. Identity-defining features

1. fractured floating red-rock mesa with visible underside;
2. unmistakable concentric railway encircling the settlement;
3. animated blue/black steam locomotive with tender and wheel/rod language;
4. dominant central stepped frontier bell-tower/station silhouette;
5. tall rear-right windmill above a gabled ranch;
6. rear-left timber water tower;
7. front-right sheriff/archive building and broad low signal/corral site;
8. sparse saguaro cactus field and timber fences;
9. layered Monument Valley buttes in warm sunset haze;
10. dense miniature-town storytelling without route obstruction.

## 8. Uncertainty and single-image limits

The image is a full scene with baked UI and only one high front three-quarter
view. The rear facades, mesa back edge, underside topology, railway tunnel
interior, exact landmark floorplans and all L1/L2 construction states are
hidden. The apparent railway and tile counts are illustrative, not measurable.
Rear construction will repeat visible gabled timber/stone language at
confidence 0.55–0.7. The blockout is a polished stylized procedural
reconstruction for phone scale, not exact mesh extraction or manufactured
dimensions.

## Initial suitability verdict

Conditional pass. The reference is a scene rather than an isolated object, but
the environment has a strong silhouette, separable macro assemblies, readable
materials and enough evidence for a source-faithful procedural world. Exact
hidden geometry and baked UI are explicitly excluded.
