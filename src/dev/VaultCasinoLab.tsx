import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { lockFullscreenPageScroll } from '../utils/scrollLock';
import VaultCrownDiceThree from './VaultCrownDiceThree';
import {
  buildDormantDoorMiniGame,
  resolveDormantDoorReward,
  type DormantDoorFigure,
} from '../features/gamification/level-worlds/services/islandRunDormantDoorMinigame';
import {
  createCrownDice,
  createSolarOrreryTargets,
  createTreasuryOrganSequence,
  getVaultCasinoGameDefinition,
  rerollCrownDice,
  resolvePrismCascade,
  resolveVaultCasinoVirtualCashPayout,
  scoreCrownDice,
  scoreSolarOrrery,
  scoreTreasuryOrgan,
  turnCrownDie,
  VAULT_CASINO_GAME_DEFINITIONS,
  type PrismMirrorPosition,
  type VaultCasinoGameId,
  type VaultCasinoPrototypeResult,
} from '../features/gamification/level-worlds/services/islandRunVaultCasino';
import './VaultCasinoLab.css';

const FIGURE_ASSETS: Record<DormantDoorFigure, string> = {
  small: '/assets/vault-rush/diamond.webp',
  medium: '/assets/vault-rush/crown.webp',
  large: '/assets/vault-rush/amethyst.webp',
};

export type VaultCasinoLabMode = 'prototype' | 'inspect' | 'production';

export interface VaultCasinoProductionCashOutResult {
  accepted: boolean;
  virtualCashBalance: number;
  claimCount: number;
  payout: number;
  grandCofferComplete: boolean;
  message?: string;
}

export interface VaultCasinoLabProps {
  mode?: VaultCasinoLabMode;
  initialGameId?: VaultCasinoGameId;
  availableGameId?: VaultCasinoGameId | null;
  productionClaimCount?: number;
  productionCompletedGameIds?: readonly VaultCasinoGameId[];
  productionSeed?: number;
  productionCashBalance?: number;
  onProductionCashOut?: (
    gameId: VaultCasinoGameId,
    result: VaultCasinoPrototypeResult,
  ) => VaultCasinoProductionCashOutResult;
  onClose?: () => void;
}

interface CasinoGameProps {
  inspectOnly: boolean;
  seed: number;
  onComplete: (result: VaultCasinoPrototypeResult) => void;
}

interface VaultCasinoQaSnapshot {
  mode: VaultCasinoLabMode;
  selectedGameId: VaultCasinoGameId;
  availableGameId: VaultCasinoGameId | null;
  completedGameIds: VaultCasinoGameId[];
  cashedOutGameIds: VaultCasinoGameId[];
  virtualCashBalance: number;
  tourActive: boolean;
  resultTier: VaultCasinoPrototypeResult['tier'] | null;
  grandCofferOpen: boolean;
  sessionEnded: boolean;
}

const VAULT_CASH_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function formatVaultCash(value: number): string {
  return VAULT_CASH_FORMATTER.format(Math.max(0, Math.floor(value)));
}

function readLabMode(): VaultCasinoLabMode {
  if (typeof window === 'undefined') return 'prototype';
  return new URLSearchParams(window.location.search).get('mode') === 'inspect' ? 'inspect' : 'prototype';
}

function readInitialGameId(): VaultCasinoGameId {
  if (typeof window === 'undefined') return 'vault-rush';
  const requested = new URLSearchParams(window.location.search).get('game');
  return VAULT_CASINO_GAME_DEFINITIONS.some((definition) => definition.id === requested)
    ? requested as VaultCasinoGameId
    : 'vault-rush';
}

function readAvailableGameId(): VaultCasinoGameId | null {
  if (typeof window === 'undefined') return null;
  const requested = new URLSearchParams(window.location.search).get('available');
  return VAULT_CASINO_GAME_DEFINITIONS.some((definition) => definition.id === requested)
    ? requested as VaultCasinoGameId
    : null;
}

function CasinoGameIcon({ gameId }: { gameId: VaultCasinoGameId }) {
  if (gameId === 'vault-rush') {
    return <span className="vault-casino-icon__vault"><i /><i /><i /></span>;
  }
  if (gameId === 'crown-dice') {
    return <span className="vault-casino-icon__dice"><i>4</i><i>6</i></span>;
  }
  if (gameId === 'solar-orrery') {
    return <span className="vault-casino-icon__orrery"><i /><b /></span>;
  }
  if (gameId === 'prism-cascade') {
    return <span className="vault-casino-icon__prism"><i /><b /><b /></span>;
  }
  return <span className="vault-casino-icon__organ">{[0, 1, 2, 3, 4].map((pipe) => <i key={pipe} />)}</span>;
}

function MachineResult({ result }: { result: VaultCasinoPrototypeResult }) {
  const payout = resolveVaultCasinoVirtualCashPayout(result);
  return (
    <div className={`vault-casino-result is-${result.tier}`} role="status" aria-live="polite">
      <span>{result.tier}</span>
      <strong>{result.summary}</strong>
      <small aria-label={`${result.score} of ${result.maxScore} points`}>+{formatVaultCash(payout)} cash</small>
    </div>
  );
}

function InspectState() {
  return (
    <div className="vault-casino-inspect-state">
      <span className="vault-casino-inspect-state__lamp" aria-hidden="true" />
      <strong>Casino showroom</strong>
      <small>Plays are granted only during Island Run.</small>
    </div>
  );
}

function VaultRushPrototype({ inspectOnly, seed, onComplete }: CasinoGameProps) {
  const round = useMemo(() => buildDormantDoorMiniGame({
    islandNumber: 4,
    tileIndex: 8,
    rollIndex: seed,
    doorStopId: 'habit',
  }), [seed]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [result, setResult] = useState<VaultCasinoPrototypeResult | null>(null);

  const selectDoor = (index: number) => {
    if (inspectOnly || result || selectedIndices.includes(index)) return;
    const next = [...selectedIndices, index];
    setSelectedIndices(next);
    const reward = resolveDormantDoorReward(
      next.map((selectedIndex) => round.doors[selectedIndex]?.figure).filter(Boolean) as DormantDoorFigure[],
      next,
      round.rewardLevels,
    );
    if (!reward) return;
    const score = reward.tier === 'jackpot' ? 100 : reward.tier === 'medium' ? 68 : 42;
    const nextResult: VaultCasinoPrototypeResult = {
      tier: reward.tier === 'jackpot' ? 'sovereign' : reward.tier === 'medium' ? 'grand' : 'standard',
      score,
      maxScore: 100,
      summary: reward.tier === 'jackpot' ? 'Sovereign vault' : reward.tier === 'medium' ? 'Grand vault' : 'Treasury vault',
    };
    setResult(nextResult);
    onComplete(nextResult);
  };

  return (
    <div className="vault-casino-machine vault-casino-machine--rush">
      <div className="vault-rush-prototype__arch" aria-hidden="true" />
      <div className="vault-rush-prototype__doors" aria-label="Vault Rush doors">
        {round.doors.map((door, index) => {
          const revealed = selectedIndices.includes(index) || inspectOnly;
          return (
            <button
              key={door.id}
              type="button"
              className={revealed ? 'is-revealed' : ''}
              onClick={() => selectDoor(index)}
              disabled={inspectOnly || Boolean(result)}
              aria-label={revealed ? `Door ${index + 1} revealed` : `Reveal door ${index + 1}`}
            >
              <span className="vault-rush-prototype__door-face"><i /></span>
              <span className="vault-rush-prototype__figure">
                <img src={FIGURE_ASSETS[door.figure]} alt="" />
              </span>
            </button>
          );
        })}
      </div>
      {inspectOnly ? <InspectState /> : result ? <MachineResult result={result} /> : (
        <p className="vault-casino-machine__prompt">Find three matching treasury figures</p>
      )}
    </div>
  );
}

function CrownDicePrototype({ inspectOnly, seed, onComplete }: CasinoGameProps) {
  const [dice, setDice] = useState<readonly number[]>(() => createCrownDice(seed));
  const [heldIndices, setHeldIndices] = useState<number[]>([]);
  const [selectedDie, setSelectedDie] = useState(0);
  const [rerollCount, setRerollCount] = useState(0);
  const [crownUsed, setCrownUsed] = useState(false);
  const [result, setResult] = useState<VaultCasinoPrototypeResult | null>(null);
  const [motionRevision, setMotionRevision] = useState(0);
  const [animatedIndices, setAnimatedIndices] = useState<number[]>([0, 1, 2, 3, 4]);

  const toggleDie = (index: number) => {
    if (inspectOnly || result) return;
    setSelectedDie(index);
    setHeldIndices((current) => current.includes(index)
      ? current.filter((entry) => entry !== index)
      : [...current, index]);
  };

  const reroll = () => {
    if (inspectOnly || result || rerollCount >= 2) return;
    setAnimatedIndices(dice.map((_, index) => index).filter((index) => !heldIndices.includes(index)));
    setMotionRevision((revision) => revision + 1);
    setDice(rerollCrownDice({ dice, heldIndices, seed, rerollIndex: rerollCount + 1 }));
    setRerollCount((count) => count + 1);
  };

  const crownTurn = () => {
    if (inspectOnly || result || crownUsed) return;
    setAnimatedIndices([selectedDie]);
    setMotionRevision((revision) => revision + 1);
    setDice(turnCrownDie(dice, selectedDie));
    setCrownUsed(true);
  };

  const scoreHand = () => {
    if (inspectOnly || result) return;
    const nextResult = scoreCrownDice(dice);
    setResult(nextResult);
    onComplete(nextResult);
  };

  return (
    <div className="vault-casino-machine vault-casino-machine--dice">
      <VaultCrownDiceThree
        dice={dice}
        heldIndices={heldIndices}
        selectedDie={selectedDie}
        inspectOnly={inspectOnly || Boolean(result)}
        animationRevision={motionRevision}
        animatedIndices={animatedIndices}
        onSelectDie={toggleDie}
      />
      <div className="vault-casino-visually-hidden" aria-label="Crown Dice selection controls">
        {dice.map((value, index) => (
          <button
            key={index}
            type="button"
            onClick={() => toggleDie(index)}
            disabled={inspectOnly || Boolean(result)}
            aria-label={`Die ${index + 1}: ${value}${heldIndices.includes(index) ? ', held' : ''}`}
          >
            {value}
          </button>
        ))}
      </div>
      {inspectOnly ? <InspectState /> : result ? <MachineResult result={result} /> : (
        <div className="vault-casino-machine__actions">
          <button type="button" onClick={reroll} disabled={rerollCount >= 2}>Reroll {2 - rerollCount}</button>
          <button type="button" onClick={crownTurn} disabled={crownUsed}>Crown turn</button>
          <button type="button" className="is-primary" onClick={scoreHand}>Set hand</button>
        </div>
      )}
    </div>
  );
}

const ORRERY_SPEEDS = [0.045, -0.061, 0.078] as const;

function SolarOrreryPrototype({ inspectOnly, seed, onComplete }: CasinoGameProps) {
  const targets = useMemo(() => createSolarOrreryTargets(seed), [seed]);
  const startAtRef = useRef(typeof performance === 'undefined' ? 0 : performance.now());
  const [stoppedAngles, setStoppedAngles] = useState<Array<number | null>>([null, null, null]);
  const [result, setResult] = useState<VaultCasinoPrototypeResult | null>(null);
  const nextRing = stoppedAngles.findIndex((angle) => angle === null);

  const stopNextRing = () => {
    if (inspectOnly || result || nextRing < 0) return;
    const elapsed = (typeof performance === 'undefined' ? 0 : performance.now()) - startAtRef.current;
    const angle = ((elapsed * ORRERY_SPEEDS[nextRing]) % 360 + 360) % 360;
    const next = [...stoppedAngles];
    next[nextRing] = angle;
    setStoppedAngles(next);
    if (next.every((entry) => entry !== null)) {
      const nextResult = scoreSolarOrrery(next as number[], targets);
      setResult(nextResult);
      onComplete(nextResult);
    }
  };

  return (
    <div className="vault-casino-machine vault-casino-machine--orrery">
      <div className="solar-orrery" aria-label="Three-ring solar orrery">
        {stoppedAngles.map((angle, index) => (
          <span
            key={index}
            className={`solar-orrery__ring solar-orrery__ring--${index + 1}${angle !== null ? ' is-stopped' : ''}`}
            style={{
              '--stopped-angle': `${angle ?? 0}deg`,
              '--target-angle': `${targets[index]}deg`,
            } as CSSProperties}
          ><i /><b /></span>
        ))}
        <strong className="solar-orrery__sun"><i /></strong>
      </div>
      {inspectOnly ? <InspectState /> : result ? <MachineResult result={result} /> : (
        <div className="vault-casino-machine__actions vault-casino-machine__actions--single">
          <button type="button" className="is-primary" onClick={stopNextRing}>
            Stop {nextRing === 0 ? 'outer' : nextRing === 1 ? 'middle' : 'inner'} ring
          </button>
        </div>
      )}
    </div>
  );
}

function PrismCascadePrototype({ inspectOnly, seed, onComplete }: CasinoGameProps) {
  const [mirrors, setMirrors] = useState<PrismMirrorPosition[]>([0, 0, 0]);
  const [route, setRoute] = useState<readonly number[] | null>(null);
  const [result, setResult] = useState<VaultCasinoPrototypeResult | null>(null);

  const cycleMirror = (index: number) => {
    if (inspectOnly || result) return;
    setMirrors((current) => current.map((position, mirrorIndex) => (
      mirrorIndex === index ? (position === 1 ? -1 : position + 1) as PrismMirrorPosition : position
    )));
  };

  const release = () => {
    if (inspectOnly || result) return;
    const resolution = resolvePrismCascade(seed, mirrors);
    setRoute(resolution.lanes);
    setResult(resolution.result);
    window.setTimeout(() => onComplete(resolution.result), 700);
  };

  return (
    <div className="vault-casino-machine vault-casino-machine--prism">
      <div className={`prism-cascade${route ? ' is-released' : ''}`} aria-label="Prism cascade machine">
        <span
          className="prism-cascade__crystal"
          style={{
            '--prism-mid': `${(route?.[route.length - 1] ?? 0) * 7}px`,
            '--prism-finish': `${(route?.[route.length - 1] ?? 0) * 18}px`,
          } as CSSProperties}
        />
        {mirrors.map((position, index) => (
          <button
            key={index}
            type="button"
            className={`prism-cascade__mirror is-${position === -1 ? 'left' : position === 1 ? 'right' : 'center'}`}
            onClick={() => cycleMirror(index)}
            disabled={inspectOnly || Boolean(result)}
            aria-label={`Mirror ${index + 1}: ${position === -1 ? 'left' : position === 1 ? 'right' : 'center'}`}
          ><i /></button>
        ))}
        <span className="prism-cascade__vault"><i /><i /><i /><i /><i /><i /><i /></span>
      </div>
      {inspectOnly ? <InspectState /> : result ? <MachineResult result={result} /> : (
        <div className="vault-casino-machine__actions vault-casino-machine__actions--single">
          <button type="button" className="is-primary" onClick={release}>Release crystal</button>
        </div>
      )}
    </div>
  );
}

function TreasuryOrganPrototype({ inspectOnly, seed, onComplete }: CasinoGameProps) {
  const sequence = useMemo(() => createTreasuryOrganSequence(seed), [seed]);
  const [phase, setPhase] = useState<'ready' | 'watch' | 'play' | 'done'>('ready');
  const [litPipe, setLitPipe] = useState<number | null>(null);
  const [played, setPlayed] = useState<number[]>([]);
  const [result, setResult] = useState<VaultCasinoPrototypeResult | null>(null);

  useEffect(() => {
    if (phase !== 'watch') return;
    let step = 0;
    const timer = window.setInterval(() => {
      if (step >= sequence.length) {
        window.clearInterval(timer);
        setLitPipe(null);
        setPhase('play');
        return;
      }
      setLitPipe(sequence[step]);
      window.setTimeout(() => setLitPipe(null), 260);
      step += 1;
    }, 520);
    return () => window.clearInterval(timer);
  }, [phase, sequence]);

  const playPipe = (pipeIndex: number) => {
    if (inspectOnly || phase !== 'play' || result) return;
    const next = [...played, pipeIndex];
    setPlayed(next);
    setLitPipe(pipeIndex);
    window.setTimeout(() => setLitPipe(null), 180);
    if (next.length < sequence.length) return;
    const nextResult = scoreTreasuryOrgan(sequence, next);
    setResult(nextResult);
    setPhase('done');
    onComplete(nextResult);
  };

  return (
    <div className="vault-casino-machine vault-casino-machine--organ">
      <div className="treasury-organ" aria-label="Five-pipe treasury organ">
        {VAULT_CASINO_GAME_DEFINITIONS.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`${litPipe === index ? 'is-lit' : ''}${phase === 'play' ? ' is-playable' : ''}`}
            onClick={() => playPipe(index)}
            disabled={inspectOnly || phase !== 'play' || Boolean(result)}
            aria-label={`Play treasury pipe ${index + 1}`}
          ><i /><b /></button>
        ))}
        <span className="treasury-organ__keys" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map((key) => <i key={key} />)}</span>
      </div>
      {inspectOnly ? <InspectState /> : result ? <MachineResult result={result} /> : (
        <div className="vault-casino-machine__actions vault-casino-machine__actions--single">
          {phase === 'ready' ? <button type="button" className="is-primary" onClick={() => setPhase('watch')}>Hear sequence</button> : null}
          {phase === 'watch' ? <span className="vault-casino-machine__status">Listen</span> : null}
          {phase === 'play' ? <span className="vault-casino-machine__status">Your answer · {played.length}/{sequence.length}</span> : null}
        </div>
      )}
    </div>
  );
}

function CasinoGameStage({
  gameId,
  inspectOnly,
  seed,
  onComplete,
}: CasinoGameProps & { gameId: VaultCasinoGameId }) {
  if (gameId === 'vault-rush') return <VaultRushPrototype inspectOnly={inspectOnly} seed={seed} onComplete={onComplete} />;
  if (gameId === 'crown-dice') return <CrownDicePrototype inspectOnly={inspectOnly} seed={seed} onComplete={onComplete} />;
  if (gameId === 'solar-orrery') return <SolarOrreryPrototype inspectOnly={inspectOnly} seed={seed} onComplete={onComplete} />;
  if (gameId === 'prism-cascade') return <PrismCascadePrototype inspectOnly={inspectOnly} seed={seed} onComplete={onComplete} />;
  return <TreasuryOrganPrototype inspectOnly={inspectOnly} seed={seed} onComplete={onComplete} />;
}

export default function VaultCasinoLab({
  mode = readLabMode(),
  initialGameId = readInitialGameId(),
  availableGameId = readAvailableGameId(),
  productionClaimCount = 0,
  productionCompletedGameIds = [],
  productionSeed = 17,
  productionCashBalance = 0,
  onProductionCashOut,
  onClose,
}: VaultCasinoLabProps = {}) {
  const inspectOnly = mode === 'inspect';
  const productionMode = mode === 'production';
  const [selectedGameId, setSelectedGameId] = useState<VaultCasinoGameId>(initialGameId);
  const [seedByGame, setSeedByGame] = useState<Record<VaultCasinoGameId, number>>(() => Object.fromEntries(
    VAULT_CASINO_GAME_DEFINITIONS.map((definition, index) => [definition.id, 17 + index * 97]),
  ) as Record<VaultCasinoGameId, number>);
  const [completedResults, setCompletedResults] = useState<Partial<Record<VaultCasinoGameId, VaultCasinoPrototypeResult>>>({});
  const [cashedOutGameIds, setCashedOutGameIds] = useState<VaultCasinoGameId[]>([]);
  const [virtualCashBalance, setVirtualCashBalance] = useState(productionMode ? productionCashBalance : 0);
  const [tourActive, setTourActive] = useState(false);
  const [grandCofferOpen, setGrandCofferOpen] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [productionStatus, setProductionStatus] = useState<string | null>(null);
  const [productionGrandCofferComplete, setProductionGrandCofferComplete] = useState(false);
  const grandCofferShownRef = useRef(false);
  const cashedOutGameIdsRef = useRef<Set<VaultCasinoGameId>>(new Set());
  const selectedDefinition = getVaultCasinoGameDefinition(selectedGameId);
  const selectedResult = completedResults[selectedGameId] ?? null;
  const selectedPayout = selectedResult ? resolveVaultCasinoVirtualCashPayout(selectedResult) : 0;
  const selectedCashedOut = cashedOutGameIds.includes(selectedGameId);
  const selectedGamePlayable = !inspectOnly && (!productionMode || selectedGameId === availableGameId);

  useEffect(() => {
    if (!productionMode) return;
    setVirtualCashBalance(productionCashBalance);
  }, [productionCashBalance, productionMode]);

  useEffect(() => {
    if (!productionMode || !availableGameId) return;
    setSelectedGameId(availableGameId);
    setTourActive(false);
  }, [availableGameId, productionMode]);

  useEffect(() => {
    if (!productionMode) return undefined;
    return lockFullscreenPageScroll({ root: true });
  }, [productionMode]);

  useEffect(() => {
    if (!tourActive) return;
    const timer = window.setInterval(() => {
      setSelectedGameId((current) => {
        const currentIndex = VAULT_CASINO_GAME_DEFINITIONS.findIndex((definition) => definition.id === current);
        return VAULT_CASINO_GAME_DEFINITIONS[(currentIndex + 1) % VAULT_CASINO_GAME_DEFINITIONS.length].id;
      });
    }, 3200);
    return () => window.clearInterval(timer);
  }, [tourActive]);

  const handleComplete = useCallback((result: VaultCasinoPrototypeResult) => {
    if (!selectedGamePlayable) return;
    setCompletedResults((current) => ({ ...current, [selectedGameId]: result }));
    setProductionStatus(null);
  }, [selectedGameId, selectedGamePlayable]);

  const resetSelectedGame = () => {
    if (inspectOnly || productionMode) return;
    setCompletedResults((current) => {
      const next = { ...current };
      delete next[selectedGameId];
      return next;
    });
    setSeedByGame((current) => ({ ...current, [selectedGameId]: current[selectedGameId] + 1 }));
    cashedOutGameIdsRef.current.delete(selectedGameId);
    setCashedOutGameIds((current) => current.filter((gameId) => gameId !== selectedGameId));
    setSessionEnded(false);
  };

  const cashOutSelectedGame = () => {
    if (inspectOnly || !selectedResult || cashedOutGameIdsRef.current.has(selectedGameId)) return;
    if (productionMode) {
      if (selectedGameId !== availableGameId || !onProductionCashOut) return;
      const result = onProductionCashOut(selectedGameId, selectedResult);
      if (!result.accepted) {
        setProductionStatus(result.message ?? 'This Vault play could not be secured.');
        return;
      }
      cashedOutGameIdsRef.current.add(selectedGameId);
      setVirtualCashBalance(result.virtualCashBalance);
      setCashedOutGameIds((current) => [...current, selectedGameId]);
      setProductionStatus(`+${formatVaultCash(result.payout)} vault cash secured`);
      setProductionGrandCofferComplete(result.grandCofferComplete);
      return;
    }
    cashedOutGameIdsRef.current.add(selectedGameId);
    setVirtualCashBalance((current) => current + selectedPayout);
    setCashedOutGameIds((current) => [...current, selectedGameId]);
  };

  const beginNewSession = () => {
    if (inspectOnly || productionMode) return;
    setCompletedResults({});
    cashedOutGameIdsRef.current.clear();
    setCashedOutGameIds([]);
    setSeedByGame((current) => Object.fromEntries(
      VAULT_CASINO_GAME_DEFINITIONS.map((definition) => [definition.id, current[definition.id] + 1]),
    ) as Record<VaultCasinoGameId, number>);
    setGrandCofferOpen(false);
    setSessionEnded(false);
    grandCofferShownRef.current = false;
  };

  const completedGameIds = useMemo(() => {
    const completed = new Set<VaultCasinoGameId>(productionMode ? productionCompletedGameIds : []);
    for (const definition of VAULT_CASINO_GAME_DEFINITIONS) {
      if (completedResults[definition.id]) completed.add(definition.id);
    }
    return VAULT_CASINO_GAME_DEFINITIONS
      .map((definition) => definition.id)
      .filter((gameId) => completed.has(gameId));
  }, [completedResults, productionCompletedGameIds, productionMode]);
  const securedGameIds = useMemo(() => {
    const secured = new Set<VaultCasinoGameId>(productionMode ? productionCompletedGameIds : []);
    cashedOutGameIds.forEach((gameId) => secured.add(gameId));
    return [...secured];
  }, [cashedOutGameIds, productionCompletedGameIds, productionMode]);
  const totalSessionWinnings = useMemo(() => Object.values(completedResults)
    .reduce((total, result) => total + (result ? resolveVaultCasinoVirtualCashPayout(result) : 0), 0), [completedResults]);
  const sessionReadyToEnd = productionMode
    ? productionGrandCofferComplete
    : completedGameIds.length === VAULT_CASINO_GAME_DEFINITIONS.length
      && cashedOutGameIds.length === VAULT_CASINO_GAME_DEFINITIONS.length;

  useEffect(() => {
    if (!sessionReadyToEnd) {
      grandCofferShownRef.current = false;
      setGrandCofferOpen(false);
      return;
    }
    if (inspectOnly || grandCofferShownRef.current) return;
    grandCofferShownRef.current = true;
    const timer = window.setTimeout(() => setGrandCofferOpen(true), 650);
    return () => window.clearTimeout(timer);
  }, [inspectOnly, sessionReadyToEnd]);

  useEffect(() => {
    const snapshot: VaultCasinoQaSnapshot = {
      mode,
      selectedGameId,
      availableGameId,
      completedGameIds,
      cashedOutGameIds: securedGameIds,
      virtualCashBalance,
      tourActive,
      resultTier: selectedResult?.tier ?? null,
      grandCofferOpen,
      sessionEnded,
    };
    (window as unknown as { __vaultCasinoLabQa?: VaultCasinoQaSnapshot }).__vaultCasinoLabQa = snapshot;
    (window as unknown as { __vaultCasinoLabQaControls?: {
      selectGame: (gameId: VaultCasinoGameId) => void;
      setTour: (active: boolean) => void;
      cashOut: () => void;
      beginNewSession: () => void;
    } }).__vaultCasinoLabQaControls = {
      selectGame: setSelectedGameId,
      setTour: setTourActive,
      cashOut: cashOutSelectedGame,
      beginNewSession,
    };
    return () => {
      delete (window as unknown as { __vaultCasinoLabQa?: VaultCasinoQaSnapshot }).__vaultCasinoLabQa;
      delete (window as unknown as { __vaultCasinoLabQaControls?: unknown }).__vaultCasinoLabQaControls;
    };
  }, [availableGameId, completedGameIds, grandCofferOpen, mode, securedGameIds, selectedGameId, selectedResult?.tier, sessionEnded, tourActive, virtualCashBalance]);

  return (
    <main className={`vault-casino-lab is-${mode}`}>
      <section className="vault-casino-lab__phone" aria-label="Vault Casino">
        <div className="vault-casino-lab__architecture" aria-hidden="true">
          <span className="vault-casino-lab__ceiling"><i /><i /><i /></span>
          <span className="vault-casino-lab__column is-left" />
          <span className="vault-casino-lab__column is-right" />
          <span className="vault-casino-lab__floor"><i /><i /><i /><i /><i /></span>
        </div>

        <header className="vault-casino-lab__topbar">
          <div>
            <span>{inspectOnly ? 'Private casino' : productionMode ? 'Island Run casino' : 'Casino 2.0 lab'}</span>
            <strong>{selectedDefinition.name}</strong>
          </div>
          <div className="vault-casino-lab__wallet" aria-label={`${formatVaultCash(virtualCashBalance)} vault cash`}>
            <span>Vault cash</span>
            <strong>{formatVaultCash(virtualCashBalance)}</strong>
          </div>
          <button
            type="button"
            className={tourActive ? 'is-active' : ''}
            onClick={() => setTourActive((active) => !active)}
            aria-pressed={tourActive}
          >Tour</button>
          {onClose ? (
            <button type="button" className="vault-casino-lab__close" onClick={onClose} aria-label="Return to Vault Island" title="Return to Vault Island">×</button>
          ) : null}
        </header>

        <nav className="vault-casino-lab__games" aria-label="Vault Casino games">
          {VAULT_CASINO_GAME_DEFINITIONS.map((definition) => {
            const isSelected = selectedGameId === definition.id;
            const isAvailable = availableGameId === definition.id;
            const isComplete = completedGameIds.includes(definition.id);
            return (
              <button
                key={definition.id}
                type="button"
                className={`${isSelected ? 'is-selected' : ''}${isAvailable ? ' is-available' : ''}${isComplete ? ' is-complete' : ''}`}
                style={{ '--game-accent': definition.accent } as CSSProperties}
                onClick={() => {
                  setTourActive(false);
                  setSelectedGameId(definition.id);
                }}
                aria-pressed={isSelected}
                aria-label={`${definition.name}${isAvailable ? ', game available during Island Run' : ''}`}
                title={definition.name}
              >
                <CasinoGameIcon gameId={definition.id} />
                {isAvailable ? <span className="vault-casino-lab__availability" aria-hidden="true" /> : null}
                {isComplete ? <span className="vault-casino-lab__complete" aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </nav>

        <section className="vault-casino-lab__machine-stage" style={{ '--game-accent': selectedDefinition.accent } as CSSProperties}>
          <header className="vault-casino-lab__machine-heading">
            <span>{selectedDefinition.format}</span>
            <h1>{selectedDefinition.name}</h1>
          </header>
          <CasinoGameStage
            key={`${selectedGameId}-${productionMode && selectedGameId === availableGameId ? productionSeed : seedByGame[selectedGameId]}-${mode}`}
            gameId={selectedGameId}
            inspectOnly={!selectedGamePlayable}
            seed={productionMode && selectedGameId === availableGameId ? productionSeed : seedByGame[selectedGameId]}
            onComplete={handleComplete}
          />
        </section>

        {grandCofferOpen ? (
          <section className="vault-casino-grand-coffer" aria-live="assertive" aria-label="Grand Coffer opened">
            <div className="vault-casino-grand-coffer__rays" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((ray) => <i key={ray} />)}
            </div>
            <div className="vault-casino-grand-coffer__chest" aria-hidden="true">
              <span className="is-lid"><i /><i /><i /><i /><i /></span>
              <span className="is-vault"><i /><i /><i /></span>
              <span className="is-treasure"><i /><i /><i /><i /><i /></span>
            </div>
            <span>Five seals united</span>
            <h2>Grand Coffer</h2>
            <strong>{formatVaultCash(productionMode ? virtualCashBalance : totalSessionWinnings)} vault cash secured</strong>
            <button type="button" onClick={() => {
              setGrandCofferOpen(false);
              setSessionEnded(true);
              if (productionMode) onClose?.();
            }}>Finish session</button>
          </section>
        ) : null}

        <footer className="vault-casino-lab__footer">
          <div className="vault-casino-lab__coffer" aria-label={`${completedGameIds.length} of 5 casino seals complete`}>
            {VAULT_CASINO_GAME_DEFINITIONS.map((definition) => (
              <i key={definition.id} className={completedGameIds.includes(definition.id) ? 'is-lit' : ''} />
            ))}
          </div>
          <div>
            <span>{inspectOnly ? 'Inspection access' : sessionEnded ? 'Session complete' : `${Math.max(productionMode ? productionClaimCount : 0, completedGameIds.length)}/5 seals · ${securedGameIds.length} cashed out`}</span>
            <strong>{inspectOnly ? 'Play opens from Island Run' : productionStatus ?? (selectedResult ? `${selectedResult.summary} · ${selectedCashedOut ? 'Secured' : `${formatVaultCash(selectedPayout)} cash ready`}` : selectedGamePlayable ? selectedDefinition.description : 'Inspect this machine. Its earned play opens later in the rotation.')}</strong>
          </div>
          {!inspectOnly && selectedResult && !selectedCashedOut ? (
            <button type="button" className="is-cash-out" onClick={cashOutSelectedGame}>Cash out</button>
          ) : !inspectOnly && !productionMode && sessionEnded ? (
            <button type="button" onClick={beginNewSession}>Play again</button>
          ) : !inspectOnly && sessionReadyToEnd ? (
            <button type="button" onClick={() => setGrandCofferOpen(true)}>Open</button>
          ) : !inspectOnly && selectedResult && selectedCashedOut ? (
            <button type="button" disabled>Secured</button>
          ) : !inspectOnly && !productionMode ? (
            <button type="button" onClick={resetSelectedGame} aria-label={`Reset ${selectedDefinition.name}`} title={`Reset ${selectedDefinition.name}`}>↻</button>
          ) : null}
        </footer>
      </section>
    </main>
  );
}
