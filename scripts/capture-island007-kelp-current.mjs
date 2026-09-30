import {createRequire} from 'node:module';
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const out=path.resolve(process.argv[2]);if(existsSync(out))throw Error('Immutable evidence exists');mkdirSync(out,{recursive:true});
const source='src/features/gamification/level-worlds/dev/Island7ReefGardenV2.ts';const hash=()=>createHash('sha256').update(readFileSync(source)).digest('hex');
const report={source,sourceStart:hash(),errors:[],views:[],scope:'Actual reef factory kelp batch, first three rooted blades. Isolated shader motion proof, not whole-island acceptance.'};
const {chromium}=createRequire(import.meta.url)('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const context=await browser.newContext({viewport:{width:720,height:720},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:720,height:720}}});
let video;
try{
 const page=await context.newPage();video=page.video();page.on('response',r=>{if(r.status()>=400)report.errors.push('HTTP '+r.status()+' '+r.url());});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:5197/docs/gauntlets/island-007-v2/review/reef-motion-capture.html');
 report.initial=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');const{createIsland7ReefGardenV2}=await import('/src/features/gamification/level-worlds/dev/Island7ReefGardenV2.ts');
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(720,720);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.appendChild(renderer.domElement);
  const shelf=new THREE.Mesh(new THREE.BoxGeometry(30,.1,30));const model=createIsland7ReefGardenV2(shelf,'high');
  const kelp=model.root.getObjectByName('ISLAND_7_RIBBON_KELP');model.root.children.forEach(n=>n.visible=n===kelp);kelp.count=3;kelp.computeBoundingBox();
  const center=kelp.boundingBox.getCenter(new THREE.Vector3());const camera=new THREE.OrthographicCamera(-.85,.85,.85,-.85,.1,100);camera.position.copy(center).add(new THREE.Vector3(1.5,.75,4));camera.lookAt(center);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x163b46);scene.add(model.root,new THREE.HemisphereLight(0xceeee6,0x1b3440,2));const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.copy(center).add(new THREE.Vector3(3,6,4));scene.add(key);
  window.kelpProof={THREE,renderer,scene,camera,model,kelp,originalMatrices:Array.from(kelp.instanceMatrix.array)};
  return{count:kelp.count,geometryVertices:kelp.geometry.attributes.position.count,triangles:kelp.geometry.index.count/3*kelp.count};
 });
 for(const [name,night,time] of [['day-t0',0,0],['day-t3',0,3],['day-t6',0,6],['night-t0',1,0],['night-t3',1,3],['night-t6',1,6],['freeze-a',0,0],['freeze-b',0,0]]){
  await page.evaluate(({night,time})=>{const p=window.kelpProof;p.model.setNight(night);p.model.animate(time);p.renderer.render(p.scene,p.camera);},{night,time});
  await page.locator('canvas').screenshot({path:path.join(out,name+'.png')});report.views.push({name,night,time});
 }
 report.freezeIdentical=readFileSync(path.join(out,'freeze-a.png')).equals(readFileSync(path.join(out,'freeze-b.png')));
 report.motionChangesPixels=!readFileSync(path.join(out,'day-t0.png')).equals(readFileSync(path.join(out,'day-t3.png')));
 await page.evaluate(()=>{const p=window.kelpProof;p.model.setNight(1);let start=performance.now();window.kelpProofRunning=true;function frame(now){if(!window.kelpProofRunning)return;p.model.animate((now-start)/1000);p.renderer.render(p.scene,p.camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);});
 await page.waitForTimeout(10000);
 report.final=await page.evaluate(()=>{window.kelpProofRunning=false;const p=window.kelpProof;return{instanceTransformsUnchanged:p.originalMatrices.every((v,i)=>v===p.kelp.instanceMatrix.array[i]),drawCalls:p.renderer.info.render.calls,triangles:p.renderer.info.render.triangles};});
 report.sourceEnd=hash();report.sourceStable=report.sourceStart===report.sourceEnd;report.status=report.sourceStable&&report.freezeIdentical&&report.motionChangesPixels&&report.final.instanceTransformsUnchanged&&!report.errors.length?'captured':'review';
}finally{await context.close();if(video)report.video=path.basename(await video.path());await browser.close();writeFileSync(path.join(out,'capture.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
