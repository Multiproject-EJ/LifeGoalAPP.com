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
3. Confirm the session intent with a **short, generic prompt** like:
   - “Work on the next step in the Competition Killer dev plan.”
   - “Proceed with the next Competition Killer step.”
   - “Continue to the next Competition Killer step.”
   > **Expectation**: I will use a short prompt like this when I want you to move to the next step.

**After finishing a step**
1. Mark that step as ✅ **Done**.
2. Add a summary in the **Progress Log**.
3. Promote any new insights into **Open Questions** or **Decisions**.
4. **Pause for approval** before starting any **larger build** (multi-file changes, new flows, or structural changes). Small fixes and tiny copy edits can proceed without approval.

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

#### Reward Validation Heuristics (Anti–Self-Sabotage)
**Goal**: Allow any reward, but gently guard against rewards that erase progress or become dopamine loopholes.

**Heuristic Signals (risk +0 to +3 each)**
- **Too cheap for impact**: cost < 1% of weekly earnings estimate for “Treat”/“Fun” rewards.  
- **No friction loop**: reward can be redeemed without completing a habit in the last 12h.  
- **High-frequency pattern**: redeemed >3 times in 7 days with no cost increase.  
- **Energy drain mismatch**: reward costs only Gold but user’s Energy is <30% (soft exploit).  
- **Time mismatch**: reward labeled “Growth” or “Meta” but is tagged as “Instant” and <10 minutes.  
- **Negative adjacent**: reward frequently follows missed habits (possible avoidance loop).  
- **Streak risk**: reward is used within 2 hours of breaking a streak (potential coping spiral).  

**Risk Scoring**
- **0–2 (Green)**: Allow silently.  
- **3–5 (Yellow)**: Soft nudge (suggest cooldown or cost tweak).  
- **6+ (Red)**: Require one guardrail (cooldown, token cost, or habit gate).  

**Guardrail Options (never block outright)**
- Add **cooldown** (e.g., 12–48h).  
- Add **Token/Key cost** if Gold-only.  
- Add **habit gate** (“Redeem after 1 completion”).  
- Add **reflection tag** (“What made this feel good?”).  

**Nudge Copy Library (warm tone)**
- “You’ve enjoyed this a lot lately — want to raise the cost or add a cooldown so it stays special?”  
- “This looks like a quick win. Want to pair it with a tiny completion first?”  
- “Let’s keep this reward powerful. Add 1 Token to protect it?”  
- “This reward shows up after misses. Want a gentler alternative for those days?”  

**Developer Notes**
- Heuristics are **suggestive**, not punitive.  
- Store a `reward_risk_score` + `last_nudge_at` to avoid repeated nags.  
- Allow manual override with “Keep as-is.”  

#### Reward Evolution (New, Powerful)
Rewards **level up** with the user.  
Example:
- “Watch YouTube (10 min)”  
→ “Intentional Watch (with reflection)”  
→ “Creative Input Session”

**Evolution States (MVP)**
- **State 0 — Seed (Base Reward)**: The user-defined reward as entered.  
- **State 1 — Intentional**: Adds a micro-reflection or purpose tag (1–2 taps).  
- **State 2 — Elevated**: Adds light structure (timebox, pairing, or mini ritual).  
- **State 3 — Transformative**: Reframes the reward as growth-aligned (creative, social, or restorative).  

**Evolution Triggers**
- **Usage Count**: Redeemed `>= 3` times in 7 days → prompt to evolve.  
- **Streak Alignment**: Redeem after a `Day 3` or `Day 7` streak → upgrade option unlocked.  
- **Satisfaction Weight**: Self-reported `>= 4` twice → offer evolution to preserve impact.  
- **Cooldown Pressure**: Repeated cooldown nudges → suggest evolution instead of tighter limits.  
- **Identity Fit**: If recent vectors trend (e.g., Creativity + Discipline), suggest aligned evolution.  

**Upgrade Rules**
- Never force an upgrade. Offer “Keep as-is.”  
- Evolution cannot reduce accessibility (no extra steps beyond 1 screen).  
- Each evolution state can optionally add **Token** or **Key** cost (max +1).  

**Example Mappings**
- **Seed**: “Watch YouTube (10 min)”  
  → **Intentional**: “Intentional Watch (pick 1 topic)”  
  → **Elevated**: “10-min learning block + 1 note”  
  → **Transformative**: “Creative input → draft 1 idea”  
- **Seed**: “Coffee break”  
  → **Intentional**: “Coffee break + 1 gratitude”  
  → **Elevated**: “Coffee break + 5-min walk”  
  → **Transformative**: “Coffee break + share 1 check-in”  

**First Ship Example (MVP)**
- **Seed**: “Coffee break”  
  → **Intentional**: “Coffee break + 1 gratitude”  
  → **Elevated**: “Coffee break + 5-min walk”  
  → **Transformative**: “Coffee break + share 1 check-in”  
**Why this one first**: universal, low-friction, and emotionally warm; it turns an everyday treat into a gentle social/reflective loop without adding heavy structure.

---

### 7.2 7-Day Retention Loop

#### Day 0–1: First 5 Minutes (Critical)
1. Pick **one** life area  
2. Create **one** tiny habit  
3. Define **one** reward  
4. Complete habit → instant reward  

**Goal feeling**: “Oh… this already works.”  
No dashboards. No stats. No overwhelm.

#### 7.2.a Day 0–1 Onboarding Script (Copy + UX Steps)

**Objective**: Get the user to **complete 1 tiny habit + redeem 1 reward** in <3 minutes.  
**Design constraints**: thumb-first, single-focus screens, max 1 primary CTA, 0 jargon.

**Entry Points**
- First launch (fresh account)
- Returning user with no active habit (reset/offboard)

**Step 1 — Welcome / Promise**
- **Screen**: Full-bleed warm illustration + 1-line promise
- **Header**: “Let’s make one tiny win.”
- **Body**: “Pick a life area. Add a small habit. Claim a reward today.”
- **Primary CTA**: “Start in 60 seconds”
- **Secondary**: “See how it works” (optional bottom sheet with 3 bullets)

**Step 2 — Choose Life Area**
- **Prompt**: “Where do you want a tiny win?”
- **Choices**: Health • Mind • Relationships • Work • Home • Growth (6 tiles)
- **Microcopy**: “Just one. You can add more later.”
- **CTA**: “Continue”

**Step 3 — Name a Tiny Habit**
- **Prompt**: “What’s the smallest version you can do today?”
- **Input**: Text field with examples (tap to fill)
  - “Drink water”
  - “2-minute stretch”
  - “Write 1 sentence”
- **Helper**: “If it takes longer than 2 minutes, shrink it.”
- **CTA**: “Looks good”

**Step 4 — Choose When (Light Schedule)**
- **Prompt**: “When should we remind you?”
- **Options**: Morning • Afternoon • Evening • “No reminder”
- **Microcopy**: “You can change this anytime.”
- **CTA**: “Next”

**Step 5 — Define a Reward**
- **Prompt**: “Pick a reward you actually want.”
- **Input**: Text field + quick chips
  - “10 min YouTube”
  - “Coffee break”
  - “Walk outside”
  - “Music + chill”
- **Helper**: “Short rewards work best at first.”
- **CTA**: “Set reward”

**Step 6 — Mini Contract**
- **Summary card**:  
  - “Habit: ___”  
  - “Reward: ___”  
  - “Time: ___”
- **Prompt**: “Ready for your first win?”
- **Primary CTA**: “Do it now”
- **Secondary**: “I’ll do it later”

**Step 7 — Completion + Redemption**
- **Completion toast**: “Nice. That’s a real win.”
- **Reward prompt**: “Claim your reward?”
- **CTA**: “Redeem now”
- **Optional**: “Bank it” (stores reward credit)
- **Micro-feedback**: haptic + confetti burst

**Day 1 Re-entry (Tomorrow)**
- **Header**: “Same tiny win today?”
- **Primary CTA**: “Yes, keep it easy”
- **Secondary**: “Make it smaller” (opens habit shrinker)
- **Hint**: “Consistency unlocks better rewards.”

**Notes**
- No dashboards or stats shown until Day 2.
- Only **one** field per screen; copy stays ≤ 2 lines.
- Every screen ends with a single thumb-reachable CTA.

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

#### 7.2.b Day 2–7 Prompts + UI Touchpoints (Detailed)

**Purpose**: Keep Days 2–7 frictionless while expanding depth with **one** new element per day.  
**Rule**: One primary CTA, max two secondary actions, all prompts < 2 lines.

**Global UI touchpoints (appear Days 2–7)**
- **Day chip**: “Day X of 7” (top-left, subtle)
- **Primary CTA**: “Do my tiny habit”
- **Secondary**: “Bank it” (post-completion) + “Make it smaller” (if needed)
- **Completion micro-reward**: 150–250ms glow + haptic tick
- **Microcopy slot**: 1–2 lines under CTA for daily prompt

**Day 2 — Familiarity & Safety**
- **Goal**: Reinforce trust + reduce anxiety.
- **Prompt**: “Same tiny win today — keep it easy?”
- **UI touchpoints**:
  - **Today card**: habit + reward summary
  - **Tiny visual growth**: 1 leaf/spark appears after completion
  - **Optional**: “Change time” inline link (no modal)
- **Post-completion**: “Nice. You’re building a streak.”

**Day 3 — First Choice Moment**
- **Goal**: Offer a single gentle expansion (user chooses one).
- **Prompt**: “Want to grow this by one step?”
- **Choice sheet (pick one)**:
  1. **Add 2nd tiny habit** (same life area)
  2. **Upgrade reward** (add 1 Token or +1 minute)
  3. **Bank progress** (save reward for Day 5)
- **UI touchpoints**:
  - **Bottom sheet** with 3 tiles (no more)
  - **Mini-preview** of what unlocks (1 line each)
- **If skipped**: “Keep it simple — that counts.”

**Day 4 — Reflection or Soft Social**
- **Goal**: Add meaning without pressure.
- **Prompt**: “What helped today?” (single tap)
- **UI touchpoints**:
  - **Reflection chip row** (choose 1): “Time,” “Mood,” “Place,” “People”
  - **Optional**: “Invite a buddy” CTA (secondary, no guilt)
  - **Zen Garden seed** appears after reflection
- **If skipped**: “No reflection needed — just showing up matters.”

**Day 5 — Identity Reveal**
- **Goal**: Introduce identity arc in 1 line.
- **Prompt**: “You’re becoming someone who ___.”
- **UI touchpoints**:
  - **Identity card** (single sentence + icon)
  - **Stat hint**: “+Care” or “+Discipline” (no numbers)
  - **Reward echo**: “Rewards after effort work best for you.”

**Day 6 — Planned Miss + Recovery**
- **Goal**: Normalize misses and model recovery.
- **Prompt**: “Low-energy day? Take a tiny win.”
- **UI touchpoints**:
  - **Power-Down Quest card** (1-tap, 30–60s action)
  - **Resilience glow** on completion
  - **Copy**: “You protected the streak by recovering.”
- **If user did complete yesterday**: show same card but framed as “bonus resilience.”

**Day 7 — Weekly Closure Ritual**
- **Goal**: Close the loop + invite evolution.
- **Prompt**: “This week shaped you. Want to keep or evolve?”
- **UI touchpoints**:
  - **3-card ritual layout**:
    1. **Growth**: “You grew in ___”
    2. **Highlight**: top completion + reward
    3. **Unlock**: 1 Key or upgraded reward
  - **CTA**: “Keep this loop”
  - **Secondary**: “Evolve it” (opens habit/reward adjuster)
- **Exit note**: “Next week starts tomorrow with the same ease.”

**Day 2–7 notification nudges (lightweight)**
- Morning: “Tiny win today?”  
- Afternoon: “Keep it easy — 2 minutes.”  
- Evening: “Still counts if it’s small.”

**Done when**
- Prompts and touchpoints are specified for each day (2–7).
- Each day introduces only one new element.

---

#### 7.2.c “First Miss” Flow + Power-Down Quest Definition

**Purpose**: Normalize misses, preserve momentum, and teach a **recovery ritual** that feels compassionate and deliberate.

**Trigger conditions (first week)**
- First **missed habit** within Days 1–7 (no completion logged by end of day).
- Or user taps “I can’t today” (manual miss).
- **Do not** trigger if the user already completed any habit that day (avoid mixed signals).

**Primary goals**
- Reduce shame and prevent churn.
- Convert “miss” into a **tiny recovery win**.
- Teach the concept of **Resilience** (identity vector).

**Flow (mobile-first)**
1. **Miss detected (end-of-day or next open)**  
   - Screen title: “Life happens.”  
   - Subtext: “Want a 60‑second rescue win?”  
   - Primary CTA: **“Do a Power-Down Quest”**  
   - Secondary: “Skip for now” (no penalty, no guilt)
2. **Power-Down Quest picker (1 card only)**  
   - Auto-select based on context (time-of-day + last habit area).  
   - Replace with “Pick another” link (opens 2–3 max).
3. **Quest completion**  
   - 1-tap confirm (“Done”)  
   - Micro-reward: Resilience glow + small Gold (+1–3)  
   - Copy: “You recovered. That’s real progress.”
4. **Return to Today**  
   - “Streak protected by recovery” (no numeric streak callout)

**Power-Down Quest definition**
- **Timebox**: 30–90 seconds max.  
- **Effort**: ≤ 2/10.  
- **No setup**: can be done in place, no equipment.  
- **Category match**: aligned with the habit’s life area when possible.

**Quest examples (MVP library)**
- **Health**: “Drink 6 sips of water.”  
- **Mind**: “Take 3 slow breaths.”  
- **Relationships**: “Send a quick ‘thinking of you’ text.”  
- **Work**: “Open the task list and star one item.”  
- **Home**: “Put away one thing.”  

---

#### 7.2.d Weekly Closure Ritual (Copy + UX)

**Purpose**: Close the weekly loop with meaning, reinforce identity growth, and invite a gentle evolution choice without pressure.

**Trigger conditions**
- End of Day 7 (local time) **or** first app open on Day 8 if Day 7 was missed.
- Only shows if the user has **at least 2 completions** in the last 7 days (avoid shaming).

**Primary goals**
- Celebrate progress with concrete evidence.
- Encourage reflection without journaling burden.
- Offer a clear **Keep vs Evolve** decision.

**Flow (mobile-first, 3 screens max)**
1. **Ritual opener**  
   - Title: “Weekly closure”  
   - Subtext: “Small wins still shape you.”  
   - Primary CTA: **“Review my week”**  
2. **3-card ritual layout**  
   - **Card 1 — Growth**  
     - Header: “You grew in ___”  
     - Auto-fill from top identity vector (e.g., Care, Discipline).  
     - Microcopy: “Consistency builds this trait.”  
   - **Card 2 — Highlight**  
     - Header: “Best moment”  
     - Body: “Top completion: ___” + “Reward: ___”  
     - If no reward redeemed: “Best moment: showing up ___ times.”  
   - **Card 3 — Unlock**  
     - Header: “Weekly unlock”  
     - Body: “+1 Key” **or** “Reward upgrade unlocked”  
     - Microcopy: “Use it anytime next week.”  
   - Primary CTA: **“Keep this loop”**  
   - Secondary: “Evolve it” (opens habit/reward adjuster)
3. **Closure confirm**  
   - Title: “Loop locked”  
   - Body: “Next week starts with the same ease.”  
   - CTA: “See tomorrow”

**Evolve it mini-flow (single screen)**
- **Prompt**: “What should change next week?”  
- **Options (choose one)**:
  1. **Make habit 1% bigger** (adds 30–60s)  
  2. **Change reward** (swap or add +1 Token cost)  
  3. **Change time** (schedule tweak)  
- **CTA**: “Save evolution”

**Copy rules**
- Avoid guilt. Never mention “missed” in this ritual.  
- Keep body copy ≤ 2 lines per card.  
- Always include a warmth line: “Small wins still shape you.”

**Telemetry hooks**
- `weekly_closure_viewed`  
- `weekly_closure_kept_loop`  
- `weekly_closure_evolved` (includes evolution type)  
- `weekly_closure_unlock_redeemed`
- **Growth**: “Read one paragraph.”

**Copy rules**
- Never say “failure.”  
- Use warmth + agency: “You protected momentum.”  
- Avoid streak guilt language.  

**Data + telemetry hooks**
- Log event: `power_down_quest_completed`  
  - `quest_id`, `quest_category`, `trigger_type` (auto/manual), `day_index`  
- Apply identity delta: **Resilience +1**  
- Optional: grant **+1 Gold** if no other completion that day.

**Done when**
- Trigger rules, flow steps, quest library, copy rules, and telemetry hooks are specified.

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

**P1.2 Currency Earning Rules (Detailed)**
- **XP**: Earned on any completion (habit, focus, reflection). Scales with difficulty: tiny habit = small XP, focus session = medium XP, milestone = large XP.
- **Gold**: Primary spendable currency. Earned with each habit completion and small reflection actions. Bonus Gold on streak milestones and weekly ritual.
- **Energy**: Daily action budget. Spent on completions (habit, focus), auto-resets daily; low-energy completions grant Resilience instead of more Energy.
- **Tokens**: Consistency currency. Earned at most once per day, or on streak milestones (e.g., Day 3/7). Never granted by one-off actions.
- **Keys**: Rare unlock currency. Earned only from weekly ritual, seasonal events, or major milestones (e.g., Day 7, Day 30).

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

#### 8.7.a Identity Vector Logic Map (Inputs → Traits → Outputs)
**Purpose**: Turn real behavior into stable identity traits, then into friendly reflections + unlocks.

**Inputs (event signals)**
- **Completion quality**: on-time, late, low-energy, recovery after miss
- **Consistency**: streak length, weekly completion ratio
- **Scope**: new habit created, habit upgraded, habit retired
- **Depth**: reflections logged, journaling length
- **Focus**: timed sessions completed
- **Care actions**: self-care check-ins, rest rewards redeemed

**Trait mapping (vector deltas)**
- **Discipline** → on-time completions, focus sessions, 3+ day streaks
- **Resilience** → low-energy completion, recovery after miss, power-down quest
- **Care** → reflections, self-care check-ins, gentle pacing
- **Courage** → new habit creation, difficulty increases, first-time actions
- **Creativity** → focus sessions + variety of habits, reflections with novelty tags
- **Balance** → mixed habit categories in a week, rest rewards redeemed without guilt

**Outputs (user-facing reflections + unlocks)**
- **Reflection tone** (1–2 sentences):
  - High **Discipline** → “You keep your promises to yourself.”
  - High **Resilience** → “You bounce back with grace.”
  - High **Care** → “You treat yourself with kindness, and it works.”
  - High **Courage** → “You’re willing to begin even when it’s hard.”
  - High **Creativity** → “You thrive when there’s variety and play.”
  - High **Balance** → “You’re building a life that doesn’t tilt too far.”
- **Micro-unlocks** (rules-based):
  - **Discipline** ≥ threshold → unlock “Streak Focus” quest style
  - **Resilience** ≥ threshold → unlock “Soft-Landing” ritual card
  - **Care** ≥ threshold → unlock “Rest First” reward archetype
  - **Courage** ≥ threshold → unlock “Start Something” challenge prompt
  - **Creativity** ≥ threshold → unlock “Mix It Up” quest suggestions
  - **Balance** ≥ threshold → unlock “Rhythm” UI mood

**Vector weights (MVP defaults)**
- Base delta per event: **+1**
- Streak milestones (Day 3/7/14): **+2** to Discipline
- Recovery after miss within 24h: **+2** to Resilience
- Weekly reflection ritual completed: **+2** to Care + Balance

**Stability rules**
- Use a 7-day rolling window for dominant trait detection.
- Cap any single trait gain to +4 per day to avoid spikes.
- Never decrease traits in MVP (positive-only to build attachment).

**Deliverables**
- `src/lib/identity/engine.ts`:
  - `applyIdentityEvent(vectors, event)`
  - `generateIdentityMessage(vectors, recentEvents)`
- `IdentityCard` UI component

**Done when**
- Identity message changes as behavior changes (deterministic, testable)

---

### 7.4 Social & Stakes: **Party System MVP**

**Purpose**: Create a lightweight, opt-in party mechanic where small groups share stakes and unlock a shared reward through synchronized wins.

#### Party Object (MVP)
```
Party {
  id
  name
  owner_id
  members[]          // user ids
  goal_id?           // optional shared habit/goal
  stake_type         // SharedReward | SharedStreak | SupportOnly
  stake_amount?      // tokens/keys if SharedReward
  reward_id?         // shared reward definition
  cadence            // Daily | Weekly
  status             // Active | Paused | Ended
  created_at
  updated_at
}
```

#### Shared Stake Rules (MVP)
- **Opt-in only**: user must accept party invite before any stake applies.
- **Small groups**: 2–5 members max for MVP.
- **Two modes**:
  1. **Shared Reward**: all members complete today → unlock shared reward (token/key payout).
  2. **Shared Streak**: streak grows only when all members complete within the cadence window.
- **Support-Only**: no stakes; just shared check-ins + encouragement.
- **No punishment** in MVP: if not all complete, reward doesn’t unlock (no loss).

#### Daily Loop (Mobile-First)
1. **Party check-in chip** on Today screen (one line): “2/4 ready — join?”
2. **Tap to view party card**:
   - Members + status (Ready / Pending / Completed)
   - Shared goal summary (1 line)
   - Primary CTA: “Mark my completion”
3. **After completion**:
   - If party complete: “Shared reward unlocked 🎉”
   - If not complete: “Thanks — waiting on 2 friends”

#### Fail & Recovery (Warm Tone)
- If cadence window ends with incomplete party:
  - Copy: “Life happens. We’ll try again tomorrow.”
  - Optional CTA: “Send encouragement”
- If user misses repeatedly (3 misses in 7 days):
  - Suggest switching to **Support-Only** mode.

#### Telemetry Hooks
- `party_created`
- `party_invite_sent`
- `party_invite_accepted`
- `party_daily_completed`
- `party_reward_unlocked`
- `party_mode_changed`

**Done when**
- Party object, stake rules, daily flow, fail handling, and telemetry hooks are specified.

### 7.5 Social & Stakes: **Optional Commitment Contracts (Beeminder-Style)**

**Purpose**: Offer an opt-in commitment contract that increases follow-through with clear stakes, while preserving a warm, non-judgmental tone and safety exits.

#### Contract Object (MVP)
```
CommitmentContract {
  id
  user_id
  title
  target_type        // Habit | Goal | FocusSession
  target_id
  cadence            // Daily | Weekly
  target_count       // number of required completions in cadence window
  stake_type         // Gold | Tokens | Keys | RealMoney(optional)
  stake_amount
  grace_days         // 0..2 per cadence window
  cooling_off_hours  // 24 by default
  status             // Draft | Active | Paused | Completed | Cancelled
  start_at
  end_at?
  created_at
  updated_at
}
```

#### Core Rules (MVP)
- **Opt-in only** with explicit confirmation; never default-on.
- **Cooling-off window**: user can cancel within 24 hours without penalty.
- **Grace days**: up to 2 per cadence window (default = 1) to protect from burnout.
- **No shame tone**: missed contract triggers a gentle review + reset option.
- **Caps**: stake amount must be ≤ 20% of current Gold balance (or fixed cap for Tokens/Keys).
- **Real money**: disabled by default; only available with extra confirmation + parental gate (future).

#### Setup Flow (Mobile-First)
1. **Select target** (habit/goal/focus session) + cadence.
2. **Set target count** (default 1 per day).
3. **Choose stake** (Gold/Token/Key) + amount.
4. **Pick grace days** (0–2).
5. **Review + confirm** (clear consequences, cooling-off note).

#### Daily/Weekly Evaluation
- At cadence end:
  - If target met → **reward**: small bonus Gold + “Contract kept” badge.
  - If target missed → **forfeit stake** to a “Commitment Pool” (virtual sink), then offer reset.

#### Miss Flow (Warm Recovery)
- Copy: “You didn’t meet this one. That doesn’t erase your progress.”
- Options:
  - **Reset contract** (same settings)
  - **Reduce stake** (one-time, if 2 misses in 30 days)
  - **Pause for a week** (requires reason selection)

#### Safety & Anti-Overload
- Require **one** active contract max in MVP.
- Block contracts during **Power-Down Quest** (soft-landing week).
- Suggest “Support-Only” party mode instead if user misses 2+ contracts.

#### Telemetry Hooks
- `contract_created`
- `contract_activated`
- `contract_cancelled`
- `contract_completed`
- `contract_missed`
- `contract_stake_forfeited`

**Done when**
- Contract object, setup flow, evaluation rules, miss flow, safety caps, and telemetry hooks are specified.

#### Current Implementation Gaps / Risks (Audit: Feb 2026)
- **Result flow is partially wired**: evaluation modal state exists, but result presentation is not consistently triggered in the tab flow after evaluation.
- **Paused contract visibility gap**: paused contracts are easy to orphan from the primary contracts surface, reducing recoverability.
- **Evaluation timing risk**: window-end evaluation depends too heavily on in-tab user actions rather than reliable automatic checks.
- **Persistence risk**: contract records are currently local-first, which can create cross-device inconsistency and cloud/demo divergence.
- **Economy consistency risk**: stake/bonus write paths can diverge between demo profile writes and authenticated data paths.
- **Limited stake safeguards**: Gold has a cap, but Token/other stake types need parity validation and clearer safety rules.
- **Recovery path incompleteness**: “reset contract” and “reduce stake” are conceptually in UX but not fully operationalized end-to-end.

#### High-Impact Improvements Backlog (Prioritized)
1. **Reliability first**
   - Trigger and show evaluation outcomes deterministically (success/miss modal + clear next step).
   - Surface both Active and Paused contracts in the primary Contracts tab with one-tap resume.
   - Add automatic expiry checks on screen load and scheduled server-side evaluation for unattended windows.
2. **Data durability + trust**
   - Move contract + evaluation storage to Supabase tables with RLS and optimistic-safe updates.
   - Unify economy balance mutations so stakes and bonuses use the same persistence path in all modes.
3. **Outcome quality**
   - Auto-link contract progress to verified habit/goal completions (reduce manual progress taps).
   - Add miss forecasting (“on pace / at risk”) and rescue nudges before window close.
4. **Adaptive recovery**
   - Fully implement reset-contract and reduce-stake flows with strict one-time/interval constraints.
   - Add guided recovery modes after repeated misses (temporary lower target, gentle ramp back).
5. **Impact features**
   - Add contract history analytics, trend summaries, and streak-adjusted rewards.
   - Add optional accountability witness / social commitment modes.

#### Implementation Sprint Plan (Start Now)
- **Slice A — Contracts UX reliability (in progress)**
  - [x] Ensure evaluation outcomes appear in Contracts tab immediately after window close checks.
  - [x] Ensure paused contracts are discoverable and resumable from the Contracts tab.
  - [x] Ensure contract actions render state-appropriate controls (active vs paused).
- **Slice B — Recovery actions (next)**
  - [x] Implement reset contract with same settings.
  - [x] Implement reduce stake with explicit eligibility checks and telemetry.
- **Slice C — Persistence hardening (done)**
  - [x] Introduce Supabase contract/evaluation tables + RLS.
  - [x] Migrate service methods from localStorage to backend-first with demo fallback.
- **Slice D — Outcome quality (done)**
  - [x] Auto-link contract progress to verified habit/goal completions.
  - [x] Refresh active contract progress in-tab on a timed sync to reduce manual progress taps.
- **Slice E — Unattended window reliability (done)**
  - [x] Evaluate all due active contracts on Contracts tab load/refresh (not only the visible card).
  - [x] Surface the latest due-window outcome modal immediately after automated evaluations run.
- **Slice F — Pace forecasting + rescue nudges (done)**
  - [x] Add “on pace / at risk” contract forecasting before cadence window close.
  - [x] Add warm rescue nudge copy and state-aware primary CTA label for at-risk windows.
- **Slice G — Adaptive recovery ramp (done)**
  - [x] Add guided “gentle ramp week” recovery action after repeated misses.
  - [x] Restore original target automatically after a successful ramp window.
- **Slice H — Contract history insights (done)**
  - [x] Add in-tab contract history analytics (success rate, streaks, trend state).
  - [x] Add recent cadence-window outcomes list with stake/bonus summary context.

### 7.6 Social & Stakes: **Seasonal Events / Community Arcs**

**Purpose**: Create lightweight, time-boxed community arcs that boost motivation without overwhelming users. Events should feel optional, warm, and celebratory—never punitive.

#### Event Object (MVP)
```
SeasonalEvent {
  id
  name
  theme
  start_at
  end_at
  cadence            // Daily | Weekly
  status             // Upcoming | Active | Ended
  reward_type        // Gold | Token | Key | Cosmetic | Title
  reward_amount?
  unlock_conditions? // min_level, min_days_active, opt_in_required
  description
}
```

#### Community Arc Rules (MVP)
- **Opt-in by default** for new users; existing users get a soft invite.
- **Low commitment**: 1–2 micro-actions per day (≤ 60s).
- **No penalties** for missing days; progress is additive.
- **One event at a time** max; avoid overlaps.
- **Theme-driven**: 1-line narrative (e.g., “Spring Reset,” “Focus Week”).

#### Daily Loop (Mobile-First)
1. **Event chip** on Today screen: “Spring Reset — Day 2”
2. **Single micro-action card**:
   - Example: “Take a 30-second pause” or “Write 1 word of intention”
3. **Completion**:
   - Tiny celebration + event progress tick
   - Reward drip (small Gold or Token)

#### Weekly Arc Moments
- **Midpoint check-in** (Day 3/4): “Still in?” with 1-tap continue
- **Finale ritual** (last day): 3-card recap
  1. **What you practiced**
  2. **Your highlight**
  3. **Your unlock** (Token/Key/cosmetic)

#### Reward & Unlock Guidelines
- **Daily drip**: small Gold or 1 Energy back
- **Milestone**: 1 Token at midpoint
- **Finale**: 1 Key or cosmetic/title
- **Cosmetics**: badge, theme card, or “Arc” title (no gameplay advantage)

#### Copy Examples (Warm Tone)
- “Want to join this week’s arc? It’s just 60 seconds a day.”
- “Missed a day? You can still finish strong.”
- “Nice — you kept showing up. That’s the real win.”

#### Telemetry Hooks
- `seasonal_event_invite_shown`
- `seasonal_event_opt_in`
- `seasonal_event_daily_completed`
- `seasonal_event_midpoint_seen`
- `seasonal_event_completed`

**Done when**
- Event object, loop, rewards, and telemetry hooks are specified.

### 7.7 AI Layer: **Motivation Style Matching (Inputs → Personas)**

**Purpose**: Detect how a user responds to motivation and adapt copy, pacing, and reward framing to fit their dominant style—without boxing them in or shaming them.

#### Motivation Persona (MVP)
```
MotivationPersona {
  id
  name               // Builder | Challenger | Nurturer | Explorer
  description        // 1-line summary for internal use
  triggers[]         // events that increase affinity
  anti_triggers[]    // events that decrease affinity
  tone_guidelines[]  // copy guidance
  ui_emphasis[]      // what to show more/less
}
```

#### Inputs (Signals)
**Behavioral**
- **Completion rhythm**: consistent daily vs. bursty streaks
- **Streak response**: engages with streak visuals or ignores them
- **Challenge uptake**: accepts “hard mode” or higher difficulty prompts
- **Recovery usage**: uses Power-Down Quests after misses
- **Reward redemption**: prefers frequent small rewards vs. saving for bigger ones
- **Reflection behavior**: taps reflection chips or skips
- **Optional social**: joins parties or stays solo

**Self-reported (lightweight, optional)**
- “Do you prefer gentle encouragement or clear challenges?” (2-option toggle)
- “Do rewards help you most when they’re frequent or meaningful?” (2-option toggle)

#### Personas (MVP Set)
1. **Builder** (Progress-first)
   - **Signals**: consistent daily completions, likes streaks, prefers small frequent rewards.
   - **Tone**: steady, affirming, “you’re building momentum.”
   - **UI emphasis**: streak progress, daily cadence, small reward boosts.
2. **Challenger** (Intensity-first)
   - **Signals**: accepts harder prompts, increases difficulty, prefers bigger rewards later.
   - **Tone**: direct, empowering, “take on the next level.”
   - **UI emphasis**: challenge cards, milestones, upgrade paths.
3. **Nurturer** (Care-first)
   - **Signals**: uses Power-Down Quests, engages with reflections, prefers gentle pacing.
   - **Tone**: warm, compassionate, “it’s okay to go small.”
   - **UI emphasis**: recovery flows, reflection chips, self-care rewards.
4. **Explorer** (Variety-first)
   - **Signals**: rotates habits, tries new rewards, engages with novelty.
   - **Tone**: playful, curious, “try a new path today?”
   - **UI emphasis**: variety suggestions, new reward ideas, light experiments.

#### Scoring Rules (MVP)
- Maintain a **persona affinity score** per user (0–100).
- Each signal event adds **+5 to +15** to one persona, **-5** to an opposing persona.
- Use a **7-day rolling window** to smooth spikes.
- Dominant persona = highest affinity **≥ 60**; if none, use “Balanced” fallback.

#### Adaptation Rules (MVP)
- **Copy tone**: swap 1–2 lines based on persona (Today screen + completion toast).
- **Reward framing**:
  - Builder → “Keep it steady — small wins.”
  - Challenger → “Hold for a bigger unlock.”
  - Nurturer → “Reward yourself for showing up.”
  - Explorer → “Try a new reward today.”
- **Prompt choice**:
  - Builder → streak & consistency prompts
  - Challenger → challenge/upgrade prompts
  - Nurturer → recovery/soft-landing prompts
  - Explorer → novelty prompts

#### Safeguards
- Never show negative or judgmental copy.
- Allow manual “Prefer gentle tone” toggle to override persona.
- Do not change core UX flow; only adjust microcopy and optional cards.

#### Telemetry Hooks
- `persona_signal_logged`
- `persona_assigned`
- `persona_copy_variant_shown`

**Done when**
- Personas, signals, scoring, adaptation rules, and safeguards are specified.

### 7.8 AI Layer: **Reward Pacing Optimizer (Avoid Burnout + Boredom)**

**Purpose**: Keep rewards meaningful by balancing frequency and intensity based on engagement signals. Avoid over-rewarding (burnout) and under-rewarding (boredom) while staying warm and non-judgmental.

#### Inputs (Signals)
**Behavioral**
- **Completion cadence**: completions per week, streak length, time-of-day consistency
- **Redemption rhythm**: redeem frequency, average cost per redemption, hoarding behavior
- **Reward impact**: satisfaction weight trend (1–5) and optional “Did this feel good?” tap
- **Drop-off risk**: missed days count in last 7, time since last completion
- **Effort drift**: habit difficulty increases or decreases over last 14 days

**Self-reported (lightweight, optional)**
- “Do rewards feel too easy, too frequent, or just right?” (3-option pulse)
- “Do you want fewer bigger rewards or more small ones?” (2-option toggle)

#### Pacing States (MVP)
1. **Underfed** (boredom risk)
2. **Balanced**
3. **Overfed** (burnout risk)

#### Detection Rules (MVP, rules-based)
- **Underfed** if 2+ of:
  - No redemption in **7 days** despite 3+ completions
  - Satisfaction weight average ≤ 2.5
  - Declining completions (down ≥ 40% vs. prior week)
- **Overfed** if 2+ of:
  - Redeeming **daily** for 5+ days
  - Reward cost trending downward (avg cost -30% vs. prior week)
  - Energy ≤ 30% on 3+ days in a week
- Else **Balanced**

#### Optimizer Actions (MVP)
**When Underfed**
- Suggest **one** of:
  1. **Upgrade reward** (+1 Token or +1 minute)
  2. **Add a mini-ritual** (1 tap reflection)
  3. **Introduce a new reward** (pre-filled suggestion)
- Optional micro-copy: “Want a slightly bigger win for this?”

**When Overfed**
- Suggest **one** of:
  1. **Soft cooldown** (12–24h) on the most-used reward
  2. **Bank it** default (store reward credit)
  3. **Swap reward** (lower frequency, higher meaning)
- Optional micro-copy: “Let’s make this feel special again.”

**When Balanced**
- Stay silent (no extra prompts)

#### Guardrails
- Never block redemption outright.
- No prompts more than **1x per 3 days**.
- Only suggest changes on **completion** or **weekly ritual** screens.
- Always allow “Not now” with no penalty.

#### UX Touchpoints
- **Post-completion chip**: “Make this reward feel bigger?” (1-tap sheet)
- **Weekly closure**: “Keep it, evolve it, or bank it?” (3 options)
- **Reward detail**: “Pacing tip” hint (single line, dismissible)

#### Telemetry Hooks
- `reward_pacing_state_assigned`
- `reward_pacing_prompt_shown`
- `reward_pacing_action_taken`
- `reward_pacing_prompt_dismissed`

**Done when**
- Inputs, detection rules, pacing states, actions, guardrails, and telemetry are specified.

### 7.9 AI Layer: **“Bad Week” Detection & Soft-Landing Mode**

**Purpose**: Detect short-term life turbulence (stress, illness, overload) and shift the system into a gentler mode that preserves identity progress, reduces pressure, and makes it easy to return without shame.

#### Inputs (Signals)
**Behavioral**
- **Miss cluster**: 3+ misses in 5 days after a prior streak ≥ 5 days
- **Skipped check-ins**: no Today screen open in 3 consecutive days
- **Energy drain**: Energy ≤ 25% on 3+ days in a 7-day window
- **Recovery pattern**: triggers “Power-Down Quest” twice in 7 days
- **Session shortening**: average session time drops ≥ 50% vs. prior week

**Self-reported (lightweight, optional)**
- “Rough week?” prompt (Yes / Not really)
- “Want a lighter mode for a few days?” (Yes / Not now)

#### Detection Rules (MVP, rules-based)
- Enter **Soft-Landing Mode** if **any** of:
  - Miss cluster + skipped check-ins in same 7-day window
  - Energy drain + recovery pattern
  - Self-reported “Rough week” = Yes
- Auto-exit if **2 consecutive completions** or **7 days elapsed**, whichever comes first.

#### Soft-Landing Actions (MVP)
1. **Reduce daily load**
   - Default to **1 micro-action** (“Do the tiniest version”)
   - Hide optional challenge prompts
2. **Streak safety**
   - Convert streak to **“Grace Buffer”** (hold streak visuals for up to 7 days)
   - Prevent “streak loss” copy; use neutral language
3. **Reward cushioning**
   - Offer **Bank it** as default
   - Allow **1 low-cost reward** per week even if completions are minimal
4. **Identity continuity**
   - Show “Still you” reflection chip: “Showing up counts, even small.”

#### UX Touchpoints
- **Soft landing banner** on Today: “Let’s go lighter this week.”
- **Completion toast**: “Tiny win logged — that’s enough today.”
- **Weekly ritual card**: “Want to keep it light for another week?” (Yes / Not now)

#### Guardrails
- Never call it “failure” or “slipping.”
- Never force mode; always allow “Not now.”
- Do not reduce rewards for completions; only soften pressure.
- Limit prompts to **1 per 5 days**.

#### Telemetry Hooks
- `soft_landing_mode_entered`
- `soft_landing_mode_exited`
- `soft_landing_prompt_shown`
- `soft_landing_prompt_accepted`
- `soft_landing_grace_buffer_used`

**Done when**
- Signals, detection rules, soft-landing actions, UX touchpoints, guardrails, and telemetry are specified.

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

### 8.10 Feature Slice (P5.1): Single Habit + Reward + Identity Feedback
**Goal**: Ship one tight, end-to-end loop that proves the core system works with minimal surface area.

**Scope (MVP slice)**
- **One habit** per user (no multi-habit UI yet).
- **One reward** required at setup (simple create + redeem).
- **Identity feedback** after completion (single card, no deep stats).
- **Local-first** with sync; offline completions queue.

**Critical path (screen flow)**
1. **Setup**: choose life area → name tiny habit → pick time → create reward.
2. **Today**: 1 primary CTA (“Do my tiny habit”).
3. **Complete**: earn currency + redeem prompt.
4. **Identity**: show 1-sentence reflection + “keep going” CTA.

**Minimal data contracts**
- Habit: `id`, `title`, `schedule`, `created_at`.
- Reward: `id`, `title`, `category`, `cost`, `cooldown`.
- Economy: `balances` (Gold + Tokens).
- Identity: `vectors`, `last_message`, `updated_at`.
- Event log: `habit_completed`, `reward_redeemed`, `identity_message_shown`.

**UX requirements**
- Single-focus screens, 1 CTA per screen.
- Completion feedback within 500ms (optimistic UI).
- Reward redemption sheet includes cooldown + balance preview.

**Success criteria (done when)**
- User can complete the habit and redeem a reward in under 60 seconds.
- Identity message appears after completion (deterministic, rules-based).
- Offline completion queues and syncs without losing reward or identity updates.

**Deliverables**
- Basic habit setup flow (single habit enforced).
- Reward create + redeem flow wired to balances.
- Identity card rendering after completion.
- Telemetry events for completion, redemption, identity message.

---

### 8.11 Visual Growth Loop (P5.2): Zen Garden / Wisdom Tree

**Goal**: Ship a lightweight, visual identity-progress loop that grows with consistent action—without adding complex gameplay or multi-screen overhead.

#### Core Concept
Each completion drops a **“Growth Seed”** into a **Zen Garden** (short-term) that slowly cultivates a **Wisdom Tree** (long-term identity arc).  
This provides a **visual reward** that is calming, readable at a glance, and emotionally resonant.

#### Visual Layers (MVP)
1. **Zen Garden (Daily/Weekly)**
   - A small tile/scene that grows **1–3 micro-elements** per week.
   - Represents **recent consistency**.
2. **Wisdom Tree (Monthly/Seasonal)**
   - A single tree that grows **one stage** per 2–4 weeks of consistent action.
   - Represents **long-term identity evolution**.

#### Growth States (MVP)
**Zen Garden (weekly loop)**
- **State 0**: Empty sand + soft glow  
- **State 1**: 1 seed sprout  
- **State 2**: 2–3 sprouts + small stone  
- **State 3**: 1 small plant + subtle light rays  
- **State 4**: Garden in bloom (reset after weekly ritual)

**Wisdom Tree (monthly loop)**
- **Stage 1**: Sapling  
- **Stage 2**: Young tree  
- **Stage 3**: Strong tree  
- **Stage 4**: Flourishing tree + small fruit  
- **Stage 5**: Ancient tree (badge/title unlocked)

#### Growth Rules (MVP)
**Zen Garden**
- **+1 growth** on each habit completion (max 4 per week).
- **Day 7 ritual** finalizes the garden and **resets** to State 0 next week.
- If a week has **0 completions**, garden shows **soft wind** animation (no penalty).

**Wisdom Tree**
- **+1 stage** after **3+ weeks with ≥4 completions**.
- **Grace buffer**: a “bad week” doesn’t reduce stage, only pauses growth.
- **Power-Down Quests** count as **0.5** completions toward weekly totals.

#### UX Touchpoints
- **Today screen**: mini garden thumbnail (top-right) with 1-line copy:
  - “Your garden is growing.” / “A small seed today?”
- **Completion toast**: micro-sparkle + “Seed planted.”
- **Weekly ritual**: shows full Zen Garden state + “Carry a seed into your tree.”
- **Monthly check-in**: “Your Wisdom Tree grew to ___.”

#### Rewards & Identity Tie-In
- Zen Garden growth boosts **identity reflection** copy:
  - “You’re someone who shows up even in small ways.”
- Wisdom Tree stage unlocks:
  - **Stage 3**: 1 Key
  - **Stage 5**: Cosmetic badge/title (e.g., “Rooted”)

#### Data Model (Minimal)
```
GardenState {
  user_id
  week_start
  garden_state      // 0-4
  weekly_completions
  last_growth_at
}

WisdomTreeState {
  user_id
  stage            // 1-5
  streak_weeks     // count of qualifying weeks
  last_growth_at
}
```

#### Telemetry Hooks
- `garden_growth_incremented`
- `garden_week_finalized`
- `tree_stage_upgraded`
- `tree_stage_rewards_unlocked`

**Done when**
- Growth states and rules are defined.
- UX touchpoints specified for Today, completion, weekly ritual, and monthly check-in.
- Minimal data model + telemetry hooks documented.

---

### 8.12 Phase 6 Decision: MVP Currency Set (P6.1)

**Decision**: Ship **XP + Gold** as the MVP currency set.  
**Not shipping yet**: Energy, Tokens, Keys.

#### Rationale
- **Aligns with current product**: XP/levels already exist in the gamification system, so XP is a natural carry-forward.
- **Keeps the reward loop simple**: Gold is the single spendable currency for user-defined rewards.
- **Reduces cognitive load**: two currencies are easy to explain on Day 0–1.
- **Leaves room to expand**: Energy, Tokens, and Keys remain reserved for later progression layers.

#### MVP Behavior (Rules Snapshot)
- **XP**: Earned on habit completion and streak milestones; used for levels/identity feedback only.
- **Gold**: Earned on habit completion; spent on rewards.
- **No Energy/Token/Key balances** in the UI or data model during MVP.

#### UI/UX Implications
- Show **XP gain + Gold gain** together on completion.
- Reward creation shows **Gold cost** only.
- Identity feedback references XP/level progress (no multi-currency jargon).

#### Telemetry (Additions)
- `currency_xp_earned`
- `currency_gold_earned`
- `currency_gold_spent`

**Done when**
- MVP currency set is explicitly chosen, with rationale and UX implications.

---

### 8.13 Phase 6 Decision: Map XP/Level to Multi-Currency (P6.2)

**Goal**: Preserve the existing XP/level system as the **identity progression layer**, while converting the current **Points** currency into **Gold** for the MVP economy.

#### Current System Snapshot (What Exists Today)
- **XP + Levels**: `total_xp` and `current_level` drive identity progress and level-up notifications.
- **Points**: Earned at **1 point per 10 XP**, displayed as a spendable currency in the gamification header.
- **XP Transactions**: `xp_transactions` table logs XP earns for audit and UI history.

#### Mapping Rules (MVP)
1. **XP stays XP**  
   - Keep all existing XP earning rules, sources, and level thresholds intact.  
   - XP remains **non-spendable** and purely tied to identity/level progression.
2. **Points become Gold**  
   - Rename “Points” → **Gold** in UI copy and data semantics.  
   - **Gold = Points balance** (1:1 on migration).
3. **Gold earning mirrors existing Points logic**  
   - Continue awarding **1 Gold per 10 XP** across all XP sources.  
   - Result: no behavioral change for current users; just a naming and framing shift.
4. **Gold is spendable; XP is not**  
   - Rewards cost Gold; XP only affects levels and identity feedback.

#### Data Model Migration (Conceptual)
- `gamification_profiles.total_points` → **`gold_balance`** (new field)  
- Keep `total_points` as **legacy** for migration safety, then deprecate.
- No changes to XP tables needed for MVP.

#### UI/UX Adjustments
- Gamification header replaces **Points (💎)** with **Gold (🪙)**.
- Reward creation and redemption use **Gold** only.
- Level-up and XP progress visuals remain unchanged.

#### Telemetry Additions
- `currency_gold_earned` (mapped from XP → Gold conversion)
- `currency_gold_spent`
- `currency_xp_earned` (already used; confirm naming consistency)

**Done when**
- A clear mapping is defined between XP, levels, and Gold (formerly Points).
- Migration path for `total_points` → `gold_balance` is documented.
- UI language swap from Points → Gold is specified.

---

### 8.14 Phase 6 Decision: Identity Vector Visibility + Naming (P6.3)

**Decision**: Keep raw identity vectors **hidden by default**, and surface them as **friendly, user-facing “Identity Signals”** in lightweight places (identity card + optional detail sheet).

#### Rationale
- **Avoids cognitive load** early in onboarding; keeps Day 0–7 flow simple.
- **Preserves magic**: users feel “seen” without being asked to interpret stats.
- **Keeps room for evolution**: vectors can later become visible if/when users opt in.

#### Visibility Rules (MVP)
- **Default**: show only a 1–2 sentence **identity reflection** after completion or weekly ritual.
- **Optional detail**: a small “Why this?” link on the Identity card opens a sheet with up to **3 identity signals**.
- **No raw scores** in MVP; show **signal names + short descriptions** only.
- **Unlock timing**: identity signals detail sheet appears **after Day 3** or after the first weekly ritual, whichever comes first.

#### Naming Rules (User-Facing)
- Use **Identity Signals** as the umbrella term (avoid “stats” or “vectors”).
- Signal labels are friendly nouns:
  - **Discipline** → “Follow-Through”
  - **Resilience** → “Bounce-Back”
  - **Care** → “Kindness”
  - **Courage** → “Bravery”
  - **Creativity** → “Curiosity”
  - **Balance** → “Harmony”
- Each signal has a **1-line explanation** (e.g., “You keep promises to yourself.”).

#### UX Touchpoints
- **Completion**: “You’re becoming someone who keeps promises to yourself.”
- **Weekly ritual**: show the top 1 signal and a “Why this?” link.
- **Settings (optional)**: “Identity Signals” explanation card with opt-in to show signals earlier.

**Done when**
- Default visibility and unlock timing are defined.
- User-facing naming for all signals is finalized.
- UX touchpoints for reflection + optional details are specified.

### 8.15 Phase 6 Decision: Tree of Life Growth Loop (P6.4)

**Decision**: Anchor real-world meaning inside the **Zen Garden** as a **Tree of Life & Wisdom** that grows with weekly closure rituals, level-ups, and long-term consistency.

#### Rationale
- **Unified growth loop**: the Tree of Life becomes the long-term anchor, while the Zen Garden remains the short-term playground.
- **Clear identity arc**: one master tree ties progression to wisdom rather than external impact tally.
- **Scalable**: can still connect to real-world impact later without changing the core growth loop.

#### MVP Rules (Tree of Life & Wisdom)
- **Unit**: 1 watering = 1 growth credit (system-managed, not user-spendable).
- **Earn triggers** (MVP):
  - **Weekly closure** completed → +1 watering.
  - **30-day streak milestone** → +3 waterings.
  - **Seasonal event completion** → +5 waterings (if seasonal events are active).
  - **Level-up** → +1 watering (reinforces long-term progression).
- **Visibility**:
  - Show a **Tree of Life growth counter** in the dashboard footer and Zen Garden.
  - Show a **celebration modal** when the tree grows (1–2 lines of warm copy).
  - Offer a “See growth” detail sheet (ledger + dates).
- **Copy tone**: quiet pride, non-judgmental (“Your Tree of Life grew stronger.”).

#### Data Notes (MVP)
- **Tree ledger** table or JSON log: `date`, `source`, `amount`, `notes`.
- **Growth stages**: store `stage` or `level` when ready (optional in MVP).

#### Telemetry Hooks
- `tree_of_life_awarded` (source, amount, streak_length, season_id?, level?)
- `tree_of_life_viewed` (surface: modal | detail_sheet)

**Done when**
- Feature selected and named.
- MVP rules and triggers defined.
- Visibility and telemetry defined.

## 9) Roadmap (Step-by-Step, AI-Friendly)

> **Rule**: Work one step at a time. Log it in Section 12.

### Phase 1 — Foundations (Product & Systems)
- [x] **P1.1** Validate reward object model (fields + constraints)
- [x] **P1.2** Define currency earning rules (XP, Energy, Tokens, Keys, Gold)
- [x] **P1.3** Draft reward validation heuristics (anti-sabotage)
- [x] **P1.4** Define reward evolution states + triggers
- [x] **P1.5** Map Identity Engine vector logic (inputs → traits → outputs)

### Phase 2 — Retention Loop + Onboarding
- [x] **P2.1** Create Day 0–1 onboarding script (copy + UX steps)
- [x] **P2.2** Day 2–7 prompts + UI touchpoints
- [x] **P2.3** “First Miss” flow + Power-Down Quest definition
- [x] **P2.4** Weekly closure ritual (copy + UX)

### Phase 3 — Social & Stakes
- [x] **P3.1** Party system MVP (shared stakes + shared reward)
- [x] **P3.2** Optional commitment contracts (Beeminder-style)
- [x] **P3.3** Seasonal events / community arcs

### Phase 4 — AI Layer
- [x] **P4.1** Motivation style matching (inputs → personas)
- [x] **P4.2** Reward pacing optimizer (avoid burnout + boredom)
- [x] **P4.3** “Bad week” detection & soft-landing mode

### Phase 5 — MVP Build Plan
- [x] **P5.1** Feature slice: single habit + reward + identity feedback
- [x] **P5.2** Zen Garden/Wisdom Tree visual growth loop
- [x] **P5.3** Analytics & retention instrumentation

### Phase 6 — Roadmap Iteration (Decisions + Sequencing)
- [x] **P6.1** Decide MVP currency set (which of XP/Energy/Tokens/Keys/Gold ship first)
- [x] **P6.2** Map existing XP/level system to the multi-currency economy
- [x] **P6.3** Decide identity vector visibility + naming (user-facing vs. hidden)
- [x] **P6.4** Define Tree of Life growth loop (Zen Garden master tree)
- [x] **P6.5** Pick first reward evolution example to ship
- [x] **P6.6** Review open questions and draft the next roadmap iteration

### Phase 7 — MVP Build Execution (Product + Engineering)
- [x] **P7.1** Rename Points → Gold in UI + data model (migration + copy)
- [x] **P7.2** Implement reward creation + redemption flow with Gold spend
- [x] **P7.3** Ship Day 0–1 onboarding flow (single habit + reward loop)
- [x] **P7.4** Add Identity Signals card + “Why this?” detail sheet (post-Day 3)
- [x] **P7.5** Add Tree of Life ledger + weekly watering trigger
- [x] **P7.6** Align Zen Garden visuals with Tree of Life growth milestones (level-ups + waterings)
- [x] **P7.7** Log level-up milestones into the Tree of Life ledger
- [x] **P7.8** Surface Tree of Life level-up milestone details in the impact ledger sheet (copy + metadata)
- [x] **P7.9** Add config-driven labels for Tree of Life impact sources (weekly closure, level-ups, streaks)
- [x] **P7.10** Define streak-based Tree of Life award rules (30-day streak trigger + copy)
- [x] **P7.11** Add Tree of Life streak award telemetry + surface streak growth moment in UI
- [x] **P7.12** Add streak milestone tagging in the Tree of Life ledger UI

### Phase 8 — Post-MVP Polish (Config-First, Small Steps)
- [x] **P8.1** Add reward cooldown support (config + enforcement in redemption flow)
- [x] **P8.2** Add reward category tagging (Rest, Fun, Growth, Treat, Social, Meta) to creation + display
- [x] **P8.3** Add reward evolution seed state (State 0 → 1 prompt after 3 redemptions in 7 days)
- [x] **P8.4** Extend streak milestones config (add Day 7 + Day 14 Tree of Life awards alongside Day 30)
- [x] **P8.5** Add reward pacing state detection (Underfed / Balanced / Overfed rules-based engine)
- [x] **P8.6** Centralize Identity Signal copy config (friendly labels + 1-line explanations in a shared config)

### Phase 9 — UX & Engagement Layers (Spec → Build)
- [x] **P9.1** Build reward validation heuristics UI (risk scoring nudges + guardrail options from §7.1)
- [ ] **P9.2** Build Party system UI (shared stakes, party check-in chip, shared reward flow from §7.4)
- [ ] **P9.3** Build Seasonal events UI (event chip, micro-action cards, finale ritual from §7.6)
- [ ] **P9.4** Build Motivation style matching engine (persona detection, copy adaptation, scoring rules from §7.7)
- [ ] **P9.5** Build Reward pacing optimizer UI (Underfed/Overfed nudges, post-completion chips from §7.8 — engine in P8.5, now add UI)
- [ ] **P9.6** Build "Bad week" detection + soft-landing mode UI (miss cluster detection, grace buffer, soft banner from §7.9)
- [ ] **P9.7** Build Zen Garden visual growth loop (garden states, Wisdom Tree stages, growth rules, Today thumbnail from §8.11)

---

## 10) Open Questions (Keep Current)

- None currently.

---

## 11) Decisions Log

> Add decisions here when locked.  
> Format: **Date — Decision — Rationale**

- **2026-02-05 — MVP currency set = XP + Gold —** Aligns with existing gamification, keeps rewards simple, and defers Energy/Tokens/Keys until post-MVP.
- **2026-02-05 — Map Points to Gold; keep XP/levels unchanged —** Maintains existing XP behavior while re-framing Points as the MVP spendable currency.
- **2026-02-07 — Hide raw identity vectors; surface “Identity Signals” —** Keeps onboarding light while still giving users a readable identity reflection without stat overload.
- **2026-02-07 — Tree of Life growth loop —** Anchor long-term meaning in the Zen Garden master tree, with weekly closure waterings and growth stages.
- **2026-02-08 — First reward evolution example = “Coffee break” ladder —** Universal, low-friction ritual that naturally evolves into reflection + light movement + optional social warmth.
- **2026-02-08 — Identity Engine name = “Path” (user-facing) —** Short, warm, and action-oriented (“You’re on a Path”), fits daily progress language without mysticism overload.

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

- **2025-02-14**  
  - **Step**: P1.1 Validate reward object model (fields + constraints)  
  - **What changed**: Added Reward object validation spec with field rules, constraints, and guardrails.  
  - **What’s next**: P1.2 Define currency earning rules (XP, Energy, Tokens, Keys, Gold).

- **2025-02-14**  
  - **Step**: P1.2 Define currency earning rules (XP, Energy, Tokens, Keys, Gold)  
  - **What changed**: Added detailed earning/spending rules for XP, Gold, Energy, Tokens, and Keys, plus milestone triggers.  
  - **What’s next**: P1.3 Draft reward validation heuristics (anti-sabotage).

- **2025-03-05**  
  - **Step**: P1.3 Draft reward validation heuristics (anti-sabotage)  
  - **What changed**: Added heuristic signals, risk scoring, guardrail options, and warm nudge copy for reward validation.  
  - **What’s next**: P1.4 Define reward evolution states + triggers.

- **2025-03-05**  
  - **Step**: P1.4 Define reward evolution states + triggers  
  - **What changed**: Added reward evolution states, triggers, upgrade rules, and example mappings for MVP.  
  - **What’s next**: P1.5 Map Identity Engine vector logic (inputs → traits → outputs).

- **2025-03-10**  
  - **Step**: P7.10 Define streak-based Tree of Life award rules (30-day streak trigger + copy)  
  - **What changed**: Added Tree of Life 30-day streak award logic and ledger entry copy, with a safeguarded milestone log.  
  - **What’s next**: P7.11 Add Tree of Life streak award telemetry + surface streak growth moment in UI.

- **2025-03-05**  
  - **Step**: P1.5 Map Identity Engine vector logic (inputs → traits → outputs)  
  - **What changed**: Added Identity Engine vector logic map with input signals, trait mappings, user-facing reflections, unlocks, weights, and stability rules.  
  - **What’s next**: P2.1 Create Day 0–1 onboarding script (copy + UX steps).

- **2025-03-05**  
  - **Step**: P2.1 Create Day 0–1 onboarding script (copy + UX steps)  
  - **What changed**: Added a Day 0–1 onboarding script with screen-by-screen copy, CTAs, and UX flow to deliver a first habit completion and reward redemption in under three minutes.  
  - **What’s next**: P2.2 Day 2–7 prompts + UI touchpoints.

- **2025-03-11**  
  - **Step**: P7.11 Add Tree of Life streak award telemetry + surface streak growth moment in UI  
  - **What changed**: Added streak award telemetry and a UI celebration that surfaces Tree of Life streak growth moments from the impact ledger.  
  - **What’s next**: P7.12 Add streak milestone tagging in the Tree of Life ledger UI.

- **2025-03-11**  
  - **Step**: P7.12 Add streak milestone tagging in the Tree of Life ledger UI  
  - **What changed**: Added a streak milestone tag in the Tree of Life ledger list to highlight streak-based growth moments.  
  - **What’s next**: Define the next roadmap slice for post-MVP polish (small, config-first).

- **2025-03-05**  
  - **Step**: P2.2 Day 2–7 prompts + UI touchpoints  
  - **What changed**: Added detailed Day 2–7 prompts, UI touchpoints, and notification nudges with per-day goals and constraints to keep the loop light and progressive.  
  - **What’s next**: P2.3 “First Miss” flow + Power-Down Quest definition.

- **2026-02-04**  
  - **Step**: P2.3 “First Miss” flow + Power-Down Quest definition  
  - **What changed**: Added trigger rules, mobile-first flow steps, Power-Down Quest definition + sample library, copy rules, and telemetry hooks for the first miss recovery experience.  
  - **What’s next**: P2.4 Weekly closure ritual (copy + UX).

- **2026-02-04**  
  - **Step**: P2.4 Weekly closure ritual (copy + UX)  
  - **What changed**: Added weekly closure ritual flow, 3-card layout, copy rules, evolve mini-flow, and telemetry hooks to close the weekly loop and invite gentle evolution.  
  - **What’s next**: P3.1 Party system MVP (shared stakes + shared reward).

- **2026-02-05**  
  - **Step**: P3.1 Party system MVP (shared stakes + shared reward)  
  - **What changed**: Added party system MVP spec covering party object, stake rules, daily loop, fail handling, and telemetry hooks.  
  - **What’s next**: P3.2 Optional commitment contracts (Beeminder-style).

- **2026-02-06**  
  - **Step**: P3.2 Optional commitment contracts (Beeminder-style)  
  - **What changed**: Added commitment contract MVP spec with data model, setup flow, evaluation rules, miss recovery, safety caps, and telemetry hooks.  
  - **What’s next**: P3.3 Seasonal events / community arcs.

- **2026-02-06**  
  - **Step**: P3.3 Seasonal events / community arcs  
  - **What changed**: Added seasonal event MVP spec with event object, community arc rules, daily loop, rewards, copy tone, and telemetry hooks.  
  - **What’s next**: P4.1 Motivation style matching (inputs → personas).

- **2026-02-06**  
  - **Step**: P4.1 Motivation style matching (inputs → personas)  
  - **What changed**: Added motivation persona model, signals, scoring, adaptation rules, safeguards, and telemetry hooks for AI-driven tone matching.  
  - **What’s next**: P4.2 Reward pacing optimizer (avoid burnout + boredom).

- **2026-02-07**  
  - **Step**: P4.2 Reward pacing optimizer (avoid burnout + boredom)  
  - **What changed**: Added reward pacing optimizer spec with pacing states, detection rules, optimizer actions, guardrails, UX touchpoints, and telemetry hooks to balance burnout vs. boredom.  
  - **What’s next**: P4.3 “Bad week” detection & soft-landing mode.

- **2025-03-09**  
  - **Step**: P4.3 “Bad week” detection & soft-landing mode  
  - **What changed**: Added bad-week detection signals, rules, soft-landing actions, UX touchpoints, guardrails, and telemetry hooks to soften pressure and preserve identity progress.  
  - **What’s next**: P5.1 Feature slice: single habit + reward + identity feedback.

- **2026-02-05**  
  - **Step**: P5.1 Feature slice: single habit + reward + identity feedback  
  - **What changed**: Added MVP slice scope, critical path flow, minimal data contracts, UX requirements, success criteria, and deliverables for the single-habit reward + identity loop.  
  - **What’s next**: P5.2 Zen Garden/Wisdom Tree visual growth loop.

- **2026-02-05**  
  - **Step**: P5.2 Zen Garden/Wisdom Tree visual growth loop  
  - **What changed**: Added visual growth loop spec with Zen Garden and Wisdom Tree states, growth rules, UX touchpoints, identity rewards, minimal data model, and telemetry hooks.  
  - **What’s next**: P5.3 Analytics & retention instrumentation.

- **2026-02-05**  
  - **Step**: P5.3 Analytics & retention instrumentation  
  - **What changed**: Added MVP analytics events catalog with base event contract, required properties, retention calculation guidance, and a suggested Supabase event table schema.  
  - **What’s next**: Review open questions and decide next roadmap iteration.

- **2026-02-05**  
  - **Step**: Roadmap iteration draft (Phase 6)  
  - **What changed**: Added Phase 6 decision-focused steps to sequence the next iteration around currencies, XP mapping, identity visibility, real-world meaning, and reward evolution examples.  
  - **What’s next**: Start P6.1 (decide MVP currency set).

- **2026-02-05**  
  - **Step**: P6.1 Decide MVP currency set (which of XP/Energy/Tokens/Keys/Gold ship first)  
  - **What changed**: Chose XP + Gold as the MVP currency set, documented rationale, UX implications, telemetry, and deferred Energy/Tokens/Keys.  
  - **What’s next**: P6.2 Map existing XP/level system to the multi-currency economy.

- **2026-02-05**  
  - **Step**: P6.2 Map existing XP/level system to the multi-currency economy  
  - **What changed**: Documented XP/level continuity, Points → Gold mapping, migration notes, UI copy changes, and telemetry updates for the MVP economy.  
  - **What’s next**: P6.3 Decide identity vector visibility + naming (user-facing vs. hidden).

- **2026-02-07**  
  - **Step**: P6.3 Decide identity vector visibility + naming (user-facing vs. hidden)  
  - **What changed**: Chose to keep raw vectors hidden, defined “Identity Signals” naming, set visibility/unlock rules, and specified UX touchpoints for reflections and optional details.  
  - **What’s next**: P6.4 Define Tree of Life growth loop (Zen Garden master tree).

- **2026-02-07**  
  - **Step**: P6.4 Define Tree of Life growth loop (Zen Garden master tree)  
  - **What changed**: Scoped the Tree of Life & Wisdom as the long-term growth anchor inside the Zen Garden, with weekly closure waterings and visibility rules.  
  - **What’s next**: P6.5 Pick first reward evolution example to ship.

- **2026-02-08**  
  - **Step**: P6.5 Pick first reward evolution example to ship  
  - **What changed**: Selected the “Coffee break” reward evolution ladder as the first MVP example and documented the rationale for its low-friction, warm progression.  
  - **What’s next**: Review open questions and decide next roadmap iteration.

- **2026-02-08**  
  - **Step**: P6.6 Review open questions and draft the next roadmap iteration  
  - **What changed**: Resolved the Identity Engine naming decision (“Path”), cleared the open question list, and added Phase 7 MVP build execution steps for implementation sequencing.  
  - **What’s next**: P7.1 Rename Points → Gold in UI + data model (migration + copy).

- **2026-02-09**  
  - **Step**: P7.1 Rename Points → Gold in UI + data model (migration + copy)  
  - **What changed**: Updated the economy naming to Gold across UI labels, spin rewards, power-ups, and trophies, plus refreshed the XP conversion helpers and telemetry metadata to use Gold terminology.  
  - **What’s next**: P7.2 Implement reward creation + redemption flow with Gold spend.

- **2026-02-10**  
  - **Step**: P7.2 Implement reward creation + redemption flow with Gold spend  
  - **What changed**: Added the Player Shop reward builder and redemption UI, plus local reward storage and Gold spend handling for custom rewards.  
  - **What’s next**: P7.3 Ship Day 0–1 onboarding flow (single habit + reward loop).

- **2026-02-11**  
  - **Step**: P7.3 Ship Day 0–1 onboarding flow (single habit + reward loop)  
  - **What changed**: Added a new Day 0–1 onboarding flow with a single-habit setup, reward definition, and quick completion loop, plus updated quick-start nudges and copy.  
  - **What’s next**: P7.4 Add Identity Signals card + “Why this?” detail sheet (post-Day 3).

- **2026-02-06**  
  - **Step**: P7.4 Add Identity Signals card + “Why this?” detail sheet (post-Day 3)  
  - **What changed**: Added the post-Day 3 Identity Signals card to the mobile Today view plus a “Why this?” detail sheet.  
  - **What’s next**: Confirm the next MVP execution step.

- **2026-02-08**  
  - **Step**: P7.5 Add Tree of Life ledger + weekly watering trigger  
  - **What changed**: Implemented the Tree of Life ledger, weekly closure watering trigger, celebration modal, and growth detail sheet in the dashboard footer.  
  - **What’s next**: Align Zen Garden visuals so the master tree grows on level-up + watering milestones.

- **2026-02-12**  
  - **Step**: P7.6 Align Zen Garden visuals with Tree of Life growth milestones (level-ups + waterings)  
  - **What changed**: Added a Tree of Life growth card inside the Zen Garden that reflects level-ups plus weekly waterings, with progress toward the next growth milestone.  
  - **What’s next**: P7.7 Log level-up milestones into the Tree of Life ledger.

- **2026-02-08**  
  - **Step**: P7.7 Log level-up milestones into the Tree of Life ledger  
  - **What changed**: Added Tree of Life ledger entries when users level up so growth milestones are recorded alongside weekly waterings.  
  - **What’s next**: P7.8 Surface Tree of Life level-up milestone details in the impact ledger sheet (copy + metadata).

- **2026-02-08**  
  - **Step**: P7.8 Surface Tree of Life level-up milestone details in the impact ledger sheet (copy + metadata)  
  - **What changed**: Updated the Tree of Life impact ledger copy to include level-up milestone details and clarified growth moment messaging alongside weekly waterings.  
  - **What’s next**: P7.9 Add config-driven labels for Tree of Life impact sources (weekly closure, level-ups, streaks).

- **2026-02-08**  
  - **Step**: P7.9 Add config-driven labels for Tree of Life impact sources (weekly closure, level-ups, streaks)  
  - **What changed**: Centralized Tree of Life impact source labels in a shared config and wired the ledger UI to read labels and fallback details from it.  
  - **What’s next**: P7.10 Define streak-based Tree of Life award rules (30-day streak trigger + copy).

- **2026-02-10**  
  - **Step**: Phase 8 roadmap definition (post-MVP polish slice)  
  - **What changed**: Added Phase 8 — Post-MVP Polish to the roadmap with six config-first steps: reward cooldowns (P8.1), reward categories (P8.2), reward evolution seed state (P8.3), extended streak milestones (P8.4), reward pacing detection (P8.5), and centralized Identity Signal copy (P8.6). All steps are small, additive, and config-driven.  
  - **What’s next**: P8.1 Add reward cooldown support (config + enforcement in redemption flow).

- **2026-02-10**  
  - **Step**: P8.1 Add reward cooldown support (config + enforcement in redemption flow)  
  - **What changed**: Added cooldownType (none/daily/custom) and cooldownHours fields to RewardItem, enforced cooldown in the redemption service, and surfaced cooldown selection in the Player Shop creation form plus cooldown status on reward cards.  
  - **What’s next**: P8.2 Add reward category tagging (Rest, Fun, Growth, Treat, Social, Meta) to creation + display.


- **2026-02-10**  
  - **Step**: P8.2 Add reward category tagging (Rest, Fun, Growth, Treat, Social, Meta) to creation + display  
  - **What changed**: Added RewardCategory type ('Rest', 'Fun', 'Growth', 'Treat', 'Social', 'Meta') to types, category field to RewardItem interface with default 'Treat', category picker UI in ScoreTab with 6 pill buttons showing emoji+label, category badge display on reward cards, and CSS styling for category UI components.  
  - **What's next**: P8.3 Add reward evolution seed state (tracks reward maturity/unlock time).

- **2026-02-11**  
  - **Step**: P8.4 Extend streak milestones config (add Day 7 + Day 14 Tree of Life awards alongside Day 30)  
  - **What changed**: Added Day 7 (+1 watering) and Day 14 (+2 waterings) Tree of Life awards alongside existing Day 30 (+3 waterings, updated from +1) and Day 100 (+5 waterings) milestones. Created centralized STREAK_TREE_MILESTONES config. Added STREAK_14_DAYS: 250 XP reward constant. Updated ImpactTreeSource type from 'streak_30' to 'streak_milestone' for generalized streak handling. Updated telemetry event from 'tree_streak_award' to 'tree_of_life_awarded' with streak_milestone source and amount metadata.  
  - **What's next**: P8.5 Add reward pacing state detection (Underfed / Balanced / Overfed rules-based engine).

- **2026-02-11**  
  - **Step**: P8.5 Add reward pacing state detection (Underfed / Balanced / Overfed rules-based engine)  
  - **What changed**: Added rules-based reward pacing engine with Underfed/Balanced/Overfed detection, suggestion generation (upgrade/ritual/new for Underfed; cooldown/bank/swap for Overfed), guardrails (1x per 3 days prompt limit), localStorage persistence (lifegoal_reward_pacing_{userId}), and telemetry hooks (reward_pacing_state_assigned, reward_pacing_prompt_shown, reward_pacing_action_taken, reward_pacing_prompt_dismissed). Created src/lib/rewardPacing.ts with analyzeRewardPacing(), canShowPrompt(), and markPromptShown() functions. Added PacingState, PacingAnalysis, PacingSuggestion types to src/types/gamification.ts. Integrated pacing chip into ScoreTab with visual prompt banner (purple gradient) showing suggestion icon, title, description, and "Not now"/"Got it" action buttons. Detection rules: Underfed if 2+ signals (no redemption 7d + 3+ completions, declining completions ≥40%), Overfed if 2+ signals (daily redemptions 5+ days, cost trending down ≥30%, low variety >80%).  
  - **What's next**: P8.6 Centralize Identity Signal copy config (friendly labels + 1-line explanations in a shared config).

- **2026-02-11**  
  - **Step**: P8.6 Centralize Identity Signal copy config (friendly labels + 1-line explanations in a shared config)  
  - **What changed**: Created centralized identity signal config (src/lib/identitySignalConfig.ts) with IdentitySignalConfig interface and IDENTITY_SIGNALS array containing all 6 identity vectors with friendly user-facing labels (Discipline→Follow-Through, Resilience→Bounce-Back, Care→Kindness, Courage→Bravery, Creativity→Curiosity, Balance→Harmony), 1-line descriptions, reflection messages (high/growing), icons (🎯🛡️💛🦁🎨⚖️), and accent colors. Added helper functions: getSignalConfig(key), getSignalLabel(key), getSignalReflection(key, strength), getTopSignals(vectors, count). Added IdentityVectorKey type to src/types/gamification.ts. No existing hardcoded identity vector copy found in components (current Identity Signals card uses personality test data, not vector-specific labels). Build passes successfully.  
  - **What's next**: Phase 8 complete! Review Phase 9 options or address open polish items.

- **2026-02-11**  
  - **Step**: Reward evolution State 2→3 (Transformative) polish  
  - **What changed**: Replaced State 2→3 placeholder with full category-specific Transformative templates (Rest→connection, Fun→creative, Social→shared goals, Growth→teaching, Treat→mindfulness, Meta→identity reflection). Updated shouldPromptEvolution to allow State 2→3 transitions (changed evolutionState >= 2 to >= 3). Added State 2 modal copy ("🌳 Transform..." with growth story prompt). Added "🌳 Evolved" badge on fully evolved State 3 rewards with green styling. All changes in src/lib/rewardEvolution.ts, src/services/rewards.ts, src/features/gamification/RewardEvolutionModal.tsx, src/features/gamification/ScoreTab.tsx, and src/styles/gamification.css. Build passes successfully. Telemetry events already support State 2→3 transitions via fromState/toState metadata.  
  - **What's next**: Evaluate Phase 9 roadmap or additional polish items.

- **2026-02-11**  
  - **Step**: P8.3 marked as Done + Phase 9 roadmap defined  
  - **What changed**: Confirmed P8.3 reward evolution (State 0→1→2→3) is fully implemented with modal UI, service functions, evolution templates, ScoreTab integration, and telemetry. Marked P8.3 checkbox as done. Added Phase 9 roadmap with 7 steps covering reward validation UI, party system, seasonal events, motivation matching, pacing optimizer UI, soft-landing mode, and Zen Garden visual loop — all based on existing specs from §7 and §8.  
  - **What's next**: Begin P9.1 (reward validation heuristics UI) or prioritize based on user impact.


- **2026-02-16**  
  - **Step**: P9.1 Build reward validation heuristics UI (risk scoring nudges + guardrail options from §7.1)  
  - **What changed**: Added a rules-based reward validation helper that scores draft rewards into green/yellow/red risk bands, explains why the score was assigned, and provides one-tap guardrail actions (add cooldown, raise cost, or habit-pairing reminder). Integrated this into the Player Shop reward creation form as a live risk card with actionable buttons and styling.  
  - **What's next**: P9.2 Build Party system UI (shared stakes, party check-in chip, shared reward flow from §7.4).


- **2026-02-17**  
  - **Step**: Slice B — Recovery actions (Reset Contract + Reduce Stake)  
  - **What changed**: Implemented reset-contract and reduce-stake recovery actions end-to-end with eligibility checks (2 misses in 30 days + one-time guardrail), telemetry instrumentation, UI wiring in miss results, and implementation validation via TypeScript build.  
  - **What’s next**: Slice C — persistence hardening (Supabase contracts/evaluations + backend-first service paths).


- **2026-02-17**  
  - **Step**: Slice C — Persistence hardening (Supabase contracts/evaluations + backend-first service paths)  
  - **What changed**: Added Supabase migration `0140_commitment_contracts.sql` to create `commitment_contracts` + `commitment_contract_evaluations` with guardrail constraints, indexes, RLS policies, and updated-at trigger wiring. Updated `commitmentContracts` service to read/write contracts and evaluations backend-first when authenticated/Supabase-ready, while preserving localStorage demo fallback behavior. Added typed database table definitions for both new tables.  
  - **What’s next**: Outcome quality improvements — auto-link contract progress to verified habit/goal completions (reduce manual progress taps).


- **2026-02-18**  
  - **Step**: Slice D — Outcome quality (auto-link contract progress to verified completions)  
  - **What changed**: Added a contract progress sync path that automatically maps active Habit contracts to verified `habit_logs_v2` completions in the current window and Goal contracts to achieved goals within the active window. Wired Contracts tab load logic to run this sync before evaluation and added a 60-second in-tab refresh loop so progress updates even when users do not tap “Mark Progress.” Updated the implementation sprint checklist to mark Slice D done.  
  - **What’s next**: Outcome quality follow-up — add “on pace / at risk” forecasting and rescue nudges before window close.

- **2026-02-18**
  - **Step**: Slice E — Unattended window reliability (due-window evaluation sweep + surfaced outcome)
  - **What changed**: Added `evaluateDueContracts` in the commitment contracts service to sweep and evaluate every due active contract in one pass, then wired Contracts tab loading to run this sweep before choosing the primary card so unattended windows are still resolved and the latest evaluation outcome modal is surfaced automatically. Updated the implementation sprint checklist to mark Slice E done.
  - **What’s next**: Outcome quality follow-up — add “on pace / at risk” forecasting and rescue nudges before window close.

- **2026-02-18**
  - **Step**: Slice F — Pace forecasting + rescue nudges (on-pace/at-risk guidance)
  - **What changed**: Added a contract pace forecast helper that compares current progress against elapsed cadence-window time and classifies each active contract as target-met, on-pace, or at-risk. Wired the Contracts status card to show a warm “on pace / at risk” guidance panel with rescue copy and switched the primary action label to “Rescue Progress” when urgency is detected. Updated the implementation sprint checklist to mark Slice F done.
  - **What’s next**: Contract outcome quality follow-up — telemetry-backed rescue effectiveness analysis and optional pre-close reminder scheduling.

- **2026-02-18**
  - **Step**: Slice G — Adaptive recovery ramp (guided gentle ramp week)
  - **What changed**: Implemented a new guided recovery action in missed-contract results that unlocks after repeated misses and temporarily lowers the contract target for a gentle ramp week. Added end-to-end service support, telemetry events, persistence fields + Supabase migration, and UI feedback that shows when gentle ramp mode is active and auto-restores the original target after a successful recovery window.
  - **What’s next**: Contract impact follow-up — add history analytics and trend summaries for completed/missed contract windows.


- **2026-02-18**
  - **Step**: Slice H — Contract history insights (analytics + trend summaries)
  - **What changed**: Added a contract history analytics helper that summarizes success rate, current/best streaks, bonus earned, stake forfeited, and improving/steady/needs-support trend classification from evaluation records. Integrated a new in-tab Contract History card in the Contracts surface that renders KPI chips plus a recent window outcome list so users can review momentum without leaving the tab. Updated the implementation sprint checklist to mark Slice H done.
  - **What’s next**: Contract impact follow-up — add streak-adjusted reward multipliers tied to sustained contract keeps.

