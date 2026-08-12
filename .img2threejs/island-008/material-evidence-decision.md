# Island 008 material evidence decision

The selected overview is a stylized, fully lit scene. No material region is shown under neutral or controlled lighting, and the glass, water, petals, gold, roots, stone and foliage overlap at phone-composition scale. PBR extraction from those pixels would measure baked golden key light, turquoise environmental fill, contact shadow and post-processing rather than independent albedo, roughness, normal and ambient-occlusion evidence.

Material-region extraction is therefore skipped for this blockout/spec gate. The sculpt spec instead records:

- ten independently authored material families;
- separate albedo, roughness, normal/bump and ambient-occlusion strategies;
- macro, meso and micro frequency bands;
- named local overrides for orchid-glass highlights, waterfall specular response, terrain cavity darkening and antique-gold crests;
- the explicit limitation that exact inverse-rendered PBR values are not claimed.

This decision does not waive later rendered material review. Material, lighting and phone-scale separation remain blocking visual gates in the material and lighting passes.
