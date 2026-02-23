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

## AI-agent substep policy
The implementing agent may introduce additional sub-steps whenever hidden complexity appears (state migration, UX edge cases, telemetry, accessibility, stale recovery). New sub-steps should be appended under the active phase and marked as done/next.

## Current status board
- **Next**: Expand optional automation from smoke checks into end-to-end auth-gated flow coverage.
- **Next**: Broader device QA passes for launcher/analytics/theme combinations.
- **Later**: future timer enhancements based on usage data.
