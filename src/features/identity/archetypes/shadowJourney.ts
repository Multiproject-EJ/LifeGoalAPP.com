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
import { isDimensionMeasured, type PersonalityScores } from '../personalityScoring';
import type { DimensionKey } from '../personalityTestData';

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

function pick(source: Record<string, number> | null | undefined, key: string): number {
  if (!isDimensionMeasured(key as DimensionKey)) return 50;
  const value = source?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 50;
}

function coerce(record: ShadowJourneyRecord): PersonalityScores {
  return {
    traits: {
      openness: pick(record.traits, 'openness'),
      conscientiousness: pick(record.traits, 'conscientiousness'),
      extraversion: pick(record.traits, 'extraversion'),
      agreeableness: pick(record.traits, 'agreeableness'),
      emotional_stability: pick(record.traits, 'emotional_stability'),
    },
    axes: {
      regulation_style: pick(record.axes, 'regulation_style'),
      stress_response: pick(record.axes, 'stress_response'),
      identity_sensitivity: pick(record.axes, 'identity_sensitivity'),
      cognitive_entry: pick(record.axes, 'cognitive_entry'),
      honesty_humility: pick(record.axes, 'honesty_humility'),
      emotionality: pick(record.axes, 'emotionality'),
    },
  };
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
