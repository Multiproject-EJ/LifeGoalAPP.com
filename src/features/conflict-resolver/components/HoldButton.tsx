import { useMemo, useRef, useState } from 'react';

type HoldButtonProps = {
  label: string;
  durationMs?: number;
  onComplete: () => void;
  disabled?: boolean;
};

export function HoldButton({ label, durationMs = 1800, onComplete, disabled = false }: HoldButtonProps) {
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const [progress, setProgress] = useState(0);

  const progressPercent = useMemo(() => Math.round(progress * 100), [progress]);

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
    const elapsed = performance.now() - startRef.current;
    const next = Math.min(1, elapsed / durationMs);
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

  const handlePointerDown = () => {
    if (disabled) return;
    startRef.current = performance.now();
    frameRef.current = window.requestAnimationFrame(tick);
  };

  const handlePointerUp = () => {
    if (progress < 1) {
      cancel();
    }
  };

  return (
    <button
      type="button"
      className="conflict-resolver__hold-button"
      aria-label={`${label}. Hold to continue.`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancel}
      onPointerLeave={handlePointerUp}
      disabled={disabled}
    >
      <span className="conflict-resolver__hold-button-progress" style={{ width: `${progressPercent}%` }} />
      <span className="conflict-resolver__hold-button-text">{label}</span>
    </button>
  );
}
