import type { CSSProperties, ReactNode } from 'react';
import type { TwoTracksRoad as TwoTracksRoadModel, TwoTracksTile } from '../../features/gamification/level-worlds/services/twoTracksRoad';
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
};

function RoadTile({ tile }: { tile: TwoTracksTile }) {
  const style = { '--row': tile.row } as CSSProperties;
  return (
    <div
      className={`tt-tile tt-tile--${tile.lane} tt-tile--${tile.state}${tile.imageSrc ? ' tt-tile--art' : ''}`}
      style={style}
      role="listitem"
      aria-label={`${tile.title}. ${tile.caption}${tile.points ? `. ${tile.points}` : ''}`}
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
    </div>
  );
}

/**
 * The climb as two paths on a tilted plane that recede into fog: done steps
 * near, today in the middle, the unknown ahead. Opens with a glide up the
 * road that settles on today.
 */
export function TwoTracksRoad({ road, progressPercent, hub, horizon, daily, climbDelta = 0 }: TwoTracksRoadProps) {
  const life = road.tiles.filter((tile) => tile.lane === 'life');
  const game = road.tiles.filter((tile) => tile.lane === 'game');
  const style = {
    '--rows': road.rows,
    '--today': road.todayRow,
    '--progress': Math.min(100, Math.max(0, progressPercent)),
    '--glide-rows': climbDelta > 0 ? Math.min(3, 1.5 + climbDelta * 0.5) : 1.5,
  } as CSSProperties;

  return (
    <div className={`tt-road${road.inSync ? ' tt-road--sync' : ''}`} style={style}>
      <div className="tt-road__lane-labels" aria-hidden="true">
        <span className="tt-road__lane-label tt-road__lane-label--life">Real life</span>
        <span className="tt-road__lane-label tt-road__lane-label--game">Game</span>
      </div>
      <div className="tt-road__viewport">
        <div className="tt-road__plane">
          <div className="tt-road__track">
            <div className="tt-road__lane tt-road__lane--life" role="list" aria-label="Real life journey">
              {life.map((tile) => <RoadTile key={tile.id} tile={tile} />)}
            </div>
            <div className="tt-road__spine" aria-hidden="true">
              <span className="tt-road__spine-done" />
              <span className="tt-road__spine-ahead">
                <span className="tt-road__spine-fill" />
              </span>
            </div>
            <div className="tt-road__lane tt-road__lane--game" role="list" aria-label="Game journey">
              {game.map((tile) => <RoadTile key={tile.id} tile={tile} />)}
            </div>
            <span className="tt-road__bridge" aria-hidden="true" />
            <div className="tt-road__billboard tt-road__billboard--hub">{hub}</div>
          </div>
        </div>
      </div>
      <div className="tt-road__fog" aria-hidden="true" />
      <div className="tt-road__hud">
        {horizon}
        {daily}
      </div>
    </div>
  );
}
