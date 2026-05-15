import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { RewardCard } from './RewardCard';
import type { RewardTier, RewardCurrency, HolidayKey } from '../../../services/treatCalendarService';

type CalendarDoorScratchProps = {
  dayNumber: number;
  emoji: string;
  tier: RewardTier;
  currency: RewardCurrency;
  amount: number | null;
  holidayKey: HolidayKey | null;
  onRevealComplete?: () => void;
  onClaim?: () => void;
  isPersonalQuest?: boolean;
  diceLabel?: string;
};

/** Number of scratch actions needed before auto-revealing the card */
const SCRATCH_ACTIONS_TO_REVEAL = 18;
/** Radius in pixels of the scratch brush */
const SCRATCH_BRUSH_RADIUS_PX = 18;

/** Get holiday-themed gradient colors for scratch layer */
function getHolidayGradient(holidayKey: HolidayKey | null): [string, string, string] {
  switch (holidayKey) {
    case 'christmas':
      return ['#2d5a3c', '#3d7a4f', '#2d5a3c']; // Forest green
    case 'halloween':
      return ['#4a2c6a', '#6b3fa0', '#4a2c6a']; // Purple
    case 'easter':
      return ['#f8bbd9', '#f48fb1', '#f8bbd9']; // Pink
    case 'valentines_day':
      return ['#ff6b6b', '#ff8e8e', '#ff6b6b']; // Red/pink
    case 'new_year':
      return ['#2c3e50', '#34495e', '#2c3e50']; // Dark blue
    case 'thanksgiving':
      return ['#d35400', '#e67e22', '#d35400']; // Orange
    case 'hanukkah':
      return ['#2980b9', '#3498db', '#2980b9']; // Blue
    case 'eid_mubarak':
      return ['#27ae60', '#2ecc71', '#27ae60']; // Green
    case 'st_patricks_day':
      return ['#27ae60', '#2ecc71', '#27ae60']; // Green
    default:
      return ['#cbd5f5', '#d4e1f9', '#b3c7f5']; // Default blue
  }
}

const drawScratchLayer = (canvas: HTMLCanvasElement, holidayKey: HolidayKey | null) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const [color1, color2, color3] = getHolidayGradient(holidayKey);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(0.5, color2);
  gradient.addColorStop(1, color3);

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add subtle shimmer effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(canvas.width * 0.1, canvas.height * 0.15, canvas.width * 0.8, canvas.height * 0.7);

  // Add "SCRATCH" text hint
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦ SCRATCH ✦', canvas.width / 2, canvas.height / 2);
};

/**
 * Scratch card reveal mechanic — canvas scratch with confetti burst.
 * Holiday-themed scratch layer color, RewardCard beneath.
 */
export const CalendarDoorScratch = ({
  dayNumber,
  emoji,
  tier,
  currency,
  amount,
  holidayKey,
  onRevealComplete,
  onClaim,
  isPersonalQuest = false,
  diceLabel,
}: CalendarDoorScratchProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchCount, setScratchCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    setIsRevealed(false);
    setScratchCount(0);
    setShowConfetti(false);
  }, [dayNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card) return;

    const resizeCanvas = () => {
      canvas.width = card.clientWidth;
      canvas.height = card.clientHeight;
      drawScratchLayer(canvas, holidayKey);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [dayNumber, holidayKey]);

  useEffect(() => {
    if (scratchCount >= SCRATCH_ACTIONS_TO_REVEAL && !isRevealed) {
      setIsRevealed(true);
      // Show confetti for tier 2+ rewards
      if (tier >= 2) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
      onRevealComplete?.();
    }
  }, [scratchCount, isRevealed, onRevealComplete, tier]);

  const scratchAtPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, SCRATCH_BRUSH_RADIUS_PX, 0, Math.PI * 2, true);
    ctx.fill();

    setScratchCount((count) => count + 1);
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    scratchAtPoint(event);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    scratchAtPoint(event);
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleRevealNow = () => {
    setIsRevealed(true);
    if (tier >= 2) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
    onRevealComplete?.();
  };

  const isDiamondReward = tier === 5;

  return (
    <div className={`door-scratch ${isDiamondReward && isRevealed ? 'door-scratch--diamond' : ''}`}>
      {/* Diamond flash effect */}
      {isDiamondReward && isRevealed && (
        <div className="door-scratch__diamond-flash" aria-hidden="true" />
      )}

      {/* Confetti burst */}
      {showConfetti && (
        <div className="door-scratch__confetti" aria-hidden="true">
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={`confetti-${i}`}
              className="door-scratch__confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 5],
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`door-scratch__card ${isRevealed ? 'door-scratch__card--revealed' : ''}`}
        aria-live="polite"
        ref={cardRef}
      >
        {/* Reward card beneath scratch layer */}
        <div className="door-scratch__content">
          <div className="door-scratch__day-badge">
            <span className="door-scratch__day-number">Day {dayNumber}</span>
            <span className="door-scratch__day-emoji" aria-hidden="true">{emoji}</span>
          </div>
          <RewardCard
            tier={tier}
            currency={currency}
            amount={amount}
            holidayKey={holidayKey}
            onClaim={onClaim}
            isPersonalQuest={isPersonalQuest}
            diceLabel={diceLabel}
          />
        </div>

        {/* Scratch canvas overlay */}
        <canvas
          ref={canvasRef}
          className={`door-scratch__canvas ${isRevealed ? 'door-scratch__canvas--hidden' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label={`Scratch to reveal Day ${dayNumber} reward`}
        />
      </div>

      <button
        type="button"
        className="door-scratch__button"
        onClick={handleRevealNow}
        disabled={isRevealed}
      >
        {isRevealed ? 'Revealed!' : 'Reveal without scratching'}
      </button>
    </div>
  );
};
