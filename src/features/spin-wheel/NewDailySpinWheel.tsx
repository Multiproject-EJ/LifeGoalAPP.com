// New Daily Spin Wheel Modal - SVG-based wheel with economy-aligned prizes

import { useState, useEffect, useMemo, useCallback } from 'react';
import {canPreviewDailySpin,previewDailySpin} from '../../services/dailySpinDevPreview';
import type { Session } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';
import {
  executeSpin,
  getDailySpinEssenceBalance,
  getDailySpinState,
  SPIN_REWARD_MULTIPLIER_OPTIONS,
  getSpinHistory,
  getSpinPrizesForUser,
  getSuperSliceLuck,
} from '../../services/dailySpin';
import { NEUTRAL_SUPER_SLICE_LUCK, type SuperSliceLuck } from '../../services/dailySpinSuperLuck';
import type { SpinAward, SpinHistoryEntry, SpinPrize } from '../../types/gamification';
import { SPIN_PRIZES } from '../../types/gamification';
import { isIslandThreeJackpotPrize } from '../../services/dailySpinPrizePool';
import { buildWheelSegments, type WheelSegment } from './spinWheelUtils';
import { useGamification } from '../../hooks/useGamification';
import { triggerCompletionHaptic } from '../../utils/completionHaptics';
import { CelebrationFireworks } from '../../components/CelebrationFireworks';
import {
  GiftBoxOpeningAnimation,
  preloadGiftBoxOpeningAnimation,
  type GiftBoxRewardItem,
} from '../../components/GiftBoxOpeningAnimation';
import './NewDailySpinWheel.css';

interface NewDailySpinWheelProps {
  devPreview?:boolean;
  session: Session;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  SVG helpers                                                        */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180;

const toGiftBoxRewards = (awards: SpinAward[]): GiftBoxRewardItem[] =>
  awards.map((award, index) => ({
    id: `spin-${award.currency}-${index}`,
    icon: award.icon,
    amount: String(award.amount),
    accessibleLabel: `${award.amount} ${award.label}`,
  }));

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
const DAILY_MOMENTUM_ASSET_ROOT = '/assets/spin-wheel/daily-momentum';

function getPrizeIconAsset(type: SpinPrize['type']): string {
  const prizeAssets: Record<SpinPrize['type'], string> = {
    gold: 'prize-essence-orb-transparent.png',
    essence: 'prize-essence-orb-transparent.png',
    shards: 'prize-shards-orb-transparent.png',
    dice: 'prize-dice-pair-transparent.png',
    game_tokens: 'prize-game-tickets-transparent.png',
    treasure_chest: 'prize-treasure-case-transparent.png',
    mystery: 'prize-lucky-gift-transparent.png',
    super: 'prize-treasure-case-transparent.png',
  };
  return `${DAILY_MOMENTUM_ASSET_ROOT}/prizes/${prizeAssets[type]}`;
}

/** Big prize number that counts up once when the reward appears. */
function SpinRewardCount({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || value <= 0) {
      setShown(value);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown.toLocaleString()}</>;
}

function getWheelLabelLines(segment: WheelSegment): string[] {
  const compactLabels: Record<SpinPrize['type'], string> = {
    gold: `${segment.value} Money`,
    // Wheel labels match what the prize pays out: essence is Money and
    // shards are Essence in the Island Run wallet.
    essence: `${segment.value} Money`,
    shards: `${segment.value} Essence`,
    dice: `${segment.value} Dice`,
    game_tokens: `${segment.value} Tickets`,
    treasure_chest: 'Treasure Chest',
    mystery: 'Mystery Box',
    super: 'Super Slice',
  };
  return compactLabels[segment.type].split(' ');
}

function WheelSVG({
  segments,
  rotation,
  spinning,
  winningSegmentIndex,
  superState = 'normal',
}: {
  segments: WheelSegment[];
  rotation: number;
  spinning: boolean;
  winningSegmentIndex: number;
  superState?: 'normal' | 'charged' | 'cooldown';
}) {
  return (
    <svg
      className={`spin-wheel-svg spin-wheel-svg--super-${superState}`}
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
      <defs>
        <linearGradient id="spin-wheel-super-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff3fd4" />
          <stop offset="25%" stopColor="#ffb020" />
          <stop offset="50%" stopColor="#34f5a0" />
          <stop offset="75%" stopColor="#35c8ff" />
          <stop offset="100%" stopColor="#9b5cff" />
        </linearGradient>
        <radialGradient id="spin-wheel-super-star-fill" cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#fff27a" />
          <stop offset="70%" stopColor="#ffb31a" />
          <stop offset="100%" stopColor="#ff3fb4" />
        </radialGradient>
        <radialGradient id="spin-wheel-super-ray-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="45%" stopColor="#fff3a0" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffd23f" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Segments */}
      {segments.map((seg, i) => (
        <path
          key={i}
          className={`spin-wheel-segment${seg.type === 'super' ? ' spin-wheel-segment--super' : ''}${winningSegmentIndex === i ? ' spin-wheel-segment--winner' : ''}`}
          d={segmentPath(CX, CY, OUTER_R - 10, seg.startAngle, seg.endAngle)}
          fill={seg.type === 'super' ? 'url(#spin-wheel-super-fill)' : seg.color}
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="1.25"
        />
      ))}
      {/* Super Slice energy: pulsing light, a crackling edge and sparks */}
      {segments.map((seg, i) => {
        if (seg.type !== 'super') return null;
        const d = segmentPath(CX, CY, OUTER_R - 10, seg.startAngle, seg.endAngle);
        const span = seg.endAngle - seg.startAngle;
        const sparks = [
          { r: 0.36, t: 0.3 }, { r: 0.52, t: 0.78 }, { r: 0.74, t: 0.18 },
          { r: 0.84, t: 0.62 }, { r: 0.6, t: 0.45 },
        ];
        return (
          <g key={`super-energy-${i}`} style={{ pointerEvents: 'none' }}>
            <path className="spin-wheel-super-glow" d={d} fill="#ffffff" />
            <path className="spin-wheel-super-edge" d={d} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeDasharray="5 9" strokeLinejoin="round" />
            {sparks.map((spark, sparkIndex) => {
              const point = polarToCart(CX, CY, (OUTER_R - 10) * spark.r, seg.startAngle + span * spark.t);
              return (
                <circle
                  key={sparkIndex}
                  className="spin-wheel-super-spark"
                  cx={point.x}
                  cy={point.y}
                  r={sparkIndex % 2 === 0 ? 1.8 : 1.3}
                  fill="#ffffff"
                  style={{ animationDelay: `${sparkIndex * 0.27}s` }}
                />
              );
            })}
          </g>
        );
      })}

      {/* Segment prize artwork */}
      {segments.map((seg, i) => {
        const iconR = OUTER_R * 0.67;
        const p = polarToCart(CX, CY, iconR, seg.centerAngle);
        const iconSize = seg.wheelSize === 'small' ? 25 : seg.wheelSize === 'large' ? 34 : 30;
        if (seg.type === 'super') {
          const r = 15;
          const starPoints = (outer: number, inner: number) => Array.from({ length: 10 }, (_, point) => {
            const radius = point % 2 === 0 ? outer : inner;
            const angle = (point * 36 - 90) * DEG;
            return `${(p.x + radius * Math.cos(angle)).toFixed(2)},${(p.y + radius * Math.sin(angle)).toFixed(2)}`;
          }).join(' ');
          // Faceted look: each arm is split into a lit and a shaded half.
          const facets = Array.from({ length: 5 }, (_, arm) => {
            const tipAngle = (arm * 72 - 90) * DEG;
            const leftAngle = (arm * 72 - 126) * DEG;
            const tip = `${(p.x + r * Math.cos(tipAngle)).toFixed(2)},${(p.y + r * Math.sin(tipAngle)).toFixed(2)}`;
            const valley = `${(p.x + r * 0.45 * Math.cos(leftAngle)).toFixed(2)},${(p.y + r * 0.45 * Math.sin(leftAngle)).toFixed(2)}`;
            return `${p.x.toFixed(2)},${p.y.toFixed(2)} ${valley} ${tip}`;
          });
          const orbit = polarToCart(p.x, p.y, r * 1.45, 0);
          return (
            <g key={`asset-${i}`} className="spin-wheel-super-emblem" style={{ pointerEvents: 'none' }}>
              <g className="spin-wheel-super-rays" style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
                {Array.from({ length: 8 }, (_, ray) => {
                  const a = (ray * 45) * DEG;
                  const b = (ray * 45 + 12) * DEG;
                  return (
                    <polygon
                      key={ray}
                      points={`${p.x},${p.y} ${(p.x + r * 2.1 * Math.cos(a)).toFixed(2)},${(p.y + r * 2.1 * Math.sin(a)).toFixed(2)} ${(p.x + r * 2.1 * Math.cos(b)).toFixed(2)},${(p.y + r * 2.1 * Math.sin(b)).toFixed(2)}`}
                      fill="url(#spin-wheel-super-ray-fill)"
                    />
                  );
                })}
              </g>
              <circle className="spin-wheel-super-ring" cx={p.x} cy={p.y} r={r * 0.9} fill="none" stroke="#ffffff" strokeWidth="1.4" style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
              <g className="spin-wheel-super-star" style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
                <polygon points={starPoints(r, r * 0.45)} fill="url(#spin-wheel-super-star-fill)" stroke="#5b1a8c" strokeWidth="1.3" strokeLinejoin="round" />
                {facets.map((facet, facetIndex) => (
                  <polygon key={facetIndex} points={facet} fill="#ffffff" opacity="0.35" />
                ))}
                <circle cx={p.x - r * 0.18} cy={p.y - r * 0.22} r={r * 0.16} fill="#ffffff" opacity="0.9" />
              </g>
              <g className="spin-wheel-super-orbit" style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
                <circle cx={orbit.x} cy={orbit.y} r="1.9" fill="#ffffff" />
              </g>
            </g>
          );
        }
        return (
          <image
            key={`asset-${i}`}
            className={winningSegmentIndex === i ? 'spin-wheel-prize-art spin-wheel-prize-art--winner' : 'spin-wheel-prize-art'}
            href={getPrizeIconAsset(seg.type)}
            x={p.x - iconSize / 2}
            y={p.y - iconSize / 2}
            width={iconSize}
            height={iconSize}
            preserveAspectRatio="xMidYMid meet"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {/* Segment labels - text (only if segment is wide enough) */}
      {segments.map((seg, i) => {
        const arcDeg = seg.endAngle - seg.startAngle;
        if (arcDeg < 28) return null;
        const textR = OUTER_R * 0.43;
        const p = polarToCart(CX, CY, textR, seg.centerAngle);
        const lines = seg.type === 'super' && superState === 'cooldown' ? ['Recharging'] : getWheelLabelLines(seg);
        return (
          <text
            key={`txt-${i}`}
            className={winningSegmentIndex === i ? 'spin-wheel-label spin-wheel-label--winner' : 'spin-wheel-label'}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7.4"
            fontWeight="900"
            fill="#fff"
            stroke={seg.type === 'super' ? '#3b0a57' : undefined}
            strokeWidth={seg.type === 'super' ? 1.6 : undefined}
            paintOrder={seg.type === 'super' ? 'stroke' : undefined}
            style={{ pointerEvents: 'none' }}
          >
            {lines.map((line, lineIndex) => (
              <tspan
                key={`${line}-${lineIndex}`}
                x={p.x}
                dy={lineIndex === 0 ? `${-(lines.length - 1) * 0.42}em` : '0.9em'}
              >
                {line}
              </tspan>
            ))}
          </text>
        );
      })}

    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Pointer (gold triangle)                                            */
/* ------------------------------------------------------------------ */

function WheelPointer() {
  return (
    <img
      className="spin-wheel-pointer"
      src={`${DAILY_MOMENTUM_ASSET_ROOT}/pointer/daily-momentum-pointer-transparent.png`}
      alt=""
      aria-hidden="true"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function NewDailySpinWheel({ session, onClose, devPreview=false }: NewDailySpinWheelProps) {
  const isDevPreview=devPreview&&canPreviewDailySpin();
  const { refreshProfile } = useGamification(session);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [winnerRevealPending, setWinnerRevealPending] = useState(false);
  const [lastAwards, setLastAwards] = useState<SpinAward[]>([]);
  const [superLuck, setSuperLuck] = useState<SuperSliceLuck>(NEUTRAL_SUPER_SLICE_LUCK);
  const [lastMultiplier, setLastMultiplier] = useState(1);
  const [showGiftOpening, setShowGiftOpening] = useState(false);
  const [giftRewards, setGiftRewards] = useState<GiftBoxRewardItem[]>([]);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [prizePool, setPrizePool] = useState<SpinPrize[]>(SPIN_PRIZES);
  const [essenceBalance, setEssenceBalance] = useState(0);
  const [selectedMultiplier, setSelectedMultiplier] = useState(1 as 1 | 2 | 3);

  useEffect(() => {
    preloadGiftBoxOpeningAnimation();
  }, []);

  const wheelSegments = useMemo(() => buildWheelSegments(prizePool), [prizePool]);
  const hasIslandThreeJackpot = useMemo(
    () => prizePool.some(isIslandThreeJackpotPrize),
    [prizePool],
  );
  const winningSegmentIndex = useMemo(() => {
    if (!wonPrize || spinning) return -1;
    return wheelSegments.findIndex(
      (segment) => segment.type === wonPrize.type && segment.value === wonPrize.value && segment.label === wonPrize.label,
    );
  }, [spinning, wheelSegments, wonPrize]);

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
      if(devPreview&&!isDevPreview){setError('Developer mode is required');setLoading(false);return;}
      if(isDevPreview){setPrizePool(SPIN_PRIZES);setCanSpin(true);setLoading(false);return;}
      const prizes = await getSpinPrizesForUser(session.user.id, session);
      setPrizePool(prizes);
      if (prizes.some(isIslandThreeJackpotPrize)) {
        setSelectedMultiplier(1);
      }
      const { data: balance } = await getDailySpinEssenceBalance(session.user.id);
      setEssenceBalance(balance ?? 0);
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
    if(devPreview&&!canPreviewDailySpin()){setError('Developer mode is required');setLoading(false);return;}
    setLoading(true);
    setError(null);
    setWonPrize(null);
    setWinnerRevealPending(false);
    setShowReward(false);
    setShowGiftOpening(false);
    setGiftRewards([]);
    if(isDevPreview){setCanSpin(true);setLoading(false);return;}

    try {
      const { data: spinState, error: spinError } = await getDailySpinState(session.user.id);
      if (spinError) throw spinError;

      if (spinState) {
        setCanSpin(spinState.spinsAvailable > 0);
        void getSuperSliceLuck(session.user.id).then(setSuperLuck);
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
    if(devPreview&&!canPreviewDailySpin())return;
    const multiplierOption = hasIslandThreeJackpot
      ? SPIN_REWARD_MULTIPLIER_OPTIONS[0]
      : SPIN_REWARD_MULTIPLIER_OPTIONS.find((entry) => entry.multiplier === selectedMultiplier)
        ?? SPIN_REWARD_MULTIPLIER_OPTIONS[0];
    if (!canSpin || spinning || charging) return;
    if (essenceBalance < multiplierOption.essenceCost) {
      setError('Not enough money for this reward boost. Choose Free or earn more money.');
      triggerCompletionHaptic('light', { channel: 'gamification', minIntervalMs: 300 });
      return;
    }
    setCharging(true);
    setError(null);

    try {
      triggerCompletionHaptic(selectedMultiplier > 1 ? 'medium' : 'light', { channel: 'gamification', minIntervalMs: 300 });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 460));
      setCharging(false);
      setSpinning(true);
      const { data, error: spinError } = isDevPreview ? {data:previewDailySpin(),error:null} : await executeSpin(session.user.id, {
        session,
        rewardMultiplier: multiplierOption.multiplier,
        essenceCost: multiplierOption.essenceCost,
      });
      if (spinError || !data) throw spinError || new Error('Failed to spin');

      const { prize, spinsRemaining, awardedRewards } = data;
      const resolvedGiftRewards = toGiftBoxRewards(awardedRewards);
      setLastAwards(awardedRewards);
      setLastMultiplier(multiplierOption.multiplier);

      const segment = wheelSegments.find(
        (c) => c.type === prize.type && c.value === prize.value && c.label === prize.label,
      );
      const targetAngle = segment ? segment.centerAngle : 0;
      const finalRotation = rotation + 360 * 5 + (360 - targetAngle);

      setRotation(finalRotation);

      setTimeout(() => {
        setWonPrize(prize);
        setWinnerRevealPending(true);
        setGiftRewards(resolvedGiftRewards);
        setCanSpin(spinsRemaining > 0);
        setEssenceBalance((current) => Math.max(0, current - multiplierOption.essenceCost));
        setSpinning(false);

        triggerCompletionHaptic(prize.type === 'treasure_chest' || prize.type === 'mystery' || prize.type === 'super' || isIslandThreeJackpotPrize(prize) || selectedMultiplier > 1 ? 'strong' : 'medium', { channel: 'gamification', minIntervalMs: 300 });

        window.setTimeout(() => {
          setWinnerRevealPending(false);
          if (prize.type === 'mystery') {
            setShowGiftOpening(true);
          } else {
            setShowReward(true);
          }
          if (prize.type !== 'treasure_chest' && prize.type !== 'mystery') {
            confetti({
              particleCount: 140,
              spread: 90,
              origin: { y: 0.6 },
            });
          }
        }, 720);

        if(!isDevPreview){refreshProfile();window.dispatchEvent(new CustomEvent('dailySpinComplete'));void getSuperSliceLuck(session.user.id).then(setSuperLuck);}
      }, 3200);
    } catch (err) {
      console.error('Spin failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to spin. Please try again.');
      setWinnerRevealPending(false);
      setCharging(false);
      setSpinning(false);
    }
  };

  const handleGiftBoxOpeningComplete = useCallback(() => {
    setShowGiftOpening(false);
    setGiftRewards([]);
  }, []);

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
    wonPrize?.type === 'treasure_chest'
    || wonPrize?.type === 'mystery'
    || (wonPrize ? isIslandThreeJackpotPrize(wonPrize) : false);
  const isTreasureChest = wonPrize?.type === 'treasure_chest';
  const isSuperSlice = wonPrize?.type === 'super';
  const isIslandThreeJackpot = wonPrize ? isIslandThreeJackpotPrize(wonPrize) : false;

  const rewardSubtitle = isDevPreview ? 'Developer preview only — no rewards or daily eligibility changed.' : wonPrize
    ? isIslandThreeJackpotPrize(wonPrize)
      ? 'Island 3 jackpot! 2,000 dice are now in your Island Run wallet.'
      : wonPrize.type === 'treasure_chest'
      ? 'Chest opened! Money + Essence + Dice added.'
      : wonPrize.type === 'super'
      ? 'Super Slice jackpot added to your wallet!'
      : wonPrize.type === 'mystery'
        ? 'Mystery revealed! Bonus reward added.'
        : wonPrize.type === 'game_tokens'
          ? 'Game Tokens bonus added (non-event currency).'
        : `${wonPrize.label} added to your account!`
    : '';

  const selectedMultiplierOption = SPIN_REWARD_MULTIPLIER_OPTIONS.find((entry) => entry.multiplier === selectedMultiplier) ?? SPIN_REWARD_MULTIPLIER_OPTIONS[0];
  const effectiveMultiplierOption = hasIslandThreeJackpot
    ? SPIN_REWARD_MULTIPLIER_OPTIONS[0]
    : selectedMultiplierOption;
  const canAffordSelectedMultiplier = essenceBalance >= effectiveMultiplierOption.essenceCost;

  // The wheel explains itself; only problems and the one-off Island 3
  // jackpot get a line under the title.
  const headerSubtitle = error
    ? 'We could not load the spin. Check your connection and retry.'
    : canSpin && hasIslandThreeJackpot
      ? 'Island 3 has charged one unforgettable jackpot spin.'
      : null;

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
          <h2 className="new-daily-spin-modal__title-text" aria-label="Lucky Spin">
            <span>Lucky</span>
            <span>Spin</span>
          </h2>
          {headerSubtitle ? <p className="new-daily-spin-modal__subtitle">{headerSubtitle}</p> : null}
          {isDevPreview&&<><p role="status">Developer rehearsal · no wallet payouts</p><button type="button" disabled={spinning||charging} onClick={()=>void loadSpinStatus()}>Reset test spin</button></>}
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

        {hasIslandThreeJackpot ? (
          <div className="new-daily-spin-modal__jackpot-banner" role="status">
            <span aria-hidden="true">✦</span>
            <div>
              <strong>Island 3 speed trial</strong>
              <small>Guaranteed once · 2,000 dice · no boost cost</small>
            </div>
            <span aria-hidden="true">🎲</span>
          </div>
        ) : (
          <div className="new-daily-spin-modal__boosts" role="radiogroup" aria-label="Reward boost">
            {SPIN_REWARD_MULTIPLIER_OPTIONS.map((option) => {
              const affordable = essenceBalance >= option.essenceCost;
              const active = selectedMultiplier === option.multiplier;
              return (
                <button
                  key={option.multiplier}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`new-daily-spin-modal__boost${active ? ' is-active' : ''}${affordable ? '' : ' is-locked'}`}
                  disabled={!canSpin || charging || spinning || !affordable}
                  onClick={() => {
                    setSelectedMultiplier(option.multiplier);
                    triggerCompletionHaptic('light', { channel: 'gamification', minIntervalMs: 250 });
                  }}
                  aria-label={option.essenceCost === 0
                    ? `Times ${option.multiplier}, free`
                    : `Times ${option.multiplier}, costs ${option.essenceCost} money${affordable ? '' : ', not enough money'}`}
                >
                  <strong>×{option.multiplier}</strong>
                  <span>{option.essenceCost === 0 ? 'Free' : `💰 ${option.essenceCost}`}</span>
                </button>
              );
            })}
            <small className="new-daily-spin-modal__boost-balance" aria-label={`${essenceBalance} money available`}>💰 {essenceBalance}</small>
            {!superLuck.onCooldown && (superLuck.guaranteed || superLuck.multiplier > 1) ? (
              <span
                className="new-daily-spin-modal__super-luck"
                role="status"
                aria-label={superLuck.guaranteed
                  ? 'Super Slice guaranteed on this spin'
                  : `Super Slice odds boosted ${superLuck.multiplier} times`}
              >
                ★ {superLuck.guaranteed ? 'Super Slice guaranteed' : `Lucky ×${superLuck.multiplier}`}
              </span>
            ) : null}
          </div>
        )}

        {/* Wheel */}
        <div className={`new-daily-spin-wheel${charging ? ' new-daily-spin-wheel--charging' : ''}${spinning ? ' new-daily-spin-wheel--spinning' : ''}${winningSegmentIndex >= 0 ? ' new-daily-spin-wheel--winner' : ''}`}>
          <WheelPointer />
          <div
            className={`new-daily-spin-wheel__disc-wrapper${
              !canSpin && !spinning && !wonPrize ? ' new-daily-spin-wheel__disc-wrapper--dimmed' : ''
            }`}
          >
            <WheelSVG
              superState={superLuck.onCooldown ? 'cooldown' : superLuck.guaranteed || superLuck.multiplier > 1 ? 'charged' : 'normal'}
              segments={wheelSegments}
              rotation={spinning ? rotation : rotation + idleAngle}
              spinning={spinning}
              winningSegmentIndex={winningSegmentIndex}
            />
          </div>
          <div className="new-daily-spin-wheel__shine" aria-hidden="true" />
          <img
            className="new-daily-spin-wheel__rim"
            src={`${DAILY_MOMENTUM_ASSET_ROOT}/rim/daily-momentum-wheel-rim-transparent.png`}
            alt=""
            aria-hidden="true"
          />
          <div className="new-daily-spin-wheel__rim-sparkle" aria-hidden="true">
            <span />
          </div>
          <div className="new-daily-spin-wheel__hub" aria-hidden="true">
            <span className="new-daily-spin-wheel__energy-ring" />
            <span className="new-daily-spin-wheel__energy-ring new-daily-spin-wheel__energy-ring--delayed" />
            <span className="new-daily-spin-wheel__robot">
              <span className="new-daily-spin-wheel__robot-antenna" />
              <span className="new-daily-spin-wheel__robot-face">
                <span className="new-daily-spin-wheel__robot-eye" />
                <span className="new-daily-spin-wheel__robot-eye" />
              </span>
            </span>
          </div>

        </div>

        {!error && !canSpin && !charging && !spinning && !winnerRevealPending && !showReward && !showGiftOpening && (
          <div className="new-daily-spin-modal__result-overlay new-daily-spin-modal__result-overlay--status" role="status">
            <div className="new-daily-spin-wheel__status-card">
              <span className="new-daily-spin-wheel__status-icon" aria-hidden="true">
                {wonPrize ? '✓' : '✦'}
              </span>
              <h3>{wonPrize ? 'Reward claimed 🎉' : 'No spins left'}</h3>
              <p>
                {wonPrize
                  ? 'You already spun today. Come back tomorrow for another spin.'
                  : 'Complete habits to earn another spin.'}
              </p>
            </div>
          </div>
        )}

        {showReward && wonPrize && (
          <div
            className="new-daily-spin-modal__result-overlay new-daily-spin-modal__result-overlay--reward"
            role="dialog"
            aria-modal="true"
            aria-label="Spin reward"
            onClick={() => setShowReward(false)}
          >
            <CelebrationFireworks variant={isTreasureChest || isIslandThreeJackpot || isSuperSlice || lastMultiplier > 1 ? 'hero' : 'rapid'} fit="contain" />
            <div
              className={`new-daily-spin-modal__reward-card${
                isSpecialPrize ? ' new-daily-spin-modal__reward-card--chest' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="new-daily-spin-modal__reward-burst">
                {isIslandThreeJackpot ? '⚡' : isSpecialPrize ? '🗝️' : '🎉'}
              </div>
              <h3 className="new-daily-spin-modal__reward-title">
                {isIslandThreeJackpot
                  ? 'ISLAND 3 JACKPOT!'
                  : isSuperSlice
                    ? '★ SUPER SLICE ★'
                  : wonPrize.type === 'mystery'
                    ? 'Mystery Revealed!'
                    : 'You won!'}
              </h3>
              {isSpecialPrize ? (
                <>
                  <div className="new-daily-spin-modal__reward-icon new-daily-spin-modal__reward-icon--chest">
                    {wonPrize.icon}
                  </div>
                  <p className="new-daily-spin-modal__reward-name">{wonPrize.label}</p>
                </>
              ) : (
                <div className="new-daily-spin-modal__reward-hero">
                  <img
                    className="new-daily-spin-modal__reward-hero-art"
                    src={getPrizeIconAsset(lastAwards[0]?.currency ?? wonPrize.type)}
                    alt=""
                    aria-hidden="true"
                  />
                  <strong className="new-daily-spin-modal__reward-amount" aria-label={`${lastAwards[0]?.amount ?? wonPrize.value} ${lastAwards[0]?.label ?? wonPrize.label}`}>
                    +<SpinRewardCount value={lastAwards[0]?.amount ?? wonPrize.value} />
                  </strong>
                  <span className="new-daily-spin-modal__reward-unit">{lastAwards[0]?.label ?? wonPrize.label}</span>
                  {lastAwards.length > 1 ? (
                    <span className="new-daily-spin-modal__reward-extras">
                      {lastAwards.slice(1).map((award) => (
                        <span key={award.currency}>+{award.amount.toLocaleString()} {award.icon}</span>
                      ))}
                    </span>
                  ) : null}
                  {lastMultiplier > 1 ? <span className="new-daily-spin-modal__reward-boost">×{lastMultiplier} boost</span> : null}
                </div>
              )}
              <p className="new-daily-spin-modal__reward-subtitle">{rewardSubtitle}</p>
              <button
                type="button"
                className="new-daily-spin-modal__reward-close"
                onClick={() => setShowReward(false)}
              >
                Collect
              </button>
            </div>
          </div>
        )}

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
              disabled={charging || spinning || !canAffordSelectedMultiplier}
            >
              <span className="new-daily-spin-modal__spin-btn-icon" aria-hidden="true">✦</span>
              {charging
                ? 'POWERING UP...'
                : spinning
                  ? 'SPINNING...'
                  : hasIslandThreeJackpot
                    ? 'UNLEASH 2,000 DICE!'
                    : selectedMultiplier > 1
                      ? `SPIN ×${selectedMultiplier} · 💰${selectedMultiplierOption.essenceCost}`
                      : 'SPIN!'}
            </button>
          ) : null}
        </div>

        {showGiftOpening && wonPrize?.type === 'mystery' && (
          <div className="new-daily-spin-modal__gift-opening" role="presentation">
            <GiftBoxOpeningAnimation
              rewards={giftRewards}
              onComplete={handleGiftBoxOpeningComplete}
            />
          </div>
        )}

      </div>
    </div>
  );
}
