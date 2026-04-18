/**
 * Legacy DailySpinWheel wrapper – used by ProgressDashboard as an inline card.
 * Opens the full NewDailySpinWheel modal on click.
 */
import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { NewDailySpinWheel } from './NewDailySpinWheel';
import { useGamification } from '../../hooks/useGamification';

type Props = {
  session: Session;
};

export function DailySpinWheel({ session }: Props) {
  const { enabled: gamificationEnabled } = useGamification(session);
  const [showModal, setShowModal] = useState(false);

  if (!gamificationEnabled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: 12,
          padding: '1.25rem',
          color: 'white',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'center',
          fontSize: '1rem',
          fontWeight: 700,
        }}
      >
        🎡 Daily Spin Wheel — Tap to spin!
      </button>

      {showModal && (
        <NewDailySpinWheel session={session} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
