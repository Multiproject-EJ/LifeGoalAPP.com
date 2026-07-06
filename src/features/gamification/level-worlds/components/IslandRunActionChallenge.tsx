import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * A real "Action Challenge" for the Mystery stop's `habit_action` variant.
 *
 * Replaces the previous one-tap "Complete Action" placeholder with a quick,
 * do-it-now micro-action the player actually performs, then confirms with a
 * tactile hold. The stop deals a different action per island (with a playful
 * "deal another" reroll), so the Mystery slot has genuine variety instead of
 * always funnelling into the check-in reflection.
 *
 * Self-contained and presentational — completion is reported via `onComplete`;
 * the parent owns stop completion.
 */

type ActionCard = {
  id: string;
  emoji: string;
  title: string;
  prompt: string;
};

const ACTION_CARDS: readonly ActionCard[] = [
  { id: 'stretch', emoji: '🌿', title: 'Stand & stretch', prompt: 'Stand up, reach tall, roll your shoulders back, and take one big stretch.' },
  { id: 'water', emoji: '💧', title: 'Drink some water', prompt: 'Grab a glass of water and take a few real sips right now.' },
  { id: 'reset-space', emoji: '🪟', title: 'Reset your space', prompt: 'Put one thing back where it belongs within arm’s reach.' },
  { id: 'move', emoji: '🚶', title: 'Move your body', prompt: 'Do 10 slow squats, or march in place for about 20 seconds.' },
  { id: 'kind-word', emoji: '📱', title: 'Send one kind word', prompt: 'Message someone a quick thank-you or a simple hello.' },
  { id: 'unclench', emoji: '🌬️', title: 'Unclench', prompt: 'Drop your shoulders, unclench your jaw, and take one slow breath.' },
  { id: 'intention', emoji: '🎯', title: 'Name your next step', prompt: 'Say out loud the one thing you’ll actually do next.' },
  { id: 'look-far', emoji: '👀', title: 'Rest your eyes', prompt: 'Look at something far away for about 20 seconds to reset your focus.' },
  { id: 'tidy', emoji: '🧹', title: 'Two-minute tidy', prompt: 'Clear one small surface near you — just one.' },
  { id: 'posture', emoji: '🙆', title: 'Posture reset', prompt: 'Sit or stand tall, plant your feet, and lengthen your spine.' },
  { id: 'shake', emoji: '🤸', title: 'Shake it out', prompt: 'Shake out your hands and arms for about 10 seconds to reset your energy.' },
  { id: 'gratitude', emoji: '🙏', title: 'One good thing', prompt: 'Name one thing that went right today, however small.' },
];

const HOLD_DURATION_MS = 1200;

/** Inline hold-to-confirm — press and hold to commit, styled for the island-run modal. */
function HoldToConfirm({ label, onComplete }: { label: string; onComplete: () => void }) {
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const [progress, setProgress] = useState(0);

  const cancel = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    startRef.current = null;
    completedRef.current = false;
    setProgress(0);
  };

  const tick = () => {
    if (startRef.current === null) return;
    const next = Math.min(1, (performance.now() - startRef.current) / HOLD_DURATION_MS);
    setProgress(next);
    if (next >= 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      cancel();
      return;
    }
    frameRef.current = window.requestAnimationFrame(tick);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    startRef.current = performance.now();
    frameRef.current = window.requestAnimationFrame(tick);
  };

  const handlePointerUp = () => {
    if (progress < 1) cancel();
  };

  useEffect(() => {
    const handleBlur = () => cancel();
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
      cancel();
    };
  }, []);

  return (
    <button
      type="button"
      className="island-run-action-challenge__hold island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
      aria-label={`${label}. Press and hold to confirm.`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancel}
      onPointerLeave={handlePointerUp}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <span className="island-run-action-challenge__hold-fill" style={{ width: `${Math.round(progress * 100)}%` }} aria-hidden="true" />
      <span className="island-run-action-challenge__hold-text">{label}</span>
    </button>
  );
}

interface IslandRunActionChallengeProps {
  islandNumber: number;
  onComplete: (message: string) => void;
}

export function IslandRunActionChallenge({ islandNumber, onComplete }: IslandRunActionChallengeProps) {
  // Deal a different action per island; reroll cycles through the deck.
  const safeIsland = Number.isFinite(islandNumber) ? Math.max(0, Math.floor(islandNumber)) : 0;
  const [index, setIndex] = useState(safeIsland % ACTION_CARDS.length);
  const card = ACTION_CARDS[index];

  const dealAnother = () => setIndex((current) => (current + 1) % ACTION_CARDS.length);

  return (
    <div className="island-hatchery-card island-run-action-challenge">
      <p className="island-stop-modal__copy">✅ <strong>Action Challenge</strong></p>
      <p className="island-run-action-challenge__lead">
        One small action, done now, to stabilize your momentum. Do it for real, then hold to log it.
      </p>

      <div className="island-run-action-challenge__card" key={card.id}>
        <span className="island-run-action-challenge__emoji" aria-hidden="true">{card.emoji}</span>
        <strong className="island-run-action-challenge__title">{card.title}</strong>
        <span className="island-run-action-challenge__prompt">{card.prompt}</span>
      </div>

      <div className="island-run-action-challenge__actions">
        <button
          type="button"
          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
          onClick={dealAnother}
        >
          🔀 Deal another
        </button>
        <HoldToConfirm
          label="Hold to log it ✅"
          onComplete={() => onComplete(`✅ ${card.title} — done. Momentum stabilized.`)}
        />
      </div>
    </div>
  );
}
