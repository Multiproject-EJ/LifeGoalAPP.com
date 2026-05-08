# Island 001 asset organization plan

## Why this exists

Codex PRs should not include binary `.webp` files. The image copies must be done manually with local Git, GitHub Desktop, VS Code, or GitHub upload.

This scaffold prepares the target text-only folder structure for Island 001 without adding, moving, copying, renaming, deleting, or modifying any image assets.

## Current old files

- `public/assets/islands/landmarks/center_inner1.webp`
- `public/assets/islands/landmarks/battle11.webp`
- `public/assets/islands/landmarks/boss1.webp`
- `public/assets/islands/landmarks/landmark_hatcheryL3.webp`

## Desired new file mapping

- `public/assets/islands/landmarks/center_inner1.webp`
  → `public/assets/islands/island-001/board/board-circle-inner.webp`

- `public/assets/islands/landmarks/battle11.webp`
  → `public/assets/islands/island-001/scenery/battle-arena-crystal.webp`

- `public/assets/islands/landmarks/boss1.webp`
  → `public/assets/islands/island-001/bosses/black-crystal-dragon-idle.webp`

- `public/assets/islands/landmarks/boss1.webp`
  → `public/assets/islands/island-001/bosses/black-crystal-dragon-defeated.webp`

- `public/assets/islands/landmarks/landmark_hatcheryL3.webp`
  → `public/assets/islands/island-001/landmarks/hatchery-l3.webp`

## Manual Git Bash commands

```bash
mkdir -p public/assets/islands/island-001/board
mkdir -p public/assets/islands/island-001/scenery
mkdir -p public/assets/islands/island-001/landmarks
mkdir -p public/assets/islands/island-001/bosses

cp public/assets/islands/landmarks/center_inner1.webp public/assets/islands/island-001/board/board-circle-inner.webp
cp public/assets/islands/landmarks/battle11.webp public/assets/islands/island-001/scenery/battle-arena-crystal.webp
cp public/assets/islands/landmarks/boss1.webp public/assets/islands/island-001/bosses/black-crystal-dragon-idle.webp
cp public/assets/islands/landmarks/boss1.webp public/assets/islands/island-001/bosses/black-crystal-dragon-defeated.webp
cp public/assets/islands/landmarks/landmark_hatcheryL3.webp public/assets/islands/island-001/landmarks/hatchery-l3.webp
```

## Manual verification commands

```bash
cmp -s public/assets/islands/landmarks/center_inner1.webp public/assets/islands/island-001/board/board-circle-inner.webp && echo 'center copy ok'
cmp -s public/assets/islands/landmarks/battle11.webp public/assets/islands/island-001/scenery/battle-arena-crystal.webp && echo 'battle copy ok'
cmp -s public/assets/islands/landmarks/boss1.webp public/assets/islands/island-001/bosses/black-crystal-dragon-idle.webp && echo 'boss idle copy ok'
cmp -s public/assets/islands/landmarks/boss1.webp public/assets/islands/island-001/bosses/black-crystal-dragon-defeated.webp && echo 'boss defeated copy ok'
cmp -s public/assets/islands/landmarks/landmark_hatcheryL3.webp public/assets/islands/island-001/landmarks/hatchery-l3.webp && echo 'landmark copy ok'
```

## Follow-up text-only PR after manual copy

Once the `.webp` files exist at the new paths, update `public/assets/islands/island-001/island-art.json` to use these relative paths:

- `board/board-circle-inner.webp`
- `scenery/battle-arena-crystal.webp`
- `bosses/black-crystal-dragon-idle.webp`
- `bosses/black-crystal-dragon-defeated.webp`
- `landmarks/hatchery-l3.webp`
