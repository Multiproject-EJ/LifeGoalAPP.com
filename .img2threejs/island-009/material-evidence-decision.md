# Island 009 material-evidence decision

Verdict: explicit limitation; do not extract reference PBR maps.

The selected source is a single illustrated whole-environment composition. Molten orange underlight, atmospheric haze, bloom, contact shadows, and stylized specular highlights are baked across every visible material. The image has no isolated flat-lit crop for basalt, steel, copper, crystal, or heat glass, so derived albedo/roughness/normal/AO maps would encode lighting and fail relighting and orbit review.

Island 009 therefore uses subject-specific procedural material recipes in the sculpt spec: independent albedo, roughness, normal/bump, AO, wear, and emissive responses for fractured basalt, blackened steel, antique copper, molten cores, ash stone, violet crystal, teal heat glass, and ember ash. Material fidelity will be judged through neutral, reference-angle, orbit, and grazing-highlight captures rather than projected source pixels.

This limitation is intentional and does not waive the material gate. Flat-plastic materials, albedo reused as PBR data, or lighting-painted texture projection remain failures.
