# Hearthguard Yard material evidence

The goal image is stylized generated concept art rather than a calibrated photograph, so it cannot provide physically measured inverse-rendered maps. It is admitted as palette and material-class evidence only. The runtime continues using the independently relightable Frostmoon PBR material system.

| Runtime family | Visible evidence | Spec material | Runtime mapping |
| --- | --- | --- | --- |
| Charcoal stone | Low oval bevelled plinth, cool rough blocks | `stone` | `materials.frostRockDark` and existing foundation stone |
| Dark timber | Gate, fence, climbing frame and hut beams | `dark-timber` | `materials.timberDark` / `materials.timber` |
| Raw copper | Feather crown, roof, caps, target rims, brackets | `raw-copper` | existing warm `materials.indigoLight`, `materials.indigo` and `materials.brass` copper/bronze family |
| Rope | Fence rails, climbing ropes and lashings | `rope` | `materials.rope` where available, otherwise restrained tan timber/rope proxy |
| Snow | Upward-facing caps, roof courses and court dusting | `snow` | `materials.snow` |
| Amber light | Gate lanterns, hut lantern and brazier | `amber-glow` | `materials.windowGlow` and existing flame material |
| Burgundy cloth | Small training banner with copper sigil | `banner-cloth` | `materials.banner` with `materials.brass` sigil |

The production rule is explicit: no blue-painted roof and no northern-light emission. Copper, timber, stone, snow and amber light must remain separable through the existing day → blizzard → night lighting sequence.
