/**
 * Web Push Subscription Registration (Vanilla JavaScript)
 * 
 * This script registers the service worker and subscribes to push notifications.
 * Compatible with iOS Safari 16.4+ when the app is added to the Home Screen.
 * 
 * USAGE:
 * 1. Include this script in your HTML: <script src="/register-push.js"></script>
 * 2. Call window.subscribeToPush(vapidPublicKey) with your VAPID public key
 * 3. The subscription will be POSTed to /api/save-subscription
 * 
 * DEVELOPER NOTES:
 * - VAPID public key must be base64 URL-safe encoded
 * - You must implement /api/save-subscription on your backend to store subscriptions
 * - See docs/NOTIFICATIONS_PWA_SETUP.md for complete setup instructions
 * 
 * @example
 * // Subscribe with your VAPID public key
 * window.subscribeToPush('BEl62iUYgUi...your_vapid_public_key_here')
 *   .then(subscription => console.log('Subscribed:', subscription))
 *   .catch(err => console.error('Failed:', err));
 */

(function() {
  'use strict';
  
  /**
   * Converts a base64 URL-safe string to a Uint8Array
   * Required for the applicationServerKey in PushManager.subscribe()
   * 
   * @param {string} base64String - Base64 URL-safe encoded VAPID public key
   * @returns {Uint8Array} - The key as a Uint8Array
   */
  function urlBase64ToUint8Array(base64String) {
    // Add padding if needed
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
  
  /**
   * Registers the service worker
   * 
   * @returns {Promise<ServiceWorkerRegistration>} - The service worker registration
   */
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported in this browser');
    }
    
    console.log('[register-push.js] Registering service worker...');
    
    var registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    console.log('[register-push.js] Service worker registered:', registration.scope);
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[register-push.js] Service worker is ready');
    
    return registration;
  }
  
  /**
   * Requests notification permission from the user
   * 
   * @returns {Promise<string>} - The permission status ('granted', 'denied', or 'default')
   */
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported in this browser');
    }
    
    console.log('[register-push.js] Requesting notification permission...');
    
    var permission = await Notification.requestPermission();
    console.log('[register-push.js] Notification permission:', permission);
    
    return permission;
  }
  
  /**
   * Subscribes to push notifications
   * 
   * @param {ServiceWorkerRegistration} registration - The service worker registration
   * @param {string} vapidPublicKey - Base64 URL-safe encoded VAPID public key
   * @returns {Promise<PushSubscription>} - The push subscription
   */
  async function subscribeToPushManager(registration, vapidPublicKey) {
    if (!('PushManager' in window)) {
      throw new Error('Push notifications are not supported in this browser');
    }
    
    console.log('[register-push.js] Subscribing to push notifications...');
    
    var applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    
    var subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    console.log('[register-push.js] Push subscription created:', subscription.endpoint);
    
    return subscription;
  }
  
  /**
   * Sends the subscription to the server
   * 
   * @param {PushSubscription} subscription - The push subscription
   * @returns {Promise<Response>} - The server response
   */
  async function saveSubscriptionToServer(subscription) {
    console.log('[register-push.js] Saving subscription to server...');
    
    var response = await fetch('/api/save-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription.toJSON())
    });
    
    if (!response.ok) {
      throw new Error('Failed to save subscription: ' + response.status + ' ' + response.statusText);
    }
    
    console.log('[register-push.js] Subscription saved to server');
    
    return response;
  }
  
  /**
   * Main function to subscribe to push notifications
   * 
   * This function:
   * 1. Registers the service worker
   * 2. Requests notification permission
   * 3. Subscribes to push via PushManager
   * 4. Sends the subscription to the server
   * 
   * @param {string} vapidPublicKey - Base64 URL-safe encoded VAPID public key
   *                                  REPLACE THIS with your actual VAPID public key
   *                                  Generate keys using: npx web-push generate-vapid-keys
   * @returns {Promise<PushSubscription>} - The push subscription
   */
  async function subscribeToPush(vapidPublicKey) {
    console.log('[register-push.js] Starting push subscription process...');
    
    // Check basic support
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported');
    }
    if (!('PushManager' in window)) {
      throw new Error('Push notifications are not supported');
    }
    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported');
    }
    
    // Step 1: Register service worker
    var registration = await registerServiceWorker();
    
    // Step 2: Request notification permission
    var permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }
    
    // Step 3: Subscribe to push
    var subscription = await subscribeToPushManager(registration, vapidPublicKey);
    
    // Step 4: Save subscription to server
    await saveSubscriptionToServer(subscription);
    
    console.log('[register-push.js] Push subscription complete!');
    
    return subscription;
  }
  
  // Expose the main function globally
  window.subscribeToPush = subscribeToPush;
  
  // Also expose helper functions for advanced usage
  window.pushHelpers = {
    urlBase64ToUint8Array: urlBase64ToUint8Array,
    registerServiceWorker: registerServiceWorker,
    requestNotificationPermission: requestNotificationPermission,
    subscribeToPushManager: subscribeToPushManager,
    saveSubscriptionToServer: saveSubscriptionToServer
  };
  
  console.log('[register-push.js] Push registration script loaded');
  console.log('[register-push.js] Call window.subscribeToPush(vapidPublicKey) to subscribe');
  
})();
