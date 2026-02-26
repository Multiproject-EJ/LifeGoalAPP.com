# Timer System Plan (Integrated + Mobile-First)

## Product vision
A beautiful, minimal, low-friction timer that can be started in 1 tap, but still supports rich context links (habit / goal / journal / meditation / project / vision).

## UX principles
- **Smart minimal click path**: one-tap presets, optional details.
- **Context-aware**: timer can carry source metadata from any workspace.
- **Mobile-optimized first**: thumb-friendly controls and compact information hierarchy.
- **Calm + informative**: minimal visual noise, clear progress, clear state transitions.
- **Customizable**: presets + custom minutes + focus label.

## Architecture
- **Timer source of truth**: persisted session in local storage (`timerSession.ts`) with statuses `idle | running | paused | completed`.
- **Timer UI surface**: `TimerTab` as the central shell.
- **Cross-surface integration contract**:
  - Workspace surfaces can call Timer route with a source type + source label.
  - Timer route can hydrate selection from route state/query in next phase.
- **Reward hook**: meditation source completion awards lotus (`awardZenTokens`).

## Build plan (living checklist)

### Phase 1 — Core timer MVP (this iteration)
- [x] Replace placeholder Timer tab with functional countdown timer UI.
- [x] Add preset durations + custom minutes input.
- [x] Add `start / pause / resume / reset / done` lifecycle.
- [x] Persist timer session and restore on reload.
- [x] Add focus source selector (habit/goal/journal/meditation/project/vision/general).
- [x] Add optional context name field.
- [x] Add lotus reward on meditation completion.
- [x] Ensure mobile-first visual structure and responsive layout.

### Phase 2 — Cross-module deep links
- [x] Add timer icon CTA in:
  - [x] Actions task rows (per-action timer icon)
  - [x] Habits (today checklist timer icon)
  - [x] Goals (goal-card timer launch)
  - [x] Journal (header focus timer launch)
  - [x] Meditation (Breathing Space timer launch)
  - [x] Projects (project-task timer icon in Project detail)
  - [x] Vision Board (card-level timer launch)
- [x] Pass source metadata into timer route from each entry point.
- [x] Pre-fill timer source and label based on launch origin.

### Phase 3 — Shared launcher state + footer behavior
- [x] Expose derived launcher state selector `idle | active | alert` from timer source-of-truth.
- [x] Make footer launcher switch to countdown while active.
- [x] Keep launcher in alert mode until explicit acknowledgement.
- [x] Handle stale sessions (>24h) and reset to idle.

### Phase 4 — Delight + customization
- [x] Lightweight local timer telemetry events (lifecycle, presets, launch context, theme/profile changes).
- [x] QA checklist for launcher, analytics, preferences, and deep-link regression coverage (`docs/TIMER_QA_CHECKLIST.md`).
- [x] Add lightweight timer regression smoke automation for key completion/launcher motion guards (`npm run check:timer-regression`).
- [x] Sound/vibration profiles for completion.
- [x] Theme variants (sleek minimal / high contrast / calm).
- [x] Saved personal presets and default source type.
- [x] Session analytics (time focused by source type).

### Phase 5 — Work/Study Session Planner + visual controls (next)
- [x] Add timer mode toggle in `TimerTab`: `Quick timer | Session plan`.
- [x] Add session-plan builder with ordered segments:
  - [x] Segment types: `focus task` and `break`.
  - [x] Per-segment fields: label, planned minutes, optional notes.
  - [x] Add/remove/reorder segment controls optimized for mobile touch.
- [x] Add guided sequence runtime:
  - [x] Start/pause/resume at plan level.
  - [x] Next/skip/extend-segment controls.
  - [x] Optional auto-start next segment after break.
- [x] Add plan tracking data model in timer local storage:
  - [x] Plan metadata (`planId`, `createdAt`, `mode`).
  - [x] Segment runtime stats (`startedAt`, `endedAt`, `actualSeconds`, `status`).
  - [x] Compatibility fallback for existing quick-timer sessions.
- [x] Add session summary UX at plan completion:
  - [x] Planned vs actual focus duration.
  - [x] Segment completion ratio.
  - [x] Optional reflection note CTA.
- [x] Add visual duration controls beyond numeric input:
  - [x] Minutes slider with snap points for common durations.
  - [x] Keep preset chips + +/- minute fine adjustments.
  - [x] Evaluate dial/radial control as optional enhancement behind feature flag (initial dial-style control shipped behind local feature flag).
- [x] Extend timer telemetry for session-plan lifecycle and segment outcomes.
- [x] Expand QA checklist for session-plan flows and interactive duration controls (`npm run check:timer-regression`).

## AI-agent substep policy
The implementing agent may introduce additional sub-steps whenever hidden complexity appears (state migration, UX edge cases, telemetry, accessibility, stale recovery). New sub-steps should be appended under the active phase and marked as done/next.

## Current status board
- **Done**: Phase 5 Steps A–D shipped (mode toggle, planner runtime, summaries, slider controls, templates, history, telemetry).
- **Done**: Initial radial/dial-style duration control shipped behind feature flag in quick timer + session segments.
- **Next**: End-to-end auth-gated automation for planner lifecycle.
- **Next**: Broader device QA for slider/dial accessibility combinations.
- **Next**: Expand optional automation from smoke checks into end-to-end auth-gated flow coverage.
- **Next**: Broader device QA passes for launcher/analytics/theme combinations.
- **Later**: future timer enhancements based on usage data.


## MVP1 readiness
- **Status**: ✅ Ready to use as MVP1.
- **Included in MVP1**:
  - Quick timer + presets + slider + dial + +/- controls.
  - Session planner mode (focus/break segments, reorder, duplicate, notes, templates, custom templates).
  - Runtime controls (start/pause/resume/skip/extend/reset + optional auto-start next).
  - Completion summary (planned vs actual, ratio, delta) + reflection + copy summary action.
  - Persistence (plan state, custom templates, recent history).
  - Telemetry + source analytics integration + regression smoke checks.

## Future backlog (post-MVP1)
- End-to-end auth-gated automation for planner lifecycle (beyond smoke checks).
- Broader device QA matrix (accessibility, dial/slider behavior, launcher/theme combinations).
- Optional additional dial polish and advanced radial interactions (haptics/gesture refinements).
