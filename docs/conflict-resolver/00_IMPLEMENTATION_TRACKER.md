# Conflict Resolver — Implementation Tracker (Source of Truth)

> Purpose: execution continuity across chat/session interruptions.
> Scope: Breathing Space Conflict Resolver (mobile-first) in LifeGoal app, with optional `breathingspace.com` invitee surface.

---

## 0) Working agreements
- Reuse existing app AI foundation/API/auth plumbing (no new provider stack).
- Build in incremental PRs with shippable checkpoints.
- Preserve psychological safety and anti-hijack flow constraints at every stage.
- Keep this file updated at PR open/merge time.

---

## 1) Milestone map

| PR | Name | Status | Owner | Target |
|---|---|---|---|---|
| PR1 | Foundation: schema + state machine + realtime contracts | DONE | Codex | 2026-03-28 |
| PR2 | Entry/Grounding/Private Capture (Stage 0–2) | IN_PROGRESS | Codex | TBD |
| PR3 | Collect & Pile + Parallel Read (Stage 3–4) | IN_PROGRESS | Codex | TBD |
| PR4 | Resolution + Apology Alignment + Agreements (Stage 5+) | IN_PROGRESS | Codex | TBD |
| PR5 | Invitee onboarding + cross-domain scaffold (`breathingspace.com`) | TODO | TBD | TBD |
| PR6 | Hardening pass (safety, fairness, resiliency, analytics) | TODO | TBD | TBD |

Status legend: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`

---

## 2) PR1 — Foundation: schema + state machine + realtime

### Deliverables
- [x] Add conflict resolver DB migrations (sessions, participants, stage state, summaries, proposals, apologies, agreements).
- [x] Add typed state machine transitions:
  - `draft -> grounding -> private_capture -> shared_read -> negotiation -> apology_alignment -> agreement -> closed`
- [x] Add stage guard utilities (no skip unless required participants complete prior stage).
- [x] Add session realtime channel contract (`conflict:{sessionId}`) and event enums.
- [x] Add server/client type definitions for conflict entities.

### Files (planned)
- `supabase/migrations/*_conflict_resolver_*.sql`
- `src/features/conflict-resolver/stateMachine/*`
- `src/features/conflict-resolver/types/*`
- `src/features/conflict-resolver/realtime/*`

### Acceptance criteria
- [ ] Two clients can join same session and observe stage changes in realtime.
- [ ] Invalid stage transition is rejected and logged.
- [ ] Reconnect resumes latest persisted stage without corruption.

### Risks / notes
- Race conditions on simultaneous stage-complete events.
- RLS must allow invited lightweight users only scoped session access.

---

## 3) PR2 — Stage 0–2 UX (Mode chooser, Grounding, Private capture)

### Deliverables
- [x] Build Stage 0 mode chooser (`Inner Tension` vs `Shared Conflict`) with one-mode-at-a-time routing.
- [x] Build Stage 1 grounding sequence with hold-to-continue interaction contract.
- [x] Build Stage 2 prompt flow with optional respectful rewrite assist and user approval.
- [ ] Persist draft responses and recovery points.

### Files (planned)
- `src/features/conflict-resolver/screens/ModeSelectionScreen.tsx`
- `src/features/conflict-resolver/screens/GroundingScreen.tsx`
- `src/features/conflict-resolver/screens/PrivateCaptureScreen.tsx`
- `src/features/conflict-resolver/components/HoldButton.tsx`
- `src/features/conflict-resolver/hooks/useConflictSession.ts`

### Acceptance criteria
- [ ] User can exit/re-enter without losing stage progress.
- [ ] Hold interaction only completes after threshold (pointer cancel below threshold).
- [ ] Rewrite transparency shows what changed before user accepts.

---

## 4) PR3 — Stage 3–4 UX (Collect & Pile, Parallel Read)

### Deliverables
- [x] Build stack-to-summary interaction for Collect & Pile.
- [x] Build Parallel Read “silent chamber” with timer-gated controls.
- [x] Add highlight actions:
  - `Accurate`
  - `Missing something`
  - `Add note`
- [ ] Add synced “alignment reached” event when all participants confirm accuracy.

### Files (planned)
- `src/features/conflict-resolver/screens/CollectPileScreen.tsx`
- `src/features/conflict-resolver/screens/ParallelReadScreen.tsx`
- `src/features/conflict-resolver/components/TimerCircle.tsx`
- `src/features/conflict-resolver/components/SummaryHighlightMenu.tsx`

### Acceptance criteria
- [ ] No reaction buttons before timer unlock.
- [ ] Highlight metadata persists and is visible in subsequent stage.
- [ ] UI remains fully usable on small mobile viewport with one-hand CTA reach.

---

## 5) PR4 — Resolution, Apology Alignment, Agreements

### Deliverables
- [x] Build option-card negotiation board (`Accept`, `Counter`, `Discuss`).
- [x] Build persistent White Flag CTA for constructive offers.
- [x] Build apology alignment module (type + timing + acknowledgment).
- [x] Build agreement close card with follow-up reminder scheduling.

### Files (planned)
- `src/features/conflict-resolver/screens/ResolutionBuilderScreen.tsx`
- `src/features/conflict-resolver/screens/ApologyAlignmentScreen.tsx`
- `src/features/conflict-resolver/components/WhiteFlagFab.tsx`
- `src/features/conflict-resolver/components/AgreementCloseCard.tsx`

### Acceptance criteria
- [ ] Agreement can be finalized without free-text-only dependency.
- [ ] Apology timing modes (simultaneous/sequenced) both function.
- [ ] Proposal queue prevents early-hijack behavior.

---

## 6) PR5 — Cross-domain scaffold (`breathingspace.com`) + invites

### Deliverables
- [ ] Finalize invitation token model and lifecycle (issue, redeem, expire, revoke).
- [ ] Implement one-click magic link for invitee participation.
- [ ] Add lightweight participant flow (email-only, no full profile required).
- [ ] Add post-session funnel path into full LifeGoal onboarding.

### Repo strategy
- [ ] New dedicated frontend repo for `breathingspace.com` (recommended).
- [ ] Shared Supabase project + schemas + realtime channels.
- [ ] Shared API contracts/types package or synced schema typing strategy.

### Acceptance criteria
- [ ] Invited external user can join session and complete assigned stage.
- [ ] Session data remains consistent between app and web surface.
- [ ] Access scope is session-limited for invitees.

---

## 7) PR6 — Hardening pass

### Deliverables
- [ ] Safety filters + abuse phrase handling + fairness checks.
- [ ] Reconnect/timeout/partial-participant resilience tests.
- [ ] Accessibility pass (contrast, dynamic type, 44px targets, screen reader).
- [ ] Analytics events/KPIs dashboard wiring.

### Acceptance criteria
- [ ] Core happy-path + interruption-path test suite passes.
- [ ] No regressions in mobile footer/fullscreen behavior.
- [ ] KPI instrumentation visible for stage completion/dropoff.

---

## 8) Test matrix (minimum)

### Functional
- [ ] Stage transitions
- [ ] Multi-party sync
- [ ] Invite flow join/rejoin
- [ ] Apology timing and acknowledgment

### Safety
- [ ] Rewrite safety guardrails
- [ ] Neutral-summary checks
- [ ] Early proposal queue behavior

### UX
- [ ] Hold button threshold/cancel
- [ ] Timer-gated interaction
- [ ] Highlight action sheet behavior

---

## 9) Rollback and recovery
- Feature flag all Conflict Resolver routes/components.
- Preserve schema backward compatibility between PRs.
- If a PR fails in production:
  - disable flag,
  - keep existing Breathing Space unaffected,
  - retain conflict session data for later resumption.

---

## 10) Session resume note (for future agents)
When resuming work:
1. Read this tracker first.
2. Set current PR row to `IN_PROGRESS`.
3. Update deliverable checkboxes as work lands.
4. On merge, mark `DONE` and note follow-up TODOs in next PR section.
