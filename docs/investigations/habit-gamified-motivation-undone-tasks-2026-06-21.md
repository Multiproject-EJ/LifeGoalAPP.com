# Habit Gamified Motivation Ideas — Undone Implementation Tasks

Date: **2026-06-21**
Status: **Undone / needs implementation**
Scope: Product + engineering task list for turning habit completion into a game-like reward, progress, and accountability loop.

## Purpose

Capture the unimplemented ideas from the habit gamification brainstorm so they are not lost. These tasks are intentionally marked **Undone** until a future implementation PR designs, builds, tests, and ships them.

The intended player experience is:

1. Complete a habit.
2. Reveal an unknown reward after completion instead of showing the amount beforehand.
3. Show a quick accumulated-effort animation for that habit.
4. Progress the habit through visible mastery stages.
5. Optionally contribute to an accountability partner/team reward bar.

## Current repo reality

- Habit completion currently has XP, spin, shield, points, and celebration hooks, but not a dedicated hidden habit Essence/Spark reward reveal.
- Habit scaling/stage infrastructure exists in adjacent form (`seed`, `minimum`, `standard`, `doneIsh`, `logged_stage`), but not as the proposed completion-count mastery bar (`Experiment`, `Beginner`, `Intermediate`, `Master`).
- Accountability exists as lightweight commitment-contract witness/buddy reminder and as a Partner Wheel placeholder minigame, but not as a real human habit-accountability partner loop with shared habit contributions.
- If these tasks touch Island Run currency or gameplay state, they must use canonical action services and must not add direct gameplay writes inside React UI components.

## Task status legend

- `[ ]` = **Undone** / not implemented.
- Every task in this document is currently undone unless a future PR updates this file with evidence and changes the checkbox.

---

## 1. Unknown habit reward reveal

### Product goal

Make habit completion more exciting by hiding the reward amount until after the habit is completed. The reward reveal should create anticipation without adding stress or encouraging unhealthy overuse.

### Undone tasks

- [ ] **Undone — Decide reward currency.** Choose whether the revealed reward is real Island Run Essence, a new habit-only currency such as `Habit Essence`, `Effort Sparks`, or `Momentum Sparks`, or a visual-only reward payload for v1.
- [ ] **Undone — Define economy guardrails.** If real Island Run Essence is used, define how habit-sourced Essence fits the canonical Island Run economy and which canonical action service will own the mutation.
- [ ] **Undone — Define weighted reward tiers.** Create common/good/rare/jackpot reward bands with odds, copy, colors, and accessibility labels.
- [ ] **Undone — Hide reward amount before completion.** Habit cards should show a mystery affordance such as `Complete to reveal` instead of the exact reward amount.
- [ ] **Undone — Build reward reveal payload.** Add a service-level result shape that can return `{ currency, amount, rarity, source, presentation }` after a successful habit completion.
- [ ] **Undone — Build reward reveal animation.** Add a short overlay where the reward number pops/flashes after completion.
- [ ] **Undone — Move confetti behind the reward number.** Confetti should burst behind the revealed reward amount, not only near the game footer button.
- [ ] **Undone — Respect reduced-motion preferences.** Provide reduced-motion behavior for the reward reveal and confetti.
- [ ] **Undone — Prevent duplicate claims.** Ensure repeated taps, retries, offline replay, and already-completed habits cannot mint multiple rewards for the same completion event.
- [ ] **Undone — Add tests.** Add unit/service tests for reward tier selection, idempotency, and any currency mutation.

### Initial acceptance criteria

- [ ] **Undone — A completed habit triggers one reveal only once per valid completion.**
- [ ] **Undone — The user does not see the reward amount before completion.**
- [ ] **Undone — The reveal works on mobile and desktop.**
- [ ] **Undone — The reveal does not introduce new direct Island Run gameplay writes from UI components.**

---

## 2. Habit accumulated-effort bar

### Product goal

Make invisible effort visible by showing a fast progress bar after habit completion. The bar should briefly show the user how the current completion adds to the habit's long-term growth.

### Undone tasks

- [ ] **Undone — Define habit mastery stages.** Confirm stage names and thresholds. Proposed v1: `Experiment` = 3 completions, `Beginner` = 25, `Intermediate` = 50, `Master` = 100.
- [ ] **Undone — Decide whether stages are per habit or per habit version.** Clarify how mastery interacts with existing `seed`, `minimum`, and `standard` scaling stages.
- [ ] **Undone — Design progress data model.** Decide whether to compute from logs, cache aggregates, or add a persisted `habit_progression`/aggregate table.
- [ ] **Undone — Define progress increments.** Decide whether `doneIsh`, `seed`, `minimum`, and `standard` completions count differently toward mastery.
- [ ] **Undone — Build quick progress overlay.** After the reward reveal, show a small bar such as `Experiment 2/3`, fill quickly, then disappear.
- [ ] **Undone — Add stage-complete rewards.** Define what happens when a stage fills: badge, cosmetic, XP, Sparks, dice, or other reward.
- [ ] **Undone — Add stage copy.** Use low-pressure language: `Experiment`, `Trying this out`, `Failure is expected`, `Keep showing up`.
- [ ] **Undone — Add telemetry.** Track bar views, stage completions, reward claims, and drop-off.
- [ ] **Undone — Add tests.** Cover stage threshold math, partial completion credit, duplicate completion handling, and stage reward idempotency.

### Initial acceptance criteria

- [ ] **Undone — Completing a new habit can show `Experiment 1/3`, `2/3`, and `3/3`.**
- [ ] **Undone — The progress bar is fast and non-blocking.**
- [ ] **Undone — A filled stage grants at most one stage-complete reward.**
- [ ] **Undone — Existing habit scaling (`seed`, `minimum`, `standard`) remains compatible.**

---

## 3. Habit mastery levels

### Product goal

Give each habit a longer-term identity arc, so users can see that repeated effort turns an experiment into a durable life pattern.

### Undone tasks

- [ ] **Undone — Define mastery taxonomy.** Choose final stage names, icons, thresholds, and copy.
- [ ] **Undone — Define historical migration behavior.** Decide whether existing historical completions should immediately backfill mastery progress or whether mastery starts after launch.
- [ ] **Undone — Add habit-level display surfaces.** Decide where the habit's mastery stage appears: Today card, habit details, weekly review, profile, or achievement surfaces.
- [ ] **Undone — Add mastery rewards.** Define rewards for stage transitions, including visual badges and any economy grants.
- [ ] **Undone — Add anti-shame handling.** Missing days should not feel like losing all progress; use pause/recovery language rather than punishment.
- [ ] **Undone — Add accessibility and localization-ready copy.** Keep labels short and clear.
- [ ] **Undone — Add tests.** Cover long-running completion counts and stage boundaries.

### Initial acceptance criteria

- [ ] **Undone — A habit can show a stable mastery stage.**
- [ ] **Undone — Mastery progress survives reloads and sync.**
- [ ] **Undone — The system does not punish missed days by deleting long-term progress.**

---

## 4. Accountability partner / circle

### Product goal

Create a supportive social loop inspired by team-up events: users can add accountability partners, contribute habit progress to a shared bar, and keep each other on track without shame or pressure.

### Undone tasks

- [ ] **Undone — Define MVP scope.** Choose invite-only v1, suggested-partner v2, or both.
- [ ] **Undone — Define partner slots.** Support up to 4 accountability partners or up to 4 total team members, matching the Monopoly GO-inspired circle concept.
- [ ] **Undone — Design invite flow.** Add invite, accept, decline, leave, block/report, and expiry behavior.
- [ ] **Undone — Design user search.** Decide whether users can search by exact username, invite code, email, or friend list.
- [ ] **Undone — Design partner suggestions.** If suggestions are included, define opt-in discovery rules based on life-wheel category, active habits, timezone, and recent activity.
- [ ] **Undone — Define privacy settings.** Decide what partners can see: habit names, life-wheel categories, points only, streaks, or custom shared goals.
- [ ] **Undone — Add shared reward bar.** Create a bar that fills from partner habit completions or points.
- [ ] **Undone — Define contribution rules.** Decide how habits, done-ish completions, stage completions, and daily caps contribute points.
- [ ] **Undone — Add shared rewards.** Define milestone rewards and final rewards for all partners.
- [ ] **Undone — Add anti-shame messaging.** Use supportive copy like `Cheer`, `Nudge`, and `Try again tomorrow`; avoid blame language.
- [ ] **Undone — Add notifications.** Design optional nudges, cheers, and milestone notifications.
- [ ] **Undone — Add moderation and safety controls.** Include blocking, reporting, opt-out, and privacy-first defaults.
- [ ] **Undone — Add tests.** Cover invite permissions, shared bar contribution idempotency, privacy settings, and reward claims.

### Initial acceptance criteria

- [ ] **Undone — A user can invite an accountability partner.**
- [ ] **Undone — The invited partner must accept before appearing as active.**
- [ ] **Undone — Habit completion can contribute points to a shared bar only through a canonical service path.**
- [ ] **Undone — Users can leave or disable accountability participation.**

---

## 5. Integration with existing Partner Wheel placeholder

### Product goal

Decide whether the habit-accountability circle should remain separate from Island Run's Partner Wheel minigame or eventually connect to it.

### Undone tasks

- [ ] **Undone — Decide product boundary.** Determine whether accountability partners are a life-tool feature, an Island Run event feature, or a bridge between both.
- [ ] **Undone — Review Partner Wheel placeholder.** Determine whether the existing AI-partner placeholder should influence the habit accountability UI.
- [ ] **Undone — Avoid premature multiplayer coupling.** Do not make habit accountability depend on the event minigame unless the social data model is ready.
- [ ] **Undone — Define event bridge rules.** If connected later, decide how habit contributions can feed a limited-time Partner Wheel/Companion Feast bar.
- [ ] **Undone — Add architecture plan.** Document canonical services, data ownership, and UI-only state boundaries before implementation.

### Initial acceptance criteria

- [ ] **Undone — There is a clear decision on whether Accountability Circle and Partner Wheel are separate or connected.**
- [ ] **Undone — No implementation duplicates reward-bar logic locally inside React UI.**

---

## 6. Architecture and guardrails

### Product goal

Keep the implementation safe, reversible, and aligned with Island Run architecture rules.

### Undone tasks

- [ ] **Undone — Create a service-level habit reward pipeline.** UI should receive presentation payloads, not own reward/economy logic.
- [ ] **Undone — Define authoritative state ownership.** Habit progression, accountability contribution, and Island Run currency should each have one canonical owner.
- [ ] **Undone — Avoid direct gameplay writes from UI.** Any real Island Run currency update must use canonical Island Run action services.
- [ ] **Undone — Add offline/idempotency strategy.** Habit completions can happen offline; reward and progression claims must reconcile safely.
- [ ] **Undone — Add telemetry.** Track reveal views, reward tiers, habit stage progress, accountability contributions, and claim failures.
- [ ] **Undone — Add QA checklist.** Include reduced motion, mobile viewport, duplicate taps, offline replay, invite privacy, and reward idempotency.

### Initial acceptance criteria

- [ ] **Undone — Implementation has tests before being marked done.**
- [ ] **Undone — Any Island Run gameplay mutation uses canonical service/action paths.**
- [ ] **Undone — The feature can ship in small slices behind flags if needed.**

---

## Suggested implementation order

1. [ ] **Undone — Documentation/spec approval.** Confirm currency names, task scope, and MVP boundaries.
2. [ ] **Undone — Visual-only reward reveal prototype.** No economy mutation; only presentation payload from habit completion.
3. [ ] **Undone — Habit mastery/progress model.** Add stage thresholds and persisted/cached progress.
4. [ ] **Undone — Fast effort-bar animation.** Show the post-completion progress bar.
5. [ ] **Undone — Stage-complete rewards.** Add idempotent reward claims for mastery thresholds.
6. [ ] **Undone — Accountability invite MVP.** Add invite-only partner flow.
7. [ ] **Undone — Shared accountability reward bar.** Add partner contribution and milestones.
8. [ ] **Undone — Suggested partners.** Add opt-in discovery/suggestions after privacy model is complete.

## Notes for future implementers

- Preserve the safe-failure framing: new habits are experiments, not pass/fail obligations.
- Keep animations fast and non-blocking.
- Do not show exact variable reward amounts before completion if implementing the mystery-reward loop.
- Do not turn accountability into shame or pressure; prioritize support, privacy, and user control.
- If using real Island Run Essence, treat it as an economy change and test it accordingly.
