# Travelling incubator and batch reveal

User-approved local implementation, 2026-09-24. Not deployed.

## Contract
Ready eggs must be accessible from any island. Preserve source island, stable egg
ledger identity, current-island egg timers, existing collection copies and sold
states. Collection remains through resolveReadyEggTerminalTransition; animation
cannot award anything. Batch order is all hatch presentations, then all cards.
Use upward swipe plus accessible buttons, reduced motion and muted-by-default
original audio. No sampled third-party sounds. Preserve other dirty project work.

## Implemented
- Incubator quick access bypasses introductory welcome screen; ready eggs sort
  before incubating eggs regardless of island. Collection closes the underlying
  stop before presenting its hatch.
- Non-Sproutling hatch has a short egg-wiggle/reveal fallback; existing authored
  Sproutling 3D presentation remains. Other creatures are not claimed as 3D.
- Hatch-all-ready calls the existing canonical transition for each stable key,
  reads terminal state fresh, and stores only successful creature IDs as UI
  receipts. Same-species cards intentionally remain separate.
- All hatch screens precede the card stack. Upward swipe/ArrowUp/Next advances;
  original quiet filtered-noise brush follows the game's sound preference.
  Viewport portal, scroll locking and reduced-motion treatment included.
- Stack participates in reveal/celebration blockers.

## Verification / remaining gate
- Architecture guard: zero violations, three existing allowlisted warnings.
- Regression added for two off-island eggs of the same species and duplicate
  collection rejection; existing remote-egg test preserves current active egg.
- TypeScript session 61945, log /tmp/egg-batch-tsc.log.
- Service tests session 19142, log /tmp/egg-batch-tests.log.
- Isolated presentation fixture: work/controller-release-check/eggs.html.
- Browser automation timed out twice. Visual/device verification still required;
  do not release based only on compilation. Verify first-creature onboarding
  priority, mobile card fit, swipe responsiveness, reduced motion and mute.
- Closing/reloading mid-presentation does not reverse grants; creatures remain
  in Sanctuary. Persisted resume of an unfinished reveal deck is not implemented.

Other requests (caretaker ceremony/mask and landmark progress/reward policy)
remain separate unfinished work; this slice does not claim to implement them.

## Follow-up verification
- Ten focused canonical egg transition tests passed, including the new same-
  species batch case, off-island collection, duplicate grants, collect/sell
  exclusion, legacy recovery and non-base Egg Mania slot preservation.
- Fixed the activeStopId effect that immediately cleared the travelling-inventory
  flag on opening. It now clears on leaving Hatchery or changing island only.
- Ready presentation and collection now use saved ready status/actual hatch
  time, not the rounded visual stage (which can reach four before time expires).
- Added hatch sequence audio and keyboard focus containment to hatch modal.
- Preview JS/CSS bundle passed in the preceding slice. Full TypeScript and suite
  remain running; browser automation timed out again. Process inspection shows
  heavy system rendering load. Do not mark visual QA or release complete.
