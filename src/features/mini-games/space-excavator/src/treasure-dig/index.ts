export { TreasureDigGame } from './components/TreasureDigGame'

export type {
  TileStatus,
  TileState,
  Position,
  HiddenObject,
  PlacedObject,
  LevelConfig,
  Board,
  GameState,
  LevelState,
  LevelResult,
  Reward,
  TreasureDigTheme,
  TreasureDigCallbacks,
  TreasureDigFeatureProps,
  WrapperProps,
  LayoutConfig,
  Level,
  Tile,
} from './types/game.types'

export { levels, getLevel } from './data/levels'
export { objectShapes, getObjectShape } from './data/objects'
export { GAME_CONSTANTS, TILE_COLORS, OBJECT_COLORS } from './data/constants'
export { createMockAdapter } from './adapters/backend'
export type { BackendAdapter } from './adapters/backend'

export { TreasureDigGame as TreasureDigFeature } from './components/TreasureDigGame'
