# DEVPLAN — Lucky Roll & HabitGame Core Games System

> ⚠️ **Status update (2026-02-27):** Legacy framing.
> The active canonical direction for the main game loop is now Island Run:
> **[`docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md`](./docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md)**.
>
> Lucky Roll-first assumptions and Pomodoro mini-game assumptions in this file are superseded where they conflict.

Version: 1.0 (Final)
Status: Living Document
Parent System: HabitGame Daily Treats → Middle Card Slot

**Related Documentation:**
- [HABITGAME_ACCESS_FLOW.md](./HABITGAME_ACCESS_FLOW.md) — User access patterns and navigation hierarchy

---

## HOW TO USE THIS DOCUMENT

This is the **master build plan** for all five core games and their
integrations with the existing HabitGame app.

- **Section A** = System-level architecture (shared across all games)
- **Section B** = Lucky Roll (the hub game)
- **Section C** = Task Tower (the cleaner)
- **Section D** = Pomodoro Sprint (the ritual)
- **Section E** = Vision Quest Board (the anchor)
- **Section F** = Wheel of Wins (the spice)
- **Section G** = V1 Integrations (cross-feature connections)
- **Section H** = V2 Future Integrations (scaffolded, not built)
- **Section I** = Build order & phasing
- **Section J** = Decision register
- **Section K** = Change log & rollback

**Rules:**
- No code is written until this plan is reviewed
- Each slice follows the AI Operating Contract (Scan → Plan → Implement → Verify → Document → Pause)
- One task = 30–90 minutes
- If unsure → STOP & ASK

---

# SECTION A — SYSTEM ARCHITECTURE

## A.1 Game Roster & Roles

| # | Game | Primary Emotion | Role | Frequency |
|---|------|----------------|------|-----------|
| 1 | Lucky Roll | Anticipation | Hub, momentum, navigation | Multiple/day |
| 2 | Task Tower | Relief | Execution, clarity | Short bursts |
| 3 | Pomodoro Sprint | Pride | Deep focus, earned reward | 1–3/day |
| 4 | Vision Quest Board | Hope | Identity, long-term anchor | Occasional |
| 5 | Wheel of Wins | Excitement | Surprise, amplifier | ~1/week |

## A.2 Canonical Game Loop

1. User completes habits/tasks/focus
2. User earns hearts, coins, or boosts
3. User opens Daily Treats → Middle Card → Lucky Roll
4. Lucky Roll moves player forward, triggers events or mini-games
5. Mini-games return rewards, progress, emotional payoff
6. User exits feeling progress, motivation, curiosity about next session

No game exists outside this loop. Lucky Roll is the ONE board.

## A.3 Currency Architecture

### A.3.1 Currency Types

| Currency | Symbol | Earned From | Spent On | Scarcity |
|----------|--------|-------------|----------|----------|
| Hearts ❤️ | hearts | Daily treats login, habits, achievements | Dice packs | Medium |
| Dice 🎲 | dice | Dice packs | Lucky Roll rolls | High |
| Coins 🪙 | gold | Tiles, mini-games, XP conversion | Shop, cosmetics | Medium |
| Game Tokens 🎟️ | game_tokens | Dice packs, tiles | Mini-game entry | High |
| XP ⭐ | xp | Everything | Leveling | Low scarcity |

### A.3.2 Hearts → Dice Pack Economy

| Pack | Hearts | Dice | Game Tokens | Notes |
|------|--------|------|-------------|-------|
| Starter | 2 ❤️ | 15 🎲 | 3–5 🎟️ | Casual session |
| Value | 4 ❤️ | 35 🎲 | 8–12 🎟️ | Solid session |
| Power | 6 ❤️ | 50 🎲 | 15–20 🎟️ | Best value |
| Mystery | 3 ❤️ | 5–750 🎲 | 1–500 🎟️ | Blind box with smart distribution |

### A.3.3 Mystery Box Smart Distribution

Dice: 5–15 (40%), 16–35 (30%), 36–75 (15%), 76–150 (8%), 151–350 (4%), 351–750 (3%)

Smart layer: First 3 boxes guaranteed ≥ decent. Returning users (7+ days away) guaranteed ≥ good.

## A.4 Reward Priority Hierarchy (Constitutional)

1. Meaning (Vision Quest)
2. Pride (Pomodoro Sprint)
3. Relief (Task Tower)
4. Anticipation (Lucky Roll)
5. Excitement (Wheel of Wins)

If excitement outranks meaning → the app becomes hollow.

## A.5 Shared Technical Systems

### A.5.1 Reward Service — Single source of truth via src/services/gameRewards.ts
### A.5.2 Time & Cooldowns — Deterministic, global daily resets, no bypasses
### A.5.3 Sound Identity — No reused sounds between games
### A.5.4 State — localStorage Phase 1, Supabase Phase 2

---

# SECTION B — LUCKY ROLL (The Hub)

Core Fantasy: "I'm moving through my life map, step by step."
Primary Emotion: Anticipation

## B.1 Board: 30-tile snake path, mobile-first, 5 per row, wraps at 30

## B.2 Tile Types: Neutral (30%), Gain Coins (20%), Lose Coins (10%), Bonus Dice (10%), Game Token (10%), Mini-Game Trigger (10%), Mystery (5%), Jackpot (5%)

## B.3 Mini-Game Tiles: 7,22=Task Tower, 12,27=Pomodoro, 15=Vision Quest, 20=Wheel of Wins

## B.4 Dice: d6, crypto RNG, 800ms animation, finite resource from packs

## B.5 Near-Miss: Glow + shimmer when passing within 1 tile of Jackpot or Mini-Game

## B.6 Visual: Warm wood, amber, gold. Dice tumble, gentle clicks.

## B.7 Slices: 1.1 Board prototype, 1.2 Dice economy, 1.3 Laps, 2.1 Tile effects, 2.2 Mini-game triggers, 3.1 Near-miss, 3.2 Celebrations, 4.1 Metrics

---

# SECTION C — TASK TOWER (The Cleaner)

Core Fantasy: "I'm clearing my mental clutter."
Primary Emotion: Relief. If stressful → redesign.

## C.1 Grid: 5 columns, tasks from Actions become blocks (MUST DO=wide red, NICE TO DO=medium green, PROJECT=small yellow)

## C.2 Mechanic: Complete task → block removed → gravity → full line clear → reward

## C.3 Rewards: Single +15🪙, Double +40🪙, Triple +80🪙+1🎲, Full clear +150🪙+3🎲. Goal-linked +50% bonus.

## C.4 Visual: Clean slate, mint. Soft thuds, relief chime.

## C.5 Slices: 1.1 Grid, 1.2 Task mapping, 2.1 Completion, 2.2 Line clears, 3.1 Entry/exit

---

# SECTION D — POMODORO SPRINT (The Ritual)

Core Fantasy: "I am entering focus mode."
Primary Emotion: Pride. A ritual, not a mini-game.

## D.1 Flow: Name focus → choose duration → confirm → countdown → dark cinematic timer → completion card

## D.2 Timer: Date.now() anchor. Auto-pause on background. Shows honest time. Stale auto-abandon 24h.

## D.3 Durations: 15min=30🪙+1🎲, 25min=60🪙+2🎲, 45min=120🪙+4🎲 (superlinear)

## D.4 Streak: 1.0× (d1) → 1.2× (d3) → 1.5× (d7) → 2.0× (d30). Early exit: no streak break.

## D.5 Visual: Near-black, purple accents. Warm bell. No ticking.

## D.6 Slices: 1.1 Timer, 1.2 Ritual, 2.1 Early exit, 2.2 Timer integrity, 3.1 Rewards, 3.2 History

## D.7 Mobile launcher integration contract (REQUIRED)

This section defines the non-negotiable behavior for the existing circular mobile launcher button (currently used for the player profile popup menu).

### D.7.1 State model

- **Idle (default):** circular button shows the existing player profile launcher icon and opens player profile menu on tap.
- **Active timer:** while any Pomodoro Sprint timer is running, the same circular button transforms into a **clock countdown surface** (MM:SS or short remaining format).
- **Alert mode (timer completed, not yet acknowledged):** circular button stays in timer/alert presentation until user opens timer and explicitly stops/acknowledges it.
- **Stopped/reset:** after user stops/acknowledges timer in timer UI, circular button reverts to normal player profile launcher behavior.

### D.7.2 Tap behavior contract

- Tapping the circular button in **Idle** opens the player profile popup menu (unchanged behavior).
- Tapping the circular button in **Active timer** opens the timer experience (not profile menu).
- Tapping the circular button in **Alert mode** opens the timer experience so user can stop/acknowledge completion.
- Once stop/acknowledge action is completed in timer UI, next tap on the circular button opens player profile popup menu again.

### D.7.3 Multi-session persistence requirements

- Button state must restore correctly after app reload/background/foreground using the timer source of truth.
- If timer elapsed while app was backgrounded, launcher must restore directly into Alert mode on return.
- No stale timer UI beyond the 24h stale-abandon rule in D.2; stale sessions must restore launcher to Idle.

### D.7.4 Implementation slices for AI handoff (30–90 min each)

1. **Slice D7.1 — State plumbing**
   - Add/verify a single selector exposing timer launcher state: `idle | active | alert`.
   - Add derived remaining-time label formatter for launcher rendering.
2. **Slice D7.2 — Launcher visual transform**
   - Update circular launcher component to render profile icon in `idle` and clock/countdown in `active/alert`.
   - Preserve tap target size and accessibility labels per state.
3. **Slice D7.3 — Launcher routing behavior**
   - Route tap to profile menu only in `idle`.
   - Route tap to timer entry point in `active/alert`.
4. **Slice D7.4 — Completion acknowledgement flow**
   - Ensure timer stop/acknowledge event clears alert state.
   - Confirm launcher immediately reverts to profile launcher after stop.
5. **Slice D7.5 — Persistence + background recovery**
   - Validate reload/background/foreground transitions for all three states.
   - Validate elapsed-in-background transition into alert state.
6. **Slice D7.6 — QA + regression lock**
   - Add focused test coverage for launcher state transitions and tap routing.
   - Run manual mobile QA checklist and capture evidence in changelog.

### D.7.5 Acceptance criteria (must all pass)

- [ ] With no timer active, circular launcher opens player profile menu.
- [ ] With timer running, circular launcher shows countdown clock and opens timer on tap.
- [ ] When countdown completes, circular launcher remains timer/alert style until user acknowledges in timer UI.
- [ ] After user stops/acknowledges timer, circular launcher reverts to profile menu launcher.
- [ ] After app reload/background restore, launcher state matches real timer state.

### D.7.6 Agent handoff log template (append-only)

Use this format after each session so another AI can continue without re-discovery:

```
Date:
Agent:
Slice(s):
What changed:
Evidence (tests/manual):
Open issues / risks:
Next recommended slice:
```

### D.8 Next-session execution checklist (build this next)

This checklist translates D.7 into concrete, restart-safe implementation sessions so an AI agent can complete one chunk per session and pause safely.

#### D.8.1 Session order (strict)

1. **Session 1 — Discovery + contract mapping (no behavior change)**
   - Locate timer source-of-truth + launcher component ownership.
   - Document exact files/functions to touch in the handoff log.
   - Confirm whether launcher lives in `QuickActionsFAB` and where timer entry should route.
2. **Session 2 — Timer launcher state selector**
   - Introduce `idle | active | alert` derived selector from persisted timer state.
   - Unit test selector transitions for running, completed-unacknowledged, acknowledged/stopped, stale (>24h).
3. **Session 3 — Circular button visual swap**
   - Render profile icon for `idle`.
   - Render clock + countdown label for `active`.
   - Render alert clock style for `alert`.
4. **Session 4 — Tap routing + acknowledgement reset**
   - `idle` tap opens player profile popup.
   - `active/alert` tap opens timer UI.
   - Stop/ack in timer UI must clear launcher alert state immediately.
5. **Session 5 — Background/reload recovery hardening**
   - Validate transitions across reload/background/foreground.
   - Validate elapsed-in-background enters `alert`.
   - Validate stale-abandon returns to `idle`.
6. **Session 6 — Regression coverage + evidence capture**
   - Add tests and manual QA evidence for all acceptance criteria.
   - Append completion notes to handoff log with rollback notes.

#### D.8.2 Definition of done per session

A session is only complete if all are true:
- Code/build/tests pass for touched scope.
- D.7.6 handoff log entry is appended with evidence.
- Next session start point is explicit (single recommended slice).
- If partial, mark exactly what is incomplete and why.

#### D.8.3 Implementation file map (verify in Session 1)

- ✅ Session 1 verification: launcher ownership is the mobile footer **status card** (`src/components/MobileFooterNav.tsx`), wired from `src/App.tsx` via `status`, `onStatusClick`, and `onStatusHoldToggle`.
- Timer launcher contract in D.7 targets the **Actions timer surface** (Tasks / Projects / Timer flow) — not the Pomodoro Sprint mini-game modal.
- Current timer route is `src/features/timer/TimerTab.tsx` via `src/App.tsx` (`activeWorkspaceNav='timer'`) and entry affordances in `src/features/actions/ActionsTab.tsx` (`onNavigateToTimer`).
- `src/features/gamification/games/pomodoro-sprint/*` can stay as reward/minigame logic, but should not be treated as the launcher source-of-truth for D.7 behavior.
- Expected app wiring entry points remain `src/App.tsx` + mobile footer props and Actions/Timer navigation handlers.

> If actual ownership differs, Session 1 must update this file map before any behavior changes.

#### D.8.4 QA scenarios (minimum manual matrix)

- Start timer → launcher turns into clock countdown.
- While timer is running, tapping launcher opens timer (not profile menu).
- Let timer complete without acknowledging → launcher remains in alert clock mode.
- Tap alert launcher → timer opens, user stops/acknowledges → launcher returns to profile icon/menu.
- Force reload during running timer → launcher returns as active countdown.
- Background app until timer elapsed → foreground returns launcher as alert state.
- Simulate stale timer data older than 24h → launcher returns to idle profile state.

#### D.8.5 Session handoff log (append-only)

Date: 2026-02-15
Agent: GPT-5.2-Codex
Slice(s): Session 1 — Discovery + contract mapping (no behavior change)
What changed: Verified actual launcher ownership and wiring, then updated D.8.3 implementation map to reflect real files/functions (`MobileFooterNav` status-card path instead of `QuickActionsFAB`). Confirmed Pomodoro source-of-truth remains inside `PomodoroSprint` local session state and that `TimerTab` is still placeholder-only.
Evidence (tests/manual): Code inspection in `src/App.tsx`, `src/components/MobileFooterNav.tsx`, `src/features/gamification/games/pomodoro-sprint/PomodoroSprint.tsx`, `src/features/timer/TimerTab.tsx`. Build check passed (`npm run build`).
Open issues / risks: No shared persisted timer store exists yet for cross-surface launcher state (`idle|active|alert`), so Session 2 must introduce derived selector state before UI behavior changes.
Next recommended slice: Session 2 — Timer launcher state selector (`idle | active | alert`) + unit tests for running/completed-unacknowledged/acknowledged/stale (>24h).


Date: 2026-02-15
Agent: GPT-5.2-Codex
Slice(s): Session 1 follow-up — scope clarification fix
What changed: Corrected Session 1 mapping language to explicitly scope D.7 launcher work to the Actions-tab Timer flow (Tasks/Projects/Timer) instead of Pomodoro Sprint mini-game internals. Updated D.8.3 file map bullets accordingly.
Evidence (tests/manual): Code inspection in `src/App.tsx` (timer route + nav), `src/features/actions/ActionsTab.tsx` (timer launcher buttons), and `src/features/timer/TimerTab.tsx` (current timer surface). Build check passed (`npm run build`).
Open issues / risks: TimerTab remains placeholder-level UI; Session 2 should define selector logic in shared timer state and avoid coupling launcher behavior to mini-game modal state.
Next recommended slice: Session 2 — Timer launcher state selector (`idle | active | alert`) for Actions Timer source, with stale (>24h) handling tests.


---

# SECTION E — VISION QUEST (The Anchor)

Core Fantasy: "I'm shaping the person I want to become."
Primary Emotion: Hope. If it feels fun → wrong job.

## E.1 Reads from existing VisionBoard data. Never writes. Adds reflection layer.

## E.2 Activities: Curated gallery, reflection prompts (1/visit), identity statements, affirmation seeds

## E.3 Passive Influence: +5% coins (weekly reflection), +10% XP (≥3 identity statements), board theme unlocks, tile flavor text from affirmations

## E.4 Themes (Vision Quest exclusive): Ocean (5 images), Forest (3 statements), Cosmic (10 reflections), Golden Hour (all 8 life wheel areas), Summit (20 images + 5 affirmations)

## E.5 Visual: Cosmic purple, starfield. Ambient pad. Silence is valid.

## E.6 Slices: 1.1 Space, 1.2 Gallery, 2.1 Prompts, 2.2 Identity, 2.3 Affirmations, 3.1 Multipliers, 3.2 Themes, 3.3 Flavor text, 4.1 Entry/exit

---

# SECTION F — WHEEL OF WINS (The Spice)

Core Fantasy: "I might get something nice."
Primary Emotion: Excitement. Spice, not food. ~1 spin/week.

## F.1 Separate from Daily Spin Wheel. Different access (Lucky Roll token), tier, visual.

## F.2 Prizes (no empties): Small Coins 30%, Medium Coins 20%, Bonus Dice 18%, Temp Boost 12%, Cosmetic Shard 8%, Big Coins 6%, Dice Pack 4%, Rare Cosmetic 2%

## F.3 Max reward < Pomodoro reward. Always. Effort > luck.

## F.4 Scarcity: 🎡 tokens from gameplay only, cannot purchase, max 5 stored, ~1/week expected

## F.5 Visual: Deep plum, gold luxe. Smooth spin. Warm sparkle.

## F.6 Reuses buildWheelSegments() math. Forks SpinWheel.tsx visuals.

## F.7 Slices: 1.1 Wheel, 1.2 Spin, 2.1 Weights, 2.2 Cooldowns, 3.1 Entry/exit

---

# SECTION G — V1 INTEGRATIONS

## G.1 Life Wheel → Board Zones: 30 tiles divided into 8 zones by life wheel area. Strong areas +10% bonus. Weak areas get growth opportunity tiles (gentle nudge, never punishment, only after positive actions).

## G.2 Profile Strength → Board Richness: Low profile = more guidance tiles. Medium = standard. High = bonus tiles, richer flavor text.

## G.3 Goals → Task Tower Priority: Goal-linked tasks get gold border, +50% line clear bonus, "Goal Momentum" celebration on full goal clear.

## G.4 Journal → Board Flavor Text: Neutral tiles display user's own journal snippets. Falls back to affirmations, then generic text.

---

# SECTION H — V2 FUTURE INTEGRATIONS

## H.1 AI Insight Tiles: 💬 tiles with contextual AI messages from user data. Max 2/lap. Opt-in.
## H.2 Breathing → Pomodoro Warm-Up: Optional 2-min breathing before sprint. +5% bonus.
## H.3 Board Landmarks: Permanent achievement markers on board across laps.
## H.4 Cross-Game Combos: Morning Ritual, Full Spectrum, Deep Diver, Vision Keeper, Clean Slate, Breathing Bridge.
## H.5 Identity → Board Personality: Board theme adapts to user identity profile.
## H.6 Monthly Arcs: Each month emphasizes a life wheel area with zone bonuses.

V1 scaffolds event logging for all V2 features.

---

# SECTION I — BUILD ORDER

## Phase 0 — Shared Infrastructure (COMPLETE)
- gameRewards.ts, gameCurrencies.ts, economy.ts extensions, habitGames.ts types, event logging scaffold

## Phase 1 — Lucky Roll Core (COMPLETE)
## Phase 2 — Lucky Roll Effects (COMPLETE)
## Phase 3 — Task Tower (COMPLETE)
## Phase 4 — Pomodoro Sprint (COMPLETE)
## Phase 5 — Vision Quest (COMPLETE)
## Phase 6 — Wheel of Wins (COMPLETE)
## Phase 7 — V1 Integrations (COMPLETE)
## Phase 8 — Metrics & Polish (COMPLETE)

## Phase 9 — Level Worlds Campaign Mode (IN PROGRESS)
- NEW: Discrete level-based progression system wrapping Lucky Roll
- Foundation: Types, state, generator, rewards, hooks, components
- Integration: Wire into Lucky Roll as "Campaign" mode
- See [LEVEL_WORLDS_DEV_PLAN.md](./LEVEL_WORLDS_DEV_PLAN.md) for full spec

---

# SECTION J — DECISION REGISTER

| Date | Decision | Reason |
|------|----------|--------|
| 2026-02-08 | Lucky Roll replaces league placeholder | All mini-games through hub |
| 2026-02-08 | Snake path board | Mobile-first vertical scroll |
| 2026-02-08 | Hearts = master ticket → dice packs | Meaningful purchase decision |
| 2026-02-08 | Game tokens in packs | Complete session bundles |
| 2026-02-08 | Mystery box 3❤️, 5–750 dice | Stories + smart onboarding |
| 2026-02-08 | Pity timer (first 3 + returning) | Generous, not manipulative |
| 2026-02-08 | Task Tower maps to Actions | No duplicate systems |
| 2026-02-08 | Pomodoro Date.now() anchor | Survives backgrounding |
| 2026-02-08 | Auto-pause on background | No-shame philosophy |
| 2026-02-08 | Honest time display | Transparent |
| 2026-02-08 | Early exit never breaks streaks | No punishment |
| 2026-02-08 | Superlinear duration rewards | Incentivizes commitment |
| 2026-02-08 | Vision Quest reads VisionBoard only | No data conflicts |
| 2026-02-08 | Themes Vision Quest exclusive | Meaning earns cosmetics |
| 2026-02-08 | Max 1 prompt per visit | No farming meaning |
| 2026-02-08 | Wheel separate from Daily Spin | Different gates and roles |
| 2026-02-08 | No empty Wheel segments | Always something |
| 2026-02-08 | 🎡 tokens not purchasable | Effort-gated only |
| 2026-02-08 | Max Wheel < Pomodoro reward | Effort > luck |
| 2026-02-08 | Life Wheel soft influence | Nudge, never punish |
| 2026-02-08 | Growth prompts after positives | Right timing |
| 2026-02-08 | Profile strength → richness | Natural progression |
| 2026-02-08 | AI tiles deferred to V2 | Needs careful testing |
| 2026-02-08 | Combos scaffold V1, activate V2 | Log now, reward later |
| 2026-02-08 | Dice packs 2❤️=15🎲, 4❤️=35🎲, 6❤️=50🎲 | Director pricing |

---

# SECTION K — CHANGE LOG & ROLLBACK

### 2026-02-08
- V1.0 plan created. All 5 games, 4 V1 integrations, 6 V2 scaffolds, 26 decisions.
- Next: Phase 0 shared infrastructure.

### Rollback
- Restore showLeaguePlaceholder in App.tsx
- Remove game files from daily-treats/
- Remove new economy types
- Remove gameRewards.ts and gameCurrencies.ts
- Hearts inventory untouched. VisionBoard data untouched.

---

# APPENDIX — SYSTEM HEALTH CHECKS

Before any release:
- [ ] One game dominating playtime?
- [ ] Users farming randomness?
- [ ] Rewards disconnected from effort?
- [ ] Lucky Roll still central?
- [ ] Each game in its emotional lane?
- [ ] Pomodoro always best rewards?
- [ ] Wheel rare enough?
- [ ] Vision Quest non-transactional?
- [ ] Task Tower non-stressful?
- [ ] Board zones nudging, not punishing?

If any fails → rebalance before shipping.
