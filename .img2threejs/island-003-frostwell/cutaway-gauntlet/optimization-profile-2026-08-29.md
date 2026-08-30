# Frostwell cutaway optimization profile

The cutaway is quality-scaled rather than flattened. High/medium/low tiers reduce radial segments, ice inclusions, chips, droplets, snow particles, and ambient actors while retaining the complete rig-to-water silhouette.

- Full Frostmoon scene measurement before the final small-detail additions: about 15k triangles at high quality and 9k at low quality, below the Frostwell specification target of 45k triangles. This is a full-scene measurement, not an isolated Frostwell claim.
- Observed full-scene renderer calls were about 222 at high and 175 at low. The cutaway cinematic uses the existing visibility handoff to suppress nonessential surrounding world content while the camera is close.
- Procedural geometry scales through 18/12/8 primary segments, 18/12/7 inclusions, 16/10/6 chips, and 18/12/7 breakthrough droplets.
- Three local cutaway lights are bounded, cast no shadows, and only the active cutter practical pulses. Reduced-motion mode freezes optional animation.
- The asset introduces no texture-memory allocation; material differentiation is procedural and shared by named part families.
- Canonical mission state remains outside the model. Optimization changes presentation density only.

The phone-critical hierarchy is invariant: platform, rig, bore, segmented shaft, helical cutter, five ice strata, freshwater lens, and breakthrough cue.
