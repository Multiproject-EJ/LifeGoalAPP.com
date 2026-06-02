# AI Life Coach Companion Build Plan — 2026-06-02

## Purpose

Transform the current AI Life Coach from a chat-window destination into an ambient companion that feels present across the product: a calm helper that notices patterns, offers tiny next moves, and remains available when the user needs deeper support.

The redesign should preserve the existing coaching behavior and privacy controls while changing the default UX from “customer support chat” to “Game of Life guide.”

## Current diagnosis

The current coach implementation already has valuable intelligence:

- Goal, habit, journaling, reflection, vision board, life-stage, habit-environment, goal-evolution, and telemetry-aware context loading.
- Intervention generation for imbalance, habit friction, goal evolution, overconfidence, and fixation.
- Entry points from app navigation, onboarding, goals, habits, journal, and quick actions.

The main gap is presentation. The current default experience is a modal chat shell with:

- A large AI Life Coach header.
- Chat bubbles and timestamps.
- A quick-topic grid.
- A text composer.
- A footer disclaimer/privacy summary.

That structure reads as a support/chat widget even though the product intent is closer to a companion, pattern detector, simplifier, and balance guardian.

## Product direction

### North-star experience

> The coach is not a place you go. It is a helper that is quietly with you.

The user should feel:

- “The coach noticed something useful.”
- “The next step is small and safe.”
- “I can go deeper if I want, but I am not forced into chat.”
- “The app understands the Game of Life framing: balance, playability, correction, and small wins.”

### Naming direction

Keep “AI Life Coach” available in settings/docs for clarity, but test more product-native names in the UI:

- Game Guide
- Life Companion
- Balance Guardian
- Inner Navigator
- Coach Companion

Recommended first label: **Game Guide**.

### Interaction model

The coach should support three levels of depth:

1. **Ambient presence** — a small always-available companion entry point.
2. **Coach Peek** — a lightweight card/bottom sheet with one useful read and 1–3 choices.
3. **Deep Coach** — the current full conversation mode, redesigned as a deeper workspace rather than the default opening moment.

## Guardrails

- Do not remove privacy controls; move them into a calmer “What I can see” trust surface.
- Do not invent new gameplay write paths.
- Do not add direct gameplay writes inside React UI components.
- Preserve current coach launch behavior from goals, habits, journal, onboarding, and navigation.
- Preserve user-facing coaching safety: no shame, no certainty claims, no harmful encouragement.
- Use small reversible slices so the existing coach remains usable after every PR.
- For every behavioral coach change, add or update tests where practical.

## Build slices

### Slice 0 — Baseline audit and UX inventory

**Goal:** Capture the current coach entry points, modal states, intervention variants, and mobile behavior before making UI changes.

**Deliverables:**

- Inventory of all `AiCoach` launch paths and starter-question sources.
- Screenshot notes for current mobile and desktop coach states.
- List of intervention types and which data permissions affect them.
- Decision on final UI label for the first iteration.

**Likely files:**

- `src/App.tsx`
- `src/components/QuickActionsFAB.tsx`
- `src/features/ai-coach/AiCoach.tsx`
- `src/features/ai-coach/AiCoach.css`
- `docs/game-of-life-2.0/AI_COACH_PERSONALITY.md`

**Acceptance criteria:**

- Current behavior is documented enough to compare before/after.
- No product behavior changes yet.

---

### Slice 1 — Coach Home / “Today’s Read” shell

**Goal:** Change the initial full coach view from chat-first to companion-first while preserving chat access.

**UX:**

- Header becomes calmer and more companion-like.
- Add a top “Today’s read” or “I noticed” card.
- Show primary coach actions as cards/chips instead of default chat topics.
- Keep the message composer available, but visually secondary.

**Suggested layout:**

1. Companion header: “Game Guide” / “I’m here when you need a next move.”
2. Today’s read card:
   - One short summary.
   - One tiny suggested action.
3. Coach modes:
   - Plan with me
   - Reset me
   - Reflect with me
   - Challenge me
4. Ask-anything composer.

**Likely files:**

- `src/features/ai-coach/AiCoach.tsx`
- `src/features/ai-coach/AiCoach.css`

**Acceptance criteria:**

- Opening the coach no longer looks like a customer-support chat window.
- Existing starter questions still work.
- Existing reset, close, strategy assistant, and send-message behavior still work.
- Mobile layout remains viewport-contained and scroll-safe.

---

### Slice 2 — Intervention cards v2

**Goal:** Turn intervention output into calm “coach cards” with fewer visible options.

**UX:**

- Replace long stacks of full-width intervention option buttons with compact cards.
- Show only 2–3 primary actions by default.
- Move secondary/advanced choices under “More options.”
- Use friendlier labels like “Diagnose friction,” “Make it easier today,” and “Pause safely.”

**Likely files:**

- `src/features/ai-coach/AiCoach.tsx`
- `src/features/ai-coach/AiCoach.css`

**Acceptance criteria:**

- Habit-friction interventions no longer flood the viewport with seven large buttons.
- Existing intervention prompts still route through `handleInterventionAction`.
- Telemetry for accepted interventions remains intact.
- Intervention cards remain keyboard accessible.

---

### Slice 3 — Trust surface / privacy drawer

**Goal:** Move the demo/privacy footer out of the emotional main flow while preserving transparency.

**UX:**

- Add a small “What I can see” / shield control in the coach header or companion home.
- Show data access summary in a collapsible panel or lightweight dialog.
- Keep demo/simulated-coach language available but less visually dominant.

**Likely files:**

- `src/features/ai-coach/AiCoach.tsx`
- `src/features/ai-coach/AiCoach.css`
- Potentially `src/features/account/AiSettingsSection.tsx` only if a direct settings link is added.

**Acceptance criteria:**

- Users can still see which data sources are enabled/blocked.
- The main coach experience no longer ends with a large disclaimer block.
- Accessibility labels explain the privacy/trust control.

---

### Slice 4 — Coach Peek panel

**Goal:** Add a lightweight pre-chat surface that opens from contextual triggers or the companion orb.

**UX:**

- Small bottom sheet or popover with one insight and 1–3 actions.
- “Talk it through” opens the full coach with a starter question.
- “Not now” dismisses without side effects.
- “Why this?” explains the signal in plain language.

**Likely files:**

- New component under `src/features/ai-coach/`, e.g. `CoachPeek.tsx` and `CoachPeek.css`.
- `src/App.tsx`
- `src/components/QuickActionsFAB.tsx` or a new app-level companion launcher.

**Acceptance criteria:**

- The user can get a useful coach nudge without opening full chat.
- Existing full coach behavior remains unchanged when opened directly.
- Modal UX guardrail is respected: viewport anchored, centered/visible, scroll locked when needed.

---

### Slice 5 — Ambient companion launcher

**Goal:** Introduce a small always-available coach companion entry point that replaces fragmented coach launch affordances where appropriate.

**UX states:**

- Quiet: available but not attention-seeking.
- Soft glow: useful insight available.
- Pulse: high-value intervention available.
- Sleeping/dismissed: user has dismissed nudges for the session.

**Likely files:**

- New component under `src/features/ai-coach/`, e.g. `CoachCompanionLauncher.tsx` and `CoachCompanionLauncher.css`.
- `src/App.tsx`
- `src/components/QuickActionsFAB.tsx`

**Acceptance criteria:**

- Coach feels accessible across the app without requiring the Home/Coach tab.
- The launcher does not obscure critical UI or conflict with existing FABs.
- Dismissal behavior prevents annoying repeated nudges.

---

### Slice 6 — Personalized daily read logic

**Goal:** Generate a stable, deterministic “what matters now” read from existing coach signals.

**Inputs:**

- Active interventions.
- Goal context.
- Habit environment context.
- Telemetry difficulty adjustment.
- Data-access permissions.

**Output shape idea:**

```ts
type CoachDailyRead = {
  headline: string;
  body: string;
  suggestedActionLabel: string;
  suggestedPrompt: string;
  signalType: 'habit' | 'goal' | 'balance' | 'reflection' | 'general';
};
```

**Likely files:**

- New helper under `src/features/ai-coach/`, e.g. `coachDailyRead.ts`.
- `src/features/ai-coach/AiCoach.tsx`
- Tests for the helper if the repo has a suitable test setup.

**Acceptance criteria:**

- The coach home can show a useful read even before the user types.
- The read respects privacy settings.
- The read is deterministic and does not require a network call.

---

### Slice 7 — Full coach polish and copy pass

**Goal:** Make deep chat feel like a coaching workspace rather than a support transcript.

**Potential changes:**

- Rename “Quick start with a topic” to “What kind of help do you want?”
- Replace generic topic copy with app-native coaching modes.
- Reduce timestamp prominence.
- Use “coach note” styling for assistant messages.
- Keep user messages simple and readable.

**Likely files:**

- `src/features/ai-coach/AiCoach.tsx`
- `src/features/ai-coach/AiCoach.css`
- `docs/game-of-life-2.0/AI_COACH_PERSONALITY.md` if copy rules need updates.

**Acceptance criteria:**

- Deep chat still works exactly as before functionally.
- The visual language is differentiated from customer support chat.
- Copy aligns with the coach personality spec.

---

### Slice 8 — QA, screenshots, and documentation refresh

**Goal:** Validate the redesign and document the new companion model.

**Checks:**

- Mobile and desktop screenshots.
- Keyboard navigation.
- Escape/close behavior.
- Scroll lock behavior.
- Dark theme sanity check if practical.
- Privacy setting combinations.
- Starter-question launch paths from goals, habits, and journal.

**Likely files:**

- `docs/game-of-life-2.0/AI_COACH_PERSONALITY.md`
- This build plan, if slice statuses are tracked here.
- Any test files added during previous slices.

**Acceptance criteria:**

- The coach is shippable on mobile and desktop.
- Documentation explains the companion model.
- Known follow-up work is listed separately from the shipped slice.

## Suggested implementation order

1. Slice 0 — Baseline audit and UX inventory.
2. Slice 1 — Coach Home / “Today’s Read” shell.
3. Slice 2 — Intervention cards v2.
4. Slice 3 — Trust surface / privacy drawer.
5. Slice 6 — Personalized daily read logic.
6. Slice 4 — Coach Peek panel.
7. Slice 5 — Ambient companion launcher.
8. Slice 7 — Full coach polish and copy pass.
9. Slice 8 — QA, screenshots, and documentation refresh.

This order keeps the first changes local to the existing coach, then adds app-wide companion behavior only after the core experience feels right.

## Open questions

1. Should the UI label be “Game Guide” immediately, or should the first iteration keep “AI Life Coach” and introduce “Game Guide” as a subtitle?
2. Should the companion orb replace the existing quick actions coach launcher or coexist with it?
3. Should the coach proactively pulse only for high-confidence interventions, or also for general daily reads?
4. Should “Coach Peek” be app-wide, or only appear in habit/goal/journal contexts first?
5. How prominent should the simulated-AI disclaimer remain in demo mode?

## Definition of done for the overall companion redesign

- The coach feels like a companion, not a support widget.
- The default coach surface offers useful guidance before the user types.
- The user can still start an open-ended conversation at any time.
- Data access transparency remains clear and user-controlled.
- Contextual coach nudges feel optional, calm, and dismissible.
- Mobile behavior is polished and viewport-safe.
- Existing coach safety, privacy, and launch-path behavior are preserved.
