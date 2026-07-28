import { useMemo, useState } from 'react';

import {
  getIslandChampionshipPresentation,
  type IslandChampionshipPresentation,
} from '../narrative/islandChampionshipPresentation';
import { IslandChampionshipBanner } from './IslandChampionshipBanner';
import { IslandStoryReader } from './IslandStoryReader';

import './IslandChampionshipPreview.css';

const CHAMPIONSHIP_ISLANDS = [30, 72, 117] as const;

function getInitialPreviewIsland(): (typeof CHAMPIONSHIP_ISLANDS)[number] {
  if (typeof window === 'undefined') return 30;
  const requested = Number(new URLSearchParams(window.location.search).get('island'));
  return CHAMPIONSHIP_ISLANDS.includes(requested as (typeof CHAMPIONSHIP_ISLANDS)[number])
    ? requested as (typeof CHAMPIONSHIP_ISLANDS)[number]
    : 30;
}

export default function IslandChampionshipPreview() {
  const [islandNumber, setIslandNumber] = useState(getInitialPreviewIsland);
  const [storyOpen, setStoryOpen] = useState(false);
  const championship = useMemo(
    () => getIslandChampionshipPresentation(islandNumber) as IslandChampionshipPresentation,
    [islandNumber],
  );

  return (
    <main className="island-championship-preview">
      <header className="island-championship-preview__header">
        <p>Development showroom</p>
        <h1>Championship ceremonies</h1>
        <nav aria-label="Championship preview">
          {CHAMPIONSHIP_ISLANDS.map((candidateIsland) => (
            <button
              key={candidateIsland}
              type="button"
              aria-pressed={candidateIsland === islandNumber}
              onClick={() => {
                setIslandNumber(candidateIsland);
                setStoryOpen(false);
              }}
            >
              Island {candidateIsland}
            </button>
          ))}
        </nav>
      </header>

      <div className="island-championship-preview__stage">
        <IslandChampionshipBanner
          championship={championship}
          onOpenCeremony={() => setStoryOpen(true)}
        />
      </div>

      <IslandStoryReader
        manifestPath={championship.manifestPath}
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        completionTitle={`${championship.title} begins`}
        completionText="The opening ceremony is complete. The Arena is waiting."
        completionButtonLabel="Enter the Arena"
      />
    </main>
  );
}
