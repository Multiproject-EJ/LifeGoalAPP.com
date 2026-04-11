// Level Worlds - Main exports

export { LevelWorldsHub } from './LevelWorldsHub';

// Components
export { WorldBoard } from './components/WorldBoard';
export { WorldNode } from './components/WorldNode';
export { WorldPath } from './components/WorldPath';
export { BoardCompleteOverlay } from './components/BoardCompleteOverlay';
export { NodeDetailSheet } from './components/NodeDetailSheet';

// Hooks
export { useLevelWorlds } from './hooks/useLevelWorlds';
export { useWorldProgress } from './hooks/useWorldProgress';
export { useNodeObjectives } from './hooks/useNodeObjectives';

// Services
export {
  loadState,
  saveState,
  initializeFirstBoard,
  getCurrentBoard,
  completeNode,
  completeBoard,
  isBoardComplete,
  resetState
} from './services/levelWorldsState';

export { generateBoard } from './services/levelWorldsGenerator';

export {
  getNodeReward,
  getBoardCompletionReward,
  awardNodeReward,
  awardBoardCompletionReward
} from './services/levelWorldsRewards';

// Types
export type {
  WorldTheme,
  NodeType,
  NodeStatus,
  MiniGameType,
  NodeObjective,
  NodeReward,
  BoardCompletionReward,
  LevelWorldsState
} from './types/levelWorlds';

// Avoid name collision with component exports
export type {
  WorldNode as WorldNodeType,
  WorldBoard as WorldBoardType
} from './types/levelWorlds';
