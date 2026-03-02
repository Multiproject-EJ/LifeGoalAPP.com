# Island Game Onboarding & Continuous Improvement

> **Canonical reference**: `docs/07_MAIN_GAME_PROGRESS.md`
> This file provides extended implementation guidance for the onboarding and continuous improvement systems.

---

## Status

| System | Status |
|---|---|
| First-run celebration + reward | ✅ Built (`IslandRunBoardPrototype.tsx` M-series) |
| `isOnboardingComplete` flag | ✅ Built |
| In-game onboarding custom UI | ⏳ Not yet built |
| PWA onboarding skip + auto-reward | ⏳ Not yet built |
| Continuous improvement pop-up | ⏳ Not yet built |
| Habit intelligence wiring to game | ⏳ Not yet built |

---

## Design principles

1. **Saviour, not gatekeeper** — onboarding only appears when the player is stuck (out of hearts/dice/tickets). It rescues them with a reward, not blocks them with a form.
2. **No duplicate onboarding** — if the player has already set up habits and goals in the PWA, they skip the in-game onboarding and receive the reward automatically.
3. **Game-native UI** — in-game onboarding uses island-themed pop-up design, NOT the PWA onboarding UI components.
4. **Intelligence over repetition** — after first run, the system replaces onboarding with personalised habit suggestions from the AI engine.

---

## Trigger points (code locations)

### Out of dice AND hearts
In `IslandRunBoardPrototype.tsx`, `handleRoll()`:
```typescript
if (dicePool < 1) {
  if (hearts < 1) {
    // ← INSERT: check isOnboardingComplete
    //   if NOT complete → show in-game onboarding pop-up
    //   if complete → show continuous improvement pop-up (1 habit suggestion)
    return;
  }
  // ... convert heart to dice
}
```

### Out of tickets (mini-game)
When player taps Step 3 (mini-game stop) with 0 tickets:
- Show soft nudge: "Complete a habit today to earn tickets 🎟️"
- This is a soft prompt, not a blocking modal

---

## In-game onboarding component spec (to be built)

### Component name
`IslandOnboardingModal` (or similar)

### Props
```typescript
interface IslandOnboardingModalProps {
  session: Session;
  islandNumber: number;
  onComplete: (reward: { hearts: number; coins: number }) => void;
  onDismiss?: () => void;
}
```

### Steps (island-quest framing)
1. **Island quest intro** — "Your island needs a champion habit 🏝️" + brief explanation
2. **Life area picker** — reuse life area options from `DayZeroOnboarding.tsx` but styled as island zones
3. **Habit creation** — single input + AI suggestion button (calls `generateHabitSuggestion()`)
4. **Confirm + claim** — "Ready? Claim your reward and keep rolling!"
5. **Reward animation** — +5 hearts + 250 coins fly-in animation → auto-dismiss

### After completion
- Call `createHabitV2()` to save the habit
- Call `markOnboardingComplete()` to set the flag
- Award +5 hearts + 250 coins via existing `awardHearts()` + `awardGold()`
- Emit `onboarding_completed` telemetry event (already defined)

---

## Continuous improvement pop-up spec (to be built)

### Component name
`IslandImprovementModal` (or similar)

### When it shows
- `isOnboardingComplete === true` AND `dicePool < 1` AND `hearts < 1`

### Data pipeline
```
buildAdherenceSnapshots(userId)          // adherenceMetrics.ts
  → buildAllSuggestions(habits, ...)     // suggestionsEngine.ts
  → pick top underperforming habit
  → buildEnhancedRationale(...)          // aiRationale.ts
  → display in modal
```

### Modal content
- Habit name + emoji
- AI-generated rationale (warm, non-judgmental): e.g. "Your morning walk has been tough lately — want to try a smaller version?"
- Two options:
  - **"Make it easier"** → apply `ease` suggestion via `saveAndApplySuggestion()`
  - **"I'll do it today"** → mark as commitment → award hearts as advance (redeemable if completed)
- Reward on action: +2–3 hearts + mini-game tickets

### Fallback (no underperforming habits)
- If all habits are `stable` or `progressing` → show a different message: "All habits on track! Here are some extra hearts for your consistency 💪" → award +1 heart

---

## PWA onboarding auto-reward (to be built)

### Logic
On first game session open, check:
```typescript
const pwaDone = await checkPWAOnboardingComplete(userId);
const gameDone = isOnboardingComplete; // from runtime state

if (pwaDone && !gameDone) {
  // Award reward automatically, skip in-game onboarding
  await awardHearts(userId, 5, 'island_run', 'PWA onboarding auto-reward');
  await awardGold(userId, 250, 'island_run', 'PWA onboarding auto-reward');
  await markOnboardingComplete();
  // Show brief "Welcome! Here's your starter reward 🎁" toast
}
```

### What counts as "PWA onboarding complete"
- At least 1 habit created (check `listHabitsV2()` returns non-empty)
- OR `gol_onboarding_{userId}` storage key shows completed state

---

## Future: ticket-earning from habits (cross-system bridge)

When a player completes a habit in the PWA:
- Award island mini-game tickets (temporary, island-scoped)
- Amount: 1–3 tickets per habit completion (TBD based on habit difficulty/tier)
- This is the primary non-gameplay way to earn tickets for Step 3 (mini-game stop)
- Implementation: hook into `logHabitCompletionV2()` → call `awardGameTokens()` with `source: 'habit_completion'`

This bridge makes the real app actions directly valuable inside the game at every session.
