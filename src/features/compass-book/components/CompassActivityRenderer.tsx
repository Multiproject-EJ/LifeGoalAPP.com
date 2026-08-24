import type { ReactNode } from 'react';
import type { CompassAnswerValue, CompassBlockDefinition } from '../types';
import { CompassLifeWheelPicker } from './CompassLifeWheelPicker';
import { CompassScenarioChoiceGrid } from './CompassScenarioChoiceGrid';

const LIFE_WHEEL_AREA_IDS = new Set([
  'health_fitness',
  'spirituality_community',
  'career_development',
  'finance_wealth',
  'love_relations',
  'family_friends',
  'living_spaces',
  'fun_creativity',
]);

function isLifeWheelAreaChoice(block: CompassBlockDefinition): boolean {
  if (block.type !== 'single_choice') return false;
  const optionIds = new Set((block.options ?? []).map((option) => option.id));
  return Array.from(LIFE_WHEEL_AREA_IDS).every((id) => optionIds.has(id));
}

export type CompassActivityRendererProps = {
  blocks: readonly CompassBlockDefinition[];
  values: Record<string, CompassAnswerValue | undefined>;
  /** Chapter-wide values used by blocks whose option pool comes from an earlier answer. */
  optionSourceValues?: Record<string, CompassAnswerValue | undefined>;
  onChange: (questionId: string, value: CompassAnswerValue | undefined) => void;
  /** Optional per-block slot (e.g. the AI "Help me think" affordance). */
  renderHelp?: (block: CompassBlockDefinition) => ReactNode;
  /** Optional per-block slot rendered above the input (e.g. the goals/habits picker). */
  renderPick?: (block: CompassBlockDefinition) => ReactNode;
  /** Optional per-block context rendered above the picker (e.g. the shadow-card hint). */
  renderContext?: (block: CompassBlockDefinition) => ReactNode;
};

/** Renders the input blocks for a single activity (fixed-guided mode). */
export function CompassActivityRenderer({ blocks, values, optionSourceValues, onChange, renderHelp, renderPick, renderContext }: CompassActivityRendererProps) {
  const allValues = optionSourceValues ?? values;

  function resolvedBlock(block: CompassBlockDefinition): CompassBlockDefinition {
    if (block.optionsFromAnsweredQuestionIds) {
      const answered = new Set(
        block.optionsFromAnsweredQuestionIds.filter((questionId) => {
          const value = allValues[questionId];
          return value?.kind === 'text' && value.text.trim().length > 0;
        }),
      );
      return {
        ...block,
        options: (block.options ?? [])
          .filter((option) => option.id === 'none' || answered.has(option.id))
          .map((option) => {
            const source = allValues[option.id];
            return source?.kind === 'text' && source.text.trim()
              ? { ...option, label: source.text.trim() }
              : option;
          }),
      };
    }
    if (!block.optionsFromQuestionId) return block;
    const source = allValues[block.optionsFromQuestionId];
    const allowedIds = source?.kind === 'multi_choice'
      ? source.optionIds
      : source?.kind === 'ranking'
        ? source.orderedOptionIds
        : source?.kind === 'choice' || source?.kind === 'emotion'
          ? [source.optionId]
          : null;
    if (allowedIds === null) return block;
    const allowed = new Set(allowedIds);
    return { ...block, options: (block.options ?? []).filter((option) => allowed.has(option.id)) };
  }

  function handleChange(questionId: string, value: CompassAnswerValue | undefined) {
    onChange(questionId, value);
    for (const block of blocks) {
      if (block.optionsFromQuestionId === questionId) onChange(block.questionId, undefined);
    }
  }

  return (
    <div className="compass-book__blocks">
      {blocks.map((sourceBlock) => {
        const block = resolvedBlock(sourceBlock);
        return (
          <div key={block.questionId} className="compass-book__block">
            <p className="compass-book__block-prompt">
              {block.prompt}
              {block.required ? <span className="compass-book__req" aria-hidden="true"> *</span> : null}
            </p>
            {block.helpText ? <p className="compass-book__block-help">{block.helpText}</p> : null}
            {renderContext ? renderContext(block) : null}
            {renderPick ? renderPick(block) : null}
            <BlockInput block={block} value={values[block.questionId]} onChange={handleChange} />
            {renderHelp ? renderHelp(block) : null}
          </div>
        );
      })}
    </div>
  );
}

function BlockInput({
  block,
  value,
  onChange,
}: {
  block: CompassBlockDefinition;
  value: CompassAnswerValue | undefined;
  onChange: (questionId: string, value: CompassAnswerValue | undefined) => void;
}) {
  switch (block.type) {
    case 'single_choice':
    case 'emotion_choice': {
      const selected =
        value && (value.kind === 'choice' || value.kind === 'emotion') ? value.optionId : null;
      const kind = block.type === 'emotion_choice' ? 'emotion' : 'choice';
      if (isLifeWheelAreaChoice(block)) {
        return (
          <CompassLifeWheelPicker
            options={block.options ?? []}
            selectedId={selected}
            onSelect={(optionId) => onChange(block.questionId, { kind: 'choice', optionId })}
          />
        );
      }
      if ((block.options ?? []).some((option) => option.visual || option.scenarioTitle)) {
        return (
          <CompassScenarioChoiceGrid
            options={block.options ?? []}
            selectedId={selected}
            completionMessage={block.completionMessage}
            onSelect={(optionId) =>
              onChange(
                block.questionId,
                kind === 'emotion'
                  ? { kind: 'emotion', optionId }
                  : { kind: 'choice', optionId },
              )
            }
          />
        );
      }
      return (
        <div className="compass-book__options">
          {(block.options ?? []).map((option) => (
            <button
              key={option.id}
              type="button"
              className={`compass-book__option ${selected === option.id ? 'compass-book__option--on' : ''}`}
              aria-pressed={selected === option.id}
              onClick={() =>
                onChange(
                  block.questionId,
                  kind === 'emotion'
                    ? { kind: 'emotion', optionId: option.id }
                    : { kind: 'choice', optionId: option.id },
                )
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    }

    case 'multi_choice': {
      const selected = value && value.kind === 'multi_choice' ? value.optionIds : [];
      const optionIds = (block.options ?? []).map((option) => option.id);
      const validSelection = selected.length >= (block.minSelections ?? 1) &&
        (block.maxSelections === undefined || selected.length <= block.maxSelections);
      return (
        <div className="compass-book__choice-group">
          {block.allowSelectAll && optionIds.length > 0 ? (
            <div className="compass-book__choice-tools">
              <button
                type="button"
                className="compass-book__choice-tool"
                onClick={() => onChange(block.questionId, { kind: 'multi_choice', optionIds })}
              >
                Select all
              </button>
              {selected.length > 0 ? (
                <button
                  type="button"
                  className="compass-book__choice-tool"
                  onClick={() => onChange(block.questionId, undefined)}
                >
                  Clear all
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="compass-book__options">
            {(block.options ?? []).map((option) => {
              const on = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`compass-book__option ${on ? 'compass-book__option--on' : ''}`}
                  aria-pressed={on}
                  disabled={!on && block.maxSelections !== undefined && selected.length >= block.maxSelections}
                  onClick={() => {
                    if (!on && block.maxSelections !== undefined && selected.length >= block.maxSelections) {
                      return;
                    }
                    const next = on
                      ? selected.filter((id) => id !== option.id)
                      : [...selected, option.id];
                    onChange(
                      block.questionId,
                      next.length > 0 ? { kind: 'multi_choice', optionIds: next } : undefined,
                    );
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {block.minSelections !== undefined || block.maxSelections !== undefined ? (
            <p className="compass-book__selection-count" role="status">
              {block.minSelections !== undefined && block.maxSelections !== undefined
                ? `Choose ${block.minSelections}–${block.maxSelections}`
                : block.maxSelections !== undefined
                  ? `Choose up to ${block.maxSelections}`
                  : `Choose at least ${block.minSelections}`}
              {' · '}{selected.length} selected
            </p>
          ) : null}
          {validSelection && block.completionMessage ? (
            <p className="compass-book__lock-celebration" role="status">
              ✨ {block.completionMessage}
            </p>
          ) : null}
        </div>
      );
    }

    case 'ranking': {
      const options = block.options ?? [];
      const optionById = new Map(options.map((option) => [option.id, option]));
      const savedOrder = value?.kind === 'ranking' ? value.orderedOptionIds : [];
      const availableIds = new Set(options.map((option) => option.id));
      const orderedIds = [
        ...savedOrder.filter((id) => availableIds.has(id)),
        ...options.map((option) => option.id).filter((id) => !savedOrder.includes(id)),
      ];

      function commitOrder(next: string[]) {
        onChange(block.questionId, { kind: 'ranking', orderedOptionIds: next });
      }

      function move(index: number, delta: number) {
        const target = index + delta;
        if (target < 0 || target >= orderedIds.length) return;
        const next = [...orderedIds];
        [next[index], next[target]] = [next[target], next[index]];
        commitOrder(next);
      }

      function moveTo(index: number, target: number) {
        if (index === target || target < 0 || target >= orderedIds.length) return;
        const next = [...orderedIds];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        commitOrder(next);
      }

      if (options.length === 0) {
        return <p className="compass-book__review-note">Choose interests above to build this ranking.</p>;
      }

      return (
        <div className="compass-book__ranking">
          <ol className="compass-book__ranking-list">
            {orderedIds.map((id, index) => (
              <li key={id} className="compass-book__ranking-row">
                <span className="compass-book__ranking-number">{index + 1}</span>
                <span className="compass-book__ranking-label">{optionById.get(id)?.label ?? id}</span>
                <span className="compass-book__ranking-actions">
                  <button type="button" onClick={() => moveTo(index, 0)} disabled={index === 0} aria-label={`Move ${optionById.get(id)?.label ?? id} to top`}>↟</button>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${optionById.get(id)?.label ?? id} up`}>↑</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === orderedIds.length - 1} aria-label={`Move ${optionById.get(id)?.label ?? id} down`}>↓</button>
                  <button type="button" onClick={() => moveTo(index, orderedIds.length - 1)} disabled={index === orderedIds.length - 1} aria-label={`Move ${optionById.get(id)?.label ?? id} to bottom`}>↡</button>
                </span>
              </li>
            ))}
          </ol>
          {value?.kind !== 'ranking' ? (
            <button type="button" className="compass-book__secondary" onClick={() => commitOrder(orderedIds)}>
              Lock this order
            </button>
          ) : (
            <p className="compass-book__selection-count" role="status">✓ Ranking recorded</p>
          )}
        </div>
      );
    }

    case 'scale': {
      const min = block.min ?? 0;
      const max = block.max ?? 10;
      const current = value && value.kind === 'scale' ? value.value : null;
      return (
        <div className="compass-book__scale">
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={current ?? Math.round((min + max) / 2)}
            onChange={(event) =>
              onChange(block.questionId, { kind: 'scale', value: Number(event.target.value) })
            }
            aria-label={block.prompt}
          />
          <div className="compass-book__scale-foot">
            <span>{block.minLabel ?? min}</span>
            <span className="compass-book__scale-value">{current ?? '—'}</span>
            <span>{block.maxLabel ?? max}</span>
          </div>
        </div>
      );
    }

    case 'short_text':
    case 'reflection':
    case 'sentence_completion': {
      const text = value && value.kind === 'text' ? value.text : '';
      return (
        <textarea
          className="compass-book__textarea"
          value={text}
          maxLength={block.maxLength}
          placeholder={block.placeholder}
          rows={block.type === 'short_text' ? 2 : 3}
          onChange={(event) =>
            onChange(
              block.questionId,
              event.target.value ? { kind: 'text', text: event.target.value } : undefined,
            )
          }
        />
      );
    }

    case 'confirmation': {
      const confirmed = value && value.kind === 'confirmation' ? value.confirmed : false;
      return (
        <button
          type="button"
          className={`compass-book__confirm ${confirmed ? 'compass-book__confirm--on' : ''}`}
          aria-pressed={confirmed}
          onClick={() => onChange(block.questionId, { kind: 'confirmation', confirmed: !confirmed })}
        >
          {confirmed ? '✓ Confirmed' : 'Confirm'}
        </button>
      );
    }

    case 'review':
      return (
        <p className="compass-book__review-note">
          Review your chapter graphic above — these are proposals you can revise. Confirm below to
          seal the chapter.
        </p>
      );

    default:
      return (
        <p className="compass-book__review-note">This question type is not yet available.</p>
      );
  }
}
