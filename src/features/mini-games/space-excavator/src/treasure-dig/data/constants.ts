import type { TileStatus } from '../types/game.types'

export const GAME_CONSTANTS = {
  ANIMATION_DURATION: {
    TILE_BREAK: 200,
    TILE_REVEAL: 300,
    OBJECT_COLLECT: 400,
    LEVEL_COMPLETE: 600,
    POPUP_SLIDE: 300,
  },
  
  MILESTONES: [5, 10, 15, 20, 25] as number[],
  
  SCORING: {
    PER_OBJECT: 100,
    TOOL_BONUS: 10,
    LEVEL_COMPLETE_BONUS: 50,
  },
  
  STORAGE_KEYS: {
    GAME_STATE: 'treasure-dig-state',
  },
  
  MIN_TILE_SIZE: 48,
  GRID_GAP: {
    SMALL: 8,
    MEDIUM: 6,
  },
} as const

export const TILE_COLORS: Record<TileStatus, string> = {
  hidden: 'bg-gradient-to-br from-stone-400 to-stone-500',
  breaking: 'bg-gradient-to-br from-amber-300 to-amber-400',
  'revealed-empty': 'bg-gradient-to-br from-amber-50 to-stone-100',
  'revealed-object': 'bg-gradient-to-br from-amber-200 to-yellow-300',
  'revealed-blocker': 'bg-gradient-to-br from-red-300 to-red-400',
}

export const OBJECT_COLORS = {
  gold: 'text-yellow-500',
  silver: 'text-gray-400',
  bronze: 'text-orange-600',
  diamond: 'text-cyan-400',
  ruby: 'text-red-500',
} as const
