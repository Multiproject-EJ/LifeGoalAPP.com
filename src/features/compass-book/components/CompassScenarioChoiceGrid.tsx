import type { CSSProperties } from 'react';
import type { CompassBlockOption } from '../types';

export type CompassScenarioChoiceGridProps = {
  options: readonly CompassBlockOption[];
  selectedId: string | null;
  completionMessage?: string;
  onSelect: (optionId: string) => void;
};

function spriteStyle(option: CompassBlockOption): CSSProperties | undefined {
  if (option.visual?.kind !== 'sprite') return undefined;
  const { src, column, row, columns, rows } = option.visual;
  const x = columns <= 1 ? 0 : (column / (columns - 1)) * 100;
  const y = rows <= 1 ? 0 : (row / (rows - 1)) * 100;
  return {
    backgroundImage: `url(${src})`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
  };
}

/**
 * A recognition-first choice surface. Images supply concrete situations; the
 * visible title and description preserve meaning when imagery is unavailable.
 */
export function CompassScenarioChoiceGrid({
  options,
  selectedId,
  completionMessage,
  onSelect,
}: CompassScenarioChoiceGridProps) {
  const selected = options.find((option) => option.id === selectedId) ?? null;

  return (
    <div className="compass-scenarios">
      <div className="compass-scenarios__grid">
        {options.map((option) => {
          const on = selectedId === option.id;
          const isSymbol = option.visual?.kind === 'symbol';
          const accessibleDescription = option.description ?? option.visual?.alt ?? '';
          return (
            <button
              key={option.id}
              type="button"
              className={`compass-scenarios__card${on ? ' compass-scenarios__card--on' : ''}${isSymbol ? ' compass-scenarios__card--escape' : ''}`}
              aria-pressed={on}
              aria-label={`${option.scenarioTitle ?? option.label}. ${accessibleDescription}${option.scenarioTitle ? ` Theme: ${option.label}.` : ''}`}
              onClick={() => onSelect(option.id)}
            >
              <span
                className={`compass-scenarios__visual${isSymbol ? ' compass-scenarios__visual--symbol' : ''}`}
                style={spriteStyle(option)}
                aria-hidden="true"
              >
                {option.visual?.kind === 'symbol' ? option.visual.symbol : null}
                {on ? <i>✓</i> : null}
              </span>
              <span className="compass-scenarios__copy">
                <strong>{option.scenarioTitle ?? option.label}</strong>
                {option.description ? <span>{option.description}</span> : null}
                {option.scenarioTitle ? <small>{option.label}</small> : null}
              </span>
            </button>
          );
        })}
      </div>
      {selected && (selected.selectionMessage || completionMessage) ? (
        <p className="compass-book__lock-celebration" role="status">
          {selected.visual?.kind === 'symbol' ? '🔭' : '✨'}{' '}
          {selected.selectionMessage ?? completionMessage}
        </p>
      ) : null}
    </div>
  );
}
