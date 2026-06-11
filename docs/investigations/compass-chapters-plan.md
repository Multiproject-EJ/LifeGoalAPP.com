# Compass Chapters — Brainstorm & Build Plan

Date: 2026-06-11
Status: Brainstorm / build plan (awaiting naming + scope decision, then build)
Builds on: `docs/investigations/compass-system-design.md` (merged, PR #2702)

---

## 1) The framing: what is a "Chapter"?

The **Compass** is the player's central life-template (the "smarter ikigai"). The 120-island
journey is divided into **11 Chapters**, each a themed stretch of islands with a clear
**data-gathering goal**. A Chapter is special: while you're in it, the island's two life stops —
the **Wisdom stop** (a question / reflection) and the **Habit stop** (an action / habit) — are
themed to that Chapter and **fill in one section of your Compass**. By the last island of a
Chapter, that section is *complete*.

> Example: Chapter 1 spans islands 1–20. Across those 20 islands the Wisdom and Habit stops ask the
> ikigai questions. By **island 20 the ikigai template is fully filled** and your "True North" is
> revealed. Islands 1–19 are the gathering; island 20 is the payoff.

**Naming** (the open call): umbrella name + each Chapter gets an evocative title.
- **Option A — "Compass Chapters"** (your instinct): _Chapter 1: Charting True North_, etc.
- **Option B — "The Compass Journey"** / "Voyage": chapters as legs of a voyage.
- **Option C — "Your Atlas"**: the Compass fills an Atlas of you; chapters = pages.

This doc uses **Compass Chapters** as the working title.

---

## 2) The cadence math (grounded in the real board)

Every island has the same canonical stops: `hatchery · habit · mystery · wisdom · boss`
(`islandBoardTileMap.ts`, `islandRunStateActions.ts`). So each island yields exactly:

- **1 Wisdom contribution** (a reflective answer) +
- **1 Habit contribution** (a created/tagged habit)
- = **2 Compass data points per island.**

| Chapter span | Islands | Wisdom pts | Habit pts | Total data points |
|---|---:|---:|---:|---:|
| Compass 1.0 (the big one) | 20 | 20 | 20 | **40** |
| Every other chapter | 10 | 10 | 10 | **20** |

That's plenty: Chapter 1 gets ~10 data points **per ikigai direction** (5 islands × 2). Each later
chapter gets 20 points to characterise its spoke. The design target is that a chapter "completes"
its section well before its last island, so the final island is a **synthesis / reveal**, not a
scramble. (Current `COMPASS_SPOKE_COMPLETE_THRESHOLD = 4`, deliberately low so skips never block;
chapters can carry a richer "richness" meter on top.)

**The gap to build:** today the Wisdom stop cycles **8 generic soothing cards**
(`wisdomTreeCards.ts`) regardless of island. Chapters need a **chapter-aware question bank** so the
right question appears on the right island. This is the core new system.

---

## 3) The 11 Chapters — content brainstorm

For each: the spoke it fills, its data goal, the Wisdom questions (the bank, distributed across the
islands), what the Habit stops seed, and the **reveal** at the boundary island. Questions are
mostly pick-one (mapping cleanly onto the existing Wisdom choice UI) with some open one-liners.

### Chapter 1 — Compass 1.0 · "Charting True North" (Islands 1–20)
**Spoke:** Center (ikigai). **Goal:** all 4 directions + a True North sentence by island 20.

- **Islands 1–5 · Heart (what you love):** When do you lose track of time? · What did you love as a
  kid? · What do you read/watch for fun? · Which activity recharges you? · A free day — what fills it?
- **Islands 6–10 · Craft (what you're good at):** What do people ask your help with? · What comes
  easily to you? · What have you improved the most at? · A skill you're quietly proud of? · What kind
  of problem do you enjoy cracking?
- **Islands 11–15 · Cause (what the world needs):** Whose problem do you most want to solve? · What
  unfairness gets under your skin? · Who do you most want to help? · What change would you fight for?
  · Which community matters to you?
- **Islands 16–20 · Livelihood (what sustains you):** What would people gladly pay you for? · What
  valuable thing can you offer? · Which path/role excites you? · Your most marketable strength? ·
  **Island 20:** _synthesis_ — "Where do these four meet? Write your True North."
- **Habit stops 1–20:** a tiny habit aligned to the direction in focus (Heart islands → a
  do-what-you-love micro-habit; Craft islands → a skill rep; etc.).
- **Reveal (island 20):** the ikigai rose lights up fully; a "True North revealed" moment; the
  Compass icon shows a completed center.

### Chapter 2 — Personality 1.0 · "Know Thyself" (21–30) — *the cards*
**Spoke:** Personality. **Goal:** a baseline trait profile / starting hand of trait cards.
**Hooks into:** existing trait-card system (`players_hand`, `archetypeDeck`).

- Wisdom questions are situational → each maps to a trait card: In a group you tend to… · Under
  pressure you… · You recharge by (alone / with people)… · You decide by (gut / analysis)… · A new
  plan: you (leap / map it first)… · Mess around you: (bothers / fine)… · etc.
- **Habit stops:** habits that play to a surfaced strength.
- **Reveal (island 30):** your starting **hand of trait cards** / assigned archetype.

### Chapter 3 — Habits 1.0 · "The Daily Engine" (31–40) — *DB*
**Spoke:** Habits. **Goal:** a starter daily stack on the habit dashboard.

- Wisdom questions: What time are you strongest? · One habit that would change everything? · Your
  biggest friction? · What anchor already happens daily (to stack onto)? · Streak or flexibility?
- **Habit stops:** the habit-heavy chapter — build the core daily anchors (cue → routine → reward).
- **Reveal (island 40):** a populated **habit dashboard** with a named daily stack.

### Chapter 4 — Goals 1.0 · "Set Your Heading" (41–50)
**Spoke:** Goals. **Goal:** 1–3 meaningful goals linked to ikigai directions.

- Wisdom questions: What does a great year look like? · One thing you'd regret not trying? · Which
  ikigai direction is most neglected? · What does "done" look like?
- **Habit stops:** habits that ladder up to each goal.
- **Reveal (island 50):** 1–3 goals set, each tied to an ikigai direction.

### Chapter 5 — Habits 2.0 · "Tune the Engine" (51–60) — *DB 2.0*
**Spoke:** Habits (v2). **Goal:** optimise the stack; identity-based habits.

- Wisdom questions: What's working / not? · Where does the chain break? · "I am someone who…" · What
  to stack next? · Environment tweak?
- **Habit stops:** upgrade/refine existing habits; add advanced ones.
- **Reveal (island 60):** an optimised system + identity statements.

### Chapter 6 — Personality 2.0 · "Creatures & Match" (61–70) — *creatures / match*
**Spoke:** Personality (v2). **Goal:** deeper personality via the creature collection.
**Hooks into:** creature collection — each creature embodies a trait; you match the ones that fit.

- Wisdom questions: deeper values, shadow traits, growth edges, what others misread about you.
- **Mechanic:** match creatures to your profile (the notepad's "creatures / match").
- **Reveal (island 70):** a matched creature roster mirroring your personality.

### Chapter 7 — Goals 2.0 · "Adjust Course" (71–80)
**Spoke:** Goals (v2). **Goal:** review/refine goals; add milestones + a review cadence.

- Wisdom questions: progress honestly? · biggest obstacle? · break the goal into milestones · what to
  drop?
- **Reveal (island 80):** goals with milestones + a recurring review.

### Chapter 8 — Shield 1.0 · "Body Shield" (81–90) — *body*
**Spoke:** Shield · Body. **Goal:** a physical-resilience profile + protective habits.

- Wisdom questions: sleep reality? · how does stress show up in your body? · movement you enjoy? ·
  energy dips when? · recovery ritual?
- **Habit stops:** body-protective habits (sleep, hydration, movement).
- **Reveal (island 90):** a **Body Shield** — protective routines + your physical stress signals.

### Chapter 9 — Personality 3.0 · "Integration" (91–100)
**Spoke:** Personality (v3). **Goal:** synthesise personality into an identity narrative.

- Wisdom questions: your life story in a line · values ranked · who you're becoming · the trait you've
  grown most.
- **Reveal (island 100):** an identity narrative + a values hierarchy.

### Chapter 10 — Shield 2.0 · "Mind Shield" (101–110) — *mind*
**Spoke:** Shield · Mind. **Goal:** a mental-resilience profile + coping toolkit.

- Wisdom questions: recurring stress thought? · what calms you fastest? · emotional trigger? ·
  boundary you need? · who's in your support net?
- **Habit stops:** mind-protective habits (mindfulness, journaling, boundaries).
- **Reveal (island 110):** a **Mind Shield** — coping toolkit + known mental triggers.

### Chapter 11 — Compass 2.0 · "Recharting True North" (111–120) — *refill / adjust*
**Spoke:** Center (ikigai, v2). **Goal:** revisit the 4 directions with everything learned; update.

- Wisdom questions: re-ask the four directions, deeper, plus "what changed since island 1?"
- **Reveal (island 120):** an updated ikigai + a **before/after** comparison of your True North.

---

## 4) What the framework needs (the reusable machine)

One content + progress engine powers all 11 chapters:

1. **`compassChapters.ts`** — per-chapter metadata (id, title, spoke, island range, data goal,
   completion target) keyed off the existing `getCompassPhase`. The single source of truth for
   chapter identity + copy.
2. **Chapter question bank** — `getChapterPromptForIsland(islandNumber, slot)` returning the themed
   Wisdom question (and Habit framing) for that island. Replaces the generic `wisdomTreeCards`
   cycle *while inside a chapter*; pick-one choices reuse the existing Wisdom choice UI.
3. **Chapter progress + completion** — derive a richness meter per chapter section from
   `compass_state` entries; detect "chapter complete" and fire a **reveal moment** at the boundary
   island. (Extends the existing `compass_state` reducer; no new table needed for v1.)
4. **The reveal UI** — a celebratory modal at the last island of a chapter showing the assembled
   section (ikigai rose, trait hand, habit stack, etc.).

---

## 5) Build plan — the PR roadmap

Each PR is a complete, shippable vertical ("100% done").

- **PR 1 — Framework + Chapter 1 (Charting True North).** ⭐ *next*
  Build the reusable machine (`compassChapters.ts`, chapter question bank, chapter-aware Wisdom
  stop, progress/completion, reveal modal) **and** fully author Chapter 1's 20 ikigai questions +
  the island-20 True North reveal. Tests for the engine + the Chapter-1 bank. This proves the whole
  pattern end-to-end on the most important chapter.
- **PR 2 — Chapter 2 (Personality 1.0) → trait cards.** Author the question bank; wire the reveal to
  the trait-card / archetype system.
- **PR 3 — Chapter 3 (Habits 1.0) → habit dashboard.** Habit-heavy chapter; reveal = the daily stack.
- **PR 4 — Chapter 4 (Goals 1.0).** Goals linked to ikigai directions.
- **PR 5 — Chapters 5 & 7 (Habits 2.0 + Goals 2.0).** The "2.0" deepeners reuse PRs 3–4 surfaces.
- **PR 6 — Chapters 6 & 9 (Personality 2.0 + 3.0).** Creatures/match + integration narrative.
- **PR 7 — Chapters 8 & 10 (Shield Body + Mind).** Introduces the Shield surface end-to-end.
- **PR 8 — Chapter 11 (Compass 2.0) + before/after.** The journey's capstone re-fill.

After PR 1 the remaining chapters are mostly **authored content + a reveal hook** on top of the same
machine, so they move fast.

---

## 6) Decisions before building PR 1

- **Name** — "Compass Chapters" vs an alternative (Section 1).
- **PR sizing** — one chapter per PR (slow, safe, very polished) vs framework + 2–3 chapters per PR
  (faster). The roadmap above already groups the later 2.0/3.0 deepeners.
- **Wisdom question style** — pick-one (maps to today's choice UI, fastest) vs mixing in short
  free-text answers (richer data, a little more UI). Recommend **pick-one first, free-text on
  synthesis islands** (e.g., island 20's True North).
