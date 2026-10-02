import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { triggerIslandRunHaptic } from '../services/islandRunAudio';
import { buildMissionMessageSteps, type MissionMessageStepKind } from '../services/islandRunMissionMessage';
import { formatMissionPhoneMessageTime, type MissionPhoneMessage } from '../services/missionPhoneInbox';
import type { IslandMissionBriefingPresentation } from '../services/islandRunMissionBriefing';
import type { IslandMissionStats, IslandMissionTrackerObjective } from '../services/islandRunMissionTracker';
import type { resolveIslandRunCompletion } from '../services/islandRunCompletion';
import { LANDMARK_FLAG_LABEL, type LandmarkFlag } from '../services/landmarkFlags';

export type MissionObjectiveAction = 'launch' | 'details';

/** Mini Mission Phone for HUD buttons: the slim slab, status light and traffic-light stat bars. */
export function MissionPhoneRailIcon(): React.JSX.Element {
  return (
    <svg className="island-run-board__mission-phone-icon" viewBox="0 0 26 44" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="24" height="42" rx="5.5" fill="#1a1d22" stroke="#6b717a" strokeWidth="1.2" />
      <rect x="3.3" y="3.3" width="19.4" height="37.4" rx="3.6" fill="#0a1730" stroke="#e2ac60" strokeWidth="0.7" />
      <rect x="10" y="5.3" width="6" height="1.4" rx="0.7" fill="#4fd8ff" />
      <rect x="6.2" y="10.5" width="13.6" height="2.6" rx="1.3" fill="#4ade80" />
      <rect x="6.2" y="15.4" width="9.8" height="2.6" rx="1.3" fill="#facc15" />
      <rect x="6.2" y="20.3" width="6.4" height="2.6" rx="1.3" fill="#f87171" />
      <path d="M13 26.4 14.3 30.5 18.4 31.8 14.3 33.1 13 37.2 11.7 33.1 7.6 31.8 11.7 30.5z" fill="#3b8be0" />
    </svg>
  );
}

export interface IslandMissionBriefingModalProps {
  isOpen: boolean;
  presentation: IslandMissionBriefingPresentation | null;
  progress?: readonly IslandMissionTrackerObjective[];
  overallProgressPercent?: number;
  islandCompletion?: ReturnType<typeof resolveIslandRunCompletion> | null;
  stats?: IslandMissionStats | null;
  objectiveActions?: readonly MissionObjectiveAction[];
  objectiveDetails?: readonly string[];
  /** One flag per landmark: red = still needs work, green = 100% done. */
  landmarkFlags?: ReadonlyArray<{ id: string; title: string; flag: LandmarkFlag }>;
  /** An add-on mission (Island 002 Stormfront) with its own flagged structures. */
  addOnMission?: {
    title: string;
    items: ReadonlyArray<{ id: string; title: string; flag: LandmarkFlag; percent: number }>;
    actionLabel: string;
    onAction: () => void;
  };
  acknowledgeLabel?: string;
  /** Filed Mission Phone messages, newest first. */
  messages?: readonly MissionPhoneMessage[];
  /** Opened from an incoming message: start in that message's own view. */
  openMessageId?: string | null;
  /** The player has read a message; it is filed as read in the inbox. */
  onMessageRead?: (messageId: string) => void;
  onObjectiveSelect?: (objectiveIndex: number) => void;
  primaryActionLabel?: string;
  primaryActionHint?: string;
  primaryActionDisabled?: boolean;
  primaryActionBusy?: boolean;
  variant?: 'default' | 'living-compass';
  milestoneValue?: number;
  milestoneCount?: number;
  onPrimaryAction?: () => void;
  onAcknowledge: () => void;
}

type MissionPhonePhase = 'unfolding' | 'unlocking' | 'open' | 'folding';

// The phone arrives as a compact pack, unlatches with a click, then slides out
// into a full phone. Keep these in sync with the island-mission-phone-* keyframes.
const MISSION_PHONE_UNFOLD_DURATION_MS = 1100;
const MISSION_PHONE_FOLD_DURATION_MS = 460;
const MISSION_PHONE_FOLD_RECOVERY_MS = 120;
const MISSION_PHONE_UNFOLD_LATCH_MS = 470;
const MISSION_PHONE_UNFOLD_DOCK_MS = 970;
const MISSION_PHONE_FOLD_LATCH_MS = 240;
// Pretend Face ID: scan, tick, padlock opens, lock screen swipes away. A tap skips it.
const MISSION_PHONE_UNLOCK_DURATION_MS = 820;
const MISSION_PHONE_UNLOCK_SUCCESS_MS = 380;
const MISSION_PHONE_DIFFICULTY_LEVELS: Record<IslandMissionStats['difficulty'], number> = {
  Easy: 1,
  Medium: 2,
  'Medium-Hard': 3,
  Hard: 4,
  'Very Hard': 5,
};
const MISSION_PHONE_STANCE_LABELS: Record<IslandMissionStats['stance'], string> = {
  friendly: 'Friendly',
  diplomatic: 'Diplomatic',
  unfriendly: 'Unfriendly',
  war: 'WAR',
};
const MISSION_PHONE_EGG_STATE_LABELS: Record<Exclude<IslandMissionStats['egg']['state'], 'none'>, string> = {
  incubating: 'Incubating',
  ready: 'Ready to hatch',
  resolved: 'Claimed',
};

type BatteryManagerLike = EventTarget & { level: number; charging: boolean };

interface MissionPhoneDeviceStatus {
  now: Date;
  online: boolean;
  batteryLevel: number | null;
  charging: boolean;
}

// Real clock, connection and (where the browser exposes it) battery for the
// phone's status bar. Only runs while the phone is open.
function useMissionPhoneDeviceStatus(active: boolean): MissionPhoneDeviceStatus {
  const [status, setStatus] = React.useState<MissionPhoneDeviceStatus>(() => ({
    now: new Date(),
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    batteryLevel: null,
    charging: false,
  }));

  React.useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    let cancelled = false;
    let battery: BatteryManagerLike | null = null;
    const refreshClock = () => setStatus((current) => ({ ...current, now: new Date() }));
    const refreshOnline = () => setStatus((current) => ({ ...current, online: navigator.onLine }));
    const refreshBattery = () => {
      if (!battery || cancelled) return;
      const { level, charging } = battery;
      setStatus((current) => ({ ...current, batteryLevel: level, charging }));
    };
    refreshClock();
    refreshOnline();
    const clockTimer = window.setInterval(refreshClock, 15_000);
    window.addEventListener('online', refreshOnline);
    window.addEventListener('offline', refreshOnline);
    const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> }).getBattery;
    getBattery?.call(navigator).then((manager) => {
      if (cancelled) return;
      battery = manager;
      manager.addEventListener('levelchange', refreshBattery);
      manager.addEventListener('chargingchange', refreshBattery);
      refreshBattery();
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      window.clearInterval(clockTimer);
      window.removeEventListener('online', refreshOnline);
      window.removeEventListener('offline', refreshOnline);
      battery?.removeEventListener('levelchange', refreshBattery);
      battery?.removeEventListener('chargingchange', refreshBattery);
    };
  }, [active]);

  return status;
}

// Phone-style clock: "4:11", without a leading zero or AM/PM marker.
function formatMissionPhoneTime(date: Date): string {
  return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' })
    .formatToParts(date)
    .filter((part) => part.type === 'hour' || part.type === 'minute' || (part.type === 'literal' && part.value.trim() === ':'))
    .map((part) => part.value)
    .join('');
}

const MISSION_PHONE_EGG_TIER_LABELS: Record<Exclude<IslandMissionStats['egg'], { state: 'none' }>['tier'], string> = {
  common: 'Common',
  rare: 'Rare',
  mythic: 'Mythic',
};

function MissionPhoneStatusBar({ status }: { status: MissionPhoneDeviceStatus }): React.JSX.Element {
  const time = formatMissionPhoneTime(status.now);
  const batteryPercent = status.batteryLevel === null ? 100 : Math.round(status.batteryLevel * 100);
  return (
    <span className="island-mission-tracker__status-bar" aria-hidden="true">
      <span className="island-mission-tracker__status-time">{time}</span>
      <span className="island-mission-tracker__status-icons">
        <svg className="island-mission-tracker__status-signal" data-online={status.online} viewBox="0 0 18 12" focusable="false">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <span
          className="island-mission-tracker__status-battery"
          data-low={batteryPercent <= 20}
          data-charging={status.charging}
          style={{ '--mission-phone-battery': `${batteryPercent}%` } as React.CSSProperties}
        >
          <i />
        </span>
      </span>
    </span>
  );
}

function MissionPhoneLockScreen({ status, onSkip }: { status: MissionPhoneDeviceStatus; onSkip: () => void }): React.JSX.Element {
  const time = formatMissionPhoneTime(status.now);
  const date = status.now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="island-mission-tracker__lock" aria-hidden="true" onClick={onSkip}>
      <svg className="island-mission-tracker__lock-padlock" viewBox="0 0 20 24" focusable="false">
        <path className="island-mission-tracker__lock-shackle" d="M5 11V7a5 5 0 0 1 10 0v4" />
        <rect x="2.5" y="10.5" width="15" height="12" rx="3" />
      </svg>
      <strong className="island-mission-tracker__lock-time">{time}</strong>
      <small className="island-mission-tracker__lock-date">{date}</small>
      <span className="island-mission-tracker__faceid">
        <svg viewBox="0 0 64 64" focusable="false">
          <g className="island-mission-tracker__faceid-frame">
            <path d="M4 18V11a7 7 0 0 1 7-7h7" />
            <path d="M46 4h7a7 7 0 0 1 7 7v7" />
            <path d="M60 46v7a7 7 0 0 1-7 7h-7" />
            <path d="M18 60h-7a7 7 0 0 1-7-7v-7" />
          </g>
          <g className="island-mission-tracker__faceid-face">
            <path d="M22 23v5M42 23v5" />
            <path d="M32 23v11h-3" />
            <path d="M24 43c4.5 4 11.5 4 16 0" />
          </g>
          <path className="island-mission-tracker__faceid-check" d="M19 33.5 28.5 43 46 23" />
        </svg>
      </span>
      <small className="island-mission-tracker__lock-hint">Face ID</small>
    </div>
  );
}

// Every stat reads as a traffic light: green is good, yellow needs attention,
// red is a problem or still to do.
type MissionPhoneSignal = 'green' | 'yellow' | 'red';

const MISSION_PHONE_STANCE_SIGNALS: Record<IslandMissionStats['stance'], MissionPhoneSignal> = {
  friendly: 'green',
  diplomatic: 'yellow',
  unfriendly: 'red',
  war: 'red',
};

function resolveMissionPhoneSignals(stats: IslandMissionStats): Record<'island' | 'stance' | 'difficulty' | 'egg', MissionPhoneSignal> {
  const difficultyLevel = MISSION_PHONE_DIFFICULTY_LEVELS[stats.difficulty];
  return {
    island: stats.complete ? 'green' : stats.completionPercent >= 34 ? 'yellow' : 'red',
    stance: MISSION_PHONE_STANCE_SIGNALS[stats.stance],
    difficulty: difficultyLevel <= 1 ? 'green' : difficultyLevel <= 3 ? 'yellow' : 'red',
    egg: stats.egg.state === 'none' ? 'red' : stats.egg.state === 'incubating' ? 'yellow' : 'green',
  };
}

// The stance reads as a face in the same traffic-light colour as its signal:
// a friendly smile, a level diplomatic mouth, a frown, or furrowed brows.
function MissionPhoneStanceFace({ stance }: { stance: IslandMissionStats['stance'] }): React.JSX.Element {
  const mouth = stance === 'friendly'
    ? 'M5.2 10.6 Q9 14.2 12.8 10.6'
    : stance === 'diplomatic'
      ? 'M5.6 11.6 H12.4'
      : 'M5.4 13 Q9 9.8 12.6 13';
  return (
    <svg className="island-mission-tracker__stance-face" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <circle cx="9" cy="9" r="7.6" />
      <circle className="island-mission-tracker__stance-eye" cx="6.3" cy="7.2" r="1.15" />
      <circle className="island-mission-tracker__stance-eye" cx="11.7" cy="7.2" r="1.15" />
      {stance === 'war' ? <path d="M4.4 4.6 7.6 6 M13.6 4.6 10.4 6" /> : null}
      <path d={mouth} />
    </svg>
  );
}

function MissionPhoneStats({ stats }: { stats: IslandMissionStats }): React.JSX.Element {
  const difficultyLevel = MISSION_PHONE_DIFFICULTY_LEVELS[stats.difficulty];
  const egg = stats.egg;
  const signals = resolveMissionPhoneSignals(stats);
  return (
    <ul className="island-mission-tracker__stats" aria-label="Island status">
      <li className="island-mission-tracker__stat" data-complete={stats.complete} data-signal={signals.island}>
        <small>Island</small>
        <strong>{stats.complete ? 'Cleared' : `${stats.completionPercent}%`}</strong>
        <span className="island-mission-tracker__stat-meter" aria-hidden="true">
          <i style={{ width: `${stats.completionPercent}%` }} />
        </span>
      </li>
      <li className="island-mission-tracker__stat island-mission-tracker__stat--stance" data-stance={stats.stance} data-signal={signals.stance}>
        <small>Island stance</small>
        <strong><MissionPhoneStanceFace stance={stats.stance} />{MISSION_PHONE_STANCE_LABELS[stats.stance]}</strong>
        <span className="island-mission-tracker__stat-note">{stats.stance === 'war' ? 'Emergency status' : 'Toward the expedition'}</span>
      </li>
      <li className="island-mission-tracker__stat" data-signal={signals.difficulty} aria-label={`Difficulty: ${stats.difficulty}, ${difficultyLevel} of 5`}>
        <small>Difficulty</small>
        <strong>{stats.difficulty}</strong>
        <span className="island-mission-tracker__stat-pips" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => <i key={index} className={index < difficultyLevel ? 'is-filled' : undefined} />)}
        </span>
      </li>
      <li className="island-mission-tracker__stat island-mission-tracker__stat--egg" data-tier={egg.state === 'none' ? 'none' : egg.tier} data-signal={signals.egg}>
        <small>Egg</small>
        <strong>
          <svg viewBox="0 0 12 15" aria-hidden="true" focusable="false"><path d="M6 .8C3 .8.8 5.6.8 9a5.2 5.2 0 0 0 10.4 0C11.2 5.6 9 .8 6 .8z" /></svg>
          {egg.state === 'none' ? 'None yet' : MISSION_PHONE_EGG_TIER_LABELS[egg.tier]}
        </strong>
        <span className="island-mission-tracker__stat-note">{egg.state === 'none' ? 'Set one at the Hatchery' : MISSION_PHONE_EGG_STATE_LABELS[egg.state]}</span>
      </li>
    </ul>
  );
}
const MISSION_PHONE_PACK_CENTER_RATIO = 0.1;
const MISSION_PHONE_LAUNCH_SOURCE_SELECTOR = '.island-run-board__mission-phone-floating, .island-run-board__mission-phone-rail';

// Points the fly-in/fly-out at the rail button that summoned the phone, so the
// pack visibly leaves and returns to it. Falls back to the lower right edge.
function setMissionPhoneLaunchOrigin(phone: HTMLElement | null): void {
  if (!phone || typeof window === 'undefined') return;
  const phoneRect = phone.getBoundingClientRect();
  const sourceRect = document.querySelector<HTMLElement>(MISSION_PHONE_LAUNCH_SOURCE_SELECTOR)?.getBoundingClientRect();
  const hasSource = Boolean(sourceRect && sourceRect.width > 0 && sourceRect.height > 0);
  const targetX = hasSource && sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth - 40;
  const targetY = hasSource && sourceRect ? sourceRect.top + sourceRect.height / 2 : window.innerHeight * 0.62;
  const packCenterX = phoneRect.left + phoneRect.width / 2;
  const packCenterY = phoneRect.top + phoneRect.height * MISSION_PHONE_PACK_CENTER_RATIO;
  phone.style.setProperty('--mission-phone-launch-x', `${Math.round(targetX - packCenterX)}px`);
  phone.style.setProperty('--mission-phone-launch-y', `${Math.round(targetY - packCenterY)}px`);
}

/** Original illustrations for the picture message; one per step kind. */
function MissionMessagePicture({ kind }: { kind: MissionMessageStepKind }): React.JSX.Element {
  switch (kind) {
    case 'roll':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="10" y="14" width="34" height="34" rx="8" fill="#fff" stroke="#16324a" strokeWidth="3" transform="rotate(-10 27 31)" />
          <g fill="#16324a" transform="rotate(-10 27 31)"><circle cx="19" cy="23" r="3.2" /><circle cx="27" cy="31" r="3.2" /><circle cx="35" cy="39" r="3.2" /></g>
          <rect x="34" y="28" width="22" height="22" rx="6" fill="#ffd54a" stroke="#16324a" strokeWidth="3" transform="rotate(14 45 39)" />
          <g fill="#16324a" transform="rotate(14 45 39)"><circle cx="40" cy="34" r="2.6" /><circle cx="50" cy="44" r="2.6" /></g>
          <path d="M8 56c10-4 22-4 32 0" fill="none" stroke="#7fd6ff" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 5" />
        </svg>
      );
    case 'build':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d="M10 54h44" stroke="#16324a" strokeWidth="3" strokeLinecap="round" />
          <path d="M16 54V30l16-12 16 12v24z" fill="#ffe7b0" stroke="#16324a" strokeWidth="3" strokeLinejoin="round" />
          <rect x="27" y="38" width="10" height="16" fill="#7fd6ff" stroke="#16324a" strokeWidth="2.5" />
          <path d="M44 12l8 8-14 14-8-8z" fill="#ffb03a" stroke="#16324a" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M52 20l6 6" stroke="#16324a" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'boss':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d="M12 44l-2-24 12 10 10-16 10 16 12-10-2 24z" fill="#ffd54a" stroke="#16324a" strokeWidth="3" strokeLinejoin="round" />
          <rect x="12" y="44" width="40" height="8" rx="2" fill="#ffb03a" stroke="#16324a" strokeWidth="3" />
          <circle cx="32" cy="36" r="4" fill="#e8264f" stroke="#16324a" strokeWidth="2" />
        </svg>
      );
    case 'egg':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d="M32 8c11 0 20 17 20 30a20 20 0 0 1-40 0C12 25 21 8 32 8z" fill="#fff4dc" stroke="#16324a" strokeWidth="3" />
          <path d="M18 36l7-5 7 6 7-6 7 5" fill="none" stroke="#ffb03a" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="26" cy="22" r="3" fill="#7fd6ff" /><circle cx="39" cy="46" r="3.5" fill="#7fd6ff" />
        </svg>
      );
    case 'dynamite':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <g stroke="#16324a" strokeWidth="3"><rect x="14" y="26" width="10" height="28" rx="2" fill="#e8264f" /><rect x="27" y="24" width="10" height="30" rx="2" fill="#e8264f" /><rect x="40" y="26" width="10" height="28" rx="2" fill="#e8264f" /></g>
          <path d="M12 36h40" stroke="#16324a" strokeWidth="5" />
          <path d="M32 24c0-8 6-10 10-14" fill="none" stroke="#16324a" strokeWidth="2.5" />
          <path d="M44 4l2 5 5-1-3 4 4 3-5 1 1 5-4-3-3 4v-5l-5-1 4-3z" fill="#ffd54a" stroke="#16324a" strokeWidth="1.5" />
        </svg>
      );
    case 'fish':
      // A fishing rod pops onto a board tile: the same thing happens on the
      // island when this message launches the fishing mission.
      return (
        <svg className="mission-message-rod-pop" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d="M10 48L32 57L54 48V53L32 62L10 53Z" fill="#11668d" stroke="#16324a" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M32 40l22 8-22 9-22-9z" fill="#42cfc0" stroke="#16324a" strokeWidth="2.5" strokeLinejoin="round" />
          <g className="mission-message-rod-pop__rod">
            <path d="M24 46L44 8" stroke="#16324a" strokeWidth="4" strokeLinecap="round" />
            <path d="M24 46L44 8" stroke="#c98a45" strokeWidth="2" strokeLinecap="round" />
            <circle cx="28" cy="38" r="4" fill="#ffd54a" stroke="#16324a" strokeWidth="2" />
            <path d="M44 8c6 6 7 14 3 20" fill="none" stroke="#16324a" strokeWidth="1.5" strokeDasharray="2 2" />
            <path d="M47 28c-2 2 0 5 2 3" fill="none" stroke="#16324a" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          <g className="mission-message-rod-pop__sparkle" fill="#ffd54a" stroke="#16324a" strokeWidth="1.2">
            <path d="M14 30l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
            <path d="M52 34l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" />
          </g>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d="M32 6l7 16 17 2-13 11 4 17-15-9-15 9 4-17L8 24l17-2z" fill="#ffd54a" stroke="#16324a" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
  }
}

function MissionPictureMessage({ labels, variant = 'compact' }: { labels: readonly string[]; variant?: 'compact' | 'boxed' }): React.JSX.Element {
  const steps = buildMissionMessageSteps(labels);
  return (
    <section className={`island-mission-tracker__picture-message island-mission-tracker__picture-message--${variant}`} aria-label="What to do on this island">
      <p className="island-mission-tracker__picture-message-kicker">Here&apos;s what to do</p>
      <ol>
        {steps.map((step, index) => (
          <li key={`${step.kind}-${index}`} data-kind={step.kind} style={{ '--mission-step-index': index } as React.CSSProperties}>
            <b aria-hidden="true">{index + 1}</b>
            <span className="island-mission-tracker__picture-message-art"><MissionMessagePicture kind={step.kind} /></span>
            <small><span className="island-mission-tracker__step-kicker">Step {index + 1}</span>{step.label}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MissionObjectiveGlyph({ label }: { label: string }): React.JSX.Element {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes('dynamite')) {
    return (
      <svg className="island-mission-tracker__objective-glyph--demolition" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <g transform="rotate(-6 12 13)">
          <rect x="4.5" y="7.6" width="4" height="12" rx="0.8" />
          <rect x="10" y="6.8" width="4" height="12.8" rx="0.8" />
          <rect x="15.5" y="7.6" width="4" height="12" rx="0.8" />
          <path className="island-mission-tracker__glyph-band" d="M3.8 11.4h16.4v4.1H3.8z" />
        </g>
        <path className="island-mission-tracker__glyph-line" d="M12 7c-.2-2.4 2-3.2 3-4.5" />
        <path className="island-mission-tracker__glyph-spark" d="m16.1 2.8 1.2-1.7.1 2.1 2-.7-1.4 1.6 1.9.9-2.1.2.5 2-1.5-1.4-1 1.8.1-2.1-2 .4 1.7-1.3-1.9-.8 2.1-.3z" />
      </svg>
    );
  }

  if (normalizedLabel.includes('build')) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4.1 19.2h15.8v2H4.1zM6.1 9.4h2.7v9H6.1zM10.7 9.4h2.7v9h-2.7zM15.2 9.4h2.7v9h-2.7zM4.6 6.9h14.8v2.6H4.6zM3.6 5.8 12 1.7l8.4 4.1v1.4H3.6z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M5 3.7h14v16.6H5z" />
      <path className="island-mission-tracker__glyph-cutout" d="m8 12.1 2.2 2.3 5.8-6" />
    </svg>
  );
}

export function IslandMissionBriefingModal({
  isOpen,
  presentation,
  progress = [],
  overallProgressPercent,
  islandCompletion,
  stats = null,
  objectiveActions = [],
  objectiveDetails = [],
  landmarkFlags,
  addOnMission,
  acknowledgeLabel = 'Accept field order',
  messages = [],
  openMessageId = null,
  onMessageRead,
  onObjectiveSelect,
  primaryActionLabel,
  primaryActionHint,
  primaryActionDisabled = false,
  primaryActionBusy = false,
  variant = 'default',
  milestoneValue = 0,
  milestoneCount = 0,
  onPrimaryAction,
  onAcknowledge,
}: IslandMissionBriefingModalProps): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<MissionPhonePhase>('unfolding');
  const [selectedObjectiveIndex, setSelectedObjectiveIndex] = React.useState<number | null>(null);
  // Mission dashboard, or an incoming message shown fullscreen (100% focus).
  // Filed messages live in their own Messages modal, never on the dashboard.
  const [screen, setScreen] = React.useState<{ kind: 'mission' } | { kind: 'message'; id: string }>(
    openMessageId ? { kind: 'message', id: openMessageId } : { kind: 'mission' },
  );
  const [messagesModal, setMessagesModal] = React.useState<null | { view: 'list' } | { view: 'read'; id: string }>(null);
  const messagesModalRef = React.useRef(messagesModal);
  messagesModalRef.current = messagesModal;
  const onMessageReadRef = React.useRef(onMessageRead);
  onMessageReadRef.current = onMessageRead;
  const screenRef = React.useRef(screen);
  screenRef.current = screen;
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;
  const fileOpenMessage = React.useCallback(() => {
    const current = screenRef.current;
    if (current.kind !== 'message') return;
    const message = messagesRef.current.find((entry) => entry.id === current.id);
    if (message && message.readAtMs === null) onMessageReadRef.current?.(message.id);
  }, []);
  const titleId = React.useId();
  const acknowledgeRef = React.useRef<HTMLButtonElement | null>(null);
  const phoneRef = React.useRef<HTMLElement | null>(null);
  const onAcknowledgeRef = React.useRef(onAcknowledge);
  const onObjectiveSelectRef = React.useRef(onObjectiveSelect);
  const phaseRef = React.useRef<MissionPhonePhase>('unfolding');
  const isOpenRef = React.useRef(isOpen);
  isOpenRef.current = isOpen;
  const closeTimerRef = React.useRef<number | null>(null);
  const deviceStatus = useMissionPhoneDeviceStatus(isOpen);

  const updatePhase = React.useCallback((nextPhase: MissionPhonePhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const requestFold = React.useCallback((onFolded: () => void) => {
    if (phaseRef.current === 'folding') return;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      onFolded();
      return;
    }
    setMissionPhoneLaunchOrigin(phoneRef.current);
    updatePhase('folding');
    window.setTimeout(() => triggerIslandRunHaptic('mission_phone_latch'), MISSION_PHONE_FOLD_LATCH_MS);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onFolded();
      // A fold whose handler leaves the phone open must never strand it
      // folded: every button stays disabled and the controller hidden.
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        if (isOpenRef.current && phaseRef.current === 'folding') updatePhase('unfolding');
      }, MISSION_PHONE_FOLD_RECOVERY_MS);
    }, MISSION_PHONE_FOLD_DURATION_MS);
  }, [updatePhase]);

  const requestClose = React.useCallback(() => {
    // Closing the phone files an open message as read.
    fileOpenMessage();
    requestFold(() => onAcknowledgeRef.current());
  }, [fileOpenMessage, requestFold]);

  const handleObjectiveClick = React.useCallback((objectiveIndex: number) => {
    const action = objectiveActions[objectiveIndex] ?? 'details';
    if (action === 'details') {
      setSelectedObjectiveIndex(objectiveIndex);
      return;
    }
    requestFold(() => onObjectiveSelectRef.current?.(objectiveIndex));
  }, [objectiveActions, requestFold]);

  React.useEffect(() => {
    onAcknowledgeRef.current = onAcknowledge;
  }, [onAcknowledge]);

  React.useEffect(() => {
    onObjectiveSelectRef.current = onObjectiveSelect;
  }, [onObjectiveSelect]);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setSelectedObjectiveIndex(null);
      updatePhase('unfolding');
      return undefined;
    }
    setScreen(openMessageId ? { kind: 'message', id: openMessageId } : { kind: 'mission' });
    setMessagesModal(null);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    updatePhase(reduceMotion ? 'open' : 'unfolding');
    const unlockScroll = lockPageScroll();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // The Messages modal sits on top of the phone: Escape closes it first.
      if (messagesModalRef.current) { setMessagesModal(null); return; }
      requestClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
    };
    // openMessageId only matters when the phone opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, requestClose, updatePhase]);

  React.useLayoutEffect(() => {
    if (isOpen) setMissionPhoneLaunchOrigin(phoneRef.current);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || phase !== 'unfolding') return undefined;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timers = [window.setTimeout(
      () => updatePhase(reduceMotion ? 'open' : 'unlocking'),
      reduceMotion ? 1 : MISSION_PHONE_UNFOLD_DURATION_MS,
    )];
    if (!reduceMotion) {
      timers.push(
        window.setTimeout(() => triggerIslandRunHaptic('mission_phone_latch'), MISSION_PHONE_UNFOLD_LATCH_MS),
        window.setTimeout(() => triggerIslandRunHaptic('mission_phone_dock'), MISSION_PHONE_UNFOLD_DOCK_MS),
      );
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isOpen, phase, updatePhase]);

  React.useEffect(() => {
    if (!isOpen || phase !== 'unlocking') return undefined;
    const timers = [
      window.setTimeout(() => triggerIslandRunHaptic('mission_phone_latch'), MISSION_PHONE_UNLOCK_SUCCESS_MS),
      window.setTimeout(() => updatePhase('open'), MISSION_PHONE_UNLOCK_DURATION_MS),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isOpen, phase, updatePhase]);

  const skipUnlock = React.useCallback(() => {
    if (phaseRef.current === 'unlocking') updatePhase('open');
  }, [updatePhase]);

  React.useEffect(() => {
    if (phase !== 'open') return undefined;
    const focusTimer = window.setTimeout(() => acknowledgeRef.current?.focus(), 320);
    return () => window.clearTimeout(focusTimer);
  }, [phase]);

  React.useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  if (!isOpen || !presentation || typeof document === 'undefined') return null;

  const normalizedProgress = progress.map((item) => {
    const target = Math.max(1, item.target);
    const value = Math.max(0, Math.min(target, item.value));
    return { ...item, target, value, complete: value >= target };
  });
  const derivedOverallPercent = normalizedProgress.length > 0
    ? Math.round(normalizedProgress.reduce((total, item) => total + (item.value / item.target), 0) * (100 / normalizedProgress.length))
    : 0;
  const overallPercent = Math.max(0, Math.min(100, Math.round(overallProgressPercent ?? derivedOverallPercent)));
  const missionTitle = presentation.headline;
  const selectedObjective = selectedObjectiveIndex === null
    ? null
    : normalizedProgress[selectedObjectiveIndex] ?? null;
  const unreadCount = messages.filter((entry) => entry.readAtMs === null).length;
  const openMessage = screen.kind === 'message' ? messages.find((entry) => entry.id === screen.id) ?? null : null;
  const nowMs = Date.now();
  const showMessageView = screen.kind === 'message' && openMessage !== null;
  const showInbox = false;
  const modalMessage = messagesModal?.view === 'read' ? messages.find((entry) => entry.id === messagesModal.id) ?? null : null;
  const openMessagesModal = () => { fileOpenMessage(); setSelectedObjectiveIndex(null); setScreen({ kind: 'mission' }); setMessagesModal({ view: 'list' }); };
  const readInModal = (id: string) => {
    const message = messages.find((entry) => entry.id === id);
    if (message && message.readAtMs === null) onMessageReadRef.current?.(message.id);
    setMessagesModal({ view: 'read', id });
  };

  return createPortal(
    <div className="island-mission-tracker" data-phase={phase} data-variant={variant} data-objective-count={normalizedProgress.length} role="presentation">
      <section
        ref={phoneRef}
        className="island-mission-tracker__phone"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <span className="island-mission-tracker__phone-shadow" aria-hidden="true" />
        {/* Close sits on the phone's top-right corner, outside the screen. */}
        <button
          ref={acknowledgeRef}
          type="button"
          className="island-mission-tracker__close"
          aria-label={acknowledgeLabel}
          title={acknowledgeLabel}
          onClick={requestClose}
          disabled={phase !== 'open'}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="island-mission-tracker__device">
          <span className="island-mission-tracker__edge island-mission-tracker__edge--left" aria-hidden="true"><i /></span>
          <span className="island-mission-tracker__edge island-mission-tracker__edge--right" aria-hidden="true"><i /></span>
          <span className="island-mission-tracker__edge island-mission-tracker__edge--top" aria-hidden="true" />
          <span className="island-mission-tracker__edge island-mission-tracker__edge--bottom" aria-hidden="true" />
          <div className="island-mission-tracker__body">
            <span className="island-mission-tracker__glass" aria-hidden="true" />
            <span className="island-mission-tracker__led" aria-hidden="true" />
            <span className="island-mission-tracker__pack-face" aria-hidden="true">
              <svg viewBox="0 0 48 48" focusable="false">
                <path d="M24 3.5 28.2 19.8 44.5 24 28.2 28.2 24 44.5 19.8 28.2 3.5 24 19.8 19.8z" />
                <path className="island-mission-tracker__pack-face-facet" d="M24 3.5 28.2 19.8 24 24zm20.5 20.5L28.2 28.2 24 24zM24 44.5l-4.2-16.3L24 24zM3.5 24l16.3-4.2L24 24z" />
              </svg>
              <small>Mission · {overallPercent}%</small>
            </span>
            <span className="island-mission-tracker__sheen" aria-hidden="true" />
            <MissionPhoneStatusBar status={deviceStatus} />
            <MissionPhoneLockScreen status={deviceStatus} onSkip={skipUnlock} />

            <div className="island-mission-tracker__phone-screen" style={islandCompletion ? { overflowY: 'auto' } : undefined}>
              {!showMessageView ? (
              <header className="island-mission-tracker__header">
                {stats ? <MissionPhoneStats stats={stats} /> : null}
                <div className="island-mission-tracker__mission-caption">
                  <span>
                    <small>{showMessageView ? 'Message' : showInbox ? 'Mission Phone' : 'Current mission'}</small>
                    <h2 id={titleId}>{showMessageView ? openMessage?.title : showInbox ? 'Inbox' : missionTitle}</h2>
                  </span>
                  <button
                    type="button"
                    className={`island-mission-tracker__inbox-button island-mission-tracker__messages-button${unreadCount > 0 ? ' island-mission-tracker__inbox-button--unread' : ''}`}
                    aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
                    onClick={openMessagesModal}
                    disabled={phase !== 'open'}
                  >
                    <span aria-hidden="true">✉</span>
                    <em>Messages</em>
                    {unreadCount > 0 ? <b aria-hidden="true">{unreadCount}</b> : null}
                  </button>
                </div>
              </header>
              ) : null}

              {showMessageView && openMessage ? (
                <section className="island-mission-tracker__message island-mission-tracker__message--fullscreen" aria-label={`Message from ${openMessage.sender}`}>
                  <p className="island-mission-tracker__message-meta">
                    <span className="island-mission-tracker__message-pulse" aria-hidden="true">📡</span>
                    <span>Incoming · {openMessage.sender}</span>
                    <time>{formatMissionPhoneMessageTime(openMessage.receivedAtMs, nowMs)}</time>
                  </p>
                  <h2 id={titleId} className="island-mission-tracker__message-title">{openMessage.title}</h2>
                  {openMessage.body ? <p className="island-mission-tracker__message-body">{openMessage.body}</p> : null}
                  {openMessage.stepLabels.length > 0 ? <MissionPictureMessage labels={openMessage.stepLabels} variant="boxed" /> : null}
                  <div className="island-mission-tracker__message-actions">
                    <button
                      type="button"
                      className="island-mission-tracker__message-file"
                      onClick={() => { fileOpenMessage(); setScreen({ kind: 'mission' }); }}
                    >
                      {openMessage.readAtMs === null ? "Got it · let's go" : 'Back to mission'}
                    </button>
                    <button type="button" className="island-mission-tracker__message-inbox" onClick={openMessagesModal}>
                      All messages
                    </button>
                  </div>
                </section>
              ) : selectedObjective ? (
                <section className="island-mission-tracker__objective-detail" aria-label={`${selectedObjective.label} mission information`}>
                  <button
                    type="button"
                    className="island-mission-tracker__objective-back"
                    onClick={() => setSelectedObjectiveIndex(null)}
                  >
                    <span aria-hidden="true">‹</span> Objectives
                  </button>
                  <div className="island-mission-tracker__objective-detail-card">
                    <span className="island-mission-tracker__objective-detail-glyph" aria-hidden="true">
                      <MissionObjectiveGlyph label={selectedObjective.label} />
                    </span>
                    <small>Mission objective</small>
                    <h3>{selectedObjective.label}</h3>
                    <p>{objectiveDetails[selectedObjectiveIndex ?? 0] ?? presentation.primaryObjective}</p>
                  </div>
                </section>
              ) : (
                <>
                <ol className="island-mission-tracker__checklist" aria-label="Mission objectives">
                  {normalizedProgress.map((item, objectiveIndex) => {
                    const objectiveLabel = `${item.label}: ${item.complete ? item.completeLabel : `${item.value} of ${item.target}`}`;
                    const objectiveContent = (
                      <>
                        <span
                          className="island-mission-tracker__objective-marker"
                          aria-hidden="true"
                          style={{ '--mission-objective-progress': `${Math.round((item.value / item.target) * 360)}deg` } as React.CSSProperties}
                        >
                          <span>
                            {item.complete ? '✓' : <MissionObjectiveGlyph label={item.label} />}
                          </span>
                        </span>
                        <span className="island-mission-tracker__objective-copy">
                          <strong>{item.label}</strong>
                        </span>
                        <span className="island-mission-tracker__objective-count">
                          {item.complete && item.label !== 'Build Landmarks' ? 'Done' : item.displayValue ?? `${Math.floor(item.value)} / ${Math.floor(item.target)}`}
                        </span>
                        {onObjectiveSelect ? <span className="island-mission-tracker__objective-chevron" aria-hidden="true">›</span> : null}
                      </>
                    );
                    return (
                      <li
                        key={item.label}
                        className={item.complete ? 'island-mission-tracker__checklist-item--complete' : undefined}
                      >
                        {onObjectiveSelect ? (
                          <button
                            type="button"
                            className="island-mission-tracker__objective-row island-mission-tracker__objective-row--actionable"
                            aria-label={`${objectiveLabel}. Open objective.`}
                            onClick={() => handleObjectiveClick(objectiveIndex)}
                          >
                            {objectiveContent}
                          </button>
                        ) : (
                          <div className="island-mission-tracker__objective-row" aria-label={objectiveLabel}>
                            {objectiveContent}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {landmarkFlags && landmarkFlags.length > 0 ? (
                  <section className="island-mission-tracker__flags" aria-label="Landmark flags">
                    <header>
                      <small>Landmark flags</small>
                      <span><i className="island-landmark-flag island-landmark-flag--green" aria-hidden="true" /> green flag = built to Level 3</span>
                    </header>
                    <ul>
                      {landmarkFlags.map((landmark) => (
                        <li key={landmark.id} data-flag={landmark.flag}>
                          {landmark.flag === 'none'
                            ? <span className="island-mission-tracker__flag-empty" aria-hidden="true" />
                            : <i className={`island-landmark-flag island-landmark-flag--${landmark.flag}`} aria-hidden="true" />}
                          <strong>{landmark.title}</strong>
                          <small>{LANDMARK_FLAG_LABEL[landmark.flag]}</small>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {addOnMission ? (
                  <section className="island-mission-tracker__flags island-mission-tracker__addon" aria-label={`Add-on mission: ${addOnMission.title}`}>
                    <header>
                      <small>⚡ Add-on mission</small>
                      <span>{addOnMission.title}</span>
                    </header>
                    <ul>
                      {addOnMission.items.map((item) => (
                        <li key={item.id} data-flag={item.flag}>
                          {item.flag === 'none'
                            ? <span className="island-mission-tracker__flag-empty" aria-hidden="true" />
                            : <i className={`island-landmark-flag island-landmark-flag--${item.flag}`} aria-hidden="true" />}
                          <strong>{item.title}</strong>
                          <small>{LANDMARK_FLAG_LABEL[item.flag]} · {item.percent}%</small>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="island-mission-tracker__addon-action" onClick={addOnMission.onAction}>{addOnMission.actionLabel}</button>
                  </section>
                ) : null}
                </>
              )}

              {primaryActionLabel && onPrimaryAction && !showMessageView && !showInbox ? (
                <div className="island-mission-tracker__mission-action">
                  {milestoneCount > 0 ? (
                    <span className="island-mission-tracker__milestones" aria-label={`${milestoneValue} of ${milestoneCount} mission stages complete`}>
                      {Array.from({ length: milestoneCount }, (_, index) => (
                        <i key={index} className={index < milestoneValue ? 'is-filled' : undefined} aria-hidden="true">{variant === 'living-compass' ? index + 1 : '⬡'}</i>
                      ))}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={primaryActionDisabled || primaryActionBusy || phase !== 'open'}
                    onClick={onPrimaryAction}
                  >
                    <span aria-hidden="true">{variant === 'living-compass' ? '✧' : milestoneValue >= milestoneCount && milestoneCount > 0 ? '👑' : '🍯'}</span>
                    <strong>{primaryActionBusy ? variant === 'living-compass' ? 'Awakening…' : 'PRESSURISING…' : primaryActionLabel}</strong>
                  </button>
                  {primaryActionHint ? <small>{primaryActionHint}</small> : null}
                </div>
              ) : null}

              {!showMessageView && !showInbox ? (
              <footer className="island-mission-tracker__overall" aria-label="Mission progress">
                <span>
                  <small>Mission progress</small>
                  <strong>{overallPercent}%</strong>
                </span>
                <span
                  className="island-mission-tracker__overall-track"
                  role="progressbar"
                  aria-label="Overall mission progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={overallPercent}
                >
                  <i style={{ width: `${overallPercent}%` }} />
                </span>
              </footer>
              ) : null}
              {islandCompletion && !showMessageView ? (
                <details style={{ fontSize: 11, lineHeight: 1.5, marginTop: 8, maxHeight: 135, overflowY: 'auto', flexShrink: 0 }}>
                  <summary aria-label={`Island completion ${islandCompletion.percent}%`} style={{ cursor: 'pointer' }}>
                    Island {islandCompletion.percent}% · {islandCompletion.complete ? 'Ready to travel' : 'View remaining requirements'}
                  </summary>
                  <ul style={{ paddingLeft: 16, margin: '6px 0' }}>
                    {islandCompletion.requirements.map(item => (
                      <li key={item.id}>{item.complete ? '✓' : '○'} {item.label} · {item.value}/{item.target}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            <span className="island-mission-tracker__bottom-cap" aria-hidden="true"><i /></span>
          </div>
        </div>
      </section>
      {messagesModal ? (
        <div className="island-mission-messages" role="dialog" aria-modal="true" aria-label={modalMessage ? modalMessage.title : 'Messages'}>
          <button type="button" className="island-mission-messages__backdrop" aria-label="Close messages" onClick={() => setMessagesModal(null)} />
          <section className="island-mission-messages__sheet">
            <header className="island-mission-messages__header">
              {modalMessage ? (
                <button type="button" className="island-mission-messages__back" onClick={() => setMessagesModal({ view: 'list' })}>
                  <span aria-hidden="true">‹</span> Messages
                </button>
              ) : <h2>Messages</h2>}
              <button type="button" className="island-mission-messages__close" aria-label="Close messages" onClick={() => setMessagesModal(null)}>×</button>
            </header>
            {modalMessage ? (
              <article className="island-mission-messages__read">
                <p className="island-mission-tracker__message-meta">
                  <span aria-hidden="true">📡</span>
                  <span>{modalMessage.sender} · Island {String(modalMessage.islandNumber).padStart(3, '0')}</span>
                  <time>{formatMissionPhoneMessageTime(modalMessage.receivedAtMs, nowMs)}</time>
                </p>
                <h3>{modalMessage.title}</h3>
                {modalMessage.body ? <p className="island-mission-tracker__message-body">{modalMessage.body}</p> : null}
                {modalMessage.stepLabels.length > 0 ? <MissionPictureMessage labels={modalMessage.stepLabels} variant="boxed" /> : null}
              </article>
            ) : messages.length === 0 ? (
              <p className="island-mission-tracker__inbox-empty">No messages yet. Central Command will ping you here.</p>
            ) : (
              <ul className="island-mission-messages__list">
                {messages.map((entry) => (
                  <li key={entry.id}>
                    <button type="button" className={entry.readAtMs === null ? 'is-unread' : undefined} onClick={() => readInModal(entry.id)}>
                      <span className="island-mission-tracker__inbox-dot" aria-hidden="true" />
                      <span className="island-mission-tracker__inbox-copy">
                        <strong>{entry.title}</strong>
                        <small>{entry.sender} · Island {String(entry.islandNumber).padStart(3, '0')}</small>
                      </span>
                      <time>{formatMissionPhoneMessageTime(entry.receivedAtMs, nowMs)}</time>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
