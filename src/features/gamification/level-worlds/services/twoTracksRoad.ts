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
import { getVoyageIslandArt, isVoyageIslandRevealed } from './islandVoyageMap';
import type { TwoTracksToday } from './twoTracksDaily';

export const TWO_TRACKS_PAST_ROWS = 3;
export const TWO_TRACKS_FUTURE_ROWS = 4;
/** Row index of "today" (rows count upward from the oldest done step). */
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
};

export type TwoTracksRoad = {
  rows: number;
  todayRow: number;
  tiles: TwoTracksTile[];
  /** True when both lanes moved today: the bridge lights and the sync bonus pays. */
  inSync: boolean;
  horizon: { label: string; detail: string };
};

const MAX_FOG_ISLAND = 120;

function lifeTiles(vm: DualTrackOverlayViewModel, today: TwoTracksToday | null): TwoTracksTile[] {
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
      points: `+${JOURNEY_XP_WEIGHTS.perHabitCheckIn} XP each`,
    });
  }
  const recentDone = done.slice(-TWO_TRACKS_PAST_ROWS);
  recentDone.forEach((tile, index) => {
    tiles.push({ ...tile, row: TWO_TRACKS_TODAY_ROW - recentDone.length + index });
  });

  // Today: the current focus, with today's small steps.
  const steps = current?.steps;
  tiles.push({
    id: 'life-today',
    lane: 'life',
    row: TWO_TRACKS_TODAY_ROW,
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
      row: TWO_TRACKS_TODAY_ROW + offset,
      state: offset === 1 ? 'next' : 'fog',
      title: known ? next.title : '?',
      caption: known ? 'Up next on your path' : offset === 1 ? 'Your next life step fills this' : '',
      icon: known ? '🎯' : '?',
    });
  }
  return tiles;
}

function gameTiles(vm: DualTrackOverlayViewModel, today: TwoTracksToday | null): TwoTracksTile[] {
  const current = vm.gameProgress.currentIsland;
  const tiles: TwoTracksTile[] = [];
  for (let back = TWO_TRACKS_PAST_ROWS; back >= 1; back -= 1) {
    const island = current - back;
    if (island < 1) continue;
    tiles.push({
      id: `game-island-${island}`,
      lane: 'game',
      row: TWO_TRACKS_TODAY_ROW - back,
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
    row: TWO_TRACKS_TODAY_ROW,
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
      row: TWO_TRACKS_TODAY_ROW + offset,
      state: offset === 1 ? 'next' : 'fog',
      title: revealed ? getIslandDisplayName(island) : '?',
      caption: offset === 1 ? `Island ${island}` : '',
      icon: revealed ? '🧭' : '?',
      imageSrc: offset <= 2 ? getVoyageIslandArt(island) : undefined,
    });
  }
  return tiles;
}

export function buildTwoTracksRoad(vm: DualTrackOverlayViewModel, today: TwoTracksToday | null): TwoTracksRoad {
  return {
    rows: TWO_TRACKS_ROW_COUNT,
    todayRow: TWO_TRACKS_TODAY_ROW,
    tiles: [...lifeTiles(vm, today), ...gameTiles(vm, today)],
    inSync: Boolean(today?.bothDone),
    horizon: {
      label: `Lv ${vm.journeyLevel.nextThresholdLevel} chest`,
      detail: `${100 - vm.journeyLevel.progressPercentToNextLevel}% to go`,
    },
  };
}
