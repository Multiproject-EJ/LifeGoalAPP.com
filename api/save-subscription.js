/**
 * DEV-ONLY: Save Push Subscription Endpoint
 *
 * ⚠️  WARNING: This is a development-only helper endpoint.
 *    Do NOT use in production!
 *
 *    Problems with this approach in production:
 *    - Serverless environments have ephemeral filesystems
 *    - Files are not persisted between invocations
 *    - No authentication or user association
 *    - No data validation beyond basic checks
 *
 *    For production, use a proper database:
 *    - Supabase / PostgreSQL
 *    - MongoDB Atlas
 *    - DynamoDB
 *    - Firebase Firestore
 *
 * This endpoint accepts a PushSubscription JSON object and saves it
 * to a local file for development/testing purposes.
 *
 * Environment:
 *   Works best with local dev server (e.g., Vercel dev, Next.js dev)
 *
 * Usage:
 *   POST /api/save-subscription
 *   Content-Type: application/json
 *   Body: { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
 *
 * Response (201):
 *   { "ok": true }
 *
 * Error (400):
 *   { "error": "Invalid subscription object" }
 *
 * Error (405):
 *   { "error": "Method not allowed" }
 *
 * Error (500):
 *   { "error": "Failed to persist subscription" }
 */
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Invalid subscription object' });

  // Development-only persistence. Serverless environments may not persist files between invocations.
  // Replace with a DB in production (Supabase, Postgres, DynamoDB, etc.).
  const dataDir = path.resolve('./.data');
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const file = path.join(dataDir, 'subscriptions.json');
    let list = [];
    try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
      // Log the error for debugging; file might not exist or contain invalid JSON
      if (e.code !== 'ENOENT') console.warn('Could not parse existing subscriptions file:', e.message);
      list = [];
    }
    list.push({ sub, createdAt: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(list, null, 2));
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to save subscription', err);
    return res.status(500).json({ error: 'Failed to persist subscription' });
  }
}
