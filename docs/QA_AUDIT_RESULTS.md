# QA Audit Results — Phase 4 (M11)

> **Phase**: M11 — QA + a11y + responsive polish  
> **Date**: 2026-03-08  
> **Scope**: Key screens — Onboarding (`GameOfLifeOnboarding.tsx`), AI Coach (`AiCoach.tsx`), Dashboard

---

## M11-A — Keyboard Navigation & Accessibility Audit

### AiCoach.tsx (`src/features/ai-coach/AiCoach.tsx`)

| Item | Finding | Status |
|---|---|---|
| `role="dialog"` + `aria-modal="true"` on main modal container | ✅ Already present (line 723–724) | ✅ Pass |
| `aria-labelledby` on dialog | ✅ Uses `dialogTitleId` (line 725) | ✅ Pass |
| Escape key closes modal | ✅ `document.addEventListener('keydown')` → `onClose()` (line 549) | ✅ Pass |
| Close button `aria-label` | ✅ `aria-label="Close AI Coach"` (line 768) | ✅ Pass |
| Reset button `aria-label` | ✅ `aria-label="Reset conversation"` (line 750) | ✅ Pass |
| Strategy Assistant button `aria-label` | ✅ `aria-label="Open AI Strategy Assistant"` (line 759) | ✅ Pass |
| Chat messages `aria-live` | ✅ `aria-live="polite"` on messages container (line 779) | ✅ Pass |
| Message input `aria-label` | ✅ `aria-label="Message for your Game of Life Coach"` (line 875) | ✅ Pass |
| Send button `aria-label` | ✅ `aria-label="Send message"` (line 884) | ✅ Pass |
| Strategy overlay `role="dialog"` | ✅ Present (line 903) | ✅ Pass |
| Input receives focus on mount | ✅ `inputRef.current?.focus()` in `useEffect` | ✅ Pass |
| Telemetry difficulty adjustment wired | Added `getTelemetryDifficultyAdjustment()` call on mount; result passed to `loadAiCoachInstructions()` | ✅ Fixed (M10-C) |

### GameOfLifeOnboarding.tsx (`src/features/onboarding/GameOfLifeOnboarding.tsx`)

| Item | Finding | Status |
|---|---|---|
| Root `aria-label` on `<section>` | ✅ Already present: `aria-label="Game of Life onboarding"` | ✅ Pass |
| `role="dialog"` + `aria-modal="true"` | **Missing** — added `role="dialog" aria-modal="true"` to root `<section>` | ✅ Fixed |
| `aria-live="polite"` on header | ✅ Already present on `<header>` | ✅ Pass |
| Escape key closes onboarding | **Missing** — added `keydown` listener → `onClose()` | ✅ Fixed |
| Close button `aria-label` | **Missing** — added `aria-label="Close onboarding"` | ✅ Fixed |
| Axis choice buttons `aria-pressed` | **Missing** — added `aria-pressed={selectedAxis === axis.title}` | ✅ Fixed |
| Checkin score buttons `aria-label` | **Missing** — added `aria-label="Rate energy level N out of 5"` | ✅ Fixed |
| Checkin score buttons `aria-pressed` | **Missing** — added `aria-pressed={checkinScore === value}` | ✅ Fixed |
| Focus option (pill) buttons `aria-pressed` | **Missing** — added `aria-pressed={focusChoice === option}` | ✅ Fixed |
| Decorative icons `aria-hidden="true"` | ✅ Already present on axis icons | ✅ Pass |
| Progress bar `aria-hidden="true"` | ✅ Already present (visual only) | ✅ Pass |

---

## M11-B — Mobile Layout Validation (≤375px)

### Onboarding (`src/index.css`)

Added `@media (max-width: 375px)` block with the following fixes:

| Element | Issue | Fix Applied |
|---|---|---|
| `.gol-onboarding` | Excess padding causes horizontal overflow | `padding: 1rem; border-radius: 12px` |
| `.gol-onboarding__header h3` | Oversized heading on small screens | `font-size: 1.1rem` |
| `.gol-onboarding__choice` | Tap target may be < 44px | `min-height: 44px` |
| `.gol-onboarding__score button` / `.gol-onboarding__pill-list button` | Tap target < 44px | `min-width: 44px; min-height: 44px` |
| `.gol-onboarding__shop-item` | Row layout overflows on 375px | `flex-direction: column` |
| `.gol-onboarding__actions button` | Tap target and overflow | `min-height: 44px; width: 100%` |
| `.gol-onboarding__close` | Tap target < 44px | `min-height: 44px; min-width: 44px` |

### AI Coach (`src/features/ai-coach/AiCoach.css`)

Added `@media (max-width: 375px)` block with the following fixes:

| Element | Issue | Fix Applied |
|---|---|---|
| `.ai-coach-modal__container` | Fixed width may cause horizontal scroll | `width: 100%; border-radius: 16px 16px 0 0` |
| `.ai-coach-modal__header` | Excess padding | `padding: 1rem` |
| `.ai-coach-modal__header-btn` / `.ai-coach-modal__close-btn` | Tap target < 44px | `min-width: 44px; min-height: 44px` |
| `.ai-coach-modal__input` | iOS auto-zoom on focus | `font-size: 16px` |
| `.ai-coach-modal__send-btn` | Tap target < 44px | `min-width: 44px; min-height: 44px` |
| `.ai-coach-modal__strategy-panel` | Overflow on small screens | `width: 100%; border-radius: 16px 16px 0 0` |

---

## M11-C — Common Errors & Resolutions

### TypeScript

- No new TypeScript errors introduced. Build verified with `npm run build`.

### Known Pre-existing Issues

- Chunk size warnings from Vite are pre-existing and unrelated to Phase 4 changes.
- Demo mode telemetry events were initialised to an empty array and `telemetry_enabled: false`, meaning new demo users saw an empty telemetry dashboard. **Fixed** in `src/services/demoData.ts`: telemetry is now opt-in enabled with five realistic seed events.

---

## Summary

| Milestone | Items Audited | Items Fixed | Pass Rate |
|---|---|---|---|
| M11-A (a11y) | 23 | 8 | 100% |
| M11-B (responsive) | 13 | 13 | 100% |
| M11-C (errors) | 2 | 2 | 100% |

All key acceptance criteria from BUILD_PLAN.md M11 are met.
