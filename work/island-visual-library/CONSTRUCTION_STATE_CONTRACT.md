# Landmark Construction-State Contract

This contract defines the reusable visual standard for every buildable landmark.
It is both a generation brief and the acceptance test after generation.

All states must also pass the Fit, Terrain, and Embedding rules in
`ISLAND_FTE_PRODUCTION_STANDARD.md`.

## Non-negotiable continuity rules

Every level is the **same landmark on the same fixed plot**:

- Same isometric camera, perspective, lighting direction, entrance orientation,
  foundation shape, horizontal center, and bottom anchor.
- L1, L2, and L3 use the full final plot. The landmark must never look like a
  small building that is later replaced by a larger one.
- The future L3 silhouette must already be readable in the L1 structural frame.
- The visual progression is construction completion, not image scaling.
- Signature features, materials, and architecture stay consistent across all
  levels.
- No characters, UI, labels, plot circle, island terrain, or unrelated props.
- Production cutouts have a clean transparent boundary and no detached shadow.

### Alignment tolerance

- Bottom anchor: within 2% of canvas height across L1/L2/L3.
- Horizontal center: within 2% of canvas width.
- Finished foundation width: within 6% across L1/L2/L3.
- Camera/perspective mismatch, mirrored entrances, or a changed foundation are
  automatic rejection conditions.

## Level definitions

### Level 0 — prepared plot

The plot is ready, but the landmark has not started:

- Foundation marker, survey lines, or a restrained magical blueprint may exist.
- No usable room, finished tower, mature tree, or complete signature feature.
- The full future footprint is legible without showing a miniature building.

### Level 1 — full-footprint structural build (25–35%)

The entire future landmark is under active construction:

- Complete foundation and entrance stairs cover the final L3 footprint.
- Structural frames and scaffolding trace the full future silhouette.
- Ground-floor arches, columns, or a few lower wall sections are finished.
- Most upper walls, roofs, domes, and decorative surfaces remain incomplete.
- Signature identity appears as an early structural or magical core, not a
  completed ornament.
- Construction language is dominant: scaffolding, ladders, hoists, beams, stone
  stacks, and plans.

L1 must read as “the full palace is being built,” never “a tiny first palace.”

### Level 2 — recognizable landmark nearing completion (65–75%)

The landmark is already functional and unmistakable:

- Foundation, entrance, lower floors, and most primary volumes are finished.
- At least one signature feature is installed and visually strong.
- Upper roofs, secondary towers, crown elements, or one signature component
  remain under construction.
- Scaffolding is substantial but no longer visually dominant.
- Materials are tidier and fewer than L1.
- The L3 silhouette is almost complete, with deliberate unfinished areas that
  clearly justify one final upgrade.

L2 must not look like L3 with a random ladder added, and must not look almost as
unfinished as L1.

### Level 3 — completed prestige hero landmark (100%)

The landmark is fully finished and should deliver the strongest visual reward:

- Full foundation and every planned primary volume are complete.
- No scaffolding, cranes, ladders, loose stone, timber stacks, crates, or
  construction plans remain.
- Roofs, domes, towers, crown pieces, windows, gardens, and railings are complete.
- The landmark’s gameplay identity is instantly recognizable without a label.
- Materials feel premium: clean ivory stone, coherent navy surfaces, precise gold
  trim, intentional crystal light, and finished landscaping where appropriate.
- The silhouette is confident, balanced, and impressive from the live camera.
- Controlled glow, window light, sparkle, or magical energy may enhance the hero
  state, but must not obscure the architecture.
- At phone size, L3 must be the clearest and most desirable state of the sequence.

L3 is not merely “L2 without scaffolding.” It is the polished payoff: complete,
prestigious, luminous, and compositionally resolved.

## Landmark-specific signature checks

- **Hatchery:** symmetrical egg-palace; crystal eggs, central dome, round wings,
  and welcoming front stairs remain consistent.
- **Habit:** immense magical tree; crystal-blue heart/veins, circular sanctuary,
  and canopy envelope remain consistent.
- **Mystery:** celestial observatory; armillary globe, main dome, telescope
  towers, and circular research court remain consistent.
- **Wisdom:** grand library; central tower, open book, celestial crown, side
  towers, and library windows remain consistent.

## Post-generation quality gate

Inspect the image on transparency and composited into the actual island.

1. Compare L1/L2/L3 side by side at equal runtime scale.
2. Verify the fixed anchor and foundation tolerances above.
3. Verify the same architectural identity and camera across all states.
4. Verify monotonic progress: finished surfaces increase while scaffolding and
   loose materials decrease from L1 to L3.
5. Verify each state matches its completion range and is visually distinct.
6. Inspect at 100%, then at 160 px and 120 px. Signature identity must survive.
7. Inspect alpha edges over white, sky blue, navy, and magenta. Reject halos,
   chroma spill, holes, clipped roofs, or detached fragments.
8. Verify L3 has zero construction residue and is the strongest reward state.
9. Verify the live island plot is filled without collisions with paths, labels,
   neighboring landmarks, or the board edge.
10. Reject any asset that only passes as a standalone image but fails in the
    actual game camera.

## Reusable generation prompt skeleton

> Create the [LEVEL] construction state of the exact landmark in the supplied
> final reference. Preserve the exact isometric camera, full final footprint,
> foundation, entrance orientation, horizontal center, bottom anchor, materials,
> signature features, and future silhouette. This is the same full-size landmark
> at [COMPLETION RANGE], not a smaller building. Show [LEVEL-SPECIFIC FINISHED
> PARTS] and [LEVEL-SPECIFIC UNFINISHED PARTS]. Use [CONSTRUCTION AMOUNT] elegant
> scaffolding and neatly staged materials. No characters, plot circle, terrain,
> UI, text, labels, or other buildings. Isolated centered production asset,
> readable at phone size, with a clean cutout boundary.

## Animation checkpoints

Use a normalized construction value:

- `0.00`: L0
- `0.33`: L1
- `0.67`: L2
- `1.00`: L3

The runtime may stop at any value. Intermediate frames should reveal finished
surfaces upward/outward, reduce scaffolding, add roof/detail layers, and intensify
signature light continuously. A level image is a checkpoint, not a pre-rendered
video frame.
