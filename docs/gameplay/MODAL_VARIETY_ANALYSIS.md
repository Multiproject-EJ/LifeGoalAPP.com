# Why the "Behavior Stop" and "Card Stack Draw" modals feel boring — analysis

Status: Analysis. The proposed fix has since been implemented — see the "Implementation status" section of the companion doc `DEFAULT_CURRICULUM_120_ISLANDS.md`.
Companion doc: `DEFAULT_CURRICULUM_120_ISLANDS.md` (the fix's content plan + implementation status).

## The two modals in question

### 1. "Behavior stop" — Judge the check-in cards
- Component: `src/features/gamification/level-worlds/components/IslandRunReflectionComposer.tsx`
- Triggered as the `checkin_reflection` variant of the **Mystery stop** (stop 3 of 5 on every island), wired in `IslandRunBoardPrototype.tsx` (~line 12109).
- Content pool: `REFLECTION_PROMPTS`, a **hardcoded array of exactly 6 entries** (lines 16–71): Momentum, Health, Career, Relationships, Growth, Finance. Each is a fixed title + prompt + two fixed button answers.
- Selection logic: **not random**. On mount the 6-item list is rotated by `islandNumber % 6` (line 84), then the player plays an elimination "tournament" (`handleJudge`, line 106) — repeatedly picking the stronger of two cards from a shrinking list — until one winner remains. Because there are always 6 prompts, it is always exactly 5 rounds ("Judging N of 5").
- **The pool never grows.** Every island reuses the same 6 prompts in a different rotation order. By island ~7 a player has seen the full set at least once; by island 20 they've seen it ~3 times with only the tournament ordering differing.

### 2. "Card Stack Draw" — Gamified Journal: Daily Clue Card
- Component: `src/features/gamification/level-worlds/components/IslandRunGamifiedJournalCard.tsx`
- Triggered whenever the board token lands on a ring tile of type `'card'` during dice movement (`IslandRunBoardPrototype.tsx` ~lines 6393–6396) — this is **not a landmark/stop at all**, it's a board-tile popup, so it can interrupt play far more often than once per island.
- Content: **entirely fixed** — exactly 2 questions ("What made you feel good today?" / "What, if anything, made you feel bad?"), each with exactly 2 buttons ("Nothing really, a typical day" / "Something specific"), plus an optional free-text box and an optional "typical day" textarea. `islandNumber` is passed through only for journal tagging, not content variation.
- **There is no pool at all** — it is the same two questions every single time, forever, regardless of island.

### Root cause (shared)
Both modals are **closed, hand-written lists** (6 items and 2 items respectively) with no per-island or per-chapter content lookup. Neither is wired to the app's actual 120-island content system (see below), which already has far richer, non-repeating material sitting unused for this purpose. The repetition isn't a bug in either component — both work exactly as coded — it's that they were built as small placeholder pools and never upgraded once the real curriculum existed.

## The content that already exists but isn't being used here

The **Compass Book** (`src/features/compass-book/`) is a fully-authored, 120-island curriculum:
- 6 chapters × 20 activities = **120 activities, one per island number, 1–120**, validated at build time (`validateCompassCurriculum()`).
- All 6 chapters are marked `authored: true` in every activity — **this is not a placeholder**, despite a leftover `reservedChapter.ts` builder (now dead code, no call sites) that a first pass might mistake for evidence chapters 2–6 are stubs. They are not; the full 120-slot curriculum text already exists.
- Each activity has multiple rich "blocks" using 11 different interaction types: `single_choice`, `multi_choice`, `scale`, `ranking`, `emotion_choice`, `short_text`, `sentence_completion`, `reflection`, `experiment`, `check_in`, `review`, `confirmation` — dramatically more varied than "pick card A or card B."
- Content is genuinely different per chapter (see companion doc for full breakdown): Living Wheel (life-area audit), Inner Compass (values/needs), Living Horizon (future-life vision), Ikigai Map (direction-finding), Quest Forge (commitment), Personal Playbook (habits/systems).

**But**: today this curriculum is only surfaced as an **optional, non-gating overlay** (`CompassStopFragmentMount.tsx`) bolted onto the Habit stop (`slot="habit_overflow"`) and Wisdom stop (`slot="wisdom"`) — it never touches the Mystery stop's `checkin_reflection` variant, and it has no relationship whatsoever to the ring-tile Card Stack Draw. A player can play through all 120 islands and never see most of this content, while still seeing the same 6 reflection prompts and the same 2 journal questions on repeat.

## Other stop/modal variety that exists but is underused

The Mystery stop already rotates between 3–4 content kinds (seeded per island, not random-per-play): `breathing`, `habit_action`, `checkin_reflection`, and feature-flagged `vision_quest`. So `checkin_reflection` is only shown roughly 1 in 3–4 islands today — the complaint is likely less "every single island" and more "every time it does show up, it's the same 6 cards," which is still true regardless of rotation frequency.

Separately, ring-tile **encounter modals** (`encounterService.ts`) already support 5 challenge types (quiz, breathing, gratitude, tap, focus) with their own prompt pools — a precedent for "small varied modal on a board tile" that the Card Stack Draw could follow instead of being frozen at 2 fixed questions.

## What "fixing" this actually requires (summary, see companion doc for the plan)

1. Give the Mystery stop's `checkin_reflection` variant (and, over time, the Card Stack Draw) a **per-island content lookup** instead of a fixed small array — pulling from the already-authored 120-activity Compass Book curriculum (or a purpose-built default curriculum modeled the same way) so what's shown is different island-to-island across the full 1–120 range, not just re-ordered.
2. Decide whether Compass Book content should *replace* the current hardcoded prompts outright, or whether a **new lightweight default curriculum** (shorter per-stop content, distinct from the deep Compass Book activities meant for a slower dedicated flow) should be authored specifically for the Mystery/Card slots — sized for a quick 10–20 second board interruption rather than a multi-block reflective activity. The companion doc proposes the latter as the safer near-term fix, while flagging Compass Book reuse as the larger structural option.
3. Regardless of which content source is chosen, define **the total of 120 rows** (one per island) so design/eng can see exactly what will be asked at each landmark before writing any code — that table is the deliverable of the companion doc.
