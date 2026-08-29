# Frostfire Archive material evidence

The approved sheet is generated studio artwork rather than a calibrated material capture. Exact PBR inverse recovery and photo projection are therefore not claimed. The implementation uses the existing Frostmoon physically based material families, which already respond consistently across the canonical day, blizzard, dusk and night lighting phases.

- Frost stone: charcoal-grey dielectric, high roughness, snow-filled contact seams.
- Dark timber: near-black brown dielectric, high roughness, longitudinal construction rhythm.
- Raw copper: warm brown-orange metal (`R > B`), medium roughness, restrained brighter worn edges; explicitly no blue roof treatment.
- Brass: warmer and slightly smoother than copper for hinges, crest details and index hardware.
- Paper/books: warm cream pages plus muted brown/red spines, matte response.
- Snow/icicles: neutral white snow with small pale-blue ice accents only.
- Frostfire/windows/furnace: amber emissive surfaces paired with bounded local point lights at high quality.

Material-pass evidence is the approved goal plus neutral/day and night runtime captures. Separate procedural scalars and geometry provide albedo, roughness, metalness, relief and emission; no albedo map is aliased into another PBR channel.
