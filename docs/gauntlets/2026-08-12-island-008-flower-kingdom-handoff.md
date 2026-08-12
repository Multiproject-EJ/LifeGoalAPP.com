# Island 008 — Flower Kingdom handoff

Status: **direction selected; 3D implementation not started**

Island role: **ordinary island** (008 is not an every-fifth creature Arena)

Selected reference: `docs/visual-references/island-008-flower-kingdom/island-008-flower-kingdom-goal-v1.png`

## Decision

Eivind selected the attached bright botanical concept (the image itself is the
authority; prior conversational numbering was ambiguous). Island 008 should be
a joyful, sophisticated Flower Kingdom with monumental blooms, botanical glass
architecture, living root terraces, springs and butterflies.

This is a goal/inspiration image. Its approximate tile count and placement are
not authoritative. Runtime must use the real `spark36_ring` with 36 clean
wedge-shaped tiles and the shared Island Run camera/gameplay system.

## Working name

**The Everblossom Kingdom**

The name is a recommended production default and may be changed without
affecting geometry.

## Visual identity

- Mood: radiant, alive, hopeful, abundant and premium—not childish or sugary.
- Daylight: warm golden afternoon with clear turquoise water and green distant
  valley depth.
- Palette: leaf/emerald green, turquoise glass, coral-pink lotus petals,
  sunflower gold, orchid violet, ivory stone and restrained antique gold.
- Terrain: living root-and-stone island with planted ledges, small springs and
  waterfalls; asymmetric enough to feel natural while preserving the clean
  circular board composition.
- Tile palette: warm ivory stone tops, fine gold/green joints and darker root or
  stone sidewalls. Keep tile tops quiet enough for rewards and the pawn.

## Five landmark families

All names are working production names. Their functions/IDs remain canonical.

1. **Hatchery — Tulip Glasshouse Hatchery**
   - tall tulip-petal base around an emerald glass egg conservatory;
   - visible nest/egg chamber and clear arched entrance;
   - L1 planted stone nursery, L2 enclosed glasshouse, L3 crowned tulip palace.
2. **Habit — Sunflower Rhythm Pavilion**
   - open round pavilion with a large sunflower crown and readable activity
     floor; not another closed dome;
   - subtle rotating sun-dial/petal mechanism and warm habit pulse;
   - L1 garden platform, L2 working pavilion, L3 full golden flower crown.
3. **Mystery — Leafroof Garden Hall**
   - broad low silhouette beneath one sculptural leaf roof;
   - interior can host the island's rotating reflective/mystery activity;
   - L1 rooted shelter, L2 inhabited hall, L3 layered leaf canopy and springs.
4. **Wisdom — Orchid Crystal Archive**
   - violet orchid petals supporting faceted botanical glass;
   - visible shelves, charts or flower/seed knowledge displays inside;
   - L1 crystal reading room, L2 orchid archive, L3 luminous petal conservatory.
5. **Boss — Blossom Crown Citadel**
   - the tall central lotus/flower-tree palace from the selected image;
   - stacked petal balconies, green glass windows and a strong central doorway;
   - L1 finished garden keep, L2 multi-tier bloom tower, L3 monumental open
     crown. It remains a building—not an Arena.

The five silhouettes must remain distinct: tall tulip glasshouse, open round
sunflower pavilion, broad leaf hall, faceted orchid archive and vertical lotus
citadel.

## Living ambience

High-quality target:

- two or three butterfly layers with a few hero butterflies near camera;
- drifting petals and pollen motes;
- independently swaying hero flower heads plus batched garden beds;
- opening/closing or breathing flower motion kept subtle;
- visible springs and waterfall foam around the root edge;
- bees or hummingbirds as small secondary life only if budget permits;
- leaf-shadow movement and soft water sparkle;
- distant valley birds/ballooning seeds rather than another ship.

Low/Medium/High reduce counts, transparency and independent animation while
preserving the central flowers, springs and at least one readable life layer.

## Caretaker treatment

Reuse the canonical caretaker models and animations. Island 008 changes only
the outfit/material module: layered botanical silk, emerald/coral/gold palette,
small petal/seed accessories and the same emotion-capable glowing eyes. The
tiny board LOD remains tree-scale rather than building-scale.

## Avoid list

- no generic green recolour of Island 005;
- no five repeated domes or cottages;
- no mushroom/fairy village or plastic-toy look;
- no foliage, roots or flower heads covering playable tiles;
- no baked fake route, UI, labels or token in runtime art;
- no dependence on the concept image's approximate tile count;
- no excessive transparent petals that destroy mobile fill-rate;
- no one-shot implementation without map-stripped and multi-angle proof.

## Recommended first milestone

Do not detail five landmarks at once. Start with:

1. safe branch/worktree and routing scaffold for world source 8;
2. img2threejs intake/state/spec from the selected reference;
3. full island/root + real 36-tile composition blockout;
4. five unmistakably different landmark masses;
5. map-stripped phone overview and left/right orbit comparison;
6. then sculpt the central Blossom Crown Citadel as the first landmark because
   its multi-tier living architecture is the largest identity risk.

## Acceptance evidence

Use `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`. In addition, the
Flower Kingdom must prove:

- flowers read as architecture rather than props pasted onto ordinary towers;
- large botanical forms still preserve five clear entrances and L1–L3 growth;
- the ivory/gold route is clean and reward-readable in full daylight;
- butterflies, petals, swaying flowers and springs visibly move at phone scale;
- the valley/roots remain coherent in overview, left, right and rear views;
- physical iPhone Auto and forced High pass without leaving a profiler build on
  the phone.

## Exact new-chat prompt

> Begin Island 008, The Everblossom Kingdom. Work from the selected image at
> docs/visual-references/island-008-flower-kingdom/island-008-flower-kingdom-goal-v1.png.
> Read AGENTS.md, all required Island Run contracts,
> ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md and this handoff completely. Inspect
> the current branches/worktrees first and preserve Island 007 and unrelated
> user work. Create a dedicated Island 008 branch/worktree from the latest
> integrated 3D-island source. Initialize and obey the img2threejs state gate.
> First produce the real 36-tile full-island blockout with five distinct
> silhouettes and phone/left/right map-stripped proof. Then build the central
> Blossom Crown Citadel one landmark at a time through L1–L3. Do not implement
> an arena, do not copy/recolour Island 005, and do not publish or merge without
> explicit permission.
