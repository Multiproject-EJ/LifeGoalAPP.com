# Island 020 Lava Labyrinth — source image analysis

Reference: `docs/visual-references/island-020-lava-labyrinth/020-source.png` (`1023x1537`, SHA-256 `ed22a7b4b8f1d1a1ab729c982c95898380fd7a2aa3852dfb7cd72d78854f87b8`).

## 1. Identification and classification

Observed subject: a dense stylized volcanic fortress-island presented as a portrait mobile-game board concept. Primary domain is `object/environment`; form language is architectural, hard-surface, geological, and effect-emitting. Confidence is 0.98 for the visible front three-quarter composition and 0.45 for hidden/rear construction.

Suitability: conditional-pass. The source is a scene rather than one isolated prop, but it has a strong readable master silhouette, distinct component families, visible material separation, and an intended stylized real-time result. Single-view rear/underside geometry must remain explicitly inferred. Baked text/UI/tile art is excluded from reconstruction.

## 2. Overall form and silhouette

The playable mass is a vertically stacked, roughly radial floating basalt island. A circular route surrounds a tall central fortress tower; the route and citadel sit on stepped masonry terraces above a deep jagged underside. Broad lavafalls descend from the front and lateral cliffs. Far volcanic spires form a second silhouette band behind the board, and a smoky ember sky fills the far depth.

The central tower is the dominant height reference. Its visible height is approximately 1.15 times the route's projected minor diameter. The island is near-radial at the board level but asymmetrical in cliff breaks, stair positions, lavafalls, side platforms, and horizon peaks.

## 3. Macro, meso, and micro decomposition

Macro: floating obsidian island; volcanic horizon; circular route context; central Crucible Citadel/Arena; four external landmark families; four-stage bridge/forge mission infrastructure; caretaker/inhabitants; atmosphere.

Meso: stepped basalt terraces; lava channels and falls; stairs and bridge spans; tower core, buttresses, curtain walls, spires, gates, forge bowl; each landmark's foundation/core/crown growth; chain drives and radial Crucible Gates; braziers and vent stacks.

Micro: irregular masonry joints; chipped edges; orange crack networks; runic insets; gold/brass fasteners; chains; spikes; forge grilles; window apertures; embers; ash; smoke wisps; heat shimmer; cooled-lava crust borders.

## 4. Spatial relationships

- `<citadel foundation, embedded-in, central island terraces>` via a buried socket and continuous retaining walls.
- `<tower core, rises-from, arena foundation>` with buttress overlap around its lower third.
- `<curtain maze, surrounds, tower core>` as connected stepped walls, not floating blocks.
- `<canonical route, surrounds, citadel>` but remains renderer-owned gameplay geometry.
- `<four landmarks, attach-to, footprint-stable outer terraces>` through buried foundations outside the protected route corridor.
- `<mission bridges, span, four radial lava channels>` through paired hinge/chain sockets; swept envelopes must clear all L3 landmarks and route geometry.
- `<lavafalls, emerge-from, surface channels>` and continue down the cliff shell without mid-air gaps.

## 5. Materials and surface

Primary raw basalt/obsidian is near-black, dielectric-to-mineral, roughness approximately 0.62–0.86 with chipped relief and warmer cavity response near lava. Worked fortress stone is dark charcoal with roughness approximately 0.52–0.72 and cleaner bevels. Iron is nearly black metallic with roughness approximately 0.45–0.68. Brass/gold trim is metallic orange-gold with roughness approximately 0.30–0.46 and dark patina. Lava is opaque emissive orange/red/yellow with a cooled dark crust boundary; emissive intensity must not erase channel shape. Windows and forge apertures are emissive amber behind dark frames.

## 6. Color and finish

Dominant values are near-black and charcoal. The warm hierarchy runs deep red in cracks, saturated orange in channels, yellow-white at narrow hottest cores, and muted aged gold on trim. The sky moves from blue-black/charcoal at the upper edges through smoke-brown into orange near the volcanic horizon. Cool accents are sparse cyan-blue utility lights on lateral platforms and violet only in live HUD, not the world palette.

## 7. Identity-defining features

1. A very tall narrow central forge tower inside a circular labyrinthine fortress.
2. Dense connected black masonry cut by continuous molten channels.
3. A complete readable circular route around the citadel, adapted to the canonical 36 tiles.
4. Multiple broad front lavafalls and a deep floating volcanic underside.
5. Jagged black volcanic horizon silhouettes against ember smoke.
6. Orange-lit windows, gates, braziers, and cracks repeating at three depth scales.
7. Four external landmark terraces that feel carved from the same fortress civilization while retaining distinct silhouettes.
8. Heavy iron/aged-gold construction language: spikes, chains, collars, grilles, and runic plates.

## 8. Uncertainty and single-image limits

The rear citadel elevation, underside continuity, hidden landmark backs, bridge mechanisms, Arena interior, and boss creature are not visible. The source's apparent tile count and symbols are non-authoritative. The embedded title says Island 043 while the requested runtime is Island 020. The current app catalogue names Island 020 `Golden Sands` with `Golden Winds Cup`; production requires an explicit approved retheme to `Lava Labyrinth` and a matching Blaze Trials presentation. Hidden forms will use secondary-inferred references only after decomposition approval.
