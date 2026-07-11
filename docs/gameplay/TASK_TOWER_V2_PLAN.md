# Task Tower v2 — From Placeholder to Polished

**Status:** Phase 0 complete (correctness foundation) — Phases 1–4 pending
**Date:** 2026-07-11
**Owner surface:** Actions tab launcher (`ActionsTab.tsx`), standalone game overlay
**Related docs:** `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` (Phase 6 manifest item), `HABITGAME_CORE_GAMES_DEV_PLAN.md`, `THEME_LAYER_CONTRACT.md`

---

## 1. Investigation — what exists today

Task Tower is **not** an empty stub: a working v1 game ships at
`src/features/gamification/games/task-tower/` (~1,400 lines across 6 files).
What makes it a *placeholder* is how it is gated and presented:

| Aspect | Current state |
| --- | --- |
| Gameplay core | Working: builds a block tower from the user's incomplete Actions, tap-to-complete with confirm, removal animation, per-column gravity, "line clear" row compaction, all-clear celebration |
| Rewards | Wired to the real economy: coins (`awardGold`), dice (`awardDice`), tokens (`awardGameTokens`), session logging (`logGameSession`) |
| Public access | `featureAvailability.ts` → `status: 'demo'`, `publicAccess: 'previewOnly'`. Public users tapping the launcher card get the generic `FeaturePreviewOverlay` vote/feedback placeholder — only admin/creator can actually play |
| Launcher card | Borrows the Tasks icon (`taskTowerIcon = '/icons/Actions/actions_tasks.webp'`) — no dedicated art |
| Feature metadata | `description: 'Actions launcher entry for Task Tower.'`, **no `previewScreenshots`** — the preview overlay has nothing to show |
| Island Run integration | Unchecked Phase 6 item in `MINIGAME_EVENTS_CONSOLIDATION_PLAN.md`: no `index.ts` manifest (Vision Quest has one); `ActionsTab.tsx` imports the component directly |
| Theming | `taskTower.css` is a self-contained dark tan/brown palette; ignores the app theme layer contract |
| Tests | None for `taskTowerState.ts` (build/gravity/line-clear logic is untested) |

### Game rules as implemented

- Grid: 4 columns × max 8 rows (`TOWER_GRID`).
- Block size maps to Action category: `must_do` → large (3-wide, red),
  `nice_to_do` → medium (2-wide, green), `project` → small (1-wide, amber).
- Tower is packed left-to-right, bottom-to-top, `must_do` first; blocks beyond
  the 8-row cap are silently dropped.
- Rewards: per-block coins (30/15/20 by category), 1 die per `must_do`,
  +50 coins & +1 die per line clear, +200 coins/+3 dice/+5 tokens for all clear
  (`TASK_TOWER_REWARDS`).

### Correctness issues found (must fix before polish)

1. **Tower rebuild race** — `TaskTower.tsx:70-83`: the init `useEffect` depends
   on `[loading, actions, userId]`. Completing a block updates `actions` via
   `useActions`, which re-runs the effect, **rebuilds the whole tower from
   scratch** (wiping gravity/line-clear state mid-animation) and **re-logs an
   `enter` game session** on every completion. The tower should be built once
   per session from a snapshot of actions.
2. **All-clear vs. empty-state race** — `TaskTower.tsx:289`: after the last
   block clears, the refreshed `actions` list has no incomplete items, so the
   component can flip to the "No tasks to clear!" empty state instead of the
   celebration + rewards flow.
3. **Gravity mutation bug** — `taskTowerState.ts:87-122` (`removeBlock`)
   mutates `block.row` in place on shared object references. Wide blocks span
   multiple columns and are re-processed once per column with a per-column
   `blocksInColumn` index order, which can assign overlapping rows to blocks
   that share columns. Rewrite as a pure, whole-grid settle pass.
4. **"Line clear" semantics are inverted from the fantasy** — a "line" is
   rewarded when a row *becomes empty* (`checkLineClears`). With bottom-up
   gravity that mostly means "the top storey vanished", which players read as
   the tower shrinking, not a Tetris-style clear. v2 should redefine the combo
   mechanic (see §3) rather than keep this accidental rule.
5. **Unused/dead code** — `calculateSessionRewards` is exported but unused;
   `sessionStartTime` is captured but never used for duration metadata in the
   `complete` log.

---

## 2. What "placeholder → beautiful and cool" means

Two independent gaps to close:

- **Access gap:** public users never see the game — they see the generic vote
  overlay. Graduating the flag is the last step, *after* the game earns it.
- **Craft gap:** v1 is functional but flat — plain gradient rectangles in a
  modal, no tower silhouette, no depth, no juice, no combo fantasy, no theme
  awareness, borrowed icon, no preview media.

The core fantasy to amplify: **your to-do list is a physical tower you demolish
block by block, and finishing everything levels the whole thing to the ground
in a satisfying collapse.** Emotion target (per `habitGames.ts`): **Relief.**

---

## 3. The v2 design

### 3.1 Scene & art direction

- Replace the flat modal with a **scene**: vertical parallax backdrop (sky
  gradient + drifting clouds + distant skyline silhouette), the tower standing
  on a ground/foundation strip, subtle ambient dust motes. Pure CSS/DOM —
  no canvas dependency needed at this scale (≤32 blocks).
- **Blocks as materials, not gradients:** each category gets a distinct
  "material" treatment — `must_do` = red brick with mortar lines and a warning
  stripe edge, `nice_to_do` = green glass with specular highlight,
  `project` = amber timber with grain. Achieved with layered CSS
  backgrounds/box-shadows; no image assets required.
- **Crane header:** a small crane arm across the top of the scene that swings
  to hover above the selected block — sells the construction-site fantasy and
  doubles as the selection indicator.
- **Theme-aware:** consume the app theme layer (per `THEME_LAYER_CONTRACT.md`)
  for backdrop, panel chrome, and text; keep block materials constant so the
  game reads identically across themes. Day/night ambience keyed to local time
  (sky gradient + window lights on the skyline) is a cheap, high-delight touch.
- Respect `prefers-reduced-motion`: swap physics easing/particles for simple
  fades.

### 3.2 Game feel ("juice")

- **Demolition, not fade-out:** clearing a block plays a crack-flash, then the
  block splits into 4–6 CSS shard particles that fall with gravity easing;
  blocks above drop with a `cubic-bezier` overshoot bounce and a 1-frame squash
  on landing. Reuse existing `playTone`/`playChime` hooks; add a low "thud" on
  settle and pitch-up per combo step.
- **Combo streaks (replaces v1 "line clear")**: clearing blocks back-to-back
  within a 20s window builds a combo meter (×1.2 / ×1.5 / ×2 coin multiplier,
  capped). The meter drains visibly — creates a gentle "one more task" pull
  without punishing breaks (the tower never grows back; Relief, not stress).
- **Storey milestones:** when an entire storey (row) of the tower is emptied
  *bottom-up perspective — i.e. the tower gets one storey shorter*, fire the
  golden flash + bonus that v1's line clear intended, with a screen-shake pulse.
- **All-clear finale:** slow-mo final block, confetti + dust cloud collapse,
  then the existing `LuckyRollCelebration` → upgraded rewards summary with
  count-up number animation per stat row.
- **Floating rewards** anchored to the cleared block's grid position instead of
  screen center.

### 3.3 Mechanics & systems (small, additive)

- **Session snapshot:** build the tower once from actions at open; new actions
  added elsewhere appear as a "delivery" (crane lowers new block) only on
  explicit refresh — kills the rebuild race by design.
- **Daily tower:** seed block order deterministically from the date so
  reopening mid-day shows the same tower minus cleared blocks.
- **Overflow queue:** actions beyond the 8-row cap wait in a visible "supply
  line" at the side and crane-drop in as space frees, instead of being
  silently dropped.
- **Duration + combo stats** added to the `complete` session log metadata.
- Keep the reward economy numbers unchanged (`TASK_TOWER_REWARDS`) except the
  combo multiplier, which needs a balance pass against `constants/economy.ts`.

### 3.4 Launch surface polish

- Dedicated launcher icon (`/icons/Actions/actions_tower.webp` or similar) —
  currently the only launcher card sharing another feature's icon.
- Real `description` + 2–3 `previewScreenshots` in `featureAvailability.ts`
  so the preview overlay markets the game while it's still gated.
- Copy pass on empty state ("Tower's already demolished — add tasks to build
  tomorrow's tower").

---

## 4. Phased build plan

### Phase 0 — Correctness foundation (prereq for everything) ✅
- [x] Snapshot tower build on mount (ref-guarded, once per open); log `enter` exactly once per open.
- [x] Fix all-clear vs. empty-state race (empty state only when the tower was empty *at open*).
- [x] Rewrite `removeBlock` gravity as a pure whole-grid settle (`settleBlocks`, no shared-reference mutation); keep API. `buildTower` now settles after packing so freshly built towers can't contain floating blocks (found by the new invariant tests).
- [x] Add `taskTowerState.test.ts` + `tsconfig.task-tower-tests.json` + `npm run test:task-tower`: packing, gravity invariants (no overlap, no floaters) across 50 randomized demolition sequences, storey compaction, reward math, overflow cap, purity.
- [x] Remove dead `calculateSessionRewards`; add `durationSeconds` to the `complete` log metadata.

### Phase 1 — Scene & visual overhaul
- [ ] Scene backdrop (parallax sky, skyline, ground strip), theme-layer integration, day/night tint.
- [ ] Block material treatments per category + refreshed typography/badging.
- [ ] Crane selection indicator replacing plain highlight ring.
- [ ] Reduced-motion variants.

### Phase 2 — Juice & mechanics
- [ ] Shard-particle demolition + drop bounce + settle squash; combo-pitched audio.
- [ ] Combo meter with decay + multiplier (balance pass vs. economy constants).
- [ ] Storey-shorter milestone flash/shake (replaces v1 line-clear semantics; keep bonus values).
- [ ] Supply-line overflow queue with crane drop-in.
- [ ] Upgraded rewards screen with stat count-up; floating rewards anchored to block position.

### Phase 3 — Launch readiness
- [ ] Dedicated launcher icon asset; wire in `ActionsTab.tsx`.
- [ ] `featureAvailability.ts`: real description, preview screenshots, then graduate `status: 'demo'` → `'beta'` with `publicAccess: 'open'` once QA passes.
- [ ] Telemetry review: confirm enter/complete metadata answers "do players return?" (session length, combo max, blocks cleared vs. tower size).
- [ ] Update `GAMIFICATION_CHANGELOG.md` + DEV_PLAN status snapshot.

### Phase 4 — Island Run manifest (from consolidation plan Phase 6)
- [ ] Add `task-tower/index.ts` exporting `taskTowerManifest` (`React.lazy`, mirroring `vision-quest/index.ts`).
- [ ] Switch `ActionsTab.tsx` to lazy import so game code stays out of the main bundle.
- [ ] Event-config wrapper props (duration, target storeys, theme) for the Feeding Frenzy repurpose — behavior unchanged until that plan activates it.

---

## 5. Acceptance criteria

1. Completing a block never rebuilds the tower or double-logs sessions; the
   final block always reaches the celebration + rewards flow.
2. Gravity never produces overlapping blocks (property-tested across random
   removal orders).
3. Game renders correctly in all app themes and honors reduced motion.
4. Public (non-admin) users can play once Phase 3 flips the flag; before that,
   the preview overlay shows real screenshots and copy.
5. Bundle: game chunk is lazy-loaded (Phase 4) — Actions tab initial JS does
   not include Task Tower.
