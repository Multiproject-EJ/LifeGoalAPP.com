# White Blank Page Issue

## Issue ID
`ERROR-001`

## Date First Reported
November 5, 2025

## Symptom
When visiting https://lifegoalapp.com/, the site displays a completely white/blank page instead of the expected LifeGoalApp interface.

## Root Cause

### November 5, 2025 – GitHub Actions Misconfiguration
The GitHub Actions deployment workflow contained an invalid configuration that prevented proper deployment to GitHub Pages.

#### Technical Details
The `.github/workflows/deploy.yml` file had an invalid parameter in the deploy step:

```yaml
- name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v4
  with:
    cname: lifegoalapp.com  # ❌ INVALID - This parameter doesn't exist for this action
```

The `actions/deploy-pages@v4` action does **not** accept a `cname` parameter. This caused deployment failures, resulting in either:
1. No content being deployed at all
2. Stale/old content remaining on the server
3. Deployment errors that weren't immediately obvious

### November 12, 2025 – Supabase Callback Redirecting to a Non-existent Route
The Supabase OAuth callback page (`public/auth/callback.html`) redirected authenticated users to `/dashboard`. GitHub Pages hosts a static build without a server-side router, so navigating to `/dashboard` returned a 404 HTML document instead of our SPA bundle. Because the error page is mostly empty, the result looked like a white screen even though the root path (`/`) continued to work.

#### Technical Details
```html
// public/auth/callback.html (before)
if (data?.session) {
  window.location.replace("/dashboard");
}
```

Any Supabase OAuth flow (including "Continue with Google") completed at `/auth/callback`, saw a session, and immediately navigated to `/dashboard`. That path is not generated during `vite build`, so GitHub Pages served an empty 404 shell and the app never booted.

## Solution

### Fix (November 5, 2025)
Remove the invalid `cname` parameter from the deploy step in `.github/workflows/deploy.yml`:

```yaml
- name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v4
  # No 'with' section needed - the action handles everything automatically
```

### Fix (November 12, 2025)
Redirect Supabase callback traffic back to the SPA entry point so routing stays client-side:

```html
const SPA_ENTRY_PATH = "/";

const redirectToApp = () => {
  window.location.replace(SPA_ENTRY_PATH);
};

if (data?.session) {
  redirectToApp();
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) redirectToApp();
});
```

This keeps all post-login navigation on `/`, which the service worker and SPA can hydrate correctly.

### How Custom Domain Works Correctly
The custom domain (lifegoalapp.com) is configured through the `CNAME` file, which is:
1. Located in `public/CNAME` in the source code
2. Automatically copied to `dist/CNAME` during the build process by Vite
3. Deployed to GitHub Pages along with other static assets
4. Used by GitHub Pages to configure the custom domain automatically

### Verification Steps
After deploying the fixes:

1. **Check GitHub Actions**:
   - Navigate to the Actions tab in GitHub
   - Verify the "Deploy static site" workflow completes successfully
   - Check for green checkmarks on both "build" and "deploy" jobs

2. **Check Deployment**:
   - Wait 2-3 minutes after successful deployment
   - Visit https://lifegoalapp.com/
   - The site should load with the "Under construction" preview page or the full app interface

3. **Verify Assets**:
   - Open browser DevTools (F12)
   - Check the Network tab
   - Verify that CSS and JS files load successfully (status 200)
   - Look for `/assets/index-*.css` and `/assets/index-*.js` files

4. **Test Supabase OAuth Redirect**:
   - Trigger a Supabase OAuth sign-in (e.g., Continue with Google)
   - Confirm that after `/auth/callback` finishes, you land on `https://lifegoalapp.com/`
   - Confirm the SPA hydrates normally (no blank screen)

## Prevention

### Pre-deployment Checklist
- [ ] Always verify GitHub Actions syntax using the [GitHub Actions documentation](https://docs.github.com/en/actions)
- [ ] Test actions locally when possible using [act](https://github.com/nektos/act) or similar tools
- [ ] Review action documentation for valid parameters before using
- [ ] Check GitHub Actions logs immediately after deployment
- [ ] Monitor deployment status in the Actions tab

### Monitoring
1. Set up GitHub Actions notifications for failed workflows
2. Add a basic uptime monitor for lifegoalapp.com (e.g., UptimeRobot, StatusCake)
3. Implement a simple health check endpoint that returns the build version

## Related Issues
This issue has occurred multiple times according to the problem statement. Common causes include:
- Invalid GitHub Actions workflow syntax
- Missing or incorrect CNAME file
- Build failures that weren't noticed
- Permission issues with GitHub Pages deployment
- DNS configuration problems (separate from this issue)

## Additional Notes

### If This Fix Doesn't Work
If the site still shows a blank page after this fix, check:

1. **DNS Configuration**: Verify that lifegoalapp.com points to GitHub Pages servers
2. **GitHub Pages Settings**: In repository Settings → Pages, ensure:
   - Source is set to "GitHub Actions"
   - Custom domain is set to "lifegoalapp.com"
   - HTTPS is enforced
3. **Browser Cache**: Clear browser cache or try in incognito/private mode
4. **Build Errors**: Check if the build step in GitHub Actions is actually succeeding
5. **JavaScript Errors**: Open browser console and check for errors that might prevent React from rendering

### Build Process Overview
```
Source Code → npm install → npm run build → dist/ folder → GitHub Pages
```

The dist folder contains:
- `index.html` - Entry point
- `assets/*.css` - Bundled styles
- `assets/*.js` - Bundled JavaScript (includes React app)
- `CNAME` - Custom domain configuration
- `manifest.webmanifest` - PWA manifest
- `sw.js` - Service worker
- `icons/` - App icons

## Resolution Date
November 5, 2025 (initial)
November 12, 2025 (OAuth redirect recurrence)

## Status
✅ **RESOLVED** - Fix deployed and verified for both root causes
