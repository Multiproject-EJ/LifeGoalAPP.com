# Feedback Feature Voting Investigation

Date: 2026-05-21  
Status: Investigation only — no UI behavior changes, feature-gating changes, Island Run/gameplay state changes, payments, or new migrations.

## Executive summary

- Settings → Feedback currently lives in `src/features/account/MyAccountPanel.tsx` as a “Feedback & Support” card that opens `CaseSubmissionModal` with `caseType="feedback"`.
- A structured feature-voting backend already exists: `public.feature_votes` is created by `supabase/migrations/0239_feature_votes.sql`, and `src/services/featureVotes.ts` reads/upserts votes.
- Existing future-feature voting is currently attached to `FeaturePreviewOverlay`, not to the Settings feedback card. The overlay stores one vote row per authenticated user per feature and can include optional suggestion text.
- `src/config/featureAvailability.ts` is already the right source of truth for feature names, descriptions, statuses, surfaces, categories, short pitches, and `votingEnabled` metadata.
- Recommended MVP: add a small “Vote on future features” panel inside the existing Settings → Feedback area that lists voting-enabled demo/coming-soon/preview-only features from `featureAvailabilityRegistry`, reuses `feature_votes`, and optionally links to the existing freeform feedback/support case flow.

## Existing files/components found

### Settings → Feedback entry points

- `src/App.tsx`
  - Desktop/main workspace renders `MyAccountPanel` for Settings (`src/App.tsx:3335`).
  - Mobile menu has a Feedback & Support submenu with separate Feedback and Support actions (`src/App.tsx:1016-1027`, `src/App.tsx:2576-2581`, `src/App.tsx:4078-4102`).
  - Mobile feedback opens `CaseSubmissionModal` with `caseType="feedback"` and `sourceSurface="mobile_menu_overlay"` (`src/App.tsx:4878-4884`, `src/App.tsx:5265-5271`).

- `src/features/account/MyAccountPanel.tsx`
  - Settings cards live in `MyAccountPanel`.
  - Feedback & Support card appears under the account/settings content and opens feedback/support modals (`src/features/account/MyAccountPanel.tsx:750-764`).
  - Feedback modal is `CaseSubmissionModal` with `caseType="feedback"` and `sourceSurface="account_panel"` (`src/features/account/MyAccountPanel.tsx:989-995`).
  - Existing admin tools can open `AdminInboxPanel` for feedback/support triage (`src/features/account/MyAccountPanel.tsx:768-780`, `src/features/account/MyAccountPanel.tsx:933-939`).

- `src/features/cases/CaseSubmissionModal.tsx`
  - Generic feedback/support modal.
  - Feedback categories: bug, improvement, feature request, other (`src/features/cases/CaseSubmissionModal.tsx:21-26`).
  - Feature areas are hard-coded and broad, not derived from `featureAvailability.ts` (`src/features/cases/CaseSubmissionModal.tsx:35-46`).
  - Submits to support-case tables through `createCaseThread()` (`src/features/cases/CaseSubmissionModal.tsx:95-109`).

- `src/features/cases/MyCasesPanel.tsx`
  - User-visible request timeline for feedback/support cases (`src/features/cases/MyCasesPanel.tsx:111-181`).

- `src/features/admin/AdminInboxPanel.tsx`
  - Admin-only feedback/support inbox, filterable by case type and `metadata.feature_area` (`src/features/admin/AdminInboxPanel.tsx:21-80`, `src/features/admin/AdminInboxPanel.tsx:242-280`).

### Existing future-feature vote UI

- `src/components/FeaturePreviewOverlay.tsx`
  - Opens when users tap gated demo/preview feature cards.
  - Shows “Shape this feature”.
  - Presents three usefulness options:
    - “Would help my real-life quest”
    - “Looks fun, but not essential”
    - “Not for me”
  - Includes optional suggestion text limited to 500 characters in the UI.
  - Calls `upsertFeatureVote()` with `featureId`, vote state, suggestion text, source surface/route, category, and feature metadata (`src/components/FeaturePreviewOverlay.tsx:67-100`, `src/components/FeaturePreviewOverlay.tsx:182-235`).

- `src/hooks/useFutureFeatureCardStates.ts`
  - Tracks seen/voted states for future-feature cards.
  - Can load the authenticated user’s existing feature vote by feature id (`src/hooks/useFutureFeatureCardStates.ts:63-88`).

- Current overlay mount points:
  - App-level future features: `src/App.tsx:1296-1298`, `src/App.tsx:4726-4734`
  - Score hub future features: `src/features/gamification/ScoreTab.tsx:189-197`, `src/features/gamification/ScoreTab.tsx:1719-1726`
  - Energy future features: `src/features/meditation/BreathingSpace.tsx:124-126`, `src/features/meditation/BreathingSpace.tsx:866-873`
  - Settings module preview overlay: `src/features/account/MyAccountPanel.tsx:1007-1014`

## Current data/schema situation

### Structured feature votes

`supabase/migrations/0239_feature_votes.sql` already creates `public.feature_votes` with:

| Column | Notes |
| --- | --- |
| `id uuid primary key` | Default `gen_random_uuid()` |
| `user_id uuid not null` | References `auth.users(id)` with cascade delete |
| `feature_id text not null` | Should match `FeatureAvailabilityId` values in app code |
| `vote_state text not null` | Check-constrained to `would_help_my_quest`, `looks_fun`, `not_for_me` |
| `suggestion_text text` | Optional; UI currently caps at 500 chars, DB does not enforce a length limit |
| `source_surface text` | Captures where the vote was submitted |
| `source_route text` | Captures route/path |
| `feature_category text` | Currently populated from `voteCategory` or `category` |
| `metadata jsonb not null default '{}'` | Stores label/status/surface/category snapshot |
| `created_at`, `updated_at` | Timestamps; `updated_at` maintained by trigger |

Indexes:

- `feature_votes_feature_state_idx` on `(feature_id, vote_state)`
- `feature_votes_user_updated_idx` on `(user_id, updated_at desc)`
- `feature_votes_category_state_idx` on `(feature_category, vote_state)`

Duplicate-vote prevention:

- Database unique constraint: `unique (user_id, feature_id)` (`supabase/migrations/0239_feature_votes.sql:15`).
- Service upsert conflict target: `{ onConflict: 'user_id,feature_id' }` (`src/services/featureVotes.ts:80-96`).
- This means users can update their vote/suggestion for a feature, but cannot create duplicate rows for the same feature.

RLS:

- Owners can select their own votes.
- Owners can insert/update only rows where `auth.uid() = user_id`.
- Active admins in `public.admin_users` can select all feature votes.
- Admin write access is not granted (`supabase/migrations/0239_feature_votes.sql:40-72`).

Service layer:

- `src/services/featureVotes.ts`
  - `getMyFeatureVote(featureId)` loads the signed-in user’s row.
  - `upsertFeatureVote(input)` derives `user_id` from the Supabase auth session and does not accept user id from the caller.
  - Signed-out users receive a friendly “Sign in to save your roadmap feedback.” error.

Typed DB note:

- `src/lib/database.types.ts` does not currently include `feature_votes`, so `featureVotes.ts` uses an untyped Supabase client cast. A later implementation could regenerate or update database types, but this is not required for the existing service to work.

### Existing feedback/support schema

General feedback/support is separate from feature voting:

- `supabase/migrations/0204_feedback_support_cases.sql`
  - `admin_users`
  - `case_threads`
  - `case_messages`
  - owner/admin RLS for feedback/support cases
- `supabase/migrations/0209_feedback_support_thread_reads.sql`
  - `case_thread_reads` for user/admin unread state

This schema supports conversation-style feedback/support, while `feature_votes` supports lightweight roadmap voting. They should remain separate for the MVP.

## featureAvailability.ts findings

`src/config/featureAvailability.ts` defines:

- `FeatureStatus = 'live' | 'demo' | 'comingSoon' | 'locked' | 'hidden'`
- `FeatureAccessLevel = 'open' | 'previewOnly' | 'hidden'`
- `FeatureAvailabilityId`
- `FeatureAvailability`
- `featureAvailabilityRegistry`
- `getFeatureAvailability(id)`

Useful voting metadata already exists on `FeatureAvailability`:

- `shortPitch`
- `votingEnabled`
- `votingQuestion`
- `voteCategory`
- `surface`
- `category`
- `publicLabel`
- `adminLabel`

Voting-enabled features found in the registry:

| Feature id | Label | Status | Surface | Category | Vote category |
| --- | --- | --- | --- | --- | --- |
| `app.body` | Body | demo | App | workspace | body |
| `app.contracts` | Promises | demo | App | workspace | lifeTools |
| `app.routines` | Routines | demo | App | workspace | lifeTools |
| `mind.meditation` | Meditation | demo | BreathingSpace | mind | mind |
| `mind.conflictResolver` | Conflict Resolver | demo | BreathingSpace | mind | mind |
| `body.yoga` | Yoga | demo | BreathingSpace | body | body |
| `body.food` | Food | demo | BreathingSpace | body | body |
| `body.exercise` | Exercise | demo | BreathingSpace | body | body |
| `score.playerShop` | Player Shop | demo | ScoreTab | scoreHub | scoreHub |
| `score.garage` | Garage | demo | ScoreTab | scoreHub | scoreHub |
| `score.achievements` | Achievements | demo | ScoreTab | scoreHub | scoreHub |
| `score.leaderboard` | Leaderboard | demo | ScoreTab | scoreHub | scoreHub |
| `score.bank` | Bank | demo | ScoreTab | scoreHub | scoreHub |
| `score.creatureSanctuary` | Creature Sanctuary | demo | ScoreTab | scoreHub | scoreHub |
| `score.stickersGallery` | Stickers Gallery | demo | ScoreTab | scoreHub | scoreHub |
| `settings.holidayThemes` | Holiday Themes | demo | MyAccountPanel | settings | settings |
| `settings.notifications` | Notifications | demo | MyAccountPanel | settings | settings |
| `settings.experimentalFeatures` | Experimental Features | demo | MyAccountPanel | settings | settings |

Live features such as `energy.shell`, `mind.breathingSpace`, `score.collections`, and `score.zenGarden` do not have voting enabled.

## Recommended MVP architecture

### Storage recommendation

Use Supabase-backed storage as the MVP source of truth, with a small local UI fallback only if needed.

Why:

- The `feature_votes` table, RLS, indexes, and service already exist.
- Duplicate prevention is strongest in the database through `unique (user_id, feature_id)`.
- Admin/creator users can later aggregate real totals without parsing support threads.
- The existing overlay already uses the same table, so Settings voting should not create a parallel persistence path.

Recommended local behavior:

- Use local React state for immediate optimistic/saved button state.
- Optionally reuse `futureFeatureEngagement` only for “seen/voted” visual polish.
- Do not rely on localStorage as the voting source of truth for signed-in users.
- For signed-out/demo users, either prompt sign-in or keep votes local-only with explicit copy such as “Sign in to save your vote.” Avoid silently pretending local votes are counted.

### Source-of-truth recommendation

Use `featureAvailabilityRegistry` as the source for feature cards:

- Filter `votingEnabled === true`.
- Prefer features whose `status` is `demo` or `comingSoon`, or whose resolved public access is `previewOnly`.
- Use `label`, `shortPitch || description`, `surface`, `voteCategory || category`, and `publicLabel` for card copy.
- Keep the list read-only with respect to feature gating. Do not change `status`, `publicAccess`, `adminAccess`, or `resolveFeatureAccess()` behavior.

### Suggested component/service shape for later implementation

No code was changed in this investigation. For a later PR, the smallest architecture would be:

- Add a small `FeatureVotingPanel` or `FutureFeatureVotingPanel` component under `src/features/account/` or `src/features/feedback/`.
- Reuse `getMyFeatureVote()` and `upsertFeatureVote()` from `src/services/featureVotes.ts`.
- Consider adding a helper in `featureAvailability.ts`, such as a sorted selector for voting-enabled future features, only if multiple surfaces need it.
- Render the panel in `MyAccountPanel` near the existing Feedback & Support card, or inside a new lightweight Feedback folder/modal if product wants Settings → Feedback to become a focused tab.
- Keep the existing `CaseSubmissionModal` for freeform feedback and support.

## Recommended Supabase table shape if needed

No new migration is required for the MVP because `feature_votes` already exists.

If the project still wants a migration in a later PR, the recommended migration should be a hardening migration, not a new table:

```sql
alter table public.feature_votes
  add constraint feature_votes_suggestion_text_length
  check (suggestion_text is null or char_length(suggestion_text) <= 500);
```

Optional admin aggregation view for later, not required for MVP:

```sql
create or replace view public.feature_vote_totals as
select
  feature_id,
  feature_category,
  vote_state,
  count(*) as vote_count,
  max(updated_at) as latest_vote_at
from public.feature_votes
group by feature_id, feature_category, vote_state;
```

If a view is added, it should be protected so only active admins can read it. The simplest near-term alternative is to skip the view and let an admin-only service query `feature_votes` directly under the existing admin select policy.

## UX proposal for Settings → Feedback

Mobile-first, calm, simple:

### Placement

Inside the existing `Feedback & Support` section in `MyAccountPanel`, add a compact “Vote on future features” area above the freeform “Send feedback” and “Request support” buttons.

### Copy

- Heading: “Which feature do you want next?”
- Supporting text: “Vote for the future features that would help your real-life quest most.”
- Keep secondary copy short and avoid dashboard-like analytics.

### Feature cards

Each card should show:

- Feature label
- Small status pill such as “Future Feature”
- Short pitch from `shortPitch`
- Optional category/surface chip, such as “Mind”, “Body”, “Score Hub”, or “Settings”
- One-tap primary vote button
- Saved state: “Voted” or “Feedback sent”

### One-tap vote behavior

Recommended default one-tap vote:

- Store `vote_state = 'would_help_my_quest'`.
- Include metadata:
  - feature label
  - status
  - surface
  - category
  - voteCategory
  - source context such as `settings_feedback_vote_panel`
- If the user taps an already-voted card, keep it calm:
  - either show “Voted”
  - or allow “Update note” without adding another row

### Optional text field

Keep text feedback optional and tiny:

- A single collapsed/inline field: “Optional: tell us one thing you’d want from this.”
- 280–500 character cap.
- Do not require text for a vote.
- Save text to `suggestion_text` on the same `feature_votes` row.

### Avoid busy UI

- Show a short curated list first, grouped or sorted by category.
- Consider showing 6–8 cards initially with “Show more future ideas” if all 18 voting-enabled features feel too busy on mobile.
- Avoid totals, rankings, or competitive language in the user-facing MVP.

## Admin/creator totals later

Do not build a full dashboard in the MVP.

Low-scope later options:

1. Add an admin-only “Roadmap votes” summary inside the existing Admin Inbox folder.
2. Query `feature_votes` for active admins using the existing admin select RLS.
3. Aggregate client-side by `feature_id` and `vote_state` for a simple table:
   - feature label
   - “Would help” count
   - “Looks fun” count
   - “Not for me” count
   - latest vote timestamp
4. Optionally add filters by `feature_category` and source surface.
5. Defer suggestion-text review or show only recent suggestions after privacy/product review.

This can reuse `admin_users` and should not require changes to support cases.

## Risks/blockers

- `database.types.ts` does not include `feature_votes`; the current service works by using an untyped Supabase cast. A future cleanup could regenerate types.
- `feature_votes.suggestion_text` has a UI length cap but no DB length constraint.
- The existing `CaseSubmissionModal` feature-area list is hard-coded and separate from `featureAvailability.ts`; if users also submit freeform feature feedback, metadata may not align with structured votes.
- Signed-out/demo behavior needs a clear product choice. Supabase-backed voting requires an authenticated user.
- Displaying all voting-enabled registry entries may be too busy on mobile; a curated/sorted presentation is safer.
- Admin totals are allowed by RLS, but no admin service or summary UI exists yet.
- Existing overlay voting and proposed Settings voting must share saved state so users do not see inconsistent “voted” labels.
- Do not couple this work to feature gating, Island Run state, payments, or migrations beyond optional `feature_votes` hardening.

## Step-by-step implementation plan for a later small PR

1. Add a feature-vote selector that derives voting-enabled future features from `featureAvailabilityRegistry`.
2. Add a small Settings feedback voting panel component that receives `session` and renders mobile-first feature cards.
3. Load existing votes for listed features with `getMyFeatureVote()` or a batched service helper if needed.
4. On one-tap vote, call `upsertFeatureVote()` with `vote_state = 'would_help_my_quest'`, `sourceSurface = 'settings_feedback'`, current route, feature category, and feature metadata.
5. Add optional note editing on the same row through `suggestionText`.
6. Render calm saved/error states:
   - “Voted”
   - “Saved”
   - “Sign in to save your vote”
   - “Couldn’t save — try again”
7. Mount the panel in `MyAccountPanel` near the existing Feedback & Support card without removing the current freeform feedback/support modal.
8. Reuse or align the existing `FeaturePreviewOverlay` vote-saved event so card state remains consistent after votes from either surface.
9. Add tests for the feature selector and duplicate/update behavior at the service/component boundary if the project’s current test setup supports it.
10. Optionally add the DB length-check migration for `suggestion_text <= 500` in a separate migration PR.
11. Defer admin totals to a follow-up PR that adds a small admin-only summary to the existing Admin Inbox tools.

## Non-goals for the later MVP PR

- No feature gating changes.
- No Island Run/gameplay state changes.
- No payments or Stripe changes.
- No new full dashboard.
- No new support-case records for one-tap votes.
- No migration unless doing the optional `suggestion_text` length hardening.
