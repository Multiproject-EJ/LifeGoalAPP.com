# Independent restoration review

Reviewed 2026-09-13 by `build_modal_review`, independently of the geometry and presentation authors. No runtime edits or browser launches were made during this review.

**Action: approve the bounded thermal-state, attachment, and Archive inspection slice. Worst required score: 0.85.** This is not final whole-landmark, reference-fidelity, material, island, or performance approval.

## Evidence inspected

- [Root presentation capture](restorations-v001/capture.json): front [cold](restorations-v001/moonwell-cold.png), [half](restorations-v001/moonwell-half.png), [hot](restorations-v001/moonwell-hot.png), [launch modal](restorations-v001/moonwell-launch.png), [live melt](restorations-v001/moonwell-live-melt.png), [interrupted hot](restorations-v001/moonwell-interrupted-hot.png), [reduced-motion hot](restorations-v001/moonwell-reduced-hot.png), and Archive [closed](restorations-v001/archive-closed.png)/[open](restorations-v001/archive-open.png).
- Writer packet: `.img2threejs/island-003-v2/moonwell-thermal/macro-v001/clay-0.png` through `clay-8.png`; `assembly-v001/{cold,half,hot,left,right}.png`; both capture manifests; `geometry-check.json`.
- Identity reference: `docs/visual-references/island-003-frostmoon-upgrade/secondary-inferred/landmark-goals/003-moonwell-observatory-l3-goal-v001.png`.

All three capture manifests report unchanged source sets and no capture errors. The root manifest explicitly scopes evidence to development phone presentation, not authenticated gameplay or a physical device. Its datasets record cold `0.000`, half `0.500`, live melt `0.538`, hot/skip/reduced `1.000`, and `archiveRestored: true`.

## Scores and findings

| Required presentation | Score | Finding |
| --- | ---: | --- |
| Moonwell front cold | 0.90 | Basin is fully opaque and frozen. |
| Moonwell front half | 0.85 | Water is exposed with a remaining central ice patch; distinction from hot is near the acceptance floor. |
| Moonwell front hot | 0.86 | Ice is gone; warm rim, modest bubbles and steam remain inside the basin. |
| Launch modal | 0.90 | Clear explanation and readable primary/secondary actions. |
| Live melt | 0.85 | Basin transition is visible and the finish control avoids the principal water area. |
| Interrupted hot | 0.87 | Skip settles visibly into the hot state. |
| Reduced-motion hot | 0.87 | Settled water and warm rim remain legible without animated effects. |
| Archive closed | 0.88 | Exterior identity and inspection affordance remain readable. |
| Archive open | 0.86 | Table/book, two shelves, seats and hearth remain readable with credible contacts. |

Moonwell naked-view attachment/cross-view scores for clay 0–8: **0.87 / 0.87 / 0.86 / 0.86 / 0.85 / 0.85 / 0.86 / 0.86 / 0.86**. Arch apex meets the crown, feet meet the foundation, and no duplicated cladding shell gap is apparent. These scores assess the bounded attachment changes, not complete likeness to the reference.

The geometry audit records no missing funded geometry for either upgrade, 29 normal board meshes, and 17 preserved thermal-role meshes: 7 ice, 1 water, 1 heater, 5 bubbles and 3 steam. Cold opacity, heated liquid and reduced-motion checks pass in the recorded audit.

## Limits and follow-up gates

- Root changed the Moonwell front camera after this capture by pulling it back 15%. That final framing is not pictured or approved here. The captured front view crops outer architecture while retaining the thermal basin.
- The writer's earlier event camera approaches the rear, with the cabinet in front. It supports state evidence but is superseded by the root front-direction presentation.
- Preserve or strengthen half/hot differentiation during material finish; the half-state ice patch is small.
- Archive reclose is supported by the manifest assertion; there is no separate reclosed PNG. This review does not establish exact construction timing or a full paid construction run.
- Static images and fixture assertions do not independently establish animation smoothness, canonical authenticated activation, save/reload behavior, physical-device performance, or final day/night/quality-tier coverage.
- Copper cladding, snow, stone, basin surface response, complete reference fidelity and integrated frozen-world consistency remain later gates.
# Corrected final focus acceptance — 2026-09-13

**Action: approve the bounded restoration presentation slice.** Inspected all six PNGs in `qa/restorations-focus-v004`: launch, mid-thaw, interrupted hot, Archive closed/open/reclosed. Independently verified all six PNG hashes, identical start/end source hashes and their match to current disk. Manifest errors are empty and archiveRestored is true.

The Snow Hare no longer crosses the mid-thaw basin or open reading room. Scores: launch **0.90**, mid-thaw **0.86**, interrupted hot **0.87**, Archive closed **0.88**, open **0.87**, reclosed **0.88**. Worst **0.86**, up **0.11** from the prior 0.75; no scored regression. The central remaining ice patch, liquid border and thermal action are distinct. The open room clearly shows book/table contact, seating, shelves and hearth, and the complete exterior returns on reclose. Ambient actors at the outer frame after closing do not obscure this inspected content.

This consumes the one bounded ambient-actor correction. The file named `moonwell-live-melt.png` is a clock-paused composition at recorded thaw progress **0.458**, not a live-motion capture. The interruption frame records **1.000**; Archive open/closed records true/false. The failed `restorations-final-v003` full script is not promoted to a passing run: its screenshot latency allowed thaw to end before the Finish click. Its static thermal states and the successful v004 focused correction are separate evidence. Earlier responsive/reduced-state findings remain separately scoped. These reviews do not establish physical-device performance, live pacing or authenticated canonical gameplay.

# Previous final-source findings — 2026-09-13

Inspected every PNG in `qa/restorations-final-v002`: cold, half, hot, launch, live melt, interrupted hot, reduced hot, Archive closed/open/reclosed and 360×640/844×390 launch layouts. Source start/end agree and the six recorded model/Pilot/TemplateKit hashes match current disk. Manifest has no errors, archiveRestored true and reducedComplete 1.000. This packet does not hash the modal CSS/component; source provenance is narrower than a full UI source audit.

The pulled-back Moonwell front camera passes the state-readability slice: cold 0.90, half 0.86, hot 0.87, interrupted hot 0.86, reduced hot 0.86. Solid ice is distinct from the remaining central ice patch and from warm contained water. Launch is readable at 390×844 and 360×640 (0.90); landscape action/content remain readable (0.85), with the decorative symbol and top close control outside the displayed scroll position. The visible “Keep the heat for later” action still provides exit; no claim is made that the top close button is visible in that landscape frame.

**Focused restoration presentation requires one bounded ambient-actor cleanup before final acceptance.** `archive-open.png` places a large Snow Hare in front of the hearth behind/above the table (readability 0.75). `moonwell-live-melt.png`, at recorded progress 0.768, places the same type of white actor over the shrinking ice, visually confusing the thermal effect (0.78). Extend the existing construction actor exclusion to open Archive inspection and active Moonwell thaw, then recapture those focused states. The landmarks themselves have no new geometry/contact failure. Archive closed/reclosed both score 0.88 and demonstrate enclosure restoration.

Earlier clean-room geometry acceptance remains valid; these final integrated frames cannot certify unobstructed hearth/thaw visibility. The WebM has not been independently played, so this supplement approves observed states and records the obstruction without claiming continuous timing or smoothness.
