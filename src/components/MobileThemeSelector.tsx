import { useTheme, LIGHT_THEMES, DARK_THEMES, type ThemeMode } from '../contexts/ThemeContext';

const THEME_MODE_OPTIONS: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: 'light', icon: '☀️', label: 'Light' },
  { mode: 'dark', icon: '🌙', label: 'Dark' },
  { mode: 'system', icon: '💻', label: 'System' },
];

type MobileThemeSelectorProps = {
  onClose: () => void;
};

export function MobileThemeSelector({ onClose }: MobileThemeSelectorProps) {
  const {
    themeMode,
    lightTheme,
    darkTheme,
    setThemeMode,
    setLightTheme,
    setDarkTheme,
  } = useTheme();

  const handleThemeSelect = (themeId: string, category: 'light' | 'dark') => {
    if (category === 'light') {
      const theme = LIGHT_THEMES.find(t => t.id === themeId);
      if (theme) {
        setLightTheme(theme.id);
      }
    } else {
      const theme = DARK_THEMES.find(t => t.id === themeId);
      if (theme) {
        setDarkTheme(theme.id);
      }
    }
  };

  const allThemes = [...LIGHT_THEMES, ...DARK_THEMES];

  return (
    <div className="mobile-theme-selector">
      <div className="mobile-theme-selector__header">
        <h3 className="mobile-theme-selector__title">Choose Theme</h3>
        <button
          type="button"
          className="mobile-theme-selector__close"
          onClick={onClose}
          aria-label="Close theme selector"
        >
          ×
        </button>
      </div>

      {/* 3-way Theme Mode Toggle */}
      <div className="mobile-theme-mode-toggle">
        <span className="mobile-theme-mode-toggle__label">Mode:</span>
        <div className="mobile-theme-mode-toggle__buttons">
          {THEME_MODE_OPTIONS.map((option) => {
            const isActive = themeMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                className={`mobile-theme-mode-toggle__btn ${isActive ? 'mobile-theme-mode-toggle__btn--active' : ''}`}
                onClick={() => setThemeMode(option.mode)}
                aria-pressed={isActive}
                aria-label={`Set theme mode to ${option.label}`}
              >
                <span className="mobile-theme-mode-toggle__icon" aria-hidden="true">{option.icon}</span>
                <span className="mobile-theme-mode-toggle__text">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Grid */}
      <div className="mobile-theme-selector__grid">
        {allThemes.map((themeOption) => {
          const isActiveLightTheme = themeOption.category === 'light' && lightTheme === themeOption.id;
          const isActiveDarkTheme = themeOption.category === 'dark' && darkTheme === themeOption.id;
          const isActive = isActiveLightTheme || isActiveDarkTheme;
          
          return (
            <button
              key={themeOption.id}
              type="button"
              className={`mobile-theme-selector__card ${isActive ? 'mobile-theme-selector__card--active' : ''}`}
              onClick={() => handleThemeSelect(themeOption.id, themeOption.category)}
              aria-pressed={isActive}
              aria-label={`Select ${themeOption.name}`}
            >
              <span className="mobile-theme-selector__icon" aria-hidden="true">
                {themeOption.icon}
              </span>
              <span className="mobile-theme-selector__name">{themeOption.name}</span>
              {isActive && (
                <span className="mobile-theme-selector__badge" aria-label="Currently active">
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
