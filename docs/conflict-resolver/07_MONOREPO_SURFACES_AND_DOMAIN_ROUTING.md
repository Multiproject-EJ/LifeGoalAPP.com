# Conflict Resolver — Monorepo Surfaces + Domain Routing Plan

## Goal
Keep a **single repo** while deploying two public surfaces:

1. `lifegoalapp.com` (main app)
2. `www.peacebetween.com` (lightweight invitee web surface)

Both surfaces share the same Supabase backend, auth project, and realtime channels.

---

## Recommended repository shape

```text
/apps
  /lifegoal-web            # existing main frontend (current root app can be migrated later)
  /peacebetween-web      # lightweight invitee surface
/packages
  /shared-contracts        # shared TS types and API payload contracts
```

> You do **not** need a second Git repo for this.
> Two deploy targets can point to different subpaths in one monorepo.

---

## Deployment model options

### Option A (recommended): one repo, two deploy projects
- Project 1 deploys `apps/lifegoal-web`
- Project 2 deploys `apps/peacebetween-web`
- Both projects read shared env var values for Supabase URL/anon key/project refs

Works on:
- Vercel (now, build validation)
- Netlify (recommended production host for `www.peacebetween.com`)
- Cloudflare Pages

### Option B: one deploy project, host-based routing
- Single deploy receives both domains and routes by Host header.
- More complex; avoid unless you specifically need single-artifact deploys.

---

## `www.peacebetween.com` DNS setup (Spaceship.com registrar)

Use this flow regardless of host:

1. Pick your hosting target for `peacebetween-web` (Vercel/Netlify/etc.).
2. In that host, add custom domain: `www.peacebetween.com`.
3. Copy the host-provided DNS target.
4. In Spaceship DNS zone for `peacebetween.com`, create/update:
   - **Type:** `CNAME`
   - **Name/Host:** `www`
   - **Value/Target:** provider target (examples below)
5. Remove conflicting `www` records (A/AAAA/CNAME duplicates).
6. Wait for DNS propagation and verify SSL is issued by host.

Common provider CNAME targets:
- Vercel: `cname.vercel-dns.com`
- Netlify: `<your-site>.netlify.app` (exact target shown in Netlify UI)
- Cloudflare Pages: `<project>.pages.dev` (or host-provided target)

### Netlify-specific note (chosen path)
- In Netlify, create a dedicated site for `peacebetween-web`.
- Set publish directory to that app’s build output.
- Add `www.peacebetween.com` as custom domain.
- Use Netlify-provided CNAME target in Spaceship DNS.

---

## What to do with apex (`peacebetween.com`)

Choose one:
- Redirect apex to `https://www.peacebetween.com` (recommended for simplicity), or
- Serve a small marketing page on apex and keep app on `www`.

If using redirect, configure either:
- registrar-level URL forward, or
- host-level redirect rule (preferred when available).

---

## Invite-link path contract

Keep invite links stable across hosts:
- `https://www.peacebetween.com/conflict/join?token=...`

Avoid embedding provider domains in generated URLs once custom domain is live.

---

## Migration sequence (safe)

1. Keep current app as-is.
2. Stand up `apps/peacebetween-web` deploy target.
3. Point `www.peacebetween.com` CNAME to that target.
4. Verify invite link join flow end-to-end.
5. Optionally migrate main app into `/apps/lifegoal-web` later.

---

## Minimal Netlify config (example)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

If `peacebetween-web` is moved into a subfolder, set `base` and `publish` to that app's paths.
