// Presentation only. Multiplier limits and actions remain owned by the game.
export const PILL={x:0,y:1.98,z:.12,width:1.85,height:.4};
export const MAX_JUMP_SECONDS=.54;
// Match the original pill's rise, landing and smaller rebound. Reduced motion
// retains the acknowledgement glow without moving the control.
export function maxJumpFeedback(age,reduced=false){
 if(age<0||age>=MAX_JUMP_SECONDS)return {offset:0,glow:1};
 const progress=age/MAX_JUMP_SECONDS,keys=[[0,0],[.34,.10],[.64,-.022],[.82,.022],[1,0]];
 let segment=1;while(progress>keys[segment][0])segment++;
 const [a,y0]=keys[segment-1],[b,y1]=keys[segment];
 const u=(progress-a)/(b-a),smooth=u*u*(3-2*u);
 return {offset:reduced?0:y0+(y1-y0)*smooth,glow:1+Math.sin(progress*Math.PI)*.65};
}
export function multiplierAppearance(multiplier,maximum,dice){
 const max=Math.max(1,maximum),atMax=max>1&&multiplier>=max;
 const level=Math.max(0,Math.min(1,(multiplier-1)/Math.max(1,max-1)));
 return {level,atMax,powered:dice>0,color:atMax?'#ffd77b':level>.55?'#ff986f':level>0?'#8eeeff':'#a7e4ff'};
}
export function createMultiplierHologram(THREE){
 const root=new THREE.Group();root.name='holographic-roll-power-pill';root.position.set(PILL.x,PILL.y,PILL.z);
 const r=PILL.height/2,a=PILL.width/2-r,s=new THREE.Shape();
 s.moveTo(-a,-r);s.lineTo(a,-r);s.absarc(a,0,r,-Math.PI/2,Math.PI/2,false);s.lineTo(-a,r);s.absarc(-a,0,r,Math.PI/2,Math.PI*1.5,false);
 const glass=new THREE.MeshPhysicalMaterial({color:'#174760',transparent:true,opacity:.68,metalness:.08,roughness:.18,clearcoat:.65,envMapIntensity:.25,depthWrite:false});
 root.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:.07,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,curveSegments:24}),glass));
 const points=s.getPoints(80).map(p=>new THREE.Vector3(p.x,p.y,.085));
 const rimMaterial=new THREE.MeshBasicMaterial({color:'#a7e4ff',toneMapped:false});
 root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),160,.009,6,true),rimMaterial));
 const haloMaterial=new THREE.MeshBasicMaterial({color:'#61cfff',transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending});
 const halo=new THREE.Mesh(new THREE.ShapeGeometry(s),haloMaterial);halo.scale.set(1.08,1.26,1);halo.position.z=-.035;root.add(halo);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const label=new THREE.Mesh(new THREE.PlaneGeometry(PILL.width*.91,PILL.height*.91),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));label.position.z=.105;root.add(label);
 let last=-1,jumpStarted=-Infinity,wasJumping=false;
 function update({multiplier,maximum,dice,multiplierMaxJumping=false},time,reduced){
   if(multiplierMaxJumping&&!wasJumping)jumpStarted=time;
   wasJumping=multiplierMaxJumping;
   const jump=maxJumpFeedback(time-jumpStarted,reduced);
   root.position.y=PILL.y+jump.offset;
   const v=multiplierAppearance(multiplier,maximum,dice),pulse=reduced?1:1+Math.sin(time*(1.5+v.level))*.12;
   glass.color.set(v.atMax?'#62512b':'#174760');rimMaterial.color.set(v.color).multiplyScalar(v.powered?pulse*jump.glow:.45);
   haloMaterial.color.set(v.color);haloMaterial.opacity=v.powered?(.12+v.level*.23)*pulse*jump.glow:.025;
   if(time-last<.05)return;last=time;
   const c=canvas.getContext('2d');c.clearRect(0,0,1024,256);
   c.fillStyle=v.color;c.globalAlpha=v.powered?.10:.035;
   for(let i=0;i<8;i++){const x=reduced||!v.powered?i*150:(i*150+time*(12+v.level*38))%1200-100;c.fillRect(x,0,1,256);}
   c.globalAlpha=1;c.textBaseline='middle';c.textAlign='center';c.shadowColor=v.color;c.shadowBlur=v.powered?10+v.level*14:0;
   // One crisp primary number; cost/cap details live in transient DOM feedback.
   c.shadowBlur=0;c.fillStyle='#f1fbff';c.font='800 180px system-ui';
   c.fillText('×'+multiplier,v.atMax?390:512,138,v.atMax?590:900);
   if(v.atMax){c.fillStyle=v.color;c.font='800 82px system-ui';c.fillText('MAX',800,138,290);}
   texture.needsUpdate=true;
 }
 return {root,update};
}
