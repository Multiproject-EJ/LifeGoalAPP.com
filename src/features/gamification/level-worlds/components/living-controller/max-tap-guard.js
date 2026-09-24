// Input debounce only; multiplier tiers/costs remain owned by their existing policy.
export function createMaxTapGuard(){
 let last=-Infinity,remaining=0;
 return {
  reached(now){last=now;remaining=2;},
  protect(now,jumping=false){
   if(now-last>=1000){remaining=0;last=now;return jumping;}
   last=now;
   if(remaining>0){remaining--;return true;}
   return jumping;
  },
 };
}
