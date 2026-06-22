# Compass Book — PR 13 (Optional mid-chapter free-text) Report

_Date: 2026-06-22_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Pure content + test change. Reduces required writing toward the agreed
"tap-first, one required line per chapter" standard. No Island Run / economy / Quest Pulse / goals /
habits / projector / curriculum-shape changes. `npm run test:compass-book` green.

## Decision implemented

Per the in-game answering design decisions:

1. **Tap questions** keep the AI option-suggestion affordance (already shipped in PR 11 — every
   choice block can surface a recommended option via "Help me think" → "Use this").
2. **Free-text** is reduced to the **finale statement only**, which is required and AI-draftable
   (PR 11 wires the AI helper to every `short_text` block, so the finale already gets a one-tap
   draft). The **mid-chapter free-text line becomes optional** so it never gates completion.

## What changed

- **Chapter 1 — `next_move`** (island 19): `required: true → false`. The two area taps
  (`candidate_lever`, `next_move_area`) carry the island's required signal; naming the move is now
  optional. The finale `wheel_statement` (island 20) remains the one required line.
- **Chapter 2 — `guardian_boundary`** (island 19): `required: true → false`. Island 19 becomes an
  optional reflection stop; the finale `compass_statement` (island 20) remains required.
- Prompts updated to read "(optional)".
- Test `testGuidedFlowAnswering` updated: `living_wheel.a19` is now satisfied by the two required
  area taps alone, still rejects a single tap, and still accepts the optional `next_move` text.

## Why this is safe

- Both projectors already read these fields through a null-tolerant `textOf` helper
  (`v.kind === 'text' && v.text.trim() ? … : null`), so an absent value cleanly yields `null` and the
  chapter graphics already guard on it (`output.guardianBoundary ? … : null`).
- Chapters 3 and 4 were already finale-only — no change needed.

## Chapters 5 & 6 — not in this PR

Quest Forge and Personal Playbook are writing-heavy (≈8 free-text lines each) **because they ask for
the player's actual goals and habits**. The agreed direction is to source those as **taps from the
player's real goals/habits** already in the app (`loadGoalsOfflineFirst`, `listLocalHabitsV2ForUser`,
both offline-first) rather than retyping them. That integration is a separate, larger PR and is
tracked for follow-up.

## Verification

- `npm run test:compass-book` — all assertions passed.
