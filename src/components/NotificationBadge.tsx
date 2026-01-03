// Reusable notification badge component

import './NotificationBadge.css';

interface NotificationBadgeProps {
  show: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  pulse?: boolean;
  ariaLabel?: string;
  size?: 'small' | 'medium' | 'large';
}

export function NotificationBadge({
  show,
  position = 'top-right',
  pulse = true,
  ariaLabel = 'Notification',
  size = 'small',
}: NotificationBadgeProps) {
  if (!show) return null;

  return (
    <span
      className={`notification-badge notification-badge--${position} notification-badge--${size} ${
        pulse ? 'notification-badge--pulse' : ''
      }`}
      aria-label={ariaLabel}
      role="status"
    />
  );
}
