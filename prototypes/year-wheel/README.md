# Year Wheel — concept prototype

Interactive design sketch for a new **Today tab** feature: a "Year Wheel" that
gives the year a shape, styled after Apple's Activity rings.

> Status: **brainstorm / prototype only.** No production code is wired up yet.
> This folder captures the concept so it can be reacted to and iterated on
> before implementation. Open decisions are tracked in
> [`../../investigations/year-wheel-concept-2026-07-14.md`](../../investigations/year-wheel-concept-2026-07-14.md).

## Run it

It's a single self-contained HTML file — no build, no dependencies.

```
open prototypes/year-wheel/index.html
```

## What it shows

1. **The full-screen wheel** — several calendars run at once as concentric
   rings (Work · Body · Creative), each carved into its own periods, all
   sharing one clock face. A single "today" hand sweeps across every ring.
   Hover a ring to highlight its calendar; the side panel doubles as the
   legend. A `Rings 2/3/4` control shows how it reads with more/fewer
   calendars.
2. **The tiny badge** — the merge target. The existing zero-state achievement
   circle becomes a slightly larger disc of nested mini-rings + a "today" dot,
   with the 1–3 Today's Wins stars riding an arc along the bottom.
3. **The sequence** — how the badge, the star-upgrade moment, and the wheel
   modal take turns. Tap the badge in the phone mock to see the
   Star → Wheel flow (at 2+ stars the upgrade leads).

Everything (calendar names, periods, colors, the "Recharge/Build/Peak" example
year) is placeholder content for reaction, not final art. `today` is pinned to
Jul 14, 2026 so the hand lands ~53% around.
