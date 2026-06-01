import {
  resolveThemeAccess,
  getThemeUnlockLabel,
  useTheme,
  LIGHT_THEMES,
  DARK_THEMES,
  type ThemeAccessContext,
  type ThemeMode,
} from '../contexts/ThemeContext';

const THEME_MODE_OPTIONS: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: 'light', icon: '☀️', label: 'Light' },
  { mode: 'dark', icon: '🌙', label: 'Dark' },
  { mode: 'system', icon: '💻', label: 'System' },
];

type MobileThemeSelectorProps = {
  onClose: () => void;
  isAdminOrCreator?: boolean;
  accessContext?: ThemeAccessContext;
};

export function MobileThemeSelector({ onClose, isAdminOrCreator = false, accessContext }: MobileThemeSelectorProps) {
  const {
    themeMode,
    lightTheme,
    darkTheme,
    setThemeMode,
    setLightTheme,
    setDarkTheme,
  } = useTheme();

  const resolvedAccessContext: ThemeAccessContext = {
    ...accessContext,
    isAdminOrCreator,
  };

  const handleThemeSelect = (themeId: string, category: 'light' | 'dark') => {
    const theme = category === 'light'
      ? LIGHT_THEMES.find(t => t.id === themeId)
      : DARK_THEMES.find(t => t.id === themeId);

    if (!theme || !resolveThemeAccess(theme, resolvedAccessContext).selectable) {
      return;
    }

    if (category === 'light') {
      setLightTheme(theme.id);
    } else {
      setDarkTheme(theme.id);
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

      <p className="mobile-theme-selector__hint">
        Bio Day and Midnight Blue are included by default. Creature themes are premium Sanctuary purchases; special gift themes unlock through milestones and birthday gifts.
      </p>

      {/* Theme Grid */}
      <div className="mobile-theme-selector__grid">
        {allThemes.map((themeOption) => {
          const isActiveLightTheme = themeOption.category === 'light' && lightTheme === themeOption.id;
          const isActiveDarkTheme = themeOption.category === 'dark' && darkTheme === themeOption.id;
          const isActive = isActiveLightTheme || isActiveDarkTheme;
          const access = resolveThemeAccess(themeOption, resolvedAccessContext);
          const isLocked = !access.selectable;
          const unlockLabel = getThemeUnlockLabel(themeOption, resolvedAccessContext);

          return (
            <button
              key={themeOption.id}
              type="button"
              className={`mobile-theme-selector__card ${isActive ? 'mobile-theme-selector__card--active' : ''} ${isLocked ? 'mobile-theme-selector__card--locked' : ''}`}
              onClick={() => handleThemeSelect(themeOption.id, themeOption.category)}
              disabled={isLocked}
              aria-disabled={isLocked}
              aria-pressed={isActive}
              aria-label={isLocked ? `${themeOption.name} is locked. ${unlockLabel}` : `Select ${themeOption.name}`}
            >
              <span className="mobile-theme-selector__icon" aria-hidden="true">
                {themeOption.icon}
              </span>
              <span className="mobile-theme-selector__name">{themeOption.name}</span>
              {isLocked && (
                <span className="mobile-theme-selector__lock-badge" aria-hidden="true">
                  {`🔒 ${unlockLabel}`}
                </span>
              )}
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
