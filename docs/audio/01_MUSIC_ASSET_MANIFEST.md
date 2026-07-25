# HabitGame — Music Asset Manifest

**Status:** Generation-ready list. Authored 2026-07-25.
**Parent:** `docs/audio/00_AUDIO_MASTER_PLAN.md`
**Sibling:** `docs/audio/02_SFX_ASSET_MANIFEST.md`

Every music asset in the game: what it is, where it plays, and the exact prompt to generate it.

---

## 0. ✅ Existing music is APPROVED — do not regenerate

**The music already in the repo is good and stays.** These are Suno Pro originals that have been listened to and accepted:

| File | Used as | Status |
|---|---|---|
| `Island dreamy relaxing night islands.mp3` | `island-board-ambient` | ✅ **approved — keep** |
| `Lantern Tide.mp3` | `market-lounge` | ✅ **approved — keep** |
| `luxury-reward-loop-v1.mp3` | `luxury-reward` | ✅ **approved — keep** |
| `event-jackpot-loop-v1.mp3` | `event-jackpot` | ✅ **approved — keep** |
| `new-island-celebration-loop-v1.mp3` | `new-island-celebration` | ✅ **approved — keep** |
| `Egg_hatched.mp3` | *(orphaned — wire it up)* | ✅ approved, needs wiring |

Do not replace, re-encode destructively, or "improve" these. Everything marked ⬜ in this document is **additional** music, not a replacement for what's there. If a filename is tidied to match the naming convention, keep the audio byte-identical and update the references — this is a rename, not a regeneration.

Only two music files are problems, and both are because they are **empty**, not because they sound wrong:

| File | Status |
|---|---|
| `boss-rhythm-duel-loop-v1.mp3` | 🔴 2-byte stub — needs real audio (Phase 0) |
| `market-lounge-loop-v1.mp3` | 🔴 2-byte stub, unreferenced — delete or fill |

> **The opposite is true of sound effects.** Every SFX in the app is a placeholder scheduled for replacement — see `02_SFX_ASSET_MANIFEST.md` §0. Music is in good shape; SFX is not.

---

## Conventions

**Naming**
```
Station tracks   /assets/audio/music/<station>/mus_<station>_<slug>_v1.mp3
Contextual loops /assets/audio/music/context/mus_ctx_<slug>_v1.mp3
Mini-game loops  /assets/audio/music/minigame/mus_mg_<slug>_v1.mp3
Story pads       /assets/audio/music/story/mus_story_<slug>_v1.mp3
Stingers         /assets/audio/music/stingers/sting_<slug>_v1.mp3
Ambience beds    /assets/audio/ambience/amb_<slug>_v1.mp3
Bitrate variants suffix -hi (160 kbps stereo) / -lo (96 kbps mono) before .mp3
```

**Every track must be:** instrumental (unless flagged 🎤), seamlessly looping, −16 LUFS, true peak ≤ −1.5 dBTP, no fade-in/fade-out at loop boundaries.

**Prompt style for Suno:** genre + instrumentation + tempo + mood + explicit `instrumental`, `seamless loop`, `no vocals`. Generate 3–4 takes; keep the one that survives 10 consecutive loops without becoming annoying — that's the real test for game music, not the first-listen impression.

**Status legend:** ✅ exists · 🔧 exists but broken/stub · ⬜ to generate

---

# 1. Station tracks

Four per station. **Phase 2 ships tracks 1–2; Phase 4 adds 3–4.**

## 1.1 📻 Shoreline FM — Islands 1–24 (Awakening / Calm & Nature)

The first station every player hears. It has to be welcoming without being sleepy, and it has to survive being the soundtrack to the entire onboarding.

| # | Title | File | Len | BPM | Status |
|---|---|---|---|---|---|
| 1 | First Light | `mus_shoreline_first_light_v1` | 90 s | 92 | ⬜ |
| 2 | Coconut Radio | `mus_shoreline_coconut_radio_v1` | 90 s | 100 | ⬜ |
| 3 | Seaglass Sunday | `mus_shoreline_seaglass_sunday_v1` | 90 s | 88 | ⬜ |
| 4 | Pebble Tide | `mus_shoreline_pebble_tide_v1` | 90 s | 96 | ⬜ |

**Prompts**

1. *First Light* — `Warm tropical lo-fi instrumental, soft ukulele arpeggios and mellow marimba melody over a gentle dusty hip-hop beat, brushed rim shots, soft upright bass, distant seagulls and light wave texture, sunrise optimism, unhurried and welcoming, 92 BPM, seamless loop, no vocals, instrumental`
2. *Coconut Radio* — `Sunny beach house instrumental, plucky nylon guitar riff, steel drum accents, warm analog bass, soft four-on-the-floor kick with shaker groove, breezy and playful, feels like a beach bar at noon, 100 BPM, seamless loop, no vocals, instrumental`
3. *Seaglass Sunday* — `Dreamy chillwave instrumental, glassy Rhodes chords, soft tape wobble, muted guitar swells, lazy shuffled drums, gentle ocean reverb, nostalgic and calm, late afternoon light, 88 BPM, seamless loop, no vocals, instrumental`
4. *Pebble Tide* — `Light tropical downtempo instrumental, kalimba ostinato, soft flute counter-melody, hand percussion and shaker, warm sub bass, water droplet textures, gently rolling forward motion, 96 BPM, seamless loop, no vocals, instrumental`

## 1.2 📻 Verdant Groove — Islands 25–48 (Growth / Jungle & Life)

Rhythm-forward. This is the "you're building momentum" zone and the music should feel like it's growing.

| # | Title | File | Len | BPM | Status |
|---|---|---|---|---|---|
| 1 | Vinefall | `mus_verdant_vinefall_v1` | 90 s | 104 | ⬜ |
| 2 | Nectar Falls | `mus_verdant_nectar_falls_v1` | 90 s | 110 | ⬜ |
| 3 | Canopy Crown | `mus_verdant_canopy_crown_v1` | 90 s | 108 | ⬜ |
| 4 | Bloom Parade | `mus_verdant_bloom_parade_v1` | 90 s | 116 | ⬜ |

**Prompts**

1. *Vinefall* — `Organic house instrumental with afro-latin percussion, layered congas and shakers, kalimba ostinato, deep round bass, breathy wooden flute melody, jungle bird texture in the background, alive and growing, 104 BPM, seamless loop, no vocals, instrumental`
2. *Nectar Falls* — `Tribal electronic instrumental, djembe and talking drum groove, marimba melody cascading like water, warm analog pads, bright plucked strings, joyful forward energy, lush and green, 110 BPM, seamless loop, no vocals, instrumental`
3. *Canopy Crown* — `Afro-house instrumental, driving kick with intricate hand percussion, plucked mbira riff, soaring wordless synth pad, rainforest ambience woven in, expansive and uplifting, 108 BPM, seamless loop, no vocals, instrumental`
4. *Bloom Parade* — `Festive latin-electronic instrumental, bright brass stabs, steel pan flourishes, syncopated conga and timbale groove, celebratory carnival feel but light not overwhelming, 116 BPM, seamless loop, no vocals, instrumental`

## 1.3 📻 Ember Frequency — Islands 49–72 (Power / Elements & Intensity)

The difficulty ramp zone. Percussion-led, hot, urgent — but this is background music for a *board game*, so keep the low end controlled and never let it become a boss track.

| # | Title | File | Len | BPM | Status |
|---|---|---|---|---|---|
| 1 | Emberfall | `mus_ember_emberfall_v1` | 90 s | 120 | ⬜ |
| 2 | Stormforge | `mus_ember_stormforge_v1` | 90 s | 128 | ⬜ |
| 3 | Ashline Run | `mus_ember_ashline_run_v1` | 90 s | 124 | ⬜ |
| 4 | Molten Tide | `mus_ember_molten_tide_v1` | 90 s | 118 | ⬜ |

**Prompts**

1. *Emberfall* — `Hybrid cinematic electronic instrumental, taiko drums layered with punchy electronic kick, low brass pulses, metallic percussion hits, dark synth bass, restrained tension with forward drive, embers and heat, 120 BPM, seamless loop, no vocals, instrumental`
2. *Stormforge* — `Industrial cinematic instrumental, anvil and metal impact percussion, distorted synth bass ostinato, sharp string stabs, rolling toms, powerful and relentless but controlled, forge and thunder, 128 BPM, seamless loop, no vocals, instrumental`
3. *Ashline Run* — `Driving hybrid trailer instrumental, propulsive tom pattern, gritty analog bass arpeggio, sparse distorted guitar texture, occasional low horn, urgent chase energy, 124 BPM, seamless loop, no vocals, instrumental`
4. *Molten Tide* — `Dark cinematic electronic instrumental, slow heavy taiko pulse, brooding low strings, granular fire texture, sub bass swells, molten and dangerous, heavy but spacious, 118 BPM, seamless loop, no vocals, instrumental`

## 1.4 📻 Mythic Hall — Islands 73–96 (Mastery / Fantasy & Identity)

The "you've earned this" zone. Orchestral-folk, noble, human. Avoid full Hollywood-trailer bombast — it doesn't loop.

| # | Title | File | Len | BPM | Status |
|---|---|---|---|---|---|
| 1 | Oathkeeper | `mus_mythic_oathkeeper_v1` | 100 s | 96 | ⬜ |
| 2 | Hall of Names | `mus_mythic_hall_of_names_v1` | 100 s | 88 | ⬜ |
| 3 | Silver Banner | `mus_mythic_silver_banner_v1` | 100 s | 104 | ⬜ |
| 4 | Rite of Mastery | `mus_mythic_rite_of_mastery_v1` | 100 s | 92 | ⬜ |

**Prompts**

1. *Oathkeeper* — `Celtic orchestral folk instrumental, fiddle and low whistle melody, bodhran heartbeat rhythm, warm cello counter-line, harp arpeggios, noble and determined, feels like a promise being kept, 96 BPM, seamless loop, no vocals, instrumental`
2. *Hall of Names* — `Solemn orchestral instrumental, low wordless choir pad, slow harp figure, sustained strings, soft timpani swells, distant horn, reverent and grand without being loud, 88 BPM, seamless loop, no vocals, instrumental`
3. *Silver Banner* — `Heroic orchestral folk instrumental, bright fiddle reel over marching snare and bodhran, tin whistle countermelody, rising string section, triumphant and moving forward, 104 BPM, seamless loop, no vocals, instrumental`
4. *Rite of Mastery* — `Mystical orchestral instrumental, hammered dulcimer ostinato, layered viola and cello, ritual frame drum, distant chimes, wordless soprano texture, ancient and earned, 92 BPM, seamless loop, no vocals, instrumental`

## 1.5 📻 Neon Drift — Islands 97–110 (Futuristic / Tech Shift)

Synthwave. The tonal shift here does a lot of narrative work — the player should *hear* that the world changed.

| # | Title | File | Len | BPM | Status |
|---|---|---|---|---|---|
| 1 | Neon Drift | `mus_neon_drift_v1` | 90 s | 112 | ⬜ |
| 2 | Circuit Bloom | `mus_neon_circuit_bloom_v1` | 90 s | 118 | ⬜ |
| 3 | Chrome Lagoon | `mus_neon_chrome_lagoon_v1` | 90 s | 106 | ⬜ |
| 4 | Signal Rain | `mus_neon_signal_rain_v1` | 90 s | 120 | ⬜ |

**Prompts**

1. *Neon Drift* — `Retro synthwave instrumental, warm analog saw lead, gated reverb drums, pulsing sixteenth-note bass arpeggio, wide chorus pads, night drive energy, nostalgic and sleek, 112 BPM, seamless loop, no vocals, instrumental`
2. *Circuit Bloom* — `Melodic techno instrumental, crystalline plucked arpeggio, deep rolling bassline, crisp hi-hats, evolving filter sweeps, glassy digital textures, optimistic futurism, 118 BPM, seamless loop, no vocals, instrumental`
3. *Chrome Lagoon* — `Downtempo synthwave instrumental, slow FM electric piano, lush analog pads, soft linn drum groove, shimmering delay textures, cool and reflective, neon reflected on water, 106 BPM, seamless loop, no vocals, instrumental`
4. *Signal Rain* — `Dark synthwave instrumental, driving octave bass, sharp digital lead stabs, tight electronic drums, glitchy transmission textures, rain and static ambience, urgent and cybernetic, 120 BPM, seamless loop, no vocals, instrumental`

## 1.6 📻 Aurora Deep — Islands 111–120 (Transcendence / Cosmic Endgame)

The endgame. Nearly beatless — after 110 islands the player has earned quiet. This station should feel like arrival, not like a final boss.

| # | Title | File | Len | BPM | Status |
|---|---|---|---|---|---|
| 1 | Aurora Deep | `mus_aurora_deep_v1` | 120 s | 70 | ⬜ |
| 2 | Starfall Shrine | `mus_aurora_starfall_shrine_v1` | 120 s | 64 | ⬜ |
| 3 | The Long Now | `mus_aurora_long_now_v1` | 120 s | — | ⬜ |
| 4 | Homecoming | `mus_aurora_homecoming_v1` | 120 s | 76 | ⬜ |

**Prompts**

1. *Aurora Deep* — `Ambient space instrumental, vast evolving synth pads, wordless ethereal choir, slow sub bass swells, distant bell tones, weightless and infinite, minimal percussion, 70 BPM, seamless loop, no vocals, instrumental`
2. *Starfall Shrine* — `Cinematic ambient instrumental, glacial string pad, sparse piano notes with long decay, shimmering granular texture, deep resonant drone, sacred and vast, 64 BPM, seamless loop, no vocals, instrumental`
3. *The Long Now* — `Pure ambient drone instrumental, layered warm analog pads slowly phasing, no percussion, no melody, subtle harmonic movement, deep and still, meditative infinity, seamless loop, no vocals, instrumental`
4. *Homecoming* — `Emotional ambient orchestral instrumental, soft solo cello over wide synth pad, gentle piano motif, slow swelling strings, distant wordless choir, bittersweet arrival and completion, 76 BPM, seamless loop, no vocals, instrumental`

## 1.7 📻 Deep Work — any island; default for Timer / Meditation / Zen Garden

Deliberately unmemorable. If the player can hum it afterwards, it failed. No melodic hooks, no dynamic surprises, nothing that pulls attention.

| # | Title | File | Len | BPM | Status |
|---|---|---|---|---|---|
| 1 | Slow Current | `mus_focus_slow_current_v1` | 150 s | 60 | ⬜ |
| 2 | Paper Lanterns | `mus_focus_paper_lanterns_v1` | 150 s | 66 | ⬜ |
| 3 | Rain Desk | `mus_focus_rain_desk_v1` | 150 s | — | ⬜ |
| 4 | Breath Cycle | `mus_focus_breath_cycle_v1` | 150 s | 55 | ⬜ |

**Prompts**

1. *Slow Current* — `Minimal ambient instrumental for deep focus, soft sustained pads, very subtle low pulse, no melody, no dynamic changes, warm and neutral, non-distracting background, 60 BPM, seamless loop, no vocals, instrumental`
2. *Paper Lanterns* — `Gentle minimal instrumental, sparse felt piano notes, warm tape hiss, soft room tone, no drums, extremely calm and steady, unobtrusive study music, 66 BPM, seamless loop, no vocals, instrumental`
3. *Rain Desk* — `Ambient lo-fi instrumental, steady soft rain and distant thunder, muffled warm pad underneath, no percussion, no melody, cozy and enveloping, focus background, seamless loop, no vocals, instrumental`
4. *Breath Cycle* — `Meditative ambient instrumental, slow swelling pad rising and falling in an even four-count cycle, soft singing bowl resonance, deep quiet drone, designed for paced breathing, 55 BPM, seamless loop, no vocals, instrumental`

---

# 2. Contextual loops

These take the music channel from the radio and hand it back on exit (§3.3 of the master plan).

| Surface | Title | File | Len | Status | Notes |
|---|---|---|---|---|---|
| Entry / onboarding | Title Theme | `mus_ctx_entry_theme_v1` | 45 s | ⬜ | Plays behind the audio-choice modal |
| Cold-start bed | Offline Bed | `mus_bed_coldstart_v1` | 30 s | ⬜ | **Bundled**, ~350 KB, precached |
| Shop / Market | Lantern Tide | `Lantern Tide.mp3` | — | ✅ | Rename to `mus_ctx_market_lounge_v1` |
| Vault Rush (base) | Vault Rush | `mus_ctx_vault_rush_l1_v1` | 60 s | ⬜ | Stem layer 1 |
| Vault Rush (layer 2) | Vault Rush — Pressure | `mus_ctx_vault_rush_l2_v1` | 60 s | ⬜ | Unmutes at 1 match |
| Vault Rush (layer 3) | Vault Rush — Crack | `mus_ctx_vault_rush_l3_v1` | 60 s | ⬜ | Unmutes at 2 matches |
| Vault cracked | Vault Payoff | `mus_ctx_vault_cracked_v1` | 6 s | ⬜ | One-shot, not a loop |
| Boss (standard) | The Duel | `mus_ctx_boss_duel_v1` | 75 s | 🔧 | `boss-rhythm-duel-loop-v1.mp3` is a **2-byte stub** — fix in Phase 0 |
| Island clear | New Horizon | `new-island-celebration-loop-v1.mp3` | — | ✅ | Rename to `mus_ctx_island_clear_v1` |
| Luxury reward | Luxury Reward | `luxury-reward-loop-v1.mp3` | — | ✅ | Keep |
| Event jackpot | Jackpot | `event-jackpot-loop-v1.mp3` | — | ✅ | Keep |
| Hatchery | Hatchery Lull | `mus_ctx_hatchery_lull_v1` | 45 s | ⬜ | |
| Egg hatched | Egg Hatched | `Egg_hatched.mp3` | — | ✅ | Rename to `sting_egg_hatched_v1`, move to stingers |
| Creature pack opening | Pack Opening | `mus_ctx_pack_opening_v1` | 20 s | ⬜ | Builds to a peak, then silence for the reveal |
| Build modal | Workshop | `mus_ctx_build_workshop_v1` | 60 s | ⬜ | |
| Daily Treats calendar | Treat Calendar | `mus_ctx_treat_calendar_v1` | 45 s | ⬜ | Seasonal-warm, music-box flavour |
| Island ambient (dreamt) | Island Dreamy Night | `Island dreamy relaxing night islands.mp3` | — | ✅ | Keep for dreamt islands (every 10th) |

**Prompts**

- **Title Theme** — `Uplifting orchestral-electronic hybrid instrumental, warm marimba and ukulele motif joined by strings and soft synth pad, hopeful rising melody, a signature theme you would recognise instantly, welcoming and adventurous, 100 BPM, seamless loop, no vocals, instrumental`
- **Offline Bed** — `Simple warm ambient instrumental, soft pad chords and gentle marimba, minimal and pleasant, generic tropical calm, designed as an unobtrusive fallback, 90 BPM, seamless loop, no vocals, instrumental`
- **Vault Rush L1** — `Sparse heist tension instrumental, muted pizzicato strings, soft ticking clock percussion, low pulsing bass, lots of space and silence, suspense building slowly, 100 BPM, seamless loop, no vocals, instrumental`
- **Vault Rush L2** — `Same tempo and key as a sparse heist tension track, adding tight shaker and hi-hat sixteenths, staccato string ostinato, rising pressure, 100 BPM, seamless loop, no vocals, instrumental` *(generate against L1 as reference; must be bar-aligned)*
- **Vault Rush L3** — `Same tempo and key as a heist tension track, adding urgent brass stabs, driving kick pattern, alarm-like synth pulses, maximum tension, 100 BPM, seamless loop, no vocals, instrumental` *(bar-aligned with L1/L2)*
- **Vault Payoff** — `Short triumphant heist payoff sting, cascading bell and coin-like glissando, brass hit, warm resolving chord, six seconds, celebratory, no vocals, instrumental`
- **The Duel** — `Intense cinematic battle instrumental, driving taiko and electronic drums, aggressive low brass ostinato, dark string tremolo, sharp metallic hits, high stakes duel energy, 130 BPM, seamless loop, no vocals, instrumental`
- **Hatchery Lull** — `Gentle curious instrumental, music box melody, soft warm pad, delicate glockenspiel, tiny heartbeat pulse underneath, tender anticipation, nurturing, 80 BPM, seamless loop, no vocals, instrumental`
- **Pack Opening** — `Rising anticipation instrumental, twenty seconds, building shimmer of strings and rising synth swell with accelerating ticking percussion, ends on a held suspended chord ready for a reveal, no resolution, no vocals, instrumental`
- **Workshop** — `Light crafting instrumental, wooden percussion and hammer taps used as rhythm, plucked strings, warm bass, industrious and satisfying, cozy workshop feel, 108 BPM, seamless loop, no vocals, instrumental`
- **Treat Calendar** — `Warm cozy instrumental, celesta and music box melody, soft bells, gentle plucked harp, wrapping-paper rustle texture, festive and inviting without being seasonal-specific, 92 BPM, seamless loop, no vocals, instrumental`

---

# 3. Mini-game loops

One signature loop each. Tempo matched to the actual pace of play — generate, then play the mini-game against it before accepting.

| Mini-game | Title | File | Len | BPM | Status |
|---|---|---|---|---|---|
| Task Tower | Stack Higher | `mus_mg_task_tower_v1` | 60 s | 124 | ⬜ |
| Lucky Spin | House Rules | `mus_mg_lucky_spin_v1` | 45 s | 118 | ⬜ |
| Space Excavator / Shooter Blitz | Deep Vein | `mus_mg_space_excavator_v1` | 75 s | 140 | ⬜ |
| Companion Feast | Feeding Time | `mus_mg_companion_feast_v1` | 60 s | 112 | ⬜ |
| Fortune Engine | Clockwork Fortune | `mus_mg_fortune_engine_v1` | 60 s | 100 | ⬜ |
| Island Workshop | Hammer & Tide | `mus_mg_island_workshop_v1` | 60 s | 108 | ⬜ |
| Vision Quest | Far Sight | `mus_mg_vision_quest_v1` | 75 s | 86 | ⬜ |
| Zen Garden | Still Water | `mus_mg_zen_garden_v1` | 120 s | 56 | ⬜ |
| Boss Rhythm | — | *procedural* | — | — | ✅ Keep `bossRhythmAudio.ts` |

**Prompts**

- **Stack Higher** — `Energetic puzzle game instrumental, punchy electronic drums, bouncy synth bass, bright chiptune-flavoured lead, escalating tension, arcade urgency, 124 BPM, seamless loop, no vocals, instrumental`
- **House Rules** — `Playful casino swing instrumental, walking upright bass, brushed drums, muted trumpet stabs, vibraphone flourishes, glamorous and lucky, 118 BPM, seamless loop, no vocals, instrumental`
- **Deep Vein** — `Fast driving electronic instrumental, aggressive sidechained bass, propulsive kick pattern, sharp synth arpeggios, sci-fi mining and combat energy, high adrenaline, 140 BPM, seamless loop, no vocals, instrumental`
- **Feeding Time** — `Playful bouncy instrumental, pizzicato strings, marimba and woodblock, comedic tuba bass, light hand percussion, cute and warm, cartoon creature energy, 112 BPM, seamless loop, no vocals, instrumental`
- **Clockwork Fortune** — `Mechanical groove instrumental, ticking clockwork percussion, music box melody over analog bass, gears and ratchets as rhythm, curious and slightly mysterious, 100 BPM, seamless loop, no vocals, instrumental`
- **Hammer & Tide** — `Rhythmic crafting instrumental, anvil hits and wooden percussion driving the groove, plucked strings, warm brass accents, sea breeze texture, industrious and satisfying, 108 BPM, seamless loop, no vocals, instrumental`
- **Far Sight** — `Dreamy uplifting instrumental, wide reverberant piano, shimmering pad, soft rolling drums, distant wordless voice texture, hopeful and expansive, feels like imagining the future, 86 BPM, seamless loop, no vocals, instrumental`
- **Still Water** — `Japanese-influenced ambient instrumental, sparse koto notes, shakuhachi flute breaths, water droplets and bamboo, deep soft drone, profoundly calm and still, 56 BPM, seamless loop, no vocals, instrumental`

---

# 4. Story pads

Under dialogue, so: no melody that competes with reading, no rhythmic hook that fights the typewriter reveal, no dynamic surprises.

| Mood | File | Len | Status | Used for |
|---|---|---|---|---|
| Calm | `mus_story_calm_v1` | 90 s | ⬜ | Openings, island arrivals |
| Wonder | `mus_story_wonder_v1` | 90 s | ⬜ | Discovery, Concord tech reveals |
| Tension | `mus_story_tension_v1` | 90 s | ⬜ | The Great Drift, threat beats |
| Resolve | `mus_story_resolve_v1` | 90 s | ⬜ | Chapter ends, earned moments |

**Prompts**

- **Calm** — `Understated ambient underscore, warm sustained pad, occasional soft piano note, no melody, no percussion, designed to sit beneath spoken dialogue, gentle and neutral, seamless loop, no vocals, instrumental`
- **Wonder** — `Ambient underscore of quiet awe, shimmering high pad, slow bell tones with long decay, subtle rising harmonic movement, no percussion, mysterious and beautiful, sits beneath dialogue, seamless loop, no vocals, instrumental`
- **Tension** — `Dark ambient underscore, low drone with slow dissonant swells, distant metallic scrapes, sparse deep pulses, no percussion, unsettling and restrained, sits beneath dialogue, seamless loop, no vocals, instrumental`
- **Resolve** — `Warm emotional ambient underscore, soft strings resolving to a major chord, gentle piano, slow swelling pad, no percussion, bittersweet and satisfying, sits beneath dialogue, seamless loop, no vocals, instrumental`

---

# 5. Stingers

Short one-shots, **not loops**. Play over ducked music. Bundled with the app (total ~250 KB).

## 5.1 Station IDs

2–4 s each. Same production identity across all seven so they read as one broadcaster.

| Station | File | Len | Status | Prompt |
|---|---|---|---|---|
| Shoreline FM | `sting_station_shoreline_v1` | 3 s | ⬜ | `Short radio station identifier sting, three seconds, bright ukulele strum and steel drum flourish resolving to a warm chord, sunny and welcoming, no vocals, instrumental` |
| Verdant Groove | `sting_station_verdant_v1` | 3 s | ⬜ | `Short radio station identifier sting, three seconds, quick conga fill into a marimba flourish and warm chord, lively and organic, no vocals, instrumental` |
| Ember Frequency | `sting_station_ember_v1` | 3 s | ⬜ | `Short radio station identifier sting, three seconds, taiko hit into rising metallic sweep and low brass stab, powerful and hot, no vocals, instrumental` |
| Mythic Hall | `sting_station_mythic_v1` | 3 s | ⬜ | `Short radio station identifier sting, three seconds, harp glissando into a noble horn call, orchestral and grand, no vocals, instrumental` |
| Neon Drift | `sting_station_neon_v1` | 3 s | ⬜ | `Short radio station identifier sting, three seconds, retro synth arpeggio sweep into a gated chord hit, chrome and neon, no vocals, instrumental` |
| Aurora Deep | `sting_station_aurora_v1` | 4 s | ⬜ | `Short radio station identifier sting, four seconds, ethereal pad swell with distant bell and wordless choir texture, vast and weightless, no vocals, instrumental` |
| Deep Work | `sting_station_focus_v1` | 2 s | ⬜ | `Very short station identifier, two seconds, single soft marimba note with warm pad swell, minimal and calm, no vocals, instrumental` |

## 5.2 Celebration & progression stingers

| Event | File | Len | Status | Prompt |
|---|---|---|---|---|
| Level up | `sting_level_up_v1` | 2.5 s | ⬜ | `Short triumphant level up jingle, rising four-note brass and bell fanfare resolving to a bright major chord, satisfying and clean, no vocals, instrumental` |
| Rank up | `sting_rank_up_v1` | 3.5 s | ⬜ | `Short prestigious rank promotion fanfare, orchestral horns with cymbal swell and choir accent, grander than a normal level up, no vocals, instrumental` |
| Island unlocked | `sting_island_unlock_v1` | 3 s | ⬜ | `Short discovery fanfare, warm strings rising with harp glissando and a bright chime resolve, a new place revealed, no vocals, instrumental` |
| Boss defeated | `sting_boss_defeated_v1` | 4 s | ⬜ | `Short victory fanfare after a battle, powerful brass hit into a resolving heroic chord with cymbal and taiko, triumphant relief, no vocals, instrumental` |
| Quest complete | `sting_quest_complete_v1` | 2.5 s | ⬜ | `Short quest completion jingle, ascending harp and glockenspiel arpeggio to a warm resolved chord, satisfying and gentle, no vocals, instrumental` |
| Streak saved | `sting_streak_saved_v1` | 2 s | ⬜ | `Short relief sting, a tense held note releasing into a warm major chord with a soft chime, near-miss turned good, no vocals, instrumental` |
| Daily complete | `sting_daily_complete_v1` | 2.5 s | ⬜ | `Short daily goal completion jingle, bright marimba and bell ascending run with a warm pad resolve, cheerful and clean, no vocals, instrumental` |
| New creature | `sting_new_creature_v1` | 3 s | ⬜ | `Short magical creature reveal sting, sparkling chimes and a rising twinkling arpeggio landing on a wondrous chord, cute and magical, no vocals, instrumental` |
| Travel | `sting_travel_v1` | 2 s | ⬜ | `Short travel transition sting, a rising whoosh with a soft bell arrival, movement between places, no vocals, instrumental` |
| Egg hatched | `Egg_hatched.mp3` | — | ✅ | Rename `sting_egg_hatched_v1` |
| Jackpot | `sting_jackpot_v1` | 3.5 s | ⬜ | `Short jackpot celebration sting, cascading coin bells with brass fanfare and a big resolving chord, over-the-top lucky, no vocals, instrumental` |

---

# 6. Ambience beds

Long, near-static, plays independently of music (`ambienceEnabled`). One per zone. 60 s seamless.

| Zone | File | Status | Prompt |
|---|---|---|---|
| 1–24 Shoreline | `amb_shore_waves_v1` | ⬜ | `Sixty seconds of gentle tropical beach ambience, soft rhythmic waves lapping on sand, distant seagulls, light warm breeze through palm leaves, no music, seamless loop` |
| 25–48 Jungle | `amb_jungle_life_v1` | ⬜ | `Sixty seconds of lush rainforest ambience, layered bird calls, insects, distant water trickling, leaves rustling, humid and alive, no music, seamless loop` |
| 49–72 Volcanic | `amb_volcano_rumble_v1` | ⬜ | `Sixty seconds of volcanic ambience, low earth rumble, crackling fire and embers, occasional distant boom, hissing steam vents, tense and hot, no music, seamless loop` |
| 73–96 Mythic | `amb_hall_wind_v1` | ⬜ | `Sixty seconds of ancient stone hall ambience, hollow wind through corridors, distant low bell, faint dripping water, deep reverberant space, no music, seamless loop` |
| 97–110 Tech | `amb_tech_hum_v1` | ⬜ | `Sixty seconds of futuristic facility ambience, low electrical hum, soft periodic data beeps, distant machinery, air circulation, clean and synthetic, no music, seamless loop` |
| 111–120 Cosmic | `amb_cosmic_drone_v1` | ⬜ | `Sixty seconds of deep space ambience, vast low drone, faint shimmering high texture, occasional distant resonant tone, weightless and infinite, no music, seamless loop` |

---

# 7. DJ voice drops (Phase 5, optional)

ElevenLabs TTS. 3–6 s each. Three per station. Gated by `voiceEnabled`, max one per three tracks.

Script rule: **station identity, never information.** No tips, no reminders, no nagging. The DJ exists to make the world feel inhabited.

| Station | Voice direction | Example lines |
|---|---|---|
| Shoreline FM | Warm, unhurried, smiling | *"Shoreline FM. Nothing urgent out here."* · *"Tide's in, sun's up. You know what to do."* |
| Verdant Groove | Energetic, rhythmic | *"Verdant Groove — everything's growing, including you."* |
| Ember Frequency | Low, intense, clipped | *"Ember Frequency. Turn it up. Something's coming."* |
| Mythic Hall | Formal, theatrical, old | *"You are listening to Mythic Hall. Your name is being written."* |
| Neon Drift | Cool, processed, slight vocoder | *"Neon Drift. All signals nominal."* |
| Aurora Deep | Soft, distant, near-whisper | *"Aurora Deep. Broadcasting from further out than you'd think."* |
| Deep Work | Almost none — one line only | *"Deep Work. I'll be quiet now."* |

Files: `/assets/audio/vo/dj_<station>_<n>_v1.mp3`

---

# 8. Generation checklist

For each track, before it ships:

- [ ] Generated 3+ takes, picked the one that survives 10 loops
- [ ] Instrumental (or 🎤-approved)
- [ ] Trimmed to a bar boundary, loop seam inaudible over 5 consecutive plays
- [ ] Normalised −16 LUFS / ≤ −1.5 dBTP
- [ ] Encoded `-hi` (160 kbps stereo) + `-lo` (96 kbps mono)
- [ ] Filename matches the naming convention, `_v1` suffix present
- [ ] Uploaded to `game-audio/` bucket (music) or `public/assets/audio/` (stingers, beds)
- [ ] Added to `src/services/audio/audioManifest.ts`
- [ ] `npm run check:audio-assets` passes
- [ ] Auditioned in-context on the actual surface, on a phone, through phone speakers *and* headphones
- [ ] Generation tool + plan tier + date recorded (licensing — see master plan §11.4)
