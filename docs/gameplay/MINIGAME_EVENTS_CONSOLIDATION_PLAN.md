# Minigame & Events Consolidation Plan

**Written:** 2026-04-21
**Status:** Plan approved, ready to ship in phases.
**Related docs:** `CANONICAL_GAMEPLAY_CONTRACT.md`, `STAGE_C_STATE_ARCHITECTURE_MIGRATION.md`, `ISLAND_RUN_OPEN_ISSUES.md`, `NEXT_TODO_PR_LIST.md`, `QA_WORKFLOW.md`

---

## 1. Goal

Unify the two parallel concepts currently in the 120-island game:

- **Events** — 4 timed events that rotate in the reward bar (Monopoly-GO-style cycle).
- **Mini-games** — 4 standalone game components in `src/features/gamification/games/`.

into a single concept: **every mini-game is the play surface of an event**, and **no mini-game exists outside of an event**. All mini-games are launched by the event engine, gated by tickets (tokens earned via the reward bar), and monetizable via Stripe in the same way dice top-ups already are.

Supporting goals:
- Give island stops (mystery + boss) real, varied, polished gameplay (ultimately up to island 120+).
- Keep the main bundle small as games grow heavier (lazy-loading).
- Keep game code isolated per folder so future games don't metastasize into the renderer.

---

## 2. Target state (one-page summary)

### 2.1 The 4 events (canonical)

| # | Event | Icon | Duration | Mini-game (play surface) | Source token |
|---|---|---|---|---|---|
| 1 | Feeding Frenzy | 🔥 | 8h | **Task Tower** (repurposed) — short burst, high-tempo | `minigame_ticket` |
| 2 | Lucky Spin | 🎰 | 24h | **Daily Spin Wheel** (existing) — 1 free spin/day + event-ticket spins | `minigame_ticket` |
| 3 | Space Excavator | 🚀 | 2d | **Shooter Blitz** (polished) — also serves as Boss Stop game | `minigame_ticket` |
| 4 | Companion Feast | 🐾 | 4d | **Partner Wheel** (new mini-game, built on the old Wheel of Wins scaffold) — team of up to 4 partners, shared bar | `minigame_ticket` |

Rotation: events cycle 1 → 2 → 3 → 4 → 1 … , exactly one active at a time. Each event has its own sticker collectible (fragments come from reward bar fills during that event).

### 2.2 Island stops

| Stop kind | Game / content | Notes |
|---|---|---|
| `fixed_hatchery` | (unchanged) | — |
| `fixed_habit` | (unchanged) | — |
| `fixed_mystery` | `breathing` / `habit_action` / `checkin_reflection` / **`vision_quest`** (new) / **`task_tower`** (new) | Variants rotate per island. Task Tower is a mystery variant AND the Feeding Frenzy event surface. |
| `fixed_wisdom` | (unchanged) | — |
| `fixed_boss` | **Shooter Blitz** (polished) | Boss-fight flavor (every `islandNumber % 4 === 3` → fight boss). Island 1 gets Shooter Blitz as its boss (see §2.3). |

### 2.3 Island 1 focus

- Boss of island 1 uses Shooter Blitz (polished spaceship shooter, uses the footer game-controller UI).
- Next fight boss is island 4 (following existing `islandNumber % 4 === 3` rule).
- Island 2 / island 3 bosses stay as milestone bosses for now (out of scope).

### 2.4 Today's Offer dialog

- Dialog becomes **scrollable**.
- Keep existing buy-button (Stripe link for 500 dice) + red close-X at the top.
- Add a new container at the bottom with a **Daily Spin Wheel launch button**.
- Red notification badge logic is **unified**:
  - Badge shown on the Today's Offer circle (today tab) AND on the new Spin button inside the dialog when `dailySpinRemaining > 0`.
  - Badge cleared on both when the single daily spin is used.
  - Enforce **1 spin per day max** (remove the streak-bonus +1 spin currently in `dailySpin.ts`).
- Daily Spin Wheel is **removed from `GameBoardOverlay`** (no more overlay button / overlay timer chip).

### 2.5 Game Board Overlay

- **Remove**: Daily Spin Wheel button (moved to Today's Offer).
- **Keep**: Lucky Roll button (standalone treat, unchanged gameplay).
- **Add**: Lucky Roll keeps its entry icon here (already present — verify only).
- **Add later (Phase 4)**: Active-event button that launches the current event's mini-game.

### 2.6 Deletions

- **Wheel of Wins** (`src/features/gamification/games/wheel-of-wins/*`) — **delete entirely**. The old "Lucky Roll is the board" concept is dead; WoW is unreferenced legacy. The Partner Wheel mini-game for Companion Feast will be built fresh (see §5.4), not on top of WoW. (User decision: "complete delete, i don't want stuff in the code that is not used.")

---

## 3. Architecture changes

### 3.1 Event Engine (new layer)

New module: `src/features/gamification/level-worlds/services/islandRunEventEngine.ts`

**Owns:**
- The canonical event-rotation clock (which of the 4 events is active now, when the next one starts).
- Event lifecycle: `start(eventId) → progress(deltas) → completeMilestone(n) → expire()`.
- Persistence hooks into `IslandRunGameStateRecord.activeTimedEvent` (the already-existing field — we don't add a new column, we formalize the owner of it).
- Milestone reward ladder per event (`feeding_frenzy_ladder_v1`, `lucky_spin_ladder_v1`, `space_excavator_ladder_v1`, `companion_feast_ladder_v1`).
- Sticker-fragment award routing per active event.

**Exposes:**
- `getActiveEvent(nowMs): ActiveEventDescriptor` — pure.
- `advanceEventIfExpired(record, nowMs) → patch` — called on hydrate + on roll.
- `recordEventProgress(record, source, amount) → patch` — wired into reward-bar progress.
- `openEventMinigame(eventId, ticketsToSpend) → MinigameLaunchDescriptor` — returns the registry id + config to hand to the launcher.

**Invariant:** exactly one active event at a time (matches user requirement §8 answer).

### 3.2 Minigame Registry expansion

Current registry (`islandRunMinigameRegistry.ts`) only has `shooter_blitz` + `stub_placeholder`. Expand to include:

- `shooter_blitz` (boss stop + Space Excavator event)
- `task_tower` (Feeding Frenzy event + `task_tower` mystery variant)
- `lucky_spin` (Lucky Spin event — wraps the daily spin wheel component in minigame props)
- `vision_quest` (Vision Quest mystery variant)
- `partner_wheel` (Companion Feast event — new)

All entries should use **`React.lazy`** so game code is not in the main bundle.

### 3.3 Standard game contract (tighten existing)

Every game folder under `src/features/gamification/games/<game-id>/` exports from `index.ts`:

```ts
export const manifest: MinigameManifest = {
  id: 'shooter_blitz',
  title: '…',
  icon: '🚀',
  Component: lazy(() => import('./ShooterBlitz')),
  defaultConfig,        // per-difficulty config builder
  resolveRewards,       // (result) => Award[] — game never awards directly
};
```

The launcher consumes manifests; the engine consumes awards. No game imports engine or store. (This matches the existing `IslandRunMinigameProps` contract — we're formalizing and enforcing it.)

### 3.4 Lazy-loading

- All game components are `React.lazy` imports via their manifest.
- Game CSS imported inside the lazy component, not at registry level.
- `Suspense` fallback provided by `islandRunMinigameLauncher`.

### 3.5 Monetization hook (Stripe)

New: `src/services/minigameTicketStore.ts` (mirrors `src/services/diceStore.ts` / existing dice Stripe plumbing).

- Product slots per event (e.g. `feeding_frenzy_tickets_10`, `lucky_spin_tickets_10`, …) plus a generic `minigame_tickets_10` SKU if desired.
- `initiateStripeCheckout(skuId)` → returns URL; client opens.
- Webhook handler grants `minigame_ticket` balance (and/or sticker fragments for "skip to next tier" bundles later).
- Stripe URLs **left blank** in config — user will paste them in once created.

Where this lives on the record: add `minigameTicketsByEvent: Record<string, number>` to `IslandRunGameStateRecord` (new column via a Supabase migration), consumed when launching an event mini-game.

---

## 4. Shooter Blitz polish spec

**Premise:** Spaceship side-scroller / top-down shooter using the app's existing footer game-controller UI concept as **real gameplay input** (not menu navigation).

- Input: left / right / fire (center button). Repurpose the existing footer controller image + 3 overlay buttons while a boss/event is active. Return to normal footer navigation on exit.
- Enemies: simple waves of asteroids/drones scaling with `BossDifficulty` (existing enum in `bossService.ts`).
- Win condition: reach `scoreTarget` before `trialDurationSec` expires (already modeled in `getBossTrialConfig`).
- Lose condition: time-out OR ship destroyed (ship has HP scaling with difficulty).
- Power-ups drop from enemies: rapid-fire, shield, triple-shot — duration-based, in-session only.
- Visual theme per island: island 1 = asteroid field, island 4 = drone swarm, … (stub palette-swap per island now, proper theming later).
- Rewards: converted by `resolveRewards(result)` into `Award[]` (dice / essence / fragments / minigame tokens). Game code does not mutate state.
- Audio/haptics: reuse existing hooks already in the game (`ShooterBlitz.tsx` already has minimal versions).

---

## 5. Per-event mini-game specs

### 5.1 Feeding Frenzy → Task Tower

- Short (90–120s) block-drop / match-clear loop.
- Blocks represent "food" for the active companion; each clear gives a feeding tick that counts toward event progress (same weight as `creature_feed` in reward bar: +4).
- Entry cost: 1 minigame ticket per run.
- Reuses existing Task Tower component; wrap for event config (duration, target rows cleared, theme).

### 5.2 Lucky Spin → Daily Spin Wheel (as event surface)

- Wrap `NewDailySpinWheel` behind the minigame contract.
- Free daily spin (1/day, from Today's Offer dialog) still works independently.
- Extra event spins cost 1 ticket each.
- Each spin yields reward bar progress + sticker-fragment chance.

### 5.3 Space Excavator → Shooter Blitz (event version)

- Same engine as boss version but tuned for event length (longer campaign, more enemy variety).
- Milestones at score breakpoints; cumulative across runs for the duration of the event.

### 5.4 Companion Feast → Partner Wheel (new)

Clone of Monopoly GO's Partner Event:
- Team of up to 4 players (initially: single-player placeholder + 3 AI partners, real multiplayer deferred).
- Each partner has their own progress bar.
- Shared reward bar filled by wheel spins.
- Wheel spins cost event tokens (earned by rolls / daily claims / tickets).
- Milestones + final big reward shared across the team.
- **Built fresh** under `src/features/gamification/games/partner-wheel/` — do NOT build on Wheel of Wins (which is deleted in Phase 1).

---

## 6. Today's Offer dialog changes

**File(s):** to-be-identified (grep in Phase 2 — the current plan doc author could not locate the dialog component definitively). Likely under `src/features/dashboard/` or `src/features/today/`.

Changes:
1. Make the dialog body scrollable (`overflow-y: auto` on a bounded container).
2. Add a new `<section>` at the bottom: "Daily Spin Wheel" with icon, name, small description, state ("Ready" / countdown), and a launch button.
3. Launch button opens the existing `NewDailySpinWheel` as a modal.
4. Red notification badge:
   - On the Today tab's Today's Offer circle: bound to `dailySpinRemaining > 0`.
   - On the new Spin button inside the dialog: same condition.
   - Both clear automatically when the day's single spin is used (state already updates in `dailySpin.ts`).
5. Remove the streak-bonus extra spin in `src/services/dailySpin.ts` (enforce strictly 1 spin/day).
6. Remove Daily Spin button + timer from `GameBoardOverlay`.

---

## 7. Data model changes

| Change | Where | Migration needed? |
|---|---|---|
| Add `minigameTicketsByEvent: Record<EventId, number>` to `IslandRunGameStateRecord` | `islandRunGameStateStore.ts` | **Yes** — new `jsonb` column on `island_run_runtime_state` |
| Formalize `activeTimedEvent` shape (typed `eventId: EventId` union instead of open string) | same | No |
| Add `'vision_quest' \| 'task_tower'` to `MysteryStopContentKind` union | `islandRunStops.ts` | No |
| Remove `wheel-of-wins` entirely | `src/features/gamification/games/wheel-of-wins/` | No |
| Remove streak-bonus extra spin | `src/services/dailySpin.ts` | No |

Migration file name (next available): check `supabase/migrations/` — most recent appears to be `0230_add_bonus_tile_charge_by_island.sql`; new one would be `0231_add_minigame_tickets_by_event.sql`.

Remember: new columns must be added to the explicit `select(...)` list in `hydrateIslandRunGameStateRecordWithSource` (~line 1205 of `islandRunGameStateStore.ts`) — per stored memory `runtime state hydrate`.

---

## 8. Folder / file plan

```
src/features/gamification/
├── games/
│   ├── shooter-blitz/        # polish this, add spaceship, controller input
│   │   ├── index.ts          # manifest export (new)
│   │   ├── ShooterBlitz.tsx  # polished
│   │   ├── controller.tsx    # new — reuses footer game-controller image
│   │   ├── enemies.ts        # new
│   │   ├── powerups.ts       # new
│   │   └── shooterBlitz.css
│   ├── task-tower/           # keep as-is, wire into registry
│   │   ├── index.ts          # manifest export (new)
│   │   └── (existing files)
│   ├── vision-quest/         # keep as-is, wire into registry
│   │   ├── index.ts          # manifest export (new)
│   │   └── (existing files)
│   ├── partner-wheel/        # NEW
│   │   ├── index.ts
│   │   ├── PartnerWheel.tsx
│   │   ├── partnerWheelState.ts
│   │   ├── partnerWheelTypes.ts
│   │   └── partnerWheel.css
│   └── wheel-of-wins/        # DELETED in Phase 1
└── level-worlds/services/
    ├── islandRunEventEngine.ts          # NEW (§3.1)
    ├── islandRunMinigameRegistry.ts     # expand (§3.2)
    ├── islandRunMinigameLauncher.tsx    # add Suspense + lazy (§3.4)
    ├── islandRunMinigameTypes.ts        # add MinigameManifest type (§3.3)
    └── islandRunStops.ts                # add 'vision_quest' + 'task_tower' mystery variants

src/services/
├── dailySpin.ts              # 1/day enforcement, remove streak bonus
└── minigameTicketStore.ts    # NEW — Stripe checkout for event tickets

supabase/migrations/
└── 0231_add_minigame_tickets_by_event.sql  # NEW
```

---

## 9. Testing strategy

- **Engine:** unit-test `islandRunEventEngine.ts` — rotation, expiry, progress accumulation, milestone emission. Place in `src/features/gamification/level-worlds/services/__tests__/islandRunEventEngine.test.ts`.
- **Registry:** assert every manifest is lazy, and `resolveMinigameForStop('boss', islandNumber=1)` returns `shooter_blitz`.
- **Mystery variants:** assert `'vision_quest'` and `'task_tower'` can be chosen by the seeded random and are playable.
- **Daily spin:** update existing tests to expect 1/day and no streak bonus.
- **Stripe:** mock the checkout service; verify ticket grant shape in the webhook handler.
- **No tests for game internals** — they're volatile. Test the contract boundary only.

**Workflow policy (applies to all phases):** follow `docs/gameplay/QA_WORKFLOW.md` so QA stays risk-first and bounded (contract checks first, then finite manual matrices, then explicit flag decision).

---

## 10. Rollout / feature flags

Add flags to `src/config/featureFlags.ts` (or the existing flag file):
- `islandRunEventEngineEnabled`
- `islandRunShooterBlitzBossEnabled`
- `islandRunTaskTowerMysteryEnabled`
- `islandRunVisionQuestMysteryEnabled`
- `islandRunPartnerWheelEnabled`
- `todaysOfferSpinEntryEnabled`

All default off; flip on per-phase as pieces ship. The registry and engine can exist in the code without being active.

---

## 11. Risks & open items

1. **Today's Offer dialog location** — need to grep/locate the component in Phase 2 before we can wire the new Spin button in.
2. **Footer game-controller reuse** — need to confirm the footer component is safe to hand over to Shooter Blitz and revert on exit without breaking navigation.
3. **Partner Wheel multiplayer** — real multiplayer is out of scope for this plan; ship single-player + AI partners first.
4. **Reward-bar sticker fragments** — current fragments logic doesn't know about events; Phase 3 wires it to the engine so fragments go to the active event's sticker.
5. **Ticket economy balancing** — initial ticket grant rates + Stripe pricing are placeholders; design pass after Phase 3 with live numbers.
6. **Lucky Roll stays standalone** — confirm its overlay entry icon still works after the Daily Spin removal from overlay (they are separate, but both currently render in the same overlay area).

---

## 12. Phased shippable plan (the checklist we work through)

Each phase is one PR and independently shippable. Phase 1 is the first chunk for the next RP.

### Phase 1 — Cleanup & foundations (ship first)
- [ ] Delete `src/features/gamification/games/wheel-of-wins/` and all references.
- [ ] Add `MinigameManifest` type to `islandRunMinigameTypes.ts`.
- [ ] Add `index.ts` manifest exports to existing polished games (Task Tower, Vision Quest, Shooter Blitz) with `React.lazy` components — no behavior change yet; just the shape.
- [ ] Expand `islandRunMinigameRegistry.ts` to register all four manifests (still inert — nothing launches them).
- [ ] Add feature flags (§10) all defaulted off.
- [ ] Add `'vision_quest'` and `'task_tower'` to `MysteryStopContentKind` + pool entries (gated behind flags).
- [ ] Supabase migration `0231_add_minigame_tickets_by_event.sql` (column only, no reads yet).
- [ ] Add the column to the hydrate `select(...)` list.
- [ ] Unit tests: registry shape, mystery variant pool includes new entries when flags are on.

### Phase 2 — Today's Offer + Daily Spin unification
- [ ] Locate Today's Offer dialog component.
- [ ] Make dialog scrollable.
- [ ] Add Daily Spin Wheel launch button at dialog bottom.
- [ ] Unify red badge logic (Today circle + in-dialog button) via single selector.
- [ ] Remove streak-bonus extra spin from `dailySpin.ts`; enforce strict 1/day.
- [ ] Remove Daily Spin button + timer from `GameBoardOverlay`.
- [ ] Verify Lucky Roll overlay entry still intact.
- [ ] Update tests for `dailySpin.ts`.

### Phase 3 — Event engine
- [x] Create `islandRunEventEngine.ts` (§3.1) with rotation clock, progress, milestones, sticker-fragment routing.
- [x] Migrate `activeTimedEvent` reads/writes in the renderer to go through engine functions.
- [x] Wire reward-bar progress to `recordEventProgress`.
- [x] Unit tests for engine (§9).
- [x] Telemetry: log event transitions (flag-gated).

### Phase 4 — Boss Stop Shooter Blitz
- [x] **Step 1 — pure launcher resolver:** `islandRunMinigameLauncherService.ts` exports `resolveBossStopMinigame(ctx) → MinigameLaunchDescriptor | null`, flag-gated on `islandRunShooterBlitzBossEnabled`. Routes `bossType === 'fight'` to `shooter_blitz` with deterministic score/duration scaling from `bossService`. 5 unit tests.
- [x] Wire boss stop UI to launch Shooter Blitz via `islandRunMinigameLauncher` for `kind === 'fixed_boss'` on island 1.
- [x] Polish Shooter Blitz: spaceship sprite, asteroid enemies, power-ups, HP, win/lose conditions per `bossService.getBossTrialConfig`.
- [ ] Hook footer game-controller image to Shooter Blitz inputs (left / right / fire) during boss session.
- [ ] `resolveRewards` → awards via engine.
- [ ] Flip `islandRunShooterBlitzBossEnabled` on.

**Phase 4 — next implementation order (refined):**
1. [x] **Gameplay polish vertical slice** (single PR): ship sprite + HP + timer/score target parity with `bossService`, while keeping current reward grant path unchanged.
2. [ ] **Controller wiring** (single PR): map footer controls to Shooter Blitz input; include exit/cleanup guards so nav controls always restore.
3. [ ] **Reward contract move** (single PR): migrate Shooter Blitz direct awards into `resolveRewards` + engine-issued state deltas.
4. [ ] **Flag rollout** (single PR): QA on islands 1/3/4/23, then enable `islandRunShooterBlitzBossEnabled`.

**Phase 4 immediate TODO queue (next sessions):**
- [x] Add a `ShooterControllerAdapter` bridge in `level-worlds/components` that subscribes to footer-controller taps and emits `left/right/fire` intents.
- [x] Extend `IslandRunMinigameLauncher` to optionally pass down a controller-input provider (no-op by default; Shooter Blitz opt-in).
- [x] Add focused tests for controller cleanup on minigame exit (ensures footer navigation always restores).

**Phase 4 immediate TODO queue (refined after controller bridge ship):**
1. [x] Add movement interpolation to Shooter Blitz so `left/right` intents move the ship sprite and affect hit/hurt logic (currently they are input-recognized but cosmetic).
2. [x] Add keyboard fallback mapping (`ArrowLeft/ArrowRight/Space`) through the same controller bridge for desktop QA parity.
3. [x] Add a telemetry marker for controller-session lifecycle (`controller_attach`, `controller_detach`) tied to minigame open/close.

**Phase 4 execution notes (kept current for future sessions):**
- Keyboard fallback should route through the same shooter-controller bridge used by the footer adapter to keep parity with mobile controls.
- Telemetry should include `minigameId`, `islandNumber`, and `source` (`footer` vs `keyboard`) on both attach/detach events for QA traceability.

**QA definition + anti-bloat guardrails (added 2026-04-22):**
- **QA = Quality Assurance.** In this plan, QA means proving rollout-critical behavior is safe to release, not broad exploratory retesting.
- Keep QA scoped to release risk only:
  1. **Contract checks first** (automated): routing invariants and telemetry payload shape.
  2. **Minimal manual matrix** (3 islands only: 1/4/23, mobile + desktop).
  3. **Flag gate decision**: ship only if both automated + manual checks pass.
- To avoid endless QA work, every QA task must have explicit exit criteria and should be removed from the active queue once the flag is enabled and stable.

**Phase 4 micro-checklist (for step-by-step session handoffs):**
- [x] Ship controller bridge + footer adapter UI.
- [x] Ship gameplay movement response to controller intents.
- [x] Ship keyboard fallback on the shared bridge for desktop QA.
- [x] Ship controller lifecycle telemetry (`controller_attach` / `controller_detach`).
- [x] Run focused QA matrix: mobile footer taps + desktop keyboard on islands 1/4/23.

**Phase 4 next actionable TODOs (single-source queue):**
1. [x] Run focused QA matrix on islands **1, 4, 23** covering:
   - footer left/right/fire controls on mobile viewport
   - keyboard fallback (`ArrowLeft`, `ArrowRight`, `Space`) on desktop
   - controller attach/detach telemetry lines for both `footer` and `keyboard` sources
   - **Session 2026-04-22 update:** Added regression suite `islandRunShooterControllerQaMatrix.test.ts` to codify launcher routing + shared-intent parity + telemetry payload shape for islands 1/4/23 across both controller sources.
2. [x] Capture QA notes in `docs/gameplay/ISLAND_RUN_OPEN_ISSUES.md` with pass/fail per island.
   - **Session 2026-04-22 update:** Added `P1-22` QA matrix ledger in `ISLAND_RUN_OPEN_ISSUES.md` with current pass/pending/blocker state per island (1/4/23).
3. [ ] If QA passes, prepare the "Flag rollout" PR to enable `islandRunShooterBlitzBossEnabled`.

**Phase 4 remaining queue (tightened):**
- [ ] Record manual viewport QA evidence (mobile footer taps + desktop keyboard) in `ISLAND_RUN_OPEN_ISSUES.md` using the same 1/4/23 matrix headings.
- [x] Run post-QA risk sweep: confirm milestone bosses (1/4) stay on legacy path while fight bosses (23+) launch Shooter Blitz.
  - **Session 2026-04-22 update:** Added regression case `QA matrix: post-QA risk sweep keeps milestone bosses legacy and fight bosses on Shooter Blitz` in `islandRunShooterControllerQaMatrix.test.ts` covering islands `1/4/23/24`.
- [ ] Draft and land the flag-rollout PR (`islandRunShooterBlitzBossEnabled: true`) after QA notes are merged.

**Phase 4 execution queue (refined for handoffs):**
1. [ ] **Manual viewport evidence:** capture one mobile-footer + one desktop-keyboard run for islands 1/4/23, then log pass/fail rows in `ISLAND_RUN_OPEN_ISSUES.md`.
2. [ ] **Flag-rollout prep:** once manual matrix is all-pass, capture a short risk note that references the automated routing sweep (islands 1/4/23/24) + manual notes.
3. [ ] **Rollout PR:** flip `islandRunShooterBlitzBossEnabled` to `true`, include QA evidence links in PR description, then ship.

**Session 2026-04-22 progress note:** the island-run harness blocker is resolved and `npm run test:island-run` now executes the QA matrix end-to-end; the next undone Phase 4 task remains manual viewport evidence capture for islands 1/4/23.

### Phase 5 — Mystery Task Tower & Vision Quest
  - **Session 2026-04-22 foundation:** added `openEventMinigame()` mapping + ticket-gate contract in `islandRunEventEngine.ts` and `minigameConsolidationPhase6.test.ts` coverage (event→minigame routing + spend validation). UI/event-panel wiring still pending.
- [x] Wire mystery-stop launcher to launch Task Tower / Vision Quest components when the rolled `mysteryContentKind` selects them.
- [x] Add focused regression tests for Mystery launch flow (task_tower + vision_quest stop completion contract).
  - **Session 2026-04-22 update:** added pure launcher/contract coverage in `minigameConsolidationPhase5.test.ts` for flag gating, mystery variant routing (`task_tower` + `vision_quest`), non-minigame fallback behavior, and stop-completion guard logic.
- [ ] Manual QA: walk through 8–10 islands of mystery rotation.
- [ ] Flip mystery flags on.

**Phase 5 execution queue (refined 2026-04-22):**
1. [x] Land automated regression coverage for Mystery launcher + stop completion behavior (new highest-priority undone task).
2. [ ] Run manual mystery-rotation pass (8–10 islands) and log notes in `ISLAND_RUN_OPEN_ISSUES.md`.
3. [ ] Enable `islandRunTaskTowerMysteryEnabled` + `islandRunVisionQuestMysteryEnabled` once tests + QA notes are green.

### Phase 6 — Event mini-games
- [x] Feeding Frenzy wraps Task Tower in event config; event tickets spent to play.
  - **Session 2026-04-22 update:** added `resolveFeedingFrenzyEventMinigame()` in `islandRunMinigameLauncherService.ts` (ticket-gated via `openEventMinigame`) and regression coverage in `minigameConsolidationPhase6.test.ts`.
- [x] Lucky Spin wraps daily spin wheel for event extra spins (resolver contract shipped; UI wiring still pending).
- [x] Space Excavator wraps Shooter Blitz (longer campaign variant resolver shipped; UI wiring still pending).
- [x] New Partner Wheel skeleton (single-player + AI partners placeholder).
- [ ] Reward-bar progress + sticker fragments routed via engine to active event sticker.

**Phase 6 execution queue (refined 2026-04-22):**
1. [x] Implement Feeding Frenzy event-launch resolver with explicit event config + spend validation.
2. [x] Add Lucky Spin event-launch resolver that distinguishes free daily spin vs ticket-funded extra spins.
   - **Session 2026-04-22 update:** added `resolveLuckySpinEventMinigame()` in `islandRunMinigameLauncherService.ts` and expanded `minigameConsolidationPhase6.test.ts` coverage for launch routing + `free_daily` vs `ticket_extra` config tags.
3. [x] Add Space Excavator event-launch resolver that maps to Shooter Blitz event mode (longer campaign config).
   - **Session 2026-04-22 update:** added `resolveSpaceExcavatorEventMinigame()` in `islandRunMinigameLauncherService.ts` with explicit event-mode config (`campaignDurationSec`, `scoreTargetMultiplier`) plus regression coverage in `minigameConsolidationPhase6.test.ts`.
4. [x] Add Partner Wheel launch placeholder (skeleton manifest + launcher contract only, no multiplayer).
   - **Session 2026-04-22 update:** added `partner-wheel` skeleton manifest/component, registered it in `islandRunMinigameManifests.ts`, and added `resolveCompanionFeastEventMinigame()` + regression coverage in `minigameConsolidationPhase6.test.ts`.
5. [ ] Wire event-run reward routing so completion emits reward-bar progress + active-event sticker fragments through engine.

**Phase 6 next actionable TODO (refined):**
1. [x] Add an engine-level completion hook (`recordEventMinigameCompletion`) so event mini-game runs contribute reward-bar progress through a single canonical path.
   - **Session 2026-04-22 update:** `event_minigame_complete` progress source + engine helper shipped with regression coverage in `minigameConsolidationPhase6.test.ts`.
2. [x] Wire the event panel + minigame launcher completion callback to call the new engine hook for all four event minigames.
   - **Session 2026-04-22 update:** added shared completion guard `resolveEventMinigameCompletionId(...)` and launcher callback wiring in `IslandRunBoardPrototype.tsx` so completed `timed_event` runs (`task_tower`, `lucky_spin`, `shooter_blitz`, `partner_wheel`) now funnel through `recordEventMinigameCompletion`.
3. [x] Ensure event-completion UI path applies reward-bar claim payouts (including sticker fragments) from the engine-owned state snapshot.
   - **Session 2026-04-22 update:** completed timed-event minigame runs now execute immediate reward-bar cascade claim handling from the engine-owned snapshot.

**Phase 6 immediate TODO order (tightened after completion-hook wiring):**
1. [x] Wire active-event panel launch actions so all event entries set `activeLaunchedMinigameSource = 'timed_event'` consistently.
   - **Session 2026-04-22 update:** Island Run timed-event launcher button now routes through event-specific resolver contracts (`feeding_frenzy`, `lucky_spin`, `space_excavator`, `companion_feast`) and sets `activeLaunchedMinigameSource = 'timed_event'` before opening the shared minigame launcher.
2. [x] Route event completion UI through reward-bar claim handling (`claimIslandRunContractV2RewardBar`) so sticker-fragment payouts show immediately after completed runs.
   - **Session 2026-04-22 update:** shared reward-bar claim cascade helper now runs on completed timed-event launcher flows in `IslandRunBoardPrototype.tsx`, so event completions can immediately materialize reward-bar payouts.
3. [x] Add integration tests that launch each event surface and assert end-to-end reward-bar + sticker inventory updates from launcher completion.
   - **Session 2026-04-22 update:** added four canonical event-path integration tests in `minigameConsolidationPhase6.test.ts` (Feeding Frenzy, Lucky Spin, Space Excavator, Companion Feast) covering resolver → completion-id guard → reward-bar claim handoff.

**Phase 6 next-up queue (tightened for implementation focus):**
1. [x] Implement event-completion reward-claim handoff in UI (`claimIslandRunContractV2RewardBar` on completed timed-event run path).
   - **Session 2026-04-22 update:** timed-event minigame completion now routes through shared reward-bar cascade claim handling in `IslandRunBoardPrototype`, so completed event runs can immediately surface reward-bar payouts (including sticker fragment claims) without a separate manual claim tap.
2. [x] Add one integration test per canonical event launcher path to validate reward-bar and sticker updates after completion.
   - **Session 2026-04-22 update:** shipped one integration test per canonical event launcher path in `minigameConsolidationPhase6.test.ts`, validating reward-bar claimability + payout emission + sticker-state continuity after completion handoff.

### Phase 7 — Monetization
- [x] `src/services/minigameTicketStore.ts` — Stripe checkout wrapper, mirrors dice Stripe flow.
  - **Session 2026-04-22 update:** added `initiateMinigameTicketCheckout(...)` + event-to-SKU resolver scaffolding in `src/services/minigameTicketStore.ts` (Edge Function contract: `create-checkout-session-minigame-ticket`).
- [ ] Placeholder Stripe URLs in config (user will paste).
- [ ] Webhook handler grants `minigameTicketsByEvent` balance.
- [ ] UI entry points: "Buy tickets" button in active-event panel + Today's Offer container.

**Phase 7 execution queue (refined 2026-04-22):**
1. [x] Land `minigameTicketStore` checkout wrapper + canonical SKU routing helper.
2. [ ] Add config placeholders for per-event ticket checkout URLs/SKUs (left blank for user-provided Stripe values).
3. [ ] Extend `stripe-webhook` to grant `minigameTicketsByEvent` by purchased SKU.
4. [ ] Wire UI launch points (active-event panel + Today's Offer) to `initiateMinigameTicketCheckout`.

### Phase 8 — Polish & balance
- [ ] Tune ticket grant rates, event durations (confirm 8h/24h/2d/4d hold up in practice), milestone ladders.
- [ ] Visual polish per island for Shooter Blitz.
- [ ] Per-event audio theme.
- [ ] Final sticker artwork.

---

## 13. What the next RP ships (Phase 1 scope, concretely)

The first shippable PR from this plan is intentionally small, low-risk, and inert:

1. Delete Wheel of Wins.
2. Add `MinigameManifest` type + `index.ts` manifest files to the 3 surviving games.
3. Register all manifests in the registry (lazy-loaded) but don't launch them from anywhere new.
4. Add the two new `MysteryStopContentKind` variants gated behind flags (flags off → no behavior change).
5. Add the Supabase migration `0231_add_minigame_tickets_by_event.sql` + hydrate select-list update.
6. Add feature flags (all off).
7. Unit tests for the above.

No runtime behavior changes for the user. Foundation for Phases 2–8.

---

## 14. Second Pass Restart Plan (2026-04-23)

Reason for second pass: workflow drift caused multiple items to be marked complete before they were fully production-done. This section is now the canonical handoff queue for follow-up agent sessions.

### 14.1 Operating rules for second pass
- Treat every original phase item as **needs re-validation**, including previously checked items.
- Do not mark an item done in second pass unless both are true:
  1. Code path exists and is wired in runtime entry points.
  2. Focused validation evidence (test and/or manual QA note) is recorded.
- Keep updates additive in this section so future sessions can continue from the last known state.

### 14.2 Second pass checklist (reset)

#### SP1 — Monetization config hardening (Phase 7 alignment)
- [x] Add explicit placeholder config keys for per-event minigame ticket pricing/SKU wiring so Stripe values can be pasted later without code edits.
  - **Session 2026-04-23 update:** added blank env placeholders in `.env.example` for generic + per-event minigame ticket Stripe price IDs.
- [x] Build/land `create-checkout-session-minigame-ticket` edge function contract and validate end-to-end invocation from `initiateMinigameTicketCheckout`.
  - **Session 2026-04-23 update:** implemented `supabase/functions/create-checkout-session-minigame-ticket/index.ts` with request validation (`sku_id` + optional `event_id`), SKU↔env price mapping, and Stripe checkout metadata for future webhook fulfillment; validated type-safe client invocation path via `npm run build`.
- [x] Extend Stripe webhook fulfillment to grant `minigameTicketsByEvent` by purchased SKU.
  - **Session 2026-04-23 update:** wired `checkout.session.completed` handling for `product_type=minigame_ticket_pack` in `stripe-webhook`, including session-level dedupe and SKU→event resolution; added atomic RPC migration `increment_user_minigame_tickets_by_event` to upsert/increment `island_run_runtime_state.minigame_tickets_by_event`.
- [x] Wire UI buy-ticket entry points (active-event panel + Today's Offer) to the checkout wrapper.
  - **Session 2026-04-23 update:** wired `initiateMinigameTicketCheckout` into (1) Island Run reward-bar details modal (`Buy Tickets` in active event panel context) with event-aware SKU routing + telemetry/error handling, and (2) Today's Offer modal `Buy` CTA with active-event fallback to generic SKU.

#### SP2 — Phase-by-phase revalidation queue
- [x] Re-audit Phase 1 foundations (registry, manifests, feature flags, mystery variants, migration/hydrate select).
  - **Session 2026-04-23 update:** completed second-pass revalidation for Phase 1 foundations. Verified code paths in runtime:
    - registry/manifest wiring (`ALL_MINIGAME_MANIFESTS`, `registerAllMinigameManifests`, runtime `getMinigame` lookups from launcher path);
    - feature flags default-off contract in `islandRunFeatureFlags`;
    - mystery variant gating for `task_tower` / `vision_quest` in `generateIslandStopPlan`;
    - migration `0231_add_minigame_tickets_by_event.sql` present;
    - runtime hydration select-list includes `minigame_tickets_by_event`.
    Added regression coverage in `minigameConsolidationPhase1.test.ts` for manifest uniqueness/presence, idempotent registry registration, and hydration select-list column inclusion. Validation evidence: `npm run test:island-run` and `npm run build` both passed.
- [ ] Re-audit Phase 2 Today's Offer + Daily Spin unification in runtime UX.
- [ ] Re-audit Phase 3 engine ownership (rotation/progress/milestones/telemetry paths).
- [ ] Re-audit Phase 4 Shooter boss rollout readiness and remaining manual QA + flag flip.
- [ ] Re-audit Phase 5 mystery manual rotation QA and flag flip.
- [ ] Re-audit Phase 6 event mini-game completion-to-reward/sticker end-to-end path.
- [ ] Re-audit Phase 8 polish/balance backlog and split into shippable PR chunks.

### 14.3 Next session starting point
- Continue with **SP2 task 2** (re-audit Phase 2 Today's Offer + Daily Spin unification in runtime UX), and keep all second-pass status updates in this section with concrete test + manual QA notes.
