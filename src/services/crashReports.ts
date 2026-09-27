import { getSupabaseClient } from '../lib/supabaseClient';
import { createCaseThread } from './cases';

/**
 * Crash capture + reporting. Keeps the last few crashes in memory (and the
 * session) so a player can send a report after the fact, with bounded
 * technical diagnostics. Never captures goal, habit or journal text: only
 * error messages/stacks, the screen they happened on, and device facts.
 */

declare const __APP_VERSION__: string | undefined;

export type CrashSurface = 'app_root' | 'level_worlds' | 'window' | 'unhandled_rejection' | 'manual';

export interface CapturedCrash {
  id: string;
  surface: CrashSurface;
  message: string;
  name: string;
  stack: string;
  componentStack: string;
  route: string;
  atIso: string;
  msSinceLoad: number;
}

export interface CrashReportResult {
  status: 'sent' | 'failed';
  threadId: string | null;
  rewardGranted: boolean;
  rewardAmount: number;
  error?: string;
}

export const CRASH_REPORT_EVENT = 'lifegoal:crash-captured';
export const CRASH_REPORT_OPEN_EVENT = 'lifegoal:crash-report-open';
const STORAGE_KEY = 'lifegoal:recent-crashes:v1';
const MAX_CRASHES = 5;
const MAX_STACK = 3000;
const MAX_COMPONENT_STACK = 2000;

const contextProviders = new Map<string, () => Record<string, unknown>>();
let crashes: CapturedCrash[] = readStoredCrashes();

function readStoredCrashes(): CapturedCrash[] {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-MAX_CRASHES) : [];
  } catch {
    return [];
  }
}

function storeCrashes(): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(crashes)); } catch { /* private mode */ }
}

function emit(type: string, detail?: unknown): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function clip(text: unknown, max: number): string {
  const value = typeof text === 'string' ? text : '';
  return value.length > max ? `${value.slice(0, max)}…[truncated]` : value;
}

/** Benign browser noise that is not a crash. */
export function isIgnorableCrash(message: string): boolean {
  return /ResizeObserver loop|^Script error\.?$|AbortError|The user aborted a request/i.test(message);
}

export function captureCrash(input: {
  error: unknown;
  surface: CrashSurface;
  componentStack?: string | null;
}): CapturedCrash | null {
  const error = input.error instanceof Error ? input.error : new Error(String(input.error ?? 'Unknown error'));
  const message = clip(error.message || String(input.error), 500);
  if (isIgnorableCrash(message)) return null;
  const crash: CapturedCrash = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    surface: input.surface,
    message,
    name: clip(error.name, 80),
    stack: clip(error.stack, MAX_STACK),
    componentStack: clip(input.componentStack ?? '', MAX_COMPONENT_STACK),
    route: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.hash}`.slice(0, 300) : '',
    atIso: new Date().toISOString(),
    msSinceLoad: typeof performance !== 'undefined' ? Math.round(performance.now()) : 0,
  };
  crashes = [...crashes, crash].slice(-MAX_CRASHES);
  storeCrashes();
  emit(CRASH_REPORT_EVENT, crash);
  return crash;
}

export function getRecentCrashes(): CapturedCrash[] {
  return crashes.slice();
}

export function clearRecentCrashes(): void {
  crashes = [];
  storeCrashes();
}

/** Feature code can add small, non-personal context (e.g. current island). */
export function registerCrashContext(name: string, provider: () => Record<string, unknown>): () => void {
  contextProviders.set(name, provider);
  return () => { if (contextProviders.get(name) === provider) contextProviders.delete(name); };
}

/** Ask the app to open the crash report modal (e.g. from a crash fallback). */
export function requestCrashReport(): void {
  emit(CRASH_REPORT_OPEN_EVENT);
}

let installed = false;
export function installGlobalCrashCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => {
    captureCrash({ error: event.error ?? event.message, surface: 'window' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    captureCrash({ error: event.reason, surface: 'unhandled_rejection' });
  });
}

export function buildCrashDiagnostics(): Record<string, unknown> {
  const nav = typeof navigator !== 'undefined' ? navigator as Navigator & { deviceMemory?: number } : null;
  const context: Record<string, unknown> = {};
  contextProviders.forEach((provider, name) => {
    try { context[name] = provider(); } catch { context[name] = 'unavailable'; }
  });
  return {
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown',
    userAgent: nav?.userAgent ?? 'unknown',
    language: nav?.language ?? 'unknown',
    online: nav?.onLine ?? null,
    deviceMemoryGb: nav?.deviceMemory ?? null,
    cpuCores: nav?.hardwareConcurrency ?? null,
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}` : 'unknown',
    standalonePwa: typeof window !== 'undefined' && Boolean(window.matchMedia?.('(display-mode: standalone)').matches),
    route: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.hash}`.slice(0, 300) : '',
    msSinceLoad: typeof performance !== 'undefined' ? Math.round(performance.now()) : 0,
    context,
    crashes: getRecentCrashes(),
  };
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /submit_crash_report/i.test(error.message ?? '') && /not find|does not exist/i.test(error.message ?? '');
}

// Guests without a server session: keep the report (bounded) and send it
// automatically once they sign in, so their crash still reaches us.
const PENDING_KEY = 'lifegoal:pending-crash-reports:v1';
const MAX_PENDING = 3;

export interface PendingCrashReport { note: string; metadata: Record<string, unknown>; queuedAtIso: string }

export function queueCrashReportForLater(input: { note: string; includeDiagnostics: boolean }): void {
  try {
    const pending: PendingCrashReport[] = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    pending.push({
      note: input.note.trim().slice(0, 2000),
      metadata: input.includeDiagnostics ? buildCrashDiagnostics() : { diagnostics: 'declined' },
      queuedAtIso: new Date().toISOString(),
    });
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending.slice(-MAX_PENDING)));
  } catch { /* storage unavailable: nothing to keep */ }
}

export function takePendingCrashReports(): PendingCrashReport[] {
  try {
    const pending: PendingCrashReport[] = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    localStorage.removeItem(PENDING_KEY);
    return Array.isArray(pending) ? pending : [];
  } catch {
    return [];
  }
}

export async function submitCrashReport(input: {
  userId: string;
  note: string;
  includeDiagnostics: boolean;
  isDemo?: boolean;
  /** Pre-built diagnostics (a queued guest report). */
  metadataOverride?: Record<string, unknown>;
}): Promise<CrashReportResult> {
  const latest = crashes[crashes.length - 1];
  const metadata = input.metadataOverride
    ?? (input.includeDiagnostics ? buildCrashDiagnostics() : { diagnostics: 'declined' });
  const queuedCrashes = Array.isArray((metadata as { crashes?: unknown }).crashes) ? (metadata as { crashes: CapturedCrash[] }).crashes : [];
  const headline = latest ?? queuedCrashes[queuedCrashes.length - 1];
  const subject = headline ? `Crash: ${headline.message}`.slice(0, 140) : 'Crash report';
  const route = typeof window !== 'undefined' ? window.location.pathname.slice(0, 300) : '';
  const body = input.note.trim() || '(No description — technical details attached.)';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseClient() as any;
    const { data, error } = await supabase.rpc('submit_crash_report', {
      p_subject: subject,
      p_body: body,
      p_metadata: metadata,
      p_source_route: route,
      p_is_demo: input.isDemo === true,
    });
    if (error && !isMissingRpc(error)) throw new Error(error.message);
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      return {
        status: 'sent',
        threadId: row?.thread_id ?? null,
        rewardGranted: Boolean(row?.reward_granted),
        rewardAmount: Math.max(0, Math.floor(Number(row?.reward_amount) || 0)),
      };
    }
    // The reward RPC is not deployed yet: still file the report, no reward.
    const fallback = await createCaseThread({
      userId: input.userId,
      caseType: 'support',
      category: 'crash_report',
      subject,
      body,
      sourceSurface: 'crash_report',
      sourceRoute: route,
      isDemo: input.isDemo,
      metadata,
    });
    if (fallback.error) throw fallback.error;
    return { status: 'sent', threadId: fallback.data?.id ?? null, rewardGranted: false, rewardAmount: 0 };
  } catch (error) {
    return {
      status: 'failed',
      threadId: null,
      rewardGranted: false,
      rewardAmount: 0,
      error: error instanceof Error ? error.message : 'Could not send the report.',
    };
  }
}
