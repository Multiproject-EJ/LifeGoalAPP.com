import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { ScratchCardResult } from './scratchCard';

type ScratchCardRevealProps = {
  result: ScratchCardResult;
  onComplete?: () => void;
};

const SCRATCH_THRESHOLD = 18;
const SCRATCH_RADIUS = 18;

const drawScratchLayer = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#cbd5f5');
  gradient.addColorStop(0.5, '#d4e1f9');
  gradient.addColorStop(1, '#b3c7f5');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(canvas.width * 0.1, canvas.height * 0.2, canvas.width * 0.8, canvas.height * 0.6);
};

export const ScratchCardReveal = ({ result, onComplete }: ScratchCardRevealProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchCount, setScratchCount] = useState(0);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    setIsRevealed(false);
    setScratchCount(0);
  }, [result.day, result.cycle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card) return;

    const resizeCanvas = () => {
      canvas.width = card.clientWidth;
      canvas.height = card.clientHeight;
      drawScratchLayer(canvas);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [result.day, result.cycle]);

  useEffect(() => {
    if (scratchCount >= SCRATCH_THRESHOLD && !isRevealed) {
      setIsRevealed(true);
      onComplete?.();
    }
  }, [scratchCount, isRevealed, onComplete]);

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
    ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2, true);
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
    onComplete?.();
  };

  return (
    <div className="daily-treats-scratch">
      <div className="daily-treats-scratch__card" aria-live="polite" ref={cardRef}>
        <div className="daily-treats-scratch__content">
          <p className="daily-treats-scratch__eyebrow">Today&apos;s hatch</p>
          <div className="daily-treats-scratch__symbol" aria-hidden="true">
            {result.symbol.emoji}
          </div>
          <div className="daily-treats-scratch__numbers" aria-label="Scratch card numbers">
            {result.numbers.map((value, index) => (
              <span key={`scratch-number-${result.day}-${index}`} className="daily-treats-scratch__number">
                {value}
              </span>
            ))}
          </div>
          <div className="daily-treats-scratch__reward">
            {result.numberReward ? (
              <p>
                Number match unlocked: <strong>{result.numberReward}</strong>
              </p>
            ) : (
              <p>No number match today. Keep scratching!</p>
            )}
            {result.symbolReward ? (
              <p>
                Symbol streak complete: <strong>{result.symbolReward}</strong>
              </p>
            ) : (
              <p>
                Collect more {result.symbol.name} symbols to earn a streak bonus.
              </p>
            )}
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className={`daily-treats-scratch__canvas${isRevealed ? ' daily-treats-scratch__canvas--hidden' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label="Scratch card overlay"
        />
      </div>
      <button type="button" className="daily-treats-scratch__button" onClick={handleRevealNow}>
        {isRevealed ? 'Revealed' : 'Reveal without scratching'}
      </button>
    </div>
  );
};
