# Island 001 artwork → Island 006 migration

Status: **runtime artwork copied and manifest validated**

The previous Island 001 art package has been copied to
`public/assets/islands/island-006/`. Island 006 previously contained only
placeholder assets, so no approved Island 006 visual identity was displaced.

The Island 006 manifest now points to the copied:

- ambient background
- board and outer foundation
- four L0 foundations
- four L1–L3 landmark families
- Noctyra idle and defeated states
- moon arena scenery

The manifest retains Island 006 as its gameplay number and uses `boss-06` as
its boss art identifier.

## Deliberately not migrated yet

Luma Isle's narrative, onboarding copy, story images, inhabitants, Noctyra
triggers, and existing player ledgers still identify Island 001. Moving these
is a separate content/state migration and must not be bundled into the visual
copy without a save-compatibility decision.

Until that decision is made:

- Island 006 renders the preserved former Island 001 artwork.
- Island 001 is being rebuilt visually as First Light Kingdom.
- Narrative behavior remains unchanged.

Original placeholder Island 006 manifest:

`placeholder-backup/island-006-placeholder-manifest.json`
