import fs from 'fs';
import path from 'path';

/*
  DEV ONLY endpoint: persists incoming PushSubscription objects to ./.data/subscriptions.json.
  DO NOT use this persistence in production—serverless filesystems may be ephemeral.
  Replace with a proper DB (Supabase/Postgres/DynamoDB) for production.
*/
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Invalid subscription object' });

  const dataDir = path.resolve('./.data');
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const file = path.join(dataDir, 'subscriptions.json');
    let list = [];
    try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { list = []; }
    list.push({ sub, createdAt: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(list, null, 2));
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to save subscription', err);
    return res.status(500).json({ error: 'Failed to persist subscription' });
  }
}
