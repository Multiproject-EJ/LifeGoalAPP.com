# LifeGoalAPP.com PWA Development Plan

LifeGoalApp will be delivered as a progressive web application (PWA) powered by Supabase. The mobile-first experience will offer an app-like interface, while desktop users get an expanded dashboard with richer insights.

## Live Development Preview

- `LifeGoalAPP.com` now serves the Vite build "live for development purposes" so stakeholders can track progress as we iterate.
- Visitors land on a polished "site under construction" overlay that includes roadmap context, an email notify form, and a hidden continue button for internal walkthroughs.

## Phase Progress

- [x] **Phase 1 – App Shell Setup**: Bootstrap Vite + React TypeScript project, add initial styling, register a service worker, and ship the base PWA manifest & icons.
- [x] **Phase 2 – Supabase Integration**: Configure Supabase project, surface environment variables, and scaffold authentication/data helpers.
  - [x] Document Supabase environment variables and ship typed client factory.
  - [x] Provide reusable auth provider with sign-in/out helpers.
  - [x] Stub goal and habit data-access helpers with Supabase queries.
  - [x] Connect Supabase auth UI to Supabase-hosted instance and handle onboarding flows.
- [x] **Phase 3 – Core Features**: Implement goals, habits, dashboard, vision board, and check-ins experiences.
  - [x] Launch the Goals & Habits workspace with Supabase-backed goal capture and status overview.
  - [x] Deliver the Daily Habit Tracker with Supabase-backed completion toggles and a refreshable daily checklist.
  - [x] Surface habit streak insights (current + longest) in the daily tracker with a Supabase-aligned demo fallback.
  - [x] Ship the Dashboard & Calendar view with habit completion analytics and upcoming goal milestones.
  - [x] Curate the Vision Board with Supabase Storage uploads, gallery sorting controls, and entry deletion.
  - [x] Launch the Life Wheel Check-ins with Supabase-backed history and radar visualizations.
  - [x] Spotlight life wheel trend insights so wins and dips stand out between recent check-ins.
  - [x] Enable inline goal editing and deletion so Supabase and demo workspaces stay in sync.
- [x] Layer in goal progress notes and status tags for weekly reviews.
- [x] Surface a goal health snapshot on the dashboard that highlights at-risk work and recent wins.
- [x] Draft a weekly focus digest that turns goal health insights into next-step recommendations.
- [x] Add quick goal status filters in the workspace so teams can zero in on wins, risks, or off-track work.
- [x] **Phase 4 – Offline & Push Enhancements**: Harden offline caching, background sync, and push notification flows.
  - [x] Harden Supabase data reads with a network-first cache in the service worker for resilient offline reloads.
  - [x] Queue Supabase write operations with Background Sync so habit updates persist after reconnection.
  - [x] Deliver configurable push notification subscriptions for habit reminders and check-in nudges.
- [ ] **Phase 5 – Reflection & Coaching Enhancements**: Transform weekly insights into coaching-ready action plans.
- [x] Launch the Goal Reflection Journal with confidence scoring and highlight/challenge capture.
  - [x] Generate AI-assisted follow-up prompts from recent reflections.
  - [x] Chart confidence trends across months so teams can spot momentum shifts per goal.

> Each phase builds on the previous one. Update this checklist as new capabilities are delivered.

## Design System

LifeGoalApp features a modern glassmorphic design system with light/dark themes and reusable components.

- 📖 **Developer Guide**: See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for component documentation and usage examples
- 📋 **Implementation Plan**: See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for step-by-step migration checklist
- 🎨 **Example Page**: Check [/examples/dashboard-example.html](./examples/dashboard-example.html) for a working demo

### Key Features
- **Glassmorphic UI**: Frosted glass surfaces with backdrop blur effects
- **Light/Dark Themes**: Automatic theme detection with manual toggle
- **Responsive Grid**: Mobile-first design (1 col → 2 cols → 3 cols)
- **Reusable Components**: Cards, buttons, toggles, tabs, modals, and more
- **Interactive Widgets**: Draggable dashboard cards with smooth animations
- **Accessibility**: WCAG AA compliant with keyboard navigation support

### Quick Start
Add to your HTML page:
```html
<link rel="stylesheet" href="/src/styles/theme.css">
<script defer src="/src/scripts/ui-theme.js"></script>
<script defer src="/src/scripts/ui-components.js"></script>
```

## Troubleshooting

Having issues? Check the [Common Error Database](./docs/common-errors/README.md) for solutions to frequently encountered problems.

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

#### Where to put your Supabase credentials

- **Copy the template**: `cp .env.example .env.local`
- **Fill in your real project values** before starting the dev server or running `npm run build`:
  ```bash
  VITE_SUPABASE_URL="https://<your-project>.supabase.co"
  VITE_SUPABASE_ANON_KEY="<your anon key>"
  VITE_SUPABASE_REDIRECT_URL="https://www.lifegoalapp.com/auth/callback"
  VITE_VAPID_PUBLIC_KEY="<your push key>"
  ```
- This repo uses [Vite](https://vitejs.dev/), which only exposes variables that start with the `VITE_` prefix to the browser. If these are missing, the app automatically falls back to demo mode and the **Account → Supabase Connection Test** panel will report `Supabase credentials not configured`.
- `.env.local` is already gitignored—never commit your real keys to the repository.

### Supabase Demo Mode

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not configured the PWA now boots in a demo mode that mirrors the
Supabase schema with locally persisted sample data. The demo session signs in as `demo@lifegoalapp.com` and seeds goals,
habits, vision board imagery, notification preferences, and life wheel check-ins.

- Data is stored in `localStorage` (`lifegoalapp-demo-db-v1`) so edits survive page refreshes while you iterate on the UI.
- Goal reflections mirror the Supabase journal schema so confidence scores and notes persist locally.
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
| `goal_reflections` | Weekly reflection journal entries | `id`, `goal_id`, `user_id`, `entry_date`, `confidence`, `highlight`, `challenge`, `created_at` |
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

### 6. Goal Reflection Journal
- Capture weekly highlights, challenges, and confidence scores tied to each goal.
- Persist reflections in `goal_reflections` so coaching notes sync across devices.
- Lay the groundwork for AI-assisted prompts and long-range confidence analytics.

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
- Added inline goal editing and deletion controls so teams can refine plans without leaving the workspace, whether in demo or
  Supabase-backed mode.
- Debuted a progress dashboard that visualizes weekly habit completion rates, a monthly calendar heatmap, and the next goal
  milestones so teams can monitor momentum at a glance.
- Introduced a Vision Board workspace that uploads imagery to Supabase Storage, persists captions, lets teams sort the gallery,
  and removes entries that are no longer relevant.
- Rolled out Life Wheel check-ins with Supabase-backed history, a balanced radar chart visual, and quick score presets to
  help teams reflect on momentum shifts.
- Realigned life wheel categories with the Supabase schema and introduced a trend insights card that highlights gains,
  dips, and steady areas between the latest check-ins.
- Activated AI-assisted follow-up prompts that translate recent reflections into coaching-ready action plans, with a
  Supabase Edge Function hook and a Supabase-aligned demo fallback for local development.
- Hardened offline habit logging with a service-worker-powered background sync queue that stores Supabase writes when
  disconnected, replays them once back online, and notifies users from the habit tracker when syncing succeeds or needs more
  time.
- Debuted configurable push notification preferences so authenticated users can opt into habit reminders and life wheel
  check-in nudges, store their time zone and preferred reminder time, and manage their push subscription via the PWA.
- Added a Supabase-aligned demo dataset fallback so the full workspace works offline with seeded goals, habits, check-ins,
  notifications, and a locally persisted vision board until real Supabase credentials are provided.
- Bootstrapped a Supabase-authenticated Vision Board tab with the new scaffolded canvas, prompts, and build checklist ready for
  the next implementation phases.
- Layered in weekly goal progress notes and status tags so reviews surface On Track, At Risk, Off Track, and Achieved
  states with notes synced across Supabase and the local demo store.
- Highlighted current and longest habit streaks in the daily tracker, complete with rest-day context and demo data parity
  so developers can iterate without live Supabase credentials.
- Added a goal health snapshot card to the dashboard that visualizes status distribution, calls out at-risk items, and
  surfaces the latest progress notes directly from demo or Supabase data.
- Drafted a weekly focus digest that surfaces prioritized next steps, momentum boosts, and celebration prompts based on
  goal health in either Supabase or demo mode so weekly planning always has actionable guidance.
- Delivered goal status filters in the Goals & Habits workspace, complete with counts, so it’s easy to isolate on-track,
  at-risk, off-track, or achieved milestones when prioritizing weekly action.
- Introduced a Goal Reflection Journal that stores weekly highlights, challenges, and confidence scores with Supabase and
  demo parity to power future coaching prompts and trend analytics.
- Charted monthly confidence trends inside the reflection journal with a Supabase-aligned fallback dataset so teams can
  spot wins, dips, and steady momentum before adding live credentials.
- Added a development-only under construction overlay to the public domain with an email capture form, work-in-progress badge, glass blur effect, and a tucked-away continue button for internal walkthroughs.

## References
- MDN Web Docs: PWAs, Service Workers, Background Sync, Push API.
- Supabase Documentation: Auth, Database, Storage, Edge Functions, RLS.
- Workbox Guides: Caching strategies, background sync setup.
