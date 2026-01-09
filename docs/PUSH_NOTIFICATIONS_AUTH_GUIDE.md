# Push Notification Authentication Guide

## Overview
The push notification system uses three different authentication patterns to avoid header conflicts with Supabase tooling.

## Authentication Tiers

### 1. Public Endpoints (No Auth)

**Endpoints:**
- `GET /health` - System health check

**Purpose:** Allow anyone to check if the Edge Function is running and configured.

**Usage:**
```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/send-reminders/health');
const data = await response.json();
console.log(data.vapid_configured); // true/false
```

**No authentication required!**

### 2. Internal Endpoints (Custom Header)

**Endpoints:**
- `POST /cron` - Scheduled reminder job

**Purpose:** Protect internal operations from unauthorized access while avoiding Supabase's Authorization header interference.

**Authentication:** Uses `x-cron-secret` custom header

**Setup:**
1. Generate a strong secret:
   ```bash
   openssl rand -hex 32
   ```

2. Set in Supabase Edge Function secrets:
   ```bash
   supabase secrets set CRON_SECRET="your_generated_secret_here"
   ```

3. Configure CRON job to include the header:
   - In Supabase Dashboard → Database → Cron Jobs
   - Or via pg_cron:
     ```sql
     SELECT cron.schedule(
       'send-habit-reminders',
       '* * * * *',
       $$
       SELECT net.http_post(
         url := 'YOUR_SUPABASE_URL/functions/v1/send-reminders/cron',
         headers := jsonb_build_object(
           'x-cron-secret', 'YOUR_CRON_SECRET',
           'Content-Type', 'application/json'
         )
       );
       $$
     );
     ```

**Why custom header?**
- Supabase automatically includes/overrides `Authorization` header with JWT tokens
- Custom headers like `x-cron-secret` are not touched by Supabase
- Prevents header collision issues

### 3. User Endpoints (JWT Auth)

**Endpoints:**
- `GET /prefs` - Get user reminder preferences
- `PUT /prefs` - Update user reminder preferences
- `POST /subscribe` - Subscribe to push notifications
- `POST /log` - Log notification action
- `GET /habit-prefs` - Get per-habit preferences
- `PUT /habit-prefs` - Update per-habit preferences
- `GET /action-logs` - Get action logs
- `GET /analytics/summary` - Get analytics summary
- `GET /analytics/daily` - Get daily analytics

**Authentication:** Standard Supabase JWT (Authorization: Bearer)

**Usage:**
```javascript
const session = await supabase.auth.getSession();
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/send-reminders/prefs',
  {
    headers: {
      'Authorization': `Bearer ${session.data.session.access_token}`,
      'Content-Type': 'application/json'
    }
  }
);
```

## Troubleshooting

### "Missing authorization header" on /health
- **Problem:** Client is sending Authorization header to public endpoint
- **Solution:** Remove Authorization header from /health requests
- **Fix:** Update client to call /health without any auth headers

### "Invalid CRON secret" on /cron
- **Problem:** CRON_SECRET not set or incorrect
- **Solution:** Set CRON_SECRET in Supabase Edge Function secrets
- **Verify:** Check Supabase Dashboard → Edge Functions → Secrets

### "Unauthorized" on user endpoints
- **Problem:** Missing or invalid JWT token
- **Solution:** Ensure user is logged in and pass valid access_token
- **Check:** `await supabase.auth.getSession()` returns valid session

## Security Best Practices

1. **Never commit CRON_SECRET to git** - Use Supabase secrets
2. **Rotate CRON_SECRET periodically** - Update in Supabase and CRON config
3. **Keep JWT tokens short-lived** - Use Supabase's automatic refresh
4. **Monitor /health publicly** - No sensitive data exposed
5. **Log suspicious /cron attempts** - Alert on invalid secrets

## Testing

### Test Public Endpoint
```bash
curl https://your-project.supabase.co/functions/v1/send-reminders/health
# Should return: {"ok": true, "vapid_configured": true, "message": "..."}
```

### Test Internal Endpoint
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/send-reminders/cron \
  -H "x-cron-secret: YOUR_CRON_SECRET"
# Should return: {"success": true, "message": "...", "sent": 0}
```

### Test User Endpoint
```bash
curl https://your-project.supabase.co/functions/v1/send-reminders/prefs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Should return: {"user_id": "...", "timezone": "UTC", ...}
```

## Migration from Old System

If you're migrating from the old auth system:

1. **Update Edge Function code** - Deploy new version with custom header support
2. **Set CRON_SECRET** - Add to Supabase secrets
3. **Update CRON jobs** - Add x-cron-secret header
4. **Test /health** - Should work without auth
5. **Test /cron** - Should require x-cron-secret
6. **User endpoints** - No changes needed (still use JWT)

## FAQ

**Q: Why not use Authorization for /cron?**  
A: Supabase tooling automatically includes/overrides Authorization headers with JWT tokens, causing collisions.

**Q: Can I use a different custom header name?**  
A: Yes, but update both Edge Function code and CRON configuration. Recommended: `x-cron-secret`, `x-internal-key`, or `x-admin-secret`.

**Q: Is /health endpoint secure?**  
A: Yes - it only exposes whether VAPID keys are configured, no sensitive data.

**Q: How do I debug auth issues?**  
A: Check Supabase Edge Function logs for detailed error messages.
