import fs from 'node:fs';

const root = new URL('./', import.meta.url);
const specPath = new URL('./cactus-canyon-sculpt-spec.json', root);
const assessmentPath = new URL('./pre-spec-assessment.json', root);
const inventoryPath = new URL('./detail-inventory.json', root);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const assessment = JSON.parse(fs.readFileSync(assessmentPath, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const baseComponent = structuredClone(spec.componentTree[0]);
const baseMaterial = structuredClone(spec.materials[0]);
const evidence = ['source-cactus-canyon-overview'];

assessment.preSpecAssessment.detailInventory = inventory.detailInventory;
assessment.preSpecAssessment.detailInventory.details = assessment.preSpecAssessment.detailInventory.details.map((detail) => ({
  ...detail,
  realization: detail.mapsTo.type === 'material.localOverrides' ? 'procedural-local-material-override' : 'named-procedural-geometry',
  evidenceRefs: [detail.evidenceRef],
}));
assessment.qualityContract.minimumSpecDepth = {
  macroComponents: 8,
  mesoComponents: 20,
  microFeatureGroups: 16,
  materialLayers: 8,
  repetitionSystems: 9,
  reviewViewpoints: 9,
};
fs.writeFileSync(assessmentPath, `${JSON.stringify(assessment, null, 2)}\n`);

const rgba = (hex) => {
  const value = hex.replace('#', '');
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, 1.0)`;
};

const materialDefs = [
  ['sky-material', '#F2B787', 0.95, 0.0, 0.0, '#7C483A', 'peach-gold sky gradient and lavender distance haze'],
  ['sandstone-material', '#C7602D', 0.82, 0.0, 0.02, '#5D241C', 'terracotta strata, fractured shelves and dark cavities'],
  ['sand-ground-material', '#D99455', 0.88, 0.0, 0.01, '#8E4B2E', 'pale compacted sand and sun-bleached flagstone mottling'],
  ['timber-material', '#4A2A1D', 0.72, 0.0, 0.05, '#1E130F', 'weathered plank grain, braces, seams and worn edges'],
  ['rail-steel-material', '#2B292A', 0.38, 0.88, 0.08, '#110D0B', 'dark steel rails, spikes, wheel rims and narrow sun highlights'],
  ['brass-material', '#B06A2B', 0.29, 0.83, 0.16, '#4A200D', 'warm brass bands, bell, fasteners and machine accents'],
  ['window-material', '#F2A53A', 0.22, 0.03, 0.48, '#F28A20', 'recessed amber inhabited windows with occasional muted blue safe light'],
  ['cactus-material', '#647A3D', 0.68, 0.0, 0.03, '#26351F', 'varied sage and olive cactus ribs with matte wax response'],
  ['locomotive-material', '#26384A', 0.42, 0.67, 0.1, '#0C1218', 'blue-black painted boiler, soot masks, brass trim and hot cab accents'],
];

const materialOverrides = {
  'sky-material': [{ id: 'sky-material.sunset-haze-gradient', region: 'vertical sky and horizon depth', roughness: 0.95, strength: 0.62, evidenceRefs: ['detail-zones/zone-r0c0.png'] }],
  'sandstone-material': [{ id: 'sandstone-material.edge-cavity-weathering', region: 'bright broken crests and dark recessed strata', roughness: 0.9, strength: 0.58, evidenceRefs: ['detail-zones/zone-r1c0.png'] }],
  'window-material': [{ id: 'window-material.amber-recess-emission', region: 'arched and square window recesses', roughness: 0.2, strength: 0.78, emissive: '#F28A20', emissiveIntensity: 0.85, evidenceRefs: ['detail-zones/zone-r1c1.png'] }],
  'locomotive-material': [{ id: 'locomotive-material.steam-soot-mask', region: 'chimney, boiler seams and wheel cavities', roughness: 0.62, strength: 0.5, evidenceRefs: ['detail-zones/zone-r1c1.png'] }],
};

spec.materials = materialDefs.map(([id, color, roughness, metalness, clearcoat, secondary, pattern]) => {
  const material = structuredClone(baseMaterial);
  Object.assign(material, {
    id,
    name: id.replaceAll('-', ' '),
    type: clearcoat > 0.4 ? 'physical' : 'standard',
    shaderModel: clearcoat > 0.4 ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial',
    baseColor: color,
    color,
    albedo: { dominant: color, secondary: [secondary, '#E4A363'], samplingNotes: 'Reference-guided base values separated from baked sunset illumination.' },
    colorVariation: { palette: [color, secondary, '#E4A363'], pattern: `${pattern}; deterministic object-space variation`, amplitude: 0.13, heightCorrelation: 0.34 },
    textureResolution: 512,
    textureProjection: { mode: 'object-space', repeat: [5, 6], anisotropy: 4, texelDensityIntent: 'Phone-stable procedural detail without high-byte raster maps.' },
    surfaceFrequencyBands: [
      { id: 'macro', frequency: 1.2, amplitude: 0.18, role: 'broad geological, sunset or weathering variation' },
      { id: 'meso', frequency: 14, amplitude: 0.09, role: pattern },
      { id: 'micro', frequency: 68, amplitude: 0.026, role: 'grazing-highlight breakup' },
    ],
    roughness: { base: roughness, variation: 0.12, map: 'independent-procedural-roughness', localResponse: 'rough cavities with selectively worn crests' },
    metalness: { base: metalness, variation: metalness > 0.2 ? 0.08 : 0.0 },
    normal: { pattern: `${pattern} independent normal field`, strength: id === 'sandstone-material' ? 0.22 : 0.1, scale: 48, space: 'tangent' },
    bump: { pattern: `${pattern} independent height field`, amplitude: id === 'sandstone-material' ? 0.12 : 0.04, scale: 42 },
    displacement: { pattern: id === 'sandstone-material' ? 'low-frequency fractured strata' : 'none', amplitude: id === 'sandstone-material' ? 0.035 : 0, scale: 3, silhouetteAffects: false },
    ambientOcclusion: { cavityStrength: 0.4, contactShadowBias: 0.44, notes: 'Concentrated under cliff shelves, porches, sleepers, trestles, eaves and machine joints.' },
    wear: { edgeWear: metalness > 0.2 || id === 'timber-material' ? 0.16 : 0.05, scratches: metalness > 0.2 ? ['short directional service scratches'] : [], chips: id === 'sandstone-material' ? ['irregular shelf-edge chips'] : [] },
    dirt: { amount: id === 'sky-material' ? 0 : 0.1, cavityBias: 0.72, color: '#21130F' },
    clearcoat,
    clearcoatRoughness: clearcoat > 0.4 ? 0.2 : 0.5,
    emissive: id === 'window-material' ? '#F28A20' : '#000000',
    emissiveIntensity: id === 'window-material' ? 0.8 : 0,
    localOverrides: materialOverrides[id] || [{ id: `${id}.reference-weathering`, region: 'exposed crests, cavities and contact zones', roughness: Math.min(1, roughness + 0.08), strength: 0.28, evidenceRefs: evidence }],
    notes: `${pattern}; albedo, roughness, normal/height and AO remain independent procedural channels.`,
  });
  delete material.referencePbr;
  return material;
});

const defs = [
  ['root', 'Cactus Canyon world root', 'macro', null, 'sandstone-material', 'scene-root', ['world-source-identity'], 'assembled-solid'],
  ['background-canyon', 'World-space sunset canyon depth', 'macro', 'root', 'sky-material', 'background-owner', ['fixed-sun-and-depth-layers'], 'assembled-solid'],
  ['mesa-network', 'Fractured floating red-rock mesa', 'macro', 'root', 'sandstone-material', 'static-terrain', ['asymmetric-floating-shelf'], 'continuous-sculpt'],
  ['route-integration', 'Canonical protected 36-tile route context', 'macro', 'root', 'sand-ground-material', 'gameplay-visual', ['thirty-six-clean-wedge-clearance'], 'assembled-solid'],
  ['railway-system', 'Concentric frontier railway', 'macro', 'root', 'rail-steel-material', 'rail-motion-owner', ['railway-system.paired-rail-curves', 'railway-system.instanced-sleepers-fasteners'], 'fiber-strand'],
  ['landmark-network', 'Five canonical Cactus Canyon landmarks', 'macro', 'root', 'timber-material', 'build-state-owner', ['five-distinct-silhouettes'], 'assembled-solid'],
  ['locomotive', 'Canyon Loop steam locomotive', 'macro', 'railway-system', 'locomotive-material', 'train-path-motion', ['locomotive.wheel-and-rod-assembly'], 'assembled-solid'],
  ['ambience-system', 'Cactus Canyon living ambience', 'macro', 'root', 'cactus-material', 'ambient-motion-owner', ['elapsed-time-world-life'], 'assembled-solid'],

  ['sunset-sky', 'Peach-gold sky and cloud layers', 'meso', 'background-canyon', 'sky-material', 'static-background', ['sunset-gradient'], 'conforming-shell'],
  ['background-buttes', 'Near, middle and far canyon buttes', 'meso', 'background-canyon', 'sandstone-material', 'static-background', ['background-buttes.layered-strata'], 'continuous-sculpt'],
  ['mesa-cliff', 'Vertical fractured cliff shell and underside', 'meso', 'mesa-network', 'sandstone-material', 'static', ['mesa-cliff.vertical-strata-and-shelf-bands'], 'continuous-sculpt'],
  ['mesa-ground', 'Pale inhabited upper shelf', 'meso', 'mesa-network', 'sand-ground-material', 'static', ['quiet-route-clear-ground'], 'continuous-sculpt'],
  ['rail-tunnel', 'Caution tunnel and rock portal', 'meso', 'railway-system', 'sandstone-material', 'static', ['rail-tunnel.deep-arch-opening'], 'continuous-sculpt'],
  ['union-station', 'Cactus Crown Union Station boss', 'meso', 'landmark-network', 'timber-material', 'boss-build-level-pivot', ['union-station.stepped-gable-silhouette', 'union-station.timber-frame-system', 'union-station.bell-flag-crown'], 'assembled-solid'],
  ['rail-nest-waterworks', 'Rail Nest Waterworks hatchery', 'meso', 'landmark-network', 'timber-material', 'hatchery-build-level-pivot', ['rail-nest-waterworks.trestle-bracing'], 'assembled-solid'],
  ['windmill-ranch', 'Windmill Ranch Yard habit landmark', 'meso', 'landmark-network', 'timber-material', 'habit-build-level-pivot', ['windmill-ranch.radial-rotor-system'], 'assembled-solid'],
  ['showdown-signal-yard', 'Showdown Signal Yard mystery landmark', 'meso', 'landmark-network', 'timber-material', 'mystery-build-level-pivot', ['broad-low-corral-silhouette'], 'assembled-solid'],
  ['sheriff-archive', 'Prospector Sheriff Archive wisdom landmark', 'meso', 'landmark-network', 'timber-material', 'wisdom-build-level-pivot', ['sheriff-archive.porch-roof-sign-silhouette'], 'assembled-solid'],
  ['station-bell-tower', 'Union Station bell tower', 'meso', 'union-station', 'timber-material', 'bell-pivot', ['stepped-cupola'], 'assembled-solid'],
  ['station-gabled-wings', 'Union Station gabled side wings', 'meso', 'union-station', 'timber-material', 'build-state', ['frontier-gabled-wings'], 'assembled-solid'],
  ['water-tank', 'Conical-roof water tank', 'meso', 'rail-nest-waterworks', 'timber-material', 'water-level-pulse', ['cylindrical-tank-and-roof'], 'assembled-solid'],
  ['waterworks-depot', 'Egg rail depot and service platform', 'meso', 'rail-nest-waterworks', 'timber-material', 'hatchery-glow', ['nest-chamber-and-pipe'], 'assembled-solid'],
  ['windmill-tower', 'Cross-braced windmill tower', 'meso', 'windmill-ranch', 'timber-material', 'static', ['tapered-trestle'], 'assembled-solid'],
  ['windmill-rotor', 'Multi-blade windmill rotor', 'meso', 'windmill-ranch', 'rail-steel-material', 'windmill-rotation', ['radial-tapered-blades'], 'assembled-solid'],
  ['ranch-workshop', 'Gabled ranch workshop and fenced yard', 'meso', 'windmill-ranch', 'timber-material', 'build-state', ['workshop-porch-yard'], 'assembled-solid'],
  ['signal-corral', 'Circular challenge/corral platform', 'meso', 'showdown-signal-yard', 'sand-ground-material', 'mystery-pulse', ['open-corral-floor'], 'assembled-solid'],
  ['signal-tower', 'Rail switch and signal mast', 'meso', 'showdown-signal-yard', 'rail-steel-material', 'signal-cycle', ['switch-lever-and-lamps'], 'assembled-solid'],
  ['sheriff-office', 'Two-storey sheriff office and porch', 'meso', 'sheriff-archive', 'timber-material', 'build-state', ['deep-porch-roof-lantern'], 'assembled-solid'],
  ['archive-annex', 'Prospector map room and records safe', 'meso', 'sheriff-archive', 'window-material', 'wisdom-glow', ['map-safe-survey-gear'], 'assembled-solid'],
  ['locomotive-engine', 'Boiler cab and chimney engine', 'meso', 'locomotive', 'locomotive-material', 'train-motion', ['boiler-cab-chimney'], 'assembled-solid'],
  ['locomotive-tender', 'Fuel tender and rear coupling', 'meso', 'locomotive', 'locomotive-material', 'train-motion', ['tender-coupling'], 'assembled-solid'],
  ['cactus-system', 'Varied route-clear cactus families', 'meso', 'ambience-system', 'cactus-material', 'cactus-sway', ['cactus-system.varied-ribbed-saguaro-family'], 'continuous-sculpt'],
  ['frontier-props', 'Fence crate barrel and shed clusters', 'meso', 'ambience-system', 'timber-material', 'static', ['frontier-props.instanced-fence-crate-clusters'], 'assembled-solid'],

  ['cliff-strata-array', 'Cliff strata ribs and shelf bands', 'micro', 'mesa-cliff', 'sandstone-material', 'static', ['vertical-grooves', 'horizontal-shelves'], 'surface-relief'],
  ['rail-sleeper-array', 'Rail sleepers and fasteners', 'micro', 'railway-system', 'timber-material', 'static', ['spaced-sleepers', 'rail-spikes'], 'assembled-solid'],
  ['station-window-array', 'Station arched window recesses', 'micro', 'union-station', 'window-material', 'window-pulse', ['amber-window-grid'], 'surface-relief'],
  ['station-brace-array', 'Station posts braces and plank seams', 'micro', 'union-station', 'timber-material', 'static', ['cross-braces', 'plank-seams'], 'surface-relief'],
  ['bell-flag-array', 'Bell flag pole and roof finials', 'micro', 'station-bell-tower', 'brass-material', 'flag-wave', ['bell-yoke', 'flag-finial'], 'assembled-solid'],
  ['windmill-blade-array', 'Radial windmill blade modules', 'micro', 'windmill-rotor', 'rail-steel-material', 'windmill-rotation', ['tapered-blades'], 'assembled-solid'],
  ['waterwork-brace-array', 'Water tower cross braces and pipe joints', 'micro', 'rail-nest-waterworks', 'timber-material', 'static', ['trestle-cross-braces', 'pipe-elbows'], 'assembled-solid'],
  ['locomotive-wheel-array', 'Locomotive wheels and connecting rods', 'micro', 'locomotive-engine', 'rail-steel-material', 'wheel-and-rod-motion', ['wheel-rims', 'connecting-rods'], 'assembled-solid'],
  ['locomotive-steam-field', 'Chimney steam and wheel dust', 'micro', 'locomotive-engine', 'sky-material', 'steam-drift-reset', ['steam-puffs', 'track-dust'], 'assembled-solid'],
  ['tunnel-block-array', 'Weathered tunnel arch blocks', 'micro', 'rail-tunnel', 'sandstone-material', 'static', ['arch-blocks'], 'assembled-solid'],
  ['sheriff-porch-array', 'Sheriff posts railings and sign silhouette', 'micro', 'sheriff-office', 'timber-material', 'static', ['porch-posts', 'roof-sign'], 'assembled-solid'],
  ['cactus-rib-array', 'Saguaro ribs arms and spines', 'micro', 'cactus-system', 'cactus-material', 'cactus-sway', ['cactus-ribs', 'varied-arms'], 'surface-relief'],
  ['fence-post-array', 'Irregular frontier fence posts', 'micro', 'frontier-props', 'timber-material', 'static', ['fence-posts'], 'assembled-solid'],
  ['crate-barrel-array', 'Crate barrel and small shed modules', 'micro', 'frontier-props', 'timber-material', 'static', ['crate-barrel-clusters'], 'assembled-solid'],
  ['dust-tumbleweed-field', 'Dust wisps and sparse tumbleweed', 'micro', 'ambience-system', 'sand-ground-material', 'drift-reset', ['dust-depth-layers'], 'assembled-solid'],
  ['butte-strata-array', 'Repeated far-butte shelf bands', 'micro', 'background-buttes', 'sandstone-material', 'static', ['depth-faded-strata'], 'surface-relief'],
  ['window-mullion-array', 'Frontier window mullions', 'micro', 'landmark-network', 'brass-material', 'static', ['window-mullions'], 'surface-relief'],
  ['rail-signal-lamp-array', 'Signal lamps and switching hardware', 'micro', 'signal-tower', 'brass-material', 'signal-cycle', ['signal-lamps', 'switch-fasteners'], 'assembled-solid'],
];

const colorByMaterial = new Map(materialDefs.map((definition) => [definition[0], definition[1]]));
spec.componentTree = defs.map(([id, name, level, parent, material, role, features, topologyClass]) => {
  const component = structuredClone(baseComponent);
  const primitive = topologyClass === 'fiber-strand' ? 'tube' : topologyClass === 'conforming-shell' ? 'extrude' : topologyClass === 'continuous-sculpt' ? 'lathe' : id.includes('array') || id.includes('field') || id.includes('system') ? 'instanced-cluster' : 'box';
  Object.assign(component, {
    id,
    name,
    level,
    parent,
    material,
    role,
    primitive,
    topologyClass,
    topologyRationale: topologyClass === 'fiber-strand' ? 'Continuous paired rails follow authored curves.' : topologyClass === 'conforming-shell' ? 'Thin atmospheric or ground layer conforms to its parent volume.' : topologyClass === 'continuous-sculpt' ? 'Geological or botanical silhouette requires a continuous varying volume.' : topologyClass === 'surface-relief' ? 'Repeated relief changes visible surface response without owning the macro volume.' : 'Discrete rigid architectural or mechanical volume.',
    importance: level === 'macro' ? 1 : level === 'meso' ? 0.9 : 0.74,
    confidence: parent ? 0.9 : 1,
    materialLayers: [material],
    evidenceRefs: evidence,
  });
  component.actionProfile.animationRole = role;
  component.actionProfile.transformChannels = {
    translate: role.includes('motion') || role.includes('drift'),
    rotate: role.includes('rotation') || role.includes('wheel') || role.includes('signal') || role.includes('flag'),
    scale: role.includes('pulse') || role.includes('steam'),
    bend: role.includes('sway') || role.includes('flag'),
    twist: false,
    detach: false,
    visibility: true,
    materialState: role.includes('pulse') || role.includes('glow') || role.includes('signal'),
  };
  component.localFeatures = features.map((feature) => ({
    id: feature,
    placement: `Observable authored system on ${name}`,
    size: 'phone-readable silhouette or repeated meso/micro detail',
    orientation: 'aligned to local building, rail, terrain or animation frame',
    materialEffect: 'independent canyon, timber, metal, window or vegetation response',
    geometryEffect: 'real geometry when it changes silhouette, attachment or shadow readability',
    confidence: 0.92,
    evidenceRefs: evidence,
  }));
  component.surfaceDetail = { macroRoughness: 0.16, microRoughness: 0.1, bumpAmplitude: 0.045, normalPattern: `${material}-independent-normal`, displacementPattern: 'macro form owned by geometry', occlusionPattern: 'strata cavities, eaves, porches, sleepers, trestles and joints', edgeWearPattern: 'restrained sun-facing crest response', notes: 'Phone-stable macro/meso/micro frequency separation.' };
  component.colorMaterialRecipe = { dominantAlbedo: rgba(colorByMaterial.get(material)), secondaryAlbedo: rgba('#21130F'), materialClass: material.includes('steel') || material.includes('brass') || material.includes('locomotive') ? 'metal' : material.includes('window') ? 'glass' : material.includes('cactus') ? 'unknown' : material.includes('timber') ? 'wood' : 'stone', materialClassConfidence: 0.92, colorGradient: { type: 'linear', stops: [{ at: 0, color: rgba(colorByMaterial.get(material)) }, { at: 1, color: rgba('#E4A363') }] }, evidenceRefs: evidence };
  if (parent) component.attachment = { parentId: parent, parentSocket: `${parent}-socket`, localStart: [0, 0, 0], localEnd: [0, 0.1, 0], baseRadius: 0.1, endRadius: 0.08, overlap: 0.04, embedDepth: 0.035, contactType: 'embedded', gapTolerance: 0.01, evidenceRefs: evidence };
  return component;
});

spec.suitability = 'conditional';
spec.scores = { object_isolation: 1, silhouette_readability: 3, depth_inference: 2, primitive_decomposition: 3, material_procedurality: 3, occlusion_risk: 3, interaction_fit: 3 };
spec.referenceCamera = { solved: false, fovDegrees: 42, aspect: 0.6656, orientation: { yaw: 0, pitch: -47, roll: 0 }, positionHint: [0, 18, 25], note: 'The concept is a portrait high three-quarter overview. HabitGame camera/board framing is authoritative; hidden sides require orbit review.' };
spec.preSpecAssessment = assessment.preSpecAssessment;
spec.qualityContract = assessment.qualityContract;
spec.assumptions = [
  'Rear facades and exact floorplans are hidden; repeat the visible frontier construction language at 0.55–0.70 confidence.',
  'Mesa underside and rear cliff topology are controlled inferences from the visible fractured front edge.',
  'Railway and tunnel geometry fit around the canonical board and do not copy the illustrative source tile or track count.',
  'L1 and L2 are additive authored construction states that preserve each visible L3 identity and footprint.',
  'Baked text, labels, HUD and token are excluded as non-geometry evidence.',
];
spec.silhouette = { boundingShape: 'asymmetric oval floating mesa with fractured underside and stepped architectural skyline', aspectRatios: ['visible mesa width approximately 1.45x its shelf depth', 'central station approximately 1.7x surrounding roof height'], symmetry: 'asymmetric terrain with balanced four-satellite composition', dominantCurves: ['outer railway ellipse', 'inner route annulus', 'mesa rim'], negativeSpaces: ['tunnel opening', 'windmill blade gaps', 'water-tower trestle bays', 'floating cliff underside'], landmarks: ['central Union Station', 'rear-right windmill', 'rear-left water tower', 'front-left signal yard', 'front-right sheriff archive'] };
spec.viewEvidence = [{ id: 'source-cactus-canyon-overview', view: 'portrait high front-three-quarter overview', imageRegion: { x: 0, y: 0, width: 1, height: 1, units: 'normalized' }, observations: ['floating fractured red-rock mesa', 'double railway and locomotive', 'central frontier bell tower', 'four distinct satellite sites', 'sparse cacti and fences', 'layered warm canyon buttes'], confidence: 0.96 }];
spec.repetitionSystems = [
  ['rail-sleepers-fasteners', 96, 'even spacing along paired outer rail curves'],
  ['cliff-strata-ribs', 48, 'irregular vertical fins and horizontal shelves around the mesa edge'],
  ['far-butte-layers', 18, 'three depth bands with decreasing scale, saturation and contrast'],
  ['station-window-braces', 34, 'arched windows, posts and cross-braces across station tiers'],
  ['windmill-blades', 16, 'radial tapered blades around one rotor hub'],
  ['locomotive-wheels-rods', 12, 'wheel pairs and attached connecting-rod chain'],
  ['cactus-families', 34, 'route-clear saguaro, barrel and scrub groups with deterministic variation'],
  ['frontier-fences-props', 52, 'irregular fence, crate, barrel and shed clusters outside the route gutter'],
  ['steam-dust-particles', 54, 'quality-scaled near/mid steam and dust puffs'],
  ['roof-window-modules', 28, 'gables, shingles and recessed windows across five landmarks'],
].map(([id, instances, pattern]) => ({ id, geometry: 'named deterministic procedural system', instances, pattern, buildsGeometry: true, realization: 'quality-tier-scaled instancing, static batching or named animated roots', evidenceRefs: evidence }));

spec.featureReviewTargets = [
  ['mesa-railway-identity', 'Fractured floating mesa and continuous double railway remain the primary world silhouette', ['mesa-network', 'mesa-cliff', 'railway-system'], 0.78],
  ['five-frontier-landmarks', 'Union Station, windmill, water tower, signal yard and sheriff archive remain unmistakably different', ['union-station', 'windmill-ranch', 'rail-nest-waterworks', 'showdown-signal-yard', 'sheriff-archive'], 0.8],
  ['locomotive-mechanical-life', 'A readable articulated steam locomotive travels the rail with attached wheels, rods and steam', ['locomotive', 'locomotive-engine', 'locomotive-wheel-array', 'locomotive-steam-field'], 0.8],
  ['canyon-depth-stack', 'Near, middle and far buttes recede through warm atmospheric haze without rotating as foreground scenery', ['background-canyon', 'background-buttes', 'butte-strata-array'], 0.78],
  ['canonical-route-clarity', 'All 36 live tiles, rewards and token remain readable and unobstructed', ['route-integration'], 0.96],
  ['material-sunset-read', 'Sandstone, pale ground, timber, steel, brass, amber glass and cactus greens remain separated under late-day light', ['mesa-network', 'landmark-network', 'railway-system', 'ambience-system'], 0.85],
].map(([id, name, componentRefs, score], index) => ({ id, name, tier: index === 5 ? 'important' : 'critical', passIds: ['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'lighting-pass', 'interaction-pass'], minimumScore: score, mustPass: index !== 5, componentRefs, evidenceRefs: evidence }));
const stagedFeatureMinimums = {
  'mesa-railway-identity': { blockout: 0.72, 'structural-pass': 0.78, 'form-refinement': 0.84, 'material-pass': 0.88, 'lighting-pass': 0.9, 'interaction-pass': 0.9 },
  'five-frontier-landmarks': { 'structural-pass': 0.8, 'form-refinement': 0.84, 'material-pass': 0.87, 'lighting-pass': 0.9, 'interaction-pass': 0.9 },
  'locomotive-mechanical-life': { 'structural-pass': 0.8, 'form-refinement': 0.82, 'material-pass': 0.84, 'lighting-pass': 0.86, 'interaction-pass': 0.86 },
  'canyon-depth-stack': { 'structural-pass': 0.78, 'form-refinement': 0.82, 'material-pass': 0.84, 'lighting-pass': 0.86, 'interaction-pass': 0.86 },
  'canonical-route-clarity': { 'structural-pass': 0.96, 'form-refinement': 0.96, 'material-pass': 0.96, 'lighting-pass': 0.96, 'interaction-pass': 0.96 },
};
spec.featureReviewTargets.forEach((target) => {
  target.passMinimumScores = stagedFeatureMinimums[target.id];
});
// The executable feature gate reads one minimumScore per target. Emit one
// target per pass so an early structural review cannot be invalidated when a
// later form/material threshold becomes active.
spec.featureReviewTargets = spec.featureReviewTargets.flatMap((target) => (
  target.passIds.map((passId) => ({
    ...target,
    id: `${target.id}:${passId}`,
    baseFeatureId: target.id,
    passIds: [passId],
    minimumScore: target.passMinimumScores?.[passId] ?? target.minimumScore,
  }))
));

spec.lightingFromPhoto = [
  'Warm late-day key light comes from upper-left/front-left and creates bright ochre crests with terracotta shadow sides.',
  'Peach sky fill lifts deep canyon shadows without flattening the value range.',
  'Low lavender/pink atmospheric haze separates distant buttes from the saturated playable mesa.',
  'Amber window practicals remain restrained and do not turn the scene into night.',
  'Soft contact shadows ground buildings, trestles, cacti, rails and props.',
  'ACES filmic tone mapping at restrained exposure protects bright sandstone crests and amber window detail.',
];
spec.proceduralStrategy = [
  'Keep the canonical 36-tile route and gameplay transforms outside the Island 013 visual factory.',
  'Author the mesa as layered continuous radial/extruded cliff forms with irregular deterministic strata rather than a smooth cylinder.',
  'Build the railway with curve-swept rails and instanced sleepers; animate one named locomotive root along a sampled ellipse.',
  'Build all five landmarks from distinct named hierarchies with footprint-stable L1/L2/L3 additive groups.',
  'Use world-space background depth layers and fixed sun direction; orbiting the camera must not drag the sun around the world.',
  'Freeze locomotive, windmill, flags, dust and cactus sway under reduced motion while keeping a readable static pose.',
];
spec.performanceBudget = { qualityPriority: 'phone-reference-fidelity', targetTriangles: 180000, maxDrawCalls: 175, textureSize: 512, fpsTarget: 50, optimizationPolicy: 'Instance or merge sleepers, strata ribs, buttes, cacti, fences, roof modules and particles; reduce micro density and independent animation across quality tiers before removing the locomotive, railway, landmark silhouettes or canyon depth stack.' };
spec.lookDevTargets = { qualityPriority: 'procedural-reference-guided', materialPass: { albedoPaletteRequired: true, roughnessVariationRequired: true, normalOrBumpRequired: true, localOverridesRequired: true, referencePbrExtraction: { requiredWhenSourceImagePresent: false, acceptedLimitation: 'The illustrated full-scene source contains baked sunset lighting, atmospheric haze, text and UI; whole-image inverse PBR extraction would not provide trustworthy isolated material maps.' } }, lightingPass: { requiredTerms: ['key light', 'fill light', 'environment light', 'exposure', 'tone mapping', 'background', 'contact shadow'] }, screenshotReview: ['phone overview', 'map-stripped overview', 'orbit left', 'orbit right', 'five landmark focuses', 'L1 L2 L3 overview', 'High versus Low and reduced motion'] };
spec.actionReadiness = { contract: 'Every landmark and ambience mechanism owns a named Object3D root; presentation animation never owns gameplay state.', defaultRigType: 'action-ready-static-world', rootMotionNode: 'root', requiredComponentFields: ['id', 'parent', 'actionProfile.animationRole'], transformChannels: ['translate', 'rotate', 'scale', 'bend', 'visibility', 'material-state'], authoringRules: ['Keep canonical tiles outside the visual world factory.', 'Keep landmark roots separate and focusable.', 'Animate the train, windmill, flags and particles with elapsed time.', 'Disable or freeze decorative movement for reduced motion.'], destructionPolicy: { defaultBreakable: false } };
spec.qualityTargets.targetFidelity = 0.8;
spec.qualityTargets.mustMatch = ['fractured floating mesa silhouette', 'double railway and locomotive', 'five landmark identities and prominence', 'layered sunset canyon depth', 'warm separated material response', 'canonical phone route clarity'];
spec.qualityTargets.reviewViewpoints = ['phone-overview', 'map-stripped-overview', 'orbit-left', 'orbit-right', 'hatchery-focus', 'habit-focus', 'mystery-focus', 'wisdom-focus', 'boss-focus'];
for (const pass of spec.buildPasses) pass.componentRefs = defs.map((definition) => definition[0]);
spec.sculptPipeline.currentPass = 'blockout';
spec.sculptPipeline.completedPasses = [];
spec.sculptPipeline.lastCompletedPass = null;
spec.sculptPipeline.blockedReason = null;
fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
