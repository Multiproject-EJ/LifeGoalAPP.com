/**
 * IslandWorkshopMinigame.tsx — playable block-placement puzzle for the Island
 * Workshop timed event (strategic Blocks-Boutique-style, original rules/art).
 *
 * Four states only: entry → playing → construction reward → results. All game
 * rules live in `services/islandWorkshopGame.ts`; this file owns rendering,
 * touch dragging, saved-progress storage and ticket-spend callbacks.
 *
 * Ticket authority stays canonical: event tickets are material blocks. Opening
 * the bench is free; every successful block placement spends one ticket through
 * the `requestBlockTicketSpend` launchConfig callback.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import {
  applyIslandWorkshopConstructionGain,
  applyIslandWorkshopCreatureAssist,
  buildIslandWorkshopConstructionStorageKey,
  buildIslandWorkshopRunStorageKey,
  canStartIslandWorkshopRun,
  createEmptyIslandWorkshopBoard,
  findIslandWorkshopCompletedLines,
  getIslandWorkshopPlacementCells,
  getIslandWorkshopShape,
  ISLAND_WORKSHOP_CONSTRUCTION_REWARD,
  ISLAND_WORKSHOP_CONSTRUCTION_TARGET,
  ISLAND_WORKSHOP_GRID_SIZE,
  ISLAND_WORKSHOP_BLOCK_TICKET_COST,
  ISLAND_WORKSHOP_SCORE_REWARD_MILESTONES,
  isIslandWorkshopRunStuck,
  parseIslandWorkshopConstructionProgress,
  parseIslandWorkshopSavedRun,
  placeIslandWorkshopShape,
  resolveIslandWorkshopConstructionStage,
  resolveIslandWorkshopClaimableScoreRewards,
  resolveIslandWorkshopResultTier,
  resolveIslandWorkshopRunConstructionGain,
  rollIslandWorkshopShapeSet,
  serializeIslandWorkshopRun,
  type IslandWorkshopSavedRunV1,
} from '../../level-worlds/services/islandWorkshopGame';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../level-worlds/services/islandRunAudio';
import './islandWorkshop.css';

type GamePhase = 'entry' | 'playing' | 'construction' | 'results';

type IslandWorkshopLaunchConfig = {
  activeEventId?: string;
  persistenceScope?: string;
  getTicketsRemaining?: () => number;
  requestBlockTicketSpend?: () => { ok: boolean; ticketsRemaining: number };
};

type DragState = {
  slotIndex: number;
  shapeId: string;
  pointerX: number;
  pointerY: number;
};

type HoverPlacement = {
  row: number;
  col: number;
  valid: boolean;
  cells: number[];
  wouldClearCells: number[];
};

type ComboToast = { id: number; text: string };

/** Finger lift so the dragged shape stays visible above the thumb on touch. */
const DRAG_LIFT_PX = 56;
const CLEAR_FX_MS = 420;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode) — the run simply won't persist.
  }
}

export default function IslandWorkshopMinigame({ onComplete, launchConfig }: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as IslandWorkshopLaunchConfig;
  const persistenceScope = config.persistenceScope ?? 'local';
  const recordEventId = config.activeEventId ?? 'default';
  const runStorageKey = buildIslandWorkshopRunStorageKey(persistenceScope, recordEventId);
  const constructionStorageKey = buildIslandWorkshopConstructionStorageKey(persistenceScope, recordEventId);

  const [phase, setPhase] = useState<GamePhase>('entry');
  const [board, setBoard] = useState<number[]>(() => createEmptyIslandWorkshopBoard());
  const [tray, setTray] = useState<(string | null)[]>([null, null, null]);
  const [rngState, setRngState] = useState(() => (Date.now() % 2147483646) + 1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [materialsCollected, setMaterialsCollected] = useState(0);
  const [assistUsed, setAssistUsed] = useState(false);
  const [setsCompleted, setSetsCompleted] = useState(0);
  const [ticketsRemaining, setTicketsRemaining] = useState(() => config.getTicketsRemaining?.() ?? 0);
  const [savedRun, setSavedRun] = useState<IslandWorkshopSavedRunV1 | null>(
    () => parseIslandWorkshopSavedRun(readStorage(runStorageKey)),
  );
  const [constructionProgress, setConstructionProgress] = useState(
    () => parseIslandWorkshopConstructionProgress(readStorage(constructionStorageKey)),
  );
  const [runsFinished, setRunsFinished] = useState(0);
  const [rewardDiceTotal, setRewardDiceTotal] = useState(0);
  const [rewardSpinTokensTotal, setRewardSpinTokensTotal] = useState(0);
  const [rewardMysteryBoxesTotal, setRewardMysteryBoxesTotal] = useState(0);
  const [lastRunScore, setLastRunScore] = useState(0);
  const [lastRunGain, setLastRunGain] = useState(0);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<HoverPlacement | null>(null);
  const [clearFxCells, setClearFxCells] = useState<number[]>([]);
  const [assistFxCells, setAssistFxCells] = useState<number[]>([]);
  const [comboToast, setComboToast] = useState<ComboToast | null>(null);
  const [stuckPromptOpen, setStuckPromptOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const toastIdRef = useRef(1);
  const fxTimerRef = useRef<number | null>(null);
  const assistFxTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (fxTimerRef.current !== null) window.clearTimeout(fxTimerRef.current);
    if (assistFxTimerRef.current !== null) window.clearTimeout(assistFxTimerRef.current);
  }, []);

  const refreshTickets = useCallback(() => {
    setTicketsRemaining(config.getTicketsRemaining?.() ?? 0);
  }, [config]);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  // Persist the live run whenever it changes so leaving mid-run always resumes.
  useEffect(() => {
    if (phase !== 'playing') return;
    const payload: IslandWorkshopSavedRunV1 = {
      version: 1,
      board,
      traySlotShapeIds: tray,
      rngState,
      score,
      streak,
      materialsCollected,
      assistUsed,
      setsCompleted,
      updatedAtMs: Date.now(),
    };
    writeStorage(runStorageKey, serializeIslandWorkshopRun(payload));
  }, [phase, board, tray, rngState, score, streak, materialsCollected, assistUsed, setsCompleted, runStorageKey]);

  const beginRunState = useCallback((run: {
    board: number[];
    tray: (string | null)[];
    rngState: number;
    score: number;
    streak: number;
    materialsCollected: number;
    assistUsed: boolean;
    setsCompleted: number;
  }) => {
    setBoard(run.board);
    setTray(run.tray);
    setRngState(run.rngState);
    setScore(run.score);
    setStreak(run.streak);
    setMaterialsCollected(run.materialsCollected);
    setAssistUsed(run.assistUsed);
    setSetsCompleted(run.setsCompleted);
    setDrag(null);
    setHover(null);
    setClearFxCells([]);
    setAssistFxCells([]);
    setComboToast(null);
    setStuckPromptOpen(false);
    setPhase('playing');
    playIslandRunSound('minigame_open');
  }, []);

  const startFreshRun = useCallback(() => {
    if (!canStartIslandWorkshopRun({
      ticketsRemaining: config.getTicketsRemaining?.() ?? 0,
    })) {
      refreshTickets();
      return;
    }
    const seed = (Date.now() % 2147483646) + 1;
    const [shapeIds, nextRng] = rollIslandWorkshopShapeSet(seed);
    writeStorage(runStorageKey, null);
    setSavedRun(null);
    beginRunState({
      board: createEmptyIslandWorkshopBoard(),
      tray: shapeIds,
      rngState: nextRng,
      score: 0,
      streak: 0,
      materialsCollected: 0,
      assistUsed: false,
      setsCompleted: 0,
    });
  }, [beginRunState, config, refreshTickets, runStorageKey]);

  const continueSavedRun = useCallback(() => {
    if (!savedRun) return;
    beginRunState({
      board: [...savedRun.board],
      tray: [...savedRun.traySlotShapeIds],
      rngState: savedRun.rngState,
      score: savedRun.score,
      streak: savedRun.streak,
      materialsCollected: savedRun.materialsCollected,
      assistUsed: savedRun.assistUsed,
      setsCompleted: savedRun.setsCompleted,
    });
  }, [beginRunState, savedRun]);

  const endRun = useCallback((finalState: {
    score: number;
    materialsCollected: number;
  }) => {
    const tier = resolveIslandWorkshopResultTier(finalState.score);
    const gain = resolveIslandWorkshopRunConstructionGain({
      score: finalState.score,
      materialsCollected: finalState.materialsCollected,
    });
    const applied = applyIslandWorkshopConstructionGain(constructionProgress, gain);

    setLastRunScore(finalState.score);
    setLastRunGain(gain);
    setRunsFinished((n) => n + 1);
    setRewardDiceTotal((total) => total + tier.rewardDice);
    setConstructionProgress(applied.progress);
    writeStorage(constructionStorageKey, String(applied.progress));
    writeStorage(runStorageKey, null);
    setSavedRun(null);
    setStuckPromptOpen(false);
    setDrag(null);
    setHover(null);
    refreshTickets();

    if (applied.justCompleted) {
      setRewardDiceTotal((total) => total + ISLAND_WORKSHOP_CONSTRUCTION_REWARD.dice);
      setRewardSpinTokensTotal((total) => total + ISLAND_WORKSHOP_CONSTRUCTION_REWARD.spinTokens);
      setPhase('construction');
      triggerIslandRunHaptic('reward_claim');
      playIslandRunSound('minigame_complete');
      return;
    }
    setPhase('results');
    playIslandRunSound('minigame_complete');
    triggerIslandRunHaptic('reward_claim');
  }, [constructionProgress, constructionStorageKey, refreshTickets, runStorageKey]);

  const handleReturnToIsland = useCallback(() => {
    // A live run is already persisted by the save effect — it resumes next visit.
    if (runsFinished > 0) {
      const reward: { dice?: number; spinTokens?: number } = {};
      if (rewardDiceTotal > 0) reward.dice = rewardDiceTotal;
      if (rewardSpinTokensTotal > 0) reward.spinTokens = rewardSpinTokensTotal;
      onComplete({
        completed: true,
        reward: reward.dice || reward.spinTokens ? reward : undefined,
      });
    } else {
      onComplete({ completed: false });
    }
  }, [onComplete, rewardDiceTotal, rewardSpinTokensTotal, runsFinished]);

  const showComboToast = useCallback((text: string) => {
    setComboToast({ id: toastIdRef.current++, text });
  }, []);

  const afterBoardChange = useCallback((nextBoard: number[], nextTray: (string | null)[], nextAssistUsed: boolean, finalScore: number, finalMaterials: number) => {
    if (!isIslandWorkshopRunStuck(nextBoard, nextTray)) {
      setStuckPromptOpen(false);
      return;
    }
    if (nextAssistUsed) {
      endRun({ score: finalScore, materialsCollected: finalMaterials });
      return;
    }
    setStuckPromptOpen(true);
  }, [endRun]);

  const handleDrop = useCallback((slotIndex: number, shapeId: string, placement: HoverPlacement) => {
    const result = placeIslandWorkshopShape({
      board,
      shapeId,
      row: placement.row,
      col: placement.col,
      streakBefore: streak,
    });
    if (!result) return;

    const spend = config.requestBlockTicketSpend?.();
    if (!spend?.ok) {
      refreshTickets();
      showComboToast('Need more material blocks');
      return;
    }
    setTicketsRemaining(spend.ticketsRemaining);

    let nextTray = tray.map((id, index) => (index === slotIndex ? null : id));
    let nextRng = rngState;
    let nextSets = setsCompleted;
    if (nextTray.every((id) => id === null)) {
      const [shapeIds, rolledRng] = rollIslandWorkshopShapeSet(rngState);
      nextTray = shapeIds;
      nextRng = rolledRng;
      nextSets += 1;
    }

    const nextScore = score + result.placementScore + result.clearScore;
    const scoreRewards = resolveIslandWorkshopClaimableScoreRewards({ previousScore: score, nextScore });
    const nextMaterials = materialsCollected + result.materialsEarned;

    setBoard(result.board);
    setTray(nextTray);
    setRngState(nextRng);
    setSetsCompleted(nextSets);
    setScore(nextScore);
    setStreak(result.streakAfter);
    setMaterialsCollected(nextMaterials);
    if (scoreRewards.length > 0) {
      const dice = scoreRewards.reduce((sum, reward) => sum + reward.rewardDice, 0);
      const mysteryBoxes = scoreRewards.reduce((sum, reward) => sum + reward.mysteryBoxes, 0);
      if (dice > 0) setRewardDiceTotal((total) => total + dice);
      if (mysteryBoxes > 0) setRewardMysteryBoxesTotal((total) => total + mysteryBoxes);
      showComboToast(`Reward unlocked! ${scoreRewards.map((reward) => `${reward.emoji} ${reward.label}`).join(' · ')}`);
      playIslandRunSound('reward_bar_fill');
      triggerIslandRunHaptic('reward_claim');
    }

    if (result.linesCleared > 0) {
      setClearFxCells(result.clearedCellIndexes);
      if (fxTimerRef.current !== null) window.clearTimeout(fxTimerRef.current);
      fxTimerRef.current = window.setTimeout(() => setClearFxCells([]), CLEAR_FX_MS);
      const comboBits: string[] = [];
      if (result.linesCleared >= 2) comboBits.push(`${result.linesCleared}-line combo!`);
      if (result.streakMultiplier > 1) comboBits.push(`Streak ×${result.streakMultiplier}`);
      showComboToast(
        comboBits.length > 0
          ? `${comboBits.join(' · ')} +${result.clearScore}`
          : `Line clear! +${result.clearScore}`,
      );
      playIslandRunSound('reward_bar_fill');
      triggerIslandRunHaptic('reward_claim');
    } else {
      playIslandRunSound('token_move');
    }

    afterBoardChange(result.board, nextTray, assistUsed, nextScore, nextMaterials);
  }, [afterBoardChange, assistUsed, board, config, materialsCollected, refreshTickets, rngState, score, setsCompleted, showComboToast, streak, tray]);

  const handleCreatureAssist = useCallback(() => {
    if (assistUsed || phase !== 'playing') return;
    const assist = applyIslandWorkshopCreatureAssist(board);
    setAssistUsed(true);
    setStuckPromptOpen(false);
    if (assist.cellsCleared > 0) {
      const cleared: number[] = [];
      for (let dr = 0; dr < 3; dr += 1) {
        for (let dc = 0; dc < 3; dc += 1) {
          cleared.push((assist.targetRow + dr) * ISLAND_WORKSHOP_GRID_SIZE + (assist.targetCol + dc));
        }
      }
      setAssistFxCells(cleared);
      if (assistFxTimerRef.current !== null) window.clearTimeout(assistFxTimerRef.current);
      assistFxTimerRef.current = window.setTimeout(() => setAssistFxCells([]), CLEAR_FX_MS);
    }
    setBoard(assist.board);
    showComboToast('🐚 Creature Assist! Space cleared');
    triggerIslandRunHaptic('roll');
    playIslandRunSound('coin_flip');
    afterBoardChange(assist.board, tray, true, score, materialsCollected);
  }, [afterBoardChange, assistUsed, board, materialsCollected, phase, score, showComboToast, tray]);

  // ── Drag handling (pointer events with capture on the tray piece) ─────────

  const computeHover = useCallback((shapeId: string, pointerX: number, pointerY: number): HoverPlacement | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const cellPx = rect.width / ISLAND_WORKSHOP_GRID_SIZE;
    if (cellPx <= 0) return null;
    const shape = getIslandWorkshopShape(shapeId);
    const shapeRows = Math.max(...shape.cells.map(([r]) => r)) + 1;
    const shapeCols = Math.max(...shape.cells.map(([, c]) => c)) + 1;
    const anchorX = pointerX - (shapeCols * cellPx) / 2;
    const anchorY = pointerY - DRAG_LIFT_PX - shapeRows * cellPx;
    const col = Math.round((anchorX - rect.left) / cellPx);
    const row = Math.round((anchorY - rect.top) / cellPx);
    if (row < -1 || col < -1 || row > ISLAND_WORKSHOP_GRID_SIZE || col > ISLAND_WORKSHOP_GRID_SIZE) return null;
    const cells = getIslandWorkshopPlacementCells(shape, row, col);
    if (!cells) return null;
    const valid = cells.every((index) => board[index] === 0);
    let wouldClearCells: number[] = [];
    if (valid) {
      const preview = [...board];
      for (const index of cells) preview[index] = 1;
      const { rows, cols } = findIslandWorkshopCompletedLines(preview);
      const wouldClear = new Set<number>();
      for (const r of rows) {
        for (let c = 0; c < ISLAND_WORKSHOP_GRID_SIZE; c += 1) wouldClear.add(r * ISLAND_WORKSHOP_GRID_SIZE + c);
      }
      for (const c of cols) {
        for (let r = 0; r < ISLAND_WORKSHOP_GRID_SIZE; r += 1) wouldClear.add(r * ISLAND_WORKSHOP_GRID_SIZE + c);
      }
      wouldClearCells = Array.from(wouldClear);
    }
    return { row, col, valid, cells, wouldClearCells };
  }, [board]);

  const handleTrayPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>, slotIndex: number) => {
    const shapeId = tray[slotIndex];
    if (!shapeId || phase !== 'playing' || stuckPromptOpen) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ slotIndex, shapeId, pointerX: event.clientX, pointerY: event.clientY });
    setHover(computeHover(shapeId, event.clientX, event.clientY));
  }, [computeHover, phase, stuckPromptOpen, tray]);

  const handleTrayPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>, slotIndex: number) => {
    if (!drag || drag.slotIndex !== slotIndex) return;
    event.preventDefault();
    setDrag({ ...drag, pointerX: event.clientX, pointerY: event.clientY });
    setHover(computeHover(drag.shapeId, event.clientX, event.clientY));
  }, [computeHover, drag]);

  const handleTrayPointerEnd = useCallback((event: React.PointerEvent<HTMLButtonElement>, slotIndex: number) => {
    if (!drag || drag.slotIndex !== slotIndex) return;
    event.preventDefault();
    const placement = computeHover(drag.shapeId, event.clientX, event.clientY);
    if (placement?.valid) {
      handleDrop(drag.slotIndex, drag.shapeId, placement);
    }
    setDrag(null);
    setHover(null);
  }, [computeHover, drag, handleDrop]);

  const handleTrayPointerCancel = useCallback((_event: React.PointerEvent<HTMLButtonElement>, slotIndex: number) => {
    if (!drag || drag.slotIndex !== slotIndex) return;
    setDrag(null);
    setHover(null);
  }, [drag]);

  // ── Derived render data ────────────────────────────────────────────────────

  const hoverCellSet = useMemo(() => new Set(hover?.valid ? hover.cells : []), [hover]);
  const hoverInvalidSet = useMemo(
    () => new Set(hover && !hover.valid ? hover.cells.filter((index) => index >= 0) : []),
    [hover],
  );
  const wouldClearSet = useMemo(() => new Set(hover?.wouldClearCells ?? []), [hover]);
  const clearFxSet = useMemo(() => new Set(clearFxCells), [clearFxCells]);
  const assistFxSet = useMemo(() => new Set(assistFxCells), [assistFxCells]);

  const constructionStage = resolveIslandWorkshopConstructionStage(constructionProgress);
  const constructionRatio = Math.min(1, constructionProgress / ISLAND_WORKSHOP_CONSTRUCTION_TARGET);
  const resultTier = useMemo(() => resolveIslandWorkshopResultTier(lastRunScore), [lastRunScore]);
  const canPlayAgain = canStartIslandWorkshopRun({ ticketsRemaining });
  const nextScoreReward = ISLAND_WORKSHOP_SCORE_REWARD_MILESTONES.find((reward) => score < reward.score) ?? null;
  const scoreRewardMax = ISLAND_WORKSHOP_SCORE_REWARD_MILESTONES[ISLAND_WORKSHOP_SCORE_REWARD_MILESTONES.length - 1]?.score ?? 1;

  const dragShape = drag ? getIslandWorkshopShape(drag.shapeId) : null;
  const gridRect = gridRef.current?.getBoundingClientRect() ?? null;
  const ghostCellPx = gridRect ? gridRect.width / ISLAND_WORKSHOP_GRID_SIZE : 34;

  const renderShapePreview = (shapeId: string, cellPx: number, tintClass = true) => {
    const shape = getIslandWorkshopShape(shapeId);
    const rows = Math.max(...shape.cells.map(([r]) => r)) + 1;
    const cols = Math.max(...shape.cells.map(([, c]) => c)) + 1;
    const filled = new Set(shape.cells.map(([r, c]) => r * cols + c));
    const cells = [];
    for (let index = 0; index < rows * cols; index += 1) {
      cells.push(
        <div
          key={index}
          className={
            filled.has(index)
              ? `island-workshop__piece-cell${tintClass ? ` island-workshop__piece-cell--tint${shape.tint}` : ''}`
              : 'island-workshop__piece-cell island-workshop__piece-cell--empty'
          }
        />,
      );
    }
    return (
      <div
        className="island-workshop__piece"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
        }}
        aria-hidden="true"
      >
        {cells}
      </div>
    );
  };

  return (
    <section className="island-workshop" aria-label="Island Workshop mini-game">
      {phase === 'entry' && (
        <div className="island-workshop__panel island-workshop__entry" role="dialog" aria-label="Island Workshop entry">
          <p className="island-workshop__eyebrow">Island Event</p>
          <h2 className="island-workshop__title">🛠️ Island Workshop</h2>
          <p className="island-workshop__copy">
            The workshop creatures are building the Tidelight Beacon! Fit block
            shapes onto the crafting bench — full rows and columns craft into
            magical materials.
          </p>
          <ul className="island-workshop__rules">
            <li>🧱 Each ticket is one block placement — 9 tickets means 9 blocks to place, not 9 runs.</li>
            <li>🧱 Drag each shape onto the 8×8 bench — place all three to get a new set.</li>
            <li>✨ Complete a row or column to clear it and earn materials.</li>
            <li>🔥 Multi-line clears and back-to-back clears pay combo bonuses.</li>
            <li>🐚 Creature Assist sweeps a crowded pocket clear, once per run.</li>
            <li>🗼 Score and materials build the Beacon for a grand reward.</li>
          </ul>
          <div className="island-workshop__construction-strip" aria-label="Beacon construction progress">
            <span className="island-workshop__construction-emoji">{constructionStage.emoji}</span>
            <div className="island-workshop__construction-meta">
              <span className="island-workshop__construction-label">{constructionStage.label}</span>
              <div className="island-workshop__construction-bar">
                <div className="island-workshop__construction-fill" style={{ width: `${constructionRatio * 100}%` }} />
              </div>
            </div>
            <span className="island-workshop__construction-count">
              {constructionProgress}/{ISLAND_WORKSHOP_CONSTRUCTION_TARGET}
            </span>
          </div>
          <p className="island-workshop__ticket-note">
            {savedRun
              ? `A saved run is waiting on the bench. Blocks left to place: ${ticketsRemaining} 🧱`
              : `Blocks left to place: ${ticketsRemaining} 🧱`}
          </p>
          <div className="island-workshop__actions">
            {savedRun ? (
              <>
                <button type="button" className="island-workshop__btn island-workshop__btn--primary" onClick={continueSavedRun}>
                  Continue Run
                </button>
                <button type="button" className="island-workshop__btn" onClick={startFreshRun}>
                  Start Fresh Run
                </button>
              </>
            ) : (
              <button type="button" className="island-workshop__btn island-workshop__btn--primary" onClick={startFreshRun}>
                Start Crafting
              </button>
            )}
            <button type="button" className="island-workshop__btn island-workshop__btn--quiet" onClick={handleReturnToIsland}>
              Return to Island
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="island-workshop__play-area">
          <header className="island-workshop__hud">
            <div className="island-workshop__hud-stat">
              <span className="island-workshop__hud-label">Score</span>
              <span className="island-workshop__hud-value">{score}</span>
            </div>
            <div className="island-workshop__hud-stat">
              <span className="island-workshop__hud-label">Blocks left</span>
              <span className="island-workshop__hud-value">🧱 {ticketsRemaining}</span>
            </div>
            <div className={`island-workshop__hud-stat${streak >= 1 ? ' island-workshop__hud-stat--hot' : ''}`}>
              <span className="island-workshop__hud-label">Streak</span>
              <span className="island-workshop__hud-value">{streak > 0 ? `🔥 ${streak}` : '—'}</span>
            </div>
          </header>


          <div className="island-workshop__score-rewards" aria-label="Score reward bar">
            <div className="island-workshop__score-rewards-top">
              <span>Rewards</span>
              <strong>{nextScoreReward ? `Next: ${nextScoreReward.score}` : 'All unlocked'}</strong>
            </div>
            <div className="island-workshop__score-track">
              <div className="island-workshop__score-fill" style={{ width: `${Math.min(100, (score / scoreRewardMax) * 100)}%` }} />
              {ISLAND_WORKSHOP_SCORE_REWARD_MILESTONES.map((reward) => (
                <span
                  key={reward.id}
                  className={`island-workshop__score-node${score >= reward.score ? ' island-workshop__score-node--claimed' : ''}`}
                  style={{ left: `${Math.min(100, (reward.score / scoreRewardMax) * 100)}%` }}
                  title={`${reward.label} at ${reward.score} score`}
                >
                  {reward.emoji}
                </span>
              ))}
            </div>
          </div>

          <div className="island-workshop__bench-wrap">
            <div
              ref={gridRef}
              className="island-workshop__grid"
              role="grid"
              aria-label={`Crafting bench, ${ISLAND_WORKSHOP_GRID_SIZE} by ${ISLAND_WORKSHOP_GRID_SIZE}. Score ${score}.`}
            >
              {board.map((cell, index) => {
                const classes = ['island-workshop__cell'];
                if (cell > 0) classes.push(`island-workshop__cell--tint${cell}`);
                if (hoverCellSet.has(index)) classes.push('island-workshop__cell--preview');
                if (hoverInvalidSet.has(index)) classes.push('island-workshop__cell--invalid');
                if (wouldClearSet.has(index)) classes.push('island-workshop__cell--would-clear');
                if (clearFxSet.has(index)) classes.push('island-workshop__cell--clearing');
                if (assistFxSet.has(index)) classes.push('island-workshop__cell--assist');
                return <div key={index} className={classes.join(' ')} role="gridcell" aria-label={cell > 0 ? 'filled' : 'empty'} />;
              })}
            </div>
            {comboToast && (
              <p key={comboToast.id} className="island-workshop__combo-toast" role="status">
                {comboToast.text}
              </p>
            )}
          </div>

          <div className="island-workshop__tray" aria-label="Shape tray">
            {tray.map((shapeId, slotIndex) => (
              <button
                key={slotIndex}
                type="button"
                className={`island-workshop__tray-slot${!shapeId ? ' island-workshop__tray-slot--empty' : ''}${drag?.slotIndex === slotIndex ? ' island-workshop__tray-slot--dragging' : ''}`}
                disabled={!shapeId}
                aria-label={shapeId ? `Drag ${getIslandWorkshopShape(shapeId).name} onto the bench` : 'Placed'}
                onPointerDown={(event) => handleTrayPointerDown(event, slotIndex)}
                onPointerMove={(event) => handleTrayPointerMove(event, slotIndex)}
                onPointerUp={(event) => handleTrayPointerEnd(event, slotIndex)}
                onPointerCancel={(event) => handleTrayPointerCancel(event, slotIndex)}
              >
                {shapeId ? renderShapePreview(shapeId, 13) : <span className="island-workshop__tray-check">✓</span>}
              </button>
            ))}
          </div>

          <footer className="island-workshop__controls">
            <button
              type="button"
              className="island-workshop__btn island-workshop__btn--assist"
              onClick={handleCreatureAssist}
              disabled={assistUsed}
            >
              🐚 Creature Assist {assistUsed ? '(used)' : ''}
            </button>
            <button
              type="button"
              className="island-workshop__btn island-workshop__btn--quiet"
              onClick={handleReturnToIsland}
            >
              Save &amp; Return
            </button>
          </footer>

          {stuckPromptOpen && (
            <div className="island-workshop__stuck" role="alertdialog" aria-label="No space left">
              <div className="island-workshop__stuck-panel">
                <h3 className="island-workshop__stuck-title">The bench is jammed!</h3>
                <p className="island-workshop__copy">
                  None of your shapes fit. The workshop creature can sweep a pocket clear — once.
                </p>
                <div className="island-workshop__actions">
                  <button type="button" className="island-workshop__btn island-workshop__btn--primary" onClick={handleCreatureAssist}>
                    🐚 Use Creature Assist
                  </button>
                  <button
                    type="button"
                    className="island-workshop__btn island-workshop__btn--quiet"
                    onClick={() => endRun({ score, materialsCollected })}
                  >
                    Finish Run
                  </button>
                </div>
              </div>
            </div>
          )}

          {drag && dragShape && (
            <div
              className="island-workshop__ghost"
              style={{
                left: drag.pointerX,
                top: drag.pointerY - DRAG_LIFT_PX,
              }}
              aria-hidden="true"
            >
              {renderShapePreview(dragShape.id, ghostCellPx)}
            </div>
          )}
        </div>
      )}

      {phase === 'construction' && (
        <div className="island-workshop__panel island-workshop__construction" role="dialog" aria-label="Tidelight Beacon complete">
          <p className="island-workshop__eyebrow">Grand Construction</p>
          <h2 className="island-workshop__title">🌟 The Tidelight Beacon shines!</h2>
          <p className="island-workshop__copy">
            Every crafted material found its place. The Beacon's light now sweeps
            across the island — the creatures are celebrating your work.
          </p>
          <div className="island-workshop__beacon" aria-hidden="true">🗼</div>
          <dl className="island-workshop__result-stats">
            <div>
              <dt>Construction bonus</dt>
              <dd>🎲 +{ISLAND_WORKSHOP_CONSTRUCTION_REWARD.dice} dice</dd>
            </div>
            <div>
              <dt>Star Tokens</dt>
              <dd>🌀 +{ISLAND_WORKSHOP_CONSTRUCTION_REWARD.spinTokens}</dd>
            </div>
          </dl>
          <div className="island-workshop__actions">
            <button type="button" className="island-workshop__btn island-workshop__btn--primary" onClick={() => setPhase('results')}>
              Collect &amp; Continue
            </button>
          </div>
        </div>
      )}

      {phase === 'results' && (
        <div className="island-workshop__panel island-workshop__results" role="dialog" aria-label="Island Workshop results">
          <p className="island-workshop__eyebrow">Crafting Complete</p>
          <h2 className="island-workshop__title">
            {resultTier.emoji} {resultTier.label}
          </h2>
          <dl className="island-workshop__result-stats">
            <div>
              <dt>Run score</dt>
              <dd>{lastRunScore}</dd>
            </div>
            <div>
              <dt>Materials gained</dt>
              <dd>🔮 +{lastRunGain}</dd>
            </div>
            <div>
              <dt>Tier reward</dt>
              <dd>🎲 +{resultTier.rewardDice} dice</dd>
            </div>
          </dl>
          <div className="island-workshop__construction-strip" aria-label="Beacon construction progress">
            <span className="island-workshop__construction-emoji">{constructionStage.emoji}</span>
            <div className="island-workshop__construction-meta">
              <span className="island-workshop__construction-label">{constructionStage.label}</span>
              <div className="island-workshop__construction-bar">
                <div className="island-workshop__construction-fill" style={{ width: `${constructionRatio * 100}%` }} />
              </div>
            </div>
            <span className="island-workshop__construction-count">
              {constructionProgress}/{ISLAND_WORKSHOP_CONSTRUCTION_TARGET}
            </span>
          </div>
          <p className="island-workshop__ticket-note">Blocks left to place: {ticketsRemaining} 🧱 · Mystery boxes unlocked: {rewardMysteryBoxesTotal}</p>
          <div className="island-workshop__actions">
            <button
              type="button"
              className="island-workshop__btn island-workshop__btn--primary"
              onClick={startFreshRun}
              disabled={!canPlayAgain}
            >
              {canPlayAgain
                ? `Keep Building (${ISLAND_WORKSHOP_BLOCK_TICKET_COST} 🧱 per block)`
                : 'No tickets left'}
            </button>
            <button type="button" className="island-workshop__btn" onClick={handleReturnToIsland}>
              Return to Island
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
