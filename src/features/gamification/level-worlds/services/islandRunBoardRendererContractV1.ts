import type { IslandRunContractV2StopStatus, IslandRunContractV2StopType } from './islandRunContractV2StopResolver';

export const BOARD_RENDERER_CONTRACT_V1_VERSION = 'v1' as const;

export type BoardRendererContractV1StopId =
  | 'hatchery'
  | 'minigame'
  | 'market'
  | 'utility'
  | 'dynamic'
  | 'boss';

export type BoardRendererContractV1Intent =
  | { type: 'roll_requested' }
  | { type: 'claim_reward_requested' }
  | { type: 'spend_essence_requested'; amount: number }
  | { type: 'open_active_stop_requested' }
  | { type: 'tile_tapped'; tileId: string }
  | { type: 'stop_tapped'; stopId: BoardRendererContractV1StopId };

export interface BoardRendererContractV1Callbacks {
  onIntent: (intent: BoardRendererContractV1Intent) => void;
}

export interface BoardRendererContractV1 {
  meta: {
    contractVersion: typeof BOARD_RENDERER_CONTRACT_V1_VERSION;
    boardProfileId: string;
    seed?: number;
    timestampMs: number;
  };
  board: {
    tileCount: number;
    tiles: Array<{
      id: string;
      index: number;
      type: string;
      state: 'default' | 'active_stop' | 'completed_stop' | 'locked_stop';
      tags?: string[];
    }>;
    paths: Array<{
      fromTileId: string;
      toTileId: string;
      style: 'default';
    }>;
    cameraAnchors?: Array<{ key: string; tileIndex: number }>;
  };
  token: {
    currentTileIndex: number;
    isMoving: boolean;
    movementPreview?: {
      pathTileIndices: number[];
      mode: 'dice';
    };
    lastMoveResult?: {
      rolled: number;
      startTileIndex: number;
      endTileIndex: number;
    };
  };
  stops: {
    activeStop: {
      id: BoardRendererContractV1StopId;
      index: number;
      type: IslandRunContractV2StopType;
      status: IslandRunContractV2StopStatus;
      isOpenable: boolean;
      isBuildable: boolean;
    };
    buildProgress: {
      current: number;
      required: number;
      percent: number;
    };
    stopList: Array<{
      id: BoardRendererContractV1StopId;
      index: number;
      type: IslandRunContractV2StopType;
      status: IslandRunContractV2StopStatus;
      progress: {
        objectiveComplete: boolean;
        buildComplete: boolean;
        spentEssence: number;
        requiredEssence: number;
      };
    }>;
  };
  resources: {
    essence: {
      current: number;
      spendable: number;
      deltaPreview?: number;
    };
    dicePool: number;
    hearts: number;
    coins: number;
    spinTokens: number;
  };
  /** Last roll outcome — populated after every dice roll; absent until first roll. */
  lastRolled?: {
    total: number;
    dice: number[];
  };
  rewardBar: {
    eventId: string | null;
    progress: number;
    nextThreshold: number;
    tier: number;
    isClaimable: boolean;
    pendingClaimCount: number;
  };
  event: {
    active: boolean;
    label: string;
    endsAtMs: number | null;
    remainingMs: number;
    themeKey: string;
  };
  ui: {
    flags: {
      canRoll: boolean;
      canClaimReward: boolean;
      canSpendEssence: boolean;
      canOpenStop: boolean;
    };
    busy: {
      roll: boolean;
      claim: boolean;
      spend: boolean;
      openStop: boolean;
    };
    errors: Array<{
      code: string;
      message: string;
      scope: 'roll' | 'claim' | 'spend' | 'open_stop' | 'global';
    }>;
  };
  cosmetics: {
    themeKey: string;
    stickerFragments: number;
    stickerInventory: Record<string, number>;
  };
}

export function assertBoardRendererContractV1(value: BoardRendererContractV1): BoardRendererContractV1 {
  if (value.meta.contractVersion !== BOARD_RENDERER_CONTRACT_V1_VERSION) {
    throw new Error('BoardRendererContractV1 must use contractVersion="v1".');
  }

  if (value.board.tiles.length !== value.board.tileCount) {
    throw new Error('BoardRendererContractV1 tile count mismatch.');
  }

  if (value.token.currentTileIndex < 0 || value.token.currentTileIndex >= value.board.tileCount) {
    throw new Error('BoardRendererContractV1 token index is out of bounds.');
  }

  return value;
}
