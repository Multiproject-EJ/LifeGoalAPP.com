# Workshop fidelity phase — image analysis and suitability

Reference: `docs/design/expedition-ship/references/fabrication-deck-panoramic-master-v1.png`

## Layered observation

- Identification: one ultra-complex hard-surface architectural interior, viewed from a standing position inside a fabrication garage. It is a bounded reconstruction target inside the established expedition ship, not a new vehicle exterior.
- Overall form: a wide rounded-rectangular pressure room with bilateral organization around a central rotary lift. A continuous bowed ceiling joins a full-width forward glass wall and dense lateral/rear service walls.
- Macro assemblies: pressure envelope, panoramic forward glazing, retractable floor/lift cassette, perimeter tool wall, compact articulated service rigs, and diagnostic workbench.
- Meso assemblies: thick glass sill and head frame, five slim mullions, ceiling light coves, radial lift tracks, cabinet/shelf bands, tool modules, manipulator bases/segments, and holographic diagnostic plane.
- Micro groups: warm reveal lights, panel seams, drawer fronts, compact parts, cyan status emitters, lift grooves, fasteners, and glass edge reflections.
- Spatial relationships: the glass is socketed between a structural sill, head frame, and side pressure cheeks; the lift is flush with the floor; service rigs attach to compact circular bases and remain outside the lift footprint; tool modules are flush with perimeter cabinetry.
- Materials: satin graphite composite, dark anodized metal, brushed bronze, warm wood/composite trim, transparent low-roughness pressure glass, and restrained cyan emissive diagnostics.
- Identity features: the room must read simultaneously as a vehicle-scale garage and a megayacht engineering studio; the forward wall is sealed transparent glass with a clear exterior vista; the central lift is the visual anchor; equipment density is continuous at the perimeter, leaving a walkable center.
- Single-view limits: the exact glass curvature, hidden rear wall, ceiling depth, and door connections are inferred. Existing checkpoint-37 room envelope and ship transform hierarchy remain the authority for hidden dimensions.

## Suitability verdict

Conditional, high-confidence for the requested front-wall and fabrication-room refinement. The reference is a scene rather than an isolated prop, but the requested bounded subsystem has a strong architectural silhouette, clear materials, explicit attachment logic, and an existing multi-angle Three.js baseline. It is unsuitable for manufacturing dimensions or literal unseen geometry; those remain documented approximations.

## Quality contract delta

This fresh phase succeeds only when:

1. the fabrication deck has one continuous, slightly bowed, full-width forward pressure-glass surface;
2. the glass is visibly sealed into a thick sill/head frame with sparse slim mullions, not an open doorway or tiled box wall;
3. a named interior POV stands inside the room and looks outward through the glass;
4. the existing fabrication overview still reads as a garage with lift, service rigs, and dense tool wall;
5. the glass, frame, and POV remain coherent across meaningful yaw/orbit views;
6. the established ship envelope, retractable-deck motion, controller identity, and other interior floors remain intact;
7. high quality remains within 72,000 triangles and 160 meshes.

Blocking failures: opaque or missing glass, camera outside the pressure room, open-bay reading, frame bars crossing the primary view, room identity lost behind reflections, or budget regression.
