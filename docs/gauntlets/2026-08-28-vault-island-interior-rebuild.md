# Vault Island Interior Rebuild Gauntlet

Status: Complete production candidate
Created: 2026-08-28

Final gate: the approved Blender route produced the two-level atrium, grand descent, radial vault museum, and complete eight-treasure set. The v073 phone journey adds the post-acceptance royal entry, jeweled museum plaques, localized architectural lighting, subtle premium material response, and stable deferred first-frame rendering. It clears the 0.85 final gate and preserves the read-only Three.js interaction layer.

## Mission

Replace the prototype-quality palace atrium and underground vault architecture with a coherent luxury interior journey that matches the finished exterior's white marble, blue enamel, gold, gemstone, and museum language.

## Observable Outcome

- The palace opens into a mostly empty monumental rotunda with two genuinely tall architectural levels.
- The exterior dome is visibly and structurally convincing from inside.
- A massive supported staircase splits into two flights and descends toward the vault.
- Warm side portals visibly lead toward the gardens.
- The underground vault reads as a curated circular treasure museum, not a crowded procedural room.
- All critical views score at least 0.85; the 390 x 844 phone view remains the primary approval surface.

## Sources Of Truth

- Exact style/identity source: `docs/visual-references/island-special-vault-treasure/treasure-island-source.png`
- Explicit journey decisions recorded in `gauntlet/baseline.v3.json`
- Secondary interior hypothesis: `secondary-inferred/derived-crops/interior-vault-hall-v001.png`
- Current rejected baseline: v058 atrium and vault browser captures
- Architecture and gameplay contracts under `docs/gameplay/`

## Non-Negotiables

- Preserve the working eight-treasure inspection and reveal loop.
- Preserve placement socket names and the read-only production presentation boundary.
- Do not add Island Run gameplay writes.
- Freeze macro room volume before carving, props, particles, or animation polish.
- Generated hidden views remain secondary inferred evidence.

## Milestones

1. **Admission:** approve `part-inventory.v3.json` and its 18 review units.
2. **Representative atrium slice:** rotunda shell, visible dome, and structurally complete split stair in semantic materials.
3. **Atrium architecture:** two gallery levels, entry, garden portals, columns, floor, and lighting.
4. **Vault macro:** rotunda shell, arcade bays, threshold, floor compass, and central dais.
5. **Museum system:** eight-case radial layout, display family, collection wings, and inspection clearance.
6. **Finish:** premium materials, architectural lighting, restrained ceremony, and phone composition.
7. **Integration:** full exterior-to-atrium-to-vault journey, Board modal, build, runtime contracts, and responsive screenshots.

## Evidence

- Locked front, both three-quarter, top-oblique, rear/underside sanity, and phone captures for each room.
- Semantic/clay pass before finish pass.
- Independent image-first Quality-Lord review at every macro gate.
- Browser interaction manifest proving palace entry, descent, treasure selection, reveal, close, and Escape.
- Runtime model checker, Vault contract checker, and production Vite build.

## Rollback And Stop Rules

- Existing v058 runtime remains the rollback point until a complete interior family passes.
- One blockout and one bounded correction per construction family.
- Retire a family on repeated dominant failure or any post-correction critical score below 0.75.
- Stop for Eivind if the hidden transition design changes the accepted journey or if both representation families fail.

## Approval Boundary

Eivind approved the inventory, representative slice, preserve list, and continuation through the complete interiors and treasure set on 2026-08-28.

## 360 Interior Extension - Blender v045

The 2026-09-05 continuation added a full phone-tour acceptance sweep at fixed 0, 90, 180, and 270 degree headings for both authored rooms. The first sweep rejected the previous wall-radius camera after it clipped the vault dome and crossed the atrium stair. The accepted camera uses a near-center panoramic pivot, unrestricted horizontal rotation, a wider vertical look range, and suppresses the relic card while touring.

Blender v045 adds two deep atrium side reliquaries and two vault armillary guardians. Each is part of the authored 360 completion shell and therefore remains hidden in the original museum showcase composition. The atrium shell reports 10/10 completion batches visible in tour mode; the vault reports 9/9. The weakest formerly clipped vault quadrant now renders varied pixels, the full room boundary, a sapphire-and-gold guardian display, and adjacent deposit bays.

Accepted evidence:

- `docs/visual-references/island-special-vault-treasure/gauntlet/qa/raw/browser-captures-v217-360-gauntlet/atrium-yaw-90-phone-v045-accepted.png`
- `docs/visual-references/island-special-vault-treasure/gauntlet/qa/raw/browser-captures-v217-360-gauntlet/atrium-yaw-180-phone-v045-accepted.png`
- `docs/visual-references/island-special-vault-treasure/gauntlet/qa/raw/browser-captures-v217-360-gauntlet/vault-yaw-270-phone-v045-accepted.png`

Release gates: Blender source compilation passed; Vault Island lab, model-runtime, Vault Casino, and Island Run architecture contracts passed; Island Run services passed 1,984/1,984; TypeScript, the isolated Vault build, and the full production Vite build passed.
