# Island 001 moon-arena camera concepts

These are source-library concepts, not additional PWA runtime downloads. The
runtime consumes only
`public/assets/islands/island-001/scenery/moon-arena-final-camera-v2.webp`.

## Stored concepts

- `isl-001_scenery-moon-arena-low_v001_draft.webp` — low, integrated platform
  with restrained rear architecture.
- `isl-001_scenery-moon-arena-restored_v001_draft.webp` — taller restored/L3
  direction with the same moonstone, brass and purple-crystal identity.
- `isl-001_scenery-moon-arena-restored_v002_selected.webp` — selected restored
  direction after changing only the camera elevation and front-wall depth.

## Input roles

1. `public/assets/islands/island-001/scenery/moon-gate.webp` — identity and
   material reference only.
2. The current real 390×844 Island 001 capture — camera, scale and UI authority.
3. `island-camera-locked-master-guide-v2.png` — immutable center and 0.73
   ground-plane ratio authority.

## Concept A prompt

Use case: `stylized-concept`. Create one compact, low moonstone observatory
arena on a flat `#00ff00` chroma background. Preserve the dark slate, antique
brass, purple crystals and moon-portal identity, but reduce the tall rear horns
and wall mass. Author it directly in the live board's orthographic
three-quarter camera. The top-face ellipse must be parallel to the real tile
ring with a 0.73 screen-space height/width ratio. Keep the silhouette complete,
centered and symmetric; use shallow front depth; add no tiles, terrain, water,
UI, labels, characters, boss, text, shadow, reflection or watermark.

## Concept B prompt

Use case: `stylized-concept`. Create an impressive restored/L3 moon observatory
with a narrow crescent portal, celestial brass inlays and restrained purple
crystals on a flat `#00ff00` chroma background. Keep the open floor readable at
phone scale. Author the ground plane directly in the live board camera at the
same 0.73 ellipse ratio, with only one or two shallow front steps. Preserve the
same no-tiles, no-terrain, no-UI, no-character and no-watermark constraints.

## Selected-camera correction

Use case: `precise-object-edit`. Change only Concept B's camera elevation so
the circular ground plane becomes substantially more top-down and exactly
parallel to the real 36-tile ring. Reduce the visible front wall to the modest
depth of the real tile blocks while keeping towers and crescent portal upright;
never squash the completed raster. Preserve materials, architecture, symmetry,
lighting and the uniform chroma background.

## Runtime acceptance

- final-camera image renders in the `world-final` root with no runtime tilt or
  vertical squash;
- manifest anchor is exactly scene center `(700, 800)`;
- measured phone box is centered at `x=195` on the 390 px approval viewport;
- the complete arena stays inside the live tile ring;
- hidden-boss and idle-boss phone captures both pass.
