# Islands 002–010 authored construction Gauntlet

Status: **implementation complete — physical-device release gate pending**
Approved direction: Eivind, 2026-08-22

Automated structural evidence: 135/135 transitions pass across 45 landmark
families. Every transition contains stages 1–5 and exactly five temporary local
rig batches; every funded L1→L2 and L2→L3 transition retains existing geometry.

Final evidence:

- production Vite build passes;
- Island Run architecture guard passes with zero violations;
- 390×844 live-modal QA reports zero landmark grounding error and zero crew
  occupancy violations;
- active work locks the camera, the recent-work state remains locked after the
  robot burst, and the gentle orbit resumes only after the full idle window;
- live runtime reports `authored-landmark-only` scaffolding.

Performance and bundle evidence:

- The board reaches `Island5ThreePilot` through a React lazy import, so the
  procedural robot family and choreography remain outside the initial app
  route.
- Live construction uses the low-detail family and keeps the combined
  temporary crew below 48,000 triangles and at or below 72 draw calls. The
  current busiest sampled phase measures 42,138 triangles and 72 draw calls.
- When construction is inactive, the hidden parent prevents renderer traversal
  and the crew update loop is skipped. Live QA reports
  `constructionCrewRuntime=parked` with zero rendered crew triangles and draw
  calls; separate allocated metrics expose the one-time procedural geometry.
- The completed Islands 005–010 choreography pass increased the lazy 3D chunk
  by about 30.5 kB raw / 3.8 kB gzip and did not increase the main app chunk.
  The broader main-bundle size is an existing app-wide code-splitting concern,
  not animation payload from this pass.
- A sustained 30-second Rootheart Arena construction profile at explicit High
  quality held 60 FPS average, 17.6 ms P95, 0% slow frames, 848 maximum draw
  calls and 470k maximum triangles at 752×1660 internal pixels. The explicit
  Low path also held 60 FPS / 17.6 ms P95 / 0% slow frames while reducing the
  scene to 802 maximum calls, 323k triangles and 376×830 internal pixels. Its
  phone-scale visual remained coherent, confirming that Auto can safely route
  constrained devices to the existing Low path without removing the build
  story.

## Native iOS integration and physical-device gate — 2026-08-23

The normal production Vite bundle was copied through Capacitor and the native
`App` scheme built successfully for an iPhone 17 simulator running iOS 26.5.
The installed app launched under bundle ID `com.lifegoalapp.habitgame` and
rendered the normal public landing route after its approximately eight-second
first WebView startup. The expected production copy, `Opens at launch · join
the waitlist`, confirms that the public game-login feature flag is disabled in
the final installed build.

A separate temporary QA build enabled the repository's existing sanctioned
guest route. That native build advanced through Game login, Play as guest,
audio setup and Begin my voyage into the actual Island Run welcome flow. This
proves the Capacitor package can load the real game route and its canonical
onboarding on iOS; it is not evidence for the Build modal itself. The temporary
guest bundle was then replaced by a fresh normal production build in both
`dist` and `ios/App/App/public`, rebuilt, reinstalled and visually verified.

The registered physical target, Eivind sin iPhone (iPhone 16 Pro, iOS 26.6),
was subsequently paired through Xcode and received the signed local QA build.
The real Island 001 Build modal was exercised across all 15 authored levels.
The physical captures confirm that the corrected miniature crew stays in
separate camera-facing work zones, tools reach the structure without robot
roots entering it, dust no longer hides the landmark, camera framing remains
locked during the work beat, temporary authored scaffolding tracks the active
level, and the completed landmark returns without the site-wide scaffold cage.

The first sustained fast-builder burst exposed one native-only reliability
failure: after several rapid level changes the WebView reloaded to the landing
route. Each completed level reconstructs the shared Three.js scene, and WebKit
was allowed to retain the retired WebGL contexts until a later GC pass. The
renderer cleanup now calls `renderer.forceContextLoss()` after disposing the
scene; a focused source contract prevents that release from being removed.
The corrected signed QA build then completed the remaining three Island 001
levels and the full-island completion handoff without another reload.

This is strong physical evidence, but not yet the final release sign-off. The
guest save had already advanced beyond the earlier levels when the corrected
build was installed, so the entire 15-level rapid burst has not been repeated
from zero with the cleanup fix present. A true held auto-build session and the
physical reduced-motion state also remain uncaptured. The status therefore
stays **physical-device release gate pending** until those three checks are
replayed without deleting the user's current local QA save.

After QA, a fresh normal production bundle was rebuilt without
`VITE_PUBLIC_GAME_LOGIN_ENABLED`, copied into the Capacitor app, signed,
installed on the same phone, launched, and visually verified on the expected
`Opens at launch · join the waitlist` route. No App Store, TestFlight, remote
deployment or public release occurred.

## Island 002 real-modal fast-builder revalidation — 2026-08-23

The canonical Island 002 gameplay visit was reset and funded through the
existing `applyDevGrantEssence` action exposed by a dev-only debug-panel QA
control. The test did not mutate storage or call a persistence primitive from
the browser. At the 390×844 viewport, the real Build modal then completed all
15 sequential construction levels in one uninterrupted fast-builder run.

Measured result:

- 15/15 transitions reported the correct authored additive delta, from
  `hatchery:L0->L1` through `boss:L2->L3`;
- all transitions exposed five populated semantic reveal stages and 11–19
  reveal batches;
- every sampled working frame remained `build-locked`;
- maximum funded/preview `verticalError` was `0`;
- maximum pair and building occupancy violations were both `0`;
- the collision solver's exact-boundary re-projection was stabilized with a
  positive shell margin, reducing the sampled per-frame correction ceiling
  from 8 to 1;
- resting phone positions moved from clipped edge values near NDC `-0.94` and
  `+1.00` to fully readable values `-0.81`, `+0.74`, and `+0.87` while retaining
  positive landmark and pair clearance;
- completed left- and right-orbit phone captures remained coherent, and the
  final resting scene contained no construction crew or temporary scaffold.

Img2threejs review action: **refine-code**. The reference/model hierarchy was
not regenerated; this pass corrected two live choreography defects in the
shared presentation code: floating-point shell tremor and edge-clipped resting
stations. Current honest live Build UX score is 9.2/10. It is not called 10/10
until the same evidence is repeated on a physical target phone and the
remaining islands receive their own real-modal fast-builder pass.

## Island 003 Frostmoon choreography refinement — 2026-08-23

The first Island 003 audit confirmed that all 15 Frostmoon transitions already
retained funded geometry, exposed all five reveal stages, and removed their
five temporary façade batches when work stopped. It also exposed a qualitative
gap: Frostmoon used the correct icewood materials, but the robot tool sequence
and relocation path still read too much like the shared default.

The five landmark profiles now carry separate, runtime-consumed choreography:

- Snowfeather Roost uses a sled-hoist sequence with timber, cable, saw and
  cradle work;
- Hearthguard Yard uses a faster court-and-bracing assembly path;
- Moonwell Observatory uses measuring, pipe, cable and optical-alignment work;
- Frostfire Archive uses a slower book-lift and insulated-timber sequence;
- Aurora Keep uses the broad commissioning route with beam, pipe, cable and
  beacon work.

The stage labels are also authored in Frostmoon terms rather than inherited
generic prose. Runtime telemetry exposes the active choreography ID and legal
station route, so the real modal can be checked without inferring the pattern
from appearance alone.

Long-run motion evidence covered 7,200 frames per landmark (36,000 total),
including foundation, frame, assembly, finish and one full minute of resting
facial/personality beats. Final maximum pair violations and landmark-shell
violations were both `0`; minimum shell clearance was `0.0012` for the four
outer landmarks and `0.0018` for Aurora Keep. A first Hearthguard candidate
route did produce one overlap and was rejected before the collision-safe route
was recorded.

The focused 135-transition construction contract, robot-family contract,
production Vite build, Island Run architecture guard and `git diff --check`
all pass. The completed Frostmoon landmark geometry was not changed in this
slice, so the previously approved front/left/right/rear world evidence remains
the 360 geometry authority. A fresh physical-phone modal capture is still
required before calling this island 10/10.

Img2threejs review action: **refine-code**. The active Frostwell side-mission
state remains at its separate structural pass; it was not advanced or treated
as evidence for the five canonical Frostmoon landmarks.

## Island 004 Crown of Tides choreography refinement — 2026-08-23

All five Crown of Tides landmarks now consume separate maritime construction
stories rather than the shared route with different labels:

- Coral Cradle uses a driftwood-and-rope cradle hoist;
- Tidekeeper Hall rigs sail braces and tidekeeper fittings on a reverse route;
- Concord Arena installs the low, wide court and rail fit-out;
- Pearl Archive lifts shelves, pearlwork and archive panels on a reverse route;
- Crown Citadel commissions the floodgate, crown beacon and upper works.

Each profile has its own stable choreography ID, relocation timing, tools,
materials, base station, phase-specific station offsets and route direction.
The first Pearl Archive finish route produced an overlap in the exact-envelope
trace and was rejected; the recorded route is the corrected collision-safe
version.

Long-run evidence covers 7,200 frames per landmark (36,000 total) across
foundation, frame, assembly, finish and one full minute of resting behavior.
All five finished with zero pair violations and zero landmark-shell
violations. Minimum building clearance remained positive at `0.0011` or
greater, and the tightest crew-to-crew clearance was `0.0013`.

The live crew scale now responds to the real target landmark envelope instead
of using one visual size everywhere. Crown Citadel resolves to `0.110`, Coral
Cradle to `0.102`, Tidekeeper Hall to `0.107`, Pearl Archive to `0.099` and the
low, wide Concord Arena to `0.075`. Exact rendered-height checks keep the heavy
worker between 6.0% and 9.3% of landmark height, the project manager below it,
and the mini artist at roughly half the heavy worker's read. This keeps the
landmark dominant on a phone while preserving the three-role hierarchy.

Fresh 390×844 browser-phone captures covered the five actual target previews,
including the compact Pearl Archive and Concord Arena cases. Live telemetry
reported `verticalError: 0`, zero occupancy violations and
`authored-landmark-only` scaffolding. Completed Crown geometry was not changed,
so the approved Crown front/left/right/rear evidence remains the 360 geometry
authority; this pass checked that the temporary rig and workers remain
coherent against it.

The focused 135-transition construction contract, robot-family contract,
production Vite build, Island Run architecture guard and `git diff --check`
pass. The SSR-only harness prints a sandbox WebSocket-listen warning before its
pass result; it does not affect the trace or production build.

Img2threejs review action: **refine-code**. Crown of Tides has no resumable
local reconstruction state, and its already approved landmark geometry was not
regenerated. Current honest Island 004 construction score is 9.3/10. A
physical target-phone pass remains required before 10/10 or release approval.

## Islands 005–010 individual choreography completion — 2026-08-23

The remaining six worlds no longer fall through to the generic
`world-{number}-{landmark}-{rig}` choreography. Thirty new landmark-specific
profiles now drive the actual runtime with unique style IDs, relocation timing,
phase routes, tools, materials and five-stage building language.

| World | Five authored work stories | Resolved crew scale | Minimum shell clearance |
| --- | --- | --- | --- |
| 005 Sunshore Atoll | Sunwheel commissioning; Egg Grotto cradle rig; open-air lodge lashing; Star Archive lift; Tideglass alignment | `0.075` | `0.0016` |
| 006 Moonveil Nexus | Moon Gate commissioning; Moon-Nest levitation; Constellation Court calibration; Midnight Archive lift; Violet Rift optics | `0.075–0.099` | `0.0016` |
| 007 Abyssal Pearl Kingdom | Pearl Throne commissioning; Nautilus buoyant cradle; living-reef bind; Tidemind shell lift; Compass Current portal | `0.075–0.078` | `0.0014` |
| 008 Everblossom Kingdom | Blossom Crown commissioning; Tulip glasshouse weave; Sunflower Pavilion lashing; Orchid Archive lift; Leafroof Garden rig | `0.075–0.110` | `0.0015` |
| 009 Heartshaft Crucible | Crucible core commissioning; Blastglass incubator; Great Fuse assembly; Memory Press lift; Seismic Switchyard rail | `0.075–0.110` | `0.0017` |
| 010 Rootheart Canopy City | Arena canopy commissioning; Acorn cradle hoist; Canopy Rhythm lashing; Spiralwood Library lift; Firefly Pulley workshop | `0.075–0.107` | `0.0017` |

Exact-envelope runtime traces covered 36,000 frames per world and 7,200 per
landmark, for 216,000 frames across Islands 005–010. Together with Crown of
Tides, the final combined rerun covered 252,000 frames across 35 landmarks.
Every trace finished with zero pair violations and zero building-shell
violations. The tightest legal pair clearances were `0.0093` (Sunshore),
`0.0460` (Moonveil), `0.0165` (Abyssal), `0.0085` (Everblossom), `0.0053`
(Heartshaft) and `0.0023` (Rootheart).

The building-aware worker size remains intentionally small. The very tall
Great Fuse resolves its heavy worker to 4.2% of landmark height; the unusually
flat Rootheart Arena is the readability outlier at 14.1%. Its manager remains
8.4% and mini artist 4.7%, preserving the requested role hierarchy while
keeping all three usable around a low arena.

Fresh browser-phone evidence at the internal 390×844 target covered a live
working landmark in every world from Sunshore through Rootheart. All sampled
views reported zero vertical grounding error, zero live occupancy violations
and `authored-landmark-only` scaffolding. The temporary rigs remained local to
the active landmark rather than recreating the rejected site-wide cage.

This pass did not change completed landmark geometry, so each world's approved
front/left/right/rear evidence remains the 360 geometry authority. The live
views checked that the temporary rig, workers and real building envelope remain
coherent against those models. A final physical-device sweep is still required
for release approval.

Img2threejs state handling remained conservative:

- Islands 005, 006 and 010 have no resumable reconstruction state, so the
  action was **refine-code** around the approved procedural factories;
- Island 007's active blockout state was inspected and left untouched;
- Island 008's stopped old state was not resumed, while the active Blossom
  Crown material-pass state was also left untouched;
- Island 009's active initial blockout state was inspected and left untouched.

The focused 135-transition contract, robot-family contract, production Vite
build, Island Run architecture guard and `git diff --check` pass after the full
matrix. The production build retains its existing chunk-size/dynamic-import
warnings. The repository-wide TypeScript caveat remains the pre-existing
Supabase-generated typing failures outside this construction slice.

## Mission and observable outcome

Make authored building choreography part of producing every actual-3D Island
Run world. Islands 002–010 must no longer depend on the generic height-sorted
construction fallback. Every one of their five landmark families and every
L0→L1, L1→L2 and L2→L3 transition must preserve the funded structure, reveal
only additive geometry through five meaningful stages, and use compact
world/landmark-specific temporary staging while the three-robot crew builds.

Scope: nine world sources, 45 landmark families and 135 transitions.

## Sources of truth

- `AGENTS.md` and the canonical Island Run architecture/gameplay contracts;
- `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`;
- `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`;
- `work/island-visual-library/ISLAND_120_PRODUCTION_SYSTEM.md`;
- each existing Island 002–010 world factory, visual reference, Gauntlet and
  resumable `.img2threejs` state where one exists;
- Island 001's completed construction system as the behavior/performance
  precedent, never as a visual geometry template.

## Non-negotiables and forbidden shortcuts

- Preserve the canonical 36-tile route, stop order, economy, rewards, clicks,
  build actions and state ownership. Construction remains read-only
  presentation.
- The funded level stays fully opaque and grounded. A full target-level ghost,
  level-wide fade, root-scale jump or floating replacement is a failure.
- No site-wide rectangular scaffold cage. Temporary equipment stays local to
  one façade/contact zone and disappears in resting/completed states.
- Every island keeps its own material and engineering language. Recolouring
  one generic rig is insufficient; equipment topology and work story must also
  suit the landmark.
- Robot roots have one transform owner and remain outside the landmark shell
  and one another. Only tools/hands/workpieces may enter contact zones.
- Reduced motion removes relocation, contact vibration, greetings and ambient
  POV changes while preserving the additive level read.
- Existing dirty/untracked robot and Island 001 work is user work and must be
  preserved.

## Production matrix

| World | Construction language | Landmark families |
| --- | --- | --- |
| 002 Celestial Sky Kingdom | cloudglass rails, sky-silver braces, suspended hoists | Solspire Palace, Cloudnest Conservatory, Winged Resolve Court, Skybound Archive, Astral Gate |
| 003 Frostmoon Haven | icewood trestles, sled rails, frost-crystal clamps | Aurora Keep, Snowfeather Roost, Hearthguard Yard, Frostfire Archive, Moonwell Observatory |
| 004 Crown of Tides | patched driftwood, sail rope, repair cradles | Crown Citadel, Coral Cradle, Tidekeeper Hall, Pearl Archive, Concord Arena |
| 005 Sunshore Atoll | bamboo frames, turquoise lashings, beach rollers | Sunwheel Arena, Egg Grotto Hatchery, Open-Air Habit Lodge, Star Archive Library, Tideglass Oracle |
| 006 Moonveil Nexus | arcframe alloy, floating calibration rails, light clamps | Noctyra's Moon Gate, Moon-Nest Conservatory, Constellation Court, Midnight Archive, Violet Rift Observatory |
| 007 Abyssal Pearl Kingdom | living coral braces, pearl gantries, buoyant transfer rails | Pearl Throne Palace, Nautilus Hatchery Grotto, Living Reef Sanctuary, Tidemind Archive, Compass Current Portal |
| 008 Everblossom Kingdom | vineframe ladders, pale-wood platforms, blossom knots | Blossom Crown Citadel, Tulip Glasshouse Hatchery, Sunflower Rhythm Pavilion, Orchid Crystal Archive, Leafroof Garden Hall |
| 009 Heartshaft Crucible | black-iron trestles, ember rails, forge clamps | Heartshaft Crucible, Blastglass Incubator, The Great Fuse, Memory Press, Seismic Switchyard |
| 010 Rootheart Canopy City | rootwood staging, saplight bindings, pulley walkways | Rootheart Arena, Acorn Cradle Hatchery, Canopy Rhythm Lodge, Spiralwood Library, Firefly Pulley Workshop |

## Milestone slices

1. Add a shared construction-authoring contract and deterministic audit that
   records retained/additive counts, five-stage coverage, temporary rig profile,
   grounding and runtime cost per transition.
2. Complete Island 002 as the first non-Island-001 proof. It must demonstrate
   that previously compacted full-level replacements can become true additive
   transitions without sacrificing normal board batching.
3. Complete Islands 003–005 and review the first biome batch.
4. Complete Islands 006–008, respecting Island 008's active replacement
   Blossom Crown state; the older stopped Island 008 state is historical and
   must not be resumed or treated as approval evidence.
5. Complete Islands 009–010 and run the full nine-island matrix.
6. Update the visual production playbook/template so future island factories
   cannot be approved without a declared construction profile and audit row.

## Acceptance evidence per island

- all 15 transitions have retained geometry when the source level is nonzero;
- stages 1–5 are represented and ordered by structural dependency rather than
  only mesh height;
- working-only temporary equipment is identified by world, landmark and rig;
- funded/preview foundation vertical error is zero;
- long-run crew trace reports zero pair and landmark occupancy violations and
  zero settled root drift;
- real 390×844 modal evidence covers click burst, held auto-build, recent tail,
  resting and reduced-motion states;
- front, left, right, rear/opposite and underside/top where relevant remain
  coherent for the completed landmark and its temporary rig;
- island-specific and combined live-modal triangle/draw-call budgets pass;
- focused contracts, production Vite build, architecture guard and
  `git diff --check` pass. Unrelated repository-wide type failures are reported
  separately and never disguised as this slice passing them.

## Rollback and recovery

Normal board rendering remains on its existing compacted model path. Preview
authoring is opt-in through a construction-only factory option, so an island
slice can be reverted without changing funded gameplay state or its board
model. Each island is an independent approval checkpoint; a failed island does
not justify disabling the already-approved Island 001 system.

## Stop conditions

- stop a slice if funded geometry cannot be matched without a visible modal
  pop, duplicate/z-fighting shell or material regression;
- stop after the img2threejs correction ceiling and record the concrete visual
  blocker instead of bypassing the state gate;
- stop if construction work introduces a gameplay write or new runtime-state
  mirror;
- do not claim Islands 002–010 complete until every matrix row has current
  code, numeric evidence and real-modal visual evidence.

## Handoff

Resume from the first unapproved island in numeric order. Run its existing
img2threejs state gate before geometry work, inspect the current factory and
reference evidence, implement one landmark at a time, then append exact audit
results and one honest review action to this file.
