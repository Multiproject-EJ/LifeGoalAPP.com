# Island 001 — First Light Kingdom asset tracker

Production identity: `first-light-kingdom`

The final island number is now **001**. The former Island 001 artwork has been
preserved under the Island 006 runtime folder.

| # | Runtime asset | State | Notes |
| --- | --- | --- | --- |
| 1 | `background/ambient-background.webp` | Complete, wired, phone-QA | 1400 × 1600 opaque WebP, 179 KB |
| 2 | `board/board-plate.webp` | Complete, wired, phone-QA | 1400 × 1400 transparent WebP, 283 KB |
| 3 | `landmarks/hatchery/hatchery-l1.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 75 KB |
| 4 | `landmarks/hatchery/hatchery-l2.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 132 KB |
| 5 | `landmarks/hatchery/hatchery-l3.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 191 KB |
| 6 | `landmarks/habit/habit-l1.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 157 KB |
| 7 | `landmarks/habit/habit-l2.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 179 KB |
| 8 | `landmarks/habit/habit-l3.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 297 KB |
| 9 | `landmarks/mystery/mystery-l1.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 117 KB |
| 10 | `landmarks/mystery/mystery-l2.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 152 KB |
| 11 | `landmarks/mystery/mystery-l3.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 271 KB |
| 12 | `landmarks/wisdom/wisdom-l1.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 100 KB |
| 13 | `landmarks/wisdom/wisdom-l2.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 121 KB |
| 14 | `landmarks/wisdom/wisdom-l3.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 186 KB |
| 15 | `bosses/aureon-idle.webp` | Complete, wired, phone-QA | 1024 × 1024 transparent WebP, 155 KB |
| 16 | `bosses/aureon-defeated.webp` | Complete, wired | 1024 × 1024 transparent WebP, 131 KB; calm/restored state |
| 17 | `scenery/first-light-sun-court.webp` | Complete, wired, phone-QA | 1024 × 768 transparent WebP, 105 KB |

## Asset 1 prompt

References:

- `references/isl-001_full-world-l3_v001_selected.png` — approved world,
  atmosphere, materials, and distant-world identity.
- `references/today-launch-theme-reference.png` — launch-theme palette and
  luminous cloud-kingdom finish.

Prompt:

> Create only the ambient environment behind the playable floating island: a
> magical bright daylight sky over clear luminous turquoise-blue water and
> high soft clouds, with a few very distant small floating ivory-and-gold
> castle islands and thin waterfalls around the far upper and side edges.
> Preserve a large calm, low-detail central play window so the separately
> rendered board, runtime tile ring, buildings, pawn, labels, and HUD remain
> highly readable. Use a portrait mobile-game composition and a polished
> premium stylized 3D finish. No foreground island plate, route, tiles,
> characters, UI, text, numbers, logos, watermark, dark palette, or heavy
> central fog.

Generation mode: built-in OpenAI ImageGen. The selected PNG master is stored at
`masters/background/isl-001_background-ambient_v001_selected.png`; the runtime
copy is an optimized WebP.

## Asset 2 prompt and correction

The board plate used the camera-locked template as the immutable geometry
reference and the selected world concept as its material reference. It was
generated on a uniform magenta chroma key and converted locally to alpha.

The first draft was rejected because it included a decorative segmented ring
beneath the live route. In version 2 that ring was replaced with quiet,
continuous pale lawn and ivory gravel. The four equal satellite foundations
and central arena foundation remain empty for separate runtime assets.

The optimized board plate and the full final-angle landmark set were switched
into the manifest atomically after mobile QA. The runtime crop is 1400 × 1400,
which maps without a second perspective correction into the live board stage.

## Assets 3–5 — Celestial Hatchery Palace

The L3 palace was generated first as the definitive family identity, using the
selected full-world concept and the board plate camera as references. L2 and L1
were then derived from that identity:

- **L1:** compact royal hatchery, one egg, one navy dome, limited glow.
- **L2:** operational palace, two eggs, taller central dome, stronger wings.
- **L3:** restored landmark, four eggs, crowned central tower, full ceremonial
  silhouette.

All three preserve the doorway, central axis, opal egg material, ivory/navy/gold
palette, bottom anchor, camera, and upper-left light. They were generated on a
uniform magenta chroma key, converted locally to alpha, then compressed to
transparent WebP.

## Fixed-plot phone QA

The production manifest uses one fixed anchor and footprint per landmark. Only
the image scale changes:

- **L1 — 0.50:** readable on a 390 × 844 viewport while leaving clear plot space.
- **L2 — 0.75:** visibly operational and fills most of the plot.
- **L3 — 0.95:** majestic, reaches the plot boundary, and stays clear of the
  neighbouring route and HUD.

The two lower landmarks use a perspective-corrected scene Y anchor of 1040.
This was measured on the real Island Run renderer; retaining the old
mathematically mirrored Y anchor placed their bases on the cliff face.
