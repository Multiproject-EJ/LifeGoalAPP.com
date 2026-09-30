import {
  addMissionPhoneMessage,
  countUnreadMissionPhoneMessages,
  formatMissionPhoneMessageTime,
  getMissionBriefingMessageId,
  markMissionPhoneMessageRead,
  MISSION_PHONE_INBOX_LIMIT,
  readMissionPhoneInbox,
  sanitizeMissionPhoneInbox,
  writeMissionPhoneInbox,
  type MissionPhoneMessage,
} from '../missionPhoneInbox';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

function message(id: string, receivedAtMs: number, readAtMs: number | null = null): MissionPhoneMessage {
  return {
    id, islandNumber: 7, cycleIndex: 0, sender: 'Central Command', title: `Mission ${id}`,
    body: 'Do the thing.', stepLabels: ['Build Landmarks'], receivedAtMs, readAtMs,
  };
}

export const missionPhoneInboxTests: TestCase[] = [
  {
    name: 'an arriving message is filed unread, newest first, and never duplicated',
    run: () => {
      let inbox = addMissionPhoneMessage([], message('a', 10));
      inbox = addMissionPhoneMessage(inbox, message('b', 20));
      inbox = addMissionPhoneMessage(inbox, message('a', 30));
      assertEqual(inbox.map((entry) => entry.id).join(','), 'b,a', 'newest first, the repeat is ignored');
      assertEqual(countUnreadMissionPhoneMessages(inbox), 2, 'both unread');
    },
  },
  {
    name: 'reading a message files it as read without touching others',
    run: () => {
      const inbox = markMissionPhoneMessageRead([message('a', 10), message('b', 20)], 'a', 99);
      assertEqual(inbox.find((entry) => entry.id === 'a')?.readAtMs, 99, 'read time stored');
      assertEqual(inbox.find((entry) => entry.id === 'b')?.readAtMs, null, 'other message still unread');
      const again = markMissionPhoneMessageRead(inbox, 'a', 200);
      assertEqual(again.find((entry) => entry.id === 'a')?.readAtMs, 99, 'first read time is kept');
    },
  },
  {
    name: 'the inbox survives reloads, drops junk and stays bounded',
    run: () => {
      installWindowWithStorage(createMemoryStorage());
      const many = Array.from({ length: MISSION_PHONE_INBOX_LIMIT + 5 }, (_, index) => message(`m${index}`, index));
      writeMissionPhoneInbox('player', many);
      const loaded = readMissionPhoneInbox('player');
      assertEqual(loaded.length, MISSION_PHONE_INBOX_LIMIT, 'capped');
      assertEqual(loaded[0].id, `m${MISSION_PHONE_INBOX_LIMIT + 4}`, 'newest kept');
      assertEqual(readMissionPhoneInbox('someone-else').length, 0, 'per player');
      assertEqual(sanitizeMissionPhoneInbox([null, 3, { id: 'x' }, { title: 'no id' }]).length, 0, 'junk entries dropped');
      assertEqual(sanitizeMissionPhoneInbox('nope').length, 0, 'non-arrays ignored');
    },
  },
  {
    name: 'message ids are stable per cycle, island and beat, and times read naturally',
    run: () => {
      assertEqual(getMissionBriefingMessageId(0, 7, 'arrival'), 'briefing:0:7:arrival', 'stable id');
      assert(getMissionBriefingMessageId(1, 7, 'arrival') !== getMissionBriefingMessageId(0, 7, 'arrival'), 'new cycle, new message');
      assertEqual(formatMissionPhoneMessageTime(0, 20_000), 'now', 'seconds read as now');
      assertEqual(formatMissionPhoneMessageTime(0, 5 * 60_000), '5m', 'minutes');
      assertEqual(formatMissionPhoneMessageTime(0, 3 * 3_600_000), '3h', 'hours');
      assertEqual(formatMissionPhoneMessageTime(0, 2 * 86_400_000), '2d', 'days');
    },
  },
  {
    name: 'the incoming message opens in its own phone view instead of the main mission screen',
    run: async () => {
      // @ts-ignore Node test runner provides fs.
      const fs = await import('fs');
      const modal = fs.readFileSync('src/features/gamification/level-worlds/components/IslandMissionBriefingModal.tsx', 'utf8');
      assert(!modal.includes('pictureMessage ?'), 'the picture message is no longer drawn on the mission screen');
      assert(modal.includes('island-mission-tracker__messages-button'), 'the phone header has a Messages button');
      assert(modal.includes("Got it · let's go"), 'a message is filed once read');
      assert(modal.includes('island-mission-tracker__message--fullscreen'), 'an incoming message is fullscreen on the phone');
      assert(modal.includes('{!showMessageView ? (\n              <header className="island-mission-tracker__header">'), 'the dashboard header hides for 100% focus');
      assert(modal.includes('className="island-mission-messages" role="dialog" aria-modal="true"'), 'filed messages open in their own Messages modal');
      assert(!modal.includes("setScreen({ kind: 'inbox' })"), 'messages never render on the dashboard');
      assert(modal.includes('<MissionPictureMessage labels={openMessage.stepLabels} variant="boxed" />'), 'missions read as boxed 1 · 2 · 3 steps');
      assert(modal.includes('fileOpenMessage();\n    requestFold'), 'closing the phone also files the open message');
      const board = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('openMessageId={Boolean(activeMissionBriefing) && !showMissionPhoneBriefing ? openMissionMessageId : null}'), 'the incoming briefing opens its message view');
      assert(board.includes('addMissionPhoneMessage(inbox, {'), 'arriving messages are filed in the inbox');
    },
  },
];
