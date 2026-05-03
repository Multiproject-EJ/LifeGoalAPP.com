export type TileRenderState = 'hidden' | 'damaged' | 'revealedEmpty' | 'revealedTreasure' | 'revealedBlocker'

export type TileStatus = 'hidden' | 'breaking' | 'cracked' | 'revealed-empty' | 'revealed-object' | 'revealed-blocker'

export type TileType = 'normal' | 'hard' | 'blocker' | 'bomb-row' | 'bomb-col' | 'reveal' | 'bonus' | 'chain-row'

export interface Position {
  readonly row: number
  readonly col: number
}

export interface Tile {
  position: Position
  status: TileStatus
  renderState: TileRenderState
  type: TileType
  hp?: number
  maxHp?: number
  objectId?: string
  isBlocker?: boolean
  spritePosition?: { row: number; col: number }
  objectColor?: string
}

export interface SpriteSection {
  row: number
  col: number
  imageSection: string
}

export interface HiddenObject {
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly color: string
  readonly pattern: ReadonlyArray<ReadonlyArray<0 | 1>>
  readonly spriteMap?: Map<string, string>
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
  readonly boardSize: 4 | 5 | 6 | 7 | 8
  readonly tools: number
  readonly objects: ReadonlyArray<{
    readonly shapeId: string
    readonly position: Position
  }>
  readonly blockers?: ReadonlyArray<Position>
  readonly hardTiles?: ReadonlyArray<{ position: Position; hp: number }>
  readonly bombTiles?: ReadonlyArray<{ position: Position; direction: 'row' | 'col' }>
  readonly revealTiles?: ReadonlyArray<Position>
  readonly bonusTiles?: ReadonlyArray<Position>
  readonly chainRowTiles?: ReadonlyArray<Position>
}

export interface Board {
  readonly size: number
  tiles: Tile[][]
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
  readonly milestoneId?: string
}

export interface TreasureDigTheme {
  primaryColor?: string
  accentColor?: string
  islandTheme?: string
  rewardTheme?: string
}

export interface TreasureDigCallbacks {
  onSpendTool?: () => void
  onFinishLevel?: (result: LevelResult) => void
  onExitFeature?: () => void
  onRewardEarned?: (reward: Reward) => void
}

export interface WrapperProps {
  playerToolCount?: number
  currentLevel?: number
  rewardTheme?: string
  islandTheme?: string
}

export interface LayoutConfig {
  compactMode?: boolean
  showDefaultHUD?: boolean
  showDefaultToolbar?: boolean
  maxWidth?: string
  maxHeight?: string
}

export interface TreasureDigGameProps {
  callbacks?: TreasureDigCallbacks
  initialLevel?: number
  customLevels?: LevelConfig[]
  wrapperProps?: WrapperProps
  layoutConfig?: LayoutConfig
  customHUD?: React.ComponentType<HUDProps>
  customToolbar?: React.ComponentType<ToolbarProps>
}

export interface HUDProps {
  levelNumber: number
  levelName: string
  toolsRemaining: number
  objectsCollected: number
  totalObjects: number
  score: number
  objects?: Map<string, PlacedObject>
  onExit?: () => void
  compactMode?: boolean
}

export interface ToolbarProps {
  toolsRemaining: number
  onRestart?: () => void
  compactMode?: boolean
}
