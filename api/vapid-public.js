/**
 * DEV-ONLY: VAPID Public Key Endpoint
 *
 * ⚠️  WARNING: This is a development-only helper endpoint.
 *    Do NOT use in production without proper security review.
 *    For production, consider:
 *    - Using environment-specific deployment
 *    - Adding rate limiting
 *    - Adding authentication if needed
 *
 * Returns the VAPID public key from environment variables.
 * The client needs this key to subscribe to push notifications.
 *
 * Environment variable required:
 *   VAPID_PUBLIC - Your VAPID public key (base64 URL-safe encoded)
 *
 * Usage:
 *   GET /api/vapid-public
 *
 * Response:
 *   { "publicKey": "BEl62iUYgUiv..." }
 *
 * Error (500):
 *   { "error": "VAPID_PUBLIC not set in environment" }
 */
export default function handler(req, res) {
  const publicKey = process.env.VAPID_PUBLIC || '';
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID_PUBLIC not set in environment' });
  }
  res.status(200).json({ publicKey });
}
