import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  resolveTwoTracksTileInsight,
  TWO_TRACKS_PAST_ROWS,
  type TwoTracksRoad as TwoTracksRoadModel,
  type TwoTracksTile,
} from '../../features/gamification/level-worlds/services/twoTracksRoad';
import type { TwoTracksToday } from '../../features/gamification/level-worlds/services/twoTracksDaily';
import { TwoTracksInsightSheet } from './TwoTracksInsightSheet';
import './two-tracks-road.css';

type TwoTracksRoadProps = {
  road: TwoTracksRoadModel;
  /** Fill of the spine from today up to the horizon reward, 0..100. */
  progressPercent: number;
  /** Stands upright on today's row (level ring + daily check). */
  hub: ReactNode;
  /** The next reward, pinned at the horizon above the fog. */
  horizon: ReactNode;
  /** Today's both-tracks check, pinned under the horizon reward. */
  daily: ReactNode;
  /** Replays the glide-up when the island advanced since the last visit. */
  climbDelta?: number;
  /** A track that has fallen behind glows softly to invite a step. */
  laggingLane?: 'life' | 'game' | null;
  /** Today's check, used by the tap-a-step insight cards. */
  today?: TwoTracksToday | null;
};

/** Pixels of drag per road row; the tilted plane foreshortens rows on screen. */
const DRAG_PX_PER_ROW = 58;
/** Rows the player may peek past today into the fog. */
const LOOK_AHEAD_ROWS = 3;

function RoadTile({ tile, isNew, offstage, onOpen }: { tile: TwoTracksTile; isNew: boolean; offstage: boolean; onOpen: (tile: TwoTracksTile) => void }) {
  const style = { '--row': tile.row } as CSSProperties;
  return (
    <button
      type="button"
      className={`tt-tile tt-tile--${tile.lane} tt-tile--${tile.state}${tile.imageSrc ? ' tt-tile--art' : ''}${isNew ? ' tt-tile--new' : ''}${offstage ? ' tt-tile--offstage' : ''}`}
      style={style}
      tabIndex={offstage ? -1 : undefined}
      aria-hidden={offstage || undefined}
      role="listitem"
      aria-label={`${tile.title}. ${tile.caption}${tile.points ? `. ${tile.points}` : ''}. Open details.`}
      onClick={() => onOpen(tile)}
    >
      {tile.imageSrc ? <img className="tt-tile__art" src={tile.imageSrc} alt="" loading="lazy" decoding="async" /> : null}
      <span className="tt-tile__icon" aria-hidden="true">{tile.icon}</span>
      <span className="tt-tile__copy" aria-hidden="true">
        <strong>{tile.title}</strong>
        {tile.caption ? <span>{tile.caption}</span> : null}
        {tile.steps ? (
          <span className="tt-tile__pips">
            {Array.from({ length: Math.min(tile.steps.total, 8) }, (_, index) => (
              <i key={index} className={index < tile.steps!.done ? 'is-done' : undefined} />
            ))}
          </span>
        ) : null}
      </span>
      {tile.points ? <span className="tt-tile__points" aria-hidden="true">{tile.points}</span> : null}
    </button>
  );
}

/**
 * The climb as two paths on a tilted plane that recede into fog: done steps
 * near, today in the middle, the unknown ahead. Opens by replaying the climb
 * since the last visit, can be dragged back through history or up into the
 * fog, and every step opens a small insight card.
 */
export function TwoTracksRoad({ road, progressPercent, hub, horizon, daily, climbDelta = 0, laggingLane = null, today = null }: TwoTracksRoadProps) {
  const life = road.tiles.filter((tile) => tile.lane === 'life');
  const game = road.tiles.filter((tile) => tile.lane === 'game');
  const extraHistory = Math.max(0, road.todayRow - TWO_TRACKS_PAST_ROWS);
  const minScroll = -(extraHistory + 1);
  const [scroll, setScroll] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [openTile, setOpenTile] = useState<TwoTracksTile | null>(null);
  const drag = useRef<{ pointerId: number; startY: number; startScroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const clampScroll = useCallback((value: number) => Math.min(LOOK_AHEAD_ROWS, Math.max(minScroll, value)), [minScroll]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startY: event.clientY, startScroll: scroll, moved: false };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dy = event.clientY - current.startY;
    if (!current.moved && Math.abs(dy) < 6) return;
    if (!current.moved) {
      current.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    // Dragging down pulls the road toward you: the fog ahead comes into view.
    setScroll(clampScroll(current.startScroll + dy / DRAG_PX_PER_ROW));
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (current.moved) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 0);
      setDragging(false);
      setScroll((value) => clampScroll(Math.round(value)));
    }
  };
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 4) return;
    setScroll((value) => clampScroll(Math.round(value - Math.sign(event.deltaY))));
  };
  const openInsight = useCallback((tile: TwoTracksTile) => {
    if (suppressClick.current) return;
    setOpenTile(tile);
  }, []);

  // Keep the view valid when the road grows or shrinks.
  useEffect(() => { setScroll((value) => clampScroll(value)); }, [clampScroll]);

  const currentIsland = game.find((tile) => tile.state === 'today')?.islandNumber ?? 0;
  // History below the camera stays hidden until the player scrolls back to it.
  const lowestVisibleRow = road.todayRow - TWO_TRACKS_PAST_ROWS + Math.min(0, scroll) - 0.5;
  const isOffstage = (tile: TwoTracksTile) => tile.row < lowestVisibleRow;
  const isNewIsland = (tile: TwoTracksTile) => climbDelta > 0 && tile.lane === 'game' && tile.state === 'done'
    && (tile.islandNumber ?? 0) >= currentIsland - climbDelta;

  const style = {
    '--rows': road.rows,
    '--today': road.todayRow,
    '--extra-history': extraHistory,
    '--scroll': scroll,
    '--progress': Math.min(100, Math.max(0, progressPercent)),
    '--glide-rows': climbDelta > 0 ? Math.min(road.todayRow, 1.5 + climbDelta) : 1.5,
  } as CSSProperties;

  return (
    <div
      className={`tt-road${road.inSync ? ' tt-road--sync' : ''}${laggingLane ? ` tt-road--lag-${laggingLane}` : ''}${dragging ? ' tt-road--dragging' : ''}${climbDelta > 0 ? ' tt-road--replay' : ''}`}
      style={style}
    >
      <div className="tt-road__lane-labels" aria-hidden="true">
        <span className="tt-road__lane-label tt-road__lane-label--life">Real life</span>
        <span className="tt-road__lane-label tt-road__lane-label--game">Game</span>
      </div>
      <div
        className="tt-road__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
      >
        <div className="tt-road__plane">
          <div className="tt-road__scroller">
            <div className="tt-road__track">
              <div className="tt-road__lane tt-road__lane--life" role="list" aria-label="Real life journey">
                {life.map((tile) => <RoadTile key={tile.id} tile={tile} isNew={false} offstage={isOffstage(tile)} onOpen={openInsight} />)}
              </div>
              <div className="tt-road__spine" aria-hidden="true">
                <span className="tt-road__spine-done" />
                <span className="tt-road__spine-ahead">
                  <span className="tt-road__spine-fill" />
                </span>
                <span className="tt-road__spine-runner" />
                <span className="tt-road__spine-sparks" />
              </div>
              <div className="tt-road__lane tt-road__lane--game" role="list" aria-label="Game journey">
                {game.map((tile) => <RoadTile key={tile.id} tile={tile} isNew={isNewIsland(tile)} offstage={isOffstage(tile)} onOpen={openInsight} />)}
              </div>
              <span className="tt-road__bridge" aria-hidden="true" />
              <div className="tt-road__billboard tt-road__billboard--hub">{hub}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="tt-road__fog" aria-hidden="true" />
      {Math.abs(scroll) > 0.4 ? (
        <button type="button" className="tt-road__today-button" onClick={() => setScroll(0)}>
          {scroll < 0 ? '↑ Today' : '↓ Today'}
        </button>
      ) : null}
      <div className="tt-road__hud">
        {horizon}
        {daily}
      </div>
      {openTile ? (
        <TwoTracksInsightSheet insight={resolveTwoTracksTileInsight(openTile, today)} onClose={() => setOpenTile(null)} />
      ) : null}
    </div>
  );
}
