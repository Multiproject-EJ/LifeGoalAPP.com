# Compass Book dual-presentation Gauntlet

**Status:** representative vertical slice and Island Run entrance complete

**Approved by:** Eivind, 2026-08-20

**Decision:** one canonical Compass Book with selectable `Auto`, `2D`, and `3D` presentations.

## Mission and player outcome

The Compass Book must be a dependable thinking tool and a meaningful game-world artifact without becoming two products. Players can choose a clear 2D book or an immersive 3D book. In `Auto`, Island Run uses 3D for browsing and completion moments, then moves to 2D for focused fragment work; the PWA defaults to 2D and offers 3D on request.

## Sources of truth

- `src/features/compass-book/types.ts` owns persisted Compass content shapes.
- `src/features/compass-book/hooks/useCompassBook.ts` owns canonical answer and chapter persistence.
- `src/features/compass-book/components/CompassBookScreen.tsx` owns accessible book navigation.
- `src/features/compass-book/components/CompassBookThreeShell.tsx` is presentation-only.
- Island Run architecture contracts and `AGENTS.md` forbid UI-owned gameplay writes.
- `docs/gauntlets/2026-08-20-compass-book-inner-quality-loop.md` owns current inner-book visual evidence.

## Non-negotiables and forbidden shortcuts

- Both presentations read the same page ID, chapter state, answers, progress, and action services.
- Presentation preference is interface metadata, never Compass curriculum data or Island Run runtime state.
- Three.js never owns forms, answer values, focus, scrolling, completion rules, or persistence.
- Essential input remains accessible DOM. The 3D view may frame it and react to it but may not replace it.
- `prefers-reduced-motion` removes automatic 3D selection; explicit 3D remains static/reduced-motion aware.
- WebGL failure immediately resolves to the complete 2D book.
- No new Island Run gameplay write path is introduced.

## Scope for this vertical slice

Included:

1. A persistent, accessible `Auto / 2D / 3D` selector.
2. Context-aware resolution for PWA and Island Run.
3. A true 2D layout that does not mount WebGL and recentres the complete page.
4. The existing production 3D shell as the immersive presentation.
5. A bounded 3D completion ceremony triggered only after canonical activity saving succeeds.
6. Preview-harness parameters and regression tests for the presentation policy.

Deferred:

- A diegetic inventory placement system.
- Unique completion sculptures for Chapters III–VI.
- Cloud-syncing the presentation preference across devices.

Excluded:

- Duplicating forms in WebGL.
- Changing curriculum, unlock, reward, dice, stop, or island progression semantics.
- Merging, deployment, or publishing.

## Authority and safety boundary

Authorised: repository code, tests, local preference storage, developer preview, screenshots, and commits on the isolated Compass Book branch. Not authorised: merging, deployment, external publication, destructive changes, economy changes, or Island Run state mutations.

## Milestones and acceptance evidence

### Slice 1 — policy and selector

- Pure resolver covers Auto/PWA, Auto/Island page, Auto/Island flow, reduced motion, explicit modes, and WebGL fallback.
- Selector is keyboard accessible, visible on every book page, and persists locally.

### Slice 2 — presentations

- 2D does not mount the Three.js shell and is centred at wide and narrow widths.
- 3D preserves the production book, current page relief, and accessible DOM page.
- Auto resolves to 2D in PWA, 3D on Island Run page views, and 2D during Island Run flows.

### Slice 3 — completion moment

- The ceremony begins only after `saveActivityAnswers` resolves successfully.
- The effect is presentation-only and cannot advance Island Run or complete a chapter itself.
- Reduced motion removes spatial movement while preserving a restrained visual acknowledgement.

### Slice 4 — verification

- Compass Book tests and launch contract pass.
- Island Run architecture guard reports zero violations.
- TypeScript and production build pass.
- Wide screenshots prove explicit 2D and 3D modes; Island Auto flow remains readable.
- WebGL fallback exposes the full 2D book.

### Slice 5 — Island Run summon and hand-off

- Choosing `Continue` from the compact in-game Compass first reveals the physical 3D book in `Auto`, then hands the player to the canonical 2D activity.
- The entrance is a bounded presentation event: a low gold compass sigil, a short rise/turn of the same production model, and the existing cover-open beat.
- Explicit 2D, reduced motion, and WebGL fallback skip the cinematic and enter the activity immediately.
- The transition owns no answer, reward, stop, dice, unlock, chapter, or Island Run persistence state.
- Explicit 3D remains an honoured player choice after the hand-off; `Auto` settles into 2D for focused work.

## Performance and accessibility budgets

- 2D mounts no WebGL renderer.
- Existing 3D quality-tier selection and fallback remain intact.
- Production launch targets: at least 55 FPS on Low and 50 FPS on High on a supported physical iPhone.
- All mode controls have programmatic names, pressed/selected state, and visible focus.
- Text, forms, and controls remain DOM-owned in every mode.

## Rollback and recovery

- The work remains a bounded commit on `codex/compass-book-launch-3d-20260820`.
- Removing the selector and presentation resolver returns to the prior hybrid shell without touching answer data.
- The local preference key is versioned; an unknown value resolves safely to `auto`.

## Stop conditions

Stop and escalate if the dual presentation requires duplicating canonical state, adding Island Run UI writes, or weakening modal/accessibility guardrails. Otherwise iterate until all four slices pass.

## Handoff

Continue from this contract, the inner-quality Gauntlet, and the latest commit on the feature branch. Verify presentation policy before producing more chapter reliefs so later 3D work serves the correct player context.

## Completion record — 2026-08-20

Delivered:

- `Auto / 2D / 3D` selector with radiogroup semantics, visible focus, local persistence, and safe parsing.
- PWA Auto → 2D; Island Run page Auto → 3D; Island Run flow Auto → 2D.
- Explicit 2D mounts zero Three.js canvases and recentres the complete accessible page.
- Explicit 3D preserves the production shell and canonical DOM page.
- WebGL failure preserves the selected preference but resolves the mounted experience to complete 2D.
- Successful fragment/chapter saving can issue a short, non-replaying presentation event; it does not own completion.
- Island Run opens the full book with `presentationContext="island_run"` without any gameplay write.

Evidence:

- `evidence/compass-book-dual-presentation-2026-08-20/01-pwa-explicit-2d.png`
- `evidence/compass-book-dual-presentation-2026-08-20/02-pwa-explicit-3d.png`
- `evidence/compass-book-dual-presentation-2026-08-20/03-island-auto-flow-2d.png`
- `evidence/compass-book-dual-presentation-2026-08-20/04-island-auto-page-3d.png`
- `evidence/compass-book-dual-presentation-2026-08-20/05-island-auto-completion-ceremony.png`
- `evidence/compass-book-dual-presentation-2026-08-20/06-mobile-2d-flow.png`
- `evidence/compass-book-dual-presentation-2026-08-20/07-island-summon-goal.png`
- `evidence/compass-book-dual-presentation-2026-08-20/08-island-summon-3d.png`
- `evidence/compass-book-dual-presentation-2026-08-20/09-island-auto-flow-2d.png`
- `evidence/compass-book-dual-presentation-2026-08-20/10-mobile-island-auto-flow-2d.png`

Verification:

- Compass Book logic tests: pass, including ten presentation-policy assertions.
- Compass Book launch contract: pass.
- Island Run architecture guard: pass with zero violations and three pre-existing allowlisted warnings.
- TypeScript: pass.
- Production Vite build: pass with the repository's pre-existing dynamic-import and large-chunk warnings.
- Browser assertions: 2D canvas count `0`; 3D canvas count `1`; WebGL fallback canvas count `0`; high-tier Island Auto browsing `60 FPS` at 1200×900.

Gauntlet action: `continue` for Chapter III–VI reliefs and any later board-world inventory placement; `pass` for the dual-presentation architecture and representative player flow.

## Island Run entrance completion record — 2026-08-20

Delivered:

- Compact-game `Continue` deep links now stage the canonical production book before opening the requested activity.
- The model rises from a thin concentric compass sigil, settles into the established hybrid spread, and hands `Auto` to the canonical 2D flow after 1.75 seconds.
- The same presentation parent owns the entrance transform; canonical model parts, hit targets, DOM content, forms, and persistence remain unchanged.
- Explicit 2D, reduced-motion policy, and WebGL fallback bypass the entrance; explicit 3D remains available.
- The developer harness can lengthen only the preview timing for deterministic screenshots; production duration remains fixed by policy.

Visual Gauntlet findings and corrections:

- First held frame exposed an oversized pale crescent and a prematurely visible parchment sheet.
- The final frame uses two thin gold tooling rings, centers the summoned artifact, and delays parchment opacity until the book settles.
- Desktop final hand-off and the primary 390×844 mobile flow are fully readable; mobile Auto settles with zero canvases and locked background scrolling.
- A fresh preview load records no console warnings or errors.

Gauntlet action: `pass` for the Island Run summon-to-2D hand-off; `continue` for Chapters III–VI reliefs and any later true board-world inventory placement.
