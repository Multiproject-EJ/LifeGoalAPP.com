import { useMemo, useState } from 'react';
import type { ArenaPerformance, IslandRunMinigameProps } from '../../../level-worlds/services/islandRunMinigameTypes';
import {
  LEXICON_PUZZLES,
  deterministicShuffle,
  differsByOneLetter,
  resolveArenaMastery,
  selectPuzzleByIsland,
} from '../../../level-worlds/services/arenaPuzzleGames';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../../level-worlds/services/islandRunAudio';
import { ArenaPuzzleFrame, ArenaPuzzleResult, useArenaPuzzleClock } from '../_shared/ArenaPuzzleFrame';
import './lexiconRelay.css';

type Phase = 'briefing' | 'playing' | 'results';

export default function LexiconRelayMinigame({ islandNumber, launchConfig, onComplete }: IslandRunMinigameProps) {
  const puzzle = useMemo(() => selectPuzzleByIsland(LEXICON_PUZZLES, islandNumber), [islandNumber]);
  const sessionSeconds = typeof launchConfig?.arenaSessionSeconds === 'number'
    ? Math.max(15, Math.floor(launchConfig.arenaSessionSeconds))
    : null;
  const [phase, setPhase] = useState<Phase>('briefing');
  const [stepIndex, setStepIndex] = useState(0);
  const [chain, setChain] = useState<string[]>([puzzle.start]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintAnswer, setHintAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [performance, setPerformance] = useState<ArenaPerformance | null>(null);
  const currentStep = puzzle.steps[stepIndex] ?? null;
  const currentWord = chain[chain.length - 1] ?? puzzle.start;
  const options = useMemo(() => currentStep
    ? deterministicShuffle(currentStep.options, `${puzzle.id}:${stepIndex}`)
    : [], [currentStep, puzzle.id, stepIndex]);

  const finish = (elapsedSeconds: number, completedSteps = stepIndex) => {
    const normalized = resolveArenaMastery({
      completionRatio: completedSteps / puzzle.steps.length,
      mistakes,
      hints: hintsUsed,
      elapsedSeconds,
      parSeconds: 55,
    });
    setPerformance({
      gameId: 'lexicon_relay',
      rawScore: (completedSteps * 250) - (mistakes * 30) - (hintsUsed * 45),
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
        icon="A↗"
        title={stepIndex === puzzle.steps.length ? 'Relay connected' : 'Relay window closed'}
        performance={performance}
        summary={`${stepIndex} of ${puzzle.steps.length} transformations carried safely.`}
        detail="The game rewards a complete chain, but partial progress still becomes an Arena report."
        onContinue={() => onComplete({ completed: true, arenaPerformance: performance })}
      />
    );
  }

  if (phase === 'briefing') {
    return (
      <ArenaPuzzleFrame
        className="lexicon-relay"
        icon="A↗"
        eyebrow="Concord word relay"
        title="Lexicon Relay"
        progress={`${puzzle.start} → ${puzzle.destination}`}
        remainingSeconds={sessionSeconds}
        onClose={() => onComplete({ completed: false })}
      >
        <section className="arena-puzzle__brief">
          <strong>Change one letter. Keep the meaning moving.</strong>
          <span>{puzzle.dispatch}</span>
        </section>
        <div className="lexicon-relay__preview" aria-hidden="true">
          <span>{puzzle.start}</span><i>→</i><span>????</span><i>→</i><span>{puzzle.destination}</span>
        </div>
        <div className="lexicon-relay__rule-card">
          <strong>Each answer must:</strong>
          <span>✓ solve the clue</span>
          <span>✓ differ by exactly one letter</span>
          <span>✓ keep every letter in its position</span>
        </div>
        <button type="button" className="arena-puzzle__primary" onClick={() => setPhase('playing')}>Start the relay</button>
      </ArenaPuzzleFrame>
    );
  }

  const chooseWord = (word: string) => {
    if (!currentStep) return;
    setMessage(null);
    const validChange = differsByOneLetter(currentWord, word);
    if (word !== currentStep.answer || !validChange) {
      setMistakes((value) => value + 1);
      setMessage(validChange ? 'That word fits the relay, but not this clue.' : 'The relay can change exactly one letter.');
      playIslandRunSound('market_insufficient_coins');
      triggerIslandRunHaptic('stop_land');
      return;
    }
    const nextIndex = stepIndex + 1;
    setChain((current) => [...current, word]);
    setStepIndex(nextIndex);
    setHintAnswer(null);
    setMessage(nextIndex === puzzle.steps.length ? 'Destination reached.' : 'Clean handoff. Read the next clue.');
    playIslandRunSound('token_move');
    triggerIslandRunHaptic('roll');
    if (nextIndex === puzzle.steps.length) {
      window.setTimeout(() => finish(clock.elapsedSeconds, nextIndex), 520);
    }
  };

  const useHint = () => {
    if (!currentStep || hintsUsed >= 2) return;
    setHintsUsed((value) => value + 1);
    setHintAnswer(currentStep.answer);
    setMessage('The correct relay word is pulsing.');
    playIslandRunSound('minigame_open');
  };

  return (
    <ArenaPuzzleFrame
      className="lexicon-relay"
      icon="A↗"
      eyebrow="Concord word relay"
      title="Lexicon Relay"
      progress={`${stepIndex}/${puzzle.steps.length} links`}
      remainingSeconds={clock.remainingSeconds}
      onClose={() => onComplete({ completed: false })}
      message={message}
    >
      <div className="lexicon-relay__chain" aria-label={`Current word chain: ${chain.join(', ')}`}>
        {chain.map((word, index) => (
          <span key={`${word}:${index}`} className={index === chain.length - 1 ? 'is-current' : ''}>{word}</span>
        ))}
        {Array.from({ length: puzzle.steps.length - stepIndex }, (_, index) => <i key={`empty:${index}`}>····</i>)}
      </div>
      {currentStep ? (
        <section className="lexicon-relay__clue">
          <span>Relay clue {stepIndex + 1}</span>
          <strong>{currentStep.clue}</strong>
          <small>Change one letter in <b>{currentWord}</b></small>
        </section>
      ) : null}
      <div className="lexicon-relay__options">
        {options.map((word) => (
          <button
            type="button"
            key={word}
            className={hintAnswer === word ? 'is-hinted' : ''}
            onClick={() => chooseWord(word)}
          >
            {word.split('').map((letter, index) => (
              <span className={letter !== currentWord[index] ? 'is-change' : ''} key={`${letter}:${index}`}>{letter}</span>
            ))}
          </button>
        ))}
      </div>
      <button type="button" className="arena-puzzle__secondary" onClick={useHint} disabled={hintsUsed >= 2}>Reveal a relay word · {2 - hintsUsed} left</button>
      <span className="lexicon-relay__mistakes">Broken links: {mistakes}</span>
    </ArenaPuzzleFrame>
  );
}
