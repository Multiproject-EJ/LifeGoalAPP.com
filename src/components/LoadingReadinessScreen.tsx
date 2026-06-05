export type LoadingReadinessStepStatus = 'pending' | 'active' | 'complete' | 'warning';

export interface LoadingReadinessStep {
  label: string;
  status: LoadingReadinessStepStatus;
}

interface LoadingReadinessScreenProps {
  title: string;
  subtitle: string;
  progress: number;
  steps: LoadingReadinessStep[];
  detail?: string;
  variant?: 'app' | 'island';
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function getStepIcon(status: LoadingReadinessStepStatus): string {
  if (status === 'complete') return '✓';
  if (status === 'warning') return '!';
  if (status === 'active') return '•';
  return '…';
}

export function LoadingReadinessScreen({
  title,
  subtitle,
  progress,
  steps,
  detail,
  variant = 'app',
}: LoadingReadinessScreenProps) {
  const safeProgress = clampProgress(progress);

  return (
    <div
      className={`loading-readiness loading-readiness--${variant}`}
      role="status"
      aria-live="polite"
      aria-label={`${title}: ${safeProgress}% ready`}
    >
      <div className="loading-readiness__card">
        <div className="loading-readiness__orb" aria-hidden="true">
          <span />
        </div>
        <p className="loading-readiness__eyebrow">HabitGame</p>
        <h1 className="loading-readiness__title">{title}</h1>
        <p className="loading-readiness__subtitle">{subtitle}</p>

        <div
          className="loading-readiness__meter"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeProgress}
          aria-label="Loading progress"
        >
          <span style={{ width: `${safeProgress}%` }} />
        </div>
        <p className="loading-readiness__percent">{safeProgress}% ready</p>

        <ol className="loading-readiness__steps" aria-label="Readiness checklist">
          {steps.map((step) => (
            <li
              key={step.label}
              className={`loading-readiness__step loading-readiness__step--${step.status}`}
            >
              <span className="loading-readiness__step-icon" aria-hidden="true">
                {getStepIcon(step.status)}
              </span>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>

        {detail ? <p className="loading-readiness__detail">{detail}</p> : null}
      </div>
    </div>
  );
}
