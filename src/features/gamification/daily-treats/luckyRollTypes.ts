export type TileType = 
  | 'neutral' 
  | 'gain_coins' 
  | 'lose_coins' 
  | 'bonus_dice' 
  | 'game_token' 
  | 'mystery' 
  | 'jackpot'
  | 'boost_step'
  | 'slow_zone'
  | 'finish';

export interface BoardTile {
  index: number;          // 0-based position
  type: TileType;
  label: string;          // display name
  emoji: string;          // tile icon
  effect?: {
    currency: 'gold' | 'dice' | 'game_tokens' | 'position';
    min: number;
    max: number;
  };
  zoneLabel?: string;     // life wheel zone name (for V1 integration G.1)
}

export interface LuckyRollState {
  currentPosition: number;
  availableDice: number;
  lastRoll: number;
  lastRollTimestamp: string;
  totalRolls: number;
  visitHistory: number[];
  tilesVisitedThisRun: number[];
  rollsToday: number;
  lastSessionDate: string;
  sessionComplete: boolean;
}
