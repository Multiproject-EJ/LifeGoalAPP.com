import './IdentityStatementInput.css';

interface IdentityStatementInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const MAX_LENGTH = 200;

export function IdentityStatementInput({
  value,
  onChange,
  maxLength = MAX_LENGTH,
}: IdentityStatementInputProps) {
  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= 30;

  return (
    <div className="identity-input">
      <p className="identity-input__prompt">Who do you want to become?</p>
      <label className="identity-input__label" htmlFor="identity-statement">
        Finish the sentence: <em>I am someone who…</em>
      </label>
      <textarea
        id="identity-statement"
        className="identity-input__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder="…shows up every day, no matter what."
        rows={3}
        maxLength={maxLength}
      />
      <span
        className={`identity-input__count${isNearLimit ? ' identity-input__count--warning' : ''}`}
        aria-live="polite"
      >
        {remaining} characters remaining
      </span>
    </div>
  );
}
