# Expedition Ship macro-transform image analysis

Primary transform reference: `docs/design/expedition-ship/expedition-ship-three-stage-transformation-candidate-v1.png`

Supporting authority:

- `references/01-docked-upright-controller-shell.jpg` — docked/service silhouette
- `references/02-compact-garden-shell.jpg` — compact habitat silhouette and garden aperture
- `references/03-primary-exterior-cutaway.jpg` — office-building scale and occupied deck adjacency
- `references/04-deck-adjacency-pov-sheet.jpg` — interior program and camera intent
- `references/05-central-atrium-sky-terrace.jpg` — atrium/Great Tree/Sky Terrace relationship

## 1. Identification and classification

The subject is a transformable inhabited expedition spacecraft with a game-controller-derived bilateral hull. Primary domain is `object`; observed form language is hard-surface mechanical plus protected architectural atrium. Confidence is 0.93 for the frontal macro hierarchy and 0.58 for hidden rear/top/belly geometry.

## 2. Overall form and silhouette

The stable envelope is a broad bilateral controller volume roughly 1.6–1.9 times wider than its compact height, comparable to a medium/large office building rather than a city or small shuttle. Two thick lateral handle/wing shells wrap a recessed central spine. A protected central garden opening remains visible in habitat and expedition poses. The docked pose rotates the lateral assemblies upward around shoulder pivots and extends a landing/service keel. The expedition pose spreads them to a high V; the compact flight pose lowers and closes them into a shallow aerodynamic arch.

The primary sheet establishes three distinct silhouettes but is perspective concept art, not orthographic measurement. The model must therefore preserve proportions across poses without tracing image-space distortion.

## 3. Macro, meso and micro decomposition

### Macro assemblies

1. center spine and bridge crown;
2. protected garden atrium and Great Tree core;
3. left fabrication/garage wing;
4. right habitat/creature wing;
5. left and right handle-engine housings;
6. landing/service keel and dock interface;
7. transform pivot/synchronization rig.

### Meso assemblies

- outer white shell panels, charcoal structural frames and underside armor;
- stacked occupied deck cassettes inside both wings;
- bridge visor and blue observation/transit beam;
- garden canopy shutter/glass shield;
- twin shoulder power towers;
- garage belly door and fabrication floor;
- wing-root hinge collars, telescoping lift rails and locking clamps;
- left/right transit bridge joints;
- lower thruster/landing pads and rear propulsion block;
- Sky Terrace lift and observation ring around the Great Tree.

### Micro feature groups deferred beyond macro blockout

- panel seams, access hatches and fastener rows;
- blue navigation lamps and warm occupied-window grids;
- shell bevels, black gasket lines and heat vents;
- maintenance rails, garage doors and service markings;
- garden irrigation, small habitat lights and creature circulation paths.

## 4. Spatial relationships and transform logic

- `<center-spine, contains, garden-atrium>` with a protected fixed socket; the Great Tree never rotates through another occupied volume.
- `<left-wing, hinges-from, left-shoulder-collar>` and `<right-wing, hinges-from, right-shoulder-collar>` with mirrored but independently named pivots.
- `<occupied-deck-cassettes, embedded-in, wing-frames>`; they travel with the wing and never shear independently during the macro transform.
- `<outer-shell-panels, attached-to, service-hinges>`; service opening is secondary to whole-wing transformation.
- `<landing-keel, telescopes-from, center-spine>` and remains beneath the fixed atrium.
- `<power-towers, telescope-from, shoulder-housings>` with clearance from the folding wings.
- `<garden-shield, closes-over, atrium-opening>` before the high-speed pose completes.
- `<garage-belly, below, garden-atrium>` with a forward access door that does not intersect the keel.

The docked-to-expedition-to-flight animation must be a single bounded timeline with no replacement meshes. Macro stages use named rotations/translations; room-scale access animations happen only after the hull pose settles.

## 5. Materials and surface

- exterior shell: warm white painted composite, metalness about 0.05, roughness 0.28–0.42, real bevel highlight;
- structural frame/underside: charcoal coated metal, metalness 0.55–0.75, roughness 0.3–0.5;
- window/atrium glazing: blue-grey transparent dielectric with restrained transmission and clearcoat;
- occupied interiors: warm amber emissive windows backed by dark room cavities;
- navigation/power lighting: saturated cool blue emissive strips and circular lamps;
- garden: bark, leaf, moss, water and stone, all fixed inside the atrium socket;
- mechanical joints: dark brushed metal with brighter hinge rims and cavity-darkened seams.

The concept images contain baked cinematic lighting, so they are not safe direct albedo projection evidence for independently moving panels.

## 6. Color and finish

The stable exterior palette is high-value warm white shell, very low-value charcoal frame, low-saturation blue-grey glazing, saturated electric-blue technical lights, and warm amber occupied interiors. The protected garden supplies natural brown/green contrast. The intended finish is premium architectural vehicle hardware: broad satin shell planes, glossy glazing, and darker semi-gloss mechanical recesses.

## 7. Identity-defining features

1. unmistakable controller-derived bilateral shell without literal toy buttons;
2. protected central garden/Great Tree visible through the front atrium;
3. stacked inhabited office/habitat decks at believable human scale;
4. twin shoulder/handle engine housings with blue power cores;
5. three truthful macro poses produced by the same pivots;
6. central landing/service keel under the atrium;
7. warm domestic interiors inside a capable expedition craft;
8. entry, garden, Sky Terrace, transform, travel and approach camera anchors.

## 8. Uncertainty and limits

- Rear propulsion geometry, top armor and belly plan are hidden or weakly shown and remain inferred.
- The three-stage sheet is a generated design exploration, not a consistent orthographic turnaround; exact hinge angles and panel clearances must be solved in 3D.
- The docked reference does not prove how occupied floors reorient under gravity. The first rig keeps deck cassettes fixed to the center spine while protective wing shells pivot around them; later evidence may revise this.
- High-speed aerodynamic sealing is directionally approved by the user but still lacks front/side/top/rear authority.
- Interior rooms are not part of the first macro pass. Only their stable volumes, access corridors and camera sockets are reserved.

The first implementation target is therefore a stylized, animation-ready macro blockout judged on silhouette, coherent transform, clearance and scale—not final surface likeness.
