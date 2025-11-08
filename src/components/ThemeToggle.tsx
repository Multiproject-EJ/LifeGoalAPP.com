import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'bright-sky' ? 'dark glass' : 'bright sky'} theme`}
      title={`Current: ${theme === 'bright-sky' ? 'Bright Sky' : 'Dark Glass'} theme`}
    >
      {theme === 'bright-sky' ? (
        <>
          <span className="theme-toggle__icon">🌙</span>
          <span className="theme-toggle__label">Dark Glass</span>
        </>
      ) : (
        <>
          <span className="theme-toggle__icon">☀️</span>
          <span className="theme-toggle__label">Bright Sky</span>
        </>
      )}
    </button>
  );
}
