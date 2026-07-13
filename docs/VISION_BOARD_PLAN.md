# Vision Board Master Plan

Single source of truth for the Vision Board feature: what is actually shipped
in the codebase today, what exists only as unused scaffolding, and what is
genuinely still to build.

> **Correction (2026-07):** Earlier versions of this document described a
> "Vision Board V2" (`app/vision/vision.js`, `app/vision/buildplan.json`,
> `QUICK_START_GUIDE.md`) as shipped, with canvas, sections, sharing, story
> mode, gratitude/mood, thumbnail signing, confetti, and an offline card
> queue. **None of that frontend exists** — those files have never been
> present in the repository (`git log --all -- 'app/vision/*'` is empty), and
> no component consumes the V2 tables. Those claims have been removed. The
> React feature described below is the only Vision Board implementation.

## Scope
- The Vision Board experience lives entirely in `src/features/vision-board/`.
- A V2 **database schema** was scaffolded (see "Scaffolded but unused" below)
  but has no frontend and is not wired into the app.

---

## ✅ Actually shipped (`src/features/vision-board/`)

### Uploading & gallery
- **Image upload** by file (drag-and-drop or file picker, optimized to WebP)
  or by direct **URL**, with caption, in `VisionUploadForm.tsx`.
- **Gallery** with sort (newest / oldest / caption) and grid layouts
  (2-column / 3-column / masonry).
- **Full-screen lightbox** viewer with keyboard navigation
  (`VisionLightbox.tsx`).
- **Broken-image fallback** for dead external URLs.
- **Caption search** and **multi-select bulk delete** with an undo window.
- Per-image **delete with undo** (optimistic remove + 5s undo toast).

### Organization & linking
- **Board views:** All photos / Life wheel categories / The Four Visionaries.
- **Tagging** images to life-wheel and Four Visionaries categories
  (`VisionTagModal.tsx`; migrations `0120_vision_board_image_tags.sql`,
  `0121_vision_board_image_tags_group.sql`).
- **Vision type** metadata (goal / habit / identity / experience / environment).
- **Goal/habit linking** with **orphan detection** (chips + callouts) on each
  card (`VisionCard.tsx`).

### Engagement
- **Daily Vision Game** — reveal / rank / balance flow
  (`src/features/visionBoardDailyGame/`; migration
  `0117_vision_board_daily_game.sql`).
- **XP rewards** on upload (via `useGamification`).
- **Haircut widget** on the Body & Style tab, persisted per-user to
  localStorage (`HaircutWidget.tsx` + `haircutPreferences.ts`).

### Platform
- **Offline sync queue** for uploads/edits with retry/clear UI
  (`services/visionBoard.ts`, shared mutation queue).
- **Storage buckets:** `0124_vision_board_storage_bucket.sql` (active
  `vision-board` bucket) and `0136_vision_board_v2_storage_bucket.sql`.
- **Modal accessibility:** focus trap + Escape + backdrop close, restore focus
  (`useModalA11y.ts`).

### Component structure
The feature was decomposed from a single ~1,700-line component into:
`VisionBoard.tsx` (orchestration) plus `VisionUploadForm`, `VisionCard`,
`VisionCardEditForm`, `VisionLightbox`, `VisionTagModal`, `HaircutWidget`, and
the `categories`, `visionTypes`, `haircutPreferences`, and `useModalA11y`
modules.

### Removed
- The recurring per-image **"review loop"** (due-for-review list, review
  intervals, "Mark reviewed") was removed as an unwanted interaction model.
  The `review_interval_days` / `last_reviewed_at` columns remain in the table
  but are no longer surfaced.

---

## 🟡 Scaffolded but unused (V2 database schema, no frontend)

These migrations create tables that **no product feature reads or writes**.
They are referenced only by row-limit config (`config/userDataLimits.ts`) and a
connection diagnostic (`features/account/SupabaseConnectionTest.tsx`):

- `0101_vision_core.sql` — `vb_boards`, `vb_sections`, `vb_cards`
  (multi-board, S/M/L/XL card sizes, themes).
- `0102_sharing_push.sql` — `vb_shares`, `push_subscriptions`.
- `0103_gratitude_mood.sql` — `vb_checkins`.
- Helper: `npm run vision-board-v2:migrate` (`scripts/vision-board-v2-migrations.sh`).

Building a frontend on this schema is optional future work (see below); nothing
depends on it today.

---

## 🧭 Genuine future roadmap (not started)

None of the following exists yet. Ordered roughly by value-to-effort:

1. **Re-host URL images** so boards don't rot when external links die
   (fetch-and-store into the bucket, with raw-URL fallback for CORS-blocked
   hosts).
2. **Story-mode slideshow** — could reuse `VisionLightbox` for a
   fullscreen, auto-advancing presentation.
3. **Canvas / free-arrange boards with sections** — a richer layout than the
   fixed gallery grid (schema exists: `vb_boards` / `vb_sections` / `vb_cards`).
4. **Sharing links** (schema: `vb_shares`) and **daily spotlight push**
   (schema: `push_subscriptions`).
5. **Gratitude / mood check-ins** (schema: `vb_checkins`).

---

## Notes
- When Vision Board features ship or change, update **this file** to match the
  code. Do not reintroduce status claims that cite files which do not exist.
- `DEV_PLAN.md` references the Vision Board milestone; keep it pointed here for
  scope/status.
