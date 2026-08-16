# Island Run Content Packs, Reuse and Multi-Volume Strategy

Status: **approved product direction; implementation proof pending**

Approved by Eivind: **2026-08-16**

Scope: Island Run Volume I (Islands 001–120), Volume II and later volumes

## Mission

Let HabitGame grow to hundreds of visually rich, revisit-able islands without
requiring every playable island asset to remain installed on every phone.
Preserve the delight of genuinely new hero worlds while deliberately reusing
strong world foundations when a compact variant can create a meaningfully
different experience.

This is a scale and delivery contract. It does not change canonical board
topology, progression, rewards, state ownership or Island Run gameplay writes.

## Current evidence

The 2026-08-16 worktree audit found:

- `dist/`: approximately **201 MiB** on disk;
- copied Capacitor web payload under `ios/App/App/public/`: approximately
  **195 MiB**;
- `public/assets/islands/`: approximately **84 MiB**;
- Islands 001–006 account for nearly all of that island raster footprint;
- the newer procedural Islands 008–010 each use less than 1 MiB of deployed
  island-specific raster assets, although their world factories are currently
  compiled into the application.

The immediate app size is acceptable. The current copy-everything native
delivery model is not the intended architecture for 120+ islands.

## Approved strategic decisions

1. **Revisit-able does not mean permanently installed.** The complete island
   archive and player progress remain visible while playable island packs may
   be downloaded, evicted and downloaded again.
2. **The application keeps a bounded cache.** It retains the active island,
   likely next islands, recent islands and player-pinned favourites. Old
   unpinned packs may be evicted without deleting progress.
3. **Island production becomes pack-aware now.** New production briefs must
   name their delivery tier, reuse classification and expected deployed bytes.
4. **Reuse is encouraged when it creates a new feeling.** A dusk, winter,
   festival, damaged, haunted, overgrown, restored or bioluminescent state can
   reuse a strong base world through a small overlay rather than duplicating
   the whole island.
5. **Reuse must not become disguised repetition.** Reuse geometry and shared
   materials; do not merely recolour an island and call it a new civilization.
6. **Hero islands are deliberate exceptions.** The size targets are defaults,
   not absolute creative ceilings. A larger island may ship after an explicit
   quality/value/download review.
7. **Island 001 is the entry hero.** It is the highest-risk retention island,
   must be available immediately, and deserves a separate visual/onboarding
   quality pass even if it is larger than a normal island.
8. **Downloaded content is assets and validated data, not executable code.**
   Shared gameplay, rendering and mission primitives remain compiled in the
   reviewed app. A genuinely new mechanic requires a normal app release.

## Content layers

### 1. Essential core

Always installed:

- application shell, shared renderer and canonical gameplay;
- controller, dice, HUD, modal and accessibility systems;
- common materials, fallbacks and essential audio;
- Island 001 and its onboarding-critical content;
- lightweight complete island catalogue and progress summaries;
- offline/error/download UI.

### 2. Shared dependency packs

Reusable, independently versioned families:

- forest/bamboo, ice, lava, flower, reef and space material libraries;
- shared vegetation, rocks, water, particles and ambient audio;
- common inhabitants, creatures and construction props;
- optional quality upgrades such as high-resolution textures or cinematics.

An island references these dependencies. It does not copy them into its own
folder or remote pack.

### 3. Island delta packs

Island-specific content only:

- manifest and validated visual/mission configuration;
- unique textures, models, backgrounds, audio and cinematics;
- island-specific landmark and character differences;
- catalogue thumbnail and download metadata.

### 4. Variant overlays

Small packs layered over one base world family:

- lighting, sky and atmospheric state;
- material overrides and emissive networks;
- vegetation/prop additions and seasonal dressing;
- inhabitants, dialogue, music and ambience;
- landmark state or mission-specific visual changes.

Variant packs declare their base and shared dependencies. They never contain
copied duplicates of those files.

## Reuse quality rule

A later island may reuse a base terrain/world family when the production brief
declares it intentionally. The new experience must alter at least:

- **two sensory systems**, such as lighting/sky, material response,
  vegetation, audio, weather or inhabited ambience; and
- **one experiential system**, such as civilization, mission, landmark state,
  guardian, story consequence or traversal presentation.

Examples:

- Rootheart by day versus the completed Heartlight dusk state is an excellent
  state variant inside Island 010.
- A later storm-damaged or winter Rootheart descendant could reuse structural
  DNA if its people, mission, landmark story and ambience create a genuinely
  different visit.
- Changing only green leaves to purple leaves is not sufficient.

Every reused candidate receives a side-by-side phone comparison. If the
emotional read, silhouettes and story are not distinct within a few seconds,
it remains a state of the original island rather than a new numbered island.

## Delivery and cache model

The complete catalogue is lightweight and always browseable. Playability is a
separate local state:

```text
catalogued -> queued -> downloading -> verifying -> ready
                                      -> failed/retry
ready -> update available -> downloading/verifying -> ready
ready -> evicted (progress retained)
```

Recommended first cache policy:

- retain the active island;
- prefetch the next two islands when network/storage conditions allow;
- retain the previous three or most recently visited islands;
- never auto-evict player-pinned favourites;
- start with a **200 MiB optional island cache target**, then tune from device
  evidence;
- evict least-recently-used unpinned packs under pressure;
- show unloaded archive islands with a cloud/download state;
- make downloaded islands available offline;
- never couple pack removal to gameplay/progress deletion.

PWA and Capacitor use one logical pack API with different storage adapters:

- PWA: Cache Storage/IndexedDB plus service-worker integration;
- Capacitor: native filesystem plus a bounded local pack index;
- future Android: the same product contract, with Play Asset Delivery evaluated
  where it provides a meaningful platform advantage.

Platform-managed delivery may be adopted later, but the first proof must not
make island correctness depend on one operating system.

## Pack manifest requirements

The implementation schema may evolve, but every activated pack must provide:

```json
{
  "packId": "island-010-rootheart",
  "kind": "island-delta",
  "version": 1,
  "minimumAppVersion": "1.0.0",
  "dependencies": ["biome-forest-v1", "shared-waterworks-v1"],
  "basePackId": null,
  "compressedBytes": 0,
  "installedBytes": 0,
  "files": [
    {
      "path": "background/night.webp",
      "bytes": 0,
      "sha256": "..."
    }
  ]
}
```

Activation must be atomic: download to staging, verify version/size/checksum,
then switch the active manifest. An interrupted or corrupt update leaves the
last verified pack playable.

## Production size tiers

These are planning targets and review thresholds, not automatic creative
rejections.

| Tier | Typical use | Target deployed delta | Review trigger |
| --- | --- | ---: | ---: |
| Variant overlay | dusk, season, restoration, festival | ≤1.5 MiB | >3 MiB |
| Standard island | ordinary unique island | 2–5 MiB | >8 MiB |
| Hero island | entry, arena, major story/technology | 8–15 MiB | >25 MiB |
| Cinematic exception | rare showcase with unique media | case-by-case | always explicit |

The per-image limit in `MOBILE_RUNTIME_IMAGE_BUDGET.md` still applies. Passing
that limit does not automatically make the total pack acceptable.

An override records:

- why the experience earns the additional bytes;
- what reuse/compression/deduplication was attempted;
- compressed download and installed size;
- first-load behavior on Wi-Fi and representative cellular conditions;
- cache impact and eviction behavior;
- physical-phone frame/memory evidence;
- the approver and date.

Large does not mean unoptimized. Hero islands receive more budget because they
create more player value, not because their production pipeline skipped
compression.

## Island 001 hero-entry decision

Island 001 is classified **Essential / Hero Entry**:

- bundled or installed before first playable entry;
- no blocking island download during the opening experience;
- receives a dedicated visual-quality, landmark, caretaker, story and
  onboarding audit;
- prioritizes immediate warmth, clarity, wonder and readable reward promise;
- may exceed the Standard tier after an explicit Hero review;
- should reuse shared systems aggressively so visual quality, not duplicate
  infrastructure, consumes its exception budget.

Its success evidence must include new-player phone recordings, controller/HUD
clearance, first-roll comprehension, landmark clickability, first caretaker
mission beat, frame performance and abandonment telemetry once available.

## Volume model

- Volume I is catalogue namespace `v1` / Islands 001–120.
- Volume II continues the same application and account history; it is not a
  second installed app.
- Catalogue entries and progress for all owned/unlocked volumes remain visible.
- Only the bounded playable cache is resident.
- A future “Download Volume for offline play” option may install a complete
  volume when the player explicitly chooses and storage permits.
- Shared dependencies may serve several volumes without duplication.

The remote catalogue may grow to gigabytes over years while ordinary device
storage remains bounded by core plus cache.

## Representative implementation proof

Do not mass-produce more islands against an unproven pack model. Implement in
small reversible slices:

### Slice A — inventory and schema

- produce a deterministic report of core, shared and per-island deployed bytes;
- define and validate the pack manifest and dependency graph;
- reject duplicate paths/checksums that should be shared;
- add budget tier and approved waiver fields to island production metadata.

### Slice B — cross-platform pack manager

- one interface for availability, download, verify, activate, update and evict;
- PWA and Capacitor storage adapters;
- atomic activation, retry, rollback and progress reporting;
- progress state remains independent from asset state.

### Slice C — two representative islands

- **Island 010** proves a modern procedural island can be pack-aware without
  downloading executable world code;
- **Island 005** (currently one of the heaviest island asset directories)
  proves that extraction materially reduces the native bundled payload;
- Island 001 remains essential and local.

### Slice D — revisit and pressure QA

- play, leave, evict and revisit both proof islands;
- verify saved landmark/mission/egg/progress state returns unchanged;
- offline open succeeds for ready packs and fails gracefully for unloaded ones;
- interrupted/corrupt downloads recover without a blank scene;
- storage pressure evicts only eligible packs;
- production PWA and physical Capacitor iOS evidence pass.

### Scale-up gate

New island production becomes pack-first only after the proof demonstrates:

- measurable reduction in the copied native web payload;
- no remote executable-code path;
- no gameplay writes from presentation/download UI;
- deterministic manifests and checksums;
- correct offline, rollback and revisit behavior;
- an understandable player download experience;
- release/build/test gates remain green.

## Authority and safety boundary

This strategy authorizes repository planning and reversible local proofs. It
does not authorize production hosting changes, paid CDN/storage purchases,
Supabase migrations, publishing, merging, App Store submission or deletion of
existing island assets without a verified migration and Eivind's explicit
approval.

## Stop conditions

Stop and reassess if:

- the pack layer attempts to download JavaScript or other executable gameplay;
- progress becomes unavailable when a pack is evicted;
- a shared dependency update can silently break multiple installed islands;
- the player sees a blank board during download/verification;
- the size system rewards low quality instead of efficient production;
- a reused island does not feel meaningfully different in side-by-side review.

## Handoff

Future island chats must read this strategy through the visual production
contract/playbook, classify the island as `new-base`, `variant-overlay` or
`hero-exception`, assign a pack tier, and record expected/actual deployed bytes
before declaring the island complete.
