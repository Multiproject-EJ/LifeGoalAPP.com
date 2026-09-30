# Island 007 retained V2 preview

User approved merging the current visual progress on 2026-09-30. This is a retained preview milestone, not final 10/10 or production rollout approval.

Includes real 3D reef environment, original authored palace/hatchery and outer landmarks, green daytime growth, night bioluminescence, sea-glass board finish, sunlight shafts and manta upgrade. Existing DEV query gates remain required. Canonical route, gameplay actions and construction levels remain unchanged.

Validation: V047 TypeScript and production build passed; high/low day/night captures were source-stable with no runtime errors. V050 compact-root diagnostic remains opt-in only; its TypeScript and captures passed. Physical-device acceptance and final visual approval remain open.

Retired palace, whale, ceiling and terrain alternatives are deliberately excluded from this commit. Their source and immutable evidence remain in the authoring worktree.

Terrain source attribution: some authored geological volumes derive from Rico Cilliers’ Poly Haven boulder_01, CC0. Provenance, URL and source hashes are preserved in the shipped asset manifests. Other procedural meshes and surface shaders were authored for this island.
