# Conflict Resolver routing + AI flow audit — 2026-06-16

## Scope

Audited the merged Conflict Resolver routing and AI orchestration work without changing production code. The review covered:

- Normal shared conflict route
- Inner tension route
- `conflict_type_routing` route
- Change conflict shape route
- `safetyFlag` route
- Older draft hydration
- AI unavailable fallback
- AI parsing/fairness failure fallback
- Resolution builder guidance
- Invite/shared-session flow regressions
- Strict JSON parsing
- Smoke validation coverage quality

## Overall verdict

**FAIL — ship blockers are limited, but safety and validation gaps remain.** The core routes are wired and build successfully, but the safety route can still proceed into normal apology/agreement finalization, one fallback path records misleading AI provenance, shared-session stage sync bypasses the new routing UI, and the smoke check is mostly regex-based rather than behavior-based.

## Flow results

| Flow | Result | Evidence | Risk |
|---|---:|---|---|
| Normal shared conflict route | PASS with caveat | Shared sessions must exist before grounding; shared capture calls summary AI with `conflictRouting`, then resolution AI with the same routing metadata. | Shared DB stage sync maps `private_capture` directly to the private screen, so an existing shared session resumed from DB can bypass the routing UI. |
| Inner tension route | PASS with caveat | Inner tension runs private capture, then `generateInnerNextStepRecommendations`, and finalizes locally after the next-step screen. | Button copy still says “Continue to shared step” on the last private prompt even for inner tension. |
| `conflict_type_routing` route | PASS | Grounding advances to `conflict_type_routing`; continue resets `promptIndex` and moves to private capture; routing-specific first prompts are used. | No typed/unit coverage asserts this route behavior. |
| Change conflict shape route | PASS with caveat | Private capture exposes a “Change” action that returns to routing. Prompt recomputation uses the updated routing type. | Existing `answers.what_happened` is retained even when the prompt shape changes, which can feel surprising because the question changes under an old answer. |
| `safetyFlag` route | FAIL | Safety flag sets `primaryConflictType` to `boundary_issue` when needed and flows to private capture. Resolution fallback/guidance is safety-first. | The flow still goes to apology alignment and agreement preview/finalization, whose copy and required apology selection remain mutual-resolution oriented. |
| Older draft hydration | PASS | Draft hydration merges missing `conflictRouting` with `DEFAULT_CONFLICT_ROUTING`, so older drafts without the field remain resumable. | Stage values are trusted broadly after JSON parse; malformed newer/unknown UI stages are not guarded by a UI-stage validator. |
| AI unavailable fallback | PASS with caveat | Shared summary and resolution generation return deterministic fallbacks when entitlement/model/API key is unavailable. | Summary fallback is generic “No summary available yet,” not based on the user’s sanitized answers; this can look like data loss when AI is unavailable. |
| AI parsing failure fallback | PASS | Strict `JSON.parse` is preserved and parser failures produce empty parsed arrays that trigger deterministic fallback. | `rewritePrivateCaptureAnswers` has looser schema validation and can accept partial/non-string `rewrittenAnswers`, although it is not currently wired into the UI flow. |
| AI fairness failure fallback | FAIL | Fairness warnings are detected and surfaced. | Fairness warnings set `fallbackUsed: true` in telemetry, but the UI still receives the unfair AI output rather than deterministic fallback options/cards. |
| Resolution builder guidance | PASS | Guidance is type-aware and safety overrides category guidance. | Safety guidance is undermined by downstream apology/agreement screens. |
| Invite/shared-session flow | PASS with caveat | Invite token bootstrap still redeems token, adds participant, sets selected type to shared, syncs status, and gates invalid/validating invite UI. | Realtime/status sync maps DB `private_capture` to private capture, not the new routing screen; routing metadata is not persisted to the shared session stage state. |
| Strict JSON parsing | PASS | AI schema parsers use `JSON.parse` and return empty results on malformed content; no markdown/substring extraction was added. | Chat completions request does not use API-level JSON response format, so strictness is parser-side only. |
| Smoke validation coverage | FAIL | Smoke script checks important wiring strings. | It is mostly source regex validation and cannot catch route transitions, safety continuation into apology/agreement, fairness-output behavior, or draft hydration behavior. |

## Risks found

### 1) Safety route still enters apology/agreement finalization

- `safetyFlag` correctly switches routing metadata into safety-first mode and changes the routing CTA copy.
- Resolution guidance and deterministic options become safety-first.
- After selecting a safety option, the generic continuation still routes to apology alignment and agreement preview/finalization.
- Agreement finalization requires an apology type even for safety-first flows.

**Files involved**

- `src/features/conflict-resolver/hooks/useConflictSession.ts`
- `src/features/conflict-resolver/screens/ConflictTypeRoutingScreen.tsx`
- `src/features/conflict-resolver/screens/ResolutionBuilderScreen.tsx`
- `src/features/conflict-resolver/screens/ApologyAlignmentScreen.tsx`
- `src/features/conflict-resolver/components/AgreementCloseCard.tsx`
- `src/features/conflict-resolver/services/conflictResolutionGuidance.ts`
- `src/features/conflict-resolver/services/conflictResolutionFallbacks.ts`

**Recommended small PR**

Create a safety-first exit branch after resolution builder. For `safetyFlag`, skip apology alignment and agreement-finalization copy that implies mutual repair. Route to a support-plan close screen or a safety-first completion state using existing primitives, and add tests/manual validation for “no apology required, no invite pressure, no agreement pressure.”

### 2) Fairness failure does not actually fallback from AI content

When AI returns parseable content with fairness warnings:

- `fallbackUsed` is recorded as true.
- Warning UI is shown.
- The actual `summaryCards` or `options` remain the parseable AI output.

That is confusing because telemetry says fallback was used, but the user sees the warned AI content.

**Files involved**

- `src/features/conflict-resolver/services/conflictAiOrchestrator.ts`
- `src/features/conflict-resolver/services/conflictFairnessLint.ts`
- `src/features/conflict-resolver/screens/ResolutionBuilderScreen.tsx`

**Recommended small PR**

Make fairness behavior explicit and consistent. Either:

1. Treat fairness warnings as advisory and record `fallbackUsed: false`, or
2. Treat fairness warnings as hard failures and replace AI cards/options with deterministic fallbacks.

For safety-sensitive conflict UX, prefer option 2 for resolution options and add test coverage.

### 3) Shared-session DB status can bypass the new routing UI

The new UI stage `conflict_type_routing` maps to DB status `private_capture`, and DB status `private_capture` maps back to UI `private_capture`. That means a participant joining/resyncing a shared session at `private_capture` lands directly in private capture, not routing.

**Files involved**

- `src/features/conflict-resolver/hooks/useConflictSession.ts`
- `src/features/conflict-resolver/stateMachine/conflictStateMachine.ts`
- `src/features/conflict-resolver/types/conflictSession.ts`
- `src/features/conflict-resolver/services/conflictSessions.ts`

**Recommended small PR**

Persist a routing-complete marker or introduce a stage-state field for the routing sub-step without changing existing DB status semantics. On shared-session hydration/resync, route DB `private_capture` to `conflict_type_routing` unless local/session stage state confirms routing was completed.

### 4) AI-unavailable shared summary fallback looks like lost input

If shared-summary AI is unavailable, fallback cards are generic “No summary available yet.” The UI then prefers those AI fallback cards over the deterministic local sanitized answer cards, so users can lose visible summaries after completing private capture.

**Files involved**

- `src/features/conflict-resolver/services/conflictAiOrchestrator.ts`
- `src/features/conflict-resolver/hooks/useConflictSession.ts`

**Recommended small PR**

For unavailable AI, build fallback shared-summary cards from sanitized user answers instead of generic empty cards, or return `null`/empty cards so the existing local sanitized summary path is used.

### 5) Older draft hydration is compatible but under-validated

Older drafts without `conflictRouting` hydrate safely because default routing metadata is merged in. However, parsed draft `stage` values are trusted and can be persisted again even if they are not valid UI stages.

**Files involved**

- `src/features/conflict-resolver/hooks/useConflictSession.ts`

**Recommended small PR**

Add a small UI-stage validator for local draft hydration, similar to the canonical stage validator used for shared-session status. Default invalid draft stages to `mode_selection` and keep the older-draft compatibility path.

### 6) Smoke validation is mostly string checks

The smoke script is useful as a wiring guard but not a behavioral smoke test. It does not execute route transitions or AI fallback functions with fixtures.

**Files involved**

- `scripts/conflict-resolver-validation-smoke.mjs`

**Recommended small PR**

Add a behavior smoke script or lightweight unit tests that import pure functions and verify:

- Strict JSON parser rejects markdown-wrapped JSON.
- Malformed summary/resolution JSON returns fallback.
- Fairness warning behavior matches the selected policy.
- Safety fallback contains no apology/invite/agreement pressure.
- Older draft without `conflictRouting` hydrates to defaults.
- Shared route reaches routing before private capture for new sessions.

### 7) Inner tension copy still references shared flow

The final private-capture CTA always says “Continue to shared step.” For inner tension, the next destination is inner next steps, not a shared step.

**Files involved**

- `src/features/conflict-resolver/screens/PrivateCaptureScreen.tsx`
- `src/features/conflict-resolver/ConflictResolverExperience.tsx`

**Recommended small PR**

Pass a context-specific final CTA label into `PrivateCaptureScreen`, e.g. “Continue to next steps” for inner tension and “Continue to shared step” for shared conflict.

## Non-regressions confirmed

- The invite/shared-session join path still gates Peace Between invite validation/invalid UI and did not appear accidentally removed.
- Strict parser behavior remains parser-side `JSON.parse`; no permissive markdown extraction was introduced in the audited schema parsers.
- Resolution guidance has category coverage for every routing type and safety-first override wins over category guidance.
- The production build completes successfully.

## Recommended PR sequence

1. **Safety route close-state fix** — prevent safety-first flows from requiring apology/agreement finalization.
2. **Fairness fallback policy fix** — make telemetry and displayed content consistent.
3. **Shared-session routing hydration fix** — prevent invite/resync participants from bypassing routing.
4. **AI-unavailable summary fallback fix** — preserve sanitized user answers when AI is unavailable.
5. **Behavioral smoke coverage** — replace/augment regex checks with executable route and parser fixtures.
6. **Small UX polish** — context-specific inner tension CTA label and draft stage validation.

## Commands run

- `rg --files -g 'AGENTS.md' -g '!node_modules' -g '!dist' -g '!build'`
- `find .. -name AGENTS.md -print`
- `git status --short`
- `rg -n "Conflict Resolver|conflict resolver|conflict_type|safetyFlag|inner tension|shared conflict|resolution builder|strict JSON|JSON.parse|invite|shared-session|shared session|hydration|draft" -S . -g '!node_modules' -g '!dist' -g '!build'`
- `rg --files src supabase scripts docs investigations | rg -i 'conflict|peacebetween'`
- `sed -n '1,260p' src/features/conflict-resolver/ConflictResolverExperience.tsx`
- `sed -n '1,760p' src/features/conflict-resolver/services/conflictAiOrchestrator.ts`
- `sed -n '1,220p' src/features/conflict-resolver/services/conflictAiSchemas.ts`
- `sed -n '1,1160p' src/features/conflict-resolver/hooks/useConflictSession.ts`
- `sed -n '1,260p' src/features/conflict-resolver/screens/ConflictTypeRoutingScreen.tsx`
- `sed -n '1,240p' src/features/conflict-resolver/screens/PrivateCaptureScreen.tsx`
- `sed -n '1,240p' scripts/conflict-resolver-validation-smoke.mjs`
- `sed -n '1,220p' src/features/conflict-resolver/screens/ResolutionBuilderScreen.tsx`
- `sed -n '1,220p' src/features/conflict-resolver/services/conflictRoutingPromptContext.ts`
- `sed -n '1,220p' src/features/conflict-resolver/services/conflictFairnessLint.ts`
- `sed -n '1,200p' docs/conflict-resolver/09_ACCEPTANCE_VALIDATION_RUNBOOK.md`
- `npm run check:conflict-resolver-validation`
- `npm run build`
