# HabitGame — Current Audio Inventory (as-built)

**Status:** Factual audit of what is in the repo **today**. Updated 2026-07-31.
**Parent:** `docs/audio/00_AUDIO_MASTER_PLAN.md`

This is the "you are here" document. Everything below was verified by reading the repo, not from memory. When you change the audio layer, **update this file in the same PR** — it is the baseline the plan measures progress against.

---

## 1. One-page summary

| | Count | Notes |
|---|---|---|
| Audio files in repo | **15** | 8 "music", 7 SFX |
| Total on disk | **~11 MB** | all committed to git |
| Broken files (2-byte stubs) | **2** | neither is in a live board context |
| Orphaned files (no code reference) | **1** | `Egg_hatched.mp3` |
| Typed SFX events | **31** | mapped onto **7 files** |
| SFX events with a unique asset | **7** | the other 24 borrow — and all 7 sources are placeholders |
| Approved (non-placeholder) SFX | **0** | every SFX file and procedural sound is a placeholder |
| Approved music tracks | **5** | Suno Pro originals — keep, do not regenerate |
| SFX events declared but never fired | **1** | `market_stop_complete` |
| Music track IDs | **5** | one dormant ID points at a broken file |
| Ambience beds | **1** | dedicated single-loop engine, independent of music |
| Places music is wired | **1** | `IslandRunBoardPrototype.tsx` only |
| SFX call sites | **174** | across 9 files |
| Audio test suites | **3** | ambience, music, and SFX suites are wired into `npm run test:island-run` |
| Audio asset validator | **0** | none exists |

**The headline:** the *engineering* is in decent shape — typed events, throttling, haptics pairing, diagnostics, graceful degradation, and real tests. The *content* splits sharply in two:

- **Music — ✅ good.** The five real tracks are approved Suno Pro originals. Keep them. The only music problems are two empty stub files and one orphan.
- **Sound effects — 🔶 all placeholder.** Every one of the 7 shipped SFX files and all 9 procedural UI sounds is a placeholder of unacceptable quality. The dice roll, tile land and button clicks are the worst offenders. 174 call sites are firing into those 7 bad files.

---

## 2. Files on disk

### 2.1 `public/assets/audio/music/` — 8 files, ~10.9 MB

| File | Size | Referenced by | Status |
|---|---|---|---|
| `Island dreamy relaxing night islands.mp3` | 3.49 MB | `islandRunAmbience.ts` → continuous world bed | ✅ **approved — keep** |
| `Lantern Tide.mp3` | 3.53 MB | `islandRunMusic.ts` → `market-lounge` | ✅ **approved — keep** |
| `luxury-reward-loop-v1.mp3` | 1.45 MB | `islandRunMusic.ts` → `luxury-reward` | ✅ **approved — keep** |
| `event-jackpot-loop-v1.mp3` | 1.28 MB | `islandRunMusic.ts` → `event-jackpot` | ✅ **approved — keep** |
| `new-island-celebration-loop-v1.mp3` | 926 KB | `islandRunMusic.ts` → `new-island-celebration` | ✅ **approved — keep** |
| `Egg_hatched.mp3` | 289 KB | **nothing** | ✅ approved audio, ⚠️ **orphaned** — wire it up |
| `boss-rhythm-duel-loop-v1.mp3` | **2 bytes** | dormant `islandRunMusic.ts` mapping → `boss-rhythm-duel` | 🔴 **stub, not currently selected** |
| `market-lounge-loop-v1.mp3` | **2 bytes** | nothing (ID points at Lantern Tide) | 🔴 stub, unreferenced |

Note the naming inconsistency: three files use the `*-loop-v1.mp3` convention, three use human titles with spaces and capitals. URL-encoding a filename with spaces works but is a papercut every time it's referenced.

### 2.2 `public/assets/audio/sfx/` — 7 files, 40 KB — 🔶 **ALL PLACEHOLDER, LOUDLY NAMED**

None of these are approved. All seven are stand-ins of unacceptable quality and are scheduled for regeneration (`02_SFX_ASSET_MANIFEST.md` §0). The 40 KB total is itself a tell — real recorded effects at these durations run 3–15 KB each *after* trimming, and these are carrying eight events apiece.

Every file on disk carries a **`.PLACEHOLDER.mp3`** suffix (e.g. `sfx_dice_roll.PLACEHOLDER.mp3`) so it cannot be mistaken for a finished asset in a file browser, a diff, or the network tab. `SOUND_ASSET_MAP` in `islandRunAudio.ts` points at these `.PLACEHOLDER.mp3` paths. **When a real replacement lands, drop the suffix** (file becomes `sfx_dice_roll.PLACEHOLDER.mp3` again), update `SOUND_ASSET_MAP`, and remove the path from `PLACEHOLDER_SOUND_ASSET_PATHS`.

| File on disk | Size | Serves how many events | Status |
|---|---|---|---|
| `sfx_island_clear.PLACEHOLDER.mp3` | 9.6 KB | 4 | 🔶 placeholder |
| `sfx_egg_open.PLACEHOLDER.mp3` | 7.5 KB | 3 | 🔶 placeholder |
| `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | 6.9 KB | **7** | 🔶 placeholder — worst offender |
| `sfx_market_success.PLACEHOLDER.mp3` | 5.0 KB | 2 | 🔶 placeholder |
| `sfx_dice_roll.PLACEHOLDER.mp3` | 4.4 KB | 3 | 🔶 placeholder — called out as poor |
| `sfx_shop_open.PLACEHOLDER.mp3` | 4.2 KB | 4 | 🔶 placeholder |
| `sfx_tile_land.PLACEHOLDER.mp3` | 2.9 KB | **8** | 🔶 placeholder — worst offender |

### 2.3 Elsewhere

- `public/assets/animations/` — 6 `.webm` files (fireworks, pack opening, gift box, crystal egg). **Video, silent**; they are the visual half of moments that currently have borrowed audio.
- `public/storyline/episode-001/` — `.webp` panels and one `.mp4`. **No audio.**
- `public/islands/` — **no audio.**

---

## 3. Code inventory

### 3.1 `src/features/gamification/level-worlds/services/islandRunAudio.ts` — the SFX + haptics service

482 lines. Genuinely well built:

- 31 typed `IslandRunSoundEvent`s, 17 typed `IslandRunHapticEvent`s
- Per-event throttling (default 40 ms; 90 ms for `token_move`, 70 ms for `reward_bar_fill`, 110 ms for `tech_item_poof`)
- Lazy `HTMLAudioElement` cache, clones for overlapping playback
- Failed assets remembered in a `Set` so a missing file is tried once, not every fire
- `playTokenMoveSound()` randomises `playbackRate` across 4 presets to fake sample variation
- Haptics respect `prefers-reduced-motion`, the app-wide `HapticMode`, and a 60 ms per-event throttle
- Full diagnostics surface (`getIslandRunAudioDiagnostics()`) with attempt/failure counters and last-event status
- Missing files, decode failures and autoplay rejection are all silent no-ops

**The gap is purely assets.** Swapping in real files is a change to one object literal.

Placeholder state is now marked in code: `PLACEHOLDER_SOUND_ASSET_PATHS` lists every path still served by placeholder audio, exposed via `isPlaceholderSoundAsset()` / `getPlaceholderSoundEvents()` and surfaced in diagnostics as `placeholderEventCount` and `lastSoundWasPlaceholder`. **Remove a path from that set as its real asset lands; the set reaching empty means SFX content is done.**

#### The event → asset map, as shipped

| Event | Asset | Unique? |
|---|---|---|
| `roll` | `sfx_dice_roll.PLACEHOLDER.mp3` | ✅ |
| `reward_bar_fill` | `sfx_dice_roll.PLACEHOLDER.mp3` | ❌ |
| `coin_flip` | `sfx_dice_roll.PLACEHOLDER.mp3` | ❌ |
| `stop_land` | `sfx_tile_land.PLACEHOLDER.mp3` | ✅ |
| `token_move` | `sfx_tile_land.PLACEHOLDER.mp3` | ❌ |
| `build_upgrade` | `sfx_tile_land.PLACEHOLDER.mp3` | ❌ |
| `island_travel` | `sfx_tile_land.PLACEHOLDER.mp3` | ❌ |
| `multiplier_cycle` | `sfx_tile_land.PLACEHOLDER.mp3` | ❌ |
| `encounter_trigger` | `sfx_tile_land.PLACEHOLDER.mp3` | ❌ |
| `encounter_resolve` | `sfx_tile_land.PLACEHOLDER.mp3` | ❌ |
| `utility_stop_complete` | `sfx_tile_land.PLACEHOLDER.mp3` | ❌ |
| `egg_open` | `sfx_egg_open.PLACEHOLDER.mp3` | ✅ |
| `egg_set` | `sfx_egg_open.PLACEHOLDER.mp3` | ❌ |
| `egg_ready` | `sfx_egg_open.PLACEHOLDER.mp3` | ❌ |
| `market_purchase_success` | `sfx_market_success.PLACEHOLDER.mp3` | ✅ |
| `market_stop_complete` | `sfx_market_success.PLACEHOLDER.mp3` | ❌ *(never fired)* |
| `boss_island_clear` | `sfx_island_clear.PLACEHOLDER.mp3` | ✅ |
| `boss_trial_start` | `sfx_island_clear.PLACEHOLDER.mp3` | ❌ |
| `boss_trial_resolve` | `sfx_island_clear.PLACEHOLDER.mp3` | ❌ |
| `island_travel_complete` | `sfx_island_clear.PLACEHOLDER.mp3` | ❌ |
| `shop_open` | `sfx_shop_open.PLACEHOLDER.mp3` | ✅ |
| `market_purchase_attempt` | `sfx_shop_open.PLACEHOLDER.mp3` | ❌ |
| `market_insufficient_coins` | `sfx_shop_open.PLACEHOLDER.mp3` | ❌ |
| `minigame_open` | `sfx_shop_open.PLACEHOLDER.mp3` | ❌ |
| `reward_bar_claim_burst` | `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | ✅ |
| `reward_bar_cascade` | `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | ❌ |
| `sticker_complete` | `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | ❌ |
| `minigame_complete` | `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | ❌ |
| `multiplier_max` | `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | ❌ |
| `coin_reveal` | `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | ❌ |
| `tech_item_poof` | `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | ❌ |

**7 unique / 24 borrowed.** Note `market_insufficient_coins` — a *failure* — plays the same sound as opening the shop. And `minigame_complete` plays the same sound as `coin_reveal`, `sticker_complete` and `multiplier_max`.

### 3.2 `src/features/gamification/level-worlds/services/islandRunMusic.ts` — adaptive music

The adaptive channel now has explicit intentional-quiet semantics:

- 5 track IDs, crossfade in/out with configurable `fadeMs` (default 650 ms)
- **Playlist support** with sequential advance via `onended`
- Token-based cancellation so overlapping context switches don't fight
- `resolveIslandRunMusicContext()` — a pure function mapping game state → music context, unit tested
- Guarantees a single active track (`stopOtherIslandRunMusicTracks`)
- `preload="none"` already set — the file is *already* streaming-friendly

Current context resolution:
```
showIslandClearCelebration  → track  'new-island-celebration'
showShopPanel               → track  'market-lounge'
isDormantDoorMiniGameOpen    → track  'dormant-door-match'
otherwise                   → none (intentional quiet over the ambient bed)
```

### 3.2a `islandRunAmbience.ts` + `islandRunAudioPreferences.ts`

- One approved world-bed loop, owned separately from adaptive music.
- Reapplying active state is idempotent; it cannot create a duplicate loop.
- Backgrounding pauses without resetting the playhead; foregrounding resumes.
- Turning ambience off pauses and resets it.
- Ambience, music, and SFX are read directly from the canonical store.
- UI controls dispatch `applyAudioPreferencesMarker`; React no longer mirrors
  preferences and writes them back from an effect.
- The existing persisted `audioEnabled` field stores the ambience preference as
  a compatibility bridge, while `musicEnabled` and `sfxEnabled` remain
  independent. No database migration is required.

### 3.3 `src/utils/audioUtils.ts` — procedural UI sounds — 🔶 **ALL PLACEHOLDER**

135 lines of Web Audio oscillator synthesis. Zero assets, zero latency — and they sound like beeps, because that is literally what they are. The button/tap sounds are among the most-fired sounds in the app and the first thing a new player hears. The whole file carries a placeholder banner and every UI sound is Tier 1 for replacement. Exposes `playTone`, `playChime`, `playCoinJingle`, `playSweep`, `playClick`, `playCelebrationCascade`, `playFooterClickSound`, `playLauncherOpenSound/CloseSound`.

Gated by its own module-level `soundEffectsEnabled` flag — **separate from the Island Run `sfxEnabled` flag**. Two independent mute systems exist (see §5.4).

Used by 5 files: `MobileFooterNav` (7), `TaskTower` (7), `DailyHabitTracker` (6), `VisionQuest` (3), `App.tsx` (2).

### 3.4 `src/features/gamification/games/boss-rhythm/bossRhythmAudio.ts` — procedural music engine

309 lines. Synthesises kick/snare/hats/bass from the battle's beat grid, sample-accurate against `audioCtx.currentTime`, plus a full SFX palette (fire, hit, miss, hurt, shield, explosion, count-in ticks). Falls back to a silent `performance.now()` clock with pause accounting when Web Audio is blocked.

**Do not replace this with generated audio, and do not treat it as a placeholder.** Rhythm-game charts must stay locked to the audio clock; an MP3 would drift. This is the one procedural system that is correct as-is.

### 3.5 Other independent audio systems

| Location | What it does | Shares the audio layer? |
|---|---|---|
| `src/features/timer/TimerTab.tsx` | Own `AudioContext`, own oscillator chime, own `silent` preference | ❌ independent |
| `src/features/meditation/MeditationSessionPlayer.tsx` | Own `AudioContext`, gong at configurable intervals, own toggle | ❌ independent |
| `src/features/story/StoryPlayer.tsx` | Own `HTMLAudioElement`, own `audioEnabled` state (**defaults to `false`**) | ❌ independent |

### 3.6 Preferences — where the flags live

| Flag | Where | Scope |
|---|---|---|
| `musicEnabled` | Island Run runtime state, persisted to backend | Island Run only |
| `sfxEnabled` | Island Run runtime state, persisted to backend | Island Run only |
| `audioEnabled` | Island Run runtime state, persisted to backend | compatibility field for world ambience |
| `hasConfirmedEntryAudioChoice` | derived from the entry modal | gates *all* Island Run audio |
| `soundEffectsEnabled` | module-level in `audioUtils.ts` | app-wide procedural sounds |
| `lifegoal.soundEffects.enabled` | localStorage, via `soundPreferences.ts` | app-wide, synced to `profiles.sound_effects_enabled` |
| `audioEnabled` (story) | React state in `StoryPlayer` | story reader only, defaults off |
| `silent` mode | `TimerTab` | timer only |
| gong toggle | `MeditationSessionPlayer` | meditation only |
| `HapticMode` | `completionHaptics.ts`, app-wide | haptics |

**Seven independent mute surfaces.** The audio-split proposal landed for Island Run; the rest of the app never joined.

### 3.7 Tests

`islandRunAudio.test.ts`, `islandRunAmbience.test.ts`, and
`islandRunMusic.test.ts` are registered in `runIslandRunServiceTests.ts` and run
by **`npm run test:island-run`**.

They cover throttling, independent channel resolution, the disabled gate,
diagnostics, asset-failure memoisation, single-loop ambience ownership,
playhead-preserving lifecycle suspension, contextual music resolution, and
playlist advance. They assert against **asset paths**, not audio content — so
they will keep passing with a 2-byte file.

---

## 4. Where sound actually fires — 174 call sites

| File | Calls |
|---|---|
| `IslandRunBoardPrototype.tsx` | **79** |
| `FortuneEngineMinigame.tsx` | 28 |
| `SpaceExcavatorMinigame.tsx` | 20 |
| `IslandWorkshopMinigame.tsx` | 15 |
| `CompanionFeastMinigame.tsx` | 13 |
| `CreaturePackOpeningPrototypeModal.tsx` | 5 |
| `CalendarDoorUnwrap.tsx` | 5 |
| `CalendarDoorFlip.tsx` | 5 |
| `CountdownCalendarModal.tsx` | 4 |

Most-fired events: `market_purchase_success` (10), `reward_bar_fill` (9), `minigame_open` (9), `token_move` (8), `minigame_complete` (7), `reward_bar_claim_burst` (6), `coin_flip` (6).

**Four mini-games already fire 76 sound events between them** using the generic Island Run vocabulary. They have no bespoke sounds and no music of their own — `FortuneEngineMinigame` fires 28 sound calls and every one resolves to one of the same 7 files.

---

## 5. Defects and gaps found

### 5.1 ✅ Normal-board dead-air failure removed

The normal board no longer runs a fragile music playlist. It always has the
independent approved world bed when ambience is enabled, while the adaptive
music channel is intentionally quiet until a celebration, shop, or Dormant
Door cue. The 2-byte boss stub is no longer reachable from the live board
resolver, but should still be removed or replaced in Phase 0.

### 5.2 🔴 Second stub file

`market-lounge-loop-v1.mp3` is also 2 bytes. Currently harmless — the `market-lounge` ID points at `Lantern Tide.mp3` — but it is a trap for anyone who "corrects" the mapping to match the ID name.

### 5.3 ⚠️ Orphaned asset

`Egg_hatched.mp3` (289 KB) has no reference anywhere in `src/`, `public/` or `scripts/`. The audio itself is approved — **wire it to the hatch moment**, don't delete it.

### 5.3b 🔶 Every sound effect in the app is a placeholder

Distinct from the "24 events borrow a sound" problem, and worse: the 7 sounds they borrow are themselves unacceptable, as are the 9 procedural UI sounds. Fixing only the sharing would leave 31 events playing 31 *different* bad sounds.

Both halves are covered by `02_SFX_ASSET_MANIFEST.md`; the existing 7 are now marked ★ Tier 1 alongside the missing ones.

### 5.4 ⚠️ Seven independent mute surfaces

Turning off "sound" in one place does not turn it off elsewhere. A player who mutes Island Run still gets footer clicks from `audioUtils`. There is no master volume anywhere.

### 5.5 ⚠️ Dead event

`market_stop_complete` is declared, mapped and has a haptic pattern, but is never fired from any call site.

### 5.6 ⚠️ No validator

Nothing checks that audio assets exist, are non-trivial, or are unique. The repo
has validators for island art (`check:island-art-assets`), template kits and
visual production briefs — audio has none. A 2-byte MP3 passed review without a
failing check. `PLACEHOLDER_SOUND_ASSET_PATHS` now makes stand-ins visible in
runtime diagnostics, but there is still no `check:audio-assets` script.

### 5.7 ⚠️ Music is wired in exactly one component

`IslandRunBoardPrototype.tsx` is the only place that calls the music engine. The Vault, all mini-games, Build, Story, daily treats and every app-level surface have **no music path at all**.

### 5.8 ✅ Story soundtrack: built, validated, and completely unused

`StorySoundtrackConfig` exists in `storyTypes.ts`, `StoryPlayer` implements per-scene and per-manifest soundtracks with volume and loop control, and `islandStoryManifestValidation.ts` validates it with test coverage.

**No island narrative defines a `soundtrack`.** The entire feature is finished and waiting on files — the cheapest win in the whole plan. Note that `StoryPlayer`'s `audioEnabled` defaults to `false`, so it will also need to default on once real tracks exist.

---

## 6. What this means for the plan

Mapping the audit onto `00_AUDIO_MASTER_PLAN.md`:

| Plan phase | What the audit says |
|---|---|
| **Phase 0 — Unblock** | Still necessary: two dormant stub files, one orphan, no validator. The live normal-board failure is already removed. |
| **Phase 1 — SFX** | **Bigger content-wise than first estimated, still cheap code-wise.** The service, throttling, haptics, diagnostics and tests all exist, so 24 of 31 events need only a file. But the 7 existing files and the 9 procedural UI sounds are *also* placeholders, so Phase 1 is a full SFX replacement (116 Tier-1 sounds), not a gap-fill. The AudioBuffer migration remains an optimisation, not a prerequisite. |
| **Phase 2 — Radio** | Engine is ~60% there: crossfade, playlists, single-track guarantee, cancellation tokens and `preload="none"` all exist. Missing: station model, sticky player choice, playhead-preserving resume, Now Playing UI, CDN base URL. |
| **Phase 3 — Surfaces** | Biggest content lift. 76 mini-game call sites resolve to shared files; story soundtrack is a finished feature with zero content. |
| **Phase 4 — Offline** | Nothing exists. Fully greenfield. |
| **Phase 5 — Voice** | Nothing exists. Fully greenfield. |

### Recommended first three PRs

1. **Phase 0** — replace both stubs, resolve the orphan, add `scripts/validate-audio-assets.mjs` + `npm run check:audio-assets` in CI.
2. **Story soundtrack content** — 4 mood pads wired into island narrative manifests. Zero new code; flip `StoryPlayer`'s `audioEnabled` default. Highest ratio of felt improvement to effort in the repo.
3. **SFX Tier 1 drop** — generate the ★ list from `02_SFX_ASSET_MANIFEST.md` (116 sounds, including regenerating all 7 existing files), update `SOUND_ASSET_MAP`, empty out `PLACEHOLDER_SOUND_ASSET_PATHS` as assets land, delete the apology comments. No architectural change.

   Suggested order within the drop, by how often the player hears it: **UI taps → dice roll → tile land/token hop → coins and reward bar → everything else.** The first three are ~40% of all sound the player experiences.

---

## 7. Keeping this file honest

Update this document in the same PR whenever you:

- add, remove or rename a file under `public/assets/audio/`
- add or remove an `IslandRunSoundEvent` / `IslandRunMusicTrackId`
- change `SOUND_ASSET_MAP` or the board playlists
- introduce a new audio system anywhere in the app
- add or move a mute/volume preference

The `check:audio-assets` script proposed in the master plan (§8) mechanises most of §2 and §5 — once it exists, this file only needs prose updates.
