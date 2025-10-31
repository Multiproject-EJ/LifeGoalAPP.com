export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'classic'
    });

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.info('New content is available; please refresh.');
        }
      };
    };
  } catch (error) {
    console.error('Failed to register service worker:', error);
  }
}
