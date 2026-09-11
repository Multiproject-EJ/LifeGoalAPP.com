import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import { part, solid, disc, box, portal, arc, tube, createV2Palette, finishPart } from './Island1V2Kit';

/** Approved lotus-conservatory family; semantic groups survive construction previews. */
export function createIsland1V2Hatchery(level:1|2|3,quality:Island3DQuality,preview=false) {
 const root=new THREE.Group();root.name='ISLAND_001_V2_LOTUS_HATCHERY';
 const p=createV2Palette(), seg=quality==='low'?16:32;
 const terraces=part(root,'hatchery-terraces');
 const base=disc(terraces,'HATCHERY_LOWER_TERRACE',1.49,.17,[0,.12,0],p.shade,seg);base.scale.z=.88;
 const lip=disc(terraces,'HATCHERY_TERRACE_EDGE',1.47,.065,[0,.23,0],p.trim,seg);lip.scale.z=.88;
 for(let tier=0;tier<3;tier++)disc(terraces,`HATCHERY_STEPPED_COURT_${tier}`,.94-tier*.11,.26,[0,.38+tier*.26,-.13],p.stone,seg);
 disc(terraces,'HATCHERY_UPPER_COURT_CORNICE',.73,.085,[0,1.05,-.13],p.trim,seg);
 for(const side of [-1,1])for(let i=0;i<14;i++){
  const angle=side*(.25+i/13), h=.055+i*.06, radius=1.2-i/13*.55;
  arc(terraces,`HATCHERY_CURVED_STAIR_${side}_${i}`,radius-.18,radius+.18,.25,h,angle-.052,angle+.052,p.stone,3);
 }
 const wings=part(root,'hatchery-wings');
 for(const side of [-1,1]){
  if(side===1&&level<2)continue;
  const wing=part(wings,`HATCHERY_NURSERY_${side}`,side===1?2:1);
  wing.position.set(side*.76,.25,side===1?-.68:-.45);
  const h=side===1?1.04:.74;
  const floor=disc(wing,'NURSERY_FLOOR',.72,.07,[0,.025,0],p.trim,seg);
  arc(wing,'NURSERY_REAR_WALL',.62,.69,.03,h,Math.PI*.48,Math.PI*1.52,p.stone,16);
  for(let bay=0;bay<3;bay++){
   const a=(bay-1)*.88;
   const door=portal(wing,`NURSERY_OPEN_ARCH_${bay}`,.6,h,.105,[Math.sin(a)*.65,.035,Math.cos(a)*.65],p.stone);door.rotation.y=a;
  }
  disc(wing,'NURSERY_ROOF_CORNICE',.73,.1,[0,h+.075,0],p.trim,seg);
  floor.userData.constructionStage=side===1?2:1;
 }
 const conservatory=part(root,'hatchery-conservatory');conservatory.position.z=-.13;
 const glassGroup=part(conservatory,'LOTUS_PETAL_GLASS');
 for(let petal=1;petal<8;petal++){
  if(level===1&&petal%2===0)continue;
  const theta=petal/8*Math.PI*2, steps=quality==='low'?16:28, across=6;
  const positions:number[]=[],indices:number[]=[],left:THREE.Vector3[]=[],right:THREE.Vector3[]=[];
  const point=(t:number,u:number)=>{
   const r=.46*(1-t)+.56*Math.sin(Math.PI*t)+.19*t;
   const a=theta+u*.52*Math.sin(Math.PI*t);
   return new THREE.Vector3(Math.sin(a)*r,1.09+t*(1.55-.24*Math.cos(theta)),Math.cos(a)*r);
  };
  for(let row=0;row<=steps;row++){
   const t=row/steps;left.push(point(t,-1));right.push(point(t,1));
   for(let col=0;col<=across;col++)positions.push(...point(t,col/across*2-1).toArray());
   if(row<steps)for(let col=0;col<across;col++){const a=row*(across+1)+col;indices.push(a,a+1,a+across+1,a+1,a+across+2,a+across+1);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  solid(glassGroup,`LOTUS_CURVED_GLASS_PETAL_${petal}`,geo,p.glass);
  tube(conservatory,`LOTUS_LEFT_RIB_${petal}`,left,.018,p.gold,steps);
  tube(conservatory,`LOTUS_RIGHT_RIB_${petal}`,right,.018,p.gold,steps);
 }
 const eggGroup=part(root,'hatchery-egg');
 disc(eggGroup,'EGG_NEST_PEDESTAL',.28,.1,[0,1.14,-.13],p.gold,seg);
 const eggMaterial=new THREE.MeshPhysicalMaterial({color:0xe7eedb,roughness:.2,metalness:.15,clearcoat:.6,emissive:0x506f52,emissiveIntensity:.08});
 const egg=solid(eggGroup,'SHELTERED_LUMINOUS_EGG',new THREE.SphereGeometry(1,seg,16),eggMaterial,[0,1.57,-.13]);egg.scale.set(.235,.39,.235);
 root.userData.v2Family='lotus-conservatory';root.userData.reference='island-001-reimagined-20260910/02-landmark-studies.png';
 root.userData.sockets={lift:[.72,.15,1.07],egg:[0,1.57,-.13]};
 root.userData.sculptRuntime={parts:['hatchery-terraces','hatchery-wings','hatchery-conservatory','hatchery-egg'],clickable:true,constructionPreview:preview};
 // Compact by meaningful owner, never flatten moving/shared lift machinery.
 [terraces,wings,conservatory,eggGroup].forEach(g=>finishPart(g,preview));
 return root;
}
