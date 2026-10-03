import {
  LIFE_PATH_KEY,
  createLifePathProgress,
  getLifeFastTrackOfferIsland,
  hasAcceptedLifeFastTrack,
  mergeLifePathProgress,
  nextOfferIslandAfterDecline,
  resolveLifePathPrompt,
  type LifePathProgress,
} from '../lifePathProgress';
import { mergeIslandRunSignatureMissionProgress, sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { resolveWorldPortalAccess } from '../../../../onboarding/worldPortalAccess';
import { assert, assertEqual, type TestCase } from './testHarness';

function progress(overrides: Partial<LifePathProgress> = {}): LifePathProgress {
  return { ...createLifePathProgress(100), ...overrides };
}

function prompt(ledger: Record<string, unknown>, island: number, extra: { cycleIndex?: number; hasFullAppAccess?: boolean } = {}) {
  return resolveLifePathPrompt({ ledger, currentIslandNumber: island, cycleIndex: extra.cycleIndex ?? 0, hasFullAppAccess: extra.hasFullAppAccess ?? false });
}

export const lifePathTests: TestCase[] = [
  {
    name: 'life path: Island 001 stays quiet; "What brings you here?" is asked from Island 002',
    run: () => {
      assertEqual(prompt({}, 1), null, 'no prompt on Island 001');
      assertEqual(prompt({}, 2), 'intent', 'intent question on Island 002');
      assertEqual(prompt({}, 12), 'intent', 'an unanswered intent is asked before the offer');
    },
  },
  {
    name: 'life path: fast-track offer at Island 010 by default, Island 004 for "improving my life"',
    run: () => {
      const game = { [LIFE_PATH_KEY]: progress({ intent: 'game', intentAnsweredAtMs: 5 }) };
      const life = { [LIFE_PATH_KEY]: progress({ intent: 'life', intentAnsweredAtMs: 5 }) };
      assertEqual(prompt(game, 9), null, 'game players: nothing before 10');
      assertEqual(prompt(game, 10), 'fast-track', 'game players: offer at 10');
      assertEqual(prompt(life, 3), null, 'life players: nothing before 4');
      assertEqual(prompt(life, 4), 'fast-track', 'life players: offer at 4');
      assertEqual(getLifeFastTrackOfferIsland(progress({ intent: 'both' })), 10, 'both: default island');
    },
  },
  {
    name: 'life path: "Not yet" brings the offer back 5 islands later; accepting ends it',
    run: () => {
      assertEqual(nextOfferIslandAfterDecline(10), 15, 're-offer gap');
      const declined = { [LIFE_PATH_KEY]: progress({ intent: 'both', intentAnsweredAtMs: 5, nextOfferIsland: 15, declineCount: 1 }) };
      assertEqual(prompt(declined, 14), null, 'quiet until the re-offer island');
      assertEqual(prompt(declined, 15), 'fast-track', 'offered again');
      const accepted = { [LIFE_PATH_KEY]: progress({ intent: 'life', intentAnsweredAtMs: 5, fastTrackAcceptedAtMs: 9 }) };
      assertEqual(prompt(accepted, 20), null, 'never again after accepting');
      assert(hasAcceptedLifeFastTrack(accepted), 'acceptance readable from the ledger');
    },
  },
  {
    name: 'life path: no prompts once the life app is open, past Island 040 or in a later cycle',
    run: () => {
      assertEqual(prompt({}, 12, { hasFullAppAccess: true }), null, 'full app access');
      assertEqual(prompt({}, 40), null, 'Island 040 council takes over');
      assertEqual(prompt({}, 12, { cycleIndex: 1 }), null, 'later cycle');
    },
  },
  {
    name: 'life path: survives the signature ledger sanitize and merge; acceptance is permanent',
    run: () => {
      const local = progress({ intent: 'life', intentAnsweredAtMs: 5, fastTrackAcceptedAtMs: 50, updatedAtMs: 50 });
      const remote = progress({ intent: 'both', intentAnsweredAtMs: 6, nextOfferIsland: 15, declineCount: 1, updatedAtMs: 80 });
      const sanitized = sanitizeIslandRunSignatureMissionProgress({ [LIFE_PATH_KEY]: local, 'bogus-key': { ...local } });
      assert(Boolean(sanitized[LIFE_PATH_KEY]), 'kept under its key');
      assert(!('bogus-key' in sanitized), 'life-path records under other keys are dropped');
      const merged = mergeIslandRunSignatureMissionProgress({ [LIFE_PATH_KEY]: remote }, { [LIFE_PATH_KEY]: local })[LIFE_PATH_KEY] as LifePathProgress;
      assertEqual(merged.fastTrackAcceptedAtMs, 50, 'acceptance survives a newer remote');
      assertEqual(merged.declineCount, 1, 'decline count kept');
      assertEqual(mergeLifePathProgress(null, local)?.intent, 'life', 'one-sided merge');
    },
  },
  {
    name: 'life path: accepting the fast track opens the full app before Island 040',
    run: () => {
      const base = { highestReachedIsland: 10, hasEarnedPortal: false, isVerifiedDeveloper: false, hasVerifiedEarlyAccess: false };
      assertEqual(resolveWorldPortalAccess(base).canOpenFullApp, false, 'still game-first without it');
      const access = resolveWorldPortalAccess({ ...base, hasAcceptedFastTrack: true });
      assertEqual(access.reason, 'fast-track', 'reason');
      assert(access.canOpenFullApp && access.canLeaveGameForToday, 'Today opens');
      assertEqual(access.canAttendCaretakerCouncil, false, 'the Island 040 council story is untouched');
    },
  },
  {
    name: 'life path: board prompt uses canonical actions, a portal, a fixed backdrop and scroll lock',
    run: async () => {
      // @ts-ignore
      const fs = await import('fs');
      const board = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8') as string;
      assert(board.includes('acceptLifeFastTrack({ session, client })') && board.includes('declineLifeFastTrack({ session, client })'), 'canonical actions');
      assert(board.includes('lifePathPromptOpen !== null,'), 'counts as an attention-owning modal');
      const modal = fs.readFileSync('src/features/gamification/level-worlds/components/LifePathPromptModal.tsx', 'utf8') as string;
      assert(modal.includes('createPortal(') && modal.includes('lockPageScroll('), 'portal + scroll lock');
      const css = fs.readFileSync('src/features/gamification/level-worlds/components/LifePathPromptModal.css', 'utf8') as string;
      assert(/\.life-path-prompt \{[^}]*position: fixed;[^}]*inset: 0;/.test(css), 'viewport-anchored backdrop');
      const actions = fs.readFileSync('src/features/gamification/level-worlds/services/lifePathActions.ts', 'utf8') as string;
      assert(actions.includes('withIslandRunActionLock(') && actions.includes('commitIslandRunState('), 'mutex + canonical commit');
    },
  },
];
