import './index.css';
import './themes.css';

const DEBUG_STORAGE_KEY = 'lifeGoalApp:debug';
const bootStartedAt = new Date().toISOString();

const safeLocalStorage = (() => {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Local storage is not available:', error);
    return null;
  }
})();

const params = new URLSearchParams(window.location.search);
const debugParam = params.get('debug');
const debugRequested =
  debugParam === '1' || debugParam === 'true' || params.has('debug');

const getStoredDebugPreference = () => {
  if (!safeLocalStorage) return false;
  try {
    return safeLocalStorage.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const setStoredDebugPreference = (value: boolean) => {
  if (!safeLocalStorage) return;
  try {
    if (value) {
      safeLocalStorage.setItem(DEBUG_STORAGE_KEY, '1');
    } else {
      safeLocalStorage.removeItem(DEBUG_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Unable to persist debugger preference.', error);
  }
};

const debugEnabled = debugRequested || getStoredDebugPreference();

type DebugLevel = 'info' | 'warn' | 'error';

interface DebugEntry {
  time: string;
  level: DebugLevel;
  message: string;
  detailText?: string;
}

const formatDetail = (detail: unknown): string => {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (detail instanceof Error) {
    return `${detail.message}\n${detail.stack ?? ''}`.trim();
  }
  try {
    return JSON.stringify(detail, null, 2);
  } catch (error) {
    return String(detail);
  }
};

const createDebugger = () => {
  const entries: DebugEntry[] = [];
  let panel: HTMLElement | null = null;
  let content: HTMLElement | null = null;
  let persistButton: HTMLButtonElement | null = null;

  const ensurePanel = () => {
    if (panel) return;
    panel = document.createElement('aside');
    panel.id = 'lifegoal-debugger';
    panel.style.cssText = [
      'position:fixed',
      'bottom:16px',
      'right:16px',
      'width:min(420px,92vw)',
      'max-height:70vh',
      'display:none',
      'flex-direction:column',
      'background:rgba(15,23,42,0.94)',
      'color:#f8fafc',
      'border-radius:16px',
      'box-shadow:0 24px 48px rgba(15,23,42,0.45)',
      'font-family:SFMono-Regular,ui-monospace,Menlo,Consolas,\'Liberation Mono\',monospace',
      'z-index:2147483647',
      'border:1px solid rgba(148,163,184,0.35)',
      'overflow:hidden',
    ].join(';');

    const header = document.createElement('header');
    header.style.cssText = [
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:0.5rem',
      'padding:0.75rem 1rem',
      'background:rgba(15,23,42,0.85)',
      'border-bottom:1px solid rgba(148,163,184,0.35)',
    ].join(';');

    const title = document.createElement('strong');
    title.textContent = 'LifeGoal debugger';
    title.style.fontSize = '0.95rem';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.textContent = 'Close';
    toggleBtn.style.cssText = [
      'background:transparent',
      'border:1px solid rgba(148,163,184,0.45)',
      'color:#f8fafc',
      'border-radius:999px',
      'padding:0.2rem 0.75rem',
      'font-size:0.75rem',
      'cursor:pointer',
    ].join(';');
    toggleBtn.addEventListener('click', () => hide());

    persistButton = document.createElement('button');
    persistButton.type = 'button';
    persistButton.style.cssText = [
      'background:rgba(59,130,246,0.22)',
      'border:1px solid rgba(148,163,184,0.45)',
      'color:#bfdbfe',
      'border-radius:999px',
      'padding:0.2rem 0.75rem',
      'font-size:0.75rem',
      'cursor:pointer',
    ].join(';');
    persistButton.addEventListener('click', () => {
      const next = !getStoredDebugPreference();
      setStoredDebugPreference(next);
      updatePersistButton();
    });

    actions.appendChild(persistButton);
    actions.appendChild(toggleBtn);

    header.appendChild(title);
    header.appendChild(actions);

    content = document.createElement('div');
    content.style.cssText = [
      'padding:0.75rem 1rem',
      'overflow:auto',
      'display:flex',
      'flex-direction:column',
      'gap:0.5rem',
      'font-size:0.8rem',
      'line-height:1.45',
    ].join(';');

    panel.appendChild(header);
    panel.appendChild(content);
  };

  const updatePersistButton = () => {
    if (!persistButton) return;
    const active = getStoredDebugPreference();
    persistButton.textContent = active ? 'Persisted' : 'Persist';
    persistButton.style.background = active
      ? 'rgba(16,185,129,0.35)'
      : 'rgba(59,130,246,0.22)';
    persistButton.style.color = active ? '#bbf7d0' : '#bfdbfe';
  };

  const render = () => {
    const target = content;
    if (!target) return;
    target.innerHTML = '';
    entries.slice(-100).forEach((entry) => {
      const row = document.createElement('div');
      row.style.cssText = [
        'display:grid',
        'gap:0.25rem',
        'background:rgba(148,163,184,0.12)',
        'border-radius:10px',
        'padding:0.55rem 0.65rem',
      ].join(';');

      const meta = document.createElement('div');
      meta.textContent = `[${entry.time}] ${entry.level.toUpperCase()} • ${entry.message}`;
      meta.style.fontWeight = '600';
      row.appendChild(meta);

      if (entry.detailText) {
        const detail = document.createElement('pre');
        detail.textContent = entry.detailText;
        detail.style.cssText = [
          'margin:0',
          'white-space:pre-wrap',
          'word-break:break-word',
          'background:rgba(15,23,42,0.6)',
          'border-radius:6px',
          'padding:0.45rem 0.5rem',
        ].join(';');
        row.appendChild(detail);
      }

      target.appendChild(row);
    });
  };

  const push = (level: DebugLevel, message: string, detail?: unknown) => {
    entries.push({
      time: new Date().toLocaleTimeString(),
      level,
      message,
      detailText: formatDetail(detail),
    });
    if (entries.length > 200) entries.shift();
    render();
  };

  const show = () => {
    ensurePanel();
    if (!panel) return;
    if (!panel.isConnected) {
      document.body.appendChild(panel);
      updatePersistButton();
    }
    panel.style.display = 'flex';
  };

  const hide = () => {
    if (panel) {
      panel.style.display = 'none';
    }
  };

  const toggle = () => {
    ensurePanel();
    if (!panel) return;
    if (panel.style.display === 'none' || panel.style.display === '') {
      show();
    } else {
      hide();
    }
  };

  const clear = () => {
    entries.length = 0;
    render();
  };

  ensurePanel();
  render();

  return {
    show,
    hide,
    toggle,
    clear,
    push,
    updatePersistButton,
  };
};

const debuggerInstance = createDebugger();

type DebuggerInfo = {
  bootStartedAt: string;
  userAgent: string;
  location: string;
};

type DebuggerApi = {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  clear: () => void;
  log: (message: string, detail?: unknown) => void;
  warn: (message: string, detail?: unknown) => void;
  error: (message: string, detail?: unknown) => void;
  persist: (enabled: boolean) => void;
  info: DebuggerInfo;
};

declare global {
  interface Window {
    __LifeGoalAppDebugger?: DebuggerApi;
  }
}

const debuggerApi: DebuggerApi = {
  show: () => debuggerInstance.show(),
  hide: () => debuggerInstance.hide(),
  toggle: () => debuggerInstance.toggle(),
  clear: () => debuggerInstance.clear(),
  log: (message, detail) => debuggerInstance.push('info', message, detail),
  warn: (message, detail) => debuggerInstance.push('warn', message, detail),
  error: (message, detail) => debuggerInstance.push('error', message, detail),
  persist: (enabled) => {
    setStoredDebugPreference(Boolean(enabled));
    debuggerInstance.updatePersistButton();
  },
  info: {
    bootStartedAt,
    userAgent: navigator.userAgent,
    location: window.location.href,
  },
};

window.__LifeGoalAppDebugger = debuggerApi;

debuggerInstance.push('info', 'Debugger initialized.', debuggerApi.info);

if (debugEnabled) {
  debuggerInstance.show();
  debuggerInstance.push('info', 'Debugger auto-opened.', {
    reason: debugRequested ? 'query' : 'stored preference',
  });
}

window.addEventListener('error', (event) => {
  window.__LifeGoalAppDebugger?.error('Unhandled error captured.', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  window.__LifeGoalAppDebugger?.error('Unhandled promise rejection.', {
    reason: formatDetail(event.reason),
  });
});

const mountFallback = (error: unknown) => {
  const root = document.getElementById('root');
  if (!root) return;
  const message = document.createElement('section');
  message.setAttribute('role', 'alert');
  message.style.cssText = [
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif',
    'max-width:560px',
    'margin:4rem auto',
    'padding:1.75rem',
    'border-radius:18px',
    'background:rgba(15,23,42,0.05)',
    'color:#0f172a',
    'text-align:center',
    'border:1px solid rgba(148,163,184,0.3)',
    'box-shadow:0 24px 45px rgba(15,23,42,0.12)',
  ].join(';');

  const heading = document.createElement('h1');
  heading.textContent = 'We hit a snag starting LifeGoalApp';
  heading.style.cssText = 'margin:0 0 0.75rem;font-size:1.5rem;';

  const intro = document.createElement('p');
  intro.textContent =
    "Your browser couldn't load the app bundle. If you're developing locally, run npm run build and serve the dist folder. For production, make sure the compiled assets are deployed.";
  intro.style.cssText = 'margin:0 0 0.75rem;line-height:1.6;';

  const detail = document.createElement('p');
  detail.textContent = error instanceof Error ? error.message : String(error);
  detail.style.cssText = 'margin:0;color:#b91c1c;font-weight:600;';

  message.appendChild(heading);
  message.appendChild(intro);
  message.appendChild(detail);

  root.innerHTML = '';
  root.appendChild(message);
};

const start = async () => {
  const startTime = performance.now();
  window.__LifeGoalAppDebugger?.log('Loading application entry…', {
    module: './main.tsx',
  });
  try {
    await import('./main.tsx');
    const duration = Number((performance.now() - startTime).toFixed(2));
    window.__LifeGoalAppDebugger?.log('Application entry resolved.', {
      durationMs: duration,
    });
  } catch (error) {
    window.__LifeGoalAppDebugger?.error('Failed to load application entry module.', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    debuggerInstance.show();
    mountFallback(error);
  }
};

void start();

export {};
