# AI AGENT PROTOCOL — HABITGAME MAIN LOOP

This feature is built by AI agents. The agent MUST keep progress alive so another agent can take over instantly.

## Non-negotiables
1) Read repo first (routes, components, stores, styles, existing patterns)
2) Work in slices (small PR-sized increments)
3) Every slice ends with:
   - code committed
   - `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` updated (progress + Next Slice)
   - `docs/07_MAIN_GAME_PROGRESS.md` appended
4) Never implement large refactors mid-slice unless required
5) Unfinished features must be behind:
   - feature flag OR dev route
6) Supabase changes require:
   - migration file + types update + RLS check

---

## Slice Template (required)
### Slice Title
### Goal (1 sentence)
### Approach (bullets)
### Files changed (list)
### How to test (exact clicks/steps)
### Acceptance criteria (checkboxes)
### Commit message
### Update these docs:
- [ ] 00_MAIN_GAME_120_ISLANDS_INDEX.md
- [ ] 07_MAIN_GAME_PROGRESS.md

---


## Document resolution order (required)
When the agent receives a generic “continue HabitGame” prompt, resolve docs in this order:
1. `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` (authoritative Next Slice)
2. Relevant implementation docs (`02..05`) for that slice only
3. `docs/07_MAIN_GAME_PROGRESS.md` (latest entries for continuity)

If any conflict exists, `00_MAIN_GAME_120_ISLANDS_INDEX.md` wins for scope/sequence, and deeper technical docs win for implementation details.

---

## Generic prompt compatibility contract
This doc set is designed so a single reusable prompt can drive the next slice without custom rewriting each time.
Agent must always:
- read `00_MAIN_GAME_120_ISLANDS_INDEX.md` first
- implement only the current Next Slice
- append a PROGRESS entry
- refresh Next Slice in `00_MAIN_GAME_120_ISLANDS_INDEX.md` before finishing

## Required Docs Files
- `docs/07_MAIN_GAME_PROGRESS.md` — append per slice
- `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` — always keep “Next Slice” current
- Optional: `docs/NEXT.md` if you prefer, but the Master Index has a Next section already

---

## 07_MAIN_GAME_PROGRESS.md entry format
Date:
Slice:
Summary:
Files changed:
Testing:
Next:

---

## “Read repo first” checklist
Agent must identify:
- framework (Next/React/Vite/etc)
- routing scheme
- state mgmt (zustand/redux/context)
- UI primitives (buttons/modals/toasts)
- asset pipeline
- existing Supabase client patterns
- existing migrations folder patterns

Also create /docs/07_MAIN_GAME_PROGRESS.md as an empty file with a header:

# PROGRESS LOG — HabitGame Main Loop
