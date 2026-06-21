import type { CompassAnswerValue, CompassBlockDefinition } from '../types';

export type CompassActivityRendererProps = {
  blocks: readonly CompassBlockDefinition[];
  values: Record<string, CompassAnswerValue | undefined>;
  onChange: (questionId: string, value: CompassAnswerValue | undefined) => void;
};

/** Renders the input blocks for a single activity (fixed-guided mode). */
export function CompassActivityRenderer({ blocks, values, onChange }: CompassActivityRendererProps) {
  return (
    <div className="compass-book__blocks">
      {blocks.map((block) => (
        <div key={block.questionId} className="compass-book__block">
          <p className="compass-book__block-prompt">
            {block.prompt}
            {block.required ? <span className="compass-book__req" aria-hidden="true"> *</span> : null}
          </p>
          {block.helpText ? <p className="compass-book__block-help">{block.helpText}</p> : null}
          <BlockInput block={block} value={values[block.questionId]} onChange={onChange} />
        </div>
      ))}
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
      return (
        <div className="compass-book__options">
          {(block.options ?? []).map((option) => {
            const on = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={`compass-book__option ${on ? 'compass-book__option--on' : ''}`}
                aria-pressed={on}
                onClick={() => {
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
