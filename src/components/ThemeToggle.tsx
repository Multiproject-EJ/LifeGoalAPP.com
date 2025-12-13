import { AVAILABLE_THEMES, useTheme } from '../contexts/ThemeContext';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme, effectiveCategory, lightTheme, darkTheme } = useTheme();

  const isLight = effectiveCategory === 'light';
  const nextThemeId = isLight ? darkTheme : lightTheme;
  const nextThemeName =
    AVAILABLE_THEMES.find(t => t.id === nextThemeId)?.name ?? (isLight ? 'Dark theme' : 'Light theme');
  const labelText = isLight ? 'Dark mode' : 'Light mode';
  const icon = isLight ? '🌙' : '☀️';

  return (
    <button
      type="button"
      className={['theme-toggle', className].filter(Boolean).join(' ')}
      onClick={toggleTheme}
      aria-label={`Switch to the ${nextThemeName} theme`}
      title={`Switch to the ${nextThemeName} theme`}
      aria-pressed={!isLight}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="theme-toggle__label">{labelText}</span>
    </button>
  );
}
