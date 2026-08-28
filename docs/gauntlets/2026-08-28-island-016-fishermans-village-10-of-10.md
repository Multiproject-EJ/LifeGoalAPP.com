# Island 016 Fisherman's Village — 6/10 to 10/10 visual Gauntlet

Date: 2026-08-28
Status: implementation complete; strict phone gates passed; release candidate ready
Owner: Eivind

## Mission and observable outcome

Upgrade the current playable Island 016 Fisherman's Village from an honest 6/10 baseline to a source-faithful premium stylized Three.js world. The complete island must read clearly on a portrait phone: bespoke occupied landmarks, layered coastal scenery, a tactile in-world fishing catch, and a genuinely colossal detailed water dragon whose complete eruption, flight, wing fold, head-first dive and impact remain readable.

## Evidence and authority

- Exact village authority: `docs/visual-references/island-016-fishermans-village/goals/exact/016-fishermans-village-approved-v004.png`, SHA-256 `a631297b2d2c11fcb3939de8ccc5bcdd69c52ab3bd12d40597859fbb6019ae65`.
- Secondary dragon identity: `docs/visual-references/island-016-fishermans-village/goals/secondary-inferred/water-dragon-four-view-v001.png`, SHA-256 `051c1577841f4479f3fceaf1d4a53d3a68dd6c68ca5434eb717228e1fc86c642`.
- Thirteen current matched captures and their hashes are locked in `baseline.v1.json`.
- The current implementation is baseline evidence only and must not contaminate generated goal studies.

## Non-negotiables

- Preserve the canonical 36-tile circle, fishing/mission state, one-renderer architecture and quality tiers.
- Keep the Guild Hall upper-right and the fish-market dock upper-left behind the lighthouse lantern.
- Use code-native procedural Three.js; the user explicitly rejected Blender for this route.
- Never overwrite approved goals or accepted evidence.
- Keep continuous island, dragon torso and wing membrane masses continuous; split only where ownership, attachment or motion genuinely differs.
- No generated study or geometry begins until the 32-part inventory is explicitly approved.
- No detail polishing before naked macro silhouette, volume, socket and cross-view coherence pass 0.85.
- Each family receives one blockout and at most one bounded correction before retirement/escalation.

## Proposed route

1. Generate source-grounded, isolated multi-view goal sheets for approved coupled groups only.
2. Prove the representation route with the Guild Hall macro/detail family in its real upper-right assembly socket.
3. If approved, serialize the other four landmarks, fish-market/harbour and village/environment systems.
4. Build the fisher, rig and catch fish family as an in-world interaction, not a modal catch animation.
5. Rebuild the dragon from the accepted identity and aperture contract, then separately gate eruption and flight/dive/impact choreography.
6. Assemble, review the least flattering views first, then test phone PWA and local Capacitor development builds.

## Stop condition

The 3D Asset Gauntlet admission checkpoint was approved by Eivind on 2026-08-28. The approved correction adds one explicit identity requirement: the water dragon's face must become substantially more iconic through a strong crown/horn silhouette, memorable expressive eyes, powerful aquatic jaw, distinctive whiskers and fin-frills, while preserving the accepted teal aquatic identity and friendly HabitGame readability. Reference generation and the Guild Hall representative vertical slice are now authorized.
