# Guild Hall v1 layered image analysis

Reference: `docs/visual-references/island-016-fishermans-village/generated-hypotheses/guild-hall-multiview-v001.png`
Role: generated secondary hypothesis constrained by exact village source v004; not exact pixel authority.
Intended use: action-ready procedural Three.js L1–L3 landmark in the existing portrait-phone island renderer.

## 1. Identification and classification

- Work type: compound coastal guild hall / civic timber-and-stone building.
- Primary domain: object; architectural, hard-surface, layered-shell structure.
- Confidence: 0.92 for the visible front/side identities, 0.78 for the inferred rear/service organization because the four generated views vary in small props and dormer placement.

## 2. Overall form and silhouette

- Bilateral main mass with an intentionally asymmetric chimney and side service volumes.
- Bounding volume is a tall cuboid occupied shell capped by a continuous lofted mansard/gable roof family; two lower side wings interrupt the silhouette.
- The roof owns more than half the apparent height and width. It sweeps outward at the eaves, rises steeply into a narrower crown deck, and terminates in four phone-readable finials.
- The front axis is +Z. A deep pointed entry gable projects beyond the wall plane; the rear uses a balcony/service porch rather than repeating the front.

## 3. Macro → meso → micro hierarchy

- Macro: stone/apron foundation; occupied timber/plaster shell; continuous swept roof mass; front pointed entry/gable; left/right wing volumes; rear balcony/service volume; chimney; crown deck.
- Meso: roof shingle courses; brass/cedar roof ribs; dormers; arched windows; structural timber bays; entry stairs and piers; terrace/porch rails; chimney bands; awnings; barrels/crates/rope clusters.
- Micro: shingle edge variation; beam pegs/caps; window mullions; carved fish crest; rope knots; barrel hoops; worn slate accents; warm lantern brackets.

## 4. Spatial relationships

- Roof shell overlaps the occupied shell and embeds into side-wing roof collars; it must remain one coherent parent mass rather than floating panels.
- Front entry is socketed into the +Z facade with structural overlap at the wall and canopy.
- Dormers embed through the roof surface with collars; chimney penetrates and is collared at the rear-left roof quadrant.
- Balcony/service porch overlaps the rear shell and is supported by posts reaching the stone footing.
- Detail props attach to apron, porch or wall sockets; no prop may float independently.

## 5. Materials and surface

- Slate: dark blue-gray dielectric, roughness about 0.72–0.82, low metalness, visible overlapping course relief and restrained warm-weathered tiles.
- Cedar structural wood: warm mid-dark brown, roughness about 0.64–0.76, grain-scale normal variation; darker end grain and crevices.
- Smoked plaster: warm low-saturation tan, roughness about 0.84–0.92, shallow uneven relief.
- Coastal stone: charcoal/gray dielectric, roughness about 0.88–0.96, block joints and edge wear.
- Brass/copper accents: metalness about 0.65–0.82, roughness about 0.28–0.42, sparse rather than outlining every edge.
- Windows: amber emissive glazing behind dark timber frames; emissive response must not flatten frame depth.

## 6. Color and finish

- Highest-value regions are amber windows and pale worn wood edges; roof remains the darkest broad field.
- Main contrast is warm wood/plaster/windows against cool slate and stone.
- Finish is handcrafted and weathered, not glossy or photorealistic.

## 7. Identity-defining features

1. Tall swept mansard silhouette with curled eaves and four crown finials.
2. Deep pointed carved front entry centered under a large arched window.
3. Layered slate courses with readable overlap rather than flat slabs.
4. Asymmetric striped stone/brick chimney.
5. Warm occupied arched windows and dormers.
6. One coherent timber bay system, not loose black line overlays.
7. Lived-in terrace/service details with fish crest, awnings, rope and barrels.
8. Distinct rear balcony/service elevation that remains structurally credible.

## 8. Uncertainty and limits

- Generated views differ in small-prop placement, number of dormers and exact rear balcony width. These are secondary inference and may be normalized for one coherent runtime model.
- The exact source shows the building only at island-overview scale; the generated multi-view is allowed to clarify but not to redesign its placement, palette or dominant silhouette.
- No manufacturing dimensions exist. All dimensions are relative to the frozen landmark footprint and phone framing.
- Surface microtexture is procedural approximation; no exact texture projection is authorized or required.

## Suitability verdict

Pass with documented secondary inference. The four-view sheet provides strong silhouettes and enough structural/material evidence for a stylized procedural reconstruction. Hidden service details may be inferred conservatively. Exact pixel-level reproduction is neither possible nor required; the acceptance target is a 0.85+ source-faithful real-time match across the locked source-facing, two orbit and rear views.
