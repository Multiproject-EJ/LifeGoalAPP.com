const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Failed to resolve service worker registration.', error);
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;
  try {
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to fetch current push subscription.', error);
    return null;
  }
}

async function subscribeInternal(registration: ServiceWorkerRegistration): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VITE_VAPID_PUBLIC_KEY is not configured.');
  }
  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key as unknown as BufferSource,
  });
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push messaging is not supported in this browser.');
  }
  const permission =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') {
    throw new Error('Enable notifications to subscribe to reminders.');
  }
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('Service worker registration is not ready.');
  }
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }
  return subscribeInternal(registration);
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingSubscription();
  if (!subscription) {
    return false;
  }
  try {
    return await subscription.unsubscribe();
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications.', error);
    return false;
  }
}

/**
 * Sends a push subscription to the server (Edge Function) for storage.
 * This allows the server to send push notifications to this device.
 *
 * @param subscription - The PushSubscription object from the browser
 * @param supabaseUrl - The Supabase project URL
 * @param accessToken - The user's JWT access token
 * @returns Promise resolving to { success: true } or throwing an error
 */
export async function sendSubscriptionToServer(
  subscription: PushSubscription,
  supabaseUrl: string,
  accessToken: string,
): Promise<{ success: boolean }> {
  const subscriptionJson = subscription.toJSON();
  
  if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
    throw new Error('Invalid push subscription: missing endpoint or keys');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to register subscription: ${response.status}`);
  }

  return response.json();
}
