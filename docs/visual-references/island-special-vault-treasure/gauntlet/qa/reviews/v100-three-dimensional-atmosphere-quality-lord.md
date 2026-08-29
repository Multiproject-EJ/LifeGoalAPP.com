# Vault Island v100 three-dimensional atmosphere Quality Lord

## Verdict

Approved as the production-safe atmosphere baseline. No hard vetoes. This is not the final exterior art lock.

## Evidence inspected

- Original Treasure Island source and the previous accepted v085 phone exterior.
- Rejected v086-v099 atmosphere iterations covering shader failure, finite water edges, flat custom shading, camera clamps, and over-wide framing.
- Full v100 browser gauntlet: 24 captures, 22 interactions, 18 runtime snapshots, and zero browser diagnostics at 390x844.
- Front, rear, left, right, and top-oblique exterior angles plus every interior, collection, reserve, and treasure-lab state.

## Scores

| Gate | Score | Finding |
| --- | ---: | --- |
| Real-time 3D integrity | 0.97 | Sky, water, clouds, sun, islands, boats, and palace remain spatial and orbit-consistent; no bitmap background is used. |
| Water material and motion | 0.92 | Reflective Three.js Water, deterministic moving normals, submerged reef color, foam arcs, and boat bobbing read clearly without storm-scale waves. |
| Phone composition | 0.91 | The palace remains inspectable, the gate stays visible, and the scene retains enough surrounding sea and sky for atmosphere. |
| Sunset atmosphere | 0.87 | Warm sky, physical sun/halo, and cloud volumes establish golden hour, but the distant horizon can support stronger color separation later. |
| Source identity | 0.91 | White-and-gold palace, navy domes, bracelet perimeter, collection galleries, marina gate, and open-ocean setting remain immediately recognizable. |
| Runtime stability | 0.96 | The complete capture flow passed with varied canvas pixels, expected collection counts, working interactions, and no diagnostics. |

## Gauntlet delta

The old exterior used a borrowed static Island 004 ocean image, which looked stormy and did not move spatially with the Vault world. v100 removes that dependency. The exterior now uses Three.js `Sky` and `Water`, a generated repeating normal field, a submerged seabed and reef layer, three animated cloud banks, a physical sunset sun and halo, four horizon islets, four nearer islets, and three bobbing sailboats.

The capture loop also exposed two camera constraints that repeatedly restored the old crop. The exterior orbit maximum and initial control target now match the authored phone camera, so the player and QA runner receive the same first frame.

## Next visual target

Keep the accepted water, camera, and runtime foundation. The next embellishment should replace the small distant-island clusters with richer authored silhouettes and deepen the turquoise-to-champagne horizon transition without enlarging waves or tightening the island crop.
