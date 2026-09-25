// Pure presentation clock: never rolls, changes currency, or owns progression.
export function createPersonalityClock(){
 let key,activity=0,slot=0,active=null,previousActivity,pendingArrival=false;
 return (time,s)=>{
  const changed=key!==undefined&&key!==s.arrivalKey;key=s.arrivalKey;
  const busy=s.blocked||s.rolling||s.autoRolling||s.jackpot||s.hidden||s.reduced||s.dice<=0;
  if(previousActivity!==s.activity||busy){activity=time;slot=0;active=null;previousActivity=s.activity;}
  if(changed)pendingArrival=true;
  if(s.reduced)pendingArrival=false;
  if(pendingArrival&&!busy){active={kind:'arrival',start:time,duration:3.1};pendingArrival=false;activity=time;slot=0;}
  if(active&&time-active.start>=active.duration)active=null;
  const next=Math.floor((time-activity)/30);
  if(!busy&&!active&&next>slot){slot=next;active={kind:next%2===0?'cowboy':next%4===1?'wiggle':'tilt',start:time,duration:next%2===0?3.2:1.4};}
  return active?{kind:active.kind,age:time-active.start}:{kind:'rest',age:0};
 };
}
export function personalityPose({kind,age}){
 const pose={x:0,y:0,rx:0,ry:0,rz:0,scale:1,dark:false,burst:0,cowboy:false};
 if(kind==='arrival'){
  if(age<2.3){const u=Math.min(1,age/2.3),ease=1-(1-u)**3;pose.ry=4*Math.PI*ease;pose.scale=1-.2*Math.sin(Math.PI*u);pose.y=.16*Math.sin(Math.PI*u);pose.dark=true;}
  else {const t=age-2.3;pose.y=-.09*Math.sin(t*24)*Math.exp(-t*7);pose.burst=Math.max(0,1-t/.8);}
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
