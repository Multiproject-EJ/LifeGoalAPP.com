import { useEffect, useState } from 'react';
import type { SpinPrize } from '../../types/gamification';
import { SPIN_PRIZES } from '../../types/gamification';

type Props = {
  spinning: boolean;
  result?: SpinPrize;
};

export function SpinWheel({ spinning, result }: Props) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (spinning && result) {
      // Calculate target rotation
      const prizeIndex = SPIN_PRIZES.findIndex(p => 
        p.type === result.type && p.value === result.value && p.label === result.label
      );
      
      const segmentAngle = 360 / SPIN_PRIZES.length;
      const targetAngle = prizeIndex >= 0 ? prizeIndex * segmentAngle : 0;
      
      // Add 5 full rotations + target angle for dramatic effect
      const finalRotation = 360 * 5 + targetAngle;
      
      setRotation(finalRotation);
    }
  }, [spinning, result]);

  return (
    <div className="spin-wheel">
      <div className="spin-wheel__pointer">▼</div>
      <div
        className={`spin-wheel__disc ${spinning ? 'spin-wheel__disc--spinning' : ''}`}
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {SPIN_PRIZES.map((prize, index) => {
          const angle = (360 / SPIN_PRIZES.length) * index;
          return (
            <div
              key={index}
              className="spin-wheel__segment"
              style={{
                transform: `rotate(${angle}deg)`,
              }}
            >
              <div className="spin-wheel__segment-content">
                <span className="spin-wheel__segment-icon">{prize.icon}</span>
                <span className="spin-wheel__segment-label">{prize.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
