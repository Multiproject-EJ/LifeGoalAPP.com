import { buildWelcomePackStarterCacheBody } from '../islandRunWelcomePackCopy';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunWelcomePackCopyTests: TestCase[] = [
  {
    name: 'starter cache body uses story-native First Light Shore language',
    run: async () => {
      const body = buildWelcomePackStarterCacheBody();
      assert(body.includes('Captain Ivo'), 'Expected Captain Ivo to anchor the reward in Island 1 canon');
      assert(body.includes('First Light Shore'), 'Expected First Light Shore story-native location');
      assert(body.includes('cache'), 'Expected starter cache language instead of generic pack copy');
    },
  },
  {
    name: 'starter cache body safely includes a guest display name when present',
    run: async () => {
      assertEqual(
        buildWelcomePackStarterCacheBody({ displayName: '  Captain Nova  ' }),
        'Starter cache released for Captain Nova. Captain Ivo left this for your first steps on First Light Shore.',
        'Expected trimmed guest name in starter cache copy',
      );
    },
  },
  {
    name: 'starter cache body falls back without crashing on missing guest display name',
    run: async () => {
      assertEqual(
        buildWelcomePackStarterCacheBody({ displayName: '   ' }),
        'Captain Ivo left this cache for your first steps on First Light Shore.',
        'Expected safe fallback when guest name is blank',
      );
    },
  },
];
