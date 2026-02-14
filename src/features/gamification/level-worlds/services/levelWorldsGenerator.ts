// Level Worlds Board Generator Service
// Procedurally generates boards based on level, theme rotation, and node layout

import type { WorldBoard, WorldNode, NodeType, WorldTheme, MiniGameType } from '../types/levelWorlds';
import { getNodeReward, getBoardCompletionReward } from './levelWorldsRewards';

const THEMES: WorldTheme[] = ['forest', 'ocean', 'cosmic', 'desert', 'mountain', 'village'];

const THEME_TITLES: Record<WorldTheme, string[]> = {
  forest: ['Whispering Woods', 'Emerald Grove', 'Ancient Forest', 'Verdant Vale'],
  ocean: ['Crystal Cove', 'Azure Bay', 'Coral Reef', 'Tidal Haven'],
  cosmic: ['Starlight Sanctuary', 'Nebula Heights', 'Celestial Gardens', 'Astral Plains'],
  desert: ['Golden Dunes', 'Oasis Springs', 'Sandstone Valley', 'Mirage Mesa'],
  mountain: ['Summit Peak', 'Alpine Meadows', 'Snowy Crags', 'Cloud Ridge'],
  village: ['Harmony Village', 'Artisan Quarter', 'Market Square', 'Garden Commons']
};

const THEME_DESCRIPTIONS: Record<WorldTheme, string> = {
  forest: 'A lush green world filled with ancient trees and hidden paths.',
  ocean: 'A serene coastal realm where waves meet adventure.',
  cosmic: 'A mystical space where stars guide your journey.',
  desert: 'A sunlit expanse of golden sands and hidden treasures.',
  mountain: 'A majestic highland where peaks touch the sky.',
  village: 'A warm community space where connections thrive.'
};

/**
 * Generate a board for the given level
 */
export function generateBoard(level: number, userId: string): WorldBoard {
  const theme = getThemeForLevel(level);
  const nodeCount = getNodeCountForLevel(level);
  const nodes = generateNodes(level, nodeCount, userId);
  
  const board: WorldBoard = {
    id: `board_${level}_${Date.now()}`,
    level,
    theme,
    title: getThemeTitle(theme, level),
    description: THEME_DESCRIPTIONS[theme],
    nodes,
    completionReward: getBoardCompletionReward(level),
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  return board;
}

/**
 * Get theme for level (rotates through themes)
 */
function getThemeForLevel(level: number): WorldTheme {
  const index = (level - 1) % THEMES.length;
  return THEMES[index];
}

/**
 * Get a themed title for the board
 */
function getThemeTitle(theme: WorldTheme, level: number): string {
  const titles = THEME_TITLES[theme];
  const index = Math.floor((level - 1) / THEMES.length) % titles.length;
  return titles[index];
}

/**
 * Determine number of nodes based on level
 * Level 1-3: 3 nodes (Tutorial)
 * Level 4-7: 4 nodes (Early game)
 * Level 8-15: 5 nodes (Mid game)
 * Level 16+: 5-6 nodes (Late game)
 */
function getNodeCountForLevel(level: number): number {
  if (level <= 3) return 3;
  if (level <= 7) return 4;
  if (level <= 15) return 5;
  return level % 2 === 0 ? 6 : 5; // Alternate 5-6 for variety
}

/**
 * Generate nodes for a board
 */
function generateNodes(level: number, count: number, userId: string): WorldNode[] {
  const nodes: WorldNode[] = [];
  const nodeTypes = selectNodeTypes(level, count);
  const positions = generateNodePositions(count);
  
  for (let i = 0; i < count; i++) {
    const nodeType = nodeTypes[i];
    const node: WorldNode = {
      id: `node_${level}_${i}_${Date.now()}`,
      index: i,
      type: nodeType,
      status: i === 0 ? 'active' : 'locked', // First node is active
      label: getNodeLabel(nodeType, i, count),
      description: getNodeDescription(nodeType, i, count),
      emoji: getNodeEmoji(nodeType, i, count),
      position: positions[i],
      objective: generateObjective(nodeType, level, i, count),
      nodeReward: getNodeReward(level)
    };
    nodes.push(node);
  }
  
  return nodes;
}

/**
 * Select node types for a board based on level
 */
function selectNodeTypes(level: number, count: number): NodeType[] {
  const types: NodeType[] = [];
  const lastIndex = count - 1;
  
  // Tutorial levels (1-3): Simple progression
  if (level <= 3) {
    types.push('habit');
    types.push('mini_game');
    if (count > 2) types.push('journal');
    return types;
  }
  
  // Early game (4-7): Introduce variety
  if (level <= 7) {
    types.push('habit');
    types.push('mini_game');
    types.push('goal');
    if (count > 3) types.push('journal');
    return types;
  }
  
  // Mid game (8-15): Mix of all types
  if (level <= 15) {
    types.push('habit');
    types.push('mini_game');
    types.push('goal');
    types.push('journal');
    if (count > 4) types.push('personality');
    return types;
  }
  
  // Late game (16+): Boss at the end
  types.push('habit');
  types.push('mini_game');
  types.push('goal');
  types.push('personality');
  if (count > 4) types.push('journal');
  if (count > 5) types.push('habit');
  
  // Last node is boss
  types[lastIndex] = 'boss';
  
  return types;
}

/**
 * Generate positions for nodes (percentage-based winding path)
 */
function generateNodePositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  
  // Create a winding path from top to bottom
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    
    // Y progresses from top (20%) to bottom (80%)
    const y = 20 + progress * 60;
    
    // X winds left and right
    // Even indices go right, odd go left
    let x: number;
    if (i === 0) {
      x = 50; // Start centered
    } else if (i % 2 === 1) {
      x = 25 + (Math.random() * 10 - 5); // Left side with variation
    } else {
      x = 75 + (Math.random() * 10 - 5); // Right side with variation
    }
    
    positions.push({ x, y });
  }
  
  return positions;
}

/**
 * Get node label based on type
 */
function getNodeLabel(type: NodeType, index: number, totalNodes: number): string {
  const isLast = index === totalNodes - 1;
  
  switch (type) {
    case 'mini_game':
      return 'Mini-Game Challenge';
    case 'habit':
      return 'Habit Quest';
    case 'goal':
      return 'Goal Progress';
    case 'personality':
      return 'Self Reflection';
    case 'journal':
      return 'Journal Entry';
    case 'boss':
      return 'Boss Challenge';
    default:
      return `Node ${index + 1}`;
  }
}

/**
 * Get node description based on type
 */
function getNodeDescription(type: NodeType, index: number, totalNodes: number): string {
  const isLast = index === totalNodes - 1;
  
  switch (type) {
    case 'mini_game':
      return 'Complete a mini-game to progress';
    case 'habit':
      return 'Complete your daily habits';
    case 'goal':
      return 'Make progress on your goals';
    case 'personality':
      return 'Complete a personality reflection';
    case 'journal':
      return 'Write a journal entry';
    case 'boss':
      return 'Complete the final challenge!';
    default:
      return 'Complete this objective to continue';
  }
}

/**
 * Get node emoji based on type
 */
function getNodeEmoji(type: NodeType, index: number, totalNodes: number): string {
  const isLast = index === totalNodes - 1;
  
  switch (type) {
    case 'mini_game':
      return '🎮';
    case 'habit':
      return '✅';
    case 'goal':
      return '🎯';
    case 'personality':
      return '🧠';
    case 'journal':
      return '📝';
    case 'boss':
      return '🏆';
    default:
      return '⭐';
  }
}

/**
 * Generate objective details for a node
 */
function generateObjective(type: NodeType, level: number, index: number, totalNodes: number): any {
  switch (type) {
    case 'mini_game': {
      // Rotate through mini-games
      const games: MiniGameType[] = ['task_tower', 'pomodoro_sprint', 'vision_quest', 'wheel_of_wins'];
      const gameIndex = (level + index) % games.length;
      return { type: 'mini_game', game: games[gameIndex] };
    }
    
    case 'habit': {
      // Scale habit count with level
      const habitCount = level <= 3 ? 1 : level <= 7 ? 2 : 3;
      return { type: 'habit', habitCount };
    }
    
    case 'goal': {
      return { type: 'goal' }; // Will map to user's actual goals
    }
    
    case 'personality': {
      const testType = index % 2 === 0 ? 'micro_test' : 'reflection';
      return { type: 'personality', testType };
    }
    
    case 'journal': {
      const journalTypes = ['entry', 'checkin', 'intentions'] as const;
      const journalType = journalTypes[index % journalTypes.length];
      return { type: 'journal', journalType };
    }
    
    case 'boss': {
      // Boss combines multiple objectives
      return {
        type: 'boss',
        challenges: [
          { type: 'habit', habitCount: 3 },
          { type: 'mini_game', game: 'task_tower' as MiniGameType }
        ]
      };
    }
    
    default:
      return { type: 'habit', habitCount: 1 };
  }
}
