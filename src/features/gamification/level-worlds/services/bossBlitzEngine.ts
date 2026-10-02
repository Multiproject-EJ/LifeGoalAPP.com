/**
 * bossBlitzEngine.ts — pure rules for the Boss battle (user request
 * 2026-10-02: "make it 10/10").
 *
 * A beat-driven vertical boss shooter. The player drags a small ship, which
 * auto-fires; the boss attacks on the soundtrack's beat with readable,
 * always-dodgeable patterns that escalate across three phases and a final
 * attack. Destroying the two turret arms silences their volleys and drops a
 * power-up. A NOVA meter fills from damage dealt and unleashes a
 * bullet-clearing beam.
 *
 * Everything here is deterministic and side-effect free: tuning, pattern
 * generation, collision and reward. The React component
 * (`games/boss-rhythm/BossRhythmMinigame.tsx`) owns rendering, audio and input.
 * The soundtrack's beat grid still comes from `getBossRhythmConfig`.
 */

import { getBossRhythmTier } from './bossRhythmGame';

/** Logical arena (portrait); the canvas scales it to fit. */
export const BOSS_BLITZ_WORLD = { width: 360, height: 640 } as const;
/** Bullet-hell style: the hitbox is far smaller than the ship drawing. */
export const BOSS_BLITZ_PLAYER_HITBOX = 5;
export const BOSS_BLITZ_PLAYER_ZONE = { top: 330, bottom: 610, left: 18, right: 342 } as const;

export type BossBlitzPhase = 1 | 2 | 3 | 4;

export interface BossBlitzTuning {
  tier: number;
  bossMaxHp: number;
  turretMaxHp: number;
  playerHearts: number;
  invulnerableSec: number;
  bulletSpeed: number;
  /** Seconds between auto-fire volleys (two bolts each). */
  fireIntervalSec: number;
  boltDamage: number;
  novaDamagePerSec: number;
  novaDurationSec: number;
  /** Damage dealt needed to fill the NOVA meter once. */
  novaChargeDamage: number;
  shieldCharges: number;
  shieldDurationSec: number;
  /** Extra time after the song ends before the battle is lost. */
  overtimeSec: number;
}

export function getBossBlitzTuning(islandNumber: number): BossBlitzTuning {
  const tier = getBossRhythmTier(islandNumber);
  return {
    tier,
    // ~50 s at a typical ~65% hit rate (see tests), up to ~75 s on later tiers.
    bossMaxHp: Math.round(900 * (1 + tier * 0.03)),
    turretMaxHp: Math.round(70 * (1 + tier * 0.06)),
    playerHearts: tier >= 6 ? 4 : 5,
    invulnerableSec: 1.2,
    bulletSpeed: Math.min(210, 118 + tier * 8),
    fireIntervalSec: 0.11,
    boltDamage: 1,
    novaDamagePerSec: 55,
    novaDurationSec: 2.4,
    novaChargeDamage: 260,
    shieldCharges: 2,
    shieldDurationSec: 1.6,
    overtimeSec: 30,
  };
}

/** Attack phase follows the boss's remaining core, not the clock. */
export function getBossBlitzPhase(bossHpRatio: number): BossBlitzPhase {
  if (bossHpRatio <= 0.15) return 4;
  if (bossHpRatio <= 0.4) return 3;
  if (bossHpRatio <= 0.7) return 2;
  return 1;
}

export interface BossBlitzBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: 'cyan' | 'magenta' | 'gold' | 'white';
}

export interface BossBlitzBeam {
  x: number;
  width: number;
  /** Song time the warning starts / the beam becomes lethal / it ends. */
  warnAt: number;
  liveAt: number;
  endAt: number;
}

export interface BossBlitzVolley {
  bullets: BossBlitzBullet[];
  beams: BossBlitzBeam[];
}

export interface BossBlitzVolleyInput {
  phase: BossBlitzPhase;
  /** Beat counter since the battle started (integer). */
  beat: number;
  beatSec: number;
  songTime: number;
  boss: { x: number; y: number };
  turrets: ReadonlyArray<{ x: number; y: number; alive: boolean }>;
  player: { x: number; y: number };
  tuning: BossBlitzTuning;
  /** Song ended and the boss is enraged (denser patterns). */
  enraged?: boolean;
  /** Deterministic [0,1) source. */
  random: () => number;
}

function aimed(from: { x: number; y: number }, to: { x: number; y: number }, speed: number, spreadRad = 0) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x) + spreadRad;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

/**
 * A ring of bullets with a guaranteed escape gap (in radians) centred on
 * `gapAngle`. Only the downward half is emitted when `lowerHalf` is set.
 */
export function buildRingWithGap(options: {
  origin: { x: number; y: number };
  count: number;
  speed: number;
  gapAngle: number;
  gapWidthRad: number;
  r?: number;
  color?: BossBlitzBullet['color'];
}): BossBlitzBullet[] {
  const bullets: BossBlitzBullet[] = [];
  for (let i = 0; i < options.count; i += 1) {
    const angle = (i / options.count) * Math.PI * 2;
    let delta = Math.abs(((angle - options.gapAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    delta = Math.min(delta, Math.PI * 2 - delta);
    if (delta < options.gapWidthRad / 2) continue;
    bullets.push({
      x: options.origin.x,
      y: options.origin.y,
      vx: Math.cos(angle) * options.speed,
      vy: Math.sin(angle) * options.speed,
      r: options.r ?? 6,
      color: options.color ?? 'magenta',
    });
  }
  return bullets;
}

/** A falling wall of bullets across the arena with one safe gap. */
export function buildWallWithGap(options: { y: number; gapX: number; gapWidth: number; speed: number; spacing?: number }): BossBlitzBullet[] {
  const spacing = options.spacing ?? 22;
  const bullets: BossBlitzBullet[] = [];
  for (let x = 10; x <= BOSS_BLITZ_WORLD.width - 10; x += spacing) {
    if (Math.abs(x - options.gapX) < options.gapWidth / 2) continue;
    bullets.push({ x, y: options.y, vx: 0, vy: options.speed, r: 6, color: 'cyan' });
  }
  return bullets;
}

/**
 * The boss's attack for one beat. Patterns escalate by phase; every pattern
 * leaves a gap or lane the small hitbox can reach.
 */
export function buildBossBlitzVolley(input: BossBlitzVolleyInput): BossBlitzVolley {
  const { phase, beat, boss, player, tuning, random } = input;
  const speed = tuning.bulletSpeed * (input.enraged ? 1.15 : 1);
  const bullets: BossBlitzBullet[] = [];
  const beams: BossBlitzBeam[] = [];
  const liveTurrets = input.turrets.filter((turret) => turret.alive);
  const towardPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);

  if (phase === 1) {
    // Early islands (EASY) aim a fan every other volley only.
    if (beat % (tuning.tier < 2 ? 4 : 2) === 0) {
      for (const spread of [-0.16, 0, 0.16]) bullets.push({ x: boss.x, y: boss.y + 30, ...aimed(boss, player, speed, spread), r: 6, color: 'magenta' });
    }
    if (beat % 2 === 1) {
      liveTurrets.forEach((turret) => bullets.push({ x: turret.x, y: turret.y + 10, ...aimed(turret, player, speed * 0.9), r: 5, color: 'cyan' }));
    }
    if (beat % 8 === 4) {
      bullets.push(...buildRingWithGap({ origin: boss, count: 18, speed: speed * 0.8, gapAngle: towardPlayer + (random() - 0.5) * 0.8, gapWidthRad: 0.95, color: 'gold' }));
    }
  } else if (phase === 2) {
    // Rotating three-arm spiral on every beat.
    const arms = 3;
    const spin = beat * 0.42;
    for (let arm = 0; arm < arms; arm += 1) {
      const angle = spin + (arm / arms) * Math.PI * 2;
      bullets.push({ x: boss.x, y: boss.y, vx: Math.cos(angle) * speed * 0.85, vy: Math.sin(angle) * speed * 0.85, r: 6, color: 'magenta' });
    }
    if (beat % 2 === 0) {
      liveTurrets.forEach((turret) => {
        for (const spread of [-0.09, 0.09]) bullets.push({ x: turret.x, y: turret.y + 10, ...aimed(turret, player, speed, spread), r: 5, color: 'cyan' });
      });
    }
    if (beat % 8 === 6) {
      // Warned vertical beam sweeping where the player is now.
      beams.push({ x: Math.max(30, Math.min(BOSS_BLITZ_WORLD.width - 30, player.x)), width: 34, warnAt: input.songTime, liveAt: input.songTime + input.beatSec * 1.5, endAt: input.songTime + input.beatSec * 2.5 });
    }
  } else if (phase === 3) {
    if (beat % 2 === 0) {
      bullets.push(...buildRingWithGap({ origin: boss, count: 22, speed: speed * 0.85, gapAngle: Math.PI / 2 + (beat % 4 === 0 ? -0.5 : 0.5), gapWidthRad: 0.85 }));
    }
    if (beat % 4 === 1) {
      bullets.push(...buildWallWithGap({ y: boss.y + 60, gapX: 50 + random() * (BOSS_BLITZ_WORLD.width - 100), gapWidth: 64, speed: speed * 0.75 }));
    }
    if (beat % 2 === 1) {
      liveTurrets.forEach((turret) => bullets.push({ x: turret.x, y: turret.y + 10, ...aimed(turret, player, speed * 1.05), r: 5, color: 'cyan' }));
    }
    if (beat % 8 === 7) {
      beams.push({ x: 40 + random() * (BOSS_BLITZ_WORLD.width - 80), width: 40, warnAt: input.songTime, liveAt: input.songTime + input.beatSec * 1.5, endAt: input.songTime + input.beatSec * 2.5 });
    }
  } else {
    // FINAL ATTACK: flower bursts every beat plus an aimed stream.
    const petals = input.enraged ? 14 : 12;
    const twist = beat * 0.27;
    for (let i = 0; i < petals; i += 1) {
      const angle = twist + (i / petals) * Math.PI * 2;
      bullets.push({ x: boss.x, y: boss.y, vx: Math.cos(angle) * speed * 0.8, vy: Math.sin(angle) * speed * 0.8, r: 6, color: i % 2 ? 'gold' : 'magenta' });
    }
    if (beat % 2 === 1) bullets.push({ x: boss.x, y: boss.y + 30, ...aimed(boss, player, speed * 1.2), r: 7, color: 'white' });
  }
  if (input.enraged && beat % 4 === 2) {
    bullets.push(...buildRingWithGap({ origin: boss, count: 16, speed, gapAngle: towardPlayer, gapWidthRad: 0.9, color: 'white' }));
  }
  return { bullets, beams };
}

export function circlesOverlap(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const reach = a.r + b.r;
  return dx * dx + dy * dy <= reach * reach;
}

export type BossBlitzOutcome = 'victory' | 'defeat_hp' | 'defeat_time' | 'in_progress';

export function resolveBossBlitzOutcome(options: { bossHp: number; hearts: number; songTime: number; songEndSec: number; tuning: BossBlitzTuning }): BossBlitzOutcome {
  if (options.bossHp <= 0) return 'victory';
  if (options.hearts <= 0) return 'defeat_hp';
  if (options.songTime >= options.songEndSec + options.tuning.overtimeSec) return 'defeat_time';
  return 'in_progress';
}

/**
 * Accuracy for the shared rare-reward rule (`resolveBossRhythmRareReward`):
 * a flawless (no-hit) win earns the ≥0.9 bonus.
 */
export function resolveBossBlitzAccuracy(hitsTaken: number): number {
  return Math.max(0, 1 - Math.max(0, hitsTaken) * 0.15);
}

/** Rough seconds to defeat the boss at a given share of bolts landing. */
export function estimateBossBlitzKillSeconds(tuning: BossBlitzTuning, hitRate: number): number {
  const dps = (2 * tuning.boltDamage / tuning.fireIntervalSec) * hitRate;
  // One NOVA per charge cycle adds its full damage.
  const novaShare = (tuning.novaDamagePerSec * tuning.novaDurationSec) / tuning.novaChargeDamage;
  return tuning.bossMaxHp / (dps * (1 + novaShare));
}
