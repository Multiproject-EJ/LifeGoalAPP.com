# Island Run board performance pass — 2026-06-29

## Baseline limitations

Interactive browser profiling was not available in this non-interactive container, so the baseline is based on code-path inspection and build validation rather than Chrome/Safari Performance panel traces. Physical iPhone/iPad Safari FPS, long-task, paint, and memory numbers still need device profiling.

## Confirmed before paths

- `useTokenAnimation` called React `setAnimState` from its token `requestAnimationFrame` loop. During a normal multi-hop roll this could update React once per rendered frame, forcing `BoardStage` and renderable descendants to re-evaluate.
- `BoardToken` consumed the per-frame `animState` and wrote `left`, `top`, and `transform` inline, mixing layout-sensitive positioning with transform animation.
- `useBoardCamera` called React `setCamera` from its camera spring `requestAnimationFrame` loop. `BoardStage` derived art/gameplay/orbit transform strings from that state, so camera interpolation caused React renders during travel and settle.
- `BoardParticles` scheduled a continuous canvas loop while mounted, used uncapped device pixel ratio, and emitted trail particles per rendered frame instead of by elapsed time.

## After paths

- React starts token movement and receives hop/landing/completion boundaries.
- `useTokenAnimation` keeps the live visual position in refs and writes `--token-x`, `--token-y`, `--token-scale-x`, and `--token-scale-y` directly to the token DOM node during rAF.
- `BoardToken` now uses transform-only positioning via CSS custom properties. React renders only for movement/landing class boundaries and canonical tile changes.
- `useBoardCamera` keeps camera spring interpolation in refs and writes the art, gameplay, and orbit stage transforms directly during rAF. React state is committed when the spring settles or on direct gesture snaps.
- Static tile and art layers are memoized so animation boundary renders do not rebuild them unless their real visual inputs change.
- `BoardParticles` caps DPR and particle count, uses time-based trail emission, reads the latest token position from the animation controller, pauses while the document is hidden, and clears particles on unmount.

## Expected render-count change

Because no browser profiler was available, counts are reported as expected code-path effects rather than measured DevTools numbers:

| Scenario | Before | After |
| --- | --- | --- |
| Token travel frames | `setAnimState` per rAF, broad React render path | no React state update per token frame |
| Camera travel frames | `setCamera` per rAF, broad React render path | no React state update per camera frame; DOM transforms only |
| BoardTileGrid during ordinary movement frames | eligible to re-render with BoardStage per frame | stable during frame loop; memoized and not fed per-frame token/camera values |
| IslandArtLayers during ordinary movement frames | eligible to re-render with BoardStage per frame | stable during frame loop; memoized and not fed per-frame token/camera values |
| BoardToken during ordinary movement frames | re-rendered per token frame | DOM style vars update per frame; React only at moving/landing boundaries |

## Cleanup guarantees

- Starting a new token animation resolves and supersedes any active token animation promise, cancels the old rAF, and clears the landing timeout.
- Unmounting the token animation hook cancels outstanding rAF work, clears timeouts, and resolves any active promise.
- Camera cleanup cancels its rAF on unmount; the spring loop tracks a single active rAF.
- Particle cleanup removes the visibility listener, cancels its rAF, resets the rAF id, and clears live particles.

## Asset changes

No image assets were changed in this pass. This intentionally avoids combining a risky asset-resizing overhaul with the first animation/rerender decoupling slice.

## Future profiling needed

- Physical iPhone/iPad Safari FPS and frame-time capture.
- Long-task, layout, paint, and compositing breakdowns after the frame-state decoupling.
- Memory before/after repeated rolls and island remounts on target devices.
- Evidence-based asset sizing for the active island art path.

## Future renderer threshold

A PixiJS/Canvas/WebGL renderer should only be reconsidered if profiling shows that static layers no longer rerender but frame rate remains unacceptable, canvas/compositing dominates after these fixes, future animated object counts exceed practical DOM limits, or Safari GPU layer behavior remains a bottleneck after DOM transform-only optimisation.
