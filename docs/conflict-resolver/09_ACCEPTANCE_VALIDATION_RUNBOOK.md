# Conflict Resolver — Acceptance Validation Runbook (PR5 + PR6)

Use this runbook to close the remaining acceptance criteria with explicit evidence.

---

## 1) PR5 acceptance (cross-surface invitee flow)

### A. Invite join + stage completion
- Create a shared conflict session from LifeGoal app.
- Add lightweight participant email and generate invite link.
- Open invite link on `www.breathingspace.com`.
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

