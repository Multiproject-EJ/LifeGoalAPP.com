# Vision Board Master Plan

This document consolidates all Vision Board planning and implementation status into a single source of truth. It replaces scattered plan fragments and documents what is shipped today versus what is still missing.

## Scope
- Covers the Vision Board experience in the main app (`src/features/vision-board`).
- Includes Vision Board V2 roadmap items (multi-board, sections, sharing, canvas), previously listed in scattered plan files.

---

## ✅ Shipped (in repo)

### Core Vision Board experience (Phase 3 checklist)
- Vision Board workspace with Supabase Storage uploads, gallery sorting, captions, and deletion is marked complete in the repo’s Phase 3 checklist and latest updates.【F:README.md†L18-L24】【F:README.md†L231-L233】

### Vision Board 2.0 metadata + review loop (already implemented in code)
Although the master development plan lists this milestone as “not started,” the Vision Board component already includes:
- **Vision type metadata** and **review interval** options.【F:src/features/vision-board/VisionBoard.tsx†L61-L79】
- **Review loop UI** with due items, review count, and “Mark reviewed” actions.【F:src/features/vision-board/VisionBoard.tsx†L1077-L1118】
- **Orphan detection** (items with no linked goals/habits), surfaced as chips and callouts.【F:src/features/vision-board/VisionBoard.tsx†L1341-L1411】
- **Goal/habit linking UI** that enables orphan detection to function.【F:src/features/vision-board/VisionBoard.tsx†L1020-L1058】

### Vision Board V2 sections (Phase 1)
- **Section management UI** for adding, renaming, and reordering sections on a board is now wired up in the Vision Board V2 shell.【F:app/vision/vision.js†L71-L232】
- **Build checklist** updated to reflect section management as shipped in Phase 1.【F:app/vision/buildplan.json†L8-L14】

### Vision Board V2 add card (Phase 1)
- **Card creation UI** now supports adding URL-based image cards or text-only cards to the active board, with client-side rendering in the canvas grid.【F:app/vision/vision.js†L101-L483】
- **Build checklist** updated to reflect card creation as shipped in Phase 1.【F:app/vision/buildplan.json†L8-L14】

### Vision Board V2 card metadata edits (Phase 1)
- **Card edit flow** now covers title, affirmation, tags, color, size, and favorite state directly from the Vision Board shell UI.【F:app/vision/vision.js†L101-L675】
- **Build checklist** updated to reflect card metadata editing as shipped in Phase 1.【F:app/vision/buildplan.json†L8-L14】

### Vision Board V2 habit linking (Phase 1)
- **Card linking UI** now lets creators link cards to habits, with a goal linking placeholder for the next milestone.【F:app/vision/vision.js†L247-L476】

### Vision Board V2 canvas filters (Phase 2)
- **Filter bar** now supports filtering by section, tag, color, and favorites in the Vision Board V2 canvas.【F:app/vision/vision.js†L98-L529】

### Vision Board V2 prompts (Phase 3)
- **Prompt chips** load from the prompt packs JSON and insert prompts into new text cards.【F:app/vision/vision.js†L291-L801】
- **Daily mantra highlight** now rotates a prompt each day for the active pack.【F:app/vision/vision.js†L365-L455】

### Vision Board V2 canvas drag/drop (Phase 2)
- **Drag-drop reorder** now lets creators rearrange cards directly on the canvas, persisting updated order to Supabase.【F:app/vision/vision.js†L333-L401】
- **Move across sections** is supported by dropping cards onto section rows or onto cards in another section.【F:app/vision/vision.js†L333-L401】
- **Size-based grid spans** already render S/M/L/XL card sizes in the masonry grid.【F:app/vision/vision.css†L55-L61】

### Vision Board V2 story mode (Phase 4)
- **Fullscreen slideshow** now plays image + text cards with interval and shuffle controls in the Story section.【F:app/vision/vision.js†L454-L597】【F:app/vision/vision.css†L74-L86】
- **Daily Spotlight** now includes subscribe controls plus a test send flow in the Story section.【F:app/vision/vision.js†L629-L736】

### Vision Board V2 gratitude & mood (Phase 5)
- **Daily mood (1–5) + gratitude note** now load and save per board in the Gratitude & Mood panel.【F:app/vision/vision.js†L1387-L1715】
- **Check-in streak + gentle nudges** now summarize consecutive check-ins and prompt users to keep the streak alive.【F:app/vision/vision.js†L220-L379】
- **Build checklist** updated to reflect daily check-ins as shipped in Phase 5.【F:app/vision/buildplan.json†L24-L27】

### Vision Board V2 sharing (Phase 6)
- **Create/disable share link** flow now lives in the Sharing panel, with slug control and status feedback.【F:app/vision/vision.js†L243-L365】
- **Per-card visibility toggle** is now editable from the card form to hide items from shared boards.【F:app/vision/vision.js†L1662-L1673】
- **Build checklist** updated to mark Phase 6 sharing items as done.【F:app/vision/buildplan.json†L30-L33】

### Vision Board V2 thumbnail signing (Phase 7)
- **Signed + transformed URLs** now power Vision Board image thumbnails with fallback to original URLs.【F:app/vision/vision.js†L69-L122】【F:app/vision/vision.js†L674-L716】【F:app/vision/vision.js†L1428-L1519】
- **Build checklist** updated to mark thumbnail signing as done.【F:app/vision/buildplan.json†L34-L37】

### Vision Board V2 celebrate confetti (Phase 7)
- **Celebrate hook confetti** now triggers a visual burst when a fresh check-in increases the streak, using the existing Vision Board confetti overlay styling.【F:app/vision/vision.js†L120-L523】【F:app/vision/vision.css†L115-L122】
- **Build checklist** updated to mark celebrate confetti as done.【F:app/vision/buildplan.json†L34-L38】

### Vision Board V2 offline queue (Phase 7)
- **Offline queue** now buffers card edits and card reorders locally, syncing queued updates once the device reconnects.【F:app/vision/vision.js†L96-L903】
- **Build checklist** updated to mark offline queue as done.【F:app/vision/buildplan.json†L34-L38】

### Scaffolded canvas + prompts + build checklist
The latest update notes a scaffolded Vision Board tab with canvas, prompts, and a build checklist ready for next phases.【F:README.md†L246-L247】

---

## 🧭 Remaining Work (Vision Board V2 roadmap)

The following items are still marked as **todo** in the Vision Board build plan and/or explicitly called “not yet implemented.”【F:app/vision/buildplan.json†L1-L40】【F:QUICK_START_GUIDE.md†L285-L293】

### Phase 0 — Bootstrap
- Run 0101 + 0102 + 0103 migrations.
- Create private Storage bucket `vision`.
  - Helper: `scripts/vision-board-v2-migrations.sh` applies the three Vision Board V2 migrations in order.

### Phase 2 — Canvas
All Phase 2 canvas items are shipped.

### Phase 3 — Prompts & Mantra
All Phase 3 prompt items are shipped.

### Phase 4 — Story
All Phase 4 story items are shipped.

### Phase 5 — Gratitude & Mood
All Phase 5 check-in items are shipped.

### Phase 7 — Polish
- All Phase 7 polish items are shipped.

---

## Plan Consolidation Notes

### Source of truth
- **This file** is now the master Vision Board plan.
- The general development plan and other docs should reference this file instead of duplicating Vision Board details.

### Related legacy plan sources (kept as references)
- `DEV_PLAN.md` includes the Vision Board 2.0 milestone but should now link here for status and scope details.【F:DEV_PLAN.md†L135-L151】
- `app/vision/buildplan.json` remains a structured backlog but is summarized here for human-readable planning context.【F:app/vision/buildplan.json†L1-L40】
- `QUICK_START_GUIDE.md` lists Vision Board V2 as not yet implemented; this document details what remains.【F:QUICK_START_GUIDE.md†L285-L293】

---

## Next Recommended Actions
1. Align `DEV_PLAN.md` M5 status and next task with the “Shipped vs Missing” state above.
2. Keep `app/vision/buildplan.json` for structured task tracking, but avoid duplicating prose elsewhere.
3. When new Vision Board features ship, update **only this document** for status changes.
