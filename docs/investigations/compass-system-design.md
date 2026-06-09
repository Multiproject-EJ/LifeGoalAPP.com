# Compass System — Design

Date: 2026-06-08
Status: Design (no code yet — approved approach: layer on top, design-first, drafted template)
Related: PR #2689 (adaptive Habit Landmark + per-island curriculum), `game_life_intake` (migration 0251),
`islandContentManifest.ts`, `docs/investigations/per-island-content-library-and-data-collection-plan.md`

---

## 1) What the Compass is

The **Compass** is the player's central life-template — a "smarter ikigai" they fill out at the
start of the 120-island journey, deepen one spoke at a time as they travel, and re-fill/adjust at
the end. It is the hub; the app's other systems (Personality, Habits, Goals, Shield) are its spokes.

It is delivered through a **forced curriculum**: each block of islands has a theme, and during that
block the board's **Habit stop and Wisdom stop feed a template modal** (the Compass for that phase).
The journey is book-ended by the ikigai fill (Compass 1.0, islands 1–20) and re-fill (Compass 2.0,
islands 111–120).

This **layers on top** of the existing adaptive Habit Landmark (PR #2689): the Habit stop still
creates a habit as it does today; it *additionally* contributes an entry to the current Compass
spoke. The Compass is a new surface and data layer, not a replacement.

---

## 2) The curriculum (from the notepad)

| Phase | Islands | Theme | Version | Spoke filled | Note |
|------:|--------:|-------|:-:|----|----|
| P1 | 1–20 | **Compass** | 1.0 | Center (ikigai) | Initial fill of the whole template |
| P2 | 21–30 | Personality | 1.0 | Personality | "cards" (trait cards) |
| P3 | 31–40 | Habits | 1.0 | Habits | "DB" (dashboard/board) |
| P4 | 41–50 | Goals | 1.0 | Goals | |
| P5 | 51–60 | Habits | 2.0 | Habits | deepen — "DB 2.0" |
| P6 | 61–70 | Personality | 2.0 | Personality | "creatures / match" |
| P7 | 71–80 | Goals | 2.0 | Goals | deepen |
| P8 | 81–90 | Shield | 1.0 | Shield · Body | |
| P9 | 91–100 | Personality | 3.0 | Personality | |
| P10 | 101–110 | Shield | 2.0 | Shield · Mind | notepad reads "1.0 – mind"; treated as the Mind half |
| P11 | 111–120 | **Compass** | 2.0 | Center (ikigai) | Re-fill / adjust |

Math: 20 + (10 × 10) = 120 islands. ✅ First phase is 20 islands; the rest are 10 each.

**Open question A:** P8/P10 — is Shield one system split Body (1.0) / Mind (2.0), or two separate
Shields? This doc assumes **one Shield spoke with a Body half then a Mind half**.

---

## 3) Information architecture — hub & spokes

The compass rose (N/E/S/W + center) and the spoke diagram in the notepad map cleanly:

```
                 Personality (who I am)
                        │
   Shield ───────── COMPASS ───────── Habits
 (what protects me)   (ikigai)     (what I do daily)
                        │
                  Goals (where I'm going)
```

- **Center = Compass / ikigai** — purpose, values, the synthesis. Filled P1, re-filled P11.
- **Personality** — the identity / archetype / trait-card system (`features/identity`,
  `features/players_hand`, creature collection for "creatures/match"). Versions 1.0/2.0/3.0.
- **Habits** — `habits_v2` / Daily board ("DB"). Versions 1.0/2.0.
- **Goals** — goals workspace. Versions 1.0/2.0.
- **Shield** — resilience/defense (a `shield` concept already exists in
  `islandRunStateActions`). Body half, then Mind half.

Each spoke section of the template is **progressively unlocked and deepened** as its phases arrive.

---

## 4) The Compass icon (reward-bar slot)

**Today:** the compass button lives *inside* the hatchery tray, which only renders when
`hatcheryPendingEggs.length > 0` (`IslandRunBoardPrototype.tsx:10250`). So it's only visible while an
egg is hatching.

**Target behavior:**
- The Compass icon is **always present** in the left reward-bar slot (under the eggs), independent of
  eggs.
- When **no egg is hatching**, the Compass occupies the egg slot.
- When an **egg is hatching**, the egg takes the slot and the Compass sits beside/below it (its
  current tray position), so both are reachable.
- Tapping it opens the **Compass modal** for the current phase (replacing today's placeholder modal).
- Optional polish: a small progress ring on the icon showing the current spoke's fill %.

This is a contained UI change (move the compass button out of the egg-gated `&&` block into the
always-rendered `rewardbar-cluster`, with a layout rule for the egg-present case). No gameplay state.

---

## 5) Proposed "ikigai 2.0" template (draft — Compass 1.0)

Classic ikigai = 4 prompts (love / good-at / world-needs / paid-for) → 4 overlaps → 1 center. The
"smarter" version maps the 4 prompts to the compass directions and ties the 4 overlaps to the four
spokes, so the ikigai *becomes* the map the rest of the journey fills in.

**Four directions (filled in P1):**
- **N — Heart**: What do you love? What energizes you?
- **E — Craft**: What are you good at? What comes naturally?
- **S — Cause**: What does your world need from you? Who do you want to help?
- **W — Livelihood**: What can you be valued/paid for? What sustains you?

**Center — True North**: one sentence synthesizing the four (the ikigai). Drafted in P1 from the four
directions; revisited in P11.

**Four overlaps → become the spokes the curriculum deepens:**
- Heart × Craft = **Passion** → seeds the **Personality** spoke
- Craft × Cause = **Mission** → seeds the **Goals** spoke
- Cause × Livelihood = **Vocation** → seeds the **Shield** spoke (sustainable contribution)
- Livelihood × Heart = **Profession** → seeds the **Habits** spoke (daily practice that pays off)

So P1 produces: 4 direction answers + 4 overlap seeds + 1 center sentence. Each later phase opens the
matching spoke and turns its seed into concrete content (traits, habits, goals, shields).

**Open question B:** Does this 4-direction framing match your "smarter ikigai", or do you have
specific fields/prompts? (You picked "I'll propose a draft" — this is the draft to react to.)

---

## 6) How the Habit & Wisdom stops fill the template

During a phase, the two life stops do **double duty** — they keep their current job *and* write one
Compass entry for the active spoke:

- **Wisdom stop** → the *reflective* contribution. Its card/choice is themed to the current spoke and
  records a short reflection/answer into the template (e.g., a trait you recognise, a value, a fear to
  shield against).
- **Habit stop** → the *action* contribution. It still creates a habit (adaptive, as today) and tags
  that habit to the current spoke, filling the "what I'll do" part of the template section.

Per phase (≈10 islands) the player accrues ~10 wisdom + ~10 habit contributions, which assemble that
spoke's section. A spoke "completes" when its section hits a small threshold (e.g., center sentence +
≥3 entries). Skips are allowed and recorded (never block stop completion) — consistent with the
existing guardrails.

**Phase 1 (Compass 1.0) is special:** instead of one spoke, the stops walk the player through the 4
directions + center over 20 islands (≈ 5 islands per direction, then the synthesis).

---

## 7) Data model (layers on `game_life_intake`)

Two pieces:

1. **`game_life_intake`** (already exists, migration 0251) — the **raw per-stop contributions**.
   Reused as-is with new values:
   - `prompt_context`: `'compass_wisdom'` | `'compass_habit'`
   - `intake_stage`: keep the act-based stage, plus the Compass writes the **spoke** + phase into
     `payload` (`{ compass_phase, spoke, direction, version, answer, ... }`).
   - `linked_habit_id`: set when the Habit stop created a habit.

2. **`compass_state`** (new table — the **assembled template**, one row per user):

```
compass_state
  user_id            uuid pk -> auth.users
  template_version   int       -- 1 after P1, 2 after P11
  current_phase      text      -- 'P1'..'P11'
  center_statement   text      -- the ikigai "True North"
  directions         jsonb     -- { heart, craft, cause, livelihood }
  spokes             jsonb     -- { personality: {version, entries[], status}, habits: {...}, goals, shield }
  completed_phases   text[]    -- audit of finished phases
  created_at, updated_at timestamptz
```

`compass_state` is the durable, editable template the modal renders; `game_life_intake` is the
immutable event log feeding it. RLS owner-only, same pattern as 0251. A `compass_state` migration
(0252) would land when we build, not now.

---

## 8) Curriculum engine (extends `islandContentManifest.ts`)

Add a pure resolver beside `getIslandContentPlan`:

```ts
type CompassTheme = 'compass' | 'personality' | 'habits' | 'goals' | 'shield';
type CompassSpoke = 'center' | 'personality' | 'habits' | 'goals' | 'shield';

type CompassPhase = {
  id: 'P1' | ... | 'P11';
  islandRange: [number, number];
  theme: CompassTheme;
  version: number;           // 1.0, 2.0, 3.0
  spoke: CompassSpoke;
  spokeHalf?: 'body' | 'mind'; // Shield only
};

getCompassPhase(islandNumber): CompassPhase
```

This is the "forced area for a given amount of islands" — deterministic, unit-testable, no state. The
Habit/Wisdom stop UI reads it to theme their prompts and to know which spoke to write.

The existing `getIslandContentPlan` (life-wheel act/adaptive) keeps working underneath for habit
creation; `getCompassPhase` is the parallel Compass-curriculum lens.

---

## 9) How it coexists with the adaptive Habit Landmark (PR #2689)

| Concern | Adaptive Landmark (exists) | Compass (new) |
|---|---|---|
| Drives | which *life-wheel area* a habit targets | which *spoke/theme* the template fills |
| Writes | `habits_v2` | `compass_state` + `game_life_intake` |
| Surface | Habit stop flow | Compass modal + themed stop prompts |
| Trigger | every Habit stop | the current phase's theme |

The Habit stop runs its adaptive flow, then attaches the resulting habit to the active spoke. No
conflict: one picks the *area*, the other records the *spoke contribution*.

---

## 10) Build slices (when approved)

- **C0.** Compass icon always-on in the reward-bar slot (yields to hatching egg) + open a real (if
  minimal) Compass modal. *Contained UI; shippable on its own.*
- **C1.** `getCompassPhase(islandNumber)` curriculum engine + tests.
- **C2.** `compass_state` table (migration 0252) + service (best-effort, like `gameLifeIntake`).
- **C3.** Compass modal — render the template (directions, center, spoke sections, fill %).
- **C4.** Phase-themed Wisdom stop + Habit-stop tagging → write `game_life_intake` + assemble
  `compass_state`.
- **C5.** Phase 1 (ikigai fill) and Phase 11 (re-fill/compare) flows.
- **C6.** Per-spoke deepening (versions 2.0/3.0) and completion thresholds.

---

## 11) Open decisions for you

- **A. Shield split** — one Shield spoke (Body half → Mind half), or two systems? (Doc assumes one.)
- **B. ikigai template** — does the 4-direction (Heart/Craft/Cause/Livelihood) + center framing in §5
  match your "smarter ikigai", or do you have exact fields?
- **C. Non-Habit-theme phases** — during Personality/Goals/Shield phases, should the Habit stop still
  create a habit (and just *also* tag the spoke), or pause habit creation and act purely as a
  template-fill prompt? (Doc assumes it still creates a habit.)
- **D. "Personality / creatures / match" (P6)** and **"DB" (Habits)** — confirm these mean the
  trait-card/creature systems and the habit dashboard respectively, so I wire to the right surfaces.
- **E. Forced vs optional** — is the curriculum theme a hard gate (must engage to progress) or a soft
  default the player can skip? (Existing guardrails favour skippable; confirm.)
