# Island visual reference packets

Every active actual-3D island keeps its durable cross-chat visual working set
at:

`docs/visual-references/island-NNN-<slug>/`

Required packet:

```text
README.md
manifest.v1.json
NNN-source.<ext>
derived-crops/
secondary-inferred/
```

The per-island README is the start-here page. The manifest records hashes,
authority, derivation, landmark purpose, provenance and production pointers.
Exact source always outranks exact crops, and exact crops always outrank
generated side/back inference.

Before a temporary or chat-supplied image informs production, copy it into the
packet and add it to the manifest. Generated references also require a
neighboring provenance sidecar. Runtime assets remain in
`public/assets/islands/island-NNN/`; render evidence remains in
`work/island-visual-library/island-NNN-<slug>/evidence/`.

The completed first packet is
[`island-014-honeycomb-kingdom/`](./island-014-honeycomb-kingdom/README.md).
The governing requirements are in
[`ISLAND_VISUAL_PRODUCTION_CONTRACT.md`](../gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md)
and
[`ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`](../gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md).
