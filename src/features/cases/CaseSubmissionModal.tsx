import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createCaseThread, type CaseType } from '../../services/cases';

type CaseSubmissionModalProps = {
  session: Session;
  caseType: CaseType;
  sourceSurface: 'account_panel' | 'quick_actions_fab';
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

export function CaseSubmissionModal({ session, caseType, sourceSurface, onClose }: CaseSubmissionModalProps) {
  const [category, setCategory] = useState(caseType === 'feedback' ? FEEDBACK_CATEGORIES[0].value : SUPPORT_CATEGORIES[0].value);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="auth-overlay__backdrop" onClick={onClose} aria-label="Close" />
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
