import fs from 'node:fs';

const specPath = new URL('./island-008-sculpt-spec.json', import.meta.url);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const baseComponent = structuredClone(spec.componentTree[0]);
const baseMaterial = structuredClone(spec.materials[0]);
const evidence = ['reference-everblossom-overview'];
const rgba = (hex) => {
  const value = hex.replace('#', '');
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, 1.0)`;
};

const materialDefs = [
  ['ivory-stone', '#E8D8AD', 0.64, 0.02, 0.12, '#000000', 'fine limestone grain and bevel response'],
  ['root-bark', '#765733', 0.84, 0.0, 0.02, '#000000', 'vertical root ridges and cavity-darkened bark'],
  ['garden-soil', '#4B4C26', 0.9, 0.0, 0.0, '#000000', 'dark planted soil with leaf-litter variation'],
  ['leaf-emerald', '#2F7B3D', 0.66, 0.0, 0.08, '#061F0D', 'hero leaf veins and olive-to-emerald variation'],
  ['coral-petal', '#E77D79', 0.46, 0.0, 0.26, '#3F0C13', 'satin coral petals with pale edge rims'],
  ['sunflower-petal', '#E6AC32', 0.5, 0.0, 0.2, '#4E2600', 'warm radial sunflower petals'],
  ['orchid-petal', '#8F5CB3', 0.44, 0.0, 0.22, '#291044', 'violet orchid petals with darker throats'],
  ['antique-gold', '#C99B3E', 0.31, 0.72, 0.3, '#4A2604', 'restrained brushed gold with dark seams'],
  ['botanical-glass', '#35B8A1', 0.12, 0.0, 0.92, '#064D44', 'emerald and turquoise botanical glass'],
  ['spring-water', '#36C8D0', 0.1, 0.0, 0.88, '#0A6870', 'turquoise springs, waterfall ribbons and foam'],
];

spec.materials = materialDefs.map(([id, color, roughness, metalness, clearcoat, emissive, pattern]) => {
  const material = structuredClone(baseMaterial);
  Object.assign(material, {
    id,
    name: id.replaceAll('-', ' '),
    type: clearcoat > 0.5 ? 'physical' : 'standard',
    shaderModel: clearcoat > 0.5 ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial',
    baseColor: color,
    color,
    albedo: { dominant: color, secondary: ['#F3E5C2', '#214A2B'], samplingNotes: 'Reference-guided palette; highlights and shadows remain lighting response.' },
    colorVariation: { palette: [color, '#F3E5C2', '#214A2B'], pattern: `${pattern} with deterministic variation`, amplitude: 0.1, heightCorrelation: 0.24 },
    textureResolution: 512,
    textureProjection: { mode: 'object-space', repeat: [4, 5], anisotropy: 4, texelDensityIntent: 'Phone-stable detail without oversized runtime maps.' },
    surfaceFrequencyBands: [
      { id: 'macro', frequency: 1.4, amplitude: 0.15, role: 'broad botanical or mineral tonal variation' },
      { id: 'meso', frequency: 14, amplitude: 0.09, role: pattern },
      { id: 'micro', frequency: 72, amplitude: 0.025, role: 'grazing-highlight breakup' },
    ],
    roughness: { base: roughness, variation: 0.1, map: 'independent-procedural-roughness', localResponse: 'smoother exposed crests, rougher recessed cavities' },
    metalness: { base: metalness, variation: metalness > 0.2 ? 0.06 : 0 },
    normal: { pattern, strength: id === 'root-bark' ? 0.18 : 0.07, scale: 48, space: 'tangent' },
    bump: { pattern: `${pattern} independent height`, amplitude: id === 'root-bark' ? 0.11 : 0.04, scale: 44 },
    displacement: { pattern: 'none', amplitude: 0, scale: 1, silhouetteAffects: false },
    ambientOcclusion: { cavityStrength: 0.32, contactShadowBias: 0.38, notes: 'Concentrated at roots, terrace seams, stairs, petal sockets and frames.' },
    wear: { edgeWear: id === 'antique-gold' ? 0.12 : 0.04, scratches: [], chips: [] },
    dirt: { amount: id === 'root-bark' || id === 'garden-soil' ? 0.12 : 0.035, cavityBias: 0.64, color: '#26301D' },
    clearcoat,
    clearcoatRoughness: clearcoat > 0.5 ? 0.13 : 0.3,
    emissive,
    emissiveIntensity: emissive === '#000000' ? 0 : id === 'spring-water' ? 0.32 : 0.16,
    localOverrides: [{ id: `${id}-local-response`, region: 'exposed crests, recessed seams and contact zones', roughness: Math.min(1, roughness + 0.08), strength: 0.28, evidenceRefs: evidence }],
    notes: `${pattern}; independent albedo, roughness, height and AO channels.`,
  });
  delete material.referencePbr;
  return material;
});

const byMaterial = new Map(spec.materials.map((material) => [material.id, material]));
byMaterial.get('botanical-glass').localOverrides.push({ id: 'orchid-glass-highlight', region: 'faceted Wisdom conservatory crests', roughness: 0.07, strength: 0.46, evidenceRefs: evidence });
byMaterial.get('spring-water').localOverrides.push({ id: 'waterfall-specular', region: 'waterfall ribbons, spring pools and foam lips', roughness: 0.06, strength: 0.5, evidenceRefs: evidence });
byMaterial.get('root-bark').localOverrides.push({ id: 'terrain-cavity-darkening', region: 'root forks and terrace undersides', roughness: 0.92, strength: 0.44, evidenceRefs: evidence });
byMaterial.get('antique-gold').localOverrides.push({ id: 'gold-crest-response', region: 'ribs, tracery, finials and petal-frame crests', roughness: 0.22, strength: 0.34, evidenceRefs: evidence });

const defs = [
  ['root', 'Everblossom Kingdom world root', 'macro', null, 'ivory-stone', 'scene-root', ['world-root'], 'assembled-solid'],
  ['terrain-network', 'Living root and stone island network', 'macro', 'root', 'root-bark', 'static-terrain', ['root-arch-network'], 'continuous-sculpt'],
  ['landmark-network', 'Five distinct botanical landmark families', 'macro', 'root', 'ivory-stone', 'build-state-owner', ['five-entrance-system'], 'assembled-solid'],
  ['route-integration', 'Canonical 36-tile protected route', 'macro', 'root', 'ivory-stone', 'gameplay-visual', ['canonical-route-clearance'], 'assembled-solid'],
  ['ambience-system', 'Golden botanical living ambience', 'macro', 'root', 'spring-water', 'ambient-motion-owner', ['valley-horizon', 'butterfly-depth-layers', 'petal-pollen-field'], 'assembled-solid'],
  ['central-root-terrace', 'Central planted root and stone terrace', 'meso', 'terrain-network', 'garden-soil', 'static', ['central-garden-well'], 'continuous-sculpt'],
  ['outer-satellite-terraces', 'Four connected asymmetric satellite terraces', 'meso', 'terrain-network', 'root-bark', 'static', ['root-arch-network', 'route-clear-garden-beds'], 'continuous-sculpt'],
  ['tulip-glasshouse-hatchery', 'Tulip Glasshouse Hatchery', 'meso', 'landmark-network', 'botanical-glass', 'build-level-pivot', ['glasshouse-ribs', 'tulip-petal-base', 'egg-nest'], 'assembled-solid'],
  ['sunflower-rhythm-pavilion', 'Sunflower Rhythm Pavilion', 'meso', 'landmark-network', 'sunflower-petal', 'build-level-pivot', ['sunflower-petal-ring', 'open-sundial-floor'], 'assembled-solid'],
  ['leafroof-garden-hall', 'Leafroof Garden Hall', 'meso', 'landmark-network', 'leaf-emerald', 'build-level-pivot', ['leafroof-veins', 'broad-low-shell'], 'conforming-shell'],
  ['orchid-crystal-archive', 'Orchid Crystal Archive', 'meso', 'landmark-network', 'botanical-glass', 'build-level-pivot', ['orchid-petal-buttresses', 'faceted-archive-spires'], 'assembled-solid'],
  ['blossom-crown-citadel', 'Blossom Crown Citadel', 'meso', 'landmark-network', 'coral-petal', 'build-level-pivot', ['citadel-petal-balconies', 'citadel-open-crown', 'arched-window-tracery'], 'assembled-solid'],
  ['valley-horizon', 'Distant lush valley and turquoise water depth', 'meso', 'ambience-system', 'leaf-emerald', 'parallax-horizon', ['valley-horizon'], 'assembled-solid'],
  ['spring-waterfall-network', 'Springs, waterfall ribbons and foam', 'meso', 'terrain-network', 'spring-water', 'flow-pulse', ['waterfall-courses'], 'conforming-shell'],
  ['route-clear-garden-beds', 'Batched route-clear flower and leaf beds', 'meso', 'terrain-network', 'leaf-emerald', 'ambient-sway', ['route-clear-garden-beds'], 'assembled-solid'],
  ['butterfly-depth-layers', 'Three-depth butterfly layers', 'meso', 'ambience-system', 'orchid-petal', 'orbit-and-flap', ['butterfly-depth-layers'], 'assembled-solid'],
  ['glasshouse-rib-array', 'Tulip glasshouse gold rib array', 'micro', 'tulip-glasshouse-hatchery', 'antique-gold', 'static', ['glasshouse-ribs'], 'surface-relief'],
  ['sunflower-petal-array', 'Radial sunflower petal array', 'micro', 'sunflower-rhythm-pavilion', 'sunflower-petal', 'slow-rotate', ['sunflower-petal-ring'], 'assembled-solid'],
  ['leafroof-vein-array', 'Leafroof central and secondary vein array', 'micro', 'leafroof-garden-hall', 'antique-gold', 'static', ['leafroof-veins'], 'surface-relief'],
  ['orchid-petal-array', 'Orchid petal buttress array', 'micro', 'orchid-crystal-archive', 'orchid-petal', 'breath', ['orchid-petal-buttresses'], 'assembled-solid'],
  ['arched-window-array', 'Pointed green-glass window and tracery array', 'micro', 'landmark-network', 'botanical-glass', 'material-pulse', ['arched-window-tracery'], 'surface-relief'],
  ['citadel-petal-balcony-array', 'Stacked lotus balcony array', 'micro', 'blossom-crown-citadel', 'coral-petal', 'breath', ['citadel-petal-balconies'], 'assembled-solid'],
  ['citadel-open-crown', 'Monumental open lotus crown', 'micro', 'blossom-crown-citadel', 'coral-petal', 'open-close-breath', ['citadel-open-crown'], 'assembled-solid'],
  ['five-entrance-system', 'Five stair and pointed-arch entrances', 'micro', 'landmark-network', 'ivory-stone', 'static', ['five-entrance-system'], 'assembled-solid'],
  ['root-arch-network', 'Living root arch curve sweeps', 'micro', 'terrain-network', 'root-bark', 'static', ['root-arch-network'], 'fiber-strand'],
  ['petal-pollen-field', 'Drifting petal and pollen field', 'micro', 'ambience-system', 'coral-petal', 'drift-reset', ['petal-pollen-field'], 'assembled-solid'],
];

const colors = new Map(materialDefs.map((definition) => [definition[0], definition[1]]));
const materialClass = (id) => id === 'antique-gold' ? 'metal' : id.includes('glass') || id.includes('water') ? 'glass' : id.includes('petal') || id.includes('leaf') ? 'fabric' : 'stone';
spec.componentTree = defs.map(([id, name, level, parent, material, role, features, topologyClass]) => {
  const component = structuredClone(baseComponent);
  Object.assign(component, {
    id, name, level, parent, material, role, topologyClass,
    topologyRationale: topologyClass === 'fiber-strand' ? 'Long tapered root curves require tube sweeps.' : topologyClass === 'conforming-shell' ? 'Thin botanical shell follows an authored curved profile.' : topologyClass === 'continuous-sculpt' ? 'Organic terrain mass changes continuously without panel seams.' : 'Discrete architectural or repeated part with explicit volume.',
    importance: level === 'macro' ? 1 : level === 'meso' ? 0.9 : 0.74,
    confidence: parent ? 0.9 : 1,
    primitive: topologyClass === 'fiber-strand' ? 'tube' : topologyClass === 'conforming-shell' ? 'extrude' : topologyClass === 'continuous-sculpt' ? 'lathe' : id.includes('array') || id.includes('field') ? 'instanced-cluster' : 'cylinder',
    materialLayers: [material],
    evidenceRefs: evidence,
  });
  component.actionProfile.animationRole = role;
  component.actionProfile.transformChannels = { translate: role.includes('drift') || role.includes('orbit'), rotate: role.includes('rotate') || role.includes('orbit') || role.includes('sway'), scale: role.includes('breath') || role.includes('pulse'), bend: role.includes('sway') || role.includes('flap'), twist: false, detach: false, visibility: true, materialState: role.includes('material') || role.includes('flow') };
  component.localFeatures = features.map((feature) => ({ id: feature, placement: `Observable system on ${name}`, size: 'phone-readable or repeated environmental detail', orientation: 'aligned to local architecture, terrain or motion curve', materialEffect: 'independent PBR response', geometryEffect: 'real geometry whenever silhouette-readable', confidence: 0.9, evidenceRefs: evidence }));
  component.surfaceDetail = { macroRoughness: 0.14, microRoughness: 0.1, bumpAmplitude: 0.045, normalPattern: `${material}-independent-normal`, displacementPattern: 'macro form owned by geometry', occlusionPattern: 'contacts, ribs, petal sockets and root cavities', edgeWearPattern: 'restrained crest response', notes: 'Phone-stable macro/meso/micro detail.' };
  component.colorMaterialRecipe = { dominantAlbedo: rgba(colors.get(material)), secondaryAlbedo: rgba('#F3E5C2'), materialClass: materialClass(material), materialClassConfidence: 0.88, colorGradient: { type: 'linear', stops: [{ at: 0, color: rgba(colors.get(material)) }, { at: 1, color: rgba('#214A2B') }] }, evidenceRefs: evidence };
  if (parent) component.attachment = { parentId: parent, parentSocket: `${parent}-socket`, localStart: [0, 0, 0], localEnd: [0, 0.1, 0], baseRadius: 0.1, endRadius: 0.08, overlap: 0.04, embedDepth: 0.03, contactType: 'embedded', gapTolerance: 0.01, evidenceRefs: evidence };
  return component;
});

spec.suitability = 'conditional';
spec.scores = { object_isolation: 1, silhouette_readability: 3, depth_inference: 2, primitive_decomposition: 3, material_procedurality: 3, occlusion_risk: 2, interaction_fit: 3 };
spec.referenceCamera = { solved: false, fovDegrees: 42, aspect: 0.5625, orientation: { yaw: 0, pitch: -47, roll: 0 }, positionHint: [0, 18, 25], note: 'Portrait three-quarter concept; the shared locked HabitGame camera is authoritative and hidden sides use orbit self-consistency review.' };
spec.preSpecAssessment.detailInventory.details.forEach((detail) => { detail.realization = 'Mapped to procedural geometry or a named local material override.'; detail.evidenceRefs = evidence; });
spec.preSpecAssessment.unknownsToResolveBeforeImplementation = [];
spec.qualityContract.definitionOfDone = ['A phone-readable Flower Kingdom with a clean real 36-tile ring, five silhouette-distinct botanical landmark families, a dominant multi-tier Blossom Crown Citadel, connected root terraces, quality-scaled living ambience and no gameplay authority in the world module.'];
spec.qualityContract.minimumSpecDepth = { macroComponents: 5, mesoComponents: 11, microFeatureGroups: 10, materialLayers: 8, repetitionSystems: 8, reviewViewpoints: 8 };
spec.qualityContract.visualDeltaChecks = ['portrait island silhouette', 'five landmark identity separation', 'canonical route readability', 'root terrace attachment', 'ivory-gold-green-coral-violet material separation', 'multi-tier citadel growth', 'living water and butterfly motion', 'hidden-side completeness'];
spec.repetitionSystems = [
  ['root-arches', 16, 'asymmetric attached root curve sweeps'], ['garden-beds', 40, 'route-clear flower and leaf clusters'], ['glasshouse-ribs', 12, 'radial egg-conservatory frame'], ['sunflower-petals', 24, 'radial pavilion crown'], ['leafroof-veins', 11, 'one central and branching secondary veins'], ['orchid-petals', 12, 'radial buttress ring'], ['arched-windows', 32, 'landmark-specific facade arcs'], ['citadel-balconies', 9, 'staggered stacked lotus cups'], ['butterflies', 18, 'near, middle and far quality-scaled flight paths'], ['petal-pollen', 160, 'quality-scaled drift field'],
].map(([id, instances, pattern]) => ({ id, geometry: 'named deterministic procedural system', instances, pattern, buildsGeometry: true, realization: 'quality-tier-scaled instancing, batching or named animated groups', evidenceRefs: evidence }));
spec.featureReviewTargets = [
  ['everblossom-world-silhouette', 'Connected root island, five landmarks and valley read in portrait overview', ['terrain-network', 'landmark-network', 'valley-horizon'], 0.88],
  ['five-landmark-identities', 'Tulip glasshouse, open sunflower pavilion, broad leaf hall, faceted orchid archive and vertical lotus citadel remain distinct', ['tulip-glasshouse-hatchery', 'sunflower-rhythm-pavilion', 'leafroof-garden-hall', 'orchid-crystal-archive', 'blossom-crown-citadel'], 0.92],
  ['canonical-route-clarity', 'All 36 wedge tile tops and reward objects remain unobstructed', ['route-integration'], 0.95],
  ['citadel-growth-identity', 'L1 keep, L2 bloom tower and L3 open crown are additive silhouettes of one building', ['blossom-crown-citadel', 'citadel-petal-balcony-array', 'citadel-open-crown'], 0.92],
  ['botanical-material-and-life', 'Stone, root, leaf, petals, gold, glass, springs and life layers remain separated and quality-scalable', ['terrain-network', 'landmark-network', 'ambience-system'], 0.86],
].map(([id, name, componentRefs, score]) => ({ id, name, tier: 'critical', passIds: ['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'lighting-pass', 'interaction-pass'], minimumScore: score, mustPass: true, componentRefs, evidenceRefs: evidence }));
spec.viewEvidence = [{ id: 'reference-everblossom-overview', view: 'portrait final-angle three-quarter overview', imageRegion: { x: 0, y: 0, width: 1, height: 1, units: 'normalized' }, observations: ['turquoise valley water', 'five botanical landmark families', 'quiet ivory annular route', 'vertical coral lotus citadel', 'root-and-stone terraces', 'butterflies and waterfalls'], confidence: 0.94 }];
spec.lightingFromPhoto = ['Warm golden key light from upper front-left.', 'Cool turquoise sky and water fill preserves root and facade shadow detail.', 'Soft bright rim separates petals, glass and leaves from the valley.', 'ACES filmic tone mapping with restrained exposure protects ivory and gold highlights.', 'Contact shadows ground every stair, root socket, terrace and landmark base.'];
spec.proceduralStrategy = ['Preserve shared tile geometry and gameplay transforms outside the Island 008 world module.', 'Use named action-ready roots for terrain, five landmark families and ambience.', 'Use curve sweeps for roots, extruded petal/leaf profiles, faceted low-segment glass, instanced garden/fauna systems and material-batched static geometry.', 'Freeze decorative animation under reduced motion while preserving semantic content and silhouette.'];
spec.performanceBudget = { qualityPriority: 'phone-reference-fidelity', targetTriangles: 180000, maxDrawCalls: 175, textureSize: 512, fpsTarget: 50, optimizationPolicy: 'Batch static terrain, petals, trim and garden beds by material; reduce butterflies, pollen, flower instances, water layers and radial segments across quality tiers before removing identity-defining silhouettes.' };
spec.lookDevTargets = { qualityPriority: 'procedural-reference-guided', materialPass: { albedoPaletteRequired: true, roughnessVariationRequired: true, normalOrBumpRequired: true, localOverridesRequired: true, referencePbrExtraction: { requiredWhenSourceImagePresent: false, acceptedLimitation: 'The illustrated whole environment contains baked golden light and cannot yield physically trustworthy isolated PBR maps.' } }, lightingPass: { requiredTerms: ['key light', 'fill light', 'rim light', 'exposure', 'tone mapping', 'background', 'contact shadow'] }, screenshotReview: ['phone overview', 'left and right orbit', 'map-stripped overview', 'five landmark focuses', 'L1 L2 L3 overview', 'high versus low quality'] };
spec.actionReadiness = { contract: 'Every landmark and ambience system owns a named Object3D root; visual animation has no gameplay authority.', defaultRigType: 'action-ready-static-world', rootMotionNode: 'root', requiredComponentFields: ['id', 'parent', 'actionProfile.animationRole'], transformChannels: ['translate', 'rotate', 'scale', 'visibility', 'material-state'], authoringRules: ['Keep gameplay tiles outside the visual module.', 'Keep landmarks in separate clickable roots.', 'Disable decorative movement for reduced motion.'], destructionPolicy: { defaultBreakable: false } };
spec.qualityTargets.reviewViewpoints = ['phone-overview', 'map-stripped-overview', 'orbit-left', 'orbit-right', 'hatchery-focus', 'habit-focus', 'mystery-focus', 'wisdom-focus', 'boss-focus'];
for (const pass of spec.buildPasses) pass.componentRefs = defs.map((definition) => definition[0]);
spec.sculptPipeline.currentPass = 'blockout';
spec.sculptPipeline.completedPasses = [];
spec.sculptPipeline.lastCompletedPass = null;
spec.sculptPipeline.blockedReason = null;

fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
