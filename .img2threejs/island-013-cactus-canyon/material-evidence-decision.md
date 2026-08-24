# Island 013 material evidence decision

Decision: skip whole-image inverse PBR extraction for the blockout/spec gate.

The admitted source is a generated full-scene mockup with strong baked sunset
illumination, atmospheric haze, opaque UI panels, text and unknown image
post-processing. It does not contain isolated, de-lit material crops suitable
for a defensible ≥0.70 sandstone/timber/metal PBR inference. Treating its
shadows or highlights as channel truth would bake the source camera and light
into the procedural materials.

The sculpt spec instead records observable material families, palette/value
relationships, independent albedo/roughness/normal-height/AO intent, local
weathering overrides, upper-left key direction and the limitation explicitly.
Reference-matched and grazing-light browser renders will remain the acceptance
evidence. Focus crops may be added later if a material, rather than geometry or
lighting, becomes the largest observed mismatch.
