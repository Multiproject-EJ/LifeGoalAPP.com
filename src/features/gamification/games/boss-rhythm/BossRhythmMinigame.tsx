/**
 * BossRhythmMinigame.tsx — the Boss stop's battle: a beat-driven vertical
 * boss shooter (rebuilt 2026-10-02 on user request: "make it 10/10").
 *
 * Drag anywhere to fly; the ship fires on its own. The boss attacks on the
 * soundtrack's beat with readable, always-dodgeable patterns that escalate
 * through three phases and a FINAL ATTACK. Break the two turret arms for a
 * spread-shot power-up, charge NOVA by dealing damage and unleash a
 * bullet-clearing beam, and burn a shield when a pattern closes in.
 *
 * Rules live in the pure engine (`level-worlds/services/bossBlitzEngine.ts`);
 * the soundtrack and its beat grid come from `getBossRhythmConfig` and the
 * procedural audio. This component owns rendering, input and audio only and
 * never writes gameplay state: victory returns `{ completed: true, reward }`
 * and the board resolves the trial; retreat returns `{ completed: false }`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import { getBossRhythmConfig, resolveBossRhythmRareReward } from '../../level-worlds/services/bossRhythmGame';
import {
  BOSS_BLITZ_PLAYER_HITBOX,
  BOSS_BLITZ_PLAYER_ZONE,
  BOSS_BLITZ_WORLD,
  buildBossBlitzVolley,
  circlesOverlap,
  getBossBlitzPhase,
  getBossBlitzTuning,
  resolveBossBlitzAccuracy,
  resolveBossBlitzOutcome,
  type BossBlitzBeam,
  type BossBlitzBullet,
  type BossBlitzOutcome,
  type BossBlitzPhase,
} from '../../level-worlds/services/bossBlitzEngine';
import { createBossRhythmAudio, type BossRhythmAudioHandle } from './bossRhythmAudio';
import './bossRhythm.css';

type Screen = 'briefing' | 'playing' | 'victory' | 'defeat';

const W = BOSS_BLITZ_WORLD.width;
const H = BOSS_BLITZ_WORLD.height;
const CORE_RADIUS = 44;
const TURRET_RADIUS = 20;
const PHASE_COLORS: Record<BossBlitzPhase, string> = { 1: '#46e6ff', 2: '#ffb347', 3: '#ff4d6d', 4: '#ff2d95' };
const PHASE_TITLES: Record<BossBlitzPhase, string> = { 1: '', 2: 'PHASE 2 · THE ARMOUR CRACKS', 3: 'PHASE 3 · FURY UNLEASHED', 4: 'FINAL ATTACK!' };
const BULLET_COLORS: Record<BossBlitzBullet['color'], string> = { cyan: '#46e6ff', magenta: '#ff4d8a', gold: '#ffd76a', white: '#ffffff' };

const BOSS_NAMES = ['Coral Colossus', 'Tide Maw', 'Storm Herald', 'Ember Leviathan', 'Void Siren', 'Sky Tyrant'];
function getBossName(islandNumber: number): string {
  return BOSS_NAMES[(Math.max(1, Math.floor(islandNumber)) - 1) % BOSS_NAMES.length];
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Bolt { x: number; y: number; vx: number; vy: number; power: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; color: string; drag: number }
interface Debris { x: number; y: number; vx: number; vy: number; rot: number; spin: number; age: number; size: number; color: string }
interface Floater { x: number; y: number; text: string; color: string; age: number; big: boolean }
interface Pickup { x: number; y: number; kind: 'spread' | 'heart'; age: number }
interface Star { x: number; y: number; z: number }

interface Game {
  started: boolean;
  songTime: number;
  realTime: number;
  timeScale: number;
  beatTimes: number[];
  beatCursor: number;
  beatCounter: number;
  lastBeatAt: number;
  songEndSec: number;
  player: { x: number; y: number; tx: number; ty: number; alive: boolean };
  hearts: number;
  invulnerableUntil: number;
  shieldUntil: number;
  shieldCharges: number;
  novaCharge: number;
  novaUntil: number;
  spreadUntil: number;
  nextFireAt: number;
  boss: { hp: number; x: number; y: number; hitAt: number; phase: BossBlitzPhase; turrets: Array<{ hp: number; x: number; y: number; alive: boolean }>; dead: boolean };
  bolts: Bolt[];
  bullets: BossBlitzBullet[];
  beams: BossBlitzBeam[];
  particles: Particle[];
  debris: Debris[];
  floaters: Floater[];
  pickups: Pickup[];
  stars: Star[];
  damageDealt: number;
  pendingDamage: number;
  pendingDamageAt: number;
  hitsTaken: number;
  shakeUntil: number;
  shakeMag: number;
  flashAt: number;
  flashColor: string;
  banner: { text: string; sub: string; at: number } | null;
  victoryAt: number | null;
  defeatAt: number | null;
  nextChainAt: number;
  outcome: BossBlitzOutcome;
  random: () => number;
  pointer: { id: number; startX: number; startY: number; shipX: number; shipY: number } | null;
  keys: Set<string>;
}

interface Hud {
  bossHpRatio: number;
  hearts: number;
  novaCharge: number;
  novaActive: boolean;
  shieldCharges: number;
  phase: BossBlitzPhase;
  countdown: string | null;
}

interface EndStats {
  outcome: BossBlitzOutcome;
  timeSec: number;
  damage: number;
  hitsTaken: number;
  accuracy: number;
  diamonds: number;
}

function buildBeatTimes(config: ReturnType<typeof getBossRhythmConfig>): number[] {
  const times: number[] = [];
  for (const spec of config.phases) {
    const step = 60 / spec.bpm;
    for (let beat = 0; beat < spec.beats; beat += 1) times.push(spec.startSec + beat * step);
  }
  const finaleStep = 60 / config.finaleBpm;
  for (let beat = 0; beat < config.finaleBeats; beat += 1) times.push(config.finaleStartSec + beat * finaleStep);
  return times;
}

function createGame(islandNumber: number, config: ReturnType<typeof getBossRhythmConfig>): Game {
  const tuning = getBossBlitzTuning(islandNumber);
  const random = createRandom(islandNumber * 9973 + 17);
  const beatTimes = buildBeatTimes(config);
  const last = beatTimes[beatTimes.length - 1] ?? 60;
  return {
    started: false,
    songTime: 0,
    realTime: 0,
    timeScale: 1,
    beatTimes,
    beatCursor: 0,
    beatCounter: 0,
    lastBeatAt: -10,
    songEndSec: last + 1,
    player: { x: W / 2, y: 540, tx: W / 2, ty: 540, alive: true },
    hearts: tuning.playerHearts,
    invulnerableUntil: 0,
    shieldUntil: 0,
    shieldCharges: tuning.shieldCharges,
    novaCharge: 0,
    novaUntil: 0,
    spreadUntil: 0,
    nextFireAt: 0,
    boss: {
      hp: tuning.bossMaxHp,
      x: W / 2,
      y: 140,
      hitAt: -10,
      phase: 1,
      turrets: [-1, 1].map(() => ({ hp: tuning.turretMaxHp, x: 0, y: 0, alive: true })),
      dead: false,
    },
    bolts: [],
    bullets: [],
    beams: [],
    particles: [],
    debris: [],
    floaters: [],
    pickups: [],
    stars: Array.from({ length: 90 }, () => ({ x: random() * W, y: random() * H, z: 0.2 + random() * 0.8 })),
    damageDealt: 0,
    pendingDamage: 0,
    pendingDamageAt: 0,
    hitsTaken: 0,
    shakeUntil: 0,
    shakeMag: 0,
    flashAt: -10,
    flashColor: '#ffffff',
    banner: null,
    victoryAt: null,
    defeatAt: null,
    nextChainAt: 0,
    outcome: 'in_progress',
    random,
    pointer: null,
    keys: new Set(),
  };
}

/** Pre-rendered glowing bullet sprites (one per colour) for cheap drawing. */
function createBulletSprites(): Record<BossBlitzBullet['color'], HTMLCanvasElement> | null {
  if (typeof document === 'undefined') return null;
  const make = (color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const glow = ctx.createRadialGradient(24, 24, 2, 24, 24, 24);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.28, color);
      glow.addColorStop(0.55, `${color}66`);
      glow.addColorStop(1, `${color}00`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(24, 24, 24, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  };
  return { cyan: make(BULLET_COLORS.cyan), magenta: make(BULLET_COLORS.magenta), gold: make(BULLET_COLORS.gold), white: make('#cfe6ff') };
}

export function BossRhythmMinigame({ onComplete, islandNumber }: IslandRunMinigameProps) {
  const config = useMemo(() => getBossRhythmConfig(islandNumber), [islandNumber]);
  const tuning = useMemo(() => getBossBlitzTuning(islandNumber), [islandNumber]);
  const bossName = getBossName(islandNumber);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    [],
  );

  const [screen, setScreen] = useState<Screen>('briefing');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [endStats, setEndStats] = useState<EndStats | null>(null);
  const [hud, setHud] = useState<Hud>({ bossHpRatio: 1, hearts: tuning.playerHearts, novaCharge: 0, novaActive: false, shieldCharges: tuning.shieldCharges, phase: 1, countdown: null });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(createGame(islandNumber, config));
  const audioRef = useRef<BossRhythmAudioHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const spritesRef = useRef<ReturnType<typeof createBulletSprites>>(null);
  const viewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, dpr: 1, cssW: 360, cssH: 640 });
  pausedRef.current = paused;

  const finish = useCallback((outcome: BossBlitzOutcome) => {
    const game = gameRef.current;
    const accuracy = resolveBossBlitzAccuracy(game.hitsTaken);
    setEndStats({
      outcome,
      timeSec: Math.max(0, game.songTime - config.introSec),
      damage: Math.round(game.damageDealt),
      hitsTaken: game.hitsTaken,
      accuracy,
      diamonds: resolveBossRhythmRareReward({ islandNumber, accuracy }).diamonds,
    });
    setScreen(outcome === 'victory' ? 'victory' : 'defeat');
  }, [config.introSec, islandNumber]);

  const startBattle = useCallback(() => {
    audioRef.current?.dispose();
    gameRef.current = createGame(islandNumber, config);
    gameRef.current.started = true;
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      // QA only: /dev/boss-rhythm-preview?bossHp=0.3 starts the core weakened.
      const startRatio = Number(new URLSearchParams(window.location.search).get('bossHp'));
      if (startRatio > 0 && startRatio < 1) {
        gameRef.current.boss.hp = tuning.bossMaxHp * startRatio;
        gameRef.current.boss.phase = getBossBlitzPhase(startRatio);
      }
    }
    const audio = createBossRhythmAudio(config);
    audio.setMuted(muted);
    audioRef.current = audio;
    setEndStats(null);
    setPaused(false);
    setScreen('playing');
    audio.start();
  }, [config, islandNumber, muted, tuning.bossMaxHp]);

  const activateShield = useCallback(() => {
    const game = gameRef.current;
    if (!game.started || game.victoryAt !== null || !game.player.alive || game.shieldCharges <= 0 || game.songTime < game.shieldUntil) return;
    game.shieldCharges -= 1;
    game.shieldUntil = game.songTime + tuning.shieldDurationSec;
    audioRef.current?.sfx.shield();
  }, [tuning.shieldDurationSec]);

  const activateNova = useCallback(() => {
    const game = gameRef.current;
    if (!game.started || game.victoryAt !== null || !game.player.alive || game.novaCharge < 1 || game.songTime < game.novaUntil) return;
    game.novaCharge = 0;
    game.novaUntil = game.songTime + tuning.novaDurationSec;
    game.flashAt = game.realTime;
    game.flashColor = '#bff6ff';
    game.shakeUntil = game.realTime + 0.5;
    game.shakeMag = 5;
    game.banner = { text: 'NOVA!', sub: '', at: game.realTime };
    audioRef.current?.sfx.explosion();
  }, [tuning.novaDurationSec]);

  // ── Simulation + rendering loop ──
  useEffect(() => {
    if (screen !== 'playing') return undefined;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    if (!spritesRef.current) spritesRef.current = createBulletSprites();

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const scale = Math.min(rect.width / W, rect.height / H);
      viewRef.current = { scale, offsetX: (rect.width - W * scale) / 2, offsetY: (rect.height - H * scale) / 2, dpr, cssW: rect.width, cssH: rect.height };
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(stage);

    let lastFrame = performance.now();
    let lastHud = 0;
    let finished = false;

    const spark = (x: number, y: number, color: string, count: number, speed: number, life = 0.5, size = 2.2) => {
      const game = gameRef.current;
      const n = reducedMotion ? Math.ceil(count / 3) : count;
      for (let i = 0; i < n; i += 1) {
        const angle = game.random() * Math.PI * 2;
        const v = speed * (0.35 + game.random() * 0.75);
        game.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: life * (0.6 + game.random() * 0.6), age: 0, size: size * (0.6 + game.random() * 0.8), color, drag: 2.4 });
      }
    };
    const shake = (mag: number, seconds: number) => {
      if (reducedMotion) return;
      const game = gameRef.current;
      game.shakeMag = Math.max(game.shakeMag, mag);
      game.shakeUntil = Math.max(game.shakeUntil, game.realTime + seconds);
    };
    const dealBossDamage = (amount: number, x: number, y: number) => {
      const game = gameRef.current;
      if (game.boss.dead) return;
      const multiplier = game.boss.phase === 4 ? 1.5 : 1;
      const dealt = amount * multiplier;
      game.boss.hp = Math.max(0, game.boss.hp - dealt);
      game.damageDealt += dealt;
      game.pendingDamage += dealt;
      game.boss.hitAt = game.realTime;
      if (game.songTime >= game.novaUntil) game.novaCharge = Math.min(1, game.novaCharge + dealt / tuning.novaChargeDamage);
      if (game.random() < 0.5) spark(x, y, '#fff3c4', 3, 120, 0.25, 1.8);
    };
    const hurtPlayer = () => {
      const game = gameRef.current;
      game.hearts -= 1;
      game.hitsTaken += 1;
      game.invulnerableUntil = game.songTime + tuning.invulnerableSec;
      game.flashAt = game.realTime;
      game.flashColor = '#ff3355';
      shake(9, 0.35);
      spark(game.player.x, game.player.y, '#ff6b8a', 26, 260, 0.7, 2.6);
      // Mercy: clear the bullets right around the ship.
      game.bullets = game.bullets.filter((bullet) => Math.hypot(bullet.x - game.player.x, bullet.y - game.player.y) > 70);
      audioRef.current?.sfx.hurt();
      if (game.hearts <= 0) {
        game.player.alive = false;
        game.defeatAt = game.realTime;
        spark(game.player.x, game.player.y, '#ffd76a', 60, 340, 1.1, 3);
        audioRef.current?.sfx.explosion();
        audioRef.current?.stopMusic();
      }
    };

    const update = (realDt: number) => {
      const game = gameRef.current;
      const audio = audioRef.current;
      game.realTime += realDt;
      // Victory slow-motion.
      game.timeScale = game.victoryAt !== null && game.realTime - game.victoryAt < 1.6 && !reducedMotion ? 0.3 : 1;
      const dt = realDt * game.timeScale;
      const songNow = audio ? audio.now() : game.songTime + dt;
      game.songTime = Math.max(game.songTime, songNow);
      const t = game.songTime;
      const live = t >= config.introSec && game.victoryAt === null && game.player.alive;

      // Player movement: drag target or keys.
      const keyX = (game.keys.has('ArrowRight') || game.keys.has('d') ? 1 : 0) - (game.keys.has('ArrowLeft') || game.keys.has('a') ? 1 : 0);
      const keyY = (game.keys.has('ArrowDown') || game.keys.has('s') ? 1 : 0) - (game.keys.has('ArrowUp') || game.keys.has('w') ? 1 : 0);
      if (keyX || keyY) { game.player.tx += keyX * 260 * realDt; game.player.ty += keyY * 260 * realDt; }
      game.player.tx = Math.max(BOSS_BLITZ_PLAYER_ZONE.left, Math.min(BOSS_BLITZ_PLAYER_ZONE.right, game.player.tx));
      game.player.ty = Math.max(BOSS_BLITZ_PLAYER_ZONE.top, Math.min(BOSS_BLITZ_PLAYER_ZONE.bottom, game.player.ty));
      const follow = 1 - Math.exp(-realDt * 22);
      game.player.x += (game.player.tx - game.player.x) * follow;
      game.player.y += (game.player.ty - game.player.y) * follow;

      // Boss motion + turrets.
      const boss = game.boss;
      const speedUp = boss.phase >= 3 ? 1.5 : 1;
      if (!boss.dead) {
        boss.x = W / 2 + Math.sin(t * 0.55 * speedUp) * 92 + Math.sin(t * 1.7) * 10;
        boss.y = 138 + Math.sin(t * 1.1 * speedUp) * 16;
      }
      boss.turrets.forEach((turret, index) => {
        const side = index === 0 ? -1 : 1;
        turret.x = boss.x + side * 78;
        turret.y = boss.y + 26 + Math.sin(t * 2 + index) * 4;
      });

      // Phase changes (by remaining core).
      const nextPhase = getBossBlitzPhase(boss.hp / tuning.bossMaxHp);
      if (nextPhase > boss.phase && !boss.dead) {
        boss.phase = nextPhase;
        game.banner = { text: PHASE_TITLES[nextPhase], sub: nextPhase === 4 ? 'The core is exposed — ×1.5 damage' : '', at: game.realTime };
        game.flashAt = game.realTime;
        game.flashColor = PHASE_COLORS[nextPhase];
        shake(12, 0.6);
        // Armour plates break away.
        const plates = reducedMotion ? 4 : 10;
        for (let i = 0; i < plates; i += 1) {
          const angle = (i / plates) * Math.PI * 2;
          game.debris.push({ x: boss.x + Math.cos(angle) * 60, y: boss.y + Math.sin(angle) * 50, vx: Math.cos(angle) * 160, vy: Math.sin(angle) * 160 - 40, rot: angle, spin: (game.random() - 0.5) * 8, age: 0, size: 12 + game.random() * 10, color: '#5b6b8c' });
        }
        spark(boss.x, boss.y, PHASE_COLORS[nextPhase], 50, 300, 0.9, 3);
        game.bullets = [];
        game.beams = [];
        if (game.hearts < tuning.playerHearts) game.pickups.push({ x: boss.x, y: boss.y + 50, kind: 'heart', age: 0 });
        audio?.sfx.explosion();
      }

      // Beat-synced attacks.
      while (game.beatCursor < game.beatTimes.length && game.beatTimes[game.beatCursor] <= t) {
        const beatSec = (game.beatTimes[game.beatCursor + 1] ?? game.beatTimes[game.beatCursor] + 0.45) - game.beatTimes[game.beatCursor];
        game.beatCursor += 1;
        game.lastBeatAt = game.realTime;
        if (live) {
          const volley = buildBossBlitzVolley({ phase: boss.phase, beat: game.beatCounter, beatSec, songTime: t, boss, turrets: boss.turrets, player: game.player, tuning, random: game.random });
          game.bullets.push(...volley.bullets);
          game.beams.push(...volley.beams);
          game.beatCounter += 1;
        }
      }
      // Overtime after the song: the boss keeps attacking, enraged, on a steady beat.
      if (live && t > game.songEndSec && game.realTime - game.lastBeatAt > 60 / config.finaleBpm) {
        game.lastBeatAt = game.realTime;
        const volley = buildBossBlitzVolley({ phase: boss.phase, beat: game.beatCounter, beatSec: 60 / config.finaleBpm, songTime: t, boss, turrets: boss.turrets, player: game.player, tuning, enraged: true, random: game.random });
        game.bullets.push(...volley.bullets);
        game.beams.push(...volley.beams);
        game.beatCounter += 1;
      }

      // Auto-fire.
      const novaActive = t < game.novaUntil;
      if (live && !novaActive && t >= game.nextFireAt) {
        game.nextFireAt = t + tuning.fireIntervalSec;
        const power = t < game.spreadUntil;
        game.bolts.push({ x: game.player.x - 7, y: game.player.y - 18, vx: 0, vy: -820, power });
        game.bolts.push({ x: game.player.x + 7, y: game.player.y - 18, vx: 0, vy: -820, power });
        if (power) {
          game.bolts.push({ x: game.player.x - 10, y: game.player.y - 14, vx: -170, vy: -790, power });
          game.bolts.push({ x: game.player.x + 10, y: game.player.y - 14, vx: 170, vy: -790, power });
        }
      }

      // Bolts vs turrets and core.
      game.bolts = game.bolts.filter((bolt) => {
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        if (bolt.y < -20 || bolt.x < -20 || bolt.x > W + 20) return false;
        if (boss.dead) return true;
        for (const turret of boss.turrets) {
          if (!turret.alive || !circlesOverlap({ x: bolt.x, y: bolt.y, r: 3 }, { x: turret.x, y: turret.y, r: TURRET_RADIUS })) continue;
          turret.hp -= tuning.boltDamage;
          boss.hitAt = game.realTime;
          if (game.random() < 0.4) spark(bolt.x, bolt.y, '#9ff7ff', 2, 110, 0.22, 1.6);
          if (turret.hp <= 0) {
            turret.alive = false;
            spark(turret.x, turret.y, '#ffb347', 40, 260, 0.9, 3);
            shake(8, 0.4);
            game.floaters.push({ x: turret.x, y: turret.y, text: 'TURRET DOWN!', color: '#ffd76a', age: 0, big: true });
            game.pickups.push({ x: turret.x, y: turret.y + 20, kind: 'spread', age: 0 });
            audio?.sfx.explosion();
          }
          return false;
        }
        if (circlesOverlap({ x: bolt.x, y: bolt.y, r: 3 }, { x: boss.x, y: boss.y, r: CORE_RADIUS })) {
          dealBossDamage(tuning.boltDamage * (bolt.power ? 1.15 : 1), bolt.x, bolt.y);
          return false;
        }
        return true;
      });

      // NOVA beam: heavy damage, clears bullets in its column.
      if (novaActive && game.player.alive) {
        const halfWidth = 34;
        if (!boss.dead && Math.abs(boss.x - game.player.x) < CORE_RADIUS + halfWidth) dealBossDamage(tuning.novaDamagePerSec * dt, boss.x, boss.y + 30);
        boss.turrets.forEach((turret) => {
          if (turret.alive && Math.abs(turret.x - game.player.x) < TURRET_RADIUS + halfWidth) turret.hp -= tuning.novaDamagePerSec * dt;
        });
        game.bullets = game.bullets.filter((bullet) => {
          if (Math.abs(bullet.x - game.player.x) < halfWidth && bullet.y < game.player.y) { if (game.random() < 0.3) spark(bullet.x, bullet.y, '#bff6ff', 2, 90, 0.3, 1.6); return false; }
          return true;
        });
      }

      // Enemy bullets + beams vs player.
      const invulnerable = t < game.invulnerableUntil || t < game.shieldUntil || !game.player.alive || game.victoryAt !== null;
      const hitbox = { x: game.player.x, y: game.player.y, r: BOSS_BLITZ_PLAYER_HITBOX };
      let hurt = false;
      game.bullets = game.bullets.filter((bullet) => {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        if (bullet.y > H + 30 || bullet.y < -40 || bullet.x < -30 || bullet.x > W + 30) return false;
        if (!circlesOverlap(hitbox, { x: bullet.x, y: bullet.y, r: bullet.r * 0.7 })) return true;
        if (t < game.shieldUntil) { spark(bullet.x, bullet.y, '#9ff7ff', 4, 120, 0.3, 1.8); return false; }
        if (!invulnerable && !hurt) { hurt = true; return false; }
        return true;
      });
      game.beams = game.beams.filter((beam) => {
        if (t > beam.endAt) return false;
        if (t >= beam.liveAt && !invulnerable && !hurt && Math.abs(game.player.x - beam.x) < beam.width / 2) hurt = true;
        return true;
      });
      if (hurt) hurtPlayer();

      // Pickups drift down and are collected by flying into them.
      game.pickups = game.pickups.filter((pickup) => {
        pickup.age += dt;
        pickup.y = Math.min(BOSS_BLITZ_PLAYER_ZONE.bottom - 10, pickup.y + 70 * dt);
        if (Math.hypot(pickup.x - game.player.x, pickup.y - game.player.y) < 28 && game.player.alive) {
          if (pickup.kind === 'spread') { game.spreadUntil = t + 9; game.floaters.push({ x: pickup.x, y: pickup.y - 20, text: 'SPREAD SHOT!', color: '#9ff7ff', age: 0, big: true }); }
          else { game.hearts = Math.min(tuning.playerHearts, game.hearts + 1); game.floaters.push({ x: pickup.x, y: pickup.y - 20, text: '+1 ♥', color: '#ff8fb1', age: 0, big: true }); }
          spark(pickup.x, pickup.y, '#ffffff', 14, 160, 0.5);
          audio?.sfx.shield();
          return false;
        }
        return pickup.age < 14;
      });

      // Aggregated damage numbers.
      if (game.pendingDamage > 0 && game.realTime - game.pendingDamageAt > 0.35) {
        game.floaters.push({ x: boss.x + (game.random() - 0.5) * 60, y: boss.y - 40, text: `-${Math.round(game.pendingDamage)}`, color: boss.phase === 4 ? '#ff8fd0' : '#fff3c4', age: 0, big: false });
        game.pendingDamage = 0;
        game.pendingDamageAt = game.realTime;
      }

      // Victory: chain explosions in slow motion, then the big one.
      if (boss.hp <= 0 && game.victoryAt === null) {
        game.victoryAt = game.realTime;
        game.nextChainAt = game.realTime;
        game.bullets = [];
        game.beams = [];
        audio?.stopMusic();
      }
      if (game.victoryAt !== null && !boss.dead) {
        if (game.realTime >= game.nextChainAt) {
          game.nextChainAt = game.realTime + 0.14;
          spark(boss.x + (game.random() - 0.5) * 120, boss.y + (game.random() - 0.5) * 90, game.random() < 0.5 ? '#ffd76a' : PHASE_COLORS[4], 22, 220, 0.7, 2.8);
          shake(5, 0.2);
          audio?.sfx.hit(true);
        }
        if (game.realTime - game.victoryAt > 1.7) {
          boss.dead = true;
          game.flashAt = game.realTime;
          game.flashColor = '#ffffff';
          shake(16, 0.8);
          spark(boss.x, boss.y, '#ffffff', 120, 480, 1.4, 3.4);
          spark(boss.x, boss.y, '#ffd76a', 80, 300, 1.6, 3);
          for (let i = 0; i < (reducedMotion ? 6 : 18); i += 1) {
            const angle = game.random() * Math.PI * 2;
            game.debris.push({ x: boss.x, y: boss.y, vx: Math.cos(angle) * (120 + game.random() * 220), vy: Math.sin(angle) * (120 + game.random() * 220), rot: angle, spin: (game.random() - 0.5) * 10, age: 0, size: 10 + game.random() * 16, color: '#3a4664' });
          }
          audio?.sfx.explosion();
        }
      }

      // Particles, debris, floaters, stars.
      game.particles = game.particles.filter((p) => {
        p.age += dt;
        const drag = Math.exp(-p.drag * dt);
        p.vx *= drag; p.vy *= drag;
        p.x += p.vx * dt; p.y += p.vy * dt;
        return p.age < p.life;
      });
      game.debris = game.debris.filter((d) => { d.age += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 120 * dt; d.rot += d.spin * dt; return d.age < 2.4; });
      game.floaters = game.floaters.filter((f) => { f.age += dt; f.y -= (f.big ? 26 : 40) * dt; return f.age < (f.big ? 1.4 : 0.8); });
      const flySpeed = (game.boss.phase >= 3 ? 1.6 : 1) * (novaActive ? 2.2 : 1);
      game.stars.forEach((star) => { star.y += (30 + star.z * 140) * flySpeed * realDt; if (star.y > H) { star.y -= H; star.x = game.random() * W; } });

      // Outcome.
      if (!finished) {
        if (boss.dead && game.victoryAt !== null && game.realTime - game.victoryAt > 3.2) { finished = true; finish('victory'); }
        else if (game.defeatAt !== null && game.realTime - game.defeatAt > 1.8) { finished = true; finish('defeat_hp'); }
        else if (game.victoryAt === null && game.player.alive) {
          const outcome = resolveBossBlitzOutcome({ bossHp: boss.hp, hearts: game.hearts, songTime: t, songEndSec: game.songEndSec, tuning });
          if (outcome === 'defeat_time') { finished = true; audio?.stopMusic(); finish('defeat_time'); }
        }
      }
    };

    const draw = () => {
      const game = gameRef.current;
      const view = viewRef.current;
      const t = game.songTime;
      const phaseColor = PHASE_COLORS[game.boss.phase];
      const beatPulse = reducedMotion ? 0 : Math.max(0, 1 - (game.realTime - game.lastBeatAt) / 0.22);
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      // Background: deep space tinted by the phase, pulsing on the beat.
      const bg = ctx.createLinearGradient(0, 0, 0, view.cssH);
      bg.addColorStop(0, '#04071a');
      bg.addColorStop(0.55, '#0a0f2e');
      bg.addColorStop(1, '#140a2a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, view.cssW, view.cssH);

      ctx.save();
      let sx = 0; let sy = 0;
      if (game.realTime < game.shakeUntil) {
        const k = (game.shakeUntil - game.realTime) * 4;
        sx = (game.random() - 0.5) * game.shakeMag * Math.min(1, k);
        sy = (game.random() - 0.5) * game.shakeMag * Math.min(1, k);
      } else game.shakeMag = 0;
      ctx.translate(view.offsetX + sx, view.offsetY + sy);
      ctx.scale(view.scale, view.scale);
      ctx.beginPath();
      ctx.rect(-view.offsetX / view.scale, -view.offsetY / view.scale, view.cssW / view.scale, view.cssH / view.scale);
      ctx.clip();

      // Nebula glow behind the boss.
      const nebula = ctx.createRadialGradient(game.boss.x, game.boss.y, 10, game.boss.x, game.boss.y, 260);
      nebula.addColorStop(0, `${phaseColor}${beatPulse > 0.3 ? '44' : '30'}`);
      nebula.addColorStop(1, `${phaseColor}00`);
      ctx.fillStyle = nebula;
      ctx.fillRect(-60, -60, W + 120, 520);

      // Stars (parallax, flying forward).
      game.stars.forEach((star) => {
        ctx.globalAlpha = 0.25 + star.z * 0.6;
        ctx.fillStyle = star.z > 0.8 ? '#ffffff' : '#9fb6ff';
        const len = 1 + star.z * (game.boss.phase >= 3 ? 7 : 3);
        ctx.fillRect(star.x, star.y, star.z > 0.6 ? 1.6 : 1, len);
      });
      ctx.globalAlpha = 1;

      // Synthwave floor grid in the player zone, pulsing on the beat.
      ctx.strokeStyle = phaseColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.1 + beatPulse * 0.18;
      const horizon = BOSS_BLITZ_PLAYER_ZONE.top - 20;
      for (let i = 0; i < 9; i += 1) {
        const k = ((i + (game.realTime * 1.4) % 1) / 9);
        const y = horizon + k * k * (H - horizon);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let i = -6; i <= 6; i += 1) {
        ctx.beginPath(); ctx.moveTo(W / 2 + i * 14, horizon); ctx.lineTo(W / 2 + i * 90, H); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Beams: warning first, then lethal.
      game.beams.forEach((beam) => {
        if (t < beam.liveAt) {
          const warn = (t - beam.warnAt) / Math.max(0.01, beam.liveAt - beam.warnAt);
          ctx.fillStyle = `rgba(255,60,90,${0.08 + warn * 0.14})`;
          ctx.fillRect(beam.x - beam.width / 2, 0, beam.width, H);
          ctx.setLineDash([8, 8]);
          ctx.strokeStyle = `rgba(255,90,120,${0.5 + Math.sin(game.realTime * 30) * 0.3})`;
          ctx.lineWidth = 2;
          [-1, 1].forEach((side) => { ctx.beginPath(); ctx.moveTo(beam.x + side * beam.width / 2, 0); ctx.lineTo(beam.x + side * beam.width / 2, H); ctx.stroke(); });
          ctx.setLineDash([]);
        } else {
          const grad = ctx.createLinearGradient(beam.x - beam.width / 2, 0, beam.x + beam.width / 2, 0);
          grad.addColorStop(0, 'rgba(255,45,149,0)');
          grad.addColorStop(0.3, 'rgba(255,45,149,0.85)');
          grad.addColorStop(0.5, '#ffffff');
          grad.addColorStop(0.7, 'rgba(255,45,149,0.85)');
          grad.addColorStop(1, 'rgba(255,45,149,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(beam.x - beam.width / 2 - 6, 0, beam.width + 12, H);
        }
      });

      drawBoss(ctx, game, phaseColor, beatPulse);

      // Player bolts.
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      game.bolts.forEach((bolt) => {
        const tailX = bolt.x - bolt.vx * 0.03;
        const tailY = bolt.y - bolt.vy * 0.03;
        ctx.strokeStyle = bolt.power ? 'rgba(255,215,106,0.35)' : 'rgba(70,230,255,0.35)';
        ctx.lineWidth = bolt.power ? 9 : 7;
        ctx.beginPath(); ctx.moveTo(bolt.x, bolt.y); ctx.lineTo(tailX, tailY); ctx.stroke();
        ctx.strokeStyle = bolt.power ? '#fff3c4' : '#e6fdff';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(bolt.x, bolt.y); ctx.lineTo(tailX, tailY); ctx.stroke();
      });
      ctx.lineCap = 'butt';

      // NOVA beam.
      if (t < game.novaUntil && game.player.alive) {
        const flicker = 1 + Math.sin(game.realTime * 50) * 0.08;
        const width = 68 * flicker;
        const grad = ctx.createLinearGradient(game.player.x - width / 2, 0, game.player.x + width / 2, 0);
        grad.addColorStop(0, 'rgba(70,230,255,0)');
        grad.addColorStop(0.25, 'rgba(70,230,255,0.75)');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(0.75, 'rgba(70,230,255,0.75)');
        grad.addColorStop(1, 'rgba(70,230,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(game.player.x - width / 2, 0, width, game.player.y - 14);
      }

      // Particles.
      game.particles.forEach((p) => {
        const k = 1 - p.age / p.life;
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
      ctx.globalAlpha = 1;

      // Enemy bullets (drawn last so they stay readable).
      const sprites = spritesRef.current;
      game.bullets.forEach((bullet) => {
        const size = bullet.r * 3.4;
        if (sprites) ctx.drawImage(sprites[bullet.color], bullet.x - size / 2, bullet.y - size / 2, size, size);
        else { ctx.fillStyle = BULLET_COLORS[bullet.color]; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2); ctx.fill(); }
      });
      ctx.globalCompositeOperation = 'source-over';

      // Debris.
      game.debris.forEach((d) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - d.age / 2.4);
        ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        ctx.fillStyle = d.color; ctx.strokeStyle = '#9fb6ff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-d.size / 2, -d.size / 3); ctx.lineTo(d.size / 2, -d.size / 2); ctx.lineTo(d.size / 3, d.size / 2); ctx.lineTo(-d.size / 2, d.size / 3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      });

      // Pickups.
      game.pickups.forEach((pickup) => {
        const bob = Math.sin(pickup.age * 6) * 3;
        ctx.save();
        ctx.translate(pickup.x, pickup.y + bob);
        ctx.shadowColor = pickup.kind === 'spread' ? '#46e6ff' : '#ff6b9a';
        ctx.shadowBlur = 16;
        ctx.fillStyle = pickup.kind === 'spread' ? '#0b3550' : '#4a0f24';
        ctx.strokeStyle = pickup.kind === 'spread' ? '#9ff7ff' : '#ff8fb1';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pickup.kind === 'spread' ? '✦' : '♥', 0, 1);
        ctx.restore();
      });

      drawPlayer(ctx, game, tuning.playerHearts);

      // Floating text.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      game.floaters.forEach((f) => {
        const k = 1 - f.age / (f.big ? 1.4 : 0.8);
        ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
        ctx.font = `900 ${f.big ? 18 : 13}px system-ui, sans-serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      });
      ctx.globalAlpha = 1;

      // Countdown + banners.
      if (t < config.introSec && game.started) {
        const remaining = config.introSec - t;
        const label = remaining > 1.8 ? '3' : remaining > 1.2 ? '2' : remaining > 0.6 ? '1' : 'GO!';
        ctx.font = '900 64px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = phaseColor; ctx.shadowBlur = 24;
        ctx.fillText(label, W / 2, H * 0.5);
        ctx.shadowBlur = 0;
        ctx.font = '700 14px system-ui, sans-serif';
        ctx.fillStyle = '#bcd0ff';
        ctx.fillText('Drag anywhere to fly · you fire automatically', W / 2, H * 0.5 + 52);
      }
      if (game.banner && game.realTime - game.banner.at < 2.2) {
        const age = game.realTime - game.banner.at;
        const scale = reducedMotion ? 1 : Math.min(1, 0.6 + age * 3);
        ctx.save();
        ctx.translate(W / 2, H * 0.42);
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.min(1, (2.2 - age) * 2);
        ctx.font = '900 26px system-ui, sans-serif';
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(game.banner.text, 0, 0);
        ctx.fillStyle = game.banner.text === 'NOVA!' ? '#bff6ff' : '#ffffff';
        ctx.shadowColor = phaseColor; ctx.shadowBlur = 18;
        ctx.fillText(game.banner.text, 0, 0);
        ctx.shadowBlur = 0;
        if (game.banner.sub) { ctx.font = '700 13px system-ui, sans-serif'; ctx.fillStyle = '#ffd6ea'; ctx.fillText(game.banner.sub, 0, 26); }
        ctx.restore();
      }
      if (game.victoryAt !== null && game.boss.dead) {
        const age = game.realTime - game.victoryAt - 1.7;
        ctx.globalAlpha = Math.max(0, Math.min(1, age * 2, (1.4 - age) * 2));
        ctx.font = '900 34px system-ui, sans-serif';
        ctx.fillStyle = '#ffd76a';
        ctx.shadowColor = '#ffb21f'; ctx.shadowBlur = 26;
        ctx.fillText('BOSS DEFEATED!', W / 2, H * 0.4);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // Full-screen flash.
      const flashAge = game.realTime - game.flashAt;
      if (flashAge < 0.35 && !reducedMotion) {
        ctx.globalAlpha = (0.35 - flashAge) * 1.4;
        ctx.fillStyle = game.flashColor;
        ctx.fillRect(0, 0, view.cssW, view.cssH);
        ctx.globalAlpha = 1;
      }
    };

    const frame = (now: number) => {
      const realDt = Math.min(1 / 20, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      if (!pausedRef.current) update(realDt);
      draw();
      if (now - lastHud > 90) {
        lastHud = now;
        const game = gameRef.current;
        const songTime = game.songTime;
        const remaining = config.introSec - songTime;
        setHud({
          bossHpRatio: game.boss.hp / tuning.bossMaxHp,
          hearts: game.hearts,
          novaCharge: game.novaCharge,
          novaActive: songTime < game.novaUntil,
          shieldCharges: game.shieldCharges,
          phase: game.boss.phase,
          countdown: remaining > 0 ? 'Get ready' : null,
        });
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      observer?.disconnect();
    };
  }, [config, finish, reducedMotion, screen, tuning]);

  // Keyboard (desktop): arrows/WASD move, Space/Shift shield, Enter/N nova.
  useEffect(() => {
    if (screen !== 'playing') return undefined;
    const down = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(key)) { gameRef.current.keys.add(key); event.preventDefault(); }
      if (key === ' ' || key === 'Shift') { activateShield(); event.preventDefault(); }
      if (key === 'Enter' || key === 'n') { activateNova(); event.preventDefault(); }
    };
    const up = (event: KeyboardEvent) => { gameRef.current.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [activateNova, activateShield, screen]);

  useEffect(() => () => { audioRef.current?.dispose(); audioRef.current = null; }, []);

  // Drag anywhere to fly (relative, so the finger never hides the ship).
  const toWorld = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    const view = viewRef.current;
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - view.offsetX) / view.scale, y: (clientY - rect.top - view.offsetY) / view.scale };
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (screen !== 'playing' || paused) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toWorld(event.clientX, event.clientY);
    const game = gameRef.current;
    game.pointer = { id: event.pointerId, startX: point.x, startY: point.y, shipX: game.player.tx, shipY: game.player.ty };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    if (!game.pointer || game.pointer.id !== event.pointerId) return;
    const point = toWorld(event.clientX, event.clientY);
    game.player.tx = game.pointer.shipX + (point.x - game.pointer.startX) * 1.25;
    game.player.ty = game.pointer.shipY + (point.y - game.pointer.startY) * 1.25;
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    if (game.pointer?.id === event.pointerId) game.pointer = null;
  };

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      if (prev) audioRef.current?.resume(); else audioRef.current?.pause();
      return !prev;
    });
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((prev) => { audioRef.current?.setMuted(!prev); return !prev; });
  }, []);
  const quitBattle = useCallback(() => {
    audioRef.current?.dispose();
    audioRef.current = null;
    onComplete({ completed: false });
  }, [onComplete]);
  const claimVictory = useCallback(() => {
    audioRef.current?.dispose();
    audioRef.current = null;
    onComplete({ completed: true, reward: { diamonds: endStats?.diamonds ?? 0 } });
  }, [endStats, onComplete]);

  const phaseColor = PHASE_COLORS[hud.phase];
  const novaReady = hud.novaCharge >= 1 && !hud.novaActive;
  return (
    <div className="boss-rhythm boss-blitz" role="dialog" aria-label={`Boss battle: ${bossName}`}>
      <div className="boss-rhythm__hud-top">
        <button type="button" className="boss-rhythm__icon-btn" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'} disabled={screen !== 'playing'}>
          {paused ? '▶' : '❚❚'}
        </button>
        <div className="boss-rhythm__boss-meta">
          <div className="boss-rhythm__boss-name-row">
            <span className="boss-rhythm__boss-name">👾 {bossName}</span>
            <span className="boss-rhythm__phase-chip" style={{ color: phaseColor, borderColor: phaseColor }}>{hud.phase === 4 ? 'FINAL' : `Phase ${hud.phase}/3`}</span>
          </div>
          <div className="boss-rhythm__bar boss-rhythm__bar--boss boss-blitz__boss-bar" role="progressbar" aria-label="Boss core integrity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.bossHpRatio * 100)}>
            <div className="boss-rhythm__bar-fill boss-rhythm__bar-fill--boss" style={{ width: `${Math.max(0, hud.bossHpRatio) * 100}%`, background: `linear-gradient(90deg, ${phaseColor}, #ff2d95)` }} />
            {[0.7, 0.4, 0.15].map((mark) => <i key={mark} className="boss-blitz__bar-mark" style={{ left: `${mark * 100}%` }} aria-hidden="true" />)}
          </div>
        </div>
        <button type="button" className="boss-rhythm__icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
      </div>

      <div
        className="boss-rhythm__stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas ref={canvasRef} className="boss-rhythm__canvas" aria-hidden="true" />

        {screen === 'briefing' ? (
          <div className="boss-rhythm__overlay boss-blitz__briefing">
            <p className="boss-rhythm__overlay-kicker">⚔️ Boss battle — {config.difficulty}</p>
            <h3 className="boss-rhythm__overlay-title">{bossName}</h3>
            <ul className="boss-rhythm__howto">
              <li><strong>👆 Drag anywhere</strong> to fly. Your ship fires on its own.</li>
              <li><strong>💠 Dodge</strong> the boss's beat-synced volleys — only the tiny core of your ship can be hit.</li>
              <li><strong>🎯 Break both turrets</strong> for a spread-shot power-up.</li>
              <li><strong>✴ NOVA</strong> charges as you deal damage — unleash a bullet-clearing beam.</li>
              <li><strong>🛡 Shield</strong> ({tuning.shieldCharges}×) when a pattern closes in.</li>
            </ul>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--primary" onClick={startBattle}>▶ Launch battle</button>
            {import.meta.env.DEV ? (
              <button
                type="button"
                className="boss-rhythm__btn"
                onClick={() => {
                  // QA only (dev builds): skip to a flawless win; the claim still
                  // goes through the normal onComplete path.
                  setEndStats({ outcome: 'victory', timeSec: 0, damage: tuning.bossMaxHp, hitsTaken: 0, accuracy: 1, diamonds: resolveBossRhythmRareReward({ islandNumber, accuracy: 1 }).diamonds });
                  setScreen('victory');
                }}
              >
                Win (dev)
              </button>
            ) : null}
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--ghost" onClick={quitBattle}>Retreat</button>
          </div>
        ) : null}

        {screen === 'playing' && paused ? (
          <div className="boss-rhythm__overlay">
            <h3 className="boss-rhythm__overlay-title">Paused</h3>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--primary" onClick={togglePause}>▶ Resume</button>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--ghost" onClick={quitBattle}>Retreat</button>
          </div>
        ) : null}

        {screen === 'victory' && endStats ? (
          <div className="boss-rhythm__overlay boss-rhythm__overlay--victory">
            <h3 className="boss-rhythm__overlay-title">🏆 Boss Defeated!</h3>
            <div className="boss-rhythm__stats">
              <div><span>Time</span><strong>{Math.round(endStats.timeSec)}s</strong></div>
              <div><span>Damage</span><strong>{endStats.damage.toLocaleString()}</strong></div>
              <div><span>Hits taken</span><strong>{endStats.hitsTaken}</strong></div>
            </div>
            <p className="boss-rhythm__reward-line">
              💎 Rare reward: <strong>+{endStats.diamonds} crystals</strong>
              {endStats.hitsTaken === 0 ? ' (flawless bonus!)' : ''}
            </p>
            <p className="boss-rhythm__reward-sub">Boss bounty (dice + money) is granted when you return.</p>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--primary" onClick={claimVictory}>🎁 Claim Victory</button>
          </div>
        ) : null}

        {screen === 'defeat' && endStats ? (
          <div className="boss-rhythm__overlay boss-rhythm__overlay--defeat">
            <h3 className="boss-rhythm__overlay-title">💥 {endStats.outcome === 'defeat_time' ? 'The Boss Endured' : 'Ship Destroyed'}</h3>
            <p className="boss-rhythm__overlay-copy">
              {endStats.outcome === 'defeat_time'
                ? 'The boss outlasted the battle. Stay under its core and save NOVA for the final attack.'
                : 'Watch the gaps in each ring, and shield through the walls you cannot slip past.'}
            </p>
            <div className="boss-rhythm__stats">
              <div><span>Boss core left</span><strong>{Math.max(0, Math.round(hud.bossHpRatio * 100))}%</strong></div>
              <div><span>Damage</span><strong>{endStats.damage.toLocaleString()}</strong></div>
            </div>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--primary" onClick={startBattle}>🔄 Retry — Free</button>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--ghost" onClick={quitBattle}>Retreat</button>
          </div>
        ) : null}
      </div>

      <div className="boss-blitz__controls">
        <div className="boss-blitz__hearts" aria-label={`${hud.hearts} of ${tuning.playerHearts} hull hearts`}>
          {Array.from({ length: tuning.playerHearts }, (_, i) => (
            <span key={i} className={`boss-blitz__heart${i < hud.hearts ? ' is-full' : ''}`} aria-hidden="true">♥</span>
          ))}
        </div>
        <button type="button" className="boss-blitz__ctl boss-blitz__ctl--shield" onClick={activateShield} disabled={screen !== 'playing' || hud.shieldCharges <= 0} aria-label={`Shield, ${hud.shieldCharges} left`}>
          🛡<span className="boss-blitz__ctl-count">{hud.shieldCharges}</span>
        </button>
        <button
          type="button"
          className={`boss-blitz__ctl boss-blitz__ctl--nova${novaReady ? ' is-ready' : ''}`}
          onClick={activateNova}
          disabled={screen !== 'playing' || !novaReady}
          aria-label={novaReady ? 'Unleash NOVA' : `NOVA charging, ${Math.round(hud.novaCharge * 100)}%`}
          style={{ ['--nova' as string]: `${Math.round(hud.novaCharge * 360)}deg` }}
        >
          <span>{hud.novaActive ? '✴' : novaReady ? 'NOVA' : `${Math.round(hud.novaCharge * 100)}%`}</span>
        </button>
      </div>
    </div>
  );
}

function drawBoss(ctx: CanvasRenderingContext2D, game: Game, phaseColor: string, beatPulse: number) {
  const boss = game.boss;
  if (boss.dead) return;
  const t = game.realTime;
  const hitFlash = Math.max(0, 1 - (t - boss.hitAt) / 0.08);
  const phase = boss.phase;
  ctx.save();
  ctx.translate(boss.x, boss.y);

  // Aura.
  const aura = ctx.createRadialGradient(0, 0, 20, 0, 0, 130 + beatPulse * 18);
  aura.addColorStop(0, `${phaseColor}55`);
  aura.addColorStop(1, `${phaseColor}00`);
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.fill();

  // Turret arms (drawn under the hull).
  boss.turrets.forEach((turret, index) => {
    const side = index === 0 ? -1 : 1;
    const tx = turret.x - boss.x;
    const ty = turret.y - boss.y;
    ctx.strokeStyle = '#2a3552'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(side * 30, 8); ctx.quadraticCurveTo(side * 58, -10, tx, ty); ctx.stroke();
    ctx.strokeStyle = `${phaseColor}aa`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(side * 30, 8); ctx.quadraticCurveTo(side * 58, -10, tx, ty); ctx.stroke();
    if (turret.alive) {
      const aim = Math.atan2(game.player.y - turret.y, game.player.x - turret.x);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.fillStyle = '#1b2440'; ctx.strokeStyle = '#8fa6d8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, TURRET_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.rotate(aim);
      ctx.fillStyle = '#3a4a75';
      ctx.fillRect(4, -4, 22, 8);
      ctx.rotate(-aim);
      ctx.fillStyle = phaseColor;
      ctx.shadowColor = phaseColor; ctx.shadowBlur = 10 + beatPulse * 10;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (hitFlash > 0) { ctx.globalAlpha = hitFlash * 0.25; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, TURRET_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
    } else {
      // Sparking stump.
      ctx.fillStyle = '#141a2e';
      ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI * 2); ctx.fill();
      if (Math.sin(t * 23 + index) > 0.6) { ctx.fillStyle = '#ffb347'; ctx.fillRect(tx - 2 + Math.sin(t * 41) * 6, ty - 2, 3, 3); }
    }
  });

  // Hull: layered armour that thins out each phase.
  const hullPoints = 12;
  ctx.save();
  ctx.rotate(Math.sin(t * 0.4) * 0.08);
  const hull = ctx.createLinearGradient(0, -70, 0, 60);
  hull.addColorStop(0, '#3b4a72');
  hull.addColorStop(0.5, '#1c2542');
  hull.addColorStop(1, '#0d1226');
  ctx.fillStyle = hull;
  ctx.strokeStyle = `${phaseColor}cc`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < hullPoints; i += 1) {
    const angle = (i / hullPoints) * Math.PI * 2;
    const radius = (i % 2 ? 58 : 70) * (phase === 4 ? 0.9 : 1);
    const x = Math.cos(angle) * radius * 1.12;
    const y = Math.sin(angle) * radius * 0.8;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Armour plates (fewer each phase).
  const plates = phase === 1 ? 10 : phase === 2 ? 6 : phase === 3 ? 3 : 0;
  for (let i = 0; i < plates; i += 1) {
    const angle = (i / 10) * Math.PI * 2 + t * 0.3;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(66, 0);
    ctx.fillStyle = '#4a5b88'; ctx.strokeStyle = '#a9bdf0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -7); ctx.lineTo(8, 7); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // Glowing inner ring segments, counter-rotating.
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i += 1) {
    const start = -t * 1.3 + (i / 6) * Math.PI * 2;
    ctx.strokeStyle = i % 2 ? phaseColor : '#ffffff';
    ctx.globalAlpha = 0.55 + beatPulse * 0.45;
    ctx.beginPath(); ctx.arc(0, 0, 50, start, start + 0.6); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Cracks as the core weakens.
  const damage = 1 - boss.hp / Math.max(1, boss.hp + game.damageDealt);
  if (damage > 0.3) {
    ctx.strokeStyle = `${phaseColor}`;
    ctx.globalAlpha = Math.min(1, damage);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < Math.floor(damage * 8); i += 1) {
      const angle = i * 2.1;
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 30, Math.sin(angle) * 24); ctx.lineTo(Math.cos(angle + 0.3) * 54, Math.sin(angle + 0.2) * 40); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // The eye: tracks the player, widens in the final attack.
  const eyeR = phase === 4 ? 34 : 28;
  ctx.fillStyle = '#0a0e1f';
  ctx.beginPath(); ctx.ellipse(0, 0, eyeR + 6, eyeR * 0.8 + 6, 0, 0, Math.PI * 2); ctx.fill();
  const eye = ctx.createRadialGradient(0, 0, 2, 0, 0, eyeR);
  eye.addColorStop(0, '#ffffff');
  eye.addColorStop(0.35, phaseColor);
  eye.addColorStop(1, '#100820');
  ctx.fillStyle = eye;
  ctx.shadowColor = phaseColor; ctx.shadowBlur = 20 + beatPulse * 20;
  ctx.beginPath(); ctx.ellipse(0, 0, eyeR, eyeR * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  const look = Math.atan2(game.player.y - boss.y, game.player.x - boss.x);
  ctx.fillStyle = '#05030c';
  ctx.beginPath(); ctx.ellipse(Math.cos(look) * 9, Math.sin(look) * 7, 7, 11 - beatPulse * 3, 0, 0, Math.PI * 2); ctx.fill();
  if (hitFlash > 0) {
    // A rim flicker, not a wash: constant fire must not white out the boss.
    ctx.globalAlpha = hitFlash * 0.35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, eyeR + 8, eyeR * 0.8 + 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game, maxHearts: number) {
  const player = game.player;
  if (!player.alive) return;
  const t = game.realTime;
  const invulnerable = game.songTime < game.invulnerableUntil;
  if (invulnerable && Math.floor(t * 16) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  const tilt = Math.max(-0.35, Math.min(0.35, (player.tx - player.x) * 0.02));
  ctx.rotate(tilt);
  // Engine flame.
  const flame = 14 + Math.sin(t * 40) * 4;
  const flameGrad = ctx.createLinearGradient(0, 10, 0, 10 + flame);
  flameGrad.addColorStop(0, '#ffffff');
  flameGrad.addColorStop(0.4, '#46e6ff');
  flameGrad.addColorStop(1, 'rgba(70,230,255,0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(0, 10 + flame); ctx.lineTo(6, 10); ctx.closePath(); ctx.fill();
  // Hull.
  const hull = ctx.createLinearGradient(0, -22, 0, 14);
  hull.addColorStop(0, '#ffffff');
  hull.addColorStop(0.6, '#b9d4ff');
  hull.addColorStop(1, '#5d7bc4');
  ctx.fillStyle = hull;
  ctx.strokeStyle = '#1b2a55'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -24); ctx.lineTo(7, -6); ctx.lineTo(20, 8); ctx.lineTo(8, 10); ctx.lineTo(0, 6); ctx.lineTo(-8, 10); ctx.lineTo(-20, 8); ctx.lineTo(-7, -6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#46e6ff';
  ctx.beginPath(); ctx.ellipse(0, -8, 3.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Hitbox core: the only part that can be hit.
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ff4d8a'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(0, 0, BOSS_BLITZ_PLAYER_HITBOX, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  // Shield bubble.
  if (game.songTime < game.shieldUntil) {
    const k = (game.shieldUntil - game.songTime);
    ctx.strokeStyle = `rgba(159,247,255,${Math.min(1, k) * 0.9})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(player.x, player.y, 30 + Math.sin(t * 12) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(159,247,255,0.12)';
    ctx.fill();
  }
  // Low-hull warning ring.
  if (game.hearts === 1 && maxHearts > 1) {
    ctx.strokeStyle = `rgba(255,60,90,${0.4 + Math.sin(t * 8) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(player.x, player.y, 24, 0, Math.PI * 2); ctx.stroke();
  }
}
