# Conflict Resolver AI Upgrade — 5-Phase Execution Plan (5 Major PRs)

Date: 2026-03-29
Goal: move from current guided UX + partial AI utilities to full product-grade AI mediation and inner guidance.
Current progress note: initial Phase 1 implementation has started with task-aware entitlement/quota routing on existing Level 1 AI call sites.

## Phase 1 (PR #1): AI Foundations + Entitlements + Quotas

### Scope
- Create central AI entitlement resolver (`free`, `premium`, `fallback`).
- Add quota/cap tracking for free AI usage (per day + per session).
- Add shared helper for runtime decision:
  - `ai_mode = premium | free_quota | fallback`.
- Integrate task-level router (`level_1` / `level_2`) into entitlement decisions.

### Deliverables
- `aiEntitlementService` + `aiQuotaService`.
- telemetry events for:
  - quota consumed,
  - fallback activated,
  - upgrade prompt shown/clicked.

### Success criteria
- Every AI call path can deterministically answer: which mode, which model, why.

---

## Phase 2 (PR #2): Conflict AI Orchestrator + Prompt Stack

### Scope
- Build server-side `conflictMediatorOrchestrator.runStage(...)`.
- Implement layered prompt stack:
  1) system role,
  2) safety/fairness policy,
  3) session frame,
  4) context slice,
  5) user input.
- Add strict schema validation for each stage response.

### Deliverables
- Stage handlers for:
  - private rewrite,
  - shared summary,
  - resolution option generation,
  - inner next-step synthesis.
- Retry + graceful fallback paths on AI failure.

### Success criteria
- No raw/untyped AI outputs in core UI; all stage outputs are structured and validated.

---

## Phase 3 (PR #3): Memory + Supabase Persistence + Fairness Lint

### Scope
- Add DB tables/migrations:
  - `conflict_ai_runs`,
  - `conflict_ai_artifacts`,
  - optional `conflict_ai_messages`.
- Persist stage outputs and run metadata (model, tokens, latency, context domains used).
- Add fairness lint before shared outputs are accepted.

### Deliverables
- Session memory policy:
  - working memory in request,
  - persistent artifacts in DB.
- Fairness checks:
  - side-balance,
  - blame-language imbalance,
  - solution asymmetry warning.

### Success criteria
- Shared conflict outputs are auditable and fairness-checked.

---

## Phase 4 (PR #4): Inner Tension Intelligence (Deep Personalization)

### Scope
- Implement `inner_tension_priority_score`.
- Build context assembler for allowed domains:
  - journals,
  - goals/goal evolution,
  - habits,
  - reflections,
  - vision board,
  - trait/archetype signals.
- Add deeper intervention mode when score is high.

### Deliverables
- Structured inner outputs:
  - insight summary,
  - pattern links,
  - risk flags,
  - now/week/month plan,
  - destination CTAs.
- Tier behavior:
  - premium = full depth,
  - free = constrained depth,
  - fallback = deterministic quality path.

### Success criteria
- Inner tension experience feels personally relevant, not generic.

---

## Phase 5 (PR #5): Product UX, Monetization, and Hardening

### Scope
- Add transparent UI signals:
  - “AI used domains,”
  - “why this suggestion,”
  - “free/premium mode currently active.”
- Add contextual upgrade prompts (non-intrusive, value-based).
- QA hardening, red-team prompts, and performance tuning.

### Deliverables
- End-to-end analytics dashboards:
  - stage completion,
  - fallback rate,
  - fairness lint hit rate,
  - upgrade conversion from AI touchpoints.
- Production readiness checklist + rollback plan.

### Success criteria
- Stable, explainable, monetizable AI flow with high trust and low friction.

---

## Recommended sequencing cadence
- PR #1 and PR #2 should ship first with strict interfaces.
- PR #3 starts immediately after #2 API contracts stabilize.
- PR #4 depends on #3 data artifacts.
- PR #5 finalizes UX and go-live reliability.

---

## Definition of done (program-level)
- AI behavior is deterministic per stage and tier.
- Free users get strong value; premium users get materially deeper outcomes.
- Shared conflict remains neutral and fairness-checked.
- Inner conflict becomes longitudinally personalized when policy allows.
