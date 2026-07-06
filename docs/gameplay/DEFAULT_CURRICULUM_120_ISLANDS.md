# Default curriculum for the 120-island game loop — planning doc

Status: Tier A + Tier B (Option A) now implemented — see "Implementation status" below.
Companion doc: `MODAL_VARIETY_ANALYSIS.md` (why the current two modals feel repetitive).

## Implementation status

- **Tier A (Behavior stop) — DONE.** `services/islandRunReflectionCurriculum.ts` sources each island's check-in cards from the Compass Book curriculum (one chapter "core question" card + up to 3 per-island facet cards derived from that island's activity blocks, always ≥2 for the tournament). `IslandRunReflectionComposer` now reads from it instead of the fixed 6-prompt array. Out-of-range islands fall back to the legacy 6 prompts. Covered by `__tests__/islandRunReflectionCurriculum.test.ts`.
- **Tier B (Card Stack Draw), Option A — DONE.** `services/islandRunClueCardCurriculum.ts` reframes the draw's two questions per chapter (3 themed variants each, selected by the island's position in its chapter). `IslandRunGamifiedJournalCard` now reads from it. Covered by `__tests__/islandRunClueCardCurriculum.test.ts`.
- **Within-island Card-Draw rotation — DONE.** `getClueCardPromptsForIsland(islandNumber, drawIndex)` now advances through the chapter's three question variants across successive draws on the same island (the board passes the per-island draw index from the cadence gate). Covered by `__tests__/islandRunClueCardCurriculum.test.ts`.
- **Still deferred:** the deeper Option B coupling, and the cycle-2+ repeat decision / adaptive personalization hook.

## Goal

Define — before any code is written — what a "default curriculum" means for this game: a fixed, adaptable, per-island table of what content shows at which landmark, across all **120 islands**, so the "Behavior stop" (Mystery-stop check-in) and "Card Stack Draw" (ring-tile journal card) modals stop repeating the same tiny handful of prompts and instead draw from a real per-island content pool — while still allowing a future adaptive/personalized curriculum to override the default per player.

## Terminology check (island vs. landmark)

Per `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`, each of the **120 islands** has exactly **5 landmarks** (called "stops" in code, "landmarks" in UI): `Hatchery → Habit → Mystery → Wisdom → Boss`. That's **120 × 5 = 600 landmark instances total**, not literally 120 landmarks — "120" is the island count. This doc plans content **per island** (i.e., per Mystery-stop occurrence and per set of Card-Draw occurrences within that island), which is the granularity that actually matters for repetition.

## What already exists that a default curriculum can lean on

The **Compass Book** (`src/features/compass-book/`) is already a fully-authored 120-row content table — one activity per island number, grouped into 6 chapters of 20 islands each. This is the natural backbone for a "default curriculum": it already satisfies "one distinct thing per island, for all 120," it's already validated (`validateCompassCurriculum()` checks exactly 120 activities, unique per island), and its `outputFields` per chapter give each 20-island arc a real narrative throughline instead of being 120 disconnected questions.

| Chapter | Islands | Core question | Life-area theme |
|---|---|---|---|
| 1. The Living Wheel | 1–20 | Where is my life moving, where is it stuck, what could improve several areas at once? | Life-wheel audit (health, mind, work, money, love, connections, home, fun) |
| 2. The Inner Compass | 21–40 | What truly guides me, what gives me life, what do I need, what pulls me off course? | Values / energy / needs / drift |
| 3. The Living Horizon | 41–60 | What kind of ordinary life would genuinely fit me, not merely impress me? | Future daily-life vision |
| 4. The Ikigai Map | 61–80 | Which possible directions have enough alignment to deserve a real-world test? | Direction-finding (spark/gift/need/viability) |
| 5. The Quest Forge | 81–100 | Which possibilities deserve commitment now, and what must I intentionally not carry? | Commitment / prioritization |
| 6. The Personal Playbook | 101–120 | How do I personally begin, continue, adapt, recover, and stay oriented? | Habits / personal operating system |

Today this content is only shown as an **optional, skippable overlay** at the Habit and Wisdom stops (`CompassStopFragmentMount.tsx`) — it never reaches the Mystery-stop "Behavior stop" modal or the ring-tile "Card Stack Draw" modal, which is exactly why those two keep recycling their own tiny hardcoded pools instead.

## Proposed default curriculum shape

Two content tiers, matched to how long each modal is meant to take:

### Tier A — Mystery stop "Behavior stop" (once per island, ~30–60s)
Replace the current fixed 6-prompt tournament with a **per-island lookup into the Compass Book activity for that island number** (or a same-shaped but shorter derivative — see Option B below). Concretely:
- Island N's Behavior-stop content = a condensed version of Compass Book activity N (its `title`, `coreQuestion`-flavored prompt, and 1–2 of its blocks converted to the existing "pick a card, then optional written detail" interaction the modal already supports).
- This means **every one of the 120 islands shows genuinely different Behavior-stop content**, themed by the chapter's stage in the arc (self-audit → values → vision → direction → commitment → habits), instead of 6 tokens shuffled forever.
- The elimination-tournament UI itself doesn't need to change — only its data source changes from `REFLECTION_PROMPTS` (6 fixed) to `getCompassActivityForIsland(islandNumber)` (120 distinct, already defined).

### Tier B — Card Stack Draw (ring-tile "Daily Clue Card", can recur multiple times per island)
This one is harder to source 1:1 from Compass Book because it can fire several times within a single island (it's tile-based, not landmark-based), so reusing that island's *single* Compass activity for every draw within the same island would reintroduce repetition within an island even if it varies between islands. Two options:
- **Option A (recommended default):** give the Card Draw a **per-chapter pool** (not per-island) — e.g., a bank of ~10–15 clue-card question pairs per chapter/theme (60–90 total, still far more than 2), keyed off the chapter the player's current island belongs to (from the table above). Draws within the same island rotate through that chapter's pool without immediate repeats; crossing into a new chapter (every 20 islands) swings the flavor of the questions to match the new theme (e.g., chapter 3 "Living Horizon" islands ask more forward/vision-flavored clue questions than chapter 1's "Living Wheel" audit-flavored ones).
- **Option B (deeper but bigger lift):** derive Card Draw questions directly from the *same* Compass Book activity as that island's Behavior stop, just phrased as the lighter-weight "feel good / feel bad" format — keeps everything anchored to one 120-row table, at the cost of the Card Draw feeling identical in theme to that island's Behavior stop every time (less within-island variety, more cross-modal coherence).
- This doc recommends **Option A** as the default: it keeps the Card Draw feeling like a quick, varied side-token (its actual game role) while still being thematically synced to the island's chapter, and it avoids a hard 1:1 coupling between two modals that serve different pacing roles.

### What "default" vs "adaptive" means here
"Default curriculum" = the table below, always available as a deterministic fallback so design can review exactly what will be asked at every one of the 120 islands before a single line of code changes. An adaptive/personalized layer (e.g., swapping in a life-area the player has flagged as struggling, similar to the existing `ONBOARDING_CURRICULUM` habit-area adaptation in `islandContentManifest.ts`) can later override individual rows without changing the table's shape — the same pattern the Habit stop already uses today.

## The full 120-island default table (Tier A source)

This is the concrete "what's asked at each of the 120 islands' Behavior stop" — one row per island, sourced from the already-authored Compass Book activities. (Card Draw's Tier B chapter-pool content is a separate, shorter table to author per chapter — not one row per island — see "Open questions" below.)

| Island | Chapter | Activity # | Compass Book activity title (existing content) |
|---|---|---|---|
| 1 | 1. The Living Wheel | 1/20 | Your strongest area |
| 2 | 1. The Living Wheel | 2/20 | Your most strained area |
| 3 | 1. The Living Wheel | 3/20 | Most mental space |
| 4 | 1. The Living Wheel | 4/20 | What you avoid |
| 5 | 1. The Living Wheel | 5/20 | Current levels — core four |
| 6 | 1. The Living Wheel | 6/20 | Current levels — life four |
| 7 | 1. The Living Wheel | 7/20 | Good-enough — core four |
| 8 | 1. The Living Wheel | 8/20 | Good-enough — life four |
| 9 | 1. The Living Wheel | 9/20 | Minimum-safe — core four |
| 10 | 1. The Living Wheel | 10/20 | Minimum-safe — life four |
| 11 | 1. The Living Wheel | 11/20 | Emotional weather — core four |
| 12 | 1. The Living Wheel | 12/20 | Emotional weather — life four |
| 13 | 1. The Living Wheel | 13/20 | Momentum — core four |
| 14 | 1. The Living Wheel | 14/20 | Momentum — life four |
| 15 | 1. The Living Wheel | 15/20 | Spillover — core four |
| 16 | 1. The Living Wheel | 16/20 | Spillover — life four |
| 17 | 1. The Living Wheel | 17/20 | Pattern & Engine |
| 18 | 1. The Living Wheel | 18/20 | Brake & Fragile Spoke |
| 19 | 1. The Living Wheel | 19/20 | Lever & next move |
| 20 | 1. The Living Wheel | 20/20 | Confirm the wheel |
| 21 | 2. The Inner Compass | 1/20 | Most alive moment |
| 22 | 2. The Inner Compass | 2/20 | Proud of my behaviour |
| 23 | 2. The Inner Compass | 3/20 | Felt unlike myself |
| 24 | 2. The Inner Compass | 4/20 | What I keep seeking |
| 25 | 2. The Inner Compass | 5/20 | Protect without recognition |
| 26 | 2. The Inner Compass | 6/20 | Won't trade for success |
| 27 | 2. The Inner Compass | 7/20 | Shows in my behaviour |
| 28 | 2. The Inner Compass | 8/20 | Currently missing |
| 29 | 2. The Inner Compass | 9/20 | Foundational needs |
| 30 | 2. The Inner Compass | 10/20 | Growth needs |
| 31 | 2. The Inner Compass | 11/20 | Most neglected need |
| 32 | 2. The Inner Compass | 12/20 | Non-negotiable need |
| 33 | 2. The Inner Compass | 13/20 | Primary strength |
| 34 | 2. The Inner Compass | 14/20 | When strength overextends |
| 35 | 2. The Inner Compass | 15/20 | Shadow pattern |
| 36 | 2. The Inner Compass | 16/20 | Missing counterbalance |
| 37 | 2. The Inner Compass | 17/20 | Signs of alignment |
| 38 | 2. The Inner Compass | 18/20 | What pulls me off course |
| 39 | 2. The Inner Compass | 19/20 | Boundary I need |
| 40 | 2. The Inner Compass | 20/20 | Set the compass |
| 41 | 3. The Living Horizon | 1/20 | The ordinary morning |
| 42 | 3. The Living Horizon | 2/20 | Meaningful daytime |
| 43 | 3. The Living Horizon | 3/20 | Structure vs freedom |
| 44 | 3. The Living Horizon | 4/20 | A good evening |
| 45 | 3. The Living Horizon | 5/20 | Ideal environment |
| 46 | 3. The Living Horizon | 6/20 | Rooted or mobile |
| 47 | 3. The Living Horizon | 7/20 | Social intensity |
| 48 | 3. The Living Horizon | 8/20 | Relationships that belong |
| 49 | 3. The Living Horizon | 9/20 | Problems I prefer |
| 50 | 3. The Living Horizon | 10/20 | How I work |
| 51 | 3. The Living Horizon | 11/20 | Depth vs variety |
| 52 | 3. The Living Horizon | 12/20 | What work makes possible |
| 53 | 3. The Living Horizon | 13/20 | Desired responsibility |
| 54 | 3. The Living Horizon | 14/20 | Meaningful challenge |
| 55 | 3. The Living Horizon | 15/20 | Scale vs mastery |
| 56 | 3. The Living Horizon | 16/20 | Financial enough |
| 57 | 3. The Living Horizon | 17/20 | Time & proving |
| 58 | 3. The Living Horizon | 18/20 | Success that still fails |
| 59 | 3. The Living Horizon | 19/20 | Price I will not pay |
| 60 | 3. The Living Horizon | 20/20 | Create the horizon |
| 61 | 4. The Ikigai Map | 1/20 | Repeated interest |
| 62 | 4. The Ikigai Map | 2/20 | Problem that holds attention |
| 63 | 4. The Ikigai Map | 3/20 | Explored freely |
| 64 | 4. The Ikigai Map | 4/20 | Your Spark |
| 65 | 4. The Ikigai Map | 5/20 | Demonstrated strength |
| 66 | 4. The Ikigai Map | 6/20 | Emerging strength |
| 67 | 4. The Ikigai Map | 7/20 | Underused strength |
| 68 | 4. The Ikigai Map | 8/20 | Your Gift |
| 69 | 4. The Ikigai Map | 9/20 | People I understand |
| 70 | 4. The Ikigai Map | 10/20 | Problem I care about |
| 71 | 4. The Ikigai Map | 11/20 | Transformation worth helping |
| 72 | 4. The Ikigai Map | 12/20 | Your Need |
| 73 | 4. The Ikigai Map | 13/20 | Income & opportunity |
| 74 | 4. The Ikigai Map | 14/20 | Access & experience |
| 75 | 4. The Ikigai Map | 15/20 | Fit with my horizon |
| 76 | 4. The Ikigai Map | 16/20 | Tolerance for the process |
| 77 | 4. The Ikigai Map | 17/20 | Willing to be a beginner |
| 78 | 4. The Ikigai Map | 18/20 | Generate three paths |
| 79 | 4. The Ikigai Map | 19/20 | Choose the Trial |
| 80 | 4. The Ikigai Map | 20/20 | Illuminate the constellation |
| 81 | 5. The Quest Forge | 1/20 | Candidate quest |
| 82 | 5. The Quest Forge | 2/20 | Another candidate |
| 83 | 5. The Quest Forge | 3/20 | A third candidate |
| 84 | 5. The Quest Forge | 4/20 | Which pulls most |
| 85 | 5. The Quest Forge | 5/20 | Why I want it |
| 86 | 5. The Quest Forge | 6/20 | Without recognition |
| 87 | 5. The Quest Forge | 7/20 | Process or outcome |
| 88 | 5. The Quest Forge | 8/20 | How solid is the drive |
| 89 | 5. The Quest Forge | 9/20 | Fit with my values |
| 90 | 5. The Quest Forge | 10/20 | Fit with my horizon |
| 91 | 5. The Quest Forge | 11/20 | Life-area impact |
| 92 | 5. The Quest Forge | 12/20 | Protect or threaten |
| 93 | 5. The Quest Forge | 13/20 | Resources |
| 94 | 5. The Quest Forge | 14/20 | Biggest obstacle |
| 95 | 5. The Quest Forge | 15/20 | Controllability |
| 96 | 5. The Quest Forge | 16/20 | Readiness |
| 97 | 5. The Quest Forge | 17/20 | Timing & opportunity cost |
| 98 | 5. The Quest Forge | 18/20 | The quest portfolio |
| 99 | 5. The Quest Forge | 19/20 | The accepted cost |
| 100 | 5. The Quest Forge | 20/20 | Forge the crest |
| 101 | 6. The Personal Playbook | 1/20 | Something I sustained |
| 102 | 6. The Personal Playbook | 2/20 | Something I abandoned |
| 103 | 6. The Personal Playbook | 3/20 | What made the difference |
| 104 | 6. The Personal Playbook | 4/20 | My Start Engine |
| 105 | 6. The Personal Playbook | 5/20 | First small step |
| 106 | 6. The Personal Playbook | 6/20 | Cue |
| 107 | 6. The Personal Playbook | 7/20 | My Momentum Loop |
| 108 | 6. The Personal Playbook | 8/20 | The habit |
| 109 | 6. The Personal Playbook | 9/20 | What counts as done |
| 110 | 6. The Personal Playbook | 10/20 | Small version |
| 111 | 6. The Personal Playbook | 11/20 | Minimum version |
| 112 | 6. The Personal Playbook | 12/20 | Return trigger |
| 113 | 6. The Personal Playbook | 13/20 | Earliest warning light |
| 114 | 6. The Personal Playbook | 14/20 | Warning response |
| 115 | 6. The Personal Playbook | 15/20 | Environment rule |
| 116 | 6. The Personal Playbook | 16/20 | One environment change |
| 117 | 6. The Personal Playbook | 17/20 | Recovery route |
| 118 | 6. The Personal Playbook | 18/20 | Protected life area |
| 119 | 6. The Personal Playbook | 19/20 | Weekly Compass Check |
| 120 | 6. The Personal Playbook | 20/20 | Complete the Playbook |

*(120 rows — matches `COMPASS_TOTAL_ISLANDS` and the validated Compass Book activity count. Beyond island 120, the game currently wraps `cycleIndex` back to island 1 with scaled costs — the default curriculum would need a decision on whether cycle 2+ repeats the same 120 rows verbatim or offers a second "advanced" pass, see Open questions.)*

## Interaction with the existing Mystery-stop rotation

Nothing above removes the existing `breathing` / `habit_action` / `vision_quest` variants — those stay as-is and keep rotating in. This plan only replaces the *content pool inside* the `checkin_reflection` variant, so when that variant is selected for a given island, it shows that island's row from the table above instead of one of the 6 fixed prompts.

## Open questions to settle before implementation

1. **Card Draw pool authoring** — Option A needs a genuinely new ~60–90 question bank (10–15 per chapter), since nothing like it exists yet for the ring-tile draw specifically. Who owns writing that copy (design vs. reusing/trimming Compass Book blocks)?
2. **Cycle 2+ behavior** — islands 121+ reuse island numbers 1–120 with `cycleIndex` scaling costs (per the Canonical Gameplay Contract). Does the Behavior-stop table repeat verbatim on repeat cycles, or should there be a second/alternate row set for returning players (avoids "haven't I answered this before" fatigue on long-term players)?
3. **Compass Book answer coupling** — if a player has *already* answered island N's Compass Book activity via the Habit/Wisdom overlay, should the Behavior stop skip re-asking the same question (to avoid double-asking), or is some repetition across surfaces acceptable since the Behavior stop's UI (elimination tournament + effort bonus) is a different interaction shape than the Compass Book's block editor?
4. **Non-authored future cycles** — if Compass Book chapters are ever extended for a "second book" beyond 120, the default curriculum table has room to extend; today it's intentionally capped at exactly 120 rows, matching `COMPASS_TOTAL_ISLANDS`.
