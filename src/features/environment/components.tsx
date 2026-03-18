import { useMemo, type CSSProperties } from 'react';
import { computeEnvironmentAudit } from './environmentAudit';
import { buildEnvironmentRecommendations } from './environmentRecommendations';
import {
  environmentContextToJson,
  normalizeEnvironmentContext,
  type EnvironmentContextV1,
} from './environmentSchema';

const PLACE_OPTIONS = ['Home desk', 'Kitchen counter', 'Gym bag', 'Office desk'];
const CUE_OPTIONS = ['After coffee', 'At 7:00 AM', 'After work', 'When I open my laptop'];
const BLOCKER_OPTIONS = ['Phone distraction', 'Low energy', 'No time', 'Forgetting'];
const FALLBACK_OPTIONS = ['2 minutes', '1 rep', '5 minutes', 'Open the app only'];

function normalizeDraft(context: EnvironmentContextV1 | null): EnvironmentContextV1 {
  return context ?? { version: 1 };
}

function commitContext(next: EnvironmentContextV1, onChange: (value: EnvironmentContextV1 | null) => void) {
  onChange(normalizeEnvironmentContext(environmentContextToJson(next), { source: next.source }));
}

function chipStyle(active: boolean): CSSProperties {
  return {
    border: '1px solid',
    borderColor: active ? '#4f46e5' : '#cbd5e1',
    background: active ? '#eef2ff' : '#fff',
    color: active ? '#3730a3' : '#334155',
    borderRadius: '999px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  };
}

export type EnvironmentStrengthCardProps = {
  value: EnvironmentContextV1 | null;
  onChange: (value: EnvironmentContextV1 | null) => void;
  title?: string;
  subtitle?: string;
  optionalLabel?: string;
  legacyNoteLabel?: string;
  onApplyRecommendedStrategy?: () => void;
  recommendedStrategyActive?: boolean;
};

export function EnvironmentStrengthCard({
  value,
  onChange,
  title = 'Make this easier to follow',
  subtitle = 'Optional setup that improves your success odds.',
  optionalLabel = 'Optional',
  legacyNoteLabel = 'Extra notes',
  onApplyRecommendedStrategy,
  recommendedStrategyActive = false,
}: EnvironmentStrengthCardProps) {
  const draft = normalizeDraft(value);
  const audit = useMemo(() => computeEnvironmentAudit(value), [value]);
  const recommendations = useMemo(() => buildEnvironmentRecommendations(value), [value]);

  return (
    <section
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '16px',
        padding: '1rem',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        display: 'grid',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {optionalLabel}
          </div>
          <h3 style={{ margin: '0.25rem 0', fontSize: '1.05rem', color: '#0f172a' }}>{title}</h3>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>{subtitle}</p>
        </div>
        <div style={{ minWidth: '120px', textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700 }}>Strength {audit.score}/5</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem', marginTop: '0.35rem' }}>
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '999px',
                  background: index < audit.score ? '#4f46e5' : '#cbd5e1',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
          <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>{audit.band}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Where will this happen?</span>
          <input
            type="text"
            value={draft.place ?? ''}
            onChange={(event) => commitContext({ ...draft, place: event.target.value }, onChange)}
            placeholder="At my kitchen table after dinner"
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {PLACE_OPTIONS.map((option) => (
              <button key={option} type="button" style={chipStyle(draft.place === option)} onClick={() => commitContext({ ...draft, place: option }, onChange)}>
                {option}
              </button>
            ))}
          </div>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>What will trigger it?</span>
          <input
            type="text"
            value={draft.cue?.label ?? ''}
            onChange={(event) =>
              commitContext({ ...draft, cue: { ...(draft.cue ?? {}), type: draft.cue?.type ?? 'custom', label: event.target.value } }, onChange)
            }
            placeholder="After I make coffee"
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {CUE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                style={chipStyle(draft.cue?.label === option)}
                onClick={() => commitContext({ ...draft, cue: { type: 'custom', label: option } }, onChange)}
              >
                {option}
              </button>
            ))}
          </div>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>What usually gets in the way?</span>
          <input
            type="text"
            value={draft.blocker?.label ?? ''}
            onChange={(event) => commitContext({ ...draft, blocker: { ...(draft.blocker ?? {}), label: event.target.value } }, onChange)}
            placeholder="Phone distractions or low energy"
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {BLOCKER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                style={chipStyle(draft.blocker?.label === option)}
                onClick={() => commitContext({ ...draft, blocker: { ...(draft.blocker ?? {}), label: option } }, onChange)}
              >
                {option}
              </button>
            ))}
          </div>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>If that blocker shows up, what's the fix?</span>
          <input
            type="text"
            value={draft.hackPlan?.summary ?? ''}
            onChange={(event) => commitContext({ ...draft, hackPlan: { ...(draft.hackPlan ?? {}), summary: event.target.value } }, onChange)}
            placeholder="If my phone distracts me, then I leave it in another room."
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Bad-day version</span>
          <input
            type="text"
            value={draft.fallback?.label ?? ''}
            onChange={(event) => commitContext({ ...draft, fallback: { ...(draft.fallback ?? {}), label: event.target.value } }, onChange)}
            placeholder="Do 2 minutes or 1 rep"
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {FALLBACK_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                style={chipStyle(draft.fallback?.label === option)}
                onClick={() => commitContext({ ...draft, fallback: { ...(draft.fallback ?? {}), label: option } }, onChange)}
              >
                {option}
              </button>
            ))}
          </div>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>{legacyNoteLabel}</span>
          <textarea
            value={draft.legacyNote ?? ''}
            onChange={(event) => commitContext({ ...draft, legacyNote: event.target.value }, onChange)}
            rows={3}
            placeholder="Extra setup notes, support people, or prep details"
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', resize: 'vertical' }}
          />
        </label>
      </div>

      {(recommendations.riskTags.length > 0 || recommendations.topHackSuggestions.length > 0) && (
        <div style={{ display: 'grid', gap: '0.5rem', padding: '0.85rem', background: '#eef2ff', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3730a3' }}>
            Suggested friction fixes
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {recommendations.riskTags.map((tag) => (
              <span key={tag} style={{ fontSize: '0.75rem', background: '#c7d2fe', color: '#312e81', padding: '0.35rem 0.5rem', borderRadius: '999px' }}>
                {tag}
              </span>
            ))}
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#312e81' }}>
            {recommendations.topHackSuggestions.map((suggestion) => (
              <li key={suggestion.id} style={{ marginBottom: '0.25rem' }}>{suggestion.label}: {suggestion.description}</li>
            ))}
          </ul>
          {recommendations.recommendedStrategy && onApplyRecommendedStrategy && !recommendedStrategyActive ? (
            <button
              type="button"
              onClick={onApplyRecommendedStrategy}
              style={{
                justifySelf: 'start',
                padding: '0.6rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #4f46e5',
                background: '#fff',
                color: '#3730a3',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Use Friction Removal Strategy
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
