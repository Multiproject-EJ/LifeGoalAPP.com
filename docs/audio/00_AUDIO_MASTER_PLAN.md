# HabitGame — Audio Master Plan

**Status:** Plan / proposal. Authored 2026-07-25.
**Scope:** All music, ambience, sound effects and voice for the app — main game (Island Run), the Vault, event mini-games, Build, Story, and the app-wide surfaces (habits, timer, meditation, journal, onboarding).
**Companion docs (the generation-ready lists):**
- `docs/audio/01_MUSIC_ASSET_MANIFEST.md` — every music track: name, station, mood, length, Suno prompt.
- `docs/audio/02_SFX_ASSET_MANIFEST.md` — every sound effect: ID, trigger, description, ElevenLabs prompt.

**Supersedes / extends:**
- `docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md` (naming + haptics map — still valid, extended here)
- `docs/gameplay/ISLAND_RUN_AUDIO_SPLIT_PROPOSAL_2026-05-25.md` (music/SFX preference split — adopted here as Phase 1)

---

## 0. TL;DR — the seven decisions

| # | Question | Decision |
|---|---|---|
| 1 | How is main-game music organised? | **GTA-style radio stations.** 7 stations, one per island zone + a Focus station + a virtual Favorites station. The player can switch stations freely; the game *suggests* the zone station but never forces it. |
| 2 | Music or SFX first? | **SFX first.** They fire 50–200× per session vs. music's "set and forget". SFX is where the game feel lives. Music Phase can run in parallel because it needs no code (the playlist engine already exists). |
| 3 | Stream or bundle music? | **Stream music, bundle SFX.** Music lives on a CDN (Supabase Storage public bucket), `preload="none"`, progressive streaming. SFX ships in the app bundle and is service-worker precached (~1 MB for all ~120 of them). |
| 4 | Favorites offline? | **Yes — explicit opt-in download** into a Cache API bucket (`lifegoal-audio-v1`), LRU-capped at 150 MB, plus one small always-local "cold start" bed so the board is never silent offline. |
| 5 | Do event mini-games get their own music? | **Yes, one signature loop each** — the mini-game is the only place in the app where music is doing narrative work (tension, tempo, payoff). This is where music budget goes after the stations. |
| 6 | Generation tooling | **Suno** for music/stingers, **ElevenLabs Sound Effects** for SFX, **ElevenLabs TTS** for optional DJ drops. Post-process every asset through one normalise/trim/loop/encode pipeline (§7). |
| 7 | Who owns the source of truth? | A typed `audioManifest.ts` in code, validated against disk/CDN by `npm run check:audio-assets`. The two manifest docs are the human-readable mirror. |

---

## 1. Why this is high priority (and why SFX outrank music)

Music sets the *mood* of a session. Sound effects set the *quality* of every single interaction. The current build fires 30 distinct gameplay sound events through 7 audio files — a dice roll, a reward-bar fill and a token hop are all the same sample, and half the mapping table is a comment apologising for it:

```ts
// Coin flip reuses the dice-roll whoosh while spinning, then the reward burst on reveal,
// until bespoke coin-flip/coin-ting assets exist.
```

Every one of those reuses is a small moment where the game feels cheaper than it looks. There is no engineering work needed to fix most of them — the event plumbing, throttling, haptics pairing and diagnostics are already built and tested (`islandRunAudio.test.ts`). **They are waiting on files.** That makes the SFX manifest the single highest-leverage audio deliverable.

### 1.1 Two bugs to fix before anything else

Found while surveying — both are one-line fixes but they invalidate any music QA done before them:

1. **`public/assets/audio/music/boss-rhythm-duel-loop-v1.mp3` is a 2-byte stub.** It is the third entry of `getIslandRunBoardMusicPlaylist()` for *every* non-dreamt island (islands 1–9, 11–19, …). Its `play()` rejects, the rejection path clears `ownedIslandRunMusicTrackId`, and `onended` never fires — so **board music silently stops after two tracks on every normal island**. Nobody has heard track 3 in production.
2. **`public/assets/audio/music/market-lounge-loop-v1.mp3` is also a 2-byte stub.** Currently harmless (the `market-lounge` ID points at `Lantern Tide.mp3`), but it is a landmine for whoever "fixes" the mapping to match the ID.

Fix in Phase 0 by shipping real files *and* adding the validator that would have caught it (§8).

---

## 2. Audio architecture

### 2.1 Channels (buses)

Four buses under one master, all Web Audio `GainNode`s so we can duck and fade properly:

```
master
├── music      (radio stations, contextual loops, mini-game music)
├── ambience   (looping island beds — waves, jungle, volcano)
├── sfx        (everything short and reactive)
└── voice      (DJ drops, story narration, creature vocalisations)
```

Rules:
- **Ducking:** when `voice` or a celebration stinger plays, `music` ducks to 35% over 180 ms and restores over 400 ms. When a mini-game opens, board `music` + `ambience` fade to 0 over 400 ms and the mini-game's own loop fades in.
- **Never two music sources at once.** The music director owns exactly one active track; contextual cues (Vault, Boss, Shop, Celebration) *replace* the radio and restore it on exit. This is already how `applyIslandRunMusicContext()` behaves — keep the contract, widen the surface list.
- **Ambience is independent of music.** Waves can keep rolling while the radio is off. This is the cheapest way to make "music off" feel like a choice rather than a downgrade.

### 2.2 Preferences

Extend the model from the audio-split proposal (already partly landed — `musicEnabled` / `sfxEnabled` exist in runtime state):

| Preference | Type | Default | Persisted |
|---|---|---|---|
| `musicEnabled` | bool | true | profile + local |
| `sfxEnabled` | bool | true | profile + local |
| `ambienceEnabled` | bool | true | profile + local |
| `voiceEnabled` | bool | true | profile + local |
| `musicVolume` | 0–1 | 0.28 | local |
| `sfxVolume` | 0–1 | 0.42 | local |
| `ambienceVolume` | 0–1 | 0.20 | local |
| `stationId` | string | zone default | profile + local |
| `favoriteTrackIds` | string[] | [] | profile |
| `downloadedTrackIds` | string[] | [] | local only (device-specific) |
| `hapticMode` | off/subtle/balanced | balanced | profile (**exists**) |

Volumes stay local-only — they're device/headphone dependent and syncing them across devices is an anti-feature.

### 2.3 New files

```
src/services/audio/
├── audioBus.ts            // WebAudio graph, gesture unlock, duck(), fade()
├── audioManifest.ts       // typed single source of truth (mirrors the manifest docs)
├── musicDirector.ts       // surface → station/track resolution, crossfade, shuffle
├── stations.ts            // station definitions + zone mapping + favorites
├── sfxPlayer.ts           // pooled playback, throttle, pitch/rate variation
├── ambiencePlayer.ts      // long looping beds, seamless
├── audioCache.ts          // Cache API download/evict for favorites + offline
├── audioPreferences.ts    // read/write prefs (local + Supabase profile)
└── __tests__/
```

```
src/features/settings/RadioPanel.tsx   // station picker, now-playing, ♥, ⬇ download
```

`islandRunAudio.ts` and `islandRunMusic.ts` become **thin adapters** over `sfxPlayer` / `musicDirector` for one release, so no call site in `IslandRunBoardPrototype.tsx` (13 000+ lines) has to change in the same PR as the engine swap. Delete the adapters once call sites migrate.

### 2.4 SFX playback: HTMLAudio → AudioBuffer

Current `sfxPlayer` uses `new Audio()` + `cloneNode()` per fire. That works but has two costs: 20–60 ms first-play latency on mobile Safari, and no pitch control beyond `playbackRate`. Switch to decoded `AudioBuffer`s played through `AudioBufferSourceNode`:

- **Zero-latency retrigger**, essential for token hops and combo chains.
- **Free variation:** ±3 semitones random detune on repeated sounds (hops, coins, taps) kills the machine-gun effect without extra files. The current 4-preset `playbackRate` trick in `playTokenMoveSound()` becomes a general capability.
- Decode all SFX once on first user gesture (~1 MB total, <150 ms) and keep them resident.

Keep the existing graceful-degradation contract: missing file, decode failure and autoplay rejection are all silent no-ops with diagnostics recorded.

---

## 3. The radio system (main game)

### 3.1 Stations

Seven stations. Six map to the six canonical island zones (`docs/ISLAND_RUN_120_ISLAND_NAMES_CANONICAL.md`), the seventh is a vibe station available everywhere.

| # | Station | Islands | Genre | Feel |
|---|---|---|---|---|
| 1 | **Shoreline FM** | 1–24 (Awakening / Calm & Nature) | Tropical lo-fi, ukulele, marimba, soft house | Sunrise, easy, welcoming |
| 2 | **Verdant Groove** | 25–48 (Growth / Jungle & Life) | Afro-latin percussion, organic house, kalimba, flute | Alive, growing, rhythmic |
| 3 | **Ember Frequency** | 49–72 (Power / Elements) | Taiko + electronic hybrid, cinematic drums | Driving, hot, urgent |
| 4 | **Mythic Hall** | 73–96 (Mastery / Fantasy & Identity) | Orchestral-folk, celtic strings, low choir | Noble, earned, heroic |
| 5 | **Neon Drift** | 97–110 (Futuristic / Tech Shift) | Synthwave, retro-future arps, gated drums | Sleek, night-drive, chrome |
| 6 | **Aurora Deep** | 111–120 (Transcendence / Cosmic) | Ambient, space pads, wordless choir | Vast, weightless, final |
| 7 | **Deep Work** | any (default for Timer / Meditation / Zen Garden) | Minimal, no-vocal, low-arousal | Non-distracting, sustained |
| ★ | **Favorites** | any | virtual — user's ♥ tracks | Player-owned |

### 3.2 Behaviour (the GTA part)

- **Zone suggestion, not enforcement.** Arriving in a new zone shows a one-line toast — *"📻 Now receiving: Ember Frequency"* — and auto-switches **only if the player has never manually picked a station**. Once they pick, their choice is sticky forever. This is the whole point of radio: it's theirs.
- **Station IDs / jingles.** A 2–4 s station sting plays on switch and between tracks (1-in-3 chance). This is what makes it read as *radio* rather than *playlist*, and it costs almost nothing to produce.
- **Shuffle with no immediate repeat.** Per-station bag shuffle; a track can't repeat until the bag empties.
- **Resume, don't restart.** Switching away and back resumes the station's current track at its playhead (within the session). Restarting a track from 0:00 every time you close a modal is the fastest way to make music feel cheap.
- **Now Playing.** Small marquee in the game HUD: station name, track title, ♥ toggle, ⬇ download. Tapping opens `RadioPanel`.
- **DJ drops (Phase 3, optional).** 3–6 s ElevenLabs voice lines per station, played between tracks at low probability. High delight-per-KB; also the easiest thing to over-do — cap at one drop per 3 tracks and make it independently mutable via `voiceEnabled`.

### 3.3 Contextual override

Certain surfaces take the music channel from the radio and give it back on exit. Priority order (highest wins):

```
boss battle > vault rush > mini-game > island-clear celebration
  > pack opening > shop/market > story reader > build modal > radio
```

Restore rule: on exit, crossfade back into the radio track **at its previous playhead**, not from the top.

---

## 4. Surface → audio map

Every surface in the app, what music it gets, and what SFX family it draws from.

### 4.1 Main game (Island Run board)

| Surface | Music | Ambience | SFX family |
|---|---|---|---|
| Board (roll/move/land) | Zone radio station | Zone bed (waves / jungle / volcano / wind / hum / drone) | Board, Economy, Reward-bar |
| Entry / audio-choice modal | `mus_ctx_entry_theme` (title theme, 30 s) | — | UI |
| Hatchery stop | `mus_ctx_hatchery_lull` | zone bed | Eggs |
| Shop / Market stop | `mus_ctx_market_lounge` (**exists** — Lantern Tide) | — | Economy, Shop |
| Build modal (`BuildModalV2`) | `mus_ctx_build_workshop` | — | Build |
| Boss stop (standard) | `mus_ctx_boss_duel` | — | Boss |
| Boss Rhythm mini-game | **procedural** (`bossRhythmAudio.ts` — keep as-is) | — | Boss, own synth SFX |
| Island clear celebration | `mus_ctx_island_clear` (**exists**) | — | Celebration stingers |
| Travel between islands | `sting_travel` over ducked radio | — | Board (travel) |
| Creature pack opening | `mus_ctx_pack_opening` | — | Eggs/Creatures |
| Compass / Quest modal | radio (ducked 60%) | — | UI, Story |

### 4.2 The Vault (Vault Rush — dormant-door minigame)

The Vault is the one place where music has a *job*: it's a 16-door reveal-and-match game with escalating tension, and right now it plays whatever the board was playing. It needs a bespoke pair:

| Cue | ID | Behaviour |
|---|---|---|
| Vault open | `mus_ctx_vault_rush` | Heist-tension loop, ~60 s, starts sparse |
| Match escalation | *same loop, layered* | Layer 2 unmutes at 1 match found, layer 3 at 2 matches — do this with 3 stem files crossfaded, not 3 separate tracks |
| Vault cracked | `mus_ctx_vault_cracked` | 6 s payoff sting, then restore radio |

SFX: `sfx_vault_*` family (8 sounds) — door reveal, tumbler click, near-miss, crack, payout. The near-miss sound matters more than the win sound; that's the one that makes the player tap again.

### 4.3 Event mini-games

Each gets one signature loop. Length 45–90 s, seamless, tempo matched to the game's actual pace.

| Mini-game | Music ID | Character |
|---|---|---|
| Task Tower (Feeding Frenzy) | `mus_mg_task_tower` | Rising tension, tempo steps up with height |
| Lucky Spin | `mus_mg_lucky_spin` | Casino swing, brass stabs |
| Space Excavator / Shooter Blitz | `mus_mg_space_excavator` | Driving synth, propulsive |
| Companion Feast | `mus_mg_companion_feast` | Playful, bouncy, warm |
| Fortune Engine | `mus_mg_fortune_engine` | Clockwork groove, mechanical percussion |
| Island Workshop | `mus_mg_island_workshop` | Crafty, hammer-on-anvil rhythm |
| Vision Quest | `mus_mg_vision_quest` | Dreamy, uplifting, wide |
| Zen Garden | `mus_mg_zen_garden` | Near-static, koto + water |
| Boss Rhythm | *procedural* | Already excellent — do not replace |

### 4.4 Story & narrative

Story is the surface where **generated music is weakest and generated voice is strongest**. Suno tracks under dialogue fight the text; a 4-mood pad set is enough.

| Mood | ID | Used for |
|---|---|---|
| Calm | `mus_story_calm` | Openings, island arrivals |
| Wonder | `mus_story_wonder` | Discovery, Concord tech reveals |
| Tension | `mus_story_tension` | The Great Drift, threat beats |
| Resolve | `mus_story_resolve` | Chapter ends, earned moments |

SFX: `sfx_story_*` (page turn, text blip, reveal, choice select, Concord hum, memory shimmer). The **text blip** is the highest-impact one — a soft per-character tick during typewriter reveal is what makes a reader feel like a game.

**Voice (Phase 3):** ElevenLabs narration for island-opening narrative beats only (not all story text — cost and re-generation churn make full VO a trap). ~10 s per island opening.

### 4.5 App-wide (outside the game)

| Surface | Music | SFX |
|---|---|---|
| Habits / Daily tracker | none (silence is correct here) | `sfx_habit_check`, `sfx_habit_all_done`, `sfx_streak_up` |
| Timer / Focus | Deep Work station | `sfx_timer_start`, `sfx_timer_end`, `sfx_timer_tick_final` |
| Meditation | Deep Work station or existing session audio | breath cues, `sfx_meditation_bowl` |
| Journal | none | `sfx_journal_save`, `sfx_ui_tap_soft` |
| Daily Treats calendar | `mus_ctx_treat_calendar` | `sfx_treat_door_open`, `sfx_chest_open` |
| Spin Wheel | `mus_mg_lucky_spin` | `sfx_spin_*` family |
| Onboarding | `mus_ctx_entry_theme` | UI family |
| Level up / Rank up | stinger over current music (ducked) | `sting_level_up`, `sting_rank_up` |

---

## 5. Loading & delivery — the streaming question

**Short answer: stream the music, bundle the sound effects.** They have opposite profiles and deserve opposite strategies.

| | SFX | Ambience | Music |
|---|---|---|---|
| File size | 3–15 KB | 300–600 KB | 1.5–3 MB |
| Count | ~120 | 6 | 45+ |
| Total | **~1 MB** | ~2.5 MB (lo-fi) | **~110 MB** |
| Latency tolerance | **0 ms** — must be instant | ~1 s | 2–3 s acceptable |
| Repeat rate | 50–200×/session | continuous | 1× per 3 min |
| **Strategy** | **Bundle + precache + decode on gesture** | Bundle lo-fi, stream hi-fi | **Stream from CDN** |

### 5.1 Why not bundle music

The site deploys as a static build to GitHub Pages. Putting 110 MB of music in `public/` means:
- every deploy uploads 110 MB, and the repo carries it forever in git history (11 MB of audio is already committed);
- the service worker's precache list either ignores it (so no benefit) or tries to cache it (so first load stalls);
- iOS App Store binary via Capacitor bloats by the same amount.

### 5.2 Recommended music delivery

**Supabase Storage public bucket `game-audio`**, which the app already has infrastructure for (`supabase.storage.from(...)`, existing bucket migrations under `supabase/migrations/`).

- Base URL from `VITE_AUDIO_CDN_BASE_URL`, falling back to `/assets/audio` so local dev and offline builds still work.
- `Cache-Control: public, max-age=31536000, immutable` — filenames are versioned (`_v1`, `_v2`), so cache-bust by renaming, never by query string.
- `<audio preload="none">` + set `src` at play time → the browser streams progressively over HTTP range requests. Playback starts after ~100–200 KB, not the full file.
- Two bitrate variants per track: `-hi` (160 kbps stereo) and `-lo` (96 kbps mono). Pick with `navigator.connection`: `saveData === true` or `effectiveType` of `2g`/`3g` → `-lo`.

### 5.3 The cold-start problem

Streaming means the first 1–2 s of a session can be silent, which reads as "broken" more than as "loading". Fix with one **bundled 30-second bed** (~350 KB, `mus_bed_coldstart_v1.mp3`) that:
- is in the service-worker precache list,
- starts the instant the player confirms the entry audio choice,
- crossfades into the real station track as soon as it has buffered.

One small file removes the entire perceived-latency problem.

### 5.4 Prefetch policy

- On station track start, prefetch the **next** track in the shuffle bag at `fetchpriority="low"` — by the time the current one ends it's warm.
- Never prefetch more than one track ahead.
- Skip prefetch entirely on save-data / 2g / 3g.
- Never prefetch while a mini-game is running (bandwidth contention with gameplay assets).

### 5.5 Favorites & offline — yes, local storage, opt-in

Auto-downloading music is hostile on mobile data. Make it a deliberate act:

- ♥ **Favorite** = a sync'd preference (which tracks the player likes). Cheap, tiny, cross-device.
- ⬇ **Download** = a per-device act that writes the file into a Cache API bucket `lifegoal-audio-v1`. Also offered as one-tap **"Download this station"** (~4 tracks, shows the MB cost before confirming).
- **Cap 150 MB**, LRU eviction, with a clear "Downloaded music: 62 MB — Clear" row in settings.
- Check `navigator.storage.estimate()` before downloading; if the quota headroom is under 300 MB, warn instead of silently failing.
- **Capacitor/iOS:** Cache API inside WKWebView is evictable under storage pressure. On native, write through `@capacitor/filesystem` to `Directory.Library` (excluded from iCloud backup) and resolve to a `capacitor://` URL instead. `audioCache.ts` abstracts this behind one interface.
- Offline behaviour: downloaded tracks play normally; undownloaded tracks fall back to the bundled cold-start bed with a one-time "You're offline — playing offline bed" note. **Never** show a broken-audio error.

### 5.6 SFX delivery

- All ~120 files ship in `public/assets/audio/sfx/`, added to the SW precache list.
- Fetched and `decodeAudioData`'d in one batch on the first user gesture (the entry audio-choice confirm is the perfect hook — it's already a gesture gate).
- Held as `AudioBuffer`s for the session. ~1 MB on the wire, ~8 MB decoded in RAM — acceptable; if it isn't on low-end Android, decode lazily per family (board / economy / minigame) instead of all at once.

---

## 6. Haptics pairing

Haptics are already implemented well (`triggerIslandRunHaptic`, reduced-motion aware, throttled, three-mode). Extend rather than rework: **every new SFX gets a haptic column in the manifest.** The pairing rule — haptic fires on the *transient* of the sound, never on its tail — is what makes the two feel like one event.

Existing patterns to reuse: light `[30]`, selection `[20,40,20]`, success `[30,40,30,40,30]`, heavy `[50,30,50]`.

---

## 7. Production pipeline (Suno / ElevenLabs → shipped asset)

### 7.1 Music (Suno)

1. Generate with the prompt from `01_MUSIC_ASSET_MANIFEST.md`. Generate 3–4 takes per track; they're cheap and the third is usually the one.
2. **Instrumental unless specified.** Vocals under gameplay date badly and fight story text. Vocals are fine on 1–2 "hero" station tracks.
3. Trim to a musically sensible loop point (bar boundary, not a fade).
4. **Seamless loop:** copy the last 1–2 bars of the tail, crossfade under the head, cut at the bar line. Verify by looping 5× and listening for the seam.
5. Normalise to **−16 LUFS integrated**, true peak ≤ −1.5 dBTP.
6. Encode `-hi` (MP3 160 kbps stereo) and `-lo` (MP3 96 kbps mono). MP3 over AAC for the widest `HTMLAudioElement` support including older Android WebView.
7. Upload to `game-audio/music/<station>/`, add to `audioManifest.ts`.

### 7.2 SFX (ElevenLabs Sound Effects)

1. Generate with the prompt + duration from `02_SFX_ASSET_MANIFEST.md`.
2. **Trim hard.** ElevenLabs output usually has 100–300 ms of pre-roll silence — that silence becomes input latency. Cut to the transient, leave ≤ 5 ms of head.
3. Trim the tail to where it's inaudible; add a 10 ms fade-out to avoid clicks.
4. Normalise SFX peaks to **−3 dBFS**, and match *perceived* loudness across a family by ear (a coin and a door should not differ by 12 dB).
5. Mono, 44.1 kHz. Stereo on SFX is wasted bytes for anything that isn't a big celebration.
6. Encode MP3 128 kbps mono (or 96 kbps for anything under 300 ms — inaudible difference, 25% smaller).
7. Drop into `public/assets/audio/sfx/`, add to `audioManifest.ts`.

### 7.3 Harvesting SFX out of generated music

Worth doing for percussive one-shots (impacts, hits, clicks) where ElevenLabs tends to produce something too "designed". Generate a Suno percussion-heavy stem, slice single hits at zero crossings, then run steps 2–7 above. Treat as an optimisation, not the main path — direct SFX generation is faster for ~90% of the list.

### 7.4 Voice (ElevenLabs TTS) — Phase 3

- One voice per DJ station (distinct character), one narrator voice for story.
- Keep drops ≤ 6 s and script them as *station identity*, not information.
- Normalise to −18 LUFS (quieter than music so ducking does less work).
- Everything gated behind `voiceEnabled`, defaulting **on** but muteable in one tap.

---

## 8. Validation & guardrails

Mirror the existing art-asset validator pattern (`scripts/validate-island-art-assets.mjs`, `npm run check:island-art-assets`):

**`scripts/validate-audio-assets.mjs`** → `npm run check:audio-assets`, run in CI.

Checks:
1. Every ID in `audioManifest.ts` resolves to a real file (local) or returns 200 (CDN, HEAD request).
2. **No file smaller than 1 KB** — this alone would have caught both 2-byte stubs.
3. No file in `public/assets/audio/` is unreferenced by the manifest (dead weight).
4. SFX total bundled size stays under a **1.5 MB budget**; fail the build past it.
5. Every SFX ID declared in `IslandRunSoundEvent` (and its successors) has a *distinct* asset — warn on any sharing, so the "temporary reuse" comments can't quietly become permanent.
6. Filenames match `^(mus|amb|sfx|sting|vo)_[a-z0-9_]+(_v\d+)?\.(mp3|ogg)$`.

Plus a **dev audio debug panel** (extend `IslandRunDebugPanel.tsx`, which already surfaces `getIslandRunAudioDiagnostics()`): list every manifest entry with a play button, current bus gains, cache size, and which assets have failed. Auditioning 120 SFX in-context is otherwise miserable.

---

## 9. Phasing

Phases 1 and 2 are independent and can run in parallel — one is code-led, the other is content-led.

### Phase 0 — Unblock (0.5 day)
- Replace the two 2-byte stub MP3s with real audio (or remove `boss-rhythm-duel` from the default playlist until it exists).
- Add `scripts/validate-audio-assets.mjs` + `check:audio-assets` in CI.
- **Exit:** board music plays all three playlist tracks on a normal island; CI fails on a stub file.

### Phase 1 — SFX engine + Tier-1 sounds (2–3 days code, content in parallel)
- `audioBus.ts`, `sfxPlayer.ts` (AudioBuffer + variation), `audioManifest.ts`, `audioPreferences.ts`.
- `islandRunAudio.ts` becomes an adapter — no call-site changes.
- Generate + ship **Tier 1** SFX (~45 sounds, marked ★ in `02_SFX_ASSET_MANIFEST.md`): every currently-shared event gets its own file.
- **Exit:** no SFX shares an asset with a different event; SFX bundle ≤ 700 KB; dev panel auditions all of them.

### Phase 2 — Radio system (3–4 days code, content in parallel)
- `musicDirector.ts`, `stations.ts`, `RadioPanel.tsx`, Now-Playing HUD.
- Zone→station mapping, sticky manual choice, bag shuffle, station stings, playhead-preserving resume.
- Move music to the `game-audio` Supabase bucket + `VITE_AUDIO_CDN_BASE_URL`; ship `mus_bed_coldstart_v1.mp3` bundled.
- Generate **2 tracks per station** (14 tracks) + 7 station stings.
- **Exit:** player can switch stations; contextual overrides restore the radio at its playhead; zero music bytes in the app bundle beyond the cold-start bed.

### Phase 3 — Surfaces & depth (3–4 days)
- Vault Rush 3-stem escalating loop + `sfx_vault_*`.
- One signature loop per event mini-game.
- Story 4-mood pads + `sfx_story_*` (text blip especially).
- Build modal, hatchery, pack-opening, daily-treats cues.
- Ambience beds per zone + `ambienceEnabled` preference.
- **Exit:** every surface in §4 has bespoke audio; nothing falls back to the board radio by accident.

### Phase 4 — Offline, favorites, polish (2–3 days)
- `audioCache.ts` — Cache API + Capacitor Filesystem, LRU, quota checks.
- ♥ favorites (sync'd) + ⬇ download (per-device) + Favorites virtual station.
- Bitrate variants + connection-aware selection + prefetch policy.
- Fill stations out to 4 tracks each (+14 tracks).
- **Exit:** a fully offline session has music; downloaded storage is visible and clearable.

### Phase 5 — Voice & flourish (optional, 2 days)
- DJ drops per station (ElevenLabs), gated by `voiceEnabled`.
- Story narration for island openings.
- Creature vocalisations for reveal moments.

---

## 10. Budget & counts

| Category | Count | Bundled | Streamed |
|---|---|---|---|
| SFX | ~120 | ~1.0 MB | — |
| Stingers (station IDs + celebration) | 15 | ~250 KB | — |
| Cold-start bed | 1 | ~350 KB | — |
| Ambience beds | 6 | ~1.2 MB (lo-fi) | ~2.5 MB (hi-fi) |
| Station tracks | 28 (7 × 4) | — | ~70 MB |
| Contextual loops (shop, vault, boss, build, hatchery, celebration, pack, treats, entry) | 11 | — | ~22 MB |
| Mini-game loops | 8 | — | ~14 MB |
| Story pads | 4 | — | ~8 MB |
| DJ drops (Ph. 5) | 21 | — | ~2 MB |
| **Total** | **~214 assets** | **~2.8 MB** | **~118 MB** |

App bundle grows by under 3 MB. Typical session streams 3–8 MB of music.

---

## 11. Open questions for the product call

1. **Music-off default?** Recommend music **on**, ambience **on**, SFX **on** — but the entry audio-choice modal already exists and is the right place to let the player decide before the first note. No change needed, just confirming the defaults.
2. **Does the radio persist outside Island Run?** Recommend **no** by default — Habits/Journal should be silent — but the Timer/Meditation surfaces opt into the Deep Work station. Confirm.
3. **Vocals on any station track?** Recommend instrumental everywhere except 1–2 Shoreline FM hero tracks. Vocals significantly raise the "I've heard this 40 times" fatigue rate.
4. ~~**Licensing:**~~ **Resolved 2026-07-25.** Both providers tie commercial rights to *when* an asset was generated, not to current subscription status:
   - **Suno** — assets generated while on Pro/Premier keep commercial use rights permanently, including after cancellation. Assets generated on free have none.
   - **ElevenLabs** — same model: content generated during a paid plan keeps a perpetual commercial licence after cancelling or downgrading.

   **Consequence for planning:** rights survive, but *generation capacity* does not. Treat a paid month as a **generation sprint**, not a trickle. The full music manifest (~77 new assets × 4 takes ≈ 310 songs ≈ 155 generations) fits inside a single Suno Pro month with headroom. During that month: over-generate and bank the unused takes for Phase 4, generate spare/alternate material you might want later, and **download every file (lossless where offered) before the subscription lapses** — do not assume library access or full-quality download survives on the free tier.

   Residual risks, accepted and noted rather than resolved: Suno grants a perpetual licence rather than authorship ("ownership" language was removed), generated music carries no copyright protection and no exclusivity, and neither provider's user indemnification against the ongoing AI-music litigation has been verified here. None are blockers for a game soundtrack; all should be re-checked against live terms before a major release.

   Still required per asset: record tool + plan tier + generation date in the manifest (the generation checklists already ask for this).
5. **Do we want per-island ambience or per-zone?** Plan assumes **per-zone** (6 beds). Per-island (120 beds) is not worth it.
