import fs from 'node:fs';

const here = new URL('.', import.meta.url);
const specPath = new URL('./lava-labyrinth-sculpt-spec.json', here);
const inventoryPath = new URL('./detail-inventory.json', here);
const materialAnalysisPath = new URL('./material-analysis.json', here);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const detailInventoryPacket = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const detailInventory = detailInventoryPacket.detailInventory;
const baseComponent = structuredClone(spec.componentTree[0]);
const baseMaterial = structuredClone(spec.materials[0]);
const evidence = ['source-full', 'source-crucible-crop'];

const rgba = (hex) => {
  const value = hex.replace('#', '');
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, 1.0)`;
};

const materialDefs = [
  ['obsidian-basalt', '#171416', '#44302A', 0.9, 0.0, 0.0, 'fractured black volcanic stone with iron-red mineral edges'],
  ['worked-basalt', '#282327', '#6B4B3A', 0.76, 0.0, 0.0, 'cut dark masonry with chipped chamfers and soot-filled joints'],
  ['black-iron', '#15181A', '#55504A', 0.42, 0.86, 0.08, 'forged iron with heat-blue edges and dark oxidation'],
  ['aged-brass', '#9A5D21', '#E59A3D', 0.34, 0.82, 0.22, 'aged brass with polished rims and blackened cavity patina'],
  ['magma', '#FF4B0A', '#FFD36B', 0.18, 0.0, 0.34, 'molten orange-red core with yellow-hot crests and cooled black lips'],
  ['ember-glass', '#E93B12', '#FFC469', 0.2, 0.02, 0.62, 'faceted ember cores with contained emissive depth'],
  ['ash-smoke', '#211C22', '#6B3A2D', 0.96, 0.0, 0.0, 'charcoal ash, smoke volume, soot and sparse ember flecks'],
];

spec.materials = materialDefs.map(([id, color, accent, roughness, metalness, clearcoat, pattern]) => {
  const material = structuredClone(baseMaterial);
  Object.assign(material, {
    id,
    name: id.replaceAll('-', ' '),
    type: clearcoat > 0.4 ? 'physical' : 'standard',
    shaderModel: clearcoat > 0.4 ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial',
    baseColor: color,
    color,
    albedo: {
      dominant: color,
      secondary: [accent, '#09090B'],
      samplingNotes: 'Palette is source-guided; baked firelight is not treated as base albedo.',
    },
    colorVariation: {
      palette: [color, accent, '#09090B'],
      pattern: `${pattern}; seeded and object-space stable`,
      amplitude: id === 'magma' ? 0.34 : 0.16,
      heightCorrelation: id === 'magma' ? 0.58 : 0.3,
    },
    textureResolution: 1024,
    textureProjection: {
      mode: id === 'magma' ? 'flow-aligned-object-space' : 'triplanar-object-space',
      repeat: [4, 5],
      anisotropy: 8,
      texelDensityIntent: 'Stable phone-scale detail without stretching across scaled components.',
      colorSpace: 'SRGBColorSpace for albedo/emissive; NoColorSpace for roughness/normal/AO.',
    },
    surfaceFrequencyBands: [
      { id: 'macro', frequency: 1.7, amplitude: 0.2, role: 'broad heat, mineral, soot, or oxidation zoning' },
      { id: 'meso', frequency: 14, amplitude: 0.11, role: pattern },
      { id: 'micro', frequency: 68, amplitude: 0.035, role: 'grazing-highlight breakup' },
    ],
    roughness: { base: roughness, variation: 0.14, map: 'referencePbr.maps.roughness', localResponse: 'rough cavities and cooled crust; polished exposed rims' },
    metalness: { base: metalness, variation: metalness > 0.2 ? 0.08 : 0 },
    normal: { pattern: 'referencePbr.maps.normal plus independent procedural micro relief', strength: id === 'obsidian-basalt' ? 0.42 : 0.28, scale: 42, space: 'tangent' },
    bump: { pattern: `${pattern} independent height`, amplitude: id === 'magma' ? 0.025 : 0.045, scale: 38 },
    displacement: { pattern: 'silhouette-changing fractures remain geometry', amplitude: id.includes('basalt') ? 0.018 : 0, scale: 1, silhouetteAffects: id.includes('basalt') },
    ambientOcclusion: { map: 'referencePbr.maps.ao', cavityStrength: 0.46, contactShadowBias: 0.38, notes: 'Concentrate at masonry joints, gate sockets, stair contacts and crust borders.' },
    wear: { edgeWear: id === 'aged-brass' || id === 'black-iron' ? 0.2 : 0.08, scratches: ['directional forge-tool marks'], chips: id.includes('basalt') ? ['irregular corner chips'] : [] },
    dirt: { amount: 0.16, cavityBias: 0.72, color: '#120D0C', streak: 'gravity-down soot and mineral streaking' },
    clearcoat,
    clearcoatRoughness: clearcoat > 0.4 ? 0.14 : 0.32,
    emissive: id === 'magma' ? '#FF3A06' : id === 'ember-glass' ? '#E52C0C' : '#000000',
    emissiveIntensity: id === 'magma' ? 2.2 : id === 'ember-glass' ? 1.7 : 0,
    localOverrides: [
      { id: `${id}-cavity-soot`, region: 'recesses, wall joints, vent mouths and bridge sockets', roughness: Math.min(1, roughness + 0.1), strength: 0.46, evidenceRefs: evidence },
      { id: `${id}-heat-edge`, region: 'lava-adjacent rims and forge-facing edges', baseColor: accent, roughness: Math.max(0.08, roughness - 0.12), strength: 0.28, evidenceRefs: evidence },
    ],
    notes: `${pattern}; albedo, roughness, height/normal and AO are independent channels.`,
  });
  delete material.referencePbr;
  return material;
});

if (fs.existsSync(materialAnalysisPath)) {
  const materialAnalysis = JSON.parse(fs.readFileSync(materialAnalysisPath, 'utf8'));
  for (const region of materialAnalysis.regions) {
    const material = spec.materials.find((candidate) => candidate.id === region.materialSpecId);
    if (!material) continue;
    material.referencePbr = region.referencePbr;
    material.textureAnalysis = region.textureAnalysis;
    material.materialEvidence = {
      componentId: region.componentId,
      regionId: region.regionId,
      crop: region.crop,
      observations: region.observations,
      hypothesis: region.hypothesis,
    };
    material.materialReference = region.assignment;
  }
}

const defs = [
  ['p01','Continuous floating basalt island shell','macro',null,'obsidian-basalt','world-root','custom-volume',['cliff-column-chipping']],
  ['p02','Volcanic horizon and distant spires','macro','p01','obsidian-basalt','ambient-depth-owner','cone-network',['volcanic-lava-grooves','stratified-terraces']],
  ['p03','Surface lava channels, cracks and falls','meso','p01','magma','flow-effect-owner','tube-network',['cooled-drip-lips','channel-crust-border','broad-cliff-lavafall','front-lavafall-hot-core']],
  ['p04','Stone stairs, ramps and circulation','meso','p01','worked-basalt','static-circulation','stair-network',['stair-tread-bevels']],
  ['p05','Canonical route context and rune plinth','macro','p01','aged-brass','gameplay-clearance-visual','torus',['route-brass-fasteners']],
  ['p06','Ember sky, ash, smoke and key light','macro','p01','ash-smoke','ambient-motion-owner','particle-volume',['ember-depth-bands']],
  ['p07','Crucible Citadel buried foundation and arena plinth','macro','p01','worked-basalt','arena-foundation','stepped-cylinder',['buried-citadel-contact']],
  ['p08','Crucible Keep tower continuous macro','meso','p07','worked-basalt','citadel-tower','tapered-tower',['flame-crown-aperture','pier-chamfers']],
  ['p09','Connected curtain walls, buttresses and labyrinth','meso','p07','worked-basalt','citadel-wall-network','wall-network',['connected-maze-wall-caps']],
  ['p10','Four citadel gates and Arena aperture','meso','p07','black-iron','gate-pivot-network','arch-network',['gate-through-apertures']],
  ['p11','Forge core, braziers, windows and surfaces','meso','p08','magma','citadel-emitter-network','brazier-network',['brazier-spiked-bowl','tower-window-recesses']],
  ['p12','Pyre Sentinel Arena guardian','meso','p10','black-iron','guardian-reserved-socket','guardian-silhouette',['guardian-reserved-boundary']],
  ['p13','Magma Crucible Hatchery macro','meso','p01','worked-basalt','build-level-pivot','furnace-shell',['hatchery-silhouette']],
  ['p14','Hatchery egg furnace and growth','meso','p13','ember-glass','build-growth-owner','ellipsoid',['magma-egg-crack-network']],
  ['p15','Fire Path Habit Sanctum macro','meso','p01','black-iron','build-level-pivot','open-pavilion',['habit-sanctum-silhouette']],
  ['p16','Habit arches, braziers and growth','meso','p15','magma','build-growth-owner','arch-network',['habit-choice-arches']],
  ['p17','Ashen Trialworks Mystery macro','meso','p01','worked-basalt','build-level-pivot','forge-yard',['trialworks-silhouette']],
  ['p18','Mystery trial frame, vents and growth','meso','p17','black-iron','build-growth-owner','vent-network',['trial-vent-system']],
  ['p19','Obsidian Archive Wisdom Keep macro','meso','p01','obsidian-basalt','build-level-pivot','tiered-keep',['archive-silhouette']],
  ['p20','Wisdom steles, vault and growth','meso','p19','aged-brass','build-growth-owner','stele-network',['wisdom-stele-system']],
  ['p21','Eight route-relative Ember Core pickups','meso','p05','ember-glass','mission-pickup-owner','instanced-crystal',['eight-ember-cores']],
  ['p22','Four Crucible Gates and stage beacons','meso','p10','aged-brass','mission-stage-beacons','beacon-network',['four-stage-beacons']],
  ['p23','Four retractable basalt Firebridges','meso','p07','worked-basalt','firebridge-hinge-pivots','hinged-segment-network',['four-firebridges']],
  ['p24','Chain drums, counterweights and forge machinery','meso','p23','black-iron','bridge-machinery-owner','tube-and-drum-network',['hanging-chain-links']],
  ['p25','Arena awakening finale presentation','meso','p10','magma','finale-presentation-owner','effect-volume',['four-gate-finale']],
  ['p26','Ember Caretaker outfit and LOD module','meso','p01','aged-brass','traveller-costume-module','character-accessory',['ember-caretaker']],
  ['p27','Forge inhabitants and sparse fauna','meso','p01','black-iron','ambient-character-owner','character-cluster',['forge-inhabitant-system']],
  ['p28','Ember, ash, smoke, heat shimmer and impacts','micro','p06','ash-smoke','ambient-fx-owner','particle-system',['ember-impact-system']],
  ['p29','Obsidian, iron, brass and magma material network','micro','p01','obsidian-basalt','material-system-owner','material-network',['cyan-utility-beacon','soot-cavity-patina','brass-banner-and-brazier-trim']],
  ['p30','L1-L2-L3 additive construction mesh contract','micro','p01','worked-basalt','construction-state-owner','additive-state-network',['additive-build-levels']],
  ['p31','Construction robots, tools, scaffolds and stations','meso','p30','aged-brass','construction-theatre-owner','robot-station-network',['three-robot-theatre']],
  ['p32','Action-ready hierarchy, focus, colliders and LOD','meso','p01','black-iron','runtime-contract-owner','metadata-network',['action-ready-runtime']],
];

const primitiveByPart = {
  p01:'ellipsoid',p02:'cone',p03:'tube',p04:'box',p05:'torus',p06:'instanced-cluster',p07:'cylinder',p08:'box',
  p09:'box',p10:'extrude',p11:'instanced-cluster',p12:'capsule',p13:'cylinder',p14:'ellipsoid',p15:'cylinder',p16:'extrude',
  p17:'box',p18:'instanced-cluster',p19:'box',p20:'instanced-cluster',p21:'instanced-cluster',p22:'instanced-cluster',p23:'box',
  p24:'instanced-cluster',p25:'sphere',p26:'capsule',p27:'instanced-cluster',p28:'instanced-cluster',p29:'box',p30:'instanced-cluster',
  p31:'instanced-cluster',p32:'box',
};

const topologyByPart = (id) => {
  if (id === 'p01' || id === 'p03') return 'continuous-sculpt';
  if (id === 'p06' || id === 'p28') return 'assembled-solid';
  if (id === 'p29' || id === 'p32') return 'material-only';
  return 'assembled-solid';
};

const detailByPart = new Map();
for (const detail of detailInventory.details) {
  const ref = detail.mapsTo?.ref || '';
  const partId = ref.split('.')[0];
  const featureId = ref.split('.').at(-1);
  if (!detailByPart.has(partId)) detailByPart.set(partId, []);
  detailByPart.get(partId).push({
    id: featureId,
    placement: detail.description,
    size: detail.scale === 'micro' ? 'phone-readable repeated micro relief' : 'source-proportional macro/meso geometry',
    orientation: 'aligned to the source-observed local surface, route tangent, or gravity direction',
    materialEffect: 'independent albedo, roughness, normal/height and AO response',
    geometryEffect: 'closed geometry for silhouette/contact change; recessed geometry for apertures and grooves',
    confidence: detail.confidence,
    evidenceRefs: [detail.evidenceRef],
  });
}

const materialColors = new Map(materialDefs.map((item) => [item[0], [item[1], item[2]]]));
const materialClass = (id) => id.includes('iron') || id.includes('brass') ? 'metal' : id.includes('magma') || id.includes('glass') ? 'glass' : id.includes('smoke') ? 'unknown' : 'stone';

spec.componentTree = defs.map(([id, name, level, parent, material, role, primitive, authoredFeatures]) => {
  const component = structuredClone(baseComponent);
  const [dominant, secondary] = materialColors.get(material);
  const componentEvidence = id >= 'p07' && id <= 'p11' ? ['source-crucible-crop', 'source-full'] : evidence;
  Object.assign(component, {
    id,
    name,
    level,
    parent,
    material,
    role,
    importance: level === 'macro' ? 1 : level === 'meso' ? 0.9 : 0.76,
    confidence: parent ? 0.88 : 1,
    primitive: primitiveByPart[id],
    topologyClass: topologyByPart(id),
    topologyRationale: 'Source-visible mass is reconstructed as genuine off-axis volume with named seams; hidden faces use conservative continuation and remain subordinate to the source angle.',
    materialLayers: [material],
    evidenceRefs: componentEvidence,
    dimensions: { width: 1, height: 1, depth: 1, units: 'normalized-island-envelope', confidence: parent ? 0.8 : 0.9 },
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    localFeatures: [
      ...authoredFeatures.map((feature) => ({ id: feature, placement: `Identity-defining system on ${name}`, size: 'phone-readable geometry', orientation: 'aligned to local source form', materialEffect: 'source-guided PBR separation', geometryEffect: 'real geometry where silhouette or contact changes', confidence: 0.9, evidenceRefs: componentEvidence })),
      ...(detailByPart.get(id) || []),
    ],
    surfaceDetail: { macroRoughness: 0.18, microRoughness: 0.11, bumpAmplitude: 0.045, normalPattern: `${material}-independent-normal`, displacementPattern: 'silhouette fractures are geometry', occlusionPattern: 'contacts, recesses, sockets, stairs and wall joints', edgeWearPattern: 'heat-polished rims with soot-darkened cavities', notes: 'Macro, meso and micro bands remain separate under grazing light.' },
    colorMaterialRecipe: { dominantAlbedo: rgba(dominant), secondaryAlbedo: rgba(secondary), materialClass: materialClass(material), materialClassConfidence: 0.9, colorGradient: { type: 'linear', stops: [{ at: 0, color: rgba(dominant) }, { at: 1, color: rgba(secondary) }] }, evidenceRefs: componentEvidence },
    details: [],
    fidelityTier: 'structural',
  });
  component.geometryDescriptor = { topologyIntent: 'closed source-proportional volume with true depth and chamfer-ready boundaries', edgeTreatment: { type: 'chamfer', bevelRadius: level === 'macro' ? 0.035 : 0.018, segments: 2 }, deformationStack: ['seeded low-amplitude volcanic asymmetry where source supports damage'], uvStrategy: material === 'magma' ? 'flow-aligned object coordinates' : 'triplanar object coordinates', normalStrategy: 'vertex normals plus independent tangent-space normal detail' };
  component.actionProfile.animationRole = role;
  component.actionProfile.pivot = { mode: role.includes('hinge') ? 'hinge' : parent ? 'custom' : 'center', localPosition: [0, 0, 0], axis: role.includes('hinge') ? [1, 0, 0] : [0, 1, 0], confidence: 0.9 };
  component.actionProfile.transformChannels = { translate: role.includes('pickup') || role.includes('ambient'), rotate: role.includes('hinge') || role.includes('machinery') || role.includes('beacon'), scale: role.includes('build') || role.includes('finale') || role.includes('pickup'), bend: false, twist: false, detach: false, visibility: true, materialState: role.includes('effect') || role.includes('finale') || role.includes('beacon') || role.includes('pickup') };
  component.actionProfile.sockets = [{ id: `${id}-socket`, localPosition: [0, 0, 0], rotation: [0, 0, 0], purpose: 'stable child, effect, focus, construction, or mission anchor' }];
  component.actionProfile.collider = { type: id === 'p05' || id === 'p06' || id === 'p28' || id === 'p29' || id === 'p32' ? 'none' : 'box', offset: [0, 0, 0], scale: [1, 1, 1], isTrigger: id === 'p21' || id === 'p22', notes: 'Visual/pick proxy only; canonical tile and stop logic retain gameplay authority.' };
  component.actionProfile.destruction = { breakable: false, fractureGroup: parent || 'lava-labyrinth-root', seamRefs: [], detachableFragments: [], breakImpulse: 0, debrisMaterial: material };
  component.attachment = parent ? { parentId: parent, parentSocket: `${parent}-socket`, localStart: [0, 0, 0], localEnd: [0, 0.1, 0], baseRadius: 0.1, endRadius: 0.08, overlap: 0.04, embedDepth: 0.035, contactType: role.includes('hinge') ? 'hinge' : 'embedded', gapTolerance: 0.01, evidenceRefs: component.evidenceRefs } : null;
  return component;
});

spec.suitability = 'conditional';
spec.scores = { object_isolation: 2, silhouette_readability: 3, depth_inference: 2, primitive_decomposition: 3, material_procedurality: 3, occlusion_risk: 2, interaction_fit: 3 };
spec.referenceCamera = { solved: false, fovDegrees: 38, aspect: 0.6667, orientation: { yaw: 0, pitch: -47, roll: 0 }, positionHint: [0, 14, 22], note: 'Portrait three-quarter concept; project camera kit and canonical board framing are runtime authority. Multi-angle review guards inferred rear volume.' };
spec.preSpecAssessment.unknownsToResolveBeforeImplementation = [];
spec.preSpecAssessment.detailInventory = structuredClone(detailInventory);
for (const detail of spec.preSpecAssessment.detailInventory.details) {
  const sourceRef = detail.mapsTo?.ref || '';
  detail.mapsTo = {
    type: 'component.localFeatures',
    componentRef: sourceRef.split('.')[0],
    ref: sourceRef.split('.').at(-1),
  };
  detail.realization = 'named component local feature with procedural geometry and/or material locality';
}
spec.preSpecAssessment.complexity.estimatedCounts = { macroComponents: 5, mesoComponents: 24, microFeatureGroups: 20, materialLayers: 7, repetitionSystems: 8 };
spec.qualityContract.definitionOfDone = [
  'At 390x844 the island reads immediately as the supplied Lava Labyrinth: one deep basalt island, continuous molten channels, a dominant narrow Crucible Citadel, connected maze walls, four legible gates and a warm ember horizon.',
  'All 36 renderer-owned canonical tiles stay unobstructed; authored geometry never duplicates tile, token, reward, stop, boss or island-clear progression.',
  'Hatchery, Habit, Mystery and Wisdom landmarks preserve footprint-stable L1-L3 additive builds with visible robot/tool/scaffold contact and no root transform scaling.',
  'Forge the Four Firebridges uses canonical mission actions to collect eight Ember Cores, spends two per stage, raises four cumulative bridge meshes, then awakens the Arena without bypassing Arena victory.',
  'Obsidian, worked basalt, black iron, aged brass, magma and ember glass remain materially distinct under neutral, grazing and reference-matched lighting; reduced motion freezes decorative motion without hiding state.',
];
spec.qualityContract.minimumSpecDepth = { macroComponents: 5, mesoComponents: 24, microFeatureGroups: 20, materialLayers: 7, repetitionSystems: 8, reviewViewpoints: 8 };
spec.qualityContract.visualDeltaChecks = ['portrait silhouette','citadel dominance','connected labyrinth','four true gate apertures','canonical route clearance','four Firebridge states','molten-channel continuity','material separation','rear-volume coherence','phone-scale readability'];
spec.repetitionSystems = [
  ['masonry-block-bands', 96, 'connected citadel and landmark wall courses with seeded chip variation'],
  ['route-brass-fasteners', 36, 'one restrained fastener language adjacent to, never replacing, canonical tiles'],
  ['brazier-array', 18, 'spiked bowls at gates, walls and landmark approaches'],
  ['window-recess-array', 22, 'true dark recesses with contained orange interiors'],
  ['chain-link-runs', 48, 'four socket-to-drum bridge chain paths'],
  ['ember-core-pickups', 8, 'route-relative named mission anchors'],
  ['firebridge-segments', 20, 'five hinged basalt segments per bridge'],
  ['ember-ash-field', 64, 'quality-scaled sparse depth layers with deterministic reset'],
].map(([id, instances, distribution]) => ({ id, geometry: 'named deterministic instanced or pivoted procedural system', instances, distribution, buildsGeometry: true, qualityScaling: 'Preserve identity instances first; reduce only secondary repetitions at lower tiers.', evidenceRefs: evidence }));
spec.featureReviewTargets = [
  ['lava-labyrinth-silhouette','Deep floating basalt island and volcanic horizon silhouette',['p01','p02','p03'],0.88],
  ['crucible-citadel-dominance','Narrow crowned Crucible Citadel dominates connected wall maze',['p07','p08','p09','p10','p11'],0.9],
  ['canonical-route-clearance','All 36 renderer-owned tile tops and doorway approaches remain clear',['p04','p05','p07','p09'],0.95],
  ['four-firebridges-mission','Eight cores, four stage beacons, four cumulative bridges and finale are visually unambiguous',['p21','p22','p23','p24','p25'],0.92],
  ['volcanic-material-separation','Obsidian, stone, iron, brass, magma, ember glass and ash remain distinct',['p01','p03','p08','p10','p29'],0.86],
  ['four-landmark-identities','Hatchery, Habit, Mystery and Wisdom silhouettes remain distinct and subordinate',['p13','p15','p17','p19'],0.84],
].map(([id, name, componentRefs, minimumScore], index) => ({ id, name, tier: index === 5 ? 'important' : 'critical', passIds: ['blockout','structural-pass','form-refinement','material-pass','surface-pass','lighting-pass','interaction-pass'], minimumScore, mustPass: index !== 5, componentRefs, evidenceRefs: evidence }));
spec.viewEvidence = [
  { id: 'source-full', view: 'portrait three-quarter overview', imageRegion: { x: 0, y: 0, width: 1, height: 1, units: 'normalized' }, observations: ['deep basalt island','central narrow tower','connected walls','orange channel network','four cardinal approaches','jagged volcanic horizon'], confidence: 0.94 },
  { id: 'source-crucible-crop', view: 'Crucible Citadel and protected route crop', imageRegion: { x: 0.2, y: 0.2, width: 0.68, height: 0.52, units: 'normalized' }, observations: ['buried stepped foundation','real tower volume','wall cap rhythm','gate openings','lava channels','stair landings'], confidence: 0.96 },
];
spec.lightingFromPhoto = [
  'Warm orange key from upper camera-left at strong but non-clipping intensity; soft shadow radius separates tower bevels.',
  'Low cool-charcoal fill preserves detail in black rock and iron cavities without flattening the scene.',
  'Deep red-orange rim and magma bounce separate cliff ledges and rear wall silhouettes.',
  'Sparse ember environment reflection catches brass and black-iron edges; the neutral look-dev mode removes the red rim.',
  'ACES filmic tone mapping with restrained bloom and exposure preserves yellow-hot cores and dark obsidian value range.',
  'Soft contact shadow and local AO ground every wall, stair, bridge hinge, landmark and construction robot contact.',
];
spec.proceduralStrategy = [
  'Build the approved p07-p10 Crucible Citadel slice first with p01/p05 only as non-reviewable context, then expand after user-approved blockout and one bounded correction.',
  'Preserve shared canonical tile geometry, token transforms and gameplay state outside the visual world factory.',
  'Use closed beveled masonry volumes, genuine gate apertures, tube-based molten channels and named hinge/chain pivots rather than flat cards.',
  'Use deterministic seeded asymmetry, merged static batches, instancing and quality-tier particle counts while retaining all phone-scale identity geometry.',
  'Drive visual mission and build presentation from canonical state passed into the world; the world never persists gameplay.',
];
spec.performanceBudget = { qualityPriority: 'phone-reference-fidelity', targetTriangles: 190000, maxDrawCalls: 170, textureSize: 1024, fpsTarget: 50, optimizationPolicy: 'Merge static masonry by material; instance blocks, fasteners, windows, braziers, embers and chains; reduce particle/repetition density before removing silhouette systems.' };
spec.lookDevTargets = { qualityPriority: 'source-guided procedural PBR', materialPass: { albedoPaletteRequired: true, roughnessVariationRequired: true, normalOrBumpRequired: true, localOverridesRequired: true, referencePbrExtraction: { requiredWhenSourceImagePresent: true, threshold: 0.7, acceptedLimitation: 'Single-image maps are evidence, not exact inverse rendering.' } }, lightingPass: { requiredTerms: ['key light','fill light','rim light','environment reflection','exposure','tone mapping','background','contact shadow'] }, screenshotReview: ['neutral phone overview','grazing citadel close-up','reference-matched portrait','left 45','right 45','rear 180','top clearance','underside sanity'] };
spec.actionReadiness = { contract: 'Every approved part owns a stable named Object3D node or runtime metadata system; gameplay remains canonical-service-owned.', defaultRigType: 'action-ready-static-world-with-hinged-mission-assemblies', rootMotionNode: 'p01', requiredComponentFields: ['id','parent','transform','attachment','actionProfile.animationRole','actionProfile.pivot','actionProfile.collider','actionProfile.destruction'], transformChannels: ['translate','rotate','scale','visibility','material-state'], authoringRules: ['Never merge movable bridges, gates, chains, beacons, pickups, build levels or effect owners into unrelated static geometry.','Keep tile, token, reward, stop, boss and clear logic outside the world.','Freeze decorative particles and machinery under reduced motion while preserving current bridge/build state.'], destructionPolicy: { defaultBreakable: false, fractureGroupNaming: 'Use stable pXX semantic groups; no gameplay destruction.' } };

for (const pass of spec.buildPasses) pass.componentRefs = defs.map((item) => item[0]);
spec.sculptPipeline.currentPass = 'blockout';
spec.sculptPipeline.completedPasses = [];
spec.sculptPipeline.lastCompletedPass = null;
spec.sculptPipeline.blockedReason = null;
spec.qualityTargets.reviewViewpoints = ['source-angle','left-45','right-45','rear-180','top-clearance','front-gate','grazing-citadel','underside-sanity'];

fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
