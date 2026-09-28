/**
 * Two Tracks road — the presentational model for the tilted 3D climb.
 *
 * Two lanes (life on the left, game on the right) share rows: done steps
 * below, "today" in the middle, the unknown future above, fading into fog.
 * Pure and read-only: derived from the dual-track view model and the daily
 * check; it never grants anything.
 */
import { JOURNEY_XP_WEIGHTS } from './combinedJourneyLevel';
import type { DualTrackOverlayViewModel, DualTrackMilestoneCard } from './dualTrackOverlayAdapter';
import { getIslandDisplayName } from './islandNames';
import { getIslandMissionBriefingPresentation } from './islandRunMissionBriefing';
import { getVoyageIslandArt, isVoyageIslandRevealed } from './islandVoyageMap';
import type { TwoTracksToday } from './twoTracksDaily';

/** Done rows visible below today in the resting view. */
export const TWO_TRACKS_PAST_ROWS = 3;
/** Done rows kept on the road so the player can scroll back through them. */
export const TWO_TRACKS_HISTORY_ROWS = 10;
export const TWO_TRACKS_FUTURE_ROWS = 4;
/** Row index of "today" when there is no extra history (resting layout). */
export const TWO_TRACKS_TODAY_ROW = TWO_TRACKS_PAST_ROWS;
export const TWO_TRACKS_ROW_COUNT = TWO_TRACKS_PAST_ROWS + 1 + TWO_TRACKS_FUTURE_ROWS;

export type TwoTracksLane = 'life' | 'game';
export type TwoTracksTileState = 'done' | 'today' | 'next' | 'fog';

export type TwoTracksTile = {
  id: string;
  lane: TwoTracksLane;
  row: number;
  state: TwoTracksTileState;
  title: string;
  caption: string;
  icon: string;
  /** Points this step earned (done) or is worth (today/next). */
  points?: string;
  imageSrc?: string;
  steps?: { done: number; total: number };
  /** Game tiles: the island this row stands for. */
  islandNumber?: number;
  /** Life tiles: where the step came from. */
  source?: 'goal' | 'habit' | 'other';
};

export type TwoTracksRoad = {
  rows: number;
  todayRow: number;
  tiles: TwoTracksTile[];
  /** True when both lanes moved today: the bridge lights and the sync bonus pays. */
  inSync: boolean;
  horizon: { label: string; detail: string };
  /** Done rows below today on the full road (>= TWO_TRACKS_PAST_ROWS). */
  pastRows: number;
};

const MAX_FOG_ISLAND = 120;

function lifeTiles(vm: DualTrackOverlayViewModel, today: TwoTracksToday | null, todayRow: number): TwoTracksTile[] {
  const tiles: TwoTracksTile[] = [];
  const byPosition = (position: DualTrackMilestoneCard['position']) =>
    vm.realLifeTrack.filter((card) => card.position === position);
  const achieved = byPosition('achieved');
  const current = byPosition('current')[0];
  const next = byPosition('next')[0];

  // Done: what has actually happened, newest nearest to today.
  const done: Omit<TwoTracksTile, 'row'>[] = achieved.map((card) => ({
    id: `life-${card.id}`,
    lane: 'life',
    state: 'done',
    title: card.title,
    caption: card.subtitle,
    icon: card.source === 'goal' ? '🏅' : card.source === 'habit' ? '🌿' : '✓',
    source: card.source === 'goal' || card.source === 'habit' ? card.source : 'other',
    points: card.source === 'goal'
      ? `+${JOURNEY_XP_WEIGHTS.perCompletedGoal} XP`
      : card.source === 'habit' ? `+${JOURNEY_XP_WEIGHTS.perHabitCheckIn} XP each` : undefined,
  }));
  if (vm.realLifeProgress.source === 'data' && vm.realLifeProgress.habitCount > 0 && !done.some((t) => t.icon === '🌿')) {
    done.unshift({
      id: 'life-habits',
      lane: 'life',
      state: 'done',
      title: 'Habits in motion',
      caption: `${vm.realLifeProgress.habitCount} habit${vm.realLifeProgress.habitCount === 1 ? '' : 's'} on your path`,
      icon: '🌿',
      source: 'habit',
      points: `+${JOURNEY_XP_WEIGHTS.perHabitCheckIn} XP each`,
    });
  }
  const recentDone = done.slice(-TWO_TRACKS_HISTORY_ROWS);
  recentDone.forEach((tile, index) => {
    tiles.push({ ...tile, row: todayRow - recentDone.length + index });
  });

  // Today: the current focus, with today's small steps.
  const steps = current?.steps;
  tiles.push({
    id: 'life-today',
    lane: 'life',
    row: todayRow,
    state: 'today',
    title: current?.title ?? 'Today’s step',
    caption: steps
      ? steps.done > 0 ? `${steps.done} of ${steps.total} habits today` : 'Check in a habit to step up'
      : today?.lifeDone ? 'Life step taken today' : 'Any habit, goal or journal counts',
    icon: today?.lifeDone ? '🌱' : '○',
    points: steps && steps.done > 0 ? `+${steps.done * JOURNEY_XP_WEIGHTS.perHabitCheckIn} XP` : undefined,
    steps: steps ? { done: steps.done, total: steps.total } : undefined,
  });

  // Future: the next known goal, then the unknown.
  for (let offset = 1; offset <= TWO_TRACKS_FUTURE_ROWS; offset += 1) {
    const known = offset === 1 && next && next.source === 'goal';
    tiles.push({
      id: `life-future-${offset}`,
      lane: 'life',
      row: todayRow + offset,
      state: offset === 1 ? 'next' : 'fog',
      title: known ? next.title : '?',
      caption: known ? 'Up next on your path' : offset === 1 ? 'Your next life step fills this' : '',
      icon: known ? '🎯' : '?',
      source: known ? 'goal' : undefined,
    });
  }
  return tiles;
}

function gameTiles(vm: DualTrackOverlayViewModel, today: TwoTracksToday | null, todayRow: number): TwoTracksTile[] {
  const current = vm.gameProgress.currentIsland;
  const tiles: TwoTracksTile[] = [];
  for (let back = TWO_TRACKS_HISTORY_ROWS; back >= 1; back -= 1) {
    const island = current - back;
    if (island < 1) continue;
    tiles.push({
      id: `game-island-${island}`,
      lane: 'game',
      row: todayRow - back,
      islandNumber: island,
      state: 'done',
      title: getIslandDisplayName(island),
      caption: `Island ${island} explored`,
      icon: '✓',
      points: `+${JOURNEY_XP_WEIGHTS.perCompletedIsland} XP`,
      imageSrc: getVoyageIslandArt(island),
    });
  }
  const currentCard = vm.gameTrack.find((card) => card.position === 'current');
  tiles.push({
    id: `game-island-${current}`,
    lane: 'game',
    row: todayRow,
    islandNumber: current,
    state: 'today',
    title: getIslandDisplayName(current),
    caption: today?.gameDone ? 'Game step taken today' : currentCard?.progressLabel ?? `Island ${current}`,
    icon: '🏝️',
    imageSrc: getVoyageIslandArt(current),
  });
  for (let offset = 1; offset <= TWO_TRACKS_FUTURE_ROWS; offset += 1) {
    const island = current + offset;
    if (island > MAX_FOG_ISLAND) break;
    const revealed = offset === 1 && isVoyageIslandRevealed(island, current);
    tiles.push({
      id: `game-island-${island}`,
      lane: 'game',
      row: todayRow + offset,
      islandNumber: island,
      state: offset === 1 ? 'next' : 'fog',
      title: revealed ? getIslandDisplayName(island) : '?',
      caption: offset === 1 ? `Island ${island}` : '',
      icon: revealed ? '🧭' : '?',
      imageSrc: offset <= 2 ? getVoyageIslandArt(island) : undefined,
    });
  }
  return tiles;
}

/** Done life steps shown on the road (achieved cards, plus the habits row). */
function countLifeHistory(vm: DualTrackOverlayViewModel): number {
  const achieved = vm.realLifeTrack.filter((card) => card.position === 'achieved');
  const extraHabits = vm.realLifeProgress.source === 'data' && vm.realLifeProgress.habitCount > 0
    && !achieved.some((card) => card.source === 'habit') ? 1 : 0;
  return achieved.length + extraHabits;
}

export function buildTwoTracksRoad(vm: DualTrackOverlayViewModel, today: TwoTracksToday | null): TwoTracksRoad {
  const history = Math.max(countLifeHistory(vm), vm.gameProgress.currentIsland - 1);
  const pastRows = Math.max(TWO_TRACKS_PAST_ROWS, Math.min(TWO_TRACKS_HISTORY_ROWS, history));
  return {
    rows: pastRows + 1 + TWO_TRACKS_FUTURE_ROWS,
    todayRow: pastRows,
    pastRows,
    tiles: [...lifeTiles(vm, today, pastRows), ...gameTiles(vm, today, pastRows)],
    inSync: Boolean(today?.bothDone),
    horizon: {
      label: `Lv ${vm.journeyLevel.nextThresholdLevel} chest`,
      detail: `${100 - vm.journeyLevel.progressPercentToNextLevel}% to go`,
    },
  };
}

export type TwoTracksTileInsight = {
  kicker: string;
  title: string;
  lines: string[];
  imageSrc?: string;
  tone: TwoTracksLane;
};

/**
 * "Tap a step" insight: a few honest lines built only from what the road
 * already knows (titles, captions, points, today's steps, island names and
 * briefings). Never invents history the app does not store.
 */
export function resolveTwoTracksTileInsight(tile: TwoTracksTile, today: TwoTracksToday | null): TwoTracksTileInsight {
  const tone = tile.lane;
  if (tile.lane === 'game') {
    const island = tile.islandNumber ?? 0;
    const islandLabel = `Island ${String(island).padStart(3, '0')}`;
    if (tile.state === 'done') {
      return {
        tone, kicker: `Explored · ${islandLabel}`, title: tile.title, imageSrc: tile.imageSrc,
        lines: [
          `Mission: ${getIslandMissionBriefingPresentation(island).headline}.`,
          `${tile.points ?? ''} added to your Journey Level when you cleared it.`.trim(),
        ],
      };
    }
    if (tile.state === 'today') {
      return {
        tone, kicker: `You are here · ${islandLabel}`, title: tile.title, imageSrc: tile.imageSrc,
        lines: [
          `Mission: ${getIslandMissionBriefingPresentation(island).headline}.`,
          tile.caption,
          today?.gameDone ? 'Your game step for today is done. 🎲' : 'One roll or one build moves this track today.',
        ],
      };
    }
    if (tile.state === 'next' && tile.title !== '?') {
      return {
        tone, kicker: `Next stop · ${islandLabel}`, title: tile.title, imageSrc: tile.imageSrc,
        lines: [
          `Waiting for you: ${getIslandMissionBriefingPresentation(island).headline}.`,
          'Clear your current island to set sail.',
        ],
      };
    }
    return {
      tone, kicker: island ? `Beyond the fog · ${islandLabel}` : 'Beyond the fog', title: 'Uncharted waters',
      lines: ['This island stays hidden until you sail closer.', 'Every island you clear pushes the fog back.'],
    };
  }
  if (tile.state === 'done') {
    return {
      tone,
      kicker: tile.source === 'goal' ? 'Goal achieved' : tile.source === 'habit' ? 'Habits on your path' : 'Life step',
      title: tile.title,
      lines: [
        tile.caption,
        tile.points ? `${tile.points} toward your Journey Level.` : '',
      ].filter(Boolean),
    };
  }
  if (tile.state === 'today') {
    const steps = tile.steps;
    return {
      tone, kicker: 'Today on your life track', title: tile.title,
      lines: [
        steps ? `${steps.done} of ${steps.total} habits checked in today.` : tile.caption,
        today?.lifeDone ? 'Your life step for today is done. 🌱' : 'One habit check-in moves this track today.',
        `Each check-in adds +${JOURNEY_XP_WEIGHTS.perHabitCheckIn} XP.`,
      ],
    };
  }
  if (tile.state === 'next' && tile.title !== '?') {
    return {
      tone, kicker: 'Up next on your path', title: tile.title,
      lines: [
        'Mark this goal complete to climb here.',
        `A completed goal adds +${JOURNEY_XP_WEIGHTS.perCompletedGoal} XP.`,
      ],
    };
  }
  return {
    tone, kicker: 'Ahead in the fog', title: 'Your next chapter',
    lines: ['Every goal you finish and habit you keep builds this road.', 'Set a new goal to see what comes next.'],
  };
}
