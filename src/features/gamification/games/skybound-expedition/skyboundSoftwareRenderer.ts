import {
  getSkyboundCourseObjects,
  getSkyboundGroundHeight,
  getSkyboundLevel,
  type SkyboundFlightState,
  type SkyboundLevelId,
} from '../../level-worlds/services/skyboundExpeditionFlight';
import type { SkyboundAircraftId } from '../../level-worlds/services/skyboundPilotAcademy';
import type { SkyboundAimView } from './skyboundExpeditionRenderer';
import { getSkyboundLaunchFacility, type SkyboundLaunchFacilityPresentation } from './skyboundLaunchFacilities';
import { getSkyboundWorldPresentation, type SkyboundWorldLandmark, type SkyboundWorldPresentation } from './skyboundWorldPresentation';

type SoftwarePhase = 'aiming' | 'flying' | 'result';

export interface SkyboundSoftwareRendererInput {
  canvas: HTMLCanvasElement;
  levelId: SkyboundLevelId;
  goalDistance: number;
  aircraftId: SkyboundAircraftId;
  assemblyLevel: number;
  getFlight: () => SkyboundFlightState | null;
  getPhase: () => SoftwarePhase;
  getAim: () => SkyboundAimView;
  isBoosting: () => boolean;
  isStabilizing: () => boolean;
}

interface ProjectedPoint { x:number; y:number; scale:number; depth:number; }
interface FloatingIsland { id:number; x:number; y:number; z:number; radius:number; tower:boolean; }

function seeded(index:number,salt:number) {
  const value=Math.sin((index+1)*12.9898+salt*78.233)*43758.5453;
  return value-Math.floor(value);
}

function clamp(value:number,minimum:number,maximum:number) {
  return Math.max(minimum,Math.min(maximum,value));
}

function createFloatingIslands(goalDistance:number):FloatingIsland[] {
  const islands:FloatingIsland[]=[{id:0,x:0,y:1,z:0,radius:24,tower:false}];
  const count=Math.ceil(goalDistance/58)+8;
  for(let index=1;index<count;index+=1) {
    const side=index%2===0?-1:1;
    islands.push({
      id:index,
      x:side*(22+seeded(index,4)*26),
      y:10+seeded(index,7)*48,
      z:index*58+seeded(index,2)*25,
      radius:9+seeded(index,9)*10,
      tower:index%7===0,
    });
  }
  islands.push({id:count+1,x:0,y:18,z:goalDistance,radius:31,tower:true});
  return islands;
}

function roundedRect(context:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,radius:number) {
  const r=Math.min(radius,width/2,height/2);
  context.beginPath();
  context.moveTo(x+r,y);
  context.arcTo(x+width,y,x+width,y+height,r);
  context.arcTo(x+width,y+height,x,y+height,r);
  context.arcTo(x,y+height,x,y,r);
  context.arcTo(x,y,x+width,y,r);
  context.closePath();
}

function drawDiamond(context:CanvasRenderingContext2D,x:number,y:number,size:number,time:number) {
  context.save();
  context.translate(x,y);
  context.scale(.72+Math.abs(Math.sin(time*.002))*0.28,1);
  context.shadowBlur=size*.7;
  context.shadowColor='#ffd846';
  const gradient=context.createLinearGradient(-size,-size,size,size);
  gradient.addColorStop(0,'#fff9b0');
  gradient.addColorStop(.28,'#ffd846');
  gradient.addColorStop(.72,'#e78b12');
  gradient.addColorStop(1,'#fff0a0');
  context.fillStyle=gradient;
  context.beginPath();
  context.moveTo(0,-size);
  context.lineTo(size*.68,0);
  context.lineTo(0,size);
  context.lineTo(-size*.68,0);
  context.closePath();
  context.fill();
  context.strokeStyle='rgba(255,255,255,.78)';
  context.lineWidth=Math.max(1,size*.07);
  context.beginPath();
  context.moveTo(0,-size);
  context.lineTo(0,size);
  context.moveTo(-size*.68,0);
  context.lineTo(size*.68,0);
  context.stroke();
  context.restore();
}

function drawRing(context:CanvasRenderingContext2D,p:ProjectedPoint,radius:number,time:number) {
  const size=Math.max(7,radius*p.scale*.31);
  const pulse=1+Math.sin(time*.004+p.depth)*.045;
  context.save();
  context.translate(p.x,p.y);
  context.scale(1,pulse);
  context.shadowBlur=Math.min(28,size*.45);
  context.shadowColor='#4cf2ff';
  context.strokeStyle='rgba(105,246,255,.96)';
  context.lineWidth=clamp(p.scale*.28,2,9);
  context.beginPath();
  context.ellipse(0,0,size,size*.94,0,0,Math.PI*2);
  context.stroke();
  context.shadowBlur=0;
  context.strokeStyle='rgba(255,255,255,.78)';
  context.lineWidth=clamp(p.scale*.07,1,2.5);
  context.beginPath();
  context.ellipse(0,0,size*.86,size*.8,0,0,Math.PI*2);
  context.stroke();
  for(let index=0;index<8;index+=1) {
    const angle=(index/8)*Math.PI*2+time*.00025;
    context.fillStyle=index%2===0?'#fff4a6':'#5ceeff';
    context.fillRect(Math.cos(angle)*size*.98-1.5,Math.sin(angle)*size*.93-1.5,3,3);
  }
  context.restore();
}

function drawHazard(context:CanvasRenderingContext2D,p:ProjectedPoint,radius:number,time:number) {
  const size=Math.max(8,radius*p.scale*.26);
  context.save();
  context.translate(p.x,p.y);
  context.rotate(Math.sin(time*.001+p.depth)*.09);
  const rock=context.createRadialGradient(-size*.3,-size*.4,size*.1,0,0,size);
  rock.addColorStop(0,'#f5efe3');
  rock.addColorStop(.45,'#a99a8c');
  rock.addColorStop(1,'#574d4d');
  context.fillStyle=rock;
  context.shadowColor='rgba(19,20,34,.45)';
  context.shadowBlur=size*.45;
  context.beginPath();
  for(let index=0;index<10;index+=1) {
    const angle=(index/10)*Math.PI*2;
    const variation=.82+seeded(index,Math.round(p.depth))*.22;
    const x=Math.cos(angle)*size*variation;
    const y=Math.sin(angle)*size*variation;
    if(index===0)context.moveTo(x,y);else context.lineTo(x,y);
  }
  context.closePath();
  context.fill();
  context.shadowBlur=0;
  if(size>17) {
    context.fillStyle='#f8f4e8';
    context.beginPath();
    context.moveTo(0,-size*.55);
    context.lineTo(size*.48,size*.35);
    context.lineTo(-size*.48,size*.35);
    context.closePath();
    context.fill();
    context.strokeStyle='#c6372e';
    context.lineWidth=Math.max(2,size*.1);
    context.stroke();
    context.fillStyle='#c6372e';
    context.font=`900 ${Math.max(9,size*.52)}px system-ui`;
    context.textAlign='center';
    context.fillText('!',0,size*.25);
  }
  context.restore();
}

function drawTower(context:CanvasRenderingContext2D,p:ProjectedPoint,radius:number,accent:string) {
  const scale=clamp(p.scale*.82,.2,4.2);
  const towerHeight=34*scale;
  context.save();
  context.translate(p.x,p.y-radius*p.scale*.1);
  context.fillStyle='#f5f0df';
  context.strokeStyle='#d3aa3c';
  context.lineWidth=Math.max(1,scale*1.2);
  context.beginPath();
  context.moveTo(-7*scale,0);
  context.lineTo(-5*scale,-towerHeight);
  context.lineTo(5*scale,-towerHeight);
  context.lineTo(7*scale,0);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle='#143d6b';
  for(let floor=0;floor<4;floor+=1)context.fillRect(-3.6*scale,-towerHeight+7*scale+floor*7*scale,7.2*scale,2.2*scale);
  context.fillStyle=accent;
  context.beginPath();
  context.moveTo(-8*scale,-towerHeight);
  context.lineTo(0,-towerHeight-9*scale);
  context.lineTo(8*scale,-towerHeight);
  context.closePath();
  context.fill();
  context.restore();
}

function drawFloatingIsland(
  context:CanvasRenderingContext2D,
  p:ProjectedPoint,
  island:FloatingIsland,
  accent:string,
  world:SkyboundWorldPresentation,
) {
  const radius=clamp(island.radius*p.scale*.48,3,180);
  if(radius<3||p.y<-220||p.y>900)return;
  context.save();
  context.translate(p.x,p.y);
  const cliff=context.createLinearGradient(0,0,0,radius*2.3);
  cliff.addColorStop(0,world.cliffColor);
  cliff.addColorStop(.42,'#3d4050');
  cliff.addColorStop(1,'rgba(39,38,49,.15)');
  context.fillStyle=cliff;
  context.beginPath();
  context.moveTo(-radius*.92,0);
  context.quadraticCurveTo(-radius*.5,radius*1.25,0,radius*2.3);
  context.quadraticCurveTo(radius*.55,radius*1.18,radius*.92,0);
  context.closePath();
  context.fill();
  context.strokeStyle='rgba(41,37,39,.28)';
  context.lineWidth=Math.max(1,radius*.035);
  for(let vein=-2;vein<=2;vein+=1) {
    context.beginPath();
    context.moveTo(vein*radius*.28,radius*.16);
    context.lineTo(vein*radius*.14,radius*(1.45+Math.abs(vein)*.12));
    context.stroke();
  }
  const grass=context.createLinearGradient(0,-radius*.22,0,radius*.2);
  grass.addColorStop(0,world.surfaceColor);
  grass.addColorStop(.45,world.surfaceColor);
  grass.addColorStop(1,world.cliffColor);
  context.fillStyle=grass;
  context.beginPath();
  context.ellipse(0,0,radius,radius*.28,0,0,Math.PI*2);
  context.fill();
  context.strokeStyle='rgba(226,255,179,.8)';
  context.lineWidth=Math.max(1,radius*.025);
  context.beginPath();
  context.ellipse(0,-radius*.04,radius*.88,radius*.21,0,Math.PI,Math.PI*2);
  context.stroke();
  if(island.tower&&radius>10)drawTower(context,{...p,x:0,y:0},radius,accent);
  context.restore();
}

function drawCloud(
  context:CanvasRenderingContext2D,
  p:ProjectedPoint,
  radius:number,
  opacity:number,
) {
  const size=clamp(radius*p.scale*.55,5,130);
  context.save();
  context.globalAlpha=opacity;
  context.fillStyle='#f5fbff';
  context.shadowColor='rgba(255,255,255,.35)';
  context.shadowBlur=size*.35;
  for(let index=0;index<5;index+=1) {
    context.beginPath();
    context.ellipse(p.x+(index-2)*size*.42,p.y-Math.abs(index-2)*size*.08,size*(.6+index*.04),size*.32,0,0,Math.PI*2);
    context.fill();
  }
  context.restore();
}

function drawWorldLandmark(
  context:CanvasRenderingContext2D,
  p:ProjectedPoint,
  landmark:SkyboundWorldLandmark,
  accent:string,
  time:number,
) {
  if(p.depth<4||p.depth>650||p.y<-240||p.y>950)return;
  const unit=clamp(p.scale*landmark.scale,.18,4.5);
  context.save();context.translate(p.x,p.y);context.lineCap='round';context.lineJoin='round';
  if(landmark.kind==='academy_tower') {
    drawTower(context,{...p,x:0,y:0},20*landmark.scale,accent);
  } else if(landmark.kind==='wind_turbine') {
    context.strokeStyle='#eef9f6';context.lineWidth=Math.max(2,unit*1.5);context.beginPath();context.moveTo(0,0);context.lineTo(0,-22*unit);context.stroke();
    context.translate(0,-22*unit);context.rotate(time*.0012);for(let blade=0;blade<3;blade+=1){context.rotate(Math.PI*2/3);context.fillStyle='#f7fffd';context.fillRect(-unit*.7,-unit*.8,unit*1.4,-8*unit);}context.fillStyle=accent;context.beginPath();context.arc(0,0,unit*1.2,0,Math.PI*2);context.fill();
  } else if(landmark.kind==='training_balloon') {
    context.fillStyle='#fff0b4';context.strokeStyle='#e85b58';context.lineWidth=Math.max(2,unit*1.3);context.beginPath();context.ellipse(0,Math.sin(time*.0011)*unit*2,6*unit,8*unit,0,0,Math.PI*2);context.fill();context.stroke();context.strokeStyle='#39d8e8';context.beginPath();context.moveTo(-5*unit,0);context.lineTo(5*unit,0);context.stroke();context.fillStyle='#5a3a2b';context.fillRect(-1.5*unit,9*unit,3*unit,2.5*unit);
  } else if(landmark.kind==='lighthouse') {
    context.fillStyle='#f7efe2';context.strokeStyle='#d84b45';context.lineWidth=Math.max(2,unit*1.6);context.beginPath();context.moveTo(-3*unit,0);context.lineTo(-2*unit,-20*unit);context.lineTo(2*unit,-20*unit);context.lineTo(3*unit,0);context.closePath();context.fill();context.stroke();context.fillStyle=accent;context.beginPath();context.arc(0,-21*unit,1.6*unit,0,Math.PI*2);context.fill();context.rotate(time*.00075);const beam=context.createLinearGradient(0,0,22*unit,0);beam.addColorStop(0,'rgba(255,244,171,.6)');beam.addColorStop(1,'rgba(255,244,171,0)');context.fillStyle=beam;context.beginPath();context.moveTo(0,-21*unit);context.lineTo(24*unit,-25*unit);context.lineTo(24*unit,-17*unit);context.closePath();context.fill();
  } else if(landmark.kind==='sea_stack'||landmark.kind==='mesa') {
    const mesa=landmark.kind==='mesa';context.fillStyle=mesa?'#9d5137':'#526973';for(let stack=0;stack<3;stack+=1){const h=(mesa?18:13)*unit+stack*3*unit;const w=(mesa?7:5)*unit-stack*.6*unit;context.fillRect((stack-1)*7*unit-w/2,-h,w,h);context.fillStyle=stack%2?accent:(mesa?'#9d5137':'#526973');}
  } else if(landmark.kind==='coastal_arch'||landmark.kind==='rock_arch') {
    context.strokeStyle=landmark.kind==='rock_arch'?'#9c5137':'#596b72';context.lineWidth=Math.max(5,unit*4);context.beginPath();context.arc(0,0,9*unit,Math.PI,Math.PI*2);context.stroke();context.beginPath();context.moveTo(-9*unit,0);context.lineTo(-9*unit,10*unit);context.moveTo(9*unit,0);context.lineTo(9*unit,10*unit);context.stroke();
  } else if(landmark.kind==='thermal_column') {
    context.strokeStyle='rgba(255,224,126,.62)';context.lineWidth=Math.max(1,unit);for(let ring=0;ring<5;ring+=1){const phase=(time*.001+ring*.22)%1;context.beginPath();context.ellipse(0,(8-ring*5-phase*5)*unit,(4+ring*.8)*unit,unit*1.2,phase,0,Math.PI*2);context.stroke();}
  } else if(landmark.kind==='thunderhead') {
    context.globalAlpha=.82;context.fillStyle='#46536b';for(let puff=0;puff<7;puff+=1){context.beginPath();context.ellipse((puff-3)*3.5*unit,-seeded(puff,4)*4*unit,(4+seeded(puff,8)*3)*unit,3.2*unit,0,0,Math.PI*2);context.fill();}
  } else if(landmark.kind==='lightning_beacon'||landmark.kind==='storm_spire') {
    context.fillStyle='#293047';const count=landmark.kind==='storm_spire'?3:1;for(let spike=0;spike<count;spike+=1){const x=(spike-(count-1)/2)*6*unit;context.beginPath();context.moveTo(x,-27*unit-spike*4*unit);context.lineTo(x-3*unit,0);context.lineTo(x+3*unit,0);context.fill();}if(landmark.kind==='lightning_beacon'&&Math.sin(time*.013)>.75){context.strokeStyle='#d9f8ff';context.lineWidth=Math.max(1.5,unit*1.4);context.beginPath();context.moveTo(0,-31*unit);context.lineTo(-3*unit,-23*unit);context.lineTo(2*unit,-16*unit);context.lineTo(-1*unit,-9*unit);context.stroke();}
  } else if(landmark.kind==='aurora') {
    context.globalCompositeOperation='screen';for(let ribbon=0;ribbon<3;ribbon+=1){context.strokeStyle=ribbon===1?'rgba(103,246,210,.3)':'rgba(113,154,255,.24)';context.lineWidth=(5+ribbon*2)*unit;context.beginPath();for(let x=-18;x<=18;x+=3){const y=Math.sin(x*.25+time*.001+ribbon)*3+ribbon*5;if(x===-18)context.moveTo(x*unit,y*unit);else context.lineTo(x*unit,y*unit);}context.stroke();}
  } else if(landmark.kind==='orbital_marker') {
    context.strokeStyle=accent;context.lineWidth=Math.max(2,unit*1.2);context.beginPath();context.ellipse(0,0,8*unit,8*unit,.45,0,Math.PI*2);context.stroke();context.fillStyle='#246ca1';context.fillRect(-14*unit,-1.5*unit,7*unit,3*unit);context.fillRect(7*unit,-1.5*unit,7*unit,3*unit);
  } else if(landmark.kind==='star_cluster') {
    context.fillStyle='#fff1b6';for(let star=0;star<42;star+=1){const x=(seeded(star,2)-.5)*48*unit;const y=(seeded(star,5)-.5)*26*unit;const s=.5+seeded(star,8)*1.4;context.fillRect(x,y,s,s);}
  }
  context.restore();
}

interface AircraftPoint3 { x:number; y:number; z:number; }
interface AircraftFace3 { points:AircraftPoint3[]; color:string; shade:number; }

function shadeHex(color:string,factor:number) {
  const value=Number.parseInt(color.slice(1),16);
  const channel=(shift:number)=>clamp(Math.round(((value>>shift)&255)*factor),0,255);
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

function drawSoftwareAircraft3d(
  context:CanvasRenderingContext2D,
  aircraftId:SkyboundAircraftId,
  boosting:boolean,
  time:number,
  detached:readonly string[],
  struggling=false,
  pitch=0,
  bank=0,
  vaporStrength=0,
  assemblyLevel=4,
) {
  const colors:Record<SkyboundAircraftId,[string,string,string]>={
    toy_glider:['#f7efeb','#0b2949','#f2bd45'],
    prop_trainer:['#edf3e8','#235b88','#efb83e'],
    jet_trainer:['#e2eff5','#153e69','#50e5ef'],
    storm_interceptor:['#34466d','#151d37','#9c7ae8'],
    goldwing_fighter:['#fff9df','#162947','#f3ce4e'],
  };
  const [primary,secondary,accent]=colors[aircraftId];
  const faces:AircraftFace3[]=[];
  const addPrism=(id:string,outline:readonly [number,number][],halfHeight:number,color:string,transform?:(point:AircraftPoint3)=>AircraftPoint3)=>{
    if(detached.includes(id))return;
    const top=outline.map(([x,z])=>({x,y:halfHeight,z}));
    const bottom=outline.map(([x,z])=>({x,y:-halfHeight,z}));
    const apply=(points:AircraftPoint3[])=>transform?points.map(transform):points;
    faces.push({points:apply(top),color,shade:1.08},{points:apply([...bottom].reverse()),color,shade:.58});
    for(let index=0;index<outline.length;index+=1){const next=(index+1)%outline.length;faces.push({points:apply([top[index],top[next],bottom[next],bottom[index]]),color,shade:.78+(index%2)*.08});}
  };
  const rotateControl=(hingeZ:number,angle:number)=>(point:AircraftPoint3)=>{
    const z=point.z-hingeZ;const cosine=Math.cos(angle);const sine=Math.sin(angle);
    return{x:point.x,y:point.y*cosine-z*sine,z:hingeZ+point.y*sine+z*cosine};
  };

  const flutter=struggling?Math.sin(time*.027)*.16:0;
  const wingSweep=aircraftId==='jet_trainer'?.5:aircraftId==='storm_interceptor'?.72:aircraftId==='goldwing_fighter'?.42:0;
  addPrism('left-wing',[[0,.58],[-3.25,-.05+wingSweep],[-2.82,-.82+wingSweep],[0,-.38]],.095,primary);
  addPrism('right-wing',[[0,.58],[3.25,-.05+wingSweep],[2.82,-.82+wingSweep],[0,-.38]],.095,primary);
  addPrism('left-aileron',[[-3.02,-.72+wingSweep],[-1.2,-.48],[-.48,-.35],[-2.78,-.98+wingSweep]],.07,secondary,rotateControl(-.5,clamp(-bank*.45+flutter,-.42,.42)));
  addPrism('right-aileron',[[3.02,-.72+wingSweep],[1.2,-.48],[.48,-.35],[2.78,-.98+wingSweep]],.07,secondary,rotateControl(-.5,clamp(bank*.45-flutter,-.42,.42)));
  addPrism('left-tailplane',[[0,-1.28],[-1.25,-1.45],[-1.08,-1.93],[0,-1.72]],.07,primary);
  addPrism('right-tailplane',[[0,-1.28],[1.25,-1.45],[1.08,-1.93],[0,-1.72]],.07,primary);
  addPrism('left-elevator',[[-1.12,-1.82],[-.15,-1.65],[-.08,-1.88],[-1,-2.05]],.055,accent,rotateControl(-1.75,clamp(-pitch*.28+flutter*.5,-.34,.34)));
  addPrism('right-elevator',[[1.12,-1.82],[.15,-1.65],[.08,-1.88],[1,-2.05]],.055,accent,rotateControl(-1.75,clamp(-pitch*.28+flutter*.5,-.34,.34)));

  const ringZ=[-1.9,-1.25,-.25,.75,1.55,2.05];
  const ringX=[.25,.48,.62,.58,.43,.18];
  const ringY=[.22,.39,.48,.45,.32,.15];
  const fuselageRings=ringZ.map((z,ringIndex)=>Array.from({length:8},(_,index)=>{const angle=(index/8)*Math.PI*2;return{x:Math.cos(angle)*ringX[ringIndex],y:Math.sin(angle)*ringY[ringIndex],z};}));
  for(let ring=0;ring<fuselageRings.length-1;ring+=1){for(let index=0;index<8;index+=1){const next=(index+1)%8;faces.push({points:[fuselageRings[ring][index],fuselageRings[ring][next],fuselageRings[ring+1][next],fuselageRings[ring+1][index]],color:index<4?secondary:primary,shade:.68+((index+2)%5)*.095});}}
  if(!detached.includes('nose-cap'))faces.push({points:[...fuselageRings[fuselageRings.length-1]],color:accent,shade:1.1});

  if(!detached.includes('canopy')){
    const canopyBase=Array.from({length:10},(_,index)=>{const angle=(index/10)*Math.PI*2;return{x:Math.cos(angle)*.38,y:.4+Math.max(0,Math.sin(angle))*.36,z:.38+Math.sin(angle)*.62};});
    const canopyTop={x:0,y:.83,z:.42};
    for(let index=0;index<10;index+=1){faces.push({points:[canopyBase[index],canopyBase[(index+1)%10],canopyTop],color:'#64e9f4',shade:.7+(index%3)*.12});}
  }

  if(!detached.includes('tail-fin')){
    const left=[{x:-.075,y:.05,z:-1.45},{x:-.075,y:1.05,z:-1.72},{x:-.075,y:.45,z:-2.05},{x:-.075,y:.05,z:-1.95}];
    const right=left.map((point)=>({...point,x:.075}));
    faces.push({points:left,color:secondary,shade:.72},{points:[...right].reverse(),color:secondary,shade:.96});
    for(let index=0;index<4;index+=1){const next=(index+1)%4;faces.push({points:[left[index],left[next],right[next],right[index]],color:index===1?accent:secondary,shade:.82});}
  }

  const yaw=-.31;const elevation=.42+clamp(pitch,-.7,.8)*.08;const cosineYaw=Math.cos(yaw);const sineYaw=Math.sin(yaw);const cosineElevation=Math.cos(elevation);const sineElevation=Math.sin(elevation);
  const projectPoint=(point:AircraftPoint3)=>{const x=point.x*cosineYaw-point.z*sineYaw;const z=point.x*sineYaw+point.z*cosineYaw;return{x:x*28,y:-(point.y*cosineElevation+z*sineElevation)*28,depth:z*cosineElevation-point.y*sineElevation};};
  const projected=faces.map((face)=>({face,points:face.points.map(projectPoint),depth:face.points.reduce((sum,point)=>sum+projectPoint(point).depth,0)/face.points.length})).sort((a,b)=>b.depth-a.depth);
  if(vaporStrength>.05){context.strokeStyle=`rgba(218,250,255,${clamp(vaporStrength*.5,0,.48)})`;context.lineWidth=2+vaporStrength*2;for(const side of [-1,1]){const tip=projectPoint({x:side*2.7,y:0,z:-.35});const tail=projectPoint({x:side*2.5,y:-.08,z:-3.7-vaporStrength*2.4});context.beginPath();context.moveTo(tip.x,tip.y);context.lineTo(tail.x,tail.y);context.stroke();}}
  if(boosting) {
    const tail=projectPoint({x:0,y:0,z:-2});const flame=context.createLinearGradient(tail.x,tail.y,tail.x,tail.y+86);
    flame.addColorStop(0,'#fff');flame.addColorStop(.3,'#64f5ff');flame.addColorStop(1,'rgba(47,170,255,0)');
    context.fillStyle=flame;
    context.beginPath();context.moveTo(tail.x-7,tail.y+5);context.lineTo(tail.x,tail.y+78+Math.sin(time*.03)*12);context.lineTo(tail.x+7,tail.y+5);context.fill();
  }
  context.lineJoin='round';context.lineWidth=.9;
  for(const item of projected){const [first,...rest]=item.points;context.beginPath();context.moveTo(first.x,first.y);for(const point of rest)context.lineTo(point.x,point.y);context.closePath();context.fillStyle=shadeHex(item.face.color,item.face.shade);context.fill();context.strokeStyle='rgba(4,24,44,.28)';context.stroke();}
  for(const side of [-1,1]){const light=projectPoint({x:side*2.62,y:.08,z:-.28});context.fillStyle=side<0?'#ff625a':'#70ffac';context.shadowColor=context.fillStyle;context.shadowBlur=8;context.beginPath();context.arc(light.x,light.y,2.2,0,Math.PI*2);context.fill();context.shadowBlur=0;}
  if(aircraftId==='prop_trainer'&&assemblyLevel>=4){
    const hub=projectPoint({x:0,y:0,z:2.2});const angle=time*.028;context.save();context.translate(hub.x,hub.y);context.rotate(angle);context.strokeStyle='#142b45';context.lineWidth=6;context.lineCap='round';context.beginPath();context.moveTo(-35,0);context.lineTo(35,0);context.moveTo(0,-35);context.lineTo(0,35);context.stroke();context.fillStyle=accent;context.beginPath();context.arc(0,0,7,0,Math.PI*2);context.fill();context.restore();
  }
}

function drawLaunchFacility(
  context:CanvasRenderingContext2D,
  width:number,
  height:number,
  facility:SkyboundLaunchFacilityPresentation,
  aim:SkyboundAimView,
  planeX:number,
  planeY:number,
  time:number,
) {
  const launchY=height*.82;
  context.save();
  const deck=context.createLinearGradient(0,height*.5,0,height);
  deck.addColorStop(0,facility.deckColor);deck.addColorStop(1,'#101927');
  context.fillStyle=deck;context.beginPath();context.moveTo(width*.41,height*.51);context.lineTo(width*.59,height*.51);context.lineTo(width*.86,height);context.lineTo(width*.14,height);context.closePath();context.fill();
  context.strokeStyle=facility.edgeColor;context.lineWidth=3;context.beginPath();context.moveTo(width*.42,height*.52);context.lineTo(width*.2,height);context.moveTo(width*.58,height*.52);context.lineTo(width*.8,height);context.stroke();
  context.fillStyle='rgba(7,20,34,.76)';roundedRect(context,width*.29,height*.505,width*.42,23,8);context.fill();context.fillStyle=facility.edgeColor;context.font='900 9px system-ui';context.textAlign='center';context.fillText(facility.name,width*.5,height*.505+15);

  if(facility.kind==='slingshot'){
    const wood=context.createLinearGradient(0,launchY-120,0,launchY+80);wood.addColorStop(0,'#b87938');wood.addColorStop(.45,'#6c381e');wood.addColorStop(1,'#2e1d21');
    context.strokeStyle=wood;context.lineWidth=clamp(width*.035,13,25);context.lineCap='round';context.beginPath();context.moveTo(width*.34,launchY+70);context.lineTo(width*.4,launchY-88);context.moveTo(width*.66,launchY+70);context.lineTo(width*.6,launchY-88);context.stroke();
    context.strokeStyle=facility.energyColor;context.lineWidth=5+aim.power*2.5;context.shadowBlur=12+aim.power*18;context.shadowColor=facility.energyColor;context.beginPath();context.moveTo(width*.4,launchY-88);context.lineTo(planeX-8,planeY+24);context.moveTo(width*.6,launchY-88);context.lineTo(planeX+8,planeY+24);context.stroke();context.shadowBlur=0;
  }else{
    context.strokeStyle=facility.kind==='runway'?'rgba(255,255,255,.86)':facility.energyColor;context.lineWidth=facility.kind==='runway'?3:5;context.setLineDash(facility.kind==='runway'?[12,12]:[]);context.beginPath();context.moveTo(width*.5,height*.54);context.lineTo(width*.5,height);context.stroke();context.setLineDash([]);
    const pulse=.55+aim.power*.45+Math.sin(time*.012)*.08;context.fillStyle=facility.energyColor;context.shadowColor=facility.energyColor;context.shadowBlur=8+aim.power*18;
    for(const side of [-1,1]){for(let lamp=0;lamp<7;lamp+=1){const t=lamp/6;const x=width*.5+side*(width*(.085+t*.235));const y=height*(.56+t*.39);context.globalAlpha=.42+pulse*.5;context.beginPath();context.arc(x,y,2+t*2.2,0,Math.PI*2);context.fill();}}context.globalAlpha=1;context.shadowBlur=0;
    if(facility.kind==='runway'){
      context.strokeStyle='#eef6f7';context.lineWidth=7;context.beginPath();context.arc(width*.28,height*.61,width*.105,Math.PI,0);context.stroke();context.fillStyle='#ff7550';context.fillRect(width*.73,height*.55,20,7);context.strokeStyle='#e9eef1';context.lineWidth=2;context.beginPath();context.moveTo(width*.73,height*.55);context.lineTo(width*.73,height*.64);context.stroke();
    }else if(facility.kind==='boost_runway'){
      context.fillStyle='#a95c33';for(const side of [-1,1]){context.save();context.translate(width*.5+side*width*.19,height*.66);context.rotate(side*.14);context.fillRect(-24,-7,48,25);context.restore();}context.strokeStyle=facility.energyColor;context.lineWidth=4;for(const side of [-1,1]){context.beginPath();context.moveTo(width*.5+side*width*.1,height*.58);context.lineTo(width*.5+side*width*.17,height*.92);context.stroke();}
    }else if(facility.kind==='storm_catapult'){
      context.fillStyle='rgba(190,151,255,.72)';roundedRect(context,width*.41,height*.71,width*.18,42,8);context.fill();context.strokeStyle=facility.energyColor;context.lineWidth=4;for(const side of [-1,1]){for(let coil=0;coil<3;coil+=1){context.beginPath();context.ellipse(width*.5+side*width*.27,height*(.61+coil*.095),12+coil*3,20+coil*2,0,0,Math.PI*2);context.stroke();}}
    }else{
      context.strokeStyle=facility.energyColor;context.lineWidth=4;context.shadowColor=facility.energyColor;context.shadowBlur=14+aim.power*20;for(let arch=0;arch<4;arch+=1){const y=height*(.55+arch*.075);const radius=width*(.12+arch*.045);context.beginPath();context.arc(width*.5,y,radius,Math.PI,0);context.stroke();}context.shadowBlur=0;
    }
  }
  if(aim.power>.03){context.strokeStyle=`${facility.energyColor}${Math.round((.2+aim.power*.65)*255).toString(16).padStart(2,'0')}`;context.lineWidth=3;context.beginPath();context.ellipse(planeX,planeY,75+aim.power*14,42+aim.power*9,time*.001,0,Math.PI*2);context.stroke();}
  context.restore();
}

export function startSkyboundSoftwareRenderer(input:SkyboundSoftwareRendererInput) {
  const {canvas}=input;
  const context=canvas.getContext('2d');
  if(!context)return()=>undefined;
  const level=getSkyboundLevel(input.levelId);
  const world=getSkyboundWorldPresentation(input.levelId);
  const launchFacility=getSkyboundLaunchFacility(input.aircraftId);
  const course=getSkyboundCourseObjects(input.levelId,input.goalDistance);
  const islands=createFloatingIslands(input.goalDistance);
  let width=1;
  let height=1;
  let frame=0;
  let lastImpactSerial=0;
  let previousSalvage=0;
  let previousRings=0;
  let previousNearMisses=0;
  let feedbackText='';
  let feedbackColor='#ffffff';
  let feedbackAge=0;
  let shake=0;
  let previousTime=performance.now();
  let elapsed=0;
  const resize=()=>{
    const rect=canvas.getBoundingClientRect();
    const ratio=Math.min(window.devicePixelRatio||1,1.6);
    width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
  };
  const observer=new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const animate=(time:number)=>{
    const dt=Math.min(.05,Math.max(0,(time-previousTime)/1000));
    previousTime=time;elapsed+=dt;
    const flight=input.getFlight();
    const phase=input.getPhase();
    const aim=input.getAim();
    const distance=flight?.x??0;
    const altitude=flight?.y??7;
    const lateral=flight?.lateralX??0;
    const speed=flight?Math.hypot(flight.vx,flight.vy):0;
    const speedEnergy=clamp((speed-18)/58,0,1);
    if(flight&&flight.impactSerial!==lastImpactSerial){
      shake=1;lastImpactSerial=flight.impactSerial;feedbackText='IMPACT!';feedbackColor='#ff8a6e';feedbackAge=1;
    } else if(flight&&flight.ringsCleared>previousRings) {
      feedbackText='WIND GATE  +2 STREAK';feedbackColor='#8ff8ff';feedbackAge=1;
    } else if(flight&&flight.salvageCollected>previousSalvage) {
      feedbackText='ACADEMY CREST  +1';feedbackColor='#ffe47d';feedbackAge=.82;
    } else if(flight&&flight.nearMisses>previousNearMisses) {
      feedbackText='NEAR MISS  +1 STREAK';feedbackColor='#ffda77';feedbackAge=1;
    }
    if(flight){previousSalvage=flight.salvageCollected;previousRings=flight.ringsCleared;previousNearMisses=flight.nearMisses;}
    else {previousSalvage=0;previousRings=0;previousNearMisses=0;}
    feedbackAge=Math.max(0,feedbackAge-dt);
    const pitch=flight?.pitchRad??aim.angleDeg*Math.PI/180;
    const horizon=height*(.43+clamp(pitch,-.7,.8)*.12);
    const focal=Math.min(width,height)*(1.16-speedEnergy*.14-(input.isBoosting() ? 0.08 : 0));
    const project=(worldX:number,worldY:number,worldZ:number):ProjectedPoint=>{
      const depth=Math.max(4,worldZ-distance+16);
      const scale=focal/depth;
      return {x:width/2+(worldX-lateral)*scale,y:horizon-(worldY-altitude)*scale,scale,depth};
    };

    const sky=context.createLinearGradient(0,0,0,height);
    if(input.levelId==='storm'){sky.addColorStop(0,'#101b3c');sky.addColorStop(.55,'#51668e');sky.addColorStop(1,'#b3c5d6');}
    else if(input.levelId==='stratosphere'){sky.addColorStop(0,'#04122d');sky.addColorStop(.56,'#3c7dc5');sky.addColorStop(1,'#e0f5ff');}
    else {sky.addColorStop(0,level.skyTop);sky.addColorStop(.58,world.hazeColor);sky.addColorStop(1,world.lowerDeckColor);}
    context.fillStyle=sky;context.fillRect(0,0,width,height);

    const sunX=width*.78-distance*.035;
    const sunY=height*.17;
    const sun=context.createRadialGradient(sunX,sunY,0,sunX,sunY,height*.18);
    sun.addColorStop(0,'rgba(255,249,194,.9)');sun.addColorStop(.2,'rgba(255,226,129,.35)');sun.addColorStop(1,'rgba(255,226,129,0)');
    context.fillStyle=sun;context.fillRect(0,0,width,height*.55);

    if(input.levelId==='stratosphere'){context.fillStyle='rgba(255,241,182,.82)';for(let star=0;star<80;star+=1){context.fillRect(seeded(star,2)*width,seeded(star,5)*height*.58,seeded(star,8)*1.8+.4,seeded(star,8)*1.8+.4);}}

    for(let index=0;index<world.cloudCount;index+=1) {
      const cloudZ=20+index*47;
      const cloudBase=world.groundedTrainingField?level.targetAltitudeMax+8:4;
      const cloudSpan=world.groundedTrainingField?18:78;
      const p=project((seeded(index,3)-.5)*90,cloudBase+seeded(index,8)*cloudSpan,cloudZ);
      if(p.depth>4&&p.depth<560)drawCloud(context,p,10+seeded(index,5)*14,world.cloudOpacity*(.58+seeded(index,1)*.36));
    }

    if(world.groundedTrainingField){
      for(let far=500;far>4;far-=18){
        const near=Math.max(4,far-18);
        const zFar=distance+far;const zNear=distance+near;
        const farLeft=project(-72,getSkyboundGroundHeight(input.levelId,zFar),zFar);
        const farRight=project(72,getSkyboundGroundHeight(input.levelId,zFar),zFar);
        const nearLeft=project(-72,getSkyboundGroundHeight(input.levelId,zNear),zNear);
        const nearRight=project(72,getSkyboundGroundHeight(input.levelId,zNear),zNear);
        context.fillStyle=Math.floor(far/18)%2===0?'#579c47':'#63aa4d';
        context.beginPath();context.moveTo(farLeft.x,farLeft.y);context.lineTo(farRight.x,farRight.y);context.lineTo(nearRight.x,nearRight.y);context.lineTo(nearLeft.x,nearLeft.y);context.closePath();context.fill();
      }
      context.strokeStyle='rgba(255,239,169,.82)';context.lineWidth=2;
      for(const lane of [-18,18]){context.beginPath();for(let depth=6;depth<=500;depth+=12){const z=distance+depth;const p=project(lane,getSkyboundGroundHeight(input.levelId,z)+.15,z);if(depth===6)context.moveTo(p.x,p.y);else context.lineTo(p.x,p.y);}context.stroke();}
      for(let marker=Math.ceil((distance+20)/45)*45;marker<distance+500;marker+=45){const left=project(-18,getSkyboundGroundHeight(input.levelId,marker)+.2,marker);const right=project(18,getSkyboundGroundHeight(input.levelId,marker)+.2,marker);context.strokeStyle=marker%90===0?'rgba(255,220,92,.82)':'rgba(105,235,244,.58)';context.beginPath();context.moveTo(left.x,left.y);context.lineTo(right.x,right.y);context.stroke();}
    }else{
      const farIslands=islands.filter((island)=>island.z>distance-12&&island.z<distance+650).sort((a,b)=>b.z-a.z);
      for(const island of farIslands)drawFloatingIsland(context,project(island.x,island.y,island.z),island,level.accent,world);
    }

    for(const landmark of world.landmarks){const z=18+landmark.distanceRatio*Math.max(120,input.goalDistance-36);drawWorldLandmark(context,project(landmark.lateralX,landmark.altitude,z),landmark,level.accent,time);}

    if(input.levelId==='storm') {
      context.strokeStyle='rgba(179,214,255,.34)';context.lineWidth=1.5;
      for(let index=0;index<3;index+=1){const x=(seeded(Math.floor(time/700),index)*width);context.beginPath();context.moveTo(x,0);context.lineTo(x-12,height*.18);context.lineTo(x+5,height*.3);context.stroke();}
      context.strokeStyle='rgba(190,218,242,.27)';context.lineWidth=1;for(let drop=0;drop<70;drop+=1){const x=(seeded(drop,3)*width+time*.24)%(width+30)-15;const y=(seeded(drop,7)*height+time*(.38+seeded(drop,9)*.2))%(height+40)-20;context.beginPath();context.moveTo(x,y);context.lineTo(x-6,y+18);context.stroke();}
    }

    const resolved=new Set(flight?.resolvedObjectIds??[]);
    const visible=course.filter((object)=>!resolved.has(object.id)&&object.x>distance-8&&object.x<distance+540).sort((a,b)=>b.x-a.x);
    for(const object of visible) {
      const p=project(object.lateralX??0,object.y,object.x);
      if(p.y<-160||p.y>height+170)continue;
      if(object.kind==='wind_ring')drawRing(context,p,object.radius,time);
      else if(object.kind==='salvage')drawDiamond(context,p.x,p.y,Math.max(4,object.radius*p.scale*.22),time+object.x);
      else drawHazard(context,p,object.radius,time);
    }

    const finalGate=project(0,level.finishAltitude,input.goalDistance);
    if(finalGate.depth<620) {
      drawRing(context,finalGate,24,time);
      if(finalGate.depth<300) {
        context.fillStyle='rgba(7,32,60,.8)';
        roundedRect(context,finalGate.x-42,finalGate.y-62,84,20,8);context.fill();
        context.fillStyle='#fff3a0';context.font='900 9px system-ui';context.textAlign='center';context.fillText('EXAM GATE',finalGate.x,finalGate.y-48);
      }
    }

    const aimingPlaneX=width/2+clamp(aim.pullX/110,-1,1)*34;
    const aimingPlaneY=height*.66+aim.power*height*.095;
    if(phase==='aiming') {
      drawLaunchFacility(context,width,height,launchFacility,aim,aimingPlaneX,aimingPlaneY,time);
    }

    if(speedEnergy>.08||input.isBoosting()) {
      const rush=clamp(speedEnergy+(input.isBoosting() ? 0.34 : 0),0,1);
      context.strokeStyle=`rgba(210,250,255,${.1+rush*.52})`;context.lineWidth=1+rush*1.2;
      for(let index=0;index<26;index+=1) {
        const x=(seeded(index,7)*width+time*(.06+rush*(.2+seeded(index,4)*.32)))%(width+100)-50;
        const y=horizon+seeded(index,9)*(height-horizon);
        context.beginPath();context.moveTo(x,y);context.lineTo(x+(x-width/2)*(.08+rush*.16),y+8+rush*24);context.stroke();
      }
    }

    const planeX=phase==='aiming'?aimingPlaneX:width/2+(flight?.bankRad??0)*34;
    const planeY=phase==='aiming'?aimingPlaneY:height*.73-pitch*13;
    const planeScale=clamp(width/570,.9,1.55)*(input.isBoosting()?1.05:1);
    context.save();
    const shakeX=(seeded(Math.floor(time),2)-.5)*shake*18;
    const shakeY=(seeded(Math.floor(time),5)-.5)*shake*12;
    context.translate(planeX+shakeX,planeY+shakeY);
    context.rotate((flight?.bankRad??0)*.62);
    context.scale(planeScale,planeScale*(1-pitch*.08));
    if(input.isStabilizing()) {
      context.strokeStyle='rgba(120,255,239,.78)';context.lineWidth=3;context.shadowBlur=18;context.shadowColor='#74ffef';
      context.beginPath();context.ellipse(0,5,112,57,time*.001,0,Math.PI*2);context.stroke();context.shadowBlur=0;
    }
    const integrityCapacity=flight?Math.max(1,flight.integrity+flight.hazardHits):1;
    const struggling=Boolean(flight)&&!input.isStabilizing()&&(speed<20||Math.abs(pitch)>.62||Math.abs(flight?.bankRad??0)>.5||(flight?.integrity??1)/integrityCapacity<.62);
    const assemblyLevel=Math.max(0,Math.min(4,Math.floor(flight?.assemblyLevel??input.assemblyLevel)));
    const missingAssemblyParts=[...(assemblyLevel<1?['left-wing']:[]),...(assemblyLevel<2?['right-wing']:[]),...(assemblyLevel<3?['left-tailplane','right-tailplane','tail-fin']:[])];
    const hiddenParts=[...new Set([...(flight?.detachedPartIds??[]),...missingAssemblyParts])];
    const flowStrength=flight?.flowCharge??0;
    if(flowStrength>.05){context.strokeStyle=`rgba(255,232,112,${flowStrength*.55})`;context.lineWidth=2+flowStrength*4;context.beginPath();context.ellipse(0,0,104+flowStrength*16,55+flowStrength*9,time*.001,0,Math.PI*2);context.stroke();}
    drawSoftwareAircraft3d(context,input.aircraftId,input.isBoosting()&&assemblyLevel>=4,time,hiddenParts,struggling,pitch,flight?.bankRad??0,clamp((speed-26)/34+Math.abs(flight?.bankRad??0)*.38+(struggling ? .2 : 0)+flowStrength*.34,0,1),assemblyLevel);
    context.restore();

    for(let index=0;index<(flight?.detachedPartIds.length??0);index+=1) {
      const age=(elapsed*1.4+index*.75)%4.5;
      context.save();context.translate(planeX+(index%2?-1:1)*age*31,planeY+age*age*12);context.rotate(age*2.6);
      context.fillStyle=index%2?'#f7efeb':'#0b2949';context.fillRect(-13,-4,26,8);context.restore();
    }

    if(feedbackAge>0) {
      const rise=(1-feedbackAge)*24;
      context.save();
      context.globalAlpha=clamp(feedbackAge*1.8,0,1);
      context.font=`950 ${clamp(width*.017,11,17)}px system-ui`;
      context.textAlign='center';
      context.fillStyle=feedbackColor;
      context.shadowColor='rgba(4,20,38,.7)';
      context.shadowBlur=7;
      context.fillText(feedbackText,width/2,planeY-95-rise);
      context.restore();
    }

    if(flight?.status==='crashed') {
      context.fillStyle=`rgba(255,103,54,${clamp(1-(elapsed%2),0,.7)})`;context.beginPath();context.arc(planeX,planeY,28+(elapsed%1)*45,0,Math.PI*2);context.fill();
    }
    shake*=Math.pow(.025,dt);
    frame=requestAnimationFrame(animate);
  };
  frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
}
