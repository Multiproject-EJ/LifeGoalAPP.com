import React from 'react';
import { IslandNarrativeDialogue, type IslandNarrativeDialogueProps } from './IslandNarrativeDialogue';

export const islandNarrativeDialoguePreviewStates: Array<Pick<IslandNarrativeDialogueProps, 'speakerName' | 'portraitSrc' | 'text' | 'secondaryText' | 'continueLabel' | 'closeLabel' | 'showClose' | 'tone'>> = [
  { speakerName: 'Miri', text: 'Start small. Help us wake one gentle place.', tone: 'standard' },
  { speakerName: 'Poko', text: 'The Hatchery is quiet, not gone. Help me wake one cradle.', tone: 'standard' },
  { speakerName: 'Elder Sava', text: 'The five lights are speaking again. Now we ask, not attack.', secondaryText: 'Aim for the crystal around her, not the heart inside it.', tone: 'wisdom' },
  { speakerName: 'Noctyra', text: 'Routes broke. Wings failed. Protect the small lights.', tone: 'guardian', closeLabel: 'Skip' },
  { speakerName: 'Miri of the Restored Route', text: 'The route is open because we opened it together. This longer preview line confirms that approved dialogue can wrap without pushing the action out of reach on small screens.', continueLabel: 'Follow the restored route', tone: 'standard' },
  { speakerName: 'Missing Portrait', portraitSrc: '/islands/001/story/missing-preview-portrait.webp', text: 'A missing image should become a magical speaker emblem, not a broken asset.', tone: 'wisdom' },
];

export function IslandNarrativeDialoguePreviewFixture({ index = 0 }: { index?: number }) {
  const state = islandNarrativeDialoguePreviewStates[index] ?? islandNarrativeDialoguePreviewStates[0];
  return <IslandNarrativeDialogue isOpen {...state} onContinue={() => undefined} onClose={() => undefined} />;
}
