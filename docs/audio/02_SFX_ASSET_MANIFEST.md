# HabitGame — Sound Effect Asset Manifest

**Status:** Generation-ready list. Authored 2026-07-25.
**Parent:** `docs/audio/00_AUDIO_MASTER_PLAN.md`
**Sibling:** `docs/audio/01_MUSIC_ASSET_MANIFEST.md`

Every sound effect in the game: ID, what fires it, how it should sound, the ElevenLabs prompt, and its paired haptic.

---

## How to read this

| Column | Meaning |
|---|---|
| **★** | Tier 1 — ship in Phase 1. Events sharing an asset with something else, the highest-frequency interactions, and **every existing placeholder that needs regenerating**. |
| **ID / file** | `sfx_<domain>_<name>` → `/assets/audio/sfx/sfx_<domain>_<name>.mp3`. A file still carrying a `.PLACEHOLDER.mp3` suffix is not yet real — see §0.1. |
| **Trigger** | The code event. Names in `code font` already exist in `IslandRunSoundEvent` (`src/features/gamification/level-worlds/services/islandRunAudio.ts`) — those need only an asset, no new plumbing. |
| **Len** | Target duration after trimming. |
| **Haptic** | Paired pattern. `—` = no haptic. Existing patterns live in `HAPTIC_PATTERNS`. |
| **Prompt** | Paste into ElevenLabs Sound Effects. |
| 🔶 | Marks a sound that **exists today but is a placeholder** — the file is there, the audio is not acceptable. Regenerate. |

**Production spec for every SFX:** mono, 44.1 kHz, MP3 128 kbps (96 kbps under 300 ms), trimmed to ≤ 5 ms of head silence, 10 ms tail fade, peaks normalised to −3 dBFS, family-matched by ear.

**Current state:** 31 typed sound events are mapped onto **7 placeholder files**, and the app's UI sounds are raw oscillator beeps. Nothing in the SFX layer is approved — see §0.

---

## 0. ⚠️ Everything that currently exists is a PLACEHOLDER

**No sound effect in the app today is approved. All 7 shipped SFX files and all 9 procedural UI sounds are placeholders and are scheduled for replacement.** They were stand-ins to get the game moving; the dice roll, tile land and button clicks in particular are actively hurting how the game feels.

> **This does not apply to music.** The tracks under `/assets/audio/music/` are approved Suno Pro originals and must **not** be regenerated or replaced. See `01_MUSIC_ASSET_MANIFEST.md` §0.

### 0.1 Shipped SFX files — all placeholder, and now named that way

Every file on disk carries a **`.PLACEHOLDER.mp3`** suffix so it cannot be mistaken for a finished asset — in a file browser, in a diff, in the network tab. `SOUND_ASSET_MAP` in `islandRunAudio.ts` points at the `.PLACEHOLDER.mp3` paths today.

**When a real replacement lands, drop the `.PLACEHOLDER` suffix** — the file becomes e.g. `sfx_dice_roll.mp3` again, `SOUND_ASSET_MAP` is updated to point at it, and the path is removed from `PLACEHOLDER_SOUND_ASSET_PATHS`. Do not ship a real recording still carrying the `.PLACEHOLDER` suffix, and do not remove the suffix without swapping the audio underneath it.

| Current file on disk | Target filename (on replacement) | Size | Currently used for | Action |
|---|---|---|---|---|
| `sfx_dice_roll.PLACEHOLDER.mp3` | `sfx_dice_roll.mp3` | 4.4 KB | `roll`, `reward_bar_fill`, `coin_flip` | 🔶 **Replace.** Then free the other two events |
| `sfx_tile_land.PLACEHOLDER.mp3` | `sfx_tile_land.mp3` | 2.9 KB | `token_move`, `stop_land`, `build_upgrade`, `island_travel`, `multiplier_cycle`, `encounter_trigger`, `encounter_resolve`, `utility_stop_complete` | 🔶 **Replace — highest priority.** 8 events on one bad file |
| `sfx_egg_open.PLACEHOLDER.mp3` | `sfx_egg_open.mp3` | 7.5 KB | `egg_set`, `egg_ready`, `egg_open` | 🔶 **Replace.** Then free the other two |
| `sfx_market_success.PLACEHOLDER.mp3` | `sfx_market_success.mp3` | 5.0 KB | `market_purchase_success`, `market_stop_complete` | 🔶 **Replace.** Then free `market_stop_complete` |
| `sfx_island_clear.PLACEHOLDER.mp3` | `sfx_island_clear.mp3` | 9.6 KB | `boss_trial_start`, `boss_trial_resolve`, `boss_island_clear`, `island_travel_complete` | 🔶 **Replace.** Then free the other three |
| `sfx_shop_open.PLACEHOLDER.mp3` | `sfx_shop_open.mp3` | 4.2 KB | `shop_open`, `market_purchase_attempt`, `market_insufficient_coins`, `minigame_open` | 🔶 **Replace.** Then free the other three |
| `sfx_reward_bar_claim_burst.PLACEHOLDER.mp3` | `sfx_reward_bar_claim_burst.mp3` | 6.9 KB | `reward_bar_claim_burst`, `reward_bar_cascade`, `sticker_complete`, `minigame_complete`, `multiplier_max`, `coin_reveal`, `tech_item_poof` | 🔶 **Replace — highest priority.** 7 events on one bad file |

So there are two independent problems, and fixing only one leaves the game sounding bad:

1. **24 of 31 events borrow another event's sound** → fixed by generating the missing files.
2. **The 7 sounds they borrow are themselves poor** → fixed by regenerating those 7 too.

### 0.2 Procedural UI sounds — also placeholder

`src/utils/audioUtils.ts` synthesises its sounds from raw oscillators (`playClick`, `playFooterClickSound`, `playLauncherOpenSound/CloseSound`, `playChime`, `playCoinJingle`, `playSweep`, `playCelebrationCascade`, `playTone`). Zero bytes, zero latency — and they sound like beeps.

**Earlier revisions of this doc recommended keeping them. That was wrong.** The tap/click sounds are the first thing a player hears and among the most-fired sounds in the app; a synthesised square wave is not acceptable there. **Every UI sound in §1 is now Tier 1 (★) and slated for a real recorded asset.**

Call sites to migrate: `MobileFooterNav` (7), `TaskTower` (7), `DailyHabitTracker` (6), `VisionQuest` (3), `App.tsx` (2).

**One deliberate exception:** `bossRhythmAudio.ts` is also procedural but is **not** a placeholder. A rhythm game must stay sample-accurate against the audio clock, so synthesis is the correct choice there. Keep it.

### 0.3 How placeholders are marked in code

- **Filenames.** Every placeholder file on disk carries a `.PLACEHOLDER.mp3` suffix (e.g. `sfx_dice_roll.PLACEHOLDER.mp3`) — loud in a file browser, a diff, or the network tab. Drop the suffix only when the audio underneath has actually been replaced.
- `islandRunAudio.ts` exports `isPlaceholderSoundAsset(path)` and `getPlaceholderSoundEvents()`, and reports `placeholderEventCount` / `lastSoundWasPlaceholder` through `getIslandRunAudioDiagnostics()` so the dev panel can flag them live.
- `PLACEHOLDER_SOUND_ASSET_PATHS` currently contains every shipped SFX path (the `.PLACEHOLDER.mp3` paths). **Remove a path from that set — and drop the suffix from the file — when its real asset lands.** That set reaching empty is the definition of "SFX content is done".
- `audioUtils.ts` carries a file-level placeholder banner.
- `npm run check:audio-assets` (proposed, master plan §8) reports the remaining placeholder count and fails if any `SOUND_ASSET_MAP` entry points at a non-`.PLACEHOLDER` path that is still listed in `PLACEHOLDER_SOUND_ASSET_PATHS` (a stale suffix removal).

---

# 1. UI & Navigation — 12 sounds

The most-fired family in the app, and **currently the worst**: every one of these is a synthesised oscillator beep from `audioUtils.ts`. The whole family is Tier 1.

Design rule: **short, quiet and boring** — a UI sound you notice is a UI sound you'll hate by day three. Quiet does not mean cheap; these should sound like a well-built physical object, not a tone generator.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_ui_tap` | Any primary button | 60 ms | selection | `Very short soft UI tap, single subtle wooden click with a tiny warm resonance, clean and quiet, no reverb` |
| ★ | `sfx_ui_tap_soft` | Secondary/list taps | 50 ms | — | `Extremely short and subtle UI tick, soft muted felt tap, almost inaudible, no tone` |
| ★ | `sfx_ui_back` | Back / dismiss | 90 ms | — | `Short UI back navigation sound, soft descending two-note blip, muted and quiet, clean` |
| ★ | `sfx_ui_modal_open` | Any modal opens | 220 ms | — | `Short UI panel open sound, quick soft upward whoosh with a gentle glassy chime at the end, light and clean, no reverb tail` |
| ★ | `sfx_ui_modal_close` | Any modal closes | 200 ms | — | `Short UI panel close sound, quick soft downward whoosh settling into a muted thud, light and clean` |
| ★ | `sfx_ui_toggle_on` | Switch → on | 80 ms | selection | `Short crisp toggle switch on, small mechanical click with a bright upward tick, satisfying and tiny` |
| ★ | `sfx_ui_toggle_off` | Switch → off | 80 ms | selection | `Short crisp toggle switch off, small mechanical click with a muted downward tick` |
| ★ | `sfx_ui_tab_switch` | Footer nav tab change | 100 ms | selection | `Short UI tab switch sound, soft airy swipe with a subtle pitched blip, quick and light` |
| ★ | `sfx_ui_error` | Invalid action, denied | 250 ms | warning `[60,40,60]` | `Short soft UI error sound, two low muted buzzes descending, gentle and non-alarming, not harsh` |
| ★ | `sfx_ui_confirm` | Confirm/save success | 300 ms | success | `Short pleasant confirmation sound, two-note ascending soft bell chime, warm and clean, satisfying` |
| ★ | `sfx_ui_swipe` | Card swipe / carousel | 120 ms | — | `Short paper swipe sound, quick soft airy sweep, light card sliding past, subtle` |
| ★ | `sfx_ui_footer_game` | Game tab in footer | 180 ms | selection | `Short playful game menu button sound, warm low bloop with a bright arcade tick on top, inviting` |

---

# 2. Board & Movement — 14 sounds

The core loop. Fired more than anything else in the game and the single biggest driver of perceived quality.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_board_dice_shake` | Dice shake begins | 500 ms | `[15,25,15,25,15]` | `Sound of dice being shaken in a cupped hand, several plastic dice rattling together, dry and close-mic'd, half a second, no reverb` |
| ★ | `sfx_dice_roll` | `roll` | 700 ms | `[30]` | 🔶 **placeholder — regenerate.** Current file is poor. `Dice tumbling and rolling across a wooden board, two plastic dice bouncing three times and settling, dry close-mic'd, warm wooden resonance, tactile and satisfying` |
| ★ | `sfx_board_dice_settle` | Dice come to rest | 200 ms | selection | `Short sound of two dice clattering to a stop on wood, final two small taps and silence, dry and close` |
| ★ | `sfx_tile_land` | `stop_land` | 250 ms | `[20,40,20]` | 🔶 **placeholder — regenerate, highest priority.** Currently serves 8 events. `Short satisfying landing thud of a game piece on a wooden board tile, soft rounded impact with a warm low body and a tiny wooden click, clean and close` |
| ★ | `sfx_board_token_hop` | `token_move` | 150 ms | — (throttled) | `Very short playful hop sound, soft rounded bloop with a quick upward pitch bend, like a game piece jumping one space, light and bouncy` |
| ★ | `sfx_board_token_hop_final` | Last hop of a move | 220 ms | selection | `Short landing sound of a game piece, soft bloop with a satisfying downward settle and tiny wooden tap, conclusive` |
| ★ | `sfx_board_lap_complete` | Full board lap | 900 ms | `[30,40,30]` | `Short cheerful lap completion flourish, quick ascending four-note bell run with a soft cymbal shimmer, rewarding, under a second` |
| ★ | `sfx_board_bonus_tile` | Bonus tile landed | 500 ms | `[20,30,20]` | `Short bright bonus sound, sparkling ascending chime with a warm bell hit, lucky and cheerful, half a second` |
| ★ | `sfx_board_travel_launch` | `island_travel` | 1200 ms | `[30,50,30]` | `Departure whoosh, a rising airy sweep with a subtle magical shimmer, sense of leaving and accelerating away, just over a second` |
| ★ | `sfx_board_travel_arrive` | `island_travel_complete` | 1500 ms | `[30,50,30,50,30]` | `Arrival sound at a new place, descending airy whoosh landing into a warm bright chord with distant seabird and wave texture, welcoming, a second and a half` |
| ★ | `sfx_board_multiplier_cycle` | `multiplier_cycle` | 120 ms | selection | `Very short ratcheting click, single mechanical detent notch turning, crisp and tight` |
| ★ | `sfx_board_multiplier_max` | `multiplier_max` | 400 ms | `[40,30,40]` | `Short power-up confirmation, three rapid ascending electronic ticks landing on a bright charged tone, maxed out` |
| ★ | `sfx_board_out_of_dice` | Dice exhausted | 400 ms | warning | `Short empty depleted sound, hollow wooden knock with a soft descending sigh, gently disappointing, not harsh` |
| ★ | `sfx_board_encounter` | `encounter_trigger` | 600 ms | `[20,30,20]` | `Short mysterious encounter sting, quick rising harp glissando with a soft mallet hit, something has appeared, curious not threatening` |

---

# 3. Economy & Currency — 11 sounds

Money sounds must be **generous**. This family is where the game says thank you.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_coin_single` | +1 coin | 180 ms | — | `Short single gold coin sound, one bright metallic ting with a quick warm decay, clean and satisfying` |
| ★ | `sfx_coin_burst_small` | Small coin payout | 600 ms | `[20,30,20]` | `Short burst of gold coins, six or seven metallic coin tings cascading quickly, bright and rewarding, under a second` |
| ★ | `sfx_coin_burst_large` | Big coin payout | 1400 ms | `[20,30,20,30,20]` | `Large cascade of gold coins pouring out, dozens of metallic coin tings tumbling and scattering, rich and abundant, about a second and a half` |
| ★ | `sfx_essence_gain` | Essence/money gain | 400 ms | — | `Short magical energy collection sound, soft shimmering upward swell with a crystalline chime, ethereal and warm` |
| ★ | `sfx_dice_gain` | Dice granted | 500 ms | `[20,30,20]` | `Short sound of dice being handed over, a few plastic dice clacking together landing with a bright confirming chime` |
| ★ | `sfx_ticket_gain` | Minigame ticket gain | 350 ms | — | `Short paper ticket sound, quick tear and flutter with a small bright bell ping, arcade token feel` |
| ★ | `sfx_shard_gain` | Shard collected | 450 ms | `[25]` | `Short crystal shard collection, bright glassy chime with a subtle crystalline ring-out, precious and clean` |
| ★ | `sfx_market_success` | `market_purchase_success` | 500 ms | `[20,40,20]` | 🔶 **placeholder — regenerate.** `Purchase confirmation, warm bell ding with a soft coin clink and a brief satisfied chime, generous and clean` |
| ★ | `sfx_purchase_denied` | `market_insufficient_coins` | 350 ms | warning | `Short purchase denied sound, low muted double buzz with a small negative descending tone, gentle refusal, not harsh` |
| ★ | `sfx_shop_open` | `shop_open` | 400 ms | — | 🔶 **placeholder — regenerate.** `Shop door opening, soft wooden swing with a small bright welcome bell jingle, inviting and warm` |
| ★ | `sfx_wallet_tick` | Balance counting up | 40 ms | — | `Extremely short currency counter tick, single tiny metallic blip, designed to be repeated rapidly while a number counts up` |

---

# 4. Reward Bar & Collectibles — 9 sounds

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_reward_bar_fill` | `reward_bar_fill` | 200 ms | — (throttled) | `Very short progress fill blip, soft rising synthetic swell with a small pitched tick, designed to repeat with rising pitch as a bar fills` |
| ★ | `sfx_reward_bar_tick` | Segment crossed | 100 ms | selection | `Very short progress notch tick, crisp bright click with a tiny bell overtone` |
| ★ | `sfx_reward_bar_claim_burst` | `reward_bar_claim_burst` | 800 ms | `[20,30,20,30,20]` | 🔶 **placeholder — regenerate, highest priority.** Currently serves 7 events. `Reward claim burst, bright sparkle cascade opening into a warm resolving chord with a soft coin shimmer, generous and celebratory` |
| ★ | `sfx_reward_bar_cascade` | `reward_bar_cascade` | 2000 ms | `[15,20,15,20,15,20,15]` | `Cascading multi-reward payout, a long rolling series of bright chimes and coin tings tumbling one after another with rising excitement, two seconds` |
| ★ | `sfx_sticker_place` | Sticker placed | 300 ms | selection | `Short sticker being pressed onto paper, soft peel and satisfying press with a small pop, tactile and clean` |
| ★ | `sfx_sticker_complete` | `sticker_complete` | 1200 ms | `[30,40,30,40,30]` | `Collection set completed fanfare, ascending sparkle run into a warm triumphant chord with a soft cymbal shimmer, over a second` |
| ★ | `sfx_chest_unlock` | Chest unlocking | 600 ms | `[25,35,25]` | `Treasure chest lock mechanism, heavy metal latch turning and clicking open, three mechanical clunks, weighty and satisfying` |
| ★ | `sfx_chest_open` | Chest opens | 1000 ms | `[30,40,30]` | `Wooden treasure chest lid creaking open, revealing a warm magical shimmer and glow inside, hinge creak into sparkle, one second` |
| ★ | `sfx_tech_item_poof` | `tech_item_poof` | 300 ms | `[12,18,12]` | `Very short magical poof, soft puff of air with a light sparkle scatter, item vanishing, delicate` |

---

# 5. Eggs & Creatures — 11 sounds

The emotional centre of the collection loop. These deserve the most generation attempts.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_egg_set` | `egg_set` | 500 ms | `[25]` | `Short sound of placing an egg into a nest, soft rustle of straw with a gentle settling thud and a small warm chime, tender` |
| ★ | `sfx_egg_stage_up` | Incubation stage up | 700 ms | `[20,30,20]` | `Short magical growth sound, warm rising shimmer with a soft heartbeat pulse and a gentle bell, something developing inside` |
| ★ | `sfx_egg_ready` | `egg_ready` | 800 ms | `[25,35,25]` | `Short attention chime for a ready egg, three ascending warm bell notes with a soft magical shimmer, inviting and gentle` |
| ★ | `sfx_egg_crack` | Shell cracking | 600 ms | `[20,40,20]` | `Egg shell cracking, sharp brittle crack with small shell fragments falling, close-mic'd and organic, tense` |
| ★ | `sfx_egg_open` | `egg_open` | 900 ms | `[20,40,20,40,20]` | 🔶 **placeholder — regenerate.** `Egg hatching open, final shell crack releasing into a warm magical reveal shimmer with a gentle rising chime, tender and wondrous` |
| ★ | `sfx_creature_reveal_common` | Common reveal | 900 ms | `[25,35,25]` | `Short cute creature reveal, warm ascending three-note chime with a soft sparkle, friendly and pleasant, nothing grand` |
| ★ | `sfx_creature_reveal_rare` | Rare reveal | 1500 ms | `[30,40,30,40,30]` | `Rare creature reveal, rising shimmering swell into a bright crystalline chord with sparkle cascade, exciting and special, a second and a half` |
| ★ | `sfx_creature_reveal_legendary` | Legendary reveal | 2500 ms | `[50,30,50,30,50]` | `Legendary creature reveal, deep resonant hit into a long rising choral shimmer with brilliant crystalline sparkles and a triumphant golden chord, awe-inspiring, two and a half seconds` |
| | `sfx_creature_happy` | Creature interaction | 500 ms | — | `Short cute creature chirp, small warm friendly vocalisation, curious and happy, cartoon animal, not a real animal recording` |
| ★ | `sfx_pack_tear` | Pack opening starts | 700 ms | `[20,30,20]` | `Foil card pack being torn open, crisp plastic tear with crinkle, close-mic'd and satisfying` |
| ★ | `sfx_pack_cards_fan` | Cards fan out | 800 ms | selection | `Cards being fanned and spread out, crisp riffle of card edges sliding against each other, close and clean` |

---

# 6. Vault Rush — 8 sounds

The Vault is a tension game. The **near-miss** sound is the most important one here: it's what makes the player tap the next door.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_vault_door_reveal` | Door tapped/revealed | 400 ms | selection | `Small metal vault door swinging open, quick hinge creak with a soft metallic clunk, close and dry` |
| ★ | `sfx_vault_tumbler_click` | Prize dot lights | 150 ms | selection | `Single vault lock tumbler falling into place, crisp mechanical click with a metallic resonance, precise` |
| ★ | `sfx_vault_match_1` | 1st of a kind found | 400 ms | `[20]` | `Short low positive tone, single warm bell note with a subtle rising tail, first step of a sequence` |
| ★ | `sfx_vault_match_2` | 2nd of a kind found | 500 ms | `[25,25,25]` | `Short mid positive tone, single brighter bell note a fourth higher with a rising shimmer, tension building, second step of a sequence` |
| ★ | `sfx_vault_match_3_crack` | 3rd — vault cracks | 1800 ms | `[50,30,50,30,50]` | `Vault cracking open, heavy mechanical lock release into a deep metallic boom, then a rush of golden sparkle and coin shimmer, triumphant heist payoff, nearly two seconds` |
| ★ | `sfx_vault_near_miss` | Non-matching reveal | 500 ms | `[30]` | `Short near-miss sound, a rising hopeful tone that stalls and falls back down with a soft muted thud, so close, teasing not punishing` |
| ★ | `sfx_vault_alarm_tick` | Tension escalation | 200 ms | — | `Short tense alarm tick, single muted electronic pulse with a slight metallic edge, designed to repeat and build pressure` |
| ★ | `sfx_vault_payout` | Essence awarded | 1500 ms | `[20,30,20,30,20]` | `Large treasure payout, heavy cascade of gold coins and jewels pouring onto a hard surface, rich metallic tumbling, a second and a half` |

---

# 7. Build & Workshop — 8 sounds

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_build_place` | Structure placed | 500 ms | `[20,40,20]` | `Wooden structure being set down and locking into place, solid wooden thunk with a satisfying click, weighty and clean` |
| ★ | `sfx_build_upgrade` | `build_upgrade` | 900 ms | `[25,35,25]` | `Building upgrade sound, quick construction flourish of wood and stone assembling, rising into a bright confirming chime, satisfying growth` |
| ★ | `sfx_build_complete` | Build finished | 1400 ms | `[30,40,30,40,30]` | `Construction completion fanfare, final hammer strike into a warm ascending chime run with a soft celebratory shimmer, proud and complete` |
| ★ | `sfx_build_denied` | Can't afford / blocked | 350 ms | warning | `Short blocked construction sound, dull wooden thud with a low muted negative tone, gentle refusal` |
| | `sfx_build_hammer` | Hammer tap (loop-ish) | 200 ms | selection | `Single hammer strike on wood, sharp dry impact with a short woody resonance, close-mic'd carpentry` |
| | `sfx_build_crane` | Crane / lift motion | 1200 ms | — | `Mechanical crane lifting, low motor hum with rope and pulley creaking, steady and industrial, just over a second` |
| ★ | `sfx_build_unlock_slot` | New slot unlocked | 700 ms | `[25,35,25]` | `Short unlock sound for a new building plot, mechanical latch release into a bright ascending chime, opening up a possibility` |
| | `sfx_build_blueprint_open` | Blueprint/menu open | 400 ms | — | `Paper blueprint being unrolled, crisp paper unfurling with a soft flap, close and dry` |

---

# 8. Boss & Combat — 10 sounds

Used by standard boss stops and Shooter Blitz. **Boss Rhythm keeps its procedural synth SFX** — do not replace those.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_boss_intro` | `boss_trial_start` | 2000 ms | `[50,30,50]` | `Boss encounter intro sting, deep ominous impact with a low brass swell and metallic screech, dread and anticipation, two seconds` |
| ★ | `sfx_boss_hit_light` | Player lands a hit | 250 ms | selection | `Short impact hit, sharp punchy thwack with a bright metallic edge, arcade combat hit, dry and immediate` |
| ★ | `sfx_boss_hit_heavy` | Critical / big hit | 500 ms | `[40,30,40]` | `Heavy impact hit, deep punchy boom with a metallic crack and short debris scatter, powerful arcade combat, half a second` |
| ★ | `sfx_boss_player_hurt` | Player takes damage | 400 ms | warning `[60,40,60]` | `Player damage sound, muffled dull impact with a short descending distorted tone, hurt but not gory, arcade style` |
| ★ | `sfx_boss_shield` | Shield / block | 400 ms | `[25,25,25]` | `Energy shield absorbing a hit, bright electric shimmer with a metallic ring and a soft bubble pop, protective` |
| ★ | `sfx_boss_charge` | Boss winds up | 1200 ms | — | `Boss attack charge-up, low rising hum building in pitch and intensity with electrical crackle, telegraphing an incoming attack` |
| ★ | `sfx_boss_phase_shift` | Phase change | 1500 ms | `[50,30,50]` | `Boss phase transition, deep resonant boom with a rising distorted swell and metallic groan, the fight escalating` |
| ★ | `sfx_boss_defeat` | `boss_trial_resolve` | 2000 ms | `[50,30,50]` | `Boss defeat, heavy collapsing impact with metallic debris scattering and a descending distorted groan, then silence, two seconds` |
| ★ | `sfx_island_clear` | `boss_island_clear` | 1800 ms | `[30,40,30,40,30]` | 🔶 **placeholder — regenerate.** `Island cleared victory fanfare, ascending bright chime run into a triumphant warm chord with cymbal shimmer and a distant wave swell, earned and conclusive` |
| ★ | `sfx_boss_countdown_tick` | Pre-fight count-in | 150 ms | selection | `Short countdown tick, crisp electronic beep with a slight metallic edge, tense, designed to repeat three times before a start` |

---

# 9. Mini-games — generic — 8 sounds

Shared across all mini-games so they feel like one family.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_mg_open` | `minigame_open` | 800 ms | `[25,35,25]` | `Arcade game start-up sound, quick bright ascending electronic sweep with a cheerful chime, an arcade cabinet powering on, inviting` |
| ★ | `sfx_mg_start_countdown` | 3-2-1-GO | 250 ms | selection | `Short arcade countdown beep, clean bright electronic tone, designed to repeat three times then be followed by a higher accent` |
| | `sfx_mg_score_tick` | Score increments | 50 ms | — | `Extremely short arcade score tick, tiny bright electronic blip, designed to repeat rapidly while a score counts up` |
| ★ | `sfx_mg_combo_up` | Combo increases | 250 ms | selection | `Short combo increase sound, bright ascending two-note electronic blip, designed to be pitched up on each repeat, satisfying chain` |
| ★ | `sfx_mg_perfect` | Perfect timing | 500 ms | `[30,30,30]` | `Short perfect hit reward, crystalline bright chime with a quick sparkle tail, precise and excellent, arcade praise` |
| ★ | `sfx_mg_fail` | Miss / fail | 400 ms | warning | `Short arcade miss sound, muted descending two-note bloop with a soft thud, disappointing but light-hearted` |
| ★ | `sfx_mg_timer_warning` | <5 s remaining | 300 ms | `[40,40,40]` | `Urgent countdown warning beep, sharp electronic pulse with a slight rising tension, designed to repeat as time runs out` |
| ★ | `sfx_mg_complete` | `minigame_complete` | 1500 ms | `[30,40,30,40,30]` | `Arcade round complete fanfare, ascending electronic chime run into a warm triumphant chord with sparkle, rewarding, a second and a half` |

---

# 10. Mini-games — specific — 17 sounds

| ★ | ID | Game | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_spin_start` | Lucky Spin | 400 ms | `[30]` | `Prize wheel being launched, quick mechanical whip and accelerating clicks, carnival wheel starting to spin` |
| ★ | `sfx_spin_tick` | Lucky Spin | 60 ms | — | `Single prize wheel peg tick, crisp plastic flapper click, designed to repeat with decreasing speed as a wheel slows` |
| ★ | `sfx_spin_slow` | Lucky Spin | 1500 ms | — | `Prize wheel slowing down, decelerating series of plastic peg clicks getting further apart, tension as it settles` |
| ★ | `sfx_spin_stop_win` | Lucky Spin | 900 ms | `[30,40,30]` | `Prize wheel landing on a win, final peg click into a bright celebratory bell chime with a small sparkle, lucky` |
| ★ | `sfx_fortune_lever` | Fortune Engine | 500 ms | `[30,20,30]` | `Heavy mechanical lever being pulled down, metal ratchet with a solid clunk at the end, slot machine arm, weighty` |
| ★ | `sfx_fortune_reel_stop` | Fortune Engine | 250 ms | selection | `Slot reel stopping, single mechanical clunk with a brief metallic ring, designed to repeat for each reel` |
| ★ | `sfx_fortune_jackpot` | Fortune Engine | 2500 ms | `[40,30,40,30,40]` | `Slot machine jackpot, rapid ringing bells and cascading coins pouring out with a rising celebratory fanfare, two and a half seconds of pure luck` |
| ★ | `sfx_exc_laser` | Space Excavator | 200 ms | — | `Short sci-fi laser shot, bright zapping pew with a quick descending pitch, arcade shooter, dry and punchy` |
| ★ | `sfx_exc_drill` | Space Excavator | 800 ms | `[20,20,20]` | `Mechanical mining drill boring into rock, gritty grinding whir with rock crumbling, industrial and continuous` |
| ★ | `sfx_exc_ore_break` | Space Excavator | 400 ms | `[30]` | `Rock or crystal ore breaking apart, sharp crack with mineral fragments scattering and a small bright crystalline ring` |
| ★ | `sfx_exc_depth_reached` | Space Excavator | 900 ms | `[25,35,25]` | `Milestone depth reached, deep resonant sonar ping with a rising confirmation tone, going deeper, sci-fi` |
| ★ | `sfx_tower_block_drop` | Task Tower | 300 ms | — | `Block falling and landing, soft whoosh into a solid wooden thunk, clean and immediate` |
| ★ | `sfx_tower_block_stack` | Task Tower | 350 ms | selection | `Block locking onto a stack, solid wooden clack with a satisfying click of alignment, designed to be pitched up as a tower grows` |
| ★ | `sfx_tower_collapse` | Task Tower | 1800 ms | `[60,40,60]` | `Tower of blocks collapsing, cascading wooden clatter tumbling down and scattering, chaotic and final, nearly two seconds` |
| ★ | `sfx_feast_bite` | Companion Feast | 300 ms | selection | `Cute cartoon creature taking a bite, quick playful chomp with a small happy squeak, not gross, charming` |
| ★ | `sfx_feast_full` | Companion Feast | 700 ms | `[25,35,25]` | `Cute creature satisfied after eating, small contented burp-hum with a warm happy chime, charming cartoon` |
| ★ | `sfx_workshop_craft` | Island Workshop | 900 ms | `[25,35,25]` | `Item being crafted and completed, sequence of hammer taps and a metallic file into a bright finishing chime, artisanal satisfaction` |

---

# 11. Habits & App Core — 13 sounds

Outside the game. These fire on the app's most emotionally important moments — completing something you promised yourself.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_habit_check` | Habit completed | 400 ms | success `[30,40,30]` | `Short satisfying checkbox completion, soft pen tick with a warm ascending two-note chime, genuinely rewarding, clean` |
| | `sfx_habit_uncheck` | Habit un-completed | 200 ms | — | `Short undo sound, soft muted descending blip, neutral and quiet, no judgement` |
| ★ | `sfx_habit_all_done` | All habits done today | 1800 ms | `[30,40,30,40,30]` | `Day complete celebration, warm ascending chime run into a bright resolved chord with a gentle sparkle shimmer, deeply satisfying accomplishment, under two seconds` |
| ★ | `sfx_streak_up` | Streak extended | 700 ms | `[25,35,25]` | `Streak increment sound, quick flame whoosh with a bright ascending chime, momentum building, warm` |
| ★ | `sfx_streak_freeze` | Streak protected | 900 ms | `[30,30,30]` | `Streak shield activating, crystalline ice-forming shimmer with a protective glassy chime, safe and reassuring` |
| ★ | `sfx_level_up` | Player level up | 1500 ms | `[30,40,30,40,30]` | `Level up fanfare, bright ascending four-note bell run with a warm orchestral swell and sparkle, classic and satisfying` |
| ★ | `sfx_rank_up` | Rank promotion | 2200 ms | `[50,30,50,30,50]` | `Rank promotion fanfare, grand ascending brass and choir swell with a shimmering cymbal and a resolving heroic chord, prestigious, over two seconds` |
| | `sfx_xp_gain` | XP awarded | 250 ms | — | `Short experience point gain, soft bright rising blip with a small sparkle, light and quick` |
| ★ | `sfx_quest_complete` | Quest done | 1200 ms | `[30,40,30]` | `Quest completion sound, ascending harp glissando into a warm resolved chord with a soft parchment rustle, an objective fulfilled` |
| | `sfx_journal_save` | Journal entry saved | 400 ms | selection | `Journal entry saved, soft paper page settle with a gentle pen click and a warm confirming tone, quiet and personal` |
| | `sfx_timer_start` | Focus timer begins | 500 ms | selection | `Focus session starting, soft warm bell tone with a gentle rising swell, calm and intentional` |
| | `sfx_timer_end` | Focus timer done | 1500 ms | `[30,40,30]` | `Focus session complete, warm singing bowl struck once with a long natural decay, peaceful and grounding` |
| | `sfx_notification` | In-app notification | 500 ms | selection | `Gentle in-app notification chime, two soft ascending bell notes, friendly and unobtrusive, not urgent` |

---

# 12. Story & Narrative — 8 sounds

The **text blip** is the one to get right — it's what makes reading feel like playing.

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_story_text_blip` | Per-character reveal | 30 ms | — | `Extremely short soft text blip, tiny muted rounded tone with no attack edge, designed to repeat rapidly during typewriter text, must not become annoying` |
| ★ | `sfx_story_page_turn` | Page advance | 500 ms | — | `Book page being turned, soft paper sweep and settle, close-mic'd and warm, no reverb` |
| ★ | `sfx_story_chapter_open` | Chapter starts | 1500 ms | — | `Chapter opening sound, deep book cover settling with a soft magical shimmer rising, anticipation of a story beginning` |
| ★ | `sfx_story_reveal` | Key story reveal | 1200 ms | `[30,40,30]` | `Narrative revelation sting, rising shimmering swell into a resonant crystalline chord with a subtle low impact, a truth landing` |
| | `sfx_story_choice_select` | Dialogue choice | 250 ms | selection | `Dialogue choice selection, soft ink-quill tick with a warm confirming tone, deliberate and clean` |
| ★ | `sfx_story_concord_hum` | Concord tech active | 2000 ms | — | `Ancient alien technology humming to life, deep resonant harmonic drone with subtle crystalline overtones and a slow pulse, otherworldly and calm, loopable` |
| ★ | `sfx_story_memory_shimmer` | Memory / flashback | 1500 ms | — | `Memory transition shimmer, reversed swelling reverb with soft glassy bell tones scattering, dreamlike and fading, entering a memory` |
| | `sfx_story_close` | Reader closes | 600 ms | — | `Book closing softly, gentle cover thud with a paper settle and a warm low tone, conclusive and calm` |

---

# 13. Daily Treats & Seasonal — 4 sounds

| ★ | ID | Trigger | Len | Haptic | Prompt |
|---|---|---|---|---|---|
| ★ | `sfx_treat_door_open` | Calendar door opens | 700 ms | `[25,35,25]` | `Advent calendar door being opened, crisp card stock flap with a small paper tear and a light magical sparkle behind it, delightful` |
| ★ | `sfx_treat_locked` | Door not yet available | 300 ms | warning | `Short locked sound, small muted mechanical click that refuses to turn, gentle and non-punishing` |
| ★ | `sfx_gift_unwrap` | Gift box opens | 1200 ms | `[25,35,25]` | `Gift being unwrapped, crisp wrapping paper tear and ribbon slide, lid lifting with a warm magical shimmer revealed inside` |
| | `sfx_confetti_pop` | Confetti burst | 600 ms | `[30]` | `Party confetti popper, sharp pop with paper streamers fluttering out, celebratory and light` |

---

# Summary

| Family | Count | Tier 1 (★) |
|---|---|---|
| 1. UI & Navigation | 12 | **12** |
| 2. Board & Movement | 14 | 13 |
| 3. Economy & Currency | 11 | 10 |
| 4. Reward Bar & Collectibles | 9 | 9 |
| 5. Eggs & Creatures | 11 | 10 |
| 6. Vault Rush | 8 | 8 |
| 7. Build & Workshop | 8 | 5 |
| 8. Boss & Combat | 10 | 10 |
| 9. Mini-games generic | 8 | 7 |
| 10. Mini-games specific | 17 | 17 |
| 11. Habits & App Core | 13 | 7 |
| 12. Story & Narrative | 8 | 5 |
| 13. Daily Treats & Seasonal | 4 | 3 |
| **Total** | **133** | **116** |

**All 133 need generating.** The 7 files that exist today are placeholders being regenerated, not assets being kept — so there is no "already done" column. 116 of the 133 are Tier 1 (Phase 1).

Estimated bundled size at 128 kbps mono with these durations: **~1.05 MB**. Budget in `check:audio-assets` is 1.5 MB — comfortable headroom.

### Definition of done for the SFX layer

1. `PLACEHOLDER_SOUND_ASSET_PATHS` in `islandRunAudio.ts` is **empty**.
2. No two `IslandRunSoundEvent`s share an asset path.
3. `audioUtils.ts` no longer synthesises player-audible sounds (`bossRhythmAudio.ts` excepted — it stays procedural by design).
4. `npm run check:audio-assets` reports **0 placeholders** and passes the size budget.

---

# Generation checklist (per sound)

- [ ] Generated 3+ variations, picked the clearest
- [ ] **Head silence trimmed to ≤ 5 ms** (ElevenLabs pre-roll becomes input latency)
- [ ] Tail trimmed, 10 ms fade-out applied (no clicks)
- [ ] Mono, 44.1 kHz
- [ ] Peak normalised to −3 dBFS, then loudness-matched **by ear against its family**
- [ ] Encoded MP3 128 kbps (96 kbps if under 300 ms)
- [ ] Filename matches `sfx_<domain>_<name>.mp3`
- [ ] Added to `src/services/audio/audioManifest.ts` with its haptic pairing
- [ ] `npm run check:audio-assets` passes (no shared assets, no sub-1 KB files, within budget)
- [ ] Auditioned **in context, on a phone, through the phone speaker** — not just on studio headphones
- [ ] Fired 20× in a row without becoming irritating (the real test for anything in families 1, 2, 9)
