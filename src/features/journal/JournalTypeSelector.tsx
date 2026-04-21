import { useId } from 'react';
import type { JournalType } from './Journal';

type JournalTypeSelectorProps = {
  journalType: JournalType;
  onChange: (type: JournalType) => void;
};

type JournalModeOption = {
  value: JournalType;
  label: string;
  icon: string;
};

const JOURNAL_MODE_OPTIONS: JournalModeOption[] = [
  { value: 'standard', label: 'Standard', icon: '📝' },
  { value: 'quick', label: 'Quick', icon: '⚡' },
  { value: 'deep', label: 'Deep', icon: '🔮' },
  { value: 'brain_dump', label: 'Brain Dump', icon: '🧠' },
  { value: 'life_wheel', label: 'Life Wheel', icon: '🎯' },
  { value: 'secret', label: 'Secret', icon: '🔐' },
  { value: 'goal', label: 'Goal', icon: '🎪' },
  { value: 'time_capsule', label: 'Time Capsule', icon: '⏳' },
  { value: 'problem', label: 'Problem', icon: '🧩' },
  { value: 'gratitude', label: 'Guided Gratitude', icon: '🌱' },
  { value: 'dream', label: 'Dream', icon: '🌙' },
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
            <span id={inputId} className="journal-mode-selector__label">
              <span aria-hidden="true">{option.icon}</span> {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
