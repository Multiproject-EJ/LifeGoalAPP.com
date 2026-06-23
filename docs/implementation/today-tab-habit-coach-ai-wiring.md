# Today Tab — Habit Coach AI button wired on every surface (PR 2)

_Date: 2026-06-22_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS — safe to merge

Completes the struggling-habit coach by making its **"Ask the coach for a plan"** button functional on
**every** Today surface. The button hands the existing `AiCoach` modal a habit-specific starter prompt;
the modal talks to the already-deployed `ai-coach-chat` edge function. `tsc -b`, `npm run build`, and
`npm run test:habit-offer-sort` all green.

## What I found

The AI plumbing already existed and is live:

- `DailyHabitTracker`'s `onOpenAiCoach(starterQuestion)` prop → App.tsx opens `<AiCoach>` with that
  question (`setAiCoachStarterQuestion` + `setShowAiCoachModal`).
- `AiCoach` prefills its composer with the starter question and chats via the **deployed**
  `ai-coach-chat` Supabase function — no undeployed `compass-help` dependency.

So on the primary Today view (App.tsx → `DailyHabitTracker` at the desktop/game path) the coach button
**already worked** end-to-end. The one gap: the compact **`MobileHabitHome`** surface renders
`DailyHabitTracker` without forwarding `onOpenAiCoach`, so the button was hidden there.

## Change

Thread `onOpenAiCoach` through the mobile/compact path, identical to the other call sites:

- **`MobileHabitHome.tsx`** — add the `onOpenAiCoach?` prop and forward it to its `DailyHabitTracker`.
- **`App.tsx`** — pass the same handler to `<MobileHabitHome>` (open `AiCoach` with the starter prompt).

That's the whole change — the coach card, its prompt (`habitName` + health rationale + "one small
realistic change" ask), and the modal were all already in place.

## Result

For a struggling habit (`at_risk` / `stalled` / `in_review`), expanding the habit card shows the coach
panel with **"Ask the coach for a plan"** on both the full and compact Today surfaces. Tapping it opens
the AI coach pre-filled with, e.g.:

> _I'm struggling to keep up my habit "Morning run". 7-day adherence is 30% (below 40%). What's one
> small, realistic change that would help me get back on track?_

## Files

- `src/features/habits/MobileHabitHome.tsx` — new optional prop + forward.
- `src/App.tsx` — pass `onOpenAiCoach` to `<MobileHabitHome>`.

## Safety

- Purely additive prop forwarding; no behaviour change to logging, rewards, the AI modal, or the
  `ai-coach-chat` backend. The button still self-hides anywhere `onOpenAiCoach` is absent and in compact
  private view, so nothing leaks.
- No new backend or env requirement — reuses the live `ai-coach-chat` function (not `compass-help`).

## Validation

- `tsc -b` clean; `npm run build` success; `npm run test:habit-offer-sort` green.
- _The large App/tracker can't be exercised headlessly here; the change is two prop hops matching the
  existing wired call sites._
