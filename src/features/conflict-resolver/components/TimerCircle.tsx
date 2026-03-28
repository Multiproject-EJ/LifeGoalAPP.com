type TimerCircleProps = {
  totalSeconds: number;
  remainingSeconds: number;
};

export function TimerCircle({ totalSeconds, remainingSeconds }: TimerCircleProps) {
  const safeTotal = Math.max(totalSeconds, 1);
  const progress = Math.min(Math.max((safeTotal - remainingSeconds) / safeTotal, 0), 1);
  const degrees = progress * 360;

  return (
    <div
      className="conflict-resolver__timer-circle"
      style={{ background: `conic-gradient(rgba(176,198,255,0.95) ${degrees}deg, rgba(255,255,255,0.16) 0deg)` }}
      aria-live="polite"
      aria-label={`${remainingSeconds} seconds remaining`}
    >
      <div className="conflict-resolver__timer-inner">{remainingSeconds}s</div>
    </div>
  );
}
