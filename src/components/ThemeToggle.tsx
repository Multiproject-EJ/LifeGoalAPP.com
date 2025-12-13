import { useTheme } from '../contexts/ThemeContext';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const nextThemeName = theme === 'bright-sky' ? 'Dark Glass' : 'Bright Sky';
  const labelText = theme === 'bright-sky' ? 'Dark mode' : 'Light mode';
  const icon = theme === 'bright-sky' ? '🌙' : '☀️';

  return (
    <button
      type="button"
      className={['theme-toggle', className].filter(Boolean).join(' ')}
      onClick={toggleTheme}
      aria-label={`Switch to the ${nextThemeName} theme`}
      title={`Switch to the ${nextThemeName} theme`}
      aria-pressed={theme !== 'bright-sky'}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="theme-toggle__label">{labelText}</span>
    </button>
  );
}
