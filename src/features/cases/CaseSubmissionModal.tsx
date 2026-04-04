import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createCaseThread, type CaseType } from '../../services/cases';

/**
 * How long after mount to ignore backdrop clicks (ms).
 * On mobile devices a "ghost click" from the touch that opened the modal can
 * land on the backdrop and immediately dismiss it.  Ignoring clicks for a
 * short window after mount prevents this without affecting normal UX (the user
 * needs time to read the form before intentionally closing it).
 */
const BACKDROP_CLICK_GUARD_MS = 350;

type CaseSubmissionModalProps = {
  session: Session;
  caseType: CaseType;
  sourceSurface: 'account_panel' | 'quick_actions_fab' | 'mobile_menu_overlay';
  onClose: () => void;
};

const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: 'Bug report' },
  { value: 'improvement', label: 'Improvement idea' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'other', label: 'Other feedback' },
];

const SUPPORT_CATEGORIES = [
  { value: 'billing_help', label: 'Billing help' },
  { value: 'cancel_request', label: 'Cancellation request' },
  { value: 'refund_review', label: 'Refund review request' },
  { value: 'account_help', label: 'Account help' },
];

const FEATURE_AREAS = [
  { value: 'general', label: 'General / Not sure' },
  { value: 'goals', label: 'Goals' },
  { value: 'habits', label: 'Habits' },
  { value: 'dashboard', label: 'Dashboard / Home' },
  { value: 'ai_coach', label: 'AI Coach' },
  { value: 'gamification', label: 'Gamification / Scorecard' },
  { value: 'journal', label: 'Journal' },
  { value: 'notifications', label: 'Notifications / Reminders' },
  { value: 'billing_account', label: 'Billing / Account' },
  { value: 'technical', label: 'Performance / Technical issue' },
];

export function CaseSubmissionModal({ session, caseType, sourceSurface, onClose }: CaseSubmissionModalProps) {
  const [category, setCategory] = useState(caseType === 'feedback' ? FEEDBACK_CATEGORIES[0].value : SUPPORT_CATEGORIES[0].value);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [featureArea, setFeatureArea] = useState(FEATURE_AREAS[0].value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ghost-click guard: ignore backdrop clicks shortly after mount so that a
  // lingering touch event from the trigger button (e.g. mobile menu) cannot
  // instantly dismiss the modal.
  const canDismissRef = useRef(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      canDismissRef.current = true;
    }, BACKDROP_CLICK_GUARD_MS);
    return () => window.clearTimeout(id);
  }, []);

  const handleBackdropClose = () => {
    if (!canDismissRef.current) return;
    onClose();
  };
  const [success, setSuccess] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => (caseType === 'feedback' ? FEEDBACK_CATEGORIES : SUPPORT_CATEGORIES),
    [caseType],
  );

  const title = caseType === 'feedback' ? 'Send feedback' : 'Request support';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();

    if (!trimmedSubject || !trimmedBody) {
      setError('Subject and details are required.');
      return;
    }

    setSaving(true);
    const { data, error: createError } = await createCaseThread({
      userId: session.user.id,
      caseType,
      category,
      subject: trimmedSubject,
      body: trimmedBody,
      desiredOutcome,
      sourceSurface,
      sourceRoute: typeof window !== 'undefined' ? window.location.pathname : undefined,
      isDemo: session.user.app_metadata?.provider === 'demo',
      metadata: {
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        feature_area: featureArea,
      },
    });

    setSaving(false);

    if (createError || !data) {
      setError(createError?.message ?? 'Unable to submit right now.');
      return;
    }

    setSuccess(`Submitted successfully. Reference: ${data.id.slice(0, 8)}…`);
    setSubject('');
    setBody('');
    setDesiredOutcome('');
    setFeatureArea(FEATURE_AREAS[0].value);
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="auth-overlay__backdrop" onClick={handleBackdropClose} aria-label="Close" />
      <div className="auth-panel auth-panel--auth-card" style={{ maxWidth: 560 }}>
        <div className="auth-card">
          <header className="auth-card__header">
            <h2>{title}</h2>
            <p>{caseType === 'feedback' ? 'Share what is working or what feels broken.' : 'Tell us what help you need.'}</p>
          </header>
          <form className="supabase-auth__form" onSubmit={handleSubmit}>
            <label className="supabase-auth__field">
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="supabase-auth__field">
              <span>Feature area</span>
              <select value={featureArea} onChange={(e) => setFeatureArea(e.target.value)}>
                {FEATURE_AREAS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="supabase-auth__field">
              <span>Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} required />
            </label>
            <label className="supabase-auth__field">
              <span>Details</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} required />
            </label>
            <label className="supabase-auth__field">
              <span>Desired outcome (optional)</span>
              <textarea value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} rows={2} maxLength={500} />
            </label>

            {error ? <p className="supabase-auth__status supabase-auth__status--error">{error}</p> : null}
            {success ? <p className="supabase-auth__status supabase-auth__status--success">{success}</p> : null}

            <div className="supabase-auth__actions" style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="supabase-auth__action auth-card__primary" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit'}
              </button>
              <button type="button" className="supabase-auth__action" onClick={onClose} disabled={saving}>
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
