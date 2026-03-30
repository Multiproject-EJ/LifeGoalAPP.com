# Conflict Resolver Phase 5 — Production Readiness + Rollback Plan

Date: 2026-03-30
Status: Draft implementation guide for go-live.

## 1) Readiness checklist

### Analytics and KPI visibility
- [x] Emit client events for stage completion (`conflict.agreement_finalized`).
- [x] Emit fallback and quota-routing events (`ai.fallback_activated`, `ai.quota_consumed`).
- [x] Emit fairness-warning hit events (`conflict.fairness_warning_hit`).
- [x] Emit upgrade funnel events (`ai.upgrade_prompt_shown`, `ai.upgrade_prompt_clicked`).
- [x] Persist local KPI sink aggregates for:
  - stage completion count,
  - fallback rate,
  - fairness lint hit rate,
  - upgrade conversion rate.
- [ ] Wire KPI sink to server-side analytics warehouse/dashboard.

### UX explainability and trust
- [x] Surface active AI mode in inner guidance and shared flow screens.
- [x] Surface “why this suggestion” guidance rationale.
- [x] Surface fairness warnings where generated.
- [x] Keep deterministic fallback pathways active and visible.

### Reliability and launch controls
- [ ] Execute full acceptance matrix in `09_ACCEPTANCE_VALIDATION_RUNBOOK.md`.
- [ ] Run reconnect/timeout chaos checks for shared sessions.
- [ ] Confirm accessibility pass (keyboard, screen reader, mobile targets).
- [ ] Confirm build + smoke checks on release commit.

## 2) KPI definitions

- **Stage completion count:** total number of `conflict.agreement_finalized` events.
- **Fallback rate:** `ai.fallback_activated / (ai.fallback_activated + ai.quota_consumed)`.
- **Fairness lint hit rate:** `conflict.fairness_warning_hit / conflict.parallel_read_completed`.
- **Upgrade conversion rate:** `ai.upgrade_prompt_clicked / ai.upgrade_prompt_shown`.

## 3) Rollback plan

### Trigger conditions
Rollback if any are observed after release:
1. Conflict Resolver stage progression broken for >2% of sessions.
2. Fallback rate spikes above expected threshold for >1 hour.
3. Persistent errors on summary/options generation affecting shared conflict flow.
4. Severe UX regression (blocked primary CTA, inaccessible flow, or broken invite handoff).

### Rollback actions (ordered)
1. **Soft rollback (config):** set AI tier/environment to fallback mode only to preserve deterministic user value.
2. **Feature rollback (UI):** hide mode/fairness/upgrade overlays via release toggle if needed.
3. **Service rollback:** revert to previous orchestrator commit and redeploy.
4. **Schema-safe rollback:** keep `conflict_ai_*` tables in place (non-breaking) and disable writes in app layer if required.

### Post-rollback verification
- Validate mode selection → private capture → completion path still works.
- Validate shared flow can still generate deterministic summary/options.
- Confirm no 5xx/network storms in client logs.
- Confirm KPI event volume returns to baseline.

## 4) Ownership and communication
- Engineering owner: Conflict Resolver feature lead.
- Product owner: AI mediation roadmap owner.
- Communication: post release + rollback notes in team channel with timestamp and incident link.
