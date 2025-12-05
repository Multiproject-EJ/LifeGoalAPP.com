#!/usr/bin/env node
/**
 * DEV-ONLY: Test Push Notification Sender
 *
 * ⚠️  WARNING: This is a development-only test script.
 *    Do NOT use in production!
 *
 * This script reads stored push subscriptions and sends a test notification
 * to each one using the web-push library with VAPID authentication.
 *
 * PREREQUISITES:
 *   npm install web-push
 *
 * GENERATE VAPID KEYS (if you don't have them):
 *   npx web-push generate-vapid-keys
 *
 * ENVIRONMENT VARIABLES (required):
 *   VAPID_PUBLIC  - Your VAPID public key
 *   VAPID_PRIVATE - Your VAPID private key
 *
 * USAGE:
 *   # Set environment variables first
 *   export VAPID_PUBLIC="your_public_key_here"
 *   export VAPID_PRIVATE="your_private_key_here"
 *
 *   # Run with default subscriptions file (.data/subscriptions.json)
 *   node scripts/test-send.js
 *
 *   # Or specify a custom path
 *   node scripts/test-send.js /path/to/subscriptions.json
 *
 * SUBSCRIPTIONS FILE FORMAT:
 *   [
 *     {
 *       "sub": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } },
 *       "createdAt": "2024-01-01T00:00:00.000Z"
 *     }
 *   ]
 *
 *   Or simpler format (direct subscription objects):
 *   [
 *     { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
 *   ]
 */
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;
if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('VAPID_PUBLIC and VAPID_PRIVATE must be set in env');
  process.exit(1);
}
webpush.setVapidDetails('mailto:you@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

const subsPath = process.argv[2] || path.resolve('./.data/subscriptions.json');
let list = [];
try { list = JSON.parse(fs.readFileSync(subsPath, 'utf8')); } catch (err) {
  console.error('Failed to read subscriptions file at', subsPath, err);
  process.exit(1);
}

async function run() {
  for (const entry of list) {
    const subscription = entry.sub || entry;
    try {
      await webpush.sendNotification(subscription, JSON.stringify({ title: 'Test habit', body: 'This is a test push' }));
      console.log('Push sent to', subscription.endpoint);
    } catch (err) {
      console.error('Failed to send push to', subscription.endpoint, err && err.statusCode ? 'status:'+err.statusCode : err);
    }
  }
}
run();
