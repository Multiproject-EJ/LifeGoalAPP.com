import {
  CACTUS_CANYON_SPIRAL_MAX_SEGMENTS,
  CELESTIAL_REDOCKING_PLATFORM_COUNT,
  CELESTIAL_REDOCKING_ROLL_TARGET,
  FROSTWELL_DEPTH_METERS,
  FROSTWELL_DRILL_TILE_INDICES,
  FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
  FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES,
  FISHERMANS_VILLAGE_ROD_TILE_INDICES,
  GREAT_HONEYFALL_MAX_STAGE,
  ROOTHEART_POWER_COMPONENTS,
  SUNKEN_SANDS_FIRST_TREASURE_DICE,
  SUNKEN_SANDS_FIRST_TREASURE_ID,
  SUNKEN_SANDS_TREASURE_ROLL_TARGET,
  advanceCelestialRedockingForRoll,
  advanceSunkenSandsTreasureForRoll,
  collectCactusCanyonDynamiteForLanding,
  collectFirstLightAssemblyDynamiteForLanding,
  collectFirstLightAssemblyDynamiteForRoute,
  collectFishermansVillageLanding,
  collectGreatHoneyfallNectarForLanding,
  collectRootheartPowerComponentForLanding,
  collectStagedRestorationPickupForRoute,
  getCactusCanyonAvailableDynamite,
  getCactusCanyonDynamiteQuantityForTile,
  getCelestialRedockingDockedPlatformCount,
  getFirstLightAssemblyAvailableDynamite,
  getGreatHoneyfallAvailableNectar,
  getGreatHoneyfallNectarQuantityForTile,
  getFrostwellAvailableSpins,
  getIslandRunSignatureMissionKey,
  getStagedRestorationMissionDescriptor,
  getStagedRestorationPickupTileIndices,
  grantFrostwellDrillSpinForLanding,
  mergeIslandRunSignatureMissionProgress,
  resolveFrostwellIceworksProgress,
  resolveFirstLightAssemblyCraterProgress,
  resolveFishermansVillageFishingProgress,
  resolveCactusCanyonSpiralProgress,
  resolveCelestialRedockingProgress,
  resolveGreatHoneyfallProgress,
  resolveFrostwellSpinMeters,
  resolveRootheartPowerworksProgress,
  resolveSunkenSandsTreasureProgress,
  resolveStagedRestorationMissionProgress,
  sanitizeIslandRunSignatureMissionProgress,
} from '../islandRunSignatureMissions';
import {
  activateStagedRestorationMissionStage,
  activateGreatHoneyfallReservoir,
  claimSunkenSandsFirstTreasure,
  detonateFirstLightAssemblyCharge,
  fundRootheartPowerworksStage,
  releaseFishermansVillageCatch,
  reelFishermansVillageCatch,
  blastCactusCanyonSpiralSection,
  spinFrostwellDrillWheel,
} from '../islandRunSignatureMissionAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import { applyLandmarkDoorTiles, generateTileMap, getIslandRarity } from '../islandBoardTileMap';
import { getIslandMissionBriefingPresentation } from '../islandRunMissionBriefing';
import { getIslandRunBossReward } from '../islandRunBossReward';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';
import { findIslandRunReservedTileCollisions } from '../islandRunTileReservations';

const USER_ID = 'signature-mission-test-user';
const makeSession = () => ({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id: USER_ID, user_metadata: {} } }) as unknown as import('@supabase/supabase-js').Session;

async function seedFrostwell(options: { essence?: number; meters?: number; spinsEarned?: number; spinsUsed?: number } = {}): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 3);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 3,
      cycleIndex: 0,
      essence: options.essence ?? 1_500,
      essenceLifetimeSpent: 20,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'frostwell-iceworks', version: 2,
          metersDrilled: options.meters ?? FROSTWELL_DEPTH_METERS,
          spinsEarned: options.spinsEarned ?? 0,
          spinsUsed: options.spinsUsed ?? 0,
          lastSpinMeters: null, builtAtMs: null, updatedAtMs: 1,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

async function seedRootheart(options: {
  essence?: number;
  collectedCount?: number;
  buildStage?: 0 | 1 | 2 | 3;
} = {}): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 10);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 10,
      cycleIndex: 0,
      essence: options.essence ?? 4_000,
      essenceLifetimeSpent: 20,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'rootheart-powerworks',
          version: 1,
          collectedComponentIds: ROOTHEART_POWER_COMPONENTS
            .slice(0, options.collectedCount ?? ROOTHEART_POWER_COMPONENTS.length)
            .map((component) => component.id),
          buildStage: options.buildStage ?? 0,
          essenceSpent: 0,
          activatedAtMs: null,
          updatedAtMs: 1,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

async function seedSunkenSandsTreasure(rollsCompleted: number): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 12);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 12,
      cycleIndex: 0,
      dicePool: 10,
      essence: 50,
      essenceLifetimeEarned: 70,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'sunken-sands-first-treasure',
          version: 1,
          treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
          rollsCompleted,
          revealedAtMs: rollsCompleted >= SUNKEN_SANDS_TREASURE_ROLL_TARGET ? 100 : null,
          claimedAtMs: null,
          updatedAtMs: 100,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

async function seedCactusCanyon(options: {
  segments?: number;
  dynamiteEarned?: number;
  dynamiteSpent?: number;
  completedAtMs?: number | null;
} = {}): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 13);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 13,
      cycleIndex: 0,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'cactus-canyon-spiral-rail',
          version: 2,
          segmentsExcavated: options.segments ?? 0,
          dynamiteEarned: options.dynamiteEarned ?? 0,
          dynamiteSpent: options.dynamiteSpent ?? 0,
          lastBlastSegments: null,
          startedAtMs: 1,
          completedAtMs: options.completedAtMs ?? null,
          updatedAtMs: 1,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

async function seedFirstLightAssembly(options: {
  claimedTileIndices?: number[];
  chargesDetonated?: number;
  completedAtMs?: number | null;
} = {}): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 1);
  const claimedDynamiteTileIndices = options.claimedTileIndices ?? [];
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 1,
      cycleIndex: 0,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'first-light-assembly-crater',
          version: 1,
          claimedDynamiteTileIndices,
          chargesDetonated: options.chargesDetonated ?? 0,
          lastDetonatedSector: null,
          startedAtMs: claimedDynamiteTileIndices.length ? 1 : null,
          completedAtMs: options.completedAtMs ?? null,
          updatedAtMs: 1,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

async function seedGreatHoneyfall(options: {
  activatedReservoirs?: 0 | 1 | 2 | 3 | 4;
  nectarEarned?: number;
  nectarSpent?: number;
  completedAtMs?: number | null;
} = {}): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 14);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 14,
      cycleIndex: 0,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'great-honeyfall-coronation',
          version: 1,
          nectarChargesEarned: options.nectarEarned ?? 0,
          nectarChargesSpent: options.nectarSpent ?? 0,
          activatedReservoirs: options.activatedReservoirs ?? 0,
          lastActivatedReservoir: options.activatedReservoirs ?? null,
          completedAtMs: options.completedAtMs ?? null,
          updatedAtMs: 1,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

export const islandRunSignatureMissionTests: TestCase[] = [
  {
    name: 'Celestial Great Re-Docking advances once per roll and locks platforms at 5, 10, 15, and 20',
    run: () => {
      let ledger = {};
      const dockedPlatformIndices: number[] = [];
      for (let roll = 1; roll <= CELESTIAL_REDOCKING_ROLL_TARGET; roll += 1) {
        const result = advanceCelestialRedockingForRoll({
          ledger,
          islandNumber: 2,
          cycleIndex: 0,
          nowMs: roll * 100,
        });
        ledger = result.ledger;
        if (result.dockedPlatformIndex !== null) dockedPlatformIndices.push(result.dockedPlatformIndex);
        assertEqual(result.rollsCompleted, roll, `accepted roll ${roll} advances exactly once`);
      }
      const progress = resolveCelestialRedockingProgress({ ledger, islandNumber: 2, cycleIndex: 0 });
      assertEqual(dockedPlatformIndices.join(','), '0,1,2,3', 'four platform locks occur at the four five-roll thresholds');
      assertEqual(getCelestialRedockingDockedPlatformCount(progress), CELESTIAL_REDOCKING_PLATFORM_COUNT, 'all four platforms are docked');
      assert(progress.completedAtMs !== null, 'the twentieth roll persists completion time');
      const capped = advanceCelestialRedockingForRoll({ ledger, islandNumber: 2, cycleIndex: 0, nowMs: 9_999 });
      assertEqual(capped.rollsCompleted, CELESTIAL_REDOCKING_ROLL_TARGET, 'later rolls remain capped');
      assertEqual(capped.dockedPlatformIndex, null, 'a completed mission cannot replay a docking edge');
      assertEqual(
        advanceCelestialRedockingForRoll({ ledger: {}, islandNumber: 3, cycleIndex: 0, nowMs: 1 }).rollsCompleted,
        0,
        'other islands never advance the mission',
      );
      assertEqual(
        resolveCelestialRedockingProgress({ ledger, islandNumber: 2, cycleIndex: 1 }).rollsCompleted,
        0,
        'a new cycle begins independently',
      );
    },
  },
  {
    name: 'Celestial Great Re-Docking sanitizes and merges progress monotonically',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 2);
      const remote = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'celestial-great-redocking', rolls_completed: 7, updated_at_ms: 70 },
      });
      const local = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'celestial-great-redocking', rolls_completed: 25, completed_at_ms: 200, updated_at_ms: 200 },
      });
      const progress = resolveCelestialRedockingProgress({
        ledger: mergeIslandRunSignatureMissionProgress(remote, local),
        islandNumber: 2,
        cycleIndex: 0,
      });
      assertEqual(progress.rollsCompleted, CELESTIAL_REDOCKING_ROLL_TARGET, 'invalid overfill clamps to the target');
      assertEqual(progress.completedAtMs, 200, 'completion survives cross-device merge');
    },
  },
  {
    name: 'First Light places exactly twenty finite Assembly Crater charges on non-door board tiles',
    run: () => {
      const map = applyLandmarkDoorTiles(
        generateTileMap(1, getIslandRarity(1), 'first-light', 2),
        { expandedActiveStopId: 'hatchery' },
      );
      const caches = map.filter((entry) => entry.signatureMissionKind === 'first_light_dynamite');
      assertEqual(caches.length, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET, 'twenty distinct dynamite caches are authored');
      assertEqual(new Set(caches.map((entry) => entry.index)).size, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET, 'every cache has a unique tile');
      assert(caches.every((entry) => entry.tileType !== 'landmark_door'), 'no cache replaces a canonical landmark door');

      const firstTile = FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES[0];
      const first = collectFirstLightAssemblyDynamiteForLanding({
        ledger: {}, islandNumber: 1, cycleIndex: 0, tileIndex: firstTile, nowMs: 10,
      });
      const duplicate = collectFirstLightAssemblyDynamiteForLanding({
        ledger: first.ledger, islandNumber: 1, cycleIndex: 0, tileIndex: firstTile, nowMs: 11,
      });
      const progress = resolveFirstLightAssemblyCraterProgress({ ledger: duplicate.ledger, islandNumber: 1, cycleIndex: 0 });
      assertEqual(first.dynamiteCollected, 1, 'first landing collects the finite cache');
      assertEqual(duplicate.dynamiteCollected, 0, 'the same cache cannot be collected twice');
      assertEqual(getFirstLightAssemblyAvailableDynamite(progress), 1, 'one collected charge remains available');

      const routePass = collectFirstLightAssemblyDynamiteForRoute({
        ledger: {},
        islandNumber: 1,
        cycleIndex: 0,
        landingTileIndex: 4,
        routeTileIndices: [1, 2, 3, 4],
        nowMs: 12,
      });
      const routeProgress = resolveFirstLightAssemblyCraterProgress({
        ledger: routePass.ledger,
        islandNumber: 1,
        cycleIndex: 0,
      });
      assertEqual(routePass.dynamiteCollected, 1, 'crossing the route starts the mission without exact-land RNG');
      assertEqual(routePass.collectionKind, 'route_pass', 'crossed cache reports the route-pass presentation');
      assertEqual(routePass.collectedTileIndex, 1, 'the first unclaimed crossed cache is secured');
      assertEqual(routeProgress.claimedDynamiteTileIndices.length, 1, 'a roll can secure at most one cache');

      const landingPriority = collectFirstLightAssemblyDynamiteForRoute({
        ledger: {},
        islandNumber: 1,
        cycleIndex: 0,
        landingTileIndex: 3,
        routeTileIndices: [1, 2, 3],
        nowMs: 13,
      });
      assertEqual(landingPriority.collectionKind, 'landing', 'exact landing takes priority over crossed caches');
      assertEqual(landingPriority.collectedTileIndex, 3, 'the landed cache is the one secured');
    },
  },
  {
    name: 'First Light detonation consumes one collected charge and completes the twentieth sector exactly once',
    run: async () => {
      await seedFirstLightAssembly({
        claimedTileIndices: [...FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES],
        chargesDetonated: 19,
      });
      const result = await detonateFirstLightAssemblyCharge({ session: makeSession(), client: null });
      assertEqual(result.status, 'ok', 'twentieth detonation succeeds');
      if (result.status !== 'ok') return;
      const after = readIslandRunGameStateRecord(makeSession());
      const progress = resolveFirstLightAssemblyCraterProgress({
        ledger: after.signatureMissionProgressByIsland, islandNumber: 1, cycleIndex: 0,
      });
      assertEqual(result.sectorAfter, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET, 'progress caps at twenty sectors');
      assertEqual(progress.chargesDetonated, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET, 'twentieth sector persists');
      assert(progress.completedAtMs !== null, 'completion timestamp persists');
      const finaleReward = getIslandRunBossReward(1);
      assertEqual(after.bossTrialResolvedIslandNumber, 1, 'Assembly finale fulfils the hidden fifth-stop compatibility marker');
      assertEqual(after.stopStatesByIndex[4]?.objectiveComplete, true, 'hidden boss objective slot is fulfilled by the Assembly mission');
      assertEqual(after.stopBuildStateByIndex[4]?.buildLevel, 3, 'hidden boss build slot does not require player funding');
      assertEqual(after.dicePool, 30 + finaleReward.dice, 'Assembly finale grants the standard island-finale dice once');
      assertEqual(after.essence, finaleReward.essence, 'Assembly finale grants the standard island-finale essence once');
      assertEqual((await detonateFirstLightAssemblyCharge({ session: makeSession(), client: null })).status, 'already_complete', 'completion is idempotent');
      const afterDuplicate = readIslandRunGameStateRecord(makeSession());
      assertEqual(afterDuplicate.dicePool, after.dicePool, 'repeat detonation cannot duplicate the finale reward');
    },
  },
  {
    name: 'Island 001 briefing states the Assembly mission and excludes a separate Boss landmark',
    run: () => {
      const briefing = getIslandMissionBriefingPresentation(1);
      assert(briefing.headline.includes('Assembly'), 'headline names the Assembly mission');
      assert(briefing.primaryObjective.includes('twenty'), 'primary objective states the twenty-charge target');
      assert(briefing.supportingObjective.includes('Level 3'), 'supporting objective states the landmark build target');
      assert(briefing.supportingObjective.includes('replaces a separate Boss landmark'), 'briefing explains that no Boss landmark is counted');
    },
  },
  {
    name: 'Island missions expose a compact reward-rail phone above the HUD with live progress and queued pickup handoff',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const modalSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandMissionBriefingModal.tsx', 'utf8');
      const trackerSource = fsMod.readFileSync('src/features/gamification/level-worlds/services/islandRunMissionTracker.ts', 'utf8');
      const cssSource = fsMod.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      assert(boardSource.includes('island-run-board__rewardbar-side-rail'), 'board renders the shared right-side HUD rail');
      assert(boardSource.includes('island-run-board__mission-phone-rail'), 'board renders the compact mission phone beneath event actions');
      assert(boardSource.includes('rewardBarMissionSlotIndex'), 'mission phone owns a stable slot after active minigame actions');
      assert(boardSource.includes('shouldRenderLegacySignatureMissionPills = false'), 'large scene-space mission cards stay retired');
      assert(boardSource.includes("setQueuedSignatureMissionPresentation('first_light_assembly')"), 'a Concord pickup queues a simultaneous Assembly pickup instead of dropping its presentation');
      assert(boardSource.includes('if (!queuedSignatureMissionPresentation || doesModalOwnAttention) return undefined;'), 'queued mission presentation waits for the current popup to close');
      assert(boardSource.includes('openQueuedSignatureMissionPresentation(mission)'), 'closing the first popup releases the queued mission panel');
      assert(boardSource.includes("showIslandClearCelebrationFromAnywhere('island_001_assembly_and_landmarks_complete')"), 'completed mission and landmarks auto-open island clear');
      assert(boardSource.includes('resolveIslandMissionTrackerPresentation'), 'board delegates phone progress to the canonical read model');
      assert(!boardSource.includes('standardMissionCompletionPercent'), 'board no longer owns generic phone progress arithmetic');
      assert(trackerSource.includes("objective('Use Dynamite'"), 'phone read model reports the short dynamite objective');
      assert(trackerSource.includes("objective('Build Landmarks'"), 'phone read model reports the short landmark objective');
      assert(modalSource.includes('island-mission-tracker__command-plate'), 'phone tracker uses the compact military command header');
      assert(modalSource.includes('island-mission-tracker__command-frame'), 'military header carries a symmetrical inset metal frame and four fasteners');
      assert(modalSource.includes('island-mission-tracker__command-insignia'), 'military header carries the shield-and-chevron insignia');
      assert(modalSource.includes('island-mission-tracker__checklist'), 'phone tracker renders objectives as checklist rows');
      assert(modalSource.includes('island-mission-tracker__objective-marker'), 'each short objective carries a visual progress marker');
      assert(modalSource.includes('island-mission-tracker__objective-row--actionable'), 'the live mission phone exposes each objective as an action');
      assert(modalSource.includes('island-mission-tracker__objective-detail'), 'objectives without a dedicated panel open concise information inside the phone');
      assert(boardSource.includes("objective.label.toLowerCase().includes('build landmarks')"), 'Build Landmarks routes to the existing Build flow');
      assert(boardSource.includes('handleMissionPhoneObjectiveSelect'), 'dedicated signature objectives route through the board mission launcher');
      assert(boardSource.includes("[1, 3, 10, 13].includes(islandNumber)"), 'only islands with dedicated mission panels are marked as external launches');
      assert(modalSource.includes('aria-label="Mission progress"'), 'phone tracker exposes accessible overall progress');
      assert(boardSource.includes('/tech/ExpeditionPhone_v19_folded.webp'), 'the board affordance uses the folded phone hardware');
      assert(modalSource.includes('/tech/ExpeditionPhone_v21_opening.webp'), 'the tracker unfolds through the authored phone-opening sequence');
      assert(modalSource.includes('data-phase={phase}'), 'the tracker exposes unfold, powered-on, and fold-back presentation phases');
      assert(!modalSource.includes('Command council'), 'compact tracker removes the command-council information wall');
      assert(!modalSource.includes('presentation.missionStatement'), 'compact tracker removes the long mission paragraph');
      assert(!modalSource.includes('presentation.caretakerSignal'), 'compact tracker removes the caretaker quote');
      assert(cssSource.includes('.island-run-board__mission-phone-rail'), 'phone affordance has a compact reward-rail presentation contract');
      assert(cssSource.includes('.island-run-signature-mission-overlay'), 'signature mission dialogs share one foreground portal layer');
      assert(cssSource.includes('z-index: var(--island-run-mission-overlay-z, 22000)'), 'mission overlays outrank the board HUD');
      assert(cssSource.includes("top: max(calc(env(safe-area-inset-top) + 164px), 176px)"), 'Canyon train ride controls sit below the top and reward bars');
      assert(cssSource.includes('.island-mission-tracker__phone'), 'tracker preserves the 3D board behind a physical phone presentation');
      assert(cssSource.includes(".island-mission-tracker[data-phase='open'] .island-mission-tracker__phone-screen"), 'the mission display powers on only after the phone fully unfolds');
      assert(cssSource.includes('@keyframes island-mission-tracker-screen-boot'), 'the powered display has an authored black-screen ignition sequence');
    },
  },
  {
    name: 'First Light sanitizer and merge preserve unique pickups and monotonic excavation',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 1);
      const remote = sanitizeIslandRunSignatureMissionProgress({
        [key]: {
          mission_id: 'first-light-assembly-crater',
          claimed_dynamite_tile_indices: [0, 1, 2, 2, 99],
          charges_detonated: 2,
          updated_at_ms: 10,
        },
      });
      const local = sanitizeIslandRunSignatureMissionProgress({
        [key]: {
          mission_id: 'first-light-assembly-crater',
          claimed_dynamite_tile_indices: [0, 1, 2, 3, 7],
          charges_detonated: 4,
          updated_at_ms: 20,
        },
      });
      const progress = resolveFirstLightAssemblyCraterProgress({
        ledger: mergeIslandRunSignatureMissionProgress(remote, local), islandNumber: 1, cycleIndex: 0,
      });
      assertEqual(progress.claimedDynamiteTileIndices.length, 5, 'valid unique cache claims are unioned');
      assertEqual(progress.chargesDetonated, 4, 'furthest valid excavation wins');
    },
  },
  {
    name: 'Honeycomb Kingdom places four visible royal-nectar pickups away from landmark doors and caps collection',
    run: () => {
      const map = applyLandmarkDoorTiles(
        generateTileMap(14, getIslandRarity(14), 'honeycomb-kingdom', 2),
        { expandedActiveStopId: 'hatchery' },
      );
      const nectarTiles = map.filter((entry) => entry.signatureMissionKind === 'great_honeyfall_nectar');
      assertEqual(nectarTiles.length, GREAT_HONEYFALL_MAX_STAGE, 'four royal nectar pickups are distributed around the route');
      assert(nectarTiles.every((entry) => entry.tileType !== 'landmark_door'), 'nectar pickups remain clear of landmark doors');
      assertEqual(getGreatHoneyfallNectarQuantityForTile(14, 11, 36), 1, 'authored nectar landing grants one charge');
      assertEqual(getGreatHoneyfallNectarQuantityForTile(13, 11, 36), 0, 'other islands do not grant royal nectar');
      let ledger = {};
      for (const tileIndex of [2, 11, 20, 29, 2]) {
        ledger = collectGreatHoneyfallNectarForLanding({
          ledger, islandNumber: 14, cycleIndex: 0, tileIndex, tileCount: 36, nowMs: tileIndex + 10,
        }).ledger;
      }
      const progress = resolveGreatHoneyfallProgress({ ledger, islandNumber: 14, cycleIndex: 0 });
      assertEqual(progress.nectarChargesEarned, GREAT_HONEYFALL_MAX_STAGE, 'nectar collection caps at the four mission stages');
      assertEqual(getGreatHoneyfallAvailableNectar(progress), GREAT_HONEYFALL_MAX_STAGE, 'all earned nectar is ready to spend');
    },
  },
  {
    name: 'Great Honeyfall activation spends one nectar per reservoir and completes exactly once',
    run: async () => {
      await seedGreatHoneyfall({ activatedReservoirs: 3, nectarEarned: 4, nectarSpent: 3 });
      const first = await activateGreatHoneyfallReservoir({ session: makeSession(), client: null });
      assertEqual(first.status, 'ok', 'earned nectar activates the final reservoir');
      const state = readIslandRunGameStateRecord(makeSession());
      const progress = resolveGreatHoneyfallProgress({ ledger: state.signatureMissionProgressByIsland, islandNumber: 14, cycleIndex: 0 });
      assertEqual(progress.activatedReservoirs, GREAT_HONEYFALL_MAX_STAGE, 'fourth reservoir persists');
      assertEqual(progress.nectarChargesSpent, GREAT_HONEYFALL_MAX_STAGE, 'exactly one final charge is consumed');
      assert(progress.completedAtMs !== null, 'coronation completion timestamp persists');
      assertEqual((await activateGreatHoneyfallReservoir({ session: makeSession(), client: null })).status, 'already_complete', 'completed coronation is idempotent');
    },
  },
  {
    name: 'Great Honeyfall sanitizer and conflict merge preserve furthest coronation stage',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 14);
      const remote = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'great-honeyfall-coronation', activated_reservoirs: 2, nectar_charges_earned: 3, nectar_charges_spent: 2, updated_at_ms: 12 },
      });
      const local = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'great-honeyfall-coronation', activated_reservoirs: 4, nectar_charges_earned: 4, nectar_charges_spent: 4, completed_at_ms: 30, updated_at_ms: 40 },
      });
      const progress = resolveGreatHoneyfallProgress({
        ledger: mergeIslandRunSignatureMissionProgress(remote, local), islandNumber: 14, cycleIndex: 0,
      });
      assertEqual(progress.activatedReservoirs, GREAT_HONEYFALL_MAX_STAGE, 'furthest reservoir stage wins');
      assertEqual(progress.nectarChargesEarned, GREAT_HONEYFALL_MAX_STAGE, 'maximum earned nectar survives merge');
      assertEqual(progress.completedAtMs, 30, 'first coronation completion survives merge');
    },
  },
  {
    name: 'Cactus Canyon distributes mostly single dynamite caches with rare triple bundles after mission start',
    run: () => {
      const map = applyLandmarkDoorTiles(
        generateTileMap(13, getIslandRarity(13), 'cactus-canyon', 2),
        { expandedActiveStopId: 'hatchery' },
      );
      const caches = map.filter((entry) => entry.signatureMissionKind === 'cactus_canyon_dynamite');
      assertEqual(caches.length, 8, 'eight authored dynamite caches are distributed around the route');
      assertEqual(caches.filter((entry) => entry.signatureMissionAmount === 1).length, 6, 'most caches carry one stick');
      assertEqual(caches.filter((entry) => entry.signatureMissionAmount === 3).length, 2, 'two rare caches carry three sticks');
      assert(caches.every((entry) => entry.tileType !== 'landmark_door'), 'dynamite caches remain clear of landmark doors');
      const locked = collectCactusCanyonDynamiteForLanding({
        ledger: {}, islandNumber: 13, cycleIndex: 0, tileIndex: 20, tileCount: 36, nowMs: 9,
      });
      assertEqual(locked.dynamiteCollected, 0, 'collection remains locked before the briefing starts the mission');
      const startedKey = getIslandRunSignatureMissionKey(0, 13);
      const first = collectCactusCanyonDynamiteForLanding({
        ledger: { [startedKey]: { ...resolveCactusCanyonSpiralProgress({ ledger: {}, islandNumber: 13, cycleIndex: 0 }), startedAtMs: 10 } },
        islandNumber: 13, cycleIndex: 0, tileIndex: 20, tileCount: 36, nowMs: 11,
      });
      const progress = resolveCactusCanyonSpiralProgress({ ledger: first.ledger, islandNumber: 13, cycleIndex: 0 });
      assertEqual(first.dynamiteCollected, 1, 'single cache grants one stick');
      assertEqual(getCactusCanyonAvailableDynamite(progress), 1, 'dynamite is durably queued');
      assertEqual(getCactusCanyonDynamiteQuantityForTile(13, 10, 36), 3, 'rare cache resolves three sticks');
      assertEqual(getCactusCanyonDynamiteQuantityForTile(12, 19, 36), 0, 'other islands do not grant');
      assertEqual(resolveCactusCanyonSpiralProgress({ ledger: first.ledger, islandNumber: 13, cycleIndex: 1 }).segmentsExcavated, 0, 'next cycle starts independently');
    },
  },
  {
    name: 'Cactus Canyon blast consumes one dynamite, builds one section, caps the helix, and completes exactly once',
    run: async () => {
      await seedCactusCanyon({ segments: 15, dynamiteEarned: 2 });
      const first = await blastCactusCanyonSpiralSection({ session: makeSession(), client: null });
      const after = readIslandRunGameStateRecord(makeSession());
      const progress = resolveCactusCanyonSpiralProgress({ ledger: after.signatureMissionProgressByIsland, islandNumber: 13, cycleIndex: 0 });
      assertEqual(first.status, 'ok', 'earned dynamite blast resolves');
      if (first.status !== 'ok') return;
      assertEqual(first.segments, 1, 'one stick opens exactly one authored rail section');
      assertEqual(progress.segmentsExcavated, CACTUS_CANYON_SPIRAL_MAX_SEGMENTS, 'helix caps at sixteen sections');
      assertEqual(progress.dynamiteSpent, 1, 'exactly one dynamite is consumed');
      assert(progress.completedAtMs !== null, 'completion timestamp persists');
      assertEqual((await blastCactusCanyonSpiralSection({ session: makeSession(), client: null })).status, 'already_complete', 'completed railway is idempotent');
    },
  },
  {
    name: 'Cactus Canyon sanitizer and conflict merge preserve furthest excavation and first completion',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 13);
      const remote = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'cactus-canyon-spiral-rail', segments_excavated: 7, spins_earned: 4, updated_at_ms: 12 },
      });
      const local = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'cactus-canyon-spiral-rail', segments_excavated: 16, spins_earned: 7, spins_used: 6, completed_at_ms: 30, updated_at_ms: 40 },
      });
      const progress = resolveCactusCanyonSpiralProgress({
        ledger: mergeIslandRunSignatureMissionProgress(remote, local), islandNumber: 13, cycleIndex: 0,
      });
      assertEqual(progress.segmentsExcavated, 16, 'furthest excavation wins');
      assertEqual(progress.dynamiteEarned, 7, 'legacy earned-spin counter migrates to dynamite without value loss');
      assertEqual(progress.completedAtMs, 30, 'first completion survives merge');
    },
  },
  {
    name: 'Sunken Sands advances one chamber turn per canonical roll and caps at twenty',
    run: () => {
      const first = advanceSunkenSandsTreasureForRoll({
        ledger: {}, islandNumber: 12, cycleIndex: 0, nowMs: 10,
      });
      assertEqual(first.rollsCompleted, 1, 'first successful Island 012 roll opens one turn');
      assertEqual(first.becameReady, false, 'first turn is not claimable');
      const key = getIslandRunSignatureMissionKey(0, 12);
      const almostReady = {
        [key]: {
          ...resolveSunkenSandsTreasureProgress({ ledger: first.ledger, cycleIndex: 0, islandNumber: 12 }),
          rollsCompleted: 19,
        },
      };
      const ready = advanceSunkenSandsTreasureForRoll({
        ledger: almostReady, islandNumber: 12, cycleIndex: 0, nowMs: 20,
      });
      assertEqual(ready.rollsCompleted, 20, 'twentieth turn opens the chamber fully');
      assertEqual(ready.becameReady, true, 'twentieth turn exposes one ready edge');
      const capped = advanceSunkenSandsTreasureForRoll({
        ledger: ready.ledger, islandNumber: 12, cycleIndex: 0, nowMs: 30,
      });
      assertEqual(capped.rollsCompleted, 20, 'later rolls cannot overfill the chamber');
      assertEqual(capped.becameReady, false, 'ready edge cannot repeat');
      assertEqual(
        advanceSunkenSandsTreasureForRoll({ ledger: {}, islandNumber: 11, cycleIndex: 0, nowMs: 40 }).rollsCompleted,
        0,
        'other islands never advance this treasure',
      );
    },
  },
  {
    name: 'Sunken Sands first treasure claim is gated, rewarding, persisted, and idempotent',
    run: async () => {
      await seedSunkenSandsTreasure(19);
      const blocked = await claimSunkenSandsFirstTreasure({ session: makeSession(), client: null });
      assertEqual(blocked.status, 'not_ready', 'nineteen rolls cannot claim');
      assertEqual(readIslandRunGameStateRecord(makeSession()).dicePool, 10, 'blocked claim leaves dice untouched');

      await seedSunkenSandsTreasure(20);
      const first = await claimSunkenSandsFirstTreasure({ session: makeSession(), client: null });
      const afterFirst = readIslandRunGameStateRecord(makeSession());
      const repeated = await claimSunkenSandsFirstTreasure({ session: makeSession(), client: null });
      assertEqual(first.status, 'ok', 'ready chamber claims');
      if (first.status !== 'ok') return;
      assertEqual(first.treasureId, SUNKEN_SANDS_FIRST_TREASURE_ID, 'the first treasure keeps a durable identity');
      assertEqual(afterFirst.dicePool, 10 + SUNKEN_SANDS_FIRST_TREASURE_DICE, 'claim pays the configured dice once');
      assert(afterFirst.essence > 50, 'claim pays scaled Essence');
      assert(
        resolveSunkenSandsTreasureProgress({ ledger: afterFirst.signatureMissionProgressByIsland, cycleIndex: 0, islandNumber: 12 }).claimedAtMs !== null,
        'claim timestamp persists in the cycle-scoped ledger',
      );
      assertEqual(repeated.status, 'already_claimed', 'repeat claim is rejected');
      assertEqual(readIslandRunGameStateRecord(makeSession()).dicePool, afterFirst.dicePool, 'repeat claim cannot double-pay');
    },
  },
  {
    name: 'Sunken Sands sanitizer and conflict merge preserve furthest reveal and first claim',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 12);
      const remote = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'sunken-sands-first-treasure', rolls_completed: 12, updated_at_ms: 12 },
      });
      const local = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'sunken-sands-first-treasure', rolls_completed: 20, revealed_at_ms: 20, claimed_at_ms: 30, updated_at_ms: 30 },
      });
      const merged = mergeIslandRunSignatureMissionProgress(remote, local);
      const progress = resolveSunkenSandsTreasureProgress({ ledger: merged, cycleIndex: 0, islandNumber: 12 });
      assertEqual(progress.rollsCompleted, 20, 'furthest chamber turn wins');
      assertEqual(progress.revealedAtMs, 20, 'reveal timestamp survives');
      assertEqual(progress.claimedAtMs, 30, 'claim survives cross-device merge');
    },
  },
  {
    name: 'Rootheart exposes eight stable Powerworks caches clear of doors and special economy stations',
    run: () => {
      const map = applyLandmarkDoorTiles(
        generateTileMap(10, getIslandRarity(10), 'rootheart', 2),
        { expandedActiveStopId: 'hatchery' },
      );
      assertEqual(ROOTHEART_POWER_COMPONENTS.length, 8, 'eight named engine parts ship');
      ROOTHEART_POWER_COMPONENTS.forEach((component) => {
        const tile = map[component.tileIndex];
        assertEqual(tile?.signatureMissionKind, 'rootheart_power_component', `${component.label} is marked`);
        assert(tile?.tileType !== 'landmark_door', `${component.label} remains clear of door clusters`);
        assert(!['traffic_light', 'build_discount', 'free_ticket', 'card', 'encounter'].includes(tile?.tileType ?? ''), `${component.label} remains on an ordinary economy tile`);
      });
    },
  },
  {
    name: 'Rootheart landing collects each named component once and remains cycle scoped',
    run: () => {
      const component = ROOTHEART_POWER_COMPONENTS[0];
      const first = collectRootheartPowerComponentForLanding({
        ledger: {}, islandNumber: 10, cycleIndex: 0, tileIndex: component.tileIndex, nowMs: 10,
      });
      const duplicate = collectRootheartPowerComponentForLanding({
        ledger: first.ledger, islandNumber: 10, cycleIndex: 0, tileIndex: component.tileIndex, nowMs: 11,
      });
      const nextCycle = collectRootheartPowerComponentForLanding({
        ledger: first.ledger, islandNumber: 10, cycleIndex: 1, tileIndex: component.tileIndex, nowMs: 12,
      });
      assertEqual(first.collectedComponentId, component.id, 'first landing collects exact part');
      assertEqual(duplicate.collectedComponentId, null, 'repeat landing cannot duplicate a part');
      assertEqual(nextCycle.collectedComponentId, component.id, 'new cycle receives its own mission');
      assertEqual(resolveRootheartPowerworksProgress({ ledger: first.ledger, islandNumber: 10, cycleIndex: 1 }).collectedComponentIds.length, 0, 'cycles do not leak progress');
    },
  },
  {
    name: 'Rootheart merge preserves the union of components and highest funded stage',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 10);
      const base = {
        missionId: 'rootheart-powerworks' as const,
        version: 1 as const,
        essenceSpent: 600,
        activatedAtMs: null,
        updatedAtMs: 10,
      };
      const merged = mergeIslandRunSignatureMissionProgress(
        { [key]: { ...base, collectedComponentIds: [ROOTHEART_POWER_COMPONENTS[0].id], buildStage: 1 } },
        { [key]: { ...base, collectedComponentIds: [ROOTHEART_POWER_COMPONENTS[1].id], buildStage: 2, essenceSpent: 1_500, updatedAtMs: 20 } },
      );
      const progress = resolveRootheartPowerworksProgress({ ledger: merged, islandNumber: 10, cycleIndex: 0 });
      assertEqual(progress.collectedComponentIds.length, 2, 'component union survives conflict merge');
      assertEqual(progress.buildStage, 2, 'highest construction stage wins');
      assertEqual(progress.essenceSpent, 1_500, 'highest monotonic mission spend wins');
    },
  },
  {
    name: 'Rootheart staged funding deducts 600, 900, and 1500 exactly once then activates',
    run: async () => {
      await seedRootheart();
      const stage1 = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      const stage2 = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      const stage3 = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      const repeat = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      const state = readIslandRunGameStateRecord(makeSession());
      const progress = resolveRootheartPowerworksProgress({ ledger: state.signatureMissionProgressByIsland, islandNumber: 10, cycleIndex: 0 });
      assertEqual(stage1.status, 'ok', 'waterworks stage funds');
      assertEqual(stage2.status, 'ok', 'dynamo stage funds');
      assertEqual(stage3.status, 'ok', 'heartlight stage funds');
      assertEqual(repeat.status, 'already_complete', 'completed plant is idempotent');
      assertEqual(state.essence, 1_000, 'exact total 3000 Essence is deducted');
      assertEqual(state.essenceLifetimeSpent, 3_020, 'lifetime spend increments atomically');
      assertEqual(progress.buildStage, 3, 'final stage persists');
      assert(progress.activatedAtMs !== null, 'activation timestamp persists');
    },
  },
  {
    name: 'Rootheart funding rejects incomplete collection and insufficient Essence without mutation',
    run: async () => {
      await seedRootheart({ collectedCount: 7 });
      const incomplete = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      assertEqual(incomplete.status, 'components_incomplete', 'all eight parts are required');
      assertEqual(readIslandRunGameStateRecord(makeSession()).essence, 4_000, 'incomplete funding does not mutate wallet');
      await seedRootheart({ essence: 599 });
      const poor = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      assertEqual(poor.status, 'insufficient_essence', 'wallet guard blocks staged funding');
      assertEqual(readIslandRunGameStateRecord(makeSession()).essence, 599, 'blocked stage leaves wallet untouched');
    },
  },
  {
    name: 'Fisherman’s Village exposes six reusable rod stations clear of every landmark-door cluster',
    run: () => {
      assertEqual(FISHERMANS_VILLAGE_ROD_TILE_INDICES.length, 6, 'six rod stations ship around the route');
      (['hatchery', 'habit', 'mystery', 'wisdom'] as const).forEach((expandedActiveStopId) => {
        const map = applyLandmarkDoorTiles(
          generateTileMap(16, getIslandRarity(16), 'fishermans-village', 2),
          { expandedActiveStopId },
        );
        FISHERMANS_VILLAGE_ROD_TILE_INDICES.forEach((index) => {
          assertEqual(map[index]?.signatureMissionKind, 'fishermans_rod', `tile ${index} remains a rod station`);
          assert(map[index]?.tileType !== 'landmark_door', `tile ${index} remains clear of ${expandedActiveStopId} doors`);
        });
      });
    },
  },
  {
    name: 'Every Fisherman’s Village rod landing equips the rod and immediately hooks a catch',
    run: () => {
      const first = collectFishermansVillageLanding({
        ledger: {}, islandNumber: 16, cycleIndex: 0,
        tileIndex: FISHERMANS_VILLAGE_ROD_TILE_INDICES[0], nowMs: 10, randomValue: 0.7,
      });
      assertEqual(first.rodCollected, true, 'first rod landing equips the reusable rod');
      assertEqual(first.pendingCatch?.kind, 'medium', 'first rod landing also starts the fishing sequence');
      const key = getIslandRunSignatureMissionKey(0, 16);
      const firstProgress = resolveFishermansVillageFishingProgress({ ledger: first.ledger, cycleIndex: 0 });
      const second = collectFishermansVillageLanding({
        ledger: { ...first.ledger, [key]: { ...firstProgress, pendingCatch: null } },
        islandNumber: 16, cycleIndex: 0,
        tileIndex: FISHERMANS_VILLAGE_ROD_TILE_INDICES[1], nowMs: 12, randomValue: 0.7,
      });
      assertEqual(second.rodCollected, false, 'later rod landings reuse the equipped rod');
      assertEqual(second.pendingCatch?.kind, 'medium', 'later rod landings start another fishing sequence');
      assertEqual(resolveFishermansVillageFishingProgress({ ledger: second.ledger, cycleIndex: 0 }).fishCaughtKg, 0, 'kilograms still wait for the reel action');
    },
  },
  {
    name: 'Fisherman’s Village celebrates a catch above the HUD then keeps only a mini bar below the reward bar',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const cssSource = fsMod.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      const worldSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island22FishermansVillageThreeWorld.ts', 'utf8');
      assert(boardSource.includes('className="fishermans-catch-celebration"'), 'successful catches render a foreground celebration');
      assert(boardSource.includes('className={`fishermans-fishing-mini'), 'caught progress renders as a compact reward-bar companion');
      assert(boardSource.includes('fishermansFishingProgress.fishCaughtKg > 0'), 'mini progress stays hidden until the player catches fish');
      assert(boardSource.includes("? '🎣 Rod ready—your first cast is already on the line!'"), 'the first rod landing opens the catch flow instead of stopping at a pickup message');
      assert(!boardSource.includes('four fish-marked shore tiles'), 'stale fish-tile guidance is removed');
      assert(!boardSource.includes('className="fishermans-fishing-meter"'), 'the old permanent board-overlay meter is removed');
      assert(!boardSource.includes('className="fishermans-fishing-modal__scene"'), 'the retired flat fishing scene cannot cover the 3D pond');
      assert(boardSource.includes('fishingInteraction: {'), 'the board publishes presentation-only fishing phases to the 3D runtime');
      assert(worldSource.includes('ISLAND_22_HERO_FISHERMAN') && worldSource.includes('ISLAND_22_HERO_CAUGHT_FISH'), 'the fisherman and caught fish are real world objects');
      assert(
        /\.fishermans-fishing-hud__layer\s*\{[\s\S]*?background:\s*transparent;/.test(cssSource),
        'the reel HUD preserves the live pond behind it',
      );
      assert(cssSource.includes('top: calc(100% + 7px)'), 'mini progress sits below the existing reward bar');
      assert(cssSource.includes('z-index: calc(var(--island-run-mission-overlay-z, 22000) + 20)'), 'catch celebration renders above modal and HUD layers');
    },
  },
  {
    name: 'Fisherman’s Village canonically clears an escaped fish without awarding kilograms',
    run: async () => {
      resetIslandRunRuntimeCommitCoordinatorForTests();
      __resetIslandRunActionMutexesForTests();
      __resetIslandRunStateStoreForTests();
      installWindowWithStorage(createMemoryStorage());
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);
      const prepared = collectFishermansVillageLanding({
        ledger: {}, islandNumber: 16, cycleIndex: 0,
        tileIndex: FISHERMANS_VILLAGE_ROD_TILE_INDICES[0], nowMs: 10, randomValue: 0.95,
      });
      await writeIslandRunGameStateRecord({
        session, client: null,
        record: { ...base, currentIslandNumber: 16, signatureMissionProgressByIsland: prepared.ledger },
      });
      refreshIslandRunStateFromLocal(session);
      const result = await releaseFishermansVillageCatch({ session, client: null, reason: 'escaped' });
      assertEqual(result.status, 'ok', 'escape is committed through the mission action boundary');
      const progress = resolveFishermansVillageFishingProgress({
        ledger: readIslandRunGameStateRecord(session).signatureMissionProgressByIsland,
        islandNumber: 16,
        cycleIndex: 0,
      });
      assertEqual(progress.pendingCatch, null, 'an escaped fish cannot reopen after reload');
      assertEqual(progress.fishCaughtKg, 0, 'escape awards no fish weight');
    },
  },
  {
    name: 'Fisherman’s Village colossal catch lands exactly on 78 kg and triggers the dragon once',
    run: async () => {
      resetIslandRunRuntimeCommitCoordinatorForTests();
      __resetIslandRunActionMutexesForTests();
      __resetIslandRunStateStoreForTests();
      installWindowWithStorage(createMemoryStorage());
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);
      const key = getIslandRunSignatureMissionKey(0, 16);
      const prepared = collectFishermansVillageLanding({
        ledger: {
          [key]: {
            missionId: 'fishermans-village-fishing', version: 1,
            rodCollectedAtMs: 1, castsCompleted: 4, successfulCatches: 4,
            fishCaughtKg: 46, pendingCatch: null, dragonTriggeredAtMs: null,
            repairCompletedAtMs: null, completedAtMs: null, updatedAtMs: 4,
          },
        },
        islandNumber: 16, cycleIndex: 0,
        tileIndex: FISHERMANS_VILLAGE_ROD_TILE_INDICES[1], nowMs: 5, randomValue: 0,
      });
      assertEqual(prepared.pendingCatch?.kind, 'colossal', 'fifth successful catch is the authored shock catch');
      assertEqual(prepared.pendingCatch?.kilograms, 32, 'colossal catch fills 46 to 78 exactly');
      assertEqual(prepared.pendingCatch?.pullsRequired, 10, 'the monster catch gets a full ten-pull tension sequence');
      await writeIslandRunGameStateRecord({
        session, client: null,
        record: { ...base, currentIslandNumber: 16, signatureMissionProgressByIsland: prepared.ledger },
      });
      refreshIslandRunStateFromLocal(session);
      const result = await reelFishermansVillageCatch({ session, client: null });
      assertEqual(result.status, 'ok', 'reel action commits the hooked fish');
      if (result.status !== 'ok') return;
      assertEqual(result.fishCaughtKg, 78, 'meter lands on the interruption threshold');
      assertEqual(result.dragonTriggered, true, 'threshold starts the dragon cinematic');
      const progress = resolveFishermansVillageFishingProgress({
        ledger: readIslandRunGameStateRecord(session).signatureMissionProgressByIsland,
        cycleIndex: 0,
      });
      assert(progress.dragonTriggeredAtMs !== null, 'dragon edge persists canonically');
      assertEqual(progress.pendingCatch, null, 'catch cannot be reeled twice');
    },
  },
  {
    name: 'Frostwell exposes exactly three stable drill tiles clear of landmark doors',
    run: () => {
      assertEqual(FROSTWELL_DRILL_TILE_INDICES.length, 3, 'exactly three mission tiles ship');
      const map = applyLandmarkDoorTiles(generateTileMap(3, getIslandRarity(3), 'frostmoon', 2), { expandedActiveStopId: 'hatchery' });
      FROSTWELL_DRILL_TILE_INDICES.forEach((index) => {
        assertEqual(map[index]?.signatureMissionKind, 'frostwell_drill', `tile ${index} carries drill marker`);
        assert(map[index]?.tileType !== 'landmark_door', `tile ${index} remains clear of a door cluster`);
      });
    },
  },
  {
    name: 'Frostwell grants one queued spin only for an Island 003 drill-tile landing',
    run: () => {
      const first = grantFrostwellDrillSpinForLanding({ ledger: {}, islandNumber: 3, cycleIndex: 0, tileIndex: FROSTWELL_DRILL_TILE_INDICES[0], nowMs: 10 });
      const progress = resolveFrostwellIceworksProgress({ ledger: first.ledger, islandNumber: 3, cycleIndex: 0 });
      assertEqual(first.granted, true, 'mission tile grants a spin');
      assertEqual(getFrostwellAvailableSpins(progress), 1, 'spin is queued');
      assertEqual(grantFrostwellDrillSpinForLanding({ ledger: first.ledger, islandNumber: 3, cycleIndex: 0, tileIndex: 2, nowMs: 11 }).granted, false, 'ordinary tile does not grant');
      assertEqual(grantFrostwellDrillSpinForLanding({ ledger: {}, islandNumber: 2, cycleIndex: 0, tileIndex: FROSTWELL_DRILL_TILE_INDICES[0], nowMs: 12 }).granted, false, 'other islands do not grant');
    },
  },
  {
    name: 'staged restoration routes are unique, collision-free, and correctly sized on every authored island',
    run: () => {
      [4, 6, 7, 8, 9, 18].forEach((islandNumber) => {
        const descriptor = getStagedRestorationMissionDescriptor(islandNumber);
        assert(Boolean(descriptor), `Island ${islandNumber} has a staged mission descriptor`);
        if (!descriptor) return;
        const indices = getStagedRestorationPickupTileIndices(islandNumber, 36);
        assertEqual(indices.length, descriptor.stageCount * descriptor.chargeCostPerStage, `Island ${islandNumber} has the required route objects`);
        assertEqual(new Set(indices).size, indices.length, `Island ${islandNumber} route objects are unique`);
        assertEqual(findIslandRunReservedTileCollisions({ tileCount: 36, tileIndices: indices }).length, 0, `Island ${islandNumber} route clears every reserved slot`);
      });
    },
  },
  {
    name: 'staged restoration route pity collects one object and cannot claim it twice',
    run: () => {
      const pickupTiles = getStagedRestorationPickupTileIndices(4, 36);
      const first = collectStagedRestorationPickupForRoute({
        ledger: {}, islandNumber: 4, cycleIndex: 0,
        landingTileIndex: 2, routeTileIndices: [0, pickupTiles[0], 2], tileCount: 36, nowMs: 10,
      });
      assertEqual(first.pickupCollected, 1, 'route pass secures one pickup');
      assertEqual(first.collectionKind, 'route_pass', 'pity source remains explicit');
      const second = collectStagedRestorationPickupForRoute({
        ledger: first.ledger, islandNumber: 4, cycleIndex: 0,
        landingTileIndex: pickupTiles[0], routeTileIndices: [pickupTiles[0]], tileCount: 36, nowMs: 20,
      });
      assertEqual(second.pickupCollected, 0, 'claimed pickup is idempotent');
      const progress = resolveStagedRestorationMissionProgress({ ledger: second.ledger, islandNumber: 4, cycleIndex: 0 });
      assertEqual(progress?.chargesEarned, 1, 'exactly one charge persists');
      assertEqual(progress?.claimedPickupTileIndices.length, 1, 'exactly one claim index persists');
    },
  },
  {
    name: 'staged restoration sanitizer and conflict merge preserve monotonic progress',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 8);
      const remote = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'great-pollination', claimed_pickup_tile_indices: [1, 8], charges_earned: 2, charges_spent: 1, activated_stages: 1, updated_at_ms: 10 },
      });
      const local = sanitizeIslandRunSignatureMissionProgress({
        [key]: { missionId: 'great-pollination', claimedPickupTileIndices: [8, 16, 25], chargesEarned: 3, chargesSpent: 2, activatedStages: 2, updatedAtMs: 20 },
      });
      const merged = mergeIslandRunSignatureMissionProgress(remote, local);
      const progress = resolveStagedRestorationMissionProgress({ ledger: merged, islandNumber: 8, cycleIndex: 0 });
      assertEqual(progress?.claimedPickupTileIndices.length, 4, 'claim sets merge by union');
      assertEqual(progress?.activatedStages, 2, 'highest committed stage wins');
      assertEqual(progress?.chargesSpent, 2, 'spent charges cannot regress');
    },
  },
  {
    name: 'staged restoration action spends the exact authored charge cost and cannot overspend',
    run: async () => {
      resetIslandRunRuntimeCommitCoordinatorForTests();
      __resetIslandRunActionMutexesForTests();
      __resetIslandRunStateStoreForTests();
      installWindowWithStorage(createMemoryStorage());
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);
      const key = getIslandRunSignatureMissionKey(base.cycleIndex, 4);
      await writeIslandRunGameStateRecord({
        session,
        client: null,
        record: {
          ...base,
          currentIslandNumber: 4,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'broken-causeway', version: 1,
              claimedPickupTileIndices: [1, 8], chargesEarned: 2, chargesSpent: 0,
              activatedStages: 0, lastActivatedStage: null, completedAtMs: null, updatedAtMs: 10,
            },
          },
        },
      });
      refreshIslandRunStateFromLocal(session);
      const first = await activateStagedRestorationMissionStage({ session, client: null });
      const second = await activateStagedRestorationMissionStage({ session, client: null });
      const after = readIslandRunGameStateRecord(session);
      const progress = resolveStagedRestorationMissionProgress({ ledger: after.signatureMissionProgressByIsland, islandNumber: 4, cycleIndex: 0 });
      assertEqual(first.status, 'ok', 'two Masonry Sparks raise one span');
      assertEqual(second.status, 'no_charges', 'repeat action cannot spend unavailable charges');
      assertEqual(progress?.activatedStages, 1, 'one stage persists');
      assertEqual(progress?.chargesSpent, 2, 'the descriptor cost is spent exactly once');
    },
  },
  {
    name: 'Living Compass commits the fifth seal and Emerald Zenith completion through the canonical action',
    run: async () => {
      resetIslandRunRuntimeCommitCoordinatorForTests();
      __resetIslandRunActionMutexesForTests();
      __resetIslandRunStateStoreForTests();
      installWindowWithStorage(createMemoryStorage());
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);
      const key = getIslandRunSignatureMissionKey(base.cycleIndex, 18);
      await writeIslandRunGameStateRecord({
        session,
        client: null,
        record: {
          ...base,
          currentIslandNumber: 18,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'jungle-expedition-living-compass',
              version: 1,
              claimedPickupTileIndices: [2, 9, 16, 25, 34],
              chargesEarned: 5,
              chargesSpent: 4,
              activatedStages: 4,
              lastActivatedStage: 4,
              completedAtMs: null,
              updatedAtMs: 10,
            },
          },
        },
      });
      refreshIslandRunStateFromLocal(session);
      const result = await activateStagedRestorationMissionStage({ session, client: null });
      const after = readIslandRunGameStateRecord(session);
      const progress = resolveStagedRestorationMissionProgress({
        ledger: after.signatureMissionProgressByIsland,
        islandNumber: 18,
        cycleIndex: base.cycleIndex,
      });
      assertEqual(result.status, 'ok', 'the fifth Wayfinder Glyph activates through the action mutex');
      assertEqual(progress?.activatedStages, 5, 'all five Living Compass seals persist');
      assertEqual(progress?.chargesSpent, 5, 'the finale spends exactly one authored glyph charge');
      assert(progress?.completedAtMs !== null, 'Emerald Zenith completion receives a canonical timestamp');
    },
  },
  {
    name: 'Frostwell final wheel spin reaches 500m and commissions the fishery immediately without an Essence charge',
    run: async () => {
      await seedFrostwell({ meters: 470, spinsEarned: 2 });
      const result = await spinFrostwellDrillWheel({ session: makeSession(), client: null, random: () => 0.999 });
      const after = readIslandRunGameStateRecord(makeSession());
      const progress = resolveFrostwellIceworksProgress({ ledger: after.signatureMissionProgressByIsland, islandNumber: 3, cycleIndex: 0 });
      assertEqual(result.status, 'ok', 'queued spin resolves');
      if (result.status !== 'ok') return;
      assertEqual(result.wheelMeters, 75, 'authoritative wheel segment is selected in action');
      assertEqual(result.meters, 30, 'award is clipped to remaining depth');
      assertEqual(progress.metersDrilled, 500, 'depth caps at target');
      assertEqual(progress.spinsUsed, 1, 'exactly one credit is consumed');
      assertEqual(result.commissioned, true, 'the final drill result reports immediate commissioning');
      assert(progress.builtAtMs !== null && result.builtAtMs !== null, 'the same canonical commit persists the operating timestamp');
      assertEqual(after.essence, 1_500, 'automatic commissioning does not charge a second Essence gate');
      assertEqual(after.essenceLifetimeSpent, 20, 'automatic commissioning leaves lifetime Essence spend unchanged');
    },
  },
  {
    name: 'Frostwell wheel rejects play without a queued drill-tile spin',
    run: async () => {
      await seedFrostwell({ meters: 200, spinsEarned: 0 });
      const result = await spinFrostwellDrillWheel({ session: makeSession(), client: null, random: () => 0 });
      assertEqual(result.status, 'no_spins', 'wheel is gameplay gated');
      assertEqual(resolveFrostwellIceworksProgress({ ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland, islandNumber: 3, cycleIndex: 0 }).metersDrilled, 200, 'blocked spin does not mutate depth');
    },
  },
  {
    name: 'Frostwell progress is cycle-scoped and conflict merge is monotonic',
    run: () => {
      const firstKey = getIslandRunSignatureMissionKey(0, 3);
      const secondKey = getIslandRunSignatureMissionKey(1, 3);
      const record = (meters: number, spins: number, updatedAtMs: number, builtAtMs: number | null = null) => ({ missionId: 'frostwell-iceworks' as const, version: 2 as const, metersDrilled: meters, spinsEarned: spins, spinsUsed: 0, lastSpinMeters: 20, builtAtMs, updatedAtMs });
      const merged = mergeIslandRunSignatureMissionProgress(
        { [firstKey]: record(200, 3, 8) },
        { [firstKey]: record(320, 5, 50, 50), [secondKey]: record(15, 1, 60) },
      );
      const firstProgress = resolveFrostwellIceworksProgress({ ledger: merged, islandNumber: 3, cycleIndex: 0 });
      const secondProgress = resolveFrostwellIceworksProgress({ ledger: merged, islandNumber: 3, cycleIndex: 1 });
      assertEqual(firstProgress.metersDrilled, 320, 'highest depth wins');
      assertEqual(firstProgress.builtAtMs, 50, 'built state is preserved');
      assertEqual(secondProgress.metersDrilled, 15, 'next cycle remains separate');
    },
  },
  {
    name: 'Frostwell sanitizer migrates the 50m draft and auto-commissions existing 500m saves',
    run: () => {
      const sanitized = sanitizeIslandRunSignatureMissionProgress({
        '0:3': { rolls_completed: 20, built_at_ms: -4, updated_at_ms: 9 },
        '1:3': { meters_drilled: 500, updated_at_ms: 12 },
        bad: 'nope',
      });
      const progress = resolveFrostwellIceworksProgress({ ledger: sanitized, islandNumber: 3, cycleIndex: 0 });
      const completed = resolveFrostwellIceworksProgress({ ledger: sanitized, islandNumber: 3, cycleIndex: 1 });
      assertEqual(progress.metersDrilled, 50, 'legacy draft preserves actual drilled metres');
      assertEqual(progress.builtAtMs, 0, 'timestamps are normalized');
      assertEqual(completed.builtAtMs, 12, 'an existing 500m save becomes operating without a funding tap');
      assertEqual(resolveFrostwellSpinMeters(0.999), 75, 'wheel edge maps to final segment');
    },
  },
];
