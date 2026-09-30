import { getIslandRunAudioEnabled } from './islandRunAudio';

/**
 * Mission Phone "incoming message": the mission briefing waits on the phone
 * (red badge, ring, shake) until the player opens it. Presentation only; the
 * briefing acknowledgement stays the canonical write.
 */
export const MISSION_MESSAGE_NUDGE_INTERVAL_MS = 30_000;
/** Fallback when no controller landing plays (same island this session, adapters). */
export const MISSION_MESSAGE_CONTROLLER_LANDING_FALLBACK_MS = 3_000;
/** A beat after the controller lands before the message slides in. */
export const MISSION_MESSAGE_AFTER_LANDING_MS = 600;

/**
 * The incoming mission message waits for the controller to land on this
 * island, and for the screen to be free (user request 2026-09-30). The banner
 * then stays until the player taps it.
 */
export function shouldDeliverMissionMessage(options: {
  islandNumber: number;
  controllerLandedIslandNumber: number | null;
  controllerHidden: boolean;
  screenBusy: boolean;
}): boolean {
  return options.controllerLandedIslandNumber === options.islandNumber
    && !options.controllerHidden
    && !options.screenBusy;
}

export type MissionMessageStepKind = 'roll' | 'build' | 'boss' | 'egg' | 'dynamite' | 'fish' | 'collect';

export interface MissionMessageStep {
  kind: MissionMessageStepKind;
  label: string;
}

export function resolveMissionMessageStepKind(label: string): MissionMessageStepKind {
  const text = label.toLowerCase();
  if (text.includes('dynamite') || text.includes('blast')) return 'dynamite';
  if (text.includes('boss') || text.includes('guardian')) return 'boss';
  if (text.includes('egg') || text.includes('hatch')) return 'egg';
  if (text.includes('fish') || text.includes('catch')) return 'fish';
  if (text.includes('build') || text.includes('landmark') || text.includes('restore') || text.includes('repair')) return 'build';
  return 'collect';
}

/** A picture message is three steps: move, then the island's first two objectives. */
export function buildMissionMessageSteps(objectiveLabels: readonly string[]): MissionMessageStep[] {
  const objectives = objectiveLabels
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((label) => ({ kind: resolveMissionMessageStepKind(label), label }));
  return [{ kind: 'roll', label: 'Roll the dice to explore' }, ...objectives];
}

/** A short, original two-tone phone ring synthesised on the fly (no audio asset). */
export function playMissionMessageRing(): void {
  if (typeof window === 'undefined' || !getIslandRunAudioEnabled()) return;
  const AudioContextCtor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    const context = new AudioContextCtor();
    const start = context.currentTime + 0.02;
    [0, 0.2, 0.55, 0.75].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = index % 2 === 0 ? 1318.5 : 1046.5;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.18);
    });
    window.setTimeout(() => { void context.close().catch(() => undefined); }, 1_400);
  } catch {
    // Audio is decoration; a blocked context must never affect play.
  }
}
