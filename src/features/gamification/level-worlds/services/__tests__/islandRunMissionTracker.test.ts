import { getIslandMissionBriefingPresentation } from '../islandRunMissionBriefing';
import { resolveIslandMissionTrackerPresentation } from '../islandRunMissionTracker';
import {
  CACTUS_CANYON_SPIRAL_MAX_SEGMENTS,
  FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES,
  FROSTWELL_DEPTH_METERS,
  ROOTHEART_POWER_COMPONENTS,
  SUNKEN_SANDS_FIRST_TREASURE_ID,
  SUNKEN_SANDS_TREASURE_ROLL_TARGET,
  getIslandRunSignatureMissionKey,
} from '../islandRunSignatureMissions';
import { assert, assertEqual, type TestCase } from './testHarness';

type TrackerState = Parameters<typeof resolveIslandMissionTrackerPresentation>[0]['state'];

function makeState(overrides: Partial<TrackerState> = {}): TrackerState {
  return {
    currentIslandNumber: 1,
    cycleIndex: 0,
    bossTrialResolvedIslandNumber: null,
    perIslandEggs: {},
    signatureMissionProgressByIsland: {},
    stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
    stopBuildStateByIndex: Array.from({ length: 5 }, () => ({ requiredEssence: 100, spentEssence: 0, buildLevel: 0 })),
    ...overrides,
  };
}

function restoredStops(count = 5) {
  return {
    stopStatesByIndex: Array.from({ length: 5 }, (_, index) => ({
      objectiveComplete: index < count,
      buildComplete: index < count,
    })),
    stopBuildStateByIndex: Array.from({ length: 5 }, (_, index) => ({
      requiredEssence: 100,
      spentEssence: index < count ? 100 : 0,
      buildLevel: index < count ? 3 : 0,
    })),
  };
}

export const islandRunMissionTrackerTests: TestCase[] = [
  {
    name: 'mission registry aligns Islands 001-014 with the authored production worlds and approved headers',
    run: () => {
      const expected = [
        [1, 'First Light Kingdom', 'First Light Assembly'],
        [2, 'Celestial Sky Kingdom', 'The Great Re-Docking'],
        [3, 'Frostmoon Haven', 'Open the Frostwell'],
        [4, 'Crown Citadel', 'Raise the Broken Causeway'],
        [5, 'Sunshore Arena', 'Defeat the Arena Guardian'],
        [6, 'Moonveil Nexus', 'Rephase the Moon Mirrors'],
        [7, 'Abyssal Pearl Kingdom', 'Restore the Breathline'],
        [8, 'The Everblossom Kingdom', 'The Great Pollination'],
        [9, 'The Heartshaft Crucible', 'Restart the Ignition Chain'],
        [10, 'Rootheart Canopy City', 'Restore the Rootheart Powerworks'],
        [11, 'First Light Kingdom', 'Reopen the First Light Route'],
        [12, 'Sunken Sands', 'Find the Sunscarab'],
        [13, 'Cactus Canyon', 'Carve the Canyon Spiral'],
        [14, 'Honeycomb Kingdom', 'Awaken the Great Honeyfall'],
        [20, 'Lava Labyrinth', 'Escape the Lava Labyrinth'],
      ] as const;
      expected.forEach(([islandNumber, islandName, headline]) => {
        const presentation = getIslandMissionBriefingPresentation(islandNumber);
        assertEqual(presentation.islandName, islandName, `Island ${islandNumber} uses its production world name`);
        assertEqual(presentation.headline, headline, `Island ${islandNumber} uses its approved compact header`);
      });
    },
  },
  {
    name: 'Lava Labyrinth tracker reveals the long Iron Skiff sequence only after the Level-3 labyrinth',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 20);
      const solvedState = makeState({
        currentIslandNumber: 20,
        bossTrialResolvedIslandNumber: 20,
        perIslandEggs: { '20': { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'collected' } },
        ...restoredStops(),
      });
      const locked = resolveIslandMissionTrackerPresentation({ islandNumber: 20, state: solvedState });
      assertEqual(locked.objectives[0].label, 'Escape Mission Locked', 'the long mission stays distinct from ordinary labyrinth completion');
      assertEqual(locked.objectives[0].displayValue, 'Solve the labyrinth first', 'the locked phase explains its launch condition');
      assertEqual(locked.objectives[1].label, 'Solve Level-3 Labyrinth', 'ordinary island completion remains visible as the prerequisite');

      const collecting = resolveIslandMissionTrackerPresentation({
        islandNumber: 20,
        state: makeState({
          ...solvedState,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'escape-lava-labyrinth', version: 1,
              claimedPickupTileIndices: [2, 7, 11], chargesEarned: 3, chargesSpent: 0,
              activatedStages: 0, lastActivatedStage: null, startedAtMs: 10,
              finaleCompletedAtMs: null, completedAtMs: null, updatedAtMs: 12,
            },
          },
        }),
      });
      assertEqual(collecting.objectives[0].label, 'Recover Heatshield Plates', 'mission launch reveals the route collection phase');
      assertEqual(collecting.objectives[0].displayValue, '3 / 8 plates', 'plate progress stays compact and explicit');

      const launchReady = resolveIslandMissionTrackerPresentation({
        islandNumber: 20,
        state: makeState({
          ...solvedState,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'escape-lava-labyrinth', version: 1,
              claimedPickupTileIndices: [2, 7, 11, 16, 20, 25, 29, 35], chargesEarned: 8, chargesSpent: 8,
              activatedStages: 4, lastActivatedStage: 4, startedAtMs: 10,
              finaleCompletedAtMs: null, completedAtMs: 20, updatedAtMs: 20,
            },
          },
        }),
      });
      assertEqual(launchReady.objectives[0].label, 'Launch Iron Skiff', 'forged systems advance the tracker to the playable escape');
      assertEqual(launchReady.complete, false, 'forging alone cannot mark the Island 020 mission complete');

      const extracted = resolveIslandMissionTrackerPresentation({
        islandNumber: 20,
        state: makeState({
          ...solvedState,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'escape-lava-labyrinth', version: 1,
              claimedPickupTileIndices: [2, 7, 11, 16, 20, 25, 29, 35], chargesEarned: 8, chargesSpent: 8,
              activatedStages: 4, lastActivatedStage: 4, startedAtMs: 10,
              finaleCompletedAtMs: 30, completedAtMs: 20, updatedAtMs: 30,
            },
          },
        }),
      });
      assertEqual(extracted.objectives[0].label, 'Reach Expedition Ship', 'successful extraction advances the phone to its terminal objective');
      assertEqual(extracted.complete, true, 'only the persisted extraction edge completes the long mission');
    },
  },
  {
    name: 'Honeycomb Kingdom mission phone exposes live reservoir pressure progress and ready nectar',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 14);
      const tracker = resolveIslandMissionTrackerPresentation({
        islandNumber: 14,
        state: makeState({
          currentIslandNumber: 14,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'great-honeyfall-coronation', version: 1,
              nectarChargesEarned: 3, nectarChargesSpent: 2,
              activatedReservoirs: 2, lastActivatedReservoir: 2,
              completedAtMs: null, updatedAtMs: 8,
            },
          },
        }),
      });
      assertEqual(tracker.usesLiveSignatureProgress, true, 'Honeyfall phone reads canonical signature progress');
      assertEqual(tracker.objectives[0].label, 'Fill Royal Reservoir', 'the primary objective names the visible 3D machine');
      assertEqual(tracker.objectives[0].value, 2, 'only committed reservoir stages advance the mission ring');
      assertEqual(tracker.objectives[0].displayValue, 'Nectar ready · 2 / 4', 'an unspent route pickup is clearly actionable');
    },
  },
  {
    name: 'staged restoration missions expose live canonical progress beside landmark counters',
    run: () => {
      const expectedStageLabels = new Map([
        [4, 'Causeway Spans'],
        [6, 'Mirrors Aligned'],
        [7, 'Districts Breathing'],
        [8, 'Gardens Blooming'],
        [9, 'Systems Ignited'],
        [20, 'Escape Mission Locked'],
      ]);
      expectedStageLabels.forEach((stageLabel, islandNumber) => {
        const tracker = resolveIslandMissionTrackerPresentation({
          islandNumber,
          state: makeState({ currentIslandNumber: islandNumber }),
        });
        assertEqual(tracker.usesLiveSignatureProgress, true, `Island ${islandNumber} reads canonical mission state`);
        assertEqual(tracker.objectives[0].label, stageLabel, `Island ${islandNumber} names its authored visual transformation`);
        assertEqual(tracker.objectives[0].value, 0, `Island ${islandNumber} starts with no activated stages`);
        assertEqual(
          tracker.objectives[1].label,
          islandNumber === 20 ? 'Solve Level-3 Labyrinth' : 'Build Landmarks',
          'canonical build progress remains visible',
        );
      });
    },
  },
  {
    name: 'Celestial tracker keeps the phone compact while showing live platform and landmark progress',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 2);
      const tracker = resolveIslandMissionTrackerPresentation({
        islandNumber: 2,
        state: makeState({
          currentIslandNumber: 2,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'celestial-great-redocking',
              version: 1,
              rollsCompleted: 12,
              completedAtMs: null,
              updatedAtMs: 12,
            },
          },
        }),
      });
      assertEqual(tracker.usesLiveSignatureProgress, true, 'Island 002 now reads canonical signature progress');
      assertEqual(tracker.objectives[0].label, 'Dock Platforms', 'phone keeps the mission action to two words');
      assertEqual(tracker.objectives[0].displayValue, '2 / 4', 'phone reports locked platforms rather than verbose roll copy');
      assertEqual(tracker.objectives[0].value, 12, 'the progress ring still advances smoothly between docking milestones');
      assertEqual(tracker.objectives[1].label, 'Build Landmarks', 'second row remains the concise restoration objective');
    },
  },
  {
    name: 'First Light tracker reads Assembly progress and counts only genuinely restored outer landmarks',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 1);
      const stops = restoredStops(4);
      const tracker = resolveIslandMissionTrackerPresentation({
        islandNumber: 1,
        state: makeState({
          ...stops,
          perIslandEggs: { '1': { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'collected' } },
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'first-light-assembly-crater',
              version: 1,
              claimedDynamiteTileIndices: [...FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES.slice(0, 10)],
              chargesDetonated: 10,
              lastDetonatedSector: 9,
              startedAtMs: 1,
              completedAtMs: null,
              updatedAtMs: 2,
            },
          },
        }),
      });
      assertEqual(tracker.objectives[0].label, 'Use Dynamite', 'Assembly objective uses compact approved copy');
      assertEqual(tracker.objectives[0].value, 10, 'detonation progress comes from canonical mission state');
      assertEqual(tracker.objectives[1].value, 4, 'all four outer objectives, builds and the egg are complete');
      assertEqual(tracker.overallProgressPercent, 75, 'overall progress averages the two visible objectives');

      const unresolvedEgg = resolveIslandMissionTrackerPresentation({
        islandNumber: 1,
        state: makeState({
          ...stops,
          perIslandEggs: { '1': { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'ready' } },
        }),
      });
      assertEqual(unresolvedEgg.objectives[1].value, 3, 'Hatchery is not counted before its egg is collected or sold');
    },
  },
  {
    name: 'Frostwell tracker changes phase without losing accumulated mission progress',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 3);
      const drilling = resolveIslandMissionTrackerPresentation({
        islandNumber: 3,
        state: makeState({
          currentIslandNumber: 3,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'frostwell-iceworks', version: 2,
              metersDrilled: 250, spinsEarned: 4, spinsUsed: 3,
              lastSpinMeters: 50, builtAtMs: null, updatedAtMs: 2,
            },
          },
        }),
      });
      assertEqual(drilling.objectives[0].label, 'Drill to Water', 'drilling phase is named directly');
      assertEqual(drilling.objectives[0].displayValue, `250 / ${FROSTWELL_DEPTH_METERS}m`, 'phone shows physical depth');

      const ready = resolveIslandMissionTrackerPresentation({
        islandNumber: 3,
        state: makeState({
          currentIslandNumber: 3,
          signatureMissionProgressByIsland: {
            [key]: {
              missionId: 'frostwell-iceworks', version: 2,
              metersDrilled: FROSTWELL_DEPTH_METERS, spinsEarned: 8, spinsUsed: 8,
              lastSpinMeters: 50, builtAtMs: null, updatedAtMs: 3,
            },
          },
        }),
      });
      assertEqual(ready.objectives[0].label, 'Fishery Online', 'completed drilling commissions the business in the same row');
      assertEqual(ready.objectives[0].displayValue, 'Done', 'there is no separate funding phase after 500m');
      assert(ready.objectives[0].value > drilling.objectives[0].value, 'phase transition remains monotonic');
    },
  },
  {
    name: 'Rootheart, Sunken Sands and Cactus Canyon expose phase-correct canonical signature progress',
    run: () => {
      const rootheartKey = getIslandRunSignatureMissionKey(0, 10);
      const rootheart = resolveIslandMissionTrackerPresentation({
        islandNumber: 10,
        state: makeState({
          currentIslandNumber: 10,
          signatureMissionProgressByIsland: {
            [rootheartKey]: {
              missionId: 'rootheart-powerworks', version: 1,
              collectedComponentIds: ROOTHEART_POWER_COMPONENTS.map((part) => part.id),
              buildStage: 2, essenceSpent: 900, activatedAtMs: null, updatedAtMs: 4,
            },
          },
        }),
      });
      assertEqual(rootheart.objectives[0].label, 'Build Powerworks', 'all parts advance Rootheart to construction');
      assertEqual(rootheart.objectives[0].displayValue, '2 / 3', 'Powerworks stage is shown compactly');

      const sunkenKey = getIslandRunSignatureMissionKey(0, 12);
      const sunken = resolveIslandMissionTrackerPresentation({
        islandNumber: 12,
        state: makeState({
          currentIslandNumber: 12,
          signatureMissionProgressByIsland: {
            [sunkenKey]: {
              missionId: 'sunken-sands-first-treasure', version: 1,
              treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
              rollsCompleted: SUNKEN_SANDS_TREASURE_ROLL_TARGET,
              revealedAtMs: 5, claimedAtMs: null, updatedAtMs: 5,
            },
          },
        }),
      });
      assertEqual(sunken.objectives[0].label, 'Claim Sunscarab', 'revealed treasure advances to the claim phase');
      assertEqual(sunken.objectives[0].displayValue, 'Ready', 'claim readiness is visible without extra copy');

      const canyonKey = getIslandRunSignatureMissionKey(0, 13);
      const canyon = resolveIslandMissionTrackerPresentation({
        islandNumber: 13,
        state: makeState({
          currentIslandNumber: 13,
          signatureMissionProgressByIsland: {
            [canyonKey]: {
              missionId: 'cactus-canyon-spiral-rail', version: 2,
              segmentsExcavated: 7, dynamiteEarned: 9, dynamiteSpent: 7,
              lastBlastSegments: 7, startedAtMs: 1, completedAtMs: null, updatedAtMs: 6,
            },
          },
        }),
      });
      assertEqual(canyon.objectives[0].label, 'Blast Rail Sections', 'Canyon uses the approved short action');
      assertEqual(canyon.objectives[0].target, CACTUS_CANYON_SPIRAL_MAX_SEGMENTS, 'Canyon target remains canonical');
      assertEqual(canyon.objectives[0].value, 7, 'Canyon progress comes from excavated segments');
    },
  },
];
