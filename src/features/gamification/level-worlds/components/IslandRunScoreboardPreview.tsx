import type { Session } from '@supabase/supabase-js';
import { IslandRunScoreboardModal } from './IslandRunScoreboardModal';
import type { LeaderboardEntry } from '../../../../services/leaderboard';

/** Development-only preview with sample league rows: ?phase=intro|quiz|league. */
export default function IslandRunScoreboardPreview() {
  const params = new URLSearchParams(window.location.search);
  const phase = (params.get('phase') ?? 'league') as 'intro' | 'quiz' | 'league';
  const session = { user: { id: 'preview-me', email: 'you@example.com', user_metadata: { display_name: 'You', personality_profile_type: phase === 'league' ? 'Explorer' : undefined } } } as unknown as Session;
  const names: Array<[string, string, number, number]> = [
    ['Mira', 'Commander', 14, 5240], ['Tobias', 'Sage', 12, 4610], ['Ines', 'Caregiver', 12, 4480], ['Kai', 'Explorer', 11, 4020],
    ['Luna', 'Visionary', 10, 3790], ['Ari', 'Strategist', 9, 3350], ['Noor', 'Healer', 9, 3110], ['Theo', 'Architect', 8, 2890],
    ['Sol', 'Rebel', 8, 2720], ['Ada', 'Mentor', 7, 2490],
  ];
  const top: LeaderboardEntry[] = names.map(([playerName, archetype, level, combinedWealth], i) => ({ rank: i + 1, userId: `u${i}`, playerName, archetype, level, combinedWealth }));
  const around: LeaderboardEntry[] = [
    { rank: 41, userId: 'u40', playerName: 'Jonas', archetype: 'Engineer', level: 4, combinedWealth: 1180 },
    { rank: 42, userId: 'preview-me', playerName: 'You', archetype: 'Explorer', level: 4, combinedWealth: 1150 },
    { rank: 43, userId: 'u42', playerName: 'Rae', archetype: 'Empath', level: 4, combinedWealth: 1090 },
  ];
  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#1b3a5c,#0b1a2e)' }}>
      <IslandRunScoreboardModal session={session} onClose={() => undefined} preview={{ top, around, rank: 42, phase }} />
    </div>
  );
}
