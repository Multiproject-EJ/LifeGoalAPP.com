import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { lockPageScroll } from '../../utils/scrollLock';
import {
  CRASH_REPORT_EVENT,
  CRASH_REPORT_OPEN_EVENT,
  buildCrashDiagnostics,
  clearRecentCrashes,
  getRecentCrashes,
  queueCrashReportForLater,
  submitCrashReport,
  takePendingCrashReports,
  type CapturedCrash,
  type CrashReportResult,
} from '../../services/crashReports';
import { applyCrashReportThankYouDice } from '../../features/gamification/level-worlds/services/islandRunCrashReportRewardAction';
import './CrashReportHost.css';

export const CRASH_REPORT_THANK_YOU_DICE = 20;
const PROMPT_COOLDOWN_MS = 120_000;
const PROMPT_VISIBLE_MS = 12_000;

type Phase = 'form' | 'sending' | 'thanks' | 'queued' | 'error';

export interface CrashReportHostPreview { phase: Phase; rewardAmount?: number }

/**
 * After a crash: a small prompt offers to send a report (+dice). The modal
 * shows exactly what will be sent, then a thank-you with the dice reward
 * when the server granted it. Mount once near the app root.
 */
export function CrashReportHost({ session, isDemo = false, preview }: { session?: Session | null; isDemo?: boolean; preview?: CrashReportHostPreview }) {
  const [prompt, setPrompt] = useState<CapturedCrash | null>(null);
  const [open, setOpen] = useState(Boolean(preview));
  const [phase, setPhase] = useState<Phase>(preview?.phase ?? 'form');
  const [note, setNote] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [result, setResult] = useState<CrashReportResult | null>(preview?.rewardAmount
    ? { status: 'sent', threadId: 'preview', rewardGranted: true, rewardAmount: preview.rewardAmount }
    : null);
  const lastPromptAt = useRef(0);

  useEffect(() => {
    const onCrash = (event: Event) => {
      const crash = (event as CustomEvent<CapturedCrash>).detail;
      if (open || Date.now() - lastPromptAt.current < PROMPT_COOLDOWN_MS) return;
      lastPromptAt.current = Date.now();
      setPrompt(crash);
    };
    const onOpen = () => { setPrompt(null); setPhase('form'); setOpen(true); };
    window.addEventListener(CRASH_REPORT_EVENT, onCrash);
    window.addEventListener(CRASH_REPORT_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(CRASH_REPORT_EVENT, onCrash);
      window.removeEventListener(CRASH_REPORT_OPEN_EVENT, onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (!prompt) return undefined;
    const timer = window.setTimeout(() => setPrompt(null), PROMPT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [prompt]);

  useEffect(() => (open ? lockPageScroll() : undefined), [open]);

  // Guest reports queued on this device go out once a session exists.
  useEffect(() => {
    if (preview) return undefined;
    let cancelled = false;
    const flush = async (active: Session | null) => {
      if (!active || cancelled) return;
      const pending = takePendingCrashReports();
      for (const report of pending) {
        const sent = await submitCrashReport({ userId: active.user.id, note: report.note, includeDiagnostics: true, metadataOverride: report.metadata });
        if (sent.status === 'sent' && sent.rewardGranted && sent.threadId) {
          await applyCrashReportThankYouDice({ session: active, client: getSupabaseClient(), threadId: sent.threadId, amount: sent.rewardAmount }).catch(() => undefined);
        } else if (sent.status === 'failed') {
          queueCrashReportForLater({ note: report.note, includeDiagnostics: false });
        }
      }
    };
    const supabase = getSupabaseClient();
    if (session) void flush(session);
    else void supabase.auth.getSession().then(({ data }) => flush(data.session)).catch(() => undefined);
    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_IN') void flush(next);
    });
    return () => { cancelled = true; subscription.subscription.unsubscribe(); };
  }, [preview, session]);

  const close = useCallback(() => {
    setOpen(false);
    setPhase('form');
    setNote('');
    setResult(null);
  }, []);

  const send = useCallback(async () => {
    setPhase('sending');
    const supabase = getSupabaseClient();
    const activeSession = session ?? (await supabase.auth.getSession()).data.session;
    if (!activeSession) {
      queueCrashReportForLater({ note, includeDiagnostics });
      clearRecentCrashes();
      setPhase('queued');
      return;
    }
    const sent = await submitCrashReport({ userId: activeSession.user.id, note, includeDiagnostics, isDemo });
    if (sent.status === 'sent' && sent.rewardGranted && sent.threadId) {
      try {
        await applyCrashReportThankYouDice({ session: activeSession, client: supabase, threadId: sent.threadId, amount: sent.rewardAmount });
      } catch (error) {
        console.error('[crash-report] thank-you dice could not be applied', error);
        sent.rewardGranted = false;
      }
    }
    setResult(sent);
    if (sent.status === 'sent') {
      clearRecentCrashes();
      setPhase('thanks');
    } else {
      setPhase('error');
    }
  }, [includeDiagnostics, isDemo, note, session]);

  if (typeof document === 'undefined') return null;
  const latest = getRecentCrashes().slice(-1)[0] ?? prompt;
  const diagnostics = open && phase === 'form' ? buildCrashDiagnostics() : null;

  return createPortal(
    <>
      {prompt && !open ? (
        <div className="crash-report-prompt" role="status">
          <span className="crash-report-prompt__icon" aria-hidden="true">🛠️</span>
          <span className="crash-report-prompt__copy">
            <strong>Something went wrong</strong>
            <small>Send a crash report · thank-you 🎲 {CRASH_REPORT_THANK_YOU_DICE}</small>
          </span>
          <button type="button" className="crash-report-prompt__send" onClick={() => { setPrompt(null); setPhase('form'); setOpen(true); }}>Send</button>
          <button type="button" className="crash-report-prompt__dismiss" aria-label="Dismiss" onClick={() => setPrompt(null)}>×</button>
        </div>
      ) : null}
      {open ? (
        <div className="crash-report-modal" role="dialog" aria-modal="true" aria-labelledby="crash-report-title">
          <div className="crash-report-modal__backdrop" onClick={phase === 'sending' ? undefined : close} />
          <section className="crash-report-modal__card" data-phase={phase}>
            {phase === 'queued' ? (
              <div className="crash-report-thanks">
                <div className="crash-report-thanks__burst" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => <span key={i} style={{ '--i': i } as React.CSSProperties}>✉️</span>)}
                </div>
                <h2 id="crash-report-title">Thank you! 💙</h2>
                <p>Your report is saved on this device. It sends automatically when you sign in or save your progress, and your 🎲 {CRASH_REPORT_THANK_YOU_DICE} dice thank-you arrives then.</p>
                <button type="button" className="crash-report-modal__primary" onClick={close}>Back to the game</button>
              </div>
            ) : phase === 'thanks' ? (
              <div className="crash-report-thanks">
                <div className="crash-report-thanks__burst" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => <span key={i} style={{ '--i': i } as React.CSSProperties}>🎲</span>)}
                </div>
                <h2 id="crash-report-title">Thank you! 💙</h2>
                <p>Your report is in. It helps us find and fix this bug.</p>
                {result?.rewardGranted ? (
                  <p className="crash-report-thanks__reward">+{result.rewardAmount} dice added 🎲</p>
                ) : (
                  <p className="crash-report-thanks__note">Today&apos;s dice thank-you was already claimed. Thanks for helping again!</p>
                )}
                <button type="button" className="crash-report-modal__primary" onClick={close}>Back to the game</button>
              </div>
            ) : (
              <>
                <p className="crash-report-modal__kicker">Crash report</p>
                <h2 id="crash-report-title">Help us fix this 🛠️</h2>
                <p className="crash-report-modal__lead">Tell us what you were doing. We&apos;ll attach the technical details so we can find the bug. Thank-you: <b>🎲 {CRASH_REPORT_THANK_YOU_DICE} dice</b> (once a day).</p>
                <label className="crash-report-modal__field">
                  <span>What happened? (optional)</span>
                  <textarea value={note} maxLength={2000} rows={3} placeholder="e.g. I tapped Build on Island 4 and the screen went blank" onChange={(event) => setNote(event.target.value)} disabled={phase === 'sending'} />
                </label>
                <label className="crash-report-modal__check">
                  <input type="checkbox" checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} disabled={phase === 'sending'} />
                  <span>Include technical details</span>
                </label>
                {includeDiagnostics && diagnostics ? (
                  <details className="crash-report-modal__details">
                    <summary>What we&apos;ll send</summary>
                    <ul>
                      <li>Error: {latest ? latest.message : 'none captured (manual report)'}</li>
                      <li>Screen: {String(diagnostics.route)}</li>
                      <li>Device: {String(diagnostics.viewport)} · {String(diagnostics.userAgent).slice(0, 80)}</li>
                      <li>App version: {String(diagnostics.appVersion)}</li>
                      <li>Last {getRecentCrashes().length} error(s) with stack traces. No goals, habits or journal text.</li>
                    </ul>
                  </details>
                ) : null}
                {phase === 'error' && result?.error ? <p className="crash-report-modal__error" role="alert">{result.error}</p> : null}
                <div className="crash-report-modal__actions">
                  <button type="button" className="crash-report-modal__secondary" onClick={close} disabled={phase === 'sending'}>Not now</button>
                  <button type="button" className="crash-report-modal__primary" onClick={() => void send()} disabled={phase === 'sending'}>
                    {phase === 'sending' ? 'Sending…' : phase === 'error' ? 'Try again' : 'Send report'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
