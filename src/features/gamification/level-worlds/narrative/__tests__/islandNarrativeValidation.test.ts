// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { existsSync, readFileSync } from 'node:fs';
import { island001NarrativeDefinition } from '../definitions/island001Narrative';
import { getIslandNarrativeDefinition } from '../islandNarrativeRegistry';
import { validateIslandNarrativeDefinition } from '../islandNarrativeValidation';
import { validateIslandStoryManifest } from '../islandStoryManifestValidation';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

function cloneDefinition(): any {
  return JSON.parse(JSON.stringify(island001NarrativeDefinition));
}

function expectInvalid(mutator: (definition: any) => void, expectedMessage: string): void {
  const definition = cloneDefinition();
  mutator(definition);
  const result = validateIslandNarrativeDefinition(definition);
  assert(!result.valid, `Expected invalid definition for ${expectedMessage}`);
  assert(result.errors.some((error) => error.includes(expectedMessage)), `Expected error containing "${expectedMessage}", received: ${result.errors.join('; ')}`);
}

export const islandNarrativeValidationTests: TestCase[] = [
  { name: 'Island 1 narrative definition passes validation', run: () => assert(validateIslandNarrativeDefinition(island001NarrativeDefinition).valid, validateIslandNarrativeDefinition(island001NarrativeDefinition).errors.join('; ')) },
  { name: 'narrative registry returns Island 1', run: () => assertEqual(getIslandNarrativeDefinition(1)?.islandName, 'Luma Isle', 'Expected Island 1 definition') },
  { name: 'narrative registry returns Island 2 (Pebble Bay prophecy frame)', run: () => assertEqual(getIslandNarrativeDefinition(2)?.islandName, 'Pebble Bay', 'Expected Island 2 definition') },
  { name: 'narrative registry returns undefined for an unauthored island', run: () => assertEqual(getIslandNarrativeDefinition(999), undefined, 'Expected no definition for an unauthored island') },
  { name: 'Island 1 character ids are unique', run: () => assertEqual(new Set(island001NarrativeDefinition.characters.map((character) => character.id)).size, island001NarrativeDefinition.characters.length, 'Character IDs should be unique') },
  { name: 'Island 1 beat ids are unique', run: () => assertEqual(new Set(island001NarrativeDefinition.beats.map((beat) => beat.id)).size, island001NarrativeDefinition.beats.length, 'Beat IDs should be unique') },
  { name: 'unknown speaker fails validation', run: () => expectInvalid((definition) => { definition.beats[1].speakerId = 'unknown'; }, 'unknown speakerId') },
  { name: 'noncanonical stop id fails validation', run: () => expectInvalid((definition) => { definition.beats[2].trigger.stopId = 'harbor'; }, 'stopId must be canonical') },
  { name: 'invalid landmark level fails validation', run: () => expectInvalid((definition) => { definition.beats[3].trigger.level = 4; }, 'level must be 1, 2, or 3') },
  { name: 'story reader beat without episode path fails validation', run: () => expectInvalid((definition) => { delete definition.beats[0].episodePath; }, 'requires episodePath') },
  { name: 'dialogue beat without text fails validation', run: () => expectInvalid((definition) => { delete definition.beats[1].text; }, 'requires text') },
  { name: 'unsupported priority fails validation', run: () => expectInvalid((definition) => { definition.beats[0].priority = 'urgent'; }, 'unsupported priority') },
  { name: 'unsupported surface fails validation', run: () => expectInvalid((definition) => { definition.beats[0].surface = 'banner'; }, 'unsupported surface') },
  { name: 'unsupported repeat policy fails validation', run: () => expectInvalid((definition) => { definition.beats[0].repeatPolicy = 'daily'; }, 'unsupported repeatPolicy') },
  { name: 'trigger island mismatch fails validation', run: () => expectInvalid((definition) => { definition.beats[0].trigger.islandNumber = 2; }, 'must match definition islandNumber') },
  { name: 'tile-index field fails validation', run: () => expectInvalid((definition) => { definition.beats[0].trigger.tileIndex = 12; }, 'tileIndex is prohibited') },
  { name: 'reward field fails validation', run: () => expectInvalid((definition) => { definition.beats[0].reward = { coins: 10 }; }, 'reward is prohibited') },
  { name: 'essence economy field fails validation', run: () => expectInvalid((definition) => { definition.beats[0].essence = 10; }, 'essence is prohibited') },
  { name: 'gameplay action field fails validation', run: () => expectInvalid((definition) => { definition.beats[6].travel = 'next'; }, 'travel is prohibited') },
];

export const islandStoryManifestValidationTests: TestCase[] = [
  {
    name: 'shipped arrival story manifest passes validation and every media asset exists',
    run: () => {
      const manifest = JSON.parse(readFileSync('public/islands/001/story/arrival/manifest.json', 'utf8'));
      const result = validateIslandStoryManifest(manifest, {
        assetExists: (src) => existsSync(decodeURIComponent(`public${src}`)),
      });
      assert(result.valid, result.errors.join('; '));
    },
  },
  {
    name: 'shipped resolution story manifest passes validation and every media asset exists',
    run: () => {
      const manifest = JSON.parse(readFileSync('public/islands/001/story/resolution/manifest.json', 'utf8'));
      const result = validateIslandStoryManifest(manifest, {
        assetExists: (src) => existsSync(decodeURIComponent(`public${src}`)),
      });
      assert(result.valid, result.errors.join('; '));
    },
  },
  {
    name: 'shipped global prologue manifest passes validation and every media asset exists',
    run: () => {
      const manifest = JSON.parse(readFileSync('public/storyline/episode-001/manifest.json', 'utf8'));
      const result = validateIslandStoryManifest(manifest, {
        assetExists: (src) => existsSync(decodeURIComponent(`public${src}`)),
      });
      assert(result.valid, result.errors.join('; '));
    },
  },
  { name: 'invalid reward manifest fails validation', run: () => assert(!validateIslandStoryManifest({ id: 'x', title: 'X', panels: [{ type: 'text', text: 'ok' }], reward: { coins: 1 } }).valid, 'Reward manifest should fail') },
  { name: 'invalid media panel fails validation', run: () => assert(!validateIslandStoryManifest({ id: 'x', title: 'X', panels: [{ type: 'image' }] }).valid, 'Missing media src should fail') },
  { name: 'invalid video poster type fails validation', run: () => assert(!validateIslandStoryManifest({ id: 'x', title: 'X', panels: [{ type: 'video', src: '/story/clip.mp4', poster: '/story/poster.txt' }] }).valid, 'Unsupported poster type should fail') },
  { name: 'invalid soundtrack volume fails validation', run: () => assert(!validateIslandStoryManifest({ id: 'x', title: 'X', soundtrack: { src: '/story/music.mp3', volume: 2 }, panels: [{ type: 'text', text: 'ok' }] }).valid, 'Out-of-range soundtrack volume should fail') },
  { name: 'valid motion-webtoon media passes validation', run: () => {
    const assets = new Set(['/story/clip.mp4', '/story/poster.webp', '/story/music.mp3']);
    const result = validateIslandStoryManifest({
      id: 'x',
      title: 'X',
      soundtrack: { src: '/story/music.mp3', loop: true, volume: 0.3 },
      panels: [{ type: 'video', src: '/story/clip.mp4', poster: '/story/poster.webp', mutedAutoplay: true }],
    }, { assetExists: (src) => assets.has(src) });
    assert(result.valid, result.errors.join('; '));
  } },
];
