# Conflict Resolver — Conflict Routing AI Orchestration Investigation

> Scope: investigation only. This document maps the current Conflict Resolver AI flow and recommends a safe future implementation slice for passing `conflictRouting` into AI prompt builders. No schema, auth, invite-token, Supabase RLS, gameplay, economy, Island Run, or unrelated page changes are proposed for this PR.

## 1) Executive summary

Conflict Resolver now has local draft-level `conflictRouting` metadata with a user-selected `primaryConflictType`, optional `secondarySignals`, and a `safetyFlag`. The deterministic UI already uses that routing metadata for the first private-capture prompt and resolution guidance. The AI orchestration layer does **not** receive that metadata yet: shared summaries are built only from private-capture answers, and resolution options are built only from summary cards.

A safe future implementation should pass a narrow, sanitized routing context into the existing prompt builders as **user-selected context, not truth**. The AI should be instructed to use the selected shape only as a lens for emphasis, never as a diagnosis or verdict. `safetyFlag` must override normal mutual-resolution, invite, agreement, apology, and reconciliation-oriented framing.

Recommended implementation shape:

1. Add an optional `conflictRouting?: ConflictRoutingMetadata` input to shared-summary and resolution-option orchestration calls.
2. Convert routing metadata into a small prompt-safe `routingContext` string/object.
3. Add category-specific guardrails to the prompts, especially for `personality_annoyance`, `boundary_issue`, `hurt_broken_trust`, and `repeated_pattern`.
4. Add deterministic fallback variants and lint rules before making AI output category-aware in production.
5. Keep older drafts and sessions without routing metadata working by treating missing routing as `unsure`/no lens and `safetyFlag: false`.

## 2) Current AI flow map

### User-facing stage flow

Current UI flow includes:

```text
mode_selection → grounding → conflict_type_routing → private_capture → collect_pile → parallel_read → resolution_builder → apology_alignment → agreement_preview → agreement_finalized
```

`conflict_type_routing` is a UI-only stage mapped to the existing persisted `private_capture` conflict status, so routing v1 avoided database status changes.

### Routing metadata lifecycle

- `ConflictRoutingMetadata` currently contains:
  - `primaryConflictType`
  - `selectedBy`
  - `confidence`
  - `secondarySignals`
  - `safetyFlag`
  - `canChangeLater`
- `useConflictSession` initializes routing with `DEFAULT_CONFLICT_ROUTING`.
- Draft hydration merges older snapshots with `DEFAULT_CONFLICT_ROUTING`, which means older local drafts without `conflictRouting` remain resumable.
- `selectConflictRoutingType` stores the user-selected primary category.
- `flagConflictRoutingSafety` sets `safetyFlag: true` and defaults the primary category to `boundary_issue` only if none is selected.
- `prompts` are derived from `conflictRouting.primaryConflictType`, replacing only the first private-capture prompt while preserving the canonical answer IDs.
- Local draft persistence writes the full `conflictRouting` object into the existing localStorage draft snapshot.

### Shared-conflict AI sequence

For `selectedType === 'shared_conflict'`:

1. `finishPrivateCapture` calls `generateSharedSummaryCards({ sessionId, answers })`.
2. `generateSharedSummaryCards` resolves entitlement for `conflict_shared_mediation`.
3. If AI is unavailable, it returns `DEFAULT_SHARED_SUMMARY_CARDS` and fairness-lints those fallback cards.
4. If AI is available:
   - `buildSharedSummaryPrompt({ answers })` creates the prompt.
   - Prompt text is persisted as a `conflict_ai_messages` user message.
   - OpenAI chat completions are called.
   - `parseSharedSummaryCardsFromContent` parses strict JSON.
   - `lintSharedSummaryFairness` checks output.
   - AI run/artifact/assistant message are persisted.
5. `summaryCards` shown in UI prefer AI cards. If AI cards are absent, the hook uses deterministic local summary cards from `answers` and sanitizes them with `sanitizeForSharedSummary` for shared conflicts.

### Resolution-option AI sequence

For the parallel-read completion path:

1. `completeParallelRead` builds `summarySource` from AI summary cards if present, otherwise from raw answer-backed cards.
2. `completeParallelRead` calls `generateResolutionOptions({ sessionId, summaryCards })`.
3. `generateResolutionOptions` resolves entitlement for `conflict_shared_mediation`.
4. If AI is unavailable, it returns `DEFAULT_RESOLUTION_OPTIONS` and fairness-lints those fallback options.
5. If AI is available:
   - `buildResolutionOptionsPrompt({ summaryCards })` creates the prompt.
   - Prompt text is persisted as a `conflict_ai_messages` user message.
   - OpenAI chat completions are called.
   - `parseResolutionOptionsFromContent` parses strict JSON.
   - `lintResolutionOptionFairness` checks output.
   - AI run/artifact/assistant message are persisted.
6. `ResolutionBuilderScreen` then renders deterministic category-aware guidance separately through `getConflictResolutionGuidance({ primaryConflictType, safetyFlag })`, but AI resolution options are not category-aware yet.

### Inner-tension AI sequence

For `selectedType === 'inner_tension'`, `finishPrivateCapture` calls `generateInnerNextStepRecommendations({ sessionId, answers, usedContextDomains: ['reflections'] })`. This path is not part of the shared summary/proposal flow and should not be included in the first routing-to-shared-mediation implementation unless product explicitly wants inner-tension routing behavior too.

## 3) Files and functions involved now

| Area | File | Current responsibility | Future implementation relevance |
| --- | --- | --- | --- |
| Routing metadata type | `src/features/conflict-resolver/types/conflictSession.ts` | Defines `ConflictRoutingType` and `ConflictRoutingMetadata`. | Reuse the existing type; no schema change needed for local draft routing context. |
| Flow state + draft persistence | `src/features/conflict-resolver/hooks/useConflictSession.ts` | Owns `conflictRouting`, draft hydration/persistence, first prompt derivation, and calls AI orchestration. | Pass `conflictRouting` into AI calls from `finishPrivateCapture` and `completeParallelRead`. |
| Shared summary prompt | `src/features/conflict-resolver/services/conflictAiOrchestrator.ts` | `buildSharedSummaryPrompt` currently receives only `answers`. | Add optional routing context input and prompt instructions. |
| Resolution prompt | `src/features/conflict-resolver/services/conflictAiOrchestrator.ts` | `buildResolutionOptionsPrompt` currently receives only `summaryCards`. | Add optional routing context input and safety/category guardrails. |
| Deterministic AI fallbacks | `src/features/conflict-resolver/services/conflictAiOrchestrator.ts` | `DEFAULT_SHARED_SUMMARY_CARDS` and `DEFAULT_RESOLUTION_OPTIONS`. | Add category/safety-aware fallback factory before depending on prompt-only behavior. |
| Fairness linting | `src/features/conflict-resolver/services/conflictFairnessLint.ts` | Checks shared summaries for blame and side-balance risk; checks resolution options for asymmetry. | Extend with category/safety-sensitive banned framing checks. |
| Local summary moderation | `src/features/conflict-resolver/hooks/useConflictSession.ts` | `sanitizeForSharedSummary` softens escalatory language and direct blame for fallback UI summary cards. | Consider extracting or aligning with AI output neutralization. |
| Deterministic resolution guidance | `src/features/conflict-resolver/services/conflictResolutionGuidance.ts` | Returns category-aware UI guidance; `safetyFlag` overrides normal resolution guidance. | Source of product-safe category copy and safety priority for AI prompt wording. |
| Resolution UI | `src/features/conflict-resolver/screens/ResolutionBuilderScreen.tsx` | Displays deterministic category guidance and AI/deterministic resolution options. | Should remain presentation-only; do not put AI prompt logic in UI. |
| Smoke validation | `scripts/conflict-resolver-validation-smoke.mjs` | Validates current Conflict Resolver guardrails exist. | Add checks that routing context is wired and safety override instructions exist. |

## 4) Where shared summary prompts are built

Shared-summary prompts are built in `buildSharedSummaryPrompt(input: { answers: Record<string, string> })` inside `conflictAiOrchestrator.ts`.

Current behavior:

- Identifies the model role as a neutral conflict mediator.
- Requires strict JSON with exactly three summary cards:
  - `what_happened`
  - `what_it_meant`
  - `what_is_needed`
- Instructs: “Use balanced language with no blame or insults.”
- Inserts raw `answers` as JSON.

Current gap:

- No routing metadata is included.
- No safety override is included.
- No explicit instruction prevents diagnostic labeling, toxic-person labeling, assuming the category is objectively true, rushing forgiveness, or pressuring reconciliation.

## 5) Where resolution/proposal prompts are built

Resolution/proposal prompts are built in `buildResolutionOptionsPrompt(input: { summaryCards: SharedSummaryCard[] })` inside `conflictAiOrchestrator.ts`.

Current behavior:

- Identifies the model role as a practical conflict coach.
- Requires strict JSON with `options` containing `id`, `title`, and `description`.
- Asks for up to three concrete next-step resolution options that are fair to both sides.
- Inserts `summaryCards` as JSON.

Current gap:

- No routing metadata is included.
- No safety override is included.
- The instruction “fair to both sides” can become unsafe if `safetyFlag === true` or if user inputs indicate coercion/abuse/fear.
- No category-specific constraints are included, so AI may produce generic mutual-resolution suggestions when the selected conflict shape calls for boundaries, slow trust repair, or pattern interruption.

## 6) Where fallback deterministic outputs are created

Fallback outputs are currently constants in `conflictAiOrchestrator.ts`:

- `DEFAULT_SHARED_SUMMARY_CARDS`
- `DEFAULT_RESOLUTION_OPTIONS`

They are used when:

- entitlement blocks AI,
- there is no API key/model,
- OpenAI response parsing fails,
- orchestration errors occur.

Additional deterministic outputs exist outside the AI orchestrator:

- `summaryCards` in `useConflictSession` creates fallback visible summary cards from the user’s answers when no AI summary cards exist.
- `sanitizeForSharedSummary` moderates those local fallback summary cards for shared conflicts.
- `defaultResolutionOptions` in `useConflictSession` mirrors the orchestrator’s default options for UI fallback when no AI resolution options exist.
- `getConflictResolutionGuidance` returns deterministic category-aware and safety-first helper copy in `conflictResolutionGuidance.ts`.

Implementation implication:

- A safe future PR should not only change AI prompts. It should also make deterministic fallbacks category/safety-aware, or at minimum ensure `safetyFlag` prevents generic mutual-resolution fallback copy from becoming the only available guidance.

## 7) Where fairness linting, neutralization, or moderation is applied

### Fairness linting

`conflictFairnessLint.ts` currently provides:

- `lintSharedSummaryFairness(cards)`:
  - flags direct-blame phrases such as “you always,” “you never,” “you made me,” “you are,” and “it’s your fault.”
  - flags side-balance risk when first-person and second-person pronoun signals diverge heavily.
- `lintResolutionOptionFairness(options)`:
  - flags solution asymmetry when first-person and second-person signals diverge heavily.

### Local deterministic neutralization

`sanitizeForSharedSummary` in `useConflictSession.ts` currently:

- softens escalatory phrases such as “idiot,” “stupid,” “shut up,” “hate you,” “worthless,” and “kill yourself.”
- reframes direct-blame phrases such as “you always,” “you never,” “you made me,” and “you are.”
- returns transparent moderation notes shown on fallback summary cards.

### AI-output handling

The AI flow currently lints generated shared summaries and resolution options. It records fairness warnings in run metadata and artifacts. It does **not** currently rewrite or reject unsafe category-specific output beyond falling back on schema failure or fairness warnings.

Implementation implication:

- Future routing-aware AI should add a second lint dimension for safety/category risks, not just balance/blame:
  - diagnostic language risk,
  - toxic-person labeling risk,
  - reconciliation pressure risk,
  - forgiveness pressure risk,
  - boundary permission-seeking risk,
  - repeated-pattern vague-repeat risk,
  - safety-flag mutual-resolution risk.

## 8) Whether safety-sensitive inputs already override mutual-resolution framing

Partially, but not completely.

What exists now:

- `conflictRouting.safetyFlag` can be set by the user through routing.
- `getConflictResolutionGuidance` returns `SAFETY_FIRST_GUIDANCE` whenever `safetyFlag` is true.
- This deterministic guidance says the situation may not be a mutual problem-solving situation and that safety/support matter first.

What does not exist yet:

- `safetyFlag` is not passed into `generateSharedSummaryCards`.
- `safetyFlag` is not passed into `generateResolutionOptions`.
- AI prompts do not instruct the model to avoid mutual-resolution framing when safety is flagged.
- `DEFAULT_RESOLUTION_OPTIONS` remains normal mutual-resolution copy even if `safetyFlag` is true.
- Invite, agreement, and apology flows are not globally safety-gated by AI orchestration. Any future work should be careful not to create pressure to invite, reconcile, apologize, or finalize an agreement when `safetyFlag` is true.

Conclusion: safety-sensitive routing currently overrides deterministic helper copy, but not the AI prompt layer or default AI fallbacks.

## 9) Safe way to pass routing metadata into AI prompt builders

### Recommended input shape

Use the existing app type internally, but convert it before prompt insertion:

```ts
type ConflictRoutingPromptContext = {
  primaryConflictType: ConflictRoutingType | null;
  secondarySignals: string[];
  safetyFlag: boolean;
  selectedBy: 'user' | 'system_suggested' | null;
  confidence: 'user_asserted' | 'system_inferred' | null;
};
```

Recommended function:

```ts
function buildConflictRoutingPromptContext(
  routing?: ConflictRoutingMetadata | null,
): ConflictRoutingPromptContext {
  return {
    primaryConflictType: routing?.primaryConflictType ?? null,
    secondarySignals: Array.isArray(routing?.secondarySignals) ? routing.secondarySignals.slice(0, 4) : [],
    safetyFlag: Boolean(routing?.safetyFlag),
    selectedBy: routing?.selectedBy ?? null,
    confidence: routing?.confidence ?? null,
  };
}
```

### Where to pass it

Future call sites:

```ts
generateSharedSummaryCards({
  sessionId: sharedSessionId,
  answers,
  conflictRouting,
});
```

```ts
generateResolutionOptions({
  sessionId: sharedSessionId,
  summaryCards,
  conflictRouting,
});
```

### Metadata persistence

Prompt messages are already persisted in `conflict_ai_messages`. For privacy/minimalism, routing context can be embedded in the persisted prompt only if needed for auditability. Alternatively, put a compact, non-diagnostic routing context in message metadata/artifacts:

```ts
metadata: {
  model: decision.model,
  mode: decision.mode,
  routingContext: buildConflictRoutingPromptContext(input.conflictRouting),
}
```

Do not add database columns in the implementation slice. Existing JSON metadata/artifact fields are enough.

## 10) Prompt-instruction recommendations

### Global routing instructions

Add these instructions to both shared-summary and resolution-option prompt builders:

```text
Routing context is user-selected and may be incomplete. Treat it as a lens for emphasis, not as a fact, diagnosis, verdict, or proof about either person.
Do not state or imply that the selected category is objectively true.
Do not diagnose either person or infer mental health, personality disorder, abuse status, intent, or character from the category.
Do not call either person toxic, abusive, narcissistic, manipulative, gaslighting, unsafe, or the problem unless the user explicitly used those words; even then, paraphrase carefully and do not validate it as a clinical/legal conclusion.
Do not override user-provided facts. If facts are limited, keep language tentative and specific to what was described.
Do not pressure reconciliation, forgiveness, contact, apology, invitation, or agreement.
Prefer wording like “the user selected this as closest to…” or “if this is mainly about…” internally; do not expose labels as verdicts in output.
```

### Safety override instructions

When `safetyFlag === true`, prepend or include highest-priority instructions:

```text
Safety flag is true. Safety-first guidance overrides normal mutual-resolution framing.
Do not frame this as a shared problem to solve together.
Do not recommend inviting the other person, negotiating, apologizing, reconciling, meeting privately, or creating an agreement.
Focus on immediate safety, support, documentation, boundaries, and trusted help.
Use calm, non-alarming wording. Include emergency-services guidance only for immediate danger.
Do not make legal, clinical, or diagnostic claims.
```

### Category-specific instructions

Use category-specific prompt snippets only when `safetyFlag !== true`.

#### `personality_annoyance`

```text
If the selected lens is personality_annoyance, avoid making either person wrong for having a trait or habit. Guide toward sustainable tolerance, an early specific boundary/request, and repair if the user became cold, sharp, mean, contemptuous, or withdrawn. Do not imply they must tolerate endless annoyance.
```

#### `boundary_issue`

```text
If the selected lens is boundary_issue, make the boundary clear and practical. Do not over-explain it as if it needs permission. Avoid suggesting the user must persuade the other person that the boundary is valid. Include what the user will do if the boundary is crossed again.
```

#### `hurt_broken_trust`

```text
If the selected lens is hurt_broken_trust, do not rush forgiveness, instant trust, or quick reconciliation. Emphasize impact, accountability, consistency over time, and what repair would need to demonstrate.
```

#### `repeated_pattern`

```text
If the selected lens is repeated_pattern, do not suggest merely having the same conversation again. Require “what changes this time?” Include a concrete pattern interruption, measurable behavior change, or consequence/check-in.
```

#### Other categories

- `misunderstanding`: emphasize checking interpretation before debating motive.
- `unfairness_imbalance`: make the imbalance concrete and measurable without global character attacks.
- `different_needs_values`: name tradeoffs and compatibility constraints; do not force one need to be “wrong.”
- `practical_decision`: separate decision criteria from emotional repair.
- `unsure`: keep exploratory and avoid overfitting.

## 11) Safety override recommendations

1. Treat `safetyFlag` as a hard branch in prompt construction, not as a soft category.
2. Safety branch should suppress normal “fair to both sides” resolution wording.
3. Safety branch should suppress invite/agreement/reconciliation recommendations in AI-generated options.
4. Safety branch should change deterministic fallback options to safety/support options before routing-aware AI ships.
5. Add lint rules that fail or warn on safety-flagged outputs containing:
   - “reconcile,”
   - “forgive,”
   - “invite them,”
   - “meet privately,”
   - “both apologize,”
   - “agreement,” unless framed as something to avoid/not rush.
6. Keep emergency copy measured: recommend emergency services only for immediate danger; otherwise recommend trusted support and local professional resources without making legal or clinical claims.
7. Do not let AI infer `safetyFlag` from category alone in v1. The user-set flag should be the deterministic override; separate future work can investigate text-based safety detection.

## 12) Handling missing or older draft routing metadata

Older drafts may not have `conflictRouting`. Current hydration already merges missing metadata with `DEFAULT_CONFLICT_ROUTING`.

Future implementation should preserve this behavior:

- If `conflictRouting` is missing: omit routing instructions or use a neutral “no selected lens” context.
- If `primaryConflictType` is null: do not force `unsure` into the prompt unless product wants an explicit exploratory lens.
- If `secondarySignals` is missing or malformed: use an empty array.
- If `safetyFlag` is missing: default to `false`.
- If an unknown future category appears: ignore category-specific instructions and use global non-diagnostic constraints.

Acceptance note: missing routing metadata must never block summary generation, resolution generation, draft hydration, shared-session progression, or UI rendering.

## 13) Recommended implementation slice

### Slice A — types and prompt context only

- Add optional `conflictRouting` input to `generateSharedSummaryCards` and `generateResolutionOptions`.
- Add `buildConflictRoutingPromptContext` helper in `conflictAiOrchestrator.ts` or a small new service file.
- Add routing context to persisted AI metadata for auditability.
- No behavioral prompt wording changes yet except test-covered no-op inclusion can be too thin; prefer combining with Slice B.

### Slice B — prompt guardrails and safety override

- Update `buildSharedSummaryPrompt` and `buildResolutionOptionsPrompt` to include global category-as-lens instructions.
- Add safety-first prompt branch.
- Add category snippets for the required categories.
- Pass `conflictRouting` from `useConflictSession` into shared-summary and resolution-option calls.

### Slice C — deterministic fallback parity

- Replace `DEFAULT_RESOLUTION_OPTIONS` constant usage with a small factory:
  - `getDefaultResolutionOptions(conflictRouting?)`.
- For `safetyFlag`, return safety-first options instead of mutual-resolution options.
- For `repeated_pattern`, include a “what changes this time?” fallback.
- For `hurt_broken_trust`, include slow repair/trust-over-time fallback.
- For `boundary_issue`, include boundary + follow-through fallback.
- Consider a shared factory to avoid the current duplicate default options in `conflictAiOrchestrator.ts` and `useConflictSession.ts`.

### Slice D — lint and validation

- Extend fairness linting or add `conflictSafetyAndCategoryLint.ts`.
- Add tests for prompt builders/fallback factories/lint rules.
- Extend `scripts/conflict-resolver-validation-smoke.mjs` with static checks for routing context, safety override, and category snippets.

Recommended first implementation PR: Slices B + C + D in one small PR, because prompt-only changes without fallback/lint parity can leave unsafe behavior during entitlement/API fallback.

## 14) Test plan before implementation

### Unit tests

Add tests for prompt construction and fallback behavior, preferably with exported pure helpers.

Suggested files:

- `src/features/conflict-resolver/services/__tests__/conflictAiOrchestrator.routing.test.ts`
- `src/features/conflict-resolver/services/__tests__/conflictFairnessLint.routing.test.ts`
- or equivalent colocated test paths matching the repository’s test conventions.

Cases:

1. Shared-summary prompt includes routing context when `primaryConflictType` is selected.
2. Shared-summary prompt says selected category is context/lens, not truth.
3. Resolution-options prompt includes the same non-diagnostic constraints.
4. `safetyFlag === true` prompt removes/overrides mutual-resolution framing.
5. Safety prompt contains no invite/agreement/reconciliation pressure.
6. `personality_annoyance` prompt includes sustainable tolerance, early boundary/request, and repair if the user became cold/sharp/mean.
7. `boundary_issue` prompt avoids permission-seeking/over-explaining boundary validity.
8. `hurt_broken_trust` prompt avoids rushing forgiveness/trust.
9. `repeated_pattern` prompt requires what changes this time.
10. Missing routing metadata produces the current safe generic prompt behavior.
11. Unknown/malformed `secondarySignals` are ignored/sanitized.
12. Safety fallback options differ from normal mutual-resolution options.
13. Lint catches diagnostic/toxic labels and reconciliation pressure.

### Integration-ish hook tests

If existing hook testing infrastructure supports it:

1. Select a category, complete private capture, and assert `generateSharedSummaryCards` receives `conflictRouting`.
2. Change category after draft answers and assert answers remain intact and the latest routing is passed.
3. Complete parallel read and assert `generateResolutionOptions` receives the same routing metadata.
4. Hydrate older draft without `conflictRouting` and assert AI calls still proceed with safe defaults.

### Static smoke validation

Extend `scripts/conflict-resolver-validation-smoke.mjs` to assert:

- `generateSharedSummaryCards` accepts or forwards `conflictRouting`.
- `generateResolutionOptions` accepts or forwards `conflictRouting`.
- prompt text contains “lens” or equivalent non-verdict wording.
- prompt text contains safety-first override instructions.
- category snippets include `personality_annoyance`, `boundary_issue`, `hurt_broken_trust`, and `repeated_pattern` special handling.

### Manual validation

Use representative private-capture inputs:

- annoyance where user admits becoming cold/sharp,
- boundary issue where the other person keeps pushing,
- broken trust where user is not ready to forgive,
- repeated pattern where the same apology has happened before,
- safety-flagged coercive/fearful input,
- missing routing metadata.

Verify outputs do not diagnose, label, blame, pressure reconciliation, override facts, or convert safety into mutual problem-solving.

## 15) Risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Category becomes a verdict | User-selected categories can be partial or emotion-driven. | Prompt says lens/not truth; output should avoid declarative labels. |
| Diagnostic drift | Categories like repeated pattern/boundary/trust can tempt AI into personality labels. | Ban diagnosis and toxic-person labels; add lint. |
| Reconciliation pressure | Conflict products can accidentally optimize for agreement even when separation/boundary is healthier. | Safety override; no pressure language; category-specific constraints. |
| Safety under-response | Current AI prompts have no safety branch. | Hard-branch `safetyFlag`; safety-aware fallbacks. |
| Safety over-response | Over-alarming safety copy can feel scary or legally/clinically overconfident. | Calm support-focused wording; emergency guidance only for immediate danger. |
| Fallback mismatch | Entitlement/API fallback could still show generic mutual-resolution options. | Build deterministic routing/safety fallback factory. |
| Older draft breakage | Older localStorage snapshots lack routing metadata. | Keep optional inputs and defaults. |
| Prompt injection in answers | User text is embedded into prompt. | Keep strict JSON output, explicit system-style constraints, and lint output. Future work may separate system/user messages. |
| Persisted prompt sensitivity | Prompts are persisted to Supabase AI message tables. | Store compact routing context only; avoid adding sensitive derived judgments. |

## 16) Acceptance criteria for a future implementation PR

- `conflictRouting` is passed to shared-summary and resolution-option orchestration without schema/auth/RLS/invite changes.
- Missing routing metadata preserves current behavior and does not block older drafts.
- Prompts explicitly say the selected category is a lens/context, not truth/verdict/diagnosis.
- Prompts forbid diagnosis, toxic-person labeling, blame escalation, fact invention, and reconciliation pressure.
- `safetyFlag === true` overrides normal mutual-resolution prompt framing and deterministic fallback options.
- Required category behaviors are covered:
  - `personality_annoyance`: sustainable tolerance, early boundary/request, repair if user became cold/sharp/mean.
  - `boundary_issue`: boundary clarity without permission-seeking.
  - `hurt_broken_trust`: no rushed forgiveness or instant trust.
  - `repeated_pattern`: requires what changes this time.
- AI outputs remain strict JSON and existing parsers still work.
- Fairness/safety/category linting catches the main unsafe phrasings.
- Smoke validation and unit tests pass.
- No gameplay/economy/Island Run/unrelated files are modified.

## 17) Exact files likely to change in a future implementation PR

Likely production files:

1. `src/features/conflict-resolver/hooks/useConflictSession.ts`
   - Pass `conflictRouting` into `generateSharedSummaryCards` and `generateResolutionOptions`.
   - Potentially consume shared deterministic fallback factories to avoid duplicate default options.
2. `src/features/conflict-resolver/services/conflictAiOrchestrator.ts`
   - Add optional routing inputs.
   - Add routing prompt context builder.
   - Update shared-summary and resolution-option prompt builders.
   - Add or call category/safety-aware default option factories.
   - Persist compact routing metadata in AI message/run/artifact metadata if useful.
3. `src/features/conflict-resolver/services/conflictFairnessLint.ts`
   - Extend linting with safety/category-specific warning codes, or delegate to a new lint file.
4. `src/features/conflict-resolver/services/conflictResolutionGuidance.ts`
   - Reuse existing safe copy, or export category guardrail snippets/fallback guidance if it remains cleanly deterministic.
5. `src/features/conflict-resolver/types/conflictSession.ts`
   - Probably unchanged; only change if a prompt-safe context type is centralized here.

Likely new files:

1. `src/features/conflict-resolver/services/conflictRoutingPromptContext.ts`
   - Optional helper for prompt-safe routing normalization.
2. `src/features/conflict-resolver/services/conflictResolutionFallbacks.ts`
   - Optional shared deterministic fallback factory for AI orchestration and UI fallback parity.
3. `src/features/conflict-resolver/services/conflictSafetyAndCategoryLint.ts`
   - Optional new lint module if extending `conflictFairnessLint.ts` would make it too broad.

Likely tests/scripts:

1. `src/features/conflict-resolver/services/__tests__/conflictAiOrchestrator.routing.test.ts`
2. `src/features/conflict-resolver/services/__tests__/conflictFairnessLint.routing.test.ts`
3. `scripts/conflict-resolver-validation-smoke.mjs`

Files that should **not** change for this implementation:

- Supabase migrations/schema files.
- Auth services.
- Invite token services except if a separate safety UX policy later changes invite availability.
- Supabase RLS policies.
- Gameplay, economy, Island Run, gamification, or unrelated pages.

## 18) Suggested implementation order

1. Add prompt-context helper and tests for missing/older metadata.
2. Add prompt guardrails and tests for each required category.
3. Add safety-first prompt branch and safety-aware fallback options.
4. Extend linting/static smoke validation.
5. Wire `useConflictSession` to pass routing into the orchestrator.
6. Manually validate representative examples before enabling broad use.

