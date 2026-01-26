import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { SpinPrize } from '../../types/gamification';
import { SPIN_PRIZES } from '../../types/gamification';
import { buildWheelSegments } from './spinWheelUtils';

type Props = {
  spinning: boolean;
  result?: SpinPrize;
};

export function SpinWheel({ spinning, result }: Props) {
  const [rotation, setRotation] = useState(0);
  const wheelSegments = useMemo(() => buildWheelSegments(SPIN_PRIZES), []);

  useEffect(() => {
    if (spinning && result) {
      // Calculate target rotation
      const targetSegment = wheelSegments.find(
        (prize) =>
          prize.type === result.type && prize.value === result.value && prize.label === result.label,
      );
      const targetAngle = targetSegment ? targetSegment.centerAngle : 0;
      
      // Add 5 full rotations + target angle for dramatic effect
      const finalRotation = 360 * 5 + targetAngle;
      
      setRotation(finalRotation);
    }
  }, [spinning, result, wheelSegments]);

  return (
    <div className="spin-wheel">
      <div className="spin-wheel__pointer">▼</div>
      <div
        className={`spin-wheel__disc ${spinning ? 'spin-wheel__disc--spinning' : ''}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          background: `conic-gradient(${wheelSegments
            .map(
              (prize) => `${prize.color} ${prize.startAngle}deg ${prize.endAngle}deg`,
            )
            .join(', ')})`,
        }}
      >
        {wheelSegments.map((prize) => {
          const angle = prize.centerAngle;
          return (
            <div
              key={`${prize.type}-${prize.value}-${prize.label}`}
              className={`spin-wheel__label spin-wheel__label--${prize.wheelSize}${
                prize.type === 'treasure_chest' ? ' spin-wheel__label--chest' : ''
              }`}
              style={{ '--label-angle': `${angle}deg` } as CSSProperties}
            >
              <div className="spin-wheel__label-content">
                <span className="spin-wheel__label-icon">{prize.icon}</span>
                <span className="spin-wheel__label-text">{prize.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
