# Expedition Ship controller rebuild Gauntlet

Status: **active vertical slice**
Date: 2026-08-20
Branch/worktree: `codex/3d-egg-hatch-pilot` in the `e606` worktree

## Mission

Rebuild the procedural Expedition Ship so it reads as the same transforming,
inhabited controller-shaped vehicle in Haven/walker, hover, fast-space and
Hyperseed configurations. The first proof is macro geometry and motion, not a
detailed Zen-garden dressing pass.

## Sources of truth

1. `habitgame-expedition-ship-controller-shape-lock-v4.png` — exterior
   planform and controller identity.
2. `habitgame-expedition-ship-tri-drive-mobility-v5.png` — central keel drive,
   two grip drives, powered handle-front legs and rear stabilizer stance.
3. `habitgame-expedition-ship-retractable-shield-sequence-v6.png` — permanent
   pressure window, four attached armor leaves and conformal field sequence.
4. `EXPEDITION_SHIP_MODE_ARCHITECTURE_V1.md` — mode and engineering contract.
5. `.img2threejs/expedition-ship/object-sculpt-spec.json` and `state.json` —
   staged reconstruction state and review evidence.

Generated images establish design relationships, not hidden orthographic
measurements. Unseen rear, underside and storage clearances remain provisional.

## Non-negotiables

- Preserve an unmistakable PlayStation 5 controller-derived outer planform:
  broad bridge, two shoulders, pinched waist and two long grip nacelles.
- The Great Tree, root-water garden and occupied pressure volume are immutable.
  No travel pose may scale, rotate through, replace or teleport this volume.
- Three primary drives only at the macro level: one central keel drive and one
  gimballed drive in each grip.
- Walker stance uses two powered grip/front-leg assemblies plus two lighter
  rear stabilizer legs. The handles are functional chassis, not decoration.
- Protection is layered and attached: fixed transparent pressure window, four
  retractable physical armor leaves, seam protection and a conformal field.
- One persistent Three.js scene graph owns every configuration.
- No Island Run gameplay state is read or mutated by the model or lab.

## Scope and exclusions

### Slice 1 — protected core and macro controller body

- Freeze and expose the sanctuary clearance volume.
- Rebuild the centre bridge, shoulders and long grip nacelles.
- Re-parent the powered front legs to the grip chassis and retain two rear
  stabilizers.
- Replace the distributed belly-lift concept with the three-drive hierarchy.
- Replace the spherical garden bubble with attached pressure-window, armor-leaf
  and conformal-field groups.

### Deferred

- fine-grained room blueprints, creatures, and later-pass furniture/material detailing
  beyond the authorized inhabited-interior slice;
- ocean hydrofoils and exact hydrodynamic physics;
- final atmosphere lifting surfaces, radiators and thermal simulation;
- production materials, weathering, decals and audio;
- exact room-by-room 150 m deck blueprint.

## Slice-1 acceptance evidence

- TypeScript/build and Expedition Ship contract tests pass.
- Runtime hierarchy includes `SANCTUARY_CLEARANCE_VOLUME`, two grip nacelles,
  two powered handle-front legs, two rear stabilizer legs,
  `CENTRAL_KEEL_DRIVE`, three drive sockets, `PERMANENT_PRESSURE_WINDOW`, four
  armor leaves and conformal-field emitters.
- Haven/walker and fast-space screenshots from front and at least two orbit
  angles show real 3D volume without silhouette collapse.
- The fixed inhabited core keeps identical local scale and orientation across
  pose updates.
- The next img2threejs review records one honest action and names remaining
  mismatches; no `continue` unless all critical blockout features meet their
  thresholds.

## Authority and safety

Work is limited to the existing Expedition Ship docs, reconstruction artifacts,
procedural model, dev lab and its contract test. Do not merge, deploy, publish,
delete references, rewrite gameplay architecture or add a second state owner.

## Rollback and recovery

- Keep changes confined to the unmerged `codex/3d-egg-hatch-pilot` worktree.
- Preserve prior renders and review history; new evidence gets new filenames.
- A failed slice is revised or reverted as one bounded model/spec change. Do
  not polish materials around a failed silhouette or clearance gate.

## Stop conditions

Stop and ask Eivind if a future choice changes the sanctuary volume, abandons
the controller planform, requires paid external generation, or needs exact
hidden geometry that the selected views do not reveal. Otherwise continue
through bounded visual corrections until the blockout gate passes or the
img2threejs correction ceiling requests input.

## Worker handoff

Start with `python3 forge/next.py` against the expedition state, read the latest
review, change one macro system, run the focused contract test/build, capture
fixed and orbit evidence, then record exactly one next action. Never infer
completion from code or a single front render.

## Checkpoint 1 — macro systems installed, silhouette still gated

Completed on 2026-08-20 in the unmerged `codex/3d-egg-hatch-pilot`
worktree:

- protected sanctuary clearance and permanent pressure window;
- controller bridge and explicit port/starboard grip-nacelle masses;
- two powered grip/front-leg assemblies and two lighter rear stabilizers;
- central keel drive plus two gimballed grip drives;
- four retractable window-armor leaves and conformal shield emitters/field;
- Haven, Walker and Fast Space pose labels in the development lab;
- runtime and contract assertions for sanctuary invariance and the new system
  hierarchy.

Verification at this checkpoint:

- TypeScript build passed;
- Island Run suite passed with 1815 tests and zero failures;
- strict sculpt-spec validation passed;
- front and two orbit captures showed non-degenerate 3D volume;
- deterministic silhouette diagnostics reported IoU 0.8689, but the background
  isolation warning makes that number non-authoritative;
- direct reference/render vision review scored the blockout 0.55 and recorded
  `refine-code`.

The remaining blockout correction is deliberately narrow: make each white grip
shell, gimballed drive and powered front leg read as one continuous long tapered
controller-handle chassis; flatten the central pod dominance; separate the rear
stabilizer silhouette; and fully hide the garden behind the armor leaves in Fast
Space. Do not add Zen-garden detail before this shape gate passes.

The img2threejs state stopped at the configured blockout correction ceiling
(`3/3`). Resume only by starting an explicitly authorized new bounded blockout
cycle or by revising that ceiling; do not silently bypass the stop.

## Checkpoint 2 authorization — controller-handle silhouette cycle

Eivind explicitly authorized continuation on 2026-08-20. The blockout
per-pass ceiling is extended from three to six while the total correction
ceiling remains six. This creates one final bounded set of at most three
blockout corrections; it is not an open-ended bypass.

This cycle may change only the grip/front-leg continuity, controller bridge
proportions, rear-stabilizer readability and Fast Space closure identified in
Checkpoint 1. The sanctuary volume, selected mobility architecture and tri-drive
ownership remain frozen.

## Checkpoint 2 progress — inhabited arches and mechanical legs

The first candidate in the authorized continuation cycle now:

- hollows the white grip shells into inhabited controller-handle arches so the
  occupied deck bands remain visible through the structural rails;
- narrows the powered front-leg cores, opens their stance and separates dark
  load structure, white armor plates and exposed knee power rings;
- reduces the Great Tree presentation scale without changing the immutable
  sanctuary clearance volume;
- enlarges the permanent pressure window while preserving its fixed hierarchy;
- replaces the oversized white Fast Space door with a smaller dark four-leaf
  shutter, seam backstop and visible blue lock state.

Verification for this candidate:

- TypeScript project build passed;
- the complete Island Run suite passed with 1815 tests and zero failures;
- front and ±30° Walker captures remain non-degenerate, with orbit silhouette
  area ratios of 1.0165 and 0.9941;
- a corrected same-view comparison now uses the isolated walker panel from the
  four-view shape-lock sheet instead of comparing one render to the whole sheet;
- deterministic silhouette IoU improved from 0.7460 to 0.7723 and bilateral
  silhouette error improved from 0.2186 to 0.1696.

The blockout remains gated because 0.7723 is below the required 0.85 Tier-1
threshold. The workflow therefore stays at `tier1-diagnostics`; no Tier-2
likeness review, completion claim or later material/detail pass is authorized.
The next correction should concentrate on matching the reference's taller
inhabited centre mass, slimmer outer shoulder rails and more clearly articulated
rear stabilizers rather than adding garden decoration.

## Checkpoint 3 authorization — inhabited interior slice

The user explicitly moved the ship interior into the current reconstruction scope on
2026-08-21. The first interior slice must make the central sanctuary read as a real
inhabited civic core: four room levels, balconies, cross-ship circulation, panorama
lifts, warm wayfinding light, and a garden path. The exact room blueprint remains
provisional. `SANCTUARY_CLEARANCE_VOLUME` stays immutable, and no interior detail may
invade or resize that protected pressure volume.

### Checkpoint 3 result — interior present, macro likeness still blocked

The bounded blockout cycle now includes a dedicated interior inspection camera and
an inhabited four-level core: room volumes, warm picture windows, balcony glazing,
panorama lift shafts, cross-ship decks, wayfinding lights, lounge pods, and a garden
path. The immutable sanctuary dimensions and hierarchy were preserved. High quality
remains within the model contract at 158 meshes and 65,492 geometry triangles.

The full TypeScript build and all 1,815 Island Run tests pass. The exterior remains
below the reference gate: final silhouette IoU is 0.7726 against the required 0.85,
and the six-of-six bounded correction ceiling is reached. The next authorized work
must be treated as a new macro-geometry cycle focused on a deeper curved central
pressure habitat, continuous swept shoulder/leg load arches, and layered mechanical
leg construction—not another detail-only extension of this blockout.

## Checkpoint 4 authorization — macro-geometry recovery cycle

Eivind explicitly authorized continuation on 2026-08-21 after the six-of-six stop.
The blockout and total correction ceilings are extended from six to nine, creating
one bounded recovery cycle of at most three corrections. This authorization is not
an open-ended bypass.

The cycle is restricted to the three root mismatches established by Checkpoint 3:

- replace the shallow central grille with a deep, curved pressure-habitat envelope
  while preserving the inhabited interior and immutable sanctuary clearance;
- rebuild the white controller shoulders and deployed front legs as continuous
  swept load arches rather than separate panels and sticks;
- add layered joint, hydraulic and armor depth to the legs through batched geometry
  while remaining inside the existing mobile mesh and triangle budgets.

Fine furniture, creatures, surface weathering and material polish remain deferred
until the macro silhouette improves materially against the fixed reference view.

### Checkpoint 4 result — stronger habitat and sanctuary, likeness still blocked

The three authorized recovery corrections are complete. The shallow oval centre was
replaced by a 4.92 × 2.94 rounded-rectangular pressure frame with 2.34 depth and a
4.4 × 2.5 curved pressure window. White crescent crowns now overlap the outer shells,
and an inverted-face-winding defect on all mirrored left-side custom geometry was
repaired. The powered legs now open from the hips (`side × 0.34`) and counter-rotate
at the knees (`side × -0.08`) to form a more deliberate load-bearing stance.

The inside was also corrected without changing `SANCTUARY_CLEARANCE_VOLUME`:
occupied deck slabs were narrowed from 1.28 to 0.84 and moved to `x = ±1.48`, with
their windows, rails and structural piers moved to the perimeter. The Great Tree is
therefore visible through a clear central civic-garden aisle instead of behind a
full-width grille.

The final model remains inside the mobile contract:

- Low: 158 meshes, 36,832 geometry triangles, 25 materials.
- High: 158 meshes, 66,128 geometry triangles, 25 materials.
- TypeScript `--noEmit`: pass.
- Island Run service suite: 1,815 passed, 0 failed.
- Multi-angle volume: non-degenerate at both ±30° orbits.

This is an improvement, not acceptance. Agent visual fidelity is estimated at 0.56,
and final Tier-1 silhouette IoU is 0.7718 against the required 0.85. The nine-of-nine
bounded correction ceiling is reached, so the blockout is stopped again. Any further
cycle needs explicit authorization and should concentrate on nested mechanical leg
modules, roof/tower hierarchy and batched secondary shell structure before material
polish.

## Checkpoint 5 authorization — mechanical hierarchy cycle

Eivind explicitly approved continuation on 2026-08-21 after reviewing the
nine-of-nine recovery result. The blockout and total ceilings are extended from
nine to twelve, authorizing one further bounded cycle of at most three corrections.

The corrections must remain isolated and ordered:

1. rebuild the powered front legs as nested armor, joint, hydraulic and service
   modules using the existing mesh budget through instancing or mesh replacement;
2. improve the roof and power-tower hierarchy so the top silhouette reads as an
   inhabited spacecraft rather than a flat controller bridge;
3. add secondary shoulder and hull structure that connects those systems without
   obscuring the open sanctuary or changing its immutable clearance.

Each correction requires current browser evidence and an explicit review action.
Material weathering and cosmetic micro-detail remain deferred until the three
mechanical hierarchy corrections are reviewed.

### Checkpoint 5 result — connected inhabited controller ship, blockout still gated

All three authorized mechanical-hierarchy corrections are complete and reviewed.
The powered front legs now use open tapered upper armor frames around the dark load
chassis, outward-set roots, solid tapered shin armor, exposed hydraulic rails and
forward service panels. The roof is deeper and stepped, while both power towers are
taller tapered inhabited structures with warm full-height observation glazing.

The final correction moved the existing occupied wing-window bands outward beneath
the white controller shoulder arches and replaced the small horizontal shell inset
with a tall connective panel. This makes the shoulders, side habitats and central
pressure frame read as one transforming structure while keeping the Great Tree and
central civic-garden aisle open. The dedicated interior view confirms that the
inhabited room levels, balconies and sanctuary remain present.

The final model remains inside the mobile contract:

- Low: 158 meshes, 37,192 geometry triangles, 25 materials.
- High: 158 meshes, 66,680 geometry triangles, 25 materials.
- TypeScript `--noEmit`: pass.
- Island Run service suite: 1,815 passed, 0 failed.
- Multi-angle volume: non-degenerate at both ±30° orbits.

This cycle materially improves semantic cohesion, but it does not satisfy the fixed
reference gate. Agent visual fidelity is estimated at 0.60, and final Tier-1
silhouette IoU is 0.7718 against the required 0.85. The remaining mismatch is
systemic: the reference has thicker powered and rear leg masses, deeper nested load
paths, less repetitive occupied decks, finer shell segmentation and cinematic
material/lighting depth. The twelve-of-twelve bounded correction ceiling is reached,
so the Gauntlet has stopped the blockout again. A future cycle requires explicit
authorization and should address those macro systems before cosmetic weathering.

## Checkpoint 6 authorization — heavy transformer architecture cycle

Eivind explicitly authorized continued work toward a 10/10 result on 2026-08-21
after reviewing the twelve-of-twelve result. The blockout and total correction
ceilings are extended from twelve to fifteen, creating one new bounded cycle of
at most three corrections. This is a checkpoint toward the stated goal, not a
claim that three corrections will necessarily reach 10/10.

The corrections are ordered by remaining visual leverage:

1. increase powered-front and rear-leg mass, articulation and nested load-path
   depth while preserving the three-engine and walking/hover architecture;
2. replace the repetitive side-gallery bars with fewer, deeper and more varied
   inhabited decks integrated into the white controller shoulders;
3. deepen exterior hull segmentation and connective roof/shoulder mechanics so
   the ship reads as a large transformable spacecraft rather than a clean toy.

The PS5-controller planform, open sanctuary, Great Tree, immutable
`SANCTUARY_CLEARANCE_VOLUME`, transform modes and mobile geometry budgets remain
non-negotiable. Material weathering is deferred until the macro blockout either
passes or this bounded cycle stops.

### Checkpoint 6 result — heavier architecture, systemic fidelity gap remains

The three authorized corrections are complete. The powered front and rear leg
chains now have larger hips, upper members, knees, shins, armor and feet; the
rear roots moved outward to `x = ±2.02` so all four legs contribute to the
load-bearing silhouette. The side habitat now uses three differently offset,
canted and scaled occupied decks instead of four identical rows, with larger
windows and a deeper facade.

The final correction changed the translucent roof slab into a deeper dark
armored service spine, strengthened the top arch, visor and shoulder overlap,
enlarged the vertical shoulder seams, and rebuilt the tower cores as broader
glass lantern volumes around warm observation lights. The interior inspection
still shows the Great Tree, occupied levels and open sanctuary without changing
`SANCTUARY_CLEARANCE_VOLUME`.

Verification remains clean and inside the mobile contract:

- Low: 158 meshes, 37,192 geometry triangles, 25 materials.
- High: 158 meshes, 66,680 geometry triangles, 25 materials.
- TypeScript `--noEmit`: pass.
- Island Run service suite: 1,815 passed, 0 failed.
- Multi-angle volume: non-degenerate at both ±30° orbits.

The cycle improved the ship from roughly 0.60 to 0.63 agent-estimated visual
fidelity, but it is not close to the requested 10/10. Final Tier-1 silhouette
IoU is 0.7664 against 0.85; this number remains advisory because the source is a
cinematic reference, and its small decline was not chased at the expense of the
visually stronger roof. The remaining gap is systemic rather than positional:
the reference uses far denser interlocked trusses and load paths, open joint
frames, shell bevels and panel breaks, irregular inhabited architecture, and
cinematic material response. The fifteen-of-fifteen ceiling is reached and the
Gauntlet has stopped. The next authorized cycle should establish a reusable
batched panel/truss/bevel language across the whole ship before material polish.

## Checkpoint 7 authorization — systemic construction-language cycle

Eivind explicitly authorized continued work toward the 10/10 target on 2026-08-21
after reviewing the fifteen-of-fifteen result. The blockout and total correction
ceilings are extended from fifteen to eighteen, authorizing one further bounded
cycle of at most three corrections.

The corrections are isolated and ordered by visual leverage:

1. establish a reusable, batched truss and panel-break language across the roof,
   shoulders and outer hull so the controller shell reads as interlocked armor;
2. rebuild the rear stabilizer legs with visibly open mechanical load paths while
   preserving their walking, hover and jump propulsion roles;
3. improve shell, frame, glazing and emissive material response so the existing
   depth reads under cinematic lighting without hiding unresolved geometry.

The PS5-controller planform, open sanctuary and Great Tree, immutable
`SANCTUARY_CLEARANCE_VOLUME`, transform modes, and mobile geometry budgets remain
non-negotiable. Each correction requires current browser evidence, multi-angle
review and exactly one recorded refinement action.

### Checkpoint 7 result — stronger construction and look-dev, still below target

All three authorized corrections are complete and reviewed. The former single
shoulder inset is now a batched family of dark structural members attached to each
transforming shell, and the existing atrium structure batch now carries additional
outer braces and roof panel breaks without increasing mesh count. The rear
stabilizers use tapered open chassis and armor frames, exposing their load paths in
the fixed front view while preserving the powered front-grip legs and hover feet.

The final correction moved the principal shell, inset, frame and glass families to
conservative physical-material responses and retuned the evidence lab around a
warmer key, restrained fill, stronger blue rim and softer dark environment. The
sanctuary light is stronger, and the final interior capture still shows the Great
Tree, occupied decks and open civic volume. No unsupported albedo, roughness,
normal or weathering maps were invented from the cinematic composite reference.

Verification remains clean and inside the mobile contract:

- Low: 158 meshes, 37,352 geometry triangles, 25 materials.
- High: 158 meshes, 66,456 geometry triangles, 25 materials.
- TypeScript `--noEmit`: pass.
- Island Run service suite: 1,815 passed, 0 failed.
- Multi-angle volume: non-degenerate at both ±30° orbits.

This cycle improves agent-estimated visual fidelity from roughly 0.63 to 0.66, but
it does not meet the requested 10/10. Final Tier-1 silhouette IoU is 0.7576 against
0.85 and remains advisory for this cinematic reconstruction. The dominant gap is
still geometric: the target has substantially more nested actuators, panel seams,
irregular inhabited modules and open truss depth. The eighteen-of-eighteen ceiling
is reached and the Gauntlet has stopped. A future authorized cycle should add those
systems as batched nested geometry before attempting evidence-backed surface maps.

## Checkpoint 8 authorization — nested machinery and inhabited irregularity

Eivind explicitly authorized continuation on 2026-08-21 after reviewing the
eighteen-of-eighteen result. The blockout and total ceilings are extended from
eighteen to twenty-one for one further bounded cycle of three corrections:

1. add visible nested actuator rails and joint hardware to the four walker chains
   using batched geometry, without obscuring the propulsion feet;
2. break the repeated interior and side-habitat rhythm with larger observation
   rooms, varied deck spans and connective inhabited volumes;
3. deepen the shoulder-to-roof transformation chassis with layered yokes, tower
   braces and mechanical overlaps that remain attached through every pose.

The PS5-controller planform, three-drive propulsion architecture, open sanctuary,
Great Tree, immutable `SANCTUARY_CLEARANCE_VOLUME`, transform modes and mobile
budgets remain non-negotiable. Every correction requires current fixed-angle
browser evidence, deterministic diagnostics and exactly one recorded review action.

## Checkpoint 8 result — actuator chains, inhabited rhythm and roof load path

The three authorized corrections are implemented and the bounded Gauntlet has
stopped at twenty-one of twenty-one loops:

1. the two rear stabilizer chains now expose batched shin actuator rails, matching
   the already visible hydraulic hierarchy on the powered front grip legs;
2. side habitats use varied five/three/four-window rhythms, different deck spans
   and cants, while sixteen staggered interior room volumes retain the open Great
   Tree sanctuary;
3. each animated controller shell now carries four heavier shoulder-to-roof truss
   members, enlarged overlapping shoulder crowns, and the fixed power towers have
   braced, deeper bases.

The final runtime budget remains inside the mobile contract:

- Low: 158 meshes, 37,008 geometry triangles, 25 materials.
- High: 158 meshes, 66,036 geometry triangles, 25 materials.
- TypeScript `--noEmit`: pass.
- Island Run service suite: 1,815 passed, 0 failed.
- Multi-angle volume: non-degenerate at both ±30° orbits.

The final visual review is intentionally recorded as `refine-code`, not a false
acceptance. Agent-estimated fidelity is 0.68; Tier-1 silhouette IoU is 0.7223
against the 0.85 target. The dominant remaining gap is cinematic art density:
authored shell segmentation, nested mechanisms, curved inhabited architecture,
lush vegetation, and richer material response. The assembly coverage audit also
reports 24 spec-to-runtime naming/alias gaps. The corresponding geometry is often
present under a more specific runtime name, but the semantic manifest must be
reconciled before claiming the model is fully explodable/clickable by spec part.

## Checkpoint 9 authorization — reference-led macro likeness

Eivind explicitly authorized another bounded continuation on 2026-08-21 and
required the goal images to remain the authority during construction. The
blockout and total ceilings are extended from twenty-one to twenty-four for three
reference-led corrections, each reviewed against
`expedition-ship-150m-walker-living-mode-candidate-v1.png` and cross-checked
against `habitgame-expedition-ship-living-walker-multiview-v2.png` and
`habitgame-expedition-ship-engineering-master-v3.png`:

1. replace the flat roof-and-shoulder read with a layered curved atrium crown and
   shell bands that reproduce the goal image's continuous controller envelope;
2. increase the four walker chains' mechanical mass with large circular joint
   drums, paired actuator rods and armor overlaps visible from front and side;
3. deepen the central inhabited facade with curved atrium mullions, warm nested
   decks and richer sanctuary planting without closing its immutable clearance.

The PS5-controller planform, three-drive propulsion architecture, transformation
hierarchy, open Great Tree sanctuary, mode families and mobile budgets remain
non-negotiable. Cosmetic micro-detail may not displace these three macro goals.

## Checkpoint 9 result — curved crown, powered joints and inhabited atrium

All three reference-led corrections are implemented and the bounded Gauntlet has
stopped at twenty-four of twenty-four loops:

1. the former flat centre roof is now an extruded shallow barrel crown with a
   nested glazed observatory, and the controller shoulder crowns sit lower around
   it;
2. all four walker chains now carry larger hip and knee volumes, circular load
   rings, blue power nodes, paired actuators and broader leg armor;
3. the sanctuary facade now has a nine-member civic mullion grid aligned to its
   four occupied levels, plus a twelve-clump low garden understorey that preserves
   the Great Tree circulation and immutable clearance volume.

The closeout initially exposed a real mobile-budget regression. The added hip,
knee and rocket detail raised the model to 180 meshes and 74,878 High triangles.
Those details were retained but batched inside their animated joint groups, and
the circular mechanisms were retessellated conservatively. Final verification:

- Low: 158 meshes, 40,652 geometry triangles, 25 materials.
- High: 158 meshes, 71,654 geometry triangles, 25 materials.
- TypeScript `--noEmit`: pass.
- Island Run service suite: 1,815 passed, 0 failed.
- Multi-angle volume: non-degenerate at both ±30° orbits (area ratios 1.0104 and
  1.0365).

The result is an improvement, not a 10/10 claim. Agent-estimated visual fidelity
is 0.705 and Tier-1 silhouette IoU is 0.7346 against the 0.85 gate; map-stripped
blockout evidence is also absent. The goal render still has more continuous
curved glazing, segmented shoulder shells, nested walker mechanisms, irregular
balconies and cinematic PBR depth. The assembly audit still reports 24
spec-to-runtime naming/alias gaps, so strict spec-defined explodable/clickable
coverage is not claimed. A future explicitly authorized phase should treat shell
segmentation, genuinely curved balcony modules and authored material maps as a
new systemic art pass rather than extending this stopped loop.

## Checkpoint 10 authorization — systemic shell and habitat art pass

Eivind explicitly authorized continuation on 2026-08-21 after reviewing the
twenty-four-of-twenty-four result. The blockout and total correction ceilings
are extended from twenty-four to twenty-seven for one bounded three-correction
cycle, with the supplied goal renders remaining the visual authority:

1. break the broad white controller shoulders into layered armor leaves, dark
   seams and inset observation panels that follow the reference silhouette;
2. replace the flat central facade rhythm with genuinely curved inhabited
   balcony modules and wraparound warm glazing around the Great Tree;
3. deepen material and mechanical frequency with budgeted relief, nested joint
   faces and tuned shell/glass/frame response, then batch or retessellate until
   the existing mobile contracts pass.

The PS5-controller planform, three-drive propulsion, walking/hover/jump roles,
transform hierarchy, open sanctuary, immutable clearance volume, interior room
program, and tested mobile budgets remain non-negotiable. Each correction must
be captured from the live browser, compared directly with the goal images,
reviewed from multiple angles, and recorded with exactly one review action.

## Checkpoint 10 result — segmented controller shell and curved living galleries

All three authorized corrections are implemented and reviewed. The Gauntlet has
hard-stopped at twenty-seven of twenty-seven corrections:

1. each transforming shoulder crown now has a main observation slit, a smaller
   auxiliary aperture and fine batched panel seams, while the former heavy shell
   trusses were reduced to restrained armor segmentation;
2. the four inhabited levels now use real cubic-curved wraparound deck slabs,
   matching curved rails and yawed warm windows around the Great Tree rather than
   straight duplicated shelf boxes;
3. the central facade gained additional diagonal load paths, the walker shins and
   feet gained denser batched hydraulic/service detail, and the ceramic, inset
   alloy, structural metal and occupied-window materials have clearer physical
   separation.

The first budget closeout exposed 160 meshes and 74,750 High triangles. Shoulder
glazing and seams were consolidated into one instanced assembly per side, and
the curved gallery tessellation was reduced without removing its curvature.
Final verification is clean:

- Low: 158 meshes, 40,764 geometry triangles, 25 materials.
- High: 158 meshes, 71,990 geometry triangles, 25 materials.
- TypeScript project check: pass.
- Island Run service suite: 1,815 passed, 0 failed.
- Multi-angle volume: non-degenerate at both ±34° orbits (area ratios 1.0160 and
  1.0371).

The final interior evidence explicitly shows the Great Tree, garden floor,
multiple occupied room levels, balcony rails and open central circulation. This
is still an improvement rather than a 10/10 claim: agent-estimated fidelity is
0.731 and Tier-1 silhouette IoU is 0.7378 against the 0.85 gate. The dominant
remaining gaps are continuous shoulder/grip sculpting, finer nested mechanisms,
denser lived-in lighting, more sophisticated foliage and cinematic lighting.
The standalone assembly audit still reports 24 spec-to-runtime naming/alias
errors plus 17 dangling-detail warnings; the relevant model systems are often
present, but strict spec-defined explodable/clickable coverage remains unclaimed.

## Checkpoint 11 authorization — true inhabited interior volume

Eivind explicitly authorized continued work on 2026-08-21 after the honest
interior camera probes showed that the existing room boxes and balcony bands
formed a shallow exterior facade rather than a camera-traversable interior. The
stopped blockout and total correction ceilings are extended from twenty-seven to
thirty for one bounded three-correction interior-volume cycle:

1. replace the solid room-box facade with a continuous pressure-habitat volume,
   open floor plates and perimeter room frames around the protected garden;
2. establish usable circulation through the garden floor, upper balcony and
   cross-gallery paths, including named human-eye-height camera anchors;
3. tune only the architecture, glazing visibility and practical interior light
   needed for the true interior views to read, then rebalance geometry if the
   existing mobile budgets are exceeded.

The PS5-controller exterior planform, tri-drive propulsion, walker hierarchy,
retractable window armor, Great Tree, immutable
`SANCTUARY_CLEARANCE_VOLUME`, transformation modes and mobile geometry budgets
remain non-negotiable. This cycle does not authorize broad exterior polish.

Acceptance is spatial rather than cosmetic: a camera positioned on the garden
floor under the tree must see a coherent inhabited room without intersecting a
solid; a camera standing on the upper balcony must look down into the garden and
across to the opposite gallery without intersecting a solid; floors, gallery
edges, rear/side bulkheads and room openings must demonstrate real fore-aft
depth; and the fixed exterior view must remain coherent. Each correction requires
current browser evidence, contract/type verification and exactly one recorded
review action. Stop again at thirty of thirty, or earlier if satisfying the
interior requires changing a protected exterior or sanctuary invariant.

## Checkpoint 11 result — true inhabited interior volume

All three authorized corrections are implemented and reviewed. The Gauntlet has
hard-stopped again at thirty of thirty corrections. This pass replaced the
shallow room-box facade with a real pressure-habitat volume: three separated
gallery floors surround a sanctuary opening, perimeter portals expose recessed
occupied rooms, and stairs plus lift shafts establish visible circulation. The
garden, pool and Great Tree now sit within that volume rather than in front of it.

Named human-eye camera anchors now place the viewer physically under the tree,
on the upper balcony looking down, and on the balcony looking across. These views
expose the interior honestly without crossing the protected
`SANCTUARY_CLEARANCE_VOLUME`. The controller exterior, shoulder shells,
tri-drive layout and transformation hierarchy remain intact.

Final verification:

- Low: 158 meshes, 40,718 geometry triangles, 25 materials.
- High: 158 meshes, 71,054 geometry triangles, 25 materials.
- TypeScript project check: pass.
- Island Run service suite: 1,815 passed, 0 failed.
- Multi-angle exterior volume: non-degenerate at both ±34° orbits (area ratios
  1.0296 and 1.0524).

This is a structural milestone, not visual completion. The final goal-image
comparison is recorded at an honest estimated fidelity of 0.39 against the 0.85
acceptance gate. The three POVs are genuinely inside, but the coarse foliage,
boxy gallery and stair forms, sparse rooms, limited furnishings, flat material
response and weak practical lighting remain far from the cinematic reference.
The balcony-down composition is especially compromised by the low-poly canopy
and deck slab. A future authorized cycle should treat this as an art-direction
and spatial-scale overhaul: build a richer curved atrium kit, replace the canopy
with layered branch-and-leaf systems, furnish the inhabited ring, deepen water
and planting detail, then retune the interior cameras around that improved space.

## Checkpoint 12 authorization — cinematic interior art-direction pass

Eivind explicitly authorized continued work on 2026-08-21 after reviewing the
true but visually weak interior. The correction ceiling is extended from thirty
to thirty-three for one bounded three-correction pass focused on the largest
visible failures exposed by the genuine interior cameras:

1. recompose the atrium so smaller repeated room and furnishing cues create a
   grand inhabited scale, with smoother curved gallery edges and a readable
   star-canopy ceiling;
2. replace the coarse foliage masses with layered trunk, branch, leaf and
   understorey systems, and add water, garden-path and lounge detail that makes
   the habitat feel lived in;
3. retune the true camera anchors and practical light hierarchy so under-tree,
   balcony-down and balcony-across views frame the architecture instead of
   colliding visually with canopy, slabs or black bulkheads.

This cycle may refine interior geometry, materials, light placement and camera
anchors. It may not alter canonical gameplay state, the controller-derived
exterior planform, the three-drive/walker roles, the transform hierarchy,
retractable protection, or the immutable sanctuary clearance. Existing mobile
geometry budgets remain binding. Capture all three interior POVs plus fixed and
off-axis exterior views; compare directly with the atrium goal image; then stop
at thirty-three corrections or earlier if the architectural direction remains
wrong.

## Checkpoint 12 result — local polish exposed the scale error

The final side-by-side stopped this bounded cycle early at 31/33. Real curved
decks, room portals, tree branches, lounge cues, star lighting and true interior
cameras are present, but the result still reads as a compact office atrium. The
honest visual estimate is 0.38 against the 0.78 checkpoint target. More small
detail would spend the mobile budget without correcting the spatial hierarchy.

Verification remained clean: Low is 159 meshes / 40,620 triangles / 26
materials; High is 159 meshes / 71,422 triangles / 26 materials; TypeScript
passes; the Island Run suite reports 1,815 passed and 0 failed; the final 34°
exterior orbits remain non-degenerate at area ratios 1.0298 and 1.0524.

## Checkpoint 13 authorization — calibrated Haven openness and scale

Eivind redirected the next pass on 2026-08-21 after two concept extremes made
the correct middle clear. `references/11-calibrated-haven-interior-speed-authority-v1.png`
is the new scale-and-mode authority. The earlier `08`, `09`, and `10` concepts
remain useful feature exploration but are explicitly overscale and must not set
dimensions.

The target is a medium-large four-level botanical resort / shopping gallery
inside the approved approximately 150 m exterior—not the current small office
block and not a city-sized mothership. The Great Tree may grow to roughly three
occupied levels and own a partly internal spiral stair, crown timber terrace,
foliage wall, small pavilion and lie-down observatory lounges. The steering
house was provisionally treated as an upper-forward room here; Checkpoint 18
supersedes that placement and moves command/administration into the shoulders.

Haven must be visually open. The permanent pressure glazing runs down the tall
front, along both sides, over the roof above the tree, through a glazed
promenade and toward the rear. Only sparse primary load ribs may cross it. The
gallery decks terminate before the front glazing; there is no full circular
balcony wall and no decorative mullion grid in front of the tree.

Fast-space mode may close into a silhouette very close to the PS5 controller
shape authority. The open glazing is then protected by flowing, sequenced
Iron-Man-like micro-armor scales that emerge from permanent shell bays and
interlock across the front, sides, roof and rear. These scales are a physical
transform layer separate from the permanent glass and conformal field. The
three-drive and walker systems, immutable sanctuary, single persistent scene
graph and gameplay-write boundaries remain unchanged.

## Checkpoint 13 progress — compact core and game-controller speed shell

The first correction of the calibrated cycle implements Eivind's proportion
strategy directly. `ATRIUM_OCCUPIED_DECKS`, `INHABITED_INTERIOR_ARCHITECTURE`
and `GARDEN_ATRIUM` now share a 0.84 visual scale inside the full-size outer
shell. The Great Tree grows within that compact frame so it remains the central
landmark. This changes the perceived shell-to-interior ratio without breaking
the immutable sanctuary or scaling it during transformation.

Fast-space now performs a real centre-envelope substitution. The open Haven
frame, galleries and garden park late in the transition while
`SPEED_CONTROLLER_GAME_SHELL_CORE` closes between inward-folding smooth white
grips. Its dark U-shaped bridge, open lower centre and transformed blue touch
surface use `src/assets/Blue_darkcontroller.webp` as literal shape authority.
Haven keeps its open front and wraparound glass; the obstructive mullion grid
remains removed and the sequenced wraparound armor scales still close only in
travel mode.

The under-tree and balcony-down cameras were rechecked after the proportion
change and reframed as genuine interior shots. Honest visual fidelity improves
to approximately 0.46 overall, with the controller-speed silhouette around
0.68. This is a meaningful macro correction, not final acceptance: the white
fairings are still too bulbous, the controller seams and touch-surface finish
need refinement, the Haven primary frame remains heavy, and the compact atrium
needs more small inhabited scale cues.

Verification: Low is 159 meshes / 41,576 triangles / 26 materials; High is 159
meshes / 71,782 triangles / 26 materials. TypeScript passes. The complete Island
Run suite reports 1,815 passed and 0 failed. Action remains `refine-code` at
32/36 corrections.

## Checkpoint 14 authorization — inhabited program and mobile-mode correction

Eivind explicitly continued the work on 2026-08-21 and clarified the complete
vertical program plus the Haven/Walker distinction. The lowest level is a
retractable garage and machine-workbench fabrication deck; above it is a premium
creature habitat; above that is the Zen garden; apartments, cinema, gym, chill
zones, stores and lounges wrap the tree; three-floor steering houses occupy the
upper-forward corners and three administration floors occupy the opposite rear.

Haven alone deploys large semi-circular luxury garden terraces on both sides,
including retractable glass rails, bars, seating, warm lights and dense plants.
Walker, hover and ordinary mobile flight roll these terraces and their supports
fully into the hull. Walker remains sealed by transparent permanent glass around
the front, sides, roof and rear, while fast-space physical armor stays parked.
The Haven service column is a downward telescope: it retracts into the lower
belly cassette for mobile modes and may never rise through the Great Tree or
inhabited decks.

The Great Tree is confirmed as a massive grand oak. Its broader canopy now owns
a timber crown terrace, small treehouse pavilion and reclined observatory
lounges. The vehicle lab adds direct drag/click rotation and a range lever so the
ship can be inspected continuously rather than only through fixed orbit buttons.

## Checkpoint 14 progress — correct structure, unfinished visual finish

The five inhabited zones are now separated named scene-graph levels with true
interior camera anchors. Haven and Walker correctly diverge: side garden
terraces deploy only in Haven; Walker hides them, keeps pressure glass visible,
and retracts the landing column downward. The new tree crown, terrace, pavilion,
lounges and terrace furniture use batched/merged geometry so the complete model
remains at 159 meshes. Current budgets are Low 41,348 triangles / 159 meshes / 24
materials and High 71,142 triangles / 159 meshes / 24 materials.

The goal/render sheet remains an honest failure at approximately 0.48 against
the 0.78 checkpoint target. The mode logic and volume hierarchy are materially
better, but the oak anatomy is still low-poly, the crown terrace is a simple
blockout, Walker glass reflections are weak, the black primary frame dominates,
and the inhabited galleries remain far less warm, furnished and dense than the
cinematic botanical-resort goal. The single recorded action is `refine-code` at
33/36 corrections; the next pass should improve those visible systems without
adding new deck concepts.

## Checkpoint 15 — outward structure and living under-canopy

Eivind identified that the two dark inhabited shoulder volumes were still
pinching inward toward the Great Tree. The cause was structural rather than
cosmetic: their local `side * -0.38` placement moved both pods toward the
centreline. The pods now sit inside their respective controller shoulders,
cant outward, and use a slimmer pressure volume. The remaining centre pressure
ring has become a thin rear hoop, while the visible front load path uses slim
outward braces, the crown arch and lower sill. Haven now exposes the occupied
room bands around the tree instead of presenting two black inward walls.

The under-tree POV also exposed too much of the tree-house terrace as a bare
wooden disk. Its underside now has a dense, overlapping instanced foliage layer
distributed across the full terrace footprint. Small warm wood glimpses remain,
but the garden-floor view reads primarily as a living canopy.

Low and High budgets remain unchanged at 41,348 / 71,142 triangles, 159 meshes
and 24 materials. TypeScript passes and the complete Island Run suite reports
1,815 passed and 0 failed. This is correction 34/36; action remains
`refine-code` because the overall model still needs material, oak-anatomy and
inhabited-detail refinement against the goal images.

## Checkpoint 16 — transparent rear conservatory

The rear elevation incorrectly placed panoramic glass almost directly against
three dense rows of room portals and a full-width bulkhead, making the nominal
window read as a sealed office wall. The rear centre is now an open visual axis
through the sanctuary. Creature residences and mixed-use rooms occupy protected
corner bays, administration remains in the upper rear corners, and the rear
bulkhead is reduced to a low sill.

Haven adds `HAVEN_REAR_TOP_WALKING_PROMENADE`: a shallow upper panorama walk
with glass rails inside the extended wraparound conservatory. The old black rear
pressure hoop is removed; structural loads bypass the glazing through the two
controller shoulders. At Walker transition the promenade folds with the living
terrace system and the side/roof/rear glazing telescopes into its permanent
mobile pressure envelope. A rear Walker render confirms that the glass remains
sealed after the promenade retracts.

Removing the redundant hoop more than pays for the promenade: Low is now 40,600
triangles / 159 meshes / 24 materials and High is 69,690 / 159 / 24. TypeScript
passes and the complete Island Run suite reports 1,815 passed and 0 failed. This
is correction 35/36; action remains `refine-code` pending final goal-image finish.

## Checkpoint 17 — glazed shoulders and mature Great Tree

The final correction in this bounded cycle replaces the opaque black inhabited
shoulder masses with shared dark structural glazing. This preserves the broad
controller load path while exposing the warm occupied decks from both front and
rear. The Haven rear promenade now carries warm edge lighting, seating and
plants inside softer, less saturated glass rails without adding another mesh.

The Great Tree has also moved beyond its tidy blockout anatomy: darker bark,
four visible buttress roots, four additional secondary crown limbs, a wider
irregular crown and denser layered foliage make it read as an old oak rather
than a pole with a foliage disk. The crown terrace, pavilion, under-canopy and
interior sightlines remain intact.

The 36/36 cycle closes with Low at 40,912 triangles / 159 meshes / 24 materials
and High at 70,002 / 159 / 24. TypeScript passes and the complete Island Run
suite reports 1,815 passed and 0 failed. Action remains `refine-code`: the model
is materially closer to the botanical-resort reference, but a fresh visual
cycle should still target shell surfacing, glass reflections, furniture scale
and cinematic lighting before any claim of 0.78 image fidelity.

## Checkpoint 18 — new visual authority and shoulder-room correction

Eivind stopped the local-detail loop after the first steering-house POV exposed
that the command suites had become boxes in the Zen garden and that their tiny
depth produced a flat, office-like interior. The placement rule is now explicit:
the garden remains the unobstructed civic heart; both three-storey steering
houses live in forward pressure bays inside the outer controller shoulders, and
the administration suites occupy the rear shoulder bays.

Two new goal sheets reset the visual target. `references/12-shoulder-command-exterior-authority-v1.png`
is the exterior and placement authority: smooth white controller shoulders are
inhabited architectural masses, the central garden remains open, and compact
speed mode returns to the exact game-controller family. `references/13-inhabited-room-pov-authority-v1.png`
is the spatial/finish authority for the shoulder helm, rear administration,
Haven balcony and oak crown terrace: long sightlines, layered ceilings, low
mega-yacht furniture, warm timber and stone, restrained cyan holograms, lush
planting and true human-eye interior cameras.

The current procedural suite blockout has been moved outward and deepened, but
it is not accepted as a likeness match. The next Gauntlet cycle must rebuild the
shoulder pressure rooms from the new images at macro scale before adding small
detail: curved panoramic window envelope first, inhabited floor/ceiling depth
second, helm/admin furniture hierarchy third, then lighting and materials. No
further garden-volume command geometry is permitted.

Eivind then raised the same quality bar for the two lower inhabited levels.
`references/14-workshop-and-creature-exploration-mixed-v1.png` is deliberately
mixed evidence, not a whole-sheet authority. Only its top-left garage and
top-right principal engineering bench are approved: a large, immaculate
billionaire-engineer mega-yacht workshop with vehicle turntable/lift, robotic
gantries, nested tool walls, precision fabrication and a broad exterior loading
door. Only the unoccupied service envelope retracts into the keel. The
lower-left supplies only a green bathing/water-feature cue; its room is not the
creature habitat. The lower-right invents a different ship and is rejected.
The creature level above remains fixed, quiet and luxurious, with social coves,
private nests, climbing/play structures, bathing, plants and garden overlooks;
it must never read as kennels, cages or leftover office space.

`references/15-premium-creature-habitat-candidate-v1.png` is the corrected
single-room proposal. It remains a candidate until Eivind approves it. Unlike
the rejected panel, it is a bounded Deck 01 lounge with nests, social space,
climbing structure, a modest green bathing stream and an interior overlook
toward the one true Zen garden.

## Checkpoint 19 — inspectable rooms and truthful fast-space transformation

Eivind confirmed Haven is becoming credible but rejected the fast-space mode's
apparent over-shrink and unreadable mode change. The physical fast envelope is
therefore recalibrated from 105 m to 128 m within the 150 m Haven vehicle. The
occupied sanctuary and workshop keep their local height and scale; external
service envelopes, legs, terraces, fairings, armor and propulsion hardware do
the visible nesting. Any remaining hyper-compression belongs to the fictional
travel field, not geometry crushing inhabited rooms.

The vehicle lab now exposes a continuous transformation scrubber. The sequence
stages retractable terraces and keel, grip fairing extraction, wing alignment,
four independently folding/sliding window-armor leaves, sequenced shoulder/roof/
rear micro-armor, pulsing amber warning beacons, and finally the smooth game-
controller speed skin. The final skin is deliberately delayed so it cannot hide
the mechanical story during the useful middle frames.

Steering and administration POVs now support bounded drag-look instead of one
locked screenshot angle. Their relevant exterior shoulder shell is sectioned
only for the interior camera so the eye can turn without intersecting ceramic
armor; exterior views retain the complete shoulder.

There is sufficient program space for a compact mixed-use neighbourhood in the
perimeter U. Six named zones now reserve the panoramic restaurant/kitchen, two
apartment clusters, cinema/media lounge, gym/wellness/recovery and market/stores/
tea gallery. The repeated warm frontage geometry now includes a table, two
seats and cornice as the first visible furnishing layer while remaining one
instanced mesh. None of these zones enters the protected Zen garden void.

## Checkpoint 20 — controller-integrated shoulder suites and inhabited frontage

The next bounded build pass removes the remaining office-box language from the
four command and administration rooms. Their occupied floor plates now taper
into the controller shoulders and bow toward the panoramic outer window. The
principal glazing is a pressure-bulged surface, the opaque rear wall is reduced
to a narrow service spine, and slim side glass replaces the former thick dark
box. The rooms remain instanced in the two forward and two rear shoulder bays;
no command geometry moves back into the protected Zen garden.

The repeated mixed-use frontage is also upgraded from a bright rectangle to a
small complete inhabited bay: panoramic opening, ceiling and sill, low sofa,
table, paired seats and a planted corner. This shared geometry serves the
restaurant, apartment, cinema, gym, wellness, market, tea and lounge zones
without multiplying scene-graph meshes.

The first high-detail candidate reached 72,414 triangles and correctly failed
the 72,000-triangle contract. Replacing invisible thickness on the two side
glass sheets with single pressure panes restored the budget without changing
the visible room envelope. Final metrics are Low 42,268 triangles / 159 meshes /
24 materials and High 71,850 triangles / 159 meshes / 24 materials. TypeScript
passes and the complete Island Run suite reports 1,815 passed and 0 failed.

The local lab is running on port 4182 and the Haven exterior is left open for
human review. The automated in-app screenshot path stalled on the animated
WebGL canvas during this pass, so no new likeness score is claimed from an
uncaptured frame. The next visual correction should be chosen from the live
view: either shoulder-fairing continuity if the rooms still protrude, or the
steering/admin furniture hierarchy if their exterior integration now reads.

## Checkpoint 21 — distinct inhabited command and administration suites

The forward and rear shoulder rooms now have separate program geometry while
retaining a single batched shell system. Each forward suite has a low central
helm, paired side stations, two helm seats, restrained cyan holographic panes,
warm console trim and yacht-style ceiling coves. Each rear suite has a strategy
table, opposing seating, illuminated archive wall and its own planning-display
layout. Four concealed warm practical lights make the occupied shoulder volume
read from the true first-person cameras instead of as an unlit black box.

The implementation keeps the common pressure shells instanced four times and
adds one paired furnishing batch instanced across port and starboard. The Zen
garden remains untouched. The garden floor and reflection pool were merged into
one multi-material mesh to preserve the 159-mesh ceiling, while the 26 travel
armor scales now use efficient chamfered plates rather than spending thousands
of triangles on invisible micro-bevels. Glass is more transparent and two-sided
so the shoulder interiors and wraparound Haven conservatory remain legible.

The vehicle lab now includes a deterministic, asset-free star field beyond the
panoramic windows. Interior drag-look remains active, so both steering and
administration cameras can turn within their sectioned shoulder volumes.
Evidence is stored in
`.img2threejs/expedition-ship/evidence/checkpoint-21-command-suites/`.

Final metrics are Low 42,336 triangles / 159 meshes / 26 materials and High
71,694 / 159 / 26. TypeScript passes and the complete Island Run suite reports
1,815 passed and 0 failed. The rooms are now structurally distinct and visibly
inhabited, but the image review still falls short of the mega-yacht authority:
the next correction should improve curved ceiling/furniture anatomy and reduce
the remaining flat-screen/blockout character before any high fidelity claim.
The recorded visual score is 0.30. Mode-matched Walker Tier-1 silhouette IoU is
0.699 (below the 0.85 gate), while the current -30° and +30° area ratios are
1.025 and 1.060, confirming that the vehicle remains genuinely volumetric.
This closes correction 35/36 and authorizes one final `refine-code` correction.

## Checkpoint 22 — unobstructed command panorama and bounded-cycle closeout

The final correction removes the three legacy luminous panels that were still
baked into the common shoulder-suite shell and blocking the steering-house
window. Status light now lives in the sill; the forward room uses a low,
chamfered helm with angled tabletop instruments and side stations. The rear
room keeps its strategy-table arrangement, side archive wall and planning
surfaces. Both rooms use a warmer, less metallic interior response, lighter
structural framing, clearer pressure glass and a shallow curved ceiling cove.
Their default cameras now sit at the true `0.84`-scaled shoulder coordinates,
so neither camera intersects the outer ceramic shell.

The pass is verified at Low 42,398 triangles / 159 meshes / 29 materials and
High 71,180 / 159 / 29. TypeScript passes and the complete Island Run suite
reports 1,815 passed and 0 failed. Fixed-time Walker orbit evidence remains
volumetric: the -30° and +30° silhouette-area ratios are 1.023 and 1.059 with
no degenerate view. Tier-1 silhouette IoU improves from 0.699 to 0.741 but
still fails the 0.85 gate.

The cinematic command-room comparison remains an honest blockout score of
0.34 against the 0.78 acceptance target. The panoramic aperture and furniture
hierarchy improved, but the approved image still has substantially richer
curved ceiling architecture, cabinetry, planting, upholstered anatomy,
circulation and warm cinematic lighting. The assembly check was executed but
also remains failed: the stored parts manifest predates the present named
runtime hierarchy and reports 24 missing-name mappings plus 17 dangling detail
mappings. Runtime contract tests prove the current articulated hierarchy, not
that stale manifest's structural coverage.

Evidence is stored in
`.img2threejs/expedition-ship/evidence/checkpoint-22-command-interior-finish/`.
The review records `refine-code`, which closes the local correction budget at
36/36 and hard-stops this bounded cycle. A fresh cycle should begin with the
command-room architectural/light system and regenerate the runtime parts
manifest before making an assembly-pass claim.

## Checkpoint 23 — six-storey inhabited density and protected lower decks

The user identified a scale-capacity error in the interior: three oversized
office-like bands could not plausibly provide enough apartments, amenities,
creature space and workshop volume inside a 150 m inhabited controller ship.
A fresh bounded cycle therefore keeps the exterior controller envelope and the
Great Tree unchanged while replacing those three perimeter bands with six
compact occupied storeys. The same pressure volume now exposes 108 compact
room entries, 84 visible furnished frontage bays, 24 lounge pods and a denser
vertical stair/lift/light system. Runtime metadata reserves an estimated 240
suites across nine program zones, including restaurant, cinema, gym, wellness,
medical, learning, market, community and residential uses.

Two additional full-width lower decks are now explicit rather than being
implied inside the garden architecture. `DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE`
is an industrial double-height service deck that retracts in travel mode;
`DECK_01_PREMIUM_CREATURE_HABITAT` is a separate pressure floor above it. The
Zen garden remains its own civic level. Dedicated fabrication and creature POVs
use a temporary vertical section through the garden and lower sill only in the
dev lab, so the complete oak, water and floor remain present in every Haven
exterior and garden view.

The compact gallery move displaced the former balcony cameras into structure.
Both camera anchors were relocated inside the pressure glazing and outside the
protected tree void; the test now guards both bounds. The front evidence reads
as six inhabited bands while the under-tree view still lets the oak dominate.
The current lower-deck furniture is deliberately not accepted as final: the
workshop machinery is still blocky, the creature habitat is sparse, and the
repeated residential slabs need a richer curved mega-yacht finish.

Geometry remains Low 42,398 triangles / 159 meshes / 29 materials and High
71,180 / 159 / 29 because the new capacity is delivered through shared
instanced geometry. TypeScript passes, the production model bundles, and the
complete Island Run suite reports 1,815 passed and 0 failed. Multi-angle area
ratios are 1.045 (balcony) and 0.929 (Haven exterior), with no degenerate view.
The composite-reference Tier-1 pixel check remains advisory and fails because
the four-panel photoreal reference is compared with one procedural first-person
view; the evidence-backed visual review is 0.55 and records `refine-code`.

The assembly gate was rerun and transparently retains the same 24 missing-name
and 17 dangling-detail mappings as checkpoint 21/22 because the stored runtime
parts manifest still uses legacy aliases. The articulated runtime hierarchy is
covered by tests, but no assembly-pass claim is made until that manifest is
regenerated. Evidence is stored in
`.img2threejs/expedition-ship/evidence/checkpoint-23-interior-density/`. The new
bounded cycle advances to correction 37/42; the next correction is the actual
workshop, creature-habitat and compact-suite furnishing/detail pass.

## Checkpoint 24 — usable lower-deck clearance and first furnished systems

The workshop and premium creature habitat now occupy real vertical volumes
rather than two thin bands implied beneath the Zen floor. The retractable
fabrication cassette drops farther into the belly while preserving occupied
height, and the Zen commons moves to the lowest gallery datum. This creates a
dedicated creature level between them without enlarging the 150 m controller
envelope or changing the six-storey mixed-use capacity above.

The fabrication deck keeps one bounded mesh slot but now contains a flush
vehicle/engine service lift, cyan guide rails and twelve repeated engineering
stations. Each station combines a lower cabinet, worktop, tool wall,
diagnostic screen and robot-service cradle through one multi-material grouped
geometry. The creature floor likewise retains one instanced mesh while each
of its eight pods now includes a soft nest, privacy backrest, water bowl and
living plant. The lower-deck cameras move into clear starboard aisles so users
can turn and inspect the actual room instead of beginning behind the
telescoping central keel.

The complete Haven front and under-tree views remain intact after the vertical
correction. The exterior visibly holds six compact inhabited gallery bands,
and the oak still dominates the sanctuary from floor level. Fixed-time -30°
and +30° Haven renders retain silhouette-area ratios of 1.013 and 1.051, so no
degenerate-view regression is present.

Final geometry is Low 42,672 triangles / 159 meshes / 29 materials and High
71,478 / 159 / 29, still below the 72,000-triangle and 160-mesh ceilings.
TypeScript passes and the complete Island Run suite reports 1,815 passed and
0 failed. The comparison review is deliberately not an acceptance claim: its
0.56 score recognizes the corrected spatial program and visible amenities,
while workshop anatomy, creature-habitat architecture, lighting, materials and
cabinetry remain far below the cinematic mega-yacht references. The composite
workshop Tier-1 pixel check is advisory and remains below threshold at 0.823
IoU.

The recorded action is exactly one `refine-code` correction. The next pass
should make the central service column read as an intentional engine/lift core,
add workshop gantry/tool-wall/ceiling anatomy inside the current batches, build
curved creature coves with a modest green bathing stream, and replace the flat
inspection lighting with warm premium practicals. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-24/`. The fresh bounded
cycle advances to correction 38/42.

## Checkpoint 25 — intentional service core and contained creature deck

The lower decks now read as designed spaces rather than leftover gaps around a
solid central obstruction. The former opaque keel column is replaced by one
named telescoping engine/lift service core: a narrow transparent pressure
sleeve surrounds a slimmer powered spine with three structural/power rings.
Its metadata explicitly retracts the machinery downward and bounds its Haven
intrusion at the flush service-lift datum, preserving the protected Great Tree
volume.

The fabrication cassette gains a fixed ceiling gantry, twin cyan service rails,
six readable tool cabinets and alternating cyan/warm diagnostic panels inside
the existing batched deck mesh. The creature floor gains its own integrated
pressure ceiling and warm light cassette, panoramic garden glass, thicker
non-luminous nests, low-poly foliage, a curved social-cove edge and a modest
green bathing stream. These systems remain inside their dedicated pressure deck
and do not consume the Zen commons.

Final geometry is Low 43,118 triangles / 159 meshes / 29 materials and High
71,898 / 159 / 29, leaving 102 triangles below the 72,000 High ceiling.
TypeScript passes, the production model bundles, and the complete Island Run
suite reports 1,815 passed and 0 failed. Front and plus/minus 30-degree Haven
captures remain volumetric with reported area ratios of 1.0002 and 1.0000;
because the current lab frame fills nearly the full segmentation mask, those
ratios are regression evidence rather than a precise ship-silhouette score.

The visual review rises from 0.56 to 0.59 but remains below the 0.78 acceptance
target. The workshop is still too dark, sparse and slab-like versus the
billionaire engineering reference. The creature habitat is now contained and
has water, glass, plants and softer nests, but still lacks the curved furniture,
dense greenery, rich surface response and layered practical lighting of the
premium goal image. The Tier-1 IoU is 0.687 and remains advisory because it
compares a furnished photographic room authority with a lab-framed procedural
interior; no acceptance claim is made.

The recorded action is exactly one `refine-code` correction. The next pass
should replace the blockiest lower-deck workstations and habitat furniture with
curved meso forms, increase semantic machinery and planting density inside the
existing batches, strengthen bronze/dark-metal/warm-light separation, and clean
the remaining upper-gallery edge intrusion. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-25/`. The bounded cycle now
advances to correction 39/42. Part coverage and action-ready remain pending;
the stale manifest's previously reported 24 missing-name and 17 dangling-detail
mappings are not represented as fixed by this visual pass.

## Checkpoint 26 — true lower-deck POVs and curved inhabited meso forms

The workshop and creature-habitat cameras now stand inside their real pressure
floors rather than just beyond the retractable deck edge. Both anchors remain
drag-look enabled and look along a starboard-side aisle, avoiding the central
telescoping service core. The dev-only lower-deck section cut also removes the
upper residential slabs, portals, bulkheads, stairs and lift shafts that were
visually masquerading as the creature room's ceiling. Exterior and normal
garden views keep the complete architecture.

The recovered camera truth exposed where geometry—not framing—was still weak.
Fabrication modules now use low-segment rounded machine plinths and work
surfaces plus two-link powered service cradles. Creature residences replace
faceted pads and rectangular backrests with softened nest cushions and curved
half-ring privacy coves. The habitat gains a dedicated dark pressure floor,
the ceiling becomes a rounded dark cassette, the social-cove edge becomes a
real low torus section, and two additional foliage clusters enrich the bathing
stream. Broad floor and ceiling planes now use the ship's dark structural
finish while warm cushions and cyan/warm guidance remain readable.

The extra visible geometry is funded by reducing radial tessellation on hidden
or secondary keel-drive rings, thrust effects and downwash ripples. Final
geometry is Low 43,458 triangles / 159 meshes / 29 materials and High 71,816 /
159 / 29, leaving 184 triangles below the 72,000 High ceiling. TypeScript
passes, the production model bundles, and the complete Island Run suite reports
1,815 passed and 0 failed.

Front and plus/minus 30-degree Haven captures remain non-degenerate, with
reported area ratios of 1.0000 and 0.9997. As before, the lab background fills
most of the segmentation mask, so this is regression evidence rather than a
precise silhouette measurement. Tier-1 IoU reports 0.902 but still lacks the
required map-stripped blockout render and compares whole framed room images;
it is explicitly not used as a fidelity acceptance claim.

The agent-vision score improves from 0.59 to 0.61. The default POVs are now
truthful and the intended curved room language is visible, but the workshop is
still too sparse and primitive, the creature room lacks dense botanical and
upholstered layering, and both spaces remain far below the cinematic material,
reflection and lighting density of the goal images. The recorded action is one
`refine-code` correction. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-26/`; the bounded cycle now
advances to correction 40/42. The next correction should spend the remaining
budget on workshop equipment silhouettes, creature furniture/planting and
restrained cove lighting—not on more broad slabs. Part coverage and action-ready
remain pending with the previously reported stale-manifest mappings unchanged.

## Checkpoint 27 — multispecies sanctuary and vehicle-scale garage

The premium creature floor is now programmed as a multispecies sanctuary rather
than a repeated pet lounge. Six distinct future-use zones share the protected
room: an amphibious bathing rill and basin, moss burrow den, warm sunning stones,
elevated perch grove, quiet nest coves and a deliberately open social/foraging
floor. Residence instances now vary across small-nest, medium-cove and large
family-den scales. Runtime metadata and contract coverage explicitly keep the
floor unoccupied in this pass; no creature models were added prematurely.

The retractable workshop now reserves three functional zones: an empty rover
service bay, the existing engine-pod rotary lift and a clean fabrication-bench
line. The starboard bay gains twin service trenches, four magnetic wheel clamps,
a guidance strip and a travelling overhead gantry carriage with a folded hook.
These remain inside the existing batched workshop part instead of adding scene
graph meshes.

Live inspection exposed that both cameras were standing at the front lip of
their floors, exaggerating every prop. The lower pressure floors and ceiling
cassettes now extend forward, the workshop owns a sealed ceiling independent of
the creature deck above, and the fabrication section cut hides that upper deck
only during its inspection POV. Both default cameras consequently stand deeper
inside their assigned rooms and the workshop reads as an aisle rather than a
close-up of one robot arm.

Visible lower-deck detail is funded by reducing subdivision only on the normally
invisible transparent conformal shield envelope. Final geometry is Low 43,802
triangles / 159 meshes / 29 materials and High 70,974 / 159 / 29, preserving
1,026 High triangles below the 72,000 ceiling. TypeScript passes, the production
model bundles, and the complete Island Run suite reports 1,815 passed and 0
failed.

Front and plus/minus 30-degree Haven captures remain non-degenerate, with whole-
frame mask ratios of 1.0002 and 1.0000. An unstripped checkpoint regression
reports IoU 0.9941, but the lab background still fills almost the entire mask and
the blockout still lacks a required map-stripped render, so neither result is a
reference-fidelity acceptance claim.

The agent-vision estimate rises from 0.61 to 0.64. Program clarity, habitat
variety and lower-deck camera scale improved; the comparison sheets still show a
large gap to the goal imagery in workshop machinery density, botanical and soft-
furniture layering, bronze/glass/textile/water material response and restrained
architectural lighting. The recorded action remains `refine-code`. Evidence is
stored in `docs/gauntlets/evidence/expedition-ship-checkpoint-27/`; the bounded
cycle advances to correction 41/42. Part coverage and action-ready remain
pending, and the stale manifest mappings are not represented as repaired by this
visual pass.

## Checkpoint 28 — lower-deck light, material and equipment separation

The final correction in this bounded cycle concentrates on making the two lower
pressure decks easier to read without changing the established ship envelope.
The creature sanctuary now separates its dark brown ground plane, green soft
residences, cyan bathing water and dark pressure structure through dedicated
materials. The bathing basin and stream are slightly broader, while warm and
cyan cove panels establish local wayfinding without adding new room volume.

The fabrication deck gains three suspended machine umbilicals and luminous
service modules above its existing vehicle-scale bays. Its camera target moves
down toward the actual machinery and service floor, reducing the amount of dead
ceiling in the default POV. Both lower decks receive contained local lighting;
the sanctuary uses the more restrained exposure of the two after live visual
review caught an over-bright first capture.

Final geometry is Low 44,102 triangles / 159 meshes / 31 materials and High
71,274 / 159 / 31, leaving 726 triangles and one mesh below the agreed ceilings.
TypeScript passes after the final exposure adjustment, the production model
bundles, and the complete Island Run regression remains 1,815 passed and 0
failed. No gameplay state or action path was changed.

The whole-lab checkpoint regression reports 0.9999 IoU and the plus/minus
30-degree Haven area ratios are 1.0004 and 1.0002. Those checks establish only
that the approved exterior framing did not collapse; the near-full-frame mask
and absent map-stripped blockout prevent them from being reference-fidelity
acceptance evidence.

The honest visual estimate moves only from 0.64 to 0.65. Material zoning, local
lighting and overhead equipment improve semantic readability, but both rooms
remain visibly procedural and sparse beside the cinematic references. Bespoke
machinery, continuous cabinetry, dense botanical terrain, real upholstery,
curved architectural transitions, water detail and premium reflection response
remain unresolved. Fast Space also still needs a smoother PS5-exact outer shell
and credible transforming-panel choreography.

Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-28/`. The recorded action is
exactly one `refine-code` correction. This reaches the hard bounded-loop ceiling
at correction 42/42, so the current Gauntlet state is intentionally stopped
rather than silently continuing the same plateaued primitive-detail strategy.
The next implementation effort must begin as a fresh bounded phase, preserving
the current spatial program while replacing the lower-deck placeholder modules
with coherent bespoke systems. Part coverage and action-ready remain pending;
the stale manifest mappings are not claimed as repaired by this visual pass.

## Checkpoint 29 — fresh lower-deck systems phase and true interior cameras

This checkpoint starts a separate six-correction interior-systems phase without
resetting or disguising the stopped 42/42 density cycle. Its admitted reference
is the approved mixed workshop/creature exploration sheet, with a new strict
21-component sculpt spec, a 16-item detail inventory and inferred PBR evidence
for workshop metal, sanctuary hardscape and sanctuary textile. The generated
factory remains an audit artifact; the production work continues in the
existing articulated ship hierarchy.

The workshop inspection camera is now physically between its floor and ceiling
rather than above the ceiling cassette. The exterior garage belly, landing keel
and central drive are sectioned only for the two lower-deck inspection POVs, so
they no longer cut through the room while remaining intact in Haven, walker and
flight exteriors. The workshop gains a continuous bronze perimeter bench,
side cabinetry, a clearer central service aisle, nested overhead maintenance
rings, a gantry carriage, suspended umbilicals and ten reorganized machine
stations. The camera can yaw inside the room; a second capture confirms that the
volume does not collapse.

The creature sanctuary now has a taller independent pressure ceiling, linked
planted side and rear banks, three connected water bodies, mixed-scale residence
pods and stronger foliage/fabric/water separation. Its camera looks slightly
down into the ecology rather than scraping the ceiling. Both lower POVs use
dedicated restrained light rigs; broad atrium practicals and high-emissive
materials are temporarily attenuated only during these inspection views to
avoid the former white ceiling and floor blowouts.

Final geometry is Low 46,034 triangles / 159 meshes / 32 materials and High
71,810 / 159 / 32, leaving 190 High triangles below the 72,000 ceiling. The
budget was recovered from subdivisions on the normally invisible conformal
shield and one shallow roof arch, not by removing inhabited-room systems.
TypeScript passes and the complete Island Run suite reports 1,815 passed and 0
failed. Haven and Fast Space exterior regression captures remain intact.

The workshop yaw check reports an area ratio of 1.0539 and no degenerate view.
The Tier-1 reference comparison does not pass: IoU is 0.7994 versus the 0.85
threshold and a true map-stripped blockout is still absent. The scoped
lower-deck agent-vision estimate is 0.42 against a 0.72 acceptance threshold.
This lower score is a stricter room-reference score, not an overall-ship
regression against checkpoint 28: the rooms are now inspectable and spatially
coherent, but the sheet makes the remaining fidelity gap explicit. Equipment
is still oversized and blocky beside the reference's dense articulated
machinery; sanctuary ecology, water, upholstery, architectural transitions,
PBR response and local lighting remain early procedural approximations.

Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-29/`. Exactly one
`refine-code` review was recorded. The new bounded phase advances to correction
1/6 with the old 42/42 cycle preserved as stopped. Part coverage and
action-ready remain pending and are not claimed by this visual pass.

## Checkpoint 30 — denser lower-deck systems and corrected evidence

The second correction in the fresh interior-systems phase concentrates on the
two weakest lower decks without changing the protected PS5-controller exterior.
The fabrication room now reuses its existing articulated workstation batch for
a compact second machine-wall tier, enlarges the primary rear and side stations,
extends the sealed floor and ceiling cassette, and gives the rotary service lift
and workstation bases a more visible bronze engineering finish. The creature
sanctuary adds multiscale social nests, elevated perch coves and five planted
clusters while retaining the explicit no-creatures-yet contract.

Live review also corrected an evidence error: `pov=fabrication-deck` is not a
valid lab camera key and had accidentally captured the central atrium. The
authoritative checkpoint uses `pov=fabrication`, plus a genuine dragged interior
yaw. That corrected pair reports a 0.8425 silhouette-area ratio and no
degenerate view, proving a real navigable volume rather than a flat camera trick.

Final geometry is Low 46,214 triangles / 159 meshes / 32 materials and High
71,990 / 159 / 32, leaving only 10 High triangles below the 72,000 ceiling.
TypeScript passes and the complete Island Run regression reports 1,815 passed
and 0 failed. No gameplay state or canonical action path changed.

The corrected Tier-1 comparison remains a failure: IoU is 0.8207 against the
0.85 threshold, and a real map-stripped blockout is still absent. More
importantly, the semantic visual score rises only from 0.42 to 0.44 against the
0.72 target. The added systems improve density and bronze/dark-frame separation,
but the workshop still reads as a dark procedural blockout with an oversized
empty service floor, repeated primitive machine silhouettes, abrupt section-cut
edges and weak practical-light hierarchy. The sanctuary is somewhat fuller but
remains low-poly, underlit and far less immersive than the approved living-water,
greenery and upholstered-habitat reference.

Exactly one `refine-code` action is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-30/`. The fresh bounded phase
advances to correction 2/6; the next pass should replace the repeated workshop
stations with one coherent batched tool-wall/manipulator system, materially zone
the rotary lift and vehicle service floor, seal the yaw-visible pressure-room
edges, and continue the sanctuary as connected landscaped terrain. Part coverage
and action-ready remain pending and are not claimed by this visual correction.

## Checkpoint 31 — coherent workshop stations and sanctuary floor isolation

This correction replaces the fabrication room's repeated cone/stool-like
workstation silhouette with rectangular industrial cabinets, bronze worktops,
raised tool-wall panels and articulated two-link service arms. The side
cabinetry and rear tool wall extend farther into the room, the pressure floor and
rotary lift use a readable light structural-metal finish, and a restrained cyan
engine-diagnostic ring gives the engineering deck a clearer semantic focal
point. The additions remain inside the existing workshop batch rather than
raising the scene's 159-mesh ceiling.

The creature-sanctuary inspection now sections the workshop deck below it, so
orange machinery no longer bleeds through the habitat floor. Its lower-deck
lighting is independently balanced from the workshop while preserving the
explicit no-creatures-yet contract. Haven and Fast Space regression captures
confirm that these POV-only section changes do not remove the established
controller exterior.

Final geometry is Low 46,262 triangles / 159 meshes / 32 materials and High
71,966 / 159 / 32, leaving 34 High triangles below the 72,000 ceiling. TypeScript
passes and the complete Island Run suite reports 1,815 passed and 0 failed. No
gameplay state, canonical action or persistence path changed.

The genuine dragged workshop yaw reports a silhouette-area ratio of 0.8348 and
no degenerate view. It also exposes the most important remaining structural
failure: the room reads as a partial set from the side because abrupt shell
edges reveal exterior void. Tier 1 remains a failure at 0.821 IoU against the
0.85 threshold, and a map-stripped blockout is still absent.

The scoped agent-vision estimate rises from 0.44 to 0.48 against the 0.72
acceptance threshold. The visible floor, coherent cabinet rhythm, compact
diagnostic display and corrected sanctuary isolation are real gains. The
comparison sheet nevertheless remains far from the approved imagery: broad
flat planes replace curved pressure architecture, the tool wall lacks dense
drawers, shelves, cables and premium robotic systems, the sanctuary ground is
too flat and low-poly, and PBR response and practical-light hierarchy remain
weak.

Exactly one `refine-code` action is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-31/`. The blockout sub-loop
has now reached its bounded 3/3 correction stop (3/6 total phase corrections),
so the next effort must start from a changed construction strategy: first seal
the complete pressure-room envelope, then replace the flat workshop ceiling
with ribbed service bays and one continuous batched tool wall, and reshape the
sanctuary as linked planted terraces, pools, soft coves and raised habitat
islands. Part coverage and action-ready remain pending and are not claimed by
this visual correction.

## Checkpoint 32 — fresh sealed lower-deck architecture phase

Eivind's explicit continuation after the prior bounded stop starts a fresh,
narrower img2threejs phase instead of bypassing the exhausted interior-systems
loop. The new `sealed-lower-decks` spec carries forward the admitted reference,
21-component hierarchy, 16-item detail inventory and independent workshop/
sanctuary PBR evidence, while resetting only the phase identity and review
history. Strict-quality validation passes; action-profile warnings remain
reserved for the later action-ready gate.

The workshop now owns full-height side pressure cheeks, a rear machine-wall
boundary and three transverse bronze ceiling ribs. Batched drawer banks and
service indicators add a lower tool-wall tier without increasing the 159-mesh
ceiling. Lower-deck inspection sections both controller-wing assemblies, so a
genuine free-look turn no longer exposes white exterior hull fragments through
the room. The same view remains volumetric with a 0.9403 silhouette-area ratio.

The creature sanctuary changes from a nearly uniform green foreground to a
warmer ground plane organized around a broad cyan bathing network. Enlarged
green side banks, a seven-cluster irregular planted ridge, raised nests and the
existing perch/water systems establish a more legible landscape horizon. Its
camera moves upward and toward the center so it reads the pools and habitat
layers from inside the room. Side pressure panels and a lighter independent
ceiling preserve the contained sanctuary volume; the explicit no-creatures-yet
contract remains unchanged.

The normally invisible conformal shield envelope drops one additional bevel
subdivision, recovering enough budget for visible inhabited-room architecture
without changing the rendered controller shell. Final geometry is Low 46,022
triangles / 159 meshes / 32 materials and High 71,726 / 159 / 32, leaving 274
High triangles below the 72,000 ceiling. TypeScript passes and the full Island
Run regression reports 1,815 passed and 0 failed. Haven and Fast Space captures
remain structurally intact; no gameplay or persistence path changed.

Tier 1 remains a deliberate failure: IoU is 0.8215 against the 0.85 threshold
and a map-stripped blockout is still absent. The scoped agent-vision score rises
from 0.48 to 0.52 against the 0.72 acceptance threshold. Spatial enclosure and
sanctuary composition improve materially, but the comparison still shows broad
flat slabs, sparse primitive machinery, faceted habitat forms, weak upholstery,
limited roughness response and broad game-like lighting beside the cinematic
engineering-megayacht and living-sanctuary reference.

Exactly one `refine-code` action is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-32/`. The new bounded phase
advances to correction 1/3 (1/6 total). The next correction should turn the
plain pressure cheeks into curved panel-and-glass architecture, replace the
flat ceiling with layered coffers/conduits/hoists, build one hero articulated
robot or fabrication subject, and give the sanctuary overlapping terrace,
root, reed and soft-cove silhouettes. Part coverage and action-ready remain
pending and are not claimed by this visual correction.

## Checkpoint 33 — hero fabrication rigs and future Score-tab hangar direction

Eivind proposed that the finished development lab should evolve into the real
PWA spaceship garage/hangar in the Score area. This is a strong product
direction, but it is deliberately recorded as a future presentation layer
rather than coupled into this visual correction. The reusable ship model,
transformation rig, named POV anchors and free-look camera remain independent.
Later, the hangar shell can expose exploration, walking, transformation
demonstrations, upgrades and customisation (colour, boosters and luxury
systems) around that same model. Ownership, purchase and upgrade writes must
use a canonical action/service boundary; the Score UI must not become another
direct gameplay-state writer.

The workshop now has a paired articulated service operation around the rotary
lift: two anchored bases, illuminated shoulder joints, angled upper and lower
members, elbow housings and warm/cyan tool heads. The pressure cheeks gain
three inset glass facets per side and bronze mullions, making their intended
curved engineering-megayacht treatment more explicit while retaining the
sealed yaw volume. The existing nested maintenance rings, travelling gantry,
drawer/tool-wall bands and vehicle floor remain part of the same retractable
batched deck.

The creature sanctuary gains a four-segment living-root route across its linked
bathing pools, two reed bands, upholstered resting islands and amber/cyan
ceiling coffers. Camera experiments were evidence-driven: the low viewpoint
hid the pools behind foreground planting, so the accepted camera uses the
middle height but steps back along the room to recover the multi-zone panorama.
No creatures have been added.

The first candidate reached 72,074 High triangles and correctly failed the
72,000 ceiling. Reducing only repeated low-salience pod, planted-bank and basin
curvature closes at Low 46,408 triangles / 159 meshes / 32 materials and High
71,986 / 159 / 32. TypeScript passes and the full Island Run regression reports
1,815 passed and 0 failed.

The deterministic quarter-turn remains volumetric with an area ratio of
1.1124 and no degenerate view. Tier 1 remains a deliberate failure at 0.8022
IoU against the 0.85 threshold, and the required map-stripped blockout is still
absent. The scoped agent-vision estimate rises from 0.52 to 0.55 against the
0.72 acceptance threshold. The new rigs and sanctuary composition improve
semantic readability, but the render is still dominated by broad primitives,
flat dark ceiling slabs, sparse tool density, weak contact shadows and limited
PBR variation beside the approved cinematic reference.

Exactly one `refine-code` action is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-33/`. The fresh bounded
phase advances to correction 2/3 (2/6 total). Its final allowed correction
should concentrate on visible-fidelity leverage rather than more room
inventory: soften the hero rig with cylindrical joint housings/cables and a
recognisable fabrication subject, introduce bounded ceiling coffers and warm
practicals, and improve material/light response while preserving the strict
mobile budget. Part coverage and action-ready remain pending.

## Checkpoint 34 — tri-drive service subject and bounded strategy stop

The final permitted correction in the sealed-lower-decks blockout phase spends
its remaining budget on one readable engineering operation rather than another
room inventory pass. A compact tri-drive booster now sits on the central rotary
lift. The paired service rigs use cylindrical upper and lower links, routed
amber/cyan cables, visible tool jaws and the existing powered shoulder/elbow
nodes, so the workshop camera no longer shows robots working on empty air.

Lower-deck presentation also gains a deterministic local hero spotlight and a
more differentiated response for bronze worktops, green habitat textiles and
warm habitat flooring. Foliage self-emission is reduced so sanctuary forms are
lit by the room rather than glowing uniformly. The controller silhouette is
protected by funding these close-up changes from a small reduction in the four
walker hinge-collar subdivision counts; no ship mode, deck program or gameplay
state was removed.

Final geometry is Low 46,724 triangles / 159 meshes / 32 materials and High
71,982 / 159 / 32, leaving 18 High triangles below the 72,000 ceiling.
TypeScript passes and the full Island Run regression reports 1,815 passed and
0 failed. Haven and Fast Space exterior captures remain structurally intact;
no canonical gameplay action, store or persistence path changed.

The second workshop view remains genuinely volumetric with a silhouette-area
ratio of 1.0965 and no degenerate view. Tier 1 remains a failure: IoU is 0.8121
against the 0.85 threshold and a map-stripped blockout is still absent. The
scoped agent-vision estimate is 0.54 against the 0.70 acceptance threshold.
The hero subject is more legible than checkpoint 33, but the comparison still
shows a decisive fidelity gap: grouped low-poly primitives cannot reproduce the
reference's continuous curved pressure architecture, dense tooling, premium
robot anatomy, contact shadow or macro/meso/micro surface response. The
sanctuary likewise remains coherent in layout but faceted in terrain,
upholstery and planting.

Exactly one `refine-spec` action is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-34/`. The local
Img2ThreeJS state has correctly stopped at blockout correction 3/3 instead of
bypassing its bounded loop. The next user-authorized phase must change strategy:
author continuous curved envelope strips and instanced equipment kits, give the
two close-up lower rooms independent near-camera LOD budgets, and wire the
already-extracted independent PBR evidence into those room materials before
adding more facilities. The future Score-tab hangar/garage direction recorded
at checkpoint 33 remains valid and should consume the same reusable ship model,
POV anchors and transformation rig after visual fidelity is accepted. Part
coverage and action-ready remain pending and are not claimed by this phase.

## Checkpoint 35 — continuous workshop architecture phase begins

Eivind's explicit continuation after the sealed-lower-decks 3/3 stop starts a
fresh bounded `continuous-interior` phase; the exhausted state is not bypassed.
The new spec carries forward the admitted mixed reference, ultra-complex
assessment, 21-component hierarchy, mapped 16-item inventory and independent
workshop/sanctuary PBR evidence, while resetting phase identity and visual
review history. Its strategy is materially different: replace obsolete flat
blockout slabs with continuous surfaces, wrap one reusable equipment kit along
measured room curves, and reserve named near-camera detail groups without
changing gameplay ownership. Strict-quality validation passes.

The workshop ceiling is now one sampled bowed canopy surface whose edges descend
toward the side walls. Both pressure cheeks are continuous curved glass grids
with bronze structural mullions, and three Catmull-Rom pressure arches connect
them across the canopy. Rear equipment modules fan around a shallow curve while
the side modules rotate ninety degrees inward, so the workstations form a real
perimeter system rather than a row of identically oriented props. The reusable
kit also gains rounded panel geometry, cylindrical arm links and a routed power
cable. The maintenance ring and gantry rise into the canopy, opening the true
standing workshop sightline while keeping the machinery present.

The first candidate exceeded the complete-ship ceiling at 72,244 High
triangles. Reallocating repeated walker hinge-collar tessellation and replacing
the old ceiling/side slabs rather than stacking over them produces a final Low
46,958 triangles / 159 meshes / 32 materials and High 71,932 / 159 / 32. The
Haven and Fast Space controller silhouettes remain intact. TypeScript passes;
the complete Island Run suite reports 1,815 passed and 0 failed. No canonical
gameplay action, state store or persistence path changed.

The yaw view remains volumetric with an area ratio of 0.9549 and no degenerate
view. Tier 1 remains a failure at 0.817 IoU against the 0.85 threshold and a
map-stripped blockout is still absent. The scoped agent-vision estimate is 0.53
against the 0.70 acceptance threshold. The changed primitive family is a real
structural gain, but the first proof does not improve the final image enough:
the near-black floor/foreground consumes too much of the frame, canopy edges
lack thickness and bevel hierarchy, perimeter cabinets remain sparse, and
macro/meso/micro PBR response is not yet visible.

Exactly one `refine-code` action is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-35/`. The fresh phase is at
blockout correction 1/3 (1/6 total). Its next bounded correction should first
repair workshop floor/canopy lighting and camera composition, then add panel
thickness, seams and bevel response to the continuous envelope before spending
budget on any new facilities. The Score-tab hangar/customisation direction
remains a later consumer of the same reusable ship model, POV anchors and
transformation rig. Part coverage and action-ready remain pending.

## Checkpoint 36 — workshop surface readability and true interior camera

The second correction in the fresh continuous-interior phase addresses the
largest observed presentation failure before adding more room inventory. The
fabrication floor and bowed canopy now share a workshop-only clear-coated
gunmetal material, so neither change leaks into the controller shell or walker
hardware. A dedicated broad amber floor spot recovers the service deck from the
near-black foreground, cyan fill is reduced, and long warm canopy coves expose
the room's fore-aft curvature. Floor seam geometry is widened and moved into the
camera's visible half of the bay.

The previous camera was only 0.21 model units below the canopy and looked
slightly upward, which made the overhead system loom and compressed the room
into a flat front elevation. Both the lab preset and named model anchors now
place the camera at `[-0.62, -0.95, 0.74]` looking toward
`[0.12, -1.2, -0.52]`. This produces a genuine standing-height three-quarter
view from inside the workshop. A deterministic opposite-side camera probe
confirms that the pressure volume and equipment perimeter hold when viewed from
the other side.

The two longitudinal canopy coves add only 24 triangles. Final geometry is Low
46,982 triangles / 159 meshes / 33 materials and High 71,956 / 159 / 33,
leaving 44 High triangles below the 72,000 ceiling. The one additional material
is isolated to the fabrication floor and canopy. TypeScript passes and the full
Island Run regression reports 1,815 passed and 0 failed. Haven and Fast Space
exterior captures remain structurally intact; no canonical gameplay action,
state store or persistence path changed.

The opposite interior angle has a silhouette-area ratio of 0.9612 and no
degenerate view. Tier 1 now has the required map-stripped evidence but remains
a failure at 0.8067 IoU against the 0.85 threshold; the admitted target is a
four-panel mixed workshop/sanctuary/section collage rather than a
framing-matched single workshop image, so that number is retained as a blocker
without being overclaimed as a complete fidelity judgment. The scoped
agent-vision estimate rises from 0.53 to 0.56 against the 0.70 acceptance
threshold.

Exactly one `refine-code` action is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-36/`. The fresh phase is now
at blockout correction 2/3 (2/6 total). The final permitted correction should
spend the remaining visual budget on scale and edge hierarchy: reduce and
regroup the oversized paired manipulators, make the service-floor path
physically legible, and reallocate existing triangles into canopy thickness,
panel seams and cabinet/tool-wall anatomy. It must not add more facilities or
disconnected props. Part coverage and action-ready remain pending.

## Checkpoint 37 — canopy edge hierarchy and bounded phase stop

The final permitted correction in the continuous-interior blockout phase
reallocates geometry instead of adding another room or prop set. The floating
nested maintenance rings and four overhead crossbars that formed a dominant
black X are removed. Two Catmull-Rom bronze edge tubes now follow the bowed
canopy fore-to-aft, with a restrained centre seam and the existing transverse
pressure arches forming a clearer pressure-shell hierarchy. Two continuous rear
fascia rails bind the drawer banks and diagnostic modules into one tool-wall
system.

The paired service manipulators are reduced throughout: bases, shoulder and
elbow nodes, cylindrical links, tool heads, cables and jaws all shrink, their
five-segment links replace the previous six-segment links, and the complete
operation moves from local z=-0.43 to z=-0.56 around the tri-drive booster.
This opens the service floor without deleting the engineering subject. The six
ineffective transverse floor stripes are replaced by two compact bronze vehicle
rails and four cross thresholds seated around the rotary lift. Cyan workshop
fill is reduced from 0.45 to 0.18 so the guidance system reads as metal rather
than a large coloured spotlight.

Final geometry is Low 46,966 triangles / 159 meshes / 33 materials and High
71,952 / 159 / 33, leaving 48 High triangles below the 72,000 ceiling.
TypeScript passes and the full Island Run regression reports 1,815 passed and
0 failed. Haven and Fast Space exterior captures remain structurally intact;
no canonical gameplay action, state store or persistence path changed.

The opposite interior angle remains volumetric with a silhouette-area ratio of
0.9609 and no degenerate view. Tier 1 remains a failure at 0.809 IoU against
the 0.85 threshold. The scoped agent-vision estimate rises from 0.56 to 0.58
against the 0.70 acceptance threshold. The improvement is real but bounded:
the room is cleaner, the manipulator scale is more credible and the canopy has
continuous edge thickness, while the comparison still reads as a procedural
blockout beside the reference's dense tool anatomy, multi-layer bevel/gasket
systems, contact lighting and macro/meso/micro PBR response.

Exactly one `refine-spec` action is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-37/`. The local Img2ThreeJS
state has correctly hard-stopped at blockout correction 3/3 (3/6 total) and
must not be bypassed by further patching in this phase. The next user-authorized
phase should start from checkpoint 37 but change strategy: select or generate
one dedicated workshop master rather than reviewing against the mixed
four-panel collage; specify continuous multi-layer pressure-shell and cabinet
topology with explicit near-camera LOD ownership; wire the independent PBR
evidence into macro, meso and micro surface systems; and reserve a separate
instanced tool-detail/contact-lighting budget before implementation. Part
coverage and action-ready remain pending.

## Checkpoint 38 — fresh panoramic fabrication-glass phase

The user-authorized continuation starts a new
`state-workshop-fidelity.json` phase rather than bypassing the correctly
stopped 3/3 continuous-interior loop. A new single-room visual master replaces
the mixed four-panel collage:
`docs/design/expedition-ship/references/fabrication-deck-panoramic-master-v1.png`.
It retains the approved megayacht engineering garage, rotary lift, compact
service rigs and dense perimeter tool wall while making the user's new
requirement explicit: the complete forward boundary is a sealed, full-width,
slightly bowed panoramic pressure-glass wall with an exterior view.

The model now builds that boundary as one continuous conforming-shell grid,
not tiled boxes. It overlaps the bowed canopy, seats into a solid bronze sill,
joins the existing pressure cheeks, and carries four sparse vertical load
members plus a continuous header line. A workshop-only low-reflection
smart-glass material keeps the outside legible. The new
`FABRICATION_WINDOW_POV` / `FABRICATION_WINDOW_LOOK` anchors stand inside
the pressure room and look outward; the vehicle lab exposes them as
`pov=fabrication-window`, with the same drag-look, lower-deck section cuts
and architectural lighting as the existing workshop POV.

The lab also gains deterministic docked scenery behind the real transparent
wall: a procedural sky and layered mountain horizon that is visible only for
docked fabrication probes. It is external lab context, not a texture baked
into the ship or glass; Walker/flight and every non-fabrication view retain
their existing environment. This closes the old black-void reading and proves
that the forward boundary is glass rather than an open bay.

The first rounded sill exceeded the High geometry ceiling and the complete
regression suite caught it. Replacing it with a 12-triangle structural bar
returns the final model to Low 47,002 triangles / 159 meshes / 34 mesh
materials and High 71,996 / 159 / 34, leaving four High triangles below the
72,000 ceiling. The window frame is a zero-triangle `LineSegments` system.
TypeScript passes, and the complete Island Run suite reports 1,815 passed and
0 failed. No canonical gameplay action, state store or persistence path
changed.

The window and pressure volume remain non-degenerate across the outward,
rear-to-front and fabrication overview cameras; alternate silhouette-area
ratios are 0.9526 and 0.9018. Tier 1 still blocks formal AI comparison:
the best fixed-view IoU is 0.834 against the 0.85 threshold. Formal AI score
and comparison-sheet acceptance are therefore intentionally omitted. The
specific user-requested system is now present and visibly sealed, but the
broader workshop still reads as a procedural blockout beside the new cinematic
master, and the header/frame thickness, continuous wall anatomy, contact
lighting and macro/meso/micro materials remain underdeveloped.

Exactly one deterministic-only `refine-code` action is recorded with
`aiVisionScore: null`, because Tier 1 prohibited the formal AI gate. Evidence
is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-38/`. The fresh phase is
at blockout correction 1/3 (1/6 total). The next bounded correction should
preserve the panoramic wall and spend reclaimed geometry on a thicker curved
header, better continuous cabinet-wall topology and less primitive service-rig
cross-sections before adding any new rooms or props. Part coverage and
action-ready remain pending.

## Checkpoint 39 — budget-safe panoramic-wall correction review

Correction 2 re-captures the dedicated fabrication-window, rear-to-front room
and overview evidence after the rounded sill was replaced by its visually
equivalent 12-triangle structural bar. The complete TypeScript build and the
full Island Run service suite remain green at 1,815 passed and 0 failed.

The fixed-view Tier-1 mask is still an honest hard failure: IoU is 0.8334
against the 0.85 threshold. The room volume does not collapse in the
multi-angle area check, but the two current room captures are visually
duplicated by the fixed workshop camera, so this is evidence of non-degenerate
volume rather than adequate viewpoint diversity. Formal AI scoring and a
comparison-sheet acceptance are intentionally omitted. Exactly one
deterministic-only `refine-code` review is recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-39/`.

## Checkpoint 40 — physical pressure header and folded service tooling

The final bounded blockout correction replaces the zero-thickness upper glass
line with a real continuous curved pressure member. A low-sided triangular
`TubeGeometry` follows the forward glass bow and the canopy crown, while the
line frame now owns only four sparse vertical seams. The glass still overlaps
the canopy and remains socketed into the solid lower sill.

The repeated machine-wall service arms also stop using two large 6-sided
diagonal cylinders. Shorter folded rectangular links park closer to the
cabinet wall, retain the cyan joint/cable identity and reopen the vehicle
aisle. The 32-triangle ring plus 12-triangle circle diagnostic glyph is removed
rather than funding another floating primitive. The exact complete-model
budgets are now Low 46,964 triangles and High 71,964 triangles; the High model
retains 36 triangles below the strict 72,000 ceiling. Mesh and material counts
remain unchanged. TypeScript passes, and the complete Island Run suite again
reports 1,815 passed and 0 failed. No canonical gameplay state, action or
persistence path changed.

The resulting inside view visibly gains a thick bronze pressure header and the
room-facing view gains smaller folded service tooling. The deterministic mask
nevertheless remains below acceptance at 0.8330 IoU versus 0.85. Multi-angle
silhouette area does not collapse, but distinct workshop camera coverage is
still insufficient. Formal AI scoring remains prohibited by the Tier-1 hard
failure, so exactly one final deterministic-only `refine-code` review is
recorded. Evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-40/`.

The fresh workshop-fidelity phase has now reached its enforced blockout limit
of 3/3 corrections (3/6 total) and is hard-stopped. Do not bypass it with more
ad-hoc blockout patches. The next productive phase must rebaseline the camera
and macro layout together: add a genuinely oblique interior service-aisle or
upper-gallery POV, replace the repeated small wall modules with fewer larger
continuous yacht-grade cabinet bays, then judge contact lighting and
macro/meso/micro material frequency from that view. Part coverage and
action-ready remain pending until the revised macro phase can pass.

## Checkpoint 41 — Score-tab Spaceship Garage vertical slice

The user-approved product direction is now implemented as a thin, reversible
vertical slice: the existing Score `garage` surface gains a default `Hangar`
subtab ahead of Companions, Upgrades and Cosmetics. The Hangar lazy-loads the
shared `ExpeditionShipCanvas` only after it opens, so the heavy Three.js model
does not enter the ordinary Score bundle or runtime before the player requests
it. No second ship factory, duplicated geometry or gameplay-state mirror is
introduced.

The first showcase exposes all three canonical configurations—Haven, Walker
and Fast Space—and three useful views: exterior orbit, the fabrication
workshop and the forward panoramic glass. Drag/click rotation, two accessible
rotation buttons, responsive configuration/view controls, concise installed
system summaries and bridges to Upgrades and Cosmetics establish the future
garage information architecture without moving existing companion or power-up
authority. The component selects Low quality for narrow or reduced-motion
clients and High quality otherwise.

A direct development-only route at `/dev/expedition-ship-garage` provides a
stable review surface without authentication. Browser smoke testing confirms
that Haven, Fast Space and Workshop controls update the shared canvas and
accessible pressed states. A clean route load reports no runtime errors.
Desktop Haven, desktop Fast Space and 390×844 phone evidence is stored in
`docs/gauntlets/evidence/expedition-ship-checkpoint-41/`.

TypeScript passes and the complete Island Run service suite remains 1,815
passed and 0 failed. No canonical gameplay action, store, persistence path or
creature ownership changed.

The production Vite bundle also passes. The lazily loaded Hangar emits as its
own `ExpeditionShipGarageShowcase` chunk at 99.87 kB minified / 32.15 kB gzip,
plus an 8.66 kB / 2.42 kB gzip stylesheet; the existing unrelated large-chunk
and mixed dynamic/static import warnings remain unchanged.

Merge topology remains important: this work currently lives on
`codex/3d-egg-hatch-pilot`, whose ship/model, evidence and new Hangar files are
still untracked. `ScoreTab.tsx` has no current `HEAD..main` divergence, so the
narrow mount is expected to merge cleanly, but the ship package must be
preserved on a normal branch/commit before any merge. Do not treat checkpoint
evidence alone as durable source control.
