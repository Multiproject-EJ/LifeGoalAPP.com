/**
 * Version dispatch for the foundation test.
 *
 * Two banks now exist. v1 records hold Likert answers keyed by v1 question ids;
 * v2 records hold chosen option ids keyed by v2 question ids. Scoring a record
 * with the wrong bank is not merely inaccurate — `scorePersonality` throws on a
 * missing answer — so the record's own `version` decides, never a global swap.
 *
 * v1 records are deliberately read from their STORED trait/axis values rather
 * than re-scored from raw answers: the stored numbers are what that test
 * actually produced, and re-scoring can throw if the bank has drifted.
 */

import {
  FOUNDATION_MEASURED_DIMENSIONS,
  coerceStoredScores,
  type PersonalityScores,
} from './personalityScoring';
import type { DimensionKey } from './personalityTestData';
import { scoreStoredScenarioAnswers } from './personalityScoringV2';
import type { GameAxisKey } from './personalityTestDataV2';

export const CURRENT_FOUNDATION_VERSION = 'v2';

export type StoredFoundationRecord = {
  traits?: Record<string, number> | null;
  axes?: Record<string, number> | null;
  answers?: Record<string, unknown> | null;
  version?: string | null;
};

export type FoundationRead = {
  version: 'v1' | 'v2';
  scores: PersonalityScores;
  /** Dimensions with real data behind them for THIS record. */
  measured: Set<DimensionKey>;
  /** Present only for v2 records. */
  axisScores: Record<GameAxisKey, number> | null;
  measuredAxes: Set<GameAxisKey> | null;
};

export function isV2Record(record: StoredFoundationRecord | null | undefined): boolean {
  return record?.version === 'v2';
}

/**
 * Reads a stored record into scores + per-record measured dimensions.
 * Returns null when there is nothing usable to read.
 */
export function readStoredFoundation(
  record: StoredFoundationRecord | null | undefined,
): FoundationRead | null {
  if (!record) return null;

  if (isV2Record(record)) {
    const scored = scoreStoredScenarioAnswers(record.answers);
    if (scored) {
      return {
        version: 'v2',
        scores: scored.scores,
        measured: scored.measured,
        axisScores: scored.axisScores,
        measuredAxes: scored.measuredAxes,
      };
    }
    // v2 record whose answers are missing/unreadable — fall back to the stored
    // aggregate so the player still sees their hand, just without axes.
    return {
      version: 'v2',
      scores: coerceStoredScores(record.traits, record.axes),
      measured: new Set(FOUNDATION_MEASURED_DIMENSIONS),
      axisScores: null,
      measuredAxes: null,
    };
  }

  return {
    version: 'v1',
    scores: coerceStoredScores(record.traits, record.axes),
    measured: new Set(FOUNDATION_MEASURED_DIMENSIONS),
    axisScores: null,
    measuredAxes: null,
  };
}
