import { useMemo, useState } from 'react';
import type { ArenaPerformance, IslandRunMinigameProps } from '../../../level-worlds/services/islandRunMinigameTypes';
import {
  CONCORD_PUZZLES,
  deterministicShuffle,
  isConcordSelectionCorrect,
  resolveArenaMastery,
  selectPuzzleForSession,
} from '../../../level-worlds/services/arenaPuzzleGames';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../../level-worlds/services/islandRunAudio';
import { ArenaPuzzleFrame, ArenaPuzzleResult, useArenaPuzzleClock } from '../_shared/ArenaPuzzleFrame';
import './concordCategories.css';

type Phase = 'briefing' | 'playing' | 'results';

export default function ConcordCategoriesMinigame({ islandNumber, launchConfig, onComplete }: IslandRunMinigameProps) {
  const puzzleSeed = typeof launchConfig?.arenaPuzzleSeed === 'string' ? launchConfig.arenaPuzzleSeed : `${islandNumber}:concord`;
  const puzzle = useMemo(() => selectPuzzleForSession(CONCORD_PUZZLES, islandNumber, puzzleSeed), [islandNumber, puzzleSeed]);
  const words = useMemo(() => deterministicShuffle(
    puzzle.categories.flatMap((category) => category.words),
    `${puzzle.id}:${islandNumber}`,
  ), [islandNumber, puzzle]);
  const sessionSeconds = typeof launchConfig?.arenaSessionSeconds === 'number'
    ? Math.max(15, Math.floor(launchConfig.arenaSessionSeconds))
    : null;
  const [phase, setPhase] = useState<Phase>('briefing');
  const [selected, setSelected] = useState<string[]>([]);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedWords, setHintedWords] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [performance, setPerformance] = useState<ArenaPerformance | null>(null);

  const finish = (elapsedSeconds: number, solvedCount = solvedIds.length) => {
    const normalized = resolveArenaMastery({
      completionRatio: solvedCount / puzzle.categories.length,
      mistakes,
      hints: hintsUsed,
      elapsedSeconds,
      parSeconds: 75,
    });
    setPerformance({
      gameId: 'concord_categories',
      rawScore: (solvedCount * 400) - (mistakes * 35) - (hintsUsed * 60),
      mastery: normalized.mastery,
      stars: normalized.stars,
      durationMs: elapsedSeconds * 1000,
      mistakes,
      hintsUsed,
    });
    setPhase('results');
    playIslandRunSound('sticker_complete');
    triggerIslandRunHaptic('sticker_complete');
  };

  const clock = useArenaPuzzleClock({
    active: phase === 'playing',
    sessionSeconds,
    onExpire: () => finish(sessionSeconds ?? 0),
  });

  if (phase === 'results' && performance) {
    return (
      <ArenaPuzzleResult
        icon="◈"
        title={solvedIds.length === puzzle.categories.length ? 'All channels restored' : 'Signal window closed'}
        performance={performance}
        summary={`${solvedIds.length} of ${puzzle.categories.length} hidden connections recovered.`}
        detail="Every completed report advances the active event reward channel. Accuracy improves Arena mastery."
        onContinue={() => onComplete({ completed: true, arenaPerformance: performance })}
      />
    );
  }

  if (phase === 'briefing') {
    return (
      <ArenaPuzzleFrame
        className="concord-categories"
        icon="◈"
        eyebrow="Concord language trial"
        title="Concord Categories"
        progress="3 channels"
        remainingSeconds={sessionSeconds}
        onClose={() => onComplete({ completed: false })}
      >
        <section className="arena-puzzle__brief concord-categories__briefing">
          <strong>Find the hidden connections.</strong>
          <span>{puzzle.briefing}</span>
        </section>
        <div className="concord-categories__demo" aria-hidden="true">
          <span>ROOT</span><span>RELAY</span><span>CHART</span><span>BLOOM</span>
          <i>◈</i>
        </div>
        <ol className="concord-categories__rules">
          <li>Select four signals.</li>
          <li>Press <strong>Link four</strong>.</li>
          <li>Restore all three channels.</li>
        </ol>
        <button type="button" className="arena-puzzle__primary" onClick={() => setPhase('playing')}>Open the signal board</button>
      </ArenaPuzzleFrame>
    );
  }

  const unsolvedWords = words.filter((word) => !puzzle.categories.some((category) => solvedIds.includes(category.id) && category.words.includes(word)));

  const toggleWord = (word: string) => {
    setMessage(null);
    setSelected((current) => {
      if (current.includes(word)) return current.filter((item) => item !== word);
      if (current.length >= 4) return current;
      return [...current, word];
    });
    playIslandRunSound('token_move');
  };

  const submit = () => {
    const category = isConcordSelectionCorrect(puzzle, selected);
    if (!category || solvedIds.includes(category.id)) {
      setMistakes((value) => value + 1);
      setMessage(selected.length < 4 ? 'Select exactly four signals.' : 'Close, but those four do not share one channel.');
      triggerIslandRunHaptic('stop_land');
      playIslandRunSound('market_insufficient_coins');
      return;
    }
    const nextSolved = [...solvedIds, category.id];
    setSolvedIds(nextSolved);
    setSelected([]);
    setHintedWords([]);
    setMessage(`${category.reveal} — channel restored.`);
    playIslandRunSound('sticker_complete');
    triggerIslandRunHaptic('roll');
    if (nextSolved.length === puzzle.categories.length) {
      window.setTimeout(() => finish(clock.elapsedSeconds, nextSolved.length), 520);
    }
  };

  const revealHint = () => {
    if (hintsUsed >= 2) return;
    const category = puzzle.categories.find((item) => !solvedIds.includes(item.id));
    if (!category) return;
    setHintsUsed((value) => value + 1);
    setHintedWords(category.words.slice(0, 2));
    setMessage('Two signals from the same channel are glowing.');
    playIslandRunSound('minigame_open');
  };

  return (
    <ArenaPuzzleFrame
      className="concord-categories"
      icon="◈"
      eyebrow="Concord language trial"
      title="Concord Categories"
      progress={`${solvedIds.length}/3 linked`}
      remainingSeconds={clock.remainingSeconds}
      onClose={() => onComplete({ completed: false })}
      message={message}
    >
      <section className="arena-puzzle__brief">
        <strong>Find four signals that belong together.</strong>
        <span>Three correct links restore the Concord channel.</span>
      </section>
      <div className="concord-categories__solved" aria-label="Restored channels">
        {puzzle.categories.filter((category) => solvedIds.includes(category.id)).map((category) => (
          <div key={category.id}>
            <strong>{category.reveal}</strong>
            <span>{category.words.join(' · ')}</span>
          </div>
        ))}
      </div>
      <div className="concord-categories__grid" aria-label="Unsorted signals">
        {unsolvedWords.map((word) => (
          <button
            type="button"
            key={word}
            className={`${selected.includes(word) ? 'is-selected' : ''}${hintedWords.includes(word) ? ' is-hinted' : ''}`}
            onClick={() => toggleWord(word)}
            aria-pressed={selected.includes(word)}
          >
            {word}
          </button>
        ))}
      </div>
      <div className="concord-categories__actions">
        <button type="button" className="arena-puzzle__secondary" onClick={revealHint} disabled={hintsUsed >= 2}>Hint {2 - hintsUsed}/2</button>
        <button type="button" className="arena-puzzle__primary" onClick={submit} disabled={selected.length !== 4}>Link four</button>
      </div>
      <span className="concord-categories__mistakes">Interference: {mistakes}</span>
    </ArenaPuzzleFrame>
  );
}
