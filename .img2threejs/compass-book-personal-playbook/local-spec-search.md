# Local specification search evidence

Collection: `core_3d`
Index fingerprint: `6857e5ab528b42ac12f4f411f862610a0bffce8e47aee3610a7603c318072fe8`

## Query 1

`hard surface radial mechanical control panel pivots sockets attachment instanced fasteners`

Relevant evidence:

- `core.runtime-hierarchy` — action-ready models require a root, component pivot groups, visual meshes, sockets, collider metadata/proxies, and destruction-group metadata (`grimoire/readiness/action_rigging.md`).
- `core.attachment-contract` — attached children record parent, parent socket, local start/end, contact type, and embed depth/overlap (`grimoire/readiness/joint_attachment.md`).
- `core.shader-mapping-uvcoordinate-system-conversion-attachment-hierarchy` — sub-parts use parent-child scene-graph transforms (`docs/raw/img2threejs-skill-dataset.json`, `categories.rendering_shader_mapping[14]`).
- `core.description-honest-uncertainty-single-image-limits-convention` — hidden surfaces stay explicitly undetermined rather than receiving fabricated exactness (`docs/raw/img2threejs-skill-dataset.json`, `categories.description_conventions[6]`).

## Query 2

`hammered brass enamel crystal PBR roughness bump AO emissive real time Three.js`

Relevant evidence:

- `core.pbr-color-space-srgb-vs-linearnocolorspace` — base color and emissive are color data; normal, roughness, metalness, and AO remain linear data channels (`docs/raw/img2threejs-skill-dataset.json`, `categories.material_pbr[11]`).
- `core.pbr-hand-painted-vs-pbr-texture` — dynamic lighting response requires independent PBR channels rather than baked highlights in albedo (`docs/raw/img2threejs-skill-dataset.json`, `categories.material_pbr[12]`).
- `core.pbr-orm-channel-packing` and `core.shader-mapping-orm-packed-texture-assignment` — AO, roughness, and metalness may be packed for runtime efficiency but retain distinct decoded roles (`docs/raw/img2threejs-skill-dataset.json`, `categories.material_pbr[10]` and `categories.rendering_shader_mapping[13]`).

These results constrain the Chapter VI spec: every flight module must have a real pivot/socket hierarchy, every connector needs an attachment contract, hidden backs remain inferred, and material channels remain semantically independent even if packed for performance.
