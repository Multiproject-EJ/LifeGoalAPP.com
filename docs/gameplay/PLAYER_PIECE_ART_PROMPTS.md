# Player Piece Art Prompts

Production prompts for the 10 selectable Island Run player pieces. These follow
`docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md` so the pieces sit in the
same visual world as the islands, caretakers, and controller.

## How to use

1. Generate each piece with the shared scaffold + the piece-specific line.
2. Export a square PNG with a **transparent background**.
3. Save to `public/assets/player-pieces/<file-name>.webp` (convert to webp,
   target ~512x512 master, under ~60KB).
4. File names must match `src/features/gamification/level-worlds/services/islandRunPlayerPieces.ts`.

| Piece | File name |
| --- | --- |
| Explorer Ship | `explorer-ship.webp` |
| Ancient Egg | `ancient-egg.webp` |
| Living Compass | `living-compass.webp` |
| Keeper's Lantern | `keepers-lantern.webp` |
| The Quest Journal | `quest-journal.webp` |
| World Seed | `world-seed.webp` |
| Ancient Key | `ancient-key.webp` |
| Fallen Star | `fallen-star.webp` |
| Ori's Shell | `oris-shell.webp` |
| Guardian Idol | `guardian-idol.webp` |

## Shared scaffold (prefix every prompt with this)

> A single stylized 3D game piece for a premium mobile board game, rendered as a
> collectible token. Orthographic three-quarter view from slightly above,
> matching a 47-degree board plane with north receding upward. Upper-left key
> light with soft warm fill and a gentle contact shadow directly beneath the
> object. Polished stylized 3D look — clean readable silhouette, soft rounded
> forms, subtle material detail, painterly PBR shading. Rich saturated fantasy
> palette with gold and aged-bronze accents. Centered, object fills roughly 80%
> of the frame, generous margin. Fully transparent background. No text, no logo,
> no watermark, no UI, no board, no tiles, no ground plane, no character, no
> hands. Must stay instantly readable when scaled down to 32 pixels: bold
> silhouette, high contrast, no thin fragile details.

## Piece prompts

**Explorer Ship** — a small ornate airship-boat hybrid with a curved gilded hull,
a single furled cream sail, brass fittings and a glowing cyan engine crystal at
the stern trailing faint light. Adventurous flagship feel.

**Ancient Egg** — a large ovoid egg of pale pearl stone, wrapped in delicate
carved gold filigree bands, with soft warm light glowing from hairline cracks.
Resting on a small carved stone base. Feels dormant but alive.

**Living Compass** — an ornate brass pocket compass standing upright, lid open,
face showing a glowing amber needle and etched star rose. Weathered metal,
engraved bezel, faint magical glow from the dial.

**Keeper's Lantern** — a small hexagonal lantern of aged bronze and warm amber
glass, with a soft golden flame inside casting light through the panes. Simple
ring handle on top. Cosy and wise.

**The Quest Journal** — a thick leather-bound book standing slightly open, deep
teal-green cover with gold corner caps and an embossed compass emblem, cream
pages with one ribbon bookmark lifting as if caught in a breeze.

**World Seed** — a large carved almond-shaped seed of warm polished wood with
gold-inlaid growth spirals, a single fresh green sprout with two leaves emerging
from the crown, and fine roots curling around its base.

**Ancient Key** — an ornate oversized key of aged gold and dark iron, with an
elaborate looping bow, a twisted shaft, and an intricate ward-cut bit. A small
faceted blue gem set in the bow catches the light.

**Fallen Star** — a polished irregular celestial fragment, a five-point star form
with softened molten edges, pale gold and cream with an inner white-hot glow,
shedding a few tiny floating motes of stardust.

**Ori's Shell** — a sacred nautilus spiral shell standing upright, pearlescent
cream and soft aqua iridescence, ridged chambers with delicate gold-traced rim
and a luminous inner opening.

**Guardian Idol** — a small squat carved stone guardian statue, blocky moss-flecked
granite with weathered tribal carving, stubby arms folded, and two glowing violet
rune eyes. Ancient, heavy, protective.

## Review checklist

- Transparent background, no baked ground shadow plate
- Silhouette still readable at 32px (squint test)
- Light from upper-left, consistent across all ten
- No text or watermark anywhere
- Consistent apparent scale between pieces (none dramatically larger)
