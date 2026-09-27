// Dice-wealth tiers: the Roll button charges up in steps as the player's dice
// grow (0–100 base, then 100+, 250, 500, 1k, 2k, 5k and 10k max). Each step adds
// light in the island theme's own colours — more rim rings, a stronger glow, a
// gentle pulse, orbiting sparks and finally a sweeping energy band — and warms
// toward gold at the top. Presentation only.
export const DICE_TIER_THRESHOLDS=[100,250,500,1000,2000,5000,10000];

export function diceTier(dice){
 const d=Math.max(0,Math.floor(Number(dice)||0));
 let tier=0;
 for(const [i,threshold] of DICE_TIER_THRESHOLDS.entries()){if(i===0?d>threshold:d>=threshold)tier=i+1;}
 return tier;
}

/** Visual recipe for a (possibly fractional, eased) tier level 0..7. */
export function diceTierStyle(level){
 const t=Math.max(0,Math.min(7,level));
 return {
  rings:Math.min(3,Math.floor(t/2+.5)),      // 1 ring at tier 1, up to 3
  glow:t/7,                                   // halo / under-light strength
  pulse:t>=4,                                 // breathing from 1,000 dice
  sparks:t>=6?(t>=7?10:6):0,                  // orbiting sparks from 5,000
  band:t>=7,                                  // sweeping energy band at 10,000
  warm:Math.max(0,Math.min(1,(t-4)/3)),       // theme light → gold from 2,000
 };
}

/** Auto-roll "rocket fuel": gentle hover while auto-rolling. */
export function autoRollHover(now,autoRolling,reduced){
 if(!autoRolling||reduced)return {thrust:0,bobY:0,swayZ:0};
 return {
  thrust:.22+.04*Math.sin(now*9.1),
  bobY:.035*Math.sin(now*2.3)+.012*Math.sin(now*5.7),
  swayZ:.018*Math.sin(now*1.7+.6),
 };
}
