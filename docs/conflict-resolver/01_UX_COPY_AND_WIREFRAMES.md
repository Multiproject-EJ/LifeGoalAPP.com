# Conflict Resolver UX Copy + Wireframe Notes (Mobile-first)

## Purpose
Translate product direction into implementation-ready UX behavior for the Conflict Resolver flow.

---

## A) Core UX doctrine
1. **Not chat. Not a form.**
2. **One screen, one emotional objective.**
3. **Main action card + calming background layer.**
4. **Guided friction over speed** (intentional pacing prevents escalation).

---

## B) Visual and interaction language

### Visual style
- Mood: calm, safe, trustworthy, non-clinical.
- Palette: soft blue/purple with warm neutrals for reassurance.
- Shape language: large radii, no sharp corners, no aggressive outlines.
- Motion: slow inhale/exhale transitions for grounding, tighter confirms later.

### Interaction rules
- Bottom-anchored primary CTAs (thumb-first).
- No long-scroll screens inside active session.
- Card transitions only (slide/fade).
- Subtle haptics for:
  - stage complete
  - mutual alignment
  - agreement accepted

---

## C) Screen-by-screen flow

## Stage 0 — Mode selection
### Goal
Choose conflict mode with minimal cognitive load.

### Layout
- Two large selectable cards:
  - `🧠 Inner Tension` (you vs yourself)
  - `🤝 Shared Conflict` (you + 1 or more people)
- Helper copy below selection:
  - “No blame, no judgment.”
  - “Your words stay yours.”
- CTA: `Continue`

### Microinteractions
- Tap selected card → subtle scale up + glow.
- Subtext fades in after selection.

---

## Stage 1 — Grounding
### Goal
Shift emotional state before problem-solving begins.

### Layout
- Top: breathing orb (soft pulse animation).
- Middle: one statement card at a time.
- Bottom: hold-to-continue CTA.

### Sequence
1. “People are not evil at heart.”
2. “Miscommunication causes most conflicts.”
3. “You are here to understand, not attack.”

### CTA pattern
- `Press and hold: I’m ready` (900–1200ms).
- On complete: gentle haptic + transition.

---

## Stage 2 — Private perspective capture
### Goal
Collect clean, private context before shared exposure.

### Layout
- Prompt cards with optional “flip to answer” interaction:
  - Front: question
  - Back: input + rewrite helper
- Secondary link: `Skip for now`

### Prompts
- “What happened from your view?”
- “What did this impact for you?”
- “What do you need now?”
- “What are you open to offering?”

### AI assist
- Inline rewrite actions:
  - `Keep as is`
  - `Soften tone`
  - `Make clearer`
- Transparency line:
  - “Tone softened to improve clarity” (tap to inspect edits)

---

## Stage 3 — Collect & pile
### Goal
Create a shared neutral understanding artifact.

### Layout
- Visual stack area showing response cards entering the pile.
- Status row:
  - `Collecting perspectives…`
  - `Balancing language…`
  - `Preparing shared summary…`

### Animation
- Each submitted response card stacks.
- On synth: pile compresses into 3–6 neutral summary cards.

---

## Stage 4 — Parallel read (“silent chamber”)
### Goal
Ensure both parties first read before reacting.

### Layout
- Dimmed focus mode.
- Circular timer at top (extendable).
- Summary cards center.
- Reactions locked until timer ends.

### Post-timer actions
- `I understand this`
- `Something feels off`

### Text highlighting
- Tap sentence and tag:
  - `Accurate`
  - `Missing context`

---

## Stage 5 — Repair & resolution (co-op builder)
### Goal
Turn understanding into fair, accepted commitments.

### Layout
- Option cards grid (AI + user-generated).
- Each option card has:
  - who does what
  - when
  - confidence indicator

### Example option card
- “I will communicate earlier when plans change.”
- “We’ll run a weekly 10-minute check-in.”
- CTA: `Accept`, `Counter`, `Discuss`

### White Flag
- Persistent floating button:
  - label: `Offer constructive move`
  - opens lightweight offer composer

---

## Stage 5.5 — Apology alignment
### Goal
Enable respectful repair without loss of face.

### Inputs
- Apology type chips:
  - Acknowledge impact
  - Take responsibility
  - Offer repair action
  - Reassure future behavior
- Timing:
  - simultaneous
  - sequenced (A then B)

### Outcome
- Both parties receive apology at agreed timing.
- Confirmation UI:
  - `Received`
  - `Needs adjustment`

---

## Stage 6 — Close and future nudge
### Goal
Lock in the agreement and increase durability.

### Close card
- “What we now understand”
- “What we agreed”
- “Next check-in date”

### Optional controls
- `I need a break` (pause and resume later)
- “Future-self nudge” reminder message at check-in time

---

## D) Shared conflict anti-hijack mechanics
- Mandatory stage gates before negotiation.
- Early offers go into proposal queue until all complete read step.
- Turn-based response windows for fairness.
- Timers default on, extendable by request.

---

## E) Minimal component list (engineering starter)
- `ConflictModeCard`
- `GroundingSequenceCard`
- `HoldToContinueButton`
- `PromptFlipCard`
- `ToneRewriteDiffSheet`
- `PileStackAnimator`
- `ParallelReadChamber`
- `SummaryHighlightTagger`
- `ResolutionOptionCard`
- `WhiteFlagFab`
- `ApologyAlignmentPanel`
- `AgreementCloseCard`

---

## F) Acceptance checks for UX QA
1. User can complete full flow on one hand mobile usage.
2. No stage requires long scrolling.
3. AI edits are transparent and user-approved.
4. Shared read cannot be skipped.
5. At least one resolution option can be accepted without free-text typing.
6. Apology step supports both timing modes.
