# Aurora Keep material evidence

The approved source is a stylized multi-view production sheet rather than a de-lit material scan. Exact inverse-rendered PBR maps are therefore not claimed. The runtime uses independent procedural color and roughness responses already established for Frostmoon, with bounded adjustments from the visible target:

- Frost stone: neutral charcoal `#3d454f`/`#78828d`, dielectric, roughness 0.92–0.96, procedural block-course texture.
- Dark timber: near-black brown `#2f211d` with warmer structural faces `#603c2b`, dielectric, roughness 0.84–0.92, procedural longitudinal grain.
- Warm copper roofs: brown `#6f3825` to orange `#a95f38`, metalness 0.70–0.76, roughness 0.38–0.46, separate procedural roof pattern and restrained clearcoat.
- Brass rings/hardware: warm `#c88942`, metalness 0.78, roughness 0.36, used only on engineered accents.
- Cream infill: warm plaster `#d7c9ae`, dielectric, roughness about 0.86. Runtime approximation uses the existing warm matte paper/plaster family where a dedicated material is unnecessary.
- Snow: neutral pale `#eaf4ff`, dielectric, roughness about 0.8. It sits as separate geometry and never recolors copper blue.
- Windows and lanterns: amber `#ffd48a` with `#ff8a2a` emissive response; intensity remains phase-controlled by the existing presentation-only ambience system.

No source channel is reused as an unrelated roughness, normal or AO map. The material route is procedural PBR because the keep must remain coherent from five views and transition through day, blizzard, dusk and night.
