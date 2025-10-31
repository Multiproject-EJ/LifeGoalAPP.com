# LifeGoalAPP.com PWA Development Plan

LifeGoalApp will be delivered as a progressive web application (PWA) powered by Supabase. The mobile-first experience will offer an app-like interface, while desktop users get an expanded dashboard with richer insights.

## Phase Progress

- [x] **Phase 1 – App Shell Setup**: Bootstrap Vite + React TypeScript project, add initial styling, register a service worker, and ship the base PWA manifest & icons.
- [ ] **Phase 2 – Supabase Integration**: Configure Supabase project, surface environment variables, and scaffold authentication/data helpers.
  - [x] Document Supabase environment variables and ship typed client factory.
  - [x] Provide reusable auth provider with sign-in/out helpers.
  - [x] Stub goal and habit data-access helpers with Supabase queries.
  - [ ] Connect Supabase auth UI to Supabase-hosted instance and handle onboarding flows.
- [ ] **Phase 3 – Core Features**: Implement goals, habits, dashboard, vision board, and check-ins experiences.
- [ ] **Phase 4 – Offline & Push Enhancements**: Harden offline caching, background sync, and push notification flows.

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

Environment variables for Supabase (introduced in Phase 2) live in `.env.local`; see `.env.example` for the required keys.

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

## References
- MDN Web Docs: PWAs, Service Workers, Background Sync, Push API.
- Supabase Documentation: Auth, Database, Storage, Edge Functions, RLS.
- Workbox Guides: Caching strategies, background sync setup.
