import { useState } from 'react';
import {
  GOAL_STRATEGY_META,
  GOAL_STRATEGY_OPTIONS,
  GOAL_STRATEGY_ORDER,
  type GoalStrategyType,
} from '../features/goals/goalStrategy';

type StrategyPickerProps = {
  value: GoalStrategyType;
  onChange: (strategy: GoalStrategyType) => void;
  /** Reserved for Phase 5.1 — render a "Suggested for you" badge if provided */
  suggestedStrategy?: GoalStrategyType | null;
  /** true = single-line selector; false (default) = full card grid */
  compact?: boolean;
  className?: string;
};

export function StrategyPicker({
  value,
  onChange,
  suggestedStrategy,
  compact = false,
  className,
}: StrategyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMeta = GOAL_STRATEGY_META[value];

  if (compact) {
    return (
      <>
        <style>{`
          .strategy-picker-compact {
            position: relative;
            display: inline-block;
            width: 100%;
          }
          .strategy-picker-compact__trigger {
            display: flex;
            align-items: center;
            gap: 6px;
            width: 100%;
            padding: 8px 12px;
            background: var(--color-surface-glass, rgba(255,255,255,0.08));
            border: 1px solid var(--color-border, rgba(255,255,255,0.15));
            border-radius: var(--border-radius-md, 8px);
            cursor: pointer;
            color: var(--color-text-primary, #fff);
            font-size: 0.875rem;
            text-align: left;
            min-height: 44px;
          }
          .strategy-picker-compact__trigger:hover {
            background: var(--color-surface-glass-hover, rgba(255,255,255,0.12));
          }
          .strategy-picker-compact__icon {
            font-size: 1rem;
            flex-shrink: 0;
          }
          .strategy-picker-compact__label {
            flex: 1;
            font-weight: 500;
          }
          .strategy-picker-compact__chevron {
            font-size: 0.65rem;
            opacity: 0.6;
            flex-shrink: 0;
          }
          .strategy-picker-compact__dropdown {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            background: var(--color-surface, #1a1a2e);
            border: 1px solid var(--color-border, rgba(255,255,255,0.15));
            border-radius: var(--border-radius-md, 8px);
            z-index: 100;
            max-height: 280px;
            overflow-y: auto;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          }
          .strategy-picker-compact__option {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            cursor: pointer;
            color: var(--color-text-primary, #fff);
            font-size: 0.85rem;
            min-height: 44px;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
          }
          .strategy-picker-compact__option:hover,
          .strategy-picker-compact__option--active {
            background: var(--color-surface-glass, rgba(255,255,255,0.08));
          }
          .strategy-picker-compact__option-icon {
            font-size: 1rem;
            flex-shrink: 0;
          }
          .strategy-picker-compact__option-label {
            font-weight: 500;
          }
          .strategy-picker-compact__option-tagline {
            font-size: 0.75rem;
            color: var(--color-text-secondary, rgba(255,255,255,0.5));
            margin-left: auto;
          }
        `}</style>
        <div className={`strategy-picker-compact${className ? ` ${className}` : ''}`}>
          <button
            type="button"
            className="strategy-picker-compact__trigger"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <span className="strategy-picker-compact__icon">{currentMeta.icon}</span>
            <span className="strategy-picker-compact__label">{currentMeta.label}</span>
            <span className="strategy-picker-compact__chevron">{isOpen ? '▲' : '▼'}</span>
          </button>
          {isOpen && (
            <div className="strategy-picker-compact__dropdown" role="listbox">
              {GOAL_STRATEGY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`strategy-picker-compact__option${value === option.value ? ' strategy-picker-compact__option--active' : ''}`}
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="strategy-picker-compact__option-icon">{option.icon}</span>
                  <span className="strategy-picker-compact__option-label">{option.label}</span>
                  <span className="strategy-picker-compact__option-tagline">{option.tagline}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .strategy-picker {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .strategy-picker__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 600px) {
          .strategy-picker__grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .strategy-picker__card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          background: var(--color-surface-glass, rgba(255,255,255,0.06));
          border: 1.5px solid transparent;
          border-radius: var(--border-radius-md, 8px);
          cursor: pointer;
          text-align: left;
          color: var(--color-text-primary, #fff);
          min-height: 44px;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .strategy-picker__card:hover {
          background: var(--color-surface-glass-hover, rgba(255,255,255,0.1));
        }
        .strategy-picker__card--selected {
          border-color: var(--color-accent-purple, var(--color-primary, #8b5cf6));
          background: var(--color-surface-glass-active, rgba(139,92,246,0.12));
        }
        .strategy-picker__card-icon {
          font-size: 1.5rem;
          line-height: 1;
        }
        .strategy-picker__card-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary, #fff);
        }
        .strategy-picker__card-tagline {
          font-size: 0.72rem;
          color: var(--color-text-secondary, rgba(255,255,255,0.5));
        }
        .strategy-picker__card-xp {
          font-size: 0.68rem;
          background: rgba(255,165,0,0.15);
          color: #ffa500;
          border-radius: 4px;
          padding: 1px 5px;
          display: inline-block;
          width: fit-content;
        }
        .strategy-picker__card-best-for {
          font-size: 0.68rem;
          color: var(--color-text-secondary, rgba(255,255,255,0.45));
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-top: 2px;
        }
        .strategy-picker__suggested-chip {
          position: absolute;
          top: 6px;
          right: 6px;
          font-size: 0.62rem;
          background: var(--color-accent-purple, #8b5cf6);
          color: #fff;
          border-radius: 4px;
          padding: 1px 5px;
        }
        .strategy-picker__skip {
          background: none;
          border: none;
          color: var(--color-text-secondary, rgba(255,255,255,0.5));
          font-size: 0.8rem;
          cursor: pointer;
          text-decoration: underline;
          text-align: center;
          padding: 4px 0;
        }
        .strategy-picker__skip:hover {
          color: var(--color-text-primary, #fff);
        }
      `}</style>
      <div className={`strategy-picker${className ? ` ${className}` : ''}`}>
        <div className="strategy-picker__grid" role="radiogroup" aria-label="Goal pursuit strategy">
          {GOAL_STRATEGY_ORDER.map((strategyType) => {
            const meta = GOAL_STRATEGY_META[strategyType];
            const isSelected = value === strategyType;
            const isSuggested = suggestedStrategy === strategyType;
            return (
              <button
                key={strategyType}
                type="button"
                className={`strategy-picker__card${isSelected ? ' strategy-picker__card--selected' : ''}`}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(strategyType)}
              >
                {isSuggested && (
                  <span className="strategy-picker__suggested-chip">✨ Suggested</span>
                )}
                <span className="strategy-picker__card-icon">{meta.icon}</span>
                <span className="strategy-picker__card-label">{meta.label}</span>
                <span className="strategy-picker__card-tagline">{meta.tagline}</span>
                {meta.xpMultiplier > 1.0 && (
                  <span className="strategy-picker__card-xp">🔥 {meta.xpMultiplier}×</span>
                )}
                <span className="strategy-picker__card-best-for">{meta.bestFor}</span>
              </button>
            );
          })}
        </div>
        {value !== 'standard' && (
          <button
            type="button"
            className="strategy-picker__skip"
            onClick={() => onChange('standard')}
          >
            Skip — use standard
          </button>
        )}
      </div>
    </>
  );
}
