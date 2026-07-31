# Audio docset

The complete audio plan for HabitGame — music, ambience, sound effects, voice.

**This directory is the single source of truth for audio.** Start with the inventory to see where things stand, then the master plan for where they're going.

| Doc | What it's for |
|---|---|
| [`03_CURRENT_AUDIO_INVENTORY.md`](./03_CURRENT_AUDIO_INVENTORY.md) | **You are here.** Audited as-built state: every file, every code path, every defect. Update this whenever you touch audio. |
| [`00_AUDIO_MASTER_PLAN.md`](./00_AUDIO_MASTER_PLAN.md) | Architecture, radio-station system, surface→audio map, streaming vs. bundling decision, phasing. |
| [`01_MUSIC_ASSET_MANIFEST.md`](./01_MUSIC_ASSET_MANIFEST.md) | Every music track: station, title, filename, length, BPM, and its Suno prompt. Generation-ready. |
| [`02_SFX_ASSET_MANIFEST.md`](./02_SFX_ASSET_MANIFEST.md) | All 133 sound effects: ID, trigger event, duration, paired haptic, and its ElevenLabs prompt. Generation-ready. |

## Where things stand today

13 audio files (6 music/ambience/stingers, 7 SFX), ~11 MB. The engineering is in good shape — typed events, throttling, haptics pairing, diagnostics, tests, and a CI asset validator. The content splits sharply:

**🎵 Music — approved, keep it.** The real tracks are Suno Pro originals. Everything the plan adds is *additional* music, never a replacement. **Do not regenerate them.** Phase 0 removed both 2-byte stubs and wired the approved hatch stinger.

**🔶 Sound effects — every one is a placeholder.** All 7 shipped SFX files and all 9 procedural oscillator sounds in `audioUtils.ts` are unacceptable stand-ins; the dice roll, tile land and button clicks are the worst. On top of that, **174 call sites across 9 files resolve to just those 7 files** — 24 of 31 typed events borrow another event's sound. Both problems need fixing: unsharing them alone would just give you 31 different bad sounds.

Placeholder state is tracked in code via `PLACEHOLDER_SOUND_ASSET_PATHS` (`islandRunAudio.ts`) and a file banner in `audioUtils.ts`. **SFX content is done when that set is empty.**

Exception: `bossRhythmAudio.ts` is procedural *by design* — a rhythm game must stay locked to the audio clock. Not a placeholder; keep it.

## First three PRs

1. **SFX Tier 1** — generate the ★ list (116 sounds, including regenerating all 7 existing files and replacing the procedural UI beeps), update the canonical asset manifest, and retire placeholder paths as assets land.
2. **Story soundtrack** — `StorySoundtrackConfig` is fully built, validated and tested but **no narrative defines one**. Four mood pads are the next content step.
3. **Radio foundation** — station model, sticky selection, playhead-preserving resume, and Now Playing UI.

   Order by how often it's heard: **UI taps → dice roll → tile land / token hop → coins and reward bar → the rest.** The first three are ~40% of all sound a player experiences.

## Quick answers

- **Radio stations?** Yes — 7 stations, one per island zone plus Deep Work, plus a virtual Favorites station. Zone suggests, player decides, choice is sticky.
- **Stream or bundle?** Stream music from a CDN (`preload="none"`, ~110 MB total). Bundle all SFX (~1 MB) and precache them. One 30 s bundled bed covers cold start and offline.
- **Favorites offline?** Opt-in download into a Cache API bucket, 150 MB LRU cap, Capacitor Filesystem on iOS.
- **What's most urgent?** Sound effects. 23 of the game's 30 sound events currently share an asset with a different event.

## Phase 0 safety now shipped

- The two 2-byte stub MP3s are removed.
- `Egg_hatched.mp3` plays once from the canonical successful hatch reveal.
- `npm run check:audio-assets` enforces manifest/disk parity, valid file size,
  placeholder declarations, and the bundled SFX budget in deploy CI.

## Related

- `docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md` — original haptics map and asset naming rules
- `docs/gameplay/ISLAND_RUN_AUDIO_SPLIT_PROPOSAL_2026-05-25.md` — music/SFX preference split
- `src/features/gamification/level-worlds/services/islandRunAudio.ts` — current SFX + haptics service
- `src/features/gamification/level-worlds/services/islandRunMusic.ts` — current music playlist engine
- `src/features/gamification/games/boss-rhythm/bossRhythmAudio.ts` — procedural synth engine (keep as-is)
