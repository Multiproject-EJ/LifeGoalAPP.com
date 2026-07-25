/**
 * Derives the player's "Shadow Journey" — how their shadow card (least-played
 * archetype) has shifted across foundation-test retakes. Pure: it recomputes
 * each record's shadow from its stored trait/axis scores rather than trusting a
 * possibly-stale stored hand, and pins the two unmeasured HEXACO axes to a
 * neutral 50 so records saved before the phantom-0% fix aren't biased.
 */

import { ARCHETYPE_DECK } from './archetypeDeck';
import { rankArchetypes, scoreArchetypes } from './archetypeScoring';
import { buildHand } from './archetypeHandBuilder';
import { coerceStoredScores, type PersonalityScores } from '../personalityScoring';

export type ShadowJourneyRecord = {
  id: string;
  taken_at: string;
  traits?: Record<string, number> | null;
  axes?: Record<string, number> | null;
};

export type ShadowJourneyEntry = {
  recordId: string;
  takenAt: string;
  shadowId: string;
  shadowName: string;
  shadowIcon: string;
  /** True when this record's shadow differs from the previous (chronological) one. */
  changedFromPrevious: boolean;
};

function coerce(record: ShadowJourneyRecord): PersonalityScores {
  return coerceStoredScores(record.traits, record.axes);
}

/** Chronological (oldest → newest) shadow-card history across retakes. */
export function buildShadowJourney(records: ShadowJourneyRecord[]): ShadowJourneyEntry[] {
  const chronological = [...records].sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  const entries: ShadowJourneyEntry[] = [];
  let previousShadowId: string | null = null;

  for (const record of chronological) {
    const hand = buildHand(rankArchetypes(scoreArchetypes(coerce(record), ARCHETYPE_DECK)));
    const shadow = hand.shadow.card;
    entries.push({
      recordId: record.id,
      takenAt: record.taken_at,
      shadowId: shadow.id,
      shadowName: shadow.name,
      shadowIcon: shadow.icon,
      changedFromPrevious: previousShadowId !== null && previousShadowId !== shadow.id,
    });
    previousShadowId = shadow.id;
  }

  return entries;
}

export function distinctShadowCount(entries: ShadowJourneyEntry[]): number {
  return new Set(entries.map((entry) => entry.shadowId)).size;
}
