import fs from 'node:fs';

const specPath = new URL('./object-sculpt-spec.json', import.meta.url);
const inventoryPath = new URL('./detail-inventory.json', import.meta.url);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8')).detailInventory;
const evidence = ['full-object'];

const colors = {
  shell: ['rgba(227, 224, 217, 1)', 'rgba(179, 184, 188, 1)'],
  frame: ['rgba(20, 27, 35, 1)', 'rgba(53, 65, 77, 1)'],
  glass: ['rgba(20, 42, 55, 0.78)', 'rgba(68, 165, 214, 0.42)'],
  warm: ['rgba(255, 170, 74, 1)', 'rgba(255, 226, 164, 1)'],
  blue: ['rgba(43, 161, 255, 1)', 'rgba(173, 232, 255, 1)'],
  garden: ['rgba(54, 105, 48, 1)', 'rgba(147, 183, 86, 1)'],
  bark: ['rgba(73, 49, 32, 1)', 'rgba(137, 95, 50, 1)'],
  water: ['rgba(35, 149, 169, 0.72)', 'rgba(126, 227, 226, 0.62)'],
};

function attachment(parent, contactType = 'embedded') {
  if (!parent) return null;
  return {
    parentId: parent,
    parentSocket: `${parent}-socket`,
    localStart: [0, 0, 0], localEnd: [0, 0.08, 0],
    baseRadius: 0.1, endRadius: 0.08,
    overlap: 0.04, embedDepth: 0.035, contactType, gapTolerance: 0.008,
    evidenceRefs: evidence,
  };
}

function feature(id, description) {
  return {
    id,
    placement: description,
    size: 'phone-readable meso feature or silhouette-changing macro feature',
    orientation: 'local to the owning transform pivot and preserved in all three ship poses',
    materialEffect: 'independent albedo, roughness, normal/AO or emissive response as observed',
    geometryEffect: 'real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief',
    confidence: 0.86,
    evidenceRefs: evidence,
  };
}

function component({id, name, level, role, parent = 'root', material = 'dark-structural-frame', primitive = 'box', topologyClass = 'assembled-solid', topologyRationale = 'Manufactured hard-surface component with explicit seams and occupied volume.', features = [], animationRole = role, importance = 0.8, sockets = []}) {
  const root = id === 'root';
  const palette = material === 'white-ceramic-shell' ? colors.shell
    : material === 'smoked-bridge-glass' || material === 'garden-shield-glass' ? colors.glass
    : material === 'warm-window-glass' ? colors.warm
    : material === 'blue-power-glass' ? colors.blue
    : material === 'garden-foliage' ? colors.garden
    : material === 'great-tree-bark' ? colors.bark
    : material === 'atrium-water' ? colors.water
    : colors.frame;
  return {
    id, name, level, role, importance, confidence: 0.86,
    primitive, topologyClass, topologyRationale,
    geometryDescriptor: {
      topologyIntent: topologyClass === 'continuous-sculpt' ? 'continuous curved volume with controlled vertex deformation' : 'bevel-ready modular hard-surface volume',
      edgeTreatment: {type: topologyClass === 'continuous-sculpt' ? 'rounded-profile' : 'chamfer', bevelRadius: 0.025, segments: 3},
      deformationStack: [], uvStrategy: 'generated object-space coordinates', normalStrategy: 'recomputed vertex normals with weighted hard-surface edges',
    },
    parent: root ? null : parent,
    attachment: root ? null : attachment(parent),
    dimensions: {width: 1, height: 1, depth: 1, units: 'relative-to-150m-living-width', confidence: 0.78},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
    actionProfile: {
      animationRole,
      pivot: {mode: root ? 'center' : 'authored-hinge-or-socket', localPosition: [0, 0, 0], axis: [0, 1, 0], confidence: 0.88},
      transformChannels: {translate: !root, rotate: !root, scale: false, bend: false, twist: false, detach: false, visibility: true, materialState: true},
      sockets: sockets.map((socket) => ({id: socket, localPosition: [0, 0, 0], localDirection: [0, 0, 1], purpose: socket})),
      collider: {type: root ? 'compound' : 'box', offset: [0, 0, 0], scale: [1, 1, 1], isTrigger: false, notes: 'Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies.'},
      constraints: ['preserve occupied-volume clearance', 'preserve hinge/socket overlap in docked, expedition, and flight poses'],
      destruction: {breakable: false, fractureGroup: 'expedition-ship', seamRefs: [], detachableFragments: [], breakImpulse: 0, debrisMaterial: material},
    },
    material, materialLayers: [material], deformations: [], joints: [], seams: [],
    localFeatures: features.map(([featureId, description]) => feature(featureId, description)),
    surfaceDetail: {
      macroRoughness: 0.12, microRoughness: 0.055, bumpAmplitude: 0.015,
      normalPattern: `${material}-independent-normal`, displacementPattern: 'macro shape owned by geometry',
      occlusionPattern: 'hinge collars, panel seams, deck recesses, sockets and component overlaps',
      edgeWearPattern: 'restrained service-edge wear only',
      notes: 'Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance.',
    },
    evidenceRefs: evidence, details: [], fidelityTier: level === 'micro' ? 'detail' : level === 'meso' ? 'structural' : 'blockout',
    colorMaterialRecipe: {
      dominantAlbedo: palette[0], secondaryAlbedo: palette[1],
      materialClass: material, materialClassConfidence: 0.88,
      colorGradient: {type: 'linear', stops: [{at: 0, color: palette[0]}, {at: 1, color: palette[1]}]},
      evidenceRefs: evidence,
    },
  };
}

spec.componentTree = [
  component({id: 'root', name: 'Expedition Ship root', level: 'macro', role: 'transform-root', parent: null, importance: 1, sockets: ['camera-exterior', 'environment-downwash-origin']}),
  component({id: 'center-spine', name: 'Fixed inhabited centre spine', level: 'macro', role: 'fixed-occupied-spine', parent: 'root', importance: 1, sockets: ['garden-atrium-socket', 'garage-belly-socket', 'landing-keel-socket']}),
  component({id: 'left-wing-pivot', name: 'Left controller wing pivot', level: 'macro', role: 'primary-transform-pivot', parent: 'center-spine', importance: 1, animationRole: 'left-wing-hinge', sockets: ['left-wing-shell-socket', 'left-engine-socket']}),
  component({id: 'right-wing-pivot', name: 'Right controller wing pivot', level: 'macro', role: 'primary-transform-pivot', parent: 'center-spine', importance: 1, animationRole: 'right-wing-hinge', sockets: ['right-wing-shell-socket', 'right-engine-socket']}),
  component({id: 'garden-atrium', name: 'Protected Great Tree garden atrium', level: 'macro', role: 'protected-occupied-volume', parent: 'center-spine', material: 'garden-foliage', primitive: 'lathe', topologyClass: 'continuous-sculpt', topologyRationale: 'The planted atrium and Great Tree require a continuous protected interior volume.', importance: 1, sockets: ['garden-entry', 'sky-terrace-camera']}),
  component({id: 'garage-belly', name: 'Fabrication and garage belly reserve', level: 'macro', role: 'protected-occupied-volume', parent: 'center-spine', importance: 0.95, features: [['garage-door-seam', 'Large belly clamshell service opening with reserved traversal clearance.']], sockets: ['garage-entry-camera']}),

  component({id: 'left-outer-shell', name: 'Left white ceramic controller shell', level: 'meso', role: 'articulated-shell', parent: 'left-wing-pivot', material: 'white-ceramic-shell', primitive: 'box', features: [['crown-bevel', 'Broad real crown chamfer.'], ['split-seam', 'Recessed charcoal shell/frame separation seam.']]}),
  component({id: 'right-outer-shell', name: 'Right white ceramic controller shell', level: 'meso', role: 'articulated-shell', parent: 'right-wing-pivot', material: 'white-ceramic-shell', primitive: 'box', features: [['crown-bevel', 'Broad real crown chamfer.'], ['split-seam', 'Recessed charcoal shell/frame separation seam.']]}),
  component({id: 'left-underframe', name: 'Left charcoal structural underframe', level: 'meso', role: 'wing-structure', parent: 'left-wing-pivot'}),
  component({id: 'right-underframe', name: 'Right charcoal structural underframe', level: 'meso', role: 'wing-structure', parent: 'right-wing-pivot'}),
  component({id: 'left-engine-housing', name: 'Left aft engine housing', level: 'meso', role: 'travel-propulsion', parent: 'left-wing-pivot', features: [['recessed-vent-banks', 'Three real vent cavities.'], ['main-thruster-socket', 'One monumental annular vectored travel-thruster socket.']], sockets: ['left-main-engine']}),
  component({id: 'right-engine-housing', name: 'Right aft engine housing', level: 'meso', role: 'travel-propulsion', parent: 'right-wing-pivot', features: [['recessed-vent-banks', 'Three real vent cavities.'], ['main-thruster-socket', 'One monumental annular vectored travel-thruster socket.']], sockets: ['right-main-engine']}),
  component({id: 'garden-shield-frame', name: 'Garden shield aperture and shutters', level: 'meso', role: 'protective-transform-system', parent: 'center-spine', material: 'garden-shield-glass', primitive: 'torus', features: [['aperture-rim', 'Continuous structural garden aperture rim.'], ['shutter-seams', 'Four shield shutters retract into the frame without entering the garden clearance volume.']]}),
  component({id: 'power-towers', name: 'Twin telescoping power towers', level: 'meso', role: 'telescoping-power-system', parent: 'center-spine', material: 'blue-power-glass', primitive: 'cylinder', features: [['telescoping-collars', 'Four nested locking collars per tower.']], sockets: ['left-tower-cap', 'right-tower-cap']}),
  component({id: 'landing-keel', name: 'Telescoping landing and service keel', level: 'meso', role: 'landing-support', parent: 'center-spine', features: [['telescoping-lock', 'Three nested rails and one annular keel lock.']], sockets: ['keel-foot', 'keel-camera']}),
  component({id: 'hover-lift-array', name: 'Distributed belly hover-lift array', level: 'meso', role: 'hover-propulsion', parent: 'center-spine', features: [['downwash-emitters', 'Eight recessed lift emitters around the fixed centre spine.']], sockets: ['downwash-origin', 'hover-emitter-ring']}),
  component({id: 'walker-leg-front-left', name: 'Front-left articulated walker leg', level: 'meso', role: 'walker-locomotion', parent: 'center-spine', animationRole: 'terrain-gait-and-stabilization', features: [['hip-knee-ankle-chain', 'Massive telescoping load path with separate hip, knee and adaptive ankle pivots.'], ['trim-rockets', 'Paired small vectored ankle rockets unload the foot and counter hull motion.']], sockets: ['front-left-foot-contact', 'front-left-trim-rockets']}),
  component({id: 'walker-leg-front-right', name: 'Front-right articulated walker leg', level: 'meso', role: 'walker-locomotion', parent: 'center-spine', animationRole: 'terrain-gait-and-stabilization', features: [['hip-knee-ankle-chain', 'Massive telescoping load path with separate hip, knee and adaptive ankle pivots.'], ['trim-rockets', 'Paired small vectored ankle rockets unload the foot and counter hull motion.']], sockets: ['front-right-foot-contact', 'front-right-trim-rockets']}),
  component({id: 'walker-leg-rear-left', name: 'Rear-left articulated walker leg', level: 'meso', role: 'walker-locomotion', parent: 'center-spine', animationRole: 'terrain-gait-and-stabilization', features: [['hip-knee-ankle-chain', 'Massive telescoping load path with separate hip, knee and adaptive ankle pivots.'], ['trim-rockets', 'Paired small vectored ankle rockets unload the foot and counter hull motion.']], sockets: ['rear-left-foot-contact', 'rear-left-trim-rockets']}),
  component({id: 'walker-leg-rear-right', name: 'Rear-right articulated walker leg', level: 'meso', role: 'walker-locomotion', parent: 'center-spine', animationRole: 'terrain-gait-and-stabilization', features: [['hip-knee-ankle-chain', 'Massive telescoping load path with separate hip, knee and adaptive ankle pivots.'], ['trim-rockets', 'Paired small vectored ankle rockets unload the foot and counter hull motion.']], sockets: ['rear-right-foot-contact', 'rear-right-trim-rockets']}),
  component({id: 'interior-volume-reservations', name: 'Named occupied deck reservations', level: 'meso', role: 'clearance-volume-system', parent: 'center-spine', features: [['room-entry-sockets', 'Garden, garage, creature habitat, bridge and sky-terrace room camera portals.']], sockets: ['garden-entry', 'garage-entry', 'creature-deck-entry', 'bridge-entry', 'sky-terrace-entry']}),
  component({id: 'bridge-crown', name: 'Forward command bridge crown', level: 'meso', role: 'command-deck', parent: 'center-spine', material: 'smoked-bridge-glass', primitive: 'box', sockets: ['travel-pov-camera']}),
  component({id: 'central-deck-stack', name: 'Central inhabited deck stack', level: 'meso', role: 'occupied-decks', parent: 'center-spine', material: 'warm-window-glass'}),
  component({id: 'left-occupied-decks', name: 'Left offices and homes deck cassette', level: 'meso', role: 'occupied-decks', parent: 'left-wing-pivot', material: 'warm-window-glass'}),
  component({id: 'right-occupied-decks', name: 'Right creature habitat and offices cassette', level: 'meso', role: 'occupied-decks', parent: 'right-wing-pivot', material: 'warm-window-glass'}),
  component({id: 'garage-door', name: 'Garage clamshell door pair', level: 'meso', role: 'room-entry-mechanism', parent: 'garage-belly', animationRole: 'garage-door-hinge'}),
  component({id: 'sky-terrace', name: 'Great Tree sky terrace', level: 'meso', role: 'social-story-deck', parent: 'garden-atrium', material: 'garden-foliage', primitive: 'cylinder', sockets: ['sky-terrace-seat', 'mission-camera']}),
  component({id: 'great-tree', name: 'Central living Great Tree', level: 'meso', role: 'botanical-heart', parent: 'garden-atrium', material: 'great-tree-bark', primitive: 'curve-sweep', topologyClass: 'continuous-sculpt', topologyRationale: 'A rooted tapering trunk and branching canopy require continuous curves and organic deformation.'}),
  component({id: 'atrium-water', name: 'Central garden stream and pools', level: 'meso', role: 'botanical-water-system', parent: 'garden-atrium', material: 'atrium-water', primitive: 'plane-card', topologyClass: 'material-only', topologyRationale: 'Thin water is a layered visual surface owned by the protected garden volume.'}),
  component({id: 'fabrication-deck', name: 'Fabrication builders deck reserve', level: 'meso', role: 'occupied-workshop', parent: 'garage-belly', sockets: ['fabrication-camera']}),
  component({id: 'creature-deck', name: 'Creature habitat deck reserve', level: 'meso', role: 'occupied-habitat', parent: 'right-occupied-decks', sockets: ['creature-camera']}),

  component({id: 'window-band-system', name: 'Warm inhabited window bands', level: 'micro', role: 'repeated-window-system', parent: 'central-deck-stack', material: 'warm-window-glass'}),
  component({id: 'service-seam-system', name: 'Sparse shell service panel lines', level: 'micro', role: 'panel-line-system', parent: 'root', material: 'white-ceramic-shell'}),
  component({id: 'hinge-lock-system', name: 'Shoulder hinge collar locks', level: 'micro', role: 'fastener-system', parent: 'center-spine', features: [['radial-locks', 'Twelve locking heads around each primary wing hinge.']]}),
  component({id: 'tower-collar-system', name: 'Power tower collar rings', level: 'micro', role: 'repeated-collar-system', parent: 'power-towers'}),
  component({id: 'vent-bank-system', name: 'Engine vent bank inserts', level: 'micro', role: 'repeated-vent-system', parent: 'root'}),
  component({id: 'thruster-socket-system', name: 'Travel thruster nozzle inserts', level: 'micro', role: 'thrust-effect-system', parent: 'root', material: 'blue-power-glass', sockets: ['thrust-effect-left', 'thrust-effect-right']}),
  component({id: 'landing-guide-lights', name: 'Landing and service guide lights', level: 'micro', role: 'landing-light-system', parent: 'center-spine', material: 'warm-window-glass'}),
  component({id: 'room-portal-system', name: 'Room entry portal markers', level: 'micro', role: 'camera-entry-system', parent: 'interior-volume-reservations'}),
  component({id: 'panel-fastener-system', name: 'Instanced service fasteners', level: 'micro', role: 'fastener-system', parent: 'root'}),
];

function material(id, name, color, secondary, roughness, metalness, extras = {}) {
  return {
    id, name, type: extras.type || 'physical', shaderModel: 'MeshPhysicalMaterial', baseColor: color, color,
    albedo: {dominant: color, secondary: [secondary], samplingNotes: 'Reference-guided de-lit intent; cinematic lighting is not baked into albedo.'},
    colorVariation: {palette: [color, secondary], pattern: extras.pattern || 'subtle object-space manufacturing variation', amplitude: extras.amplitude ?? 0.035, heightCorrelation: 0.1},
    textureResolution: 1024,
    textureProjection: {mode: 'object-space-procedural', repeat: [3, 3], anisotropy: 8, texelDensityIntent: 'Stable metre-scale detail; phone overview keeps broad surfaces clean.'},
    surfaceFrequencyBands: [
      {id: 'macro', frequency: 0.8, amplitude: 0.035, role: 'broad manufactured or organic color response'},
      {id: 'meso', frequency: 8, amplitude: 0.018, role: 'panel, grain, bark, leaf, or glazing breakup'},
      {id: 'micro', frequency: 42, amplitude: 0.006, role: 'grazing highlight breakup only'},
    ],
    roughness: {base: roughness, variation: 0.06, map: `${id}-independent-roughness`, localResponse: 'cavities rougher; handled edges slightly smoother'},
    metalness: {base: metalness, variation: 0.02},
    normal: {pattern: `${id}-independent-normal`, strength: extras.normal ?? 0.12, scale: 28, space: 'tangent'},
    bump: {pattern: `${id}-independent-height`, amplitude: extras.bump ?? 0.012, scale: 18},
    displacement: {pattern: 'none', amplitude: 0, scale: 1, silhouetteAffects: false},
    ambientOcclusion: {cavityStrength: 0.24, contactShadowBias: 0.32, notes: 'Concentrate only in true seams, sockets, overlaps, bark and foliage cavities.'},
    wear: {edgeWear: extras.edgeWear ?? 0.015, scratches: extras.scratches || ['restrained maintenance-direction marks'], chips: []},
    dirt: {amount: extras.dirt ?? 0.018, cavityBias: 0.65, color: '#12171B'},
    localOverrides: extras.localOverrides || [{id: `${id}-local-response`, region: 'component seams, protected cavities and exposed service edges', roughness: roughness + 0.06, strength: 0.18, evidenceRefs: evidence}],
    shaderNotes: ['Independent albedo, roughness, normal/height and AO fields.', 'No baked cinematic highlights in albedo.'],
    notes: extras.notes || 'Procedural PBR built from observed material family; hidden-side response remains inferred.',
    clearcoat: extras.clearcoat ?? 0.08, clearcoatRoughness: extras.clearcoatRoughness ?? 0.22,
    emissive: extras.emissive || '#000000', emissiveIntensity: extras.emissiveIntensity ?? 0,
    transparent: extras.transparent ?? false, opacity: extras.opacity ?? 1, transmission: extras.transmission ?? 0, ior: extras.ior ?? 1.45,
  };
}

spec.materials = [
  material('white-ceramic-shell', 'Warm white ceramic composite shell', '#DEDCD6', '#AEB5BA', 0.32, 0.08, {clearcoat: 0.55, clearcoatRoughness: 0.18, localOverrides: [{id: 'clearcoat-response', region: 'broad shell crowns and chamfer highlights', roughness: 0.28, strength: 0.45, evidenceRefs: evidence}, {id: 'service-panel-lines', region: 'sparse shell service seams', roughness: 0.52, strength: 0.22, evidenceRefs: evidence}]}),
  material('dark-structural-frame', 'Charcoal coated structural frame', '#18212A', '#3B4854', 0.48, 0.72, {normal: 0.09, edgeWear: 0.025}),
  material('smoked-bridge-glass', 'Smoked panoramic bridge glass', '#132A38', '#3E819E', 0.08, 0.05, {transparent: true, opacity: 0.76, transmission: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, bump: 0.002, localOverrides: [{id: 'forward-visor', region: 'forward bridge crown', roughness: 0.06, strength: 0.5, evidenceRefs: evidence}]}),
  material('garden-shield-glass', 'Retractable garden shield glazing', '#315D69', '#75C8D7', 0.1, 0.02, {transparent: true, opacity: 0.34, transmission: 0.65, clearcoat: 1, clearcoatRoughness: 0.05, bump: 0.002}),
  material('warm-window-glass', 'Warm inhabited deck window glass', '#2B221E', '#FFB45B', 0.24, 0.05, {emissive: '#FF8B35', emissiveIntensity: 1.25, localOverrides: [{id: 'deck-window-bands', region: 'three occupied deck bands per wing and centre spine', roughness: 0.2, strength: 0.72, evidenceRefs: evidence}, {id: 'guide-light-family', region: 'keel, garage and lower-shell approach lights', roughness: 0.16, strength: 0.8, evidenceRefs: evidence}]}),
  material('blue-power-glass', 'Cyan power and propulsion glass', '#154B6A', '#6DD8FF', 0.16, 0.12, {emissive: '#2EAFFF', emissiveIntensity: 1.4, transparent: true, opacity: 0.82, clearcoat: 0.8, clearcoatRoughness: 0.08, localOverrides: [{id: 'power-node-family', region: 'tower caps, hinge nodes, keel locks, thrusters and lift emitters', roughness: 0.12, strength: 0.9, evidenceRefs: evidence}]}),
  material('garden-foliage', 'Living garden foliage', '#356934', '#91B75C', 0.78, 0, {normal: 0.22, bump: 0.03, dirt: 0.04, pattern: 'leaf-cluster and moss variation', clearcoat: 0.05}),
  material('great-tree-bark', 'Great Tree bark', '#493320', '#895F35', 0.86, 0, {normal: 0.28, bump: 0.06, dirt: 0.08, pattern: 'vertical bark furrows and root plates'}),
  material('atrium-water', 'Garden stream water', '#238E9F', '#7BD9DA', 0.06, 0, {transparent: true, opacity: 0.72, transmission: 0.45, clearcoat: 1, clearcoatRoughness: 0.03, normal: 0.1, bump: 0.004, pattern: 'slow coherent stream ripples'}),
];

spec.preSpecAssessment.detailInventory = inventory;
for (const detail of spec.preSpecAssessment.detailInventory.details) {
  detail.mapsTo.ref = String(detail.mapsTo.ref).split('.').at(-1);
}
spec.preSpecAssessment.unknownsToResolveBeforeImplementation = [];
spec.assumptions = [
  'Rear, top and belly styling is inferred from the selected exterior and transformation references and may not override visible front/three-quarter evidence.',
  'Expanded living mode is approximately 150m wide by 90m deep with a 52m inhabited hull and 78m standing height; hypersonic mode folds toward a 105m-wide envelope.',
  'The Great Tree garden, occupied decks, garage and creature habitat remain upright/protected throughout transformation.',
  'Macro pass reserves room volumes and camera portals; detailed room interiors are a later pass.',
];
spec.featureReviewTargets = [
  {id: 'three-pose-coherence', name: 'Expanded living/walker, expedition and hypersonic poses read as one controller-derived ship', tier: 'critical', passIds: ['blockout','structural-pass','form-refinement','interaction-pass'], minimumScore: 0.9, mustPass: true, componentRefs: ['center-spine','left-wing-pivot','right-wing-pivot','left-outer-shell','right-outer-shell'], evidenceRefs: evidence},
  {id: 'occupied-volume-clearance', name: 'Garden, Great Tree, occupied decks and garage remain uncut by all hinge sweeps', tier: 'critical', passIds: ['blockout','structural-pass','interaction-pass'], minimumScore: 0.94, mustPass: true, componentRefs: ['garden-atrium','garage-belly','interior-volume-reservations','left-wing-pivot','right-wing-pivot'], evidenceRefs: evidence},
  {id: 'office-building-scale', name: 'Windows, deck bands, doors and garage establish a 150m mobile inhabited campus rather than a city or toy', tier: 'critical', passIds: ['structural-pass','form-refinement','material-pass'], minimumScore: 0.88, mustPass: true, componentRefs: ['central-deck-stack','left-occupied-decks','right-occupied-decks','garage-belly','window-band-system'], evidenceRefs: evidence},
  {id: 'propulsion-coherence', name: 'Primary rear travel engines, hull hover array, leg trim rockets and downwash signal remain directionally coherent', tier: 'critical', passIds: ['structural-pass','interaction-pass','lighting-pass'], minimumScore: 0.9, mustPass: true, componentRefs: ['left-engine-housing','right-engine-housing','hover-lift-array','walker-leg-front-left','walker-leg-front-right','walker-leg-rear-left','walker-leg-rear-right','thruster-socket-system'], evidenceRefs: evidence},
  {id: 'garden-home-identity', name: 'Protected botanical home remains visible and warm without weakening the spacecraft shell', tier: 'important', passIds: ['structural-pass','material-pass','lighting-pass'], minimumScore: 0.84, mustPass: false, componentRefs: ['garden-atrium','garden-shield-frame','great-tree','sky-terrace','warm-window-glass'], evidenceRefs: evidence},
];
spec.repetitionSystems = [
  {id: 'deck-window-bands', geometry: 'batched inset window modules', instances: 42, pattern: 'three occupied deck bands across centre and wing cassettes', buildsGeometry: true, realization: 'instanced frames plus batched emissive glazing', evidenceRefs: evidence},
  {id: 'hinge-radial-locks', geometry: 'instanced recessed locking heads', instances: 24, pattern: '12 radial locks per shoulder hinge', buildsGeometry: true, realization: 'InstancedMesh under each hinge pivot', evidenceRefs: evidence},
  {id: 'tower-collars', geometry: 'nested annular power collars', instances: 8, pattern: 'four rings per telescoping tower', buildsGeometry: true, realization: 'shared geometry under the tower telescope groups', evidenceRefs: evidence},
  {id: 'hover-emitters', geometry: 'recessed annular lift emitter', instances: 8, pattern: 'radial ellipse around the centre spine', buildsGeometry: true, realization: 'instanced geometry and one shared emissive material', evidenceRefs: evidence},
  {id: 'walker-leg-trim-rockets', geometry: 'small vectored ankle trim rocket', instances: 8, pattern: 'paired trim nozzles on four articulated legs', buildsGeometry: true, realization: 'shared socket and plume geometry under each ankle pivot', evidenceRefs: evidence},
  {id: 'landing-guide-lights', geometry: 'small recessed warm-white light', instances: 16, pattern: 'keel, garage and lower shell approach outline', buildsGeometry: true, realization: 'InstancedMesh with state-driven emissive intensity', evidenceRefs: evidence},
];
spec.lightingFromPhoto = [
  'Neutral warm-white key from upper front-left at intensity 2.4 with soft shadows.',
  'Cool blue fill from lower front-right at intensity 0.9 separates charcoal underframes.',
  'Restrained cool rim at intensity 1.2 outlines the white controller shell and towers.',
  'Warm practical window lights and cyan power nodes remain local emissive accents, not global exposure sources.',
  'ACES filmic tone mapping at exposure 0.98; neutral studio background for comparison and separate water-hover environment for interaction review.',
  'Soft contact shadows and a broad receiver shadow ground keel, hover emitters and landed service pose without hiding the belly silhouette.',
];
spec.performanceBudget = {qualityPriority: 'phone-macro-transform-fidelity', targetTriangles: 72000, maxDrawCalls: 95, textureSize: 1024, fpsTarget: 55, optimizationPolicy: 'Batch repeated windows, locks, collars, vents, guide lights and hover emitters; preserve shell, hinge, garden aperture and engine silhouettes before micro surface detail.'};
spec.actionReadiness = {
  contract: 'One persistent scene graph owns living/walking, expedition and hypersonic poses; ship update emits presentation-only transform, gait, stabilization, thrust, hover and environment signals.',
  defaultRigType: 'articulated-transforming-vehicle', rootMotionNode: 'root',
  requiredComponentFields: ['id','parent','actionProfile.animationRole'],
  transformChannels: ['translate','rotate','visibility','material-state'],
  authoringRules: [
    'Never swap the ship mesh between poses.',
    'Keep occupied deck and botanical volumes outside hinge sweep envelopes.',
    'Primary rear engines provide travel thrust; belly emitters provide heavy hover lift; leg rockets provide fast trim and step unloading.',
    'Four articulated legs retract into named underside envelopes and use a slow diagonal four-beat gait while keeping the garden floor level.',
    'The ship exposes downwash origin/radius/strength/phase; the island environment owns water rings, dust, snow, leaves or heat distortion.',
    'Room portals and camera anchors remain stable child sockets for later interior traversal.',
  ],
  destructionPolicy: {defaultBreakable: false},
};
spec.animationAnchors = [
  {id: 'left-wing-hinge', componentRef: 'left-wing-pivot', channels: ['position','rotation'], purpose: 'docked-to-expedition-to-flight wing fold'},
  {id: 'right-wing-hinge', componentRef: 'right-wing-pivot', channels: ['position','rotation'], purpose: 'docked-to-expedition-to-flight wing fold'},
  {id: 'tower-telescope', componentRef: 'power-towers', channels: ['position','scale'], purpose: 'service tower deployment'},
  {id: 'keel-telescope', componentRef: 'landing-keel', channels: ['position'], purpose: 'landing/service support deployment'},
  {id: 'shield-shutters', componentRef: 'garden-shield-frame', channels: ['rotation','visibility','material-state'], purpose: 'protect garden for flight while retaining light'},
  {id: 'travel-thrust', componentRef: 'thruster-socket-system', channels: ['scale','material-state'], purpose: 'idle, cruise and boost flame/plasma animation'},
  {id: 'hover-downwash', componentRef: 'hover-lift-array', channels: ['material-state'], purpose: 'hover lift and reusable environment interaction signal'},
  {id: 'walker-gait', componentRef: 'walker-leg-front-left', channels: ['position','rotation','scale','material-state'], purpose: 'four-leg terrain walking, retraction and trim-rocket stabilization'},
];
spec.silhouette = {
  front: 'wide controller-derived bilateral shell around a protected central garden void',
  side: 'layered office-building deck cassettes with a compact aft engine mass and retractable keel',
  top: 'coherent controller planform with central botanical aperture and paired handle wings',
  negativeSpaces: ['garden atrium aperture', 'wing-to-centre transform gaps', 'keel and landing clearance', 'engine nozzle cavities'],
  scaleAuthority: '150m-wide expanded living habitat, roughly one-third a very large cruise ship; 105m-wide folded hypersonic envelope',
};
spec.lookDevTargets.qualityPriority = 'phone-runtime-balanced';
spec.lookDevTargets.materialPass.referencePbrExtraction.requiredWhenSourceImagePresent = false;
spec.lookDevTargets.materialPass.minimumTextureResolution = 1024;
spec.selfCorrectLoop.visualAcceptance.threshold = 0.84;
spec.qualityTargets.targetFidelity = 0.84;
spec.qualityTargets.notes = 'Macro transform and phone silhouette target for this pass; hidden surfaces and room interiors remain explicitly inferred or reserved.';
spec.sourceImage = 'docs/design/expedition-ship/expedition-ship-150m-walker-living-mode-candidate-v1.png';
spec.suitability = 'conditional';
spec.risks = [
  'Three-pose cinematic sheet is strong macro transform evidence but not orthographic.',
  'Exterior cutaway supports scale and occupied-volume adjacency, not exact hidden topology.',
  'Rear/top/belly styling remains inferred and must pass multi-angle self-consistency.',
];

const componentIds = spec.componentTree.map((item) => item.id);
const materialClassById = {
  'white-ceramic-shell': 'ceramic',
  'dark-structural-frame': 'metal',
  'smoked-bridge-glass': 'glass',
  'garden-shield-glass': 'glass',
  'warm-window-glass': 'glass',
  'blue-power-glass': 'glass',
  'garden-foliage': 'unknown',
  'great-tree-bark': 'wood',
  'atrium-water': 'glass',
};
for (const item of spec.componentTree) {
  item.colorMaterialRecipe.materialClass = materialClassById[item.material] || 'unknown';
}
for (const pass of spec.buildPasses) {
  pass.componentRefs = componentIds;
}

fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
