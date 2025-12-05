export default function handler(req, res) {
  // Dev helper: returns the public VAPID key from env.
  // NOTE: VAPID_PUBLIC must be set in your deployment env (Vercel / Netlify / etc).
  const publicKey = process.env.VAPID_PUBLIC || '';
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID_PUBLIC not set in environment' });
  }
  res.status(200).json({ publicKey });
}
