interface Dice3DProps {
  value: number;
  isRolling: boolean;
  seed: number;
}

const getDiceFacePositions = (value: number) => {
  const positions: Record<number, Array<{ x: number; y: number }>> = {
    1: [{ x: 50, y: 50 }],
    2: [{ x: 30, y: 30 }, { x: 70, y: 70 }],
    3: [{ x: 30, y: 30 }, { x: 50, y: 50 }, { x: 70, y: 70 }],
    4: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
    5: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 50, y: 50 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
    6: [{ x: 30, y: 25 }, { x: 70, y: 25 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 75 }, { x: 70, y: 75 }],
  };
  return positions[value] || positions[1];
};

const getRotationForValue = (value: number): { rotateX: number; rotateY: number; rotateZ: number } => {
  const rotations: Record<number, { rotateX: number; rotateY: number; rotateZ: number }> = {
    1: { rotateX: 0, rotateY: 0, rotateZ: 0 },
    2: { rotateX: 0, rotateY: 90, rotateZ: 0 },
    3: { rotateX: 0, rotateY: 0, rotateZ: 90 },
    4: { rotateX: 0, rotateY: 0, rotateZ: -90 },
    5: { rotateX: -90, rotateY: 0, rotateZ: 0 },
    6: { rotateX: 180, rotateY: 0, rotateZ: 0 },
  };
  return rotations[value] || rotations[1];
};

export function Dice3D({ value, isRolling, seed }: Dice3DProps) {
  const finalRotation = getRotationForValue(value);
  const directionMultiplier = seed % 2 === 0 ? 1 : -1;

  const rotateX = isRolling ? (360 * 2 * directionMultiplier) + finalRotation.rotateX : finalRotation.rotateX;
  const rotateY = isRolling ? (360 * 2 * -directionMultiplier) + finalRotation.rotateY : finalRotation.rotateY;
  const rotateZ = isRolling ? (360 * directionMultiplier) + finalRotation.rotateZ : finalRotation.rotateZ;
  const scale = isRolling ? 1.05 : 1;

  return (
    <div
      className="relative w-10 h-10"
      style={{
        transformStyle: 'preserve-3d',
        perspective: '800px',
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
        transition: isRolling
          ? 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          : 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'translateZ(0)',
        }}
      >
        <DiceFace position="front" value={1} />
        <DiceFace position="back" value={6} />
        <DiceFace position="right" value={2} />
        <DiceFace position="left" value={5} />
        <DiceFace position="top" value={3} />
        <DiceFace position="bottom" value={4} />
      </div>
    </div>
  );
}

interface DiceFaceProps {
  position: 'front' | 'back' | 'right' | 'left' | 'top' | 'bottom';
  value: number;
}

function DiceFace({ position, value }: DiceFaceProps) {
  const transforms: Record<string, string> = {
    front: 'rotateY(0deg) translateZ(20px)',
    back: 'rotateY(180deg) translateZ(20px)',
    right: 'rotateY(90deg) translateZ(20px)',
    left: 'rotateY(-90deg) translateZ(20px)',
    top: 'rotateX(90deg) translateZ(20px)',
    bottom: 'rotateX(-90deg) translateZ(20px)',
  };

  return (
    <div
      className="absolute w-full h-full bg-gradient-to-br from-red-500 via-rose-600 to-red-700 rounded-lg shadow-[inset_0_2px_8px_rgba(255,255,255,0.4),inset_0_-2px_6px_rgba(0,0,0,0.3)] border border-red-400/40"
      style={{
        transform: transforms[position],
        backfaceVisibility: 'visible',
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 rounded-lg" />
      <div className="relative w-full h-full flex items-center justify-center">
        {getDiceFacePositions(value).map((pos, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.6)]"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%) translateZ(2px)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.6)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
