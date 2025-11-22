// ========================================================
// HABITS NOTIFICATION MODULE
// Handles push notifications and local scheduling for habit reminders
// ========================================================

import { supabase, getSession, getVapidPublicKey, getSupabaseUrl } from '../lib/supabaseClient.js';

// State
let pushSubscription = null;
let notificationPermission = 'default';

// Initialize notifications
export async function initNotifications() {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported in this browser');
    return false;
  }

  // Get current permission status
  if ('Notification' in window) {
    notificationPermission = Notification.permission;
  }

  // Try to get existing subscription
  try {
    const registration = await getServiceWorkerRegistration();
    if (registration) {
      pushSubscription = await registration.pushManager.getSubscription();
    }
  } catch (error) {
    console.error('Failed to get push subscription:', error);
  }

  return true;
}

// Check if push notifications are supported
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

// Get service worker registration
async function getServiceWorkerRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (Notification.permission === 'granted') {
    notificationPermission = 'granted';
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked. Please enable them in your browser settings.');
  }

  const permission = await Notification.requestPermission();
  notificationPermission = permission;
  
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  return permission;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications() {
  try {
    // Request permission first
    await requestNotificationPermission();

    // Get service worker registration
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      throw new Error('Service worker not ready');
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Get VAPID public key
      const vapidPublicKey = getVapidPublicKey();
      if (!vapidPublicKey || vapidPublicKey.includes('<PUT')) {
        console.warn('VAPID public key not configured. Push notifications will use local notifications only.');
        // Return a fake subscription for local-only notifications
        pushSubscription = { local: true };
        return pushSubscription;
      }

      // Subscribe
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    pushSubscription = subscription;

    // Save subscription to database
    const session = await getSession();
    if (session && subscription.endpoint) {
      await savePushSubscription(subscription.toJSON());
    }

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush() {
  try {
    if (pushSubscription && pushSubscription.unsubscribe) {
      await pushSubscription.unsubscribe();
    }
    pushSubscription = null;
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

// Save push subscription to database
async function savePushSubscription(subscription) {
  try {
    const session = await getSession();
    if (!session) return;

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys || {};

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: session.user.id,
        endpoint,
        p256dh,
        auth,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save push subscription:', error);
  }
}

// Schedule local notifications for a habit
export function scheduleLocalNotification(habitId, title, reminderTimes) {
  if (!Array.isArray(reminderTimes) || reminderTimes.length === 0) {
    return;
  }

  // Schedule notifications using Notification API (works when app is open)
  reminderTimes.forEach(time => {
    const scheduledTime = getNextOccurrence(time);
    if (!scheduledTime) return;

    const delay = scheduledTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        showLocalNotification(title, habitId);
      }, delay);
    }
  });
}

// Show a local notification
function showLocalNotification(habitTitle, habitId) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = `Time for: ${habitTitle}`;
  const options = {
    body: 'Mark it complete in LifeGoal App',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    tag: `habit-${habitId}`,
    requireInteraction: false,
    data: {
      habit_id: habitId,
      url: '/#habits',
    },
    actions: [
      { action: 'done', title: 'Mark Done' },
      { action: 'skip', title: 'Skip' },
    ],
  };

  try {
    // Use service worker notification if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      // Fall back to basic notification
      new Notification(title, options);
    }
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Test notification
export async function testNotification() {
  try {
    await requestNotificationPermission();
    showLocalNotification('Test Habit', 'test-123');
    return true;
  } catch (error) {
    console.error('Failed to show test notification:', error);
    return false;
  }
}

// Get next occurrence of a time (HH:MM format)
function getNextOccurrence(timeString) {
  if (!timeString || typeof timeString !== 'string') return null;

  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
}

// Convert base64 string to Uint8Array (for VAPID key)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Get notification status
export function getNotificationStatus() {
  return {
    supported: isPushSupported(),
    permission: notificationPermission,
    subscribed: !!pushSubscription,
  };
}

// Export for window access
if (typeof window !== 'undefined') {
  window.habitNotifications = {
    init: initNotifications,
    subscribe: subscribeToPushNotifications,
    unsubscribe: unsubscribeFromPush,
    test: testNotification,
    status: getNotificationStatus,
  };
}
