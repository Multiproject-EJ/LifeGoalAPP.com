import { resolveIslandBoardProfile, type IslandBoardProfileId } from './islandBoardProfiles';
import { generateTileMap, getIslandRarity } from './islandBoardTileMap';
import { resolveIslandRunContractV2Stops } from './islandRunContractV2StopResolver';
import { resolveIslandRunContractV2RewardHudState } from './islandRunContractV2Semantics';
import { isIslandRunContractV2BuildPanelVisibleForStop } from './islandRunContractV2EssenceBuild';
import { resolveWrappedTokenIndex } from './islandBoardTopology';
import type { IslandRunRuntimeState } from './islandRunRuntimeState';
import {
  BOARD_RENDERER_CONTRACT_V1_VERSION,
  type BoardRendererContractV1,
  type BoardRendererContractV1StopId,
} from './islandRunBoardRendererContractV1';

const STOP_IDS: BoardRendererContractV1StopId[] = ['hatchery', 'minigame', 'utility', 'dynamic', 'boss'];

export function selectBoardRendererContractV1(options: {
  runtimeState: IslandRunRuntimeState;
  islandNumber: number;
  boardProfileId?: IslandBoardProfileId;
  nowMs?: number;
  movementPreviewRoll?: number | null;
  busy?: Partial<BoardRendererContractV1['ui']['busy']>;
  errors?: BoardRendererContractV1['ui']['errors'];
  /** Authoritative last-roll result from the PWA roll action. Pass-through only — never generated here. */
  lastRolled?: BoardRendererContractV1['lastRolled'];
}): BoardRendererContractV1 {
  const boardProfile = resolveIslandBoardProfile(options.boardProfileId ?? 'legacy17');
  const nowMs = Math.floor(options.nowMs ?? Date.now());
  const rarity = getIslandRarity(options.islandNumber);
  const dayIndex = 2;
  const tileMap = generateTileMap(options.islandNumber, rarity, 'default', dayIndex, { profileId: boardProfile.id });

  const resolvedStops = resolveIslandRunContractV2Stops({
    stopStatesByIndex: options.runtimeState.stopStatesByIndex,
  });

  const rewardHud = resolveIslandRunContractV2RewardHudState({
    islandRunContractV2Enabled: true,
    runtimeState: options.runtimeState,
    nowMs,
  });

  const activeStopBuild = options.runtimeState.stopBuildStateByIndex[resolvedStops.activeStopIndex] ?? {
    requiredEssence: 0,
    spentEssence: 0,
    buildLevel: 0,
  };

  const movementPreview = typeof options.movementPreviewRoll === 'number' && options.movementPreviewRoll > 0
    ? {
      mode: 'dice' as const,
      pathTileIndices: Array.from({ length: options.movementPreviewRoll }, (_, step) =>
        resolveWrappedTokenIndex(options.runtimeState.tokenIndex, step + 1, boardProfile.tileCount),
      ),
    }
    : undefined;

  const activeStopId = STOP_IDS[resolvedStops.activeStopIndex] ?? 'boss';
  const canSpendEssence = activeStopBuild.requiredEssence > activeStopBuild.spentEssence && options.runtimeState.essence > 0;

  return {
    meta: {
      contractVersion: BOARD_RENDERER_CONTRACT_V1_VERSION,
      boardProfileId: boardProfile.id,
      timestampMs: nowMs,
      seed: options.runtimeState.cycleIndex,
    },
    board: {
      tileCount: boardProfile.tileCount,
      tiles: tileMap.map((tile) => {
        const stopIdx = boardProfile.stopTileIndices.findIndex((idx) => idx === tile.index);
        const stopStatus = stopIdx >= 0 ? resolvedStops.statusesByIndex[stopIdx] : null;

        return {
          id: `tile-${tile.index}`,
          index: tile.index,
          type: tile.tileType,
          state: stopStatus === 'active'
            ? 'active_stop'
            : stopStatus === 'completed'
              ? 'completed_stop'
              : stopStatus === 'locked'
                ? 'locked_stop'
                : 'default',
          tags: tile.stopId ? [`stop:${tile.stopId}`] : undefined,
        };
      }),
      paths: Array.from({ length: Math.max(0, boardProfile.tileCount - 1) }, (_, index) => ({
        fromTileId: `tile-${index}`,
        toTileId: `tile-${index + 1}`,
        style: 'default' as const,
      })),
      cameraAnchors: [
        { key: 'start', tileIndex: 0 },
        { key: 'activeStop', tileIndex: boardProfile.stopTileIndices[resolvedStops.activeStopIndex] ?? 0 },
      ],
    },
    token: {
      currentTileIndex: options.runtimeState.tokenIndex,
      isMoving: Boolean(movementPreview),
      movementPreview,
    },
    stops: {
      activeStop: {
        id: activeStopId,
        index: resolvedStops.activeStopIndex,
        type: resolvedStops.activeStopType,
        status: resolvedStops.statusesByIndex[resolvedStops.activeStopIndex] ?? 'active',
        isOpenable: true,
        isBuildable: canSpendEssence,
      },
      buildProgress: {
        current: activeStopBuild.spentEssence,
        required: activeStopBuild.requiredEssence,
        percent: activeStopBuild.requiredEssence > 0
          ? Math.min(100, (activeStopBuild.spentEssence / activeStopBuild.requiredEssence) * 100)
          : 100,
      },
      stopList: STOP_IDS.map((id, index) => {
        const build = options.runtimeState.stopBuildStateByIndex[index] ?? {
          requiredEssence: 0,
          spentEssence: 0,
          buildLevel: 0,
        };
        const stopState = options.runtimeState.stopStatesByIndex[index] ?? {
          objectiveComplete: false,
          buildComplete: false,
        };

        return {
          id,
          index,
          type: index === 0 ? 'hatchery' : index === 1 ? 'habit' : index === 2 ? 'breathing' : index === 3 ? 'wisdom' : 'boss',
          status: resolvedStops.statusesByIndex[index] ?? 'locked',
          progress: {
            objectiveComplete: stopState.objectiveComplete,
            buildComplete: stopState.buildComplete,
            spentEssence: build.spentEssence,
            requiredEssence: build.requiredEssence,
          },
        };
      }),
    },
    resources: {
      essence: {
        current: options.runtimeState.essence,
        spendable: options.runtimeState.essence,
      },
      dicePool: options.runtimeState.dicePool,
      hearts: options.runtimeState.hearts,
      coins: options.runtimeState.coins,
      spinTokens: options.runtimeState.spinTokens,
    },
    lastRolled: options.lastRolled,
    rewardBar: {
      eventId: rewardHud.activeTimedEvent?.eventId ?? null,
      progress: rewardHud.rewardBarProgress,
      nextThreshold: rewardHud.rewardBarThreshold,
      tier: options.runtimeState.rewardBarEscalationTier,
      isClaimable: rewardHud.canClaimRewardBar,
      pendingClaimCount: rewardHud.canClaimRewardBar ? 1 : 0,
    },
    event: {
      active: Boolean(rewardHud.activeTimedEvent),
      label: rewardHud.activeTimedEvent?.eventType ?? 'No active event',
      endsAtMs: rewardHud.activeTimedEvent?.expiresAtMs ?? null,
      remainingMs: rewardHud.timedEventRemainingMs,
      themeKey: rewardHud.activeTimedEvent?.eventType ?? 'default',
    },
    ui: {
      flags: {
        canRoll: options.runtimeState.dicePool > 0,
        canClaimReward: rewardHud.canClaimRewardBar,
        canSpendEssence,
        canOpenStop: isIslandRunContractV2BuildPanelVisibleForStop({
          islandRunContractV2Enabled: true,
          openedStopIndex: resolvedStops.activeStopIndex,
          activeStopIndex: resolvedStops.activeStopIndex,
        }),
      },
      busy: {
        roll: options.busy?.roll ?? false,
        claim: options.busy?.claim ?? false,
        spend: options.busy?.spend ?? false,
        openStop: options.busy?.openStop ?? false,
      },
      errors: options.errors ?? [],
    },
    cosmetics: {
      themeKey: rewardHud.activeTimedEvent?.eventType ?? 'default',
      stickerFragments: options.runtimeState.stickerProgress.fragments,
      stickerInventory: options.runtimeState.stickerInventory,
    },
  };
}
