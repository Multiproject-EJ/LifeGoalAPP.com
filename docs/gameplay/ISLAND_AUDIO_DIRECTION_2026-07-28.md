# Island Audio Direction

Status: **approved direction, staged asset production**

Date: 2026-07-28

## Decision

Island Run's default sound should make the player feel present in a place. The
main board no longer rotates through reward, jackpot, and boss music. It uses a
quiet environmental island score.

The track that previously opened the normal board playlist,
`luxury-reward-loop-v1.mp3`, is reassigned to the Dormant Door “find three equal
symbols” game. Its stronger musical identity now supports reveal tension and the
three-match win.

## Runtime routing in this slice

| Context | Track |
| --- | --- |
| Main island board | `Island dreamy relaxing night islands.mp3` |
| Dormant Door / find three equals | `luxury-reward-loop-v1.mp3` |
| Market | `Lantern Tide.mp3` |
| Island-clear celebration | `new-island-celebration-loop-v1.mp3` |

The board ambient track runs at a lower target volume than focused game/panel
music. Existing fade ownership ensures a focused track replaces the board track
and the board ambience resumes after the modal closes.

## Environmental audio model

The finished system should contain two independent layers:

1. **Biome bed:** wind, water, leaves, insects, distant settlement, cavern air,
   machinery, reef movement, or astral resonance.
2. **Sparse musical colour:** soft motif, long pads, occasional acoustic or
   cultural instrument, and very little percussion.

The biome bed may loop continuously. Musical phrases should breathe and leave
silence so dice, tiles, inhabitants, and construction remain readable.

## First five island briefs

### Island 1 — Luma Isle

- Night shoreline, glass chimes, gentle water, distant luminous insects.
- Sparse celesta/glass notes and warm low pad.
- Avoid mystery-horror drones; the opening is peaceful.

### Island 2 — Pebble Bay

- Rounded surf, mist, rolling stones, slow tidal machinery.
- Soft wooden knocks and breath-like reeds.

### Island 3 — Coconut Cove

- Leaves, warm breeze, birds at a distance, wooden pulley rhythm.
- Light hand percussion should remain rare and non-demanding.

### Island 4 — Driftwood Isle

- Harbour rope, timber creak, sail cloth, mild waves.
- Patched acoustic textures; no ominous use of the word “Drift” in presentation.

### Island 5 — Crown of Tides

- Underwater currents, shell resonance, luminous reef clicks.
- Layered voices may be instrumental/vowel-like, never a constant choir wall.

## Interaction rules

- Board ambience ducks slightly during dialogue.
- Board ambience pauses for focused minigame music.
- SFX remains independently controllable.
- Reward and line-clear sounds must not be mastered so loudly that they break the
  environmental mood.
- Reduced-motion does not disable audio, but a future reduced-intensity audio
  option may reduce transient peaks.
- Music remains opt-in through the existing entry audio choice.

## Dormant Door / three-equals game

Music behavior:

- fade in when the 4×4 door grid opens;
- use the reassigned track as a focused loop;
- add a small pitch/brightness layer after the second matching symbol;
- stop on close;
- on three matching symbols, duck the loop and play a short tier-specific win
  sting;
- resume island ambience after the result closes.

The first runtime slice routes the existing track. Match-count stems and
tier-specific stings are future audio assets.

## Required future assets

Per island:

- `ambient-bed.webp` is not valid; audio exports should be `.ogg`, `.m4a`, or
  `.mp3` according to the final browser-support decision;
- one 60–180 second seamless biome bed;
- one sparse 60–180 second musical layer;
- optional day/night alternate;
- optional restored-state sweetener.

Shared:

- Dormant Door second-match tension sweetener;
- small/medium/jackpot three-match stings;
- PA dialogue chirp set;
- Chief Builder fabrication cue set;
- Arena crowd beds with per-culture variations;
- universal championship 120-Arena synchronization swell.

## QA

- No missing or two-byte placeholder file may be selected by a production
  context.
- All loops must be seam checked with headphones.
- Context transitions must not produce overlapping tracks.
- Test music off, SFX off, both off, and browser autoplay rejection.
- Test rapid open/close of Dormant Door and Market.
- Test returning to board ambience after every focused context.
