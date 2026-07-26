import React from 'react';
import type { HandCard } from '../archetypes/archetypeHandBuilder';
import { SUIT_GLYPHS, SUIT_LABELS } from '../archetypes/archetypeDeck';
import { getArchetypeCopy, getRoleMessage } from '../archetypes/archetypeCopy';

type ArchetypeCardProps = {
  handCard: HandCard;
  onClick?: () => void;
  compact?: boolean;
};

/**
 * Card "rank" per role. Dominant is the ace of your hand; the shadow gets a
 * moon rather than a low number — it is unplayed, not worth less.
 */
const ROLE_RANKS: Record<HandCard['role'], string> = {
  dominant: 'A',
  secondary: 'K',
  support: 'J',
  shadow: '☾',
};

const ROLE_LABELS: Record<HandCard['role'], string> = {
  dominant: 'Dominant',
  secondary: 'Secondary',
  support: 'Support',
  shadow: 'Shadow',
};

/**
 * A single archetype card with real playing-card anatomy: corner pips (rank +
 * suit glyph, mirrored bottom-right), a suit watermark, a portrait window, and
 * a name banner. Previously this was a rounded box with an emoji, which read as
 * UI rather than as a card.
 */
export function ArchetypeCard({ handCard, onClick, compact = false }: ArchetypeCardProps) {
  const { card, role, level } = handCard;
  const copy = getArchetypeCopy(handCard);
  const glyph = SUIT_GLYPHS[card.suit];
  const rank = ROLE_RANKS[role];

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      className={[
        'pcard',
        `pcard--${role}`,
        compact ? 'pcard--compact' : '',
        onClick ? 'pcard--clickable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ['--card-color' as string]: card.color }}
      onClick={onClick}
      aria-label={`${card.name}, ${ROLE_LABELS[role]} card, ${SUIT_LABELS[card.suit]}`}
    >
      <span className="pcard__pip pcard__pip--tl" aria-hidden="true">
        <span className="pcard__rank">{rank}</span>
        <span className="pcard__glyph">{glyph}</span>
      </span>

      <span className="pcard__watermark" aria-hidden="true">
        {glyph}
      </span>

      <span className="pcard__portrait" aria-hidden="true">
        {card.icon}
      </span>

      <span className="pcard__banner">
        <span className="pcard__name">{card.name}</span>
        {!compact && <span className="pcard__drive">{card.drive}</span>}
      </span>

      <span className="pcard__level" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`pcard__level-pip${index < level ? ' pcard__level-pip--on' : ''}`}
          />
        ))}
      </span>

      <span className="pcard__pip pcard__pip--br" aria-hidden="true">
        <span className="pcard__rank">{rank}</span>
        <span className="pcard__glyph">{glyph}</span>
      </span>

      {!compact && <span className="pcard__power">{copy.powerLine}</span>}
    </Wrapper>
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
