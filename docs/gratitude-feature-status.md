# Guided Gratitude Feature Status

_Last updated: 2026-02-25_

## ✅ Done (implemented)

- Gratitude journal mode added end-to-end (UI mode selector + DB enum/constraint migration).
- Guided gratitude editor (3 prompts) with optional freeform mode.
- Lightweight gratitude coach analysis with authenticity + warning signal.
- Coach metadata persisted in `journal_entries.attachments` for durability.
- Zen rewards for authentic gratitude entries, including 10th-entry bonus cadence.
- Weekly gratitude review panel with:
  - top themes,
  - lookback card,
  - thank-you draft generation,
  - draft copy,
  - “Refine with Coach” handoff.
- Weekly flagged-theme insights with count/percent weighting.
- “Coach me on this” CTA from flagged themes.
- Weekly readiness panel (neutral/success/warning) and weekly authenticity trend vs previous week.
- Telemetry added for gratitude reward/flag/draft/coach actions.

## ⚠️ Still open (can be done later)

### 1) Automated test coverage (recommended)
- Add focused tests for:
  - gratitude coach scoring and warning detection edge-cases,
  - authenticity fallback behavior (attachments metadata vs recompute),
  - zen milestone logic (every 10th valid entry),
  - weekly aggregation windows + trend math.

### 2) Server-side hardening (recommended)
- Move/duplicate critical reward gating and authenticity checks to server-side enforcement to reduce client-only trust assumptions.

### 3) Release QA checklist (recommended)
- Manual QA on real seeded data for:
  - weekly/previous-week cutover behavior,
  - timezone boundary handling around midnight,
  - coach CTA starter prompts and telemetry payloads.

### 4) Optional UX polish
- Add tooltip/help text for “authenticity trend” and warning percentages.
- Add empty-state examples for users with no prior-week entries.

## Suggested definition of “done”

Mark this feature fully done once:

1. Focused automated tests are added for core gratitude business logic.
2. Server-side validation path exists for reward/authenticity critical decisions.
3. Final QA pass confirms weekly windows, telemetry, and mobile UX.
