const STORAGE_KEY = 'lifegoal-theme';
const DEFAULT_THEME = 'dark-glass';
const LIGHT_THEME = 'flow-day';

const prefersDark = () =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const readStoredTheme = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === DEFAULT_THEME || stored === LIGHT_THEME) {
      return stored;
    }
  } catch (error) {
    console.warn('LifeGoalApp: Unable to read saved theme preference.', error);
  }
  return null;
};

const persistTheme = (theme) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.warn('LifeGoalApp: Unable to persist theme preference.', error);
  }
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === LIGHT_THEME ? '#f2f4fb' : '#0a0e1a');
  }

  const toggle = document.querySelector('[data-action="toggle-theme"]');
  if (toggle) {
    const isLight = theme === LIGHT_THEME;
    toggle.setAttribute('aria-pressed', String(!isLight));

    const icon = toggle.querySelector('[data-theme-icon]');
    if (icon) {
      icon.textContent = isLight ? '🌙' : '☀️';
    }

    const label = toggle.querySelector('[data-theme-label]');
    if (label) {
      label.textContent = isLight ? 'Dark mode' : 'Light mode';
    }
  }
};

const determineInitialTheme = () => {
  const storedTheme = readStoredTheme();
  if (storedTheme) {
    return storedTheme;
  }
  return prefersDark() ? DEFAULT_THEME : LIGHT_THEME;
};

const activateThemeToggle = () => {
  const toggle = document.querySelector('[data-action="toggle-theme"]');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.getAttribute('data-theme') === DEFAULT_THEME
      ? LIGHT_THEME
      : DEFAULT_THEME;
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  });
};

const initTheme = () => {
  const storedTheme = readStoredTheme();
  const initialTheme = storedTheme || determineInitialTheme();
  applyTheme(initialTheme);
  if (storedTheme) {
    persistTheme(storedTheme);
  }
  activateThemeToggle();

  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      const stored = readStoredTheme();
      if (stored) return; // Respect explicit user choice
      const nextTheme = event.matches ? DEFAULT_THEME : LIGHT_THEME;
      applyTheme(nextTheme);
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}
