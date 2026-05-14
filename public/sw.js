const CACHE_VERSION = 'v7';
const SHELL_CACHE = `lifegoalapp-shell-${CACHE_VERSION}`;
const DATA_CACHE = `lifegoalapp-data-${CACHE_VERSION}`;
const APP_SHELL = [
  '/manifest.webmanifest',
  '/icons/app-icon-192.svg',
  '/icons/app-icon-512.svg'
];
const DOCUMENT_FALLBACKS = ['/', '/index.html'];
const STATIC_ASSET_EXTENSIONS = /\.(?:css|js|mjs|map|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico)$/i;

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

function shouldQueueSupabaseWrite(request) {
  // Opt-in only: callers must explicitly request SW-backed offline queuing.
  // This avoids returning synthetic 202 responses to flows that expect a real
  // Supabase record body (e.g. `.single()` inserts).
  return request.headers.get('X-LifeGoal-Offline-Queue') === '1';
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      console.info('[sw] install', { cacheVersion: CACHE_VERSION, shellCache: SHELL_CACHE, dataCache: DATA_CACHE });
      const cache = await caches.open(SHELL_CACHE);
      const cacheBuster = `?v=${CACHE_VERSION}-${Date.now()}`;
      const documentRequest = new Request(`/index.html${cacheBuster}`, { cache: 'reload' });
      const documentResponse = await fetch(documentRequest);

      await cache.put('/index.html', documentResponse.clone());
      await cache.put('/', documentResponse.clone());

      if (APP_SHELL.length) {
        await Promise.allSettled(
          APP_SHELL.map(async (url) => {
            try {
              const response = await fetch(new Request(url, { cache: 'reload' }));
              if (!response || !response.ok) {
                throw new Error(`Failed to precache ${url}: ${response?.status ?? 'no-response'}`);
              }
              await cache.put(url, response);
            } catch (error) {
              console.warn('[sw] Skipped precache asset during install:', url, error);
            }
          })
        );
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      console.info('[sw] activate', { cacheVersion: CACHE_VERSION, shellCache: SHELL_CACHE, dataCache: DATA_CACHE });
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

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function networkFirstSameOriginRequest(event) {
  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request, { cache: 'no-store' });
      } catch (error) {
        const cache = await caches.open(SHELL_CACHE);
        const cachedResponse =
          (await cache.match(event.request)) ||
          (await cache.match('/index.html')) ||
          (await cache.match('/'));
        if (cachedResponse) return cachedResponse;
        throw error;
      }
    })()
  );
}

function networkFirstStaticAsset(event) {
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const networkResponse = await fetch(event.request, { cache: 'no-store' });
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        throw error;
      }
    })()
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
      if (shouldQueueSupabaseWrite(event.request)) {
        event.respondWith(handleSupabaseWrite(event.request));
      }
    }
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  if (requestUrl.origin === self.location.origin) {
    if (event.request.mode === 'navigate' || DOCUMENT_FALLBACKS.includes(requestUrl.pathname)) {
      event.respondWith(
        (async () => {
          try {
            const networkResponse = await fetch(event.request, { cache: 'reload' });
            const cache = await caches.open(SHELL_CACHE);

            await cache.put(event.request, networkResponse.clone());
            await cache.put('/index.html', networkResponse.clone());
            await cache.put('/', networkResponse.clone());

            return networkResponse;
          } catch (error) {
            const cache = await caches.open(SHELL_CACHE);
            const cachedResponse =
              (await cache.match(event.request)) ||
              (await cache.match('/index.html')) ||
              (await cache.match('/'));

            if (cachedResponse) {
              return cachedResponse;
            }

            throw error;
          }
        })()
      );
      return;
    }

    if (STATIC_ASSET_EXTENSIONS.test(requestUrl.pathname)) {
      networkFirstStaticAsset(event);
      return;
    }

    networkFirstSameOriginRequest(event);
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
  const defaultTitle = 'HabitGame Reminder';
  const defaultBody = 'Stay on track with your goals today.';
  let payload = {};
  let fallbackText = '';

  if (event.data) {
    try {
      payload = event.data.json() || {};
    } catch (error) {
      fallbackText = event.data.text?.() || '';
    }
  }

  if (!payload || typeof payload !== 'object') {
    payload = {};
  }

  if (fallbackText && !payload.body) {
    payload.body = fallbackText;
  }

  const title = payload.title || defaultTitle;
  const body = payload.body || defaultBody;
  const data = {
    ...(payload.data || {}),
  };

  const tag = payload.tag || (payload.data && payload.data.tag);
  const topic = payload.topic || (payload.data && payload.data.topic);
  const spotlightTag = tag === 'vision-spotlight' || topic === 'vision-spotlight';
  const resolvedUrl = payload.url || (payload.data && payload.data.url);
  if (resolvedUrl) {
    data.url = resolvedUrl;
  } else if (spotlightTag && !data.url) {
    data.url = '/#vision';
  }

  const options = {
    body,
    icon: payload.icon || '/icons/app-icon-192.svg',
    badge: payload.badge || '/icons/app-icon-192.svg',
    image: payload.image,
    data,
    actions: payload.actions || undefined,
    tag: payload.tag || undefined,
    renotify: Boolean(payload.renotify),
  };

  if (payload.requireInteraction != null) {
    options.requireInteraction = Boolean(payload.requireInteraction);
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle habit reminder actions (done/snooze/dismiss)
  if (event.action === 'done' || event.action === 'snooze' || event.action === 'dismiss') {
    const notificationData = event.notification.data || {};
    const habitId = notificationData.habit_id;
    
    if (habitId) {
      event.waitUntil(
        (async () => {
          try {
            // If we have credentials, log to server first
            const supabaseUrl = notificationData.supabase_url;
            const authToken = notificationData.auth_token;
            let serverResponse = null;
            
            if (supabaseUrl && authToken) {
              const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders/log`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                  habit_id: habitId,
                  action: event.action,
                }),
              });

              if (response.ok) {
                serverResponse = await response.json();
              } else {
                console.error('Failed to log habit action from notification:', await response.text());
              }
            }

            // Notify all clients to update the UI with server response
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of clients) {
              client.postMessage({
                type: 'HABIT_ACTION_FROM_NOTIFICATION',
                habitId,
                action: event.action,
                completed: serverResponse?.completed ?? (event.action === 'done'),
                wasAlreadyCompleted: serverResponse?.was_already_completed ?? false,
              });
            }

            // If action is 'done' and no clients are open, show a confirmation notification
            if (event.action === 'done' && clients.length === 0) {
              const habitTitle = notificationData.habit_title || 'Habit';
              await self.registration.showNotification('✓ Marked as done', {
                body: `${habitTitle} completed for today`,
                icon: '/icons/app-icon-192.svg',
                badge: '/icons/app-icon-192.svg',
                tag: 'habit-completion-confirmation',
              });
            }
          } catch (error) {
            console.error('Error handling habit action from notification:', error);
          }
        })()
      );
      return;
    }
  }

  // Default notification click behavior (open app)
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
