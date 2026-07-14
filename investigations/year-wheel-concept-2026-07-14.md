# Year Wheel — concept & design notes (2026-07-14)

A new **Today tab** feature. Two graphics of the same object at two sizes:

1. a large, interactive full-screen wheel, and
2. a tiny badge that **merges with the existing Today's Wins stars**.

Prototype: [`prototypes/year-wheel/`](../prototypes/year-wheel/) (self-contained HTML).

---

## The idea

Think **Apple Activity rings, but for the year.** Several "calendars" run at
once as concentric rings — e.g. Work · Body · Creative — each carved into its
own **periods** ("Build", "Peak", "Rest", …). They all share one clock face,
and a single **"today" hand** sweeps across every ring, so a glance tells you
where each calendar is right now.

This is a different axis from the existing **Life Wheel** (the 8-area radar
check-in, which answers "how balanced am I *now*"). The Year Wheel answers
"what's the *shape* of my year, and where am I in it." Naming should keep the
two distinct (candidates: Year Rings, Year Map, Chapters).

## The two graphics

### 1. Full-screen wheel (center modal)
- N concentric rings, one per calendar; each ring segmented into that
  calendar's colored periods.
- One "today" hand across all rings + month ticks around the rim.
- Side panel doubles as the legend: one row per calendar showing its current
  period and days left. Hovering a ring highlights its row and vice-versa.
- The Today's Wins star ribbon sits in the panel.

### 2. Tiny badge (replaces the zero-state achievement circle)
- The same nested rings, miniaturised, + a "today" dot.
- The 1–3 Today's Wins stars ride an **arc hugging the bottom** of the disc.
- **No new star logic** — reuses `getTodayWinsTier` (0–3 at score 0 / >0 / 40 / 75).

## Sizing (measured against current app CSS)

Current badge, from `src/index.css`:

| Element (today) | Size |
| --- | --- |
| Zero-state circle `.habit-checklist-card__progress--top-badge` | **44×44 px** (36px ring inside) |
| Base `.habit-checklist-card__progress` | 34×34 px |
| Star glyph `.habit-checklist-card__today-wins-star` | `clamp(1.15rem, 5vw, 2rem)` ≈ up to 32px; floating cluster, no fixed box |

**Recommendation: grow the badge to ~2× (~80px), not 3–4×.**
- This is a **legibility floor**: 3 rings need ~9px band each to show period
  segments. At the old 44px each ring is ~4px and unreadable. ~80px → ~9–10px
  bands. So the upsize is required by the ring content, not stylistic.
- 3×/4× (≈132–176px) would dominate a phone card — reserve that scale for the
  full-screen modal (the reason there are two sizes at all).
- **Stars change role and shrink.** Today the stars *are* the badge. In the
  merge the rings become the badge and stars demote to ~14–16px marks on the
  rim (down from ~32px hero glyphs).
- **Placement TBD:** the current badge floats centered on the card's top edge
  (`translate(-50%,-48%)`). Keeping it floating vs. giving it its own row
  changes how large it can grow without crowding the checklist.

## Sequence (badge → modals)

The badge, the star-upgrade moment, and the wheel modal take turns:

- **Normal day:** Today's Wins → Year Wheel.
- **New-star day:** the star-upgrade celebration is promoted **first**, then
  the Year Wheel. (Instinct: **Star → Wheel**, never three modals deep.
  Alternative kept on the table: Wins → Star → Wheel.)

## Open decisions

1. **Who defines the calendars/rings?** Fixed set (like Apple's
   Move/Exercise/Stand) vs. user-defined tracks they name + color. Drives the
   whole creation/onboarding flow.
2. **How many rings max?** 3 looks like the sweet spot, 4 the phone ceiling.
   If more, outer rings = higher-priority calendars.
3. **Period labels on the arcs**, or color + side-panel legend only?
4. **Creation path default:** template-first, AI-assisted (short life
   description → drafted rings), or manual.
5. **Prescriptive plan vs. reflective lens** — sets the tone.
6. **Naming** to avoid collision with the existing Life Wheel.
7. **Lifestyle fit:** rhythm templates seeded from a couple of onboarding
   answers + locale (hemisphere, culture) so student / freelancer / parent /
   shift-worker / faith-led / Southern-Hemisphere years all produce sensible
   rings. Empty state must never be blank.

## Not in scope yet

No data model, persistence, or component wiring. This captures the concept and
the sizing/sequence decisions ahead of implementation.
