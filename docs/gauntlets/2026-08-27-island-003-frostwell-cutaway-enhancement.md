# Island 003 Frostwell under-ice cutaway enhancement

Status: **production active — form-refinement render review pending**
Date: 2026-08-27

## Latest checkpoint — 2026-08-29

The approved structural slice is implemented. Form refinement now adds cutter-origin ice chips, a visible helical bore score, late-depth water proximity ripples, and a bounded 500m breakthrough burst. A dev-only 5.2-second evidence clock can replay or freeze the final 450m-to-500m beat without mutating canonical mission state.

Deterministic evidence queries append one of these values to the Island Template Kit Frostwell preview:

- `frostwellCutawayTime=0.4` — 450m active cutting;
- `frostwellCutawayTime=1.7` — mid-descent;
- `frostwellCutawayTime=3.1` — water-contact burst;
- `frostwellCutawayTime=3.7` — breakthrough settle;
- `frostwellCutawayLoop=1` — continuous final-depth replay.

Implementation verification is green: 1,850 Island Run service tests passed, the architecture guard reports zero violations, and `git diff --check` passes. The pass has not advanced to materials because current visual capture is blocked: the in-app browser has WebGL disabled and the Chrome bridge did not reconnect even though Chrome, its extension, and its native-host manifest all passed diagnostics. The next valid action is capture and review, not more polish.

## Mission and observable outcome

When the player drills the Frostwell, the camera moves from the offshore surface rig to a stable side-on volumetric section beneath the ice. A real helical auger descends through readable ice strata, cuts a matching bore, throws ice debris, and visibly approaches a distinct freshwater basin. The committed 500m result triggers a replayable breakthrough beat. The sequence remains presentation-only and cannot own mission progress.

## Sources of truth

- The four canonical Island Run contracts and `AGENTS.md`.
- `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`.
- `docs/gauntlets/2026-08-13-island-003-frostwell-iceworks.md`.
- `.img2threejs/island-003-frostwell/frostwell-iceworks-sculpt-spec.json`.
- The exact user goal and hashed baseline under `.img2threejs/island-003-frostwell/cutaway-gauntlet/`.

## Non-negotiables

- No gameplay write, progress mirror, random result, cost calculation or completion authority enters the renderer.
- Preserve the existing surface Frostwell and canonical 36-tile board.
- The bore, auger and ice section must be volumetric Three.js work, not a flat illustration or video substitute.
- Camera and section reveal must be interruption-safe and viewport-safe.
- `prefers-reduced-motion` removes travel and particle intensity while retaining the visible depth state.
- The final depth geometry is cinematic compression of canonical 500m, never a new gameplay scale.

## Scope now

- A new under-ice cutaway stage and side camera.
- Real segmented shaft and helical auger.
- Volumetric ice strata, bore, water body, fractures, debris, approach cues and breakthrough.
- Deterministic preview states at 0m, 235m, 450m and 500m.
- Phone, desktop, orbit/sanity, reduced-motion and performance evidence.

## Deferred

- Any change to mission economy or drill-spin outcomes.
- New audio production beyond using existing safe cues.
- Redesign of the completed fishery operating loop.
- Final island roof/material production changes until a visual variant is chosen.

## Representative vertical slice

Build only the naked cutaway stage, continuous ice slab, four/five strata bands, bore, water lens, existing surface connection, segmented shaft, real helical bit, section mask and side camera. Capture depth 0/235/450/500 plus the transition midpoint. No particles or ambience until this slice proves the form.

## Acceptance evidence

- The auger visibly removes space and remains attached to the drive head.
- The water layer becomes perceptibly closer over successive committed depths.
- The drill tip and water layer are simultaneously readable at 390×844.
- The section still reads as volume from the opposite-side sanity view.
- Transition close/cancel restores camera, visibility and controls.
- Reduced-motion shows the final committed depth without travel or debris animation.
- Existing Frostwell mission tests, architecture guard, strict TypeScript and production build remain green.
- High quality stays within the existing Island 003/Frostwell budget; Low retains slab, auger, bore and water identity.

## Rollback

Keep the new cutaway behind one presentation capability boundary. If the slice fails, disable/remove that module and retain the current surface-focus Frostwell without touching saves or canonical mission state.

## Stop conditions

- User does not approve the part inventory or depth-compression approach.
- The side section requires a second renderer or gameplay state duplication.
- The cutaway cannot keep the board/UI safe at phone size.
- The representative auger/bore/water slice fails the visual gate after the bounded family limit.
- New work would overwrite or entangle the unrelated dirty Island 013 changes in the main worktree.

## Approval checkpoint

Production geometry is not authorized by this draft alone. Approval should confirm:

1. the 19-entry inventory and representative slice;
2. cinematic depth compression rather than literal 500m scale;
3. clean volumetric geological section as the cutaway language;
4. dark-cyan freshwater lens as the approach destination.
