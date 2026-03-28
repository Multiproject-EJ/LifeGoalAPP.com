export type PrivatePrompt = {
  id: string;
  label: string;
  placeholder: string;
};

type PrivateCaptureScreenProps = {
  prompts: readonly PrivatePrompt[];
  promptIndex: number;
  value: string;
  onChangeValue: (next: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
};

export function PrivateCaptureScreen({
  prompts,
  promptIndex,
  value,
  onChangeValue,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: PrivateCaptureScreenProps) {
  const prompt = prompts[promptIndex];
  const isLast = promptIndex >= prompts.length - 1;

  return (
    <section className="conflict-resolver__screen" aria-labelledby="private-capture-title">
      <header className="conflict-resolver__header">
        <h3 id="private-capture-title" className="conflict-resolver__title">Private reflection</h3>
        <p className="conflict-resolver__subtitle">
          Question {promptIndex + 1} of {prompts.length}
        </p>
      </header>

      <article className="conflict-resolver__prompt-card">
        <label htmlFor={`prompt-${prompt.id}`} className="conflict-resolver__prompt-label">
          {prompt.label}
        </label>
        <textarea
          id={`prompt-${prompt.id}`}
          className="conflict-resolver__prompt-input"
          placeholder={prompt.placeholder}
          value={value}
          onChange={(event) => onChangeValue(event.target.value)}
          rows={6}
        />
      </article>

      <div className="conflict-resolver__footer-actions">
        <button type="button" className="btn" onClick={onBack} disabled={promptIndex === 0}>
          Back
        </button>
        <button type="button" className="btn" onClick={onSkip}>
          Skip for now
        </button>
        {isLast ? (
          <button type="button" className="btn btn--primary" onClick={onFinish}>
            Continue to shared step
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={onNext}>
            Next question
          </button>
        )}
      </div>
    </section>
  );
}
