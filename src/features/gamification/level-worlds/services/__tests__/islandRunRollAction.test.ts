import {
  __resetIslandRunRollActionMutexesForTests,
  executeIslandRunRollAction,
} from '../islandRunRollAction';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  getIslandRunStateSnapshot,
  resetIslandRunStateSnapshot,
} from '../islandRunStateStore';
import { getTrafficLightCharge, TRAFFIC_LIGHT_TILE_INDEX } from '../islandRunTrafficLightTile';
import {
  CELESTIAL_REDOCKING_ROLL_TARGET,
  FROSTWELL_DRILL_TILE_INDICES,
  FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES,
  FISHERMANS_VILLAGE_ROD_TILE_INDICES,
  ROOTHEART_POWER_COMPONENTS,
  SUNKEN_SANDS_FIRST_TREASURE_ID,
  getIslandRunSignatureMissionKey,
  resolveFrostwellIceworksProgress,
  resolveFirstLightAssemblyCraterProgress,
  resolveFishermansVillageFishingProgress,
  resolveCactusCanyonSpiralProgress,
  resolveCelestialRedockingProgress,
  resolveRootheartPowerworksProgress,
  resolveSunkenSandsTreasureProgress,
} from '../islandRunSignatureMissions';
import { getIslandRunLivingTicketBeatId, ISLAND_RUN_LIVING_TICKET_REGROW_MS } from '../islandRunLivingTicket';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'roll-action-test-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      user_metadata: {},
    },
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetEnvironment(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunRollActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

function seedState(overrides: Partial<IslandRunGameStateRecord>): void {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const next = { ...base, ...overrides };
  // Persist synchronously via the store helper (local-only path since client=null).
  void writeIslandRunGameStateRecord({
    session,
    client: null,
    record: next,
  });
  resetIslandRunStateSnapshot(session, next);
}

async function withMockedRandom<T>(values: number[], run: () => Promise<T>): Promise<T> {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0;
    index += 1;
    return value;
  };
  try {
    return await run();
  } finally {
    Math.random = originalRandom;
  }
}

export const islandRunRollActionTests: TestCase[] = [
  {
    name: 'Island 001 landing collects one finite Assembly Crater charge in the canonical roll commit',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 34,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'first_roll_consumed',
      });
      assertEqual(FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES[0], 0, 'fixture lands on the first authored cache');
      const first = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(first.newTokenIndex, 0, 'two steps wrap onto the first dynamite tile');
      assertEqual(first.firstLightAssemblyDynamiteCollected, 1, 'landing surfaces one collected charge');
      const firstProgress = resolveFirstLightAssemblyCraterProgress({
        ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland,
        islandNumber: 1,
        cycleIndex: 0,
      });
      assertEqual(firstProgress.claimedDynamiteTileIndices.length, 1, 'pickup persists atomically with movement');

      seedState({ tokenIndex: 34, dicePool: 30 });
      const duplicate = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(duplicate.firstLightAssemblyDynamiteCollected, 0, 'revisiting the emptied cache cannot pay twice');
    },
  },
  {
    name: 'Island 001 first replay roll secures one crossed Assembly cache when the final tile is not dynamite',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 0,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'first_roll_consumed',
      });
      const result = await withMockedRandom([0.2, 0.2], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(result.newTokenIndex, 4, 'two twos finish on the non-cache tile 4');
      assertEqual(result.firstLightAssemblyDynamiteCollected, 1, 'the first roll secures one reached route cache');
      assertEqual(result.firstLightAssemblyDynamiteCollectionKind, 'route_pass', 'the renderer can explain the en-route pickup');
      const progress = resolveFirstLightAssemblyCraterProgress({
        ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland,
        islandNumber: 1,
        cycleIndex: 0,
      });
      assertEqual(progress.claimedDynamiteTileIndices.length, 1, 'the route pickup commits atomically with movement');
      assertEqual(progress.claimedDynamiteTileIndices[0], 1, 'only the first crossed cache is consumed');
    },
  },
  {
    name: 'Island 002 roll action persists the twentieth re-docking turn and emits the fourth lock once',
    run: async () => {
      resetEnvironment();
      const key = getIslandRunSignatureMissionKey(0, 2);
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 0,
        currentIslandNumber: 2,
        cycleIndex: 0,
        signatureMissionProgressByIsland: {
          [key]: {
            missionId: 'celestial-great-redocking',
            version: 1,
            rollsCompleted: 19,
            completedAtMs: null,
            updatedAtMs: 1,
          },
        },
      });
      const result = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(result.status, 'ok', 'roll succeeds');
      assertEqual(result.celestialRedockingRollsCompleted, CELESTIAL_REDOCKING_ROLL_TARGET, 'twentieth turn is returned');
      assertEqual(result.celestialRedockingDockedPlatformIndex, 3, 'fourth platform lock edge is returned');
      assertEqual(result.celestialRedockingBecameComplete, true, 'twentieth turn completes the mission');
      const progress = resolveCelestialRedockingProgress({
        ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland,
        islandNumber: 2,
        cycleIndex: 0,
      });
      assertEqual(progress.rollsCompleted, CELESTIAL_REDOCKING_ROLL_TARGET, 'mission persists inside the canonical roll commit');

      seedState({ tokenIndex: 2, dicePool: 30 });
      const repeat = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(repeat.celestialRedockingDockedPlatformIndex, null, 'later rolls cannot replay a docking lock');
      assertEqual(repeat.celestialRedockingBecameComplete, false, 'completion edge is idempotent');
    },
  },
  {
    name: 'Island 012 successful rolls advance the hinged treasure chamber exactly once',
    run: async () => {
      resetEnvironment();
      const key = getIslandRunSignatureMissionKey(0, 12);
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 0,
        currentIslandNumber: 12,
        cycleIndex: 0,
        signatureMissionProgressByIsland: {
          [key]: {
            missionId: 'sunken-sands-first-treasure',
            version: 1,
            treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
            rollsCompleted: 19,
            revealedAtMs: null,
            claimedAtMs: null,
            updatedAtMs: 1,
          },
        },
      });
      const result = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(result.status, 'ok', 'roll succeeds');
      assertEqual(result.sunkenSandsTreasureRollsCompleted, 20, 'one roll advances one final chamber turn');
      assertEqual(result.sunkenSandsTreasureBecameReady, true, 'twentieth roll emits the ready edge');
      const progress = resolveSunkenSandsTreasureProgress({
        ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland,
        islandNumber: 12,
        cycleIndex: 0,
      });
      assertEqual(progress.rollsCompleted, 20, 'twentieth turn persists atomically with movement');

      seedState({ tokenIndex: 2, dicePool: 30 });
      const repeat = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(repeat.sunkenSandsTreasureRollsCompleted, 20, 'later rolls stay capped');
      assertEqual(repeat.sunkenSandsTreasureBecameReady, false, 'ready edge does not repeat');
    },
  },
  {
    name: 'single ×1 roll: deducts 1 die, bumps runtimeVersion, returns newDicePool / hopSequence',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 0 });

      const result = await executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 1,
      });

      assertEqual(result.status, 'ok', 'Roll should succeed with 30 dice');
      assert(result.total !== undefined && result.total >= 2 && result.total <= 12, 'Total must be in [2,12]');
      assertEqual(result.diceCost, 1, 'Flat ×1 cost = 1 die');
      assertEqual(result.newDicePool, 29, 'Pool should be 30 - 1 = 29');
      assertEqual(result.newRuntimeVersion, 6, 'runtimeVersion should bump exactly once');
      assert(Array.isArray(result.hopSequence) && result.hopSequence.length === result.total, 'hopSequence length equals total');
      assertEqual(result.hopSequence![result.hopSequence!.length - 1], result.newTokenIndex ?? -1, 'Last hop equals newTokenIndex');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 29, 'Persisted pool mirrors service result');
      assertEqual(persisted.runtimeVersion, 6, 'Persisted runtimeVersion mirrors service result');
      assertEqual(persisted.tokenIndex, result.newTokenIndex!, 'Persisted token index mirrors service result');
    },
  },
  {
    name: 'roll starts from canonical snapshot when localStorage is overwritten by a stale background writer',
    run: async () => {
      resetEnvironment();
      const session = makeSession();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 5 });

      const canonicalPostRoll = {
        ...readIslandRunGameStateRecord(session),
        runtimeVersion: 6,
        dicePool: 29,
        tokenIndex: 9,
      };
      resetIslandRunStateSnapshot(session, canonicalPostRoll);

      // Reproduce the production race: an older in-flight background snapshot
      // finishes after the first roll and replaces only localStorage.
      void writeIslandRunGameStateRecord({
        session,
        client: null,
        record: { ...canonicalPostRoll, dicePool: 30, tokenIndex: 5 },
        triggerSource: 'test_stale_background_collection_write',
      });

      const secondRoll = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session, client: null, diceMultiplier: 1 }),
      );

      assertEqual(secondRoll.status, 'ok', 'second roll should succeed');
      assertEqual(secondRoll.newDicePool, 28, 'second roll must deduct from the canonical 29 dice');
      assertEqual(secondRoll.newTokenIndex, 11, 'second roll must start from canonical tile 9');
      assertEqual(getIslandRunStateSnapshot(session).tokenIndex, 11, 'roll result is published canonically');
    },
  },
  {
    name: 'first halfway crossing emits one cycle-scoped diplomatic briefing and persists its seen beat',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 14,
        currentIslandNumber: 2,
        cycleIndex: 0,
        narrativeSeenState: { beats: {}, episodes: {} },
      });

      const firstCrossing = await withMockedRandom([0.2, 0.2], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );
      assertEqual(firstCrossing.newTokenIndex, 18, '2 + 2 crosses the canonical halfway tile');
      assertEqual(firstCrossing.missionBriefingTrigger?.beatId, 'MISSION-BRIEFING-C0-I002', 'briefing identifies this island visit');
      assert(
        typeof readIslandRunGameStateRecord(makeSession()).narrativeSeenState.beats['MISSION-BRIEFING-C0-I002'] === 'number',
        'briefing seen marker is committed atomically with the roll',
      );

      seedState({ tokenIndex: 16, dicePool: 30 });
      const repeatedCrossing = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );
      assertEqual(repeatedCrossing.missionBriefingTrigger, null, 'later crossing in the same island cycle never repeats the briefing');

      seedState({ tokenIndex: 16, dicePool: 30, cycleIndex: 1 });
      const nextCycle = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );
      assertEqual(nextCycle.missionBriefingTrigger?.beatId, 'MISSION-BRIEFING-C1-I002', 'a new 120-island cycle receives a fresh briefing');
    },
  },
  {
    name: 'Island 1 first-cycle Central Command onboarding suppresses the generic halfway briefing',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 16,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'first_roll_consumed',
        narrativeSeenState: { beats: {}, episodes: {} },
      });
      const result = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );
      assertEqual(result.newTokenIndex, 18, 'test crosses the halfway tile');
      assertEqual(result.missionBriefingTrigger, null, 'existing Island 1 Central Command flow remains the only briefing');
    },
  },
  {
    name: 'living ticket pays once, remains dormant, then regrows through canonical roll state',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 26,
        currentIslandNumber: 2,
        cycleIndex: 0,
        minigameTicketsByEvent: {},
        narrativeSeenState: { beats: {}, episodes: {} },
      });

      const firstPickup = await withMockedRandom([0.2, 0.2, 0.99], () => executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 1,
        activeTimedEventId: 'rootheart_festival',
      }));
      assertEqual(firstPickup.newTokenIndex, 30, 'roll lands on the canonical 85% ticket tile');
      assertEqual(firstPickup.livingTicketPickup?.applied, 3, 'empty event wallet receives the seeded high grant');
      assertEqual(readIslandRunGameStateRecord(makeSession()).minigameTicketsByEvent.rootheart_festival, 3, 'ticket grant commits with movement');

      seedState({ tokenIndex: 26, dicePool: 30 });
      const dormantLanding = await withMockedRandom([0.2, 0.2, 0], () => executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 1,
        activeTimedEventId: 'rootheart_festival',
      }));
      assertEqual(dormantLanding.livingTicketPickup, null, 'a dormant ticket cannot double-pay');
      assertEqual(readIslandRunGameStateRecord(makeSession()).minigameTicketsByEvent.rootheart_festival, 3, 'dormant landing preserves the wallet');

      const beforeRegrow = readIslandRunGameStateRecord(makeSession());
      const beatId = getIslandRunLivingTicketBeatId(0, 2);
      seedState({
        tokenIndex: 26,
        dicePool: 30,
        narrativeSeenState: {
          episodes: { ...beforeRegrow.narrativeSeenState.episodes },
          beats: {
            ...beforeRegrow.narrativeSeenState.beats,
            [beatId]: Date.now() - ISLAND_RUN_LIVING_TICKET_REGROW_MS - 1000,
          },
        },
      });
      const regrownLanding = await withMockedRandom([0.2, 0.2, 0], () => executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 1,
        activeTimedEventId: 'rootheart_festival',
      }));
      assertEqual(regrownLanding.livingTicketPickup?.applied, 1, 'fully regrown bud becomes collectible again');
      assertEqual(readIslandRunGameStateRecord(makeSession()).minigameTicketsByEvent.rootheart_festival, 4, 'regrown pickup composes with the existing event wallet');
    },
  },
  {
    name: 'Island 003 landing on a drill tile grants one Frostwell spin even with a high multiplier',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 30, tokenIndex: FROSTWELL_DRILL_TILE_INDICES[0] - 2, currentIslandNumber: 3, cycleIndex: 0 });
      const result = await withMockedRandom([0, 0], () => executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 5 }));
      assertEqual(result.status, 'ok', 'roll succeeds');
      assertEqual(result.frostwellSpinGranted, true, 'mission landing is surfaced to presentation');
      const state = readIslandRunGameStateRecord(makeSession());
      assertEqual(resolveFrostwellIceworksProgress({ ledger: state.signatureMissionProgressByIsland, islandNumber: 3, cycleIndex: 0 }).spinsEarned, 1, 'landing grants exactly one spin');
    },
  },
  {
    name: 'Island 003 ordinary landing does not passively advance Frostwell',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 30, tokenIndex: 0, currentIslandNumber: 3, cycleIndex: 0 });
      const result = await withMockedRandom([0, 0], () => executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }));
      assertEqual(result.frostwellSpinGranted, false, 'ordinary landing grants nothing');
      const state = readIslandRunGameStateRecord(makeSession());
      assertEqual(resolveFrostwellIceworksProgress({ ledger: state.signatureMissionProgressByIsland, islandNumber: 3, cycleIndex: 0 }).spinsEarned, 0, 'mission remains unchanged');
    },
  },
  {
    name: 'Island 016 rod landing equips the rod and persists a hooked catch in the same roll',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: FISHERMANS_VILLAGE_ROD_TILE_INDICES[0] - 2,
        currentIslandNumber: 16,
        cycleIndex: 0,
      });
      const rod = await withMockedRandom([0, 0, 0.7], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(rod.fishermansVillageRodCollected, true, 'roll result surfaces the rod pickup');
      assertEqual(rod.fishermansVillagePendingCatch?.kind, 'medium', 'the same landing starts the fishing sequence');
      const afterRod = readIslandRunGameStateRecord(makeSession());
      const rodProgress = resolveFishermansVillageFishingProgress({ ledger: afterRod.signatureMissionProgressByIsland, cycleIndex: 0 });
      assert(rodProgress.rodCollectedAtMs !== null, 'rod pickup persists with movement');
      assertEqual(rodProgress.pendingCatch?.kind, 'medium', 'hooked catch survives reload until the player reels');
      assertEqual(rodProgress.fishCaughtKg, 0, 'landing alone cannot award kilograms');
    },
  },
  {
    name: 'Island 013 mission briefing unlocks and collects canonical Canyon Spiral dynamite',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 17,
        currentIslandNumber: 13,
        cycleIndex: 0,
      });
      const result = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(result.newTokenIndex, 19, 'roll crosses the briefing trigger and lands on a dynamite cache');
      assertEqual(result.cactusCanyonDynamiteCollected, 1, 'landing emits the exact dynamite pickup quantity');
      const progress = resolveCactusCanyonSpiralProgress({
        ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland,
        islandNumber: 13,
        cycleIndex: 0,
      });
      assertEqual(progress.startedAtMs !== null, true, 'briefing starts the mission in the same canonical roll');
      assertEqual(progress.dynamiteEarned, 1, 'dynamite persists atomically with movement');
    },
  },
  {
    name: 'Island 013 existing briefing saves unlock dynamite after the v2 mission migration',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 17,
        currentIslandNumber: 13,
        cycleIndex: 0,
        narrativeSeenState: { episodes: {}, beats: { 'MISSION-BRIEFING-C0-I013': 1 } },
      });
      const result = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(result.missionBriefingTrigger, null, 'the existing briefing does not repeat');
      assertEqual(result.cactusCanyonDynamiteCollected, 1, 'the migrated save can immediately collect its route cache');
      const progress = resolveCactusCanyonSpiralProgress({
        ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland,
        islandNumber: 13,
        cycleIndex: 0,
      });
      assertEqual(progress.startedAtMs !== null, true, 'the mission start timestamp is repaired canonically');
    },
  },
  {
    name: 'Island 010 final Powerworks cache emits one exact build-unlocked edge',
    run: async () => {
      resetEnvironment();
      const key = getIslandRunSignatureMissionKey(0, 10);
      const finalComponent = ROOTHEART_POWER_COMPONENTS[ROOTHEART_POWER_COMPONENTS.length - 1];
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: finalComponent.tileIndex - 2,
        currentIslandNumber: 10,
        cycleIndex: 0,
        signatureMissionProgressByIsland: {
          [key]: {
            missionId: 'rootheart-powerworks',
            version: 1,
            collectedComponentIds: ROOTHEART_POWER_COMPONENTS.slice(0, -1).map((component) => component.id),
            buildStage: 0,
            essenceSpent: 0,
            activatedAtMs: null,
            updatedAtMs: 1,
          },
        },
      });

      const finalPickup = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(finalPickup.newTokenIndex, finalComponent.tileIndex, 'roll lands on the final component cache');
      assertEqual(finalPickup.rootheartPowerComponentPickup, finalComponent.id, 'the final named component is surfaced');
      assertEqual(finalPickup.rootheartPowerworksUnlocked, true, 'the exact completion landing emits the auto-open edge');
      const progress = resolveRootheartPowerworksProgress({
        ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland,
        islandNumber: 10,
        cycleIndex: 0,
      });
      assertEqual(progress.collectedComponentIds.length, ROOTHEART_POWER_COMPONENTS.length, 'all eight parts persist atomically');

      seedState({ tokenIndex: finalComponent.tileIndex - 2, dicePool: 30 });
      const repeat = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(), client: null, diceMultiplier: 1,
      }));
      assertEqual(repeat.rootheartPowerComponentPickup, null, 'repeat landing cannot recollect the component');
      assertEqual(repeat.rootheartPowerworksUnlocked, false, 'repeat landing cannot reopen the modal edge');
    },
  },
  {
    name: '×3 roll: cost scales with multiplier (1 × 3 = 3)',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 50, tokenIndex: 0 });

      const result = await executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 3,
      });

      assertEqual(result.status, 'ok', 'Should succeed with 50 dice at ×3');
      assertEqual(result.diceCost, 3, '×3 cost = 1 × 3 = 3');
      assertEqual(result.newDicePool, 47, 'Pool should be 50 - 3 = 47');
    },
  },
  {
    name: '×200 roll: cost remains multiplier-based (1 × 200 = 200)',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 2_500, tokenIndex: 0 });

      const result = await executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 200,
      });

      assertEqual(result.status, 'ok', 'Should succeed with 2500 dice at ×200');
      assertEqual(result.diceCost, 200, '×200 cost = 1 × 200 = 200');
      assertEqual(result.newDicePool, 2_300, 'Pool should be 2500 - 200 = 2300');
    },
  },
  {
    name: 'traffic-light traversal charges atomically, unlocks once at 8, then starts a fresh cycle',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 5,
        dicePool: 30,
        tokenIndex: TRAFFIC_LIGHT_TILE_INDEX - 1,
        currentIslandNumber: 2,
        bonusTileChargeByIsland: { '2': { [TRAFFIC_LIGHT_TILE_INDEX]: 6 } },
      });

      const passSeven = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );
      assertEqual(passSeven.trafficLightPass?.chargeAfter, 7, 'First traversal advances 6 → 7');
      assertEqual(passSeven.trafficLightPass?.unlocked, false, '7/8 must not unlock the reward');
      assertEqual(
        getTrafficLightCharge(readIslandRunGameStateRecord(makeSession()).bonusTileChargeByIsland, 2),
        7,
        '7/8 is persisted in the same record as the roll',
      );

      seedState({ tokenIndex: TRAFFIC_LIGHT_TILE_INDEX - 1 });
      const unlock = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );
      assertEqual(unlock.trafficLightPass?.chargeAfter, 8, 'Next traversal reaches the final green light');
      assertEqual(unlock.trafficLightPass?.unlocked, true, 'Only 8/8 unlocks the modal');
      assertEqual(
        getTrafficLightCharge(readIslandRunGameStateRecord(makeSession()).bonusTileChargeByIsland, 2),
        0,
        'Unlock resets the persisted counter',
      );

      seedState({ tokenIndex: TRAFFIC_LIGHT_TILE_INDEX - 1 });
      const freshCycle = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );
      assertEqual(freshCycle.trafficLightPass?.chargeAfter, 1, 'The pass after a reward starts again at red 1/8');
      assertEqual(freshCycle.trafficLightPass?.unlocked, false, 'Fresh cycle does not reopen the reward');
    },
  },
  {
    name: 'insufficient_dice: roll blocked when pool < effective cost (×5 on 4 dice)',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 4, tokenIndex: 0 });

      const result = await executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 5,
      });

      assertEqual(result.status, 'insufficient_dice', 'Needs 5 dice for ×5 but only has 4');
      assertEqual(result.diceCost, undefined, 'No cost reported on blocked roll');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 4, 'Pool unchanged on blocked roll');
      assertEqual(persisted.runtimeVersion, 0, 'runtimeVersion unchanged on blocked roll');
    },
  },

  {
    name: 'roll from regen cap resets regen anchor to prevent instant refill loop',
    run: async () => {
      resetEnvironment();
      const preRollNow = 1_000_000;
      const oldAnchor = preRollNow - (3 * 60 * 60 * 1000); // 3h of banked elapsed time
      seedState({
        runtimeVersion: 1,
        dicePool: 30,
        tokenIndex: 0,
        diceRegenState: {
          maxDice: 30,
          regenRatePerHour: 7.5,
          lastRegenAtMs: oldAnchor,
        },
      });

      const originalNow = Date.now;
      Date.now = () => preRollNow;
      try {
        const result = await executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 10 });
        assertEqual(result.status, 'ok', 'Roll should succeed at ×10 from 30 dice');
      } finally {
        Date.now = originalNow;
      }

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 20, 'Pool should be 30 - 10 = 20 after roll');
      assertEqual(
        persisted.diceRegenState?.lastRegenAtMs,
        preRollNow,
        'Regen anchor should reset to roll time when spending down from cap',
      );
    },
  },
  {
    name: 'concurrency: two rolls fired in parallel serialise (final state = sequential application)',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 10, dicePool: 30, tokenIndex: 0 });

      // Fire both rolls without awaiting in between — this is the race case P0-1
      // specifically calls out. Without the mutex, both calls would read the
      // same pre-state (dicePool=30, runtimeVersion=10), both write
      // runtimeVersion=11, and one roll's delta would drop silently.
      const pA = executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });
      const pB = executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });
      const [a, b] = await Promise.all([pA, pB]);

      assertEqual(a.status, 'ok', 'First roll ok');
      assertEqual(b.status, 'ok', 'Second roll ok');

      // Ordering guarantees: the second roll observed the first roll's commit.
      assertEqual(a.newRuntimeVersion, 11, 'First roll bumps runtimeVersion 10 → 11');
      assertEqual(b.newRuntimeVersion, 12, 'Second roll bumps runtimeVersion 11 → 12 (NOT 11)');
      assertEqual(a.newDicePool, 29, 'First roll pool: 30 → 29');
      assertEqual(b.newDicePool, 28, 'Second roll pool: 29 → 28 (NOT 29)');

      // Final persisted state matches the strictly-sequential application.
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.runtimeVersion, 12, 'Final runtimeVersion reflects both rolls');
      assertEqual(persisted.dicePool, 28, 'Final pool reflects both dice deductions');
      assertEqual(persisted.tokenIndex, b.newTokenIndex!, 'Final token index = second roll result');

      // The second roll's starting token index must equal the first roll's end —
      // proves the second call's read observed the first call's commit.
      const firstRollEnd = a.newTokenIndex!;
      const secondRollEnd = b.newTokenIndex!;
      // Replay the second roll's hop math manually and confirm the chain.
      // hopSequence[0] is the first tile visited by roll B; it must equal
      // firstRollEnd + 1 (mod tileCount). We don't assume tileCount here, but
      // we can assert the chain length matches the total.
      assertEqual(b.hopSequence!.length, b.total!, 'Second roll hop length matches total');
      assert(secondRollEnd !== undefined, 'Second roll produced a token index');
      assert(firstRollEnd !== secondRollEnd || b.total === 40, 'Second roll moved the token from first roll end');
    },
  },
  {
    name: 'concurrency: five parallel rolls apply sequentially with no dropped deltas',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 100, tokenIndex: 0 });

      const rolls = await Promise.all(
        Array.from({ length: 5 }, () =>
          executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
        ),
      );

      // Every roll succeeded.
      rolls.forEach((r, i) => assertEqual(r.status, 'ok', `Roll ${i} ok`));

      // runtimeVersion monotonically increases 1..5 across the serialised batch.
      const versions = rolls.map((r) => r.newRuntimeVersion!).sort((a, b) => a - b);
      for (let i = 0; i < versions.length; i += 1) {
        assertEqual(versions[i], i + 1, `Roll ${i} bumped version to ${i + 1}`);
      }

      // Every roll burned exactly 1 die.
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 100 - 5 * 1, 'Pool decremented by exactly 5 × 1 = 5 dice');
      assertEqual(persisted.runtimeVersion, 5, 'Final runtimeVersion = 5');
    },
  },
  {
    name: 'first-session tutorial roll: awaiting first roll lands deterministically on a visible Concord fragment',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 2,
        dicePool: 30,
        tokenIndex: 2,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'awaiting_first_roll',
      });

      const result = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );

      assertEqual(result.status, 'ok', 'Tutorial roll should succeed');
      assertEqual(result.total, 4, 'Token index 2 should target the visible fragment at tile 6');
      assertEqual(result.dieOne, 1, 'Deterministic total still returns a normal die face');
      assertEqual(result.dieTwo, 3, 'Deterministic total still returns a normal die face');
      assertEqual(result.newTokenIndex, 6, 'Roll lands on the fixed Island 1 fragment tile');
      assertEqual(result.hopSequence?.length, 4, 'Movement still uses normal hop pipeline');
      assertEqual(result.concordFragmentPickup?.fragmentSlot, 1, 'The first visible Concord fragment is selected');
      assertEqual(result.ordinaryTileGameplayActive, false, 'Ordinary tile play stays dormant until the follow-up order');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(
        persisted.firstSessionTutorialState,
        'awaiting_first_roll',
        'The roll stays recoverable until the fragment collection action commits the pickup',
      );
    },
  },
  {
    name: 'first-session tutorial roll: first-fragment state waits for the follow-up order',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 2,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'awaiting_first_roll',
      });

      const first = await executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });
      assertEqual(first.status, 'ok', 'Initial tutorial roll should succeed');
      assertEqual(first.total, 4, 'Initial tutorial roll targets the fragment');

      seedState({ firstSessionTutorialState: 'first_fragment_collected' });

      const second = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );
      assertEqual(second.status, 'tutorial_order_required', 'Follow-up roll waits for Central Command');
      assertEqual(second.total, undefined, 'Blocked follow-up does not roll dice');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(
        persisted.firstSessionTutorialState,
        'first_fragment_collected',
        'Follow-up roll should wait for the diplomatic-order acknowledgement',
      );
    },
  },
  {
    name: 'first-session tutorial roll: incoming first order blocks canonical roll execution',
    run: async () => {
      resetEnvironment();
      seedState({
        dicePool: 30,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'awaiting_first_orders',
      });
      const result = await executeIslandRunRollAction({ session: makeSession(), client: null });
      assertEqual(result.status, 'tutorial_order_required', 'Roll must wait for the explicit Read action');
      assertEqual(readIslandRunGameStateRecord(makeSession()).dicePool, 30, 'Blocked roll spends no dice');
    },
  },
  {
    name: 'first-session tutorial roll: non-tutorial players use normal random dice',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 2,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'not_started',
      });

      const result = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );

      assertEqual(result.status, 'ok', 'Roll should succeed');
      assertEqual(result.total, 2, 'Non-tutorial roll should use normal random dice');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.firstSessionTutorialState, 'not_started', 'Non-tutorial state should not advance');
    },
  },
  {
    name: 'first-session tutorial roll: players outside Island 1 use normal random dice',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        dicePool: 30,
        tokenIndex: 2,
        currentIslandNumber: 2,
        cycleIndex: 0,
        firstSessionTutorialState: 'awaiting_first_roll',
      });

      const result = await withMockedRandom([0, 0], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );

      assertEqual(result.status, 'ok', 'Roll should succeed');
      assertEqual(result.total, 2, 'Non-Island 1 roll should use normal random dice');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(
        persisted.firstSessionTutorialState,
        'awaiting_first_roll',
        'Non-Island 1 roll should not consume first-roll tutorial state',
      );
    },
  },
  {
    name: 'first Creature Pack trigger: post-roll low dice advances eligible tutorial state',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 4,
        dicePool: 6,
        tokenIndex: 2,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'hatchery_l1_celebrated',
      });

      const result = await executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });

      assertEqual(result.status, 'ok', 'Roll should succeed');
      assertEqual(result.newDicePool, 5, 'Roll should bring dice to the low-dice threshold');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(
        persisted.firstSessionTutorialState,
        'first_creature_pack_available',
        'Post-roll low dice should make the first Creature Pack available',
      );
      assertEqual(persisted.dicePool, 5, 'Creature Pack trigger should not grant dice during the roll commit');
      assertEqual(persisted.runtimeVersion, 5, 'Roll and tutorial trigger should commit once');
    },
  },
  {
    name: 'first Creature Pack trigger: post-roll low dice does not fire outside tutorial gate',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 4,
        dicePool: 6,
        tokenIndex: 2,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'not_started',
      });

      const result = await executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });

      assertEqual(result.status, 'ok', 'Roll should succeed');
      assertEqual(result.newDicePool, 5, 'Roll should bring dice to the low-dice threshold');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(
        persisted.firstSessionTutorialState,
        'not_started',
        'Non-tutorial players should not trigger the first Creature Pack',
      );
    },
  },
  {
    name: 'Island 1 roll persists Concord pacing and returns a resonance pickup',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 2,
        dicePool: 30,
        tokenIndex: 0,
        currentIslandNumber: 1,
        cycleIndex: 0,
        firstSessionTutorialState: 'complete',
        techCollectionByIsland: { '1': [0] },
        concordRollProtectionState: { rollsTaken: 20, rollsSinceFragment: 6 },
      });

      const result = await withMockedRandom([0.5, 0.5], () =>
        executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
      );

      assertEqual(result.total, 8, 'mocked roll should move from tile 0 to tile 8');
      assertEqual(result.concordFragmentPickup?.tileIndex, 6, 'crossed remaining fragment should resonate');
      assertEqual(result.concordFragmentPickup?.reason, 'resonance_crossing', 'renderer receives visible assist reason');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.concordRollProtectionState.rollsTaken, 21, 'eligible roll count persists canonically');
      assertEqual(persisted.concordRollProtectionState.rollsSinceFragment, 0, 'selected pickup resets miss streak');
    },
  },
];
