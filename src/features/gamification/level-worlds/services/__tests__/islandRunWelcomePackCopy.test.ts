import { buildWelcomePackGiftBody } from '../islandRunWelcomePackCopy';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunWelcomePackCopyTests: TestCase[] = [
  {
    name: 'welcome gift body uses story-native First Light Shore language',
    run: async () => {
      const body = buildWelcomePackGiftBody();
      assert(body.includes('Captain Ivo'), 'Expected Captain Ivo to anchor the reward in Island 1 canon');
      assert(body.includes('First Light Shore'), 'Expected First Light Shore story-native location');
      assert(body.includes('welcome gift'), 'Expected plain welcome gift language');
    },
  },
  {
    name: 'welcome gift body safely includes a guest display name when present',
    run: async () => {
      assertEqual(
        buildWelcomePackGiftBody({ displayName: '  Captain Nova  ' }),
        "Captain Ivo left this welcome gift for Captain Nova's first steps on First Light Shore.",
        'Expected trimmed guest name in welcome gift copy',
      );
    },
  },
  {
    name: 'welcome gift body falls back without crashing on missing guest display name',
    run: async () => {
      assertEqual(
        buildWelcomePackGiftBody({ displayName: '   ' }),
        'Captain Ivo left you a welcome gift for your first steps on First Light Shore.',
        'Expected safe fallback when guest name is blank',
      );
    },
  },
  {
    name: 'welcome pack on Island 2: gifts already collected open straight on the deferred creature cards',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/WelcomePackModal.tsx', 'utf8');
      assert(modal.includes("const cardsOnly = giftsAlreadyCollected && !deferCreaturePack;"), 'cards-only only when the cards are no longer deferred');
      assert(modal.includes("const startPhase: WelcomePackPhase = cardsOnly ? 'cards-intro' : 'economy';"), 'skips the Island 001 gift page and its award replay');
      assert(modal.includes('if (cardsOnly && !claimResult)') && modal.includes('const claimed = onClaim ? await onClaim() : false;'), 'opening the pack claims the cards canonically first');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('giftsAlreadyCollected={runtimeState.welcomePackRewardBundleClaimed === true}'), 'the board passes the canonical gift receipt');
    },
  },
];
