import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Role = 'steering' | 'administration';
type Surface = 'timber' | 'cream' | 'metal' | 'screen' | 'light' | 'leaf' | 'brass';
const SURFACES: Surface[] = ['timber','cream','metal','screen','light','leaf','brass'];
const FLOOR = -.094; // Existing slab -.12 + half-thickness .016 + bevel .01.

/** Furniture in the existing shoulder-suite local frame. Physical details are
 * grouped by material, not one draw group per cushion or book. */
export function makeCommandInteriorGeometry(role: Role) {
  const buckets: Record<Surface,THREE.BufferGeometry[]> = {timber:[],cream:[],metal:[],screen:[],light:[],leaf:[],brass:[]};
  const parts: Array<{name:string;surface:Surface;bounds:number[]}> = [];
  const add = (name:string,surface:Surface,g:THREE.BufferGeometry,p:number[],yaw=0) => {
    g.rotateY(yaw); g.translate(p[0],p[1]+FLOOR,p[2]); g.computeBoundingBox();
    parts.push({name,surface,bounds:[...g.boundingBox!.min.toArray(),...g.boundingBox!.max.toArray()]});
    buckets[surface].push(g.index?g.toNonIndexed():g);
    if(g.index)g.dispose();
  };
  const box=(name:string,surface:Surface,w:number,h:number,d:number,x:number,y:number,z:number,yaw=0)=>
    add(name,surface,new THREE.BoxGeometry(w,h,d),[x,y,z],yaw);
  const rounded=(w:number,h:number,d:number,r:number)=>{
    const s=new THREE.Shape(),x=w/2,z=d/2;
    s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);
    s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);
    s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);
    const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:2});
    g.rotateX(-Math.PI/2);g.translate(0,-h/2,0); return g;
  };
  const chair=(name:string,x:number,z:number,yaw:number,helm=false)=>{
    const origin=new THREE.Vector3(x,0,z);
    const piece=(suffix:string,surface:Surface,g:THREE.BufferGeometry,p:number[])=>{
      const v=new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(origin);
      add(`${name}-${suffix}`,surface,g,v.toArray(),yaw);
    };
    piece('pedestal','metal',new THREE.CylinderGeometry(.014,.023,.028,6),[0,.014,0]);
    piece('seat','cream',rounded(.052,.011,.054,.008),[0,.035,0]);
    const back=rounded(.052,.047,.012,.005);back.rotateX(-.12);
    piece('back','cream',back,[0,.060,-.025]);
    for(const side of [-1,1]) piece('arm','timber',rounded(.008,.008,.043,.003),[side*.03,.050,0]);
    if(helm)piece('headrest','cream',rounded(.034,.021,.012,.005),[0,.093,-.029]);
  };
  const plant=(name:string,x:number,z:number)=>{
    add(`${name}-pot`,'brass',new THREE.CylinderGeometry(.032,.025,.05,8),[x,.025,z]);
    for(let i=0;i<5;i++){
      const leaf=new THREE.SphereGeometry(1,5,3);leaf.scale(.018,.04,.009);leaf.rotateZ((i-2)*.32);
      add(`${name}-leaf-${i}`,'leaf',leaf,[x+Math.sin(i*2.4)*.016,.065+i*.008,z+Math.cos(i*2.4)*.014],i*2.4);
    }
  };
  // Actual timber overlay, brass perimeter and staggered plank seams. The
  // narrow central approach stays free of furniture and below the upper slab.
  box('principal-timber-floor','timber',1.02,.004,1.12,0,.002,-.015);
  for(let i=0;i<11;i++) box(`deck-seam-${i}`,'metal',.0012,.0005,1.10,-.47+i*.094,.0045,-.015);
  for(const side of [-1,1]){
    box(`perimeter-inlay-${side}`,'brass',.003,.001,1.08,side*.496,.005,-.015);
    box(`cove-rail-${side}`,'light',.005,.005,.96,side*.51,.24,-.015);
    // Banquettes occupy rear-side pockets, clear of the door at rear centre.
    add(`lounge-base-${side}`,'timber',rounded(.16,.025,.25,.025),[side*.40,.016,-.34]);
    add(`lounge-cushion-${side}`,'cream',rounded(.145,.015,.23,.025),[side*.40,.036,-.34]);
    add(`lounge-back-${side}`,'cream',rounded(.034,.060,.24,.015),[side*.468,.061,-.34]);
    add(`lounge-table-${side}`,'timber',rounded(.09,.007,.10,.025),[side*.265,.043,-.35]);
    box(`lounge-table-leg-${side}`,'brass',.018,.04,.04,side*.265,.022,-.35);
    plant(`panorama-plant-${side}`,side*.46,.35);
  }
  if(role==='steering') {
    // Three connected shallow stations form a bow, with supported inclined
    // displays and real operator chairs instead of translucent floating blocks.
    for(let i=-1;i<=1;i++){
      const x=i*.255,z=.37-Math.abs(i)*.035,yaw=-i*.13;
      add(`helm-console-${i}`,'timber',rounded(.255,.018,.15,.035),[x,.080,z],yaw);
      box(`helm-console-support-${i}`,'metal',.11,.068,.075,x,.038,z,yaw);
      for(let j=-1;j<=1;j++) {
        const screen=new THREE.BoxGeometry(.068,.004,.051);screen.rotateX(.32);
        add(`helm-screen-${i}-${j}`,'screen',screen,[x+j*.074,.093,z+.012],yaw);
        box(`helm-status-${i}-${j}`,'light',.039,.002,.003,x+j*.074,.092,z-.043,yaw);
      }
      chair(`helm-chair-${i}`,x,z-.17,yaw,true);
    }
    box('helm-forward-light','light',.78,.003,.004,0,.071,.46);
    for(const side of [-1,1]) {
      box(`side-equipment-${side}`,'timber',.08,.14,.19,side*.48,.07,-.03);
      for(let i=0;i<3;i++) box(`side-rack-${side}-${i}`,'metal',.002,.027,.15,side*.438,.027+i*.040,-.03);
    }
  } else {
    add('strategy-table','timber',rounded(.31,.013,.49,.06),[0,.059,.12]);
    box('strategy-table-base','brass',.11,.051,.22,0,.027,.12);
    add('strategy-inset','screen',rounded(.225,.002,.32,.023),[0,.067,.12]);
    for(const side of [-1,1])for(let i=0;i<3;i++)chair(`conference-${side}-${i}`,side*.213,-.06+i*.18,-side*Math.PI/2);
    for(const side of [-1,1]){
      box(`archive-back-${side}`,'timber',.064,.24,.40,side*.478,.12,-.035);
      for(let shelf=0;shelf<4;shelf++) {
        box(`archive-shelf-${side}-${shelf}`,'brass',.074,.004,.42,side*.468,.019+shelf*.06,-.035);
        for(let book=0;book<6;book++)box(`archive-volume-${side}-${shelf}-${book}`,book%3===0?'cream':'timber',.04,.035+(book%2)*.011,.019,side*.457,.04+shelf*.06,-.195+book*.063);
      }
    }
  }
  // A smaller work desk and two lounge seats also inhabit the upper level;
  // lower-floor circulation remains visible rather than filling it with boxes.
  for(const level of [-.40,.66]) {
    add(`secondary-desk-${level}`,'timber',rounded(.25,.012,.12,.02),[.25,level+.055,.28]);
    box(`secondary-desk-base-${level}`,'brass',.06,.05,.08,.25,level+.026,.28);
    add(`secondary-display-${level}`,'screen',new THREE.BoxGeometry(.12,.002,.06),[.25,level+.063,.28]);
  }
  const groups=SURFACES.map(surface=>{
    // Every group is used; predictable material order is an integration contract.
    const merged=mergeGeometries(buckets[surface],false);
    buckets[surface].forEach(g=>g.dispose());
    if(!merged)throw new Error(`Empty command room material ${surface}`);
    return merged;
  });
  const geometry=mergeGeometries(groups,true)!;groups.forEach(g=>g.dispose());
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={role,parts,floor:FLOOR,authority:'13-inhabited-room-pov-authority-v1',productionApproved:false};
  return geometry;
}
