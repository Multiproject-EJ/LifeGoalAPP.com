# Promise System Debrief Journal Investigation

## Scope
- Investigate post-evaluation debrief support for Promise System.
- Keep evaluation logic, stake math, and result outcomes unchanged.
- Focus on minimal, safe implementation path.

## Current state (verified)

### 1) `ContractResultModal` and evaluation flow
- `ContractResultModal` currently renders success/miss messaging and actions, but has no reflection input or persistence hook.
  - `src/features/gamification/ContractResultModal.tsx`
- Evaluation is produced in `commitmentContracts.evaluateContract(...)`, then surfaced by `ContractsTab` via `contractResult` + `resultContract`.
  - `src/services/commitmentContracts.ts`
  - `src/features/gamification/ContractsTab.tsx`
- Closing the result modal (`handleContractResultClose`) only clears React state; no debrief is saved.
  - `src/features/gamification/ContractsTab.tsx`

### 2) Existing persistence pattern
- Contracts/evaluations are dual-path:
  - Supabase when `canUseSupabaseData() === true`
  - localStorage fallback when false
  - `src/services/commitmentContracts.ts`
- Supabase schema for promise data already uses dedicated tables + RLS:
  - `commitment_contracts`
  - `commitment_contract_evaluations`
  - `supabase/migrations/0140_commitment_contracts.sql`

### 3) AI coach data usage today
- AI coach currently reads goals/habits/journals/checkins/goal snapshots for interventions.
- It does **not** currently read promise/contract evaluations or any debrief dataset.
  - `src/features/ai-coach/AiCoach.tsx`
  - `src/types/aiCoach.ts`

## Decision: new `contract_debriefs` table?

**Decision: Yes — create a new table.**

### Why this is the smallest safe path
- Avoids touching `evaluateContract(...)` behavior and avoids risk to stake/result math.
- Avoids modifying/rewiring the existing due-evaluation RPC chain (`evaluate_due_commitment_contracts`) that writes `commitment_contract_evaluations`.
- Keeps debrief optional and post-result only.
- Provides clean, queryable structure for future AI pattern learning.

### Proposed table
- `contract_debriefs`
  - `id` (uuid default)
  - `user_id` (uuid, FK auth.users, required)
  - `contract_id` (text, FK commitment_contracts.id, required)
  - `evaluation_id` (text, FK commitment_contract_evaluations.id, required, unique for 1 debrief per evaluation)
  - `result` (text check in `('success','miss')`, required)
  - `reflection_text` (text, required, bounded in app/UI, e.g. 280 max)
  - `created_at` (timestamptz default now)
- RLS: owner-only select/insert/delete/update by `user_id`, matching repository table policy style.

## Local/demo mode storage decision

Use a service-level dual path matching `commitmentContracts`:
- Supabase mode: insert/select in `contract_debriefs`.
- Local/demo mode: localStorage key namespace per user, e.g. `lifegoal_contract_debriefs_${userId}`.

This aligns with existing Promise System fallback behavior and avoids introducing a parallel demo-only mechanism.

## How AI coach can later read reflections

Add a read-only debrief fetch (no coaching writes):
- `fetchRecentContractDebriefs(userId, limit)` service.
- In AI coach load path (`AiCoach.tsx`), behind `dataAccess.reflections`, pull recent debriefs and derive lightweight pattern signals:
  - frequent miss blockers (“what got in the way” clusters)
  - frequent success enablers (“what made this work” clusters)
- Use those signals for intervention cards and/or instruction context text.

This keeps AI integration incremental and decoupled from evaluation execution.

## Smallest safe implementation (recommended)

1. **Data layer**
   - Add `contract_debriefs` migration (table, indexes, RLS, policies).
   - Extend `database.types.ts` after migration.
2. **Service layer**
   - Add `saveContractDebrief(...)` and `fetchContractDebriefsByEvaluation(...)` in `src/services/commitmentContracts.ts` (or a small dedicated `contractDebriefs.ts` service).
   - Implement Supabase + localStorage fallback.
3. **UI layer**
   - In `ContractResultModal`, add optional textarea:
     - Success prompt: “What made this work?”
     - Miss prompt: “What got in the way?”
   - Add actions: `Skip` and `Save reflection`.
   - Save should persist debrief then close modal.
   - Skip closes unchanged.
4. **Non-goals / guardrails**
   - No changes to result computation, stake movement, cooldown/recovery semantics, or contract outcome flow.

## Staged implementation plan

### Stage 1 — Schema + types (safe foundation)
- Add Supabase migration for `contract_debriefs` with RLS/policies.
- Regenerate/align `database.types.ts`.

### Stage 2 — Service API + local fallback
- Add debrief save/fetch functions with the same Supabase/local pattern used by contract services.
- Add minimal unit tests for service behavior (Supabase path mocked + localStorage path).

### Stage 3 — Result modal UX wiring
- Add optional prompt + textarea in `ContractResultModal`.
- Wire save/skip callbacks from `ContractsTab`.
- Ensure modal close/reset behavior remains intact.

### Stage 4 — AI coach read integration (read-only)
- Behind `dataAccess.reflections`, read recent debriefs.
- Surface one small intervention/pattern summary; no chat behavior rewrite required.

## PR comment summary (ready to paste)

Investigated Promise Debrief Journal in the current Promise System flow.

- `ContractResultModal` currently has no reflection input/persistence; closing the modal only clears local state.
- Evaluation flow is centered in `evaluateContract(...)` and surfaced by `ContractsTab`; this should remain untouched.
- Smallest safe design is a new `contract_debriefs` table (linked to contract + evaluation) so debriefs stay decoupled from evaluation/stake logic.
- Local/demo mode should mirror current contract fallback: per-user localStorage storage when Supabase is unavailable.
- AI coach can later consume debriefs via a read-only fetch behind `dataAccess.reflections` and use simple blocker/enabler pattern summaries.

Recommended staged plan:
1) schema/types, 2) service + local fallback, 3) modal wiring, 4) optional AI coach read integration.
