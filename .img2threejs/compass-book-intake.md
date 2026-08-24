# Compass Book 3D intake

## Reference set

- `docs/gauntlets/evidence/compass-book-3d-reference-v1/01-closed-cover.jpg` — primary physical-object reference.
- `02-reading-spread.jpg`, `03-living-wheel-answer-mode.jpg`, and `04-page-turn-quest-ledger.jpg` — approved assembly/state references.
- The images are concept targets. Their rendered words and example numbers are not product data and must not be reproduced as runtime content.

## Bottom-up image analysis

1. **Identification:** high-confidence stylized, hard-surface, articulated field-book prop. Primary domain: object. It is a compound layered shell with a hinged cover, page block, tabs, binding hardware, clasp, bookmark, and relief ornament.
2. **Overall form:** a vertically proportioned rounded cuboid, approximately 0.68 width to 1 height in the closed view. The book is mostly bilaterally regular across its front plane but asymmetric at the spine, fore-edge tabs, clasp, and bookmark. Open references establish real thickness and page curvature rather than a planar card.
3. **Macro components:** back cover/base, front cover, spine, page block, articulated page leaves, fore-edge tab rail, clasp, bookmark, and compass-relief assembly.
4. **Meso components:** leather cover panels and inset border, four corner guards per face where visible, three raised spine bands, layered page signatures, seven destination tabs plus Quest Ledger tab, hinge barrels/knuckles, clasp plate, compass rings, star/needle layers, and cover tooling.
5. **Micro systems:** rivets/fasteners, fine gilt lines, leather grain, page-edge irregularity, shallow corner engraving, small star studs, roughness variation, recessed seams, and selective violet emissive accents.
6. **Spatial relationships:** the covers sandwich the page block; the front cover rotates around the spine hinge; the page leaves rotate around a nearby gutter pivot; tabs embed in the fore-edge page block; guards overlap cover corners; raised compass pieces embed in or sit proud of the front cover; the clasp overlaps the fore-edge; the bookmark emerges from the bottom gutter.
7. **Materials:** dark indigo-black leather is dielectric, satin-to-matte, with fine normal relief and edge wear; warm gilt components are metallic with mixed polished edges and rougher recessed areas; parchment is warm low-saturation dielectric with high roughness and subtle fiber/foxing variation; violet enamel/crystal accents are glossy with controlled emissive response. Lighting highlights are not albedo.
8. **Identity features:** oversized layered violet-and-gold compass rose, indigo leather, warm brass corner hardware, thick parchment block, Roman-numeral fore-edge tabs, Quest Ledger destination, clasp, and purple bookmark. Runtime DOM supplies all readable words and values; 3D identity must not depend on text textures.
9. **Uncertainty:** exact hidden back-cover tooling, hinge mechanics, page-signature count, fastener count, and underside detail are partly occluded. Open-state references resolve volume and articulation but are not orthographic. These areas may be stylized consistently; no manufacturing-grade claim is made.

## Suitability verdict

**Pass.** The primary reference has one obvious object, strong silhouette, visible material families, and enough complementary open views to infer the assembly. The object is appropriate for a procedural, real-time reconstruction. Exact ornamental micro-engraving and hidden mechanics remain approximate, but neither blocks the production visual target.

## Complexity and fidelity contract

Classification: **complex**—multiple articulated macro parts, deep hierarchy, repeated pages/tabs/fasteners, several material layers, and dense local relief. Definition of done is a recognizable living Compass Book at phone scale with correct macro proportions, convincing depth from multiple angles, a real cover/page rig, direct chapter hit meshes, distinguishable leather/brass/parchment/violet response, low-quality degradation, named clickable/explodable parts, and an accessible DOM fallback.

Minimum identity inventory:

- 8 macro systems: front cover, back/base, spine, page block, page leaves, tab rail, clasp, bookmark.
- 10 meso systems: cover panel, border/tooling, corner hardware, spine bands, page signatures, seven chapter destinations plus ledger, compass rings, compass star/needle, hinge, clasp plate.
- 12 micro/local features: fasteners, corner engraving, leather grain, page-edge variation, gilt seams, star studs, cover bevels, page curl, gutter shadow, roughness variation, edge wear, violet emission.
- Required review views: closed front three-quarter, closed opposing angle, open Reading, open representative chapter, page turn, phone portrait, and low-quality/fallback comparison.

Blocking failures: planar/cardboard book, fused or inert assembly, unreadable silhouette on phone, false/invented product content, tabs not mapped to canonical page IDs, canvas blocks the DOM, missing WebGL fallback, no reduced-motion behavior, or quality tiers that do not materially differ.
