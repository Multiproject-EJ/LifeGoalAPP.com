import { useTheme, LIGHT_THEMES, DARK_THEMES, type ThemeMode } from '../contexts/ThemeContext';

const THEME_MODE_OPTIONS: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: 'light', icon: '☀️', label: 'Light' },
  { mode: 'dark', icon: '🌙', label: 'Dark' },
  { mode: 'system', icon: '💻', label: 'System' },
];

export function ThemeSelector() {
  const {
    themeMode,
    lightTheme,
    darkTheme,
    setThemeMode,
    setLightTheme,
    setDarkTheme,
    cycleThemeMode,
  } = useTheme();

  return (
    <div className="theme-selector">
      <h3 className="theme-selector__title">Choose Your Theme</h3>
      <p className="theme-selector__description">
        Select a theme that matches your style and preferences.
      </p>

      {/* 3-way Theme Mode Toggle */}
      <div className="theme-mode-toggle">
        <span className="theme-mode-toggle__label">Theme Mode:</span>
        <div className="theme-mode-toggle__buttons">
          {THEME_MODE_OPTIONS.map((option) => {
            const isActive = themeMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                className={`theme-mode-toggle__btn ${isActive ? 'theme-mode-toggle__btn--active' : ''}`}
                onClick={() => setThemeMode(option.mode)}
                aria-pressed={isActive}
                aria-label={`Set theme mode to ${option.label}`}
              >
                <span className="theme-mode-toggle__icon" aria-hidden="true">{option.icon}</span>
                <span className="theme-mode-toggle__text">{option.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="theme-mode-toggle__cycle"
          onClick={cycleThemeMode}
          aria-label="Cycle through theme modes"
          title="Click to cycle: Light → Dark → System"
        >
          🔄 Cycle Mode
        </button>
      </div>

      {/* Light Theme Section */}
      <div className="theme-selector__section">
        <h4 className="theme-selector__section-title">
          <span aria-hidden="true">☀️</span> Light Themes
        </h4>
        <p className="theme-selector__section-hint">
          Choose your preferred light theme for bright environments.
        </p>
        <div className="theme-selector__grid">
          {LIGHT_THEMES.map((themeOption) => {
            const isActive = lightTheme === themeOption.id;
            return (
              <button
                key={themeOption.id}
                type="button"
                className={`theme-selector__card ${isActive ? 'theme-selector__card--active' : ''}`}
                onClick={() => setLightTheme(themeOption.id)}
                aria-pressed={isActive}
                aria-label={`Select ${themeOption.name} as light theme`}
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

      {/* Dark Theme Section */}
      <div className="theme-selector__section">
        <h4 className="theme-selector__section-title">
          <span aria-hidden="true">🌙</span> Dark Themes
        </h4>
        <p className="theme-selector__section-hint">
          Choose your preferred dark theme for low-light environments.
        </p>
        <div className="theme-selector__grid">
          {DARK_THEMES.map((themeOption) => {
            const isActive = darkTheme === themeOption.id;
            return (
              <button
                key={themeOption.id}
                type="button"
                className={`theme-selector__card ${isActive ? 'theme-selector__card--active' : ''}`}
                onClick={() => setDarkTheme(themeOption.id)}
                aria-pressed={isActive}
                aria-label={`Select ${themeOption.name} as dark theme`}
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
    </div>
  );
}
