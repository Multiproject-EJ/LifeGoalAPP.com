import * as THREE from 'three';
import { getAssemblyDelegateSeatSockets } from './Island1AssemblyDiplomaticHall';
import type { Island3DQuality } from './island5ThreePilotContract';
import {crowdClock,progressFromCrowdClock,type MarinaDeparture} from './Island1MarinaChoreography';
import {MarinaGeometry} from './Island1MarinaGeometry';

const FLOOR = -6.18, DECK = -2.25;
const smooth = (p: number) => THREE.MathUtils.smoothstep(p, 0, 1);
export function createMarinaDelegates(quality: Island3DQuality,departures:MarinaDeparture[]) {
  const root = new THREE.Group(); root.name = 'ISLAND_1_MARINA_ARTICULATED_DELEGATES';
  const allSeats = getAssemblyDelegateSeatSockets(FLOOR);
  const seats = allSeats.filter((_, i) => quality==='high' || (quality==='medium'?i%3!==0:i%4===0));
  // Aisle-near guests arrive first. Rear rows continue filling throughout the podium shot.
  seats.sort((a,b) => (Math.abs(a.angle)+a.row*.035) - (Math.abs(b.angle)+b.row*.035));
  const count = seats.length, mat = new THREE.MeshStandardMaterial({color:0xffffff,roughness:.78});
  const mesh = (name:string,g:THREE.BufferGeometry,n=count) => {
    const m=new THREE.InstancedMesh(g,mat,n);m.name=name;m.frustumCulled=false;m.castShadow=quality!=='low';root.add(m);return m;
  };
  const torso=mesh('DELEGATE_TAILORED_JACKETS',new THREE.CapsuleGeometry(.087,.15,3,8));
  // One continuous facial volume: tapered jaw, cheeks and a small nasal bridge.
  // These are authored crowd proportions, not likeness measurements from the concept.
  const faceGeometry=new THREE.SphereGeometry(1,quality==='low'?12:24,quality==='low'?8:16);
  const positions=faceGeometry.getAttribute('position');
  for(let v=0;v<positions.count;v++){
    const x=positions.getX(v),y=positions.getY(v),z=positions.getZ(v);
    const jaw=1-.23*THREE.MathUtils.smoothstep(-y,0,.9);
    const front=Math.max(0,-z);
    const nose=.020*Math.exp(-x*x/ .027-(y+.05)**2/.09)*front**5;
    const cheeks=.004*Math.exp(-((Math.abs(x)-.45)**2)/.06-(y+.15)**2/.11)*front;
    positions.setXYZ(v,x*.082*jaw,y*.101,z*.075-nose-cheeks);
  }
  faceGeometry.computeVertexNormals();
  const head=mesh('DELEGATE_FACES',faceGeometry);
  const hair=mesh('DELEGATE_HAIR',new THREE.SphereGeometry(.084,16,9,0,Math.PI*2,0,1.32));
  const arms=mesh('DELEGATE_UPPER_ARMS',new THREE.CylinderGeometry(.027,.033,1,6),count*2);
  const forearms=mesh('DELEGATE_FOREARMS',new THREE.CylinderGeometry(.023,.027,1,6),count*2);
  const hands=mesh('DELEGATE_HANDS',new THREE.SphereGeometry(.029,6,4),count*2);
  const thighs=mesh('DELEGATE_THIGHS',new THREE.CylinderGeometry(.037,.034,1,6),count*2);
  const shins=mesh('DELEGATE_SHINS',new THREE.CylinderGeometry(.029,.034,1,6),count*2);
  const shoes=mesh('DELEGATE_SHOES',new THREE.SphereGeometry(1,6,4),count*2);
  const eyes=mesh('DELEGATE_EYES',new THREE.SphereGeometry(1,10,7),count*2);
  const pupils=mesh('DELEGATE_IRISES',new THREE.SphereGeometry(1,8,6),count*2);
  const brows=mesh('DELEGATE_BROWS',new THREE.CapsuleGeometry(.0035,.029,2,6),count*2);
  const ears=mesh('DELEGATE_EARS',new THREE.SphereGeometry(1,8,6),count*2);
  const mouthCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.024,0,0),new THREE.Vector3(0,-.010,-.005),new THREE.Vector3(.024,0,0));
  const mouths=mesh('DELEGATE_SOFT_SMILES',new THREE.TubeGeometry(mouthCurve,10,.0028,5,false));
  const badges=mesh('DELEGATE_DIPLOMATIC_LANYARDS',new THREE.BoxGeometry(.035,.062,.015));
  // Original Aurelian Tide court dress. These stay on the real walking/seated rigs.
  const regaliaMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.30});
  const regalia=(name:string,b:MarinaGeometry)=>{
    const m=new THREE.InstancedMesh(b.finish(),regaliaMaterial,3);
    m.name=name;m.frustumCulled=false;m.castShadow=quality!=='low';root.add(m);return m;
  };
  const ivory=0xf2e2bd,teal=0x197c82,gold=0xd4aa51;
  const mantleShape=new MarinaGeometry();
  mantleShape.ellipsoid(ivory,[0,0,.018],[.156,.047,.100]);
  mantleShape.torus(gold,[0,.016,0],.086,.013);
  for(const s of [-1,1])mantleShape.ellipsoid(gold,[s*.13,.008,0],[.035,.019,.068]);
  const mantles=regalia('AURELIAN_CEREMONIAL_MANTLES',mantleShape);
  const collarShape=new MarinaGeometry();
  collarShape.add(new THREE.CylinderGeometry(.065,.09,.095,20,1,true,0,Math.PI*1.65),teal,[0,0,.015]);
  collarShape.torus(gold,[0,.043,.015],.065,.006,[Math.PI/2,0,0],Math.PI*1.65);
  const collars=regalia('AURELIAN_OPEN_HIGH_COLLARS',collarShape);
  const sashShape=new MarinaGeometry();
  sashShape.box(teal,[0,0,0],[.057,.27,.012],[0,0,-.50]);
  sashShape.box(gold,[.027,0,-.008],[.006,.27,.005],[0,0,-.50]);
  const sashes=regalia('AURELIAN_TEAL_COURT_SASHES',sashShape);
  const emblemShape=new MarinaGeometry();
  emblemShape.torus(gold,[0,0,0],.024,.006,[0,0,0]);
  emblemShape.ellipsoid(teal,[0,0,-.002],[.017,.017,.005]);
  for(let n=0;n<8;n++){const a=n*Math.PI/4;emblemShape.box(gold,[Math.sin(a)*.036,Math.cos(a)*.036,0],[.008,.019,.006],[0,0,-a]);}
  const emblems=regalia('AURELIAN_SUN_DISC_INSIGNIA',emblemShape);
  const coatShape=new MarinaGeometry();
  // Open split tails, not a solid skirt crossing the moving legs.
  for(const s of [-1,1])coatShape.add(new THREE.CylinderGeometry(.11,.15,.25,12,1,true,s<0?.15:Math.PI+.15,Math.PI-.30),teal,[0,0,0],[1,1,.64]);
  const coats=regalia('AURELIAN_SPLIT_COURT_COATS',coatShape);
  const hairShape=new MarinaGeometry();
  for(let n=0;n<5;n++)hairShape.ellipsoid(0xded9c9,[-.055+n*.026,.046+n*.005,.012+n*.009],[.031,.057,.066]);
  const coiffures=regalia('AURELIAN_SWEPT_COIFFURES',hairShape);
  const bunShape=new MarinaGeometry();bunShape.ellipsoid(0x795035,[0,0,0],[.060,.071,.050]);bunShape.torus(gold,[0,0,-.007],.054,.007,[0,0,0]);
  const buns=regalia('AURELIAN_SCHOLAR_BUNS',bunShape);
  const clothes=[0x29425c,0xa04b40,0x6b5290,0xe0c894,0x357b7b,0x8c974e,0x553e50,0xd09768];
  const skins=[0xe8b894,0xb87951,0x71482f,0xe7c9aa,0x9d674b,0xc79771];
  const colors=(m:THREE.InstancedMesh,i:number,c:number)=>m.setColorAt(i,new THREE.Color(c));
  for(let i=0;i<count;i++){
    colors(torso,i,clothes[i%clothes.length]);colors(head,i,skins[i%skins.length]);colors(hair,i,[0x201c1a,0x50382b,0xb58a53,0xd0c8b8][i%4]);colors(badges,i,0xe6c671);
    colors(mouths,i,[0x995b51,0x824b40,0x4e3029][i%3]);
    for(let s=0;s<2;s++){const j=i*2+s;colors(arms,j,clothes[i%8]);colors(forearms,j,clothes[i%8]);colors(hands,j,skins[i%6]);colors(thighs,j,0x253344);colors(shins,j,0x253344);colors(shoes,j,0x191e28);colors(eyes,j,0xf3eadb);colors(pupils,j,[0x243d48,0x483528,0x536249][i%3]);colors(brows,j,0x49352b);colors(ears,j,skins[i%6]);}
  }
  for(let i=0;i<3;i++){
    const dress=[ivory,teal,0xbc794a][i],skin=[0xc79771,0x71482f,0xe8b894][i];
    colors(torso,i,dress);colors(head,i,skin);colors(hair,i,[0xded9c9,0x795035,0x543629][i]);
    for(let s=0;s<2;s++){const j=i*2+s;colors(arms,j,dress);colors(forearms,j,dress);colors(hands,j,skin);colors(ears,j,skin);colors(thighs,j,ivory);colors(shins,j,ivory);}
  }
  const batches=[torso,head,hair,arms,forearms,hands,thighs,shins,shoes,eyes,pupils,brows,ears,mouths,badges,mantles,collars,sashes,emblems,coats,coiffures,buns];
  batches.forEach(m=>{if(m.instanceColor)m.instanceColor.needsUpdate=true;});
  const dummy=new THREE.Object3D(), axis=new THREE.Vector3(0,1,0), point=new THREE.Vector3();
  const vec=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  let seatedCount=0,enteredCount=0;
  const routes=seats.map((seat,i)=>{
    const shipIndex=i<3?0:(i-2)%departures.length;
    const ship=departures[shipIndex],a=ship.spoke/10*Math.PI*2;
    const radial=vec(Math.sin(a),0,Math.cos(a)),tangent=vec(Math.cos(a),0,-Math.sin(a));
    const radius=ship.position.dot(radial),lane=(i%2?1:-1)*(.18+(i%3)*.035);
    const hatch=ship.position.clone().add(vec(-Math.sin(ship.angle)*2.60,0,-Math.cos(ship.angle)*2.60)).setY(DECK+.10);
    const points=[hatch,radial.clone().multiplyScalar(radius).addScaledVector(tangent,lane).setY(DECK),radial.clone().multiplyScalar(9.6).addScaledVector(tangent,lane).setY(DECK)];
    const ringAngle=Math.atan2(Math.sin(a),Math.cos(a));
    for(let n=1;n<=Math.max(1,Math.ceil(Math.abs(ringAngle)/.12));n++){
      const steps=Math.max(1,Math.ceil(Math.abs(ringAngle)/.12)),angle=ringAngle*(1-n/steps);
      points.push(vec(Math.sin(angle)*9.6+lane,DECK,Math.cos(angle)*9.6));
    }
    points.push(vec(lane,DECK,8.55),vec(lane,FLOOR+2.68,6.65));
    const entryIndex=points.length-1;
    points.push(vec(lane,seat.floorY,seat.radius+.28));
    for(let n=1;n<=12;n++){const angle=seat.angle*n/12;points.push(vec(Math.sin(angle)*(seat.radius+.28),seat.floorY,Math.cos(angle)*(seat.radius+.28)));}
    points.push(vec(Math.sin(seat.angle)*seat.radius,seat.floorY,Math.cos(seat.angle)*seat.radius));
    const lengths=[0];for(let n=1;n<points.length;n++)lengths.push(lengths[n-1]+points[n].distanceTo(points[n-1]));
    const start=ship.end+(i<3?.012+i*.014:.018),duration=i<3?.76:.58+(i%4)*.02;
    const entryTravel=lengths[entryIndex]/lengths[lengths.length-1]*.94;
    const entryProgress=progressFromCrowdClock(crowdClock(start)+duration*entryTravel);
    return {points,lengths,start,duration,entryTravel,entryProgress,shipIndex};
  });
  const firstEntryProgress=Math.min(...routes.map(r=>r.entryProgress));
  const lastEntryProgress=Math.max(...routes.map(r=>r.entryProgress));
  const heroPosition=new THREE.Vector3();
  function update(progress:number,time:number) {
    root.visible=progress>routes[0].start;seatedCount=0;enteredCount=0;
    for(let i=0;i<count;i++){
      const seat=seats[i],route=routes[i],start=route.start;
      const travel=THREE.MathUtils.clamp((crowdClock(progress)-crowdClock(start))/route.duration,0,1);
      const sit=smooth((travel-.94)/.06), visible=progress>start;
      if(sit>.95)seatedCount++;
      if(travel>=route.entryTravel)enteredCount++;
      const {points,lengths}=route,distance=Math.min(1,travel/.94)*lengths[lengths.length-1];
      let segment=0;while(segment<points.length-2&&distance>lengths[segment+1])segment++;
      const fraction=THREE.MathUtils.clamp((distance-lengths[segment])/Math.max(.0001,lengths[segment+1]-lengths[segment]),0,1);
      const pos=points[segment].clone().lerp(points[segment+1],fraction);
      const delta=points[segment+1].clone().sub(points[segment]);
      const facing=travel>=.94?seat.angle:Math.atan2(-delta.x,-delta.z);
      if(i===0)heroPosition.copy(pos);
      const stride=crowdClock(progress)*48*5.5+i*1.7, moving=visible&&travel<.94;
      const sway=moving?Math.sin(stride)*.025:Math.sin(time*.7+i)*.005;
      const hip=.32-sit*.02,bob=moving?Math.abs(Math.sin(stride))*.014:0;
      const personScale=.91+(i%5)*.035;
      const transform=(m:THREE.InstancedMesh,j:number,local:THREE.Vector3,scale:THREE.Vector3,q?:THREE.Quaternion)=>{
        dummy.position.copy(local).multiplyScalar(personScale).applyAxisAngle(axis,facing).add(pos);
        dummy.quaternion.setFromAxisAngle(axis,facing);if(q)dummy.quaternion.multiply(q);
        dummy.scale.copy(scale).multiplyScalar(visible?personScale:.00001);dummy.updateMatrix();m.setMatrixAt(j,dummy.matrix);
      };
      const limb=(m:THREE.InstancedMesh,j:number,a:THREE.Vector3,b:THREE.Vector3)=>{
        const d=b.clone().sub(a),q=new THREE.Quaternion().setFromUnitVectors(axis,d.clone().normalize());
        transform(m,j,a.clone().add(b).multiplyScalar(.5),vec(1,d.length(),1),q);
      };
      transform(torso,i,vec(sway,hip+.15+bob,-sit*.025),vec(1.19,1, .77));
      const faceY=hip+.39+bob,faceZ=-sit*.015;
      transform(head,i,vec(sway,faceY,faceZ),vec(1+(i%3-1)*.045,1,1));
      transform(hair,i,vec(sway,faceY+.009,faceZ+.006),vec(1.03,1.15+(i%3)*.10,1));
      transform(mouths,i,vec(sway,faceY-.036,faceZ-.069),vec(1,1,1));
      transform(badges,i,vec(sway+.041,hip+.16+bob,-.073),vec(1,1,1));
      if(i<3){
        const chest=hip+.23+bob;
        transform(mantles,i,vec(sway,chest,.005),vec(i===0?1: .78,1,1));
        transform(collars,i,vec(sway,hip+.29+bob,.008),vec(1,i===1?1.4:.65,1));
        transform(sashes,i,vec(sway,hip+.14+bob,-.085),vec(1,1,1));
        transform(emblems,i,vec(sway+.065,hip+.23+bob,-.091),vec(1,1,1));
        transform(coats,i,vec(sway,hip-.045+bob+sit*.10,.024+sit*.025),vec(1, (i===1?1.2:.7)*(1-sit*.7),1));
        transform(coiffures,i,vec(sway,faceY,faceZ),vec(i===0?1:.00001,i===0?1:.00001,i===0?1:.00001));
        transform(buns,i,vec(sway,faceY+.040,faceZ+.073),vec(i===1?1:.00001,i===1?1:.00001,i===1?1:.00001));
      }
      for(let s=0;s<2;s++){
        const sign=s===0?-1:1,j=i*2+s, swing=moving?Math.sin(stride+s*Math.PI)*.42:0;
        const h=vec(sign*.055,hip,0);
        const knee=vec(sign*.06,hip-.15*(1-sit),Math.sin(swing)*.16-sit*.17);
        const ankle=vec(sign*.06,.048,Math.sin(swing)*.25-sit*.14);
        limb(thighs,j,h,knee);limb(shins,j,knee,ankle);transform(shoes,j,ankle.clone().add(vec(0,-.018,-.035)),vec(.039,.03,.078));
        const shoulder=vec(sign*.105+sway,hip+.23+bob,0),elbow=vec(sign*.125+sway,hip+.10+bob,Math.sin(-swing)*.13-sit*.1),hand=vec(sign*.13+sway,hip-.04+bob+sit*.17,Math.sin(-swing)*.22-sit*.19);
        limb(arms,j,shoulder,elbow);limb(forearms,j,elbow,hand);transform(hands,j,hand,vec(1,1,1));
        const blinkPhase=(time+i*.719)%4.9,blink=blinkPhase<.13?Math.max(.12,Math.abs(blinkPhase-.065)/.065):1;
        point.set(sway+sign*.031,faceY+.014,faceZ-.069);
        transform(eyes,j,point,vec(.020,.010*blink,.010));
        transform(pupils,j,point.clone().add(vec(0,0,-.008)),vec(.008,.008*blink,.004));
        transform(brows,j,vec(sway+sign*.031,faceY+.034,faceZ-.069),vec(1,1,1),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2+sign*.08));
        transform(ears,j,vec(sway+sign*.077,faceY-.009,faceZ),vec(.014,.024,.014));
      }
    }
    batches.forEach(m=>m.instanceMatrix.needsUpdate=true);
  }
  root.userData.routes=routes.map(r=>({start:r.start,shipIndex:r.shipIndex,entryProgress:r.entryProgress,points:r.points.map(p=>p.toArray())}));
  root.userData.delegation={nation:'Aurelian Tide',roles:['Ambassador','Scholar','Navigator'],shipIndex:0};
  return {root,update,count,firstEntryProgress,lastEntryProgress,getHeroPosition:()=>heroPosition,getEnteredCount:()=>enteredCount,getSeatedCount:()=>seatedCount};
}
