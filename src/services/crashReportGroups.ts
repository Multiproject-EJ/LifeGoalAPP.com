/**
 * Admin-side crash report triage. Crash reports land as support cases
 * (category 'crash_report') with bounded diagnostics in metadata; these pure
 * helpers group identical crashes across players and builds so one bug shows
 * up as one row with a count, and summarise a single report's diagnostics.
 */

export const CRASH_REPORT_CATEGORY = 'crash_report';

export interface CrashReportThreadLike {
  id: string;
  user_id: string;
  category: string;
  status: string;
  created_at: string;
  subject: string;
  metadata: Record<string, unknown> | null;
}

export interface CrashReportGroup {
  signature: string;
  message: string;
  topFrame: string;
  threadIds: string[];
  openThreadIds: string[];
  players: number;
  islands: number[];
  appVersions: string[];
  totalRepeats: number;
  firstSeenIso: string;
  lastSeenIso: string;
}

export interface CrashDiagnosticsSummary {
  appVersion: string;
  device: string;
  viewport: string;
  route: string;
  secondsSinceLoad: number | null;
  island: number | null;
  crashes: Array<{ message: string; topFrame: string; repeats: number; surface: string }>;
}

type RawCrash = { message?: unknown; stack?: unknown; repeatCount?: unknown; surface?: unknown };

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function rawCrashes(metadata: Record<string, unknown> | null): RawCrash[] {
  const list = asRecord(metadata).crashes;
  return Array.isArray(list) ? list.map((entry) => asRecord(entry) as RawCrash) : [];
}

/**
 * The first stack frame, without the build hash and line/column, so the same
 * bug matches across releases ("update@Island5ThreePilot-D6ljorJL.js:36:112046"
 * → "update@Island5ThreePilot").
 */
export function normaliseTopFrame(stack: unknown): string {
  if (typeof stack !== 'string') return '';
  const frames = stack.split('\n').map((line) => line.trim()).filter(Boolean);
  const frame = frames.find((line) => !/^(Error|TypeError|RangeError|ReferenceError)\b/.test(line)) ?? '';
  return frame
    .replace(/^at\s+/, '')
    .replace(/\((.*)\)$/, '$1')
    .replace(/[a-z]+:\/\/[^/]+\/(?:assets\/)?/gi, '')
    .replace(/-[A-Za-z0-9_]{6,10}\.js/g, '')
    .replace(/(\.[jt]sx?)?(:\d+)+$/g, '')
    .slice(0, 160);
}

/** Minified variable names change per build; fold them so messages match. */
export function normaliseCrashMessage(message: unknown): string {
  const text = typeof message === 'string' ? message : 'Unknown error';
  return text.replace(/'[A-Za-z_$][\w$]{0,2}\.(\w+)'/g, "'?.$1'").slice(0, 300);
}

function firstCrash(thread: CrashReportThreadLike) {
  const crash = rawCrashes(thread.metadata)[0];
  if (crash) return { message: normaliseCrashMessage(crash.message), topFrame: normaliseTopFrame(crash.stack) };
  return { message: normaliseCrashMessage(thread.subject.replace(/^Crash:\s*/, '')), topFrame: '' };
}

export function summariseCrashDiagnostics(metadata: Record<string, unknown> | null): CrashDiagnosticsSummary {
  const meta = asRecord(metadata);
  const islandRun = asRecord(asRecord(meta.context).islandRun);
  const userAgent = typeof meta.userAgent === 'string' ? meta.userAgent : '';
  const device = /iPhone|iPad/.test(userAgent) ? 'iOS' : /Android/.test(userAgent) ? 'Android' : /Mac OS X/.test(userAgent) ? 'Mac' : /Windows/.test(userAgent) ? 'Windows' : userAgent ? 'Other' : 'unknown';
  return {
    appVersion: typeof meta.appVersion === 'string' ? meta.appVersion : 'unknown',
    device,
    viewport: typeof meta.viewport === 'string' ? meta.viewport : 'unknown',
    route: typeof meta.route === 'string' ? meta.route : '',
    secondsSinceLoad: typeof meta.msSinceLoad === 'number' ? Math.round(meta.msSinceLoad / 1000) : null,
    island: typeof islandRun.islandNumber === 'number' ? islandRun.islandNumber : null,
    crashes: rawCrashes(metadata).map((crash) => ({
      message: typeof crash.message === 'string' ? crash.message : 'Unknown error',
      topFrame: normaliseTopFrame(crash.stack),
      repeats: typeof crash.repeatCount === 'number' ? crash.repeatCount : 1,
      surface: typeof crash.surface === 'string' ? crash.surface : 'unknown',
    })),
  };
}

const OPEN_STATUSES = new Set(['new', 'triaged', 'waiting_on_user']);

/** One row per distinct crash, most reported (then most recent) first. */
export function groupCrashReports(threads: CrashReportThreadLike[]): CrashReportGroup[] {
  const groups = new Map<string, CrashReportGroup & { playerIds: Set<string> }>();
  threads.filter((thread) => thread.category === CRASH_REPORT_CATEGORY).forEach((thread) => {
    const { message, topFrame } = firstCrash(thread);
    const signature = `${message}@@${topFrame}`;
    const summary = summariseCrashDiagnostics(thread.metadata);
    const group = groups.get(signature) ?? {
      signature, message, topFrame, threadIds: [], openThreadIds: [], players: 0, playerIds: new Set<string>(),
      islands: [], appVersions: [], totalRepeats: 0, firstSeenIso: thread.created_at, lastSeenIso: thread.created_at,
    };
    group.threadIds.push(thread.id);
    if (OPEN_STATUSES.has(thread.status)) group.openThreadIds.push(thread.id);
    group.playerIds.add(thread.user_id);
    group.players = group.playerIds.size;
    if (summary.island !== null && !group.islands.includes(summary.island)) group.islands.push(summary.island);
    if (!group.appVersions.includes(summary.appVersion)) group.appVersions.push(summary.appVersion);
    group.totalRepeats += summary.crashes.reduce((sum, crash) => sum + crash.repeats, 0) || 1;
    if (thread.created_at < group.firstSeenIso) group.firstSeenIso = thread.created_at;
    if (thread.created_at > group.lastSeenIso) group.lastSeenIso = thread.created_at;
    groups.set(signature, group);
  });
  return Array.from(groups.values())
    .map(({ playerIds: _playerIds, ...group }) => ({ ...group, islands: group.islands.sort((a, b) => a - b) }))
    .sort((a, b) => b.openThreadIds.length - a.openThreadIds.length || b.threadIds.length - a.threadIds.length || b.lastSeenIso.localeCompare(a.lastSeenIso));
}
