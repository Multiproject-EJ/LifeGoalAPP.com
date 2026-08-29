# Snowfeather Roost material evidence

The approved target is stylized generated concept art with baked lighting, so inverse-rendered PBR maps would be misleading. Material evidence is therefore recorded as observed ranges and wired to the existing independent runtime material channels.

- Raw copper roof/crown/hoods: orange-brown albedo (`#A9532D` family), metalness about `0.86`, roughness `0.36–0.56`, independent hammered/course relief. No blue roof, verdigris or aurora tint.
- Dark timber walls/frame/nests: brown albedo (`#37231D` / `#603C2B`), dielectric, roughness `0.84–0.94`, directional grain.
- Charcoal stone foundation/chimney: cool dark grey (`#3D454F` / `#78828D`), dielectric, roughness about `0.9`, course relief and cavity AO.
- Wind-packed snow: off-white (`#EEF5FA`) with cool shadow (`#BCCCE6`), dielectric, roughness about `0.82`, rounded geometry where the cap affects silhouette.
- Egg shell: warm ivory (`#F6E6C7`) with sparse muted brown-purple spots, roughness about `0.42`, subtle shell pore normal.
- Windows/heaters: localized amber (`#FFBE4A`) emission behind opaque timber/copper surrounds; intensity remains presentation-phase controlled.

Runtime source evidence: `createIsland3FrostmoonMaterials()` in `src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts` already provides separate albedo textures and independent scalar PBR channels. The Snowfeather rebuild reuses those materials and adds geometry-level identity; it does not bake concept lighting into albedo.
