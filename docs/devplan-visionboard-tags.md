# Vision Board Category Tags Dev Plan

## Current state
- **Vision board UI** lives in `src/features/vision-board/VisionBoard.tsx` and renders the grid, upload form, and edit modal.
- **Vision board data access** is in `src/services/visionBoard.ts` using the `vision_images` table.
- **Vision board table** is `public.vision_images` (see `supabase/reference/legacy_001_schema.sql` and related migrations like `supabase/migrations/0105_vision_images_url_support.sql`).
  - Key columns: `id`, `user_id`, `image_path`, `image_url`, `image_source`, `caption`, `created_at`, `vision_type`, `review_interval_days`, `last_reviewed_at`, `linked_goal_ids`, `linked_habit_ids`.
- **Tagging table** is `public.vision_board_image_tags` (see `supabase/migrations/0120_vision_board_image_tags.sql`).
- **Tagging data access** is in `src/services/visionBoardTags.ts`.
- **Life Wheel category source of truth** is `LIFE_WHEEL_CATEGORIES` in `src/features/checkins/LifeWheelCheckins.tsx` (keys like `spirituality_community`, `finance_wealth`, etc.).
- **RLS patterns** are in Supabase migrations such as `supabase/migrations/0117_vision_board_daily_game.sql` and legacy reference policies (`supabase/reference/legacy_002_policies.sql`): policies typically enforce `auth.uid() = user_id` or subqueries to ensure ownership.
- **Category lookup memoization** is initialized before tag-loading hooks in `VisionBoard.tsx` to avoid use-before-init issues.

## Plan
### DB + RLS (Commit 1) ✅
1. Add a new migration in `supabase/migrations/` to create `vision_board_image_tags` (join table) with:
   - `image_id` (FK to `public.vision_images` ON DELETE CASCADE)
   - `user_id` (FK to `auth.users`)
   - `category_key` (text)
   - `created_at` (timestamptz default now())
   - Primary key `(image_id, category_key)`
   - Indexes on `(user_id, category_key)` and `(image_id)`
2. Enable RLS and add select/insert/delete policies that enforce:
   - `auth.uid() = user_id`
   - `exists (select 1 from public.vision_images where id = image_id and user_id = auth.uid())`
3. Update `src/lib/database.types.ts` to include the new table for typing.
4. Add DB verification queries below.

### UI + data access (Commit 2) ✅
1. Add data helpers (in `src/services/`) to:
   - Fetch tags for a list of vision image IDs.
   - Set tags for an image (delete existing, insert new).
2. Update `VisionBoard.tsx` to:
   - Add tabs: **All**, each life wheel category, **Untagged**.
   - Filter images client-side using fetched tags (keep **All** view identical).
   - Render category pills on each card when tags exist.
   - Add a Tag/Edit action to open a small modal with category selection (checkboxes for multi-tag).
3. Add minimal CSS in `src/index.css` for tabs and tag modal.

## Risks & how we avoid them
- **Breaking existing Vision Board**: Keep all current tables/components intact and only add new code paths. The **All** tab will render exactly the existing query and layout.
- **RLS leaks**: Enforce user ownership in `vision_board_image_tags` policies and confirm with manual SQL checks.
- **Missing category source**: Reuse `LIFE_WHEEL_CATEGORIES` from `LifeWheelCheckins` to avoid a new source of truth.
- **Performance/N+1**: Fetch tags in a single batch query for the current image list.
- **Hook ordering bugs**: Initialize category lookup memoization before tag-loading hooks to avoid use-before-init runtime errors.

## Discoveries
- `LIFE_WHEEL_CATEGORIES` is a stable, shared source for tag labels and currently feeds the Vision Board tag pills.
- Reordered the Life Wheel category lookup memoization ahead of tag-loading hooks to avoid use-before-init runtime errors. ✅

## Follow-ups
- Validate tag filters in demo mode once QA is available to confirm the local-only path behaves the same as Supabase-backed mode.

## Manual test checklist
1. Existing vision board still loads images (before tagging anything).
2. Tag 2 images with different categories.
3. Verify category tabs filter correctly.
4. Verify **Untagged** shows untagged images.
5. Verify RLS with a second test account (cannot see/tag others).
6. Mobile UI: modal opens, tabs scroll if needed.
7. Load the vision board without console errors after the tagging changes.
8. Re-open the tag modal and confirm previously selected categories are pre-checked.

## Next step
- ⚠️ Attempted a demo-mode sanity pass (local dev server + Playwright), but the auth overlay never dismissed to reach the Vision Board view. Needs a manual spot check in a browser to confirm tag filters and chips render in the demo flow.

### DB verification queries
```sql
-- Confirm tags visible only for owner
select * from public.vision_board_image_tags where user_id = auth.uid();

-- Confirm you can only tag your own images
insert into public.vision_board_image_tags (image_id, user_id, category_key)
values ('<image-id>', auth.uid(), 'health_fitness');

-- Expect 0 rows if image is not owned by auth.uid()
select 1
from public.vision_images i
where i.id = '<image-id>' and i.user_id = auth.uid();
```
