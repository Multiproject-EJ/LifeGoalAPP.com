# World Assets

Static image assets for the HabitGame world-site landing page (`/`).

All assets are served from `/world-assets/` at runtime. Placeholder 1×1 WebP
files exist for each asset so the build pipeline works immediately; replace each
file with the final designed art asset before production launch.

---

## Asset inventory

| # | Filename | Purpose | Recommended dimensions | Max size | Format |
|---|----------|---------|----------------------|----------|--------|
| 1 | `world-bg-main.webp` | Full-bleed hero background | 1440×900 | 250 KB | WebP |
| 2 | `panel-glass-xl.webp` | Glassmorphic content panel overlay | 800×1200 | 100 KB | WebP |
| 3 | `btn-primary-continue.webp` | CTA button texture | 400×80 | 30 KB | WebP |
| 4 | `fx-bottom-glow.webp` | Bottom-edge glow / light burst effect | 1440×200 | 50 KB | WebP |
| 5 | `journey-node-active.webp` | Active journey node marker icon | 64×64 | 15 KB | WebP |
| 6 | `journey-path-glow.webp` | Journey path glow line art | 40×400 | 20 KB | WebP |
| 7 | `role-philosopher-card.webp` | Archetype card art (Philosopher) | 300×400 | 80 KB | WebP |
| 8 | `reward-trait-card-pack.webp` | Reward card pack art | 200×280 | 60 KB | WebP |
| 9 | `reward-xp-orb.webp` | XP orb icon | 96×96 | 20 KB | WebP |
| 10 | `world-bg-blur.webp` | Blurred background overlay for depth | 720×450 | 100 KB | WebP |

---

## Design notes

### `world-bg-main.webp` (primary — eagerly preloaded)
- Full-bleed hero background rendered behind all other layers
- Themes: deep space / cosmic / game lobby atmosphere
- Palette: dark indigo/navy with purple/violet highlights
- Must work without text overlay at 390 px wide (mobile) and 1440 px wide (desktop)
- Loaded eagerly via `<link rel="preload">` in `index.html`
- **CSS fallback**: dark indigo gradient remains visible if this asset fails

### `world-bg-blur.webp` (secondary — lazy-loaded)
- Lower-resolution blurred version of the main background, used as a depth layer
- Can be a Gaussian-blurred export of `world-bg-main.webp` at 0.5× scale
- Rendered at ~50% opacity for subtle parallax depth

### `panel-glass-xl.webp` (secondary — lazy-loaded)
- Glassmorphic frosted-glass texture rendered behind the content area
- Semi-transparent; alpha channel required
- Should look like a frosted dark glass panel with slight iridescence

### `fx-bottom-glow.webp` (secondary — lazy-loaded)
- Horizontal gradient glow / light burst at the bottom of the hero section
- Full-width, transparent top edge, coloured bottom edge (indigo/violet)
- Used to ground the hero visually and draw the eye downward

### `btn-primary-continue.webp` (secondary — lazy-loaded)
- Subtle texture / grain overlay for the primary CTA button
- Laid over the button as a mix-blend-mode overlay
- Should be neutral so it works with any button colour

### `journey-node-active.webp` (secondary — lazy-loaded)
- 64×64 glowing node icon for the JourneyPreview section
- Circular shape with inner glow matching the game-lobby palette

### `journey-path-glow.webp` (secondary — lazy-loaded)
- Vertical glowing line / path connector used in JourneyPreview
- Narrow (≈40 px wide) and tall; semi-transparent edges

### `role-philosopher-card.webp` (secondary — lazy-loaded)
- Card-art illustration for the Philosopher archetype in ArchetypePicker
- Portrait orientation (300×400); subject centred; transparent border area preferred

### `reward-trait-card-pack.webp` (secondary — lazy-loaded)
- Illustration of a stacked trait-card reward pack
- Used in the RewardsTease section

### `reward-xp-orb.webp` (secondary — lazy-loaded)
- Glowing spherical XP orb icon (96×96)
- Transparent background; suitable for placing over any dark surface

---

## Compression guidelines

1. Export in **WebP** format (lossless for icons < 100 px; lossy q=80 for larger images).
2. Keep each asset within the **Max size** column above.
3. Use `cwebp -q 80 input.png -o output.webp` (Google's cwebp tool) or Squoosh.
4. Strip metadata: `exiftool -all= output.webp`.
5. For `world-bg-main.webp` target 200 KB; the 250 KB limit is a hard gate.

---

## Replacing placeholders

Each placeholder file is a valid 1×1 WebP pixel. To replace:

```sh
# macOS / Linux
cp designed-hero-bg.webp public/world-assets/world-bg-main.webp

# Verify file size
du -h public/world-assets/world-bg-main.webp
```

The build pipeline picks up changes automatically; no code changes are required
when replacing a placeholder with the real asset.
