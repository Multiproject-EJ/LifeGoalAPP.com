import type { ContractStage } from '../../types/gamification';
import './MultiStageEditor.css';

const STAGE_SEALS = ['🏁', '🌟', '⭐', '🏔️', '🎯', '🔥', '💎', '🏆'] as const;
const MAX_STAGES = 5;

interface MultiStageEditorProps {
  stages: ContractStage[];
  onChange: (stages: ContractStage[]) => void;
}

function buildStageId(): string {
  return `stage_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function MultiStageEditor({ stages, onChange }: MultiStageEditorProps) {
  const addStage = () => {
    if (stages.length >= MAX_STAGES) return;
    onChange([
      ...stages,
      {
        id: buildStageId(),
        title: '',
        description: '',
        targetCount: 1,
        sealEmoji: '🏁',
        completed: false,
        completedAt: null,
      },
    ]);
  };

  const removeStage = (id: string) => {
    onChange(stages.filter((s) => s.id !== id));
  };

  const updateStage = (id: string, patch: Partial<ContractStage>) => {
    onChange(stages.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <div className="multi-stage-editor">
      {stages.length === 0 && (
        <p className="multi-stage-editor__empty">
          No stages yet. Add at least one milestone to define this contract.
        </p>
      )}

      {stages.map((stage, index) => (
        <div key={stage.id} className="multi-stage-editor__stage">
          <div className="multi-stage-editor__stage-header">
            <span className="multi-stage-editor__drag-handle" aria-hidden="true">⠿</span>
            <span className="multi-stage-editor__stage-number">Stage {index + 1}</span>
            <button
              type="button"
              className="multi-stage-editor__remove"
              onClick={() => removeStage(stage.id)}
              aria-label={`Remove stage ${index + 1}`}
            >
              ✕
            </button>
          </div>

          <div className="multi-stage-editor__seal-picker">
            {STAGE_SEALS.map((seal) => (
              <button
                key={seal}
                type="button"
                className={`multi-stage-editor__seal${stage.sealEmoji === seal ? ' multi-stage-editor__seal--selected' : ''}`}
                onClick={() => updateStage(stage.id, { sealEmoji: seal })}
                aria-label={`Seal ${seal}`}
              >
                {seal}
              </button>
            ))}
          </div>

          <input
            className="multi-stage-editor__input"
            type="text"
            placeholder="Stage title"
            value={stage.title}
            onChange={(e) => updateStage(stage.id, { title: e.target.value })}
            aria-label={`Stage ${index + 1} title`}
          />
          <input
            className="multi-stage-editor__input"
            type="text"
            placeholder="Description (optional)"
            value={stage.description}
            onChange={(e) => updateStage(stage.id, { description: e.target.value })}
            aria-label={`Stage ${index + 1} description`}
          />
          <div className="multi-stage-editor__count-row">
            <label
              className="multi-stage-editor__count-label"
              htmlFor={`stage-target-${stage.id}`}
            >
              Target count
            </label>
            <input
              id={`stage-target-${stage.id}`}
              className="multi-stage-editor__count-input"
              type="number"
              min={1}
              value={stage.targetCount}
              onChange={(e) => updateStage(stage.id, { targetCount: Math.max(1, Number(e.target.value)) })}
            />
          </div>
        </div>
      ))}

      {stages.length < MAX_STAGES && (
        <button
          type="button"
          className="multi-stage-editor__add"
          onClick={addStage}
        >
          + Add Stage
        </button>
      )}
    </div>
  );
}
