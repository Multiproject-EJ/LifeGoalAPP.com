# Rounded figure and same-pose card pop-out — 2026-09-19

## Scope and truth

User requested a tiny, round 4/10 figure, then clicking the card image to lift a 3D figure from the same pose. Implemented one local prototype: Bloom Mite form 2, separate 3D study edition. Original candidates are unchanged. This does not add any approved production forms or fake 3D support for other families.

The card poster is captured from `createBloomScene`, the same model/camera/lighting used by the live canvas. The image is not the generated concept: it is an actual model render, so a different model is not disguised by a crossfade. Starting bounds come from the clicked image. The model lifts with no initial rotation, then supports pointer and keyboard rotation, reset, and return/Escape. Reduced motion skips the lift. State stays in this review UI; no saved team or economy changes.

## Roughness and limitations

This is a static assembled ellipsoid maquette. No rig, facial animation, exact PBR recovery, original-art likeness or finished creature is claimed. Back/underside are inferred. Expression remains weak and must be reviewed before mass modelling. Model pass is blockout only; later sculpt/material/rigging passes are not complete. Rig and full-original-art modelling are deliberately outside this 4/10 slice. Single active, lazily loaded WebGL renderer; render only on changes; close releases GPU resources.

## Asset provenance

Built-in image-generation tool, not CLI. Input identity reference: `public/assets/creatures/candidates/bloom-mite/form-2-v2.png`.

First generated study: `/Users/ejmac/.codex/generated_images/01a09804-1202-7ac3-af05-9038935a9915/exec-9d4d1d4d-08d9-44eb-8f67-90067139805b.png`. Rejected for pointed feline face and excessive leaf detail.

Selected rounded concept: `public/assets/creatures/style-studies/bloom-rounded/concept-v2.png`, copied from `/Users/ejmac/.codex/generated_images/01a09804-1202-7ac3-af05-9038935a9915/exec-24a13e4d-469a-40d9-985e-5a245ecae69e.png`.

Runtime poster: `public/assets/creatures/style-studies/bloom-rounded/model-poster-v1.png`, captured from local Three.js. Model source `src/features/creature-system/BloomBlockout.ts`, data `bloomBlockout.data.json`; spec/intake under `.img2threejs/bloom-card-pop/`. These two representations must not be confused.

### Exact initial prompt

Use case: stylized-concept
Asset type: rough alternate 3D-style creature figure study, not a finished card.
Input image 1: identity reference only, Bloom Mite form 2, whose huge layered complexity should be simplified.
Primary request: show this invented creature as a TINY, much rounder, squat tabletop-sized 3D clay blockout, only 4/10 production finish, not elaborate polished concept art. One figure, whole body, front three-quarter view on a neutral warm grey studio floor.
Preserve recognisable family landmarks: low broad rose-pink petal body, six short leaf-pad supports, two forward-curving amber bud antennae, two folded petal mantle lobes, caring/tender attentive expression. Make its small eyes deeply inset amber seed slits, not shiny round baby eyes. The frontal face is a flat overlapping petal mask integrated into the body, without any cat nose, cat muzzle, mammalian cheeks, ears or whiskers. Soft inward lifted brow-petals suggest compassionate attention, not sleep or anger.
Simplify to about twelve large smooth rounded petal plates rather than hundreds of leaves; short thick antenna curves, stubby pads, broad blunt mantle edges. Soft matte clay, dusty rose, muted moss green and warm amber. No veins, fur, gold filigree, tiny surface decorations or fantasy particles. No bird wings; mantle is attached fleshy petal anatomy. Keep it an invented organism rather than a recognisable animal.
Composition: square image, single small figure occupies about 65 percent of image height, plenty of quiet breathing room, gentle contact shadow, readable volume. Plain grey background, no pedestal, no props, no card, no text. This is a quick simple 3D maquette appearance, not photoreal and not the original painterly edition.

### Exact revision prompt

Use case: precise-object-edit
Input image 1 is the edit target: the pink clay Bloom creature just generated.
Make one focused shape-language correction: this must look like a rough, tiny, ROUND 3D blockout of an invented petal organism, NOT a cat face covered in leaves.
Keep the same rose/moss/amber palette, six-pad low body, two bud antennae and same camera/background.
Replace the entire pointed heart-shaped face with one smooth broad rounded oval pink petal plate, embedded directly into the squat body. No separate cheeks, nose, muzzle, chin, fur or mouth. Make two very small amber horizontal inset sensory slits high on this oval plate, with gently raised INNER edges for kind concern, not fierce eyebrows. No round glossy pupils. Compassion should come from a slight curious caring tilt of the broad plate and forward antenna lean.
Round off ALL pointed shell petals into big soft oval lobes, fewer than 14 main visible lobes; short stubby leaf pads. Halve the antenna height, keep blunt round amber buds. Remove all tiny texture and fine leaf subdivisions from the entire figure. Smooth simple matte clay, 4/10 rough modelling, not high-detail resin sculpture. Preserve full body visibility and shadow. No text, no card, no other objects.

## Verification

Completed: 31 behaviour tests, targeted TypeScript and isolated build; 74 assets packaged. Popout browser checks pass at 1440/390/320, including reset pixel equality, focus return, nested-dialog Escape, retained scroll lock, reduced motion and WebGL fallback. 26 named parts, 18,720 rendered triangles. Three.js remains a lazy 130 KB gzip chunk rather than a catalogue boot cost.

Model gates are deliberately NOT reported complete: strict spec validation passes, but concept-to-model Tier 1 fidelity fails (IoU 0.603, scale delta 0.305, aspect delta 0.054). Multi-angle silhouettes remain volumetric (ratios 0.980–1.072), which proves only non-degeneracy, not likeness. This is a rough interaction blockout, not an accepted reconstruction. Do not advance model production based on the UI pass. Original material/sculpt accuracy and a more expressive face remain open. No high-fidelity visual approval was recorded.

Part-name audit initially normalised negative/positive numeric side IDs to the same name; renamed sides explicitly left/right without changing geometry. Early headless software-renderer test stalled and was stopped; standard Chrome completed. The first nested Escape test caught bubbling into the parent dialog; fixed with cancel-event propagation isolation.

Run `scripts/check-creature-popout.mjs` with the bundled Node/Playwright/Chrome. It regenerates the pose poster and captures desktop, 390px and 320px, rotation/reset, focus and nested scroll-lock restoration, reduced motion and simulated WebGL failure. Evidence in `docs/qa/creature-system/popout/`. This is interaction verification, not full art approval.
