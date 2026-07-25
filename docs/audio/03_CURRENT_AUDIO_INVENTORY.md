# HabitGame — Current Audio Inventory (as-built)

**Status:** Factual audit of what is in the repo **today**. Audited 2026-07-25 against commit `7f77ea6`.
**Parent:** `docs/audio/00_AUDIO_MASTER_PLAN.md`

This is the "you are here" document. Everything below was verified by reading the repo, not from memory. When you change the audio layer, **update this file in the same PR** — it is the baseline the plan measures progress against.

---

## 1. One-page summary

| | Count | Notes |
|---|---|---|
| Audio files in repo | **15** | 8 "music", 7 SFX |
| Total on disk | **~11 MB** | all committed to git |
| Broken files (2-byte stubs) | **2** | one is in the live board playlist |
| Orphaned files (no code reference) | **1** | `Egg_hatched.mp3` |
| Typed SFX events | **31** | mapped onto **7 files** |
| SFX events with a unique asset | **7** | the other 24 borrow |
| SFX events declared but never fired | **1** | `market_stop_complete` |
| Music track IDs | **6** | one points at a broken file |
| Places music is wired | **1** | `IslandRunBoardPrototype.tsx` only |
| SFX call sites | **174** | across 9 files |
| Audio test suites | **2** | wired into `npm run test:island-run` |
| Audio asset validator | **0** | none exists |

**The headline:** the *engineering* is in decent shape — typed events, throttling, haptics pairing, diagnostics, graceful degradation, and real tests. The *content* is nearly absent. 174 call sites are firing into 7 sound files.

---

## 2. Files on disk

### 2.1 `public/assets/audio/music/` — 8 files, ~10.9 MB

| File | Size | Referenced by | Status |
|---|---|---|---|
| `Island dreamy relaxing night islands.mp3` | 3.49 MB | `islandRunMusic.ts` → `island-board-ambient` | ✅ real, in use |
| `Lantern Tide.mp3` | 3.53 MB | `islandRunMusic.ts` → `market-lounge` | ✅ real, in use |
| `luxury-reward-loop-v1.mp3` | 1.45 MB | `islandRunMusic.ts` → `luxury-reward` | ✅ real, in use |
| `event-jackpot-loop-v1.mp3` | 1.28 MB | `islandRunMusic.ts` → `event-jackpot` | ✅ real, in use |
| `new-island-celebration-loop-v1.mp3` | 926 KB | `islandRunMusic.ts` → `new-island-celebration` | ✅ real, in use |
| `Egg_hatched.mp3` | 289 KB | **nothing** | ⚠️ **orphaned** |
| `boss-rhythm-duel-loop-v1.mp3` | **2 bytes** | `islandRunMusic.ts` → `boss-rhythm-duel` | 🔴 **stub, and live** |
| `market-lounge-loop-v1.mp3` | **2 bytes** | nothing (ID points at Lantern Tide) | 🔴 stub, unreferenced |

Note the naming inconsistency: three files use the `*-loop-v1.mp3` convention, three use human titles with spaces and capitals. URL-encoding a filename with spaces works but is a papercut every time it's referenced.

### 2.2 `public/assets/audio/sfx/` — 7 files, 40 KB

| File | Size | Serves how many events |
|---|---|---|
| `sfx_island_clear.mp3` | 9.6 KB | 4 |
| `sfx_egg_open.mp3` | 7.5 KB | 3 |
| `sfx_reward_bar_claim_burst.mp3` | 6.9 KB | **7** |
| `sfx_market_success.mp3` | 5.0 KB | 2 |
| `sfx_dice_roll.mp3` | 4.4 KB | 3 |
| `sfx_shop_open.mp3` | 4.2 KB | 4 |
| `sfx_tile_land.mp3` | 2.9 KB | **8** |

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

#### The event → asset map, as shipped

| Event | Asset | Unique? |
|---|---|---|
| `roll` | `sfx_dice_roll.mp3` | ✅ |
| `reward_bar_fill` | `sfx_dice_roll.mp3` | ❌ |
| `coin_flip` | `sfx_dice_roll.mp3` | ❌ |
| `stop_land` | `sfx_tile_land.mp3` | ✅ |
| `token_move` | `sfx_tile_land.mp3` | ❌ |
| `build_upgrade` | `sfx_tile_land.mp3` | ❌ |
| `island_travel` | `sfx_tile_land.mp3` | ❌ |
| `multiplier_cycle` | `sfx_tile_land.mp3` | ❌ |
| `encounter_trigger` | `sfx_tile_land.mp3` | ❌ |
| `encounter_resolve` | `sfx_tile_land.mp3` | ❌ |
| `utility_stop_complete` | `sfx_tile_land.mp3` | ❌ |
| `egg_open` | `sfx_egg_open.mp3` | ✅ |
| `egg_set` | `sfx_egg_open.mp3` | ❌ |
| `egg_ready` | `sfx_egg_open.mp3` | ❌ |
| `market_purchase_success` | `sfx_market_success.mp3` | ✅ |
| `market_stop_complete` | `sfx_market_success.mp3` | ❌ *(never fired)* |
| `boss_island_clear` | `sfx_island_clear.mp3` | ✅ |
| `boss_trial_start` | `sfx_island_clear.mp3` | ❌ |
| `boss_trial_resolve` | `sfx_island_clear.mp3` | ❌ |
| `island_travel_complete` | `sfx_island_clear.mp3` | ❌ |
| `shop_open` | `sfx_shop_open.mp3` | ✅ |
| `market_purchase_attempt` | `sfx_shop_open.mp3` | ❌ |
| `market_insufficient_coins` | `sfx_shop_open.mp3` | ❌ |
| `minigame_open` | `sfx_shop_open.mp3` | ❌ |
| `reward_bar_claim_burst` | `sfx_reward_bar_claim_burst.mp3` | ✅ |
| `reward_bar_cascade` | `sfx_reward_bar_claim_burst.mp3` | ❌ |
| `sticker_complete` | `sfx_reward_bar_claim_burst.mp3` | ❌ |
| `minigame_complete` | `sfx_reward_bar_claim_burst.mp3` | ❌ |
| `multiplier_max` | `sfx_reward_bar_claim_burst.mp3` | ❌ |
| `coin_reveal` | `sfx_reward_bar_claim_burst.mp3` | ❌ |
| `tech_item_poof` | `sfx_reward_bar_claim_burst.mp3` | ❌ |

**7 unique / 24 borrowed.** Note `market_insufficient_coins` — a *failure* — plays the same sound as opening the shop. And `minigame_complete` plays the same sound as `coin_reveal`, `sticker_complete` and `multiplier_max`.

### 3.2 `src/features/gamification/level-worlds/services/islandRunMusic.ts` — the music engine

371 lines. Already does most of what the radio system needs:

- 6 track IDs, crossfade in/out with configurable `fadeMs` (default 650 ms)
- **Playlist support** with sequential advance via `onended`
- Token-based cancellation so overlapping context switches don't fight
- `resolveIslandRunMusicContext()` — a pure function mapping game state → music context, unit tested
- Guarantees a single active track (`stopOtherIslandRunMusicTracks`)
- `preload="none"` already set — the file is *already* streaming-friendly

Current context resolution:
```
showIslandClearCelebration  → track  'new-island-celebration'
showShopPanel               → track  'market-lounge'
otherwise                   → playlist (see below)
```

Board playlists:
```
dreamt island (every 10th): ['island-board-ambient', 'luxury-reward', 'boss-rhythm-duel']
all other islands:          ['luxury-reward', 'event-jackpot', 'boss-rhythm-duel']
```

**Both playlists end in `boss-rhythm-duel`, which is the 2-byte stub.** See §5.

### 3.3 `src/utils/audioUtils.ts` — procedural UI sounds

135 lines of Web Audio oscillator synthesis. Zero assets, zero latency. Exposes `playTone`, `playChime`, `playCoinJingle`, `playSweep`, `playClick`, `playCelebrationCascade`, `playFooterClickSound`, `playLauncherOpenSound/CloseSound`.

Gated by its own module-level `soundEffectsEnabled` flag — **separate from the Island Run `sfxEnabled` flag**. Two independent mute systems exist (see §5.4).

Used by 5 files: `MobileFooterNav` (7), `TaskTower` (7), `DailyHabitTracker` (6), `VisionQuest` (3), `App.tsx` (2).

### 3.4 `src/features/gamification/games/boss-rhythm/bossRhythmAudio.ts` — procedural music engine

309 lines. Synthesises kick/snare/hats/bass from the battle's beat grid, sample-accurate against `audioCtx.currentTime`, plus a full SFX palette (fire, hit, miss, hurt, shield, explosion, count-in ticks). Falls back to a silent `performance.now()` clock with pause accounting when Web Audio is blocked.

**Do not replace this with generated audio.** Rhythm-game charts must stay locked to the audio clock; an MP3 would drift.

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
| `audioEnabled` | legacy field, still read as fallback | migration remnant |
| `hasConfirmedEntryAudioChoice` | derived from the entry modal | gates *all* Island Run audio |
| `soundEffectsEnabled` | module-level in `audioUtils.ts` | app-wide procedural sounds |
| `lifegoal.soundEffects.enabled` | localStorage, via `soundPreferences.ts` | app-wide, synced to `profiles.sound_effects_enabled` |
| `audioEnabled` (story) | React state in `StoryPlayer` | story reader only, defaults off |
| `silent` mode | `TimerTab` | timer only |
| gong toggle | `MeditationSessionPlayer` | meditation only |
| `HapticMode` | `completionHaptics.ts`, app-wide | haptics |

**Seven independent mute surfaces.** The audio-split proposal landed for Island Run; the rest of the app never joined.

### 3.7 Tests

`src/features/gamification/level-worlds/services/__tests__/islandRunAudio.test.ts` and `islandRunMusic.test.ts`, both registered in `runIslandRunServiceTests.ts` and run by **`npm run test:island-run`**.

They cover throttling, the disabled gate, diagnostics, asset-failure memoisation, context resolution and playlist advance. They assert against **asset paths**, not audio content — so they will keep passing with a 2-byte file. `islandRunMusic.test.ts:196` hardcodes `/assets/audio/music/Lantern Tide.mp3`, so renaming that file requires a test update.

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

### 5.1 🔴 Board music stops after two tracks on every normal island

`boss-rhythm-duel-loop-v1.mp3` is 2 bytes and is the **third and final entry of both board playlists**. `audio.play()` rejects, the `.catch()` clears `ownedIslandRunMusicTrackId`, and because `onended` never fires the playlist never advances or wraps. Music dies silently and never returns until a context change.

Nobody has heard the third playlist slot in production. **Fix in Phase 0.**

### 5.2 🔴 Second stub file

`market-lounge-loop-v1.mp3` is also 2 bytes. Currently harmless — the `market-lounge` ID points at `Lantern Tide.mp3` — but it is a trap for anyone who "corrects" the mapping to match the ID name.

### 5.3 ⚠️ Orphaned asset

`Egg_hatched.mp3` (289 KB) has no reference anywhere in `src/`, `public/` or `scripts/`. Either wire it to the hatch moment or delete it.

### 5.4 ⚠️ Seven independent mute surfaces

Turning off "sound" in one place does not turn it off elsewhere. A player who mutes Island Run still gets footer clicks from `audioUtils`. There is no master volume anywhere.

### 5.5 ⚠️ Dead event

`market_stop_complete` is declared, mapped and has a haptic pattern, but is never fired from any call site.

### 5.6 ⚠️ No validator

Nothing checks that audio assets exist, are non-trivial, or are unique. The repo has validators for island art (`check:island-art-assets`), template kits and visual production briefs — audio has none. A 2-byte MP3 passed review, shipped, and broke music for months without a single failing check.

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
| **Phase 0 — Unblock** | Confirmed necessary and urgent. Two stub files, one orphan, no validator. Half a day. |
| **Phase 1 — SFX** | **Cheaper than estimated.** The service, throttling, haptics, diagnostics and tests all exist. 24 of 31 events need only a file. The AudioBuffer migration is an optimisation, not a prerequisite — real assets can land first. |
| **Phase 2 — Radio** | Engine is ~60% there: crossfade, playlists, single-track guarantee, cancellation tokens and `preload="none"` all exist. Missing: station model, sticky player choice, playhead-preserving resume, Now Playing UI, CDN base URL. |
| **Phase 3 — Surfaces** | Biggest content lift. 76 mini-game call sites resolve to shared files; story soundtrack is a finished feature with zero content. |
| **Phase 4 — Offline** | Nothing exists. Fully greenfield. |
| **Phase 5 — Voice** | Nothing exists. Fully greenfield. |

### Recommended first three PRs

1. **Phase 0** — replace both stubs, resolve the orphan, add `scripts/validate-audio-assets.mjs` + `npm run check:audio-assets` in CI.
2. **Story soundtrack content** — 4 mood pads wired into island narrative manifests. Zero new code; flip `StoryPlayer`'s `audioEnabled` default. Highest ratio of felt improvement to effort in the repo.
3. **SFX Tier 1 drop** — generate the ★ list from `02_SFX_ASSET_MANIFEST.md`, update `SOUND_ASSET_MAP`, delete the apology comments. No architectural change.

---

## 7. Keeping this file honest

Update this document in the same PR whenever you:

- add, remove or rename a file under `public/assets/audio/`
- add or remove an `IslandRunSoundEvent` / `IslandRunMusicTrackId`
- change `SOUND_ASSET_MAP` or the board playlists
- introduce a new audio system anywhere in the app
- add or move a mute/volume preference

The `check:audio-assets` script proposed in the master plan (§8) mechanises most of §2 and §5 — once it exists, this file only needs prose updates.
