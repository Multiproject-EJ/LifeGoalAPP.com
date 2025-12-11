import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { MeditationSessionPlayer } from './MeditationSessionPlayer';
import { ReminderCard } from './components/ReminderCard';
import {
  createMeditationSession,
  getMeditationStats,
  PLACEHOLDER_SESSIONS,
} from '../../services/meditation';
import { FEATURE_BREATHING_SPACE } from './constants';

type BreathingSpaceProps = {
  session: Session;
};

type MeditationStats = {
  totalMinutes: number;
  totalSessions: number;
  currentStreak: number;
};

export function BreathingSpace({ session }: BreathingSpaceProps) {
  const [stats, setStats] = useState<MeditationStats>({
    totalMinutes: 0,
    totalSessions: 0,
    currentStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{
    title: string;
    duration: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStats();

    // Listen for 'breathing:open' custom events from other parts of the app
    const handleBreathingOpen = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { title?: string; duration?: number } | undefined;
      const title = detail?.title ?? '3-Minute Breathing';
      const duration = detail?.duration ?? 180;
      setSelectedSession({ title, duration });
      setPlayerOpen(true);
    };

    window.addEventListener('breathing:open', handleBreathingOpen as EventListener);

    return () => {
      window.removeEventListener('breathing:open', handleBreathingOpen as EventListener);
    };
  }, [session.user.id]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMeditationStats(session.user.id);
      if (result.error) {
        setError('Failed to load meditation stats');
        console.error('Failed to load stats:', result.error);
      } else if (result.data) {
        setStats(result.data);
      }
    } catch (err) {
      setError('Failed to load meditation stats');
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (title: string, duration: number) => {
    // Start a session locally (do not re-dispatch the custom event here)
    setSelectedSession({ title, duration });
    setPlayerOpen(true);
  };

  const handleSessionComplete = async () => {
    if (!selectedSession) return;

    setSaving(true);
    try {
      const result = await createMeditationSession({
        user_id: session.user.id,
        duration_seconds: selectedSession.duration,
        session_type: 'breathing',
        completed: true,
      });

      if (result.error) {
        console.error('Failed to save session:', result.error);
      } else {
        // Reload stats after successful save
        await loadStats();
      }
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      setSaving(false);
      setPlayerOpen(false);
      setSelectedSession(null);
    }
  };

  const handleClosePlayer = () => {
    setPlayerOpen(false);
    setSelectedSession(null);
  };

  if (!FEATURE_BREATHING_SPACE) {
    return null;
  }

  return (
    <div className="breathing-space">
      {/* Left Column: Quick Start & Reminder */}
      <div className="breathing-space__left-column">
        {/* Quick Start Card */}
        <div className="breathing-space__card breathing-space__quick-start">
          <div className="breathing-space__card-header">
            <span className="breathing-space__card-icon">🌬️</span>
            <h3 className="breathing-space__card-title">Quick Start</h3>
          </div>
          <p className="breathing-space__card-description">
            Take a moment to center yourself with a quick breathing exercise.
          </p>
          <button
            className="btn btn--primary breathing-space__start-button"
            onClick={() => handleStartSession('3-Minute Breathing', 180)}
          >
            Start 3-minute breathing
          </button>
        </div>

        {/* Daily Reminder Card */}
        <ReminderCard userId={session.user.id} />
      </div>

      {/* Right Column: Progress & Library */}
      <div className="breathing-space__right-column">
        {/* Progress Snapshot */}
        <div className="breathing-space__card breathing-space__progress">
          <div className="breathing-space__card-header">
            <span className="breathing-space__card-icon">📊</span>
            <h3 className="breathing-space__card-title">Your Progress</h3>
          </div>
          {loading ? (
            <p className="breathing-space__loading">Loading stats...</p>
          ) : error ? (
            <p className="breathing-space__error">{error}</p>
          ) : (
            <div className="breathing-space__stats">
              <div className="breathing-space__stat">
                <div className="breathing-space__stat-value">{stats.totalMinutes}</div>
                <div className="breathing-space__stat-label">Total Minutes</div>
              </div>
              <div className="breathing-space__stat">
                <div className="breathing-space__stat-value">{stats.totalSessions}</div>
                <div className="breathing-space__stat-label">Sessions</div>
              </div>
              <div className="breathing-space__stat">
                <div className="breathing-space__stat-value">{stats.currentStreak}</div>
                <div className="breathing-space__stat-label">Day Streak</div>
              </div>
            </div>
          )}
        </div>

        {/* Meditation Library */}
        <div className="breathing-space__library">
          <h3 className="breathing-space__library-title">Meditation Library</h3>
          <div className="breathing-space__library-grid">
            {PLACEHOLDER_SESSIONS.map((s) => (
              <div key={s.id} className="breathing-space__library-card">
                <div className="breathing-space__library-card-icon">{s.icon}</div>
                <h4 className="breathing-space__library-card-title">{s.title}</h4>
                <p className="breathing-space__library-card-description">{s.description}</p>
                <div className="breathing-space__library-card-duration">
                  {Math.floor(s.duration / 60)} minutes
                </div>
                <button
                  className="btn btn--secondary breathing-space__library-card-button"
                  onClick={() => handleStartSession(s.title, s.duration)}
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Player Modal */}
      {selectedSession && (
        <MeditationSessionPlayer
          isOpen={playerOpen}
          onClose={handleClosePlayer}
          sessionTitle={selectedSession.title}
          durationSeconds={selectedSession.duration}
          onComplete={handleSessionComplete}
        />
      )}

      <style>{`
        .breathing-space {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .breathing-space__left-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .breathing-space__right-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .breathing-space__card {
          background: var(--color-bg-elevated, #fff);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .breathing-space__card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .breathing-space__card-icon {
          font-size: 1.5rem;
        }

        .breathing-space__card-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary, #000);
        }

        .breathing-space__card-description {
          margin: 0 0 1.5rem 0;
          color: var(--color-text-secondary, #666);
        }

        .breathing-space__start-button {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
        }

        .breathing-space__quick-start {
          background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
          border: 1px solid #667eea44;
        }

        .breathing-space__progress {
        }

        .breathing-space__stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 1.5rem;
        }

        .breathing-space__stat {
          text-align: center;
        }

        .breathing-space__stat-value {
          font-size: 2rem;
          font-weight: 600;
          color: var(--color-text-primary, #000);
          line-height: 1.2;
        }

        .breathing-space__stat-label {
          font-size: 0.875rem;
          color: var(--color-text-secondary, #666);
          margin-top: 0.25rem;
        }

        .breathing-space__loading,
        .breathing-space__error {
          text-align: center;
          padding: 1rem;
          color: var(--color-text-secondary, #666);
        }

        .breathing-space__error {
          color: var(--color-error, #e53e3e);
        }

        .breathing-space__library {
          margin-top: 0;
        }

        .breathing-space__library-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
          color: var(--color-text-primary, #000);
        }

        .breathing-space__library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .breathing-space__library-card {
          background: var(--color-bg-elevated, #fff);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .breathing-space__library-card-icon {
          font-size: 2rem;
          text-align: center;
        }

        .breathing-space__library-card-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary, #000);
          text-align: center;
        }

        .breathing-space__library-card-description {
          margin: 0;
          font-size: 0.875rem;
          color: var(--color-text-secondary, #666);
          text-align: center;
          flex: 1;
        }

        .breathing-space__library-card-duration {
          font-size: 0.875rem;
          color: var(--color-text-secondary, #666);
          text-align: center;
          font-weight: 500;
        }

        .breathing-space__library-card-button {
          width: 100%;
        }

        @media (max-width: 768px) {
          .breathing-space {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .breathing-space__left-column,
          .breathing-space__right-column {
            gap: 1rem;
          }

          .breathing-space__library {
            grid-column: 1;
          }

          .breathing-space__library-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
