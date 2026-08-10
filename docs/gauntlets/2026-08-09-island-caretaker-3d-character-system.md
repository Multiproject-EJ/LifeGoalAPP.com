---
id: island-caretaker-3d-character-system
status: m1-m3-reopened-surface-detail-v13
owner: Eivind
created: 2026-08-09
project: HabitGame / Island Run
pilot: Island 5 — Crown of Tides
---

# Island caretaker 3D character system

## Mission

Replace the flat caretaker board sprite with one reusable, rigged 3D caretaker family that feels alive on every island. The same core character identity, anatomy, rig, and animation library must support island-specific clothing, patterns, materials, accessories, posture, and magical accents without producing 150 unrelated character models.

## Current truth

- Island Run already owns caretaker dialogue, Concord access, board-tap interaction, speech bubbles, and the canonical tile-0 encounter trigger.
- The current board presentation is a flat image anchored near tile 0.
- Island 5 already has one live Three.js scene and quality profiles; the caretaker must join that scene rather than creating another renderer.
- The visual bible requires a clothed silhouette, a mostly shadowed face, expressive glowing eyes/mouth when appropriate, and no fully illuminated uncovered face or body.
- Landmark and caretaker interactions must continue routing through canonical services and existing presentation callbacks.

## User outcome

On Island 5, the caretaker visibly lives in the world: idles at a home location, looks around, occasionally performs small ambient actions, walks to a safe board-side interaction marker when story or dialogue calls for it, acknowledges the player, and opens the existing caretaker conversation when tapped. Its Crown of Tides clothing must clearly belong to Island 5 while remaining recognisably the same caretaker family used elsewhere.

## Head-to-toe visual improvement loop — passed 2026-08-09

- Goal image: `docs/visual-references/island-caretaker/island-005/caretaker-crown-of-tides-front-v1.png`.
- Current matching full-body High baseline: `outputs/island5-3d-gauntlet/caretaker-character/head-to-toe/current-high-full-body.png`.
- Improve and independently critique one bounded region at a time: (1) silhouette/hood/face, (2) torso/mantle/robe/materials, (3) arms/hands/staff, and (4) cape/lower robe/belt/boots/ground contact.
- A regional gate may pass only when the full-body silhouette remains coherent, the improvement is visible at 390×844, High and Low stay within their budgets, and no shared animation becomes less readable.
- After all four regional gates, recapture the current full-body High/Low figures and all seven action/emotion states, then run one final whole-character comparison against the goal image. Passing individual regions does not automatically pass the final character.
- Final evidence: `outputs/island5-3d-gauntlet/caretaker-character/m1-m3/final-goal-vs-current-v8.jpg`, `final-proof-contact-sheet-v8.jpg`, and `final-motion-contact-sheet-v8.jpg`.
- Independent final gates: hood/face/trim 86/100 PASS; garment/material system 86/100 PASS; motion/collision/phone framing 94/100 PASS. No production-pilot blocker remains for M1–M3.

## Large-form reopening — v9 in progress 2026-08-09

Eivind reopened M1–M3 after rating v8 at 7.5/10 and identifying that the
front and rear garments still read as separate flat pieces. The earlier pass
status is retained above as history, but it no longer authorizes M4.

- Current comparison: `outputs/island5-3d-gauntlet/caretaker-character/large-form-v9/goal-vs-current-v9-phone.png`.
- The cream front is now one tapered tunic volume rather than two flat lining
  boards.
- The blue coat fronts are subdivided curved surfaces that wrap in depth and
  continue from beneath the mantle to the boot line.
- The rear garment is now a broad full-length split cloak with a visible
  A-line flare, raised hem, central opening, and rear shoulder mantle leaves.
- The cape and arm roots were moved back into the body silhouette so the side
  view no longer reads as a stack of floating cards.
- The shadow face is now a shallow 3D volume rather than an edge-disappearing
  plane; its blue hood wraps no longer merge into one oversized black opening.
- The hood tail now bends in both the front and side axes instead of existing
  only as a front-view graphic.
- Sampled front/profile walk phases retain a clear hand corridor without the
  former hand-through-fabric collision.

Remaining large-form gate before materials and microdetail:

1. soften the hood crown and tail-root transition in true profile;
2. refine the rear mantle leaves so they drape instead of reading as a broad
   horizontal band;
3. improve the exact side silhouette of boot, sleeve, coat front, and rear
   cloak overlap;
4. obtain Eivind's explicit approval of the final front/side/rear pack.

## Large-form v13 structural gate — passed 2026-08-09

The reopened construction pass now uses a settled twelve-angle turntable rather
than relying on front/side/rear alone. This structural pass is complete, but it
does not claim final 10/10 visual approval and does not authorize M4.

- The ivory garment is a tapered front-wrapping tunic shell with a grounded
  lower slit, not a pale cylinder or detached apron plate.
- Curved side gores stitch the front coat into the rear cloak; shoulder bridges
  and a shared chest parent keep the front capelet and rear mantle continuous
  during animation.
- The rear cloak remains full length with a coherent centre split and holds its
  silhouette through every rear and rear-three-quarter view.
- The hood crown-to-brim transition has an intermediate fabric ring; the tail
  is lower, softly compressed, tapered, and capped at both ends so the former
  open root topology cannot leak through rear angles.
- Boots have a continuous ankle-to-toe volume and staggered ground position in
  true profile. Wrist trim is now an attached solid cuff band, hands remain
  seated in the sleeves, and the staff shaft passes through the authored grip.
- The final three independent gates reported no remaining P0 blocker for
  head/hood, torso/garment, or extremity/staff construction.

Structural evidence:

- `outputs/island5-3d-gauntlet/caretaker-character/large-form-v13/twelve-angle/twelve-angle-turntable-v13.png`
- `outputs/island5-3d-gauntlet/caretaker-character/large-form-v13/twelve-angle/goal-vs-current-v13.png`
- `outputs/island5-3d-gauntlet/caretaker-character/large-form-v13/animation-gate/walk/walk-six-angle-gate-v13.png`
- `outputs/island5-3d-gauntlet/caretaker-character/large-form-v13/animation-gate/greet/greet-six-angle-gate-v13.png`

Verification:

- TypeScript project build passes.
- Production Vite build passes with the existing chunk-size and mixed-import
  warnings.
- Caretaker 3D contract: 4/4 pass inside the canonical Island Run suite.
- Full Island Run suite: 1,690 pass and the same three unrelated Island 1
  baseline failures remain (`islandNarrativeOpeningFlow` fixed-plot manifest,
  construction-state optical centring, and final-camera scenery anchor).

Remaining visual-quality pass before Eivind can decide whether this is 10/10:

1. richer cloth, leather, gold, crystal, pearl, and quilt material response;
2. goal-level tide embroidery and garment-boundary filigree density;
3. softer hood-tail root collar, crown folds, and a stronger one-eye profile;
4. broader natural cloak folds, hem weight, and restrained secondary motion;
5. final staff/boot/cuff ornament refinement without weakening the approved
   twelve-angle construction or mobile budgets.

## Hat-only reopening — active 2026-08-09

Eivind has bounded the next visual-quality pass to the Crown of Tides hat. All
non-hat anatomy, clothing, props, animation, camera, lighting, and phone framing
are frozen for this milestone so the result can be judged as a true before and
after rather than a whole-character redesign.

## Cape-only reopening — active 2026-08-10

After the hat gate passed, Eivind bounded the next visual-quality pass to the
Crown of Tides cape/mantle system. The approved hat, body proportions, staff,
boots, camera and lighting remain frozen.

### Reference lock

- Original front/back/side caretaker goals control silhouette and body fit.
- `docs/visual-references/island-caretaker/island-005/cape-gauntlet-v1/crown-of-tides-cape-construction-goal-v1.png`
  controls layer decomposition only; its generative panel-to-panel variations
  are not literal topology authority.
- Locked construction: one soft wrapped collar/yoke, overlapping shoulder
  capelets, shell-and-pearl clavicle anchors, a small central closure, a
  separate cyan diamond pendant, one continuous open-front royal-blue rear
  cape, and one near-black navy lining joined at its perimeter.
- The pendant is decorative secondary-motion jewelry, never a load-bearing
  cape fastener.

### Structural pass v1

- Replaced the two rear cape slabs and false centre opening with one continuous
  A-line shell that runs from right front edge around the back to left front
  edge.
- Added a separately wound navy lining surface and continuous front-edge/hem
  piping.
- Moved the long cape from the hips-owned outfit root into the same chest-owned
  mantle assembly as its yoke. Walk/greet chest rotation can no longer shear
  the yoke away from the lower drape.
- Preserved the cape as its own named compacted assembly instead of flattening
  its identity into the general mantle batch.
- Added a soft collar, two shell/pearl anchors, central closure and a separately
  animated pendant.
- Replaced dozens of segmented trim bars with three continuous curves so both
  LODs remain inside the existing mobile triangle budgets.

### Current gates

- TypeScript build passes.
- Production Vite build passes with the existing chunk and mixed-import
  warnings.
- Caretaker model contract returns to PASS at both LODs. The full Island Run
  suite returns to 1,690 pass with the same three unrelated Island 1 visual
  baseline failures.
- The cape-only rev30 Gauntlet closes those four items with the evidence and
  caveats below. M4 still waits for Eivind's visual approval of the complete
  caretaker before live-board placement.

### Cape-only rev30 gate result — passed 2026-08-10

- Replaced the planar rear badge with a closed-thickness parametric yoke that
  wraps from the centre back around both shoulders. Its gold lower trim and
  cyan tide line sample the same curved surface, so they cannot float off it.
- Reshaped both front capelet leaves into thin, open-centre shoulder layers.
  The outer and navy underlayer now cup the shoulder instead of forming one
  straight padded panel across the chest.
- Joined the outer cape and inward navy lining with explicit left, right and
  hem perimeter walls. The long open-front shell remains one chest-owned
  garment with no false rear split.
- Increased broad gravity folds and irregular hem weight, then added one gold
  band, one cyan band and four bounded High-only tide curls. Low keeps the same
  identity without the extra curls.
- Added deterministic `part=cape` and `part=cape&mapStripped=1` lab evidence
  modes so later cape reviews can inspect the real garment without the hat,
  body, staff or platform masking its construction.
- Captured 37 final browser proofs: eight angles each for idle, walk and greet;
  the reciprocal walk extreme at four angles; isolated axial cape views;
  map-stripped blockout; and Low-LOD walk views. Evidence lives in
  `docs/visual-references/island-caretaker/island-005/cape-gauntlet-v1/renders/rev30/`.
- The mandatory axial turntable gate passes with no collapsed view. Human
  review scores the mobile semantic match at 0.83 and records all eight build
  passes as complete in `cape-sculpt-spec.json`.
- The deterministic pixel gate is retained as an advisory failure (IoU 0.236):
  it compares a tall realistic isolated cloak with a deliberately squat chibi
  wearer. Chasing that number would force the cape through the boots/platform,
  so the mismatch is documented rather than hidden.
- High remains under the complete-character 35k ceiling; Low passes the 12k
  ceiling. The caretaker contract passes, production build passes, and Island
  Run architecture guards report zero violations. Full Island Run tests remain
  1,690 pass / three unrelated Island 1 visual-baseline failures.
- Internal cloth decorations remain material-batched for phone draw-call
  economy. The cape is interaction-ready at its module root, but decorative
  subpanels are intentionally not separately explodable; this is recorded as
  the only skipped img2threejs assembly sub-gate.

### Mission and source lock

- Derive one isolated, internally coherent hat turnaround from the approved
  front, side, and rear caretaker goals in
  `docs/visual-references/island-caretaker/island-005/`.
- The reference must describe one physical hat at eight equal-scale angles:
  front, front-right, right, rear-right, rear, rear-left, left, and front-left.
- Preserve the wide soft brim, deep hood opening, asymmetric folded crown,
  weighted tapering tail, pearl finial, central crystal crest, blue woven cloth,
  cyan tide embroidery, and gold edge construction. Do not invent a new hat.
- The isolated reference contains no body, face, eyes, hands, or staff. The dark
  underside/opening may remain because it is part of the hat construction.

### Acceptance gates

1. **Reference-coherence gate:** adjacent angles agree on brim width/thickness,
   crown mass, tail route, crest placement, embroidery continuity, and pearl
   location. A visually attractive but contradictory sheet fails.
2. **Geometry gate:** the live hat reads as soft constructed fabric rather than
   a hard cone, platter brim, segmented hose, floating collar, or detached trim.
3. **Surface gate:** gold/cyan ornament follows the authored hat surfaces and
   remains legible in the 390x844 phone close-up without overwhelming the cloth.
4. **Motion gate:** idle, walk, and greet preserve the approved head rig and do
   not expose holes, clipping, detached ornaments, or unstable tail motion from
   any major angle.
5. **Budget gate:** High and Low remain inside the existing character budgets;
   no second renderer, new gameplay authority, or non-hat model change is
   permitted.
6. **Comparison gate:** capture identical caretaker close-ups before and after
   at the eight locked angles, plus a front/side/rear goal-current comparison.
   The milestone remains open until the after pack is visibly stronger.

### Stop and rollback

- Stop before modelling if the generated hat turnaround contradicts the locked
  front/side/rear goals.
- Stop and revise if an improvement is visible only in one hero angle or harms
  the opposite/rear view.
- Keep the current v13 hat implementation recoverable as the exact baseline;
  revert only the bounded hat assembly if the new version fails motion or budget
  gates.

### Hat-only v21 gate result — passed 2026-08-09

- The corrective twelve-panel construction goal is locked at
  `docs/visual-references/island-caretaker/island-005/hat-gauntlet-v1/crown-of-tides-hat-construction-goal-v2.png`.
- The crown and tail are sealed at the narrow top. The tail grows from a
  zero-width root buried inside the closed crown overlap; the previous visible
  oval/socket is absent across idle, walk, and greet at eight angles each.
- The broad brim has a separate top, dark underside, inner/outer walls, sag,
  asymmetric lift, and a weighted gold edge. It no longer uses the legacy flat
  cyan plate.
- The widened greet gesture keeps the hand outside and in front of the brim;
  the earlier rear-side finger-through-brim collision is closed.
- Exact runtime budgets pass: Low is 11,954 triangles (2,656 hat), 12 model
  materials, seven compacted hat batches; High is 34,310 triangles (7,280 hat),
  13 model materials, eight compacted hat batches; both use zero skinned draws.
- Topology audit found no boundary or non-manifold edges in the tail and no
  crown boundary at the upper/root region. The crown's remaining boundary is
  its intentional lower hem above the separately constructed brim.
- Final evidence:
  `outputs/island5-3d-gauntlet/caretaker-character/hat-only-v1/hat-before-after-matched-four-angle-comparison.png`,
  `outputs/island5-3d-gauntlet/caretaker-character/hat-only-v1/after/hat-after-idle-eight-angle-sheet.png`,
  `outputs/island5-3d-gauntlet/caretaker-character/hat-only-v1/after/hat-after-walk-eight-angle-sheet.png`,
  and
  `outputs/island5-3d-gauntlet/caretaker-character/hat-only-v1/after/hat-after-greet-eight-angle-sheet.png`.
- The hat milestone passes its structural, top-hole, budget, and captured-pose
  motion gates. It is an honest strong improvement, not a claim of final
  10/10 surface fidelity. Future P1 work remains: softer crown-tail crease,
  subtler crown compression, richer irregular tail folds, rounder brim lip,
  denser wraparound embroidery/crest filigree, and live temporal/device proof.

## Non-negotiables

- One master skeleton and animation library; no island-by-island re-rigging.
- Island variants share the base body, proportions, hood/face grammar, and interaction semantics.
- Clothing changes must go beyond palette swaps through modular silhouette pieces, patterns, materials, props, and restrained VFX.
- The caretaker does not become gameplay state authority and does not write progression from the render loop.
- The caretaker may step onto the board visually but must use a dedicated safe interaction marker beside the route, never occupy or redefine a player tile.
- One WebGL renderer only.
- Reduced-motion and low-quality modes remain complete and understandable.
- No broad production of later-island outfits until the Island 5 vertical slice passes visual and device gates.

## Reference lock required before modelling

The master-character pack needs six coherent views:

1. canonical three-quarter hero view;
2. neutral front turnaround view;
3. neutral side turnaround view;
4. neutral back turnaround view;
5. hood, shadow-face, hands, staff, and signature-accessory close-ups;
6. Island 5 clothing/material board showing fabric, pattern, trim, colour, staff, and magical accent.

Existing caretaker images from Islands 1–5 should also be supplied as identity and costume evidence. If orthographic views do not exist, generate and critique them as a coherent pre-production reference pack before modelling.

### Identity decision — approved 2026-08-09

- Canonical identity anchor: `docs/visual-references/island-caretaker/island-005/caretaker-crown-of-tides-hero-v1.png`.
- Locked modelling views: `caretaker-crown-of-tides-front-v1.png` and the sturdier `caretaker-crown-of-tides-side-v2.png` in the same folder.
- Rear construction candidate: `caretaker-crown-of-tides-back-v1.png`.
- Production detail candidate: `caretaker-crown-of-tides-detail-sheet-v1.png`.
- Island 5 swappable costume/material candidate: `caretaker-crown-of-tides-material-board-v1.png`.
- Eivind approved this exact compact, hooded, cyan-eyed caretaker as the caretaker identity.
- Later turnaround images may change only camera angle and neutral modelling pose. They must not redesign proportions, hood, shadow face, eyes, clothing construction, staff, palette, materials, or personality.
- The calm cyan eye glow is the default expression, not a baked permanent face. Eye aperture/shape, emissive intensity, subtle colour tint, blink timing, and occasional mouth glow must be separately controllable by the animation system for emotional reactions while preserving the shadowed-face identity.

## Recommended asset architecture

- `caretaker-master.glb`: shared neutral body, skeleton, hood grammar, hands, and animation clips.
- Named modular nodes: hood, mantle, robe, sleeves, belt, shoulders, boots, staff, amulet, island accessory A/B.
- Per-island manifest: palette, pattern textures, enabled accessories, staff variant, emissive colour, idle personality weights, home marker, interaction marker, and scale.
- Shared clips: idle-breathe, idle-look, idle-magic, walk, wave/invite, point, talk-gentle, talk-emphatic, think, react/startled, bow/celebrate.
- Shared facial-emissive states: calm/attentive, curious, delighted, concerned, surprised, wise/thoughtful, and urgent; blend these independently from body clips so dialogue and movement can overlap naturally.
- Blend between clips through one `AnimationMixer`; never snap between poses during normal motion.
- Load the master once and lazy-load only the active island's outfit textures/accessories.

## Pilot performance budget

- High model: target 25k–35k visible triangles, at most 55 bones, at most two skinned draw calls.
- Low LOD: target 8k–12k triangles, simplified accessories, no dynamic character shadow.
- Base rig/animation payload: target at most 3 MB compressed.
- Active island outfit payload: target at most 1.5 MB compressed.
- High-quality phone: no more than 10% frame-time regression from the approved Island 5 scene.
- Low-quality phone/PWA: animation may update at a reduced cadence, but walking and conversation gestures remain readable.
- Textures: 2K only for high close-up use; 1K standard; 512 or atlas fallback on low.

## Milestones and acceptance evidence

### M0 — Identity and turnaround lock

- **Passed 2026-08-09.** Eivind approved the coherent six-view reference pack as the modelling lock.
- The hooded caretaker identity, body proportions, skeleton, shadow-face grammar and emissive-expression system are shared. Crown of Tides fabric, palette, patterns, staff and accessories are explicitly Island 5 costume modules.
- Evidence: `docs/visual-references/island-caretaker/island-005/`.

### M1 — Character lab master

- **Passed 2026-08-09.** `/dev/caretaker-character-lab` provides a 390×844 lab, turntable/manual rotation, three camera framings, wireframe, skeleton, LOD and motion controls.
- The reusable procedural Three.js master has a 17-bone articulated hierarchy, modular outfit nodes, independent emissive face controls and explicit disposal ownership.
- The model contract confirms High remains inside the approved 25k–35k close-up range, Low remains at or below 12k, both share the 17-bone master, and both use zero skinned draw calls.
- The final exact-phone v8 pack proves front/right/rear/left completeness, phone-safe staff and gestures, High/Low presentation, and the strict goal comparison.

### M2 — Shared animation library

- **Passed 2026-08-09.** Idle, walk, greeting, gentle talk, point, react and celebrate share one blended update system.
- Calm, curious, delighted, concerned, surprised, thoughtful and urgent face states blend independently from body motion.
- Reduced-motion preview preserves readable posture and expression without full ambient motion.
- Closing evidence includes five expressive action frames, twelve walk frames across three phases and four angles, deterministic reduced-motion proof, and all four character-model contract tests.

#### Animation playback corrective pass — candidate 2026-08-10

M2 was reopened after the part-by-part model review exposed an important lab
failure: a `poseTime` Gauntlet URL permanently held the animation clock, so
selecting Walk or another clip could look broken even though the procedural rig
was updating correctly. `poseTime` now initializes a deliberately paused still
frame with an explicit explanation and Play, Pause, Restart, and 0.5–1.25×
speed controls. Selecting any shared animation resumes live playback.

The walk was also rebuilt around the caretaker's short, robe-heavy silhouette.
It now alternates one planted boot and one swing boot, uses a restrained pelvis
rise and stride, keeps the staff hand stable, and limits free-arm counter-swing
to the coat-safe corridor. Clip phase is local to its selection time, while the
existing 0.34-second blend keeps normal transitions from snapping. Reduced
motion continues to freeze a readable authored pose.

Gate evidence:

- deterministic front and side contact-pose sweeps at the two opposite
  half-cycles;
- interactive proof that a frozen `poseTime` frame resumes to live playback;
- interactive switching from Walk to Greet while playback remains live;
- 1,692 Island Run tests passing, including the new planted-boot and local
  clip-clock contracts; the three failures remain the pre-existing unrelated
  Island 1 camera-anchor baselines;
- TypeScript project build, Vite production build, and Island Run architecture
  guard all pass.

This corrects the shared lab/animation layer only. It does not itself pass M4:
world-space travel between the Island 5 home and interaction markers remains a
scene-controller task after the complete character surface is approved.

### M3 — Crown of Tides outfit

- **Passed 2026-08-09.** `CROWN_OF_TIDES_OUTFIT` is an Island 005 configuration layered over the shared body/rig/face/animation system.
- Blue woven and quilted fabrics now use normal and roughness maps; gold/cyan tide filigree is seam-safe and region-authored with quiet cloth areas; gold trim follows actual garment boundaries rather than floating full-body hoops.
- Pearls, crystals, cape and staff remain modular costume content, not caretaker identity. The final 360° proof shows complete front, side and rear authorship with no hand-through-fabric or trim detachment.

#### Shoe-only corrective pass — candidate 2026-08-10

Eivind rejected the prior shoe gate at 6/10. That rejection supersedes the v1
technical acceptance. The corrective v2 pass replaces the visible
loafer-plus-cylinder assembly with one continuous toe-to-shaft boot loft,
grounds the heel counter at the sole, extends the gold welt beyond the toe,
adds a shaped heel, and uses boot-specific embossed leather plus restrained
blue-gold quarter ornament.

The candidate is recorded at 0.85 rather than self-certified as 10/10. High and
Low mobile contracts pass; the production build passes; the full Island Run
suite is back to its three unrelated Island 1 baseline failures. Evidence and
the honest remaining delta are in
`docs/visual-references/island-caretaker/island-005/shoes-gauntlet-v2/review/final-critique.md`.

### M4 — Live Island 5 integration

**Implemented 2026-08-10 as the approved two-tier pilot.** The always-on board
actor is now a purpose-built silhouette-first LOD using the same 17-bone rig,
outfit identity and animation IDs as the High master. At Eivind's review it was
reduced to `0.36` scale so it reads approximately as a small topiary rather
than competing with a landmark. A separate invisible hit volume preserves a
forgiving phone target. Tapping focuses the existing island camera and opens
the canonical caretaker flow; only then is the High master constructed in the
same renderer, and it is disposed when the encounter closes.

Evidence and the honest multi-angle review are in
`docs/visual-references/island-caretaker/island-005/board-lod-gauntlet-v1/`.

- Place the caretaker at a designed home point outside the tile route.
- Add deterministic ambient idles and a short bounded wander path.
- On an existing caretaker interaction trigger, walk to the board-side marker, turn to the player/camera, gesture, and open the canonical conversation.
- Return to the home loop after the interaction.
- Evidence: phone capture of idle, approach, interaction, conversation open, and return.

### M5 — Device and behaviour gate

- Validate 390×844 presentation, touch target, occlusion, camera framing, reduced motion, low/high quality, iOS Capacitor, and PWA.
- Confirm that the caretaker never blocks token movement, landmarks, Build mode, or modal ownership.
- Evidence: production build, Island Run tests, architecture guards, device FPS comparison, and iPhone capture.

### M6 — Scale template

- Document the outfit manifest and authoring checklist for later islands.
- Prove a second deliberately different costume on the same rig before scaling.
- Evidence: Island 5 plus one contrasting biome variant with the same skeleton and clips.

## Rollback and recovery

- Keep the current flat caretaker affordance as an automatic fallback when the GLB fails, quality is unsupported, or the 3D scene is unavailable.
- Feature-gate the 3D caretaker independently of dialogue content.
- Do not remove current conversation assets or triggers during the pilot.

## Stop conditions

- Stop and revise the reference pack if front/side/back views disagree materially.
- Stop before Island 5 integration if robe/hood deformation, payload, or phone frame-time gates fail.
- Stop before production scaling if the second costume reads as a palette swap or requires a new skeleton.

## Immediate next gate

M4 now passes its code, phone-composition and two-tier LOD gate. The next gate
is M5 physical-device validation: confirm the tiny board actor's tap comfort,
camera move, encounter framing, reduced-motion behaviour and frame pacing in
the iOS Capacitor build, then repeat the flow in the PWA. Do not begin the M6
multi-island scale template until that device evidence is accepted.
