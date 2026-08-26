import fs from 'node:fs';

const specPath = new URL('./object-sculpt-spec.json', import.meta.url);
const detailPath = new URL('./detail-inventory.json', import.meta.url);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const detailInventory = JSON.parse(fs.readFileSync(detailPath, 'utf8'));
const template = spec.componentTree[0];
const pbr = spec.materials[0].referencePbr;

const colors = {
  white: ['rgba(246, 239, 236, 1)', 'rgba(184, 183, 188, 1)', '#F6EFEC'],
  navy: ['rgba(10, 35, 68, 1)', 'rgba(25, 62, 96, 1)', '#0A2344'],
  gold: ['rgba(243, 186, 76, 1)', 'rgba(166, 102, 11, 1)', '#F3BA4C'],
  cyan: ['rgba(63, 220, 235, 0.9)', 'rgba(10, 71, 104, 0.95)', '#3FDCEB'],
};

function material(id, name, palette, materialClass, roughness, metalness) {
  const base = structuredClone(spec.materials[0]);
  base.id = id;
  base.name = name;
  base.baseColor = palette[2];
  base.color = base.baseColor;
  base.albedo.dominant = palette[0];
  base.albedo.secondary = [palette[1]];
  base.colorVariation.palette = palette;
  base.colorVariation.pattern = 'reference color-block variation';
  base.roughness.base = roughness;
  base.metalness.base = metalness;
  base.localOverrides = [{
    region: id,
    intent: `Preserve the reference ${name.toLowerCase()} color block and edge response.`,
    evidenceRefs: ['full-object'],
  }];
  base.referencePbr = structuredClone(pbr);
  base.textureResolution = 1024;
  base.materialClass = materialClass;
  base.notes = `Reference-derived ${name.toLowerCase()} for the Cadet toy glider.`;
  return base;
}

spec.materials = [
  material('shell-white', 'Warm white painted toy shell', colors.white, 'plastic', 0.48, 0.02),
  material('academy-navy', 'Academy navy painted shell', colors.navy, 'plastic', 0.54, 0.02),
  material('academy-gold', 'Academy gold trim', colors.gold, 'metal', 0.34, 0.42),
  material('canopy-cyan', 'Cyan translucent canopy', colors.cyan, 'glass', 0.18, 0.08),
];

function component({
  id, name, level, parent = 'root', primitive, materialId, dimensions, position,
  rotation = [0, 0, 0], role = 'body', breakable = true, localFeatures = [],
  topologyClass = 'assembled-solid', rationale,
}) {
  const node = structuredClone(template);
  node.id = id;
  node.name = name;
  node.level = level;
  node.role = role;
  node.importance = level === 'macro' ? 0.9 : 0.68;
  node.confidence = 0.82;
  node.primitive = primitive;
  node.topologyClass = topologyClass;
  node.topologyRationale = rationale;
  node.parent = parent;
  node.attachment = parent ? {
    parentId: parent,
    parentSocket: `${parent}-${id}-socket`,
    localStart: position,
    localEnd: [position[0], position[1], position[2] + 0.12],
    contactType: 'embedded toy assembly seam',
    embedDepth: 0.08,
    overlap: 0.08,
    gapTolerance: 0.015,
    confidence: 0.82,
  } : null;
  node.dimensions = { width: dimensions[0], height: dimensions[1], depth: dimensions[2], units: 'model-units', confidence: 0.82 };
  node.transform = { position, rotation, scale: [1, 1, 1] };
  node.geometryDescriptor.topologyIntent = rationale;
  node.geometryDescriptor.edgeTreatment = { type: 'rounded bevel', bevelRadius: 0.04, segments: 2 };
  node.actionProfile.animationRole = parent ? 'detachable-part' : 'root';
  node.actionProfile.pivot = { mode: parent ? 'attachment-root' : 'center', localPosition: parent ? position : [0, 0, 0], axis: [0, 1, 0], confidence: 0.82 };
  node.actionProfile.transformChannels.detach = breakable;
  node.actionProfile.sockets = parent ? [] : [{ id: 'flight-root', position: [0, 0, 0], forward: [0, 0, 1], up: [0, 1, 0] }];
  node.actionProfile.collider = { type: primitive === 'ellipsoid' || primitive === 'sphere' ? 'sphere' : 'box', offset: [0, 0, 0], scale: dimensions, isTrigger: false, notes: 'Low-cost runtime proxy; never use the render mesh as physics authority.' };
  node.actionProfile.destruction = {
    breakable,
    fractureGroup: id,
    seamRefs: parent ? [`${parent}-${id}-seam`] : [],
    detachableFragments: breakable ? [id] : [],
    breakImpulse: breakable ? 4.5 : 0,
    debrisMaterial: materialId,
  };
  node.material = materialId;
  node.materialLayers = [materialId];
  node.localFeatures = localFeatures;
  node.seams = parent ? [{ id: `${parent}-${id}-seam`, parent, child: id, tolerance: 0.015 }] : [];
  node.evidenceRefs = ['full-object'];
  node.fidelityTier = level === 'macro' ? 'hero' : 'supporting';
  const palette = colors[materialId === 'shell-white' ? 'white' : materialId === 'academy-navy' ? 'navy' : materialId === 'academy-gold' ? 'gold' : 'cyan'];
  node.colorMaterialRecipe = {
    dominantAlbedo: palette[0],
    secondaryAlbedo: palette[1],
    materialClass: materialId === 'canopy-cyan' ? 'glass' : materialId === 'academy-gold' ? 'metal' : 'plastic',
    materialClassConfidence: 0.84,
    colorGradient: { type: 'linear', stops: [{ at: 0, color: palette[0] }, { at: 1, color: palette[1] }] },
    evidenceRefs: ['full-object'],
  };
  return node;
}

spec.componentTree = [
  component({ id: 'root', name: 'Cadet Toy Glider Flight Root', level: 'macro', parent: null, primitive: 'box', materialId: 'shell-white', dimensions: [0.25, 0.25, 0.25], position: [0, 0, 0], role: 'root', breakable: false, rationale: 'Transform-only action root; all visible flight surfaces remain separate detachable assemblies.' }),
  component({ id: 'fuselage-shell', name: 'Rounded Fuselage Shell', level: 'macro', primitive: 'ellipsoid', materialId: 'shell-white', dimensions: [1.15, 0.78, 3.7], position: [0, 0, 0], rationale: 'Rounded bilateral ellipsoid creates the dominant toy-aircraft nose-to-tail silhouette.' }),
  component({ id: 'nose-cap', name: 'Gold Nose Cap', level: 'macro', primitive: 'ellipsoid', materialId: 'academy-gold', dimensions: [0.82, 0.61, 0.72], position: [0, -0.01, 1.94], rationale: 'Short rounded cap overlaps the fuselage tip and carries the academy gold identity color.' }),
  component({ id: 'left-wing', name: 'Left Main Wing', level: 'macro', primitive: 'extrude', materialId: 'shell-white', dimensions: [3.15, 0.16, 1.15], position: [-1.56, 0.02, 0.2], role: 'wing', rationale: 'Tapered swept extrude provides real planform thickness from top, side, and chase views.', localFeatures: [{ id: 'left-leading-trim', kind: 'raised trim', material: 'academy-gold', evidenceRef: 'full-object' }] }),
  component({ id: 'right-wing', name: 'Right Main Wing', level: 'macro', primitive: 'extrude', materialId: 'shell-white', dimensions: [3.15, 0.16, 1.15], position: [1.56, 0.02, 0.2], role: 'wing', rationale: 'Mirrored tapered swept extrude preserves bilateral toy-glider silhouette and independent breakup.', localFeatures: [{ id: 'right-leading-trim', kind: 'raised trim', material: 'academy-gold', evidenceRef: 'full-object' }] }),
  component({ id: 'left-tailplane', name: 'Left Tailplane', level: 'macro', primitive: 'extrude', materialId: 'shell-white', dimensions: [1.15, 0.12, 0.62], position: [-0.61, 0.15, -1.45], role: 'wing', rationale: 'Thin swept tail surface is a separately detachable stabilizer rooted at the rear fuselage.' }),
  component({ id: 'right-tailplane', name: 'Right Tailplane', level: 'macro', primitive: 'extrude', materialId: 'shell-white', dimensions: [1.15, 0.12, 0.62], position: [0.61, 0.15, -1.45], role: 'wing', rationale: 'Mirrored rear stabilizer carries its own pivot for collision-driven asymmetrical failure.' }),
  component({ id: 'tail-fin', name: 'Vertical Tail Fin', level: 'macro', primitive: 'extrude', materialId: 'academy-navy', dimensions: [0.18, 0.95, 0.72], position: [0, 0.48, -1.48], role: 'fin', rationale: 'Vertical tapered extrude provides the recognizable navy fin and independent yaw-break fragment.', localFeatures: [{ id: 'gold-fin-rim', kind: 'edge trim', material: 'academy-gold', evidenceRef: 'full-object' }] }),
  component({ id: 'canopy', name: 'Cyan Bubble Canopy', level: 'meso', primitive: 'ellipsoid', materialId: 'canopy-cyan', dimensions: [0.72, 0.47, 1.18], position: [0, 0.48, 0.62], rationale: 'Compressed transparent ellipsoid sits above the shell as a readable cyan cockpit bubble.', localFeatures: [{ id: 'canopy-highlight', kind: 'clearcoat highlight band', material: 'canopy-cyan', evidenceRef: 'full-object' }] }),
  component({ id: 'launch-hook', name: 'Slingshot Launch Hook', level: 'meso', primitive: 'torus', materialId: 'academy-gold', dimensions: [0.36, 0.34, 0.1], position: [0, -0.42, 2.06], role: 'hook', rationale: 'Gold torus segment projects beneath the nose and creates the visible slingshot attachment loop.', localFeatures: [{ id: 'hook-opening', kind: 'negative-space loop', material: 'academy-gold', evidenceRef: 'full-object' }] }),
  component({ id: 'rear-nozzle', name: 'Rear Toy Nozzle', level: 'meso', primitive: 'cylinder', materialId: 'academy-navy', dimensions: [0.48, 0.48, 0.42], position: [0, 0, -1.96], role: 'nozzle', rationale: 'Short dark cylinder closes the inferred rear fuselage and provides the boost effect socket.' }),
  component({ id: 'left-wing-trim', name: 'Left Gold Wing Trim', level: 'meso', primitive: 'extrude', materialId: 'academy-gold', dimensions: [2.78, 0.035, 0.12], position: [-1.55, 0.11, 0.62], rationale: 'Narrow raised sweep follows the left wing leading edge as a geometry-backed identity stripe.' }),
  component({ id: 'right-wing-trim', name: 'Right Gold Wing Trim', level: 'meso', primitive: 'extrude', materialId: 'academy-gold', dimensions: [2.78, 0.035, 0.12], position: [1.55, 0.11, 0.62], rationale: 'Mirrored raised sweep follows the right wing leading edge and remains attached to its wing fragment.' }),
  component({ id: 'navy-belly-band', name: 'Navy Belly Band', level: 'meso', primitive: 'ellipsoid', materialId: 'academy-navy', dimensions: [1.03, 0.36, 2.7], position: [0, -0.31, -0.08], rationale: 'Lower compressed ellipsoid creates the navy underside color block without flattening the fuselage.', localFeatures: [{ id: 'belly-separation-line', kind: 'shell color boundary', material: 'academy-navy', evidenceRef: 'full-object' }] }),
  component({ id: 'left-panel-line', name: 'Left Wing Panel Line', level: 'meso', primitive: 'extrude', materialId: 'academy-navy', dimensions: [1.25, 0.025, 0.035], position: [-1.3, 0.115, 0.05], rationale: 'Thin recessed-value strip supplies the visible left wing panel break without using a flat decal.' }),
  component({ id: 'right-panel-line', name: 'Right Wing Panel Line', level: 'meso', primitive: 'extrude', materialId: 'academy-navy', dimensions: [1.25, 0.025, 0.035], position: [1.3, 0.115, 0.05], rationale: 'Mirrored panel strip supplies the final meso feature group and preserves top-view readability.' }),
];

spec.suitability = 'pass';
spec.scores = { object_isolation: 3, silhouette_readability: 3, depth_inference: 2, primitive_decomposition: 3, material_procedurality: 3, occlusion_risk: 2, interaction_fit: 3 };
spec.preSpecAssessment.unknownsToResolveBeforeImplementation = [];
spec.preSpecAssessment.detailInventory = detailInventory;
spec.referenceCamera = { solved: true, fovDegrees: 34, aspect: 1.5, orientation: { yaw: -34, pitch: 18, roll: 0 }, positionHint: [5.5, 3.4, 7.5], note: 'Three-quarter product view solved approximately from the isolated generated reference; review additional chase, side, and underside views before claiming exact cross-section fidelity.' };
spec.viewEvidence = [{ id: 'full-object', source: spec.sourceImage, imageRegion: { x: 0.02, y: 0.13, width: 0.96, height: 0.69 }, confidence: 0.86, notes: 'Isolated alpha-backed three-quarter toy glider reference.' }];
spec.visualEvidence = [{ id: 'isolated-reference', type: 'source-image', path: spec.sourceImage, supports: ['silhouette', 'palette', 'component hierarchy'] }];
spec.assumptions = ['The hidden underside and rear cross-sections use symmetric toy-safe inference; no exact engineering claim is made.'];
spec.risks = ['Thin wing trims can z-fight unless offset above the wing surface.', 'Detached trim pieces should follow their host wing rather than double-spawn as debris.'];
spec.lightingFromPhoto = [{ type: 'key light', direction: [-0.7, 1, 0.8], intensity: 2.4, color: '#fff5e8' }, { type: 'fill light', direction: [0.8, 0.2, 0.4], intensity: 1.1, color: '#bfe9ff' }, { type: 'rim light', direction: [0, 0.8, -1], intensity: 1.5, color: '#7cc9ff' }, { type: 'environment reflection', source: 'neutral bright hangar HDR approximation', intensity: 0.8 }, { type: 'contact shadow', softness: 0.7, opacity: 0.32 }, { type: 'exposure', value: 1.08 }, { type: 'tone mapping', value: 'ACESFilmic' }, { type: 'background', value: '#d9f3ff' }];
spec.featureReviewTargets = [
  { id: 'chase-silhouette', name: 'Toy glider chase silhouette', tier: 'critical', passIds: ['blockout', 'form-refinement'], minimumScore: 0.82, mustPass: true, componentRefs: ['fuselage-shell', 'left-wing', 'right-wing', 'tail-fin'], evidenceRefs: ['full-object'] },
  { id: 'breakable-hierarchy', name: 'Named detachable flight surfaces', tier: 'critical', passIds: ['structural-pass', 'action-pass'], minimumScore: 0.9, mustPass: true, componentRefs: ['left-wing', 'right-wing', 'left-tailplane', 'right-tailplane', 'tail-fin', 'canopy'], evidenceRefs: ['full-object'] },
  { id: 'academy-color-system', name: 'White navy cyan gold academy color system', tier: 'critical', passIds: ['material-pass', 'surface-pass'], minimumScore: 0.8, mustPass: true, componentRefs: ['fuselage-shell', 'navy-belly-band', 'canopy', 'left-wing-trim'], evidenceRefs: ['full-object'] },
];
spec.qualityTargets.reviewViewpoints = ['reference-three-quarter', 'rear-chase', 'left-side', 'top', 'underside'];
const macroIds = spec.componentTree.filter((item) => item.level === 'macro').map((item) => item.id);
const structuralIds = spec.componentTree.map((item) => item.id);
for (const pass of spec.buildPasses) {
  pass.componentRefs = pass.id === 'blockout' ? macroIds : structuralIds;
}

fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
