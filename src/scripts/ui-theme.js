(() => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const STORAGE_KEY = 'lga-theme';

  const safeStorage = (() => {
    try {
      return window.localStorage;
    } catch (error) {
      console.warn('Theme preference storage is unavailable.', error);
      return null;
    }
  })();

  const getStoredTheme = () => {
    if (!safeStorage) return null;
    try {
      return safeStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to read stored theme preference.', error);
      return null;
    }
  };

  const setStoredTheme = (value) => {
    if (!safeStorage) return;
    try {
      safeStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      console.warn('Unable to persist theme preference.', error);
    }
  };

  const applyTheme = (value) => {
    if (!value) return;
    root.setAttribute('data-theme', value);
  };

  if (!root.hasAttribute('data-theme')) {
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  const saved = getStoredTheme();
  if (saved) {
    applyTheme(saved);
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action="toggle-theme"]');
    if (!trigger) return;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setStoredTheme(next);
  });
})();
