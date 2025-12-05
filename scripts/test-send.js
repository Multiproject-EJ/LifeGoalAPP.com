#!/usr/bin/env node
// Dev script: read stored subscriptions and send a test notification to each.
// Usage:
// 1) npm install web-push
// 2) export VAPID_PUBLIC="..." && export VAPID_PRIVATE="..."
// 3) node scripts/test-send.js    # reads ./.data/subscriptions.json
// Or: node scripts/test-send.js path/to/subscriptions.json
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
