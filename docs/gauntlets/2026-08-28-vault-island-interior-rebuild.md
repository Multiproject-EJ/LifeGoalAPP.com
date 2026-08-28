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
