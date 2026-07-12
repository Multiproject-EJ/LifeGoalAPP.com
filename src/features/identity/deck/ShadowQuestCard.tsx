import React, { useMemo, useState } from 'react';
import type { ArchetypeHand } from '../archetypes/archetypeHandBuilder';
import {
  SHADOW_MAX_LEVEL,
  buildShadowQuestForWeek,
  completeShadowQuest,
  getIsoWeekKey,
  getShadowProgress,
  loadShadowQuestCompletions,
  uncompleteShadowQuest,
} from '../archetypes/shadowQuests';

type ShadowQuestCardProps = {
  hand: ArchetypeHand;
  userId: string | null;
};

/**
 * Weekly Shadow Quest panel for the personality results view. Frames the
 * shadow card as an unplayed strategy, offers this week's optional quest, and
 * warms the card through ember levels as quests complete.
 */
export function ShadowQuestCard({ hand, userId }: ShadowQuestCardProps) {
  const shadowCard = hand.shadow.card;
  const weekKey = getIsoWeekKey();
  const quest = useMemo(
    () => buildShadowQuestForWeek(shadowCard, weekKey),
    [shadowCard, weekKey],
  );
  const [completions, setCompletions] = useState(() => loadShadowQuestCompletions(userId));

  const progress = getShadowProgress(completions, shadowCard.id);
  const questDone = completions.some((entry) => entry.questId === quest.id);
  const inTheLight = progress.level >= SHADOW_MAX_LEVEL;

  const handleToggle = () => {
    if (!userId) return;
    setCompletions(
      questDone ? uncompleteShadowQuest(userId, quest) : completeShadowQuest(userId, quest),
    );
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: `2px solid ${shadowCard.color}55`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
          🌒 Shadow Quest
        </h3>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: shadowCard.color }}>
          {progress.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '28px', opacity: inTheLight ? 1 : 0.7 }}>{shadowCard.icon}</span>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
            {shadowCard.name}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            Your least-played card — an unplayed strategy, not a flaw.
          </div>
        </div>
      </div>

      {/* Ember progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
        {Array.from({ length: SHADOW_MAX_LEVEL }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: index < progress.level ? shadowCard.color : 'rgba(255, 255, 255, 0.15)',
              boxShadow: index < progress.level ? `0 0 8px ${shadowCard.color}` : 'none',
            }}
          />
        ))}
        <span style={{ fontSize: '11px', color: '#888', marginLeft: '4px' }}>
          {progress.completions} quest{progress.completions === 1 ? '' : 's'} completed
        </span>
      </div>

      {inTheLight ? (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            borderLeft: `4px solid ${shadowCard.color}`,
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#eee', fontWeight: 'bold', marginBottom: '4px' }}>
            ✨ Your {shadowCard.name} has stepped into the light.
          </div>
          <div style={{ fontSize: '13px', color: '#ccc' }}>
            You've been playing this card for weeks. Retake the test when you're ready — your next
            hand may deal a new shadow to explore.
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            borderLeft: `4px solid ${shadowCard.color}`,
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            This week's quest
          </div>
          <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
            {quest.title}
          </div>
          <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.5 }}>{quest.description}</div>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        disabled={!userId}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          border: 'none',
          cursor: userId ? 'pointer' : 'not-allowed',
          fontWeight: 'bold',
          fontSize: '14px',
          color: questDone ? '#ccc' : '#fff',
          backgroundColor: questDone ? 'rgba(255, 255, 255, 0.1)' : shadowCard.color,
          opacity: userId ? 1 : 0.5,
        }}
      >
        {questDone ? '✓ Completed this week — tap to undo' : 'Mark this week\'s quest complete'}
      </button>
      {!userId && (
        <p style={{ fontSize: '12px', color: '#888', marginTop: '8px', marginBottom: 0 }}>
          Sign in to track shadow quest progress.
        </p>
      )}
    </div>
  );
}
