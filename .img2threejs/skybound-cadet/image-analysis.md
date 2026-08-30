# Cadet Toy Glider — image analysis

Reference: `.img2threejs/skybound-cadet/cadet-toy-glider-isolated-v1.png`,
derived as an isolated reconstruction view from the approved Academy evolution
frame. The full scene remains the higher-level art-direction source.

## Suitability

Conditional pass for a stylized real-time reconstruction. The isolated edit has
a clear three-quarter silhouette and readable major materials. The underside,
exact rear structure, and precise cross-sections remain hidden. The
implementation therefore targets an
original, recognizably related low-poly toy glider rather than an exact mesh.

## Layered observations

- Identification: a compact stylized toy aircraft, hard-surface object domain,
  bilaterally symmetric, intended as a playable and destructible game object.
- Overall form: elongated rounded fuselage, broad low-mounted wings, compact
  horizontal tailplanes, one vertical stabilizer, rounded canopy, and a small
  forward sling hook. The visible footprint is wider than it is long.
- Macro hierarchy: fuselage root; left and right wing pivots; tail assembly;
  canopy; nose/hook assembly; rear boost socket.
- Meso hierarchy: wingtip caps, gold leading-edge trim, cyan fuselage stripe,
  horizontal stabilizers, vertical fin, and rear nozzle.
- Spatial relationships: wings overlap the fuselage at their roots; tailplanes
  embed into the rear fuselage; fin overlaps the upper rear fuselage; canopy is
  surface-mounted above the forward fuselage; hook sockets into the nose.
- Materials: warm-white semi-gloss painted/plastic shell; saturated cyan accent
  panels; dark navy low-roughness canopy; warm gold metallic trim; dark rear
  nozzle. Lighting in the reference is bright and directional, so highlights
  are not treated as albedo.
- Identity features: intentionally toy-like proportions, large rounded wings,
  compact canopy, cyan wingtip/fuselage accents, gold trim, and a visible sling
  hook. These must remain readable from a chase camera.
- Unknowns: underside geometry, exact rear nozzle count, real thickness fields,
  and hidden attachment seams. These are inferred symmetrically and kept simple.

## Action and destruction intent

The root owns flight transforms. Both wings, both tailplanes, the fin, canopy,
and nose/hook are named detachable destruction groups. A compound fuselage and
wing collider is used during flight. A crash detaches at least two large parts,
adds independent linear/angular velocity, and lets gravity pull every fragment
into the world. No mesh is an inert monolith.
