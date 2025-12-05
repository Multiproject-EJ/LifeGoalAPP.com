/**
 * Service Worker for Web Push Notifications
 * 
 * This service worker handles push notifications for the LifeGoal App.
 * Compatible with iOS Safari 16.4+ when added to Home Screen.
 * 
 * Features:
 * - Receives push messages and displays notifications
 * - Handles notification clicks to open/focus the app
 * - Logs events to console for debugging
 * 
 * DEVELOPER NOTES:
 * - This is a standalone service worker for Web Push support
 * - The main app may use a separate service worker (sw.js) for caching
 * - You can combine them if needed, or use this as a drop-in replacement
 */

// Log service worker lifecycle events for debugging
console.log('[service-worker.js] Service worker loaded');

/**
 * Install event - activates immediately
 */
self.addEventListener('install', (event) => {
  console.log('[service-worker.js] Installing service worker...');
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

/**
 * Activate event - claims all clients
 */
self.addEventListener('activate', (event) => {
  console.log('[service-worker.js] Activating service worker...');
  // Take control of all open clients immediately
  event.waitUntil(self.clients.claim());
});

/**
 * Push event - receives and displays notifications
 * 
 * Expected payload format (JSON):
 * {
 *   "title": "Notification Title",
 *   "body": "Notification body text",
 *   "icon": "/icons/icon-192x192.svg",      // optional
 *   "badge": "/icons/icon-192x192.svg",     // optional
 *   "image": "https://example.com/img.jpg", // optional
 *   "tag": "unique-tag",                    // optional, groups notifications
 *   "url": "/path/to/open",                 // optional, URL to open on click
 *   "data": { ... },                        // optional, custom data
 *   "actions": [                            // optional, action buttons
 *     { "action": "done", "title": "Mark Done" },
 *     { "action": "dismiss", "title": "Dismiss" }
 *   ],
 *   "requireInteraction": true              // optional, keep notification visible
 * }
 * 
 * If payload is plain text, it will be used as the notification body.
 */
self.addEventListener('push', (event) => {
  console.log('[service-worker.js] Push event received');
  
  const defaultTitle = 'LifeGoalApp';
  const defaultBody = 'You have a new notification';
  const defaultIcon = '/icons/icon-192x192.svg';
  const defaultBadge = '/icons/icon-192x192.svg';
  
  let title = defaultTitle;
  let body = defaultBody;
  let options = {
    icon: defaultIcon,
    badge: defaultBadge,
    data: {}
  };
  
  // Parse push payload
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[service-worker.js] Push payload (JSON):', payload);
      
      title = payload.title || defaultTitle;
      body = payload.body || defaultBody;
      
      options = {
        body: body,
        icon: payload.icon || defaultIcon,
        badge: payload.badge || defaultBadge,
        image: payload.image || undefined,
        tag: payload.tag || undefined,
        data: {
          url: payload.url || '/',
          ...(payload.data || {})
        },
        actions: payload.actions || undefined,
        requireInteraction: payload.requireInteraction || false
      };
    } catch (e) {
      // Not JSON, treat as plain text
      const text = event.data.text();
      console.log('[service-worker.js] Push payload (text):', text);
      body = text || defaultBody;
      options.body = body;
    }
  } else {
    console.log('[service-worker.js] Push event has no data');
  }
  
  console.log('[service-worker.js] Showing notification:', title, options);
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Notification click event - opens/focuses the app
 * 
 * Behavior:
 * 1. If an action button was clicked, that action is available in event.action
 * 2. Closes the notification
 * 3. If a URL was provided in data.url, navigates to that URL
 * 4. If app is already open, focuses that window
 * 5. Otherwise opens a new window
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[service-worker.js] Notification clicked');
  
  // Close the notification
  event.notification.close();
  
  // Get the action if any
  const action = event.action;
  if (action) {
    console.log('[service-worker.js] Notification action clicked:', action);
    
    // Broadcast action to clients so the app can handle it
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: action,
              data: event.notification.data
            });
          }
        })
    );
  }
  
  // Get URL to open (default to root)
  const urlToOpen = event.notification.data?.url || '/';
  console.log('[service-worker.js] Opening URL:', urlToOpen);
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          // Try to focus existing window and navigate
          if ('focus' in client) {
            console.log('[service-worker.js] Focusing existing client');
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        
        // No existing window, open new one
        if (self.clients.openWindow) {
          console.log('[service-worker.js] Opening new window');
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Push subscription change event
 * 
 * Fires when the push subscription expires or is invalidated.
 * Notifies clients so the app can re-subscribe the user.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[service-worker.js] Push subscription changed/expired');
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_EXPIRED'
          });
        }
      })
  );
});
