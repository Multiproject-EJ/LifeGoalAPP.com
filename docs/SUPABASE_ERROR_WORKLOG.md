# Supabase Error Working Log

## Latest Diagnosis (Nov 16, 2025)
- **Observed error**: Account → Supabase diagnostics panel reports `Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`
- **Symptoms**: Supabase login screen renders, but Supabase itself shows no active session; automated test reports also mark "Credentials Configured" and "Session Active" as `No`.
- **Root cause**: The project uses the Vite build tool. Vite only exposes environment variables that start with the `VITE_` prefix at build time. Because `.env.local` was never created (or is missing these keys), the browser bundle ships placeholder strings (`<PUT_SUPABASE_URL>`, `<PUT_SUPABASE_ANON_KEY>`), so the SDK never receives your real Supabase project URL/key. Without those values Supabase rejects auth requests and the diagnostics UI halts before hitting the database.

## Immediate Fix
1. **Copy the template**: `cp .env.example .env.local`
2. **Paste your real credentials** (from your Supabase dashboard):
   ```bash
   VITE_SUPABASE_URL="https://muanayogiboxooftkyny.supabase.co"
   VITE_SUPABASE_ANON_KEY="<your anon key>"
   VITE_SUPABASE_REDIRECT_URL="https://www.lifegoalapp.com/auth/callback"
   VITE_VAPID_PUBLIC_KEY="<your existing push key>"
   ```
   > ⚠️ Never commit `.env.local` to Git. It is ignored via `.gitignore`.
3. **Restart the dev server/build** so the new variables are baked into the bundle: `npm run dev` (for local testing) or `npm run build && npm run preview` before deploying.
4. **Re-run the diagnostics test** from Account → Supabase Connection Test. You should now see:
   - Credentials Configured ✅
   - Session Active ✅ (after signing in)
   - Database Connected ✅ (sample query succeeds against `goals` table)

## Verification Checklist
| Step | Expected Result |
| --- | --- |
| Load `/auth/sign-in` | Supabase hosted auth appears (still works even before env fix) |
| Submit valid credentials | Supabase dashboard shows active session + refresh token |
| Account → "Run Supabase Test" | All checks pass; most recent goal title is returned |
| Create/Edit/Delete goal/habit | Changes persist in Supabase tables (verify via SQL editor) |

## Notes & Next Steps
- Any future environment (local, preview, production) must define the same four variables before building the app.
- If you rotate the anon key or URL, update `.env.local` (or the deployment platform's env vars) **before** redeploying so users are not forced back into demo mode.
- Keep this log updated whenever you troubleshoot Supabase connectivity so we can see what was tried and what worked.
