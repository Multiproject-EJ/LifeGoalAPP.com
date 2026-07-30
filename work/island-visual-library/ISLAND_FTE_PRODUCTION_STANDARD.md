# Island FTE Production Standard

FTE means **Fit, Terrain, and Embedding**. It is the reusable acceptance standard
for all 120 islands and every fixed landmark plot on them.

An asset does not pass because it looks good on transparency. It passes only when
it looks authored into the live island.

## F — Fit

The landmark must fit its fixed gameplay plot and camera:

- Use the island's final live camera. Never compensate with a second perspective.
- Optically center the architectural mass on the plot, not merely the PNG canvas.
- Align the entrance and front stairs with the island path.
- Keep the foundation bottom anchor within 2% of plot height across build states.
- Fill 82–96% of the usable plot envelope, including the permanent terrain apron.
- Keep left/right visual weight balanced to within 5% unless the landmark brief
  deliberately calls for asymmetry.
- Keep the complete silhouette inside the safe plot boundary and away from labels,
  routes, neighboring landmarks, boss art, HUD, and the island edge.
- Construction cranes and loose materials may enter the outer safe margin on L1/L2,
  but the permanent foundation must remain inside the final L3 footprint.

Automatic rejection:

- A visibly off-center building.
- A mirrored or disconnected entrance.
- A foundation floating above or sinking below the plot.
- A tiny building surrounded by unexplained empty plot.
- A large building clipping the island or colliding with another gameplay element.

## T — Terrain

Every fixed plot receives a permanent, landmark-specific terrain apron rendered
beneath L0–L3:

- The apron fills the negative space the architecture does not occupy.
- Use a combination appropriate to the landmark and island: paving, planted beds,
  roots, shrubs, flowers, low walls, fences, water channels, equipment courts,
  rock gardens, or magical ground inlays.
- The front opening must continue naturally into the island path.
- The outer edge must transition into the island terrain with foliage, stones, moss,
  or a restrained fade; never end as a naked perfect circle pasted over the board.
- The apron palette, light direction, material scale, and perspective must match the
  island plate.
- Reuse the same apron through every construction state so the site feels persistent.
- L0 may add survey marks or a blueprint glow, but it must not replace the terrain.

If the architecture occupies less than 70% of the usable plot, the remaining area
must be intentionally composed. Empty space is allowed only when it reads as a
designed courtyard, garden, ritual court, water feature, or gameplay area.

## E — Embedding

The landmark must appear to stand *in* the island:

- Provide a compact contact shadow directly beneath the structural mass.
- Let foreground stones, grass, roots, flowers, or paving overlap the foundation
  edge where appropriate.
- Match the island's atmospheric brightness, saturation, and edge softness.
- Continue the path material into the entry stairs without a gap or abrupt seam.
- Use small repeated materials from the island plate to bridge asset and terrain.
- Avoid detached global shadows, hard rectangular mattes, chroma halos, and sharp
  circular cut lines.
- At phone size, the player should not be able to identify where the separate asset
  begins.

## Build-state relationship

- The terrain apron persists unchanged from L0 through L3.
- L1/L2 construction happens above that stable environment.
- Construction clutter may temporarily occupy the apron, but decreases monotonically.
- L3 is handover-ready: zero scaffolding, cranes, ladders, pallets, loose stone,
  timber, crates, blueprints, or other construction residue.
- L3 may add finished planting, flags, light, water, or magical prestige effects.

## Per-island production packet

Before producing landmarks for an island, store:

1. Final island plate and camera reference.
2. Fixed plot centers, safe envelopes, entrance vectors, and z-bands.
3. Island palette/material/foliage guide.
4. One permanent terrain-apron brief per plot.
5. L0/L1/L2/L3 landmark state brief.
6. Phone-size runtime comparison for all states.

The packet is island-specific; the FTE checks are universal.

## Runtime QA gate

For every landmark and build state:

1. Inspect the transparent asset alone.
2. Inspect it on its terrain apron.
3. Inspect it in the actual island at the shipping phone viewport.
4. Draw the plot center and safe envelope overlay.
5. Confirm optical center, path connection, terrain fill, contact, and collisions.
6. Compare all landmarks at the same build state.
7. Compare L0/L1/L2/L3 for one landmark at equal runtime scale.
8. Inspect at 160 px and 120 px.
9. Inspect alpha edges over sky blue, white, navy, and the island plate.
10. Reject the asset if any seam, empty residual plot, or pasted-on appearance is
    visible in the live camera.

Passing the standalone image is never sufficient.

