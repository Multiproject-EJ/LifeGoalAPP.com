# Habit Scaling Brainstorm (Dynamic Stages)

## User problem to solve
A single habit should stay "alive" even when life gets harder. Instead of failing "Go to gym" and breaking momentum, the same habit should be completable at smaller fallback stages (for example: 15 push-ups) and upgraded again when consistency returns.

## What already exists in the repo (good news)

### 1) Core tier concept is already implemented
The code already has a 3-tier ladder (`seed`, `minimum`, `standard`) and downshift/upgrade helpers in `autoProgression.ts`.

### 2) Habit cards already expose stage controls
Both HabitsModule and DailyHabitTracker already show ladder controls (`Downshift`, `Re-upgrade`) and keep per-habit auto-progression state in `autoprog` JSON.

### 3) Partial completion model already exists
The app already supports `done`, `doneIsh`, `skipped`, `missed`, plus `completion_percentage` and per-habit `done_ish_config`.

## Gap vs your request
What is still missing for your exact UX:

1. **Stage-specific action text** (e.g., Standard="Go to gym", Minimum="15 push-ups", Seed="5 push-ups").
2. **Direct "log this habit at stage X" options inside Today expanded details** (not just changing schedule/target globally).
3. **A clear mental model of one habit with multiple executable variants** (today you can shift tier, but there is no explicit user-facing "variant list" per habit).

## Product shape I recommend

### A) Keep one habit record, add optional `scale_plan`
Add a new optional JSON field (for now in `habits_v2.autoprog` to move faster):

```json
{
  "scale_plan": {
    "enabled": true,
    "stages": [
      {
        "id": "standard",
        "label": "Go to gym",
        "target_num": 45,
        "target_unit": "minutes",
        "notes": "Full session"
      },
      {
        "id": "minimum",
        "label": "15 push-ups",
        "target_num": 15,
        "target_unit": "reps",
        "notes": "Fallback when low energy"
      },
      {
        "id": "seed",
        "label": "5 push-ups",
        "target_num": 5,
        "target_unit": "reps",
        "notes": "Never miss floor"
      }
    ]
  }
}
```

Why this is best first step:
- No new table needed for v1.
- Reuses existing stage semantics already wired through the UI.
- Lets you evolve toward "progressive overload" while preserving streak continuity.

### B) Today-tab interaction model
In expanded details for each habit, show:

- **Current stage chip** (Seed / Minimum / Standard)
- **"Log completion as" buttons**:
  - Complete at current stage
  - Complete at lower stage (quick fallback)
  - Optional custom value (already partly supported)
- **"Change active stage" controls** (existing downshift/re-upgrade)

Important distinction:
- **Logging at a lower stage once** should not necessarily permanently downshift the habit.
- **Downshift stage** is a strategic state change.

This gives the flexibility you asked for: perform any stage when struggling, without losing the ladder concept.

### C) Scoring + streak policy
Use a simple weight model for fairness and motivation:

- Standard completion = `1.0` credit
- Minimum completion = `0.75` credit
- Seed completion = `0.5` credit
- Done-ish = multiply by done-ish factor on top of stage weight

Then:
- Keep streak alive at any stage >= seed.
- Use weighted adherence for upgrade eligibility (already aligned with existing auto-progression logic).

## Implementation path (low-risk)

### Phase 1 (quick win)
1. Extend habit edit/wizard UI to define optional stage labels + targets.
2. Store stage config in `autoprog.scale_plan`.
3. In Today expanded details, add stage picker + "log at this stage" action.
4. Save selected stage on each log (new `logged_stage` in `habit_logs_v2`, nullable).

### Phase 2 (smarter progression)
1. Build auto-recommendation: "Looks like a rough week — want to use Minimum stage for 3 days?"
2. Add cool-down rules so stage changes are not noisy (e.g., max one shift/day).
3. Add analytics card: stage mix over last 30 days.

### Phase 3 (coach + personalization)
1. AI coach proposes stage variants when habit repeatedly stalls.
2. Suggest environmental swaps tied to stage (home/gym/travel mode).
3. Trigger review prompts when user is stuck in Seed too long.

## Risks and mitigations

- **Risk: confusion between done-ish and stage completion.**
  - Mitigation: UI copy clarifies: stage = *which version* of habit; done-ish = *how fully* you did that version.

- **Risk: users game points with easiest stage.**
  - Mitigation: lower XP multipliers for lower stages + higher rewards for sustained standard streak.

- **Risk: migration complexity.**
  - Mitigation: keep `scale_plan` optional and backward compatible; default to existing behavior when absent.

## Suggested naming in product copy
- "Habit stages"
- "Fallback stage"
- "Rebuild stage"
- "Progressive habit load"

Avoid overly technical terms like "autoprog tier" in user-facing copy.

## Direct answer to "maybe it already exists"
Yes — a large portion already exists (tiers + downshift/re-upgrade + done-ish + weighted analytics scaffolding). The missing part is mostly UX and per-stage executable definitions in Today details, which is exactly where your idea can slot in cleanly.
