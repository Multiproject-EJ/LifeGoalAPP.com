import {drawJackpotButton} from './jackpot-effects.js';
import * as THREE from 'three';
import {createMultiplierHologram,PILL} from './multiplier-hologram.js';
import {controllerFraming} from './framing.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createPaintMaterial,drawEmblem} from './paint-finish.js';
import {finishes as themes} from './theme-finishes.js';
import {createChassisDetails} from './chassis-details.js';
import {outlineCentroid} from './button-layout.js';
import {diceCue} from './controller-cues.js';
const LOWER_PATH='M18 2C43-2 68 1 80 14C91 29 94 57 97 84C101 116 99 146 88 163C82 173 74 173 66 165C55 152 48 130 39 108C31 87 23 66 15 49C8 35 1 22 3 13C5 7 10 4 18 2Z';
const modelUrl=new URL('./controller-shell.glb',import.meta.url).href;
// Rendering only. No gameplay actions, timers, randomness, storage or demo imports.
export function mountLivingController(host,controls,getSnapshot,onReady,onError){
 let disposed=false,renderer,scene,environmentTarget,observer,frame=0;
 const cleanup=()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();const geometries=new Set(),materials=new Set(),textures=new Set();scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environmentTarget?.dispose();renderer?.dispose();renderer?.domElement.remove();};
 async function setup(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;host.append(renderer.domElement);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!disposed){cleanup();onError();}});
 scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(32,1,.1,100);
 scene.add(new THREE.HemisphereLight(0xb8d9f5,0x12263a,.7));
// Interaction study is front-facing; unrestricted rear inspection remains in shell-review.
for(const [pos,intensity,color] of [[[-4,5,6],2.8,0xffffff],[[4,0,3],1,0xa1dbff],[[0,-3,-3],2,0x5eabef]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...pos);scene.add(l);}

 const env=new THREE.PMREMGenerator(renderer);environmentTarget=env.fromScene(new RoomEnvironment(),.04);scene.environment=environmentTarget.texture;env.dispose();
 const gltf=await new GLTFLoader().loadAsync(modelUrl);const shell=gltf.scene;
 if(disposed){shell.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose();});return;}
 scene.add(shell);shell.scale.z=1.25;shell.updateMatrixWorld(true);
 // Analytic surface of the Blender B2 loft, used to seat controls on the curved face.
const curves=[[[150,12],[215,10],[385,10],[450,12]],[[450,12],[486,6],[534,9],[556,37]],[[556,37],[577,67],[586,127],[594,189]],[[594,189],[600,240],[605,294],[582,320]],[[582,320],[568,338],[545,333],[530,315]],[[530,315],[507,287],[487,242],[460,220]],[[460,220],[442,200],[424,200],[398,200]],[[398,200],[340,199],[260,199],[202,200]],[[202,200],[176,200],[158,200],[140,220]],[[140,220],[113,242],[93,287],[70,315]],[[70,315],[55,333],[32,338],[18,320]],[[18,320],[-5,294],[0,240],[6,189]],[[6,189],[14,127],[23,67],[44,37]],[[44,37],[66,9],[114,6],[150,12]]];
const outline=[];for(const [a,b,c,d] of curves)for(let i=0;i<48;i++){const t=i/48,s=1-t;outline.push([(s**3*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t**3*d[0]-300)/100,(175-(s**3*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t**3*d[1]))/100]);}
const half=Math.max(...outline.map(p=>p[0]))-.0005;
// Sample the actual exported/subdivided shell, avoiding analytic approximation gaps.
const surfaceBins=new Map(),cell=.08;
shell.traverse(o=>{if(!o.isMesh)return;const pos=o.geometry.attributes.position,idx=o.geometry.index,points=[];for(let i=0;i<pos.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld));for(let i=0;i<(idx?idx.count:pos.count);i+=3){const tri=[0,1,2].map(k=>points[idx?idx.getX(i+k):i+k]);const [a,b,c]=tri,den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-10)continue;const entry={tri,den};for(let gx=Math.floor(Math.min(a.x,b.x,c.x)/cell);gx<=Math.floor(Math.max(a.x,b.x,c.x)/cell);gx++)for(let gy=Math.floor(Math.min(a.y,b.y,c.y)/cell);gy<=Math.floor(Math.max(a.y,b.y,c.y)/cell);gy++){const key=gx+','+gy;if(!surfaceBins.has(key))surfaceBins.set(key,[]);surfaceBins.get(key).push(entry);}}});
function surface(x,y){let z=-Infinity;for(const {tri:[a,b,c],den} of surfaceBins.get(Math.floor(x/cell)+','+Math.floor(y/cell))||[]){const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den;if(u>=-.0001&&v>=-.0001&&u+v<=1.0001)z=Math.max(z,u*a.z+v*b.z+(1-u-v)*c.z);}return Number.isFinite(z)?z:0;}
function curvedFace(shape,offset){const source=new THREE.ShapeGeometry(shape).toNonIndexed(),p=source.attributes.position,out=[];function split(a,b,c,depth=0){const lengths=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)],longest=Math.max(...lengths);if(longest<.012||depth>13){for(const v of [a,b,c])out.push(v.x,v.y,surface(v.x,v.y)+offset);return;}const edge=lengths.indexOf(longest);if(edge===0){const m=a.clone().add(b).multiplyScalar(.5);split(a,m,c,depth+1);split(m,b,c,depth+1);}else if(edge===1){const m=b.clone().add(c).multiplyScalar(.5);split(a,b,m,depth+1);split(a,m,c,depth+1);}else{const m=c.clone().add(a).multiplyScalar(.5);split(a,b,m,depth+1);split(m,b,c,depth+1);}}for(let i=0;i<p.count;i+=3)split(...[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,i+k)));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));g.computeVertexNormals();source.dispose();return g;}
function svgShape(d,transform=p=>new THREE.Vector2((p.x-300)/100,(175-p.y)/100)){const path=new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths[0];return new THREE.Shape(SVGLoader.createShapes(path)[0].getPoints(40).map(transform));}
function conform(g,offset){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+surface(p.getX(i),p.getY(i))+offset);g.computeVertexNormals();}

 let snapshot=getSnapshot(),state,theme=snapshot.theme,reduced=snapshot.reduced,now=0,level=0,power=1,buildAffordable=false,buildCueStarted=-10;
 const buttons=[],lights=[],buttonOutlines=new Map(),group=new THREE.Group();scene.add(group);
const chassis=createChassisDetails(THREE,{surface,curvedFace,mergeVertices});group.add(chassis.root);
const powerPill=createMultiplierHologram(THREE);group.add(powerPill.root);
 function cap(id,shape,x,y,w,h){buttonOutlines.set(id,shape.getPoints(48));if(id!=='roll'){w=.68;h=.68;}const root=new THREE.Group();root.name=id;group.add(root);const mat=new THREE.MeshPhysicalMaterial({color:0x173f58,roughness:.4,metalness:.15,clearcoat:.15,envMapIntensity:.12});const raw=curvedFace(shape,.06);raw.deleteAttribute('normal');const smooth=mergeVertices(raw);smooth.computeVertexNormals();raw.dispose();const base=new THREE.Mesh(smooth,mat);root.add(base);
 const canvas=document.createElement('canvas');canvas.width=id==='roll'?1024:512;canvas.height=512;const ctx=canvas.getContext('2d');const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 // Dense rectangular label carrier conforms to shell while outline stays the source shape.
 let labelGeo;if(id==='roll'){labelGeo=curvedFace(shape,.085);labelGeo.computeBoundingBox();const box=labelGeo.boundingBox,p=labelGeo.attributes.position,uv=[];for(let i=0;i<p.count;i++)uv.push((p.getX(i)-box.min.x)/(box.max.x-box.min.x),(p.getY(i)-box.min.y)/(box.max.y-box.min.y));labelGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));}else{labelGeo=new THREE.PlaneGeometry(w,h,40,40);labelGeo.translate(x,y,0);conform(labelGeo,.085);}const label=new THREE.Mesh(labelGeo,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false}));root.add(label);
 const fireworksCanvas=document.createElement('canvas');fireworksCanvas.width=fireworksCanvas.height=512;
 const fireworksTexture=new THREE.CanvasTexture(fireworksCanvas);fireworksTexture.colorSpace=THREE.SRGBColorSpace;
 const fireworksGeometry=curvedFace(shape,.078);fireworksGeometry.computeBoundingBox();const bounds=fireworksGeometry.boundingBox,positions=fireworksGeometry.attributes.position,fireUV=[];
 for(let i=0;i<positions.count;i++)fireUV.push((positions.getX(i)-bounds.min.x)/(bounds.max.x-bounds.min.x),(positions.getY(i)-bounds.min.y)/(bounds.max.y-bounds.min.y));
 fireworksGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(fireUV,2));
 const fireworksFace=new THREE.Mesh(fireworksGeometry,new THREE.MeshBasicMaterial({map:fireworksTexture,transparent:true,depthWrite:false,toneMapped:false}));fireworksFace.visible=false;root.add(fireworksFace);
 root.userData.fireworks={canvas:fireworksCanvas,texture:fireworksTexture,face:fireworksFace};
 const edge=shape.getPoints(120).map(p=>new THREE.Vector3(p.x,p.y,surface(p.x,p.y)+.065));edge.push(edge[0].clone());const edgeCurve=new THREE.CatmullRomCurve3(edge,false,'centripetal');
 const glow=new THREE.MeshBasicMaterial({color:0x70e4ff,toneMapped:false});root.add(new THREE.Mesh(new THREE.TubeGeometry(edgeCurve,200,.008,5,false),glow));const haloMat=new THREE.MeshBasicMaterial({color:0x49cfff,transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});root.add(new THREE.Mesh(new THREE.TubeGeometry(edgeCurve,200,.026,5,false),haloMat));
 // Feathered light spill: nested additive sleeves, not a wider opaque stripe.
 const neonLayers=[.045,.075,.11].map((radius,i)=>{const material=new THREE.MeshBasicMaterial({color:'#63ddff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});const mesh=new THREE.Mesh(new THREE.TubeGeometry(edgeCurve,200,radius,8,false),material);mesh.visible=false;root.add(mesh);return {mesh,material,falloff:[.10,.045,.018][i]};});
 root.userData.neonLayers=neonLayers;
 const hit=controls[id];const item={id,root,mat,glow,haloMat,ctx,tex,canvas,x,y,w,h,hit,press:-10};buttons.push(item);return item;}
const shoulder='M48 46L177 27Q187 26 190 37L168 77L190 122Q185 130 174 127L37 98Q30 96 34 81Z';
cap('shop',svgShape(shoulder),-1.87,.99,1.1,.47);cap('build',svgShape(shoulder,p=>new THREE.Vector2((300-p.x)/100,(175-p.y)/100)),1.87,.99,1.1,.47);
const centre='M209 38L391 38Q398 38 401 46L423 80L400 123Q396 130 387 130L213 130Q204 130 200 123L177 80L199 46Q202 38 209 38Z';
cap('roll',svgShape(centre),0,.9,1.98,.76);
for(const [name,cx,sign,deg] of [['creatures',.115,-1,4],['concord',.885,1,-4]]){const angle=deg*Math.PI/180,w=596*.15*.92,h=350*.494*.92;const shape=svgShape(LOWER_PATH,p=>{const x=(p.x/100-.5)*w*sign,y=(p.y/170-.5)*h;return new THREE.Vector2((cx*596+x*Math.cos(angle)-y*Math.sin(angle)-298)/100,(175-(.588*350+x*Math.sin(angle)+y*Math.cos(angle)))/100);});const center=outlineCentroid(shape.getPoints(120));cap(name,shape,center.x,center.y,.62,.37);}

 const autoRoll={get running(){return snapshot.autoRolling;}};
 function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function icon(c,id,x,y,size,color){c.save();c.translate(x,y);c.scale(size/100,size/100);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=6;c.lineCap='round';c.lineJoin='round';if(id==='dice'){rounded(c,-40,-40,80,80,16);c.stroke();for(const [a,b] of [[-18,-18],[18,-18],[0,0],[-18,18],[18,18]]){c.beginPath();c.arc(a,b,5,0,7);c.fill();}}else if(id==='creatures'){for(const [a,b] of [[-28,-25],[-9,-40],[12,-40],[30,-23]]){c.beginPath();c.ellipse(a,b,9,13,0,0,7);c.fill();}c.beginPath();c.ellipse(0,10,26,23,0,0,7);c.fill();}else if(id==='market'){rounded(c,-31,-17,62,58,8);c.stroke();c.beginPath();c.arc(0,-17,17,Math.PI,0);c.stroke();}else if(id==='build'){c.beginPath();c.moveTo(-25,35);c.lineTo(20,-15);c.moveTo(-12,-29);c.lineTo(32,9);c.lineTo(43,-4);c.lineTo(0,-43);c.closePath();c.stroke();}else{c.beginPath();c.arc(0,0,31,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(0,-24);c.lineTo(10,0);c.lineTo(0,24);c.lineTo(-10,0);c.closePath();c.fill();}c.restore();}
function celebrationIcon(c,x,y,r,t){c.save();c.translate(x,y);c.rotate(reduced?0:Math.sin(t*2)*.12);c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.restore();}
function jackpotEmblem(c,b,t){drawJackpotButton(c,b.id,t,reduced);}
function drawButton(b,t){
 const c=b.ctx,W=b.canvas.width,H=b.canvas.height,jackpot=state.phase==='jackpot',ink=themes[theme].ink;
 c.clearRect(0,0,W,H);
 if(b.id!=='roll'){
   const fx=b.root.userData.fireworks;fx.face.visible=jackpot;
   if(jackpot){const context=fx.canvas.getContext('2d');context.clearRect(0,0,512,512);drawJackpotButton(context,b.id,t,reduced,true);fx.texture.needsUpdate=true;}
   b.mat.color.set(jackpot?'#a96a12':themes[theme].panel);
   const glass=!!themes[theme].translucentButtons&&!jackpot;
   b.mat.transparent=glass;b.mat.opacity=glass?.48:1;b.mat.depthWrite=!glass;
   b.mat.roughness=jackpot?.28:glass?.16:(themes[theme].panelRoughness??.4);b.mat.metalness=jackpot?.65:glass?.04:(themes[theme].panelMetalness??.15);b.mat.clearcoat=glass?.85:(themes[theme].panelClearcoat??.15);
   c.shadowColor=jackpot?'#ffbf36':themes[theme].light;c.shadowBlur=0;c.fillStyle='#fff3c2';
   if(jackpot)jackpotEmblem(c,b,t);
   else if(b.id==='build'&&buildAffordable){
     const fade=reduced?1:Math.min(1,Math.max(0,(t-buildCueStarted)/.45));
     c.globalAlpha=1-fade;drawEmblem(c,b.id,themes[theme].iconInk||ink,false,themes[theme].iconGlow);c.globalAlpha=fade;
     icon(c,'build',256,160,68,themes[theme].iconInk||ink);
     c.textAlign='center';c.textBaseline='middle';c.fillStyle=themes[theme].iconInk||ink;c.shadowColor=themes[theme].readyLight||'#ffc869';c.shadowBlur=reduced?0:12;
     c.font='800 100px system-ui';c.fillText('BUILD',256,290,470);
     c.font='600 32px system-ui';c.fillText('READY',256,367);c.globalAlpha=1;
   }else if(b.id==='concord'){
     // A crisp open-book mark for the story device, not a reduced leaf glyph.
     c.save();c.strokeStyle=themes[theme].iconInk||ink;c.lineWidth=9;c.lineJoin='round';
     c.beginPath();c.moveTo(256,220);c.quadraticCurveTo(198,184,130,196);
     c.lineTo(130,76);c.quadraticCurveTo(198,64,256,100);
     c.quadraticCurveTo(314,64,382,76);c.lineTo(382,196);
     c.quadraticCurveTo(314,184,256,220);c.lineTo(256,100);c.stroke();c.restore();
     c.textAlign='center';c.textBaseline='middle';c.fillStyle=themes[theme].iconInk||ink;
     c.font='700 92px system-ui';
     const restored=snapshot.concordTitle==='Concord & Story';
     if(restored){c.font='700 76px system-ui';c.fillText('Concord &',256,305,490);}
     c.fillText('Story',256,restored?410:335,480);
   }else drawEmblem(c,b.id,themes[theme].iconInk||themes[theme].ink,false,themes[theme].iconGlow);
   c.shadowBlur=0;b.tex.needsUpdate=true;return;
 }
 // Light belongs to the full sculpted cap, never a rectangular inset screen.
 const g=c.createLinearGradient(0,0,0,H);
 const empty=state.dice===0;
 g.addColorStop(0,jackpot?'#fff2a5':empty?(themes[theme].emptyRoll?.[0]||'#704658'):themes[theme].roll[0]);
 g.addColorStop(.24,jackpot?'#eab63d':empty?(themes[theme].emptyRoll?.[1]||'#573347'):themes[theme].roll[1]);
 g.addColorStop(.65,jackpot?'#b97619':empty?(themes[theme].emptyRoll?.[2]||'#352b42'):themes[theme].roll[2]);
 g.addColorStop(1,jackpot?'#ffd870':empty?(themes[theme].emptyRoll?.[3]||'#58354a'):themes[theme].roll[3]);
 c.fillStyle=g;c.fillRect(0,0,W,H);
 const halo=c.createRadialGradient(470,145,20,512,210,600);halo.addColorStop(0,'#ffffff44');halo.addColorStop(.6,'#91ecff0a');halo.addColorStop(1,'#001a4433');c.fillStyle=halo;c.fillRect(0,0,W,H);
 c.save();const driftTime=reduced?0:t;
 for(let i=0;i<12;i++){
  const x=80+((i*173)%860)+Math.sin(driftTime*.25+i)*24,y=45+((i*97)%420)+Math.cos(driftTime*.22+i*2)*17;
  const strength=(.10+level*.25)*power*Math.pow(.5+.5*Math.sin(driftTime*.8+i*2.7),3);
  const light=c.createRadialGradient(x,y,0,x,y,32);light.addColorStop(0,'rgba(220,250,255,'+strength+')');light.addColorStop(.2,'rgba(160,225,255,'+(strength*.35)+')');light.addColorStop(1,'rgba(120,215,255,0)');
  c.fillStyle=light;c.fillRect(x-32,y-32,64,64);
 }c.restore();
 c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;c.shadowColor='#072a56';c.shadowBlur=8;c.shadowOffsetY=3;
 const remaining=Math.floor(state.dice/state.multiplier);
 c.font='800 94px system-ui';c.fillText(String(remaining),310,118);c.font='600 42px system-ui';c.fillText('ROLLS LEFT',500,116);
 
 const cue=diceCue(state);
 let title=autoRoll.running?'AUTO ROLL':cue.title,sub=autoRoll.running?'Release to stop':cue.detail;
 if(state.phase==='rolling'){title='ROLLING';sub='Your next move…';}
 else if(cue.kind==='empty'){title=cue.title;sub=cue.detail;}
 else if(cue.kind==='insufficient'){title=cue.title;sub=cue.detail;}
 else if(state.phase==='result'){title='ROLLED '+state.result;sub=autoRoll.running?'Auto-roll · release to stop':state.dice+' dice · hold for auto-roll';}
 else if(state.phase==='reward'){title='+30 DICE';sub='Ready to roll';}
 else if(jackpot){title='JACKPOT';sub='A golden moment';}
 if(!jackpot){title=snapshot.rollTitle;sub=snapshot.rolling?'Your next move…':snapshot.regenLabel||sub;}
 c.font='800 '+(state.phase==='rolling'?95:title.length>9?85:125)+'px system-ui';
 if(jackpot&&!reduced){const shift=(t*170)%780;for(let i=-1;i<3;i++)c.fillText('JACKPOT',i*780+512-shift,270);}else c.fillText(title,state.phase==='rolling'?450:512,270,900);
 c.font='500 38px system-ui';c.fillText(sub,512,382,830);
 if(state.phase==='rolling'){
  c.save();c.translate(800,270);c.rotate(reduced?0:t*5);c.shadowColor='#2ebeff';c.shadowBlur=38;icon(c,'dice',-32,-15,72,'#a5efff');icon(c,'dice',35,24,72,'#a5efff');c.restore();
 }
 c.font='500 30px system-ui';c.fillText(autoRoll.running?'AUTO ON · RELEASE TO STOP':cue.kind==='insufficient'?'CHANGE × ABOVE TO KEEP ROLLING':cue.kind==='empty'?'DICE RECHARGE':'HOLD TO AUTO-ROLL',512,452);
 const age=t-b.press;if(age<.7){const flash=c.createRadialGradient(512,256,30,512,256,620);flash.addColorStop(0,'#55cfff00');flash.addColorStop(.75,'rgba(74,192,255,'+(.24*(1-age/.7))+')');flash.addColorStop(1,'#55cfff00');c.fillStyle=flash;c.fillRect(0,0,W,H);}

 c.shadowBlur=0;c.shadowOffsetY=0;b.tex.needsUpdate=true;
}

 function placeHit(el,x,y,w,h){const item=buttons.find(b=>b.hit===el),outline=item&&buttonOutlines.get(item.id);el.hidden=camera.position.z<1;if(outline){const points=outline.map(p=>new THREE.Vector3(p.x,p.y,surface(p.x,p.y)+.08).project(camera)).map(p=>[(p.x+1)*.5*host.clientWidth,(1-p.y)*.5*host.clientHeight]);const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;el.style.left=(left+width/2)+'px';el.style.top=(top+height/2)+'px';el.style.width=width+'px';el.style.height=height+'px';el.style.clipPath='polygon('+points.map(p=>`${(p[0]-left)/width*100}% ${(p[1]-top)/height*100}%`).join(',')+')';return;}const v=new THREE.Vector3(x,y,surface(x,y)+.12).project(camera),a=new THREE.Vector3(x-w/2,y-h/2,surface(x,y)+.12).project(camera),b=new THREE.Vector3(x+w/2,y+h/2,surface(x,y)+.12).project(camera);el.style.left=(v.x+1)*.5*host.clientWidth+'px';el.style.top=(1-v.y)*.5*host.clientHeight+'px';el.style.width=Math.max(36,Math.abs(b.x-a.x)*.5*host.clientWidth)+'px';el.style.height=Math.max(32,Math.abs(b.y-a.y)*.5*host.clientHeight)+'px';}

 const paintUniforms={paintTime:{value:0},paintEnergy:{value:0},paintPower:{value:0},paintJackpot:{value:0}};
// Seasonal system is removable and separate from body geometry.
const seasonal=new THREE.Group();seasonal.name='seasonal-attachments';scene.add(seasonal);for(let i=0;i<17;i++){const x=-2.15+i*.27,y=1.48;const m=new THREE.MeshBasicMaterial({color:'#ffdf93',toneMapped:false});const bulb=new THREE.Mesh(new THREE.SphereGeometry(.025,10,8),m);bulb.position.set(x,y,surface(x,y)+.05);seasonal.add(bulb);}seasonal.visible=false;
for(const side of [-1,1]){
 const sprig=new THREE.Group();sprig.position.set(side*2.35,1.48,surface(side*2.35,1.48)+.08);seasonal.add(sprig);
 for(let j=0;j<3;j++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:'#125b30',metalness:.3,roughness:.4}));leaf.scale.set(.13,.055,.016);leaf.position.set(side*(j-1)*.10,Math.abs(j-1)*.045,0);leaf.rotation.z=side*(j-1)*.6;sprig.add(leaf);}
 for(let j=0;j<3;j++){const berry=new THREE.Mesh(new THREE.SphereGeometry(.035,12,10),new THREE.MeshPhysicalMaterial({color:'#a60f22',clearcoat:1,roughness:.25}));berry.position.set((j-1)*.05,j===1?-.035:0,.04);sprig.add(berry);}
}
 const rollLight=new THREE.PointLight('#42bfff',0,4,2);rollLight.position.set(0,.9,1.4);scene.add(rollLight);
 let lastTheme='',lastJackpot=false,lastRolling=false,previous=0;
 function applyTheme(){chassis.setTheme(themes[theme]);shell.traverse(o=>{if(!o.isMesh)return;for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose();o.material=createPaintMaterial(THREE,themes[theme],paintUniforms);});}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;const frame=controllerFraming(camera.aspect);camera.position.set(0,frame.y,frame.z);camera.lookAt(0,frame.y,0);camera.updateProjectionMatrix();}
 observer=new ResizeObserver(resize);observer.observe(host);resize();
 function tick(ms){if(disposed)return;frame=requestAnimationFrame(tick);if(ms-previous<33)return;const dt=Math.min(.1,(ms-previous)/1000);previous=ms;snapshot=getSnapshot();if(document.hidden||snapshot.hidden)return;
 now=ms/1000;theme=snapshot.theme;reduced=snapshot.reduced;
 state={dice:snapshot.dice,multiplier:snapshot.multiplier,playerMax:snapshot.maximum,phase:snapshot.jackpot?'jackpot':snapshot.rolling?'rolling':snapshot.dice===0?'empty':'ready'};
 const jackpot=state.phase==='jackpot';
 if(lastTheme!==theme||lastJackpot!==jackpot){applyTheme();seasonal.visible=!!themes[theme].holiday;lastTheme=theme;lastJackpot=jackpot;}
 if(snapshot.buildReady&&!buildAffordable)buildCueStarted=now;buildAffordable=snapshot.buildReady;
 power=THREE.MathUtils.damp(power,snapshot.dice>0?1:0,4,dt);level=THREE.MathUtils.damp(level,snapshot.multiplier/Math.max(1,snapshot.maximum),3,dt);
 if(snapshot.rolling&&!lastRolling)buttons.find(b=>b.id==='roll').press=now;lastRolling=snapshot.rolling;
 const rollAge=now-buttons.find(b=>b.id==='roll').press;
 const clickGlow=Math.max(0,1-rollAge/.7);
 rollLight.intensity=reduced?0:clickGlow*2.5+(snapshot.rolling?.5:0);
 shell.position.x=group.position.x=jackpot&&!reduced?Math.sin(now*45)*.014:0;
 paintUniforms.paintTime.value=reduced?0:now;paintUniforms.paintPower.value=snapshot.dice>0?power:0;paintUniforms.paintEnergy.value=snapshot.dice>0?power*level:0;paintUniforms.paintJackpot.value=jackpot?1:0;
 for(const [i,b] of buttons.entries()){
 const age=now-b.press,pressed=b.hit.matches(':active');b.hover=b.hit.matches(':hover,:focus-visible');
 b.root.position.z=reduced?0:pressed?-.025:age<.4?-.025*Math.sin(Math.PI*age/.4):0;
 const ready=b.id==='build'&&buildAffordable,charge=ready?1:power;
 const tint=jackpot?'#fff0a3':ready?(themes[theme].readyLight||'#ffc56b'):themes[theme].light;
 b.glow.color.set(tint).multiplyScalar(.35+charge*.7);b.haloMat.color.set(tint);b.haloMat.opacity=.08+charge*.16;
 if(theme==='dark'&&!jackpot){b.glow.color.set('#b0f1ff').multiplyScalar(.28+.95*charge);b.haloMat.color.set('#50d7ff');b.haloMat.opacity=.06+.32*charge;}
 if(jackpot)b.haloMat.opacity=reduced?.4:.35+.1*Math.sin(now*2.4-i*.4);
 if(b.id==='roll'&&!jackpot){const breath=reduced?.18:.18+.06*Math.sin(now*2);b.haloMat.opacity=Math.max(b.haloMat.opacity,power*breath+clickGlow*.5);}
 if(b.id==='roll'&&(theme==='ice'||theme==='light')&&snapshot.dice===0&&!snapshot.rolling&&!jackpot){
   b.glow.color.set('#ffc18b');b.haloMat.color.set(themes[theme].depletedLight);
   b.haloMat.opacity=reduced?.2:.2+.045*Math.sin(now*1.6);rollLight.intensity=0;
 }
 for(const layer of b.root.userData.neonLayers){layer.mesh.visible=theme==='dark'&&!jackpot;layer.material.opacity=layer.falloff*(.12+charge);}
 drawButton(b,now);placeHit(b.hit,b.x,b.y,b.w,b.h);
 }
 powerPill.update(snapshot,now,reduced);
 placeHit(controls.multiplier,PILL.x,PILL.y,PILL.width,.5);
 renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(tick);onReady();
 }
 setup().catch(error=>{if(!disposed){console.warn('Controller renderer unavailable',error);cleanup();onError();}});
 return cleanup;
}
