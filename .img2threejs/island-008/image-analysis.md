# Island 008 — Everblossom Kingdom image analysis

Reference: `docs/visual-references/island-008-flower-kingdom/island-008-flower-kingdom-goal-v1.png`

Role: visual goal and inspiration for a real-time browser island. The reference is not runtime art and its approximate route geometry is not gameplay authority.

## Suitability

Verdict: **conditional pass for a stylized procedural reconstruction**.

The overview has a strong front three-quarter silhouette, readable macro architecture, distinct material families, and enough visible attachment evidence for a phone-scale world. It is a scene rather than a single isolated object, and the rear, underside, hidden interiors, glass thickness, water flow sources, and most root junctions are occluded. Exact geometry, caustics, botanical anatomy, and unseen construction cannot be recovered from one image. Those regions will be authored as coherent procedural approximations and judged from overview plus left/right orbit views.

## Layer 1 — identification and classification

- Primary type: floating botanical-architectural island world.
- Primary domain: `object` (compound environment), confidence 0.98.
- Form language: architectural + botanical-like + organic terrain.
- Structure kind: branching hierarchy with layered shells, repeated modules, and five independent landmark assemblies.
- Motion potential: static world structure with articulated flower crowns, sway pivots, water/pollen/petal effect emitters, and independently animated butterfly layers.
- Material families: ivory stone, antique gold, emerald/turquoise glass, leaf/bark/root, flower petals, water, and planted groundcover.

## Layer 2 — overall form and silhouette

- The island is an asymmetric terraced root-and-stone mass within an approximately circular footprint.
- A broad annular route wraps a tall central vertical landmark; four satellite landmark terraces project outside the route.
- The central citadel is the dominant bounding volume, approximately 2.0–2.5 times the height of the satellite landmarks in the shown view.
- The five landmark silhouettes are observably distinct: tall tapered glasshouse, open radial pavilion, broad low leaf shell, faceted orchid-glass cluster, and multi-tier vertical lotus citadel.
- The image uses a high oblique perspective with the north/rear receding upward; HabitGame's shared locked camera remains authoritative for the implementation.

## Layer 3 — macro, meso, micro decomposition

### Macro assemblies

1. Living island root/stone foundation with terraced satellite plots.
2. Canonical annular gameplay route context (implemented by the existing real 36-tile system, never copied from the image).
3. Tulip Glasshouse Hatchery.
4. Sunflower Rhythm Pavilion.
5. Leafroof Garden Hall.
6. Orchid Crystal Archive.
7. Central Blossom Crown Citadel.
8. Distant valley/water backdrop and atmosphere.

### Meso assemblies

- Foundation: central soil/stone plate, four overlapping plot terraces, root arches, planted ledges, spring channels, waterfall lips, underside rock/root clusters.
- Hatchery: tulip-petal base, pointed arched entrance, emerald glass egg conservatory, antique-gold ribs, nest chamber, crown finial.
- Habit: circular activity floor, open colonnade, radial sunflower petal crown, sundial hub, accessible entrance stair.
- Mystery: low rooted hall, broad leaf roof with central vein and secondary veins, arched openings, spring ledge, planted base.
- Wisdom: faceted botanical-glass reading room, orchid petal buttresses, crystal spires, visible shelf/display masses, entrance stair.
- Citadel: garden keep base, stacked petal balconies, alternating vertical window bays, vine/root columns, upper bloom tower, monumental open lotus crown, central doorway.

### Micro/repeated systems

- Radial petal rings with deterministic size/rotation variation.
- Gold window/greenhouse ribs and pointed-arch tracery.
- Vine and root curve sweeps attached at terraces and facade sockets.
- Batched flower beds and leaf clusters outside the protected route corridor.
- Waterfall ribbons, foam, water sparkle, pollen, drifting petals, and butterfly instances.
- Fine tile joints and side-wall contrast remain owned by the shared canonical renderer.

## Layer 4 — spatial relationships and attachments

- `<central-citadel, embedded-in, central-garden-terrace>` using an overlap contact with a visible stair/door transition.
- `<route, surrounds, central-citadel>` with a protected clear corridor and no facade or foliage intrusion.
- `<satellite-plots, overlap, central-foundation>` through stone/root bridges; they are not floating independent discs.
- `<landmarks, embedded-in, satellite-plots>` with stairs and planted foundation rings grounding each entrance.
- `<petal-crowns, socketed-above, landmark-cores>` with radial petal roots intersecting the crown ring.
- `<glass-panels, inside, gold-rib-frames>` as conforming shells rather than free-floating panes.
- `<roots, attached-to, terrace-and-underside-sockets>` as curve sweeps with embedded endpoints.
- `<waterfalls, descend-from, spring-channel-lips>` and terminate in foam near the turquoise water plane.

## Layer 5 — materials and PBR observations

- Ivory stone: warm light albedo, dielectric, roughness approximately 0.55–0.72, small bevel highlights, cavity-darkened joints.
- Antique gold: metallic response, warm yellow-orange albedo, roughness approximately 0.24–0.38, restrained edge highlights rather than mirror polish.
- Emerald/turquoise glass: tinted dielectric, low roughness approximately 0.08–0.18, moderate transmission/opacity chosen per quality tier; gold frames provide phone-readable structure.
- Petals: dielectric satin surface, roughness approximately 0.38–0.58, coral/rose/orchid/gold albedo families, lighter edge/rim variation, opaque or lightly translucent rather than expensive full transmission.
- Leaves: matte-to-satin dielectric, roughness approximately 0.58–0.78, emerald/olive variation and geometry-level central veins on hero leaves.
- Roots/bark: rough dielectric, roughness approximately 0.72–0.9, warm brown/olive albedo with vertical ridges and cavity darkening.
- Water: transparent turquoise surface with controlled opacity, soft specular response, and low-cost foam planes/ribbons; exact caustics are not inferable or required.

## Layer 6 — color and finish

- Dominant mid/high-value emerald foliage and turquoise water/glass.
- Warm ivory stone establishes the quiet route and architectural base.
- Coral-pink lotus/tulip petals dominate the central and Hatchery identity.
- Sunflower gold is isolated to the open Habit crown.
- Orchid violet and cool blue-violet glass isolate Wisdom.
- Antique gold is a restrained unifying trim, frame, joint, and finial system.
- Key light is warm from upper/front-left; fill is cool turquoise/sky; shadows remain open enough for phone scale.

## Layer 7 — identity-defining features

1. Real 36 clean wedge tiles forming one readable annular route.
2. Multi-tier central lotus citadel whose flowers are structural balconies/crowns, not decorative props.
3. Hatchery's tall egg-like emerald glass volume enclosed by upward tulip petals.
4. Habit's open circular sunflower crown with visible radial activity/sundial floor.
5. Mystery's single broad leaf roof with legible central/secondary veins.
6. Wisdom's orchid petals framing a faceted violet/turquoise crystal conservatory.
7. Root arches and small waterfalls visibly support/connect the island terraces.
8. Five clear arched entrances with stairs and unobstructed approach reads.
9. Golden daylight, turquoise water, and lush valley depth.
10. Multiple depth layers of botanical life: planted beds, hero flowers, petals/pollen, butterflies.

## Layer 8 — uncertainty and single-image limits

- Rear facades and rear entrances are hidden; they will use lower-detail coherent continuation rather than claimed reference accuracy.
- The underside root/stone network is only partially visible and will be inferred from front root arches.
- The exact number and course of springs/waterfalls is undetermined.
- Glass wall thickness, interior shelves, and internal circulation are ambiguous at this distance.
- Small plant species and flower anatomy are not reliably identifiable; procedural families will preserve color/scale distribution rather than exact botany.
- The image's route has an approximate segment count and different spacing; it is explicitly rejected as geometry evidence.
- Perspective differs from the production locked camera; composition must be solved against the shared phone camera, not copied pixel-for-pixel.
- Orbit views cannot be compared to hidden reference sides; their gate is self-consistency, attachment, volume, route clearance, and silhouette distinction.
