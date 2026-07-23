import { type CSSProperties, useEffect, useRef, useState } from 'react';

// ─── 3D Dice – CSS-transform based cubes ──────────────────────────────────────
// Renders two 3D dice that tumble and settle to their final face values.
// Uses pure CSS 3D transforms (transform-style: preserve-3d) — no WebGL needed.

export interface BoardDice3DProps {
  /** Final face value for die 1 (1-6) */
  value1: number;
  /** Final face value for die 2 (1-6) */
  value2: number;
  /** Whether the dice are currently rolling */
  isRolling: boolean;
  /** Optional explicit positioning style from the board stage */
  style?: CSSProperties;
  /** Called when the roll animation finishes */
  onRollComplete?: () => void;
}

// Rotation needed to show each face value (rotateX, rotateY)
const FACE_ROTATIONS: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  2: { rx: 0, ry: -90 },
  3: { rx: -90, ry: 0 },
  4: { rx: 90, ry: 0 },
  5: { rx: 0, ry: 90 },
  6: { rx: 180, ry: 0 },
};

const ROLL_DURATION_MS = 900;

function Die({ value, isRolling, delay }: { value: number; isRolling: boolean; delay: number }) {
  const safeValue = Math.max(1, Math.min(6, Math.round(value)));
  const [settled, setSettled] = useState(true);

  useEffect(() => {
    if (!isRolling) {
      setSettled(true);
      return undefined;
    }

    setSettled(false);
    const timeout = setTimeout(() => setSettled(true), ROLL_DURATION_MS + delay);
    return () => clearTimeout(timeout);
  }, [isRolling, delay]);

  const face = FACE_ROTATIONS[safeValue] ?? FACE_ROTATIONS[1];
  const isTumbling = isRolling && !settled;

  return (
    <div
      className={`board-dice-3d__die-wrapper ${isTumbling ? 'board-dice-3d__die-wrapper--rolling' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`board-dice-3d__die ${isTumbling ? 'board-dice-3d__die--tumbling' : 'board-dice-3d__die--settled'}`}
        style={{
          transform: isTumbling ? undefined : `rotateX(${face.rx}deg) rotateY(${face.ry}deg)`,
          animationDelay: isTumbling ? `${delay}ms` : undefined,
        }}
      >
        {/* Face 1 - front */}
        <div className="board-dice-3d__face board-dice-3d__face--1">
          <span className="board-dice-3d__dot board-dice-3d__dot--center" />
        </div>
        {/* Face 2 - right */}
        <div className="board-dice-3d__face board-dice-3d__face--2">
          <span className="board-dice-3d__dot board-dice-3d__dot--top-right" />
          <span className="board-dice-3d__dot board-dice-3d__dot--bottom-left" />
        </div>
        {/* Face 3 - top */}
        <div className="board-dice-3d__face board-dice-3d__face--3">
          <span className="board-dice-3d__dot board-dice-3d__dot--top-right" />
          <span className="board-dice-3d__dot board-dice-3d__dot--center" />
          <span className="board-dice-3d__dot board-dice-3d__dot--bottom-left" />
        </div>
        {/* Face 4 - bottom */}
        <div className="board-dice-3d__face board-dice-3d__face--4">
          <span className="board-dice-3d__dot board-dice-3d__dot--top-left" />
          <span className="board-dice-3d__dot board-dice-3d__dot--top-right" />
          <span className="board-dice-3d__dot board-dice-3d__dot--bottom-left" />
          <span className="board-dice-3d__dot board-dice-3d__dot--bottom-right" />
        </div>
        {/* Face 5 - left */}
        <div className="board-dice-3d__face board-dice-3d__face--5">
          <span className="board-dice-3d__dot board-dice-3d__dot--top-left" />
          <span className="board-dice-3d__dot board-dice-3d__dot--top-right" />
          <span className="board-dice-3d__dot board-dice-3d__dot--center" />
          <span className="board-dice-3d__dot board-dice-3d__dot--bottom-left" />
          <span className="board-dice-3d__dot board-dice-3d__dot--bottom-right" />
        </div>
        {/* Face 6 - back */}
        <div className="board-dice-3d__face board-dice-3d__face--6">
          <span className="board-dice-3d__dot board-dice-3d__dot--top-left" />
          <span className="board-dice-3d__dot board-dice-3d__dot--top-right" />
          <span className="board-dice-3d__dot board-dice-3d__dot--mid-left" />
          <span className="board-dice-3d__dot board-dice-3d__dot--mid-right" />
          <span className="board-dice-3d__dot board-dice-3d__dot--bottom-left" />
          <span className="board-dice-3d__dot board-dice-3d__dot--bottom-right" />
        </div>
      </div>
    </div>
  );
}

export function BoardDice3D({ value1, value2, isRolling, style, onRollComplete }: BoardDice3DProps) {
  const hasCalledCompleteRef = useRef(false);
  // Keep a stable ref to the latest callback so the timer effect only depends on
  // `isRolling`. Without this, any parent re-render (e.g. the 1-second clock tick)
  // creates a new inline arrow function, changing `onRollComplete`'s identity and
  // cancelling/restarting the timer — meaning it could reset indefinitely and never fire.
  const onRollCompleteRef = useRef(onRollComplete);
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  });

  useEffect(() => {
    if (!isRolling) {
      hasCalledCompleteRef.current = false;
      return;
    }

    hasCalledCompleteRef.current = false;
    const timer = setTimeout(() => {
      if (!hasCalledCompleteRef.current) {
        hasCalledCompleteRef.current = true;
        onRollCompleteRef.current?.();
      }
    }, ROLL_DURATION_MS + 200); // die2 delay(100) + settle

    return () => clearTimeout(timer);
  }, [isRolling]);

  return (
    <div
      className={`board-dice-3d ${isRolling ? 'board-dice-3d--rolling' : 'board-dice-3d--idle'}`}
      style={style}
      aria-label={`Dice: ${value1} and ${value2}`}
    >
      <Die value={value1} isRolling={isRolling} delay={0} />
      <Die value={value2} isRolling={isRolling} delay={100} />
    </div>
  );
}
