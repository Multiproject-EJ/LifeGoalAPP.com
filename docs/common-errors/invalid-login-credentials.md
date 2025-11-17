# Invalid Login Credentials After Vercel Migration

## Issue ID
ERROR-002

## Date First Reported
2025-11-18

## Symptom
Users attempting to sign in with known-good email/password combinations immediately receive the Supabase error `Invalid login credentials`. The Supabase Connection Test reports that credentials are configured, but authentication still fails.

## Root Cause
The Vercel project used Next.js-style environment variable names (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SUPABASE_REDIRECT_URL`). The LifeGoalApp Vite bundle and the generated `public/assets/supaClient.js` previously only looked for `VITE_*` variables, so the production build silently fell back to the checked-in default credentials. Those defaults point at an older Supabase project without matching user accounts, so every sign-in attempt hits the wrong backend and fails with `invalid_grant`.

### Technical Details
- `vite.config.ts` and `vite.preview.config.ts` only exposed the `VITE_` prefix to `import.meta.env`.
- `src/lib/supabaseClient.ts` and `scripts/generate-supa-client.mjs` read only `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- Vercel populated `NEXT_PUBLIC_*` variables, leaving the `VITE_*` counterparts undefined.
- The auth UI therefore contacted the fallback Supabase project from `supabase/defaultCredentials.json` and rejected valid logins.

## Solution

### The Fix
1. Update both Vite configs to set `envPrefix: ['VITE_', 'NEXT_PUBLIC_']` so either naming convention is bundled at build time.
2. Teach `src/lib/supabaseClient.ts` and `scripts/generate-supa-client.mjs` to read from the `NEXT_PUBLIC_*` variables before falling back to defaults.
3. Document the new option in `.env.example`, `README.md`, and `SUPABASE_READINESS_REPORT.md` so deploys on Vercel know they can keep their existing environment names.
4. Redeploy the site (or run `npm run build && npm run preview`) after confirming the `NEXT_PUBLIC_*` values are present.

### Verification Steps
1. Run `npm run build` locally or trigger a Vercel deploy to regenerate `supaClient.js`.
2. Open the deployed site and navigate to **Account → Supabase Connection Test**.
3. Verify `Credentials Configured` and `Session Active` both show ✅ after signing in.
4. Attempt to log in with the affected account—the form should now succeed.

## Prevention
- When migrating hosting providers, confirm that whichever environment variable names you use are supported by the toolchain. LifeGoalApp now supports both `VITE_` and `NEXT_PUBLIC_`, so prefer one convention and stick with it.
- Keep `.env.example` in sync with any new naming conventions so teammates configure their environments correctly.

## Related Issues
- [docs/SUPABASE_ERROR_WORKLOG.md](../SUPABASE_ERROR_WORKLOG.md) entry dated 2025-11-18 documents the same root cause.

## Additional Notes
- The fallback credentials remain as a safety net, but operators should always define real environment variables for the project they intend to use.

## Resolution Date
2025-11-18

## Status
✅ RESOLVED
