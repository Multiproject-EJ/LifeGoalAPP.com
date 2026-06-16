# Conflict Resolver — Acceptance Validation Runbook (PR5 + PR6)

Use this runbook to close the remaining acceptance criteria with explicit evidence.

Quick preflight command:
- `npm run check:conflict-resolver-validation`

---

## 1) PR5 acceptance (cross-surface invitee flow)

### A. Invite join + stage completion
- Create a shared conflict session from LifeGoal app.
- Add lightweight participant email and generate invite link.
- Open invite link on `www.peacebetween.com`.
- Confirm invitee can:
  - join session,
  - complete assigned stage action,
  - see session-limited data only.

Evidence to capture:
- Session ID
- Invite token status transition (`pending -> redeemed`)
- Stage completion timestamp(s)

### B. Data consistency between surfaces
- Perform action on app surface (e.g., stage transition).
- Confirm breathing-space surface reflects update in realtime.
- Perform reaction/note on breathing-space surface.
- Confirm app surface reflects update.

Evidence to capture:
- Realtime event payloads
- Updated timestamps on both clients

### C. Access scope constraints
- Attempt access from non-invited account.
- Attempt token reuse after redeem/expire/revoke.
- Verify rejection paths and messaging.

Evidence to capture:
- HTTP/API errors
- UI rejection state screenshots/logs

---

## 2) PR6 acceptance (hardening)

### A. Safety + fairness
- Validate rewrite guardrails against escalatory inputs.
- Confirm shared summaries show moderation notes when softened.
- Run neutral-summary checks against asymmetric/blame-heavy samples.

### B. Resilience
- Disconnect/reconnect mid-stage and confirm state resumes correctly.
- Simulate one participant timeout while another remains active.
- Validate no corruption on resumed stage state.

### C. Accessibility
- Keyboard-only path through Parallel Read card selection.
- Screen reader reads timer/status and selection state.
- Verify mobile tap targets and focus indicators.

### D. Analytics/KPI wiring
- Confirm events emitted for:
  - stage transitions
  - private capture skip/advance
  - parallel read completion
  - invites generated
  - agreement finalized
- Confirm visibility in KPI sink/dashboard.

---

## 3) Test matrix execution log template

| Area | Case | Result (Pass/Fail) | Evidence Link/Notes | Owner | Date |
|---|---|---|---|---|---|
| Functional | Stage transitions |  |  |  |  |
| Functional | Multi-party sync |  |  |  |  |
| Functional | Invite flow join/rejoin |  |  |  |  |
| Functional | Apology timing/ack |  |  |  |  |
| Safety | Rewrite guardrails |  |  |  |  |
| Safety | Neutral summary checks |  |  |  |  |
| Safety | Early proposal queue behavior |  |  |  |  |
| UX | Hold threshold/cancel |  |  |  |  |
| UX | Timer-gated interactions |  |  |  |  |
| UX | Highlight action sheet |  |  |  |  |

---

## 4) Exit criteria

Close PR5/PR6 only when:
- All PR5 acceptance criteria are marked complete with evidence.
- PR6 acceptance criteria are marked complete with evidence.
- Test matrix rows are filled and signed off.

## Conflict Type Routing follow-up manual validation (2026-06-16)

Use this focused checklist for the lightweight routing refinement; it does not require schema, auth, invite-token, AI orchestration, or gameplay changes.

- [ ] Mobile-sized layout: routing cards remain single-column, readable, and easy to tap; selected cards show a clear selected state without crowding the card copy.
- [ ] Normal category route: choose a non-safety routing type and continue to private reflection with the selected category prompt.
- [ ] Personality annoyance route: choose `personality_annoyance`, confirm the mini-coaching panel appears on the routing screen, then continue to private reflection.
- [ ] Safety link route: choose “I may not feel safe resolving this directly,” confirm the screen uses safety-first copy and CTA language rather than normal mutual-resolution framing, then continue to private reflection.
- [ ] Older draft hydration: resume an existing local draft without `conflictRouting` metadata and confirm defaults hydrate without blocking the flow.
