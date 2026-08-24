import fs from 'node:fs';

const here = new URL('./', import.meta.url);
const specPath = new URL('./quest-forge-sculpt-spec.json', here);
const assessmentPath = new URL('./pre-spec-assessment.json', here);
const inventoryPath = new URL('./detail-inventory.json', here);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const assessment = JSON.parse(fs.readFileSync(assessmentPath, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const baseComponent = structuredClone(spec.componentTree[0]);
const baseMaterial = structuredClone(spec.materials[0]);
const evidence = ['quest-forge-goal'];

const materialDefs = [
  ['indigo-field', '#111326', 0.74, 0.02, 0.08, '#000000', 'fine leather grain with sparse recessed page-instrument marks'],
  ['aged-brass', '#9A6327', 0.37, 0.84, 0.18, '#160A02', 'brushed gilt with cavity-darkened patina and restrained worn crests'],
  ['violet-crystal', '#6F35B5', 0.22, 0.04, 0.72, '#36106E', 'faceted violet enamel-crystal with independent micro scratches'],
  ['gold-primary', '#D6A13B', 0.2, 0.92, 0.32, '#2A1302', 'polished gold diamond with sharp bevel highlights'],
  ['teal-enamel', '#147E82', 0.18, 0.05, 0.78, '#06282B', 'deep teal enamel disc with controlled clearcoat'],
  ['vault-charcoal', '#242338', 0.56, 0.46, 0.12, '#03030A', 'charcoal-indigo satin metal with vertical panel seams'],
  ['flame-amber', '#FF8A18', 0.24, 0.01, 0.52, '#FF5A0A', 'opaque stylized ember solid with hot core and cooler outer lobes'],
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
    albedo: { dominant: color, secondary: [color, '#090A13'], samplingNotes: 'Reference-guided base values separated from baked key/rim lighting.' },
    colorVariation: { palette: [color, '#090A13', '#C58A3A'], pattern: `${pattern}; deterministic object-space variation`, amplitude: 0.1, heightCorrelation: 0.24 },
    textureResolution: 1024,
    textureProjection: { mode: 'object-space', repeat: [4, 4], anisotropy: 8, texelDensityIntent: 'Stable page-scale detail without stretching across relief parts.' },
    surfaceFrequencyBands: [
      { id: 'macro', frequency: 1.4, amplitude: 0.12, role: 'broad patina/value variation' },
      { id: 'meso', frequency: 14, amplitude: 0.075, role: pattern },
      { id: 'micro', frequency: 72, amplitude: 0.024, role: 'grazing-highlight breakup' },
    ],
    roughness: { base: roughness, variation: 0.12, map: 'independent-procedural-roughness', localResponse: 'rougher cavities and fracture faces, smoother worn crests' },
    metalness: { base: metalness, variation: metalness > 0.2 ? 0.06 : 0 },
    normal: { pattern: `${pattern} independent normal`, strength: id === 'indigo-field' ? 0.22 : 0.1, scale: 54, space: 'tangent' },
    bump: { pattern: `${pattern} independent height`, amplitude: id === 'indigo-field' ? 0.055 : 0.025, scale: 48 },
    displacement: { pattern: 'none', amplitude: 0, scale: 1, silhouetteAffects: false },
    ambientOcclusion: { cavityStrength: 0.38, contactShadowBias: 0.44, notes: 'Concentrated beneath ring rails, bezels, cage ribs, hinges, frame and crest socket.' },
    wear: { edgeWear: id === 'aged-brass' || id === 'vault-charcoal' ? 0.14 : 0.04, scratches: ['short restrained directional marks'], chips: id === 'violet-crystal' ? ['accepted-cost fracture face is geometry-owned'] : [] },
    dirt: { amount: id === 'aged-brass' || id === 'vault-charcoal' ? 0.11 : 0.03, cavityBias: 0.72, color: '#09070A' },
    clearcoat,
    clearcoatRoughness: clearcoat > 0.5 ? 0.15 : 0.32,
    emissive,
    emissiveIntensity: id === 'flame-amber' ? 1.9 : id === 'violet-crystal' ? 0.16 : 0.03,
    localOverrides: [{
      id: id === 'teal-enamel' ? 'support-token-clearcoat' : `${id}-cavity-patina`,
      region: id === 'teal-enamel' ? 'supporting token face only' : 'recesses, seams, contact zones and selected worn crests',
      roughness: id === 'teal-enamel' ? 0.13 : Math.min(1, roughness + 0.12),
      strength: 0.32,
      evidenceRefs: evidence,
    }],
    notes: `${pattern}; albedo, roughness, height/normal and AO remain independent channels.`,
  });
  delete material.referencePbr;
  return material;
});

const defs = [
  ['root', 'Quest Forge relief root', 'macro', null, 'indigo-field', 'root', ['page-bound-relief'], 'assembled-solid', 'box'],
  ['contact-frame', 'Contact plate and double gilt frame', 'macro', 'root', 'aged-brass', 'static-frame', ['double-bevel', 'corner-fasteners'], 'assembled-solid', 'extrude'],
  ['maintenance-system', 'Maintenance ring and review system', 'macro', 'root', 'aged-brass', 'maintenance-state-owner', ['complete-ring-hierarchy'], 'assembled-solid', 'torus'],
  ['forge-spine', 'Protected flame to milestone to crest spine', 'macro', 'root', 'aged-brass', 'forge-celebration-owner', ['vertical-forge-path'], 'assembled-solid', 'box'],
  ['not-now-vault-system', 'Released path and closed Not-Now vault', 'macro', 'root', 'vault-charcoal', 'release-state-owner', ['respectful-storage-hierarchy'], 'assembled-solid', 'cylinder'],
  ['contact-field', 'Dark inset field behind the instrument', 'meso', 'contact-frame', 'indigo-field', 'static-surface', ['field-grain'], 'conforming-shell', 'box'],
  ['maintenance-ring', 'Double circular maintenance rail', 'meso', 'maintenance-system', 'aged-brass', 'ring-pulse', ['radial-engravings', 'socket-rivets'], 'assembled-solid', 'torus'],
  ['review-socket', 'Upper review clock socket', 'meso', 'maintenance-system', 'aged-brass', 'review-pulse', ['clock-markers'], 'assembled-solid', 'cylinder'],
  ['quest-crest', 'Faceted violet Quest Crest', 'meso', 'forge-spine', 'violet-crystal', 'crest-lift', ['facet-ridges', 'accepted-cost-notch'], 'continuous-sculpt', 'extrude'],
  ['primary-token', 'Embedded primary quest diamond', 'meso', 'quest-crest', 'gold-primary', 'primary-token-pulse', ['pronged-bezel'], 'assembled-solid', 'extrude'],
  ['milestone-anvil', 'First Milestone anvil plate', 'meso', 'forge-spine', 'aged-brass', 'milestone-strike', ['stepped-bevels'], 'assembled-solid', 'extrude'],
  ['protected-flame', 'Protected amber flame solid', 'meso', 'forge-spine', 'flame-amber', 'protected-flame-pulse', ['cage-ribs'], 'continuous-sculpt', 'lathe'],
  ['supporting-token', 'Single supporting teal token', 'meso', 'maintenance-system', 'teal-enamel', 'support-token-pulse', ['double-bezel'], 'assembled-solid', 'cylinder'],
  ['not-now-vault', 'Closed circular Not-Now vault', 'meso', 'not-now-vault-system', 'vault-charcoal', 'vault-door-static', ['hinges-latch-seams'], 'assembled-solid', 'cylinder'],
  ['released-fragment', 'Single cooling released fragment', 'meso', 'not-now-vault-system', 'violet-crystal', 'release-transfer', ['cooling-facets'], 'continuous-sculpt', 'extrude'],
  ['release-path', 'Short page-contact release path', 'meso', 'not-now-vault-system', 'aged-brass', 'release-path-pulse', ['vault-contact-rail'], 'fiber-strand', 'tube'],
  ['frame-fasteners', 'Instanced frame fasteners', 'micro', 'contact-frame', 'aged-brass', 'static-detail', ['corner-studs-and-screws'], 'surface-relief', 'instanced-cluster'],
  ['ring-mark-array', 'Instanced radial ring engravings', 'micro', 'maintenance-ring', 'aged-brass', 'static-detail', ['radial-mark-array'], 'surface-relief', 'instanced-cluster'],
  ['ring-rivet-array', 'Instanced maintenance socket rivets', 'micro', 'maintenance-ring', 'aged-brass', 'static-detail', ['ring-rivet-array'], 'surface-relief', 'instanced-cluster'],
  ['flame-cage', 'Guarding brazier cage ribs', 'micro', 'protected-flame', 'aged-brass', 'cage-glow-response', ['six-cage-ribs'], 'assembled-solid', 'instanced-cluster'],
  ['vault-hardware', 'Vault hinge, latch and bezel hardware', 'micro', 'not-now-vault', 'aged-brass', 'static-detail', ['hinge-straps-and-latch'], 'assembled-solid', 'instanced-cluster'],
];

const hexToRgba = (hex) => {
  const v = hex.slice(1);
  return `rgba(${parseInt(v.slice(0, 2), 16)}, ${parseInt(v.slice(2, 4), 16)}, ${parseInt(v.slice(4, 6), 16)}, 1.0)`;
};
const colors = new Map(materialDefs.map((definition) => [definition[0], definition[1]]));
spec.componentTree = defs.map(([id, name, level, parent, material, role, features, topologyClass, primitive]) => {
  const component = structuredClone(baseComponent);
  Object.assign(component, {
    id, name, level, parent, material, role, topologyClass, primitive,
    topologyRationale: topologyClass === 'continuous-sculpt' ? 'Visible faceted/curved mass requires a closed varying profile rather than stacked cards.' : topologyClass === 'fiber-strand' ? 'The release path follows a bounded attached curve.' : topologyClass === 'conforming-shell' ? 'Thin field conforms to the page and frame footprint.' : topologyClass === 'surface-relief' ? 'Repeated marks alter highlights and shallow relief without owning the macro volume.' : 'Discrete hard-surface part with countable closed faces and real thickness.',
    importance: level === 'macro' ? 1 : level === 'meso' ? 0.9 : 0.74,
    confidence: parent ? 0.94 : 1,
    materialLayers: [material],
    evidenceRefs: evidence,
  });
  component.actionProfile.animationRole = role;
  component.actionProfile.pivot = { mode: parent ? 'custom' : 'center', localPosition: [0, 0, 0], axis: [0, 1, 0], confidence: 0.9 };
  component.actionProfile.transformChannels = { translate: role.includes('lift') || role.includes('transfer') || role.includes('strike'), rotate: role.includes('ring') || role.includes('token'), scale: role.includes('pulse') || role.includes('glow') || role.includes('celebration'), bend: false, twist: false, detach: id === 'released-fragment', visibility: true, materialState: role.includes('pulse') || role.includes('state') || role.includes('glow') };
  component.actionProfile.sockets = [{ id: `${id}-socket`, position: [0, 0, 0], rotation: [0, 0, 0], purpose: 'local child attachment and effect target' }];
  component.localFeatures = features.map((feature) => ({ id: feature, placement: `Observed feature on ${name}`, size: 'phone-readable macro/meso form or disciplined micro repetition', orientation: 'aligned to local page-relief frame', materialEffect: 'independent roughness, patina, enamel, crystal or emissive response', geometryEffect: 'real closed geometry whenever silhouette/contact changes; shallow relief otherwise', confidence: 0.95, evidenceRefs: evidence }));
  component.surfaceDetail = { macroRoughness: 0.12, microRoughness: 0.08, bumpAmplitude: 0.035, normalPattern: `${material}-independent-normal`, displacementPattern: 'silhouette-changing detail owned by geometry', occlusionPattern: 'bezels, sockets, seams, cage ribs and page contacts', edgeWearPattern: 'restrained handled crests and cavity patina', notes: 'Macro/meso/micro frequency separation remains legible under grazing light.' };
  component.colorMaterialRecipe = { dominantAlbedo: hexToRgba(colors.get(material)), secondaryAlbedo: hexToRgba('#090A13'), materialClass: material.includes('brass') || material.includes('gold') || material.includes('vault') ? 'metal' : material.includes('crystal') || material.includes('enamel') || material.includes('flame') ? 'glass' : 'plastic', materialClassConfidence: 0.93, colorGradient: { type: 'linear', stops: [{ at: 0, color: hexToRgba(colors.get(material)) }, { at: 1, color: hexToRgba('#090A13') }] }, evidenceRefs: evidence };
  if (parent) component.attachment = { parentId: parent, parentSocket: `${parent}-socket`, localStart: [0, 0, 0], localEnd: [0, 0.08, 0], baseRadius: 0.08, endRadius: 0.06, overlap: 0.04, embedDepth: 0.035, contactType: 'embedded', gapTolerance: 0.01, evidenceRefs: evidence };
  return component;
});

spec.preSpecAssessment = assessment.preSpecAssessment;
spec.preSpecAssessment.detailInventory = inventory.detailInventory;
spec.assumptions = [...new Set([...(spec.assumptions ?? []), ...spec.preSpecAssessment.unknownsToResolveBeforeImplementation])];
spec.preSpecAssessment.unknownsToResolveBeforeImplementation = [];
spec.qualityContract = assessment.qualityContract;
spec.suitability = 'conditional';
spec.scores = { object_isolation: 3, silhouette_readability: 3, depth_inference: 2, primitive_decomposition: 3, material_procedurality: 3, occlusion_risk: 2, interaction_fit: 3 };
spec.referenceCamera = { solved: false, fovDegrees: 39, aspect: 1.777, orientation: { yaw: -4, pitch: -48, roll: 0 }, positionHint: [0, 13, 18], note: 'Wide three-quarter top reference; fixed production book camera is authoritative and orbit views expose hidden thickness.' };
spec.repetitionSystems = [
  { id: 'frame-fastener-layout', parent: 'contact-frame', realization: 'instanced-geometry', buildsGeometry: true, geometry: 'four violet corner studs plus restrained secondary brass screws', instances: 12, acceptance: 'disciplined contact rhythm with no loose ornaments', evidenceRefs: evidence },
  { id: 'ring-engraving-layout', parent: 'maintenance-ring', realization: 'instanced-geometry', buildsGeometry: true, geometry: 'shallow radial marks around the outer maintenance rail', instances: 32, acceptance: 'even circular grammar without dominating the crest', evidenceRefs: evidence },
  { id: 'ring-rivet-layout', parent: 'maintenance-ring', realization: 'instanced-geometry', buildsGeometry: true, geometry: 'socket and rail hemisphere fasteners', instances: 10, acceptance: 'every visible rail/bracket endpoint remains grounded', evidenceRefs: evidence },
  { id: 'flame-cage-layout', parent: 'protected-flame', realization: 'instanced-geometry', buildsGeometry: true, geometry: 'six curved guarding ribs around the compact ember', instances: 6, acceptance: 'flame reads as protected and visible rather than hidden', evidenceRefs: evidence },
];
spec.featureReviewTargets = [
  { id: 'exact-three-candidate-states', name: 'Exactly one primary, one supporting and one released candidate state', tier: 'critical', passIds: ['blockout', 'structural-pass', 'form-refinement', 'interaction-pass'], minimumScore: 0.96, mustPass: true, componentRefs: ['primary-token', 'supporting-token', 'released-fragment'], evidenceRefs: evidence },
  { id: 'forge-path-hierarchy', name: 'Protected flame to milestone anvil to Quest Crest path', tier: 'critical', passIds: ['blockout', 'structural-pass', 'lighting-pass'], minimumScore: 0.9, mustPass: true, componentRefs: ['protected-flame', 'milestone-anvil', 'quest-crest'], evidenceRefs: evidence },
  { id: 'accepted-cost-topology', name: 'Intentional silhouette-changing accepted-cost notch', tier: 'critical', passIds: ['form-refinement', 'surface-pass'], minimumScore: 0.9, mustPass: true, componentRefs: ['quest-crest'], evidenceRefs: evidence },
  { id: 'maintenance-review-read', name: 'Complete ring, supporting socket and review clock remain legible', tier: 'critical', passIds: ['structural-pass', 'form-refinement'], minimumScore: 0.86, mustPass: true, componentRefs: ['maintenance-ring', 'supporting-token', 'review-socket'], evidenceRefs: evidence },
  { id: 'closed-not-now-vault', name: 'Closed respectful Not-Now vault and contacting release path', tier: 'critical', passIds: ['structural-pass', 'material-pass'], minimumScore: 0.9, mustPass: true, componentRefs: ['not-now-vault', 'released-fragment', 'release-path'], evidenceRefs: evidence },
  { id: 'page-contact-materials', name: 'Real relief depth and separated brass, crystal, enamel, charcoal and flame response', tier: 'important', passIds: ['material-pass', 'surface-pass', 'lighting-pass'], minimumScore: 0.8, mustPass: false, componentRefs: ['contact-frame', 'quest-crest', 'supporting-token', 'not-now-vault', 'protected-flame'], evidenceRefs: evidence },
];
spec.viewEvidence = [{ id: 'quest-forge-goal', view: 'wide three-quarter top production goal', imageRegion: { x: 0.1, y: 0.06, width: 0.46, height: 0.84, units: 'normalized' }, observations: ['faceted crest and accepted-cost notch', 'protected flame and milestone anvil', 'complete maintenance ring with review socket', 'exactly three candidate states', 'closed circular vault and released fragment', 'aged brass, indigo, violet, teal and amber hierarchy'], confidence: 0.98 }];
spec.lightingFromPhoto = ['Warm amber practical light rises from the compact protected flame.', 'Soft warm key from upper left explains brass bevels and crest facets.', 'Cool indigo rim from the upper-right separates the book and vault silhouette.', 'Restrained fill preserves the indigo field without flattening cavities.', 'ACES filmic tone mapping and contact shadows protect page attachment.'];
spec.proceduralStrategy = ['Build all identity parts as named, closed, page-contacting solids.', 'Use a custom extruded crest outline with a real missing-cost notch and multiple depth planes.', 'Use tori/curves for the ring and path, instancing for hardware and engravings, and nested bezels for tokens.', 'Keep user text and goal actions in the canonical DOM/state layer.', 'Reduce radial segments, micro hardware and emissive spill on low tier before removing any semantic part.'];
spec.performanceBudget = { qualityPriority: 'supported-iphone-reference-fidelity', targetTriangles: 52000, maxDrawCalls: 72, textureSize: 1024, fpsTarget: 50, optimizationPolicy: 'Instance hardware; reuse geometry/materials; reduce radial segments and micro marks by tier while preserving the crest, flame, anvil, ring, three candidate states, review socket and vault.' };
spec.lookDevTargets = { qualityPriority: 'procedural-reference-guided', materialPass: { albedoPaletteRequired: true, roughnessVariationRequired: true, normalOrBumpRequired: true, localOverridesRequired: true, referencePbrExtraction: { requiredWhenSourceImagePresent: true, minimumConfidence: 0.7 } }, lightingPass: { requiredTerms: ['key light', 'fill light', 'rim light', 'exposure', 'tone mapping', 'background', 'contact shadow'] }, screenshotReview: ['fixed high tier', 'fixed low tier', 'map-stripped fixed', 'orbit left', 'orbit right', 'neutral', 'grazing', 'reference-match'] };
spec.actionReadiness = { contract: 'Every semantic module owns a named Object3D root, pivot, socket, collider intent and material-state channel; all animation remains presentation-only.', defaultRigType: 'action-ready-page-relief', rootMotionNode: 'root', requiredComponentFields: ['id', 'parent', 'actionProfile.animationRole'], transformChannels: ['translate', 'rotate', 'scale', 'visibility', 'material-state'], authoringRules: ['Keep exact candidate count stable.', 'Keep the vault closed.', 'Freeze celebration movement in reduced motion.'], destructionPolicy: { defaultBreakable: false } };
spec.qualityTargets.reviewViewpoints = ['fixed-high', 'fixed-low', 'map-stripped', 'orbit-left', 'orbit-right', 'neutral', 'grazing', 'reference-match'];
for (const pass of spec.buildPasses) pass.componentRefs = defs.map((definition) => definition[0]);
spec.sculptPipeline.currentPass = 'blockout';
spec.sculptPipeline.completedPasses = [];
spec.sculptPipeline.lastCompletedPass = null;
spec.sculptPipeline.blockedReason = null;

fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
