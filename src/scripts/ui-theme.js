(() => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  
  // Initialize theme from localStorage or system preference
  const saved = localStorage.getItem('lga-theme');
  if (saved) {
    root.setAttribute('data-theme', saved);
  } else if (!root.hasAttribute('data-theme')) {
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  // Attach to any element with [data-action="toggle-theme"]
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="toggle-theme"]');
    if (!btn) return;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('lga-theme', next);
  });
})();
