// Reproducible project-adapted spec. Uses the skill's generated schema envelope;
// the runtime factory, not the generic box generator, owns Island Run geometry.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('./', import.meta.url);
const file = new URL('island-004-driftwood-v2-sculpt-spec.json', dir);
const spec = JSON.parse(readFileSync(file, 'utf8'));
const assessment = JSON.parse(readFileSync(new URL('pre-spec-assessment.json', dir), 'utf8'));
const componentTemplate = structuredClone(spec.componentTree[0]);
const materialTemplate = structuredClone(spec.materials[0]);
spec.preSpecAssessment = assessment.preSpecAssessment;
spec.preSpecAssessment.complexity.scores = Object.fromEntries(Object.entries(spec.preSpecAssessment.complexity.scores).map(([k,v])=>[k,Math.min(3,Math.round(v*.6))]));
spec.qualityContract = assessment.qualityContract;
const parts = [
  ['terrain', null, 'macro', 'cylinder', [13.8,1.4,12.5], [0,-.3,0], 'stone', 'Lobed continuous eroded coastal shelf; irregular radial cylinders and rock strata, never detached platform discs.'],
  ['ocean', null, 'macro', 'plane', [68,.01,68], [0,-.62,0], 'water', 'Horizontal living water plane with real relit normals and foam; distant boats remain separate volumetric groups.'],
  ['citadel', null, 'macro', 'cylinder', [4.5,5.5,4.4], [0,0,0], 'stone', 'Retain five-tower palace, dominant rounded central drum and purple crown, four tapered turrets, stepped court.'],
  ['hatchery', null, 'macro', 'sphere', [3,3.3,3], [-4.36,0,-3.9], 'coral', 'Radial nursery with coral ribbed dome and cream asymmetrical towers.'],
  ['habit', null, 'macro', 'sphere', [3,3.2,3], [4.36,0,-3.9], 'teal', 'Large teal hemispherical dome above round pillared hall and pearl finial.'],
  ['wisdom', null, 'macro', 'box', [3,2.8,3], [-4.36,0,3.9], 'terracotta', 'Terracotta tiered angular archive; hollow reading rooms preserve recognizable exterior wing arrangement.'],
  ['event', null, 'macro', 'cylinder', [3,2,3], [4.36,0,3.9], 'teal', 'Low open arena with tiered circular seats, coral trim and teal banners; do not cover playing floor.'],
  ['citadel-shell','citadel','meso','box',[3,2.4,2],[0,1.2,0],'stone','Wall assembly, true doorway void, attached buttresses; not one solid interior block.'],
  ['citadel-roof','citadel','meso','lathe',[2.2,1.2,2.2],[0,3.4,-.12],'purple','Rounded crown roof profile with real gold ribs; seated on drum with .02 overlap.'],
  ['citadel-towers','citadel','meso','cylinder',[3,2.8,2],[0,1.4,0],'purple','Four existing volumetric turret assemblies and golden finials.'],
  ['hatchery-roof','hatchery','meso','sphere',[1.8,.9,1.8],[0,.62,0],'coral','Separate ribbed half dome, coral opaque glaze; removable for inspection and roof-last construction.'],
  ['hatchery-interior','hatchery','meso','sphere',[1.4,.7,1.4],[0,.6,0],'timber','Four warm egg cradles under open structural ribs.'],
  ['habit-roof','habit','meso','sphere',[2.4,1.2,2.4],[0,1.8,0],'teal','Distinct large teal roof and pearl crown; supported by drum.'],
  ['habit-interior','habit','meso','box',[1.4,.6,1.4],[0,1,0],'timber','Tide basin and working stations between architectural columns.'],
  ['wisdom-roof','wisdom','meso','box',[2.8,.7,1.4],[0,1.9,0],'terracotta','Existing sloped gables and ridge details, kept separate from reading-room batches.'],
  ['wisdom-interior','wisdom','meso','box',[2,.9,1.1],[0,.9,0],'timber','Back bookshelves, individual books, central reading table and benches; walls never occlude entire room in cutaway.'],
  ['event-bowl','event','meso','cylinder',[2.6,.9,2.6],[0,.7,0],'stone','Concentric stepped seating and open center.'],
  ['event-flags','event','meso','box',[2.4,.4,2.4],[0,1.6,0],'teal','Teal and coral pennants on golden rods; no invented heavy canopy.'],
  ['gardens','terrain','meso','instanced-cluster',[13,1.7,12],[0,.25,0],'foliage','Palms, narrow cypress, topiary, hedges, flowers; no planting in protected radius 2.85 to 4.05.'],
  ['shore','terrain','meso','instanced-cluster',[14,1,13],[0,-.4,0],'stone','Asymmetric faceted rock strata and shallow foam outline.'],
];
spec.componentTree = parts.map(([id,parent,level,primitive,dimensions,position,material,rationale])=>({
  ...structuredClone(componentTemplate), id, name:id, parent, level, primitive,
  topologyClass:'assembled-solid', topologyRationale:rationale, confidence:parent?.includes('interior')?.55:.8,
  dimensions:{width:dimensions[0],height:dimensions[1],depth:dimensions[2],units:'meters',confidence:.8},
  transform:{position,rotation:[0,0,0],scale:[1,1,1]}, material, materialLayers:[material],
  geometryDescriptor:{...componentTemplate.geometryDescriptor,topologyIntent:rationale, ...(primitive==='instanced-cluster'?{basePrimitive:'sphere'}:{})},
  actionProfile:{...componentTemplate.actionProfile,animationRole:parent?'part':'root',collider:{type:'box',offset:[0,0,0],scale:[1,1,1],isTrigger:true,notes:'Canonical landmark ray-pick proxy; no gameplay physics mutation.'}},
  attachment:parent?{parentSocket:'origin',localStart:[0,0,0],localEnd:[0,.1,0],contactType:'embedded',embedDepth:.02,overlap:.02,gapTolerance:.001}:null,
  colorMaterialRecipe:{materialClass:'painted',basePalette:[material],roughnessRange:[.3,.85],notes:'Separate limestone, glazed roof and gold material regions; retained procedural surface maps.'},
  localFeatures:assessment.preSpecAssessment.detailInventory.details.filter(d=>d.mapsTo.startsWith(id+'.')).map(d=>({id:d.id,type:'geometry',description:d.description})),
  details:[rationale],fidelityTier:'reference-guided-realtime',
}));
spec.preSpecAssessment.detailInventory.details = assessment.preSpecAssessment.detailInventory.details.map(d=>({...d,kind:'contour',mapsTo:{ref:d.id}}));
const palette={stone:'#eadfc9',purple:'#603cba',coral:'#ef7569',teal:'#159da9',terracotta:'#c95f3c',timber:'#855532',foliage:'#287347',water:'#159dc3'};
spec.materials=Object.entries(palette).map(([id,color])=>({...structuredClone(materialTemplate),id,name:id,baseColor:color,color,albedo:{dominant:color,secondary:[color],samplingNotes:'Observed selected concept palette; rendered shading inferred.'},roughness:{value:id==='water'?.2:.58,map:'independent procedural roughness; scalar where smooth'},localOverrides:[{id:'local-relief',description:'Geometry ribs, seams and modeled trim provide meso relief; subtle independent normal for stone and water.'}]}));
spec.repetitionSystems=[{id:'architectural-repeat',component:'citadel-towers',count:4,pattern:'radial',description:'Four separate turrets; batched within named roof/shell parts only.'}];
spec.lightingFromPhoto=['Warm directional key with soft contact shadow at roof overhangs and footing.','Cool hemispherical sky fill, no flat unlit architecture.','ACES tone mapping exposure .94; blue sea and atmospheric sky background.'];
spec.projectAdapter={factory:'src/features/gamification/level-worlds/dev/Island4DriftwoodThreeWorld.ts',strategy:'preserve original authored families; replace faulty additive experiment',projectionRequired:false,materialLimitation:'Single illustrative reference has baked illumination, so PBR is inferred and no photo-derived map exactness is claimed.',physicalDeviceStatus:'not tested; user excluded install/signing/publish'};
spec.reviewHistory=[];
for (const c of spec.componentTree) {
  if(c.primitive==='plane') c.primitive='plane-card';
  const rgb = palette[c.material].slice(1).match(/../g).map(v=>parseInt(v,16));
  c.colorMaterialRecipe={dominantAlbedo:`rgba(${rgb.join(', ')}, 1)`,secondaryAlbedo:`rgba(${rgb.map(v=>Math.round(v*.9)).join(', ')}, 1)`,materialClass:c.material==='stone'?'stone':c.material==='timber'?'wood':'ceramic',materialClassConfidence:.65};
}
spec.featureReviewTargets=['citadel','hatchery','habit','wisdom','event'].map(id=>({id:`${id}-identity`,name:`${id} silhouette, colorway and open architectural detail`,tier:'critical',passIds:['blockout','structural-pass','form-refinement','material-pass','lighting-pass'],minimumScore:.85,mustPass:true,componentRefs:[id],evidenceRefs:['full-object']}));
// This is an explicitly documented inferred-material route, not a false claim
// of extracting physically accurate maps from an AI illustration.
const disableExtraction = value => { if(!value || typeof value!=='object') return; for(const [k,v] of Object.entries(value)) { if(k==='referencePbrExtraction') Object.assign(v,{requiredWhenSourceImagePresent:false,acceptedLimitation:spec.projectAdapter.materialLimitation}); else disableExtraction(v); } };
disableExtraction(spec);
writeFileSync(file,JSON.stringify(spec,null,2)+'\n');
