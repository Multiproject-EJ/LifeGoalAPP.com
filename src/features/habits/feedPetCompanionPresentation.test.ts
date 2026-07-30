import type {
  CreatureCollectionRuntimeEntry,
  IslandRunGameStateRecord,
} from '../gamification/level-worlds/services/islandRunGameStateStore';
import {
  assert,
  assertEqual,
  type TestCase,
} from '../gamification/level-worlds/services/__tests__/testHarness';
import { resolveFeedPetCompanionPresentation } from './feedPetCompanionPresentation';

declare const process: { cwd: () => string };

type FeedPetState = Pick<IslandRunGameStateRecord, 'activeCompanionId' | 'creatureCollection'>;

function createCollectionEntry(
  creatureId: string,
  overrides: Partial<CreatureCollectionRuntimeEntry> = {},
): CreatureCollectionRuntimeEntry {
  return {
    creatureId,
    copies: 1,
    firstCollectedAtMs: 100,
    lastCollectedAtMs: 200,
    lastCollectedIslandNumber: 1,
    bondXp: 42,
    bondLevel: 3,
    lastFedAtMs: null,
    claimedBondMilestones: [],
    ...overrides,
  };
}

async function readSource(relativePath: string): Promise<string> {
  // @ts-ignore Island Run test tsconfig omits Node type libraries.
  const fsMod = await import('fs');
  // @ts-ignore Island Run test tsconfig omits Node type libraries.
  const pathMod = await import('path');
  return fsMod.readFileSync(pathMod.resolve(process.cwd(), relativePath), 'utf8');
}

export const feedPetCompanionPresentationTests: TestCase[] = [
  {
    name: 'returns the generic fallback when no active companion is selected',
    run: () => {
      const state: FeedPetState = {
        activeCompanionId: null,
        creatureCollection: [createCollectionEntry('common-sproutling')],
      };

      assertEqual(
        resolveFeedPetCompanionPresentation(state),
        null,
        'Feed Pet should not infer a companion when no canonical selection exists.',
      );
    },
  },
  {
    name: 'rejects stale, unknown, and unowned companion selections',
    run: () => {
      const staleState: FeedPetState = {
        activeCompanionId: 'common-sproutling',
        creatureCollection: [],
      };
      const zeroCopyState: FeedPetState = {
        activeCompanionId: 'common-sproutling',
        creatureCollection: [createCollectionEntry('common-sproutling', { copies: 0 })],
      };
      const unknownState: FeedPetState = {
        activeCompanionId: 'unknown-companion',
        creatureCollection: [createCollectionEntry('unknown-companion')],
      };

      assertEqual(resolveFeedPetCompanionPresentation(staleState), null, 'Unowned selections should fall back safely.');
      assertEqual(resolveFeedPetCompanionPresentation(zeroCopyState), null, 'Zero-copy selections should fall back safely.');
      assertEqual(resolveFeedPetCompanionPresentation(unknownState), null, 'Unknown catalogue ids should fall back safely.');
    },
  },
  {
    name: 'maps the owned active companion to Feed Pet identity, bond, and art',
    run: () => {
      const state: FeedPetState = {
        activeCompanionId: 'mythic-starhorn-seraph',
        creatureCollection: [
          createCollectionEntry('mythic-starhorn-seraph', {
            copies: 2,
            bondXp: 287,
            bondLevel: 6,
          }),
        ],
      };

      const presentation = resolveFeedPetCompanionPresentation(state);

      assert(presentation, 'Expected an owned active companion presentation.');
      if (!presentation) {
        throw new Error('Expected an owned active companion presentation.');
      }
      assertEqual(presentation.name, 'Starhorn Seraph', 'Expected catalogue display name.');
      assertEqual(presentation.rarityLabel, 'Mythic', 'Expected formatted rarity.');
      assertEqual(presentation.affinity, 'Oracle', 'Expected catalogue affinity.');
      assertEqual(presentation.bondLevel, 6, 'Expected persisted bond level.');
      assertEqual(presentation.bondXp, 287, 'Expected persisted bond XP.');
      assertEqual(
        presentation.cutoutSrc,
        '/assets/creatures/mythic-starhorn-seraph.webp',
        'Expected canonical creature art manifest path.',
      );
      assertEqual(presentation.emojiFallback, '🌟', 'Expected tier-appropriate fallback.');
    },
  },
  {
    name: 'Today Feed Pet stays on canonical state, top-level portal, and scroll lock paths',
    run: async () => {
      const tracker = await readSource('src/features/habits/DailyHabitTracker.tsx');

      assert(
        tracker.includes('resolveFeedPetCompanionPresentation(islandRunState)')
          && tracker.includes('<FeedPetModal')
          && tracker.includes('createPortal(feedCreaturesModal, modalRoot)')
          && tracker.includes("lockPageScroll(['body', 'documentElement'])"),
        'Feed Pet should resolve canonical state and retain the required viewport modal guardrails.',
      );
    },
  },
];
