# Audio docset

The complete audio plan for HabitGame — music, ambience, sound effects, voice.

| Doc | What it's for |
|---|---|
| [`00_AUDIO_MASTER_PLAN.md`](./00_AUDIO_MASTER_PLAN.md) | Architecture, radio-station system, surface→audio map, streaming vs. bundling decision, phasing. **Read this first.** |
| [`01_MUSIC_ASSET_MANIFEST.md`](./01_MUSIC_ASSET_MANIFEST.md) | Every music track: station, title, filename, length, BPM, and its Suno prompt. Generation-ready. |
| [`02_SFX_ASSET_MANIFEST.md`](./02_SFX_ASSET_MANIFEST.md) | All 133 sound effects: ID, trigger event, duration, paired haptic, and its ElevenLabs prompt. Generation-ready. |

## Quick answers

- **Radio stations?** Yes — 7 stations, one per island zone plus Deep Work, plus a virtual Favorites station. Zone suggests, player decides, choice is sticky.
- **Stream or bundle?** Stream music from a CDN (`preload="none"`, ~110 MB total). Bundle all SFX (~1 MB) and precache them. One 30 s bundled bed covers cold start and offline.
- **Favorites offline?** Opt-in download into a Cache API bucket, 150 MB LRU cap, Capacitor Filesystem on iOS.
- **What's most urgent?** Sound effects. 23 of the game's 30 sound events currently share an asset with a different event.

## Known issues this plan fixes

- `public/assets/audio/music/boss-rhythm-duel-loop-v1.mp3` is a **2-byte stub** and sits third in the default board playlist — board music silently stops after two tracks on every normal island.
- `public/assets/audio/music/market-lounge-loop-v1.mp3` is also a 2-byte stub (currently unreferenced).
- No validator exists for audio assets; `npm run check:audio-assets` is proposed in the master plan (§8).

## Related

- `docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md` — original haptics map and asset naming rules
- `docs/gameplay/ISLAND_RUN_AUDIO_SPLIT_PROPOSAL_2026-05-25.md` — music/SFX preference split
- `src/features/gamification/level-worlds/services/islandRunAudio.ts` — current SFX + haptics service
- `src/features/gamification/level-worlds/services/islandRunMusic.ts` — current music playlist engine
- `src/features/gamification/games/boss-rhythm/bossRhythmAudio.ts` — procedural synth engine (keep as-is)
