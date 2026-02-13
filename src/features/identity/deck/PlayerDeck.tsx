import React, { useState } from 'react';
import type { ArchetypeHand } from '../archetypes/archetypeHandBuilder';
import { ArchetypeCard, ArchetypeCardDetail } from './ArchetypeCard';
import { handToArray } from '../archetypes/archetypeHandBuilder';

type PlayerDeckProps = {
  hand: ArchetypeHand;
  showDetails?: boolean;
};

/**
 * Main player deck component showing the 5-card hand.
 * Displays cards in a visual layout with dominant card prominent.
 */
export function PlayerDeck({ hand, showDetails = false }: PlayerDeckProps) {
  const [selectedCard, setSelectedCard] = useState<typeof hand.dominant | null>(null);

  const allCards = handToArray(hand);

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
          Your Deck
        </h2>
        <p style={{ fontSize: '14px', color: '#aaa' }}>
          Your unique playstyle hand — how you show up in the Game of Life
        </p>
      </div>

      {/* Card Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Dominant Card (featured) */}
        <div style={{ gridColumn: showDetails ? 'span 1' : '1 / -1' }}>
          <ArchetypeCard
            handCard={hand.dominant}
            onClick={() => setSelectedCard(hand.dominant)}
            compact={false}
          />
        </div>

        {/* Secondary Card */}
        <ArchetypeCard
          handCard={hand.secondary}
          onClick={() => setSelectedCard(hand.secondary)}
          compact={true}
        />

        {/* Support Cards */}
        {hand.supports.map((support, i) => (
          <ArchetypeCard
            key={i}
            handCard={support}
            onClick={() => setSelectedCard(support)}
            compact={true}
          />
        ))}

        {/* Shadow Card */}
        <div style={{ gridColumn: showDetails ? 'span 1' : '1 / -1' }}>
          <ArchetypeCard
            handCard={hand.shadow}
            onClick={() => setSelectedCard(hand.shadow)}
            compact={true}
          />
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
            Shadow card — your growth edge
          </div>
        </div>
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto',
          }}
          onClick={() => setSelectedCard(null)}
        >
          <div
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ArchetypeCardDetail
              handCard={selectedCard}
              onClose={() => setSelectedCard(null)}
            />
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', fontSize: '13px', color: '#aaa', lineHeight: '1.6' }}>
        <p>
          <strong style={{ color: '#fff' }}>Your deck evolves:</strong> As you complete micro-tests and build habits aligned with your archetypes, your cards level up (Lv 0 → Lv 5). Higher levels unlock deeper insights and hybrid archetype potential.
        </p>
      </div>
    </div>
  );
}
