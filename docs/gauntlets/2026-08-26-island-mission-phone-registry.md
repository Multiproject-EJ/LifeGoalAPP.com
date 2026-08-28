# Island Mission Phone Registry — Execution Contract

Date: 2026-08-26  
Status: active bounded slice  
Owner direction: Eivind, 2026-08-26

## Mission

Turn the approved compact Expedition Phone into one honest mission surface for
the authored Island 001–013 batch. Each island receives a short metal command
header, no more than two objective rows and one overall progress bar. Values
must come from canonical Island Run state rather than React-owned mirrors.

## Sources of truth

- `AGENTS.md` and the canonical Island Run gameplay/architecture contracts.
- `docs/gauntlets/2026-08-13-island-signature-missions.md` for the authored
  restoration roster and its explicit design-only status.
- `docs/gauntlets/2026-08-25-island-001-assembly-crater-and-011-preservation.md`
  for the approved Island 001 exception and compact phone.
- Live signature mission state in `islandRunSignatureMissions.ts`.

## Non-negotiables

- Keep the approved information density: one header, two short rows, one bar.
- Read gameplay only from the canonical state record.
- Add no gameplay writes, runtime mirrors or local progress simulations.
- Never display a numerical signature objective when no canonical mechanic can
  advance it. Planned missions may supply the header, but retain honest
  landmark progress rows until their gameplay slice exists.
- Preserve Island 001's twenty-charge/four-outer-landmark exception.
- Preserve the canonical explicit travel CTA; this slice does not auto-travel.

## Scope

Included:

- One versioned content registry for Islands 001–013 using actual production
  world names and approved signature-mission headers.
- A pure presentation resolver for Assembly, Frostwell, Arena Guardian,
  Rootheart Powerworks, Sunken Sands and Cactus Canyon progress.
- Landmark progress that counts a landmark only when its objective and Level 3
  build are complete; Hatchery additionally requires all island egg slots to
  be collected or sold.
- Compact-phone integration and focused service tests.

Deferred:

- Gameplay engines for Great Re-Docking, Broken Causeway, Moon Mirrors,
  Breathline, Great Pollination and Ignition Chain.
- Making every signature mission a new completion gate. That changes the
  canonical completion contract and requires its own migration/recovery slice.
- Islands 014–120 content production, deployment and publishing.

## Acceptance evidence

1. Islands 001–013 resolve the approved header and actual production name.
2. Implemented signature missions expose live, phase-correct progress.
3. Planned missions never expose dead numerical counters.
4. Landmark progress includes objective, L3 and Hatchery egg requirements.
5. The board contains no island-specific phone-progress arithmetic after the
   read-model is wired.
6. Focused tests, the full Island Run service suite, architecture guard and
   `git diff --check` pass.

## Rollback and stopping conditions

The slice is presentation/read-model only. Revert the registry integration if
it introduces a second state authority, changes rewards/completion, or makes a
planned mission appear playable before its canonical action service exists.

## 2026-08-26 implementation checkpoint

- Added the versioned Island 001–013 mission content registry with production
  world names and the approved compact command headers.
- Added `islandRunMissionTracker.ts` as a pure read model. Assembly, Frostwell,
  Arena Guardian, Rootheart Powerworks, Sunken Sands and Cactus Canyon now use
  their existing canonical signature state. Multi-stage rows change label and
  display value without adding a third line or losing accumulated progress.
- Great Re-Docking, Broken Causeway, Moon Mirrors, Breathline, Great
  Pollination and Ignition Chain are recorded as `planned_signature`. Their
  phones deliberately show canonical landmark progress instead of dead mission
  counters until action services exist.
- Landmark restoration now counts only a completed objective plus a Level 3
  build. Hatchery additionally waits until every egg slot for that island is
  collected or sold. Island 001 retains its four-landmark exception.
- Removed island-specific phone percentage arithmetic from the board component;
  the React surface now consumes the pure tracker presentation only.
- Verification: Island Run suite 1,846/1,846; architecture guard zero
  violations (three pre-existing allowlisted warnings); `git diff --check`
  passes.

## 2026-08-28 staged-restoration follow-up

- Broken Causeway, Moon Mirrors, Breathline, Great Pollination and Ignition
  Chain have graduated from `planned_signature` to live
  `staged_restoration` missions.
- Their phones now read the shared canonical persisted mission record and
  launch an actual collect/spend controller. Route crossings provide bounded
  pity without changing movement, while exact landings remain first priority.
- The five worlds retain separate object identities, stage counts, copy and 3D
  finales. The shared engine is state architecture, not a generic visual skin.
- Signature objects are additive to their underlying tile reward and resolve
  through the collision-proof reservation service.
- This follow-up does not make any of the five missions an island-travel gate.
