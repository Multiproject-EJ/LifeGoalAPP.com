import type { FeatureStatus } from '../config/featureAvailability';
import '../styles/feature-status.css';

const FEATURE_STATUS_LABELS: Record<Exclude<FeatureStatus, 'live'>, string> = {
  demo: 'Demo',
  comingSoon: 'Coming Soon',
  locked: 'Locked',
  hidden: 'Hidden',
};

interface FeatureStatusBadgeProps {
  status: FeatureStatus;
  className?: string;
}

export function FeatureStatusBadge({ status, className }: FeatureStatusBadgeProps) {
  if (status === 'live') {
    return null;
  }

  const label = FEATURE_STATUS_LABELS[status];
  const classNames = ['feature-status-badge', `feature-status-badge--${status}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} aria-label={`Feature status: ${label}`}>
      {label}
    </span>
  );
}
