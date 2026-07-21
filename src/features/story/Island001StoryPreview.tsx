import { useState } from 'react';

import { IslandStoryReader } from '../gamification/level-worlds/components/IslandStoryReader';

import './Island001StoryPreview.css';

const EPISODES = [
  {
    id: 'prologue',
    eyebrow: 'Global intro',
    title: 'Before the Lights Went Quiet',
    description: 'The connected islands, the Great Drift, and the first signal from Luma.',
    sceneCount: 7,
    manifestPath: '/storyline/episode-001/manifest.json',
  },
  {
    id: 'arrival',
    eyebrow: 'Island 001 arrival',
    title: 'The Light Under Glass',
    description: 'Miri, the silent Hatchery, and Noctyra’s repeating warning.',
    sceneCount: 5,
    manifestPath: '/islands/001/story/arrival/manifest.json',
  },
  {
    id: 'resolution',
    eyebrow: 'Island 001 resolution',
    title: 'The Warning Answers',
    description: 'Five restored lights reach Noctyra and reveal the wider mystery.',
    sceneCount: 8,
    manifestPath: '/islands/001/story/resolution/manifest.json',
  },
] as const;

type EpisodeIndex = 0 | 1 | 2;

export default function Island001StoryPreview() {
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<EpisodeIndex | null>(null);
  const [playCompleteSequence, setPlayCompleteSequence] = useState(false);

  const openEpisode = (index: EpisodeIndex) => {
    setPlayCompleteSequence(false);
    setActiveEpisodeIndex(index);
  };

  const openCompleteSequence = () => {
    setPlayCompleteSequence(true);
    setActiveEpisodeIndex(0);
  };

  const closeEpisode = () => {
    if (playCompleteSequence && activeEpisodeIndex !== null && activeEpisodeIndex < EPISODES.length - 1) {
      setActiveEpisodeIndex((activeEpisodeIndex + 1) as EpisodeIndex);
      return;
    }
    setActiveEpisodeIndex(null);
    setPlayCompleteSequence(false);
  };

  const activeEpisode = activeEpisodeIndex === null ? null : EPISODES[activeEpisodeIndex];

  return (
    <main className="island-story-preview">
      <section className="island-story-preview__hero">
        <p className="island-story-preview__kicker">Development story preview</p>
        <h1>Island 001 — Luma Isle</h1>
        <p>
          A working motion-webtoon concept for testing story order, pacing, copy,
          transitions, and the handoff into gameplay. Artwork and wording are intentionally replaceable.
        </p>
        <button
          type="button"
          className="island-story-preview__play-all"
          onClick={openCompleteSequence}
        >
          Play complete 20-scene concept
        </button>
      </section>

      <section className="island-story-preview__episodes" aria-label="Island 001 story episodes">
        {EPISODES.map((episode, index) => (
          <article className="island-story-preview__episode" key={episode.id}>
            <p className="island-story-preview__eyebrow">{episode.eyebrow}</p>
            <h2>{episode.title}</h2>
            <p>{episode.description}</p>
            <div className="island-story-preview__episode-footer">
              <span>{episode.sceneCount} scenes</span>
              <button type="button" onClick={() => openEpisode(index as EpisodeIndex)}>
                Preview episode
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside className="island-story-preview__note">
        <strong>Prototype intent</strong>
        <p>
          Use this route to decide what the final story should say and how it should look.
          It does not grant rewards, complete stops, resolve the boss, or mutate Island Run state.
        </p>
      </aside>

      {activeEpisode && (
        <IslandStoryReader
          manifestPath={activeEpisode.manifestPath}
          isOpen
          completionTitle={playCompleteSequence && activeEpisodeIndex !== 2 ? 'Chapter complete' : 'Story preview complete'}
          completionText={playCompleteSequence && activeEpisodeIndex !== 2 ? 'Continue to the next chapter.' : 'Return to the Island 001 preview.'}
          completionButtonLabel={playCompleteSequence && activeEpisodeIndex !== 2 ? 'Continue story' : 'Return to preview'}
          onClose={closeEpisode}
        />
      )}
    </main>
  );
}
