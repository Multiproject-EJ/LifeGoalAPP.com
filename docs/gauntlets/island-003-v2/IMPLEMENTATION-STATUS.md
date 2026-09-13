# Island 003 V2 — implemented local candidate

2026-09-13 · Branch `codex/island-003-v2-20260912`. The approved entire-island implementation is authored. The actual before-and-after gallery is complete and checked across all 11 views. Physical-device and performance acceptance remain open. Nothing has been published or merged.

## Subsequent Frostwell and forest refinement

The user requested a more visibly changed Iceworks and richer trees after reviewing V2. See [the latest before/after](frostwell-forest-refinement/before-after.html) and [refinement status](frostwell-forest-refinement/STATUS.md). The first complete V2 evidence below remains historical; the later refinement has its own checks and profile.

## Implemented

- **Whole frozen world:** dominant layered Aurora Keep with supported rings/turrets, continuous snow-covered shelf over deep blue ice, completely frozen ocean, pressure ridges, distant snow-covered crags, branched firs and low juniper/berry/grass banks. Removed the legacy coastal plates and lagoon that covered the new ice. Freight vehicles use the frozen sea height and a grounded ramp.
- **Five landmark families:** coherent L1–L3 additions with funded geometry retained. Snowfeather required a narrow correction to two rails and egg spots; restoring only those contacts recovers its prior L3 geometry hash. Hearthguard's approved final geometry is retained. Each landmark keeps its existing identity and palette.
- **Archive:** furnished reading room with table/book, shelves, seating and hearth. Interior work occupies the middle construction stages; roof, crest and chimney close at the end of L3. Look inside / Close roof provides reversible finished-building inspection.
- **Moonwell:** canonical Mystery L3 starts frozen and exposes a collision-free heat pickup. Exact landing collects it while retaining the normal tile resolution. Boil water commits once through the canonical mutex service, then plays a 10-second focused thaw, warming and gentle bubbling. Skip/reload/reduced motion settle the same saved result. No added spend, reward or island-clear requirement.
- **Frostwell:** new launch/spin interface, close cutter-following descent, breakthrough/startup sequence, completion celebration and inspect/return controls. Canonical results commit before presentation; cancellation and reduced motion settle safely. Automatic commissioning remains at 500 m.
- **Shared construction:** closer fitted camera, one restrained completion pulse, consistent size through celebration and immediate reopening. No compounding whole-building growth. Outer inspection cameras now approach the entrances; an occluding Keep is fully hidden in these focus views and restored in overview.
- **Mission phone:** Build Landmarks reports L3 upgrades separately from activities and eggs. All-L3 fixtures show 5/5 builds without changing clear requirements. Responsive portrait/short-landscape layouts keep objectives and footer reachable.

## Before and after

Open [the actual V1 / V2 gallery](before-after-v2.html): 11 matched views plus Frostwell, Moonwell and Archive detail strips. Every comparison image loads, all 11 view buttons work, and the gallery fits a 390px viewport without horizontal overflow. The original before-goal page is preserved as historical direction with a link to the finished gallery.

## Verification record

- Full Island Run regression suite: **2,095 passed, zero failed**. This includes new canonical Moonwell exact-landing, reservation, persistence/merge, concurrent activation, no-spend/no-clear-change and real-roll tests.
- All **15 build transitions** pass in `qa/all-fifteen-builds-final-v002/capture.json`, with one stable source version, grounded previews and settled finale width ratio 1.000 in every case. Three mission-phone layouts pass at 390×844, 360×640 and 844×390. The earlier partial fixed-delay/HMR capture is preserved.
- Final-source TypeScript and production Vite build pass; receipts are in `qa/FINAL-DELIVERY-CHECKS.json`. The build retains the existing large-chunk warning. Final focused geometry/mission checks and architecture/art/wiring validators pass: `qa/final-code-checks.json`.
- Independent Keep macro correction, Archive interior/inspection, Moonwell thermal-state and corrected Snowfeather/Hearthguard contact slices pass their bounded visual gates. See `qa/RESTORATIONS-INDEPENDENT-REVIEW.md`, `qa/OUTER-ADDITIVE-INDEPENDENT-REVIEW.md`, and `.img2threejs/island-003-v2/` packets. Generic whole-composite-reference versus isolated-render image diagnostics are retained as failed/mismatched evidence, not represented as a full likeness pass.
- Actual V1 baseline is `baseline-v002`: 11 development phone frames at 390×844, DPR2, High, all L3. Actual V2 captures are versioned separately. Generated concepts remain reference material only.
- Final world V001 was rejected for cone-like crags, rectangular snow patches and a legacy terrain overlay. V002 corrected those; three closeups still showed the old translucent central-Keep fade. V003 closes those views and passes the bounded independent world gate (minimum 0.85). Frozen Frostwell keyframes pass at minimum 0.85. Corrected Archive/Moonwell focus views pass at minimum 0.86. Failed/partial capture folders remain preserved.
- `qa/PAYLOAD-COMPARISON.json`: emitted build asset delta is approximately **28.44 kB minified / 10.40 kB gzip** versus the prior local production build. No new production raster assets or dependency packages. QA images/videos are development evidence, not runtime payload.

## Remaining release gates

The final isolated High profile (`qa/final-profile-high-v002/profile.json`) has stable source hashes and no page errors: **42.1 FPS, p95 34.0 ms, 38.2% slow frames, 307 peak calls and 77,251 peak triangles**. The agreed 175-call ceiling and all timing thresholds remain **unmet and unwaived**. The prior final V001 profile measured 46.3 FPS, p95 34.2 ms, 27.4% slow frames and 293 peak calls. Sharing matrix updates removes duplicate traversals in the targeted unit check, but this follow-up demonstrates no timing improvement; do not claim one.

The original baseline measured 2,373 peak calls / 180,870 triangles, 51.7 FPS, p95 33.4 ms and 15.8% slow frames. The final scene uses about 87% fewer peak calls and 57% fewer peak triangles, while measured timing has regressed. Development phone-viewport captures and deterministic production-component fixtures are not authenticated end-to-end gameplay or physical-phone acceptance. Independent reviews approve the bounded visual/state composition; live-motion smoothness has not been independently accepted.

Physical target-phone Auto/High validation remains required. No publishing, native installation, merge or release approval is claimed. The unrelated Island 015 direct palace construction fixture remains unverified due to its pre-existing early fallback-cache problem; no Island 015 regression pass is inferred from this work.

## Evidence scope

`qa/restorations-final-v003` preserves a failed full capture: screenshot latency let the thaw finish before the interruption click. Its cold/half/hot static frames remain valid. `qa/restorations-focus-v004` uses a paused test clock to verify the corrected mid-thaw composition and interruption, then real-time Archive open/reclose. Previous live recordings and responsive/reduced-motion checks remain separate in `qa/restorations-final-v002` and `qa/frostwell-mission-v2-final-v002`; independent keyframe approval does not certify live-motion smoothness.
