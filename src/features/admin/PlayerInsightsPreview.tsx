import { PlayerInsightsView } from './PlayerInsightsView';
import type { PlayerInsights } from '../../services/playerInsights';

/** Development-only preview of the player-insights dashboard with sample data. Never reads player data. */
function sampleInsights(): PlayerInsights {
  const reachedByIsland = [60, 50, 42, 34, 34, 20, 8, 8, 8, 1];
  const lostByIsland = [3, 3, 2, 0, 5, 9, 0, 0, 2, 0];
  const minutes = [15, 15, 15, 14.5, 15, 4.7, 4, 5, 6, 6];
  const today = new Date();
  const day = (offset: number) => new Date(today.getTime() - offset * 86400000).toISOString().slice(0, 10);
  return {
    lookback_days: 30,
    generated_at: today.toISOString(),
    summary: { players: 60, active_1d: 24, active_7d: 40, active_30d: 60, new_7d: 21, finished_all: 1 },
    funnel: reachedByIsland.map((reached, index) => ({
      island: index + 1,
      reached,
      here: index === reachedByIsland.length - 1 ? reached : reached - reachedByIsland[index + 1],
      lost: lostByIsland[index],
      median_days_here: [0.4, 0.8, 1.1, null, 1.6, 3.4, null, null, 2.1, null][index],
    })),
    fun: minutes.map((avg, index) => ({
      island: index + 1,
      player_days: [16, 43, 62, 65, 62, 65, 20, 12, 9, 2][index],
      players: [11, 25, 31, 34, 31, 34, 20, 8, 7, 1][index],
      avg_minutes: avg,
      avg_rolls: Math.round(avg * 5.3),
      avg_sessions: 2,
      avg_builds: 3,
    })),
    cohorts: [
      { week: day(6), size: 21, d1: 12, d7: 0, d30: 0, age_days: 6 },
      { week: day(13), size: 17, d1: 9, d7: 7, d30: 0, age_days: 13 },
      { week: day(20), size: 22, d1: 14, d7: 11, d30: 0, age_days: 20 },
    ],
    daily: Array.from({ length: 30 }, (_, index) => ({
      day: day(29 - index),
      active: Math.round(18 + 10 * Math.sin(index / 4) + index * 0.4),
      new_players: index % 3 === 0 ? 3 : 1,
    })),
  };
}

export default function PlayerInsightsPreview() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '1rem', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <h3 style={{ marginTop: 0, color: 'inherit' }}>Player insights</h3>
      <PlayerInsightsView insights={sampleInsights()} />
    </div>
  );
}
