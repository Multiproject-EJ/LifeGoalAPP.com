const CACHE_VERSION = 'v3';
const SHELL_CACHE = `lifegoalapp-shell-${CACHE_VERSION}`;
const DATA_CACHE = `lifegoalapp-data-${CACHE_VERSION}`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

const SUPABASE_HOST_MATCHER = /supabase\.(co|in)$/;
const SUPABASE_SYNC_TAG = 'lifegoalapp-supabase-sync';
const SYNC_DB_NAME = 'lifegoalapp-sync-queue';
const SYNC_STORE_NAME = 'supabase-writes';
const EXCLUDED_HEADERS = ['content-length'];

async function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
        db.createObjectStore(SYNC_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addRequestToQueue(request) {
  const clone = request.clone();
  const headers = {};
  for (const [key, value] of clone.headers.entries()) {
    if (!EXCLUDED_HEADERS.includes(key.toLowerCase())) {
      headers[key] = value;
    }
  }

  let body = null;
  if (clone.method !== 'GET' && clone.method !== 'HEAD') {
    body = await clone.text();
  }

  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    url: clone.url,
    method: clone.method,
    headers,
    body,
    timestamp: Date.now(),
  };

  const db = await openQueueDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
      tx.objectStore(SYNC_STORE_NAME).put(record);
    });
  } finally {
    db.close();
  }
  const pending = await getQueueCount();
  await notifyClients('SUPABASE_WRITE_QUEUED', { pending });
}

async function getQueuedRequests() {
  const db = await openQueueDb();
  try {
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE_NAME, 'readonly');
      const store = tx.objectStore(SYNC_STORE_NAME);
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
    return records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  } finally {
    db.close();
  }
}

async function removeQueuedRequest(id) {
  const db = await openQueueDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
      tx.objectStore(SYNC_STORE_NAME).delete(id);
    });
  } finally {
    db.close();
  }
}

async function getQueueCount() {
  const db = await openQueueDb();
  try {
    const count = await new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE_NAME, 'readonly');
      const store = tx.objectStore(SYNC_STORE_NAME);
      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result || 0);
      countRequest.onerror = () => reject(countRequest.error);
    });
    return count;
  } finally {
    db.close();
  }
}

async function notifyClients(type, detail = {}) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type, detail });
    }
  } catch (error) {
    console.error('Failed to notify clients:', error);
  }
}

async function registerBackgroundSync() {
  if (!self.registration || !('sync' in self.registration)) {
    try {
      await processQueue();
    } catch (error) {
      console.error('Immediate replay failed while background sync is unavailable.', error);
    }
    return;
  }

  try {
    await self.registration.sync.register(SUPABASE_SYNC_TAG);
  } catch (error) {
    console.error('Background sync registration failed, attempting immediate replay.', error);
    try {
      await processQueue();
    } catch (replayError) {
      console.error('Immediate replay failed after sync registration error.', replayError);
    }
  }
}

async function processQueue() {
  const queuedRequests = await getQueuedRequests();
  if (!queuedRequests.length) {
    return;
  }

  for (const queued of queuedRequests) {
    try {
      const headers = new Headers(queued.headers ?? {});
      const response = await fetch(queued.url, {
        method: queued.method,
        headers,
        body: queued.body,
      });

      if (!response.ok) {
        throw new Error(`Replay failed with status ${response.status}`);
      }

      await removeQueuedRequest(queued.id);
    } catch (error) {
      console.error('Failed to replay queued request:', error);
      const pending = await getQueueCount();
      await notifyClients('SUPABASE_QUEUE_REPLAY_FAILED', { pending });
      throw error;
    }
  }

  const pending = await getQueueCount();
  await notifyClients('SUPABASE_QUEUE_FLUSHED', { pending });
}

function createQueuedResponse() {
  return new Response(
    JSON.stringify({
      data: [],
      error: null,
      status: 202,
      statusText: 'Accepted',
      queued: true,
      message: 'The request was queued and will sync when online.',
    }),
    {
      status: 202,
      headers: {
        'Content-Type': 'application/json',
        'X-Background-Sync': 'queued',
      },
    },
  );
}

async function handleSupabaseWrite(request) {
  try {
    return await fetch(request.clone());
  } catch (error) {
    console.warn('Queuing Supabase write for retry when online:', error);
    await addRequestToQueue(request);
    await registerBackgroundSync();
    return createQueuedResponse();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (![SHELL_CACHE, DATA_CACHE].includes(key)) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
      await self.clients.claim();
      try {
        await processQueue();
      } catch (error) {
        console.error('Failed to process queued requests during activation.', error);
      }
    })()
  );
});

function cacheAppShell(event) {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
}

function cacheSupabaseData(event) {
  event.respondWith(
    caches.open(DATA_CACHE).then((cache) =>
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }

          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    )
  );
}

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (SUPABASE_HOST_MATCHER.test(requestUrl.hostname)) {
    if (event.request.method === 'GET') {
      cacheSupabaseData(event);
      return;
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
      event.respondWith(handleSupabaseWrite(event.request));
    }
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  if (requestUrl.origin === self.location.origin) {
    cacheAppShell(event);
    return;
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === SUPABASE_SYNC_TAG) {
    event.waitUntil(
      processQueue().catch((error) => {
        console.error('Background sync failed to process queue:', error);
        throw error;
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PROCESS_SUPABASE_QUEUE') {
    event.waitUntil(
      processQueue().catch((error) => {
        console.error('Manual queue processing failed:', error);
        throw error;
      })
    );
  }
});

self.addEventListener('push', (event) => {
  const defaultTitle = 'LifeGoalApp Reminder';
  const defaultBody = 'Stay on track with your goals today.';
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data = { title: defaultTitle, body: event.data.text() || defaultBody };
    }
  }

  const title = data.title || defaultTitle;
  const options = {
    body: data.body || defaultBody,
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    data: data.data || {},
    actions: data.actions || undefined,
    tag: data.tag || undefined,
    renotify: data.renotify || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && targetUrl) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    notifyClients('PUSH_SUBSCRIPTION_EXPIRED').catch((error) => {
      console.error('Failed to broadcast push subscription expiration.', error);
    })
  );
});
