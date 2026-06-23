import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LIFE_WHEEL_AREA_TAXONOMY,
  type LifeWheelArea,
} from '../life-wheel/lifeWheelTaxonomy';
import {
  classifyHabitChain,
  describeChainClassification,
  type ChainSuggestion,
  type HabitChainLink,
  type HabitLinkDirection,
} from './habitChainLogic';
import {
  createHabitLink,
  deleteHabitLink,
  generateChainSuggestions,
  listHabitLinks,
  updateHabitLinkStatus,
} from '../../services/habitChainAnalysis';

type OtherHabit = { id: string; name: string };

type HabitChainAnalysisModalProps = {
  isOpen: boolean;
  userId: string;
  sourceHabitId: string;
  sourceHabitName: string;
  otherHabits: OtherHabit[];
  onClose: () => void;
};

type View = 'overview' | 'add' | 'suggest';

const DIRECTION_LABEL: Record<HabitLinkDirection, string> = {
  positive: 'tends to feel easier',
  negative: 'can feel harder',
};

export function HabitChainAnalysisModal({
  isOpen,
  userId,
  sourceHabitId,
  sourceHabitName,
  otherHabits,
  onClose,
}: HabitChainAnalysisModalProps) {
  const [links, setLinks] = useState<HabitChainLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('overview');
  const [saving, setSaving] = useState(false);

  // Add-flow state
  const [targetKind, setTargetKind] = useState<'habit' | 'life_area'>('habit');
  const [targetHabitId, setTargetHabitId] = useState<string>('');
  const [targetArea, setTargetArea] = useState<LifeWheelArea | ''>('');
  const [direction, setDirection] = useState<HabitLinkDirection>('positive');

  // AI-suggestion state
  const [suggestions, setSuggestions] = useState<ChainSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  const [suggestSource, setSuggestSource] = useState<'openai' | 'fallback' | 'unavailable' | null>(null);

  const habitNameById = useMemo(() => {
    const map = new Map<string, string>();
    otherHabits.forEach((habit) => map.set(habit.id, habit.name));
    return map;
  }, [otherHabits]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listHabitLinks(sourceHabitId);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setLinks(result.links);
    }
    setLoading(false);
  }, [sourceHabitId]);

  useEffect(() => {
    if (!isOpen) return;
    setView('overview');
    setSuggestions([]);
    setSuggestNote(null);
    setSuggestSource(null);
    void refresh();
  }, [isOpen, refresh]);

  const summary = useMemo(() => classifyHabitChain(links), [links]);
  const summaryCopy = describeChainClassification(summary.classification);

  const describeTarget = useCallback(
    (link: HabitChainLink): { emoji: string; label: string } => {
      if (link.targetHabitId) {
        return { emoji: '🔁', label: habitNameById.get(link.targetHabitId) ?? 'another habit' };
      }
      if (link.lifeArea) {
        const meta = LIFE_WHEEL_AREA_TAXONOMY.find((entry) => entry.area === link.lifeArea);
        return { emoji: meta?.emoji ?? '🧭', label: meta?.shortLabel ?? link.lifeArea };
      }
      return { emoji: '•', label: 'something' };
    },
    [habitNameById],
  );

  const resetAddFlow = () => {
    setTargetKind(otherHabits.length > 0 ? 'habit' : 'life_area');
    setTargetHabitId('');
    setTargetArea('');
    setDirection('positive');
  };

  const handleSaveLink = async () => {
    if (targetKind === 'habit' && !targetHabitId) {
      setError('Pick a habit this one tends to affect.');
      return;
    }
    if (targetKind === 'life_area' && !targetArea) {
      setError('Pick a life area this one tends to affect.');
      return;
    }
    setSaving(true);
    const result = await createHabitLink({
      userId,
      sourceHabitId,
      targetHabitId: targetKind === 'habit' ? targetHabitId : null,
      lifeArea: targetKind === 'life_area' ? (targetArea as LifeWheelArea) : null,
      direction,
      evidence: 'user_confirmed',
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    resetAddFlow();
    setView('overview');
    await refresh();
  };

  const handleAcceptSuggestion = async (suggestion: ChainSuggestion) => {
    setSaving(true);
    // AI suggests by label; map a habit label back to an id when possible, else store as a life area.
    const matchedHabit = otherHabits.find(
      (habit) => habit.name.toLowerCase() === suggestion.targetLabel.toLowerCase(),
    );
    const matchedArea = LIFE_WHEEL_AREA_TAXONOMY.find(
      (entry) =>
        entry.shortLabel.toLowerCase() === suggestion.targetLabel.toLowerCase() ||
        entry.area.toLowerCase() === suggestion.targetLabel.toLowerCase(),
    );

    const result = await createHabitLink({
      userId,
      sourceHabitId,
      targetHabitId: matchedHabit ? matchedHabit.id : null,
      lifeArea: matchedHabit ? null : (matchedArea?.area ?? 'Mind'),
      direction: suggestion.direction,
      evidence: 'user_confirmed',
      note: suggestion.rationale,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuggestions((prev) => prev.filter((item) => item !== suggestion));
    await refresh();
  };

  const handleAskAi = async () => {
    setView('suggest');
    setSuggestLoading(true);
    setSuggestNote(null);
    const result = await generateChainSuggestions({
      habitName: sourceHabitName,
      otherHabitNames: otherHabits.map((habit) => habit.name),
      lifeAreaLabels: LIFE_WHEEL_AREA_TAXONOMY.map((entry) => entry.shortLabel),
    });
    setSuggestLoading(false);
    setSuggestSource(result.source);
    setSuggestNote(result.safetyNote);
    setSuggestions(result.suggestions);
  };

  const handleDismissLink = async (link: HabitChainLink) => {
    await updateHabitLinkStatus(link.id, 'dismissed');
    await refresh();
  };

  const handleDeleteLink = async (link: HabitChainLink) => {
    await deleteHabitLink(link.id);
    await refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="habit-analysis-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="habit-analysis-modal habit-chain-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chain and keystone analysis"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="habit-analysis-modal__header">
          <div>
            <p className="habit-analysis-modal__eyebrow">Chain &amp; keystone</p>
            <h3>Ripple effects: {sourceHabitName}</h3>
          </div>
          <button type="button" onClick={onClose} className="habit-analysis-modal__close">Close</button>
        </header>

        {error ? <p className="habit-chain-modal__error" role="alert">{error}</p> : null}

        {view === 'overview' ? (
          <div className="habit-analysis-modal__section habit-chain-modal__overview">
            <div className={`habit-chain-modal__verdict habit-chain-modal__verdict--${summary.classification}`}>
              <span className="habit-chain-modal__verdict-label">{summaryCopy.label}</span>
              <span className="habit-chain-modal__verdict-blurb">{summaryCopy.blurb}</span>
            </div>

            {loading ? (
              <p className="habit-chain-modal__muted">Loading ripples…</p>
            ) : links.length === 0 ? (
              <p className="habit-chain-modal__muted">
                No ripples noted yet. When you spot one habit making another easier or harder, add it here.
              </p>
            ) : (
              <ul className="habit-chain-modal__links" role="list">
                {links.map((link) => {
                  const target = describeTarget(link);
                  return (
                    <li key={link.id} className={`habit-chain-modal__link habit-chain-modal__link--${link.direction}`}>
                      <span className="habit-chain-modal__link-arrow" aria-hidden="true">
                        {link.direction === 'positive' ? '↗' : '↘'}
                      </span>
                      <span className="habit-chain-modal__link-target">
                        <span aria-hidden="true">{target.emoji}</span> {target.label}
                      </span>
                      <span className="habit-chain-modal__link-meta">{DIRECTION_LABEL[link.direction]}</span>
                      {link.evidence === 'ai_hypothesis' ? (
                        <span className="habit-chain-modal__badge">possible</span>
                      ) : null}
                      <span className="habit-chain-modal__link-actions">
                        <button type="button" onClick={() => void handleDismissLink(link)} aria-label="Set aside">Set aside</button>
                        <button type="button" onClick={() => void handleDeleteLink(link)} aria-label="Delete">Delete</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="habit-chain-modal__cta-row">
              <button
                type="button"
                className="habit-chain-modal__primary"
                onClick={() => {
                  resetAddFlow();
                  setError(null);
                  setView('add');
                }}
              >
                Add a ripple effect
              </button>
              <button type="button" className="habit-chain-modal__secondary" onClick={() => void handleAskAi()}>
                Ask AI for possible links
              </button>
            </div>
          </div>
        ) : null}

        {view === 'add' ? (
          <div className="habit-analysis-modal__section habit-chain-modal__add">
            <p className="habit-chain-modal__question">After you do <strong>{sourceHabitName}</strong>, what tends to change?</p>

            <div className="habit-chain-modal__choice-group" role="group" aria-label="Ripple target type">
              {otherHabits.length > 0 ? (
                <button
                  type="button"
                  className={targetKind === 'habit' ? 'is-active' : ''}
                  onClick={() => setTargetKind('habit')}
                >
                  Another habit
                </button>
              ) : null}
              <button
                type="button"
                className={targetKind === 'life_area' ? 'is-active' : ''}
                onClick={() => setTargetKind('life_area')}
              >
                A life area
              </button>
            </div>

            {targetKind === 'habit' ? (
              <label className="habit-chain-modal__field">
                Which habit?
                <select value={targetHabitId} onChange={(event) => setTargetHabitId(event.target.value)}>
                  <option value="">Choose a habit…</option>
                  {otherHabits.map((habit) => (
                    <option key={habit.id} value={habit.id}>{habit.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="habit-chain-modal__field">
                Which life area?
                <select value={targetArea} onChange={(event) => setTargetArea(event.target.value as LifeWheelArea)}>
                  <option value="">Choose an area…</option>
                  {LIFE_WHEEL_AREA_TAXONOMY.map((entry) => (
                    <option key={entry.area} value={entry.area}>{entry.emoji} {entry.shortLabel}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="habit-chain-modal__choice-group" role="group" aria-label="Direction">
              <button
                type="button"
                className={direction === 'positive' ? 'is-active' : ''}
                onClick={() => setDirection('positive')}
              >
                ↗ Tends to feel easier
              </button>
              <button
                type="button"
                className={direction === 'negative' ? 'is-active' : ''}
                onClick={() => setDirection('negative')}
              >
                ↘ Can feel harder
              </button>
            </div>

            <div className="habit-chain-modal__cta-row">
              <button type="button" className="habit-chain-modal__secondary" onClick={() => setView('overview')} disabled={saving}>
                Back
              </button>
              <button type="button" className="habit-chain-modal__primary" onClick={() => void handleSaveLink()} disabled={saving}>
                {saving ? 'Saving…' : 'Save ripple'}
              </button>
            </div>
          </div>
        ) : null}

        {view === 'suggest' ? (
          <div className="habit-analysis-modal__section habit-chain-modal__suggest">
            <p className="habit-chain-modal__question">Possible links — keep the ones that feel true.</p>
            {suggestLoading ? (
              <p className="habit-chain-modal__muted">Thinking…</p>
            ) : suggestions.length === 0 ? (
              <p className="habit-chain-modal__muted">
                {suggestSource === 'fallback'
                  ? 'No AI suggestions right now. You can add ripples yourself any time.'
                  : 'Nothing to suggest yet — try adding a few ripples manually first.'}
              </p>
            ) : (
              <ul className="habit-chain-modal__suggestions" role="list">
                {suggestions.map((suggestion, index) => (
                  <li key={`${suggestion.targetLabel}-${index}`} className="habit-chain-modal__suggestion">
                    <span className="habit-chain-modal__suggestion-head">
                      <span aria-hidden="true">{suggestion.direction === 'positive' ? '↗' : '↘'}</span>
                      <strong>{suggestion.targetLabel}</strong>
                      <span className="habit-chain-modal__badge">possible · {suggestion.confidence}</span>
                    </span>
                    <span className="habit-chain-modal__suggestion-why">{suggestion.rationale}</span>
                    <span className="habit-chain-modal__link-actions">
                      <button type="button" onClick={() => void handleAcceptSuggestion(suggestion)} disabled={saving}>
                        This fits
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestions((prev) => prev.filter((item) => item !== suggestion))}
                      >
                        Not really
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {suggestNote ? <p className="habit-chain-modal__safety">{suggestNote}</p> : null}
            <p className="habit-chain-modal__disclaimer">
              These are possible associations, not proof that one habit causes another.
            </p>
            <div className="habit-chain-modal__cta-row">
              <button type="button" className="habit-chain-modal__secondary" onClick={() => setView('overview')}>
                Done
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
