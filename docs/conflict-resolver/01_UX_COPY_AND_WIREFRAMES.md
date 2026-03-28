# Conflict Resolver UX Copy + Wireframe Notes (Mobile-first)

## Purpose
Translate product direction into implementation-ready UX behavior for the Conflict Resolver flow.

---

## A) Core UX doctrine
1. **Not chat. Not a form.**
2. **One screen, one emotional objective.**
3. **Main action card + calming background layer.**
4. **Guided friction over speed** (intentional pacing prevents escalation).
5. **One flow, one mode at a time** (no mixed internal/external branches on same screen).

---

## B) Visual and interaction language

### Visual references (from stakeholder-provided mockups)
- Entry screen should resemble a soft aurora/glass atmosphere with two large selection cards and a bottom-centered CTA.
- Parallel Read should use a “calm focus chamber” style: timer halo at top, stacked summary cards, low-contrast safety note, and delayed CTA reveal.

### Visual style
- Mood: calm, safe, trustworthy, non-clinical.
- Palette: soft blue/purple with warm neutrals for reassurance.
- Shape language: large radii, no sharp corners, no aggressive outlines.
- Motion: slow inhale/exhale transitions for grounding, tighter confirms later.

### Starter design tokens
```ts
export const conflictResolverTokens = {
  colors: {
    primary: '#6C7BFF',
    calmBlue: '#A8B5FF',
    calmPurple: '#B39DFF',
    cardGlass: 'rgba(255,255,255,0.08)',
    textPrimary: 'rgba(255,255,255,0.94)',
    textMuted: 'rgba(255,255,255,0.72)',
  },
  radius: {
    card: 20,
    pill: 999,
  },
  blur: {
    glass: 'blur(20px)',
  },
};
```

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

### Visual reference mapping (latest stakeholder mockup)
- Top-left back affordance is present but should trigger a guarded exit confirm (“Leave and save draft?”).
- Progress indicator uses compact dots + explicit label (`Step 4 / 5`).
- Timer halo sits above card stack and remains visually soft (no urgent styling).
- Three summary cards are visible concurrently:
  - `What happened`
  - `What it meant`
  - `What is needed`
- Footer keeps dual pill CTAs:
  - `This feels accurate`
  - `Something feels off`

### Layout
- Dimmed focus mode.
- Circular timer at top (extendable).
- Summary cards center.
- Reactions locked until timer ends.
- Safety copy pinned near footer:
  - “You’re not required to agree. Just understand first.”

### Post-timer actions
- `I understand this`
- `Something feels off`

### Text highlighting
- Tap sentence and tag:
  - `Accurate`
  - `Missing context`
  - `Add note`
- Selection opens a compact anchored action sheet (not full modal) to preserve focus context.

### Critical interaction constraints
- No avatars.
- No chat bubbles.
- No fast skip before timer.
- No aggressive red/green success/fail signaling.

### Micro-interactions
1. Entry transition: blur → focus in ~320–420ms.
2. Timer: gentle halo pulse, no ticking audio.
3. Unlock actions: fade-in + subtle haptic when timer completes.
4. Highlight action: soft glow chip anchored to selected sentence.
5. Action sheet: quick fade/scale (~140–180ms), dismiss on outside tap.

### Accessibility + readability guardrails
- Maintain minimum 4.5:1 contrast for body text over glass cards.
- Respect dynamic type scaling up to iOS Large Accessibility sizes without clipping.
- Keep primary CTA tap targets >= 44px height.
- Ensure highlighted sentence is announced with context in screen readers.

### “Sync moment”
- If all participants choose `I understand this`, trigger:
  - subtle shared glow animation,
  - “Alignment reached” micro-copy,
  - single soft haptic pulse.

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

### Component skeleton (Codex-ready)
```tsx
<FullScreenCard>
  <TopBar>
    <ProgressDots />
    <TimerCircle seconds={45} />
  </TopBar>

  <Content>
    <SummaryCard type="what_happened" />
    <SummaryCard type="what_it_meant" />
    <SummaryCard type="what_is_needed" />
  </Content>

  {timerDone ? (
    <Footer>
      <Button variant="primary">This feels accurate</Button>
      <Button variant="secondary">Something feels off</Button>
    </Footer>
  ) : null}
</FullScreenCard>
```

### Hold button behavior contract
```ts
// onPointerDown -> start countdown
// onPointerUp or onPointerLeave -> cancel if threshold not met
// threshold complete -> fire onComplete once + haptic
```

---

## E.1) Priority implementation order
1. `FullScreenCard` + stage routing shell
2. `ParallelReadChamber` (signature mechanic)
3. `HoldButton`
4. `WhiteFlagFab`
5. `PileStackAnimator` + AI merge transition

---

## F) Acceptance checks for UX QA
1. User can complete full flow on one hand mobile usage.
2. No stage requires long scrolling.
3. AI edits are transparent and user-approved.
4. Shared read cannot be skipped.
5. At least one resolution option can be accepted without free-text typing.
6. Apology step supports both timing modes.
