export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    if (typeof window !== 'undefined') {
      window.__LifeGoalAppDebugger?.warn('Service workers are not supported in this browser.');
    }
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'classic',
    });

    if (typeof window !== 'undefined') {
      window.__LifeGoalAppDebugger?.log('Service worker registered.', {
        scope: registration.scope,
      });
    }

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.info('New content is available; please refresh.');
          if (typeof window !== 'undefined') {
            window.__LifeGoalAppDebugger?.log('Service worker installed an update.');
          }
        }
      };
    };
  } catch (error) {
    console.error('Failed to register service worker:', error);
    if (typeof window !== 'undefined') {
      window.__LifeGoalAppDebugger?.error('Failed to register service worker.', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
