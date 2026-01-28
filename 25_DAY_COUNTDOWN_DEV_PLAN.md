# 25-Day Countdown Scratch-Card Calendar — Living Dev Plan

> **Purpose:** This is a living, step-by-step plan for implementing the 25-day rolling scratch-card calendar. It is designed so an AI agent (or human) can work in chunks, mark progress, and keep next steps visible.

## Status Snapshot
- **Current phase:** Discovery & architecture
- **Last updated:** 2026-02-01 (update this date as work progresses)
- **Owner:** Product + Engineering
- **Tracking:** Update the checkboxes + changelog when tasks are completed.

## Goals
- Ship a 25-day rolling scratch-card calendar with daily reveals.
- Provide a “rest day” countdown between cycles.
- Deliver fair, transparent randomness and balanced rewards.
- Support themed cycles with seasonal styling.

## Non-Goals (for v1)
- Real-money gambling mechanics.
- Multiplayer competition.
- Complex monetization beyond basic rewards.

## Core Experience Summary
- **Daily open:** Users open one hatch per day to reveal a card (symbol + numbers).
- **Scratch effect:** Scratch to reveal numbers/symbol (canvas or library).
- **Match logic:** 5 numbers around a center symbol; match 3+ numbers for a small reward.
- **Symbol collection:** Symbols are weighted (common → rare) and tracked across the cycle.
- **Cycle cadence:** 25 daily cards + rest day(s) with a countdown to the next cycle.

## Research-Backed Design Guidelines (from scratch-card patterns)
- **Clear match pattern:** 3-of-a-kind is familiar and intuitive.
- **Transparent randomness:** Use cryptographically secure RNG (e.g., `crypto.getRandomValues`) for symbol/number generation.
- **Balance frequency vs. reward size:** Common wins keep engagement; rare symbols provide excitement.
- **Thematic variety:** Refresh backgrounds and styling each cycle.

## Reward Symbols & Tiers (Initial Proposal)
| Symbol | Name | Weight | Matches Needed | Reward Tier |
| --- | --- | --- | --- | --- |
| 🎁 | gift | 5 | 3 | common |
| 🍀 | clover | 5 | 3 | common |
| 🎈 | balloon | 4 | 4 | common |
| 🌟 | star | 3 | 5 | medium |
| 💎 | gem | 3 | 5 | medium |
| 🔔 | bell | 3 | 6 | medium |
| ⚡ | lightning | 2 | 7 | rare |
| 🎉 | party | 2 | 7 | rare |
| 🏆 | trophy | 1 | 8 | rare |
| 🧸 | teddy | 1 | 9 | very rare |
| 👑 | crown | 1 | 10 | very rare |
| 🧑‍🎄 | santa | 1 | 10 | seasonal mega |

## Theme System (Per 25-Day Cycle)
- Create a `themes[]` array for CSS classes or background assets.
- Apply theme by cycle index: `themes[cycleIndex % themes.length]`.
- Include a themed “rest day” page with countdown to next cycle.

## Data & State (Draft)
**Local State (client):**
- `cycleIndex` (integer)
- `dayInCycle` (1–25)
- `symbolCounts` (map: symbolName → count)

**Persistent State (server/db):**
- `daily_calendar_seasons` (theme, dates, status)
- `daily_calendar_hatches` (day_index, reward payload)
- `daily_calendar_progress` (per user progress, last opened)
- `daily_calendar_rewards` (audit trail)

## Milestones & Chunks

### Phase 1 — Product + Design (Chunk A)
- [ ] Finalize reward tiers + symbol list (including seasonal swaps).
- [ ] Define cycle cadence (25 days + rest duration).
- [ ] Confirm theming system (themes array, background assets).
- [ ] Decide if missed days are locked or offer a catch-up option.

**Deliverables:**
- Spec doc for reward tiers + theming
- Final UX flow diagram for daily open → reveal → reward

---

### Phase 2 — Data & Logic (Chunk B)
- [x] Implement RNG utilities using `crypto.getRandomValues`.
- [x] Build weighted symbol picker.
- [x] Build number generation + 3-of-a-kind detection.
- [x] Create cycle/rest-day calculator (server and/or client).
- [x] Persist symbol counters and progress.

**Deliverables:**
- Utilities module for RNG + symbol/number logic
- Unit tests for RNG + matching logic

---

### Phase 3 — UI/UX Implementation (Chunk C)
- [x] Calendar grid view (25 hatches).
- [x] Scratch-card reveal component (canvas or library).
- [ ] Reward reveal state (animation + copy).
- [ ] Rest-day countdown screen with themed art.

**Deliverables:**
- Scratch-card component
- Countdown UI
- Themed styles applied by cycle

---

### Phase 4 — Backend + Integration (Chunk D)
- [ ] Create Supabase tables + RLS policies.
- [ ] Edge function or server logic for daily hatch unlock.
- [ ] Store and retrieve user progress.
- [ ] Sync daily open state with calendar UI.

**Deliverables:**
- Supabase migration scripts
- API endpoints / Edge functions

---

### Phase 5 — QA + Launch (Chunk E)
- [ ] Testing on timezones + DST boundaries.
- [ ] Accessibility audit (labels, keyboard, contrast).
- [ ] Performance check for scratch canvas.
- [ ] Release checklist + monitoring.

**Deliverables:**
- QA report
- Launch checklist

## Decision Log
- _Add decisions here as they are made to keep context consistent._

## Changelog
- 2025-01-01: Initial plan drafted.
- 2025-01-01: Implemented scratch-card RNG, weighted symbol picker, and number matching utilities.
- 2026-01-28: Added persisted scratch-card progress helpers for symbol counters and cycle tracking.
- 2026-01-28: Added the 25-day countdown calendar grid modal in the Daily Treats flow.
- 2026-02-01: Added scratch-card reveal canvas for daily hatch previews.

## Next Actions (Update Weekly)
- [ ] Review this plan with product/design.
- [ ] Confirm cycle cadence + rest day length.
- [ ] Decide catch-up mechanic.
