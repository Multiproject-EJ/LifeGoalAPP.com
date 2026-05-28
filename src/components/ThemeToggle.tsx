import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, getThemeCategory, AVAILABLE_THEMES, useTheme } from '../contexts/ThemeContext';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const isLightTheme = getThemeCategory(theme) === 'light';
  const nextTheme = isLightTheme ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  const nextThemeName = AVAILABLE_THEMES.find((themeOption) => themeOption.id === nextTheme)?.name ?? (isLightTheme ? 'Dark mode' : 'Light mode');
  const labelText = isLightTheme ? 'Dark mode' : 'Light mode';
  const icon = isLightTheme ? '🌙' : '☀️';

  return (
    <button
      type="button"
      className={['theme-toggle', className].filter(Boolean).join(' ')}
      onClick={toggleTheme}
      aria-label={`Switch to the ${nextThemeName} theme`}
      title={`Switch to the ${nextThemeName} theme`}
      aria-pressed={!isLightTheme}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="theme-toggle__label">{labelText}</span>
    </button>
  );
}
