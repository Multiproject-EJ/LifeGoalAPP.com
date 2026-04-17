import { useEffect, useRef, useState } from 'react';

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
  /** Screen-space position to render the dice at (centered) */
  x?: number;
  y?: number;
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
  const [tumbleRotation, setTumbleRotation] = useState({ rx: 0, ry: 0, rz: 0 });
  const [settled, setSettled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isRolling) {
      setSettled(false);
      // Start tumbling with random rotations
      intervalRef.current = setInterval(() => {
        setTumbleRotation({
          rx: Math.floor(Math.random() * 4) * 90,
          ry: Math.floor(Math.random() * 4) * 90,
          rz: Math.floor(Math.random() * 4) * 90,
        });
      }, 100);

      // Settle to final face after roll duration
      timeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        const face = FACE_ROTATIONS[value] ?? FACE_ROTATIONS[1];
        setTumbleRotation({ rx: face.rx, ry: face.ry, rz: 0 });
        setSettled(true);
      }, ROLL_DURATION_MS + delay);
    } else {
      // Not rolling — show final face immediately
      clearInterval(intervalRef.current);
      const face = FACE_ROTATIONS[value] ?? FACE_ROTATIONS[1];
      setTumbleRotation({ rx: face.rx, ry: face.ry, rz: 0 });
      setSettled(true);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, [isRolling, value, delay]);

  const transitionDuration = isRolling && !settled ? '0.1s' : '0.35s';
  const transitionTimingFunction = settled ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out';

  return (
    <div
      className="board-dice-3d__die-wrapper"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`board-dice-3d__die ${isRolling && !settled ? 'board-dice-3d__die--tumbling' : ''} ${settled ? 'board-dice-3d__die--settled' : ''}`}
        style={{
          transform: `rotateX(${tumbleRotation.rx}deg) rotateY(${tumbleRotation.ry}deg) rotateZ(${tumbleRotation.rz}deg)`,
          transition: `transform ${transitionDuration} ${transitionTimingFunction}`,
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

export function BoardDice3D({ value1, value2, isRolling, x, y, onRollComplete }: BoardDice3DProps) {
  const hasCalledCompleteRef = useRef(false);

  useEffect(() => {
    if (!isRolling) {
      hasCalledCompleteRef.current = false;
      return;
    }

    hasCalledCompleteRef.current = false;
    const timer = setTimeout(() => {
      if (!hasCalledCompleteRef.current) {
        hasCalledCompleteRef.current = true;
        onRollComplete?.();
      }
    }, ROLL_DURATION_MS + 200); // die2 delay(100) + settle

    return () => clearTimeout(timer);
  }, [isRolling, onRollComplete]);

  const posStyle: React.CSSProperties = {};
  if (typeof x === 'number' && typeof y === 'number') {
    posStyle.left = x;
    posStyle.top = y;
    posStyle.position = 'absolute';
    posStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div
      className={`board-dice-3d ${isRolling ? 'board-dice-3d--rolling' : 'board-dice-3d--idle'}`}
      style={posStyle}
      aria-label={`Dice: ${value1} and ${value2}`}
    >
      <Die value={value1} isRolling={isRolling} delay={0} />
      <Die value={value2} isRolling={isRolling} delay={100} />
    </div>
  );
}
