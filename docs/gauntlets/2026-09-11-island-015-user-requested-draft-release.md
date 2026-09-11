# Island 015 — user-requested current-draft release

## Authority and status

On 2026-09-11 Eivind explicitly instructed **“push it now”**, after being told
that the palace had not passed visual acceptance and the full guest playthrough
was unverified. This supersedes the earlier request to wait for a 10/10 finish.
It authorizes publishing the existing draft, not calling that draft finished,
reference-matched, visually approved, or fully playtested.

The release uses the currently integrated procedural V58 palace. Retired B01/B02
Blender rebuilds are not mounted or included. The original radial Gothic
cathedral reference and five-room intent remain the eventual target. There are
known silhouette/scale and room-camera gaps; a complete Island 015 mission and
L1–L3 interior playthrough has not been verified. Aurora, glacier scenery,
room navigation, interior build stages and the Island-015 reward-bar treatment
are the existing implementation, not newly approved visual work.

## Safe integration

Starting main: `1c1908751df10b9de8896bd89209540190146876`.
Integration branch: `codex/island-015-live-draft-20260911`.

The development branch was 86 commits behind main. Its scoped patch is applied
with three-way conflict resolution, retaining newer islands, the mission phone,
construction commissioning and gameplay changes. All original dirty development
work and rejected evidence remain intact in the original worktree.

Only code, tests, the used masonry texture and release documentation are selected.
Rejected renders/models and an unused texture atlas are excluded. No dependency,
database, account, paid-service or native-app change is part of this release.

## Work ownership

- Root: board, mission, routing, preview integration, final verification and push.
- Renderer worker: only `Island5ThreePilot.tsx` conflicts.
- Contract worker: construction authoring/scaffold and two routing/renderer tests.

EJ-Jarvis and Jarvis Delegation Manager scope and non-overlap rules govern this
release. Workers cannot publish. The release does not reopen stopped geometry
production or reset any prior visual-review failure.

## Deployment and rollback

Main pushes trigger the existing GitHub Pages workflow. Verify the integrated
TypeScript/build, architecture, artwork/audio and service checks before pushing.
After pushing, verify that exact commit's deployment. Rollback is a revert of
the single draft-release commit; never reset or force-push shared main.

Validation results and deployment identity are recorded below when available.

## Integrated-candidate verification

- Island Run service suite: **2,089 passed, 0 failed**, including Island 015
  mission, camera, palace-runtime, loader, aurora and renderer contracts.
- Architecture guard: passed, zero violations (three existing allowlisted warnings).
- Island artwork assets and renderer wiring: passed.
- Audio asset validation: passed with existing placeholder warnings.
- Final integration fixed the construction preview's Group/Object3D narrowing
  without changing palace geometry or gameplay authority.
- Full production build and live deployment: pending at this checkpoint.
- Visual acceptance and full interactive L1–L3 mission playthrough remain unverified;
  automated tests do not constitute a 10/10 visual approval.
