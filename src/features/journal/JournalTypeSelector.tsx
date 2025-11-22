import { useId } from 'react';
import type { JournalType } from './Journal';

type JournalTypeSelectorProps = {
  journalType: JournalType;
  onChange: (type: JournalType) => void;
};

type JournalModeOption = {
  value: JournalType;
  label: string;
};

const JOURNAL_MODE_OPTIONS: JournalModeOption[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'quick', label: 'Quick' },
  { value: 'deep', label: 'Deep' },
  { value: 'brain_dump', label: 'Brain Dump' },
  { value: 'life_wheel', label: 'Life Wheel' },
  { value: 'secret', label: 'Secret' },
  { value: 'goal', label: 'Goal' },
  { value: 'time_capsule', label: 'Time Capsule' },
];

export function JournalTypeSelector({ journalType, onChange }: JournalTypeSelectorProps) {
  const groupId = useId();
  
  return (
    <div className="journal-mode-selector" role="radiogroup" aria-label="Journal mode">
      {JOURNAL_MODE_OPTIONS.map((option) => {
        const inputId = `${groupId}-${option.value}`;
        return (
          <label key={option.value} htmlFor={inputId} className="journal-mode-selector__option">
            <input
              type="radio"
              id={inputId}
              name="journal-mode"
              value={option.value}
              checked={journalType === option.value}
              onChange={(e) => onChange(e.target.value as JournalType)}
              className="journal-mode-selector__radio"
              aria-labelledby={inputId}
            />
            <span id={inputId} className="journal-mode-selector__label">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
