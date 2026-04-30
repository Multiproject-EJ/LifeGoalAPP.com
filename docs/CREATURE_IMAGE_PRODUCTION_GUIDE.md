# Creature Image Production Guide

## Purpose
This guide defines the production workflow for creature art used by Sanctuary and hatch reveal surfaces.

The app expects **creature-only transparent cutouts** and composes card visuals (frames, backgrounds, stars, labels, status) in UI.

## Asset recommendations
- **Master / authoring asset:** `1024x1024` transparent PNG.
- **App production asset (preferred):** `512x512` WebP.
- **Optional later thumbnail:** `256x256` WebP.

## Naming convention
- `imageKey` should match creature `id` unless the catalog intentionally overrides it.
- File names must match the `imageKey` exactly.

## Folder and file paths
- Creature cutout (preferred): `/public/assets/creatures/{imageKey}.webp`
- Creature cutout (authoring fallback): `/public/assets/creatures/{imageKey}.png`
- Rarity frame: `/public/assets/creature-frames/{tier}.webp`
- Background layer: `/public/assets/creature-backgrounds/{affinity-or-zone}.webp`
- Placeholder silhouette: `/public/assets/creature-placeholders/silhouette.webp`

## Visual rules for creature cutouts
- Transparent background.
- No baked text.
- No baked rarity stars.
- No baked card frame.
- No baked background.
- No baked glow/shadow unless intentionally introduced in a future art direction pass.
- Full body visible.
- Centered in frame.
- Consistent apparent scale across creatures.
- Silhouette remains readable at small Sanctuary grid sizes.

## Runtime fallback behavior
The runtime/UI fallback order is:
1. Try `{imageKey}.webp`
2. If load fails, try `{imageKey}.png`
3. If load fails, try `silhouette.webp`
4. If silhouette cannot render, show emoji fallback

This is deterministic and does not require runtime file-probing.

## Export checklist (before commit)
- Transparent background verified.
- Dimensions checked (target `512x512` WebP for app use).
- Subject centered and fully visible.
- No baked frame/background/text.
- File name matches `imageKey`.
- File size optimized.

## How to add a new creature image
1. Confirm creature entry exists in `creatureCatalog` with stable `id`/`imageKey`.
2. Export final cutout to:
   - `/public/assets/creatures/{imageKey}.webp`
   - optional `/public/assets/creatures/{imageKey}.png`
3. Run build/tests:
   - `npm run build`
   - `npm run test:island-run`
4. Manually verify in Sanctuary grid, detail card, and hatch reveal.

## Repository safety note
Avoid committing huge unoptimized originals or source PSD/AI files into this repo. Keep source masters in your art storage and commit optimized runtime outputs only.

## Future optimization recommendation
When many creature assets are added, consider a follow-up optimization pass:
- image compression audit,
- responsive/thumbnail variants,
- optional manifest metadata for lazy loading and prefetch tuning.
