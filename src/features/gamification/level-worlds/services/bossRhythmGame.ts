/**
 * bossRhythmGame.ts — pure rules engine for the Boss Rhythm Battle mini-game.
 *
 * The Boss stop's playable encounter: a mobile-first rhythm spacecraft battle
 * (Just Shapes & Beats × Guitar Hero × Space Invaders). The island boss fires
 * beat-synced volleys down three lanes:
 *   - NOTE orbs must be shot with a well-timed FIRE press (any lane — the ship
 *     auto-aims). Hits damage the boss; letting an orb slip past costs HP.
 *   - HAZARD shards cannot be shot. The player dodges by switching lanes or
 *     burns one of a limited stock of shield charges.
 * The battle runs three escalating phases plus a short "final attack" burst,
 * always landing in the 60–90 second window. Victory = boss core depleted
 * before the song ends; defeat = player HP reaches 0 or the song runs out.
 *
 * Everything here is deterministic and side-effect free so charts, difficulty
 * scaling, and win-condition tuning are unit-testable. The React component
 * (`games/boss-rhythm/BossRhythmMinigame.tsx`) owns rendering, audio, and
 * input only.
 */

import { getBossDifficulty, resolveBossType, type BossDifficulty, type BossType } from './bossService';

export type BossRhythmLane = 0 | 1 | 2;
export type BossRhythmPhaseNumber = 1 | 2 | 3;
export type BossRhythmEventKind = 'note' | 'hazard';
export type BossRhythmJudgment = 'perfect' | 'good';

export const BOSS_RHYTHM_LANE_COUNT = 3;

/** Entry price for one boss battle session (retries inside the session are free). */
export const BOSS_RHYTHM_ENTRY_TICKET_COST = 1;

export interface BossRhythmPhaseSpec {
  phase: BossRhythmPhaseNumber;
  bpm: number;
  /** Number of beats this phase lasts (finale beats live on the config). */
  beats: number;
  /** Absolute song time (seconds) of this phase's first beat. */
  startSec: number;
}

export interface BossRhythmConfig {
  islandNumber: number;
  /** 0-based difficulty tier: islands 1–10 → 0, 11–20 → 1, … 111–120 → 11. */
  tier: number;
  bossType: BossType;
  difficulty: BossDifficulty;
  phases: readonly [BossRhythmPhaseSpec, BossRhythmPhaseSpec, BossRhythmPhaseSpec];
  /** Beats in the dramatic final-attack burst (played at the finale BPM). */
  finaleBeats: number;
  finaleBpm: number;
  /** Absolute song time (seconds) of the finale's first beat. */
  finaleStartSec: number;
  /** Count-in time before the first beat of phase 1. */
  introSec: number;
  /** Seconds an orb travels from spawn (boss) to the hit line (ship row). */
  approachSec: number;
  perfectWindowSec: number;
  goodWindowSec: number;
  playerMaxHp: number;
  noteDamagePerfect: number;
  noteDamageGood: number;
  /** Player HP lost when a note orb slips past un-shot. */
  missHpLoss: number;
  /** Player HP lost when a hazard shard hits the ship unshielded. */
  collisionHpLoss: number;
  shieldCharges: number;
  shieldDurationSec: number;
  /** Minimum time between FIRE presses (anti-mash). */
  fireCooldownSec: number;
}

export interface BossRhythmChartEvent {
  id: number;
  /** Absolute song time (seconds) the event crosses the hit line / ship row. */
  timeSec: number;
  lane: BossRhythmLane;
  kind: BossRhythmEventKind;
  phase: BossRhythmPhaseNumber;
  finale: boolean;
}

export interface BossRhythmChart {
  events: readonly BossRhythmChartEvent[];
  noteCount: number;
  hazardCount: number;
  /** Boss core HP for this chart (tuned to require solid but not perfect play). */
  bossMaxHp: number;
  /** Full song length including intro and a short outro pad. */
  durationSec: number;
}

export function getBossRhythmTier(islandNumber: number): number {
  const island = Math.max(1, Math.floor(islandNumber));
  return Math.min(11, Math.floor((island - 1) / 10));
}

function beatSec(bpm: number): number {
  return 60 / bpm;
}

/**
 * Build the per-island battle configuration. Three escalating phases plus a
 * finale; BPM and windows tighten with the island tier, but total length stays
 * inside the 60–90s product requirement for every island 1–120.
 */
export function getBossRhythmConfig(islandNumber: number): BossRhythmConfig {
  const island = Math.max(1, Math.floor(islandNumber));
  const tier = getBossRhythmTier(island);

  const bpm1 = Math.min(126, 104 + tier * 2);
  const bpm2 = Math.min(142, 120 + tier * 2);
  const bpm3 = Math.min(158, 136 + tier * 2);
  const finaleBpm = Math.min(168, 148 + tier * 2);

  // Faster tiers get a few extra beats in phases 2–3 so the total battle
  // length stays inside the 60–90s product window on every island.
  const introSec = 2.4;
  const phase1Beats = 36;
  const phase2Beats = 40 + tier;
  const phase3Beats = 40 + tier;
  const finaleBeats = 16;

  const p1Start = introSec;
  const p2Start = p1Start + phase1Beats * beatSec(bpm1);
  const p3Start = p2Start + phase2Beats * beatSec(bpm2);
  const finaleStart = p3Start + phase3Beats * beatSec(bpm3);

  return {
    islandNumber: island,
    tier,
    bossType: resolveBossType(island),
    difficulty: getBossDifficulty(island),
    phases: [
      { phase: 1, bpm: bpm1, beats: phase1Beats, startSec: p1Start },
      { phase: 2, bpm: bpm2, beats: phase2Beats, startSec: p2Start },
      { phase: 3, bpm: bpm3, beats: phase3Beats, startSec: p3Start },
    ],
    finaleBeats,
    finaleBpm,
    finaleStartSec: finaleStart,
    introSec,
    approachSec: Math.max(1.35, 1.8 - tier * 0.04),
    perfectWindowSec: Math.max(0.09, 0.13 - tier * 0.004),
    goodWindowSec: Math.max(0.19, 0.26 - tier * 0.007),
    playerMaxHp: 100,
    noteDamagePerfect: 2,
    noteDamageGood: 1,
    missHpLoss: 4,
    collisionHpLoss: 18,
    shieldCharges: 3,
    shieldDurationSec: 1.4,
    fireCooldownSec: 0.14,
  };
}

/** Deterministic PRNG (mulberry32) so every island has a stable chart. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampLane(lane: number): BossRhythmLane {
  return Math.max(0, Math.min(BOSS_RHYTHM_LANE_COUNT - 1, Math.floor(lane))) as BossRhythmLane;
}

/**
 * Generate the beat-synced attack chart for an island. Deterministic per
 * island number. Guarantees:
 *   - events sorted by time, lanes always valid
 *   - hazards never cover all three lanes at once (a dodge lane always exists)
 *   - phase 1 is a gentle teach, phase 3 adds off-beat doubles and hazard
 *     walls, the finale is a dense survive-then-burst "final attack"
 */
export function buildBossRhythmChart(config: BossRhythmConfig): BossRhythmChart {
  const random = createSeededRandom(config.islandNumber * 7919 + 1013904223);
  const events: BossRhythmChartEvent[] = [];
  let nextId = 1;
  let noteLane = clampLane(Math.floor(random() * 3));

  const pushNote = (timeSec: number, lane: BossRhythmLane, phase: BossRhythmPhaseNumber, finale = false) => {
    events.push({ id: nextId++, timeSec, lane, kind: 'note', phase, finale });
  };
  const pushHazard = (timeSec: number, lane: BossRhythmLane, phase: BossRhythmPhaseNumber, finale = false) => {
    events.push({ id: nextId++, timeSec, lane, kind: 'hazard', phase, finale });
  };

  /** Random-walk the note lane so volleys sweep instead of teleporting. */
  const stepNoteLane = (): BossRhythmLane => {
    const roll = random();
    if (roll < 0.42) noteLane = clampLane(noteLane + 1);
    else if (roll < 0.84) noteLane = clampLane(noteLane - 1);
    return noteLane;
  };
  const randomLane = (): BossRhythmLane => clampLane(Math.floor(random() * 3));

  for (const spec of config.phases) {
    const step = beatSec(spec.bpm);
    for (let beat = 0; beat < spec.beats; beat += 1) {
      const t = spec.startSec + beat * step;
      const beatInBar = beat % 8;

      if (spec.phase === 1) {
        // Teach: notes on most beats, one telegraphed off-beat hazard per bar,
        // and a breather on the last bar beat.
        if (beatInBar === 7) continue;
        if (beatInBar === 4) {
          pushHazard(t + step / 2, randomLane(), spec.phase);
        }
        pushNote(t, stepNoteLane(), spec.phase);
      } else if (spec.phase === 2) {
        // Escalate: denser notes, hazards twice per bar, occasional double
        // hazard leaving exactly one safe lane on higher tiers.
        if (beatInBar === 7) {
          const hazardLane = randomLane();
          pushHazard(t, hazardLane, spec.phase);
          if (config.tier >= 2 && random() < 0.5) {
            pushHazard(t, clampLane(hazardLane === 2 ? 0 : hazardLane + 1), spec.phase);
          }
          continue;
        }
        if (beatInBar === 3) {
          pushHazard(t + step / 2, randomLane(), spec.phase);
        }
        pushNote(t, stepNoteLane(), spec.phase);
      } else {
        // Climax: notes every beat with 8th-note doubles, plus two-lane hazard
        // walls twice per bar (the un-covered lane is the safe lane).
        if (beatInBar === 3 || beatInBar === 7) {
          const safeLane = randomLane();
          for (let lane = 0; lane < BOSS_RHYTHM_LANE_COUNT; lane += 1) {
            if (lane !== safeLane) pushHazard(t + step / 2, clampLane(lane), spec.phase);
          }
        }
        pushNote(t, stepNoteLane(), spec.phase);
        if ((beatInBar === 1 || beatInBar === 5) && random() < 0.6) {
          pushNote(t + step / 2, stepNoteLane(), spec.phase);
        }
      }
    }
  }

  // Finale — the dramatic final attack. First half: pure hazard walls to
  // survive (alternating safe lane). Second half: the core is exposed and
  // notes come rapid-fire so the killing blow lands here for most players.
  const finaleStep = beatSec(config.finaleBpm);
  let finaleSafeLane = randomLane();
  for (let beat = 0; beat < config.finaleBeats; beat += 1) {
    const t = config.finaleStartSec + beat * finaleStep;
    if (beat < 6) {
      for (let lane = 0; lane < BOSS_RHYTHM_LANE_COUNT; lane += 1) {
        if (lane !== finaleSafeLane) pushHazard(t, clampLane(lane), 3, true);
      }
      finaleSafeLane = clampLane(finaleSafeLane + (random() < 0.5 ? 1 : -1));
    } else if (beat < 14) {
      pushNote(t, stepNoteLane(), 3, true);
      pushNote(t + finaleStep / 2, stepNoteLane(), 3, true);
    } else {
      // Last two beats: one final wall, then the closing note.
      if (beat === 14) {
        const safeLane = randomLane();
        for (let lane = 0; lane < BOSS_RHYTHM_LANE_COUNT; lane += 1) {
          if (lane !== safeLane) pushHazard(t, clampLane(lane), 3, true);
        }
      } else {
        pushNote(t, clampLane(1), 3, true);
      }
    }
  }

  events.sort((a, b) => a.timeSec - b.timeSec || a.id - b.id);

  const noteCount = events.reduce((sum, e) => (e.kind === 'note' ? sum + 1 : sum), 0);
  const hazardCount = events.length - noteCount;
  const lastEventSec = events.length > 0 ? events[events.length - 1].timeSec : config.finaleStartSec;

  return {
    events,
    noteCount,
    hazardCount,
    bossMaxHp: getBossRhythmBossMaxHp(noteCount, config.tier),
    durationSec: lastEventSec + 1.6,
  };
}

/**
 * Boss core HP tuned against the chart's note count. All-perfect play deals
 * `2 × noteCount`, all-good deals `1 × noteCount`. The target sits below the
 * all-good line on early islands and climbs toward it by island 120, so a
 * ~70–80% hit rate with some perfects wins while careless play loses.
 */
export function getBossRhythmBossMaxHp(noteCount: number, tier: number): number {
  const ratio = Math.min(1.02, 0.82 + Math.max(0, tier) * 0.02);
  return Math.max(1, Math.round(noteCount * ratio));
}

/**
 * Judge a FIRE press against a note's scheduled hit-line time.
 * `deltaSec` = |pressTime − noteTime|. Returns null when outside the window.
 */
export function judgeBossRhythmTiming(
  deltaSec: number,
  config: Pick<BossRhythmConfig, 'perfectWindowSec' | 'goodWindowSec'>,
): BossRhythmJudgment | null {
  const delta = Math.abs(deltaSec);
  if (delta <= config.perfectWindowSec) return 'perfect';
  if (delta <= config.goodWindowSec) return 'good';
  return null;
}

export interface BossRhythmScoreState {
  score: number;
  combo: number;
  maxCombo: number;
}

/** Score values before the combo multiplier. */
export const BOSS_RHYTHM_SCORE_PERFECT = 150;
export const BOSS_RHYTHM_SCORE_GOOD = 75;

/** Combo multiplier: +5% per combo step, capped at 2×. */
export function getBossRhythmComboMultiplier(combo: number): number {
  return 1 + Math.min(20, Math.max(0, combo)) * 0.05;
}

export function applyBossRhythmHit(
  state: BossRhythmScoreState,
  judgment: BossRhythmJudgment,
): BossRhythmScoreState {
  const base = judgment === 'perfect' ? BOSS_RHYTHM_SCORE_PERFECT : BOSS_RHYTHM_SCORE_GOOD;
  const gained = Math.round(base * getBossRhythmComboMultiplier(state.combo));
  const combo = state.combo + 1;
  return {
    score: state.score + gained,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
  };
}

export type BossRhythmOutcome = 'victory' | 'defeat_hp' | 'defeat_time' | 'in_progress';

export function resolveBossRhythmOutcome(options: {
  bossHp: number;
  playerHp: number;
  songEnded: boolean;
}): BossRhythmOutcome {
  if (options.bossHp <= 0) return 'victory';
  if (options.playerHp <= 0) return 'defeat_hp';
  if (options.songEnded) return 'defeat_time';
  return 'in_progress';
}

/**
 * Rare reward (💎) granted on victory, on top of the standard boss bounty
 * (dice + money) the board already awards when the trial resolves. Scales
 * with island tier and pays a flawless bonus for ≥90% note accuracy.
 */
export function resolveBossRhythmRareReward(options: {
  islandNumber: number;
  accuracy: number;
}): { diamonds: number } {
  const tier = getBossRhythmTier(options.islandNumber);
  const base = 2 + Math.floor(tier / 3);
  const flawlessBonus = options.accuracy >= 0.9 ? 1 : 0;
  return { diamonds: Math.min(6, base + flawlessBonus) };
}
