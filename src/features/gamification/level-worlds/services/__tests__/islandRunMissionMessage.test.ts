import {
  buildMissionMessageSteps,
  MISSION_MESSAGE_NUDGE_INTERVAL_MS,
  resolveMissionMessageStepKind,
} from '../islandRunMissionMessage';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunMissionMessageTests: TestCase[] = [
  {
    name: 'picture message: roll first, then the island\'s first two objectives as pictures',
    run: () => {
      const steps = buildMissionMessageSteps(['Build all 5 landmarks', 'Defeat the Boss', 'Hatch the egg']);
      assertEqual(steps.length, 3, 'three steps at most');
      assertEqual(steps[0].kind, 'roll', 'step one is always rolling to explore');
      assertEqual(steps[1].kind, 'build', 'a build objective gets the build picture');
      assertEqual(steps[2].kind, 'boss', 'a boss objective gets the crown picture');
      assertEqual(buildMissionMessageSteps([]).length, 1, 'no objectives still explains how to move');
      assertEqual(resolveMissionMessageStepKind('Collect 12 dynamite'), 'dynamite', 'dynamite objectives');
      assertEqual(resolveMissionMessageStepKind('Catch 100 kg of fish'), 'fish', 'fishing objectives');
      assertEqual(resolveMissionMessageStepKind('Hatch the island egg'), 'egg', 'egg objectives');
      assertEqual(resolveMissionMessageStepKind('Something new'), 'collect', 'anything else gets the star');
    },
  },
  {
    name: 'the mission briefing arrives as a phone message: badge, ring, 30 s nudges, opens on tap',
    run: async () => {
      assertEqual(MISSION_MESSAGE_NUDGE_INTERVAL_MS, 30_000, 'the phone nudges every 30 seconds');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandMissionBriefingModal.tsx', 'utf8');
      assert(board.includes('setIncomingMissionBriefing(pendingMissionBriefing);'), 'a triggered briefing waits on the phone instead of opening');
      assert(!board.includes('setActiveMissionBriefing(pendingMissionBriefing);'), 'the briefing no longer pops open by itself');
      assert(board.includes('const interval = window.setInterval(nudge, MISSION_MESSAGE_NUDGE_INTERVAL_MS);'), 'ring + shake repeat until read');
      assert((board.match(/island-run-mission-phone__message-badge/g) ?? []).length === 2, 'both phone buttons show the red badge');
      assert((board.match(/onClick=\{handleMissionPhoneButton\}/g) ?? []).length === 2, 'tapping either phone opens the waiting message');
      assert(board.includes('className="island-run-mission-message-banner" onClick={openIncomingMissionBriefing}'), 'the notification banner opens it too');
      assert(board.includes('openMessageId={Boolean(activeMissionBriefing) && !showMissionPhoneBriefing ? openMissionMessageId : null}'), 'the opened message leads with its own picture view');
      assert(modal.includes('<MissionPictureMessage labels='), 'the briefing renders the picture message');
    },
  },
];
