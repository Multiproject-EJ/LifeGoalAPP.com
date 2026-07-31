import {
  isStorySoundtrackClearedForPlayback,
  resolvePlayableStorySoundtrack,
} from '../../../../story/storySoundtrackPolicy';
import type { StorySoundtrackConfig } from '../../../../story/storyTypes';
import { assertEqual, type TestCase } from './testHarness';

const clearedClassicCue: StorySoundtrackConfig = {
  src: '/assets/audio/music/story/classic/mus_story_classic_example_v1.mp3',
  cueId: 'story-classic-example-v1',
  mood: 'wonder',
  sourceKind: 'classic-repertoire',
  rights: {
    composition: {
      workTitle: 'Example work',
      composer: 'Example composer',
      basis: 'public-domain-confirmed',
      evidenceReference: 'rights-register:composition/example-work',
    },
    recording: {
      basis: 'commissioned-master',
      evidenceReference: 'rights-register:master/story-classic-example-v1',
    },
  },
};

export const storySoundtrackPolicyTests: TestCase[] = [
  {
    name: 'existing original story soundtracks remain playable during metadata migration',
    run: () => {
      assertEqual(
        isStorySoundtrackClearedForPlayback({
          src: '/assets/audio/music/original-story-bed.mp3',
          sourceKind: 'original',
        }),
        true,
        'original story music should remain playable',
      );
    },
  },
  {
    name: 'classic repertoire requires both composition and recording clearance',
    run: () => {
      assertEqual(
        isStorySoundtrackClearedForPlayback({
          src: '/assets/audio/music/story/classic/unverified-recording.mp3',
          cueId: 'unverified-classic',
          sourceKind: 'classic-repertoire',
        }),
        false,
        'classic repertoire without rights evidence must be blocked',
      );
      assertEqual(
        isStorySoundtrackClearedForPlayback(clearedClassicCue),
        true,
        'a cleared composition with a cleared recording should be playable',
      );
    },
  },
  {
    name: 'uncleared classic cues resolve to silence instead of an unsafe recording',
    run: () => {
      assertEqual(
        resolvePlayableStorySoundtrack({
          src: '/assets/audio/music/story/classic/unknown-master.mp3',
          sourceKind: 'classic-repertoire',
        }),
        null,
        'uncleared classic soundtrack should resolve to null',
      );
      assertEqual(
        resolvePlayableStorySoundtrack(clearedClassicCue)?.cueId,
        clearedClassicCue.cueId,
        'cleared classic soundtrack should retain its catalog identity',
      );
    },
  },
];
