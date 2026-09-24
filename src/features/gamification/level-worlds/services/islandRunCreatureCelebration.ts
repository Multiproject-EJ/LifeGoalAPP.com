/** Presentation only. Never changes dice, rewards, battle or progression state. */
export const SUNSHORE_CREATURE_CELEBRATION_SECONDS = 7.2;
export type CelebrationPoint = readonly [number, number, number];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const mix = (a: CelebrationPoint, b: CelebrationPoint, t: number): CelebrationPoint => a.map((v,i) => v + (b[i] - v) * t) as unknown as CelebrationPoint;

export function shouldCelebrateSunshoreMaxRoll(island: number, status: string, strength: 'normal' | 'hard') {
  return island === 5 && status === 'ok' && strength === 'hard';
}

export function resolveSunshoreCreatureCelebration(
  seconds: number, from: CelebrationPoint, normal: CelebrationPoint, reducedMotion = false,
) {
  const t = Math.max(0, seconds);
  if (t >= (reducedMotion ? .9 : SUNSHORE_CREATURE_CELEBRATION_SECONDS)) return null;
  if (reducedMotion) return {phase:'gentle-glow',position:normal,roll:0,spin:0,fold:0,squash:1,blend:1};
  const center: CelebrationPoint = [0,1.45,0];
  if (t < 1.5) {
    const p = ease(t / 1.5);
    return {phase:'roll-in',position:mix(from,center,p),roll:-Math.PI*4*p,spin:0,fold:Math.sin(p*Math.PI/2),squash:1,blend:0};
  }
  if (t < 2.8) {
    const p = (t-1.5)/1.3;
    return {phase:'spin',position:center,roll:0,spin:Math.PI*8*ease(p),fold:1,squash:1-.2*p,blend:0};
  }
  if (t < 4.6) {
    const p = (t-2.8)/1.8;
    return {phase:p<.5?'pop-up':'fall',position:[0,1.45+4.1*4*p*(1-p),0] as CelebrationPoint,roll:Math.PI*2*ease(p),spin:0,fold:1-p*.45,squash:1+.16*Math.sin(p*Math.PI*2),blend:0};
  }
  if (t < 5.3) {
    const p = (t-4.6)/.7;
    return {phase:'bounce',position:[0,1.45+1.0*4*p*(1-p),0] as CelebrationPoint,roll:0,spin:0,fold:.55,squash:1-.2*Math.cos(p*Math.PI*2),blend:0};
  }
  const p = ease((t-5.3)/1.9);
  return {phase:'roll-out',position:mix(center,normal,p),roll:Math.PI*4*p,spin:0,fold:.55*(1-p),squash:.8+.2*p,blend:p};
}
