export type TileStatus = 'hidden' | 'breaking' | 'revealed-empty' | 'revealed-object' | 'revealed-blocker'

export type SpecialTileType = 'bomb-row' | 'bomb-col' | 'chain-row'

export interface Position {
  readonly row: number
  readonly col: number
}

export interface TileState {
  position: Position
  status: TileStatus
  objectId?: string
  isBlocker?: boolean
  specialType?: SpecialTileType
}

export interface HiddenObject {
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly color: string
  readonly pattern: ReadonlyArray<ReadonlyArray<0 | 1>>
}

export interface PlacedObject {
  readonly id: string
  readonly shapeId: string
  readonly position: Position
  readonly cells: ReadonlyArray<Position>
  revealedCells: Set<string>
  isCollected: boolean
}

export interface LevelConfig {
  readonly id: number
  readonly name: string
  readonly boardSize: 5 | 6 | 7
  readonly tools: number
  readonly objects: ReadonlyArray<{
    readonly shapeId: string
    readonly position: Position
  }>
  readonly blockers?: ReadonlyArray<Position>
  readonly specialTiles?: ReadonlyArray<{
    readonly position: Position
    readonly type: SpecialTileType
  }>
}

export interface Board {
  readonly size: number
  tiles: TileState[][]
  objects: Map<string, PlacedObject>
}

export interface GameState {
  currentLevel: number
  completedLevels: number[]
  totalScore: number
  highScores: Record<number, number>
}

export interface LevelState {
  board: Board
  toolsRemaining: number
  objectsCollected: number
  totalObjects: number
  isComplete: boolean
  isGameOver: boolean
  score: number
}

export interface LevelResult {
  readonly levelId: number
  readonly completed: boolean
  readonly toolsLeft: number
  readonly score: number
  readonly objectsFound: number
  readonly totalObjects: number
  readonly timestamp: number
}

export interface Reward {
  readonly type: 'coins' | 'unlock' | 'milestone'
  readonly amount?: number
  readonly unlockId?: string
  readonly message: string
}

export interface TreasureDigTheme {
  readonly colors?: {
    readonly tileHidden?: string
    readonly tileBreaking?: string
    readonly tileEmpty?: string
    readonly tileObject?: string
    readonly tileBlocker?: string
  }
  readonly icons?: {
    readonly tool?: string
  }
  readonly rewardTheme?: 'default' | 'coins' | 'gems' | 'stars' | string
  readonly islandTheme?: 'tropical' | 'desert' | 'forest' | 'arctic' | 'volcanic' | string
}

export interface TreasureDigCallbacks {
  readonly onLevelComplete?: (result: LevelResult) => void
  readonly onRewardEarned?: (reward: Reward) => void
  readonly onGameExit?: () => void
  readonly onProgressSync?: (state: GameState) => Promise<void>
  readonly onSpendTool?: (toolsRemaining: number) => void
  readonly onFinishLevel?: (levelId: number, success: boolean) => void
  readonly onExitFeature?: () => void
}

export interface WrapperProps {
  readonly playerToolCount?: number
  readonly currentLevel?: number
  readonly rewardTheme?: string
  readonly islandTheme?: string
}

export interface LayoutConfig {
  readonly compactMode?: boolean
  readonly showDefaultHUD?: boolean
  readonly showDefaultToolbar?: boolean
  readonly maxWidth?: string
  readonly maxHeight?: string
}

export interface TreasureDigFeatureProps {
  readonly initialLevel?: number
  readonly customLevels?: ReadonlyArray<LevelConfig>
  readonly theme?: TreasureDigTheme
  readonly callbacks?: TreasureDigCallbacks
  readonly mockMode?: boolean
  readonly wrapperProps?: WrapperProps
  readonly layoutConfig?: LayoutConfig
  readonly customHUD?: React.ReactNode
  readonly customToolbar?: React.ReactNode
}

export interface TreasureDigGameProps extends TreasureDigFeatureProps {}

export type Level = LevelConfig
export type Tile = TileState
