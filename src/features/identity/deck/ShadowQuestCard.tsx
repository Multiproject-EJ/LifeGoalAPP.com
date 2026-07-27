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
    <div className="identity-panel" style={{ ['--accent' as string]: shadowCard.color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary, #111827)', margin: 0 }}>
          🌒 Shadow Quest
        </h3>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: shadowCard.color }}>
          {progress.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '28px', opacity: inTheLight ? 1 : 0.7 }}>{shadowCard.icon}</span>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary, #111827)' }}>
            {shadowCard.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #6b7280)' }}>
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
              backgroundColor: index < progress.level ? shadowCard.color : 'rgba(148, 163, 184, 0.30)',
              boxShadow: index < progress.level ? `0 0 8px ${shadowCard.color}` : 'none',
            }}
          />
        ))}
        <span style={{ fontSize: '11px', color: 'var(--text-secondary, #6b7280)', marginLeft: '4px' }}>
          {progress.completions} quest{progress.completions === 1 ? '' : 's'} completed
        </span>
      </div>

      {inTheLight ? (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(148, 163, 184, 0.10)',
            borderRadius: '8px',
            borderLeft: `4px solid ${shadowCard.color}`,
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-primary, #111827)', fontWeight: 'bold', marginBottom: '4px' }}>
            ✨ Your {shadowCard.name} has stepped into the light.
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary, #6b7280)' }}>
            You've been playing this card for weeks. Retake the test when you're ready — your next
            hand may deal a new shadow to explore.
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(148, 163, 184, 0.10)',
            borderRadius: '8px',
            borderLeft: `4px solid ${shadowCard.color}`,
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            This week's quest
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-primary, #111827)', fontWeight: 'bold', marginBottom: '4px' }}>
            {quest.title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary, #6b7280)', lineHeight: 1.5 }}>{quest.description}</div>
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
          // Filled state sits on the saturated suit colour, so it keeps white text.
          color: questDone ? 'var(--text-secondary, #6b7280)' : '#ffffff',
          backgroundColor: questDone ? 'rgba(148, 163, 184, 0.18)' : shadowCard.color,
          opacity: userId ? 1 : 0.5,
        }}
      >
        {questDone ? '✓ Completed this week — tap to undo' : 'Mark this week\'s quest complete'}
      </button>
      {!userId && (
        <p style={{ fontSize: '12px', color: 'var(--text-secondary, #6b7280)', marginTop: '8px', marginBottom: 0 }}>
          Sign in to track shadow quest progress.
        </p>
      )}
    </div>
  );
}
