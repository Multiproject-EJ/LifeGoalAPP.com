# Island Run Completion Roadmap Investigation (No-Implementation)

Date: 2026-04-25  
Scope: Investigate unfinished/breakable paths in the 120-island loop and propose a safe phased plan.  
Constraint: **No code implementation in this slice.**

---

## Executive summary (non-coder)

Island Run has a solid core loop, but there are still “break-the-loop” gaps:

1. **Ticket gates are visible but not fully enforced at stop completion time** (you can still complete some stops from inside the modal even while ticket-gated).
2. **Some unfinished content paths still rely on direct launch surfaces** rather than a universal in-board placeholder modal contract.
3. **Launching overlays during board activity can still risk roll-state edge cases** (especially when mid-roll state and launcher state overlap).
4. **Story is currently prologue-level, not chapter-progression-by-island.**
5. **Retention exists (daily quest/streak + passive dice regen) but no dedicated comeback-reward engine yet.**

Recommended first implementation slice after this investigation:

- **“Unbreakable Loop Patch”**: enforce ticket gate in completion path, force unfinished content to safe placeholders, prevent any route exits from gameplay launchers, and add roll-state recovery guardrails.

---

## 1) Current stop flow map (Hatchery, Habit, Mystery, Wisdom, Boss)

### Hatchery
- Hatchery has a rich in-modal flow (set egg, incubate, collect/sell) and stop progression already depends on egg state for completion eligibility.
- Completion block logic explicitly checks Hatchery prerequisites (must have active egg or used slot).  

### Habit
- Habit currently uses **generic stop modal behavior** (no dedicated content shell here).
- If the stop is “playable,” generic “Complete Stop” CTA is available.

### Mystery (Breathing / Habit Action / Reflection / Task Tower / Vision Quest)
- Breathing and Habit Action variants resolve inline with a local completion CTA.
- Reflection has an inline composer and completion callback.
- Task Tower and Vision Quest use minigame launchers.

### Wisdom
- Wisdom has generic copy + optional diamond-to-essence bonus + direct completion CTA.
- No chaptered story progression gate is attached to Wisdom completion.

### Boss
- Boss can run trial/minigame flow and then claim island clear.
- Boss claim is disabled until boss trial resolved, but island clear can still be deferred by build-complete requirements.

---

## 2) Ticket unlock: where checked, deducted, and whether it truly gates completion

### Where ticket requirements are checked
- Stop requirement is derived in resolver/status logic (`ticket_required`).
- UI helper `doesStopRequireTicketPayment` is used to mark ticket requirement and display state.
- Tap routing can identify `ticket_required` outcomes and surface guidance.

### Where ticket is deducted
- `handlePayStopTicket` calls `payStopTicket(...)` and then persists via `applyStopTicketPayment(...)`.

### Current gap (critical)
- `handleCompleteActiveStop` does **not** enforce “ticket must be paid” before objective completion.
- Modal-level playability check treats non-locked/non-completed stops as playable; `ticket_required` is neither locked nor completed.
- Result: ticket can be prompted/deducted in one path, but completion can still be advanced via completion CTA/inline flows without ticket payment in another path.

Conclusion: **Ticket gate is partially implemented, not hard-enforced at the canonical completion boundary.**

---

## 3) Which stop actions currently navigate away from Island Run

### In-board stop/minigame launches
- Mystery minigames launch through `IslandRunMinigameLauncher` overlay (in-board full-screen layer), not tab navigation.
- Story reader is an in-board modal.

### Explicit route exits still present
- Dice checkout and minigame-ticket checkout use `window.location.assign(result.url)` (intentional external redirect).

### Investigation conclusion
- “Navigate to Today tab” was not found as an explicit path in current Island Run stop/minigame launch code.
- However, there are still explicit hard redirects for commerce flows; these are expected but should be guarded from gameplay-state corruption.

---

## 4) Which missing-content paths should become placeholder modals

Recommended immediate placeholder normalization targets:

1. **Habit stop** → dedicated “Habit Placeholder” modal contract (instead of generic immediate completion).
2. **Mystery fallback branch** (`else` path that says “Complete this mystery stop to progress.”) → explicit placeholder modal with safe close + no progression side effects.
3. **Wisdom** → chapter placeholder modal (chapter card + “continue later” + optional test-complete action only when configured).
4. **Timed event fallback (`setShowMinigameDialog(true)`)** → standardized placeholder dialog with no route exit and explicit completion simulation controls for QA.
5. **Unknown/failed minigame registry fallback** (`minigame not found`) → standardized placeholder modal + deterministic close behavior.

---

## 5) Flows that can leave rolling stuck after returning

Potential risk surfaces still present:

1. **Launcher open during board activity**
   - Timed-event minigame button is available while board may be in active roll/hop lifecycle.
   - If launcher opens during a sensitive roll-sync window, resolver/completion sequencing complexity increases.

2. **External redirects (checkout) while transient roll/overlay state exists**
   - Redirect out + browser return can re-enter with URL/history/local state combinations that may not match transient refs.

3. **Mystery completion callback timing**
   - On minigame completion, `handleCompleteActiveStop()` fires based on launch metadata and current active stop state; if modal/stop focus changed meanwhile, this can produce edge behavior.

Important note:
- The board already includes multiple anti-freeze protections (`isRolling`, `isAnimatingRollRef`, `isRollSyncPendingRef`, action barrier), so this is not “always broken.”
- Risk remains around **cross-surface timing**, not core roll math.

---

## 6) Current story/chapter system status

- Story reader is present and opens via a fixed manifest path: `/storyline/episode-001/manifest.json`.
- Onboarding/prologue seen marker exists (`storyPrologueSeen`) and is persisted.
- There is **no island-indexed chapter progression system** in this board flow yet (no “chapter N mapped to island travel N”).

Conclusion: story is currently **prologue-capable**, not yet a chapter progression engine.

---

## 7) Current minigame/event launcher status

- Registry + manifest system exists and is wired.
- Mystery stop can route to Task Tower / Vision Quest behind feature flags.
- Timed events have resolver mapping to minigame IDs with ticket checks.
- Companion Feast explicitly uses a **placeholder** Partner Wheel contract.

Conclusion: launcher architecture is present and extensible, but content depth is mixed (some real, some placeholder).

---

## 8) Current retention/comeback reward status

### Present now
- Passive dice regeneration engine (canonical).
- Daily companion quest + streak persistence (local storage + telemetry).
- Event ladders/reward bar and other short-loop reinforcement.

### Missing as a dedicated system
- No explicit “comeback after inactivity” reward engine (e.g., day-gap re-entry grants, escalating return bundles, lapse segmentation).
- No separate retention provider service that computes offers by inactivity cohort.

---

## 9) Recommended phased implementation roadmap

## Phase 1 — Make current loop impossible to break (highest priority)

Goals:
- Ticket gates are hard gates.
- Missing content never dead-ends or navigates away unexpectedly.
- Roll state always recovers.

Work:
1. Enforce ticket paid check inside canonical stop-completion service/path.
2. Replace direct “instant complete” placeholders with safe modal contracts.
3. Block launcher opens during roll-sync critical states (or queue them).
4. Add re-entry roll-state reconciler on mount/focus.
5. Add tests for gate bypass + stuck-roll recovery scenarios.

## Phase 2 — Content slot architecture

Goals:
- Each stop has typed content slots and fallback policies.

Work:
1. Introduce stop content provider interfaces (`habit`, `mystery`, `wisdom`, `boss`).
2. Define guaranteed fallback renderer for every slot.
3. Move stop UI selection logic out of giant component branches into provider map.

## Phase 3 — Personal quest/content engine

Goals:
- Habit/Mystery/Wisdom content personalized by player state.

Work:
1. Add quest generator service (inputs: habits, streak, missed goals, preferences).
2. Add per-stop challenge templates and reward policies.
3. Persist per-island/per-stop assignments for deterministic replay.

## Phase 4 — Retention/comeback reward engine

Goals:
- Monopoly GO-style reactivation loops with safe economy limits.

Work:
1. Inactivity cohorting service (D1, D3, D7, D14+).
2. Comeback bundles + missions + temporary multipliers.
3. Abuse-resistant grant policy + cooldowns + telemetry experiments.

---

## 10) Architecture risks (adding now vs later)

### If deferred too long
- More UI-local conditional logic accumulates in `IslandRunBoardPrototype`.
- Ticket semantics remain split between UI status and completion authority.
- Placeholder behavior diverges across stops/events, increasing bug surface.

### If added too early (without Phase 1 hardening)
- New personalization/retention systems attach to unstable completion rules.
- Economy incentives can amplify existing bypass bugs (especially ticket bypass).

### Best sequencing rationale
- Hardening loop integrity first (Phase 1) reduces future migration cost and protects all later systems.

---

## Recommended first implementation slice (explicit)

**Slice name:** `Island Run Unbreakable Loop Patch`  
**Do first:**
1. Canonical ticket-gate enforcement in stop completion path.  
2. Universal safe placeholders for unfinished stop/minigame content.  
3. No route exits from stop/minigame launch paths (except explicit commerce checkout flows).  
4. Roll-state recovery guard when returning from overlays/redirects.  
5. Regression suite for bypass + stuck-roll scenarios.

Success criteria (ship gate):
- Cannot complete ticket-gated stop before ticket payment.
- No stop launcher collapses Island Run surface.
- Returning from placeholder/minigame/checkout never leaves perpetual “rolling” lock.
- Story/Wisdom paths always render safe content (even if placeholder).
