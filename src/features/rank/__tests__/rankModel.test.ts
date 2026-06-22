/**
 * Player rank domain tests. Pure logic only — no Supabase/React.
 * Run via `npm run test:rank`.
 */

import {
  RANKS,
  MIN_RANK,
  MAX_RANK,
  getRankById,
  rankForLevel,
  nextRankForLevel,
  isMaxRank,
  progressToNextRank,
} from '../rankModel';
import {
  rankBadgeSrc,
  rankBadgeAlt,
  membershipBadgeSrc,
  membershipBadgeLabel,
  everyRankHasBadge,
} from '../rankAssets';

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
    name: 'ladder has 12 ranks with unique, ascending ordinals',
    run: () => {
      assertEqual(RANKS.length, 12, 'Expected exactly 12 ranks');
      RANKS.forEach((rank, index) => {
        assertEqual(rank.id, index + 1, `Expected rank at index ${index} to have id ${index + 1}`);
      });
    },
  },
  {
    name: 'thresholds are strictly ascending and start at level 1',
    run: () => {
      assertEqual(RANKS[0].minLevel, 1, 'Expected the first rank to be held from level 1');
      let previous = -Infinity;
      for (const rank of RANKS) {
        assert(rank.minLevel > previous, `Expected ${rank.key} threshold to exceed the previous rank`);
        previous = rank.minLevel;
      }
    },
  },
  {
    name: 'top two ranks use stars, the rest use stripes',
    run: () => {
      assertEqual(RANKS[10].insignia, 'stars', 'Expected Fleet Captain to use stars');
      assertEqual(RANKS[10].stars, 2, 'Expected Fleet Captain to have 2 stars');
      assertEqual(RANKS[11].insignia, 'stars', 'Expected Sky Marshal to use stars');
      assertEqual(RANKS[11].stars, 3, 'Expected Sky Marshal to have 3 stars');
      for (let i = 0; i < 10; i += 1) {
        assertEqual(RANKS[i].insignia, 'stripes', `Expected ${RANKS[i].key} to use stripes`);
      }
    },
  },
  {
    name: 'first six ranks are bronze, the rest are command tier',
    run: () => {
      for (let i = 0; i < 6; i += 1) {
        assertEqual(RANKS[i].tier, 'bronze', `Expected ${RANKS[i].key} to be bronze tier`);
      }
      for (let i = 6; i < 12; i += 1) {
        assertEqual(RANKS[i].tier, 'command', `Expected ${RANKS[i].key} to be command tier`);
      }
    },
  },
  {
    name: 'getRankById returns the matching rank or undefined',
    run: () => {
      assertEqual(getRankById(1)?.key, 'deckhand', 'Expected id 1 to be Deckhand');
      assertEqual(getRankById(12)?.key, 'sky-marshal', 'Expected id 12 to be Sky Marshal');
      assertEqual(getRankById(0), undefined, 'Expected id 0 to be out of range');
      assertEqual(getRankById(13), undefined, 'Expected id 13 to be out of range');
    },
  },
  {
    name: 'rankForLevel clamps low/invalid levels to the minimum rank',
    run: () => {
      assertEqual(rankForLevel(1).id, MIN_RANK.id, 'Expected level 1 to be the minimum rank');
      assertEqual(rankForLevel(0).id, MIN_RANK.id, 'Expected level 0 to clamp to the minimum rank');
      assertEqual(rankForLevel(-5).id, MIN_RANK.id, 'Expected negative level to clamp');
      assertEqual(rankForLevel(Number.NaN).id, MIN_RANK.id, 'Expected NaN to clamp');
    },
  },
  {
    name: 'rankForLevel maps boundaries to the correct rank',
    run: () => {
      // Just below Crewmate (minLevel 3) stays Deckhand; at 3 it promotes.
      assertEqual(rankForLevel(2).key, 'deckhand', 'Expected level 2 to be Deckhand');
      assertEqual(rankForLevel(3).key, 'crewmate', 'Expected level 3 to be Crewmate');
      // Each threshold boundary lands exactly on its rank.
      for (const rank of RANKS) {
        assertEqual(
          rankForLevel(rank.minLevel).id,
          rank.id,
          `Expected level ${rank.minLevel} to be ${rank.key}`,
        );
        assertEqual(
          rankForLevel(rank.minLevel - 1).id <= rank.id,
          true,
          `Expected one level below ${rank.key} to not exceed it`,
        );
      }
    },
  },
  {
    name: 'very high levels saturate at the maximum rank',
    run: () => {
      assertEqual(rankForLevel(90).id, MAX_RANK.id, 'Expected level 90 to be Sky Marshal');
      assertEqual(rankForLevel(10_000).id, MAX_RANK.id, 'Expected huge level to saturate at max');
      assert(isMaxRank(rankForLevel(10_000)), 'Expected huge level to be the max rank');
    },
  },
  {
    name: 'nextRankForLevel returns the following rank, or null at the top',
    run: () => {
      assertEqual(nextRankForLevel(1)?.key, 'crewmate', 'Expected next after Deckhand to be Crewmate');
      assertEqual(nextRankForLevel(55)?.key, 'fleet-captain', 'Expected next after Captain to be Fleet Captain');
      assertEqual(nextRankForLevel(90), null, 'Expected no next rank past Sky Marshal');
    },
  },
  {
    name: 'progressToNextRank reports a full bar at max rank',
    run: () => {
      const progress = progressToNextRank(90);
      assertEqual(progress.current.id, MAX_RANK.id, 'Expected current to be the max rank');
      assertEqual(progress.next, null, 'Expected no next rank');
      assertEqual(progress.percent, 100, 'Expected a full bar at max rank');
      assertEqual(progress.levelsRemaining, 0, 'Expected no levels remaining at max rank');
    },
  },
  {
    name: 'progressToNextRank computes band fill and remaining levels',
    run: () => {
      // Deckhand band spans levels 1..3 (span 2). At level 2 → 1 level into band.
      const atTwo = progressToNextRank(2);
      assertEqual(atTwo.current.key, 'deckhand', 'Expected current rank Deckhand');
      assertEqual(atTwo.next?.key, 'crewmate', 'Expected next rank Crewmate');
      assertEqual(atTwo.percent, 50, 'Expected 50% through the Deckhand band at level 2');
      assertEqual(atTwo.levelsRemaining, 1, 'Expected 1 level remaining to Crewmate');

      // At the band start the bar is empty.
      assertEqual(progressToNextRank(1).percent, 0, 'Expected 0% at the band start');
    },
  },
  {
    name: 'levelProgressFraction smooths the bar between whole levels',
    run: () => {
      // Deckhand band span 2. Level 1 + 0.5 fraction → 0.5/2 = 25%.
      const smooth = progressToNextRank(1, 0.5);
      assertEqual(smooth.percent, 25, 'Expected fractional progress to smooth the bar');
      // Out-of-range fractions are clamped.
      assertEqual(progressToNextRank(1, 5).percent, 50, 'Expected fraction > 1 to clamp to 1');
      assertEqual(progressToNextRank(1, -5).percent, 0, 'Expected fraction < 0 to clamp to 0');
    },
  },
  {
    name: 'every rank has a badge asset and accessible alt text',
    run: () => {
      assert(everyRankHasBadge(), 'Expected every rank to have a mapped badge asset');
      for (const rank of RANKS) {
        const src = rankBadgeSrc(rank.id);
        assert(typeof src === 'string' && src.startsWith('/assets/ranks/'), `Expected a public path for ${rank.key}`);
        assertEqual(rankBadgeAlt(rank), `Rank: ${rank.title}`, `Expected alt text for ${rank.key}`);
      }
      assertEqual(rankBadgeSrc(99), undefined, 'Expected an unknown rank id to have no badge');
    },
  },
  {
    name: 'membership badges resolve and are labelled separately from ranks',
    run: () => {
      assert(membershipBadgeSrc('member').startsWith('/assets/ranks/'), 'Expected a member badge path');
      assert(membershipBadgeSrc('pro').startsWith('/assets/ranks/'), 'Expected a pro badge path');
      assertEqual(membershipBadgeLabel('member'), 'Member', 'Expected Member label');
      assertEqual(membershipBadgeLabel('pro'), 'Pro', 'Expected Pro label');
    },
  },
];

export function runAllRankTests(): void {
  let passed = 0;
  for (const test of tests) {
    test.run();
    passed += 1;
  }
  console.log(`rank-tests: ${passed}/${tests.length} assertions-suites passed`);
}
