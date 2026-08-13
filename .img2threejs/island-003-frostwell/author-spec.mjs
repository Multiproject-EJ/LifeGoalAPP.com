import fs from 'node:fs';

const dir = new URL('./', import.meta.url);
const specPath = new URL('./frostwell-iceworks-sculpt-spec.json', dir);
const assessmentPath = new URL('./frostwell-pre-spec-assessment.json', dir);
const inventoryPath = new URL('./detail-inventory.json', dir);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const assessment = JSON.parse(fs.readFileSync(assessmentPath, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const baseComponent = structuredClone(spec.componentTree[0]);
const baseMaterial = structuredClone(spec.materials[0]);
const evidence = ['frostmoon-baseline-overview', 'user-approved-functional-brief'];
const rgba = (hex) => {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, 1.0)`;
};

const details = [
  ['north-ocean-placement', 'contour', 'Detached north-ocean sea-ice platform centred behind Frostmoon', 'macro', 'component', 'sea-ice-platform'],
  ['drill-tower-silhouette', 'linework', 'Tall four-leg A-frame drill tower with open centre', 'macro', 'component', 'drill-rig'],
  ['twenty-progress-lamps', 'gloss', 'Twenty radial drill progress lamps around the bore deck', 'micro', 'component', 'progress-light-ring'],
  ['segmented-auger', 'ridge', 'Rotating shaft and copper conical ice auger', 'meso', 'component', 'drill-pivot'],
  ['fishery-shed', 'contour', 'Low indigo-roof fishery with warm window', 'macro', 'component', 'fishery-building'],
  ['freshwater-tank', 'contour', 'Tall cylindrical reservoir with copper bands and visible water', 'macro', 'component', 'freshwater-reservoir'],
  ['net-conveyor', 'linework', 'Looping carrier system with alternating empty and fish-filled buckets', 'meso', 'component', 'net-conveyor'],
  ['water-flow-slugs', 'gloss', 'Moving cyan water slugs travelling into the reservoir', 'micro', 'component', 'water-flow-system'],
  ['pier-umbilical', 'linework', 'Narrow south-pointing timber pier and insulated pipe connection', 'meso', 'component', 'service-umbilical'],
  ['construction-poof', 'gloss', 'Radial snow-steam poof that reveals operating equipment', 'micro', 'component', 'construction-burst'],
];
inventory.detailInventory.details = details.map(([id, kind, description, scale, type, ref], index) => ({
  id, kind, description,
  region: index === 0 ? { x: 0.28, y: 0, width: 0.44, height: 0.36, units: 'normalized' } : { x: 0, y: 0, width: 1, height: 1, units: 'normalized' },
  scale, affects: scale === 'macro' ? 'silhouette-and-identity' : 'hierarchy-and-motion-read',
  mapsTo: { type, ref },
  evidenceRef: index === 0 ? '.img2threejs/island-003-frostwell/evidence/island-003-frostmoon-baseline.png' : 'docs/gauntlets/2026-08-13-island-003-frostwell-iceworks.md',
  confidence: index === 0 ? 0.94 : 0.9,
  realization: 'Named procedural geometry or explicit animation/material-state system.',
  evidenceRefs: evidence,
}));
fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);

assessment.preSpecAssessment.objectClass = {
  primaryType: 'offshore frozen-ocean drilling, fishery and freshwater facility', primaryDomain: 'object',
  formLanguage: ['Nordic industrial A-frame', 'cracked sea ice', 'warm timber shelter', 'banded reservoir', 'exposed mechanical conveyor'],
  structureKind: ['detached platform', 'drill rig', 'fishery', 'reservoir', 'service umbilical'],
  motionPotential: ['auger rotation', 'winch rotation', 'net carrier loop', 'water flow', 'construction burst'],
  materialFamilies: ['snow', 'translucent cyan ice', 'blue-grey steel', 'antique copper', 'dark timber', 'indigo roof', 'warm window', 'cyan water'],
  notes: 'Original contract-led design fitted to observed Frostmoon camera, palette and protected board footprint.',
};
assessment.preSpecAssessment.complexity = {
  tier: 'complex', scores: { silhouetteComplexity: 3, componentCount: 3, hierarchyDepth: 3, repetitionDensity: 2, materialLayerCount: 3, localDetailDensity: 2, occlusionRisk: 2, actionReadinessNeed: 3 },
  estimatedCounts: { macroComponents: 5, mesoComponents: 9, microFeatureGroups: 8, materialLayers: 8, repetitionSystems: 5 },
  reasoning: ['Distinct pre-build and operating silhouettes.', 'Five named moving systems require independent pivots.', 'Phone overview must show clear separation from island and route.'],
};
assessment.preSpecAssessment.specDepthDecision = { requiredDepth: 'complex', minimumComponentLevels: ['macro', 'meso', 'micro'], needsRepetitionSystems: true, needsMaterialLocalOverrides: true, needsMultipleReviewViews: true, needsActionReadyHierarchy: true, rationale: 'Construction phases and continuous mechanical storytelling require a named hierarchy.' };
assessment.preSpecAssessment.unknownsToResolveBeforeImplementation = [];
assessment.preSpecAssessment.detailInventory = inventory.detailInventory;
assessment.qualityContract.definitionOfDone = ['North-ocean detached facility reads clearly in phone overview, preserves all 36 board tiles, animates canonical wheel-driven drilling to 500m, builds with a visible poof, and operates with fish/net/water motion.'];
assessment.qualityContract.minimumSpecDepth = { macroComponents: 5, mesoComponents: 8, microFeatureGroups: 7, materialLayers: 7, repetitionSystems: 5, reviewViewpoints: 5 };
fs.writeFileSync(assessmentPath, `${JSON.stringify(assessment, null, 2)}\n`);

const materialDefs = [
  ['snow', '#EAF4FF', 0.82, 0, 0.04, '#000000', 'soft sparkling snow'],
  ['glacial-ice', '#79DDF5', 0.08, 0, 0.9, '#155F8E', 'translucent fractured sea ice'],
  ['blue-steel', '#283846', 0.42, 0.78, 0.12, '#000000', 'cold painted structural steel'],
  ['antique-copper', '#B87035', 0.38, 0.78, 0.2, '#351405', 'worn copper pipe and bands'],
  ['dark-timber', '#4A332D', 0.88, 0, 0.02, '#000000', 'weathered timber grain'],
  ['indigo-roof', '#354F9F', 0.44, 0.04, 0.42, '#151A50', 'snow-dusted indigo roof'],
  ['warm-window', '#FFCF7A', 0.28, 0, 0.1, '#FF8F2D', 'warm interior practical'],
  ['fresh-water', '#54D8F4', 0.06, 0, 0.92, '#137CA3', 'clear cyan flowing water'],
];
spec.materials = materialDefs.map(([id, color, roughness, metalness, clearcoat, emissive, pattern]) => {
  const m = structuredClone(baseMaterial);
  Object.assign(m, { id, name: id.replaceAll('-', ' '), type: clearcoat > 0.7 ? 'physical' : 'standard', shaderModel: clearcoat > 0.7 ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial', baseColor: color, color,
    albedo: { dominant: color, secondary: ['#DDEAF4', '#152333'], samplingNotes: 'Frostmoon palette aligned; target geometry is original.' },
    colorVariation: { palette: [color, '#DDEAF4', '#152333'], pattern, amplitude: 0.08, heightCorrelation: 0.25 },
    textureResolution: 256, textureProjection: { mode: 'object-space', repeat: [4, 4], anisotropy: 2, texelDensityIntent: 'phone-stable procedural material detail' },
    surfaceFrequencyBands: [{ id: 'macro', frequency: 1.2, amplitude: 0.08, role: 'broad exposure variation' }, { id: 'meso', frequency: 14, amplitude: 0.07, role: pattern }, { id: 'micro', frequency: 62, amplitude: 0.02, role: 'grazing-highlight breakup' }],
    roughness: { base: roughness, variation: 0.08, map: 'independent procedural roughness', localResponse: 'rough cavities and cleaner exposed crests' }, metalness: { base: metalness, variation: metalness > 0.2 ? 0.06 : 0 },
    normal: { pattern, strength: 0.08, scale: 44, space: 'tangent' }, bump: { pattern: `${pattern} independent height`, amplitude: 0.035, scale: 38 }, displacement: { pattern: 'none', amplitude: 0, scale: 1, silhouetteAffects: false },
    ambientOcclusion: { cavityStrength: 0.34, contactShadowBias: 0.42, notes: 'Concentrated at joints, tank bands, bore deck and platform contact.' }, wear: { edgeWear: metalness > 0.2 ? 0.12 : 0.03, scratches: ['short directional service marks'], chips: [] }, dirt: { amount: 0.06, cavityBias: 0.65, color: '#18212A' }, clearcoat, clearcoatRoughness: clearcoat > 0.7 ? 0.1 : 0.32, emissive, emissiveIntensity: emissive === '#000000' ? 0 : id === 'warm-window' ? 1.4 : 0.55,
    localOverrides: [{ id: `${id}-exposure`, region: 'upward and joint-facing surfaces', roughness: Math.min(1, roughness + 0.08), strength: 0.25, evidenceRefs: evidence }], notes: `${pattern}; independent albedo, roughness, height and AO response.` });
  delete m.referencePbr;
  return m;
});

const defs = [
  ['root', 'Frostwell Iceworks root', 'macro', null, 'glacial-ice', 'scene-root', ['north-ocean-placement']],
  ['sea-ice-platform', 'Detached cracked ocean ice slab', 'macro', 'root', 'glacial-ice', 'static-platform', ['cracked-irregular-edge']],
  ['drill-rig', 'A-frame offshore drill rig', 'macro', 'root', 'blue-steel', 'drilling-state-owner', ['drill-tower-silhouette']],
  ['fishery-building', 'Warm timber fishery shelter', 'macro', 'root', 'dark-timber', 'built-state-owner', ['fishery-shed']],
  ['freshwater-reservoir', 'Banded freshwater tank', 'macro', 'root', 'blue-steel', 'built-state-owner', ['freshwater-tank']],
  ['service-umbilical', 'South-pointing pier and pipe', 'macro', 'root', 'dark-timber', 'static-connection', ['pier-umbilical']],
  ['drill-pivot', 'Rotating auger and segmented shaft', 'meso', 'drill-rig', 'antique-copper', 'auger-rotation', ['segmented-auger']],
  ['winch-pivot', 'Drill crown winch', 'meso', 'drill-rig', 'antique-copper', 'winch-rotation', ['open-flywheel']],
  ['progress-light-ring', 'Twenty-lamp depth progress ring', 'meso', 'drill-rig', 'fresh-water', 'progress-material-state', ['twenty-progress-lamps']],
  ['net-conveyor', 'Fish net carrier loop', 'meso', 'fishery-building', 'blue-steel', 'carrier-loop', ['net-conveyor']],
  ['water-pipe-network', 'Insulated freshwater pipes', 'meso', 'freshwater-reservoir', 'antique-copper', 'water-transfer', ['arched-pipe-run']],
  ['construction-burst', 'Snow-steam construction poof', 'meso', 'root', 'snow', 'one-shot-burst', ['construction-poof']],
  ['fishery-roof', 'Steep indigo fishery roof', 'meso', 'fishery-building', 'indigo-roof', 'static', ['snow-shedding-roof']],
  ['reservoir-water-column', 'Visible fresh-water tank column', 'meso', 'freshwater-reservoir', 'fresh-water', 'water-level-pulse', ['visible-water-level']],
  ['platform-cracks', 'Radial crystalline ice cracks', 'micro', 'sea-ice-platform', 'glacial-ice', 'static', ['ten-crack-rays']],
  ['tank-band-array', 'Copper reservoir reinforcement bands', 'micro', 'freshwater-reservoir', 'antique-copper', 'static', ['four-tank-bands']],
  ['carrier-array', 'Alternating empty and fish-filled buckets', 'micro', 'net-conveyor', 'antique-copper', 'carrier-loop', ['fish-and-empty-alternation']],
  ['water-flow-system', 'Cyan flow slugs in pipe', 'micro', 'water-pipe-network', 'fresh-water', 'flow-loop', ['water-flow-slugs']],
  ['warm-practical-system', 'Window and signal lamps', 'micro', 'fishery-building', 'warm-window', 'material-pulse', ['warm-window-and-signal']],
  ['snow-burst-particles', 'Quality-scaled construction puffs', 'micro', 'construction-burst', 'snow', 'radial-burst', ['construction-poof']],
];
const colorMap = new Map(materialDefs.map((d) => [d[0], d[1]]));
spec.componentTree = defs.map(([id, name, level, parent, material, role, features]) => {
  const c = structuredClone(baseComponent);
  Object.assign(c, { id, name, level, parent, material, role, topologyClass: role.includes('pipe') || role.includes('flow') ? 'fiber-strand' : 'assembled-solid', topologyRationale: role.includes('pipe') || role.includes('flow') ? 'Swept path preserves continuous pipe/readable motion.' : 'Discrete procedural volumes support named pivots and visibility states.', importance: level === 'macro' ? 1 : level === 'meso' ? 0.9 : 0.76, confidence: parent ? 0.9 : 1, primitive: role.includes('pipe') || role.includes('flow') ? 'tube' : id.includes('array') || id.includes('system') ? 'instanced-cluster' : 'cylinder', materialLayers: [material], evidenceRefs: evidence });
  c.actionProfile.animationRole = role;
  c.actionProfile.transformChannels = { translate: role.includes('carrier') || role.includes('flow') || role.includes('burst'), rotate: role.includes('rotation') || role.includes('loop'), scale: role.includes('pulse') || role.includes('burst'), bend: false, twist: false, detach: false, visibility: role.includes('built') || role.includes('burst'), materialState: role.includes('material') || role.includes('progress') || role.includes('flow') };
  c.localFeatures = features.map((feature) => ({ id: feature, placement: `Explicit authored feature on ${name}`, size: 'phone-readable macro or repeated meso detail', orientation: 'aligned to local platform/mechanism frame', materialEffect: 'independent frost, metal, water or warm-light response', geometryEffect: 'real geometry when silhouette or motion-bearing', confidence: 0.9, evidenceRefs: evidence }));
  c.surfaceDetail = { macroRoughness: 0.12, microRoughness: 0.08, bumpAmplitude: 0.035, normalPattern: `${material}-normal`, displacementPattern: 'macro form owned by geometry', occlusionPattern: 'joints, platform cracks, bands and bore deck', edgeWearPattern: 'restrained exposed-edge response', notes: 'Phone-stable frequency separation.' };
  c.colorMaterialRecipe = { dominantAlbedo: rgba(colorMap.get(material)), secondaryAlbedo: rgba('#152333'), materialClass: material.includes('steel') || material.includes('copper') ? 'metal' : material.includes('ice') || material.includes('water') || material.includes('window') ? 'glass' : material.includes('timber') ? 'wood' : material.includes('snow') ? 'stone' : 'plastic', materialClassConfidence: 0.9, colorGradient: { type: 'linear', stops: [{ at: 0, color: rgba(colorMap.get(material)) }, { at: 1, color: rgba('#DDEAF4') }] }, evidenceRefs: evidence };
  if (parent) c.attachment = { parentId: parent, parentSocket: `${parent}-socket`, localStart: [0, 0, 0], localEnd: [0, 0.1, 0], baseRadius: 0.1, endRadius: 0.08, overlap: 0.04, embedDepth: 0.03, contactType: 'embedded', gapTolerance: 0.01, evidenceRefs: evidence };
  return c;
});

spec.suitability = 'conditional';
spec.scores = { object_isolation: 1, silhouette_readability: 3, depth_inference: 2, primitive_decomposition: 3, material_procedurality: 3, occlusion_risk: 2, interaction_fit: 3 };
spec.referenceCamera = { solved: false, fovDegrees: 42, aspect: 16 / 9, orientation: { yaw: 0, pitch: -47, roll: 0 }, positionHint: [0, 18, 24], note: 'Existing HabitGame locked camera is authoritative; target object is absent from baseline.' };
spec.preSpecAssessment = assessment.preSpecAssessment;
spec.qualityContract = assessment.qualityContract;
spec.repetitionSystems = [['progress-lamps', 20, 'radial depth counter'], ['platform-cracks', 10, 'radial ice fractures'], ['net-carriers', 6, 'closed carrier loop'], ['water-slugs', 6, 'pipe flow loop'], ['construction-puffs', 22, 'one-shot radial burst']].map(([id, instances, pattern]) => ({ id, geometry: 'named deterministic procedural system', instances, pattern, buildsGeometry: true, realization: 'quality-tier-scaled named roots or repeated meshes', evidenceRefs: evidence }));
spec.featureReviewTargets = [
  ['offshore-read', 'Platform visibly detached in north ocean', ['sea-ice-platform', 'service-umbilical'], 0.94],
  ['board-clear', 'All 36 board tiles remain legible and unoccluded', ['root'], 0.96],
  ['drill-read', 'A-frame, auger, winch and 20 lamps read in overview', ['drill-rig', 'drill-pivot', 'progress-light-ring'], 0.9],
  ['operating-read', 'Fish carriers and freshwater flow visibly animate', ['net-conveyor', 'water-flow-system', 'freshwater-reservoir'], 0.88],
  ['construction-read', 'Build transition has a clear snow-steam reveal', ['construction-burst'], 0.86],
].map(([id, name, componentRefs, score]) => ({ id, name, tier: 'critical', passIds: ['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'lighting-pass', 'interaction-pass'], minimumScore: score, mustPass: true, componentRefs, evidenceRefs: evidence }));
spec.viewEvidence = [{ id: 'frostmoon-baseline-overview', view: 'locked Island 003 overview', imageRegion: { x: 0, y: 0, width: 1, height: 1, units: 'normalized' }, observations: ['broad frozen ocean', 'central protected ring', 'indigo and ivory palette', 'north negative space'], confidence: 0.94 }, { id: 'user-approved-functional-brief', view: 'functional design authority', imageRegion: { x: 0, y: 0, width: 1, height: 1, units: 'normalized' }, observations: ['three drill tiles', 'wheel-driven 500m drilling', 'special north camera and occlusion fade', 'funding gate', 'poof construction', 'fish conveyor', 'freshwater pipeworks'], confidence: 1 }];
spec.lightingFromPhoto = ['Cool daylight key from upper left.', 'Pale frozen-ocean fill preserves steel silhouette.', 'Warm window and cyan water practicals identify operating state.', 'Exposure 1.0 with ACES filmic tone mapping protects snow and emissive detail.', 'Contact shadows ground the separate slab and machinery.'];
spec.proceduralStrategy = ['Keep canonical board and landmarks outside the model.', 'Use named roots for drilling, built and construction states.', 'Use quality-scaled repetition for cracks, lamps, carriers, water slugs and puffs.', 'Freeze decorative motion under reduced motion while preserving state readability.'];
spec.performanceBudget = { qualityPriority: 'phone-reference-fidelity', targetTriangles: 45000, maxDrawCalls: 55, textureSize: 256, fpsTarget: 50, optimizationPolicy: 'Reduce segment counts and repeated carriers/puffs before removing macro drill, shed, tank, slab or umbilical silhouettes.' };
spec.lookDevTargets = { qualityPriority: 'procedural-context-matched', materialPass: { albedoPaletteRequired: true, roughnessVariationRequired: true, normalOrBumpRequired: true, localOverridesRequired: true, referencePbrExtraction: { requiredWhenSourceImagePresent: false, acceptedLimitation: 'The baseline does not contain the target machine, so isolated target PBR maps cannot be extracted honestly.' } }, lightingPass: { requiredTerms: ['key light', 'fill light', 'exposure', 'tone mapping', 'background', 'contact shadow'] }, screenshotReview: ['phone overview', 'left orbit', 'right orbit', 'drilling state', 'operating state'] };
spec.actionReadiness = { contract: 'Every moving system owns a named Object3D pivot and state remains presentation-only.', defaultRigType: 'action-ready-mechanical-facility', rootMotionNode: 'root', requiredComponentFields: ['id', 'parent', 'actionProfile.animationRole'], transformChannels: ['translate', 'rotate', 'scale', 'visibility', 'material-state'], authoringRules: ['Keep the board outside the visual module.', 'Expose a generous click target.', 'Respect reduced motion.'], destructionPolicy: { defaultBreakable: false } };
spec.qualityTargets.reviewViewpoints = ['phone-overview', 'orbit-left', 'orbit-right', 'drilling-state', 'operating-state'];
for (const pass of spec.buildPasses) pass.componentRefs = defs.map((definition) => definition[0]);
spec.sculptPipeline.currentPass = 'blockout';
spec.sculptPipeline.completedPasses = [];
spec.sculptPipeline.lastCompletedPass = null;
spec.sculptPipeline.blockedReason = null;
fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
