import { type CSSProperties } from 'react';
import './TrafficLightRewardExperience.css';

const BOX_AWAKEN_SRC = '/assets/traffic_light/reward-box/box-awaken.webp';
const BOX_OVERLOAD_SRC = '/assets/traffic_light/reward-box/box-overload.webp';
const BOX_OPEN_SRC = '/assets/traffic_light/reward-box/box-open.webp';
const BOX_LID_SRC = '/assets/traffic_light/reward-box/box-lid.webp';
const REWARD_DICE_SRC = '/assets/traffic_light/reward-box/reward-dice.webp';
const REWARD_TICKETS_SRC = '/assets/traffic_light/reward-box/reward-tickets.webp';

export const TRAFFIC_LIGHT_REWARD_IMAGE_SRCS = [
  BOX_AWAKEN_SRC,
  BOX_OVERLOAD_SRC,
  BOX_OPEN_SRC,
  BOX_LID_SRC,
  REWARD_DICE_SRC,
  REWARD_TICKETS_SRC,
] as const;

export type TrafficLightRewardBoxPhase = 'revealed' | 'opening' | 'opened';

export interface TrafficLightRewardPresentationItem {
  id: string;
  icon: string;
  imageSrc?: string;
  amount: number;
  label: string;
  rare?: boolean;
  title?: string;
}

interface TrafficLightRewardBoxProps {
  tapCount: number;
  phase: TrafficLightRewardBoxPhase;
  disabled?: boolean;
  onTap?: () => void;
  label: string;
}

interface AdaptiveRewardBurstProps {
  items: readonly TrafficLightRewardPresentationItem[];
}

function resolveRewardRows(count: number): number[] {
  if (count <= 3) return [count];
  if (count === 4) return [2, 2];
  if (count === 5) return [3, 2];
  if (count === 6) return [3, 3];
  if (count === 7) return [3, 3, 1];
  if (count === 8) return [3, 3, 2];
  if (count === 9) return [3, 3, 3];
  return [4, 4, 2];
}

function resolveRewardPosition(index: number, count: number): { left: number; top: number } {
  const rows = resolveRewardRows(count);
  let rowStartIndex = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const rowCount = rows[rowIndex];
    if (index < rowStartIndex + rowCount) {
      const columnIndex = index - rowStartIndex;
      const horizontalGap = rowCount === 1 ? 0 : rowCount === 2 ? 34 : rowCount === 3 ? 31 : 25;
      const left = 50 + (columnIndex - (rowCount - 1) / 2) * horizontalGap;
      const top = rows.length === 1
        ? 50
        : 12 + rowIndex * (76 / (rows.length - 1));
      return { left, top };
    }
    rowStartIndex += rowCount;
  }
  return { left: 50, top: 50 };
}

export function TrafficLightRewardBox({
  tapCount,
  phase,
  disabled = false,
  onTap,
  label,
}: TrafficLightRewardBoxProps) {
  const normalizedTapCount = Math.max(0, Math.min(3, Math.floor(tapCount)));
  const isOpen = phase === 'opening' || phase === 'opened';
  const baseSrc = isOpen
    ? BOX_OPEN_SRC
    : normalizedTapCount >= 2
      ? BOX_OVERLOAD_SRC
      : BOX_AWAKEN_SRC;

  return (
    <button
      type="button"
      className={`traffic-reward-box traffic-reward-box--tap-${normalizedTapCount} traffic-reward-box--${phase}`}
      onClick={onTap}
      disabled={disabled || phase !== 'revealed'}
      aria-label={phase === 'revealed'
        ? `Tap ${label}, ${normalizedTapCount} of 3 taps complete`
        : `${label} ${phase === 'opening' ? 'opening' : 'opened'}`}
    >
      <span className="traffic-reward-box__stage" aria-hidden="true">
        <span className="traffic-reward-box__radiance" />
        <img className="traffic-reward-box__base" src={baseSrc} alt="" loading="eager" decoding="async" />
        {phase === 'opening' && (
          <img className="traffic-reward-box__lid" src={BOX_LID_SRC} alt="" loading="eager" decoding="async" />
        )}
      </span>

      {phase === 'revealed' && (
        <span className="traffic-reward-box__hint">
          <strong>{normalizedTapCount === 0 ? 'Tap here' : 'Tap again'}</strong>
          <span className="traffic-reward-box__progress" aria-hidden="true">
            {[0, 1, 2].map((tapIndex) => (
              <i key={tapIndex} className={tapIndex < normalizedTapCount ? 'is-complete' : ''} />
            ))}
          </span>
        </span>
      )}
    </button>
  );
}

export function AdaptiveRewardBurst({ items }: AdaptiveRewardBurstProps) {
  const visibleItems = items.slice(0, 10);
  const count = visibleItems.length;
  const density = count <= 2 ? 'hero' : count <= 6 ? 'standard' : 'compact';

  return (
    <div
      className={`adaptive-reward-burst adaptive-reward-burst--${density}`}
      data-reward-count={count}
      aria-label={`${count} reward${count === 1 ? '' : 's'}`}
    >
      {visibleItems.map((item, index) => {
        const position = resolveRewardPosition(index, count);
        return (
          <div
            key={item.id}
            className={`adaptive-reward-burst__item${item.rare ? ' adaptive-reward-burst__item--rare' : ''}`}
            style={{
              '--reward-index': index,
              '--reward-left': `${position.left}%`,
              '--reward-top': `${position.top}%`,
            } as CSSProperties}
            title={item.title}
          >
            <span className="adaptive-reward-burst__icon" aria-hidden="true">
              {item.imageSrc ? <img src={item.imageSrc} alt="" loading="eager" decoding="async" /> : item.icon}
            </span>
            <strong className="adaptive-reward-burst__amount">{item.amount.toLocaleString()}</strong>
            <span className="adaptive-reward-burst__label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
