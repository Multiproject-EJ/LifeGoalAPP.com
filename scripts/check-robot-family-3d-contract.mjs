import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const modelPath = path.join(root, 'src/features/gamification/level-worlds/dev/RobotFamilyThreeModel.ts');
const labPath = path.join(root, 'src/features/gamification/level-worlds/dev/RobotFamilyThreeLab.tsx');
const theatrePath = path.join(root, 'src/features/gamification/level-worlds/dev/RobotConstructionTheatre.ts');
const presentationPath = path.join(root, 'src/features/gamification/level-worlds/services/islandRunConstructionPresentation.ts');
const islandPilotPath = path.join(root, 'src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx');
const islandBoardPath = path.join(root, 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
const levelDeltaPath = path.join(root, 'src/features/gamification/level-worlds/dev/IslandConstructionLevelDelta.ts');
const constructionAuthoringPath = path.join(root, 'src/features/gamification/level-worlds/dev/IslandConstructionAuthoring.ts');
const scaffoldPath = path.join(root, 'src/features/gamification/level-worlds/dev/IslandConstructionScaffold.ts');
const mainPath = path.join(root, 'src/main.tsx');
const specPath = path.join(root, '.img2threejs/robot-family/robot-family-sculpt-spec.json');
const v6SpecPath = path.join(root, '.img2threejs/robot-family-v6/robot-family-v6-sculpt-spec.json');
const v7SpecPath = path.join(root, '.img2threejs/robot-family-v7/robot-family-v7-sculpt-spec.json');
const v8SpecPath = path.join(root, '.img2threejs/robot-family-v8/robot-family-v8-sculpt-spec.json');
const v9SpecPath = path.join(root, '.img2threejs/robot-family-v9/robot-family-v9-sculpt-spec.json');
const v10SpecPath = path.join(root, '.img2threejs/robot-family-v10/robot-family-v10-sculpt-spec.json');
const v11SpecPath = path.join(root, '.img2threejs/robot-family-v11/robot-family-v11-sculpt-spec.json');
const v12SpecPath = path.join(root, '.img2threejs/robot-family-v12/robot-family-v12-sculpt-spec.json');
const v13SpecPath = path.join(root, '.img2threejs/robot-family-v13/robot-family-v13-sculpt-spec.json');
const v14SpecPath = path.join(root, '.img2threejs/robot-family-v14/robot-family-v14-sculpt-spec.json');
const v15SpecPath = path.join(root, '.img2threejs/robot-family-v15/robot-family-v15-sculpt-spec.json');

const model = fs.readFileSync(modelPath, 'utf8');
const lab = fs.readFileSync(labPath, 'utf8');
const theatre = fs.readFileSync(theatrePath, 'utf8');
const presentation = fs.readFileSync(presentationPath, 'utf8');
const islandPilot = fs.readFileSync(islandPilotPath, 'utf8');
const islandBoard = fs.readFileSync(islandBoardPath, 'utf8');
const levelDelta = fs.readFileSync(levelDeltaPath, 'utf8');
const constructionAuthoring = fs.readFileSync(constructionAuthoringPath, 'utf8');
const scaffold = fs.readFileSync(scaffoldPath, 'utf8');
const main = fs.readFileSync(mainPath, 'utf8');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const v6Spec = JSON.parse(fs.readFileSync(v6SpecPath, 'utf8'));
const v7Spec = JSON.parse(fs.readFileSync(v7SpecPath, 'utf8'));
const v8Spec = JSON.parse(fs.readFileSync(v8SpecPath, 'utf8'));
const v9Spec = JSON.parse(fs.readFileSync(v9SpecPath, 'utf8'));
const v10Spec = JSON.parse(fs.readFileSync(v10SpecPath, 'utf8'));
const v11Spec = JSON.parse(fs.readFileSync(v11SpecPath, 'utf8'));
const v12Spec = JSON.parse(fs.readFileSync(v12SpecPath, 'utf8'));
const v13Spec = JSON.parse(fs.readFileSync(v13SpecPath, 'utf8'));
const v14Spec = JSON.parse(fs.readFileSync(v14SpecPath, 'utf8'));
const v15Spec = JSON.parse(fs.readFileSync(v15SpecPath, 'utf8'));

assert.match(model, /'heavy-worker':\s*1\.18/);
assert.match(model, /'project-manager':\s*1/);
assert.match(model, /'mini-artist':\s*0\.5/);
assert.equal(spec.componentTree.length, 58, 'strict sculpt spec must keep the full robot and construction inventory');
assert.equal(spec.materials.length, 8, 'strict sculpt spec must keep the material families');
assert.equal(spec.preSpecAssessment.objectClass.primaryDomain, 'hybrid');
assert.equal(spec.materialPipeline.status, 'proceed');
assert.equal(v6Spec.targetId, 'robot-family-v6');
assert.equal(v6Spec.componentTree.length, 69, 'v6 must preserve the 65-part v5 model and add four explicit Heavy Worker structural systems');
for (const componentId of [
  'heavy-front-armor-shell-system',
  'heavy-shoulder-root-integration',
  'heavy-modular-service-belt',
  'heavy-crown-linkage-mechanisms',
]) {
  assert.ok(v6Spec.componentTree.some((component) => component.id === componentId), `v6 is missing ${componentId}`);
}
assert.equal(v7Spec.targetId, 'robot-family-v7');
assert.equal(v7Spec.componentTree.length, 73, 'v7 must preserve v6 and add the four Heavy Worker correction targets');
const v7Canopy = v7Spec.componentTree.find((component) => component.id === 'heavy-raised-canopy-system');
assert.equal(v7Canopy?.primitive, 'lathe', 'v7 canopy must use the profile-driven lathe correction');
assert.equal(v7Canopy?.geometryDescriptor?.latheProfile?.length, 11, 'v7 canopy must retain its closed 11-point radial profile');
assert.equal(v7Spec.reviewHistory.length, 3, 'v7 must stop after three bounded blockout correction reviews');
assert.equal(v7Spec.reviewHistory.at(-1)?.estimatedFidelity, 0.69, 'v7 review must retain the honest non-acceptance score');
assert.equal(v7Spec.reviewHistory.at(-1)?.action, 'refine-code', 'v7 must record the unresolved correction that triggers the 3/3 hard stop');
assert.equal(v8Spec.targetId, 'robot-family-v8');
assert.equal(v8Spec.componentTree.length, 76, 'v8 must preserve v7 and add three focused Heavy Worker correction systems');
for (const componentId of [
  'heavy-v8-chest-shell-continuity',
  'heavy-v8-articulated-hand-system',
  'heavy-v8-segmented-canopy-system',
]) {
  assert.ok(v8Spec.componentTree.some((component) => component.id === componentId), `v8 is missing ${componentId}`);
}
assert.equal(v8Spec.reviewHistory.length, 3, 'v8 must stop after three bounded blockout correction reviews');
assert.equal(v8Spec.reviewHistory.at(-1)?.estimatedFidelity, 0.62, 'v8 must retain the honest non-acceptance score');
assert.equal(v8Spec.reviewHistory.at(-1)?.action, 'refine-code', 'v8 must record unresolved visual debt at the hard stop');
assert.match(model, /v8HandArchitecture = 'broad-palm-gold-knuckle-rail-four-curled-two-link-digits'/);
assert.match(model, /v8CanopyFrame = 'rolled-base-hoop-five-front-ribs'/);
assert.match(model, /lift: \[-150, -40, 150, 40,/);
assert.equal(v9Spec.targetId, 'robot-family-v9');
assert.equal(v9Spec.componentTree.length, 80, 'v9 must preserve v8 and add four explicit mass, optics and lift systems');
for (const componentId of [
  'heavy-v9-load-forearm-hand-system',
  'heavy-v9-torso-mass-envelope',
  'heavy-v9-amber-canopy-material-system',
  'heavy-v9-object-driven-lift-system',
]) {
  assert.ok(v9Spec.componentTree.some((component) => component.id === componentId), `v9 is missing ${componentId}`);
}
assert.equal(v9Spec.reviewHistory.length, 3, 'v9 must stop after three bounded blockout reviews');
assert.equal(v9Spec.reviewHistory.at(-1)?.estimatedFidelity, 0.72, 'v9 must retain the honest hard-ceiling score');
assert.equal(v9Spec.reviewHistory.at(-1)?.action, 'refine-code', 'v9 must preserve the remaining reference-density debt');
assert.match(model, /v9LoadHandArchitecture = 'oversized-load-palm-deep-forearm-four-curled-digits'/);
assert.match(model, /v9TorsoEnvelope = 'tall-dense-load-bearing-ovoid'/);
assert.match(model, /v9-lift-load-yoke/);
assert.match(model, /heavyMotion === 'lift'/);
assert.equal(v10Spec.targetId, 'robot-family-v10');
assert.equal(v10Spec.componentTree.length, 84, 'v10 must preserve v9 and add four explicit reference-density finish systems');
for (const componentId of [
  'heavy-v10-deep-amber-optics',
  'heavy-v10-shoulder-cartridge-upper-arm-system',
  'heavy-v10-fixed-review-hand-framing',
  'heavy-v10-service-belt-detail-system',
]) {
  assert.ok(v10Spec.componentTree.some((component) => component.id === componentId), `v10 is missing ${componentId}`);
  assert.match(model, new RegExp(`['"]${componentId}['"]`), `v10 runtime component mapping is missing ${componentId}`);
}
assert.equal(v10Spec.reviewHistory.length, 6, 'v10 must retain three blockout and three bounded structural reviews');
assert.equal(v10Spec.reviewHistory.at(-1)?.estimatedFidelity, 0.82, 'v10 must retain its honest final structural estimate');
assert.equal(v10Spec.reviewHistory.at(-1)?.action, 'refine-spec', 'v10 structural hard ceiling must route to a fresh multi-reference spec without inventing acceptance');
assert.ok(v10Spec.sculptPipeline.completedPasses.includes('blockout'), 'v10 must preserve its completed blockout gate');
assert.match(model, /v10AmberOptics = 'clear-amber-segmented-optical-glazing-with-deep-edge-attenuation'/);
assert.match(model, /v18-canopy-inner-optical-well/);
assert.match(model, /transmission: 0\.42/);
assert.match(model, /attenuationDistance: 0\.5/);
assert.match(model, /v10ShoulderDensity = 'rectangular-cartridge-gunmetal-inset-gold-perimeter-exposed-upper-rails'/);
assert.match(model, /v10ServiceBelt = 'continuous-gold-rail-central-inset-left-utility-right-canister-bank'/);
assert.match(model, /\[-1\.27, 0\.12, 0\.58\]/);
assert.match(model, /\[1\.27, 0\.12, 0\.58\]/);
assert.match(model, /const wristPosition:[^\n]+\[side \* 0\.12, -0\.68, 0\.035\]/);
assert.match(model, /v10StructuralArmDrop = 'lower-hanging-shoulder-chain-segmented-forearm-object-centered-lift'/);
assert.match(model, /v10StructuralIdleFraming = 'reference-width-load-palm-with-inward-idle-shoulder-articulation'/);
assert.match(model, /v10StructuralCuff = 'dual-circumferential-bands-front-service-inset'/);
assert.match(model, /v10StructuralFaceRatio = 'compact-visor-close-set-eyes-subtle-animated-brows'/);
assert.match(model, /v10AnimatedFaceContract = 'blink-gaze-five-emotions-preserved-after-compact-ratio-pass'/);
assert.ok(model.includes('`${role}:lift-load`, [0, 1.35, 1.02]'));
assert.match(model, /hand\.scale\.setScalar\(1\.28\)/);
assert.match(model, /root\.scale\.setScalar\(role === 'heavy-worker' \? 1\.18 : 0\.86\)/);
assert.match(model, /clawGeometry\.scale\(1\.3, 1\.3, 1\.3\)/);
assert.match(model, /idle: \[12, 0, -12, 0, -10, 10, 10, -10\]/);
assert.match(model, /\[-0\.26, 0\.17, 1\.09\], scale: \[0\.18, 0\.15, 1\]/);
assert.match(model, /\[0\.26, 0\.17, 1\.09\], scale: \[0\.18, 0\.15, 1\]/);
assert.match(model, /v17ClosureContract = 'rear-cradle-side-shoulder-keels-closed-underbody-baffles'/);
assert.match(model, /v17ProfileClearance = 'forward-canted-neutral-load-arm'/);
assert.match(lab, /'heavy-worker': captureMode[\s\S]*?\{ distance: 10\.2, height: 3\.55, targetY: 2\.35, threeQuarterX: 0\.12 \}/);

assert.equal(v11Spec.targetId, 'robot-family-v11');
assert.equal(v11Spec.componentTree.length, 92, 'v11 must preserve v10 and add eight Manager/Mini multi-reference systems');
for (const componentId of [
  'manager-v11-oblate-shell-continuity',
  'manager-v11-four-state-volumetric-brain',
  'manager-v11-fin-rear-underbody-system',
  'manager-v11-authoritative-animated-face',
  'mini-v11-half-scale-cute-shell-system',
  'mini-v11-mint-sensor-cap-node-system',
  'mini-v11-articulated-maker-arm-tool-system',
  'mini-v11-rear-cassette-underbody-reactor',
]) {
  assert.ok(v11Spec.componentTree.some((component) => component.id === componentId), `v11 is missing ${componentId}`);
  assert.match(model, new RegExp(`['"]${componentId}['"]`), `v11 runtime component mapping is missing ${componentId}`);
}
assert.equal(v11Spec.preSpecAssessment.objectClass.primaryDomain, 'hybrid');
assert.equal(v11Spec.preSpecAssessment.detailInventory.targetMinDetails, 20);
assert.ok(v11Spec.preSpecAssessment.detailInventory.details.length >= 20, 'v11 must retain at least twenty mapped reference details');
assert.match(model, /v11ShellEnvelope = 'authoritative-oblate-layered-orby-shell'/);
assert.match(model, /v12ReferenceLockedEnvelope = 'broad-low-oblate-shell-measured-against-front-eye-level-crop'/);
assert.match(model, /function createManagerPearShellGeometry\(/);
assert.match(model, /\[1\.25, 1\.15, 1\.06\]/);
assert.match(model, /function bendManagerFrontPanel\(/);
assert.match(model, /v15ConformingVisor = 'curved-front-panel-recessed-into-spherical-shell-with-edge-depth-following-cheek-contour'/);
assert.match(model, /v15ConformingServiceSeams = 'paired-lower-cheek-service-breaks-follow-shell-curvature-without-floating-cards'/);
assert.match(model, /\[1, 0\.93, 0\.96\]/);
assert.match(model, /v11RecessedVisorLip = 'separate-beveled-shell-overlap-around-rounded-rectangle-aperture'/);
assert.match(model, /v11VolumetricBrain = 'layered-horizontal-energy-discs-ring-and-pulsing-core-beneath-state-overlays'/);
assert.match(model, /v11FourStateBrain = 'calm-waveform-curious-network-focused-progress-check-energized-spiral'/);
assert.match(model, /project-manager-brain-node-network/);
assert.match(model, /project-manager-brain-progress-check/);
assert.match(model, /project-manager-brain-energy-spiral/);
assert.match(model, /v11FinArchitecture = 'tapered-plate-circular-hinge-integrated-light'/);
assert.match(model, /v11HalfScaleCuteShell = 'compact-round-maker-chassis-with-large-face-ratio'/);
assert.match(model, /v11SensorCap = 'shallow-clear-cap-five-node-array'/);
assert.match(model, /v11LevelConstraint = 'artist-tray-remains-level-during-paint-and-inspect'/);
assert.match(model, /v11UprightBrush = 'gunmetal-handle-gold-ferrule-white-collar-mint-bristles'/);
assert.match(model, /idle: \[62, 55, -62, -55, -6\]/);
assert.match(model, /paint: \[64, 88, -64, -88, -8\]/);
assert.match(model, /scale\.setScalar\(0\.76\)/);

assert.equal(v12Spec.targetId, 'robot-family-v12');
assert.equal(v12Spec.componentTree.length, 96, 'v12 must preserve v11 and add four reference-locked Manager systems');
for (const componentId of [
  'manager-v12-reference-locked-shell-envelope',
  'manager-v12-oversized-visor-face-system',
  'manager-v12-dome-cradle-layered-brain',
  'manager-v12-rearward-fin-hover-system',
]) {
  assert.ok(v12Spec.componentTree.some((component) => component.id === componentId), `v12 is missing ${componentId}`);
  assert.match(model, new RegExp(`['"]${componentId}['"]`), `v12 runtime component mapping is missing ${componentId}`);
}
assert.equal(v12Spec.preSpecAssessment.objectClass.primaryDomain, 'object');
assert.equal(v12Spec.preSpecAssessment.detailInventory.details.length, 10);
assert.match(model, /v12IntegratedHoverCrescent = 'squashed-volumetric-crescent-overlapped-by-lower-white-shell'/);
assert.match(model, /v12OversizedVisorBezel = 'continuous-thin-shell-overlap-around-reference-proportioned-face-aperture'/);
assert.match(model, /v12RearwardFinHinge = 'posterior-hinge-overlapped-by-broad-shell-cheek'/);
assert.match(model, /pointerPivot\.visible = false/);
assert.match(model, /manager\.joints\.pointer\.visible = !\['idle', 'listen'\]\.includes\(managerMotion\)/);

assert.equal(v13Spec.targetId, 'robot-family-v13');
assert.equal(v13Spec.componentTree.length, 102, 'v13 must preserve v12 and add six hero-form and optical systems');
assert.equal(v13Spec.materials.length, 10, 'v13 must retain the family materials and add fin/hover reference materials');
assert.equal(v13Spec.preSpecAssessment.detailInventory.details.length, 12, 'v13 must retain twelve mapped identity details');
for (const componentId of [
  'manager-v13-continuous-pear-shell-surface',
  'manager-v13-inset-visor-optical-rim',
  'manager-v13-dome-optical-stack',
  'manager-v13-layered-brain-energy-volume',
  'manager-v13-swept-translucent-fin-system',
  'manager-v13-layered-hover-light-volume',
]) {
  assert.ok(v13Spec.componentTree.some((component) => component.id === componentId), `v13 is missing ${componentId}`);
  assert.match(model, new RegExp(`['"]${componentId}['"]`), `v13 runtime component mapping is missing ${componentId}`);
}
assert.match(model, /v13ContinuousPearShell = 'deformed-continuous-cheek-to-chin-volume-with-rolled-ceramic-highlight-flow'/);
assert.match(model, /v13MetallicVisorLip = 'polished-silver-optical-rim-with-real-bevel-depth'/);
assert.match(model, /v13BlueVisorRim = 'narrow-electric-blue-falloff-inside-metallic-lip'/);
assert.match(model, /v13DomeOpticalStack = 'thick-clear-polycarbonate-with-warm-key-and-cool-lower-refraction'/);
assert.match(model, /v13LayeredBrainMass = 'broad-depth-ordered-blue-energy-plates-with-cyan-rim-arcs'/);
assert.match(model, /v13SweptFinShells = 'softly-beveled-curved-translucent-petal-shell'/);
assert.match(model, /v13HoverHotspotFalloff = 'deep-blue-to-cyan-to-white-nested-volume-with-vent-streaks'/);
assert.match(model, /v13CapsuleSmile = 'short-soft-cyan-capsule-preserving-expression-rig-scaling-and-flip'/);
assert.match(model, /brainRoot\.position\.set\(0, 0\.3, 0\.03\)/);
assert.match(model, /brainRoot\.scale\.set\(1\.1, 0\.92, 1\)/);
assert.match(model, /v15ProtectedCerebrum = 'paired-closed-lobes-centered-under-dome-for-readable-front-side-and-rear-volume'/);
assert.match(model, /\[side \* 0\.68, 1, 1\.12\]/);
assert.match(model, /v16IntegratedVisorSurface = 'radially-tessellated-superellipse-with-continuous-compound-curvature-and-closed-sidewall'/);
assert.match(model, /brain\.core\.scale\.setScalar\(0\.09 \* pulse\)/);
assert.match(lab, /get\('lookdev'\) === 'reference'/);
assert.match(lab, /referenceLook \? 0x121720 : 0xd9e4e7/);

assert.equal(v14Spec.targetId, 'robot-family-v14');
assert.equal(v14Spec.componentTree.length, 108, 'v14 must preserve v13 and add six normalized-reference Manager systems');
assert.equal(v14Spec.materials.length, 12, 'v14 must retain the family materials and add normalized reference optical materials');
assert.equal(v14Spec.preSpecAssessment.detailInventory.details.length, 13, 'v14 must retain thirteen mapped identity details');
assert.equal(v14Spec.sourceImage, '.img2threejs/robot-family-v14/references/manager-angle-front.png');
for (const componentId of [
  'manager-v14-continuous-pear-shell-surface',
  'manager-v14-inset-visor-optical-rim',
  'manager-v14-dome-optical-stack',
  'manager-v14-layered-brain-energy-volume',
  'manager-v14-swept-translucent-fin-system',
  'manager-v14-layered-hover-light-volume',
]) {
  assert.ok(v14Spec.componentTree.some((component) => component.id === componentId), `v14 is missing ${componentId}`);
  assert.match(model, new RegExp(`['"]${componentId}['"]`), `v14 runtime component mapping is missing ${componentId}`);
}
assert.match(model, /v14ContinuousPearShell = 'narrower-taller-reference-locked-pear-envelope'/);
assert.match(model, /v14DomeOpticalStack = 'narrower-taller-reference-locked-polycarbonate-envelope'/);
assert.match(model, /v14FaceLandmarks = 'smaller-eye-rings-with-reference-locked-wide-friendly-spacing'/);
assert.match(model, /v14CapsuleMouth = 'reference-width-capsule-preserving-expression-rig-scaling-and-flip'/);
assert.match(model, /v14FinCavityFalloff = 'independent-cyan-emissive-cavity-inside-translucent-fin-shell'/);
assert.match(lab, /referenceLook[\s\S]*?new THREE\.MeshBasicMaterial\(\{ color: 0x10161f \}\)/);

assert.equal(v15Spec.targetId, 'robot-family-v15');
assert.equal(v15Spec.componentTree.length, 112, 'v15 must preserve v14 and add four coherent-volume topology systems');
assert.equal(v15Spec.preSpecAssessment.detailInventory.details.length, 17, 'v15 must retain seventeen mapped identity and topology details');
assert.equal(v15Spec.qualityContract.minimumSpecDepth.reviewViewpoints, 10, 'v15 must require eight azimuths plus top and underside review');
for (const componentId of [
  'manager-v15-continuous-underbody-crescent',
  'manager-v15-volumetric-brain-core',
  'manager-v15-embedded-fin-root-stack',
  'manager-v15-rear-underbody-continuity',
]) {
  assert.ok(v15Spec.componentTree.some((component) => component.id === componentId), `v15 is missing ${componentId}`);
  assert.match(model, new RegExp(`['"]${componentId}['"]`), `v15 runtime component mapping is missing ${componentId}`);
}
assert.match(model, /function createManagerHoverCrescentGeometry\(/);
assert.match(model, /v15HoverLenticularCrossSection = 'closed-lathed-lenticular-volume-embedded-beneath-white-chin'/);
assert.match(model, /v15BrainVolumetricKernel = 'nested-closed-energy-volumes-visible-through-full-turntable'/);
assert.match(model, /v15EmbeddedFinCollar = 'deep-three-layer-collar-with-explicit-shell-overlap-and-zero-air-gap'/);
assert.match(model, /v15RearUnderbodyContinuity = 'closed-underbody-volume-shared-by-front-profile-rear-and-underside'/);
for (const viewId of ['front-right', 'right', 'rear-right', 'rear', 'rear-left', 'left', 'front-left', 'top', 'underside']) {
  assert.match(lab, new RegExp(`['"]${viewId}['"]`), `v15 review route is missing ${viewId}`);
}
assert.match(lab, /floor\.visible = !silhouetteMode && viewRef\.current !== 'underside'/);

for (const role of ['heavy-worker', 'project-manager', 'mini-artist']) {
  assert.match(model, new RegExp(`const role: RobotRole = '${role}'`));
}
for (const addon of ['autonomous-arm', 'holder', 'lifter', 'projector', 'artist-tray', 'brush']) {
  assert.match(model, new RegExp(`create\\('${addon}'\\)`));
}
for (const motion of ['lift', 'carry', 'direct', 'inspect', 'paint']) {
  assert.match(model, new RegExp(`${motion}:`), `construction motion ${motion} must keep a semantic pose`);
}
assert.match(model, /setBrainState\(nextState\)/);
assert.match(model, /project-manager-brain-wave-rings/);
assert.match(model, /function updateFaceRig\(/);
assert.match(model, /function createHeavyWorkerArm\(/);
assert.match(model, /function createHeavyEyePair\(/);
assert.match(model, /createCompactCrownJoint/);
assert.match(model, /heavyUpperLinkGeometry/);
assert.match(model, /heavyForearmLinkGeometry/);
assert.match(model, /animated-brow-pair/);
assert.match(model, /setFaceFocus\(role, x, y\)/);
assert.match(model, /clearFaceFocus\(role\)/);
assert.match(model, /face\.mainEyes\.instanceMatrix\.needsUpdate = true/);
assert.match(model, /const blinkCycle = 3\.45/);
assert.match(model, /reducedMotion \? 1/);
assert.match(model, /concerned:\s*\{[^\n]*mouthFlip:\s*true/);
assert.match(lab, /canvas\.dataset\.robotEmotion = model\.emotion/);
assert.match(lab, /canvas\.dataset\.heavyMouthTransform/);
assert.match(lab, /!phoneProof && !captureMode/);
assert.match(lab, /ROBOT_BRAIN_STATES/);
for (const runtimeField of ['nodes', 'sockets', 'colliders', 'destructionGroups', 'addons', 'setExploded', 'faceRigs', 'setFaceFocus', 'clearFaceFocus', 'setMemberEmotion', 'setExternalRootMotion', 'scaleContract']) {
  assert.match(model, new RegExp(`${runtimeField}[,:]`));
}

assert.match(model, /model\.partManifest\s*=\s*{/);
assert.match(lab, /canvas\.dataset\.robotPartManifest/);
const runtimeSources = `${model}\n${theatre}`;
for (const componentId of spec.componentTree.map((component) => component.id)) {
  assert.match(runtimeSources, new RegExp(`['\"]${componentId}['\"]`), `runtime component mapping is missing ${componentId}`);
}

for (const phase of ['arrive', 'survey', 'foundation', 'frame', 'assemble', 'finish', 'reveal']) {
  assert.match(theatre, new RegExp(`${phase}:\\s*\\{`), `construction phase ${phase} must have choreography`);
}
for (const tool of ['hammer', 'wrench', 'drill', 'welder', 'circular-saw', 'paint-sprayer', 'screwdriver', 'measuring-laser', 'clamp', 'cable-reel']) {
  assert.match(theatre, new RegExp(`id:\\s*'${tool}'`), `construction tool ${tool} must stay in the library`);
}
assert.match(theatre, /visibleDrawCalls/);
assert.match(theatre, /presentationOnly:\s*true/);
assert.match(theatre, /member\.position\.y = THREE\.MathUtils\.lerp\(member\.position\.y, targetPosition\.y, response\)/);
assert.doesNotMatch(theatre, /member\.position\.y \+= target\.y/);
assert.match(theatre, /setTargetEnvelope/);
assert.match(theatre, /showBuildingEnvelope/);
assert.match(theatre, /isRelocationPhase/);
assert.match(theatre, /ROLE_WORK_RIG/);
assert.match(theatre, /PHASE_PRIMARY_STATION/);
assert.match(theatre, /PHASE_ROLE_TOOLS/);
assert.match(theatre, /resolveWorkingConfig/);
assert.match(theatre, /presentation\.choreography\?\.stationOffset/);
assert.match(theatre, /presentation\.choreography\?\.relocationSeconds/);
assert.match(theatre, /presentation\.choreography\?\.phaseStationOffsets\?\.\[presentation\.phase\]/);
assert.match(theatre, /completedRoleMoves \* stationStep/);
assert.match(theatre, /presenceScale/);
assert.match(theatre, /setCrewScale/);
assert.match(theatre, /RELOCATION_SLOT_SECONDS = 1\.72/);
assert.match(theatre, /activeRelocationRole === role/);
assert.match(theatre, /completedRoleMoves/);
assert.match(theatre, /smoothstep\(cycleProgress, 0\.6, 0\.68\)/);
assert.match(theatre, /smoothstep\(cycleProgress, 0\.75, 0\.84\)/);
assert.match(theatre, /assignedToolScale = crewScale \* roleVisibility\[role\]/);
assert.match(theatre, /REST_EXPRESSION_SECONDS = 15/);
assert.match(theatre, /REST_EMOTIONS/);
assert.match(theatre, /TOOL_CONTACT_VIBRATION/);
assert.match(theatre, /ROLE_OCCUPANCY_PROFILE/);
assert.match(theatre, /enforceConstructionOccupancy/);
assert.match(theatre, /pairViolations/);
assert.match(theatre, /buildingViolations/);
assert.match(theatre, /shellClearanceMargin = targetEnvelope\.radius \* 0\.0015/);
assert.match(theatre, /correctedRadius = minimumShellRadius \+ shellClearanceMargin/);
assert.match(theatre, /targetPosition\.x \*= 0\.84/);
assert.match(theatre, /family\.setMemberEmotion/);
assert.match(theatre, /const isWorking = (?:Boolean\()?presentation\.(?:active && presentation\.)?working/);
for (const role of ['heavy-worker', 'project-manager', 'mini-artist']) {
  const stationBlock = theatre.match(new RegExp(`'${role}':\\s*\\{\\s*stations:\\s*\\[([\\s\\S]*?)\\],\\s*relocationOffset`))?.[1];
  assert.ok(stationBlock, `${role} must retain an authored construction station block`);
  assert.equal((stationBlock.match(/\{ position:/g) ?? []).length, 6, `${role} must traverse six construction work zones`);
}
assert.match(theatre, /dampAngle/);
assert.doesNotMatch(theatre, /visibilityScale/);
assert.match(theatre, /reducedMotion \? 0 : 1/);
assert.match(presentation, /deriveIslandRunConstructionPresentation/);
assert.match(presentation, /isBuildBurstActive/);
assert.match(presentation, /working:\s*isWorking/);
assert.match(presentation, /cameraLocked:\s*isWorking \|\| Boolean\(options\.isCameraLocked\)/);
assert.match(islandBoard, /constructionPresentation=\{constructionPresentation\}/);
assert.match(islandBoard, /markBuildChoreographyActive/);
assert.match(islandPilot, /ISLAND_RUN_BUILD_MODAL_CONSTRUCTION_ANCHOR/);
assert.match(islandPilot, /ISLAND_RUN_BUILD_MODAL_AUTHORED_BUILDING_STAGE/);
assert.match(islandPilot, /prepareIslandConstructionLevelDelta/);
assert.match(islandPilot, /additive-delta/);
assert.doesNotMatch(islandPilot, /createIslandConstructionScaffold/);
assert.match(islandPilot, /constructionScaffoldMode = 'authored-landmark-only'/);
assert.match(islandPilot, /buildAuthoredLandmark\(definition, currentLevel, 'current'\)/);
assert.match(islandPilot, /buildAuthoredLandmark\(definition, targetLevel, 'target'\)/);
assert.match(islandPilot, /constructionCrewRevealStages/);
assert.match(islandPilot, /constructionCrewOccupancy/);
assert.match(islandPilot, /constructionLandmarkGrounding/);
assert.match(islandPilot, /constructionChoreography/);
assert.match(islandPilot, /if \(transition\) transition = null;/);
assert.match(islandPilot, /snapInitialLockedConstructionFocus/);
assert.doesNotMatch(islandPilot, /constructionBounds\.min\.y \+ horizontalExtent \* 0\.4/);
assert.match(islandPilot, /showBuildingEnvelope:\s*false/);
assert.match(islandPilot, /createRobotFamilyModel\(\{ quality: 'low', showAddonRack: false \}\)/);
assert.match(islandPilot, /constructionTheatre\.setCrewScale\(0\.11\)/);
assert.match(islandPilot, /landmarkRootsById\.get\(mappedStopId as Island5LandmarkId\)/);
assert.match(islandPilot, /constructionFamily\.update\(elapsed, frameDeltaSeconds, constructionReducedMotion\)/);
assert.match(islandPilot, /constructionTheatre\.update\(elapsed, frameDeltaSeconds, constructionReducedMotion\)/);
assert.match(islandPilot, /if \(constructionAnchor\.visible\) \{/);
assert.match(islandPilot, /constructionCrewRuntime = isActive \? 'rendering' : 'parked'/);
assert.match(islandPilot, /constructionCrewDrawCalls = String\(isActive[\s\S]*?: 0\)/);
assert.match(islandBoard, /const Island5ThreeScene = lazy\(\(\) => import\('\.\.\/dev\/Island5ThreePilot'\)\)/);
assert.match(levelDelta, /consumed geometry\/placement multiset/);
assert.match(levelDelta, /applyProgress/);
assert.match(levelDelta, /entry\.visible = false/);
assert.match(levelDelta, /constructionStage/);
assert.match(levelDelta, /constructionTemporary/);
assert.match(levelDelta, /presentationVisibility/);
for (const styleId of [
  'frostmoon-roost-sled-hoist',
  'frostmoon-hearthguard-yard',
  'frostmoon-moonwell-alignment',
  'frostmoon-archive-book-lift',
  'frostmoon-aurora-keep-commissioning',
]) {
  assert.match(constructionAuthoring, new RegExp(styleId), `Frostmoon choreography ${styleId} is missing`);
}
assert.match(constructionAuthoring, /FROSTMOON_STAGE_STORIES/);
for (const styleId of [
  'crown-tides-coral-cradle-hoist',
  'crown-tides-tidekeeper-sail-rig',
  'crown-tides-concord-arena-fitout',
  'crown-tides-pearl-archive-lift',
  'crown-tides-citadel-floodgate-commissioning',
]) {
  assert.match(constructionAuthoring, new RegExp(styleId), `Crown of Tides choreography ${styleId} is missing`);
}
assert.match(constructionAuthoring, /CROWN_TIDES_STAGE_STORIES/);
for (const styleId of [
  'sunshore-egg-grotto-cradle-rig',
  'sunshore-open-air-lodge-lashing',
  'sunshore-tideglass-oracle-alignment',
  'sunshore-star-archive-lift',
  'sunshore-sunwheel-arena-commissioning',
]) {
  assert.match(constructionAuthoring, new RegExp(styleId), `Sunshore choreography ${styleId} is missing`);
}
assert.match(constructionAuthoring, /SUNSHORE_STAGE_STORIES/);
for (const styleId of [
  'moonveil-moon-nest-levitation-rig',
  'moonveil-constellation-court-calibration',
  'moonveil-violet-rift-optics',
  'moonveil-midnight-archive-lift',
  'moonveil-noctyra-gate-commissioning',
]) {
  assert.match(constructionAuthoring, new RegExp(styleId), `Moonveil choreography ${styleId} is missing`);
}
assert.match(constructionAuthoring, /MOONVEIL_STAGE_STORIES/);
for (const styleId of [
  'abyssal-nautilus-buoyant-cradle',
  'abyssal-living-reef-sanctuary-bind',
  'abyssal-compass-current-portal',
  'abyssal-tidemind-shell-lift',
  'abyssal-pearl-throne-commissioning',
]) {
  assert.match(constructionAuthoring, new RegExp(styleId), `Abyssal choreography ${styleId} is missing`);
}
assert.match(constructionAuthoring, /ABYSSAL_STAGE_STORIES/);
for (const styleId of [
  'everblossom-tulip-glasshouse-weave',
  'everblossom-sunflower-pavilion-lashing',
  'everblossom-leafroof-garden-rig',
  'everblossom-orchid-archive-lift',
  'everblossom-blossom-crown-commissioning',
]) {
  assert.match(constructionAuthoring, new RegExp(styleId), `Everblossom choreography ${styleId} is missing`);
}
assert.match(constructionAuthoring, /EVERBLOSSOM_STAGE_STORIES/);
for (const styleId of [
  'heartshaft-blastglass-incubator-rig',
  'heartshaft-great-fuse-assembly',
  'heartshaft-seismic-switchyard-rail',
  'heartshaft-memory-press-lift',
  'heartshaft-crucible-core-commissioning',
]) {
  assert.match(constructionAuthoring, new RegExp(styleId), `Heartshaft choreography ${styleId} is missing`);
}
assert.match(constructionAuthoring, /HEARTSHAFT_STAGE_STORIES/);
for (const styleId of [
  'rootheart-acorn-cradle-hoist',
  'rootheart-canopy-rhythm-lashing',
  'rootheart-firefly-pulley-workshop',
  'rootheart-spiralwood-library-lift',
  'rootheart-arena-canopy-commissioning',
]) {
  assert.match(constructionAuthoring, new RegExp(styleId), `Rootheart choreography ${styleId} is missing`);
}
assert.match(constructionAuthoring, /ROOTHEART_STAGE_STORIES/);
assert.equal((scaffold.match(/^\s*\d+: \{ id:/gm) ?? []).length, 10, 'all ten authored world sources need a scaffold profile');
for (const profile of ['luma-crystal-brass', 'celestial-cloudglass', 'frostmoon-icewood', 'driftwood-ropeworks', 'sunshore-bamboo', 'moonveil-arcframe', 'abyssal-coral-frame', 'everblossom-vineframe', 'heartshaft-forgeframe', 'rootheart-living-frame']) {
  assert.match(scaffold, new RegExp(profile), `construction scaffold profile ${profile} is missing`);
}

assert.match(lab, /__IMG2THREEJS_READY__/);
assert.match(lab, /phoneProof/);
assert.match(lab, /OrbitControls/);
assert.match(lab, /controls\.update\(delta\)/);
assert.match(lab, /'mini-artist': \{ distance: 5\.7, height: 1\.85, targetY: 1\.08, threeQuarterX: 0\.35 \}/);
assert.match(lab, /'project-manager': referenceLook[\s\S]*?\{ distance: 7\.65, height: 2\.78, targetY: 2\.12, threeQuarterX: 0\.12 \}[\s\S]*?: \{ distance: 6\.6, height: 3, targetY: 2\.1, threeQuarterX: 0\.18 \}/);
assert.match(lab, /applyInspectionView\(selectedRoleRef\.current, previousView\)/);
assert.match(model, /const hoverAmplitude = reducedMotion \? 0 : 0\.042/);
assert.match(model, /if \(!externalRootMotion\)/);
assert.match(main, /ROBOT_FAMILY_THREE_LAB_PATH = '\/dev\/robot-family-3d'/);

const forbiddenGameplayWrites = /persistIslandRunRuntimeStatePatch|commitIslandRunState|islandRunStateActions/;
assert.doesNotMatch(model, forbiddenGameplayWrites);
assert.doesNotMatch(lab, forbiddenGameplayWrites);
assert.doesNotMatch(theatre, forbiddenGameplayWrites);
assert.doesNotMatch(islandPilot, /persistIslandRunRuntimeStatePatch/);
assert.doesNotMatch(presentation, forbiddenGameplayWrites);

console.log('PASS robot family 3D contract');
