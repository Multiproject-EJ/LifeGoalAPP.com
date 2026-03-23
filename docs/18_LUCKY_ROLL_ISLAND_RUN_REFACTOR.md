# Lucky Roll → Island Run Reward Board Refactor

> **Status:** Canonical for this upgrade track. Authored 2026-03-23.
> Use this doc as the implementation contract for Lucky Roll repurposing, Today-tab visibility, and overlay consistency until merged into the larger main-game docs.

---

## 1. Product Direction

Lucky Roll is no longer treated as a permanent hub game.

Lucky Roll becomes a:

- **finite reward board**
- **bonus experience attached to Island Run**
- **session that appears only when active/unlocked**
- **non-routing reward board** (it does **not** launch Task Tower / Shooter Blitz / Vision Quest / Wheel of Wins)

This keeps Island Run as the canonical main game loop while preserving Lucky Roll as a burst-reward surface.

---

## 2. Availability Rules

Lucky Roll should only surface in player-facing launchers when the player can actually use it.

### 2.1 Active sources

Lucky Roll can be active from:

1. **Earned unlocks** from Island Run systems (for example Mystery Stop rewards, shard milestones, or future island reward hooks)
2. **Monthly free Lucky Roll window**

Current implementation now grants earned Lucky Roll runs from:

- **Island Run shard milestone claims**
- **Island Run Mystery Stop outcomes**

### 2.2 Monthly free window

- A **free Lucky Roll window** is available once per UTC month.
- Current implementation rule: the window is active during the **first 3 UTC days of the month**.
- The monthly free run is consumed the first time the player starts a Lucky Roll session during that window.

### 2.3 Visibility contract

- **Today tab:** show Lucky Roll only when active
- **Game overlay:** show Lucky Roll only when active
- If Lucky Roll is not active, it must not occupy a permanent icon slot

---

## 3. Today Tab Offer Rules

The Today-tab circular offer row should reflect **currently actionable rewards**, not permanent fixtures.

### 3.1 Lucky Roll

- Only visible when active via earned unlock or monthly free window
- Hidden when no Lucky Roll access exists

### 3.2 Daily Spin

- Only visible while a daily spin is still available
- Hidden once the player has already used the day’s spin

### 3.3 Holiday Calendar

- Remains a Today-tab feature, not a game-overlay feature

---

## 4. Game Overlay Icon Rules

### 4.1 Left-side reward icons

The left-side reward rail is reserved for **active reward icons only**:

- Daily Spin (only while available)
- Lucky Roll (only while active)

If neither reward is active, no permanent reward icon placeholder should remain.

### 4.2 Right-side permanent icons

The right-side rail should contain permanent progression utilities:

1. **Creature Collection / Sanctuary**
2. **Garage**

The holiday calendar should not appear in the game overlay.

---

## 5. Reflection / Journal Contract

Reflective prompts that support self-work, goal review, Life Wheel reflection, or habit nudges belong to Island Run stop flows — especially:

- **Mystery Stop**
- **Dynamic Stop**

These reflections must persist through the **real journal system** (`journal_entries` / Supabase), not a Lucky Roll-only local state silo.

### 5.1 Persistence rules

- Use `src/services/journal.ts`
- Save into `journal_entries`
- Prefer existing journal types first:
  - `quick`
  - `goal`
  - `life_wheel`
- Add tags/metadata that identify Island Run origin (for example `island-run`, `dynamic-stop`, `mystery-stop`)

### 5.2 Vision Quest implication

The old reflective Vision Quest style should no longer be used as a Lucky Roll-launched mini-game.
That reflective behavior should instead be routed into journal-backed Island Run stop content.

Current implementation also removes `vision_quest` from the legacy Level Worlds mini-game rotation so fallback board flows align with the newer Island Run direction.

---

## 6. Implementation Phasing

### Phase A — visibility + launcher consistency

- Add Lucky Roll access state/service
- Add monthly free window
- Hide Lucky Roll when inactive
- Hide Daily Spin when unavailable
- Remove holiday calendar from game overlay
- Make creature collection + garage the persistent overlay utilities

### Phase B — reward-board refactor

- Remove mini-game tiles from Lucky Roll ✅
- Convert Lucky Roll into a finite board session with a clear finish reward ✅
- Add session unlock consumption rules ✅

### Phase C — journal-backed reflection migration

- Move reflective prompts from Lucky Roll-driven flow into Island Run stop flows ✅
- Persist the resulting entries through `journal_entries` ✅
