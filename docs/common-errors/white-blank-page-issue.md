# White Blank Page Issue

## Issue ID
`ERROR-001`

## Date First Reported
November 5, 2025

## Symptom
When visiting https://lifegoalapp.com/, the site displays a completely white/blank page instead of the expected LifeGoalApp interface.

## Root Cause History
This incident has occurred multiple times, each with a different underlying cause.

### ERROR-001 · November 5, 2025 — Invalid GitHub Pages workflow configuration
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

### ERROR-002 · November 7, 2025 — Theme bootstrap crashed when storage was unavailable
Browsers that block `localStorage` access (Safari Private Browsing, aggressive tracker blockers, some enterprise builds) threw a `DOMException` inside `src/scripts/ui-theme.js`. The script previously called `localStorage.getItem` / `setItem` without guards. Because this script executes before the React bundle is imported, the exception prevented the application from mounting and resulted in a blank page.

## Solution

### Fix for ERROR-001
Remove the invalid `cname` parameter from the deploy step in `.github/workflows/deploy.yml`:

```yaml
- name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v4
  # No 'with' section needed - the action handles everything automatically
```

### Fix for ERROR-002
Wrap theme preference persistence in safe accessors so the script no longer throws when storage is blocked:

```js
const safeStorage = (() => {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Theme preference storage is unavailable.', error);
    return null;
  }
})();

const getStoredTheme = () => {
  if (!safeStorage) return null;
  try {
    return safeStorage.getItem('lga-theme');
  } catch (error) {
    console.warn('Unable to read stored theme preference.', error);
    return null;
  }
};

const setStoredTheme = (value) => {
  if (!safeStorage) return;
  try {
    safeStorage.setItem('lga-theme', value);
  } catch (error) {
    console.warn('Unable to persist theme preference.', error);
  }
};
```

These helpers are used by `src/scripts/ui-theme.js` to apply and store theme preferences without blocking the rest of the bundle.

### How Custom Domain Works Correctly
The custom domain (lifegoalapp.com) is configured through the `CNAME` file, which is:
1. Located in `public/CNAME` in the source code
2. Automatically copied to `dist/CNAME` during the build process by Vite
3. Deployed to GitHub Pages along with other static assets
4. Used by GitHub Pages to configure the custom domain automatically

### Verification Steps
After deploying the fix:

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

4. **Validate Storage-Safe Bootstrapping**:
   - Open the site in a browser session where storage access is blocked (Safari Private Browsing or Chrome with third-party cookies disabled)
   - Confirm the page renders instead of throwing `DOMException: The operation is insecure.`
   - Check the console for the fallback warning `Theme preference storage is unavailable.` instead of uncaught errors

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
4. Add automated smoke tests that run the production bundle with storage disabled to catch regressions.

## Related Issues
This issue has occurred multiple times according to the problem statement. Common causes include:
- Invalid GitHub Actions workflow syntax
- Missing or incorrect CNAME file
- Build failures that weren't noticed
- Permission issues with GitHub Pages deployment
- DNS configuration problems (separate from this issue)
- Front-end bootstrapping errors that halt rendering before React mounts

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
6. **Service Worker Cache**: If the service worker is still serving stale assets, run `navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))` in the console and hard refresh.

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
- November 5, 2025 (ERROR-001)
- November 7, 2025 (ERROR-002)

## Status
✅ **RESOLVED** - Fix deployed and verified
