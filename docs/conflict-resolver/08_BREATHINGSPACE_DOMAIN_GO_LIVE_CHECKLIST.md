# `www.breathingspace.com` Go-Live Checklist

## Pre-flight
- [ ] Deploy target for breathing-space web app is up and reachable on provider preview domain.
- [ ] Supabase env vars are set in deploy target.
- [ ] Invite join route exists: `/conflict/join`.
- [ ] Invite token redemption flow tested in preview.

## DNS (Spaceship)
- [ ] Add `CNAME` for host `www` pointing to host-provided target.
- [ ] Remove conflicting `www` records.
- [ ] Keep TTL low during migration window.
- [ ] Confirm DNS propagation via `dig`/dnschecker.

## SSL + domain verification
- [ ] Domain marked verified in hosting provider dashboard.
- [ ] Certificate provisioned for `www.breathingspace.com`.
- [ ] HTTPS reachable without warnings.

## Flow validation
- [ ] Open an invite link with token from real email.
- [ ] Join succeeds and session scope is enforced.
- [ ] Non-invited access is denied.
- [ ] Expired/revoked token behavior verified.

## Post-cutover
- [ ] Apex `breathingspace.com` redirects to `www` (or intentionally serves landing page).
- [ ] Analytics events visible for join, stage progress, and agreement completion.
- [ ] Rollback plan documented (switch CNAME back to previous target if needed).

