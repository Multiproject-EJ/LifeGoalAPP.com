# Game of Life 2.0 — Development Plan

This plan lays out the milestone skeleton required for Game of Life 2.0 delivery. Each milestone includes reuse targets, acceptance criteria, demo-mode parity requirements, and test notes. Order is fixed as requested.

---

## M0. Repo audit + integration map (where features live, patterns, data flows)

**Reuse from existing code**
- `src/features/ai-coach`, `src/features/assistant`
- `src/features/gamification`, `src/features/power-ups`, `src/features/achievements`
- `src/features/habits`, `src/features/journal`, `src/features/vision-board`
- `src/services`, `src/lib`, `src/contexts`
- Supabase schemas and utilities under `supabase/`, `sql/`

**Acceptance criteria**
- Integration map doc identifies feature entry points, key services, and data flows.
- Lists demo data sources vs Supabase-backed sources.
- Identifies cross-feature dependencies (coach ↔ habits ↔ gamification ↔ vision board).

**Demo-mode parity requirement**
- All integration notes include where demo data should mirror Supabase fields.

**Test notes**
- No automated tests required; verify by code inspection and documented references.

---

## M1. “Game of Life 2.0” onboarding (copy + screens + routing + demo compatibility)

**Reuse from existing code**
- `src/features/dashboard`, `src/features/ai-coach`, `src/features/assistant`
- `src/components`, `src/contexts`
- Existing onboarding or intro flows (if present) under `src/features` or `src/components`

**Acceptance criteria**
- New onboarding screens introduce “Game of Life 2.0” framing and key axes.
- Routing connects onboarding to the main app dashboard and coach.
- Demo mode can complete onboarding without Supabase.

**Demo-mode parity requirement**
- Onboarding state stored in demo data and mirrored in Supabase.

**Test notes**
- Manual walkthrough for new routes; verify no console errors.

---

## M2. Balance / Harmony scoring v1 (axes, thresholds, dashboard panel, affects gamification)

**Reuse from existing code**
- `src/features/dashboard`
- `src/features/gamification` and `src/features/achievements`
- `src/features/habits`, `src/features/journal`, `src/features/meditation`

**Acceptance criteria**
- Define axes (Agency, Awareness, Rationality, Vitality) and thresholds.
- Dashboard panel shows balance status and trends.
- Gamification uses balance status (e.g., bonus XP for balanced weeks).

**Demo-mode parity requirement**
- Demo dataset includes balance fields and shows consistent scoring.

**Test notes**
- Spot check with sample demo data; verify score changes update dashboard panel.

---

## M3. Rationality micro-system v1 (daily “might I be wrong?”, XP reward rules, UI placement)

**Reuse from existing code**
- `src/features/journal` or `src/features/checkins`
- `src/features/gamification`
- `src/components` for cards/modals

**Acceptance criteria**
- Daily prompt: “What might I be wrong about?” with response capture.
- XP rules reward completion and consistency.
- UI placement defined (dashboard widget or coach feed).

**Demo-mode parity requirement**
- Responses stored in demo data with identical shape to Supabase schema.

**Test notes**
- Manual entry validates XP increment and UI rendering.

---

## M4. Auto-progress ladder v1 (tiers, downshift UX, re-upgrade rules, data model)

**Reuse from existing code**
- `src/features/habits` and `src/features/checkins`
- `src/features/ai-coach` for coaching language
- `src/lib` or `src/services` for scoring logic

**Acceptance criteria**
- Tiers defined (Seed, Minimum, Standard).
- Downshift UX preserves streaks and updates difficulty.
- Re-upgrade rules documented and enforced.

**Demo-mode parity requirement**
- Tier state and transitions stored in demo data with Supabase mirror.

**Test notes**
- Manual test downshift then re-upgrade with demo habits.

---

## M5. Vision Board 2.0 metadata + review loop (types, review interval, orphan detection)

**Reuse from existing code**
- `src/features/vision-board`
- `src/features/visionBoardDailyGame`
- `src/components`

**Acceptance criteria**
- Vision items include type metadata and review interval.
- Review loop surfaces due items and prompts updates.
- Orphan detection flags items without linked goals/habits.

**Demo-mode parity requirement**
- Demo vision board items include metadata and review schedules.

**Test notes**
- Manual check: due items list, orphan flagging, and updates.

---

## M6. AI Coach instruction system (privacy toggles, what AI can read, instruction loading)

**Reuse from existing code**
- `src/features/ai-coach`, `src/features/assistant`
- `src/contexts` for user preferences
- `src/services` for instruction loading

**Acceptance criteria**
- Privacy toggles for goals, habits, journaling, reflections, vision board.
- Instruction payload loader supports environment and demo config.
- Coach respects data access rules in prompts.

**Demo-mode parity requirement**
- Demo mode uses the same toggles and instruction loading path.

**Test notes**
- Manual toggle test: confirm blocked data is not referenced.

---

## M7. AI Coach interventions v1 (imbalance/fixation/overconfidence/habit struggle)

**Reuse from existing code**
- `src/features/ai-coach`
- `src/features/dashboard`
- `src/features/habits` and `src/features/journal`

**Acceptance criteria**
- Intervention triggers for imbalance, fixation, overconfidence, and habit struggle.
- Templates aligned with AI coach personality spec.
- Interventions appear in coach UI and optionally dashboard.

**Demo-mode parity requirement**
- Demo data can trigger each intervention type.

**Test notes**
- Manual: simulate each trigger with demo data.

---

## M8. Micro-quests + “Monopoly GO”-style retention loop v1 (aligned rewards only)

**Reuse from existing code**
- `src/features/gamification`
- `src/features/power-ups`
- `src/features/achievements`

**Acceptance criteria**
- Micro-quests generated from balance gaps and habits.
- Rewards aligned with balance and non-compulsive engagement.
- Retention loop documented and constrained by guardrails.

**Demo-mode parity requirement**
- Demo mode can generate and complete micro-quests with rewards.

**Test notes**
- Manual: complete quest, verify reward and balance update.

---

## M9. Push notification dispatch plan + backend scheduling (document + implement if feasible)

**Reuse from existing code**
- `src/features/notifications`
- `src/push-subscribe.ts`
- `supabase/` edge functions or scheduling scripts

**Acceptance criteria**
- Written dispatch plan for reminders and coach nudges.
- Backend scheduling approach chosen and documented.
- If implemented: notifications send based on schedule preferences.

**Demo-mode parity requirement**
- Demo mode shows scheduled notifications via mock schedule data.

**Test notes**
- Documented manual test path; for live send, use a controlled test account.

---

## M10. Analytics & telemetry for adaptation loops (simple events, no creepiness)

**Reuse from existing code**
- `src/services` analytics utilities
- `src/features/gamification`, `src/features/ai-coach`
- `supabase/` event storage

**Acceptance criteria**
- Minimal event list: onboarding completion, balance shift, intervention accepted, quest completion.
- Opt-in or privacy-respecting telemetry settings.
- Events used to adjust difficulty recommendations.

**Demo-mode parity requirement**
- Demo data records events in local storage or mock telemetry store.

**Test notes**
- Manual: trigger events and verify storage or logging.

---

## M11. QA + accessibility + responsive polish pass (mobile-first)

**Reuse from existing code**
- `src/components`, `src/styles`, `src/index.css`, `src/themes.css`
- `src/features/dashboard`, `src/features/ai-coach`

**Acceptance criteria**
- Key screens pass keyboard navigation and contrast checks.
- Mobile layouts validated for onboarding, coach, and dashboard.
- Common errors documented or resolved.

**Demo-mode parity requirement**
- Demo mode renders identical layouts and components.

**Test notes**
- Manual responsive checks and basic a11y scan (no automated tooling required).

---

## M12. Documentation refresh + release checklist

**Reuse from existing code**
- `README.md`, `docs/`, existing implementation summaries

**Acceptance criteria**
- Updated docs for Game of Life 2.0 features.
- Release checklist includes data migration steps and demo parity notes.
- Links to AI coach personality and architecture documents.

**Demo-mode parity requirement**
- Documentation includes demo mode setup and limitations.

**Test notes**
- Documentation review only.
