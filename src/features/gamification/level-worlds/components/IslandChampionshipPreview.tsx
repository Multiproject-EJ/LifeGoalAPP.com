import { useMemo, useState } from 'react';

import {
  getIslandChampionshipPresentation,
  ISLAND_CHAMPIONSHIP_NUMBERS,
  type IslandChampionshipPresentation,
} from '../narrative/islandChampionshipPresentation';
import { IslandChampionshipBanner } from './IslandChampionshipBanner';
import { IslandChampionshipOpeningModal } from './IslandChampionshipOpeningModal';
import { IslandStoryReader } from './IslandStoryReader';

import './IslandChampionshipPreview.css';

function getInitialPreviewIsland(): number {
  if (typeof window === 'undefined') return 30;
  const requested = Number(new URLSearchParams(window.location.search).get('island'));
  return ISLAND_CHAMPIONSHIP_NUMBERS.includes(requested)
    ? requested
    : 30;
}

export default function IslandChampionshipPreview() {
  const [islandNumber, setIslandNumber] = useState(getInitialPreviewIsland);
  const [openingModalOpen, setOpeningModalOpen] = useState(true);
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
          {ISLAND_CHAMPIONSHIP_NUMBERS.map((candidateIsland) => (
            <button
              key={candidateIsland}
              type="button"
              aria-pressed={candidateIsland === islandNumber}
              onClick={() => {
                setIslandNumber(candidateIsland);
                setOpeningModalOpen(true);
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
          onOpenCeremony={() => setOpeningModalOpen(true)}
        />
      </div>

      <IslandChampionshipOpeningModal
        championship={championship}
        isOpen={openingModalOpen}
        onClose={() => setOpeningModalOpen(false)}
        onOpenStory={championship.manifestPath ? () => {
          setOpeningModalOpen(false);
          setStoryOpen(true);
        } : undefined}
      />

      {championship.manifestPath ? (
        <IslandStoryReader
          manifestPath={championship.manifestPath}
          isOpen={storyOpen}
          onClose={() => setStoryOpen(false)}
          completionTitle={`${championship.title} begins`}
          completionText="The opening ceremony is complete. The Arena is waiting."
          completionButtonLabel="Enter the Arena"
        />
      ) : null}
    </main>
  );
}
