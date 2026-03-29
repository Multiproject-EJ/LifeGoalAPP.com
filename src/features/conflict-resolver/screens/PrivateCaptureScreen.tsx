import { useEffect, useRef, useState } from 'react';

export type PrivatePrompt = {
  id: string;
  label: string;
  placeholder: string;
};

const DISALLOWED_PATTERNS = [
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\bshut up\b/i,
  /\bhate you\b/i,
  /\bworthless\b/i,
  /\bkill yourself\b/i,
  /\bwhat'?s wrong with you\b/i,
] as const;

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
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const mobileComposerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => {
      setIsCompactViewport(window.matchMedia('(max-width: 768px)').matches);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobileComposerOpen) return;
    mobileComposerRef.current?.focus();
  }, [isMobileComposerOpen]);

  const prompt = prompts[promptIndex];
  const isLast = promptIndex >= prompts.length - 1;
  const suggestedRewrite = value
    .replace(/\balways\b/gi, 'often')
    .replace(/\bnever\b/gi, 'rarely')
    .replace(/\byou made me\b/gi, 'I felt')
    .replace(/\byou are\b/gi, 'I experienced this as');
  const hasRewriteSuggestion = suggestedRewrite.trim() !== value.trim() && value.trim().length > 0;
  const hasEscalatoryLanguage = DISALLOWED_PATTERNS.some((pattern) => pattern.test(value));
  const canAdvance = true;

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
          onFocus={() => {
            if (isCompactViewport) {
              setIsMobileComposerOpen(true);
            }
          }}
          rows={6}
        />
        <div className="conflict-resolver__rewrite-actions">
          <button
            type="button"
            className="btn"
            disabled={!hasRewriteSuggestion}
            onClick={() => onChangeValue(suggestedRewrite)}
          >
            Use calmer rewrite
          </button>
        </div>
        {hasRewriteSuggestion ? (
          <div className="conflict-resolver__rewrite-preview">
            <p><strong>Original:</strong> {value}</p>
            <p><strong>Suggested:</strong> {suggestedRewrite}</p>
          </div>
        ) : null}
        {hasEscalatoryLanguage ? (
          <p className="conflict-resolver__safety-warning" role="alert">
            Your full wording is preserved in private capture. If this becomes a shared session, AI summary language will be softened before sharing.
          </p>
        ) : null}
      </article>

      <div className="conflict-resolver__footer-actions">
        <button type="button" className="btn" onClick={onBack} disabled={promptIndex === 0}>
          Back
        </button>
        <button type="button" className="btn" onClick={onSkip}>
          Skip for now
        </button>
        {isLast ? (
          <button type="button" className="btn btn--primary" onClick={onFinish} disabled={!canAdvance}>
            Continue to shared step
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={onNext} disabled={!canAdvance}>
            Next question
          </button>
        )}
      </div>

      {isMobileComposerOpen ? (
        <div className="conflict-resolver__mobile-composer" role="dialog" aria-modal="true" aria-label="Write your reflection">
          <header className="conflict-resolver__mobile-composer-header">
            <strong>{prompt.label}</strong>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setIsMobileComposerOpen(false)}
            >
              Done writing
            </button>
          </header>
          <textarea
            ref={mobileComposerRef}
            className="conflict-resolver__mobile-composer-input"
            value={value}
            onChange={(event) => onChangeValue(event.target.value)}
            placeholder={prompt.placeholder}
            rows={10}
          />
        </div>
      ) : null}
    </section>
  );
}
