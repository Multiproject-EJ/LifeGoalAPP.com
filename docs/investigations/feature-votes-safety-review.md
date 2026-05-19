# Feature Votes Safety Review

## Verdict
PASS

## Files reviewed
- `supabase/migrations/0239_feature_votes.sql`
- `src/services/featureVotes.ts`
- `src/components/FeaturePreviewOverlay.tsx`
- `src/App.tsx` lines 4570-4584
- `src/features/gamification/ScoreTab.tsx` lines 1651-1658
- `src/features/meditation/BreathingSpace.tsx` lines 848-853
- `src/styles/feature-preview-overlay.css` lines 118-205

## Migration review
- `public.feature_votes` exists with the expected columns: `id`, `user_id`, `feature_id`, `vote_state`, `suggestion_text`, `source_surface`, `source_route`, `feature_category`, `metadata`, `created_at`, and `updated_at`.
- `unique (user_id, feature_id)` exists, so each authenticated user has one row per feature.
- `updated_at` is maintained by `public.update_feature_votes_updated_at()` and the `trg_feature_votes_updated_at` `before update` trigger.
- `vote_state` is constrained to only:
  - `would_help_my_quest`
  - `looks_fun`
  - `not_for_me`
- `suggestion_text` is nullable. The database column is `text` and does not currently include a database-level length check. The UI textarea limits suggestions to 500 characters, so normal client submissions are bounded, but direct database/API writes are not database-enforced.

## RLS review
- RLS is enabled with `alter table public.feature_votes enable row level security`.
- Authenticated users can select only their own votes through `feature_votes_owner_select` using `auth.uid() = user_id`.
- Authenticated users can insert only rows where `user_id = auth.uid()` through `feature_votes_owner_insert` using `with check (auth.uid() = user_id)`.
- Authenticated users can update only their own rows through `feature_votes_owner_update` using both `using (auth.uid() = user_id)` and `with check (auth.uid() = user_id)`.
- Anonymous users cannot insert, update, or select rows because `auth.uid()` is null and no anonymous policy grants access.
- Active admins can select all rows through `feature_votes_admin_select_all`, which checks `public.admin_users` for `admin_row.user_id = auth.uid()` and `admin_row.active = true`.
- Admin write access is not granted. The only admin policy is `for select`.

## Service review
- `upsertFeatureVote` derives the user id from `getSupabaseClient().auth.getSession()` via `getCurrentUserId()` and writes `user_id: userId`; the UI cannot provide a `user_id` field.
- Re-submitting feedback for the same feature updates the existing row because the upsert uses `onConflict: 'user_id,feature_id'`.
- Signed-out users receive the friendly error `Sign in to save your roadmap feedback.` and the service returns `{ data: null, error }` instead of throwing to the UI.
- Save failures are caught, logged with `console.warn`, and returned as the friendly error `Failed to save roadmap feedback. Please try again.`.
- `FeaturePreviewOverlay` displays returned service errors in an alert region and only shows the submitted confirmation after a successful save.
- No support cases, telemetry events, admin inbox writes, or gameplay writes are created by the reviewed service or overlay path.

## Scope review
- No Island Run gameplay write path was found in the reviewed feature-vote migration, service, or overlay files.
- No dice, reward, or economy write path was found in the reviewed feature-vote migration, service, or overlay files.
- No route guard behavior was changed by the reviewed feature-vote migration, service, or overlay files.
- No support case, case message, or admin inbox behavior was changed by the reviewed feature-vote migration, service, or overlay files.
- No telemetry write path was found in the reviewed feature-vote migration, service, or overlay files.
- The overlay is only mounted from existing preview surfaces in `App.tsx`, `ScoreTab.tsx`, and `BreathingSpace.tsx`.

## Required fixes before merge
None.

## Optional follow-ups
- Add a database-level check such as `char_length(suggestion_text) <= 500` to match the existing UI `maxLength={500}` and prevent direct API/database writes from storing longer suggestions.
