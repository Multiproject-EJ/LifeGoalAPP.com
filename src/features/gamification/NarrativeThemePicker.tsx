import './NarrativeThemePicker.css';

const THEMES = [
  {
    id: 'warrior' as const,
    icon: '⚔️',
    name: 'Warrior',
    flavor: 'Bold, disciplined, relentless.',
    oath: '"I forge strength through daily battle."',
  },
  {
    id: 'monk' as const,
    icon: '🧘',
    name: 'Monk',
    flavor: 'Still, focused, deeply present.',
    oath: '"I find power in stillness and breath."',
  },
  {
    id: 'scholar' as const,
    icon: '📚',
    name: 'Scholar',
    flavor: 'Curious, methodical, ever-learning.',
    oath: '"I grow wiser with every chapter."',
  },
  {
    id: 'explorer' as const,
    icon: '🧭',
    name: 'Explorer',
    flavor: 'Adventurous, open, trail-blazing.',
    oath: '"I chart new territory, one step at a time."',
  },
] as const;

type NarrativeTheme = (typeof THEMES)[number]['id'];

interface NarrativeThemePickerProps {
  value: NarrativeTheme;
  onChange: (theme: NarrativeTheme) => void;
}

export function NarrativeThemePicker({ value, onChange }: NarrativeThemePickerProps) {
  return (
    <div className="narrative-picker">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className={`narrative-picker__card${value === theme.id ? ' narrative-picker__card--selected' : ''}`}
          onClick={() => onChange(theme.id)}
        >
          <span className="narrative-picker__icon" aria-hidden="true">{theme.icon}</span>
          <span className="narrative-picker__name">{theme.name}</span>
          <span className="narrative-picker__flavor">{theme.flavor}</span>
          <span className="narrative-picker__oath">{theme.oath}</span>
        </button>
      ))}
    </div>
  );
}
