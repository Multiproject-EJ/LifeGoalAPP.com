/** Wheel of Wins segment type */
export type WheelSegmentType = 'coins_small' | 'coins_medium' | 'coins_large' | 'coins_huge' | 'dice_single' | 'dice_double' | 'token' | 'jackpot';

/** A segment on the wheel */
export interface WheelSegment {
  id: number;
  type: WheelSegmentType;
  label: string;           // Display text (e.g., "+10 🪙")
  emoji: string;            // Emoji for the segment
  color: string;            // CSS color for the segment
  weight: number;           // Probability weight (0-100)
  rewards: {
    coins: number;
    dice: number;
    tokens: number;
  };
}

/** Wheel of Wins session state */
export interface WheelOfWinsSession {
  hasSpun: boolean;
  isSpinning: boolean;
  selectedSegment: WheelSegment | null;
  rewards: {
    coins: number;
    dice: number;
    tokens: number;
  };
}

/** Wheel segments with weights (must sum to 100) */
export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: 1,
    type: 'coins_small',
    label: '+10',
    emoji: '🪙',
    color: '#e879f9',
    weight: 25,
    rewards: { coins: 10, dice: 0, tokens: 0 },
  },
  {
    id: 2,
    type: 'coins_medium',
    label: '+25',
    emoji: '🪙',
    color: '#f0abfc',
    weight: 20,
    rewards: { coins: 25, dice: 0, tokens: 0 },
  },
  {
    id: 3,
    type: 'coins_large',
    label: '+50',
    emoji: '💰',
    color: '#d946ef',
    weight: 15,
    rewards: { coins: 50, dice: 0, tokens: 0 },
  },
  {
    id: 4,
    type: 'coins_huge',
    label: '+100',
    emoji: '💎',
    color: '#c026d3',
    weight: 8,
    rewards: { coins: 100, dice: 0, tokens: 0 },
  },
  {
    id: 5,
    type: 'dice_single',
    label: '+1',
    emoji: '🎲',
    color: '#a855f7',
    weight: 15,
    rewards: { coins: 0, dice: 1, tokens: 0 },
  },
  {
    id: 6,
    type: 'dice_double',
    label: '+2',
    emoji: '🎲',
    color: '#9333ea',
    weight: 7,
    rewards: { coins: 0, dice: 2, tokens: 0 },
  },
  {
    id: 7,
    type: 'token',
    label: '+1',
    emoji: '🎟️',
    color: '#7c3aed',
    weight: 8,
    rewards: { coins: 0, dice: 0, tokens: 1 },
  },
  {
    id: 8,
    type: 'jackpot',
    label: 'JACKPOT',
    emoji: '🏆',
    color: '#fbbf24',
    weight: 2,
    rewards: { coins: 200, dice: 3, tokens: 0 },
  },
];

/** Spin animation duration in milliseconds */
export const SPIN_DURATION = 3000;

/** Number of full rotations before landing */
export const MIN_ROTATIONS = 5;
export const MAX_ROTATIONS = 8;
