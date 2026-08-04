# Island 001 — First Light Kingdom asset tracker

Production identity: `first-light-kingdom`

The final island number is now **001**. The former Island 001 artwork has been
preserved under the Island 006 runtime folder.

| # | Runtime asset | State | Notes |
| --- | --- | --- | --- |
| 1 | `background/ambient-background.webp` | Complete, wired, phone-QA | 1400 × 1600 opaque WebP, 179 KB |
| 2 | `board/board-plate.webp` | Complete, wired, phone-QA | 1400 × 1400 transparent WebP; detailed organic cliff/terrain only, with no baked route or landmark plots |
| 2a | `landmarks/shared/landmark-plot.webp` | Complete, wired, phone-QA | 800 × 800 transparent WebP; persistent satellite terrain plot reused at four fixed anchors |
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
| 17 | `scenery/first-light-sun-court.webp` | Complete, wired, phone-QA | 1024 × 768 transparent WebP, 83 KB; low compass dais, no tower silhouette |
| 18 | `/assets/island_caretakers/001/first-light-caretaker.webp` | Complete, wired, phone-QA | 768 × 768 transparent WebP, 86 KB; non-humanoid Luma compass spirit |

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

Earlier drafts were rejected because generated rings and platforms competed
with the live route and produced small symmetry errors. The selected plate is
terrain only. The exact route foundation and concentric arena are code-owned
and derived from the live tile anchors. Four equal satellite plots are separate
runtime assets, so their protected centers remain fixed even when the island
silhouette changes.

The original lower cliff touched the 1400 px canvas boundary across more than
one thousand pixels, which rendered as a straight horizontal cut on phones.
An ImageGen outpaint was used to establish the intended tapered floating-island
silhouette, but was not selected because it altered the camera-locked
foundations. The production v4 instead preserves every original pixel above the
lower cliff and applies an irregular, feathered alpha termination only to the
bottom edge. It retains the exact board geometry while leaving transparent air
beneath the final rock and waterfall tips.

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

The production manifest uses one fixed 350 × 350 terrain plot and one fixed
bottom-anchored 280 × 280 building placement per landmark. Only the building
image scale changes between levels:

- **Hatchery L1–L3 — 0.93 / 0.94 / 0.95.**
- **Habit L1–L3 — 0.84 / 0.85 / 0.86** for its wider canopy.
- **Mystery L1–L3 — 0.93 / 0.94 / 0.95.**
- **Wisdom L1–L3 — 0.93 / 0.94 / 0.95.**

The fixed plot centers in 1400 × 1600 scene space are rear-left `(175, 320)`,
rear-right `(1225, 320)`, front-right `(1225, 1280)`, and front-left
`(175, 1280)`. Buildings use the same X centers and Y centers of `210` or
`1170`, which preserves their base contact while keeping the largest L3
silhouettes outside the central route's protected visibility gutter. The asset
validator enforces this clearance for every future manifest.

Saved 390 × 844 evidence:

- `qa/390x844/l3/island-001-all-l3-clean.png` — all four L3 buildings together,
  clean-art mode, no route collision.
- `qa/390x844/focus/hatchery-after-close.png`
- `qa/390x844/focus/habit-after-close.png`
- `qa/390x844/focus/event-arena-after-close.png`
- `qa/390x844/focus/wisdom-after-close.png`
- `qa/390x844/focus/roll-resumes-board-follow.png`

The focus camera uses the plot geometry, a horizontal safe inset, and an extra
lift for front plots. A camera-bound ambient fill prevents finite transparent
art canvases from exposing the app shell during a close-up.

## Assets 17–18 — center court and Luma guide

The first center-court draft included a tall dark gate that read as a fifth
building between the two rear landmarks at phone scale. It was replaced with a
low ivory, sapphire, and gold compass dais. The live boss remains the only
dominant object in the arena.

The old caretaker's oversized navy wizard hat created the same false-building
silhouette. A humanoid replacement draft was rejected as too youthful and
character-led. The selected Luma treatment is instead a compact, non-humanoid
floating compass spirit with a square silhouette and no face. It preserves the
existing caretaker interaction while reading as a magical affordance at
390 × 844. Both assets were generated against the approved First Light world
reference on uniform magenta, converted locally to alpha, and compressed to
transparent WebP.
