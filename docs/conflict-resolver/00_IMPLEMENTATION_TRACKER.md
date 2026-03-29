# Conflict Resolver — Implementation Tracker (Source of Truth)

> Purpose: execution continuity across chat/session interruptions.
> Scope: Breathing Space Conflict Resolver (mobile-first) in LifeGoal app, with optional `peacebetween.com` invitee surface.

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
| PR2 | Entry/Grounding/Private Capture (Stage 0–2) | IN_PROGRESS | Codex | 2026-03-28 (draft persistence shipped; acceptance checks pending) |
| PR3 | Collect & Pile + Parallel Read (Stage 3–4) | IN_PROGRESS | Codex | 2026-03-28 (alignment signal shipped; acceptance checks pending) |
| PR4 | Resolution + Apology Alignment + Agreements (Stage 5+) | IN_PROGRESS | Codex | 2026-03-28 (proposal queue gate shipped; validation pending) |
| PR5 | Invitee onboarding + cross-domain scaffold (`peacebetween.com`) | IN_PROGRESS | Codex | 2026-03-29 (email-only invite link surfacing shipped in agreement finalization UI) |
| PR6 | Hardening pass (safety, fairness, resiliency, analytics) | IN_PROGRESS | Codex | 2026-03-29 (language moderation transparency + blame reframing shipped; full validation pending) |

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
- [x] Two clients can join same session and observe stage changes in realtime.
- [x] Invalid stage transition is rejected and logged.
- [x] Reconnect resumes latest persisted stage without corruption.

### Risks / notes
- Race conditions on simultaneous stage-complete events.
- RLS must allow invited lightweight users only scoped session access.

---

## 3) PR2 — Stage 0–2 UX (Mode chooser, Grounding, Private capture)

### Deliverables
- [x] Build Stage 0 mode chooser (`Inner Tension` vs `Shared Conflict`) with one-mode-at-a-time routing.
- [x] Build Stage 1 grounding sequence with hold-to-continue interaction contract.
- [x] Build Stage 2 prompt flow with optional respectful rewrite assist and user approval.
- [x] Persist draft responses and recovery points.

### Files (planned)
- `src/features/conflict-resolver/screens/ModeSelectionScreen.tsx`
- `src/features/conflict-resolver/screens/GroundingScreen.tsx`
- `src/features/conflict-resolver/screens/PrivateCaptureScreen.tsx`
- `src/features/conflict-resolver/components/HoldButton.tsx`
- `src/features/conflict-resolver/hooks/useConflictSession.ts`

### Acceptance criteria
- [x] User can exit/re-enter without losing stage progress.
- [x] Hold interaction only completes after threshold (pointer cancel below threshold).
- [x] Rewrite transparency shows what changed before user accepts.

---

## 4) PR3 — Stage 3–4 UX (Collect & Pile, Parallel Read)

### Deliverables
- [x] Build stack-to-summary interaction for Collect & Pile.
- [x] Build Parallel Read “silent chamber” with timer-gated controls.
- [x] Add highlight actions:
  - `Accurate`
  - `Missing something`
  - `Add note`
- [x] Add synced “alignment reached” event when all participants confirm accuracy.

### Files (planned)
- `src/features/conflict-resolver/screens/CollectPileScreen.tsx`
- `src/features/conflict-resolver/screens/ParallelReadScreen.tsx`
- `src/features/conflict-resolver/components/TimerCircle.tsx`
- `src/features/conflict-resolver/components/SummaryHighlightMenu.tsx`

### Acceptance criteria
- [x] No reaction buttons before timer unlock.
- [x] Highlight metadata persists and is visible in subsequent stage.
- [x] UI remains fully usable on small mobile viewport with one-hand CTA reach.

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
- [x] Agreement can be finalized without free-text-only dependency.
- [x] Apology timing modes (simultaneous/sequenced) both function.
- [x] Proposal queue prevents early-hijack behavior.

---

## 6) PR5 — Cross-domain scaffold (`peacebetween.com`) + invites

### Deliverables
- [x] Finalize invitation token model and lifecycle (issue, redeem, expire, revoke).
- [x] Implement one-click magic link for invitee participation.
- [x] Add invite domain/surface telemetry columns (`issued_domain`, `redeemed_domain`, `issued_surface`, `redeemed_surface`).
- [x] Add lightweight participant flow (email-only, no full profile required).
- [x] Add post-session funnel path into full LifeGoal onboarding.

### Repo strategy
- [ ] New dedicated frontend repo for `peacebetween.com` (recommended).
- [ ] Shared Supabase project + schemas + realtime channels.
- [ ] Shared API contracts/types package or synced schema typing strategy.
- [x] Document monorepo/two-surface routing strategy and domain cutover checklist.

### Acceptance criteria
- [ ] Invited external user can join session and complete assigned stage.
- [ ] Session data remains consistent between app and web surface.
- [ ] Access scope is session-limited for invitees.

---

## 7) PR6 — Hardening pass

### Deliverables
- [ ] Safety filters + abuse phrase handling + fairness checks. (shared-summary moderation now includes escalatory softening + direct-blame reframing with transparent notes; fairness validation still pending)
- [ ] Reconnect/timeout/partial-participant resilience tests.
- [ ] Accessibility pass (contrast, dynamic type, 44px targets, screen reader). (parallel-read cards now keyboard-focusable/selectable with focus-visible styling)
- [ ] Analytics events/KPIs dashboard wiring. (client analytics events expanded; dashboard sink wiring pending)

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

## 8.1) Validation runbook
- [x] Add PR5/PR6 acceptance validation runbook with evidence template (`09_ACCEPTANCE_VALIDATION_RUNBOOK.md`).
- [x] Add lightweight smoke validation command (`npm run check:conflict-resolver-validation`).

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
