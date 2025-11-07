(() => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const STORAGE_KEY = 'lga-theme';

  const applyTheme = (value) => {
    if (!value) return;
    root.setAttribute('data-theme', value);
  };

  if (!root.hasAttribute('data-theme')) {
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    applyTheme(saved);
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action="toggle-theme"]');
    if (!trigger) return;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });
})();
