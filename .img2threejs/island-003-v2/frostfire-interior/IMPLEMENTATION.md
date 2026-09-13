# Frostfire interior-first construction

Implemented locally in the existing Archive factory; no gameplay writes. The room shares a fixed .96-radius envelope across all funded levels. Lower courses and table establish L1; rear/side upper walls, real shelves/books, paired cushioned benches and warm hearth furnish L2. L3 adds bookcase rows, reading lamp/backrests and finishes front upper walls, door, copper roof, book crest and frostfire stack at stage 5. Stages 2–4 prioritize the room. Roof and near-wall tags exist in construction geometry; default material compaction remains unchanged.

## Verification and review

- `scripts/check-frostfire-interior.mjs` asserts hollow panel walls, roof/stack/crest stage5, interior stages, every funded mesh retained identically L1→L2→L3, and flat reading-book contact with tabletop.
- Existing named Frostfire contract test updated: L1 identity comes from usable table/open book, final L3 supplies roof/crest. Root owns whole-suite validation.
- `review-blockout-v001.json`: independent reviewer retired opaque full-height L2 family (worst .35). Preserved all nine clay views.
- `review-open-room-v001.json`: second family macro-only approval, worst .85. Full front upper infill is genuinely unbuilt until final stage; no camera-dependent invisible wall trick.
- `interior-final-modal-v004/independent-review.json`: final furnished phone slice approved, worst score .85, source and PNG hashes verified. The room, horizontal table book, furniture and final roof/enclosure are readable without hare obstruction. These static .6/1 previews do not prove live timing or physical-device performance. Subsequent TemplateKit review-fixture lock correction does not change these working=0 poses.

## Gate limitations

Strict adapted spec passes. First adaptation had schema errors and its result returned after the first macro write; that sequencing deviation and failed result are retained. Full-image deterministic Tier1 fails when comparing the complete exploded-roof illustration to an unfinished roofless construction render; no threshold was changed or failed result relabeled. Multi-angle volumetric check passes. Independent macro approval is scoped to the room layout and construction visibility. The generic full-asset img2threejs pass state is not marked complete.

Some capture attempts failed on the persisted overlay button or mispositioned Playwright timeout argument; failure records remain. Capture helpers now use the third-argument timeout and conditional overlay toggling. Captures are presentation fixtures, never state mutation.
