import './PointsBadge.css';

interface PointsBadgeProps {
  value: number | string;
  className?: string;
  ariaLabel?: string;
  size?: 'mini' | 'small';
  /** Reward icon; Gold is retired, so callers say what the reward is. */
  icon?: string;
  /** Unit for the default aria label, e.g. "dice" or "XP". */
  unit?: string;
}

export function PointsBadge({
  value,
  className,
  ariaLabel,
  size = 'mini',
  icon = '🎲',
  unit = 'dice',
}: PointsBadgeProps) {
  const formattedValue = typeof value === 'number' ? value.toString() : value;
  const label = ariaLabel ?? `Worth ${formattedValue} ${unit}`;

  return (
    <span
      className={['points-badge', `points-badge--${size}`, className].filter(Boolean).join(' ')}
      aria-label={label}
      role="status"
    >
      <span className="points-badge__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="points-badge__value">{formattedValue}</span>
    </span>
  );
}
