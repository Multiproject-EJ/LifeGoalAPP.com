// Level Worlds Type System
// Defines all TypeScript types for the Level Worlds campaign mode system

export type WorldTheme = 'forest' | 'ocean' | 'cosmic' | 'desert' | 'mountain' | 'village';

export type NodeType = 
  | 'mini_game'      // Play a mini-game (Task Tower, Shooter Blitz, etc.)
  | 'habit'          // Complete habits
  | 'goal'           // Make goal progress
  | 'personality'    // Personality micro-test or reflection
  | 'journal'        // Journal entry or check-in
  | 'boss';          // Final node — harder/combined challenge

export type NodeStatus = 'locked' | 'active' | 'completed';

export type MiniGameType = 'task_tower' | 'shooter_blitz' | 'wheel_of_wins';

export interface WorldNode {
  id: string;
  index: number;              // 0-based position on the path
  type: NodeType;
  status: NodeStatus;
  label: string;
  description: string;
  emoji: string;
  // Position on the world map (percentage-based for responsive)
  position: { x: number; y: number };
  // Objective details
  objective: NodeObjective;
  // Rewards for completing this node
  nodeReward: NodeReward;
  completedAt?: string;
}

export type NodeObjective = 
  | { type: 'mini_game'; game: MiniGameType; }
  | { type: 'habit'; habitCount: number; specificHabitId?: string; }
  | { type: 'goal'; goalId?: string; milestoneName?: string; }
  | { type: 'personality'; testType: 'micro_test' | 'reflection'; }
  | { type: 'journal'; journalType: 'entry' | 'checkin' | 'intentions'; }
  | { type: 'boss'; challenges: NodeObjective[]; };

export interface NodeReward {
  /** @deprecated Hearts are retired — field kept for backward compat, always 0. */
  hearts?: number;
  dice?: number;
  /** @deprecated Coins retired from island game — field kept for backward compat, always 0. */
  coins?: number;
  gameTokens?: number;
  xp?: number;
  /** Essence earned (island run currency for stop upgrades). */
  essence?: number;
  /** Egg shards earned (sanctuary currency). */
  shards?: number;
}

export interface WorldBoard {
  id: string;
  level: number;                // 1-based
  theme: WorldTheme;
  title: string;                // e.g., "Whispering Woods", "Crystal Cove"
  description: string;
  nodes: WorldNode[];
  completionReward: BoardCompletionReward;
  status: 'locked' | 'active' | 'completed';
  completedAt?: string;
  createdAt: string;
}

export interface BoardCompletionReward {
  /** @deprecated Hearts are retired — field kept for backward compat, always 0. */
  hearts?: number;
  dice: number;
  /** @deprecated Coins retired from island game — field kept for backward compat, always 0. */
  coins?: number;
  gameTokens: number;
  xp: number;
  /** Essence earned (island run currency for stop upgrades). */
  essence?: number;
  /** Egg shards earned (sanctuary currency). */
  shards?: number;
  cosmetic?: string;           // Optional cosmetic unlock
  title?: string;              // Achievement title
}

export interface LevelWorldsState {
  userId: string;
  currentBoardLevel: number;
  boards: WorldBoard[];
  totalBoardsCompleted: number;
  lastPlayedAt?: string;
}
