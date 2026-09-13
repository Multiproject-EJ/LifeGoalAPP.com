# Island 003 V2 — Frostmoon Haven

Date: 2026-09-13. Status: revised direction approved; shared modal/tracker fixes and Archive interior construction in progress.

## Outcome and authority

Upgrade the entire existing Island 003 world to the Island 001/002 V2 visual standard, preserving canonical gameplay and other island worlds. Work in `codex/island-003-v2-20260912`, based on fetched main `e8db4af0541e356951380477d7d17d0dc5c04019`. Prior Island 002 implementation/release and documentation are present. Its waiver does not transfer. No publishing, merging, release-check waiver or native installation is authorized by this proposal.

Source authorities: repository AGENTS.md; four Island Run contracts; actual-3D playbook; camera kit; content-pack strategy; source-fidelity workloop; existing Frostmoon packet and `.img2threejs/island-003-frostmoon-upgrade/user-decisions.v1.jsonl`; current routing, world factory, signature actions and tracker. The old Coconut Cove table and separate Essence-funding Frostwell brief are stale relative to current runtime and later user decisions.

## Explicit user updates

- Central Aurora Keep must be quite dominant.
- The ocean is completely frozen, many metres deep. Frostwell already drills to 500 m. No open sea or floating floes in the proposed environment.
- Add a Moonwell thermal-restoration sequence: L3 building unlocks a new special tile symbol; landing unlocks Boil water; click focuses Moonwell and slowly melts ice, heats water and starts restrained bubbling.
- Upgrade the full Frostwell experience, including entry modal/mission phone, spin, drilling animation, camera and completion celebration.
- Investigate the recurring mission-phone 0/5 after upgrading all buildings, across islands.

The first generated concept is superseded for ocean and central hierarchy. V002 is the user-approved direction, not an actual game render. All original images remain intact. Existing August landmark goals and accent palettes remain constraints unless explicitly superseded. Generated ring geometry, hidden construction and exact camera are not runtime authority.

## Visual direction

A continuous ancient frozen ocean stretches to distant snowy crags. The inhabited snow-and-rock shelf meets deep, layered blue ice with sealed fractures, trapped bubbles, wind-polished patches and pressure ridges. No surrounding liquid sea. Frostwell's engineered bore is a localized opening; the Moonwell pool is a contained warm feature after restoration, not a thaw of the ocean.

The central keep is the unmistakable hero: a high continuous timber civic hall, layered copper gables, strong gallery, stout stone turrets and an inviting substantial doorway. Gain dominance through coherent vertical mass and subordinate surrounding structures, not scaling the route or covering its rear tiles. The generated goal's roughly 2x secondary-building volume is an art-direction intent, subject to locked footprint and phone visibility checks.

- Snowfeather Roost: crafted sweeping feather roof, exposed incubation nests, copper heat fittings, cream/sage identity, complete entrance and rear service face.
- Hearthguard Yard: legible open training courtyard, rings, shield targets, gate and warm forge shelter; charcoal/oxblood accents.
- Moonwell Observatory: open ribs, brass armillary, telescope, pale-stone basin, patina accents. Frozen at completed L3 before the optional heat sequence; a gently bubbling, steaming well afterward.
- Frostfire Archive: squat octagonal library, low radial copper roof, reading frontage, book crest, open fire cage and rear furnace/service face; walnut/burgundy accents.
- Aurora Keep: dominant dark-stone/crimson civic centre, complete roof and rear architecture; name retained, no northern lights.

Planting uses varied snow-loaded fir branches and heights, juniper, sparse rowan berries, frosted grasses and boulders in coherent banks. Landings, protected route and mission/trade paths remain clear. Repeated foliage must be instanced or merged. Use modest hero motion above cheaper static masses.

Preserve day → short blizzard → clearing dusk → cozy night. Sky anchors live in world space. Warm windows, lanterns, fireplaces and chimney smoke create night life without drowning tile colors. Low quality and reduced motion preserve identity and state.

## Frostwell experience proposal

Read canonical queued spins, depth and commissioned state from existing services. Keep drill tiles 8/17/27, 15–75 m wheel results, 500 m target and automatic free commissioning at breakthrough. Do not restore the retired extra Essence payment. Preserve the below-ice fishery, conveyor/bucket handling, lift, reservoir and seafood freight behavior.

Review and improve the complete arc: compact mission-phone readiness → focused spin tray → physical auger bite and accumulated descent → readable side-section depth travel → anticipation at the freshwater lens → final breakthrough → fishery startup chain → clear celebratory finish and inspect-business action. Show earned progress immediately, maintain useful camera framing throughout, and avoid closing a completion dialog over the payoff. Exact pacing will be judged from a deterministic recorded runtime sequence, not prose alone.

All authoritative results commit before presentation. Cancel/reopen, rapid input, reload, reduced motion and prior 500 m saves must remain idempotent. Modals use viewport portals, fixed backdrops, visible-screen centering and scroll locks.

## Moonwell thermal mission proposal

Recommended interpretation: one-time optional permanent restoration per island/cycle. This is distinct from the existing Mystery objective and Frostwell ledger. No new currency, spend, direct reward or island-clear requirement is introduced without an explicit decision.

1. Moonwell reaching canonical L3 makes one authored heat pickup eligible. Reserve its tile through shared reservation priority, avoiding doors, encounters, Traffic Light, Build Discount and Frostwell stations.
2. Exact landing claims the heat pickup once, while retaining the tile's normal reward. A pending action survives dismiss/reopen and reload.
3. The player chooses **Boil water**. A mutex-protected canonical action commits activation once before any camera animation.
4. Presentation focuses Moonwell; frost softens, ice cracks and recedes, the water warms, then gentle bubbles and steam settle into a permanent operational state.
5. Reduced motion skips moving camera/particles and reveals the same completed basin. Interruptions cannot lose or replay rewards/state writes.

Suggested 8–12 second first-time thaw, interruptible with a settled-state fallback. Timing and physical clarity require runtime review. Existing L3 saves should become eligible, not silently consume their one-time experience. New state fields must have safe old-save defaults and persistence round-trip tests. This interpretation was included in the expanded direction approved September 13.

## Mission-phone investigation and proposed correction

Reproduced in 57 synthetic state fixtures across 19 islands: see `qa/mission-phone-reproduction-v001.json` and `MISSION-PHONE-INVESTIGATION.md`. Most signature missions label `fullyRestored` as Build Landmarks, combining L3 and activity/egg completion. Standard missions already count builds separately. This is a confirmed labeling/counting mismatch, not evidence of lost build data.

Fix as a separate reversible shared presentation slice: Build Landmarks counts `buildsComplete`; activity/egg completion is shown explicitly, and overall completion still requires every applicable condition. Preserve Island 001's four outer landmarks and Island 020's explicit Solve Level-3 Labyrinth prerequisite. Test L3 with unfinished activities, egg ready versus terminal, partial builds, other-island state and full completion. Check phone layout and action routing. No island-clear or state mutation logic changes merely to make the label say 5/5.

## Execution slices and evidence

1. Admission: fresh V1 phone/landmark/orbit/night/mission-focus screenshots; immutable references and hashes; revised concept; 15-group decomposition; user discussion. Current fresh set: `baseline-v002` (11 actual dev-preview frames, source stable, no captured page errors). Failed warm-up is preserved in `baseline-v001`.
2. Performance baseline, then representative dominant Keep + adjoining terrain/planting blockout. Profile before detail and inspect naked geometry from nine angles. Stay within current envelopes. Independent read-only Quality Lord must approve macro form before detail or wider production.
3. Build all five coherent L1–L3 landmark families, continuous terrain/ice and botanical systems. One serialized writer per owned group, independent bounded QC; freeze approved parents and invalidate dependent approvals after changes.
4. Frostwell controller/cinematic/celebration and Moonwell thermal mission, as separate reversible service/presentation slices. Capture current and improved full sequences, test interrupt/reload/reduced-motion behavior.
5. Shared mission-phone readout correction; focused tests and responsive phone evidence across affected types.
6. Integration, construction authoring, quality tiers and cleanup. Fifteen additive build transitions and contact-safe robots; current/next level continuity; resting/working/tail/settled/reduced-motion capture.
7. Release candidate: actual before/after, all levels, phone HUD/controller view, short/wide phone and desktop, reduced motion, full orbit, geometry/route and moving-vehicle clearance, replay clips, focused/full Island Run tests, TypeScript, production build, architecture/art/wiring validators, payload accounting, actual physical-phone Auto/High profiling. Present reviewed candidate for final publishing decision.

## Gates and budgets

Independent per-required-view visual scores ≥0.85; worst view governs; no veto. Return to approved source at every major checkpoint (five source-fidelity dimensions; ≥0.80 overall, each ≥0.75, no critical drift). No detail around failed macro structure. One blockout plus one bounded correction per family; at most two families/four reviews before a changed-route decision.

High starting ceiling: max 175 calls, 180k triangles, average ≥50 FPS, p95 ≤29 ms, slow frames ≤15%, on physical target phone. Desktop development measurements are diagnostics only. Early V1 snapshots already show 2,159 overview calls and 2,499 right-orbit calls; this requires batching/profiling before detail expansion. No budget is waived. Target standard 2–5 MiB island delta; review above 8 MiB, record shared dependencies and avoid binary duplication.

## Rollback, recovery and stopping rules

Commit bounded slices on the dedicated branch; do not touch other worktrees. Keep previous source and all failed evidence. Separate shared tracker correction from island visual/mission changes. Stop on gameplay-authority regression, new route/vehicle obstruction, source races, unresolved macro failure, performance regression or hard skill gates. No publication without separate explicit authority. Another worker starts at IMPLEMENTATION-STATUS.md, verifies main/branch and reference hashes, reads the active contract and full applicable skills, runs the appropriate img2threejs state gate, and resumes only the named slice.

## September 13 approved refinements

The user approved the corrected visual direction and requested roughly half of the Frostfire Archive construction presentation to feature interior work: hearth, shelves, reading alcoves, furnishings. Close the copper roof at the very end of L3, with a reversible inspection cutaway keeping the interior accessible afterward. This changes presentation and authored part order, not purchase counts or prices.

All standard building modals need closer framing, a single small grounded completion pulse, and continuity through the final celebration. Aim for about 20% stronger apparent size while retaining canonical level geometry and footprints; do not multiply the whole building by 1.2 at every purchase. Island 015 retains its specialized interior camera. Broad implementation is approved; publishing remains separate.
