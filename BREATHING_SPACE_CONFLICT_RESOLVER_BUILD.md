# Breathing Space – Conflict Resolver (Build Plan)

## Goal
Ship a **mobile-first Conflict Resolver** inside the Breathing Space experience that uses a grounded, guided, AI-assisted flow to turn miscommunication into shared clarity. The flow should feel calm, visual, and button-driven, while still capturing meaningful free-text input.

## Experience framing
- **Tone:** grounded, non-judgmental, hopeful.
- **Promise:** “Miscommunication is usually the catalyst from simple to problematic. And it’s preprogrammed by player incompatibility, but can be reprogrammed with repeated guided communication.”
- **Design language:** simple, visual cards, natural CTA buttons, subtle motion/haptics, and mobile-first layout.

## Core concept: Player Hand & Conflict Strategy
- Each user has **Trait Cards** (from the Personality Test).
- A combined **hand** shows strengths/weaknesses in how the pair handles conflict.
- Conflict resolution guidance adapts to each player’s hand, but stays **synchronized** so both see compatible, aligned guidance.
- **“Deal of the Hand” / White Flag**: a persistent action that lets either party propose a compromise or positive negotiation offer. The AI then frames it as a constructive move to keep momentum.

## Flow Overview (MVP)

### Step 0 — Choose conflict type (required)
**Goal:** Start with the right mode and lower entry friction.
- Option A: **Inner Tension** (you vs yourself).
- Option B: **Shared Conflict** (you + 1 or more other people).
- Reassuring helper copy:
  - “No blame. No public shaming. Just structured clarity.”
  - “You stay in control of your words; AI helps with tone and understanding.”

### Step 1 — Quick Grounding (required)
**Goal:** De-escalate and align on shared humanity.
- Visual reminder animation: “We all have the same value.”
- Statements:
  - “People are not evil at heart.”
  - “Miscommunication is usually the catalyst from simple to problematic. And it’s preprogrammed by player incompatibility, but can be reprogrammed with repeated guided communication.”
- CTA: “Now… let’s clear the air in this conflict.”

### Step 2 — Internal Conflict (optional)
**Goal:** Let someone privately clarify their own conflict first.
- **Single internal conflict** path.
- **Parties → Share** flow (inspired by Kahoot-style sharing):
  - Individual reflection cards.
  - Optional reveal / share round with simple prompts.

### Step 3 — Collect & Pile (required)
**Goal:** Gather guided answers plus free-text.
- **Guided prompts** for must-have answers (e.g., “What happened?”, “What do you need?”, “What outcome would feel fair?”).
- **Free-text block** for anything else.
- AI summarizes responses into **neutral “pile” statements**.

### Step 4 — Parallel Read (required)
**Goal:** Ensure each party reads the same summary with a focused first pass.
- **Timer-based overview** (lock-in wins, prevent impulsive edits).
- **Parallel, separated view** (each party reads privately).
- After timer:
  - Collect notes and feedback.
  - Option to run a second pass with edits.
- Remind users of “wins” captured in first pass throughout the session.

### Step 5 — Repair & Resolution (required)
**Goal:** Convert understanding into a fair, accepted, concrete outcome.
- Co-create options and negotiation terms with AI-assisted objective brainstorming.
- Add **Apology Alignment**:
  - Select apology style per party (acknowledgment, responsibility, repair commitment, reassurance).
  - Queue and deliver apologies at coordinated timing if both parties opt in.
- Finalize:
  - Shared “What we agree on now”
  - Personal “What I’ll do next”
  - Optional follow-up checkpoint date.

## Interaction patterns
- **Clickable natural buttons:** “I’m ready”, “Not yet”, “Let’s try again”, “Offer compromise”.
- **Haptics:** short taps for confirmations, longer for milestone transitions.
- **Animation cues:** slow, calming transitions for Step 1; snappy, confirmatory cues for Step 3–4.

## AI behavior & prompt notes
- AI **adapts tone and guidance** to each player’s Trait Cards (personality hand).
- AI output stays **synchronized** between both parties (aligned guidance, not contradictory advice).
- AI should:
  - Use neutral language (no blame).
  - Highlight shared goals.
  - Offer specific micro-steps for compromise or repair.
  - Reflect each party’s vocabulary without mirroring harmful language.
  - Behave as an **expert mediator** (de-escalation + negotiation + restorative communication).
  - Make both parties feel heard without “taking sides.”
  - Intervene when someone pushes solutions too early by pacing the flow and explaining why.

## Safety, trust, and non-threatening communication
- “Psychological safety by design”:
  - No insults, contempt, threats, coercion, or humiliation in surfaced text.
  - Rewrite suggestions preserve intent while removing disrespect.
  - Explain edits transparently: “Tone softened to improve understanding.”
- “Dual-validation” UX:
  - Each person sees “Your perspective is captured.”
  - Each person sees “Their perspective is also validly represented.”
- “No hijack” pacing:
  - Stage gates prevent skipping critical understanding steps.
  - Early solution offers are parked in a visible “Proposal queue” until both are ready.
  - Timers are calm guidance, not pressure; users can request extra reading time.

## Data capture (MVP)
- Session record: `conflict_session`
  - participants (user IDs or anonymous IDs)
  - conflict_type (`inner_tension` | `shared_conflict`)
  - trait_cards_snapshot (per participant)
  - prompts + responses
  - AI summary + final agreement notes
  - apology_plan + delivery_status
  - proposal_queue + acceptance_state
  - timestamps and duration

## UI components (mobile-first)
- **Conflict type chooser** (Inner Tension vs Shared Conflict).
- **Grounding card** with animation and 3 core statements.
- **Prompt cards** (guided + free text).
- **White Flag CTA** (persistent floating button or footer CTA).
- **Parallel read screens** (timer + summary + notes).
- **Apology Alignment card** (type + timing + consent to deliver).
- **Proposal queue panel** (holds early offers until proper stage).
- **Progress rail** (Step 0 → Step 5, simple dots).

## Open questions
- Should the optional Step 2 be shown by default or tucked behind “Need a solo moment?”
- Should the timer duration be dynamic based on summary length?
- How do we handle anonymous/shared sessions when only one party has an account?

## Milestones
1. **Copy & UX wireframes** (Steps 1–4, mobile layout).
2. **Trait Card integration** (hand view + AI adaptation hooks).
3. **Session data model** (local + Supabase).
4. **Step flow implementation** (navigation + timers + summaries).
5. **Haptics + animation polish**.

## Acceptance criteria
- Users can complete Step 0 → Step 5 on mobile without confusion.
- AI summaries are neutral, structured, and synced between parties.
- “White Flag” compromise is available at all times and reflected in output.
- Trait Cards visibly shape guidance tone and suggestions.

## Next-task prompt (copy/paste)
“Using this doc, draft the **mobile-first UX copy and wireframe notes** for Steps 1–4 (Grounding → Internal Conflict → Collect & Pile → Parallel Read). Keep each step to a single screen, list required UI components, and include the exact CTA labels.” 
