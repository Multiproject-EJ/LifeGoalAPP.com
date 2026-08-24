# Living Horizon material evidence

The generated goal image was processed by `extract_pbr_evidence.py` at 1024px. The extractor reported a pass at 0.86 confidence and produced independent albedo, roughness, height, normal, and AO evidence maps. These files are retained as palette and surface-frequency evidence in the sculpt specification.

Runtime policy remains stricter than the extraction result:

- the generated image is not projected onto the relief;
- its baked shadows and highlights do not become runtime albedo;
- the existing Compass Book scene lighting remains authoritative;
- brass, terrain, timber, teal enamel, violet enamel, inlet enamel, and amber focal surfaces each receive independent physical scalar responses;
- the extracted maps document the target family and satisfy the intake evidence gate, while browser renders decide acceptance.

This distinction matters because single-image PBR extraction cannot prove the true physical material. Neutral, grazing, and book-scene views remain required during the visual Gauntlet.
