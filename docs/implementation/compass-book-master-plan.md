# Compass Book — Master Implementation Plan

_Date: 2026-06-20_
_Branch: `claude/gallant-volta-qrzkdh`_
_Status: Planning deliverable (no production code changed)_

This document is the durable architecture and delivery plan for the **Compass Book** —
a six-chapter, 120-fragment personal-development curriculum connected to the Island Run
game. It is the required first deliverable described in the handover brief. It was written
after a focused validation pass against the current branch and supersedes nothing in
`docs/product/compass-product-terminology.md` (that note remains the canonical product-language source).

> The original brief referenced `docs/investigations/compass-book-curriculum-investigation.md`.
> That exact file does not exist on this branch. The closest existing investigation docs are
> `docs/investigations/compass-system-design.md` and
> `docs/investigations/quest-compass-ikigai-transformation-plan.md`, which describe the **old**
> 11-phase Island Run Compass, not the new six-chapter book. This plan therefore treats the
> brief itself as the curriculum source of truth.

---

## 1. Current state (verified against branch)

### 1.1 Validation pass results

All ten required confirmation checks were performed against `claude/gallant-volta-qrzkdh`:

| # | Confirmation | Result | Evidence |
|---|--------------|--------|----------|
| 1 | Quest Pulse rename merged | **PASS** | `src/features/quest-compass/QuestCompassModal.tsx` renders user-facing "Quest Pulse"; comment at line 36 documents legacy internal name retention |
| 2 | `app.compass_book` in feature availability | **PASS** | `src/config/featureAvailability.ts:118` — `status: 'comingSoon'`, `publicAccess: 'previewOnly'` |
| 3 | Compass Book hero opens preview (not Quest Pulse) | **PASS** | `src/App.tsx:4330` — `openFeaturePreviewOverlay('app.compass_book', 'Compass Book')` |
| 4 | In-game Compass still opens old modal | **PASS** | `IslandRunBoardPrototype.tsx` `showHatcheryCompassModal` → `CompassModal` (11-phase ikigai) |
| 5 | Old `compass_state` unchanged | **PASS** | `supabase/migrations/0252_compass_state.sql` + `src/services/compassState.ts` intact |
| 6 | Player Menu entry seam in `App.tsx` | **PASS** | hero card at `src/App.tsx:4327–4341` |
| 7 | Canonical Life Wheel taxonomy unchanged | **PASS** | `src/features/life-wheel/lifeWheelTaxonomy.ts` — 8 areas |
| 8 | Goals & habits services canonical | **PASS** | `src/services/goals.ts`, `src/services/lifeGoals.ts`, `src/services/habitsV2.ts` present |
| 9 | No Compass Book foundation tables exist | **PASS** | no `compass_book*` migrations; latest migration is `0255` |
| 10 | Concept images available | **PARTIAL** | only `public/assets/ikigai/ikigai-diagram.svg` exists; the six chapter concept-art images are **not in the repo** |

**Overall feasibility: PASS.** The feature can be built without changing Island Run
progression, the game economy, canonical goals, or canonical habits.

### 1.2 What is already merged

- **Quest Pulse rename** — user-facing language migrated from "Quest Compass" to "Quest Pulse".
  Internal identifiers (`QuestCompassModal`, `quest-compass` module path, `openQuestCompassFromMobileMenu`,
  CSS classes, submenu action id `quest-compass`) intentionally retained.
- **`app.compass_book` feature availability entry** — preview-only "Coming Soon" card.
- **Compass Book hero card** in the Player Menu mobile overlay, wired to the feature preview overlay only.

### 1.3 What remains legacy (do not disturb)

- **Old Island Run Compass** — an 11-phase ikigai system, distinct from the new book:
  - `src/features/gamification/level-worlds/components/CompassModal.tsx`
  - `src/features/gamification/level-worlds/services/compassCurriculum.ts` (`COMPASS_PHASES`,
    `getCompassPhase`, four directions `heart/craft/cause/livelihood`, four spokes
    `personality/habits/goals/shield`)
  - `src/services/compassState.ts` (one-row `compass_state` per user)
  - `supabase/migrations/0252_compass_state.sql`
  - Opened from the board via `showHatcheryCompassModal` in `IslandRunBoardPrototype.tsx`.
- **Quest Pulse** — `src/features/quest-compass/*` (live analytics; remains a separate product).

### 1.4 Current feature flags

- `app.compass_book` → `comingSoon` / `previewOnly` (public + admin). This flag will gate the
  real Compass Book experience as it ships. Until PR 2 wires the real screen, the hero stays on preview.

### 1.5 Canonical reuse surfaces (confirmed present)

- **Island Run read path**: `useIslandRunState` (`.../level-worlds/hooks/useIslandRunState.ts`),
  `IslandRunGameStateRecord.currentIslandNumber`, `completedStopsByIsland`, `stopStatesByIndex`,
  `stopBuildStateByIndex`, `travelToNextIsland`.
- **Life Wheel taxonomy** — 8 canonical areas (do not duplicate):
  Health, Mind, Work, Money, Love, Connections, Home, Fun
  (`LIFE_WHEEL_AREA_TAXONOMY` in `lifeWheelTaxonomy.ts`, keyed to `LifeWheelCategoryKey`).
  Check-in data: `src/features/checkins/LifeWheelCheckins.tsx`, `src/services/checkins.ts`.
- **Goals** — `src/services/goals.ts`, `src/services/lifeGoals.ts`, `src/features/goals/*`,
  `src/components/LifeGoalInputDialog.tsx`.
- **Habits** — `src/services/habitsV2.ts` (`habits_v2`, `habit_logs_v2`),
  `src/features/habits/{HabitWizard,HabitsModule,UnifiedTodayView}.tsx`.
- **AI patterns** — `src/features/ai-coach/AiCoach.tsx`, `src/hooks/useGoalCoachChat.ts`,
  `supabase/functions/goal-coach-chat/index.ts`, `supabase/functions/suggest-goal/index.ts`.
- **Export/render** — `html2canvas`, `src/utils/imageGenerator.ts`.

---

## 2. Product architecture

Five distinct products. They must not be conflated.

| Product | Question it answers | Status | Code |
|---------|--------------------|--------|------|
| **Compass Book** | Where am I now? What guides me? What life fits me? What to explore? What to commit to? How do I sustain? | **NEW (this plan)** | `src/features/compass-book/*` (to be created) |
| **In-game Compass** | What does my current chapter look like right now, while I play? | Repurpose seam | new compact panel, mounted at the existing `CompassModal` seam in `IslandRunBoardPrototype.tsx` |
| **Quest Pulse** | How am I doing right now? (live analytics/momentum) | Existing, keep | `src/features/quest-compass/*` |
| **My Quest** | What am I currently committed to? (Primary/supporting quests, milestones) | Existing | goals/habits surfaces |
| **Quest Leaps** | Did a short real-life experiment produce evidence? | Future (PR 12) | not built yet; architecture must not block it |

### 2.1 The long-term loop

```
Compass Book   → understand the player, generate hypotheses
Quest Leaps    → test uncertain ideas in real life
My Quest       → convert evidence-backed direction into commitment
Habits         → operationalise the quest into repeatable behaviour
Quest Pulse    → observe balance, momentum, risk, change
Compass review → confirm or reject new learning, update the model
```

**Invariant:** AI never silently rewrites the player's model. Every inferred update is a
*proposal* the player must confirm.

### 2.2 Two entry points, one engine

- **Player Menu** owns the full book (cover, contents, six chapters, guided flow, direct edit,
  AI assist, review, goal/habit bridges, full history). Full-screen mobile sheet/route.
- **In-game Compass** shows a compact current-chapter window only (title, evolving graphic,
  completion %, fragments `n/20`, five-stage progress, latest insight, next fragment, two buttons:
  continue fragment / open full book).
- Both surfaces are powered by the **same chapter state + same `CompassChapterGraphic` component**,
  rendered in different `mode`s (`compact` vs `full`).

---

## 3. Curriculum map

`chapterIndex = Math.floor((islandNumber - 1) / 20)` ·
`chapterActivityIndex = ((islandNumber - 1) % 20) + 1`
(This formula belongs to the **new** book only. The old Compass keeps its 11-phase model.)

| Ch | Title | Islands | Visual metaphor | Key output fields |
|----|-------|---------|-----------------|-------------------|
| 1 | **The Living Wheel** | 1–20 | Mechanical/magical life wheel of the 8 areas, layered (condition, emotional weather, movement, attention, spillover) | Engine · Brake · Fragile Spoke · Lever · season · dominant emotional pattern · next move · Wheel statement |
| 2 | **The Inner Compass** | 21–40 | Four-direction compass (N=values, E=energy, S=needs, W=drift) | True North · Life Spark · Shadow Pull · Guardian Boundary · Compass statement |
| 3 | **The Living Horizon** (a.k.a. The Life I Could Live) | 41–60 | Panoramic future-life landscape (Sanctuary, Workshop, Gathering Place, Vital Path, Open Gate, Horizon) | Desired Rhythm · Essential Scene · Price I Will Not Pay · Horizon statement (Life Design Brief) |
| 4 | **The Ikigai Map** | 61–80 | Constellation map (NOT a 4-circle Venn) of 5 forces: Curiosity, Capability, Contribution, Viability, Willingness | Spark · Gift · Need · Trial · 3 candidate paths · Mirage warning · chosen experiment |
| 5 | **The Quest Forge** | 81–100 | Forge chamber + central Quest Crest | Calling · First Milestone · Protected Flame · Cost Accepted · Primary/supporting/maintenance/exploration/Not Now/Release · review point |
| 6 | **The Personal Playbook** | 101–120 | Magical-mechanical operating system / control panel | Start Engine · Momentum Loop · Minimum Mode · Warning Lights · Environment Rules · Recovery Route · Weekly Compass Check · operating principle |

### 3.1 Shared chapter shape

Each chapter = 1 anchor framework + 20 small activities + gradual visual construction + 1 final
one-page artifact + structured outputs + optional goal/habit implications + player confirmation.

**Visual build cadence (per chapter):**
- Activities 1–4 → base visual appears
- 5–8 → colours, categories, primary signals
- 9–12 → patterns and relationships
- 13–16 → key insights identified
- 17–19 → direction/action selected
- 20 → review, confirmation, animation, seal

The final graphic must feel **partially complete throughout** — never "blank until activity 20".

### 3.2 Activity arcs (per brief, summarized)

- **Ch1 (1–20):** reveal wheel (1–4) → score + good-enough (5–8) → emotional weather (9–12) →
  mechanics + spillover (13–16) → create movement (17–19) → confirm (20).
- **Ch2 (21–40):** revealing moments (21–24) → values-in-action trade-offs (25–28) → needs (29–32)
  → strength & shadow (33–36) → alignment & drift (37–39) → set compass (40).
- **Ch3 (41–60):** ordinary good day (41–44) → place & people (45–48) → work that fits (49–52)
  → challenge & responsibility (53–55) → enough (56–57) → anti-vision (58–59) → horizon (60).
- **Ch4 (61–80):** spark (61–64) → gift (65–68) → need (69–72) → viability (73–75) →
  willingness (76–77) → generate 3 paths (78) → choose Trial (79) → illuminate (80).
- **Ch5 (81–100):** gather material (81–84) → test motive (85–88) → test alignment/impact (89–92)
  → test reality (93–95) → test timing (96–97) → opportunity cost (98) → portfolio (99) → forge crest (100).
- **Ch6 (101–120):** study past movement (101–103) → Start Engine (104–106) → Momentum Loop
  (107–109) → Minimum Mode (110–112) → Warning Lights (113–114) → environment (115–116) →
  Recovery Route (117–118) → Weekly Compass Check (119) → complete playbook (120).

---

## 4. Data authority

Single source of truth for each concern. Crossing these boundaries is a hard-constraint violation.

| Concern | Authority | Compass Book may… |
|---------|-----------|-------------------|
| **Island unlock** | Island Run state (`useIslandRunState`, `currentIslandNumber`) | **read only** via canonical hook; never mutate game state |
| **Compass answers** | new `compass_chapter_states.answers` (JSONB) | own and write; this is new storage |
| **Chapter output** | new `compass_chapter_states.{draft_output, confirmed_output}` | own; `draft` is deterministic projection, `confirmed` is player-sealed |
| **Goals** | `src/services/goals.ts` / `lifeGoals.ts` (`goals` tables) | **propose only**; create only via canonical service after explicit approval |
| **Habits** | `src/services/habitsV2.ts` (`habits_v2`) | **propose only**; create only via canonical service after explicit approval |
| **Life Wheel** | `lifeWheelTaxonomy.ts` + `checkins` | read taxonomy + check-in data; never duplicate the taxonomy |
| **AI proposals** | dedicated narrow Compass endpoint (future) | draft text/proposals only; never auto-write; every patch confirmed |
| **Old Compass** | `compass_state` / `compassCurriculum.ts` | leave entirely untouched |

**Determinism rule:** the chapter projector (`answers → draft_output`) is pure and must not
depend on AI. AI may *draft language* on top, but the projector runs without it.

---

## 5. Component plan

Namespace: `src/features/compass-book/`. Definitions in `content/` contain **no React**.

```
src/features/compass-book/
  content/                       # pure data, no JSX
    compassBookCurriculum.ts     # assembles + validates all chapters; exports unlock/index helpers
    chapter1LivingWheel.ts
    chapter2InnerCompass.ts
    chapter3LivingHorizon.ts
    chapter4IkigaiMap.ts
    chapter5QuestForge.ts
    chapter6PersonalPlaybook.ts
  types.ts                       # CompassBookActivityDefinition, block types, answer/output types
  logic/
    unlock.ts                    # islandNumber → unlocked activity ids (pure)
    progress.ts                  # locked/unlocked/started/answered/complete (pure)
    projectors/
      chapter1Projector.ts       # answers → draft_output (pure, deterministic)
      ...                        # one per chapter as chapters ship
  services/
    compassBookService.ts        # book + chapter_state CRUD (Supabase), demo/local fallback
  hooks/
    useCompassBook.ts            # load/save/resume, derive progress from Island Run state
  components/
    CompassBookScreen.tsx        # full-screen sheet/route container (Player Menu)
    CompassBookCover.tsx
    CompassBookContents.tsx
    CompassChapterCard.tsx       # locked/current/completed states
    CompassChapterScreen.tsx     # one chapter: flow + graphic + review
    CompassChapterGraphic.tsx    # shared graphic API (mode: compact|full|export)
    CompassChapterProgress.tsx   # five-stage progress indicator
    CompassActivityRenderer.tsx  # renders blocks for one activity
    CompassGuidedFlow.tsx        # fixed-guided completion path
    CompassDirectEditor.tsx      # direct structured-field editing
    CompassAIHelper.tsx          # optional per-question "Help me think" (PR 11)
    CompassChapterReview.tsx     # activity 20 review + seal
    CompassGoalBridge.tsx        # reviewable goal proposal → goals service (PR 9)
    CompassHabitBridge.tsx       # reviewable habit proposal → habitsV2 (PR 10)
    chapter-graphics/            # one visual component per chapter (NOT 120 components)
      LivingWheelGraphic.tsx
      InnerCompassGraphic.tsx
      ...
  game/
    CompactGameCompassPanel.tsx  # in-game compact window (PR 5)
```

**Shared graphic API:**

```ts
type CompassChapterGraphicProps = {
  chapterId: CompassBookChapterId;
  state: CompassChapterState;
  mode: "compact" | "full" | "export";
  progress: CompassChapterProgress;
  readonly?: boolean;
};
```

All six graphics share: framing, completion effects, title, seal, responsive behaviour, export
mode, accessibility fallback, compact/full mode. Each renders its own metaphor internally.

**Anti-patterns to avoid (hard constraints):** no 120 custom components, no single monolithic
Compass component, no coupling of full-book UI to Island Run runtime internals, no parallel
Life Wheel / goal / habit stores.

---

## 6. Persistence plan

### 6.1 Tables (new — first needed migration is `0256`)

**`compass_books`** — one active book per user per curriculum version.

| column | type | notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid | FK auth.users, RLS owner |
| `curriculum_version` | text | e.g. `'v1'` |
| `status` | text | `not_started \| in_progress \| completed` |
| `current_chapter_id` | text | stable id |
| `current_activity_id` | text | stable id |
| `created_at` / `updated_at` / `completed_at` | timestamptz | |

**`compass_chapter_states`** — one row per book × chapter.

| column | type | notes |
|--------|------|-------|
| `id` | uuid PK | |
| `book_id` | uuid | FK `compass_books` |
| `user_id` | uuid | denormalized for RLS |
| `chapter_id` | text | stable id |
| `content_version` | text | curriculum version this answer set was authored under |
| `status` | text | `locked \| unlocked \| in_progress \| complete` |
| `answers` | jsonb | array of answer records (shape below) |
| `draft_output` | jsonb | deterministic projection |
| `confirmed_output` | jsonb | player-sealed snapshot (null until activity 20 confirmed) |
| `completed_activity_ids` | text[] | |
| `confirmed_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

**Future link tables (do NOT create until their PR):** `compass_goal_links`,
`compass_habit_links`, `quest_leaps`, `quest_leap_evidence`.

### 6.2 Answer record shape (stable IDs, never array-position identity)

```ts
type CompassAnswer = {
  activityId: string;       // stable
  questionId: string;       // stable
  value: unknown;           // typed per block
  sourceMode: "fixed_guided" | "direct_edit" | "ai_guided";
  curriculumVersion: string;
  answeredAt: string;       // ISO
  updatedAt: string;        // ISO
  confirmed: boolean;
  // optional snapshots for forward-compat readability
  promptLabel?: string;
  optionLabels?: Record<string, string>;
};
```

Curriculum definitions carry `curriculumVersion`, `chapterId`, `activityId`, `questionId`,
`islandNumber`. If wording changes, old answers stay readable via the snapshot fields and a new
versioned bundle; redoing a chapter under a newer version must not destroy the old confirmed output.

### 6.3 RLS

Owner-only on both tables: `user_id = auth.uid()` for select/insert/update/delete. Mirror the
policy style already used by `0252_compass_state.sql` and the goals/habits migrations for consistency.

### 6.4 Demo / local mode

Provide a local fallback store (mirroring how existing services degrade without a session) so the
book is explorable in demo mode without writing to Supabase.

### 6.5 Migration / rollback

- Forward: `0256_compass_books.sql` (both tables + indexes on `user_id`, `book_id`, `chapter_id` + RLS).
- Rollback: drop new tables only. **No touch** to `compass_state`, goals, or habits tables.
- Old 11-phase `compass_state` is **never** migrated into the new shape.

---

## 7. PR sequence

Small PRs, each ending with the required PASS/PARTIAL/FAIL report. Dependencies are linear unless noted.

| PR | Scope | Depends on | Key tests | Notable blockers |
|----|-------|-----------|-----------|------------------|
| **1** | Foundation: namespace, types, 6 chapter metadata, 20 stable slots each, full Ch1 content, versioned answer types, schema + RLS, services, pure unlock/progress/completion logic, tests, docs. **No visible entry points.** | — | curriculum (6 ch, 20 each, islands 1–120 unique, ids unique), unlock (1/20/21/40/60/80/100/120, <1, >120, returning), progress, persistence (RLS, create/save/reload) | none — fully additive |
| **2** | Player Menu book shell: full-screen sheet, cover, contents, 6 chapter cards, locked states, Ch1 route, responsive nav. **Wire the hero card** (replace preview for `app.compass_book`). Preserve Quest Pulse access. | 1 | UI nav, safe-area, hero still never opens Quest Pulse | flip `app.compass_book` gating without breaking preview voting |
| **3** | Ch1 fixed-guided flow: activity renderer, Ch1 questions, save/resume, direct review/edit, progress, returning-user unlock. | 1,2 | answer (fixed/direct/edit/skip-optional), progress (complete-without-confirm stays incomplete) | none |
| **4** | Ch1 Living Wheel graphic: Life Wheel input adapter, projector, app-rendered graphic, compact/full, confirmation + seal. | 3 | projector determinism (Engine/Brake/Fragile/Lever proposed not declared) | graphic perf budget |
| **5** | In-game Compass integration: repurpose `CompassModal` seam → `CompactGameCompassPanel`. Show current chapter/visual/completion/next fragment/open-book. **No Island Run mutation.** | 4 | no board-state mutation, no scroll-lock breakage, compact perf | careful seam swap in `IslandRunBoardPrototype.tsx` |
| **6** | Chapter 2 (content + flow + projector + Inner Compass graphic) | 4 | per-chapter curriculum + projector | — |
| **7** | Chapter 3 (Living Horizon) | 6 | as above | — |
| **8** | Chapter 4 (Ikigai Map + Quest Leap proposal *type* only) | 7 | as above | constellation graphic complexity |
| **9** | Chapter 5 (Quest Forge) + reviewable **goal** bridge | 8 | bridge: no auto-create, explicit confirm, canonical service, provenance retained, rejection = no change | — |
| **10** | Chapter 6 (Personal Playbook) + reviewable **habit** bridge | 9 | bridge tests as above; ≤3 supporting habits as warning not enforcement | — |
| **11** | Optional AI: per-question "Help me think", narrow structured proposal endpoint, player confirmation, privacy controls, failure fallbacks | 3+ | AI: no key/timeout/malformed/refusal/empty/rejected/partial → no auto-writes | needs dedicated Supabase function |
| **12** | Quest Leaps (only after chapters + proposal model stable) | 9–10 | leap lifecycle (Adopt/Expand/Adjust/Repeat/Pause/Release) | scope guard: not every island is a leap |

Sequence may be adjusted if repository reality justifies it, but the major layers must not be combined.

### 7.1 Goal & habit bridges (PR 9 / 10)

- **Goal proposal** carries: origin chapter, origin activity/answer, current baseline,
  good-enough target, ideal-later, first milestone, success evidence, time horizon, accepted cost,
  protected boundaries, review date. Created only via `goals.ts`/`lifeGoals.ts` after explicit approval.
- **Habit proposal** carries: linked goal, normal/small/minimum versions, cue, environment rule,
  completion evidence, recovery rule, protected life area. Created only via `habitsV2.ts` after approval.
- **Score model** per area: current · aspirational ideal · seasonal good-enough · minimum-safe ·
  importance · momentum · spillover · confidence. **Action gap = good-enough − current** (not ideal − current).
- **State classes:** Protect · Maintain · Improve · Repair · Explore.
- **Three measurements** kept distinct: Behaviour ≠ Goal progress ≠ Life-state improvement.

---

## 8. Visual-reference interpretation

The brief references six chapter concept-art images. **These images are not present in the repo**
(only `public/assets/ikigai/ikigai-diagram.svg` exists). Treat the descriptions below as the
working interpretation; if the real concept art is added later, treat it as mood/direction only —
never as flattened final UI, and never copy text baked into an image.

General rule for every chapter: a **static illustrated layer** (optional decorative background)
sits behind a **live UI layer** (player values, scores, labels, progress, icons, highlights,
statements) rendered with accessible SVG/CSS. Text inside concept images is never production content.

| Chapter | Preserve (mood/identity) | App-render (live) | Do not copy literally | Compact vs full |
|---------|--------------------------|-------------------|-----------------------|-----------------|
| 1 Living Wheel | mechanical/magical wheel, segment-per-area, layered rings | scores, emotion indicators, momentum arrows, Engine/Brake/Fragile/Lever badges, season, statement | any baked-in sample area labels or numbers | compact: wheel + completion + one insight; full: wheel + detail panels + edit |
| 2 Inner Compass | 4-direction rose, centre needle | values/needs/strength/shadow text, True North, Life Spark, Guardian Boundary, alignment/drift | sample value words drawn in art | compact: rose + headline output; full: all four directions + statement |
| 3 Living Horizon | panoramic landscape with named zones | Sanctuary/Workshop/Gathering/Vital Path/Open Gate fills, rhythm, enough, anti-vision, price | depicted buildings as literal assets-of-record | compact: skyline + horizon statement; full: zone detail |
| 4 Ikigai Map | constellation (NOT 4-circle Venn), 5 force-systems, glowing route | signal strengths, 3 path nodes, conflicts, Mirage warning, chosen Trial | fixed star labels in art | compact: constellation + Trial; full: full map + path detail |
| 5 Quest Forge | forge chamber, central crest, vault | Primary crest, supporting emblems, maintenance ring, exploration slot, Not Now vault, released fragments, Calling/Milestone/Flame/Cost | sample quest names | compact: crest + first milestone; full: full portfolio |
| 6 Personal Playbook | control-panel / OS dashboard | Start Engine, Momentum Loop, Minimum Mode, Warning Lights, Environment Rules, Recovery Route, Weekly Check, operating principle | dial labels baked in art | compact: panel summary + next action; full: all 7 systems |

**Compact mode constraints:** render efficiently, avoid heavy canvas generation, fit mobile,
never block board performance, show only the current chapter. **Export mode** (html2canvas) is
deferred until live UI works — do not put user text into a generated image asset.

---

## 9. Hard constraints (carry into every PR)

- Do not undo the Quest Pulse rename; do not let Compass Book routes open Quest Pulse.
- Do not overwrite or migrate old `compass_state` / the 11-phase answers.
- Do not duplicate Life Wheel taxonomy, goal storage, or habit storage.
- Do not mutate Island Run from Compass services; do not block Island Run on reflection completion;
  do not treat skipped fragments as game failure.
- Do not add economy rewards without a separate balance review.
- Do not auto-create goals or habits; do not let AI silently update answers or claim interpretation as fact.
- Do not put user text into generated image assets.
- Do not build 120 components or one monolith; do not couple full-book UI to Island Run internals.
- Do not require long written answers for most activities; do not aim for every area to be 10/10;
  do not confuse habit adherence with life improvement.
- Quest Leaps are selective, never mandatory per island.
- Preserve mobile-first performance and safe-area behaviour.

---

## 10. Core product philosophy

The Compass Book is **not** an everything-optimiser. Its purpose: understand the whole life,
identify one meaningful movement, protect what already works, test uncertainty, and build only the
goals and habits the current season needs. The six chapters should ultimately let the player say:

> I understand where my life is now. I know what guides me. I can see the kind of life I want.
> I can identify directions worth testing. I have chosen what to pursue. I know how to keep moving and recover.

The in-game Compass makes that progress feel visible and game-like by showing the current chapter's
graphic gradually filling as the player advances through the 120-island journey.

---

## 11. Open items / blockers before PR 1

1. **Concept art missing** — the six chapter images are not in the repo. PR 1–4 do not need them
   (foundation + Ch1 graphic can ship from the descriptions here), but final visual polish should
   wait for the real art or an explicit decision to proceed without it.
2. **Curriculum investigation doc name mismatch** — brief cites
   `docs/investigations/compass-book-curriculum-investigation.md`, which is absent. This plan stands
   in as the curriculum source of truth; if that doc is later added, reconcile.
3. **Curriculum version string** — propose `'v1'` as the initial `curriculumVersion`/`content_version`.
4. **Next migration number** is `0256` (latest on branch is `0255`).
