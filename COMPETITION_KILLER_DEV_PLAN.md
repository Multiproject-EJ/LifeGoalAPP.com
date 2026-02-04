# Competition Killer Development Plan

> **Purpose**: A living, step-by-step product development plan designed so any AI (or human) can pick up **one step at a time**, document what’s done, and continue with full context.  
> **Status**: 🟡 Draft v1 (ready for iteration)  
> **Owner**: Founder + AI collaborators  
> **Last updated**: 2025-02-14

---

## 0) How to Use This Document (Mandatory)

**Before starting any work**
1. Pick **one step** from the roadmap below.
2. Add a short entry to the **Progress Log** (Section 12) with:
   - Date
   - Step worked on
   - What changed
   - What’s next

**After finishing a step**
1. Mark that step as ✅ **Done**.
2. Add a summary in the **Progress Log**.
3. Promote any new insights into **Open Questions** or **Decisions**.

> **Rule**: One step per session. Keep changes atomic and documented.

---

## 1) Vision (One-Liner)

**“A personal growth game where rewards are user-defined but system-governed, and your identity evolves through consistent action.”**

---

## 2) App Context (What Already Exists)

This plan must align with the **current product** and **technical reality** of LifeGoalAPP.

### Current Platform & Architecture
- **Mobile-first PWA** built with **React + Vite**, with a desktop expansion view.【F:README.md†L1-L4】【F:README.md†L114-L133】
- **Supabase backend** for Auth, Postgres data, REST APIs, and Storage.【F:README.md†L139-L152】
- **Offline-ready** with service worker caching + Background Sync for writes.【F:README.md†L219-L224】
- **Push notifications** for habit reminders and check-in nudges.【F:README.md†L226-L233】
- **Glassmorphic design system** with light/dark themes and reusable components.【F:README.md†L46-L63】
- **Demo mode fallback** when Supabase keys aren’t configured (local data mirror).【F:README.md†L191-L207】

### Existing Product Surface Area
- **Goals + Habits** workspace
- **Daily habit tracker** with streak insights
- **Dashboard + Calendar** analytics
- **Vision Board**
- **Life Wheel check-ins**
- **Goal reflection journal** with confidence scoring
- **Gamification toggle** (XP, levels, achievements, streaks)【F:README.md†L75-L106】【F:README.md†L159-L217】

> **Implication**: The Competition Killer plan must **extend** these features rather than reset them.  
> Build as layers on the existing PWA, data model, and gamification toggles.

---

## 3) Mobile-First Product Rules (Non-Negotiable)

1. **Thumb-first UX**: primary actions must be reachable by thumb on a phone.
2. **No dense screens**: prefer progressive disclosure and step-by-step flows.
3. **Fast entry**: Day 0 flow should be doable in <3 minutes on mobile.
4. **Micro-feedback everywhere**: haptics, motion, and micro-rewards reinforce completion.
5. **Offline tolerance**: every core action must be usable offline and sync later.
6. **Single-focus screens**: one primary goal per screen, secondary actions collapsed.
7. **Readable at a glance**: avoid long paragraphs; use 1–2 line summaries.
8. **One-hand safe zones**: keep primary CTAs in bottom 40% of the screen.

---

## 4) Competitive “Best-of Theft Map”

This is our extraction map: steal proven mechanics, then recombine them.

### 🧙 Habitica — Keep
- **User-defined rewards** as a first-class system.
- **Immediate consequence loop** (miss = loss, do = gain).
- **Social accountability** via shared stakes.

### 🐣 Finch — Keep
- **Emotional attachment** to a companion.
- **Ultra-low friction daily check-ins**.
- **Non-judgmental, self-care framing**.

### 🌲 Forest — Keep
- **Single-session commitment** (start → can’t quit without consequence).
- **Visual growth metaphor** (time = life).
- **Real-world meaning** (e.g., planting trees).

### 💥 SuperBetter — Keep
- **Challenge framing** (quests, not failure).
- **Power-ups for bad days**.
- **Resilience stat** (bounce-back, not just output).

### 💰 Beeminder — Keep
- **Real stakes** (loss aversion).
- **No ambiguity** in success/failure.
- **Commitment contracts**.

### 🧠 Todoist — Keep
- **Rock-solid core UX**.
- **Streak + karma system**.
- **Cross-platform trust**.

### 🧬 LifeRPG — Keep
- **XP-based life abstraction**.
- **Flexible stat system**.
- **No forced structure**.

---

## 5) The Perfect Hybrid System (North Star Goals)

### 🔁 Core Loop
- **Forest** → single-session commitment
- **Habitica** → immediate consequences
- **Finch** → emotional warmth

### 🎁 Rewards
- **Habitica** → user-defined rewards
- **Beeminder** → optional real stakes
- **NEW** → AI-generated, evolving rewards

### 🌱 Progression
- **LifeRPG** → stats & levels
- **SuperBetter** → resilience & recovery
- **Zen Garden / Wisdom Tree** → long-term identity arc

### 👥 Social
- **Habitica** → shared consequences
- **Events / seasons** → Duolingo-style community arcs

### 🧠 AI Layer (Unfair Advantage)
- Adaptive difficulty
- Reward pacing tuning
- Motivation style matching
- “Bad week” detection + soft-landing mode

---

## 6) Product Pillars (Non-Negotiables)

1. **User-defined rewards are a core primitive.**
2. **Immediate feedback** must exist for every action.
3. **Warm, non-judgmental tone** even when enforcing rules.
4. **Identity progression** > productivity stats.
5. **No overwhelm**: gradual expansion + optional depth.

---

## 7) System Specs (Core Artifacts)

### 7.1 Reward Engine Spec (System-Level)

**Core Principle**: Rewards are player-defined, but system-governed.  
Users choose what they want. The system controls when, how often, and at what cost.

#### Reward Object (First-Class Model)
```
Reward {
  id
  title
  description
  category            // Rest, Fun, Growth, Treat, Social, Meta
  cost {
    currency_type     // Gold, Tokens, Keys, Energy, RealMoney(optional)
    amount
  }
  unlock_conditions {
    min_level?
    stats_required?
    streak_required?
    time_locked?
  }
  cooldown {
    type              // none | soft | hard
    duration
  }
  satisfaction_weight // 1–5 (self-reported, later AI-adjusted)
  reward_type         // Instant | Session | Delayed | External
  visibility          // Private | Public | Party
}
```

#### Multi-Currency Economy (Avoid Burnout)
- **XP** → identity growth (levels, stats)
- **Energy** → daily action budget (soft cap)
- **Tokens** → earned only by consistency
- **Keys** → rare rewards / events / unlocks
- **Gold** → flexible, spendable, dopamine

> **Rule**: user-defined rewards **cannot** cost only Gold.  
They must sometimes require Tokens or Keys.

#### Reward Validation Rules (Anti–Self-Sabotage)
Examples:
- “You’ve taken this reward 3 times this week — want to raise its cost?”
- “This reward seems to reduce long-term progress. Keep it, but add a cooldown?”
- “This reward pairs well after focus sessions. Want to auto-suggest it then?”

#### Reward Evolution (New, Powerful)
Rewards **level up** with the user.  
Example:
- “Watch YouTube (10 min)”  
→ “Intentional Watch (with reflection)”  
→ “Creative Input Session”

---

### 7.2 7-Day Retention Loop

#### Day 0–1: First 5 Minutes (Critical)
1. Pick **one** life area  
2. Create **one** tiny habit  
3. Define **one** reward  
4. Complete habit → instant reward  

**Goal feeling**: “Oh… this already works.”  
No dashboards. No stats. No overwhelm.

#### Day 2: Familiarity & Safety
- Same habit, same reward  
- Add micro-visual growth (leaf, spark, tile)  
Prompt: “Same thing today — want to keep it easy?”

#### Day 3: First Choice Moment
Offer **one**:
- Add a second habit  
- Slightly upgrade the reward  
- Bank progress for a bigger reward

#### Day 4: Soft Social or Reflection
One gentle expansion:
- Reflection card (“What helped today?”)  
**OR** optional party / shared goal  
**OR** Zen Garden item unlock

#### Day 5: Progress Reveal
Show **identity**:
- “You are becoming more ___”  
- Stat change  
- Garden growth stage  

#### Day 6: First Miss (Planned)
Assume failure. System response:
- No punishment  
- Offer a **Power-Down Quest** (tiny win)  
- Resilience stat increases

#### Day 7: Weekly Closure Ritual
Weekly ceremony:
- What grew  
- What felt good  
- One reward unlocked  
- One thing released  
End with: “Want to keep this loop, or evolve it?”

---

### 7.3 North Star Mechanic: **The Identity Engine**

**Core idea**: You are not completing habits. You are becoming someone — and the system remembers.

#### Identity Vectors (Behind the Scenes)
- Discipline
- Care
- Courage
- Creativity
- Balance
- Resilience

#### User-Facing Reflections
Instead of raw numbers:
- “You show up even on low-energy days.”
- “You grow when pressure is gentle.”
- “Rewards after effort work best for you.”

#### What This Unlocks Over Time
- New reward archetypes  
- Different UI moods  
- Personalized quest styles  
- Personalized advice tone

> **Why it wins**: Compounds, feels personal, and makes churn emotionally expensive.

---

## 8) Reward Engine Execution Plan (AI-Ready)

> This section translates the vision into an execution spec that can be implemented **step-by-step**.

### 8.1 Goal
Implement a player-defined reward engine with a multi-currency economy, tied to a 7-day retention loop, powered by a rules-based Identity Engine.

**Non-goals (this phase)**
- No heavy social/party mechanics
- No inventory/gear RPG
- No enterprise/team features
- No full AI personalization (rules-based + hooks only)

### 8.2 Repo Discovery & Integration Points
**Agent tasks**
- Scan README, DEV-PLAN, Supabase schema, and UI routes.
- Identify where habits/tasks/check-ins are stored and rendered.
- Identify current currency/XP systems and how user state is stored.
- Capture UI entry points for mobile-first flows (onboarding, Today, rewards).
- Identify offline sync touchpoints (service worker, background sync, demo mode).

**Deliverable**
- `docs/reward-engine/ARCHITECTURE-NOTES.md` with:
  - Current tables and flows
  - Where to insert reward engine calls
  - UI entry points for onboarding + daily loop
  - Mobile-first constraints (navigation, CTA limits, micro-feedback)
  - Offline/data sync considerations

**Done when**
- Agent can point to exact files/routes/components to modify.

### 8.3 Data Model & Storage (Supabase)
**Minimum viable tables**
- `currencies` (user_id, gold, xp, energy, tokens, keys, timestamps)
- `rewards` (id, user_id, title, description, category, cost, cooldown, satisfaction_weight, visibility, timestamps)
- `reward_redemptions` (id, user_id, reward_id, cost, created_at)
- `habit_events` (id, user_id, event_type, entity_type, entity_id, deltas, created_at)
- `identity_vectors` (user_id, discipline, care, courage, creativity, balance, resilience, updated_at)

**Deliverables**
- `supabase/migrations/*_reward_engine.sql`
- Updated types/interfaces (TypeScript)
- RLS policies: users only read/write their own rows

**Done when**
- Migration applies cleanly
- CRUD works via simple test page or script

### 8.4 Economy Rules (Server-First)
**MVP earning rules**
- Completing a habit: +XP (small), +Gold (small), -Energy (small)
- Completing a focus session: +XP (medium), +Tokens (rare, consistency-based)
- Missing a habit: no punishment in MVP (optional later)
- Power-Down Quest within 24h: +Resilience, +tiny Gold

**Anti-farming**
- Tokens earned once per day (or per streak milestone)
- Keys only at milestones (Day 7 ritual, events)
- Energy resets daily (soft cap)

**Deliverable**
- `src/lib/economy.ts` (or equivalent) with:
  - `applyEvent(userState, event) -> newState + ledgerEntries`
  - `canEarnTokensToday(userState)`
  - `grantMilestoneRewards(userState, milestoneType)`

**Done when**
- Unit tests cover: complete habit, miss habit, redeem reward, token cap, energy reset

### 8.4.a AI Scanning Checklist (Before Any Code Change)
**Goal**: ensure the agent integrates cleanly with existing architecture, data flow, and UI patterns.

**Scan in this order**
1. **Data flow**: find Supabase client usage, demo-mode storage, and any existing gamification logic.
2. **UI routes**: locate onboarding, daily tracker, dashboard, and settings screens.
3. **State management**: find where user state is stored/derived (context, hooks, local storage).
4. **Offline handling**: locate service worker caching and Background Sync usage.
5. **Design system**: confirm component patterns for buttons, cards, modals, toasts.

**Deliverable**
- Add a short **Integration Notes** section to `docs/reward-engine/ARCHITECTURE-NOTES.md` describing:
  - Best insertion points (files + functions)
  - Minimal surface changes (avoid refactors)
  - Any conflicts with demo mode or offline sync

### 8.5 Reward Engine (Core Mechanics)
**Create Reward flow (MVP)**
- Title, Category, Cost Currency (Gold/Token/Key), Cost Amount
- Optional cooldown (none/daily/custom hours)
- Satisfaction weight (1–5)

**Constraints**
- Default cost = Gold
- Nudge: “Add at least 1 Token reward for long-term motivation.”

**Redemption**
- Check balance + cooldown
- Write redemption row
- Update balances

**Deliverables**
- Rewards screen/component
- Service functions: `createReward`, `redeemReward`, `listRewards`, `getBalances`

**Done when**
- User can create 3 rewards, redeem safely, cooldowns work, balances never go negative

### 8.5.a Smaller Build Chunks (Recommended Commit Units)
1. **Schemas only**: Supabase migrations + types
2. **Economy core**: `economy.ts` + unit tests
3. **Rewards data access**: CRUD service layer only
4. **Rewards UI (read)**: list + balance display
5. **Rewards UI (write)**: create + redeem flows
6. **Retention helpers**: `7day.ts` utilities
7. **Identity engine**: rules + message generator
8. **Instrumentation**: event logging

> Keep each chunk shippable and documented in the Progress Log.

### 8.5.b Mobile UI Requirements (Rewards)
- **Create Reward**: 4-step wizard (title → category → cost → confirmation).
- **Default view**: balances + 3 suggested rewards max.
- **Redeem flow**: 1-tap redeem + confirmation sheet with cooldown info.
- **Empty states**: “Create your first reward” with a single CTA.
- **Accessibility**: minimum 16px text, 44px tap targets.

### 8.6 7-Day Retention Loop (Implementation)
**Day 1 onboarding flow**
1. Pick one life area  
2. Create one tiny habit  
3. Create one reward  
4. Complete habit → instant reward prompt  

**Day 2–7 daily loop**
- Show 1–3 actions max
- One primary CTA (“Do my tiny habit”)
- After completion: earned currency + “redeem or bank?”

**Day 6 fallback**
- Power-Down Quest if user missed yesterday
- Smallest possible win, grants Resilience + tiny Gold

**Day 7 ritual**
- Weekly closure screen (identity message, highlights, key reward, keep/evolve)

**Deliverable**
- `src/lib/retention/7day.ts`:
  - `getDayIndex(user) -> 1..7`
  - `getTodayPrompts(dayIndex, userState)`
  - `getRitualSummary(userState)`

**Done when**
- Users see correct content by day index and miss behavior triggers Day 6 support

### 8.6.a Mobile UI Requirements (Today + Ritual)
- **Today screen**: 1 primary CTA + up to 2 secondary actions.
- **Progress indicator**: small “Day X of 7” chip.
- **Ritual screen**: three-card layout (growth, highlights, unlock).
- **Animations**: subtle (150–250ms), optional with reduced motion.
- **Haptics**: light haptic on completion + redemption (if supported).

### 8.7 Identity Engine (Rules-Based MVP)
**Event-driven updates**
- Completion on low energy → +Resilience, +Discipline
- Reflection done → +Care, +Balance
- New habit created → +Courage
- Focus session → +Discipline, +Creativity

**User-facing output**
- “You are becoming…” card, no raw stats initially

**Deliverables**
- `src/lib/identity/engine.ts`:
  - `applyIdentityEvent(vectors, event)`
  - `generateIdentityMessage(vectors, recentEvents)`
- `IdentityCard` UI component

**Done when**
- Identity message changes as behavior changes (deterministic, testable)

### 8.8 Instrumentation & Metrics (Minimum)
**Track events**
- onboarding_started
- first_habit_created
- first_reward_created
- first_reward_redeemed
- day2_return, day3_return, … day7_return
- miss_detected
- powerdown_completed
- weekly_ritual_completed

**Deliverables**
- `docs/analytics/EVENTS.md`
- Hook into analytics or Supabase event table

**Done when**
- D1/D3/D7 retention can be computed from logs

### 8.8.a AI Implementation Guardrails (Keep It Safe)
- Prefer **additive changes** over refactors.
- Match existing naming, components, and routing patterns.
- Keep mobile UI as the primary target; desktop can follow.
- When in doubt, document assumptions in `ARCHITECTURE-NOTES.md`.

### 8.9 UX Polish Rules (Alive Feel)
- Never show more than 3 CTAs on “Today”
- Always celebrate redemption (micro animation, optional sound)
- Always offer “Bank it”
- Default to compassion on failure (no guilt UX)
- Avoid multi-column layouts on mobile
- Keep forms to 4 fields max per screen

**Deliverable**
- `docs/reward-engine/UX-RULES.md`

---

## 9) Roadmap (Step-by-Step, AI-Friendly)

> **Rule**: Work one step at a time. Log it in Section 12.

### Phase 1 — Foundations (Product & Systems)
- [ ] **P1.1** Validate reward object model (fields + constraints)
- [ ] **P1.2** Define currency earning rules (XP, Energy, Tokens, Keys, Gold)
- [ ] **P1.3** Draft reward validation heuristics (anti-sabotage)
- [ ] **P1.4** Define reward evolution states + triggers
- [ ] **P1.5** Map Identity Engine vector logic (inputs → traits → outputs)

### Phase 2 — Retention Loop + Onboarding
- [ ] **P2.1** Create Day 0–1 onboarding script (copy + UX steps)
- [ ] **P2.2** Day 2–7 prompts + UI touchpoints
- [ ] **P2.3** “First Miss” flow + Power-Down Quest definition
- [ ] **P2.4** Weekly closure ritual (copy + UX)

### Phase 3 — Social & Stakes
- [ ] **P3.1** Party system MVP (shared stakes + shared reward)
- [ ] **P3.2** Optional commitment contracts (Beeminder-style)
- [ ] **P3.3** Seasonal events / community arcs

### Phase 4 — AI Layer
- [ ] **P4.1** Motivation style matching (inputs → personas)
- [ ] **P4.2** Reward pacing optimizer (avoid burnout + boredom)
- [ ] **P4.3** “Bad week” detection & soft-landing mode

### Phase 5 — MVP Build Plan
- [ ] **P5.1** Feature slice: single habit + reward + identity feedback
- [ ] **P5.2** Zen Garden/Wisdom Tree visual growth loop
- [ ] **P5.3** Analytics & retention instrumentation

---

## 10) Open Questions (Keep Current)

- What is the minimum viable set of currencies for MVP?  
- How do we map the **existing XP/level system** to the new multi-currency economy?  
- Should identity vectors be visible in any form early on?  
- What is the first **real-world meaning** feature (e.g., trees planted)?  
- Which “reward evolution” example should ship first?  
- How should users **name** their Identity Engine? (e.g., Arc, Path, Soulprint)

---

## 11) Decisions Log

> Add decisions here when locked.  
> Format: **Date — Decision — Rationale**

- _None yet._

---

## 12) Progress Log (Living Changelog)

> **Format**  
> - **Date**:  
> - **Step**:  
> - **What changed**:  
> - **What’s next**:  

- **2025-02-14**  
  - **Step**: Document created (v1)  
  - **What changed**: Added full Competition Killer plan, phases, and logs.  
  - **What’s next**: Start P1.1 (reward object validation).
