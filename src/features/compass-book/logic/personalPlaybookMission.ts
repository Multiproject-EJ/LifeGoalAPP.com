import type { CompassAnswerRecord } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export type PersonalPlaybookMissionState = {
  readyCount: number;
  totalSystems: number;
  missionStartedAt: number | null;
  latestAnswerAt: number | null;
  missionDeadline: number | null;
  daysLeft: number;
  launched: boolean;
};

function validAnswerTime(value: string): number | null {
  const time = Date.parse(value);
  // In-progress preview answers intentionally use the Unix epoch. They must not
  // make a real seven-day mission appear to have expired in 1970.
  return Number.isFinite(time) && time > Date.UTC(2000, 0, 1) ? time : null;
}

/**
 * Pure launch-window calculation for the Chapter VI rocket story.
 *
 * Completion is celebratory, not punitive: missing the seven-day window never
 * deletes answers or progress. It only decides whether the visual launch
 * sequence fires for that run.
 */
export function calculatePersonalPlaybookMission(options: {
  systemReady: readonly boolean[];
  answers: readonly CompassAnswerRecord[];
  nowMs?: number;
}): PersonalPlaybookMissionState {
  const readyCount = options.systemReady.filter(Boolean).length;
  const totalSystems = options.systemReady.length;
  const times = options.answers
    .flatMap((answer) => [validAnswerTime(answer.answeredAt), validAnswerTime(answer.updatedAt)])
    .filter((time): time is number => time != null)
    .sort((a, b) => a - b);
  const missionStartedAt = times[0] ?? null;
  const latestAnswerAt = times[times.length - 1] ?? null;
  const missionDeadline = missionStartedAt == null ? null : missionStartedAt + 7 * DAY_MS;
  const nowMs = options.nowMs ?? Date.now();
  const daysLeft = missionDeadline == null
    ? 7
    : Math.max(0, Math.ceil((missionDeadline - nowMs) / DAY_MS));
  const launched =
    totalSystems > 0
    && readyCount === totalSystems
    && latestAnswerAt != null
    && missionDeadline != null
    && latestAnswerAt <= missionDeadline;

  return {
    readyCount,
    totalSystems,
    missionStartedAt,
    latestAnswerAt,
    missionDeadline,
    daysLeft,
    launched,
  };
}
