import React, { useMemo } from 'react';
import type { ArchetypeCard } from '../archetypes/archetypeDeck';
import {
  buildShadowJourney,
  distinctShadowCount,
  type ShadowJourneyRecord,
} from '../archetypes/shadowJourney';

type ShadowJourneyCardProps = {
  /** The current shadow archetype, used for the "consult your shadow" advisor. */
  shadowCard: ArchetypeCard;
  /** Personality test history (any order); the journey is sorted chronologically. */
  records: ShadowJourneyRecord[];
};

const JOURNEY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : JOURNEY_DATE_FORMATTER.format(date);
}

/**
 * Two things in one card: a "consult your shadow" advisor (reframes the shadow
 * as an unplayed strategy you can deliberately draw on) and a Shadow Journey
 * timeline showing how your shadow has shifted across retakes.
 */
export function ShadowJourneyCard({ shadowCard, records }: ShadowJourneyCardProps) {
  const journey = useMemo(() => buildShadowJourney(records), [records]);
  const distinct = distinctShadowCount(journey);
  const color = shadowCard.color;

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: `2px solid ${color}55`,
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 12px' }}>
        🧙 Consult your shadow
      </h3>

      {/* Advisor: the shadow as a perspective you can deliberately draw on. */}
      <div
        style={{
          padding: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '8px',
          borderLeft: `4px solid ${color}`,
          marginBottom: journey.length >= 2 ? '16px' : 0,
        }}
      >
        <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>
          Stuck on something? Draw your {shadowCard.icon} {shadowCard.name}.
        </div>
        <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.5 }}>
          Ask yourself: <em>“What would my {shadowCard.name} do here?”</em> Its instinct is to{' '}
          {lowerFirst(shadowCard.drive)}. {shadowCard.growthStrategy}.
        </div>
      </div>

      {/* Journey timeline: only meaningful once there are at least two retakes. */}
      {journey.length >= 2 && (
        <>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '10px' }}>
            {distinct === 1
              ? 'Your shadow has stayed consistent across your retakes:'
              : `Your shadow has moved through ${distinct} archetypes as you've grown:`}
          </div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {journey.map((entry) => (
              <li
                key={entry.recordId}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <span style={{ fontSize: '20px' }}>{entry.shadowIcon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                    {entry.shadowName}
                    {entry.changedFromPrevious && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color, fontWeight: 700 }}>
                        ↳ shifted
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: '#888' }}>
                    {formatDate(entry.takenAt)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function lowerFirst(text: string): string {
  return text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
}
