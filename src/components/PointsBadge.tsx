import './PointsBadge.css';

interface PointsBadgeProps {
  value: number | string;
  className?: string;
  ariaLabel?: string;
  size?: 'mini' | 'small';
}

export function PointsBadge({
  value,
  className,
  ariaLabel,
  size = 'mini',
}: PointsBadgeProps) {
  const formattedValue = typeof value === 'number' ? value.toString() : value;
  const label = ariaLabel ?? `Worth ${formattedValue} gold`;

  return (
    <span
      className={['points-badge', `points-badge--${size}`, className].filter(Boolean).join(' ')}
      aria-label={label}
      role="status"
    >
      <span className="points-badge__icon" aria-hidden="true">
        🪙
      </span>
      <span className="points-badge__value">{formattedValue}</span>
    </span>
  );
}
