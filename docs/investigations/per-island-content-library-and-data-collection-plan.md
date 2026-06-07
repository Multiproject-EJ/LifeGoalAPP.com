# Per-Island Content Library & Game Data Collection Plan

Date: 2026-06-07
Status: Planning (no code changes in this doc)
Scope: Plan a scalable per-island content library, the information collected from the
game, and whether game-gathered info needs its own data table.

---

## 0) The question this plan answers

> "Build a much bigger library, starting with what should be on island 1, then island 2,
> etc., so we can plan what info should be collected. Also: should there be a dedicated
> data table for info gathered from the game?"

Short answers:

1. **Library** — Don't hand-author 120 separate islands. Build **one tagged content pool**
   (habits, wisdom, prompts) + a thin **per-island descriptor** that *selects and weights*
   from the pool by island band + the player's weak life areas. Early islands run a fixed
   onboarding curriculum; later islands become adaptive.
2. **Info collection** — Stage it across the 5-act arc (a "life-data curriculum"): baseline
   → habit-fit → motivation → environment → identity/reflection.
3. **Data table** — **Yes, add a dedicated `game_life_intake` table.** It captures the raw,
   source-tagged signal from the game (including skips and partial answers), separate from
   the authoritative `habits_v2` / `goals` / `checkins` records it can spawn and link to.

---

## 1) The progression skeleton we attach to (verified)

- **120 islands**, linear (`island N → N+1` on expiry), grouped into a 5-act arc
  (`islandNames.ts`):
  - Act 1 Awakening (1–24), Act 2 Growth (25–48), Act 3 Power (49–72),
    Act 4 Mastery (73–96), Act 5 Futuristic/Transcendence (97–120).
- **Same 40-tile board + 5 fixed stops on every island** (`islandRunStops.ts`):
  `hatchery`, **`habit`**, `mystery`, `wisdom`, `boss`.
  - Only the **Mystery** stop already varies per island (seeded from a small pool:
    breathing / habit / check-in / vision-quest).
- Per-island variation today is otherwise just **art / name / rarity** (special islands
  `[5,12,18,…,120]`), driven deterministically by `islandNumber`.

**Implication:** the hooks for per-island *content* already exist (deterministic seed by
island number + per-island art manifest). We add a **content manifest** layer beside the
art manifest, rather than new board/movement logic.

## 2) The libraries we have today (all island-agnostic)

| Library | File | Shape | Size |
|---|---|---|---|
| Suggested habits | `src/features/habits/suggestedHabitLibrary.ts` | `SuggestedHabit` (area, tiny/normal/stretch, cues, blockers, timing) | 24 (8 areas × 3) |
| Wisdom cards | `src/features/gamification/level-worlds/services/wisdomTreeCards.ts` | `WisdomTreeCard` (elemental category, story, choices) | ~themed deck |
| Check-in questions | `src/features/checkins/LifeWheelCheckins.tsx` (`QUESTIONS`) | per life-wheel category, 1–3 scale | 24 (8 cats × 3) |
| Area presets | `islandRunLifePromptTemplates.ts` | per-area starter strings | 8×3 |

None of these are keyed to an island. The "much bigger library" is about (a) growing these
pools and (b) giving each island a recipe for which slices to surface.

## 3) Taxonomy bridge (must fix first)

The game uses **8 island areas**; check-ins use **8 category keys**. They are *not* aligned:

| Island area | Check-in category key | Notes |
|---|---|---|
| Health | `health_fitness` | clean |
| Mind | `spirituality_community` | clean (Mind, Meaning & Awareness) |
| Work | `career_development` | shares with Growth |
| Money | `finance_wealth` | clean |
| Relationships | `love_relations` | `family_friends` has no island area |
| Home | `living_spaces` | clean |
| Growth | `career_development` | collides with Work |
| Fun | `fun_creativity` | clean |

**Decision needed:** either (A) expand the island taxonomy to a clean 8 that match check-in
keys (split Relationships→Love + Connections, keep Growth distinct from Work), or (B) keep a
mapping table where Relationships = min(love_relations, family_friends) and Growth/Work share
`career_development`. Recommendation: **(A)** for long-term clarity, done once in a single
`lifeWheelTaxonomy.ts` shared by check-ins, habits, and the island library.

## 4) Per-island content library model (recommended)

```
lifeWheelTaxonomy.ts        // single source of truth: 8 areas <-> check-in keys, labels
contentLibrary/
  habitPool.ts              // grown SuggestedHabit[] (target 8 areas × ~8–12 each)
  wisdomPool.ts             // grown WisdomTreeCard[] tagged by area + band
  promptPool.ts             // intake/reflection prompts tagged by area + band + depth
islandContentManifest.ts    // getIslandContentPlan(islandNumber): selects/weights pool
```

`getIslandContentPlan(islandNumber)` returns, deterministically:
- `band` (act 1–5) and `depthTier` (how deep the info-collection goes).
- `habitFocusAreas` — for early islands a **fixed curriculum**; from a threshold island on,
  the **player's weak areas** (check-in < 5) drive this.
- `wisdomCardPool` / `promptPool` filtered by band + focus areas.
- `intakeStage` — which slice of the curriculum (section 5) this island collects.

This scales to 120 with no per-island authoring: content is **tagged once**, islands are
**recipes**. Special/milestone islands (`[5,20,30,60,90,120]`) can override with set-pieces.

### Fixed vs adaptive split
- **Islands 1–~5 (onboarding):** fixed curriculum — guarantee a full check-in, one starter
  habit, first wisdom beat. Predictable first-run.
- **Island ~6 → 120:** adaptive — surface only **weak** life areas and gaps in coverage,
  deepening the info collected as bands progress.

## 5) What info to collect — staged "life-data curriculum"

Map the 5 acts to escalating depth. Each stage reuses the game's existing low-friction,
one-tap prompt style (never blocks gameplay).

| Act / Band | Theme | Info collected | Lands in |
|---|---|---|---|
| 1 Awakening | Baseline & awareness | Full check-in (8 scores), weakest areas, first tiny habit | `checkins`, `habits_v2` |
| 2 Growth | Habit fit | Energy/time/style prefs, blockers, tiny/normal/stretch choice, cue | `habits_v2` env fields + intake |
| 3 Power | Motivation & goals | Why-it-matters, link habit→goal, success condition | `goals`, intake |
| 4 Mastery | Environment & identity | Environment design, restart/repair plan, identity statement | `habits_v2` env, intake |
| 5 Transcendence | Reflection & integration | Periodic reflection, what's working, balance review | `journal`/intake |

Each prompt records the **answer or the skip**, so the curriculum is resumable and the
recommender learns even from non-answers.

## 6) Data table recommendation — add `game_life_intake`

**Recommendation: yes, a dedicated table.** The dual-engine investigation already proposed
this (`source='island_run'`) and deferred it; the "much bigger library" vision is exactly the
case that justifies it.

Why not just reuse `habits_v2` / `goals` / `checkins`:
- Those are **authoritative outcomes**. The game collects **process signal** — partial
  answers, skips, blocker/motivation text, "too easy/too hard" feedback — that doesn't belong
  on a habit row and would overload `environment_context` JSON (flagged as a risk in the
  habit-intelligence doc).
- We want **source-tagged, queryable** history per prompt context for the coach/recommender
  and product analytics, independent of whether a habit/goal was created.

Proposed schema (one migration):

```
game_life_intake
  id              uuid pk
  user_id         uuid  (RLS: owner only)
  created_at      timestamptz
  updated_at      timestamptz
  source          text   -- 'island_run'
  island_number   int
  prompt_context  text   -- 'habit_landmark' | 'wisdom_landmark' | 'mystery_checkin' | ...
  intake_stage    text   -- baseline | habit_fit | motivation | environment | reflection
  life_wheel_area text   -- canonical area key (nullable)
  payload         jsonb  -- stage-specific answers (energy/time/style, blocker, why, cue, …)
  state           text   -- 'accepted' | 'completed' | 'skipped'
  linked_habit_id uuid   (nullable)
  linked_goal_id  uuid   (nullable)
  linked_checkin_id uuid (nullable)
```

- Mirrors existing patterns (`telemetry_events`, `xp_transactions`) and RLS conventions.
- MVP fallback: log to `localStorage` + `telemetry_events` first, ship the table when the
  schema settles — but for the planned scale, do the table.

## 7) Immediate slice — adaptive Habit Landmark (decisions locked)

Concrete change to `IslandRunLifePromptCard.tsx` (uses existing services; no gameplay writes),
per the product decisions made:

1. **Require a full check-in first.** On open, load latest `checkins`. If none, show a
   gate: short copy + a button that launches the **Full Check-in** flow, then returns to the
   habit step. (Needs a navigation/callback wire from the board modal to the check-in surface.)
2. **Compute weak areas.** Map check-in categories → island areas (section 3). An area is
   **weak** if its latest check-in score is **< 5** ("Needs focus" band).
3. **Skip OK areas.** An area is hidden when it has a **good score AND ≥1 supporting active
   habit** (detect via `habits_v2.domain_key` and the `Area: X` tag in `habit_environment`).
4. **Offer only weak/uncovered areas** in the area picker; keep the existing energy/time/style
   → suggestion → size/timing → create flow unchanged after selection.
5. **If every area is OK** (none weak), fall back to showing **all areas** so the player can
   still add a habit.

This is shippable on its own and becomes the Act-1/Act-2 entry point of the larger curriculum.

## 8) Roadmap (safe slices)

- **A.** Plan/approve this doc.
- **B.** `lifeWheelTaxonomy.ts` — fix the 8-area ↔ 8-category bridge once.
- **C.** Adaptive Habit Landmark (section 7) using existing services.
- **D.** Grow the content pools (habits → ~8–12/area, wisdom tagged by area+band, prompt pool).
- **E.** `getIslandContentPlan(islandNumber)` recipe layer (fixed early, adaptive later).
- **F.** `game_life_intake` table + service; route landmark answers/skips through it.
- **G.** Stage the deeper curriculum prompts (motivation/environment/reflection) by band.
- **H.** Optional AI supercharger (draft suggestions/summaries only; never authoritative).

## 9) Guardrails (carried from existing contracts)

- No Island Run gameplay/economy/runtime-state writes from this content path.
- AI enriches, never gates; deterministic presets render first.
- All habit/goal writes go through `habitsV2` / `goals` services.
- Reward/stop completion stays independent of answers (skips never block progress).

## Files referenced

- `src/features/gamification/level-worlds/services/islandNames.ts`,
  `islandRunStops.ts`, `islandBoardTileMap.ts`, `islandRunIslandMetadata.ts`,
  `islandArtManifest.ts`, `islandRunProgression.ts`
- `src/features/gamification/level-worlds/components/IslandRunLifePromptCard.tsx`,
  `IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/services/islandRunLifePromptTemplates.ts`,
  `islandRunLifeIntakeService.ts`, `wisdomTreeCards.ts`
- `src/features/habits/suggestedHabitLibrary.ts`, `src/services/habitsV2.ts`
- `src/features/checkins/LifeWheelCheckins.tsx`, `src/services/checkins.ts`,
  `src/services/balanceScore.ts`
- `src/lib/database.types.ts` (`checkins`, `habits_v2`, `goals`, `island_run_runtime_state`,
  `telemetry_events`, `xp_transactions`)
- Prior docs: `docs/investigations/island-run-dual-engine-life-data-investigation.md`,
  `docs/investigations/suggested-habit-intelligence-architecture.md`
</content>
</invoke>
