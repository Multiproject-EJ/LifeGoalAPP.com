# Island 001 Narrative Content Contract

Status: content foundation only. No runtime/UI integration is included in this PR.

## Canonical content source

Island 1 narrative beat definitions are canonical in TypeScript under `src/features/gamification/level-worlds/narrative/definitions/island001Narrative.ts`. StoryReader episode content remains JSON under `public/islands/001/story/` because `IslandStoryReader` already consumes JSON manifests. This PR intentionally does not add a duplicate `narrative.json` source.

## Read-only contract

The narrative registry and definitions are read-only content:

- no story queue,
- no seen-state tracking,
- no persistence/schema changes,
- no React imports,
- no gameplay imports,
- no action dispatching.

Gameplay remains authoritative through the existing Island Run canonical services. Narrative content may describe events, but it must not complete stops, resolve bosses, build landmarks, deliver rewards, mutate inventory, or perform travel.

## Reward and gameplay-authority prohibition

Narrative definitions and Island 1 StoryReader manifests reject gameplay-authority fields including reward/economy fields, tile-index fields, build/travel/boss/stop action fields, and callback/mutation fields. Display-only CTA text is permitted when it is not an action identifier.

## Island 1 scope

Island 1 is Luma Isle, home of The Lumin. The approved characters are Miri, Elder Sava, Poko, Captain Ivo, and Noctyra. The first restoration beat is Hatchery Level 1 completion, aligned to the sequential build system.

## Story content locations

- The existing global prologue remains in `public/storyline/episode-001/`.
- Island 1 arrival content lives in `public/islands/001/story/arrival/manifest.json`.
- Island 1 resolution content lives in `public/islands/001/story/resolution/manifest.json`.

No story UI is wired yet, so these manifests do not appear in the app after this PR. No permanent narrative feature flag is used.
