# Island 019 — d023 render-only wheel batching

Continuation authorized by Eivind's 2026-09-08 “continue”. Starts from published
`eaaa791a` on local branch `codex/island-019-wheel-polish-20260908`.

This is a bounded rendering optimization of the existing approved train, not a
new construction family or a macro-art approval. The existing source packet and
decisions remain in sibling worktree `island-019-coaster-carnival-20260830`.
Source SHA-256: `48e70bfb175950947662b32e47a0b85f5b725ebea31ab48bc09d25b334f31cdd`.

## Contract

Replace eight separate wheel/flange draws per car with two instanced batches.
Preserve every wheel vertex, material, position, distance-driven spin, named
pivot, carriage visibility and front/middle rider socket. Freeze track, pacing,
camera, terrain, all other art and gameplay. Do not add detail around unresolved
whole-island macro or performance failures. No publishing is authorized here.

## Evidence and gate

- Capture current and candidate rear/overview/left/right/phone and rider views.
- Train should fall from 48 to 24 draws, with identical triangle count.
- Compare instance transforms against the original pivot × child transforms
  across several spins; test front/middle hide rules and reduced-motion freeze.
- Run existing Island 019 tests and TypeScript validation.
- Independent read-only visual review rejects any visible regression; root
  performs an additional self-review. This gate does not approve overall 10/10.
- One correction maximum for this optimization. If equivalence fails, retain
  evidence and restore the original rendering rather than changing the design.

Evidence: `work/island019-wheel-batching-d023/{baseline-r02,candidate,ride,ride-middle}`.
The first baseline startup timed out; its failure image is not passing evidence.

## Measured result

- Rear, overview, phone: 245 → 221 draw calls; 238,066 triangles unchanged.
- Left/right: 244 → 220 calls; 237,626 triangles unchanged.
- Train: 48 → 24 draws; all 8,656 original triangles retained.
- All five candidate views have zero JavaScript errors. Both front and middle
  continuous rides complete and return to idle with no JavaScript errors.
- Fresh-source Island 019 regression suite: 19/19 passes, including exact
  pivot × child / instance-matrix comparisons at five route positions, per-car
  ownership, triangle accounting and reduced-motion behavior.
- Architecture guard: zero violations (three pre-existing allowlisted warnings).

## Independent review and bounded correction

Read-only `ride_review` found no visible regression in the five views or front
rider images, but correctly rejected the first candidate's instance-buffer
cleanup. Each private wheel geometry now has a self-removing disposal listener
that calls `InstancedMesh.dispose()`. This uses the existing geometry-only island
teardown without widening the change to other islands. Tests require eight
instance-disposal events and no duplicate events on repeated cleanup.

Final independent action: **approve**, scoped to d023 wheel batching after the
cleanup correction. Reviewer confirmed no regression in the middle-rider images
either. Root self-review agrees for this appearance-preserving scope. Final
fresh-source suite passes 19/19 including cleanup; front ride sampled 2,763
frames (six >50 ms), middle 2,772 (nine >50 ms), both median 16.7 ms / p95 16.8 ms.

Whole-island fidelity and the 175-call / 180k triangle target remain open. This
is an appearance-preserving optimization, not a physical-phone or 10/10 pass.
The published site remains on the previously approved release.
