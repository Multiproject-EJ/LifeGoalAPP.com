export const DEVELOPER_DAY_LOOP_MIN_DAY = 1;
export const DEVELOPER_DAY_LOOP_MAX_DAY = 30;

export const DEVELOPER_DAY_LOOP_METADATA_KEY = 'developer_journey_day';
export const DEVELOPER_DAY_LOOP_SET_AT_METADATA_KEY = 'developer_journey_day_set_at';

export type DeveloperDayLoopEntryPoint = 'founder_welcome' | 'today';

export type DeveloperDayLoopScenario = {
  day: number;
  entryPoint: DeveloperDayLoopEntryPoint;
  resetIslandRunProgress: boolean;
  startFlowComplete: boolean;
  title: string;
  description: string;
};

export type DeveloperDayLoopLaunchResult =
  | { ok: true; day: number; message: string }
  | { ok: false; day: number; message: string };

export function normalizeDeveloperDayLoopDay(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEVELOPER_DAY_LOOP_MIN_DAY;
  return Math.min(
    DEVELOPER_DAY_LOOP_MAX_DAY,
    Math.max(DEVELOPER_DAY_LOOP_MIN_DAY, Math.floor(parsed)),
  );
}

export function readDeveloperDayLoopDay(metadata: Record<string, unknown> | null | undefined): number {
  return normalizeDeveloperDayLoopDay(metadata?.[DEVELOPER_DAY_LOOP_METADATA_KEY]);
}

export function resolveDeveloperDayLoopScenario(dayValue: unknown): DeveloperDayLoopScenario {
  const day = normalizeDeveloperDayLoopDay(dayValue);

  if (day === 1) {
    return {
      day,
      entryPoint: 'founder_welcome',
      resetIslandRunProgress: true,
      startFlowComplete: false,
      title: 'Day 1 · Fresh start',
      description: 'Reset Island Run and XP, then replay the founder → Today → Game handoff from the beginning.',
    };
  }

  return {
    day,
    entryPoint: 'today',
    resetIslandRunProgress: false,
    startFlowComplete: true,
    title: `Day ${day} · Returning player`,
    description: 'Keep the progress you earned on earlier days and reopen at Today. No habit history or game progress is reset.',
  };
}

export function buildDeveloperDayLoopMetadataPatch(
  dayValue: unknown,
  setAtIso: string = new Date().toISOString(),
): Record<string, string | number | boolean> {
  const scenario = resolveDeveloperDayLoopScenario(dayValue);
  return {
    [DEVELOPER_DAY_LOOP_METADATA_KEY]: scenario.day,
    [DEVELOPER_DAY_LOOP_SET_AT_METADATA_KEY]: setAtIso,
    start_flow_complete: scenario.startFlowComplete,
  };
}
