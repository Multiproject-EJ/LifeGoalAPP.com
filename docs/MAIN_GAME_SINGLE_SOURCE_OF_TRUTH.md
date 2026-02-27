# Main Game Single Source of Truth (Island Run)

Status: **Canonical source for main game implementation**  
Owner: Product + Engineering  
Last updated: 2026-02-27

---

## 1) Product Direction (Locked)

This document replaces prior split guidance across Lucky Roll + Level Worlds docs.

**Canonical direction:**
- Main game is **Island Run**.
- Main board loop is **17-tile dice traversal**.
- Island progression loop is **5 stops + 1 boss stop**.
- Mini-games are accessed from Island Run traversal/events (not direct menu-first).
- Day Zero onboarding is merged into first-run game flow with celebration + guided launch.

**Deprecated as primary-loop direction:**
- Lucky Roll as canonical hub loop.
- Pomodoro Sprint as a mini-game. It is replaced by a new shooter-style mini-game spec.

---

## 2) Core Loop Architecture

## 2.1 Dual-loop model

### Micro loop (within island)
- Player spends dice to move across a **17-tile loop**.
- Tile outcomes include:
  - rewards (coins, items, boosts)
  - hazards (loss/penalty state)
  - mini-game triggers
  - utility events
- Primary short-term objective: progress to the next required stop.

### Macro loop (island completion)
- Each island has **5 core stops + 1 boss stop**.
- Player clears stops in sequence (or rule-driven unlock order).
- Boss stop closes island and unlocks next island.

---

## 3) Board + Stop Structure (Island Run v1)

## 3.1 Board
- Fixed board geometry across islands: **17 tile anchors**.
- Different islands can change visuals/theme and event tables, while preserving board readability and movement consistency.

## 3.2 Stops
- Required stop set per island:
  1. **Hatchery stop** (fixed)
  2. **Dynamic stop A**
  3. **Dynamic stop B**
  4. **Dynamic stop C**
  5. **Prep/Utility stop**
  6. **Boss stop** (island completion gate)

## 3.3 Dynamic stop pools
Dynamic stops are selected from weighted pools:
- Habit/action completion stop
- Check-in/reflection stop
- Utility/shop/recovery stop
- Event/challenge stop
- Mini-game-enabled stop

Constraint rules:
- At least one “real-life behavior” stop per island (habit/check-in/action).
- Hatchery and boss are always present.
- Mini-game frequency is controlled by cooldown and progression rules.

---

## 4) Economy Rules (Island Run v1)

## 4.1 Hearts -> Dice conversion
Starter economy:
- **1 heart = 20 dice rolls**.

Progression scaling target:
- Higher levels/islands may increase conversion efficiency:
  - early: 20/heart
  - mid: 30–40/heart
  - late: 50+/heart

## 4.2 Design intent
- Hearts remain core play energy.
- Dice is session movement currency.
- Conversion is deterministic and progression-aware.

## 4.3 Reward channels (high level)
- Coins/currency pickup on tiles.
- Stop completion rewards.
- Boss completion rewards.
- Mini-game rewards integrated into Island Run progression.

---

## 5) First-Run Onboarding (Game-integrated Day Zero)

The first authenticated run should go through a single guided flow.

## 5.1 First-run gate
Trigger when account is new/onboarding incomplete.

## 5.2 Starter celebration
- Full-screen celebration/confetti.
- Claim gifts moment before gameplay begins.

## 5.3 Starter grants (initial target)
- 1 diamond equivalent + 250 coins (economy-mapped implementation detail).
- 5 hearts.

## 5.4 Intro transition
- Rocket/ship landing intro (placeholder animation acceptable initially).
- Player piece deploys onto first island stop.

## 5.5 Guided bubble sequence
- Prompt player name.
- Introduce coach.
- Explain hearts -> dice -> movement.
- Prompt first move/start.

## 5.6 Completion handoff
- Mark onboarding complete.
- Enter normal Island Run progression state.

---

## 6) Mini-games Policy

## 6.1 Access model
- Mini-games are entered through Island Run tiles/events/stops.
- No requirement for separate top-level direct entry as core path.

## 6.2 Shooter replacement
- Pomodoro Sprint mini-game is deprecated.
- New shooter-style mini-game will replace that slot.
- Shooter spec must be maintained in a dedicated document.

## 6.3 Controller morphing
- During mini-games, footer/controller icons can transform to context controls.
- On exit, controls return to default navigation behavior.

---

## 7) Canonical Implementation Order

1. Finalize this spec + lock economy constants.
2. First-run gate + celebration + starter grants + intro sequence.
3. Make Island Run the canonical play loop surface.
4. Implement 17-tile loop progression with stop gating fully integrated.
5. Implement dynamic stop objective pools.
6. Implement shooter mini-game replacement and hook to island triggers.
7. Add telemetry + balancing pass.

---


## 7.1 Immediate execution tracks (start here)

### Track A — First-run game onboarding (Day Zero integrated)
- Add first-run gate for authenticated users with incomplete onboarding.
- Ship celebration + claim gifts + starter grants.
- Route into Island Run level 1 intro sequence.
- Persist one-time claim marker so starter gifts cannot be re-claimed on refresh/re-entry.
- Gate first-run flow using real onboarding metadata (`onboarding_complete`) and emit telemetry for flow start/claim/launch milestones.
- Persist onboarding completion at launch confirm (Supabase auth metadata for live users, demo profile parity in demo mode).
- Persist first-run claim state in profile metadata (remove localStorage dependency for first-run gate).
- Route runtime marker read/write via an Island Run runtime-state service boundary to prepare migration into a dedicated game-state table/API.
- Use a backend selector in the runtime-state service so table/API backend can replace auth-metadata backend without component changes.
- Default runtime backend now uses dedicated Island Run game-state storage service; runtime markers are no longer mirrored to auth metadata.
- Runtime game-state store now attempts Supabase table upserts (`island_run_runtime_state`) with local storage fallback during rollout.
- Runtime marker reads now explicitly hydrate from `island_run_runtime_state` (table/API first), with local storage + safe defaults fallback when Supabase or table access is unavailable.
- Hydration reads should expose source metadata (`table` vs fallback reason) and emit telemetry so fallback rates can be monitored during rollout.
- Use dedicated telemetry event types for runtime hydration lifecycle (do not overload onboarding events for hydration observability).
- Maintain a living hydration telemetry playbook (event taxonomy, source definitions, dashboard queries) to support rollout monitoring decisions.
- Runtime hydration telemetry emission should be deduped client-side (scoped by user/event/source/day) to limit noise while preserving rollout signal quality.
- Provide maintained backend SQL query seeds/alerts for hydration fallback and failure rates so ops can detect regressions quickly.
- Alert thresholds should include a minimum hydration-volume guardrail before fallback-ratio alerts fire (to avoid low-traffic false positives).
- Client should surface a non-blocking fallback indicator when hydration is not table-backed and emit explicit telemetry for unexpected hydration failures.
- First-run gate and daily marker actions should wait for runtime-state hydration completion to avoid pre-hydration false positives or duplicate grants.
- `/level-worlds.html` should route into the active Island Run app surface (not legacy static arc map) so migration slices are user-visible.
- Entry-point auto-open flags (e.g., `openIslandRun=1`) should be consumed once and removed from URL to avoid repeated modal re-entry loops.
- Auto-open bootstrap should validate an explicit entry source marker to avoid unintended activation on unrelated login URLs.
- Entry bootstrap paths must be crash-contained (error boundary/fallback) so failures cannot blank the entire app shell post-login.
- Entry bootstrap intent must be handed off to in-app routing state before URL-flag cleanup so Level Worlds/Island Run opens reliably.
- External `openIslandRun` entry should route directly to `LevelWorldsHub`/Island Run surface (avoid Lucky Roll intermediary hops).
- `LevelWorldsHub` should default to Island Run surface; legacy board should only be reachable via explicit temporary opt-out flag if needed.
- Remove temporary Lucky Roll bridge props once direct Level Worlds entry routing is active to keep migration surface minimal.

### Track B — Island Run economy migration
- Replace pack-first play dependency with heart->dice conversion for Island Run sessions.
- Use deterministic conversion (`1 heart = 20 dice` starter) and progression scaling by island.
- Keep rewards + telemetry in existing economy channels.
- Add a daily morning hearts guarantee: award 1-3 hearts via either Spin of the Day or Daily Hatch (one source per day, deterministic plan).
- Persist daily-hearts claim marker in Island Run runtime-state storage (`island_run_runtime_state`) with demo/local fallback parity.
- Use a shared Island Run profile metadata persistence helper to avoid duplicated auth update flows.

### Track C — Stop orchestration
- Enforce 5 stops + boss composition per island.
- Keep Hatchery fixed and Boss fixed; generate 3 dynamic stops from weighted pools.
- Add acceptance checks so each island includes at least one real-life behavior stop.
- Use deterministic stop generation seeded by island number so layouts are reproducible for QA and balancing.
- Add stop progression states (`active/completed/locked`) and gate boss availability until non-boss stops are completed.
- Visualize stops as outer-orbit markers around the 17-tile lap (include Shop marker) while keeping tile-based triggers on the loop.
- Use canonical board-relative anchor coordinates for orbit stops so placement remains stable across scenes/screen sizes.
- Replace placeholder stop chips with scene-aware icon markers and collision-safe label offsets/responsive hiding rules.

### Track D — Mini-game routing policy
- Trigger mini-games from Island Run traversal/events/stops.
- Deprecate Pomodoro Sprint mini-game path and replace with shooter mini-game spec + implementation.
- Add footer/controller morph contract for mini-game mode.

## 8) What other docs should do

All other main-game docs should either:
- reference this file as canonical, or
- contain implementation details only, without contradicting this spec.

If a conflict exists, this file wins.
