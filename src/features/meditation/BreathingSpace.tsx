import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { MeditationSessionPlayer } from './MeditationSessionPlayer';
import { GuidedMeditationPlayer } from './GuidedMeditationPlayer';
import { ReminderCard } from './components/ReminderCard';
import {
  createMeditationSession,
  getMeditationStats,
  PLACEHOLDER_SESSIONS,
} from '../../services/meditation';
import { GUIDED_MEDITATIONS } from '../../data/meditationContent';
import type { RevealMode } from '../../types/meditation';
import { FEATURE_BREATHING_SPACE } from './constants';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
import { CelebrationAnimation } from '../../components/CelebrationAnimation';
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
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const reminderRef = useRef<HTMLDivElement>(null);
  
  // Guided meditation state
  const [guidedPlayerOpen, setGuidedPlayerOpen] = useState(false);
  const [selectedMeditationId, setSelectedMeditationId] = useState<string>('attempting-breath');
  const [meditationDuration, setMeditationDuration] = useState<number>(5);
  const [revealMode, setRevealMode] = useState<RevealMode>('sentence');
  
  // Celebration and gamification state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationXP, setCelebrationXP] = useState(0);
  const [celebrationType, setCelebrationType] = useState<'breathing' | 'levelup'>('breathing');
  const [justCompletedSession, setJustCompletedSession] = useState(false);
  const { earnXP, recordActivity, levelUpEvent, dismissLevelUpEvent } = useGamification(session);

  // Watch for level-up events
  useEffect(() => {
    if (levelUpEvent) {
      setCelebrationType('levelup');
      setCelebrationXP(levelUpEvent.xp);
      setShowCelebration(true);
    }
  }, [levelUpEvent]);

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

  useEffect(() => {
    if (!reminderOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (reminderRef.current && !reminderRef.current.contains(event.target as Node)) {
        setReminderOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [reminderOpen]);

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
        // Award XP for breathing session
        const durationMinutes = selectedSession.duration / 60;
        const isLongSession = durationMinutes >= 10;
        const xpAmount = isLongSession
          ? XP_REWARDS.MEDITATION_SESSION + 10  // Bonus for longer sessions
          : XP_REWARDS.MEDITATION_SESSION;

        // 1. Immediately add instant feedback (pop/glow)
        setJustCompletedSession(true);

        // 2. After pop animation completes, trigger celebration
        setTimeout(() => {
          setCelebrationType('breathing');
          setCelebrationXP(xpAmount);
          setShowCelebration(true);
        }, 400);

        // 3. Clean up instant feedback class
        setTimeout(() => {
          setJustCompletedSession(false);
        }, 600);

        await earnXP(xpAmount, 'meditation_session', result.data?.id);
        await recordActivity();

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

  const handleStartGuidedMeditation = (meditationId: string) => {
    setSelectedMeditationId(meditationId);
    setGuidedPlayerOpen(true);
  };

  const handleGuidedSessionComplete = async () => {
    setSaving(true);
    try {
      const result = await createMeditationSession({
        user_id: session.user.id,
        duration_seconds: meditationDuration * 60,
        session_type: 'guided',
        completed: true,
      });

      if (result.error) {
        console.error('Failed to save session:', result.error);
      } else {
        // Award XP for guided meditation session
        const isLongSession = meditationDuration >= 10;
        const xpAmount = isLongSession
          ? XP_REWARDS.MEDITATION_SESSION + 10  // Bonus for longer sessions
          : XP_REWARDS.MEDITATION_SESSION;

        // 1. Immediately add instant feedback (pop/glow)
        setJustCompletedSession(true);

        // 2. After pop animation completes, trigger celebration
        setTimeout(() => {
          setCelebrationType('breathing');
          setCelebrationXP(xpAmount);
          setShowCelebration(true);
        }, 400);

        // 3. Clean up instant feedback class
        setTimeout(() => {
          setJustCompletedSession(false);
        }, 600);

        await earnXP(xpAmount, 'meditation_session', result.data?.id);
        await recordActivity();

        // Reload stats after successful save
        await loadStats();
      }
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      setSaving(false);
      setGuidedPlayerOpen(false);
    }
  };

  const handleCloseGuidedPlayer = () => {
    setGuidedPlayerOpen(false);
  };

  if (!FEATURE_BREATHING_SPACE) {
    return null;
  }

  return (
    <div className="breathing-space">
      {/* Left Column: Quick Start & Reminder */}
      <div className="breathing-space__left-column">
        {/* Daily Reminder Toggle */}
        <div className="breathing-space__reminder" ref={reminderRef}>
          <button
            type="button"
            className={`breathing-space__reminder-button ${
              reminderSet ? '' : 'breathing-space__reminder-button--glow'
            }`}
            onClick={() => setReminderOpen((prev) => !prev)}
            aria-expanded={reminderOpen}
            aria-label="Toggle daily reminder"
          >
            ⏰
          </button>
          <div
            className={`breathing-space__reminder-card ${
              reminderOpen ? 'breathing-space__reminder-card--open' : ''
            }`}
          >
            <ReminderCard userId={session.user.id} onReminderStatusChange={setReminderSet} />
          </div>
        </div>

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
          <h3 className="breathing-space__library-title">Guided Meditations</h3>

          <div className="breathing-space__guided-buttons">
            {GUIDED_MEDITATIONS.map((meditation) => (
              <button
                key={meditation.id}
                type="button"
                className="breathing-space__guided-button"
                onClick={() => handleStartGuidedMeditation(meditation.id)}
                disabled={meditation.isPlaceholder}
              >
                <span className="breathing-space__guided-button-title">{meditation.title}</span>
                <span className="breathing-space__guided-button-meta">
                  {meditation.isPlaceholder ? 'Coming soon' : `${meditationDuration} min`}
                </span>
              </button>
            ))}
          </div>
          
          {/* Meditation Controls */}
          <div className="breathing-space__guided-controls">
            <div className="breathing-space__control-group">
              <label htmlFor="meditation-select" className="breathing-space__control-label">
                Meditation
              </label>
              <select
                id="meditation-select"
                className="breathing-space__control-select"
                value={selectedMeditationId}
                onChange={(e) => setSelectedMeditationId(e.target.value)}
              >
                {GUIDED_MEDITATIONS.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.title} {med.isPlaceholder ? '(Coming Soon)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="breathing-space__control-group">
              <label htmlFor="duration-select" className="breathing-space__control-label">
                Duration
              </label>
              <select
                id="duration-select"
                className="breathing-space__control-select"
                value={meditationDuration}
                onChange={(e) => setMeditationDuration(Number(e.target.value))}
              >
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
              </select>
            </div>

            <div className="breathing-space__control-group">
              <label htmlFor="reveal-mode-select" className="breathing-space__control-label">
                Reveal Mode
              </label>
              <select
                id="reveal-mode-select"
                className="breathing-space__control-select"
                value={revealMode}
                onChange={(e) => setRevealMode(e.target.value as RevealMode)}
              >
                <option value="word">Word by Word</option>
                <option value="sentence">Sentence by Sentence</option>
                <option value="paragraph">Paragraph by Paragraph</option>
              </select>
            </div>

            <button
              className="btn btn--primary breathing-space__guided-start-button"
              onClick={() => handleStartGuidedMeditation(selectedMeditationId)}
            >
              Begin Meditation
            </button>
          </div>

          {/* Selected meditation details */}
          {GUIDED_MEDITATIONS.find((m) => m.id === selectedMeditationId) && (
            <div className="breathing-space__meditation-preview">
              <p className="breathing-space__meditation-theme">
                {GUIDED_MEDITATIONS.find((m) => m.id === selectedMeditationId)?.theme}
              </p>
            </div>
          )}
        </div>

        {/* Breathing Exercises Library */}
        <div className="breathing-space__library">
          <h3 className="breathing-space__library-title">Breathing Exercises</h3>
          <div className="breathing-space__button-grid">
            {PLACEHOLDER_SESSIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="breathing-space__exercise-button"
                onClick={() => handleStartSession(s.title, s.duration)}
              >
                <span className="breathing-space__exercise-button-icon">{s.icon}</span>
                <span className="breathing-space__exercise-button-text">
                  <span className="breathing-space__exercise-button-title">{s.title}</span>
                  <span className="breathing-space__exercise-button-meta">
                    {Math.floor(s.duration / 60)} min
                  </span>
                </span>
              </button>
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

      {/* Guided Meditation Player Modal */}
      <GuidedMeditationPlayer
        isOpen={guidedPlayerOpen}
        onClose={handleCloseGuidedPlayer}
        meditationId={selectedMeditationId}
        durationMinutes={meditationDuration}
        revealMode={revealMode}
        onComplete={handleGuidedSessionComplete}
      />

      {/* Celebration Animation */}
      {showCelebration && (
        <CelebrationAnimation
          type={celebrationType}
          xpAmount={celebrationXP}
          onComplete={() => {
            setShowCelebration(false);
            if (celebrationType === 'levelup') {
              dismissLevelUpEvent();
            }
          }}
        />
      )}
    </div>
  );
}
