import {
  computeAreaReadiness,
  deriveSupportedAreas,
  parseCheckinScoreMap,
  selectOfferableAreas,
} from '../islandRunAdaptiveAreas';
import { assert, assertDeepEqual, type TestCase } from './testHarness';

// A baseline check-in where every area scores a healthy 8 (not weak).
const ALL_STRONG = {
  health_fitness: 8,
  spirituality_community: 8,
  career_development: 8,
  finance_wealth: 8,
  love_relations: 8,
  family_friends: 8,
  living_spaces: 8,
  fun_creativity: 8,
};

export const islandRunAdaptiveAreasTests: TestCase[] = [
  {
    name: 'weak areas (score < 5) are always offered',
    run: () => {
      const readiness = computeAreaReadiness({
        checkinScores: { ...ALL_STRONG, health_fitness: 3 },
        supportedAreas: new Set(['Health']),
      });
      const health = readiness.find((entry) => entry.area === 'Health');
      assert(health?.isWeak === true, 'Health scoring 3 should be weak');
      // Even though Health has a supporting habit, weak overrides coverage.
      assert(health?.shouldOffer === true, 'Weak area should still be offered');
    },
  },
  {
    name: 'OK area with a supporting habit is hidden, uncovered OK area is offered',
    run: () => {
      const readiness = computeAreaReadiness({
        checkinScores: ALL_STRONG,
        supportedAreas: new Set(['Health']),
      });
      const health = readiness.find((entry) => entry.area === 'Health');
      const money = readiness.find((entry) => entry.area === 'Money');
      assert(health?.shouldOffer === false, 'Covered OK area should be hidden');
      assert(money?.shouldOffer === true, 'Uncovered OK area should be offered');
    },
  },
  {
    name: 'falls back to all areas when everything is OK and covered',
    run: () => {
      const allAreas = ['Health', 'Mind', 'Work', 'Money', 'Love', 'Connections', 'Home', 'Fun'] as const;
      const readiness = computeAreaReadiness({
        checkinScores: ALL_STRONG,
        supportedAreas: new Set(allAreas),
      });
      assert(
        readiness.every((entry) => entry.shouldOffer === false),
        'Every area should be hidden when OK and covered',
      );
      const offered = selectOfferableAreas(readiness);
      assert(offered.length === 8, 'Fallback should offer all 8 areas');
    },
  },
  {
    name: 'weak areas are ordered before merely-uncovered areas, lowest score first',
    run: () => {
      const readiness = computeAreaReadiness({
        checkinScores: { ...ALL_STRONG, career_development: 2, love_relations: 4 },
        supportedAreas: new Set(['Health', 'Mind', 'Money', 'Connections', 'Home', 'Fun']),
      });
      const offered = selectOfferableAreas(readiness);
      // Work (2) and Love (4) are weak; Work first (lower score). No uncovered
      // OK areas remain, so only the two weak areas are offered.
      assertDeepEqual(offered, ['Work', 'Love'], 'Weak areas ordered by ascending score');
    },
  },
  {
    name: 'deriveSupportedAreas reads the Island Run "Area:" tag and domain_key',
    run: () => {
      const supported = deriveSupportedAreas([
        { habit_environment: 'Created from Island Run Habit stop · Area: Health · Timing: Morning', domain_key: null },
        { habit_environment: null, domain_key: 'finance_wealth' },
        { habit_environment: null, domain_key: 'Fun' },
      ]);
      assert(supported.has('Health'), 'Area tag should map to Health');
      assert(supported.has('Money'), 'domain_key check-in key should map to Money');
      assert(supported.has('Fun'), 'domain_key area name should map to Fun');
      assert(!supported.has('Work'), 'Unmentioned areas should not be supported');
    },
  },
  {
    name: 'parseCheckinScoreMap keeps only finite numbers',
    run: () => {
      const map = parseCheckinScoreMap({ health_fitness: 7, finance_wealth: 'x', love_relations: null });
      assertDeepEqual(map, { health_fitness: 7 }, 'Only numeric scores should survive parsing');
    },
  },
];
