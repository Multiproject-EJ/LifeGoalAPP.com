# Space Excavator State Audit (Investigation)

_Date: 2026-05-21_

## Current implementation summary

Space Excavator is currently a **playable Island Run timed-event minigame** (not just a placeholder) wired through canonical Island Run actions for dig/apply/advance/claim flows. The board loop, clue feedback, bonus bomb reveal, board progression, and milestone rewards are all implemented in production app code. Prototype-only files still exist in `prototypes/space-excavator`, but production gameplay uses `src/features/gamification/games/space-excavator/SpaceExcavatorMinigame.tsx` plus Island Run service actions/state. The minigame uses per-dig ticket spending (`minigameTicketsByEvent[eventId]`) and event-scoped progress persistence (`spaceExcavatorProgressByEvent[eventId]`).

---

## What is built

### 1) Game mechanics implemented

- **Grid size / board generation**
  - Current board is fixed at `5x5` in state action generator (`boardSize = 5`).
  - Object placement is deterministic per event + board index using seeded shape selection and seeded origin placement.
  - One bonus bomb tile is generated per board, chosen from non-object tiles.

- **Reveal logic**
  - Dig attempts validate: progress exists, ticket availability, board state, tile bounds, and duplicate digs.
  - Each valid dig spends exactly one ticket.
  - Reveal always opens tapped tile; if tile is untriggered bomb, adjacent 8-neighborhood tiles are also revealed for free in same spend.

- **Crystal shard / target finding logic**
  - “Target object” is represented by multi-tile shape (`objectTileIds`), not single-cell treasure.
  - A board is complete when all object tiles are revealed.
  - Found object tiles are tracked in `revealedObjectTileIds` and `foundTreasureTileIds`.

- **Warm/hot/cold signal logic**
  - `hot`: any object tile in 8-neighborhood (`dx <= 1 && dy <= 1`).
  - `warm`: Manhattan distance <= 2.
  - `cold`: otherwise.
  - `relic_piece` when tapped tile itself is a target tile.

- **Bomb behavior**
  - Single bomb tile per board.
  - First trigger reveals neighboring unrevealed tiles; subsequent taps on already dug tile are blocked.
  - Bomb feedback text shows “X nearby tiles cleared.”

- **Progress / reward flow**
  - Clearing a board increments event progress points and board-clear count.
  - Board-clear status becomes `board_complete` (or `completed` on terminal board).
  - Milestone claim modal appears when rewards are claimable and blocks continue flow until claimed.
  - Milestones grant essence/dice/shards/bundle and persist claimed IDs.

- **Event ticket usage**
  - Space Excavator uses **per-action spend** (no launch ticket delta).
  - Tickets are decremented in `applySpaceExcavatorDig`; board advance/claim do not spend tickets.

- **Live ticket counter**
  - UI reads tickets from launch config callback and polls every 350ms via `setInterval` to keep count current.

- **Completion behavior**
  - Board auto-advance delay is 2.1s when clear and no reward gate is active.
  - Terminal board resolves to `completed`; event progress capped by total boards.
  - Out-of-tickets sheet supports closing to Island Run without losing progress.

### 2) Visual UX built

- Theme variants by depth (`surface`, `moon`, `crystal`, `core`) with styled HUD/progress/tiles.
- Hidden-object preview panel with icon/name/progress bar.
- Clue callouts for hot/warm/cold and bomb feedback.
- Board clear notice with relic found summary.
- Milestone progress bar + dots + “Reward ready” state.
- Reward claim modal and out-of-tickets modal.

### 3) Island Run/event integration built

- Timed-event launcher routes `space_excavator` into minigame descriptor and provides event-specific launch config.
- Launcher injects canonical action callbacks:
  - `requestDigSpend` -> `applySpaceExcavatorDig`
  - `requestAdvanceBoard` -> `advanceSpaceExcavatorBoard`
  - `requestClaimMilestoneReward` -> `claimSpaceExcavatorMilestoneReward`
- Progress initialized lazily per event through `initSpaceExcavatorProgressForEvent`.
- State persisted in canonical game-state record (local + Supabase path via commit service).

---

## What is missing (intended mechanics/features)

### Missing mechanics (explicitly not yet built)

- **2-hit blocks / hard tiles**: no tile durability model exists in production minigame state or dig resolution.
- **Special tile types beyond current bomb/object/normal**: no freeze, multiplier, lock/key, scanner, etc.
- **Stronger bomb behavior**:
  - Mechanical behavior is functional but simple (single ring reveal only).
  - No chain reactions, larger radius tiers, or escalating bomb effects.

### Missing content/feedback polish

- **Visual figure/object being searched for**:
  - Current preview uses emoji icon + name; no real image silhouette assets or assembled artifact visual.
- **Target/collection display**:
  - No persistent collection gallery/album of found objects across boards.
- **Sound/SFX integration in this minigame**:
  - No explicit SFX hooks in `SpaceExcavatorMinigame.tsx` for tap, clue, piece found, bomb, clear, claim.
- **Haptics integration in this minigame**:
  - No explicit haptic calls in Space Excavator component.
- **Animation depth**:
  - Basic CSS transitions exist, but no pronounced reveal animation system, shard-found bursts, bomb impact animation, progression ceremony, or reward claim spectacle.

---

## Bugs / visual weak spots observed

- **Ticket polling is a pragmatic short-term bridge**: 350ms polling keeps UI fresh but is not ideal versus shared subscription/store-driven updates.
- **Bomb feedback feels text-first**: feedback currently relies on message string rather than strong visual action.
- **Tile content still emoji/symbol heavy** (`⬛`, `💣`, object icon emoji), which limits production-feel quality.
- **First-time onboarding/help text is light**: no explicit tutorial overlay for clue semantics in the minigame surface itself.

---

## Asset state and gaps

### Existing Space Excavator-specific production assets

- No dedicated Space Excavator PNG/SVG sprite sheet or icon atlas found in production asset paths for tiles/objects/bombs.
- Object identities currently come from emoji definitions in `spaceExcavatorObjects.ts`.

### Prototype assets/code present

- A large standalone prototype exists in `prototypes/space-excavator/` with game docs/components/effects hooks, but it is explicitly marked as quarantined/inert for host integration.

### Audio assets/services

- Global Island Run SFX files exist under `public/assets/audio/sfx/`, and audio utility/services exist in app code.
- Space Excavator minigame currently does not appear to consume dedicated Space Excavator SFX hooks.

### Recommended location for new assets

- New production assets should live in host app asset paths (e.g., `public/assets/...`) and be referenced by production minigame/component code, **not** imported directly from quarantined prototype global bundles.

---

## Sound/SFX gaps

- Missing explicit SFX events for:
  - tile tap success/fail,
  - hot/warm/cold reveal,
  - relic piece found,
  - bomb trigger,
  - board clear,
  - milestone reward claim.
- Missing failure/out-of-tickets sonic feedback.
- No ducking/mix strategy documented specifically for this minigame session.

## Haptics gaps

- Missing explicit haptic calls for:
  - dig tap,
  - piece found,
  - bomb detonation,
  - board clear,
  - milestone claim.

---

## UX/state quality assessment

- **Understandable for first-time users:** _Partially_. The UI communicates goals and ticket spend, but clue rules and bomb behavior are inferred, not taught.
- **Found objects rewarding enough:** _Moderate_. “Relic Found” notice exists, but lacks richer reveal/assembly visuals.
- **Tap feedback sufficient:** _Basic_. Visual state updates and clue text exist; stronger multimodal feedback is missing.
- **Bomb animation strength:** _Likely weak/unfinished_. Functional mechanic exists without high-impact animation treatment.
- **Footer/ticket/progress mobile safety:** Generally resilient (safe-area padding, overflow controls, compact chips), but dense vertical stacking can still feel crowded on shorter screens.

---

## Technical architecture notes

### Main files/components involved

- `src/features/gamification/games/space-excavator/SpaceExcavatorMinigame.tsx`
- `src/features/gamification/games/space-excavator/spaceExcavator.css`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` (launcher wiring)

### State/service files involved

- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorClues.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorObjects.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorDepths.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorCampaignProgress.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorRewardUx.ts`

### Connection to Island Run/events/tickets

- Event launch comes from timed-event resolver path in board prototype.
- Ticket source of truth is `minigameTicketsByEvent[eventId]`.
- Event-scoped board progress stored in `spaceExcavatorProgressByEvent[eventId]`.

### Architectural risks / duplicated state

- Minigame keeps local React state for tiles/progress display while canonical writes happen through action services; this is acceptable presentation state but increases sync complexity.
- Ticket count is synchronized via callback polling (interval), which is a temporary coupling risk if state update timings drift.

### Polling verdict

- **Short-term acceptable** for this staged minigame.
- **Recommended medium-term improvement**: move to shared subscription/store selector updates (same authoritative source, push-based) to remove interval polling and reduce UI jitter/battery overhead.

---

## Recommended implementation slices (safest-first)

### Slice 1 — Visual/UX polish only (no gameplay rule changes)

- Improve tile art/states, clearer clue legend microcopy, better board-clear/reward visual hierarchy.
- Add gentle reveal/found/bomb CSS/animation polish without altering mechanics.
- Add first-time helper tooltip/legend modal for clue semantics.

### Slice 2 — Sounds + haptics only

- Wire SFX hooks and haptic hooks to existing events (tap/found/bomb/clear/claim/fail).
- Respect global audio preference and existing haptic utility boundaries.

### Slice 3 — 2-hit blocks mechanic

- Add explicit tile durability state in canonical progress entry.
- Ensure one-ticket-per-tap semantics remain explicit and tested.
- Keep event rewards/economy unchanged while adding durability mechanic.

### Slice 4 — Better bomb animation/behavior

- Keep ticket economy stable; only improve reveal spectacle and (optionally) controlled expanded reveal rules.
- Add deterministic tests for blast reveal behavior to avoid regressions.

### Slice 5 — Target figure/image collection display

- Add real artifact visuals + per-board/post-board collection panel.
- Keep progression accounting unchanged; presentation layer reads canonical found states.

---

## Risk notes

- **Gameplay economy integrity risk** if visual/mechanic enhancements accidentally change ticket spend cadence.
- **State drift risk** if new local mirrors are introduced instead of extending canonical progress entry.
- **Migration boundary risk** if prototype assets/styles are imported wholesale from quarantined prototype tree.
- **Mobile performance risk** from heavy animation without frame-budget checks.

---

## Exact files inspected

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/features/gamification/games/space-excavator/SpaceExcavatorMinigame.tsx`
- `src/features/gamification/games/space-excavator/spaceExcavator.css`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorClues.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorDepths.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorObjects.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorCampaignProgress.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorRewardUx.ts`
- `src/features/mini-games/space-excavator/INTEGRATION_NOTES.md`
- `public/assets/audio/sfx/*` (directory listing check)
- `src/utils/audioUtils.ts`
- `src/utils/completionHaptics.ts`

---

## Validation run

- `npm run build`
- `npm run test:island-run`
- `git diff --check`

