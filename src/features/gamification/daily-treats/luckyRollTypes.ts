export type TileType = 
  | 'neutral' 
  | 'gain_coins' 
  | 'lose_coins' 
  | 'bonus_dice' 
  | 'game_token' 
  | 'mini_game' 
  | 'mystery' 
  | 'jackpot';

export interface BoardTile {
  index: number;          // 0-based position
  type: TileType;
  label: string;          // display name
  emoji: string;          // tile icon
  effect?: {
    currency: 'gold' | 'dice' | 'game_tokens';
    min: number;
    max: number;
  };
  miniGame?: 'task_tower' | 'pomodoro_sprint' | 'vision_quest' | 'wheel_of_wins';
  zoneLabel?: string;     // life wheel zone name (for V1 integration G.1)
}

export interface LuckyRollState {
  currentPosition: number;
  currentLap: number;
  availableDice: number;
  lastRoll: number;
  lastRollTimestamp: string;
  totalRolls: number;
  visitHistory: number[];
  tilesVisitedThisLap: number[];
  rollsToday: number;
  lastSessionDate: string;
}
