import { useState } from 'react';
import {
  buildPlayerInsightsDigest,
  cohortRate,
  findBiggestDrop,
  findFunDip,
  formatPercent,
  type PlayerInsights,
} from '../../services/playerInsights';
import './player-insights.css';

type Props = { insights: PlayerInsights };

/** Presentational player-insights dashboard: funnel, fun curve, retention, daily actives. */
export function PlayerInsightsView({ insights }: Props) {
  const [copied, setCopied] = useState(false);
  const { summary } = insights;
  const drop = findBiggestDrop(insights.funnel);
  const dip = findFunDip(insights.fun);
  const funnel = insights.funnel.filter((row) => row.reached > 0);
  const maxReached = Math.max(1, ...funnel.map((row) => row.reached));
  const maxMinutes = Math.max(1, ...insights.fun.map((row) => row.avg_minutes));
  const maxActive = Math.max(1, ...insights.daily.map((row) => row.active));

  const copyDigest = async () => {
    try {
      await navigator.clipboard.writeText(buildPlayerInsightsDigest(insights));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="player-insights">
      <div className="player-insights__stats">
        {[
          ['Players', summary.players],
          ['Active today', summary.active_1d],
          ['Active 7d', summary.active_7d],
          ['New 7d', summary.new_7d],
          ['Finished all', summary.finished_all],
        ].map(([label, value]) => (
          <div key={label as string} className="player-insights__stat">
            <strong>{Number(value).toLocaleString()}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="player-insights__callouts">
        <p className={`player-insights__callout${drop ? ' player-insights__callout--alert' : ''}`}>
          <span aria-hidden="true">🚩</span>
          <span>{drop
            ? <>Biggest drop: <strong>Island {drop.island}</strong>. {drop.lost} of {drop.reached} players who reached it are gone ({formatPercent(drop.lossRate)}).</>
            : <>No clear drop-off yet: it needs a few players who stopped for 7+ days.</>}</span>
        </p>
        <p className={`player-insights__callout${dip ? ' player-insights__callout--warn' : ''}`}>
          <span aria-hidden="true">📉</span>
          <span>{dip
            ? <>Fun dip: <strong>Island {dip.island}</strong>. Play time falls {dip.minutesBefore.toFixed(1)} → {dip.minutesAt.toFixed(1)} min/day (−{formatPercent(dip.dropRate)}).</>
            : <>No fun dip detected: play time holds up across islands.</>}</span>
        </p>
        <button type="button" className="player-insights__copy" onClick={() => void copyDigest()}>
          {copied ? 'Copied ✓' : 'Copy summary'}
        </button>
      </div>

      <section className="player-insights__section" aria-labelledby="pi-funnel">
        <h4 id="pi-funnel">Island funnel <small>reached · <em className="pi-lost">lost</em> (7+ days quiet) · median days on island</small></h4>
        <div className="player-insights__funnel" role="list">
          {funnel.map((row) => (
            <div
              key={row.island}
              role="listitem"
              className={`player-insights__funnel-row${drop?.island === row.island ? ' is-flagged' : ''}`}
              aria-label={`Island ${row.island}: reached ${row.reached}, here now ${row.here}, lost ${row.lost}`}
            >
              <span className="player-insights__funnel-label">{row.island}</span>
              <span className="player-insights__bar-track">
                <span className="player-insights__bar" style={{ width: `${(row.reached / maxReached) * 100}%` }}>
                  <span className="player-insights__bar-lost" style={{ width: `${row.reached ? (row.lost / row.reached) * 100 : 0}%` }} />
                </span>
              </span>
              <span className="player-insights__funnel-meta">
                {row.reached}
                {row.lost > 0 ? <em className="pi-lost"> −{row.lost}</em> : null}
                {row.median_days_here !== null ? <small> · {row.median_days_here}d</small> : null}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="player-insights__section" aria-labelledby="pi-fun">
        <h4 id="pi-fun">Fun curve <small>minutes played per active day, by island</small></h4>
        {insights.fun.length === 0 ? (
          <p className="player-insights__empty">No play activity recorded yet. The heartbeat starts once this ships.</p>
        ) : (
          <div className="player-insights__fun" role="list">
            {insights.fun.map((row) => (
              <div
                key={row.island}
                role="listitem"
                className={`player-insights__fun-col${dip?.island === row.island ? ' is-flagged' : ''}`}
                aria-label={`Island ${row.island}: ${row.avg_minutes} minutes, ${row.avg_rolls} rolls, ${row.avg_sessions} sessions per day, ${row.players} players`}
              >
                <span className="player-insights__fun-value">{row.avg_minutes}</span>
                <span className="player-insights__fun-bar" style={{ height: `${(row.avg_minutes / maxMinutes) * 100}%` }} />
                <span className="player-insights__fun-label">{row.island}</span>
                <span className="player-insights__fun-sub">{Math.round(row.avg_rolls)}🎲</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="player-insights__section" aria-labelledby="pi-retention">
        <h4 id="pi-retention">Retention by first-play week</h4>
        {insights.cohorts.length === 0 ? (
          <p className="player-insights__empty">No cohorts yet.</p>
        ) : (
          <table className="player-insights__table">
            <thead>
              <tr><th>Week</th><th>Players</th><th>Next day</th><th>7+ days</th><th>30+ days</th></tr>
            </thead>
            <tbody>
              {insights.cohorts.map((cohort) => (
                <tr key={cohort.week}>
                  <td>{cohort.week}</td>
                  <td>{cohort.size}</td>
                  <td>{formatPercent(cohortRate(cohort, 'd1'))}</td>
                  <td>{formatPercent(cohortRate(cohort, 'd7'))}</td>
                  <td>{formatPercent(cohortRate(cohort, 'd30'))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="player-insights__section" aria-labelledby="pi-daily">
        <h4 id="pi-daily">Daily active players <small>last {insights.lookback_days} days</small></h4>
        <div className="player-insights__daily" role="img" aria-label="Daily active players chart">
          {insights.daily.map((row) => (
            <span
              key={row.day}
              className="player-insights__daily-bar"
              style={{ height: `${Math.max(2, (row.active / maxActive) * 100)}%` }}
              title={`${row.day}: ${row.active} active, ${row.new_players} new`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
