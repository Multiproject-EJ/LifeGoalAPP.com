/**
 * Web Push Subscription Registration (TypeScript)
 *
 * This module provides functions to register a service worker and subscribe to
 * push notifications. Compatible with iOS Safari 16.4+ when the app is added
 * to the Home Screen.
 *
 * USAGE:
 * ```typescript
 * import { subscribeToPush } from './push-subscribe';
 *
 * // Subscribe with your VAPID public key
 * const subscription = await subscribeToPush('YOUR_VAPID_PUBLIC_KEY');
 * console.log('Subscribed:', subscription);
 * ```
 *
 * DEVELOPER NOTES:
 * - VAPID public key must be base64 URL-safe encoded
 * - You must implement /api/save-subscription on your backend to store subscriptions
 * - See docs/NOTIFICATIONS_PWA_SETUP.md for complete setup instructions
 * - This file is not imported automatically; import it where needed
 */

/**
 * Converts a base64 URL-safe string to a Uint8Array
 * Required for the applicationServerKey in PushManager.subscribe()
 *
 * @param base64String - Base64 URL-safe encoded VAPID public key
 * @returns The key as a Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Checks if push notifications are supported in the current browser
 *
 * @returns True if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Gets the current notification permission status
 *
 * @returns The permission status ('granted', 'denied', or 'default')
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Registers the service worker
 *
 * @param serviceWorkerPath - Path to the service worker file (default: '/service-worker.js')
 * @returns The service worker registration
 */
export async function registerServiceWorker(
  serviceWorkerPath = '/service-worker.js'
): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser');
  }

  console.log('[push-subscribe] Registering service worker...');

  const registration = await navigator.serviceWorker.register(serviceWorkerPath, {
    scope: '/',
  });

  console.log('[push-subscribe] Service worker registered:', registration.scope);

  // Wait for the service worker to be ready
  await navigator.serviceWorker.ready;
  console.log('[push-subscribe] Service worker is ready');

  return registration;
}

/**
 * Requests notification permission from the user
 *
 * @returns The permission status ('granted', 'denied', or 'default')
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser');
  }

  console.log('[push-subscribe] Requesting notification permission...');

  const permission = await Notification.requestPermission();
  console.log('[push-subscribe] Notification permission:', permission);

  return permission;
}

/**
 * Gets the existing push subscription if any
 *
 * @returns The existing subscription or null
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Subscribes to push notifications using PushManager
 *
 * @param registration - The service worker registration
 * @param vapidPublicKey - Base64 URL-safe encoded VAPID public key
 * @returns The push subscription
 */
export async function subscribeToPushManager(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription> {
  if (!('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser');
  }

  console.log('[push-subscribe] Subscribing to push notifications...');

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
  });

  console.log('[push-subscribe] Push subscription created:', subscription.endpoint);

  return subscription;
}

/**
 * Subscription data format for server storage
 */
export interface SubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Sends the subscription to the server
 *
 * @param subscription - The push subscription
 * @param apiEndpoint - The server endpoint to save the subscription (default: '/api/save-subscription')
 * @returns The server response
 */
export async function saveSubscriptionToServer(
  subscription: PushSubscription,
  apiEndpoint = '/api/save-subscription'
): Promise<Response> {
  console.log('[push-subscribe] Saving subscription to server...');

  const subscriptionData = subscription.toJSON() as SubscriptionData;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscriptionData),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to save subscription: ${response.status} ${response.statusText}`
    );
  }

  console.log('[push-subscribe] Subscription saved to server');

  return response;
}

/**
 * Unsubscribes from push notifications
 *
 * @returns True if successfully unsubscribed, false if no subscription existed
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingSubscription();

  if (!subscription) {
    console.log('[push-subscribe] No subscription to unsubscribe from');
    return false;
  }

  console.log('[push-subscribe] Unsubscribing from push notifications...');

  const success = await subscription.unsubscribe();
  console.log('[push-subscribe] Unsubscribed:', success);

  return success;
}

/**
 * Options for subscribeToPush function
 */
export interface SubscribeToPushOptions {
  /** Path to the service worker file */
  serviceWorkerPath?: string;
  /** Server endpoint to save the subscription */
  apiEndpoint?: string;
  /** Whether to skip sending subscription to server */
  skipServerSave?: boolean;
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
 * @param vapidPublicKey - Base64 URL-safe encoded VAPID public key
 *                         REPLACE THIS with your actual VAPID public key
 *                         Generate keys using: npx web-push generate-vapid-keys
 * @param options - Optional configuration options
 * @returns The push subscription
 *
 * @example
 * ```typescript
 * import { subscribeToPush } from './push-subscribe';
 *
 * try {
 *   const subscription = await subscribeToPush('YOUR_VAPID_PUBLIC_KEY_HERE');
 *   console.log('Successfully subscribed:', subscription.endpoint);
 * } catch (error) {
 *   console.error('Failed to subscribe:', error);
 * }
 * ```
 */
export async function subscribeToPush(
  vapidPublicKey: string,
  options: SubscribeToPushOptions = {}
): Promise<PushSubscription> {
  const {
    serviceWorkerPath = '/service-worker.js',
    apiEndpoint = '/api/save-subscription',
    skipServerSave = false,
  } = options;

  console.log('[push-subscribe] Starting push subscription process...');

  // Check basic support
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  // Step 1: Register service worker
  const registration = await registerServiceWorker(serviceWorkerPath);

  // Step 2: Request notification permission
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Step 3: Subscribe to push
  const subscription = await subscribeToPushManager(registration, vapidPublicKey);

  // Step 4: Save subscription to server (unless skipped)
  if (!skipServerSave) {
    await saveSubscriptionToServer(subscription, apiEndpoint);
  }

  console.log('[push-subscribe] Push subscription complete!');

  return subscription;
}

// Default export for convenience
export default subscribeToPush;
