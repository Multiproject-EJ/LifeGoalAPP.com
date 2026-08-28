# Vault Island 10/10 Exterior Rebuild Gauntlet

Status: active approved execution contract
Date: 2026-08-28
Owner: Eivind

## Mission

Replace the rejected 2/10 procedural exterior with a source-led, phone-readable luxury Vault Island. The result must preserve the working palace atrium, vault museum, treasure interaction, and dev-only architecture while rebuilding the exterior construction family around the source's inhabited two-storey cliff, articulated jewelry perimeter, radial garden, and ornate domed palace.

Eivind explicitly instructed Codex to make and execute the plan, use the Gauntlet loop, withhold intermediate visuals, and present the locked 2/10 baseline beside the final result only after the 10/10 gate.

## Sources Of Truth

- Exact goal pixels: `docs/visual-references/island-special-vault-treasure/treasure-island-source.png`
- Exact goal SHA-256: `5f2841dcf97303c7e8cf8091d0c02a0c22f24904eeea41044df68ab4a583fa57`
- Rejected baseline: `docs/visual-references/island-special-vault-treasure/gauntlet/qa/raw/browser-captures-v025/exterior-390x844.png`
- Rejected baseline SHA-256: `c3bc99d6a04037840b0de1d74f94230cfc778d56431e640b0b12120b8b7970c4`
- Project contracts named by repository `AGENTS.md`.
- `3d-asset-gauntlet` and `img2threejs` installed skill contracts.

## Observable Outcome

At 390x844, the island must immediately read as the same visual proposition as the source: a massive circular treasury rising from the sea, two occupied lower vault floors, a dominant segmented charm bracelet around the roofline, a formal radial garden, and an ornate white-and-gold palace with blue domes. Gold, silver, stone, enamel, glass, and gemstones must remain materially distinct in motion and in the fixed proof frame.

## Non-Negotiables

- Preserve dev-only isolation and do not add gameplay writes.
- Preserve current atrium, vault museum, eight treasures, inspect, reveal, collection value, and route behavior.
- Goal pixels outrank generated or inferred views.
- The lower treasury must show two separately readable inhabited floors.
- The bracelet must be constructed as jewelry links, collars, cages, stations, and hanging charms, not thin rails around a cylinder.
- The palace must read as a dense multi-storey palatial ensemble, not a box, cylinder, or single pavilion.
- Material polish cannot approve incorrect macro form.
- No intermediate screenshots are shown to Eivind.

## Production Units

The approved 18-unit inventory is in `part-inventory.v2.json`. The representative vertical slice is:

1. palace two-floor body plus dome crown;
2. one complete bracelet link/cage/jewel station sequence;
3. one complete two-floor inhabited cliff-vault bay.

That slice must establish the reusable construction families before repetition around the island.

## Milestones And Evidence

### 1. Macro family

- Fresh v2 module, leaving v025 recoverable.
- Matched front three-quarter, side, rear, top-oblique, and phone captures.
- Palace, bracelet, and cliff gallery each score at least 0.85 with no hard veto.

### 2. Full exterior

- Radial garden, fountain axis, pavilions, grand stair, marina gate, rock waterline, facade rhythm, roof ornament, and luxury materials.
- Named runtime hierarchy and deterministic construction.
- No blank canvas, clipping, incoherent overlap, or vanishing identity feature.

### 3. Final phone proof

- Fixed 390x844 exterior plus orbit sanity captures.
- Existing atrium, vault, and Treasure Lab interaction capture suite passes.
- TypeScript, production build, contract check, and runtime model check pass.
- Final immutable before/after sheet uses the rejected v025 capture and accepted final capture.

## Visual Gate

The Quality Lord reviews source pixels before implementation narrative. Required categories are silhouette and vertical hierarchy, palace identity, bracelet identity, cliff occupancy, garden legibility, material separation, cross-view coherence, and phone framing. Every critical category must score at least 0.85; the worst required view governs. The final 10/10 label means the contract's intended real-time phone result is fully achieved, not literal pixel identity with a single-view cinematic source.

## Correction Economics

- One naked blockout plus one bounded correction per construction family.
- Change the largest visible defect first and preserve rejected evidence.
- Retire a family after a repeated dominant defect or a post-correction critical score below 0.75.
- Do not add surface decoration to a failed macro family.

## Rollback And Recovery

The v025 exterior remains in `VaultTreasureIslandModel.ts`. The v2 exterior is additive and is reached through one factory delegation. Reverting that delegation restores the previous lab without touching atrium, vault, treasure, or gameplay files.

## Stop Conditions

Stop only for a hard tool/runtime blocker, a conflict in exact visible source geometry, or a representation-family ceiling after the bounded alternatives. Routine visual correction proceeds without another checkpoint under Eivind's explicit execution approval.
