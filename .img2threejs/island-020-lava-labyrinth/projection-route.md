# Projection route — not applicable to the world surface

Decision: use source-grounded procedural PBR materials, not full-frame photo projection.

The source is a composed mobile-game scene containing perspective, baked lighting, emissive bloom, atmospheric smoke, text, HUD panels, counters, and approximate tile art across many unrelated surfaces. Projecting those pixels onto the 3D island would bake view-dependent light and UI into geometry, collapse independent PBR channels, and only match one camera.

The exact source remains authoritative for visible silhouette, palette, material-region relationships, and feature placement. Deterministic exact crops feed material analysis and visual review. Basalt, worked stone, iron, brass, soot, cooled crust, and magma will use independent procedural albedo, roughness, height/normal, AO, and emissive evidence. No source pixels are used as a runtime texture.

If a later isolated flat emblem or decal genuinely needs pixel projection, it receives its own admitted crop, de-lighting evidence, UV contract, and bounded component route. That exception cannot become a full-world projection.
