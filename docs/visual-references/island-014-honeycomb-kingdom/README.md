# Island 014 — Honeycomb Kingdom reference packet

This folder is the durable cross-chat visual working set for Island 014. Start
here before changing its Three.js world. Nothing in this packet is shipped as
runtime artwork.

## Authority order

1. `014-source.png` — immutable exact goal image.
2. `derived-crops/` — non-generative crops of visible source details.
3. `secondary-inferred/` — generated modeling aids for hidden side/rear form.

The exact source always wins. A generated turnaround may fill an unseen gap,
but it may not replace a visible silhouette, feature, material or landmark
identity from the source. Runtime number 014 also wins over the `ISLAND 024`
text embedded in the concept image.

## Landmark reference map

| Landmark | Canonical visible reference | Hidden-view aid | Important limit |
| --- | --- | --- | --- |
| Queen's Nursery / Hatchery | `derived-crops/queens-nursery-visible-source-crop-v001.png` | `secondary-inferred/queens-nursery-turnaround-v1.png` | Turnaround finial is optional; preserve the compact royal brood-egg identity. |
| Pollinator Yard / Habit | `derived-crops/pollinator-yard-visible-source-crop-v001.png` | `secondary-inferred/pollinator-yard-turnaround-v1.png` | Preserve six occupied dark cells around a dominant bee-relief center; never reinterpret it as a flower. |
| Nectar Trials / Mystery | `derived-crops/nectar-trials-visible-source-crop-v001.png` | none admitted | Side/rear construction must extend the visible crossed-mallet arena language conservatively. |
| Hive Archives / Wisdom | `derived-crops/hive-archives-visible-source-crop-v001.png` | none admitted | Preserve the honeycomb-and-open-book archive identity; hidden construction remains lower-confidence. |
| Royal Honeycomb Palace / Boss | `derived-crops/palace-visible-source-crop-v001.png` | none admitted | Preserve the dominant rounded jewel-hive cathedral silhouette; do not invent a different palace family. |

## Fresh-chat resume order

1. Read `manifest.v1.json` and verify `014-source.png` against its SHA-256.
2. Read the Island 014 Gauntlet completely.
3. Open the exact crop and any admitted hidden-view aid for the one active
   landmark; do not spread work across all five landmarks.
4. Run the img2threejs state gate from the manifest's `stateRoot`.
5. Inspect the current evidence pointer and its canonical, left, right and rear
   captures before editing code.
6. Continue in the dedicated Island 014 worktree, preserving unrelated work.

If a useful crop or generated side/back image exists only in a chat,
clipboard, `/tmp`, `/var/folders`, or generator cache, copy it into this folder
and update `manifest.v1.json` before relying on it. Generated images require a
neighboring provenance sidecar describing prompt intent and limitations.

## Production pointers

- Gauntlet: `docs/gauntlets/2026-08-24-island-014-honeycomb-kingdom.md`
- Source lock: `work/island-visual-library/island-014-honeycomb-kingdom/SOURCE_LOCK.md`
- img2threejs state: `.img2threejs/island-014-honeycomb-kingdom/`
- Gauntlet parts: `.gauntlet/island-014-honeycomb-kingdom-parts/`
- Render evidence: `work/island-visual-library/island-014-honeycomb-kingdom/evidence/`
- Procedural runtime factory:
  `src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts`

Render evidence and rejected experiments remain in their production folders;
they are pointed to here rather than duplicated into the reference packet.
