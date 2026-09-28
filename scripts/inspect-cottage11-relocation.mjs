import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try {const p=await browser.newPage({viewport:{width:1000,height:900}});await p.goto('http://127.0.0.1:5186/island-016-fishing-interaction-lab.html?view=overview');
const result=await p.evaluate(async()=>{
const T=await import('/node_modules/three/build/three.module.js'),m=await import('/src/features/gamification/level-worlds/dev/Island22FishermansVillageThreeWorld.ts'),c=await import('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
const scene=new T.Scene(),mat=m.createIsland22FishermansVillageMaterials();scene.background=new T.Color(0xa6bfc7);
const w=m.createIsland22FishermansVillageLivingAmbience(scene,c.ISLAND_3D_QUALITY_PROFILES.medium,mat,new T.Mesh(new T.CircleGeometry(42),mat.ocean)); if(!w.root.parent)scene.add(w.root);
const landmarks=[];for(const id of ['wisdom','boss','event','hatchery','habit']){const d=c.ISLAND_5_LANDMARKS.find(d=>d.id===id);const o=m.buildIsland22FishermansVillageLandmark(d,3,'medium',mat);w.root.add(o);landmarks.push(o);}
const house=w.root.getObjectByName('ISLAND_22_AUTHORED_HARBOR_CLUSTER_11');const results=[];
for(const [x,z] of [[-7.05,3.35],[-9.6,3.7],[-10,3.7],[-9.6,4.2]]){
house.position.set(x,.65,z);scene.updateMatrixWorld(true);
const hb=new T.Box3().setFromObject(house);const neighbors=[...landmarks,...w.root.children.filter(o=>o!==house&&/COTTAGE|CLUSTER/.test(o.name))];
const boxes=neighbors.map(o=>{const b=new T.Box3().setFromObject(o);return{name:o.name,min:b.min.toArray(),max:b.max.toArray(),intersects:hb.intersectsBox(b)};});
const direction=new T.Vector3(0,0,1).transformDirection(house.matrixWorld);const doors=[];
for(const dx of [-1.43,-1.265,-1.10,.13,.32,.50])for(const y of [.3,.6,.9]){const origin=house.localToWorld(new T.Vector3(dx,y,.715));const hits=new T.Raycaster(origin,direction,0,1.2).intersectObjects(neighbors,true);doors.push({dx,y,nearest:hits[0]?{distance:hits[0].distance,name:hits[0].object.name}:null});}
const terrain=[];w.root.traverse(o=>{if(o.isMesh&&/TERRAIN|TERRACE|STRATA|ROCK|TURF/.test(o.name)&&!o.name.includes('CLUSTER'))terrain.push(o)});
const support=[];for(const dx of [-1.7,-.4,.9])for(const dz of [-.78,.1,.98]){const point=house.localToWorld(new T.Vector3(dx,.075,dz));const hits=new T.Raycaster(point.clone().add(new T.Vector3(0,4,0)),new T.Vector3(0,-1,0),0,9).intersectObjects(terrain,true);support.push({local:[dx,dz],cap:point.toArray(),hit:hits[0]?{point:hits[0].point.toArray(),name:hits[0].object.name}:null});}
results.push({position:[x,.65,z],bounds:{min:hb.min.toArray(),max:hb.max.toArray()},intersections:boxes.filter(o=>o.intersects),doorHits:doors.filter(o=>o.nearest),support,frontDirection:direction.toArray()});
}
house.position.set(-10,.65,3.7);scene.updateMatrixWorld(true);
scene.add(new T.HemisphereLight(0xffffff,0x778899,2.4));const light=new T.DirectionalLight(0xffffff,2.2);light.position.set(-4,12,7);scene.add(light);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1000,900);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
document.body.replaceChildren(renderer.domElement);document.body.style.margin='0';
const camera=new T.PerspectiveCamera(40,1000/900,.1,100);camera.position.set(-18,10,11);camera.lookAt(-7,1.4,4);renderer.render(scene,camera);window.reviewRender={scene,camera,renderer};return results;});
writeFileSync(process.argv[2]+'.json',JSON.stringify(result,null,2));await p.screenshot({path:process.argv[2]+'.png'});console.log(JSON.stringify(result.map(r=>({position:r.position,intersections:r.intersections.map(x=>x.name),doorHits:r.doorHits,frontDirection:r.frontDirection}))));
} finally {await browser.close();}
