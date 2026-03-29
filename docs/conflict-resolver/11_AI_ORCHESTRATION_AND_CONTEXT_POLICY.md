# Conflict Resolver AI Orchestration + Context Policy (MVP → Product)

Date: 2026-03-29
Status: Proposed architecture aligned to current codebase

## 1) Reality check: how AI is used today

Current implementation is **not yet a fully orchestrated multi-step AI mediator**.

### What exists today
- Structured UX state machine + staged UI flow.
- Basic local text reframing/sanitization for shared summaries (regex-based).
- Analytics events for stage progression.
- AI infra exists elsewhere in app (`lib/aiClient.ts`) and AI Coach has data-access controls (`AiCoachDataAccess`).

### What does NOT exist yet in Conflict Resolver
- No central conflict-session LLM orchestrator per stage.
- No stage-specific prompt templates in repo for conflict mediator behavior.
- No persisted prompt/response transcript table for conflict sessions.
- No formal policy layer that filters which Supabase user data can be included per stage.

This means your intuition is correct: today’s flow is mostly UI orchestration + lightweight local language handling, not full AI mediation memory.

---

## 2) Product-grade target model

Conflict Resolver should be driven by a **single AI Orchestrator** with:
1. System role and policy guardrails set once per session.
2. Stage-specific prompt templates + structured output schema.
3. Session memory that combines:
   - short-term working context for current call,
   - persisted long-term state in Supabase.
4. User data-access policy filter that decides what profile data is attachable.

---

## 3) Orchestrator contract

Create one server-side service:
- `conflictMediatorOrchestrator.runStage({ sessionId, stage, actorUserId, inputPayload })`

Responsibilities:
- Load session + participants + prior stage artifacts from Supabase.
- Build **prompt stack** (system + policy + stage + context + user input).
- Call OpenAI via `getOpenAIForUser(...)` / app key fallback.
- Validate response against expected stage schema.
- Persist both raw + normalized outputs.
- Return structured UI payload for cards/chips/actions.

---

## 4) Prompt stack (required)

For every stage call, compose prompts in this strict order:

1. **System role prompt**
   - Expert conflict mediator.
   - Non-partisan, non-judgmental, de-escalation-first.
   - Goal = shared understanding + actionable repair.
   - Hard limits (no diagnosis, no legal adjudication, no coercive pressure).

2. **Policy prompt**
   - Safety rules (no abuse amplification).
   - Fairness rules (symmetry check for each side).
   - Privacy rules (only include allowed data domains).
   - Output format rules for the stage.

3. **Session frame prompt**
   - session type (`inner_tension` or `shared_conflict`)
   - stage name
   - participants + roles
   - completed stages and unresolved needs

4. **Context prompt**
   - Stage artifacts from prior steps
   - Summaries, annotations, proposals, apology prefs
   - Optional user profile context filtered by data-access policy

5. **Current user input payload**
   - Fresh text/buttons selected this step

---

## 5) Stage-by-stage output schemas

Define strict JSON schemas per stage to keep UI deterministic:

- `private_capture_rewrite`
  - `rewritten_text`
  - `tone_notes[]`
  - `safety_flags[]`

- `shared_read_summary`
  - `neutral_summary_cards[]`
  - `missing_questions[]`
  - `fairness_checks`

- `resolution_options`
  - `options[]` (title, rationale, tradeoffs)
  - `white_flag_suggestions[]`

- `apology_alignment`
  - `recommended_style`
  - `sequencing_recommendation`
  - `recipient_readiness_notes`

- `inner_tension_next_steps`
  - `insight_summary`
  - `next_actions[]` (action, why, app_surface, cta)

All stages should return machine-readable JSON first; UI copy is rendered from normalized fields.

---

## 6) Memory model (API context + Supabase persistence)

### A) Working memory (per request)
- Keep prompt context compact and stage-relevant.
- Include only recent necessary artifacts.
- Use summarized history blocks rather than full transcript replay.

### B) Persisted memory (Supabase)
Add (or finalize) these tables:
- `conflict_ai_runs`
  - prompt hash, stage, model, latency, token usage, safety flags
- `conflict_ai_artifacts`
  - normalized stage outputs used by UI
- `conflict_ai_messages` (optional)
  - raw request/response snapshots for audit/debug

Use persisted artifacts as canonical state; do not trust client-only memory.

---

## 7) Data-access policy (user-controlled)

Adopt AI Coach’s existing permission concept (`AiCoachDataAccess`) as the base control plane.

### Policy behavior
- Default safe baseline by session type:
  - Inner tension: allow richer personal context (if toggled on).
  - Shared conflict: aggressively minimize personal context in shared outputs.
- Before each stage run, filter attachable context by allowed domains:
  - goals
  - habits
  - journaling
  - reflections
  - vision board
  - goal evolution

### Required transparency
- In UI: “AI used: [domains list]” per session.
- In DB: store `used_context_domains[]` on each AI run.

---

## 8) Inner tension vs shared conflict behavior split

### Inner tension
- AI acts like reflective strategist.
- No apology choreography unless self-repair framing is explicitly selected.
- Outputs emphasize:
  - clarity synthesis
  - emotional regulation first step
  - one concrete behavior commitment

### Shared conflict
- AI acts like neutral mediator.
- Symmetry + fairness lint required before publishing shared text.
- No side-taking language allowed in shared artifacts.

---

## 9) Error handling and resilience

- If AI call fails:
  - preserve stage input,
  - show graceful fallback card,
  - allow retry without data loss.
- If shared session backend fails:
  - show exact failure reason (auth, RLS, network, missing table).
  - provide actionable remediation text.

---

## 10) Immediate implementation backlog (high priority)

1. Add `docs/conflict-resolver/04_AI_MEDIATOR_PROMPT_SPEC.md` and implement templates from it.
2. Build `conflictMediatorOrchestrator` server-side module using `lib/aiClient.ts`.
3. Add `conflict_ai_runs` + `conflict_ai_artifacts` migrations.
4. Wire stage-by-stage AI calls for:
   - private rewrite,
   - shared summary,
   - options generation,
   - inner next-step synthesis.
5. Add data-access filter middleware reusing `AiCoachDataAccess` semantics.
6. Add fairness lint checks before writing shared summaries.

---

## 11) Bottom line

To answer your direct question: **No — the Conflict Resolver is not yet using full session AI memory orchestration the way a production mediator should.**

The repository has pieces needed to do it well (AI client + data-access controls + session flow), but the central orchestrator and prompt-spec system are still missing. This document defines the production path.
