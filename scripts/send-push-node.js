/**
 * Send Push Notification Script (Node.js)
 *
 * This script demonstrates how to send Web Push notifications using VAPID
 * authentication. It uses the 'web-push' npm package.
 *
 * INSTALLATION:
 *   npm install web-push
 *
 * GENERATE VAPID KEYS:
 *   npx web-push generate-vapid-keys
 *   
 *   Copy the output and replace the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
 *   values below (or set them as environment variables).
 *
 * USAGE (as module):
 *   const { sendPush, sendHabitReminder } = require('./send-push-node');
 *
 *   // Send a basic notification
 *   await sendPush(subscription, {
 *     title: 'Hello!',
 *     body: 'This is a test notification',
 *     url: '/habits'
 *   });
 *
 *   // Send a habit reminder
 *   await sendHabitReminder(subscription, 'habit-123', 'Morning Run', '🏃');
 *
 * USAGE (command line):
 *   node send-push-node.js
 *
 *   When run directly, this script sends a test notification to the example
 *   subscription endpoint defined below.
 *
 * DEVELOPER NOTES:
 * - Replace VAPID keys with your actual keys
 * - Replace CONTACT_EMAIL with your email (VAPID requires a contact)
 * - The subscription object must match the format from PushManager.subscribe()
 * - See docs/NOTIFICATIONS_PWA_SETUP.md for complete setup instructions
 */

// Try to load web-push if available
let webpush;
try {
  webpush = require('web-push');
} catch (e) {
  console.error('Error: web-push package not installed.');
  console.error('Install it with: npm install web-push');
  process.exit(1);
}

// ============================================================================
// CONFIGURATION - REPLACE THESE VALUES WITH YOUR ACTUAL KEYS
// ============================================================================

/**
 * VAPID Public Key - Share this with your client-side code
 * Generate with: npx web-push generate-vapid-keys
 *
 * REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY
 */
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY';

/**
 * VAPID Private Key - Keep this secret on your server
 * Generate with: npx web-push generate-vapid-keys
 *
 * REPLACE_WITH_YOUR_VAPID_PRIVATE_KEY
 */
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'REPLACE_WITH_YOUR_VAPID_PRIVATE_KEY';

/**
 * Contact email for VAPID - Required by the Web Push protocol
 * Replace with your actual contact email
 */
const CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || 'mailto:your-email@example.com';

// Configure web-push with VAPID details
if (VAPID_PUBLIC_KEY !== 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY' &&
    VAPID_PRIVATE_KEY !== 'REPLACE_WITH_YOUR_VAPID_PRIVATE_KEY') {
  webpush.setVapidDetails(
    CONTACT_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// ============================================================================
// PUSH NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Sends a push notification to a subscription
 *
 * @param {Object} subscription - The push subscription from the client
 * @param {string} subscription.endpoint - The push service endpoint
 * @param {Object} subscription.keys - The encryption keys
 * @param {string} subscription.keys.p256dh - The public key
 * @param {string} subscription.keys.auth - The auth secret
 * @param {Object} payload - The notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {string} [payload.icon] - Notification icon URL
 * @param {string} [payload.badge] - Notification badge URL
 * @param {string} [payload.image] - Notification image URL
 * @param {string} [payload.url] - URL to open when notification is clicked
 * @param {string} [payload.tag] - Tag to group notifications
 * @param {Array} [payload.actions] - Action buttons
 * @param {Object} [payload.data] - Custom data
 * @param {boolean} [payload.requireInteraction] - Keep notification visible until interacted
 * @returns {Promise<Object>} - The result from web-push
 *
 * @example
 * const subscription = {
 *   endpoint: 'https://fcm.googleapis.com/fcm/send/...',
 *   keys: {
 *     p256dh: 'BNcRd...',
 *     auth: 'tBH...'
 *   }
 * };
 *
 * await sendPush(subscription, {
 *   title: 'New Message',
 *   body: 'You have a new message',
 *   url: '/messages'
 * });
 */
async function sendPush(subscription, payload) {
  if (VAPID_PUBLIC_KEY === 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY') {
    throw new Error('VAPID keys not configured. Replace placeholder values with your actual VAPID keys.');
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || 'LifeGoalApp',
    body: payload.body || 'You have a notification',
    icon: payload.icon || '/icons/icon-192x192.svg',
    badge: payload.badge || '/icons/icon-192x192.svg',
    image: payload.image,
    url: payload.url || '/',
    tag: payload.tag,
    actions: payload.actions,
    data: payload.data,
    requireInteraction: payload.requireInteraction || false
  });

  console.log('[send-push] Sending notification to:', subscription.endpoint);
  console.log('[send-push] Payload:', notificationPayload);

  try {
    const result = await webpush.sendNotification(subscription, notificationPayload);
    console.log('[send-push] Notification sent successfully');
    return result;
  } catch (error) {
    console.error('[send-push] Failed to send notification:', error);
    throw error;
  }
}

/**
 * Sends a habit reminder notification
 *
 * @param {Object} subscription - The push subscription
 * @param {string} habitId - The habit ID
 * @param {string} habitTitle - The habit title
 * @param {string} [habitEmoji] - Optional emoji for the habit
 * @returns {Promise<Object>} - The result from web-push
 *
 * @example
 * await sendHabitReminder(subscription, 'habit-123', 'Morning Run', '🏃');
 */
async function sendHabitReminder(subscription, habitId, habitTitle, habitEmoji = '') {
  const emojiPrefix = habitEmoji ? `${habitEmoji} ` : '';
  
  return sendPush(subscription, {
    title: `Time for: ${emojiPrefix}${habitTitle}`,
    body: 'Tap to mark it complete in LifeGoal App',
    url: '/#habits',
    tag: `habit-${habitId}`,
    actions: [
      { action: 'done', title: '✓ Done' },
      { action: 'snooze', title: '⏰ Snooze' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
      habit_id: habitId,
      habit_title: habitTitle
    },
    requireInteraction: true
  });
}

/**
 * Sends a goal progress notification
 *
 * @param {Object} subscription - The push subscription
 * @param {string} goalTitle - The goal title
 * @param {number} progress - Progress percentage (0-100)
 * @returns {Promise<Object>} - The result from web-push
 */
async function sendGoalProgress(subscription, goalTitle, progress) {
  return sendPush(subscription, {
    title: `Goal Progress: ${goalTitle}`,
    body: `You're ${progress}% there! Keep going! 🎯`,
    url: '/#goals',
    tag: 'goal-progress'
  });
}

/**
 * Sends a daily summary notification
 *
 * @param {Object} subscription - The push subscription
 * @param {number} completedHabits - Number of habits completed today
 * @param {number} totalHabits - Total habits for today
 * @returns {Promise<Object>} - The result from web-push
 */
async function sendDailySummary(subscription, completedHabits, totalHabits) {
  const remaining = totalHabits - completedHabits;
  const body = remaining === 0
    ? '🎉 Amazing! You completed all your habits today!'
    : `${completedHabits}/${totalHabits} habits done. ${remaining} left to go!`;

  return sendPush(subscription, {
    title: 'Daily Progress',
    body: body,
    url: '/#habits',
    tag: 'daily-summary'
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  sendPush,
  sendHabitReminder,
  sendGoalProgress,
  sendDailySummary,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
};

// ============================================================================
// CLI EXECUTION
// ============================================================================

// If run directly, send a test notification
if (require.main === module) {
  console.log('='.repeat(60));
  console.log('LifeGoal App - Web Push Test Script');
  console.log('='.repeat(60));
  console.log('');

  if (VAPID_PUBLIC_KEY === 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY') {
    console.log('⚠️  VAPID keys not configured!');
    console.log('');
    console.log('To generate VAPID keys:');
    console.log('  npx web-push generate-vapid-keys');
    console.log('');
    console.log('Then either:');
    console.log('1. Replace VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in this file');
    console.log('2. Or set environment variables:');
    console.log('   export VAPID_PUBLIC_KEY="your_public_key"');
    console.log('   export VAPID_PRIVATE_KEY="your_private_key"');
    console.log('   export VAPID_CONTACT_EMAIL="mailto:your@email.com"');
    console.log('');
    console.log('Example usage after configuration:');
    console.log('');
    console.log('  // In your code:');
    console.log('  const { sendPush } = require("./send-push-node");');
    console.log('');
    console.log('  const subscription = {');
    console.log('    endpoint: "https://fcm.googleapis.com/fcm/send/...",');
    console.log('    keys: { p256dh: "...", auth: "..." }');
    console.log('  };');
    console.log('');
    console.log('  await sendPush(subscription, {');
    console.log('    title: "Hello!",');
    console.log('    body: "This is a test notification"');
    console.log('  });');
    console.log('');
    process.exit(0);
  }

  // Example subscription - replace with a real subscription from your app
  const exampleSubscription = {
    endpoint: 'REPLACE_WITH_ACTUAL_SUBSCRIPTION_ENDPOINT',
    keys: {
      p256dh: 'REPLACE_WITH_P256DH_KEY',
      auth: 'REPLACE_WITH_AUTH_KEY'
    }
  };

  if (exampleSubscription.endpoint === 'REPLACE_WITH_ACTUAL_SUBSCRIPTION_ENDPOINT') {
    console.log('✓ VAPID keys configured');
    console.log('');
    console.log('To send a test notification, replace the exampleSubscription');
    console.log('in this file with a real subscription from your app.');
    console.log('');
    console.log('Get a subscription from your browser console:');
    console.log('  1. Open your app');
    console.log('  2. Call: await window.subscribeToPush("' + VAPID_PUBLIC_KEY.substring(0, 20) + '...")');
    console.log('  3. Copy the subscription object');
    console.log('');
    process.exit(0);
  }

  // Send test notification
  sendPush(exampleSubscription, {
    title: '🎯 Test Notification',
    body: 'If you see this, Web Push is working!',
    url: '/'
  })
    .then(() => {
      console.log('✓ Test notification sent successfully!');
    })
    .catch((error) => {
      console.error('✗ Failed to send test notification:', error.message);
      process.exit(1);
    });
}
