/**
 * TipOfDayModal — the once-a-day "Tip of the Day — AI Coach" card deck.
 *
 * Shows a short, swipeable deck of cards (one idea each, never a wall of text)
 * that teaches the habit loop and nudges the user to improve a habit. Three
 * variations rotate daily (see tipOfDayContent.ts). When a prior tip is awaiting
 * feedback, a "did you try yesterday's tip?" check-in is shown first; reshape tips
 * can offer a one-tap "apply" (e.g. shrink the target). Loading, AI enrichment and
 * persistence live in tipOfDayData.ts; this component is presentation + paging.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';

import { recordTipAction, recordTipFollowup, type TipFollowupResult } from '../../services/tipOfDayLog';
import { applyTipAction } from '../../services/tipApply';
import { buildTipOfDayForSession } from './tipOfDayData';
import type { TipCheckIn, TipDeck } from './tipOfDayContent';
import './TipOfDayModal.css';

export interface TipOfDayModalProps {
  session: Session | null | undefined;
  onClose: () => void;
}

const VARIATION_BADGE: Record<TipDeck['variation'], string> = {
  reshape_struggling: 'Reshape a habit',
  habit_science: 'Habit science',
  environment_cue: 'Design your space',
};

const CHECK_IN_OPTIONS: Array<{ result: TipFollowupResult; emoji: string; label: string }> = [
  { result: 'worked', emoji: '🎉', label: 'Yes, it helped' },
  { result: 'not_yet', emoji: '🕒', label: 'Not yet' },
  { result: 'didnt_work', emoji: '🤔', label: 'Didn’t work' },
];

const SWIPE_THRESHOLD_PX = 56;

export function TipOfDayModal({ session, onClose }: TipOfDayModalProps): JSX.Element | null {
  const [deck, setDeck] = useState<TipDeck | null>(null);
  const [checkIn, setCheckIn] = useState<TipCheckIn | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const dragStartX = useRef<number | null>(null);
  const [dragDx, setDragDx] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    buildTipOfDayForSession(session)
      .then((result) => {
        if (!active) return;
        setDeck(result?.deck ?? null);
        setCheckIn(result?.checkIn ?? null);
        setShowCheckIn(Boolean(result?.checkIn));
      })
      .catch((err) => {
        console.warn('Tip of the Day failed to build:', err);
        if (active) setDeck(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  // Lock background scroll while the modal is open (AGENTS.md modal guardrail).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const cardCount = deck?.cards.length ?? 0;
  const isLastCard = cardCount > 0 && index >= cardCount - 1;

  const close = useCallback(
    (action?: TipDeck['primaryCtaAction']) => {
      const userId = session?.user?.id;
      if (userId) {
        void recordTipAction(userId, action ?? 'dismissed');
      }
      onClose();
    },
    [onClose, session?.user?.id],
  );

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, cardCount - 1));
  }, [cardCount]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const answerCheckIn = useCallback(
    (result: TipFollowupResult) => {
      if (checkIn) void recordTipFollowup(checkIn.tipId, result);
      setShowCheckIn(false);
    },
    [checkIn],
  );

  const handlePrimary = useCallback(async () => {
    const action = deck?.applyAction ?? null;
    if (!action) {
      close(deck?.primaryCtaAction);
      return;
    }
    const userId = session?.user?.id;
    if (!userId) {
      close('applied');
      return;
    }
    setApplying(true);
    setApplyError(null);
    const result = await applyTipAction(userId, action);
    setApplying(false);
    if (result.ok) {
      close('applied');
    } else {
      setApplyError(result.error ?? 'Could not apply — try from the habit instead.');
    }
  }, [close, deck?.applyAction, deck?.primaryCtaAction, session?.user?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close('dismissed');
      else if (!showCheckIn && event.key === 'ArrowRight') goNext();
      else if (!showCheckIn && event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, goNext, goPrev, showCheckIn]);

  const handlePointerDown = (event: React.PointerEvent) => {
    dragStartX.current = event.clientX;
    setDragDx(0);
  };
  const handlePointerMove = (event: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    setDragDx(event.clientX - dragStartX.current);
  };
  const handlePointerUp = () => {
    if (dragStartX.current === null) return;
    const dx = dragDx;
    dragStartX.current = null;
    setDragDx(0);
    if (dx <= -SWIPE_THRESHOLD_PX) goNext();
    else if (dx >= SWIPE_THRESHOLD_PX) goPrev();
  };

  useEffect(() => {
    // Nothing useful to show (e.g. no session) — close silently rather than
    // leave an invisible, scroll-locking modal mounted.
    if (!loading && !deck) onClose();
  }, [loading, deck, onClose]);

  if (!loading && !deck) {
    return null;
  }

  const card = deck?.cards[index];
  const renderCheckIn = showCheckIn && checkIn;

  return createPortal(
    <div className="tip-of-day__overlay" role="dialog" aria-modal="true" aria-label="Tip of the day">
      <div className="tip-of-day__sheet">
        <div className="tip-of-day__header">
          <div className="tip-of-day__brand">
            <span className="tip-of-day__brand-emoji" aria-hidden>💡</span>
            <div className="tip-of-day__brand-text">
              <span className="tip-of-day__title">Tip of the Day</span>
              <span className="tip-of-day__subtitle">
                {renderCheckIn ? 'Quick follow-up' : deck ? VARIATION_BADGE[deck.variation] : 'AI Coach'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="tip-of-day__close"
            onClick={() => close('dismissed')}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading || !deck || !card ? (
          <div className="tip-of-day__loading">
            <div className="tip-of-day__spinner" aria-hidden />
            <p>Finding today’s tip…</p>
          </div>
        ) : renderCheckIn ? (
          <div className="tip-of-day__checkin">
            <div className="tip-of-day__card tip-of-day__card--checkin">
              <span className="tip-of-day__kicker">Yesterday’s tip</span>
              <span className="tip-of-day__card-emoji" aria-hidden>📋</span>
              <h2 className="tip-of-day__card-heading">Did you try it?</h2>
              <p className="tip-of-day__card-body">{checkIn.suggestionText}</p>
            </div>
            <div className="tip-of-day__checkin-actions">
              {CHECK_IN_OPTIONS.map((option) => (
                <button
                  key={option.result}
                  type="button"
                  className="tip-of-day__btn tip-of-day__btn--ghost tip-of-day__checkin-btn"
                  onClick={() => answerCheckIn(option.result)}
                >
                  <span aria-hidden>{option.emoji}</span> {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div
              className="tip-of-day__card-area"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="tip-of-day__card"
                key={card.id}
                style={{ transform: dragStartX.current !== null ? `translateX(${dragDx}px)` : undefined }}
              >
                {card.kicker && <span className="tip-of-day__kicker">{card.kicker}</span>}
                {card.emoji && (
                  <span className="tip-of-day__card-emoji" aria-hidden>
                    {card.emoji}
                  </span>
                )}
                <h2 className="tip-of-day__card-heading">{card.heading}</h2>
                <p className="tip-of-day__card-body">{card.body}</p>
              </div>
            </div>

            <div className="tip-of-day__dots" role="tablist" aria-label="Tip progress">
              {deck.cards.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className={`tip-of-day__dot${i === index ? ' tip-of-day__dot--active' : ''}`}
                  aria-label={`Go to card ${i + 1}`}
                  aria-selected={i === index}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>

            {applyError && <p className="tip-of-day__apply-error">{applyError}</p>}

            <div className="tip-of-day__footer">
              {index > 0 ? (
                <button type="button" className="tip-of-day__btn tip-of-day__btn--ghost" onClick={goPrev} disabled={applying}>
                  Back
                </button>
              ) : (
                <span className="tip-of-day__btn-spacer" />
              )}
              {isLastCard ? (
                <button
                  type="button"
                  className="tip-of-day__btn tip-of-day__btn--primary"
                  onClick={handlePrimary}
                  disabled={applying}
                >
                  {applying ? 'Applying…' : deck.primaryCtaLabel}
                </button>
              ) : (
                <button type="button" className="tip-of-day__btn tip-of-day__btn--primary" onClick={goNext}>
                  Next
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default TipOfDayModal;
