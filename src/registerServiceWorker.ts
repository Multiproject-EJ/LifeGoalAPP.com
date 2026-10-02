import { Capacitor } from '@capacitor/core';

export async function registerServiceWorker() {
  // Capacitor ships the production bundle inside WKWebView. Service workers are
  // a PWA concern and are not supported by the native capacitor:// origin.
  if (Capacitor.isNativePlatform()) {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    if (typeof window !== 'undefined') {
      window.__LifeGoalAppDebugger?.warn('Service workers are not supported in this browser.');
    }
    return;
  }

  try {
    const SW_RELOAD_FLAG_KEY = 'lifegoalapp_sw_reloaded_once';
    let previousController = navigator.serviceWorker.controller;
    let reloadedInThisDocument = false;

    const triggerControlledReload = () => {
      if (typeof window === 'undefined' || reloadedInThisDocument) return;
      try {
        if (window.sessionStorage.getItem(SW_RELOAD_FLAG_KEY) === '1') return;
        window.sessionStorage.setItem(SW_RELOAD_FLAG_KEY, '1');
      } catch {
        // If storage is blocked, keep the app open rather than risk an
        // unbounded refresh loop. A normal manual refresh loads the update.
        return;
      }
      reloadedInThisDocument = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const controller = navigator.serviceWorker.controller;
      if (!controller || controller === previousController) return;
      const isReplacement = Boolean(previousController);
      previousController = controller;
      // First-time control does not need to interrupt login or an active game.
      if (!isReplacement) return;
      triggerControlledReload();
    });

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'classic',
    });

    // Browser automation/privacy settings can disable registration entirely.
    if (!registration) return;
    void registration.update().catch((error) => {
      console.warn('Service worker update check failed; keeping the current app open.', error);
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

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
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
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
