import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';

const server=await createServer({appType:'custom',configFile:false,cacheDir:'.vite-cache/island004-v2-checks',logLevel:'error',server:{middlewareMode:true,hmr:false}});
let passed=0;
const partManifest={model:'island-004-driftwood-v2',scope:'Actual high-quality L3 landmark factory roots only. Terrain/ocean/ambience are not exported by this factory; this is not a complete scene assembly certificate.',parts:[],unnamedMeshes:0,integralMeshes:0};
const pass=name=>{passed++;console.log(`PASS ${name}`);};
try {
  const factory=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island4DriftwoodThreeWorld.ts');
  const pilot=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx');
  const contract=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
  for(const quality of ['low','medium','high']) {
    const palette=pilot.createPilotMaterials(quality,4);
    const before=palette.purpleRoof.color.getHex();
    for(const landmark of contract.ISLAND_5_LANDMARKS) {
      const colored=factory.createIsland4LandmarkPalette(palette,landmark.id);
      assert.equal(colored.purpleRoof.color.getHex(),factory.ISLAND_4_ROOF_COLORS[landmark.id]);
      assert.equal(palette.purpleRoof.color.getHex(),before,'Shared original palette is immutable');
      assert.equal(colored.aquaGlass.transmission,0);
      for(const level of [1,2,3]) {
        const root=pilot.buildLandmark(landmark,level,quality,palette,4);
        if(quality==='high'&&level===3) {
          const alias=landmark.id==='boss'?'citadel':landmark.id;
          const groups=new Map();
          root.traverse(node=>{
            if(!(node instanceof THREE.Mesh))return;
            partManifest.integralMeshes++;
            if(!node.name)partManifest.unnamedMeshes++;
            const actualPart=node.userData.partId||`${landmark.id}-unassigned`;
            const name=actualPart.replace(/^boss-/,`${alias}-`);
            const part=groups.get(name)||{name,kind:'part',module:landmark.id,actualPartId:actualPart,triangles:0,meshNames:[]};
            part.triangles+=(node.geometry.index?.count||node.geometry.getAttribute('position').count)/3;
            part.meshNames.push(node.name);groups.set(name,part);
          });
          partManifest.parts.push({name:alias,kind:'part',module:landmark.id,actualRootName:root.name,triangles:[...groups.values()].reduce((n,p)=>n+p.triangles,0)},...groups.values());
        }
        assert.deepEqual(root.position.toArray(),landmark.position,'Canonical anchor unchanged');
        const bounds=new THREE.Box3().setFromObject(root);assert(!bounds.isEmpty());
        assert(bounds.getSize(new THREE.Vector3()).y>.5);
        root.traverse(node=>{if(node instanceof THREE.Mesh){assert(node.name.length>0||node===root.children[0],'Named authored geometry');const p=node.geometry.getAttribute('position');for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)),'Finite geometry');}});
        assert(root.children.some(n=>n.userData.sculptRuntime?.explodable),'Semantic hierarchy survives compaction');
      }
      const target=pilot.buildLandmark(landmark,3,quality,palette,4,{constructionPreview:'target'});
      let roof=0,interior=0;
      target.traverse(node=>{if(!(node instanceof THREE.Mesh))return;if(node.userData.island4Roof||node.userData.archiveInspectionHide){roof++;assert.equal(node.userData.constructionStage,5,'Roof-last authoring');}if(/BOOK|BENCH|NURSERY|THRONE/.test(node.name)){interior++;assert(node.userData.constructionStage<=4,'Interior before roof');}});
      assert(roof>0,'A roof or canopy is authored');
      if(landmark.id!=='event')assert(interior>0,'Interior geometry exists');
    }
    pass(`${quality}: all five landmarks L1–L3, palette isolation, anchors, finite geometry and roof-last interiors`);
  }
  const staged=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/IslandStagedRestorationThreePresentation.ts');
  const mission=staged.createIslandStagedRestorationThreePresentation({islandNumber:4,stageCount:3,quality:'high'});
  for(let stage=0;stage<=3;stage++) {
    mission.update({islandNumber:4,stageCount:3,activatedStages:stage,constructionSequence:stage},true);
    mission.animate(stage*3,true);
    const spans=mission.root.children.filter(n=>/^ISLAND_4_MISSION_STAGE_/.test(n.name));
    assert.equal(spans.filter(n=>n.visible).length,stage);
    for(const span of spans) {
      if(span.visible)assert.equal(span.scale.x,1,'Reduced motion settles at full scale');
      const b=new THREE.Box3().setFromObject(span);
      assert(b.min.z>4.1,'Causeway stays outside route corridor');
    }
  }
  mission.update({islandNumber:4,stageCount:3,activatedStages:2,constructionSequence:4});mission.animate(20,false);mission.animate(20.1,false);mission.animate(20.2,true);
  assert.equal(mission.root.getObjectByName('ISLAND_4_MISSION_STAGE_2').scale.x,1,'Turning reduced motion on mid-transition settles geometry');
  pass('Three outside-route causeway spans; stage visibility and mid-animation reduced-motion settle');
  for(const [file,key,pattern] of [
    ['islandRunSignatureMissions.test.ts','islandRunSignatureMissionTests',/staged restoration|mission phones|reward-rail phone/],
    ['islandRunMissionTracker.test.ts','islandRunMissionTrackerTests',/.*/],
    ['islandRun3DWorldRouting.test.ts','islandRun3DWorldRoutingTests',/.*/],
  ]) {
    const suite=await server.ssrLoadModule(`/src/features/gamification/level-worlds/services/__tests__/${file}`);
    for(const test of suite[key].filter(t=>pattern.test(t.name))){await test.run();pass(test.name);}
  }
  console.log(`Island 004 V2 focused checks: ${passed} passed.`);
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(partManifest,null,2)+'\n');
} finally {await server.close();}
