// Pure presentation clock: never rolls, changes currency, or owns progression.
export const ARRIVAL_STYLES=['spin','bubble','rise','rocket','swoop-left','swoop-right'];
// Each island keeps its own entrance so arriving somewhere new feels new.
export function resolveArrivalStyle(arrivalKey){
 const text=String(arrivalKey??'');const digits=text.match(/\d+/);
 let n=digits?Number(digits[0]):0;
 if(!digits){for(let i=0;i<text.length;i++)n=(n*31+text.charCodeAt(i))>>>0;}
 return ARRIVAL_STYLES[((n%ARRIVAL_STYLES.length)+ARRIVAL_STYLES.length)%ARRIVAL_STYLES.length];
}
// The flight is fast and engine-powered; the power-on landing after it keeps
// its original pace (ARRIVAL_LANDING seconds).
export const ARRIVAL_FLIGHT=.9;
export const ARRIVAL_LANDING=.8;
// First mount per island per page session also arrives (after the loading pulse).
const arrivedKeys=new Set();
export function createPersonalityClock(){
 let key,activity=0,slot=0,active=null,previousActivity,pendingArrival=false;
 return (time,s)=>{
  const first=key===undefined&&s.arrivalKey!==undefined&&!arrivedKeys.has(s.arrivalKey);
  const changed=(key!==undefined&&key!==s.arrivalKey)||first;key=s.arrivalKey;
  const busy=s.blocked||s.rolling||s.autoRolling||s.jackpot||s.hidden||s.reduced||s.dice<=0;
  if(previousActivity!==s.activity||busy){activity=time;slot=0;active=null;previousActivity=s.activity;}
  if(changed){pendingArrival=true;if(s.arrivalKey!==undefined)arrivedKeys.add(s.arrivalKey);}
  if(s.reduced)pendingArrival=false;
  if(pendingArrival&&!busy){active={kind:'arrival',style:resolveArrivalStyle(s.arrivalKey),start:time,duration:ARRIVAL_FLIGHT+ARRIVAL_LANDING};pendingArrival=false;activity=time;slot=0;}
  if(active&&time-active.start>=active.duration)active=null;
  const next=Math.floor((time-activity)/30);
  if(!busy&&!active&&next>slot){slot=next;active={kind:next%2===0?'cowboy':next%4===1?'wiggle':'tilt',start:time,duration:next%2===0?3.2:1.4};}
  return active?{kind:active.kind,style:active.style,age:time-active.start}:{kind:'rest',age:0};
 };
}
const easeOut=u=>1-(1-u)**3;
// Overshoot ease for the bubble pop.
const easeBack=u=>{const c=1.9;return 1+(c+1)*(u-1)**3+c*(u-1)**2;};
export function personalityPose({kind,style='spin',age}){
 // thrust: engine flame 0..1; flameX/flameY: where the exhaust points (controller space).
 const pose={x:0,y:0,rx:0,ry:0,rz:0,scale:1,dark:false,burst:0,cowboy:false,thrust:0,flameX:0,flameY:-1};
 if(kind==='arrival'){
  if(age<ARRIVAL_FLIGHT){
   const u=Math.min(1,age/ARRIVAL_FLIGHT),e=easeOut(u);pose.dark=true;
   // Full burn in flight, a retro-burn flare just before touchdown, then cut.
   pose.thrust=u<.72?1:Math.max(0,1-(u-.72)/.28)*1.25;
   if(style==='bubble'){const p=Math.min(1,u/.6);pose.scale=Math.max(.02,easeBack(p));pose.y=.1*Math.sin(Math.PI*p);pose.rz=.12*Math.sin(p*9)*(1-p);pose.thrust*=.55;}
   else if(style==='rise'){pose.y=-3.2*(1-e);pose.rx=-.5*(1-e);}
   else if(style==='rocket'){pose.y=3.6*(1-u)**2;pose.scale=1+.08*Math.sin(Math.PI*u);pose.rx=.35*(1-u);}
   else if(style==='swoop-left'||style==='swoop-right'){const dir=style==='swoop-left'?-1:1;pose.x=dir*4.6*(1-e);pose.y=.6*Math.sin(Math.PI*e);pose.rz=-dir*.55*(1-e);pose.ry=dir*.4*(1-e);pose.flameX=dir;pose.flameY=-.35;}
   else {pose.ry=4*Math.PI*e;pose.scale=1-.2*Math.sin(Math.PI*u);pose.y=.16*Math.sin(Math.PI*u);pose.thrust*=.6;}
  }
  else {const t=age-ARRIVAL_FLIGHT;pose.y=-.09*Math.sin(t*24)*Math.exp(-t*7);pose.burst=Math.max(0,1-t/ARRIVAL_LANDING);}
 }else if(kind==='wiggle'||kind==='tilt'){
  const envelope=Math.sin(Math.PI*Math.min(1,age/1.4));
  if(kind==='wiggle')pose.rz=.045*Math.sin(age*11)*envelope;
  else {pose.ry=.18*Math.sin(age*4.5)*envelope;pose.rx=.07*envelope;}
 }else if(kind==='cowboy'){
  const envelope=Math.sin(Math.PI*Math.min(1,age/3.2));pose.cowboy=true;
  pose.y=.06*Math.abs(Math.sin(age*8))*envelope;pose.rz=.035*Math.sin(age*8)*envelope;
 }
 return pose;
}
