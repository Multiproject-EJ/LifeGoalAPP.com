import { Suspense, useMemo, useState } from 'react';
import { concordCategoriesManifest } from '../features/gamification/games/arena-puzzles/concord-categories';
import { lexiconRelayManifest } from '../features/gamification/games/arena-puzzles/lexicon-relay';
import { signalPathManifest } from '../features/gamification/games/arena-puzzles/signal-path';
import { twinSigilsManifest } from '../features/gamification/games/arena-puzzles/twin-sigils';
import type { IslandRunMinigameResult } from '../features/gamification/level-worlds/services/islandRunMinigameTypes';
import { IslandRunArenaChoice } from '../features/gamification/level-worlds/components/IslandRunArenaChoice';
import { DEFAULT_ARENA_MINIGAME_PREFERENCES } from '../features/gamification/level-worlds/services/islandRunArenaPreferences';

const MANIFESTS = {
  concord_categories: concordCategoriesManifest,
  lexicon_relay: lexiconRelayManifest,
  signal_path: signalPathManifest,
  twin_sigils: twinSigilsManifest,
} as const;

type PreviewGameId = keyof typeof MANIFESTS;

function readPreviewGame(): PreviewGameId {
  if (typeof window === 'undefined') return 'concord_categories';
  const requested = new URLSearchParams(window.location.search).get('game');
  return requested && requested in MANIFESTS ? requested as PreviewGameId : 'concord_categories';
}

export default function ArenaPuzzlePreview() {
  const [gameId, setGameId] = useState<PreviewGameId>(readPreviewGame);
  const [result, setResult] = useState<IslandRunMinigameResult | null>(null);
  const manifest = MANIFESTS[gameId];
  const Minigame = manifest.Component;
  const launchConfig = useMemo(() => ({ arenaSessionSeconds: null }), []);
  const isChoicePreview = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('choice') === '1';

  const selectGame = (nextGameId: PreviewGameId) => {
    setGameId(nextGameId);
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.set('game', nextGameId);
    window.history.replaceState({}, '', url);
  };

  if (result) {
    return (
      <main style={{ minHeight: '100dvh', background: '#07142c', color: '#f8f4df', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <section>
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.18em', color: '#70d8ff' }}>Development preview</p>
          <h1>{result.completed ? 'Arena report received' : 'Game closed'}</h1>
          <p>{result.arenaPerformance ? `${result.arenaPerformance.mastery} mastery · ${result.arenaPerformance.stars}/3 stars` : 'No reward state was changed.'}</p>
          <button type="button" onClick={() => setResult(null)} style={{ border: 0, borderRadius: 999, padding: '14px 24px', fontWeight: 800 }}>Replay</button>
        </section>
      </main>
    );
  }

  if (isChoicePreview) {
    return (
      <main style={{ minHeight: '100dvh', boxSizing: 'border-box', padding: '80px 18px 24px', color: '#fff', background: 'radial-gradient(circle at 50% 10%, #244770, #081426 48%, #040a14)' }}>
        <section style={{ maxWidth: 430, margin: '0 auto', padding: 16, border: '1px solid rgba(238,210,137,.22)', borderRadius: 24, background: 'rgba(7, 16, 31, .72)' }}>
          <IslandRunArenaChoice
            playerKey="arena-preview"
            islandNumber={1}
            activeEventId="lucky_spin"
            activeEventRuntimeId="preview-event"
            preferences={DEFAULT_ARENA_MINIGAME_PREFERENCES}
            tickets={5}
            onLaunch={(id) => {
              if (id in MANIFESTS) selectGame(id as PreviewGameId);
              else setResult({ completed: false });
            }}
            onTune={() => undefined}
          />
        </section>
      </main>
    );
  }

  return (
    <>
      <nav aria-label="Arena preview games" style={{ position: 'fixed', zIndex: 100, left: 8, right: 8, bottom: 8, display: 'flex', gap: 5, padding: 5, borderRadius: 16, background: 'rgba(3, 11, 31, 0.86)', backdropFilter: 'blur(14px)' }}>
        {(Object.keys(MANIFESTS) as PreviewGameId[]).map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={id === gameId}
            onClick={() => selectGame(id)}
            style={{ flex: 1, minWidth: 0, border: id === gameId ? '1px solid #ffdd74' : '1px solid rgba(255,255,255,.18)', borderRadius: 12, padding: '8px 3px', color: '#fff', background: id === gameId ? '#183d72' : 'transparent', fontSize: 10, fontWeight: 800 }}
          >
            {MANIFESTS[id].title.split(' ')[0]}
          </button>
        ))}
      </nav>
      <Suspense fallback={<main style={{ minHeight: '100dvh', background: '#07142c' }} />}>
        <Minigame islandNumber={1} launchConfig={launchConfig} onComplete={setResult} />
      </Suspense>
    </>
  );
}
