# Living Horizon relief — image analysis

Reference: `docs/gauntlets/evidence/compass-book-inner-goals-2026-08-20/24-wide-chapter-3-goal.png`

## 1. Identification and classification

- Target object: a stylized architectural-landscape bas-relief mounted on the inside page of an open field book.
- Broad class: compound hard-surface/sculptural game prop with architectural and terrain subassemblies.
- Primary domain: `object`.
- Confidence: 0.97 for the visible front/three-quarter identity; 0.62 for hidden underside construction.
- Intended use: presentation-only real-time browser prop, sharing the production Compass Book page transform and page-selection system.

## 2. Overall form and silhouette

- Bounding form: a portrait rounded-rectangle relief approximately 0.72 page-width by 0.78 page-depth, contained by a raised brass frame.
- The visible volume is shallow: layered extruded contours rise from a flat parchment carrier, while small buildings, trees, gate posts and the gathering arena create the highest interruptions.
- Approximate bilateral balance around a central S-curve path, but intentionally asymmetric zone placement.
- The silhouette must remain an attached low bas-relief; it must not read as a free-standing island or deep diorama.

## 3. Macro → meso → micro decomposition

Macro assemblies:

1. parchment contact plate and raised brass boundary;
2. stepped terrain field with teal inlet;
3. continuous violet-and-gold path from foreground to horizon;
4. sanctuary zone in the foreground;
5. workshop zone in the middle-left;
6. circular gathering zone in the middle-right;
7. horizon gate, sun and sky rays at the upper edge.

Meso assemblies:

- Sanctuary: cottage body, pitched roof, doorway/light, jetty and water contact.
- Workshop: main hall, secondary roof/chimney, wheel or gear medallion, entry steps.
- Gathering: circular stepped arena, low perimeter seating, four posts, central hearth.
- Vital path: continuous S-curve core, two gilt rails, repeated inset milestones.
- Horizon: paired gate leaves/posts, rising sun disk, radial rays, layered ridge silhouettes.
- Terrain: three to four contour terraces and distributed conifer/rock clusters.

Micro groups:

- brass fasteners/studs at zone anchors;
- repeated path milestones;
- roof ridge and window accents;
- restrained tree/rock clusters;
- gate lattice and sun-ray spokes;
- enamel water and sky bands;
- bevel/contact-shadow bands separating the relief from parchment.

## 4. Spatial relationships

- `<contact plate, flush-with, left parchment page>` using overlap contact and a shallow embedded shadow plate.
- `<terrain contours, stacked-on, contact plate>` with increasing height toward meso structures.
- `<path, embedded-in, terrain contours>` while its gilt rails overlap terrain edges enough to avoid gaps.
- `<sanctuary, attached-to, foreground terrain>` and `<jetty, overlaps, water inlet>`.
- `<workshop, socketed-on, middle-left terrace>` with steps overlapping the path edge.
- `<gathering arena, embedded-in, middle-right terrace>` and hearth centered inside the seating ring.
- `<gate posts, socketed-on, horizon terrace>`; gate leaves rotate from those posts but remain static in production unless a later presentation animation is approved.
- `<sun disk, behind, gate leaves>` and `<rays, attached-to, horizon backing>`.

## 5. Materials and surface

- Boundary, path rails, gate and architectural trim: metalness 0.78–0.9, roughness 0.26–0.42, antique-gold albedo with darker recess response.
- Terrain: dielectric matte olive/forest enamel-stone, roughness 0.62–0.78, shallow paper bump reused only as independent bump evidence—not as albedo.
- Path core: violet enamel, metalness 0.05, roughness 0.3–0.42, clearcoat 0.45–0.62.
- Water and sky: teal/indigo enamel, metalness 0.03, roughness 0.25–0.4, restrained clearcoat; fully opaque in the runtime relief.
- Timber/roof accents: dark teal and warm brown dielectric, roughness 0.52–0.7.
- Sun/hearth: amber emissive accents with bounded intensity; real directional/page lighting remains the primary form light.

## 6. Color and finish

- Parchment carrier: warm light ivory, high value, low saturation, matte.
- Brass: warm amber-gold, middle/high value, satin metallic with darker brown-gold recesses.
- Terrain: dark desaturated green with olive contour tops.
- Water: medium teal, satin/gloss enamel.
- Path: medium violet core with warm gold rails.
- Sky: desaturated indigo/blue enamel transitioning toward amber at the horizon.
- Finish is crafted collectible cartography: raised satin metal plus inset enamel, not a painted landscape texture.

## 7. Identity-defining features

Critical:

1. one uninterrupted S-curve path connects foreground, sanctuary/workshop/gathering zones and the open horizon gate;
2. paired open gilt gate leaves frame a rising amber sun;
3. sanctuary cottage touches a readable teal inlet;
4. workshop and circular gathering arena remain distinct at phone scale;
5. layered terrain contours clearly rise from the parchment rather than floating;
6. the whole relief stays inside a page-bound brass frame and shares the established Compass Book material language.

Important:

- violet path milestones;
- radial horizon rays;
- central gathering hearth;
- workshop wheel/gear accent;
- sparse tree/rock rhythm supporting depth without clutter.

## 8. Uncertainty and single-image limits

- The reference is an ImageGen art-direction image, not a measured object; all dimensions are proportional approximations.
- Hidden undersides, back faces and exact attachment depths are not shown. Production will infer shallow embedded contacts appropriate to a page relief.
- Architectural micro-detail is denser than the runtime budget and will be simplified deliberately.
- The screenshot implies many trees and stones; the production contract needs only sparse repeated clusters that preserve depth and zone separation.
- Exact gate lattice, roof joinery and masonry patterns are non-critical and may be stylized.
- Generated lighting and shadows are not albedo evidence. Runtime PBR uses the book's existing real lights and independent material channels.

## Production reduction

The reference is an art-direction ceiling. Production fidelity is judged on the continuous path, five canonical zones, horizon gate/sun, layered shallow volume, page attachment and established brass/enamel material response—not on matching every generated tree, rock or building ornament.
