# Blossom Crown Citadel — focused image analysis

Reference: `docs/visual-references/island-008-flower-kingdom/island-008-flower-kingdom-goal-v1.png`

Focused evidence:

- crown and upper tower: `.img2threejs/island-008/detail-zones/zone-r0c1.png`
- doorway, lower balconies and window language: `.img2threejs/island-008/detail-zones/zone-r1c1.png`

## 1. Identification and classification

The target is the central Blossom Crown Citadel: a stylized botanical palace/tower embedded in a garden terrace. Primary domain: object. Form language: architectural, organic and botanical. Structure kind: deep branching hierarchy with repeated petal, window, vine and balcony modules. Confidence that the visible target is the intended central boss landmark: 0.99.

## 2. Overall form and silhouette

The building occupies a roughly cylindrical footprint but is not a straight cylinder. Its vertical mass steps inward through three irregular tiers and is interrupted by asymmetric side flower pods, projecting lotus balconies, vine buttresses and a very wide open flower crown. The visible height is approximately 2.4 times the lower architectural width; the crown is approximately 1.35 times the width of the upper tower. The silhouette is rotationally related but deliberately asymmetric rather than radially uniform.

## 3. Macro, meso and micro hierarchy

Macro assemblies:

1. rooted ivory-stone garden plinth and front stair;
2. lower arched keep with strong central doorway;
3. middle bloom tower with projecting flower-window balcony;
4. upper conservatory drum with side pods and planted rim;
5. monumental open lotus crown.

Meso systems:

- recessed emerald-glass arched windows in ivory frames;
- coral and blush lotus balconies wrapped around windows;
- branching living-root/vine buttresses spanning tiers;
- antique-gold mullions, crown ribs, tracery and edge bands;
- planted upper ring with broad leaf masses;
- staggered lateral flower cups on alternating heights;
- stepped doorway porch with paired columns and pointed arch.

Micro feature groups:

- radial gold window tracery;
- petal midribs and ivory/gold petal edge accents;
- dark recesses beneath balconies;
- small orchid and meadow clusters at balcony rims;
- leaf clusters filling tower-to-balcony gaps;
- gold finials and crown stamens.

## 4. Spatial relationships

- The stair overlaps and embeds into the garden plinth.
- The doorway frame is attached to and projects from the lower keep.
- Each lotus balcony overlaps its supporting tower tier and cups an arched window.
- Side flower pods are socketed into the tower on short root branches, not floating independently.
- Vine buttresses embed at the plinth and overlap successive tier rims.
- The open lotus crown is socketed into the planted upper ring; inner petals sit above and inside the outer petal row.
- Gold crown stamens rise from the crown cavity and terminate below the highest petal tips.

## 5. Materials and surface response

- Ivory stone: warm dielectric stone, roughness about 0.52–0.68, shallow carved relief and softened bevels.
- Living roots/vines: warm brown dielectric, roughness about 0.72–0.86, longitudinal ridges.
- Emerald botanical glass: translucent-looking green/cyan surface with low roughness and strong highlight, but mobile implementation should remain opacity-based rather than expensive full transmission.
- Coral/blush petals: satin dielectric, roughness about 0.3–0.45, subtle vein relief and brighter edge.
- Antique gold: metalness about 0.7–0.9, roughness about 0.22–0.35, restrained use on tracery and trim.
- Leaves: medium-to-dark green satin/matte foliage with vein relief and varied value.

## 6. Colour and finish

The large masses are warm ivory stone, emerald foliage/glass and coral-pink petals. Gold is a narrow high-value accent. Deep green cavities and root brown provide separation. The crown transitions from darker coral at petal bases to pale blush edges; the implementation may approximate this with two nested petal materials rather than a projected gradient.

## 7. Identity-defining features

1. giant open lotus crown wider than the upper tower;
2. three clearly stacked, nonuniform bloom tiers;
3. strong arched emerald doorway at the front;
4. repeated flower-cupped arched windows;
5. asymmetric side flower pods connected by living-root branches;
6. planted upper ring directly beneath the crown;
7. gold botanical tracery and crown stamens;
8. vine buttresses visually tying the tower into the garden terrace.

## 8. Uncertainty and single-image limits

The selected reference is a scene and shows only a front three-quarter view. The rear facade, exact tier cross-sections, internal rooms, hidden attachment sockets and crown underside are not visible. Rear construction will therefore repeat the established arched-window, flower-balcony and vine language with lower confidence (0.55–0.7) rather than invent a new facade family. Exact manufactured dimensions are neither visible nor required. The target is a polished real-time procedural approximation at phone scale, not an exact mesh extraction.

## Suitability verdict

Conditional pass. The full image is a scene rather than an isolated object, but the central tower has a strong readable silhouette, clear material families and two useful close evidence zones. The visible identity can be reconstructed procedurally; hidden rear geometry remains an explicitly labelled inference.
