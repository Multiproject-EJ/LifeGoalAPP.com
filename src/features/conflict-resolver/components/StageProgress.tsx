import type { ConflictType } from '../types/conflictSession';

type ConflictResolverUiStage =
  | 'mode_selection'
  | 'grounding'
  | 'private_capture'
  | 'inner_next_step'
  | 'collect_pile'
  | 'parallel_read'
  | 'resolution_builder'
  | 'apology_alignment'
  | 'agreement_preview'
  | 'agreement_finalized';

type StageProgressProps = {
  stage: ConflictResolverUiStage;
  selectedType: ConflictType | null;
};

type StageDefinition = { id: ConflictResolverUiStage; label: string; shortLabel: string };

const SHARED_STAGE_ORDER: StageDefinition[] = [
  { id: 'mode_selection', label: 'Mode', shortLabel: 'Mode' },
  { id: 'grounding', label: 'Grounding', shortLabel: 'Ground' },
  { id: 'private_capture', label: 'Private capture', shortLabel: 'Private' },
  { id: 'collect_pile', label: 'Collect pile', shortLabel: 'Collect' },
  { id: 'parallel_read', label: 'Parallel read', shortLabel: 'Read' },
  { id: 'resolution_builder', label: 'Resolution builder', shortLabel: 'Resolve' },
  { id: 'apology_alignment', label: 'Apology alignment', shortLabel: 'Apology' },
  { id: 'agreement_preview', label: 'Agreement preview', shortLabel: 'Preview' },
  { id: 'agreement_finalized', label: 'Agreement finalized', shortLabel: 'Done' },
];

const INNER_STAGE_ORDER: StageDefinition[] = [
  { id: 'mode_selection', label: 'Mode', shortLabel: 'Mode' },
  { id: 'grounding', label: 'Grounding', shortLabel: 'Ground' },
  { id: 'private_capture', label: 'Private capture', shortLabel: 'Private' },
  { id: 'inner_next_step', label: 'Inner guidance', shortLabel: 'Guidance' },
  { id: 'agreement_preview', label: 'Agreement preview', shortLabel: 'Preview' },
  { id: 'agreement_finalized', label: 'Agreement finalized', shortLabel: 'Done' },
];

function getStageOrder(selectedType: ConflictType | null): StageDefinition[] {
  if (selectedType === 'inner_tension') return INNER_STAGE_ORDER;
  return SHARED_STAGE_ORDER;
}

export function StageProgress({ stage, selectedType }: StageProgressProps) {
  if (stage === 'mode_selection') {
    return null;
  }

  const stageOrder = getStageOrder(selectedType);
  const currentIndex = stageOrder.findIndex((item) => item.id === stage);

  return (
    <nav className="conflict-resolver__stage-progress" aria-label="Conflict resolver progress">
      <ol className="conflict-resolver__stage-progress-list">
        {stageOrder.map((item, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={item.id}
              className={`conflict-resolver__stage-progress-item ${isCurrent ? 'conflict-resolver__stage-progress-item--current' : ''}`.trim()}
            >
              <span
                className={`conflict-resolver__stage-dot ${
                  isCurrent ? 'conflict-resolver__stage-dot--current' : ''
                } ${isDone ? 'conflict-resolver__stage-dot--done' : ''}`.trim()}
                aria-current={isCurrent ? 'step' : undefined}
                title={item.label}
              >
                {isDone ? '✓' : index + 1}
              </span>
              <span className="conflict-resolver__stage-label">{item.shortLabel}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
