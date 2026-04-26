// New Daily Spin Wheel Modal - SVG-based wheel with economy-aligned prizes

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';
import {
  executeSpin,
  getDailySpinState,
  getSpinHistory,
  getSpinPrizesForUser,
} from '../../services/dailySpin';
import type { SpinHistoryEntry, SpinPrize } from '../../types/gamification';
import { SPIN_PRIZES } from '../../types/gamification';
import { buildWheelSegments, type WheelSegment } from './spinWheelUtils';
import { useGamification } from '../../hooks/useGamification';
import './NewDailySpinWheel.css';

interface NewDailySpinWheelProps {
  session: Session;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  SVG helpers                                                        */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180;

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * DEG;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCart(cx, cy, r, startDeg);
  const e = polarToCart(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 ${largeArc},1 ${e.x},${e.y} Z`;
}

/* ------------------------------------------------------------------ */
/*  SVG Wheel                                                          */
/* ------------------------------------------------------------------ */

const WHEEL_SIZE = 280;
const CX = WHEEL_SIZE / 2;
const CY = WHEEL_SIZE / 2;
const OUTER_R = WHEEL_SIZE / 2 - 4;
const HUB_R = OUTER_R * 0.22;
const PEG_COUNT = 20;
const PEG_R = 4;

function WheelSVG({
  segments,
  rotation,
  spinning,
}: {
  segments: WheelSegment[];
  rotation: number;
  spinning: boolean;
}) {
  const pegs = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    for (let i = 0; i < PEG_COUNT; i++) {
      const angle = (360 / PEG_COUNT) * i;
      const p = polarToCart(CX, CY, OUTER_R - PEG_R - 2, angle);
      arr.push(p);
    }
    return arr;
  }, []);

  return (
    <svg
      className="spin-wheel-svg"
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: spinning
          ? 'transform 3.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
          : undefined,
      }}
    >
      {/* Outer metallic rim */}
      <circle
        cx={CX}
        cy={CY}
        r={OUTER_R}
        fill="none"
        stroke="url(#rimGrad)"
        strokeWidth="8"
      />

      {/* Segments */}
      {segments.map((seg, i) => (
        <path
          key={i}
          d={segmentPath(CX, CY, OUTER_R - 5, seg.startAngle, seg.endAngle)}
          fill={seg.color}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1.5"
        />
      ))}

      {/* Segment labels - icon */}
      {segments.map((seg, i) => {
        const labelR = OUTER_R * 0.62;
        const p = polarToCart(CX, CY, labelR, seg.centerAngle);
        return (
          <text
            key={`ico-${i}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="18"
            style={{ pointerEvents: 'none' }}
          >
            {seg.icon}
          </text>
        );
      })}

      {/* Segment labels - text (only if segment is wide enough) */}
      {segments.map((seg, i) => {
        const arcDeg = seg.endAngle - seg.startAngle;
        if (arcDeg < 28) return null;
        const textR = OUTER_R * 0.42;
        const p = polarToCart(CX, CY, textR, seg.centerAngle);
        return (
          <text
            key={`txt-${i}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            fontWeight="700"
            fill="#fff"
            style={{ pointerEvents: 'none' }}
          >
            {seg.label}
          </text>
        );
      })}

      {/* Pegs around rim */}
      {pegs.map((p, i) => (
        <circle
          key={`peg-${i}`}
          cx={p.x}
          cy={p.y}
          r={PEG_R}
          fill="url(#pegGrad)"
          stroke="#b8860b"
          strokeWidth="0.5"
        />
      ))}

      {/* Center hub */}
      <circle
        cx={CX}
        cy={CY}
        r={HUB_R}
        fill="url(#hubGrad)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="3"
      />

      {/* Gradient defs */}
      <defs>
        <radialGradient id="hubGrad">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#fff4b8" />
          <stop offset="100%" stopColor="#c9960c" />
        </linearGradient>
        <radialGradient id="pegGrad">
          <stop offset="0%" stopColor="#fff4b8" />
          <stop offset="100%" stopColor="#c9960c" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Pointer (gold triangle)                                            */
/* ------------------------------------------------------------------ */

function WheelPointer() {
  return (
    <div className="spin-wheel-pointer" aria-hidden="true">
      <svg width="32" height="40" viewBox="0 0 32 40">
        <defs>
          <linearGradient id="ptrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#c9960c" />
          </linearGradient>
          <filter id="ptrShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.45" />
          </filter>
        </defs>
        <polygon
          points="16,36 4,8 16,14 28,8"
          fill="url(#ptrGrad)"
          stroke="#8b6508"
          strokeWidth="1.2"
          filter="url(#ptrShadow)"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function NewDailySpinWheel({ session, onClose }: NewDailySpinWheelProps) {
  const { refreshProfile } = useGamification(session);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [prizePool, setPrizePool] = useState<SpinPrize[]>(SPIN_PRIZES);
  const wheelSegments = useMemo(() => buildWheelSegments(prizePool), [prizePool]);

  /* Idle wobble when not spinning */
  const [idleAngle, setIdleAngle] = useState(0);
  useEffect(() => {
    if (spinning) return;
    let frame: number;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 1000;
      setIdleAngle(Math.sin(elapsed * 0.8) * 3);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinning]);

  const getSpinStatusErrorMessage = useCallback(
    (err: unknown, offline: boolean) => {
      if (offline) return 'You appear to be offline. Check your connection and try again.';
      if (err && typeof err === 'object') {
        const maybeError = err as { code?: string; message?: string };
        if (
          maybeError.code === '42P01' ||
          maybeError.message?.toLowerCase().includes('daily_spin_state') ||
          maybeError.message?.toLowerCase().includes('spin_history')
        ) {
          return 'Daily spins are not configured yet. Run the daily spin migration to enable the wheel.';
        }
      }
      return 'We could not reach the spin wheel. Please try again.';
    },
    [],
  );

  useEffect(() => {
    const init = async () => {
      const prizes = await getSpinPrizesForUser(session.user.id);
      setPrizePool(prizes);
      await loadSpinStatus(prizes);
    };
    void init();
  }, [session.user.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const loadSpinStatus = async (availablePrizes: SpinPrize[] = prizePool) => {
    setLoading(true);
    setError(null);
    setWonPrize(null);

    try {
      const { data: spinState, error: spinError } = await getDailySpinState(session.user.id);
      if (spinError) throw spinError;

      if (spinState) {
        setCanSpin(spinState.spinsAvailable > 0);
        const today = new Date().toISOString().split('T')[0];
        if (spinState.lastSpinDate === today) {
          const { data: history, error: historyError } = await getSpinHistory(
            session.user.id,
            1,
          );
          if (historyError) throw historyError;
          const lastSpin = (history?.[0] as
            | SpinHistoryEntry
            | Record<string, unknown>
            | undefined) ?? null;
          if (lastSpin) {
            const spunAt =
              (lastSpin as SpinHistoryEntry).spunAt ??
              (lastSpin as { spun_at?: string }).spun_at;
            const prizeType =
              (lastSpin as SpinHistoryEntry).prizeType ??
              (lastSpin as { prize_type?: SpinPrize['type'] }).prize_type;
            const prizeValue =
              (lastSpin as SpinHistoryEntry).prizeValue ??
              (lastSpin as { prize_value?: number }).prize_value;
            if (spunAt && prizeType && typeof prizeValue === 'number') {
              const spunDate = new Date(spunAt).toISOString().split('T')[0];
              if (spunDate === today) {
                const match = availablePrizes.find(
                  (p) => p.type === prizeType && p.value === prizeValue,
                );
                if (match) setWonPrize(match);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load spin status:', err);
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setIsOffline(offline);
      setCanSpin(false);
      setError(getSpinStatusErrorMessage(err, offline));
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setError(null);

    try {
      const { data, error: spinError } = await executeSpin(session.user.id);
      if (spinError || !data) throw spinError || new Error('Failed to spin');

      const { prize, spinsRemaining } = data;

      const segment = wheelSegments.find(
        (c) => c.type === prize.type && c.value === prize.value && c.label === prize.label,
      );
      const targetAngle = segment ? segment.centerAngle : 0;
      const finalRotation = rotation + 360 * 5 + (360 - targetAngle);

      setRotation(finalRotation);

      setTimeout(() => {
        setWonPrize(prize);
        setCanSpin(spinsRemaining > 0);
        setSpinning(false);
        setShowReward(true);

        confetti({
          particleCount:
            prize.type === 'treasure_chest' || prize.type === 'mystery' ? 180 : 140,
          spread: 90,
          origin: { y: 0.6 },
        });

        refreshProfile();
        window.dispatchEvent(new CustomEvent('dailySpinComplete'));
      }, 3200);
    } catch (err) {
      console.error('Spin failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to spin. Please try again.');
      setSpinning(false);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="new-daily-spin-modal" onClick={onClose}>
        <div
          className="new-daily-spin-modal__content"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="new-daily-spin-modal__close"
            onClick={onClose}
            aria-label="Close spin wheel"
          >
            ✕
          </button>
          <div className="new-daily-spin-modal__loading">
            <div className="spinner">🎡</div>
            <p>Loading spin wheel...</p>
          </div>
        </div>
      </div>
    );
  }

  const isSpecialPrize =
    wonPrize?.type === 'treasure_chest' || wonPrize?.type === 'mystery';

  const rewardSubtitle = wonPrize
    ? wonPrize.type === 'treasure_chest'
      ? 'Chest opened! Essence + Shards + Dice added.'
      : wonPrize.type === 'mystery'
        ? 'Mystery revealed! Bonus reward added.'
        : wonPrize.type === 'game_tokens'
          ? 'Game Tokens bonus added (non-event currency).'
        : `${wonPrize.label} added to your account!`
    : '';

  const headerSubtitle = error
    ? 'We could not load the spin. Check your connection and retry.'
    : canSpin
      ? 'Your spin is ready — give it a whirl!'
      : 'No spins left. Earn more by completing habits today.';

  return (
    <div className="new-daily-spin-modal" onClick={onClose}>
      <div
        className="new-daily-spin-modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="new-daily-spin-modal__close"
          onClick={onClose}
          aria-label="Close spin wheel"
        >
          ✕
        </button>

        <header className="new-daily-spin-modal__header">
          <h2>🎡 Daily Spin Wheel</h2>
          <p className="new-daily-spin-modal__subtitle">{headerSubtitle}</p>
        </header>

        {error && (
          <div className="new-daily-spin-modal__error" role="alert">
            <p className="new-daily-spin-modal__error-title">Spin wheel unavailable</p>
            <p className="new-daily-spin-modal__error-detail">{error}</p>
            <div className="new-daily-spin-modal__error-actions">
              <button
                type="button"
                className="new-daily-spin-modal__retry-btn"
                onClick={() => void loadSpinStatus()}
                disabled={loading}
              >
                Try again
              </button>
              <button
                type="button"
                className="new-daily-spin-modal__secondary-btn"
                onClick={onClose}
              >
                Close
              </button>
            </div>
            {isOffline && (
              <p className="new-daily-spin-modal__error-footnote">
                Offline mode keeps your place. Reconnect to spin.
              </p>
            )}
          </div>
        )}

        {/* Wheel */}
        <div className="new-daily-spin-wheel">
          <WheelPointer />
          <div
            className={`new-daily-spin-wheel__disc-wrapper${
              !canSpin && !spinning ? ' new-daily-spin-wheel__disc-wrapper--dimmed' : ''
            }`}
          >
            <WheelSVG
              segments={wheelSegments}
              rotation={spinning ? rotation : rotation + idleAngle}
              spinning={spinning}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="new-daily-spin-modal__actions">
          {error ? (
            <div className="new-daily-spin-modal__fallback">
              <p className="new-daily-spin-modal__fallback-title">
                We saved your spot.
              </p>
              <p className="new-daily-spin-modal__fallback-text">
                Stay here and retry once your connection is back.
              </p>
              <div className="new-daily-spin-modal__fallback-actions">
                <button
                  type="button"
                  className="new-daily-spin-modal__retry-btn"
                  onClick={() => void loadSpinStatus()}
                  disabled={loading}
                >
                  Retry
                </button>
                <button
                  type="button"
                  className="new-daily-spin-modal__secondary-btn"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          ) : canSpin ? (
            <button
              type="button"
              className="new-daily-spin-modal__spin-btn"
              onClick={handleSpin}
              disabled={spinning}
            >
              {spinning ? '🎡 SPINNING...' : '🎡 SPIN!'}
            </button>
          ) : wonPrize ? (
            <div className="new-daily-spin-modal__result">
              <div
                className={`new-daily-spin-modal__result-icon${
                  isSpecialPrize ? ' new-daily-spin-modal__result-icon--chest' : ''
                }`}
              >
                {wonPrize.icon}
              </div>
              <h3 className="new-daily-spin-modal__result-title">You won!</h3>
              <p className="new-daily-spin-modal__result-prize">{wonPrize.label}</p>
              <p className="new-daily-spin-modal__result-subtitle">{rewardSubtitle}</p>
            </div>
          ) : (
            <div className="new-daily-spin-modal__locked">
              <p className="new-daily-spin-modal__locked-icon">🔒</p>
              <p className="new-daily-spin-modal__locked-text">
                Earn spins by finishing habits:
              </p>
              <ul className="new-daily-spin-modal__locked-list">
                <li>Complete 1+ habits today → 1 spin</li>
                <li>Complete all of today&apos;s habits → 2 spins</li>
                <li>Keep a 7+ day streak → +1 bonus spin at reset</li>
              </ul>
            </div>
          )}
        </div>

        {/* Reward overlay */}
        {showReward && wonPrize && (
          <div
            className="new-daily-spin-modal__reward-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowReward(false)}
          >
            <div
              className={`new-daily-spin-modal__reward-card${
                isSpecialPrize ? ' new-daily-spin-modal__reward-card--chest' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="new-daily-spin-modal__reward-burst">
                {isSpecialPrize ? '🗝️' : '🎉'}
              </div>
              <h3 className="new-daily-spin-modal__reward-title">
                {wonPrize.type === 'mystery' ? 'Mystery Revealed!' : 'Reward Claimed!'}
              </h3>
              <div
                className={`new-daily-spin-modal__reward-icon${
                  isSpecialPrize ? ' new-daily-spin-modal__reward-icon--chest' : ''
                }`}
              >
                {wonPrize.icon}
              </div>
              <p className="new-daily-spin-modal__reward-name">{wonPrize.label}</p>
              <p className="new-daily-spin-modal__reward-subtitle">{rewardSubtitle}</p>
              <button
                type="button"
                className="new-daily-spin-modal__reward-close"
                onClick={() => setShowReward(false)}
              >
                Awesome!
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
