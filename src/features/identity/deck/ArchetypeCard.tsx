import React from 'react';
import type { HandCard } from '../archetypes/archetypeHandBuilder';
import { getArchetypeCopy, getRoleMessage } from '../archetypes/archetypeCopy';

type ArchetypeCardProps = {
  handCard: HandCard;
  onClick?: () => void;
  compact?: boolean;
};

const ROLE_LABELS: Record<HandCard['role'], string> = {
  dominant: 'DOM.',
  secondary: 'SEC.',
  support: 'SUP.',
  shadow: 'SHDW',
};

/**
 * Individual archetype card component.
 * Shows icon, name, level stars, suit color, and role label.
 */
export function ArchetypeCard({ handCard, onClick, compact = false }: ArchetypeCardProps) {
  const { card, role, level } = handCard;
  const copy = getArchetypeCopy(handCard);

  const stars = '★'.repeat(level) + '☆'.repeat(5 - level);

  return (
    <div
      className={`archetype-card ${compact ? 'compact' : ''} ${onClick ? 'clickable' : ''}`}
      style={{
        border: `2px solid ${card.color}`,
        borderRadius: '12px',
        padding: compact ? '12px' : '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onClick={onClick}
    >
      {/* Header: Icon and Role Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: compact ? '24px' : '32px' }}>
          {card.icon}
        </div>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: card.color,
            padding: '2px 6px',
            border: `1px solid ${card.color}`,
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {ROLE_LABELS[role]}
        </div>
      </div>

      {/* Card Name */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: compact ? '14px' : '16px', fontWeight: 'bold', color: '#fff' }}>
          {card.name}
        </div>
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
          {card.suit.charAt(0).toUpperCase() + card.suit.slice(1)} Suit
        </div>
      </div>

      {/* Level Stars */}
      <div style={{ fontSize: '14px', color: card.color, marginBottom: compact ? '0' : '12px' }}>
        {stars} <span style={{ fontSize: '11px', color: '#888', marginLeft: '4px' }}>Lv {level}</span>
      </div>

      {/* Details (only in non-compact mode) */}
      {!compact && (
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#ccc', lineHeight: '1.5' }}>
          <div style={{ marginBottom: '8px', fontStyle: 'italic' }}>
            "{card.drive}"
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {copy.powerLine}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Detailed archetype card view (for modal/drawer).
 */
type ArchetypeCardDetailProps = {
  handCard: HandCard;
  onClose?: () => void;
};

export function ArchetypeCardDetail({ handCard, onClose }: ArchetypeCardDetailProps) {
  const { card, score } = handCard;
  const copy = getArchetypeCopy(handCard);
  const roleMessage = getRoleMessage(handCard);

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#aaa',
          }}
        >
          ×
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>
          {card.icon}
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: card.color, marginBottom: '4px' }}>
          {card.name}
        </h2>
        <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>
          {card.suit.charAt(0).toUpperCase() + card.suit.slice(1)} Suit
        </div>
        <div style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
          "{card.drive}"
        </div>
      </div>

      {/* Score and Role */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
        <div style={{ fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
          <strong>Alignment Score:</strong> {score}%
        </div>
        <div style={{ fontSize: '13px', color: '#aaa' }}>
          {roleMessage}
        </div>
      </div>

      {/* Strengths */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: card.color, marginBottom: '8px' }}>
          Strengths
        </h3>
        <ul style={{ paddingLeft: '20px', color: '#ccc', fontSize: '14px', lineHeight: '1.6' }}>
          {card.strengths.map((strength, i) => (
            <li key={i}>{strength}</li>
          ))}
        </ul>
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
          {copy.strengthLine}
        </div>
      </div>

      {/* Weaknesses */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: card.color, marginBottom: '8px' }}>
          Growth Edges
        </h3>
        <ul style={{ paddingLeft: '20px', color: '#ccc', fontSize: '14px', lineHeight: '1.6' }}>
          {card.weaknesses.map((weakness, i) => (
            <li key={i}>{weakness}</li>
          ))}
        </ul>
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
          {copy.growthEdgeLine}
        </div>
      </div>

      {/* Under Stress */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: card.color, marginBottom: '8px' }}>
          Under Stress
        </h3>
        <div style={{ fontSize: '14px', color: '#ccc' }}>
          {card.stressBehavior}
        </div>
      </div>

      {/* Growth Strategy */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: card.color, marginBottom: '8px' }}>
          Growth Strategy
        </h3>
        <div style={{ fontSize: '14px', color: '#ccc' }}>
          {card.growthStrategy}
        </div>
      </div>

      {/* Micro-Tip */}
      <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', borderLeft: `4px solid ${card.color}` }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: card.color, marginBottom: '4px' }}>
          💡 MICRO-TIP
        </div>
        <div style={{ fontSize: '13px', color: '#ccc' }}>
          {copy.microTip}
        </div>
      </div>
    </div>
  );
}
