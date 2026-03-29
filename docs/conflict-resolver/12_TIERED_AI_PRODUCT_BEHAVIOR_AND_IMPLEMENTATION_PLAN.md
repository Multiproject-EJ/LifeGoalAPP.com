# Conflict Resolver — Tiered AI Product Behavior + Implementation Plan

Date: 2026-03-29
Status: Proposed (next implementation slice)

## 1) Product principle

Inner Conflict must not feel like a generic chatbot flow.
It should feel like:
- context-aware,
- profile-aware,
- trajectory-aware (journals/goals/habits patterns over time),
- and tier-aware (free vs premium AI capability).

---

## 2) Expected runtime behavior (aligned with product vision)

### Step A — Session starts
1. User selects `inner_tension`.
2. System checks:
   - AI toggle enabled/disabled,
   - entitlement tier (free/premium),
   - remaining free AI credits if applicable,
   - user data-access permissions.

### Step B — Decide response mode
- **AI enabled + premium** → best available model + full policy-allowed context.
- **AI enabled + free tier + credits left** → free model + smaller context window + capped calls.
- **AI disabled OR free credits exhausted** → no LLM call; run high-quality fallback coach prompts and deterministic recommendation engine.

### Step C — Contextual depth scoring
Compute an `inner_tension_priority_score` from:
- repeated journal themes over time,
- overlap with active life-wheel category goals,
- low-performing traits from personality/archetype signals,
- recent stagnation/imbalance telemetry.

High score => deeper intervention mode:
- more clarifying questions,
- stronger plan synthesis,
- tighter follow-up commitment suggestions.

### Step D — Action output
Return structured payload:
- reflection summary,
- root tensions,
- trait/goal pattern links,
- prioritized next actions,
- suggested app destinations (habit, goal, meditation, contract, etc.),
- optional “upgrade for deeper analysis” nudges (free tier only).

---

## 3) Tier model (free vs premium)

## 3.1 Free tier
- Uses lower-cost model.
- Tight call cap (example: N calls/day or N/session).
- Reduced historical context depth (recent window only).
- Output quality still good and safe.
- Explicit value preview:
  - “Premium unlocks deeper longitudinal pattern analysis and stronger personalized plans.”

## 3.2 Premium tier
- Uses highest-quality model configured for this domain.
- Higher or no practical session cap.
- Full policy-permitted user context (historical + cross-feature).
- Advanced plan synthesis and follow-up tracking.

---

## 4) Data context policy (must be explicit and inspectable)

Before every AI call, resolve effective context domains from user settings:
- goals
- goal evolution
- habits
- journaling
- reflections
- vision board
- personality traits/archetype signals (new explicit toggle if needed)

Persist `used_context_domains[]` with each run for transparency.

---

## 5) Inner conflict intelligence model

### 5.1 Inputs
- Session responses (`what_happened`, `what_it_meant`, `what_is_needed`).
- Time-windowed behavioral history.
- Personality/trait risk signals.
- Goal/life-wheel alignment metadata.

### 5.2 Outputs
- `insight_summary`
- `pattern_links[]` (e.g., “This tension appears in journals 4 times this month.”)
- `risk_flags[]` (if burnout/avoidance/escalation patterns)
- `action_plan[]` (now/this week/this month)
- `destination_ctas[]` with deep links

All outputs should be schema validated and UI-rendered from typed fields, not raw paragraphs.

---

## 6) Fallback mode quality bar (AI off / exhausted)

Fallback must remain strong:
- adaptive question tree,
- deterministic pattern extraction from local + stored signals,
- curated next-step library per tension type,
- clear commitment + reminder creation path.

Goal: users still get value even without paid AI.

---

## 7) Monetization without ruining trust

- Never block emotional safety features behind paywall.
- Free users always get meaningful guidance.
- Premium messaging appears as enhancement, not pressure.
- Upgrade prompts should be contextual (“Want deeper pattern analysis?”), not intrusive.

---

## 8) Required implementation slices

1. **Entitlement + quota service**
   - Resolve `ai_mode` (`premium`, `free_quota`, `fallback`).
2. **Conflict orchestrator integration**
   - Stage-based calls with model routing by entitlement.
3. **Context assembler**
   - Pull and filter Supabase domains by user permissions.
4. **Priority scoring engine**
   - Build `inner_tension_priority_score`.
5. **Structured output contracts**
   - Enforce JSON schema per stage.
6. **Fallback coach engine**
   - Ensure high-quality non-LLM path.
7. **Upgrade UX hooks**
   - Add tier-aware value nudges at meaningful moments.

---

## 9) Acceptance criteria

- Free user receives usable guidance with no dead ends.
- Premium user receives deeper, context-rich analysis.
- AI-disabled user still gets deterministic quality flow.
- Every AI output is explainable via logged context domains + run metadata.
- Inner tension recommendations show clear linkage to user’s known long-term patterns when allowed.

---

## 10) Bottom line

Yes — your expectation is correct for a full product.
The app should progress from generic mediation to **adaptive, profile-aware guidance** with transparent tiering and robust fallback quality.
This plan defines the implementation target before coding begins.
