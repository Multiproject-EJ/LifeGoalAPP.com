import { generateIslandStopPlan } from '../islandRunStops';
import { getIslandMissionBriefingPresentation } from '../islandRunMissionBriefing';
import { getIslandDisplayName } from '../islandNames';
import { isIslandRunFinishedForDepartureV2 } from '../islandRunContractV2StopResolver';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const island15MissionBriefingTests: TestCase[] = [
  {
    name: 'serves the approved Nivara mission through the canonical briefing presentation',
    run: () => {
      const briefing = getIslandMissionBriefingPresentation(15);

      assertEqual(briefing.islandName, 'Crystal Glacier Citadel', 'briefing uses the production world name');
      assertEqual(getIslandDisplayName(15), 'Crystal Glacier Citadel', 'global island identity matches the mission and production world');
      assertEqual(briefing.headline, 'The Aurora That Learned to Move', 'briefing uses the approved mission title');
      assertEqual(briefing.circuitLabel, 'first circuit', 'first-cycle copy remains familiar');
      assert(briefing.missionStatement.includes('Nivara'), 'briefing names Nivara in the canonical mission body');
      assertEqual(
        briefing.primaryObjective,
        'Reawaken the Frost Nest, Ice Bastion, Aurora Observatory, and Crystal Oracle—then enter the Frozen Throne.',
        'briefing names the four living rooms and their Boss Hall destination while progress stays canonical',
      );
      assertEqual(
        briefing.supportingObjective,
        'Carry each room\'s living light into the Boss Hall and release the Held Dawn without breaking what the ice protected.',
        'briefing gives the room sequence an emotional destination without adding mission state',
      );
    },
  },
  {
    name: 'derives Island 015 room progression from the canonical stop plan in event-backed Mystery order',
    run: () => {
      const stopPlan = generateIslandStopPlan(15);

      assertDeepEqual(
        stopPlan.map(({ stopId }) => stopId),
        ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'],
        'Island 015 retains the canonical five-stop sequence',
      );
      assertEqual(stopPlan[2]?.kind, 'fixed_mystery', 'the third room retains the canonical Mystery identity');
      assertEqual(stopPlan[2]?.mysteryContentKind, 'event_minigame', 'the Mystery room launches the canonical Event Arena content');
    },
  },
  {
    name: 'uses cycle-aware circuit copy instead of claiming every visit is the first',
    run: () => {
      assertEqual(getIslandMissionBriefingPresentation(15, 1).circuitLabel, 'circuit 2', 'second cycle is identified honestly');
      assertEqual(getIslandMissionBriefingPresentation(15, 4).circuitLabel, 'circuit 5', 'later cycles preserve their visit number');
      assertEqual(getIslandMissionBriefingPresentation(15, -9).circuitLabel, 'first circuit', 'invalid negative cycle input clamps safely');
    },
  },
  {
    name: 'requires all five Island 015 room builds and the ordinary Boss before departure',
    run: () => {
      const completeBuilds = Array.from({ length: 5 }, () => ({
        requiredEssence: 10,
        spentEssence: 10,
        buildLevel: 3,
      }));
      assertEqual(isIslandRunFinishedForDepartureV2({
        stopBuildStateByIndex: completeBuilds,
        hatcheryEggResolved: true,
        bossDefeated: true,
      }), true, 'five L3 rooms plus the Frozen Throne resolution unlock departure');
      assertEqual(isIslandRunFinishedForDepartureV2({
        stopBuildStateByIndex: completeBuilds.map((entry, index) => index === 3 ? { ...entry, buildLevel: 2 } : entry),
        hatcheryEggResolved: true,
        bossDefeated: true,
      }), false, 'one unfinished interior keeps the palace mission incomplete');
      assertEqual(isIslandRunFinishedForDepartureV2({
        stopBuildStateByIndex: completeBuilds,
        hatcheryEggResolved: true,
        bossDefeated: false,
      }), false, 'room construction cannot replace the ordinary Boss resolution');
    },
  },
];
