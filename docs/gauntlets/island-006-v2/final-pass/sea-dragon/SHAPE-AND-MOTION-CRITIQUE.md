# Water dragon: shape and motion gate proposal

Read-only critique from final-pass/baseline-details-v001 dragon-erupt/flight/dive originals, saved sea-dragon target, and current runtime APIs. No model or camera edits.

## What currently weakens the reveal
Flight shows a thick inflated tube with little neck transition, an assembled face with large circular eye, separate jaw/nose masses, straight needle horns and wings reading as triangular sails. Material shine amplifies the primitive construction. The silhouette needs continuous anatomical rhythm before scales or effects.

The file named dragon-erupt shows only the aperture interior: no visible dragon. Do not score it as successful eruption evidence. Capture metadata/time and readiness must be checked; it may be an intentionally earlier beat or a stale/misaligned sampled pose.

The file named dragon-dive shows a small, almost horizontal dragon far above the island. This neither demonstrates a convincing dive nor proves water entry. Need pose/time sequence rather than labels alone.

## One tightly coupled macro unit
Treat head + jaw + neck + continuous body taper + both shoulder/arm/wing assemblies + tail fluke as ONE dragon macro approval unit. Independent head/wing workers with incompatible attachment scales are high risk here.

Build a continuous slender serpentine torso with a distinct but smooth neck rise; keep a controlled head/body ratio, integrated muzzle and brow, modest gold eyes, curved swept horns, paired whiskers and cream underside. Wing shoulder→upper arm→forearm→wrist→three tapered fingers→scalloped membrane must form one readable skeleton and silhouette. Tail should taper before opening into its paired fluke. Keep moving sockets stable.

The generated target is secondary-inferred. It supports silhouette and anatomy but has inferred wing-ray variation; enforce the written three-finger constraint, not every generated ray. Fine scales are finish, not a substitute for shape.

## API and ownership seams
- Island22WaterDragonMission.ts owns dynamic body mesh, points, wing groups, wrapped dive sheets, fins, phases, root motion and camera.
- createDynamicDragonBody updates continuous ring vertices from points, facing and extension. Current local frame flips reference axis at tangent dot threshold. A smoother transported frame should avoid belly/tube twisting at vertical launch and dive; test continuity across threshold.
- Island22IconicWaterDragonParts.ts exports root/headPivot/jawPivot/crownPivot, gill/whisker/ram-shield/water-stream pivots, body/neck/throat/ramImpact/streamTip/eyeAim sockets, setStreamDirection/updateAttack/setJawOpen/dispose. Preserve runtime shape or provide compatible adapter.
- Head is currently scaled anisotropically (~3.55XY,2.35Z), translated forward by2.30*scaleZ, while body extends2.05*scaleZ. Refit both together using neck/body socket measurements; changing only head geometry risks a visible gap or huge collar.
- Current jaw minimum .44 exists deliberately for shark teeth visibility. A friendlier resting jaw is a visual change needing root's explicit decision; preserve attack release cues and socket directions.
- WingGroups pivot at points[6]; existing animation blends Euler folding, quaternion dive orientation and nonuniform shrink, while separate wrapped sheets appear at diveFold>.08. Reconstruct as coordinated shoulder/elbow/finger articulation; eliminate duplicate wing overlap during crossfade. Keep existing phase envelope times.
- Island22DragonV2.ts supplies analytic scale shading and a neck lathe helper; these are surface/geometry utilities, not mission state.
- Preserve fish threshold78kg, phase boundaries,23.5s cinematic contract,21.45s water contact,22.6s render cutoff, repair presentation API and canonical gameplay state.

## Forbidden failures
No detached neck collar, eye stickers, bead-face clusters, straight oversized needles, balloon torso, rectangular/triangle sail wings, backward elbows, extra duplicate membrane during fold, tail stump, flipping belly frame, or geometry popping at phase boundaries. No camera fix that hides failed topology. No effects blanket that conceals the dragon at reveal or impact. No successful verdict from one flattering still.

## Macro camera and pose packet
Neutral studio: front, rear, both sides, front/rear three-quarter, top, underside, clay front/rear. Supply extended-wing neutral and folded-wing poses with identical anatomy. Close crops of head-neck join and each shoulder-wrist chain supplement whole-creature views.

Actual mission:0,5.2,7.18,7.8,8.6,10.2,11.8,13.4,15.2,18.2,19.2,20.3,21.3,21.45,21.8,22.6,23.5 seconds; screenshot timestamps must be real update values. Use matched landscape and phone portrait framing. Include short real-time sequence for launch→unfurl→flight and fold→dive→impact; stills cannot prove fluid animation.

Motion priorities: launch should feel like tension released through a long body; shoulders lead wing opening, fingers follow; flight alternates a deliberate downstroke and brief glide with a phase-lagged tail wave; dive banks/turns head first, torso follows, wings tuck before water contact, fluke trails through the aperture. Preserve timing while changing shape interpolation and pose amplitude. Reduced motion should retain readable poses and path with suppressed shake/flap.

Camera must retain full body/wings at reveal, then give a readable facial/wing silhouette beat with island scale context. Portrait must not clip horn/wingtip/tail, and dive should not become a tiny distant horizontal shape. Root may approve visual camera/path changes explicitly while keeping mission event schedule.

## Acceptance evidence
Independent macro gate >=.85 per critical shape/attachment/pose, then finish gate, then temporal/portrait gate. Record weakest criterion and exact defect locations, preserve rejected captures, one bounded correction per construction family. Check vertex finiteness and bounds at all sampled times, continuity near frame switches, exact reset on seeking, reduced-motion behavior and disposal. Existing mission phase tests remain authoritative for timing. No claim of animation quality based solely on screenshots.
