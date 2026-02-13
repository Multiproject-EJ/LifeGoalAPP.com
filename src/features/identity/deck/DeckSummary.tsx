import React from 'react';
import type { ArchetypeHand } from '../archetypes/archetypeHandBuilder';
import { getHandSummary } from '../archetypes/archetypeHandBuilder';
import { SUIT_LABELS, SUIT_COLORS } from '../archetypes/archetypeDeck';

type DeckSummaryProps = {
  hand: ArchetypeHand;
  microTestCount?: number;
};

/**
 * Compact deck summary showing dominant suit, strength %, and micro-test badge.
 * Designed for use in the personality test results view.
 */
export function DeckSummary({ hand, microTestCount = 0 }: DeckSummaryProps) {
  const summary = getHandSummary(hand);
  const suitColor = SUIT_COLORS[summary.dominantSuit];
  const suitLabel = SUIT_LABELS[summary.dominantSuit];

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: `2px solid ${suitColor}`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
          🎴 Your Deck
        </h3>
        {microTestCount > 0 && (
          <div
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '4px 10px',
              borderRadius: '12px',
            }}
          >
            {microTestCount} new
          </div>
        )}
      </div>

      {/* Dominant Suit */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '4px' }}>
          Dominant Suit
        </div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: suitColor }}>
          {hand.dominant.card.icon} {suitLabel}
        </div>
      </div>

      {/* Deck Strength */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '4px' }}>
          Deck Strength
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              flex: 1,
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${summary.deckStrength}%`,
                backgroundColor: suitColor,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', minWidth: '40px' }}>
            {summary.deckStrength}%
          </div>
        </div>
      </div>

      {/* Card Count */}
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
        {summary.cardCount} cards in your hand
      </div>

      {/* Call to Action */}
      <div
        style={{
          padding: '12px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6',
        }}
      >
        <div style={{ fontSize: '13px', color: '#ccc' }}>
          {microTestCount > 0 ? (
            <>
              <strong style={{ color: '#3b82f6' }}>Micro-tests available!</strong> Take a quick 60-second quiz to level up your cards.
            </>
          ) : (
            <>
              Your deck is set. Keep building habits aligned with your archetypes to level up your cards over time.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline deck teaser for personality test results.
 * Shows just the 5 card icons with minimal styling.
 */
type DeckTeaserProps = {
  hand: ArchetypeHand;
};

export function DeckTeaser({ hand }: DeckTeaserProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div style={{ fontSize: '32px' }}>{hand.dominant.card.icon}</div>
      <div style={{ fontSize: '24px' }}>{hand.secondary.card.icon}</div>
      <div style={{ fontSize: '20px' }}>{hand.supports[0].card.icon}</div>
      <div style={{ fontSize: '20px' }}>{hand.supports[1].card.icon}</div>
      <div style={{ fontSize: '16px', opacity: 0.5 }}>{hand.shadow.card.icon}</div>
    </div>
  );
}
