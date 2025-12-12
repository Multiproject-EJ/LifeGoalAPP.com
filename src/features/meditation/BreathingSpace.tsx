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
import './BreathingSpace.css';

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

    // Listen for 'breathing:open' event to open the meditation player
    const handleBreathingOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ title: string; duration: number }>;
      if (customEvent.detail) {
        setSelectedSession({ title: customEvent.detail.title, duration: customEvent.detail.duration });
        setPlayerOpen(true);
      }
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
    </div>
  );
}
