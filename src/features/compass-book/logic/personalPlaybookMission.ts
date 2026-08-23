import type { CompassAnswerRecord } from '../types';

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
  // In-progress preview answers intentionally use the Unix epoch. Ignore it so
  // preview-only timestamps never become apparent real mission history.
  return Number.isFinite(time) && time > Date.UTC(2000, 0, 1) ? time : null;
}

/**
 * Pure readiness calculation for the Chapter VI rocket story.
 *
 * Launch is earned by assembling the seven useful systems, never by racing a
 * countdown. Timing fields remain in the return type for persisted/UI
 * compatibility, but there is no expiring window and no late state.
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
  const missionDeadline = null;
  const daysLeft = 0;
  const launched =
    totalSystems > 0
    && readyCount === totalSystems;

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
