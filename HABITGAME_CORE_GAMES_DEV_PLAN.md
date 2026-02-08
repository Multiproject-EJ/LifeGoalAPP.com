# DEVPLAN — Lucky Roll & HabitGame Core Games System
Version: 1.0 (Final)
Status: Living Document
Parent System: HabitGame Daily Treats → Middle Card Slot

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

## Phase 0 — Shared Infrastructure (THIS PHASE)
- gameRewards.ts, gameCurrencies.ts, economy.ts extensions, habitGames.ts types, event logging scaffold

## Phase 1 — Lucky Roll Core (board + dice + persist + App.tsx wiring)
## Phase 2 — Lucky Roll Effects (tiles + mini-game stubs + near-miss + celebrations)
## Phase 3 — Task Tower (grid + blocks + completion + line clears + entry/exit)
## Phase 4 — Pomodoro Sprint (timer + ritual + early exit + integrity + rewards)
## Phase 5 — Vision Quest (space + gallery + reflections + identity + multipliers + themes)
## Phase 6 — Wheel of Wins (wheel + spin + weights + cooldowns + entry/exit)
## Phase 7 — V1 Integrations (life wheel zones + profile strength + goal priority + journal flavor)
## Phase 8 — Metrics & Polish (logging + balance + health checks + a11y + mobile)

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
