import fs from 'node:fs';

const specPath = new URL('./island-007-sculpt-spec.json', import.meta.url);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const baseComponent = structuredClone(spec.componentTree[0]);
const baseMaterial = structuredClone(spec.materials[0]);
const evidence = ['reference-underwater-world'];
const rgba = (hex) => {
  const value = hex.replace('#', '');
  return `rgba(${parseInt(value.slice(0,2),16)}, ${parseInt(value.slice(2,4),16)}, ${parseInt(value.slice(4,6),16)}, 1.0)`;
};

const materialDefs = [
  ['ocean-stone', '#385D69', 0.84, 0.03, 0, '#000000', 'layered ocean-rock strata'],
  ['pearl-shell', '#E7F4E9', 0.18, 0.02, 0.9, '#185B70', 'iridescent shell ridges'],
  ['antique-gold', '#D8A84F', 0.28, 0.86, 0.38, '#4A2404', 'brushed brass with cavity patina'],
  ['turquoise-enamel', '#1AB7B5', 0.28, 0.12, 0.72, '#075E78', 'sealed enamel panels'],
  ['warm-window', '#FFD27A', 0.14, 0, 0.4, '#FF6A16', 'warm glass core'],
  ['coral', '#E76891', 0.58, 0, 0.18, '#461026', 'porous coral branches'],
  ['kelp', '#257A63', 0.68, 0, 0.1, '#062D2B', 'satin kelp blade veins'],
  ['crystal-energy', '#5ADDF0', 0.08, 0.04, 1, '#176DFF', 'translucent faceted crystal'],
  ['violet-energy', '#9A63FF', 0.06, 0.02, 1, '#4A13D0', 'additive portal energy'],
  ['sand-mosaic', '#D9C79D', 0.88, 0, 0.05, '#000000', 'fine sand and ancient mosaic grain'],
];

spec.materials = materialDefs.map(([id, color, roughness, metalness, clearcoat, emissive, pattern]) => ({
  ...structuredClone(baseMaterial), id, name: id.replaceAll('-', ' '), type: clearcoat > 0.5 ? 'physical' : 'standard',
  shaderModel: clearcoat > 0.5 ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial', baseColor: color, color,
  albedo: { dominant: color, secondary: ['#123744', '#E9D7A4'], samplingNotes: 'Reference-guided palette; highlights are lighting, never albedo.' },
  colorVariation: { palette: [color, '#123744', '#E9D7A4'], pattern: `${pattern} with deterministic variation`, amplitude: 0.12, heightCorrelation: 0.28 },
  textureResolution: 512, textureProjection: { mode: 'object-space', repeat: [4, 5], anisotropy: 4, texelDensityIntent: 'Stable phone detail without oversized runtime maps.' },
  surfaceFrequencyBands: [
    { id: 'macro', frequency: 1.6, amplitude: 0.18, role: 'broad tonal variation' },
    { id: 'meso', frequency: 17, amplitude: 0.1, role: pattern },
    { id: 'micro', frequency: 78, amplitude: 0.028, role: 'grazing-highlight breakup' },
  ],
  roughness: { base: roughness, variation: 0.12, map: 'independent-procedural-roughness', localResponse: 'smoother crests, darker rougher cavities' },
  metalness: { base: metalness, variation: metalness > 0.2 ? 0.08 : 0 },
  normal: { pattern, strength: id === 'ocean-stone' ? 0.16 : 0.07, scale: 52, space: 'tangent' },
  bump: { pattern: `${pattern} independent height`, amplitude: id === 'ocean-stone' ? 0.1 : 0.045, scale: 48 },
  displacement: { pattern: 'none', amplitude: 0, scale: 1, silhouetteAffects: false },
  ambientOcclusion: { cavityStrength: 0.34, contactShadowBias: 0.38, notes: 'Concentrated at shell ribs, reef cavities, stairs and architectural contacts.' },
  wear: { edgeWear: id === 'antique-gold' ? 0.18 : 0.06, scratches: [], chips: [] },
  dirt: { amount: id === 'ocean-stone' ? 0.12 : 0.05, cavityBias: 0.62, color: '#092C31' },
  clearcoat, clearcoatRoughness: clearcoat > 0.5 ? 0.12 : 0.32, emissive, emissiveIntensity: emissive === '#000000' ? 0 : id.includes('window') ? 2.8 : 0.58,
  localOverrides: [{ id: `${id}-local-response`, region: 'exposed crests, recessed seams and contact zones', roughness: Math.min(1, roughness + 0.08), strength: 0.32, evidenceRefs: evidence }],
  notes: `${pattern}; independent albedo, roughness, height and AO channels.`,
}));
spec.materials.forEach((material) => { delete material.referencePbr; });

const defs = [
  ['root','Abyssal Pearl Kingdom root','macro',null,'ocean-stone','scene-root',['world-root']],
  ['terrain-network','Layered seabed and reef-root network','macro','root','ocean-stone','static-terrain',['layered-seabed','reef-shelves','rock-root']],
  ['landmark-network','Five distinct three-level landmarks','macro','root','pearl-shell','build-state-owner',['five-silhouettes']],
  ['route-integration','Canonical 36-tile protected route','macro','root','turquoise-enamel','gameplay-visual',['route-clearance']],
  ['ambience-system','Living underwater volume','macro','root','crystal-energy','ambient-motion-owner',['caustic-light','surface-rays','depth-haze']],
  ['central-seabed','Central sculpted seabed plate','meso','terrain-network','sand-mosaic','static',['mosaic-terraces','ancient-ruins']],
  ['outer-reef-shelves','Asymmetric outer reef terraces','meso','terrain-network','ocean-stone','static',['coral-cavities','shell-clusters']],
  ['hatchery-grotto','Nautilus hatchery grotto','meso','landmark-network','pearl-shell','build-level-pivot',['nautilus-shell','egg-nest','amber-interior']],
  ['habit-sanctuary','Living reef habit sanctuary','meso','landmark-network','turquoise-enamel','build-level-pivot',['kelp-ribbons','bubble-wheels','open-pavilion']],
  ['wisdom-archive','Ribbed shell-glass wisdom archive','meso','landmark-network','pearl-shell','build-level-pivot',['book-rings','brass-instruments','glass-dome']],
  ['compass-portal','Crystal compass journey portal','meso','landmark-network','violet-energy','build-level-pivot',['portal-arch','compass-rose','navigation-dials']],
  ['pearl-palace','Central pearl throne temple','meso','landmark-network','pearl-shell','build-level-pivot',['giant-pearl','five-spires','shell-roofs','arched-entries']],
  ['reef-botany','Coral kelp anemone system','meso','terrain-network','coral','ambient-sway',['branch-coral','sea-fans','kelp-blades','anemone-bulbs']],
  ['fish-schools','Three-depth articulated fish schools','meso','ambience-system','pearl-shell','school-orbits',['fish-body','tail-pivots','school-layering','fish-school-layering']],
  ['jellyfish-field','Pulsing jellyfish field','meso','ambience-system','crystal-energy','pulse-and-drift',['jelly-bells','tentacle-curves','jelly-tentacles']],
  ['manta-glide','Distant manta glide','meso','ambience-system','ocean-stone','glide',['manta-wings','manta-tail']],
  ['submarine-route','Fantasy brass submarine route','meso','ambience-system','antique-gold','orbit',['submarine-hull','view-dome','propeller','searchlight']],
  ['bubble-fields','Layered bubble stream emitters','micro','ambience-system','crystal-energy','rise-reset',['bubble-streams']],
  ['caustic-projection','Animated seabed caustic field','micro','ambience-system','crystal-energy','texture-drift',['caustic-cells']],
  ['surface-light-shafts','Translucent surface ray volumes','micro','ambience-system','crystal-energy','ray-drift',['light-shafts']],
  ['pearl-trim-array','Pearl and gold architecture trim','micro','landmark-network','antique-gold','static',['pearl-nodes','gold-ribs','shell-finials']],
  ['window-array','Warm inhabited window system','micro','landmark-network','warm-window','material-pulse',['arched-windows','warm-windows']],
  ['coral-cluster-array','Distributed reef color clusters','micro','reef-botany','coral','sway',['coral-variation']],
  ['ruin-fragment-array','Ancient route-clear ruin fragments','micro','terrain-network','ocean-stone','static',['broken-columns','mosaic-fragments']],
  ['portal-energy-core','Layered violet portal core','micro','compass-portal','violet-energy','material-pulse',['energy-rings','portal-surface']],
  ['palace-pearl-core','Breathing central pearl core','micro','pearl-palace','pearl-shell','material-pulse',['pearl-iridescence','submarine-searchlight']],
];

const materialClass = (id) => id.includes('gold') ? 'metal' : id.includes('energy') || id.includes('shell') ? 'glass' : id.includes('kelp') ? 'fabric' : 'stone';
const colors = new Map(materialDefs.map((d) => [d[0], d[1]]));
spec.componentTree = defs.map(([id,name,level,parent,material,role,features]) => {
  const c = structuredClone(baseComponent);
  Object.assign(c,{id,name,level,parent,material,role,importance:level==='macro'?1:level==='meso'?0.9:0.72,confidence:parent?0.9:1,primitive: id.includes('fish')?'ellipsoid':id.includes('shaft')?'cone':id.includes('portal')?'torus':id.includes('terrain')?'extrude':id.includes('array')?'instanced-cluster':'box',materialLayers:[material],evidenceRefs:evidence});
  c.actionProfile.animationRole=role;
  c.actionProfile.transformChannels={translate:role.includes('orbit')||role.includes('glide')||role.includes('rise'),rotate:role.includes('orbit')||role.includes('sway')||role.includes('school'),scale:role.includes('pulse'),bend:role.includes('sway')||role.includes('fish'),twist:false,detach:false,visibility:true,materialState:role.includes('material')||role.includes('texture')};
  c.localFeatures=features.map((feature)=>({id:feature,placement:`Observable system on ${name}`,size:'phone-readable or repeated environmental detail',orientation:'aligned to local architecture, terrain, or travel curve',materialEffect:'independent PBR and emissive response',geometryEffect:'real geometry when silhouette-readable',confidence:0.9,evidenceRefs:evidence}));
  c.surfaceDetail={macroRoughness:0.14,microRoughness:0.12,bumpAmplitude:0.05,normalPattern:`${material}-independent-normal`,displacementPattern:'macro form owned by geometry',occlusionPattern:'contacts, ribs, cavities and reef recesses',edgeWearPattern:'restrained crest response',notes:'Phone-stable macro/meso/micro detail.'};
  c.colorMaterialRecipe={dominantAlbedo:rgba(colors.get(material)),secondaryAlbedo:rgba('#123744'),materialClass:materialClass(material),materialClassConfidence:0.88,colorGradient:{type:'linear',stops:[{at:0,color:rgba(colors.get(material))},{at:1,color:rgba('#E9D7A4')}]},evidenceRefs:evidence};
  if(parent)c.attachment={parentId:parent,parentSocket:`${parent}-socket`,localStart:[0,0,0],localEnd:[0,0.1,0],baseRadius:0.1,endRadius:0.08,overlap:0.04,embedDepth:0.03,contactType:'embedded',gapTolerance:0.01,evidenceRefs:evidence};
  return c;
});

spec.suitability='conditional';
spec.scores={object_isolation:1,silhouette_readability:3,depth_inference:2,primitive_decomposition:3,material_procedurality:3,occlusion_risk:2,interaction_fit:3};
spec.referenceCamera={solved:false,fovDegrees:42,aspect:0.5625,orientation:{yaw:0,pitch:-48,roll:0},positionHint:[0,13,22],note:'Portrait final-angle concept; runtime camera kit is authoritative and hidden sides use orbit review.'};
spec.preSpecAssessment.objectClass={primaryType:'interactive underwater architectural environment',primaryDomain:'object',formLanguage:['architectural','organic','geological','sculptural'],structureKind:['compound object','branching hierarchy','repeated modules','layered shell'],motionPotential:['articulated','whole-object transform','effect-emitter','ambient particle systems'],materialFamilies:['stone','pearl','shell','metal','glass-like crystal','coral','kelp'],notes:'Admitted for stylized scene reconstruction, not exact mesh extraction.'};
spec.preSpecAssessment.complexity.scores={silhouetteComplexity:3,componentCount:3,hierarchyDepth:3,repetitionDensity:3,materialLayerCount:3,localDetailDensity:3,occlusionRisk:2,actionReadinessNeed:3};
spec.preSpecAssessment.complexity.estimatedCounts={macroComponents:5,mesoComponents:12,microFeatureGroups:9,materialLayers:10,repetitionSystems:10};
spec.preSpecAssessment.complexity.reasoning=['Five landmarks, layered terrain, dense reef systems, transparent effects, articulated fauna and mobile LODs require an ultra-complex hierarchy.'];
spec.preSpecAssessment.unknownsToResolveBeforeImplementation=[];
const details=[
  'layered-seabed','reef-shelves','rock-root','route-clearance','nautilus-shell','egg-nest','kelp-ribbons','bubble-wheels','book-rings','brass-instruments','portal-arch','compass-rose','giant-pearl','five-spires','shell-roofs','coral-cavities','branch-coral','sea-fans','kelp-blades','anemone-bulbs','fish-school-layering','jelly-tentacles','surface-rays','caustic-cells','submarine-searchlight','warm-windows','pearl-nodes','gold-ribs','ancient-ruins','bubble-streams'];
const validKinds=['contour','ridge','linework','seam','emissive','gloss','groove','bevel'];
spec.preSpecAssessment.detailInventory={scanMethod:'grid-3x3 plus semantic systems',targetMinDetails:24,details:details.map((id,index)=>({id:`d${String(index+1).padStart(2,'0')}`,kind:validKinds[index%validKinds.length],description:id.replaceAll('-',' '),mapsTo:{type:'component.localFeatures',ref:id},evidenceRefs:evidence,confidence:0.9,realization:'procedural geometry, material locality, or animated runtime system'}))};
spec.qualityContract.definitionOfDone=['A phone-readable underwater civilization with five distinct landmarks, canonical route clearance, multi-depth living fauna, caustic light, rich reef detail and adaptive mobile performance matches the approved concept hierarchy.'];
spec.qualityContract.minimumSpecDepth={macroComponents:5,mesoComponents:12,microFeatureGroups:9,materialLayers:8,repetitionSystems:8,reviewViewpoints:5};
spec.qualityContract.visualDeltaChecks=['portrait silhouette','five landmark identity','route readability','reef density','warm/cool material separation','caustic and surface-ray underwater read','multi-depth fauna movement','hidden-side completeness'];
spec.repetitionSystems=[
  ['reef-clusters',18,'asymmetric outer and inner reef shelves'],['coral-botany',32,'species and hue-varied clusters outside route'],['fish-schools',3,'near, middle and far looping paths'],['school-fish',48,'quality-scaled articulated fish'],['bubble-streams',14,'varying rise speeds and reset heights'],['pearl-trim',36,'architecture-specific pearl nodes'],['warm-windows',28,'landmark facade arcs'],['ruin-fragments',16,'route-clear ancient seabed fragments'],['light-shafts',9,'soft diagonal surface rays'],['jellyfish',10,'depth-varied pulse and drift'],
].map(([id,instances,pattern])=>({id,geometry:'named deterministic procedural system',instances,pattern,buildsGeometry:true,realization:'quality-tier-scaled instancing or named animated groups',evidenceRefs:evidence}));
spec.featureReviewTargets=[
  ['underwater-world-silhouette','Layered seabed, board and five-landmark portrait silhouette',['terrain-network','landmark-network'],0.9],
  ['five-landmark-identities','Nautilus, reef pavilion, shell archive, crystal portal and pearl palace remain distinct',['hatchery-grotto','habit-sanctuary','wisdom-archive','compass-portal','pearl-palace'],0.9],
  ['canonical-route-clarity','All 36 tile tops are unobstructed',['route-integration'],0.95],
  ['living-underwater-light','Caustics, rays, fog, bubbles and fauna establish depth',['ambience-system','caustic-projection','surface-light-shafts','fish-schools'],0.88],
  ['material-separation','Stone, shell, pearl, gold, enamel, coral and energy remain legible',['terrain-network','landmark-network','reef-botany'],0.86],
].map(([id,name,componentRefs,score])=>({id,name,tier:'critical',passIds:['blockout','structural-pass','form-refinement','material-pass','lighting-pass','interaction-pass'],minimumScore:score,mustPass:true,componentRefs,evidenceRefs:evidence}));
spec.viewEvidence=[{id:'reference-underwater-world',view:'portrait final-angle three-quarter overview',imageRegion:{x:0,y:0,width:1,height:1,units:'normalized'},observations:['cyan-indigo water','five distinct landmarks','clean radial route','giant pearl palace','dense reef terraces','surface rays and marine life'],confidence:0.94}];
spec.lightingFromPhoto=['Broad cyan surface key from upper front-left.','Deep indigo water-volume fill preserves underside form.','Turquoise rim separates shell roofs and coral silhouettes.','Warm amber architectural cores contrast the ocean.','ACES filmic tone mapping and restrained exposure preserve pearl and caustic highlights.','Soft contact shadow and ambient occlusion ground every stair, reef shelf and building foundation.'];
spec.proceduralStrategy=['Preserve shared tile geometry and gameplay transforms outside the world module.','Use named procedural groups for five landmarks and all moving ambience.','Use independent generated albedo/relief fields, physical shell/crystal materials, instancing/merged static reef batches and quality-scaled particle counts.','Freeze decorative motion under reduced motion without removing semantic scene content.'];
spec.performanceBudget={qualityPriority:'phone-reference-fidelity',targetTriangles:180000,maxDrawCalls:175,textureSize:512,fpsTarget:50,optimizationPolicy:'Batch static terrain/reef by material; reduce fish, bubbles, coral, light rays and radial segments across quality tiers before removing silhouette systems.'};
spec.lookDevTargets={qualityPriority:'procedural-reference-guided',materialPass:{albedoPaletteRequired:true,roughnessVariationRequired:true,normalOrBumpRequired:true,localOverridesRequired:true,referencePbrExtraction:{requiredWhenSourceImagePresent:false,acceptedLimitation:'Illustrated whole environment contains baked light and cannot yield physically trustworthy isolated maps.'}},lightingPass:{requiredTerms:['key light','fill light','rim light','exposure','tone mapping','background','contact shadow']},screenshotReview:['phone overview','four orbit views','five landmark focuses','high versus low quality']};
spec.actionReadiness={contract:'Every landmark and ambience system owns a named Object3D root; visual animation has no gameplay authority.',defaultRigType:'action-ready-static-world',rootMotionNode:'root',requiredComponentFields:['id','parent','actionProfile.animationRole'],transformChannels:['translate','rotate','scale','visibility','material-state'],authoringRules:['Keep gameplay tiles outside the visual module.','Keep landmarks in separate clickable roots.','Disable decorative movement for reduced motion.'],destructionPolicy:{defaultBreakable:false}};
for(const pass of spec.buildPasses){pass.componentRefs=defs.map(d=>d[0]);}
spec.sculptPipeline.currentPass='blockout'; spec.sculptPipeline.completedPasses=[]; spec.sculptPipeline.lastCompletedPass=null; spec.sculptPipeline.blockedReason=null;
fs.writeFileSync(specPath,`${JSON.stringify(spec,null,2)}\n`);
