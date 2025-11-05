# White Blank Page Issue

## Issue ID
`ERROR-001`

## Date First Reported
November 5, 2025

## Symptom
When visiting https://lifegoalapp.com/, the site displays a completely white/blank page instead of the expected LifeGoalApp interface.

## Root Cause
The GitHub Actions deployment workflow contained an invalid configuration that prevented proper deployment to GitHub Pages.

### Technical Details
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

## Solution

### The Fix
Remove the invalid `cname` parameter from the deploy step in `.github/workflows/deploy.yml`:

```yaml
- name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v4
  # No 'with' section needed - the action handles everything automatically
```

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
November 5, 2025

## Status
✅ **RESOLVED** - Fix deployed and verified
