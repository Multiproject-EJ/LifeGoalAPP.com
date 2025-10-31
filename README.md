# LifeGoalAPP.com PWA Development Plan

LifeGoalApp will be delivered as a progressive web application (PWA) powered by Supabase. The mobile-first experience will offer an app-like interface, while desktop users get an expanded dashboard with richer insights.

## Phase Progress

- [x] **Phase 1 – App Shell Setup**: Bootstrap Vite + React TypeScript project, add initial styling, register a service worker, and ship the base PWA manifest & icons.
- [x] **Phase 2 – Supabase Integration**: Configure Supabase project, surface environment variables, and scaffold authentication/data helpers.
  - [x] Document Supabase environment variables and ship typed client factory.
  - [x] Provide reusable auth provider with sign-in/out helpers.
  - [x] Stub goal and habit data-access helpers with Supabase queries.
  - [x] Connect Supabase auth UI to Supabase-hosted instance and handle onboarding flows.
- [ ] **Phase 3 – Core Features**: Implement goals, habits, dashboard, vision board, and check-ins experiences.
  - [x] Launch the Goals & Habits workspace with Supabase-backed goal capture and status overview.
  - [x] Deliver the Daily Habit Tracker with Supabase-backed completion toggles and a refreshable daily checklist.
  - [x] Ship the Dashboard & Calendar view with habit completion analytics and upcoming goal milestones.
  - [x] Curate the Vision Board with Supabase Storage uploads, gallery sorting controls, and entry deletion.
  - [x] Launch the Life Wheel Check-ins with Supabase-backed history and radar visualizations.
- [x] **Phase 4 – Offline & Push Enhancements**: Harden offline caching, background sync, and push notification flows.
  - [x] Harden Supabase data reads with a network-first cache in the service worker for resilient offline reloads.
  - [x] Queue Supabase write operations with Background Sync so habit updates persist after reconnection.
  - [x] Deliver configurable push notification subscriptions for habit reminders and check-in nudges.

> Each phase builds on the previous one. Update this checklist as new capabilities are delivered.

## Getting Started (Phase 1)

### Prerequisites
- Node.js 18+
- npm 9+

### Installation & Local Development

```bash
npm install
npm run dev
```

The development server opens at `http://localhost:5173`. The service worker only registers in production builds; use `npm run build && npm run preview` to test the offline caching strategy locally.

Environment variables for Supabase (introduced in Phase 2) live in `.env.local`; see `.env.example` for the required keys. In
Phase 4, add your public VAPID key as `VITE_VAPID_PUBLIC_KEY` so the client can request push subscriptions.

### Supabase Demo Mode

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not configured the PWA now boots in a demo mode that mirrors the
Supabase schema with locally persisted sample data. The demo session signs in as `demo@lifegoalapp.com` and seeds goals,
habits, vision board imagery, notification preferences, and life wheel check-ins.

- Data is stored in `localStorage` (`lifegoalapp-demo-db-v1`) so edits survive page refreshes while you iterate on the UI.
- Vision board uploads fall back to in-browser Data URLs when Supabase Storage is unavailable.
- Connect your Supabase credentials at any time to switch from demo storage to your live project without code changes.

## Architecture Overview
- **Framework**: Modern JavaScript framework with PWA support (React + Vite) using responsive design to tailor layouts for mobile and desktop.
- **PWA Fundamentals**: Includes `manifest.webmanifest`, registers a service worker, and implements install prompts for an app-like UX.
- **Backend**: Supabase provides Auth, Postgres database, REST APIs, and Storage. Environment variables supply the Supabase URL and anon key.
- **Security**: Enable Row-Level Security (RLS) on every table so users only access their own records.

## Data Model
Supabase Postgres tables, each including a `user_id` column tied to the authenticated Supabase user.

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `goals` | Store user goals | `id`, `user_id`, `title`, `description`, `created_at`, `target_date` |
| `habits` | Habits linked to goals | `id`, `goal_id`, `name`, `frequency`, `schedule` |
| `habit_logs` | Daily habit completion | `id`, `habit_id`, `date`, `completed` |
| `vision_images` | Vision board entries | `id`, `user_id`, `image_path`, `caption`, `created_at` |
| `checkins` | Life wheel check-ins | `id`, `user_id`, `date`, `scores` (JSON) |

## Feature Breakdown

### 1. Setup Tab (Goals, Habits, Routines)
- Capture goals and associated habits/routines via forms.
- Insert goal and habit records through Supabase client SDK calls.
- Queue write operations via Background Sync when offline.

### 2. Daily Habit Tracker
- List today's habits with toggles for completion.
- Create/remove `habit_logs` rows for daily tracking.
- Optimistically update UI offline and sync when reconnected.

### 3. Dashboard & Calendar
- Calendar view showing habit completion and upcoming routines.
- Progress analytics using charts (weekly/monthly summaries).
- Integrate reminders delivered through push notifications.

### 4. Vision Board
- Upload inspirational images to Supabase Storage.
- Store metadata in `vision_images` and render a responsive gallery.
- Allow ordering and deletion of entries.

### 5. Check-Ins (Life Wheel)
- Present questionnaire for rating life categories 1–10.
- Persist responses in `checkins` and visualize with a radar chart.
- Show historical trends over time.

## Offline & Sync Strategy
- Service worker caches the application shell and static assets (cache-first or network-first).
- API GET requests use a NetworkFirst strategy with cache fallback.
- Workbox Background Sync queues POST/PATCH requests to Supabase when offline and retries after connectivity returns.

## Push Notifications
- Service worker implements the Web Push API using VAPID keys.
- Clients subscribe after permission; server-side or Supabase Edge Functions send reminders (habit prompts, check-in alerts).
- Notifications appear even when the PWA is closed.

## Development Workflow
1. Initialize repo with framework scaffolding, manifest, and service worker. ✅
2. Configure Supabase project, tables, and RLS policies.
3. Integrate Supabase auth session handling in the client.
4. Build UI components for each feature area (forms, dashboards, charts, galleries).
5. Implement offline caching, background sync, and push subscription handling.
6. Test offline behavior and responsiveness on mobile/desktop.
7. Deploy over HTTPS (Vercel, Netlify, etc.), using production Supabase credentials.

## Deployment

- Pushes to the `main` branch automatically trigger the **Deploy static site** workflow.
- The workflow installs dependencies, builds the Vite project, and publishes the `dist/` directory to the `gh-pages` branch via `peaceiris/actions-gh-pages`.
- GitHub Pages serves the freshly built assets from that branch, keeping the production site (including `lifegoalapp.com`) in sync with the repository.
- If you need to redeploy without new commits, run the workflow manually from the **Actions** tab using the **Run workflow** button.

## Latest Update

- Introduced a Goals & Habits workspace that lets authenticated users capture new goals, review upcoming target dates, and
  refresh live data from Supabase.
- Expanded the Supabase authentication center with sign-in, sign-up, magic-link, and password-reset flows. Added a guided
  onboarding card so freshly confirmed users can set a display name and mark onboarding complete before creating their first
  goal.
- Shipped a daily habit tracker that loads a user’s scheduled habits, syncs completion state with Supabase, and lets them log
  progress even after refreshing the page.
- Debuted a progress dashboard that visualizes weekly habit completion rates, a monthly calendar heatmap, and the next goal
  milestones so teams can monitor momentum at a glance.
- Introduced a Vision Board workspace that uploads imagery to Supabase Storage, persists captions, lets teams sort the gallery,
  and removes entries that are no longer relevant.
- Rolled out Life Wheel check-ins with Supabase-backed history, a balanced radar chart visual, and quick score presets to
  help teams reflect on momentum shifts.
- Hardened offline habit logging with a service-worker-powered background sync queue that stores Supabase writes when
  disconnected, replays them once back online, and notifies users from the habit tracker when syncing succeeds or needs more
  time.
- Debuted configurable push notification preferences so authenticated users can opt into habit reminders and life wheel
  check-in nudges, store their time zone and preferred reminder time, and manage their push subscription via the PWA.
- Added a Supabase-aligned demo dataset fallback so the full workspace works offline with seeded goals, habits, check-ins,
  notifications, and a locally persisted vision board until real Supabase credentials are provided.

## References
- MDN Web Docs: PWAs, Service Workers, Background Sync, Push API.
- Supabase Documentation: Auth, Database, Storage, Edge Functions, RLS.
- Workbox Guides: Caching strategies, background sync setup.
