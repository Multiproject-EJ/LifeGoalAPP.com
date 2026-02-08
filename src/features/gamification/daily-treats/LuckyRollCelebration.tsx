/**
 * Lucky Roll Celebration Component
 * 
 * Contextual celebrations based on win tier:
 * - Small: Brief float-up for minor wins
 * - Medium: Larger reveal with subtle glow
 * - Big: Full celebration with particle burst
 * - Streak: Hot streak badge
 */

import { useEffect } from 'react';

export interface LuckyRollCelebrationProps {
  type: 'none' | 'small' | 'medium' | 'big' | 'streak';
  message: string;      // "+25 🪙" or "JACKPOT! +250 🪙"
  emoji?: string;       // tile emoji
  onComplete: () => void;
}

export function LuckyRollCelebration({ type, message, emoji, onComplete }: LuckyRollCelebrationProps) {
  useEffect(() => {
    if (type === 'none') {
      onComplete();
      return;
    }
    
    // Auto-dismiss after animation duration
    const duration = type === 'big' ? 1500 : type === 'medium' ? 1000 : type === 'streak' ? 1200 : 800;
    const timer = setTimeout(onComplete, duration);
    
    return () => clearTimeout(timer);
  }, [type, onComplete]);
  
  if (type === 'none') {
    return null;
  }
  
  return (
    <div className={`lucky-roll-celebration lucky-roll-celebration--${type}`}>
      {emoji && <span className="lucky-roll-celebration__emoji">{emoji}</span>}
      <span className="lucky-roll-celebration__message">{message}</span>
    </div>
  );
}
