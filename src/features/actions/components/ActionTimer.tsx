import { useState, useEffect } from 'react';
import type { Action } from '../../../types/actions';
import './ActionTimer.css';

interface ActionTimerProps {
  action: Action;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export function ActionTimer({ action }: ActionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => 
    calculateTimeRemaining(action.expires_at)
  );

  useEffect(() => {
    // MUST DO actions don't expire
    if (action.category === 'must_do') return;

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(action.expires_at));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [action.expires_at, action.category]);

  if (action.category === 'must_do') {
    return <span className="action-timer action-timer--no-limit">∞</span>;
  }

  const { days, hours, minutes, isExpired, isExpiringSoon } = timeRemaining;

  if (isExpired) {
    return <span className="action-timer action-timer--expired">Expired</span>;
  }

  let displayText: string;
  if (days > 0) {
    displayText = `${days}d ${hours}h`;
  } else if (hours > 0) {
    displayText = `${hours}h ${minutes}m`;
  } else {
    displayText = `${minutes}m`;
  }

  const className = `action-timer ${isExpiringSoon ? 'action-timer--warning' : ''}`;

  return <span className={className}>{displayText}</span>;
}

function calculateTimeRemaining(expiresAt: string): TimeRemaining {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, isExpiringSoon: false };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  const minutes = diffMinutes % 60;

  const isExpiringSoon = diffMs < 24 * 60 * 60 * 1000; // < 24 hours

  return { days, hours, minutes, isExpired: false, isExpiringSoon };
}
