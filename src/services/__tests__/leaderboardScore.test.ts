/**
 * Leaderboard scoring tests. Pure logic only — no Supabase.
 * Run via `npm run test:leaderboard`.
 */

import {
  toLeaderboardScore,
  buildRankAheadFilter,
} from '../leaderboardScore';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} (expected ${String(expected)}, received ${String(actual)})`);
  }
}

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: 'toLeaderboardScore reads the combined-journey columns',
    run: () => {
      const score = toLeaderboardScore({
        user_id: 'u1',
        combined_journey_level: 12,
        combined_journey_xp: 3450,
      });
      assertEqual(score.level, 12, 'Expected level from combined_journey_level');
      assertEqual(score.score, 3450, 'Expected score from combined_journey_xp');
    },
  },
  {
    name: 'toLeaderboardScore is null-safe (defaults to level 1, score 0)',
    run: () => {
      const score = toLeaderboardScore({
        user_id: 'u2',
        combined_journey_level: null,
        combined_journey_xp: null,
      });
      assertEqual(score.level, 1, 'Expected default level 1');
      assertEqual(score.score, 0, 'Expected default score 0');
    },
  },
  {
    name: 'buildRankAheadFilter orders by xp, then level, then user_id',
    run: () => {
      const filter = buildRankAheadFilter({ level: 5, score: 800 }, 'viewer-123');
      assertEqual(
        filter,
        [
          'combined_journey_xp.gt.800',
          'and(combined_journey_xp.eq.800,combined_journey_level.gt.5)',
          'and(combined_journey_xp.eq.800,combined_journey_level.eq.5,user_id.lt.viewer-123)',
        ].join(','),
        'Expected the tiered ahead-filter to match the leaderboard ordering',
      );
    },
  },
  {
    name: 'buildRankAheadFilter has three OR clauses',
    run: () => {
      const filter = buildRankAheadFilter({ level: 1, score: 0 }, 'u');
      // Split on top-level commas is unsafe (and(...) contains commas); count
      // the clause prefixes instead.
      assert(filter.startsWith('combined_journey_xp.gt.0,'), 'Expected the strict-xp clause first');
      assertEqual(
        (filter.match(/and\(/g) ?? []).length,
        2,
        'Expected two compound tiebreaker clauses',
      );
    },
  },
];

export function runAllLeaderboardTests(): void {
  let passed = 0;
  for (const test of tests) {
    test.run();
    passed += 1;
  }
  console.log(`leaderboard-tests: ${passed}/${tests.length} assertions-suites passed`);
}
