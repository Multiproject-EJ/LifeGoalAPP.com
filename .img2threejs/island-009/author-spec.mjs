import fs from 'node:fs';

const root = new URL('./', import.meta.url);
const specPath = new URL('./object-sculpt-spec.json', root);
const assessmentPath = new URL('./pre-spec-assessment.json', root);
const inventoryPath = new URL('./detail-inventory.json', root);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const assessment = JSON.parse(fs.readFileSync(assessmentPath, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const baseComponent = structuredClone(spec.componentTree[0]);
const baseMaterial = structuredClone(spec.materials[0]);
const evidence = ['reference-heartshaft-overview'];
const rgba = (hex) => {
  const value = hex.replace('#', '');
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, 1.0)`;
};

const detailDefs = [
  ['zone-r0c0', 'contour', 'Blastglass Incubator with twin caged furnace bulbs, exhaust stacks and stair plinth', 'macro', 'component', 'blastglass-incubator'],
  ['zone-r0c1', 'ridge', 'Rear caldera wall, basalt needles, lava falls and branching lava channels', 'meso', 'component', 'caldera-wall-network'],
  ['zone-r0c2', 'contour', 'Great Fuse tower with segmented hot core, pipe return and exposed flywheel', 'macro', 'component', 'great-fuse'],
  ['zone-r1c0', 'linework', 'Left crane gantry with pulley wheel, counterweight, chain and embedded footing', 'meso', 'component', 'heartshaft-gantry-array'],
  ['zone-r1c1', 'contour', 'Deep open shaft, three asymmetric arms, chain-suspended skeletal ignition ring and small magma heart', 'macro', 'component', 'heartshaft-crucible'],
  ['zone-r1c2', 'linework', 'Right crane gantry, rail arm, drive wheel, hanging chain and conduit joint', 'meso', 'component', 'heartshaft-gantry-array'],
  ['zone-r2c0', 'ridge', 'Memory Press with copper rune drum, flanking teal heat-glass pylons and stamping table', 'macro', 'component', 'memory-press'],
  ['zone-r2c1', 'bevel', 'Clean circular wedge route, crater rim trim and glowing conduit crossing under the land', 'macro', 'component', 'route-integration'],
  ['zone-r2c2', 'gloss', 'Seismic Switchyard with violet pressure vessel, valve forest, gauges, pistons and rooted pipes', 'macro', 'component', 'seismic-switchyard'],
];

inventory.detailInventory.details = inventory.detailInventory.details.map((detail) => {
  const definition = detailDefs.find(([id]) => id === detail.id);
  const [, kind, description, scale, type, ref] = definition;
  return { ...detail, kind, description, scale, affects: scale === 'macro' ? 'silhouette-and-identity' : 'hierarchy-and-material-read', mapsTo: { type, ref }, confidence: 0.94 };
});
fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);

assessment.preSpecAssessment.objectClass = {
  primaryType: 'procedural volcanic industrial island environment',
  primaryDomain: 'object',
  formLanguage: ['circular caldera', 'Gothic foundry', 'radial machinery', 'asymmetric crane arms', 'layered basalt'],
  structureKind: ['landlocked terrain network', 'deep open shaft', 'five landmark roots', 'canonical route integration'],
  motionPotential: ['gantry slew', 'chain sway', 'ignition pulse', 'fuse charge', 'incubator rotation', 'press indexing', 'piston cycling'],
  materialFamilies: ['black basalt', 'blackened steel', 'antique copper', 'molten emissive', 'violet crystal', 'teal heat glass'],
  notes: 'Whole-environment concept reconstructed as a locked-camera procedural world; route topology and fixed plots come from HabitGame contracts, not the illustration.',
};
assessment.preSpecAssessment.complexity = {
  tier: 'ultra-complex',
  scores: { silhouetteComplexity: 3, componentCount: 3, hierarchyDepth: 3, repetitionDensity: 3, materialLayerCount: 3, localDetailDensity: 3, occlusionRisk: 3, actionReadinessNeed: 3 },
  estimatedCounts: { macroComponents: 6, mesoComponents: 15, microFeatureGroups: 15, materialLayers: 8, repetitionSystems: 11 },
  reasoning: ['Five identity-distinct architectural families surround a deep negative-space centre.', 'Mechanical motion requires named pivots, sockets, chains and material-state ownership.', 'Phone readability requires real macro silhouettes with quality-scaled meso and micro repetition.'],
};
assessment.preSpecAssessment.specDepthDecision = { requiredDepth: 'ultra-complex', minimumComponentLevels: ['macro', 'meso', 'micro'], needsRepetitionSystems: true, needsMaterialLocalOverrides: true, needsMultipleReviewViews: true, needsActionReadyHierarchy: true, rationale: 'The crater, gantries and four external machines must remain distinguishable from overview and orbit views.' };
assessment.preSpecAssessment.unknownsToResolveBeforeImplementation = [];
assessment.preSpecAssessment.detailInventory = inventory.detailInventory;
assessment.preSpecAssessment.detailInventory.details = assessment.preSpecAssessment.detailInventory.details.map((detail) => ({ ...detail, realization: 'Named procedural geometry or explicit material-state system.', evidenceRefs: evidence }));
assessment.qualityContract.definitionOfDone = ['A phone-readable landlocked volcanic island with exactly 36 canonical wedge tiles, a visibly deep open Heartshaft, five silhouette-distinct L1/L2/L3 landmark families, a reactive mechanical ambience chain and no gameplay authority in the presentation module.'];
assessment.qualityContract.minimumSpecDepth = { macroComponents: 6, mesoComponents: 11, microFeatureGroups: 10, materialLayers: 8, repetitionSystems: 9, reviewViewpoints: 9 };
assessment.qualityContract.visualDeltaChecks = ['deep open shaft negative space', 'three asymmetric gantries and open ignition ring', 'five landmark identity separation', '36-tile route clarity', 'black steel/copper/lava/violet/teal material separation', 'landlocked caldera continuity', 'reactive ambience sequence', 'hidden-side orbit completeness'];
fs.writeFileSync(assessmentPath, `${JSON.stringify(assessment, null, 2)}\n`);

const materialDefs = [
  ['fractured-basalt', '#171419', 0.91, 0.02, 0.02, '#220600', 'large fractured plates, chipped strata and dark cavities'],
  ['blackened-steel', '#242228', 0.48, 0.82, 0.12, '#080300', 'forged panels, riveted ribs and heat-darkened edges'],
  ['antique-copper', '#8E4A24', 0.39, 0.76, 0.22, '#2D0B00', 'brushed copper crests, oxidized seams and hot joints'],
  ['molten-core', '#FF5A0A', 0.2, 0.02, 0.3, '#FF3A00', 'crimson-orange magma, conduit pulses and furnace hearts'],
  ['ash-stone', '#3A3331', 0.82, 0.03, 0.02, '#130400', 'route-support plinths, stairs and carved foundry stone'],
  ['violet-crystal', '#7D35C8', 0.18, 0.04, 0.76, '#6D17E8', 'faceted pressure crystal with deep violet core'],
  ['teal-heat-glass', '#20BDB4', 0.14, 0.02, 0.88, '#087E7C', 'tiny cyan-teal thermal glass accents'],
  ['ember-ash', '#4B2119', 0.78, 0.04, 0.02, '#7D1605', 'charred ember flora, cinder crust and soot gradients'],
];

spec.materials = materialDefs.map(([id, color, roughness, metalness, clearcoat, emissive, pattern]) => {
  const material = structuredClone(baseMaterial);
  Object.assign(material, {
    id, name: id.replaceAll('-', ' '), type: clearcoat > 0.65 ? 'physical' : 'standard', shaderModel: clearcoat > 0.65 ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial', baseColor: color, color,
    albedo: { dominant: color, secondary: ['#080709', '#C46A2E'], samplingNotes: 'Reference-guided local palette with lighting-independent base values.' },
    colorVariation: { palette: [color, '#080709', '#C46A2E'], pattern: `${pattern} with deterministic object-space variation`, amplitude: 0.12, heightCorrelation: 0.31 },
    textureResolution: 512,
    textureProjection: { mode: 'object-space', repeat: [5, 6], anisotropy: 4, texelDensityIntent: 'Phone-stable procedural detail without large runtime maps.' },
    surfaceFrequencyBands: [{ id: 'macro', frequency: 1.2, amplitude: 0.17, role: 'broad heat and mineral variation' }, { id: 'meso', frequency: 15, amplitude: 0.1, role: pattern }, { id: 'micro', frequency: 78, amplitude: 0.028, role: 'grazing-highlight breakup' }],
    roughness: { base: roughness, variation: 0.12, map: 'independent-procedural-roughness', localResponse: 'polished crests, rough cavities and heat-stressed seams' },
    metalness: { base: metalness, variation: metalness > 0.2 ? 0.08 : 0 },
    normal: { pattern, strength: id === 'fractured-basalt' ? 0.2 : 0.09, scale: 52, space: 'tangent' },
    bump: { pattern: `${pattern} independent height`, amplitude: id === 'fractured-basalt' ? 0.13 : 0.045, scale: 48 },
    displacement: { pattern: id === 'fractured-basalt' ? 'low-frequency strata' : 'none', amplitude: id === 'fractured-basalt' ? 0.04 : 0, scale: 3, silhouetteAffects: false },
    ambientOcclusion: { cavityStrength: 0.42, contactShadowBias: 0.46, notes: 'Concentrated beneath gantries, pipe unions, rivets, stairs and basalt shelves.' },
    wear: { edgeWear: id.includes('steel') || id.includes('copper') ? 0.17 : 0.05, scratches: ['short directional forge marks'], chips: id === 'fractured-basalt' ? ['angular plate-edge chips'] : [] },
    dirt: { amount: 0.1, cavityBias: 0.7, color: '#0B0808' }, clearcoat, clearcoatRoughness: clearcoat > 0.65 ? 0.12 : 0.3, emissive,
    emissiveIntensity: emissive === '#220600' || emissive === '#080300' || emissive === '#130400' ? 0.04 : id === 'molten-core' ? 2.2 : id === 'violet-crystal' ? 1.25 : id === 'teal-heat-glass' ? 0.85 : 0.18,
    localOverrides: [{ id: `${id}-heat-response`, region: 'exposed crests, heat seams, cavities and contact zones', roughness: Math.min(1, roughness + 0.09), strength: 0.32, evidenceRefs: evidence }],
    notes: `${pattern}; albedo, roughness, height and AO remain independent procedural channels.`,
  });
  delete material.referencePbr;
  return material;
});

const defs = [
  ['root', 'Heartshaft Crucible world root', 'macro', null, 'fractured-basalt', 'scene-root', ['landlocked-caldera'], 'assembled-solid'],
  ['caldera-network', 'Continuous landlocked caldera and shelves', 'macro', 'root', 'fractured-basalt', 'static-terrain', ['caldera-wall-network', 'lava-fall-cuts'], 'continuous-sculpt'],
  ['heartshaft-crucible', 'Deep open central Heartshaft Crucible', 'macro', 'root', 'fractured-basalt', 'boss-build-level-pivot', ['deep-shaft-negative-space', 'small-magma-heart'], 'continuous-sculpt'],
  ['landmark-network', 'Four external foundry landmark families', 'macro', 'root', 'blackened-steel', 'build-state-owner', ['four-fixed-plot-silhouettes'], 'assembled-solid'],
  ['route-integration', 'Canonical protected 36-tile annulus', 'macro', 'root', 'ash-stone', 'gameplay-visual', ['thirty-six-clean-wedges'], 'assembled-solid'],
  ['ambience-system', 'Reactive volcanic foundry ambience', 'macro', 'root', 'molten-core', 'ambient-motion-owner', ['reactive-mechanism-chain'], 'assembled-solid'],
  ['caldera-wall-network', 'Layered rear and side basalt cliffs', 'meso', 'caldera-network', 'fractured-basalt', 'static', ['stratified-cliff-ribs'], 'continuous-sculpt'],
  ['lava-channel-network', 'Route-clear lava falls and land conduits', 'meso', 'caldera-network', 'molten-core', 'material-pulse', ['lava-fall-courses', 'branching-ground-veins'], 'conforming-shell'],
  ['heartshaft-wall', 'Descending ribbed cylindrical shaft wall', 'meso', 'heartshaft-crucible', 'fractured-basalt', 'static', ['descending-strata-rings'], 'continuous-sculpt'],
  ['heartshaft-gantry-array', 'Three asymmetric crane gantries', 'meso', 'heartshaft-crucible', 'blackened-steel', 'gantry-slew', ['three-unequal-arms', 'open-centre'], 'assembled-solid'],
  ['ignition-ring', 'Chain-suspended skeletal ignition ring', 'meso', 'heartshaft-crucible', 'antique-copper', 'ring-pulse', ['skeletal-open-ring', 'three-chain-points'], 'assembled-solid'],
  ['blastglass-incubator', 'Blastglass Incubator hatchery', 'meso', 'landmark-network', 'molten-core', 'incubator-rotation', ['twin-caged-bulbs', 'exhaust-stack'], 'assembled-solid'],
  ['great-fuse', 'Great Fuse habit landmark', 'meso', 'landmark-network', 'blackened-steel', 'fuse-charge', ['segmented-hot-core', 'flywheel-crown'], 'assembled-solid'],
  ['memory-press', 'Memory Press wisdom landmark', 'meso', 'landmark-network', 'antique-copper', 'rune-index-and-stamp', ['rune-drum', 'stamping-table', 'teal-pylons'], 'assembled-solid'],
  ['seismic-switchyard', 'Seismic Switchyard mystery landmark', 'meso', 'landmark-network', 'violet-crystal', 'piston-and-valve-cycle', ['violet-pressure-vessel', 'gauge-forest'], 'assembled-solid'],
  ['basalt-needle-field', 'Asymmetric volcanic needle field', 'meso', 'caldera-network', 'fractured-basalt', 'static', ['depth-layer-needles'], 'assembled-solid'],
  ['ember-flora-field', 'Sparse route-clear ember flora', 'meso', 'ambience-system', 'ember-ash', 'ember-breath', ['crystal-ember-clusters'], 'assembled-solid'],
  ['gantry-truss-array', 'Riveted gantry trusses and drive wheels', 'micro', 'heartshaft-gantry-array', 'blackened-steel', 'wheel-rotation', ['truss-diagonals', 'drive-wheels'], 'assembled-solid'],
  ['chain-system', 'Three chain runs and hanging counterweights', 'micro', 'heartshaft-gantry-array', 'antique-copper', 'chain-sway', ['chain-link-runs', 'counterweights'], 'fiber-strand'],
  ['shaft-strata-array', 'Descending shaft strata rings', 'micro', 'heartshaft-wall', 'ash-stone', 'material-pulse', ['depth-rings'], 'surface-relief'],
  ['incubator-cage-array', 'Copper ribs around furnace bulbs', 'micro', 'blastglass-incubator', 'antique-copper', 'cage-rotation', ['cage-ribs'], 'assembled-solid'],
  ['fuse-segment-array', 'Stacked fuse bands and charge windows', 'micro', 'great-fuse', 'molten-core', 'charge-propagation', ['fuse-bands'], 'assembled-solid'],
  ['memory-rune-array', 'Indexed rune bands and press dies', 'micro', 'memory-press', 'antique-copper', 'rune-index', ['rune-bands', 'press-dies'], 'surface-relief'],
  ['switchyard-valve-array', 'Valves, gauges and piston heads', 'micro', 'seismic-switchyard', 'blackened-steel', 'valve-and-piston-cycle', ['valve-wheels', 'gauge-dials'], 'assembled-solid'],
  ['conduit-pulse-network', 'Copper and molten signal conduits', 'micro', 'ambience-system', 'molten-core', 'material-pulse', ['landmark-link-path'], 'conforming-shell'],
  ['rivet-seam-system', 'Phone-stable rivet and panel seams', 'micro', 'landmark-network', 'antique-copper', 'static', ['riveted-crests'], 'surface-relief'],
  ['cinder-particle-field', 'Quality-scaled sparks, ash and heat motes', 'micro', 'ambience-system', 'molten-core', 'drift-reset', ['cinder-depth-layers'], 'assembled-solid'],
];

const colors = new Map(materialDefs.map((definition) => [definition[0], definition[1]]));
spec.componentTree = defs.map(([id, name, level, parent, material, role, features, topologyClass]) => {
  const component = structuredClone(baseComponent);
  Object.assign(component, { id, name, level, parent, material, role, topologyClass, topologyRationale: topologyClass === 'fiber-strand' ? 'Chains and cables need root-to-end curve sweeps.' : topologyClass === 'conforming-shell' ? 'Thin glowing channels conform to authored terrain paths.' : topologyClass === 'continuous-sculpt' ? 'Crater and basalt forms require uninterrupted negative-space silhouettes.' : 'Discrete architectural mechanism with explicit volume.', importance: level === 'macro' ? 1 : level === 'meso' ? 0.91 : 0.76, confidence: parent ? 0.91 : 1, primitive: topologyClass === 'fiber-strand' ? 'tube' : topologyClass === 'conforming-shell' ? 'extrude' : topologyClass === 'continuous-sculpt' ? 'lathe' : id.includes('array') || id.includes('field') || id.includes('system') ? 'instanced-cluster' : 'cylinder', materialLayers: [material], evidenceRefs: evidence });
  component.actionProfile.animationRole = role;
  component.actionProfile.transformChannels = { translate: role.includes('piston') || role.includes('stamp') || role.includes('drift'), rotate: role.includes('rotation') || role.includes('index') || role.includes('slew') || role.includes('wheel') || role.includes('valve'), scale: role.includes('pulse') || role.includes('charge') || role.includes('breath'), bend: role.includes('sway'), twist: false, detach: false, visibility: true, materialState: role.includes('pulse') || role.includes('charge') || role.includes('material') };
  component.localFeatures = features.map((feature) => ({ id: feature, placement: `Observable authored system on ${name}`, size: 'phone-readable silhouette or repeated meso detail', orientation: 'aligned to local mechanism, terrain wall or radial shaft frame', materialEffect: 'independent heat, metal or mineral response', geometryEffect: 'real geometry whenever it changes silhouette or attachment readability', confidence: 0.92, evidenceRefs: evidence }));
  component.surfaceDetail = { macroRoughness: 0.17, microRoughness: 0.11, bumpAmplitude: 0.05, normalPattern: `${material}-independent-normal`, displacementPattern: 'macro form owned by geometry', occlusionPattern: 'pipe unions, trusses, stairs, shaft ribs and basalt cavities', edgeWearPattern: 'restrained hot crest response', notes: 'Phone-stable macro, meso and micro frequency separation.' };
  component.colorMaterialRecipe = { dominantAlbedo: rgba(colors.get(material)), secondaryAlbedo: rgba('#080709'), materialClass: material.includes('steel') || material.includes('copper') ? 'metal' : material.includes('glass') || material.includes('crystal') ? 'glass' : 'stone', materialClassConfidence: 0.91, colorGradient: { type: 'linear', stops: [{ at: 0, color: rgba(colors.get(material)) }, { at: 1, color: rgba('#C46A2E') }] }, evidenceRefs: evidence };
  if (parent) component.attachment = { parentId: parent, parentSocket: `${parent}-socket`, localStart: [0, 0, 0], localEnd: [0, 0.1, 0], baseRadius: 0.1, endRadius: 0.08, overlap: 0.04, embedDepth: 0.035, contactType: 'embedded', gapTolerance: 0.01, evidenceRefs: evidence };
  return component;
});

spec.suitability = 'conditional';
spec.scores = { object_isolation: 1, silhouette_readability: 3, depth_inference: 2, primitive_decomposition: 3, material_procedurality: 3, occlusion_risk: 2, interaction_fit: 3 };
spec.referenceCamera = { solved: false, fovDegrees: 42, aspect: 0.5625, orientation: { yaw: 0, pitch: -49, roll: 0 }, positionHint: [0, 19, 25], note: 'Portrait three-quarter concept; the locked HabitGame camera is authoritative and hidden sides require orbit review.' };
spec.preSpecAssessment = assessment.preSpecAssessment;
spec.qualityContract = assessment.qualityContract;
spec.repetitionSystems = [
  ['shaft-strata', 12, 'descending open shaft depth rings'], ['gantry-trusses', 18, 'three asymmetric braced crane arms'], ['chain-links', 66, 'quality-scaled suspended chain runs'], ['incubator-cage-ribs', 20, 'twin radial furnace cages'], ['fuse-bands', 8, 'vertical charge sequence'], ['memory-runes', 24, 'indexed drum glyph blocks'], ['switchyard-valves', 9, 'asymmetric valve and gauge cluster'], ['basalt-needles', 28, 'rear and side depth layers'], ['lava-channels', 14, 'route-clear falls and ground veins'], ['ember-flora', 26, 'sparse rim clusters'], ['cinder-particles', 120, 'quality-scaled near, middle and far drift'],
].map(([id, instances, pattern]) => ({ id, geometry: 'named deterministic procedural system', instances, pattern, buildsGeometry: true, realization: 'quality-tier-scaled batching, instancing or named animated roots', evidenceRefs: evidence }));
spec.featureReviewTargets = [
  ['heartshaft-negative-space', 'Deep open shaft remains the dominant centre with a small magma heart', ['heartshaft-crucible', 'heartshaft-wall', 'shaft-strata-array'], 0.93],
  ['gantry-ring-identity', 'Three asymmetric gantries suspend an open skeletal ring without covering the crater', ['heartshaft-gantry-array', 'ignition-ring', 'chain-system'], 0.93],
  ['five-landmark-identities', 'Crucible, incubator, fuse, press and switchyard remain unmistakably different', ['heartshaft-crucible', 'blastglass-incubator', 'great-fuse', 'memory-press', 'seismic-switchyard'], 0.92],
  ['canonical-route-clarity', 'Exactly 36 wedge tile tops and reward objects remain readable and unoccluded', ['route-integration'], 0.96],
  ['reactive-foundry-chain', 'Fuse, conduits, incubator, press, switchyard, gantries, ring and magma visibly hand off one pulse', ['ambience-system', 'conduit-pulse-network', 'landmark-network'], 0.88],
  ['landlocked-material-read', 'Continuous basalt land, steel, copper, lava, violet and teal remain separated with no water or sky island', ['caldera-network', 'landmark-network', 'ambience-system'], 0.9],
].map(([id, name, componentRefs, score], index) => ({ id, name, tier: index === 5 ? 'important' : 'critical', passIds: ['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'lighting-pass', 'interaction-pass'], minimumScore: score, mustPass: index !== 5, componentRefs, evidenceRefs: evidence }));
spec.viewEvidence = [{ id: 'reference-heartshaft-overview', view: 'portrait final-angle three-quarter overview', imageRegion: { x: 0, y: 0, width: 1, height: 1, units: 'normalized' }, observations: ['landlocked volcanic caldera', 'deep central shaft and small magma heart', 'three asymmetric gantries and open hanging ring', 'four distinct corner mechanisms', 'black metal and antique copper', 'orange conduits with violet and teal accents'], confidence: 0.95 }];
spec.lightingFromPhoto = ['Warm molten key and underlight rises from the shaft and lava channels.', 'Low warm daylight from upper left keeps basalt and black steel readable.', 'Cool violet and tiny teal practicals separate the lower landmark families.', 'ACES filmic tone mapping and restrained exposure protect emissive orange detail.', 'Contact shadows ground stairs, pipes, footings and rock shelves.'];
spec.proceduralStrategy = ['Preserve shared tile geometry and gameplay transforms outside the Island 009 visual module.', 'Author the crater as nested open back-facing walls and depth rings rather than a closed platform.', 'Use named action-ready roots for each landmark and each phase of the visual ambience chain.', 'Use truss primitives, curve-swept conduits, quality-scaled radial arrays and batched basalt repetition.', 'Freeze decorative motion under reduced motion while keeping the mechanism in an informative charged pose.'];
spec.performanceBudget = { qualityPriority: 'phone-reference-fidelity', targetTriangles: 180000, maxDrawCalls: 175, textureSize: 512, fpsTarget: 50, optimizationPolicy: 'Batch basalt, metal trim and repeated mechanisms by material; reduce particles, chain links, needles, conduit layers, rivets and radial segments across quality tiers before removing identity-defining silhouettes.' };
spec.lookDevTargets = { qualityPriority: 'procedural-reference-guided', materialPass: { albedoPaletteRequired: true, roughnessVariationRequired: true, normalOrBumpRequired: true, localOverridesRequired: true, referencePbrExtraction: { requiredWhenSourceImagePresent: false, acceptedLimitation: 'The illustrated environment contains baked lava and cinematic lighting and cannot yield trustworthy isolated PBR maps.' } }, lightingPass: { requiredTerms: ['key light', 'fill light', 'rim light', 'exposure', 'tone mapping', 'background', 'contact shadow'] }, screenshotReview: ['phone overview', 'map-stripped overview', 'orbit left', 'orbit right', 'five landmark focuses', 'L1 L2 L3 overview', 'high versus low quality'] };
spec.actionReadiness = { contract: 'Every landmark and ambience phase owns a named Object3D root; animation remains presentation-only.', defaultRigType: 'action-ready-static-world', rootMotionNode: 'root', requiredComponentFields: ['id', 'parent', 'actionProfile.animationRole'], transformChannels: ['translate', 'rotate', 'scale', 'visibility', 'material-state'], authoringRules: ['Keep gameplay tiles outside the visual module.', 'Keep landmarks in separate clickable roots.', 'Disable or freeze decorative movement for reduced motion.'], destructionPolicy: { defaultBreakable: false } };
spec.qualityTargets.reviewViewpoints = ['phone-overview', 'map-stripped-overview', 'orbit-left', 'orbit-right', 'hatchery-focus', 'habit-focus', 'mystery-focus', 'wisdom-focus', 'boss-focus'];
for (const pass of spec.buildPasses) pass.componentRefs = defs.map((definition) => definition[0]);
spec.sculptPipeline.currentPass = 'blockout';
spec.sculptPipeline.completedPasses = [];
spec.sculptPipeline.lastCompletedPass = null;
spec.sculptPipeline.blockedReason = null;
fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
