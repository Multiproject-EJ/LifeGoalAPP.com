# Conflict Resolver — “What Does This Feel Closest To?” Routing Moment Investigation

> Date: 2026-06-16  
> Task type: investigation + implementation plan only.  
> Scope: PeaceBetween / Conflict Resolver flow.  
> Non-goals: no database schema changes, auth changes, invite token changes, Supabase RLS changes, HabitGame gameplay/economy changes, Island Run changes, or unrelated landing page work.

---

## 1) Product thesis

Conflict Resolver should gain an emotionally intelligent routing moment after grounding and before private capture:

> “What does this feel closest to right now?”

This is not a diagnosis and not an official label. It is a starting map. The user should be able to change it later, and the system should treat it as context rather than truth.

The desired transformation is:

> “I’m angry / hurt / annoyed / confused.” → “This is the shape of the problem. Here is the next wise move.”

---

## 2) Current flow map

The current top-level flow is centralized in `ConflictResolverExperience` and branches by `session.stage`:

1. `mode_selection` → `ModeSelectionScreen`
2. `grounding` → `GroundingScreen`
3. `private_capture` → `PrivateCaptureScreen`
4. `collect_pile` → `CollectPileScreen`
5. `inner_next_step` for inner-tension guidance
6. `parallel_read` → `ParallelReadScreen`
7. `resolution_builder` → `ResolutionBuilderScreen`
8. `apology_alignment` → `ApologyAlignmentScreen`
9. `agreement_preview` → `AgreementCloseCard`
10. `agreement_finalized` → completion state

The stage map in `useConflictSession` currently maps UI stages onto persisted conflict statuses. There is no existing UI stage between `grounding` and `private_capture`.

---

## 3) Files/components involved

### Top-level routing

- `src/features/conflict-resolver/ConflictResolverExperience.tsx`
  - Owns screen selection by `session.stage`.
  - This is the likely place to insert a new `ConflictTypeRoutingScreen` branch.

### Session state and transitions

- `src/features/conflict-resolver/hooks/useConflictSession.ts`
  - Owns the UI-stage union, local draft persistence, grounding completion, prompt arrays, answers, summary generation, invite join state, and reset behavior.
  - `startPrivateCapture` currently advances directly from grounding to `private_capture`.
  - `CONFLICT_SESSION_DRAFT_STORAGE_KEY` stores local draft snapshots in `localStorage`.

### Existing mode type

- `src/features/conflict-resolver/types/conflictSession.ts`
  - `ConflictType` currently means mode: `inner_tension` or `shared_conflict`.
  - The new routing category should not reuse this name in product code because it would conflict conceptually with mode.
  - Recommended internal naming: `ConflictRoutingType` or `ConflictProblemShape`.

### Grounding

- `src/features/conflict-resolver/screens/GroundingScreen.tsx`
  - Last grounding CTA calls `onReady`.
  - `onReady` currently points to `session.startPrivateCapture`.
  - Safest v1 change: point it to `session.startConflictTypeRouting` instead, then continue to private capture from the new screen.

### Private capture

- `src/features/conflict-resolver/screens/PrivateCaptureScreen.tsx`
  - Receives a prompt array from `session.prompts`.
  - The hook currently returns the static `PRIVATE_CAPTURE_PROMPTS` array.
  - Smallest smart payoff: make `session.prompts` derived from the selected routing type so the first prompt changes visibly.

### AI orchestration

- `src/features/conflict-resolver/services/conflictAiOrchestrator.ts`
  - `buildSharedSummaryPrompt` and `buildResolutionOptionsPrompt` currently receive only answers or summary cards.
  - Later slice: pass routing type as context with strict instructions: use as a lens, not a verdict; do not diagnose; do not pressure reconciliation; safety overrides normal resolution.

### Persistence / database

- `supabase/migrations/0198_conflict_resolver_foundation.sql`
  - `conflict_sessions` currently has `conflict_type` and `status`, but no metadata column.
  - `conflict_proposals` has a `metadata` JSONB column, but that is not a session-level draft metadata location.
  - Since v1 should not modify schema, persist selected routing metadata locally in the existing draft snapshot first.
  - Later schema option: add session-level `metadata jsonb` or a dedicated table only after the UX proves useful.

---

## 4) Safest insertion point

Recommended v1 insertion point:

`mode_selection` → `grounding` → **`conflict_type_routing`** → `private_capture`

Why:

- It matches the product direction: calm first, categorize second.
- It avoids asking the user to classify while highly activated.
- It keeps mode selection clean: “Inner Tension” vs “Shared Conflict” remains separate from problem shape.
- It does not require changing persisted server-side status order yet, because `conflict_type_routing` can map to the existing `private_capture` persisted status or remain local-only until the user continues.

Recommended UI copy:

- Title: `What does this feel closest to right now?`
- Subtitle: `You can change this later. This just helps us guide the next step.`
- Conceptual frame: `Help us choose the best starting map.`

Avoid copy like:

- `Choose the official reason for this conflict.`
- `Classify your conflict.`
- `Diagnosis` or any clinical framing.

---

## 5) Recommended v1 routing cards

One primary selection in the UI, with secondary signals inferred internally later.

| Internal key | Label | Helper copy |
|---|---|---|
| `personality_annoyance` | Personality clash / annoyance | They keep doing something that irritates me. |
| `misunderstanding` | Misunderstanding | I think we read the same thing differently. |
| `boundary_issue` | Boundary issue | Something feels like it crossed a line. |
| `unfairness_imbalance` | Unfairness / imbalance | The effort or care feels unequal. |
| `hurt_broken_trust` | Hurt / broken trust | Something damaged trust. |
| `different_needs_values` | Different needs or values | We both want different things. |
| `practical_decision` | Practical decision conflict | We need to choose what to do. |
| `repeated_pattern` | Repeated pattern | This keeps happening. |
| `unsure` | I’m not sure yet | Help me figure it out. |

Safety affordance should be visually distinct and not treated as a normal category:

> “I may not feel safe resolving this directly.”

---

## 6) Data model recommendation

### V1 local draft shape

Add selected routing metadata to the existing local draft snapshot in `useConflictSession`:

```ts
type ConflictRoutingType =
  | 'personality_annoyance'
  | 'misunderstanding'
  | 'boundary_issue'
  | 'unfairness_imbalance'
  | 'hurt_broken_trust'
  | 'different_needs_values'
  | 'practical_decision'
  | 'repeated_pattern'
  | 'unsure';

type ConflictRoutingMetadata = {
  primaryConflictType: ConflictRoutingType | null;
  selectedBy: 'user' | 'system_suggested' | null;
  confidence: 'user_asserted' | 'system_inferred' | null;
  secondarySignals: string[];
  safetyFlag: boolean;
  canChangeLater: true;
};
```

Recommended draft snapshot addition:

```ts
conflictRouting: ConflictRoutingMetadata;
```

### Why primary + secondary

Do not treat one tap as the whole truth. Many real conflicts are combinations:

- annoyance + repeated pattern,
- boundary issue + unfairness,
- misunderstanding + hurt,
- different values + practical decision,
- broken trust + repeated pattern.

User-facing copy can stay simple:

> “This sounds like personality friction, with a possible boundary element.”

Internally, secondary signals give the AI better context later.

### Server persistence later

Do not change schema in the first implementation slice. If this becomes durable across devices or shared sessions, consider a later migration that adds session-level metadata to `conflict_sessions` or creates a scoped `conflict_session_metadata` table.

---

## 7) Category-specific first private prompt recommendations

The smallest visible payoff is adapting the first private-capture prompt based on selected routing type.

| Routing type | First prompt |
|---|---|
| `personality_annoyance` | What specific behavior annoys you, and at what point do you stop being able to act like yourself? |
| `misunderstanding` | What happened, and what did you think it meant? |
| `boundary_issue` | What line felt crossed, and what do you need to protect? |
| `unfairness_imbalance` | What feels unequal, and what would a fairer version look like? |
| `hurt_broken_trust` | What damaged trust, and what would repair require? |
| `different_needs_values` | What do you need, and what do they seem to need? |
| `practical_decision` | What decision needs to be made, and what criteria should guide it? |
| `repeated_pattern` | What keeps happening, and what needs to change this time? |
| `unsure` | What feels strongest right now: misunderstood, disrespected, hurt, irritated, unfair, stuck, or exhausted by repetition? |

The rest of the existing private capture can remain unchanged for slice 1 if needed.

---

## 8) Personality-annoyance mini-coaching recommendation

This path should become a signature PeaceBetween emotional mechanic.

Use a short panel before private capture when `primaryConflictType === 'personality_annoyance'`:

> This may not be about making them different.  
> Some conflicts are about finding the level of irritation you can carry while still acting like yourself.

Then ask:

> At what point can you no longer stay kind, normal, or fair?

Use the softened principle:

> If you’ve become cold, sharp, or mean, it may be a sign that your limit was crossed earlier than you realized.

Goal: guide toward sustainable tolerance, early boundary, and repair — not blame.

---

## 9) “I’m not sure yet” triage path

This should feel like tiny emotional triage, not a quiz. Use three questions max.

### Question 1

> What feels strongest right now?

Options:

- I feel misunderstood.
- I feel disrespected.
- I feel hurt.
- I feel irritated.
- I feel things are unfair.
- I feel stuck making a decision.
- I feel exhausted because this keeps happening.

### Question 2

> Has this happened before?

Options:

- Mostly one incident.
- A few times.
- This is the pattern.

### Question 3

> What would make it meaningfully better?

Options:

- A clearer explanation.
- An apology.
- A boundary being respected.
- A fairer split.
- A practical decision.
- A real change in the pattern.
- Space before I decide.

Then show:

> This sounds closest to: Boundary issue  
> Also possibly: Repeated pattern  
> You can change this if it feels wrong.

---

## 10) Safety branch recommendation

The categorizer must not route dangerous situations into “talk it out together.” Safety should override normal mutual-resolution flow when:

1. the user taps `I may not feel safe resolving this directly`, or
2. user text later includes safety-sensitive signals.

Safety-sensitive signals include:

- threats,
- physical danger,
- coercion,
- stalking,
- sexual pressure,
- fear of retaliation,
- isolation,
- financial control,
- intimidation,
- monitoring,
- “I’m scared of what they’ll do.”

When triggered, stop using invite/shared-resolution framing. Do not say:

> Invite them to resolve this.

Use safer copy:

> This may not be a mutual problem-solving situation. Your safety and support matter first.

Safety-first screen copy can stay non-dramatic unless the user uses stronger labels:

> You do not have to resolve this directly right now. Consider speaking with someone you trust or a local support service before taking action.

Recommended v1 behavior:

- Set `safetyFlag: true` in local routing metadata.
- Route to a local `safety_first` UI stage or show a safety-first panel before any invite/shared CTA.
- Do not generate invite links or encourage the other person to join from this branch.

---

## 11) Existing safety handling found

Current safety-adjacent handling is mostly language moderation, not a safety-routing branch:

- `PrivateCaptureScreen` detects escalatory words and warns that shared summaries will soften language.
- `useConflictSession` sanitizes shared summary text with replacement patterns and blame reframing.
- `conflictAiOrchestrator` and fairness linting provide neutral summaries and fairness warnings for AI outputs.

Gap: there is no dedicated user-facing “I may not feel safe resolving this directly” path yet.

---

## 12) Smallest safe implementation slice

### Slice 1 — Static routing screen

Files likely to change:

- `src/features/conflict-resolver/types/conflictSession.ts`
- `src/features/conflict-resolver/hooks/useConflictSession.ts`
- `src/features/conflict-resolver/ConflictResolverExperience.tsx`
- new `src/features/conflict-resolver/screens/ConflictTypeRoutingScreen.tsx`
- `src/features/conflict-resolver/conflictResolver.css`

Work:

1. Add `conflict_type_routing` to the local UI-stage union only.
2. Add routing metadata state in `useConflictSession`.
3. Persist routing metadata in the existing local draft snapshot.
4. Add `startConflictTypeRouting` after grounding.
5. Add `continueFromConflictTypeRouting` to advance to private capture.
6. Add static card screen with one selected primary card.
7. Add visible secondary safety link.
8. Add reset/hydration support for routing metadata.

### Slice 2 — Category-specific first prompt

Files likely to change:

- `src/features/conflict-resolver/hooks/useConflictSession.ts`
- potentially `src/features/conflict-resolver/screens/PrivateCaptureScreen.tsx`

Work:

1. Derive `prompts` based on routing metadata.
2. Keep existing prompt IDs stable if possible.
3. Ensure answers still map correctly to summary cards.

### Slice 3 — Category-aware output templates

Files likely to change:

- `src/features/conflict-resolver/services/conflictAiOrchestrator.ts`
- `src/features/conflict-resolver/services/conflictAiSchemas.ts`
- tests or validation scripts if available.

Work:

1. Pass routing metadata into shared summary and resolution prompt builders.
2. Add strict rules: lens, not verdict; no diagnosis; no pressure to reconcile; safety overrides.
3. Keep deterministic fallbacks safe.

### Slice 4 — Safety-first branch

Files likely to change:

- `src/features/conflict-resolver/hooks/useConflictSession.ts`
- `src/features/conflict-resolver/ConflictResolverExperience.tsx`
- new `src/features/conflict-resolver/screens/SafetyFirstScreen.tsx`
- `src/features/conflict-resolver/conflictResolver.css`

Work:

1. Add local `safety_first` UI stage.
2. Add non-invite safety copy.
3. Prevent shared invite prompts from appearing in this branch.
4. Add analytics event for safety branch entry without storing sensitive details.

---

## 13) Risks

1. **Stage sync mismatch:** shared sessions currently sync coarse persisted statuses. A local-only `conflict_type_routing` stage must not break realtime status transitions.
2. **Terminology collision:** existing `ConflictType` means mode. New routing categories need a different name.
3. **Over-labeling:** AI prompts must not treat the selected category as truth.
4. **Safety under-routing:** users may choose a normal category while describing danger later. Text safety signals must still override.
5. **Safety over-routing:** ordinary annoyance should not be moralized or escalated without evidence.
6. **Prompt ID compatibility:** changing prompt IDs could break summary card assumptions. Prefer stable IDs in v1.
7. **Draft compatibility:** older local drafts will not include routing metadata. Hydration must default safely.

---

## 14) Acceptance criteria

For a future implementation PR:

- User sees `What does this feel closest to right now?` after grounding and before private capture.
- User can select exactly one primary routing card and continue.
- User can choose `I’m not sure yet` without being forced into certainty.
- Safety link is visually distinct from normal cards.
- Safety link routes away from invite/shared-resolution framing.
- Routing metadata is saved in the existing local draft snapshot.
- Existing older drafts still hydrate without crashing.
- First private-capture prompt visibly changes based on selected routing type.
- Personality-annoyance path uses the softened limit/boundary/repair principle.
- No database schema, auth, invite token, RLS, gameplay, economy, Island Run, or landing-page files are changed in slice 1.

---

## 15) Exact files likely to change in the first implementation PR

Likely:

- `src/features/conflict-resolver/ConflictResolverExperience.tsx`
- `src/features/conflict-resolver/hooks/useConflictSession.ts`
- `src/features/conflict-resolver/types/conflictSession.ts`
- `src/features/conflict-resolver/conflictResolver.css`
- `src/features/conflict-resolver/screens/ConflictTypeRoutingScreen.tsx`

Optional if safety-first is included in slice 1:

- `src/features/conflict-resolver/screens/SafetyFirstScreen.tsx`
- `src/features/conflict-resolver/services/conflictAnalytics.ts`

Should not change in the first slice:

- `supabase/migrations/*`
- `src/features/conflict-resolver/services/conflictInvites.ts`
- `src/features/gameplay/*`
- Island Run files
- economy files
- unrelated landing pages

---

## 16) Recommended first implementation prompt

Implement a small local-only slice:

1. Add `ConflictTypeRoutingScreen` after grounding.
2. Add local UI stage `conflict_type_routing`.
3. Persist `conflictRouting` in local draft snapshot.
4. Add a distinct safety link that routes to safety-first copy.
5. Adapt only the first private prompt by routing type.
6. Do not change schema, auth, invite tokens, RLS, gameplay, economy, Island Run, or unrelated pages.
