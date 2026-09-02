# Island 018 - Jungle Expedition Reference Packet

This folder is the durable cross-chat visual working set for runtime Island
018. Start here before changing its Three.js world. Nothing in this packet is
shipped as runtime artwork.

## Authority Order

1. `018-source.png` - immutable user-supplied exact source and
   visual-semantic target for runtime Island 018.
2. `derived-crops/` - non-generative crops of visible source details.
3. `secondary-inferred/` - generated modeling aids for hidden side/rear form,
   admitted only after their files and provenance sidecars are recorded here.

The exact source always wins. Generated turnarounds may fill hidden
construction gaps, but they may not replace visible silhouette, feature,
palette, material response, landmark placement, or mood from the source.

The source image itself says `ISLAND 039`, but Eivind explicitly started this
as runtime Island 018. The runtime number is therefore 018. The source inbox
ledger copied here also references a missing `018-source.png` with a different
hash; the active source for this packet is the attached `new 018.png`, copied
here as `018-source.png` on 2026-08-30.

## Reference Lock

Jungle Expedition is a floating lost-city jungle island with stacked mossy
stone temples, rope bridges, waterfalls, carved guardian masks, emerald jungle
canopy, gold-lit ruin interiors, turquoise water, hanging vines, and layered
cloud-depth cliffs. The island should read as a lush expedition through an
ancient wild civilization, not a generic tropical board.

The source contains baked UI, text, counters, tile art, labels and controller
buttons. Those are visual evidence only. The live `spark36_ring`, real HUD,
token, Build flow, reward logic, stop progression, and canonical gameplay
state remain unchanged.

## Landmark Reference Map

| Landmark | Runtime stop | Canonical visible reference | Hidden-view aid | Important limit |
| --- | --- | --- | --- | --- |
| Explorer Nest | Hatchery | `derived-crops/explorer-nest-hatchery-source-crop-v001.png` | none admitted | Preserve the moss-hidden green egg, small shrine plinth, wet stone, vines and waterfall perch. Do not turn it into a bird nest or soft forest hut. |
| Jungle Path | Habit | `derived-crops/jungle-path-habit-source-crop-v001.png` | none admitted | Preserve the elevated jungle-platform path, torchlight, vines and daily-step expedition tone. Text panel copy is not runtime UI authority. |
| Survival Trials | Mystery | `derived-crops/survival-trials-mystery-source-crop-v001.png` | none admitted | The source labels this area `ARENA`, but runtime Island 018 is an ordinary island unless gameplay separately says otherwise; use it as the Mystery landmark visual language. |
| Explorer's Camp | Wisdom | `derived-crops/explorers-camp-wisdom-source-crop-v001.png` | none admitted | Preserve the map/camp/lesson identity with small expedition platforms and warm lantern-gold detail. |
| Lost City Temple | Boss | `derived-crops/lost-city-temple-boss-source-crop-v001.png` | none admitted | Preserve the dominant stepped ruin-temple mass, vertical stairways, glowing entrances, vines, waterfalls and carved stone guardian identity. |

## Fresh-Chat Resume Order

1. Read `manifest.v1.json` and verify `018-source.png` against its SHA-256.
2. Read the Island 018 Gauntlet completely.
3. Open only the exact crop and any admitted hidden-view aid for the active
   landmark.
4. Run the img2threejs state gate from `.img2threejs/island-018-jungle-expedition/`.
5. Inspect current evidence under
   `work/island-visual-library/island-018-jungle-expedition/evidence/` before
   editing code.
6. Continue in the dedicated Island 018 worktree, preserving unrelated work.

Generated construction aids are allowed only after they are copied into
`secondary-inferred/`, hashed, and paired with a provenance sidecar. Temporary
chat attachments, `/tmp`, `/var/folders`, generator caches, and clipboard paths
are not production references.

## Production Pointers

- Gauntlet: `docs/gauntlets/2026-08-30-island-018-jungle-expedition.md`
- Source lock: `work/island-visual-library/island-018-jungle-expedition/SOURCE_LOCK.md`
- img2threejs state: `.img2threejs/island-018-jungle-expedition/`
- Render evidence: `work/island-visual-library/island-018-jungle-expedition/evidence/`
- Planned runtime factory:
  `src/features/gamification/level-worlds/dev/Island18JungleExpeditionThreeWorld.ts`
- Planned runtime asset root: `public/assets/islands/island-018/`
