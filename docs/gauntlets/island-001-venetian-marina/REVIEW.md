# Island 001 Venetian marina — local implementation review

The approved two-band market is implemented on
`codex/island-001-venetian-marina-20260930`, based on `680e0b09`.
It extends the actual Assembly marina factory used by the game.

## Result

- The first berth moved from radius 13.8 to 24.2, freeing the inner two berth
  pitches for a market spanning radius 10–20.8. All 220 berths, 50 design
  families, and the spacecraft/yacht mix remain.
- Five open canal slots and five ivory stepped arch bridges connect the teak
  promenade. Stone balustrades and brass edge rails stop at the entrances.
- Ten navy/ivory awning stalls have coffee, bakery, food, drink and spacecraft
  exhibitor displays and signs. Ten café tables seat twenty visitors. Thirty
  planted containers, twenty warm lanterns and quality-scaled guests furnish
  the ring without blocking the ten radial arrival aisles.
- High adds 52 market people (22 walking); Medium 46 (16 walking); Low 25
  (10 walking). Reduced motion freezes the new ambient walkers.
- The first ship lands at the new berth. Its Aurelian delegation exits only
  after the boarding ramp deploys, crosses the first market bridge, then
  follows the inner ring through the actual waterfall doorway to its seats.
  Landing and tracking cameras follow the moved ship and the new route.
- The 48-second film, later fleet arrivals, entry-aware waterfall closure,
  meeting release, replay and rewind remain connected to the original runtime.

## Visual review

The approved source is the concept in
`../../visual-references/island-001-venetian-marina-20260930/001-source.png`.
The implementation retains the existing game's procedural material and
character style. The concept's impossible stair dead ends are replaced by
connected bridge landings. Walkways are intentionally clearer and planting
less dense than the generated concept, to preserve circulation and the
incremental geometry budget.

The screenshots are actual Chrome renders of the updated model, captured
through CUA. Desktop overview, café, bridge approach, bridge side, first
landing, disembarkation, bridge crossing, portrait overview, portrait
passengers, and completed Assembly are in `evidence/`.

The live replay reached 216/216 docked and 207/207 seated, displayed the
existing mandate prompt, then reopened the entrance on completion. The
prompt was dismissed without signing. No browser console errors were
recorded for that run. The portrait checks used a measured 390×844 CSS
viewport and Low quality; this is desktop browser emulation, not a device
performance test. The viewport override was reset afterward.

## Verification

- `node scripts/check-island001-marina-market.mjs`: passed at Low, Medium,
  High. Casts rays onto actual stair geometry to verify foot heights, checks
  the canals remain holes, checks all market loops and delegate paths clear
  kiosks/cafés/planters, checks ramp timing, full seating, rewind, walking,
  frozen clocks, and the actual reduced-motion media preference.
- `node scripts/check-island001-v2-runtime.mjs`: passed. Covers waterfall
  startup, entry/restart, actual doorway clearance, construction/replay/reset,
  late completion, same-sequence updates, and existing reduced-motion snaps.
- `node scripts/check-island-run-architecture-guards.mjs`: passed, zero
  violations; three existing allowlisted warnings.
- Full `tsc -b --pretty false`: passed. Final application typecheck is also
  recorded in `evidence/validation.json`.
- `vite build`: passed, with the repository's existing large-chunk warnings.
- `git diff --check`: passed.

## Cost and remaining limits

| Quality | Added batches | Added triangles | Market people |
| --- | ---: | ---: | ---: |
| Low | 14 | 37,778 | 25 |
| Medium | 14 | 43,688 | 46 |
| High | 14 | 44,828 | 52 |

The added market stays inside the planned incremental budget of 15 batches / 45k
triangles. Before camera and shadow passes, High marina geometry increases
from 1,270,194 to 1,315,022 submitted triangles (+3.5%), and mesh batches from
86 to 100. `evidence/baseline-comparison.json` records every quality tier.

The existing full scene substantially exceeds the older global 175 draw /
180k triangle target before this work. That performance debt is not fixed by
this visual upgrade. No physical-device FPS, thermal or memory acceptance is
claimed. Nothing has been merged, deployed or installed on a device.

## Review locally

Run Vite from this worktree, then open
`/island001-assembly-review.html?mode=marina&marketView=overview`.
Use Play arrival for the complete film and Build tools for market, bridge,
arch and café cameras. `clean=1` hides review controls for screenshots;
`metrics=1` shows renderer counts. All these controls are developer review
presentation only.
