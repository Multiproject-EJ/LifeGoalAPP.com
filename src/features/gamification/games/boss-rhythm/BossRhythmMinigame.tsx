/**
 * BossRhythmMinigame.tsx — mobile-first rhythm spacecraft boss battle.
 *
 * The Boss stop's playable encounter (Just Shapes & Beats × Guitar Hero ×
 * Space Invaders). All rules/tuning live in the pure engine
 * (`services/bossRhythmGame.ts`); this component owns rendering (one canvas),
 * procedural audio (`bossRhythmAudio.ts`), and the on-screen controller:
 *   ◀ ▶  switch lanes to dodge hazard shards
 *   FIRE  shoot note orbs on the beat (auto-aims, timing judged)
 *   SHIELD burn one of 3 charges for a short invulnerability bubble
 *
 * Screens: briefing → countdown/playing (pausable) → victory | defeat.
 * Victory returns `{ completed: true, reward: { diamonds } }` so the board
 * resolves the boss trial and grants the rare reward; retreat/defeat-exit
 * returns `{ completed: false }` (retries inside the session are free).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import {
  applyBossRhythmHit,
  buildBossRhythmChart,
  getBossRhythmConfig,
  judgeBossRhythmTiming,
  resolveBossRhythmOutcome,
  resolveBossRhythmRareReward,
  type BossRhythmChart,
  type BossRhythmConfig,
  type BossRhythmLane,
  type BossRhythmOutcome,
  type BossRhythmScoreState,
} from '../../level-worlds/services/bossRhythmGame';
import { createBossRhythmAudio, type BossRhythmAudioHandle } from './bossRhythmAudio';
import './bossRhythm.css';

type Screen = 'briefing' | 'playing' | 'victory' | 'defeat';

type EventStatus = 'pending' | 'hit' | 'missed' | 'dodged' | 'collided' | 'blocked';

interface RuntimeEvent {
  id: number;
  timeSec: number;
  lane: BossRhythmLane;
  kind: 'note' | 'hazard';
  finale: boolean;
  status: EventStatus;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
  lifeSec: number;
  size: number;
  color: string;
}

interface Laser {
  toLane: BossRhythmLane;
  toY: number;
  bornAt: number;
  color: string;
}

interface Feedback {
  text: string;
  color: string;
  bornAt: number;
  big?: boolean;
}

interface Runtime {
  events: RuntimeEvent[];
  resolveCursor: number;
  bossHp: number;
  playerHp: number;
  score: BossRhythmScoreState;
  notesHit: number;
  shieldCharges: number;
  shieldUntil: number;
  fireLockedUntil: number;
  lane: BossRhythmLane;
  shipXPx: number | null;
  lastFrameT: number;
  particles: Particle[];
  lasers: Laser[];
  feedbacks: Feedback[];
  bossHitAt: number;
  hurtAt: number;
  lastBannerPhase: number;
  finaleAnnounced: boolean;
  outcome: BossRhythmOutcome;
  endedAt: number | null;
}

interface HudState {
  bossHpRatio: number;
  playerHpRatio: number;
  score: number;
  combo: number;
  shieldCharges: number;
  phaseLabel: string;
}

const PHASE_COLORS = ['#46e6ff', '#ffb347', '#ff4d6d'];
const FINALE_COLOR = '#ff2d95';
const NOTE_COLOR = '#46e6ff';
const HAZARD_COLOR = '#ff4d8a';

const BOSS_NAMES = [
  'Coral Colossus',
  'Tide Maw',
  'Storm Herald',
  'Ember Leviathan',
  'Void Siren',
  'Sky Tyrant',
];

function getBossName(islandNumber: number): string {
  return BOSS_NAMES[(Math.max(1, Math.floor(islandNumber)) - 1) % BOSS_NAMES.length];
}

/** Phase (1–3, 4 = finale) at song time t; 0 during the count-in. */
function getPhaseAt(config: BossRhythmConfig, t: number): number {
  if (t < config.phases[0].startSec) return 0;
  if (t >= config.finaleStartSec) return 4;
  if (t >= config.phases[2].startSec) return 3;
  if (t >= config.phases[1].startSec) return 2;
  return 1;
}

/** Fraction [0,1) into the current beat, for pulse animations. */
function getBeatFraction(config: BossRhythmConfig, t: number): number {
  const phase = getPhaseAt(config, t);
  if (phase === 0) return 0;
  const startSec = phase === 4 ? config.finaleStartSec : config.phases[phase - 1].startSec;
  const bpm = phase === 4 ? config.finaleBpm : config.phases[phase - 1].bpm;
  const beats = (t - startSec) / (60 / bpm);
  return beats - Math.floor(beats);
}

function getPhaseColor(phase: number): string {
  if (phase >= 4) return FINALE_COLOR;
  return PHASE_COLORS[Math.max(0, Math.min(2, phase - 1))];
}

function createRuntime(config: BossRhythmConfig, chart: BossRhythmChart): Runtime {
  return {
    events: chart.events.map((e) => ({
      id: e.id,
      timeSec: e.timeSec,
      lane: e.lane,
      kind: e.kind,
      finale: e.finale,
      status: 'pending',
    })),
    resolveCursor: 0,
    bossHp: chart.bossMaxHp,
    playerHp: config.playerMaxHp,
    score: { score: 0, combo: 0, maxCombo: 0 },
    notesHit: 0,
    shieldCharges: config.shieldCharges,
    shieldUntil: -1,
    fireLockedUntil: -1,
    lane: 1,
    shipXPx: null,
    lastFrameT: 0,
    particles: [],
    lasers: [],
    feedbacks: [],
    bossHitAt: -10,
    hurtAt: -10,
    lastBannerPhase: 1,
    finaleAnnounced: false,
    outcome: 'in_progress',
    endedAt: null,
  };
}

/** Small deterministic PRNG for the boss silhouette (visual only). */
function silhouetteRadii(islandNumber: number, points: number): number[] {
  let state = (islandNumber * 2654435761) >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return Array.from({ length: points }, () => 0.82 + next() * 0.36);
}

export function BossRhythmMinigame({ onComplete, islandNumber }: IslandRunMinigameProps) {
  const config = useMemo(() => getBossRhythmConfig(islandNumber), [islandNumber]);
  const chart = useMemo(() => buildBossRhythmChart(config), [config]);
  const bossName = useMemo(() => getBossName(islandNumber), [islandNumber]);
  const bossShape = useMemo(() => silhouetteRadii(islandNumber, 14), [islandNumber]);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
    [],
  );

  const [screen, setScreen] = useState<Screen>('briefing');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudState>({
    bossHpRatio: 1,
    playerHpRatio: 1,
    score: 0,
    combo: 0,
    shieldCharges: config.shieldCharges,
    phaseLabel: 'Ready',
  });
  const [endStats, setEndStats] = useState<{
    outcome: BossRhythmOutcome;
    score: number;
    maxCombo: number;
    accuracy: number;
    diamonds: number;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const audioRef = useRef<BossRhythmAudioHandle | null>(null);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const screenRef = useRef<Screen>('briefing');
  const lastHudPushRef = useRef(0);

  pausedRef.current = paused;
  screenRef.current = screen;

  const pushFeedback = useCallback((rt: Runtime, t: number, text: string, color: string, big = false) => {
    rt.feedbacks.push({ text, color, bornAt: t, big });
    if (rt.feedbacks.length > 6) rt.feedbacks.shift();
  }, []);

  const spawnBurst = useCallback((rt: Runtime, t: number, x: number, y: number, color: string, count: number) => {
    const n = reducedMotion ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      rt.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        bornAt: t,
        lifeSec: 0.4 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
    if (rt.particles.length > 320) rt.particles.splice(0, rt.particles.length - 320);
  }, [reducedMotion]);

  // ── Layout helpers (shared by logic + drawing) ─────────────────────────
  const layoutFor = useCallback((width: number, height: number) => {
    const bossY = Math.min(height * 0.17, 150);
    const bossR = Math.min(width * 0.19, 74);
    const laneSpacing = Math.min(width * 0.28, 128);
    const laneX = (lane: number) => width / 2 + (lane - 1) * laneSpacing;
    const spawnY = bossY + bossR + 14;
    const shipY = height - 56;
    return { bossY, bossR, laneSpacing, laneX, spawnY, shipY };
  }, []);

  const eventYAt = useCallback(
    (timeSec: number, t: number, spawnY: number, shipY: number) => {
      const progress = (t - (timeSec - config.approachSec)) / config.approachSec;
      return spawnY + (shipY - spawnY) * progress;
    },
    [config.approachSec],
  );

  // ── Input actions ───────────────────────────────────────────────────────
  const moveShip = useCallback((direction: -1 | 1) => {
    const rt = runtimeRef.current;
    if (!rt || pausedRef.current || screenRef.current !== 'playing' || rt.outcome !== 'in_progress') return;
    rt.lane = Math.max(0, Math.min(2, rt.lane + direction)) as BossRhythmLane;
  }, []);

  const fire = useCallback(() => {
    const rt = runtimeRef.current;
    const audio = audioRef.current;
    if (!rt || !audio || pausedRef.current || screenRef.current !== 'playing' || rt.outcome !== 'in_progress') return;
    const t = audio.now();
    if (t < rt.fireLockedUntil || t < 0) return;
    rt.fireLockedUntil = t + config.fireCooldownSec;
    audio.sfx.fire();

    // Auto-aim: earliest pending note whose window contains this press.
    let best: RuntimeEvent | null = null;
    let bestDelta = Infinity;
    for (let i = rt.resolveCursor; i < rt.events.length; i += 1) {
      const ev = rt.events[i];
      if (ev.timeSec > t + config.goodWindowSec) break;
      if (ev.kind !== 'note' || ev.status !== 'pending') continue;
      const delta = Math.abs(ev.timeSec - t);
      if (delta <= config.goodWindowSec && delta < bestDelta) {
        best = ev;
        bestDelta = delta;
      }
    }

    const canvas = canvasRef.current;
    const width = canvas ? canvas.width / (window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio || 1) : 360;
    const height = canvas ? canvas.height / (window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio || 1) : 640;
    const layout = layoutFor(width, height);

    if (!best) {
      // Misfire: combo breaks and the trigger locks briefly (anti-mash).
      rt.fireLockedUntil = t + 0.25;
      if (rt.score.combo > 0) pushFeedback(rt, t, 'MISFIRE', '#8fa3c8');
      rt.score = { ...rt.score, combo: 0 };
      return;
    }

    const judgment = judgeBossRhythmTiming(best.timeSec - t, config);
    if (!judgment) return;
    best.status = 'hit';
    rt.notesHit += 1;
    rt.score = applyBossRhythmHit(rt.score, judgment);
    rt.bossHp = Math.max(0, rt.bossHp - (judgment === 'perfect' ? config.noteDamagePerfect : config.noteDamageGood));
    rt.bossHitAt = t;
    const noteY = eventYAt(best.timeSec, t, layout.spawnY, layout.shipY);
    rt.lasers.push({ toLane: best.lane, toY: noteY, bornAt: t, color: judgment === 'perfect' ? '#7dffb2' : '#ffd76a' });
    if (rt.lasers.length > 8) rt.lasers.shift();
    spawnBurst(rt, t, layout.laneX(best.lane), noteY, NOTE_COLOR, 10);
    pushFeedback(rt, t, judgment === 'perfect' ? 'PERFECT!' : 'GOOD', judgment === 'perfect' ? '#7dffb2' : '#ffd76a');
    audio.sfx.hit(judgment === 'perfect');
  }, [config, eventYAt, layoutFor, pushFeedback, spawnBurst]);

  const activateShield = useCallback(() => {
    const rt = runtimeRef.current;
    const audio = audioRef.current;
    if (!rt || !audio || pausedRef.current || screenRef.current !== 'playing' || rt.outcome !== 'in_progress') return;
    const t = audio.now();
    if (rt.shieldCharges <= 0 || t < rt.shieldUntil) return;
    rt.shieldCharges -= 1;
    rt.shieldUntil = t + config.shieldDurationSec;
    audio.sfx.shield();
    pushFeedback(rt, t, 'SHIELD UP', '#7ab8ff');
  }, [config.shieldDurationSec, pushFeedback]);

  // ── Session lifecycle ───────────────────────────────────────────────────
  const startBattle = useCallback(() => {
    audioRef.current?.dispose();
    const audio = createBossRhythmAudio(config);
    audio.setMuted(muted);
    audioRef.current = audio;
    runtimeRef.current = createRuntime(config, chart);
    lastHudPushRef.current = 0;
    setEndStats(null);
    setPaused(false);
    setScreen('playing');
    audio.start();
  }, [chart, config, muted]);

  const finishBattle = useCallback((rt: Runtime) => {
    const accuracy = chart.noteCount > 0 ? rt.notesHit / chart.noteCount : 0;
    const diamonds = resolveBossRhythmRareReward({ islandNumber, accuracy }).diamonds;
    setEndStats({
      outcome: rt.outcome,
      score: rt.score.score,
      maxCombo: rt.score.maxCombo,
      accuracy,
      diamonds,
    });
    setScreen(rt.outcome === 'victory' ? 'victory' : 'defeat');
  }, [chart.noteCount, islandNumber]);

  // ── Game loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'playing') return;

    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = stage.clientWidth;
    let height = stage.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const applySize = () => {
      width = stage.clientWidth;
      height = stage.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    applySize();
    const resizeObserver = new ResizeObserver(applySize);
    resizeObserver.observe(stage);

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 1.6,
      speed: 12 + Math.random() * 30,
    }));

    const step = () => {
      rafRef.current = requestAnimationFrame(step);
      const rt = runtimeRef.current;
      const audio = audioRef.current;
      if (!rt || !audio) return;
      const t = audio.now();
      const dt = Math.max(0, Math.min(0.05, t - rt.lastFrameT));
      rt.lastFrameT = t;

      // ── Resolve due events ──
      if (rt.outcome === 'in_progress' && t >= 0) {
        for (let i = rt.resolveCursor; i < rt.events.length; i += 1) {
          const ev = rt.events[i];
          if (ev.timeSec > t + config.goodWindowSec) break;
          if (ev.status !== 'pending') continue;
          if (ev.kind === 'note') {
            if (t > ev.timeSec + config.goodWindowSec) {
              ev.status = 'missed';
              rt.playerHp = Math.max(0, rt.playerHp - config.missHpLoss);
              rt.score = { ...rt.score, combo: 0 };
              pushFeedback(rt, t, 'MISS', '#ff6b6b');
              audio.sfx.miss();
            }
          } else if (t >= ev.timeSec) {
            const layout = layoutFor(width, height);
            if (t < rt.shieldUntil) {
              ev.status = 'blocked';
              spawnBurst(rt, t, layout.laneX(ev.lane), layout.shipY, '#7ab8ff', 8);
            } else if (ev.lane === rt.lane) {
              ev.status = 'collided';
              rt.playerHp = Math.max(0, rt.playerHp - config.collisionHpLoss);
              rt.hurtAt = t;
              rt.score = { ...rt.score, combo: 0 };
              spawnBurst(rt, t, layout.laneX(ev.lane), layout.shipY, HAZARD_COLOR, 16);
              pushFeedback(rt, t, 'HIT!', '#ff6b6b');
              audio.sfx.hurt();
              if (!reducedMotion) navigator.vibrate?.(30);
            } else {
              ev.status = 'dodged';
            }
          }
        }
        while (rt.resolveCursor < rt.events.length && rt.events[rt.resolveCursor].status !== 'pending') {
          rt.resolveCursor += 1;
        }

        // Phase / finale banners.
        const phase = getPhaseAt(config, t);
        if (phase >= 2 && phase <= 3 && phase !== rt.lastBannerPhase) {
          rt.lastBannerPhase = phase;
          pushFeedback(rt, t, `PHASE ${phase}`, getPhaseColor(phase), true);
        }
        if (phase === 4 && !rt.finaleAnnounced) {
          rt.finaleAnnounced = true;
          pushFeedback(rt, t, 'FINAL ATTACK!', FINALE_COLOR, true);
        }

        // Outcome.
        const outcome = resolveBossRhythmOutcome({
          bossHp: rt.bossHp,
          playerHp: rt.playerHp,
          songEnded: t >= chart.durationSec,
        });
        if (outcome !== 'in_progress') {
          rt.outcome = outcome;
          rt.endedAt = t;
          audio.stopMusic();
          const layout = layoutFor(width, height);
          if (outcome === 'victory') {
            audio.sfx.explosion();
            spawnBurst(rt, t, width / 2, layout.bossY, '#ffd76a', 70);
            spawnBurst(rt, t, width / 2, layout.bossY, FINALE_COLOR, 50);
          } else {
            audio.sfx.hurt();
            spawnBurst(rt, t, layout.laneX(rt.lane), layout.shipY, HAZARD_COLOR, 50);
          }
        }
      }

      if (rt.outcome !== 'in_progress' && rt.endedAt !== null && t - rt.endedAt > (rt.outcome === 'victory' ? 1.4 : 1.1)) {
        if (screenRef.current === 'playing') finishBattle(rt);
      }

      // ── HUD push (throttled) ──
      const wallNow = performance.now();
      if (wallNow - lastHudPushRef.current > 100) {
        lastHudPushRef.current = wallNow;
        const phase = getPhaseAt(config, t);
        setHud({
          bossHpRatio: chart.bossMaxHp > 0 ? rt.bossHp / chart.bossMaxHp : 0,
          playerHpRatio: rt.playerHp / config.playerMaxHp,
          score: rt.score.score,
          combo: rt.score.combo,
          shieldCharges: rt.shieldCharges,
          phaseLabel: phase === 0 ? 'Ready' : phase === 4 ? 'FINAL' : `Phase ${phase}/3`,
        });
      }

      // ── Draw ──
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const layout = layoutFor(width, height);
      const phase = getPhaseAt(config, t);
      const phaseColor = getPhaseColor(phase);
      const beatFrac = getBeatFraction(config, t);
      const pulse = 1 - Math.min(1, beatFrac) * 0.9;

      // Background.
      const bg = context.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#060a1c');
      bg.addColorStop(1, '#0d1330');
      context.fillStyle = bg;
      context.fillRect(0, 0, width, height);
      context.save();
      for (const star of stars) {
        const speedScale = phase === 4 ? 3 : 1 + Math.max(0, phase - 1) * 0.4;
        const y = ((star.y * height) + t * star.speed * speedScale) % height;
        context.globalAlpha = 0.35 + star.size * 0.2;
        context.fillStyle = '#cfe3ff';
        context.fillRect(star.x * width, y, star.size, star.size);
      }
      context.restore();

      // Collision shake.
      context.save();
      const sinceHurt = t - rt.hurtAt;
      if (!reducedMotion && sinceHurt >= 0 && sinceHurt < 0.3) {
        const decay = 1 - sinceHurt / 0.3;
        context.translate(Math.sin(t * 90) * 5 * decay, Math.cos(t * 70) * 4 * decay);
      }

      // Lane guides + hit line.
      for (let lane = 0; lane < 3; lane += 1) {
        const x = layout.laneX(lane);
        context.strokeStyle = 'rgba(120, 150, 220, 0.14)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, layout.spawnY);
        context.lineTo(x, layout.shipY);
        context.stroke();
        context.beginPath();
        context.strokeStyle = lane === rt.lane ? 'rgba(140, 200, 255, 0.8)' : 'rgba(120, 150, 220, 0.35)';
        context.lineWidth = 2;
        context.arc(x, layout.shipY, 18, 0, Math.PI * 2);
        context.stroke();
      }
      context.strokeStyle = `rgba(140, 190, 255, ${0.25 + pulse * 0.25})`;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(layout.laneX(0) - 34, layout.shipY);
      context.lineTo(layout.laneX(2) + 34, layout.shipY);
      context.stroke();

      // Boss.
      const bossAlive = rt.outcome !== 'victory' || (rt.endedAt !== null && t - rt.endedAt < 0.5);
      if (bossAlive) {
        const sinceBossHit = t - rt.bossHitAt;
        const bossShakeX = !reducedMotion && sinceBossHit >= 0 && sinceBossHit < 0.18
          ? Math.sin(t * 120) * 4 * (1 - sinceBossHit / 0.18)
          : 0;
        const bx = width / 2 + bossShakeX;
        const by = layout.bossY + Math.sin(t * 1.6) * 5;
        const scale = 1 + pulse * 0.06 + (phase === 4 ? 0.05 : 0);
        const R = layout.bossR * scale;

        // Beat ring.
        context.beginPath();
        context.strokeStyle = `rgba(${phase === 4 ? '255,45,149' : '90,180,255'}, ${(1 - beatFrac) * 0.3})`;
        context.lineWidth = 2;
        context.arc(bx, by, R * (1 + beatFrac * 0.9), 0, Math.PI * 2);
        context.stroke();

        // Tentacle arms.
        context.strokeStyle = phaseColor;
        context.globalAlpha = 0.45;
        context.lineWidth = 3;
        for (let arm = 0; arm < 6; arm += 1) {
          const side = arm < 3 ? -1 : 1;
          const baseX = bx + side * R * (0.5 + (arm % 3) * 0.22);
          const baseY = by + R * 0.35;
          context.beginPath();
          context.moveTo(baseX, baseY);
          for (let seg = 1; seg <= 5; seg += 1) {
            const yy = baseY + seg * 9;
            const xx = baseX + Math.sin(t * 3 + arm * 1.3 + seg * 0.8) * 7 * side;
            context.lineTo(xx, yy);
          }
          context.stroke();
        }
        context.globalAlpha = 1;

        // Body silhouette.
        context.beginPath();
        for (let i = 0; i < bossShape.length; i += 1) {
          const angle = (i / bossShape.length) * Math.PI * 2;
          const radius = R * bossShape[i];
          const px = bx + Math.cos(angle) * radius;
          const py = by + Math.sin(angle) * radius * 0.82;
          if (i === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.fillStyle = '#161f3d';
        context.fill();
        context.strokeStyle = phaseColor;
        context.lineWidth = 2;
        context.globalAlpha = 0.8;
        context.stroke();
        context.globalAlpha = 1;

        // Core (glows brighter as it takes damage; flashes on hit).
        const hpRatio = chart.bossMaxHp > 0 ? rt.bossHp / chart.bossMaxHp : 0;
        const coreR = R * 0.42 * (1 + pulse * 0.12);
        const core = context.createRadialGradient(bx, by, coreR * 0.15, bx, by, coreR);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.45, phaseColor);
        core.addColorStop(1, 'rgba(10, 14, 34, 0)');
        context.fillStyle = core;
        context.beginPath();
        context.arc(bx, by, coreR, 0, Math.PI * 2);
        context.fill();
        // Pupil tracks the ship.
        const shipX = rt.shipXPx ?? layout.laneX(rt.lane);
        const pupilOffset = ((shipX - bx) / width) * 10;
        context.fillStyle = '#0a0e22';
        context.beginPath();
        context.arc(bx + pupilOffset, by, coreR * 0.28, 0, Math.PI * 2);
        context.fill();
        if (sinceBossHit >= 0 && sinceBossHit < 0.12) {
          context.globalAlpha = (1 - sinceBossHit / 0.12) * 0.6;
          context.fillStyle = '#ffffff';
          context.beginPath();
          context.arc(bx, by, R, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 1;
        }
        // Damage cracks below half HP.
        if (hpRatio < 0.5) {
          context.strokeStyle = `rgba(255, 230, 255, ${0.5 - hpRatio * 0.6})`;
          context.lineWidth = 1.5;
          for (let crack = 0; crack < 3; crack += 1) {
            context.beginPath();
            context.moveTo(bx + (crack - 1) * R * 0.3, by - R * 0.5);
            context.lineTo(bx + (crack - 1) * R * 0.4 + 6, by + R * 0.2);
            context.stroke();
          }
        }
      }

      // Chart events (notes + hazards).
      for (let i = rt.resolveCursor; i < rt.events.length; i += 1) {
        const ev = rt.events[i];
        if (ev.timeSec - config.approachSec > t + 0.1) break;
        if (ev.status !== 'pending') continue;
        const y = eventYAt(ev.timeSec, t, layout.spawnY, layout.shipY);
        if (y < layout.spawnY - 20 || y > height + 20) continue;
        const x = layout.laneX(ev.lane);
        if (ev.kind === 'note') {
          const inWindow = Math.abs(ev.timeSec - t) <= config.goodWindowSec;
          context.save();
          context.shadowColor = NOTE_COLOR;
          context.shadowBlur = inWindow ? 18 : 8;
          context.fillStyle = NOTE_COLOR;
          context.beginPath();
          context.arc(x, y, inWindow ? 15 : 12, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = '#eafcff';
          context.beginPath();
          context.arc(x, y, inWindow ? 7 : 5, 0, Math.PI * 2);
          context.fill();
          context.restore();
        } else {
          context.save();
          context.translate(x, y);
          context.rotate(t * 4 + ev.id);
          context.shadowColor = HAZARD_COLOR;
          context.shadowBlur = 10;
          context.fillStyle = HAZARD_COLOR;
          const s = 12;
          context.beginPath();
          context.moveTo(0, -s * 1.4);
          context.lineTo(s, 0);
          context.lineTo(0, s * 1.4);
          context.lineTo(-s, 0);
          context.closePath();
          context.fill();
          context.fillStyle = '#3d0f26';
          context.beginPath();
          context.arc(0, 0, 4, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
      }

      // Lasers.
      rt.lasers = rt.lasers.filter((laser) => t - laser.bornAt < 0.14);
      for (const laser of rt.lasers) {
        const alpha = 1 - (t - laser.bornAt) / 0.14;
        context.strokeStyle = laser.color;
        context.globalAlpha = alpha;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(rt.shipXPx ?? layout.laneX(rt.lane), layout.shipY - 16);
        context.lineTo(layout.laneX(laser.toLane), laser.toY);
        context.stroke();
        context.globalAlpha = 1;
      }

      // Ship (eased between lanes, banking into the turn).
      const targetX = layout.laneX(rt.lane);
      if (rt.shipXPx === null) rt.shipXPx = targetX;
      const prevX = rt.shipXPx;
      rt.shipXPx += (targetX - rt.shipXPx) * Math.min(1, dt * 16);
      const bank = Math.max(-0.5, Math.min(0.5, (rt.shipXPx - prevX) * 0.06));
      const shipDestroyed = rt.outcome === 'defeat_hp' && rt.endedAt !== null && t - rt.endedAt > 0.15;
      if (!shipDestroyed) {
        context.save();
        context.translate(rt.shipXPx, layout.shipY);
        context.rotate(bank);
        // Engine flame.
        const flame = 8 + Math.sin(t * 42) * 3;
        context.fillStyle = '#ffb347';
        context.beginPath();
        context.moveTo(-5, 14);
        context.lineTo(0, 14 + flame);
        context.lineTo(5, 14);
        context.closePath();
        context.fill();
        // Hull.
        context.shadowColor = '#8fd0ff';
        context.shadowBlur = 10;
        context.fillStyle = '#e8f4ff';
        context.beginPath();
        context.moveTo(0, -18);
        context.lineTo(13, 12);
        context.lineTo(0, 6);
        context.lineTo(-13, 12);
        context.closePath();
        context.fill();
        context.shadowBlur = 0;
        context.fillStyle = '#2a72c8';
        context.beginPath();
        context.arc(0, -4, 4, 0, Math.PI * 2);
        context.fill();
        // Shield bubble.
        if (t < rt.shieldUntil) {
          const remain = (rt.shieldUntil - t) / config.shieldDurationSec;
          context.strokeStyle = `rgba(122, 184, 255, ${0.35 + remain * 0.5})`;
          context.lineWidth = 3;
          context.beginPath();
          context.arc(0, -2, 27, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }

      // Particles.
      rt.particles = rt.particles.filter((p) => t - p.bornAt < p.lifeSec);
      for (const p of rt.particles) {
        const age = (t - p.bornAt) / p.lifeSec;
        context.globalAlpha = 1 - age;
        context.fillStyle = p.color;
        context.fillRect(p.x + p.vx * (t - p.bornAt), p.y + p.vy * (t - p.bornAt), p.size, p.size);
      }
      context.globalAlpha = 1;

      // Feedback texts.
      rt.feedbacks = rt.feedbacks.filter((f) => t - f.bornAt < 0.8);
      for (const f of rt.feedbacks) {
        const age = (t - f.bornAt) / 0.8;
        context.globalAlpha = 1 - age;
        context.fillStyle = f.color;
        context.font = f.big ? 'bold 30px system-ui, sans-serif' : 'bold 20px system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(f.text, width / 2, layout.shipY - 90 - age * 30 - (f.big ? 40 : 0));
      }
      context.globalAlpha = 1;

      // Count-in.
      if (t < config.introSec) {
        const label = t < 0.2 ? '' : t < 0.8 ? '3' : t < 1.4 ? '2' : t < 2.0 ? '1' : 'GO!';
        if (label) {
          context.fillStyle = label === 'GO!' ? '#7dffb2' : '#eaf2ff';
          context.font = 'bold 54px system-ui, sans-serif';
          context.textAlign = 'center';
          context.fillText(label, width / 2, height * 0.45);
        }
      }

      // Hurt vignette.
      if (sinceHurt >= 0 && sinceHurt < 0.35) {
        context.fillStyle = `rgba(255, 40, 60, ${(1 - sinceHurt / 0.35) * 0.22})`;
        context.fillRect(0, 0, width, height);
      }

      context.restore();
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, [screen, chart, config, bossShape, eventYAt, finishBattle, layoutFor, pushFeedback, reducedMotion, spawnBurst]);

  // Keyboard controls (desktop testing / accessibility).
  useEffect(() => {
    if (screen !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveShip(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveShip(1);
          break;
        case ' ':
        case 'j':
        case 'J':
          e.preventDefault();
          fire();
          break;
        case 'k':
        case 'K':
        case 'Shift':
          activateShield();
          break;
        case 'p':
        case 'P':
        case 'Escape':
          setPaused((prev) => {
            const next = !prev;
            if (next) audioRef.current?.pause();
            else audioRef.current?.resume();
            return next;
          });
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, moveShip, fire, activateShield]);

  // Cleanup on unmount.
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.dispose();
  }, []);

  const togglePause = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    setPaused((prev) => {
      const next = !prev;
      if (next) audioRef.current?.pause();
      else audioRef.current?.resume();
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      audioRef.current?.setMuted(!prev);
      return !prev;
    });
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

  const holdButton = (action: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      action();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const phaseColorNow = hud.phaseLabel === 'FINAL' ? FINALE_COLOR : PHASE_COLORS[Math.max(0, Number(hud.phaseLabel.charAt(6) || '1') - 1)] ?? PHASE_COLORS[0];

  return (
    <div className="boss-rhythm" role="application" aria-label={`Boss Rhythm Battle against ${bossName}`}>
      {/* Top HUD: boss HP + session buttons */}
      <div className="boss-rhythm__hud-top">
        <button type="button" className="boss-rhythm__icon-btn" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'} disabled={screen !== 'playing'}>
          {paused ? '▶' : '⏸'}
        </button>
        <div className="boss-rhythm__boss-meta">
          <div className="boss-rhythm__boss-name-row">
            <span className="boss-rhythm__boss-name">👾 {bossName}</span>
            <span className="boss-rhythm__phase-chip" style={{ color: phaseColorNow, borderColor: phaseColorNow }}>{hud.phaseLabel}</span>
          </div>
          <div className="boss-rhythm__bar boss-rhythm__bar--boss" role="progressbar" aria-label="Boss core integrity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.bossHpRatio * 100)}>
            <div className="boss-rhythm__bar-fill boss-rhythm__bar-fill--boss" style={{ width: `${Math.max(0, hud.bossHpRatio) * 100}%` }} />
          </div>
        </div>
        <button type="button" className="boss-rhythm__icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Playfield */}
      <div className="boss-rhythm__stage" ref={stageRef}>
        <canvas ref={canvasRef} className="boss-rhythm__canvas" />
        <div className="boss-rhythm__score" aria-live="off">
          <span className="boss-rhythm__score-value">{hud.score.toLocaleString()}</span>
          {hud.combo >= 3 ? <span className="boss-rhythm__combo">{hud.combo}× combo</span> : null}
        </div>

        {screen === 'briefing' ? (
          <div className="boss-rhythm__overlay">
            <p className="boss-rhythm__overlay-kicker">⚔️ Boss Battle — {config.difficulty}</p>
            <h3 className="boss-rhythm__overlay-title">{bossName}</h3>
            <ul className="boss-rhythm__howto">
              <li><strong>🔵 FIRE on the beat</strong> to shoot note orbs and drain the boss core.</li>
              <li><strong>◀ ▶ Dodge</strong> the magenta shards — they can't be shot.</li>
              <li><strong>🛡 Shield</strong> blocks anything, but you only get {config.shieldCharges} charges.</li>
              <li>Survive 3 phases and the final attack before the song ends!</li>
            </ul>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--primary" onClick={startBattle}>
              ▶ Launch Battle
            </button>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--ghost" onClick={quitBattle}>
              Retreat
            </button>
          </div>
        ) : null}

        {screen === 'playing' && paused ? (
          <div className="boss-rhythm__overlay">
            <h3 className="boss-rhythm__overlay-title">Paused</h3>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--primary" onClick={togglePause}>
              ▶ Resume
            </button>
            <button type="button" className="boss-rhythm__btn" onClick={startBattle}>
              🔄 Restart
            </button>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--ghost" onClick={quitBattle}>
              Quit Battle
            </button>
          </div>
        ) : null}

        {screen === 'victory' && endStats ? (
          <div className="boss-rhythm__overlay boss-rhythm__overlay--victory">
            <h3 className="boss-rhythm__overlay-title">🏆 Boss Defeated!</h3>
            <div className="boss-rhythm__stats">
              <div><span>Score</span><strong>{endStats.score.toLocaleString()}</strong></div>
              <div><span>Max combo</span><strong>{endStats.maxCombo}×</strong></div>
              <div><span>Accuracy</span><strong>{Math.round(endStats.accuracy * 100)}%</strong></div>
            </div>
            <p className="boss-rhythm__reward-line">
              💎 Rare reward: <strong>+{endStats.diamonds} crystals</strong>
              {endStats.accuracy >= 0.9 ? ' (flawless bonus!)' : ''}
            </p>
            <p className="boss-rhythm__reward-sub">Boss bounty (dice + money) is granted when you return.</p>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--primary" onClick={claimVictory}>
              🎁 Claim Victory
            </button>
          </div>
        ) : null}

        {screen === 'defeat' && endStats ? (
          <div className="boss-rhythm__overlay boss-rhythm__overlay--defeat">
            <h3 className="boss-rhythm__overlay-title">💥 {endStats.outcome === 'defeat_time' ? 'The Boss Endured' : 'Ship Destroyed'}</h3>
            <p className="boss-rhythm__overlay-copy">
              {endStats.outcome === 'defeat_time'
                ? 'The song ended before the core broke. Land more beats!'
                : 'Dodge the magenta shards — or shield through them.'}
            </p>
            <div className="boss-rhythm__stats">
              <div><span>Score</span><strong>{endStats.score.toLocaleString()}</strong></div>
              <div><span>Accuracy</span><strong>{Math.round(endStats.accuracy * 100)}%</strong></div>
            </div>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--primary" onClick={startBattle}>
              🔄 Retry — Free
            </button>
            <button type="button" className="boss-rhythm__btn boss-rhythm__btn--ghost" onClick={quitBattle}>
              Retreat
            </button>
          </div>
        ) : null}
      </div>

      {/* Bottom HUD: player HP + shield pips */}
      <div className="boss-rhythm__hud-bottom">
        <div className="boss-rhythm__bar boss-rhythm__bar--player" role="progressbar" aria-label="Ship hull" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.playerHpRatio * 100)}>
          <div
            className={`boss-rhythm__bar-fill boss-rhythm__bar-fill--player${hud.playerHpRatio <= 0.3 ? ' boss-rhythm__bar-fill--danger' : ''}`}
            style={{ width: `${Math.max(0, hud.playerHpRatio) * 100}%` }}
          />
        </div>
        <div className="boss-rhythm__shield-pips" aria-label={`${hud.shieldCharges} shield charges left`}>
          {Array.from({ length: config.shieldCharges }, (_, i) => (
            <span key={i} className={`boss-rhythm__shield-pip${i < hud.shieldCharges ? ' boss-rhythm__shield-pip--full' : ''}`}>🛡</span>
          ))}
        </div>
      </div>

      {/* On-screen controller */}
      <div className="boss-rhythm__controls">
        <div className="boss-rhythm__dpad">
          <button type="button" className="boss-rhythm__ctl boss-rhythm__ctl--move" {...holdButton(() => moveShip(-1))} aria-label="Move left">◀</button>
          <button type="button" className="boss-rhythm__ctl boss-rhythm__ctl--move" {...holdButton(() => moveShip(1))} aria-label="Move right">▶</button>
        </div>
        <div className="boss-rhythm__actions">
          <button type="button" className="boss-rhythm__ctl boss-rhythm__ctl--shield" {...holdButton(activateShield)} aria-label="Activate shield">
            🛡<span className="boss-rhythm__ctl-count">{hud.shieldCharges}</span>
          </button>
          <button type="button" className="boss-rhythm__ctl boss-rhythm__ctl--fire" {...holdButton(fire)} aria-label="Fire">
            FIRE
          </button>
        </div>
      </div>
    </div>
  );
}
