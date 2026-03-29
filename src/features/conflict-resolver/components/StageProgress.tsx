type ConflictResolverUiStage =
  | 'mode_selection'
  | 'grounding'
  | 'private_capture'
  | 'collect_pile'
  | 'parallel_read'
  | 'resolution_builder'
  | 'apology_alignment'
  | 'agreement_preview'
  | 'agreement_finalized';

type StageProgressProps = {
  stage: ConflictResolverUiStage;
};

const STAGE_ORDER: Array<{ id: ConflictResolverUiStage; label: string; shortLabel: string }> = [
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

export function StageProgress({ stage }: StageProgressProps) {
  const currentIndex = STAGE_ORDER.findIndex((item) => item.id === stage);

  return (
    <nav className="conflict-resolver__stage-progress" aria-label="Conflict resolver progress">
      <ol className="conflict-resolver__stage-progress-list">
        {STAGE_ORDER.map((item, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={item.id} className="conflict-resolver__stage-progress-item">
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
