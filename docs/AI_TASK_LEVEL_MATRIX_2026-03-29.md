# AI Task Level Matrix (Level 1 vs Level 2)

Date: 2026-03-29
Purpose: feature-by-feature recommendation for AI cost/quality routing.

## Levels
- **Level 1 (cheap/simple):** rewrite, summarize, classify, generate short structured payloads.
- **Level 2 (deeper):** longitudinal reasoning, tradeoffs, mediation, multi-source synthesis, personalized coaching.

---

## 1) Conflict Resolver

### Inner Conflict
- Habit/goal/plan CTA title shortening -> **Level 1**
- Tone softening and respectful rewrite -> **Level 1**
- Quick reflection summary (single-turn) -> **Level 1**
- Longitudinal inner-pattern diagnosis (journals + goals + traits + telemetry) -> **Level 2**
- Deep intervention plan (now/week/month + risk flags + follow-up logic) -> **Level 2**

### Shared Conflict
- Phrase cleanup / neutral wording transforms -> **Level 1**
- Summary card generation from one stage payload -> **Level 1**
- Fairness-balanced mediation synthesis across both sides -> **Level 2**
- Negotiation option generation with tradeoff balancing -> **Level 2**
- Apology readiness intelligence and sequencing recommendations -> **Level 2**

---

## 2) Habits

- Rewrite long habit titles into concise UI-safe labels -> **Level 1**
- Draft reminder copy/tooltips -> **Level 1**
- Generate structured habit suggestion JSON -> **Level 1**
- Environment setup micro-ideas -> **Level 1**
- Basic rationale polish for habit recommendations -> **Level 1**
- Multi-week adherence pattern coaching with re-tier strategy -> **Level 2**
- Habit system redesign against user goals/identity constraints -> **Level 2**

---

## 3) Goals

- Goal title refinement and scope clarification -> **Level 1**
- Milestone text cleanup and formatting -> **Level 1**
- One-shot SMART rewrite from user draft -> **Level 1**
- Strategic goal decomposition with dependency reasoning -> **Level 2**
- Goal portfolio balancing (conflicts/tradeoffs across life areas) -> **Level 2**
- Goal evolution coaching from historical snapshots -> **Level 2**

---

## 4) Journal / Reflection

- Entry summarization (single entry) -> **Level 1**
- Tag suggestion / sentiment label / key phrase extraction -> **Level 1**
- Prompt rewrite for clarity and brevity -> **Level 1**
- Cross-entry narrative synthesis over time -> **Level 2**
- Recurring trigger/behavior loop detection + intervention planning -> **Level 2**

---

## 5) AI Coach

- Response rephrasing to user tone -> **Level 1**
- Short action option generation (2–3 options) -> **Level 1**
- Deep personalized coaching using allowed data domains -> **Level 2**
- Contradiction detection across habits/goals/journal context -> **Level 2**
- Multi-step behavior change planning + checkpoints -> **Level 2**

---

## 6) Meditation / Breathing Space

- Session title/description rewrite -> **Level 1**
- Short personalized affirmation generation -> **Level 1**
- Stress-state interpretation from recent behavior context -> **Level 2**
- Dynamic protocol recommendation across mind/body data -> **Level 2**

---

## 7) Vision Board / Annual Review

- Caption cleanup / concise insight bullets -> **Level 1**
- “Top 3 highlights” summary generation -> **Level 1**
- Life-wheel narrative synthesis with gap analysis -> **Level 2**
- Annual strategic plan recommendation with sequencing -> **Level 2**

---

## 8) Notifications / Nudges

- Notification copy optimization and truncation -> **Level 1**
- CTA microcopy variants -> **Level 1**
- Best-message selection by deep personal context and fatigue risk -> **Level 2**
- Intervention timing strategy across competing goals/habits -> **Level 2**

---

## 9) Gamification / Contracts

- Reward/copy text generation -> **Level 1**
- Contract clause formatting and simplification -> **Level 1**
- Contract risk forecasting from behavior history -> **Level 2**
- Adaptive difficulty and reward pacing strategy -> **Level 2**

---

## 10) Operational routing rules

- Default to **Level 1** unless task requires multi-source reasoning or long-horizon personalization.
- Escalate to **Level 2** when:
  - user explicitly requests deep guidance,
  - risk/safety flags are present,
  - longitudinal context materially changes recommendation quality.
- If quota/cost caps prevent Level 2, run best-possible Level 1 + show contextual upgrade value.

---

## 11) Immediate engineering use

For every new AI feature PR:
1. Add `task_key`.
2. Mark `task_level` (`level_1` or `level_2`).
3. Define fallback behavior.
4. Define data domains required.
5. Add telemetry for cost, latency, fallback rate, and outcome signal.
