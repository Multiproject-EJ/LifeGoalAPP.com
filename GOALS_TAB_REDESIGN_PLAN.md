# Goals Tab UX Overhaul Plan (Mobile-First)

## Objective
Reduce cognitive overload in the Goals tab by introducing two clear entry paths and a guided, progressive disclosure flow. The user should see **only two primary choices** on entry, and then be guided step‑by‑step into the relevant goal creation/management experience.

## Current Pain Points (User Feedback)
- Too many elements shown at once, causing overwhelm.
- Unclear entry point for “slice by slice” vs “guided/coached.”
- Need: one goal at a time, visible progress/strength per goal, and better navigation/search.

## Core Entry Choices (First Screen)
**When the user opens Goals (via profile popup menu):**
1. **Slice by Slice**  
   - Self-directed exploration using the Life Wheel.  
   - Quick access to categories with lightweight prompts.
2. **Guided – Coached**  
   - Step‑by‑step guided setup for creating/refreshing goals with coaching prompts.

### UI Concept
Two large, tappable cards (mobile-first) with short descriptions and icons.  
This screen replaces the current dense layout and hides all other content until a choice is made.

---

## Proposed Information Architecture

### A) Slice by Slice Flow
**Goal:** Fast browse and pick a life area, then work on one goal at a time.

Steps:
1. Choose a Life Wheel slice (quick access).
2. Show **single-goal view** for that category (one goal at a time).
3. Provide navigation controls:
   - **Next / Previous** goal within the category.
   - **Search** goals by title.
   - **Quick access**: Life Wheel acts as a submenu launcher.

Key UI:
- Life Wheel stays as a compact launcher.
- Single-goal card with progress + goal strength.

---

### B) Guided – Coached Flow
**Goal:** Coaching flow to build/update a “good goal” with steps.

Steps:
1. Choose focus area or “I’m not sure” (coached suggestion).
2. Guided prompts:
   - Outcome statement
   - Success metrics
   - Timeline / target date
   - First steps / habits
3. Confirm and save goal.
4. Show single-goal view with guidance on next action.

Key UI:
- Stepper wizard with progress indicator.
- Inline hints and examples.

---

## Single-Goal View Requirements
When a goal is opened (either flow):
- **Only one goal visible at a time.**
- Show:
  - **Goal completion** (percentage or milestone-based).
  - **Goal strength** (quality/coverage indicator).
  - Status (on track, at risk, completed).
- Controls:
  - **Search** input.
  - **Next / Prev** navigation.
  - **Quick access** Life Wheel launcher.

---

## Navigation & Discovery
- **Search**: Keyword search across goals.
- **Scrollable list** behind the scenes, but only one goal displayed at a time.
- **Life Wheel**: mini launcher (submenu) for jumping to categories without showing all goals.

---

## Recommended Implementation Phases

### Phase 1 — Entry Simplification
- Add the two-card entry screen for Goals.
- Hide existing content until a choice is made.

### Phase 2 — Single-Goal View
- Update goal display to single-goal mode.
- Add next/prev navigation and search.
- Display completion + strength per goal.

### Phase 3 — Guided Flow
- Build the stepper wizard.
- Add coaching copy and examples.

### Phase 4 — Life Wheel as Submenu
- Compact wheel launcher.
- Jump to category while staying in single-goal mode.

---

## Open Questions
- Should we remember the user’s last entry choice (Slice vs Guided)?
- How is “goal strength” calculated or displayed (existing metric vs new)?
- Should guided flow allow saving partial drafts?

---

## Success Criteria
- On entry, user only sees two options.
- Single-goal view reduces overload and improves focus.
- Users can quickly find goals via search or wheel.
- Guided flow helps create structured, high‑quality goals.
