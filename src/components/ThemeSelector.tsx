import { useTheme, AVAILABLE_THEMES } from '../contexts/ThemeContext';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-selector">
      <h3 className="theme-selector__title">Choose Your Theme</h3>
      <p className="theme-selector__description">
        Select a theme that matches your style and preferences.
      </p>
      <div className="theme-selector__grid">
        {AVAILABLE_THEMES.map((themeOption) => {
          const isActive = theme === themeOption.id;
          return (
            <button
              key={themeOption.id}
              type="button"
              className={`theme-selector__card ${
                isActive ? 'theme-selector__card--active' : ''
              }`}
              onClick={() => setTheme(themeOption.id)}
              aria-pressed={isActive}
              aria-label={`Select ${themeOption.name} theme`}
            >
              <span className="theme-selector__icon" aria-hidden="true">
                {themeOption.icon}
              </span>
              <span className="theme-selector__name">{themeOption.name}</span>
              <span className="theme-selector__hint">{themeOption.description}</span>
              {isActive && (
                <span className="theme-selector__badge" aria-label="Currently active">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
