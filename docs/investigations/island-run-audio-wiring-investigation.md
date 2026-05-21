# Island Run Audio/Music Wiring Investigation (120-Island Board)

Date: 2026-05-21  
Scope: Investigation-only (no gameplay/audio behavior changes)

## PASS / FAIL Summary

| Goal | Result | Notes |
|---|---|---|
| 1) Music starts on main board/game overlay open | **FAIL** | No board-open ambient loop is wired. Music starts only for Shop panel (`market-lounge`) and island-clear celebration overlay (`new-island-celebration`). |
| 2) Locate music service/controller + explain named tracks | **PASS** | `islandRunMusic.ts` is the single named-track controller with ownership arbitration (`ownedIslandRunMusicTrackId`) and `playIslandRunMusic/stopIslandRunMusic`. |
| 3) Inventory of music assets | **PASS** | Enumerated from `public/assets/audio/music/` (8 files). |
| 4) Inventory of SFX assets | **PASS** | Enumerated from `public/assets/audio/sfx/` (7 files). |
| 5) Identify Market/Shop track + swap safety | **PASS (with caveat)** | Shop uses named track `market-lounge` → `market-lounge-loop-v1.mp3`; swapping path within named map is low risk if loop length/volume are acceptable. |
| 6) Locate SFX trigger points (dice, movement, reward fill, building upgrade/button) | **PARTIAL PASS** | Dice/movement/reward-fill triggers are wired; no explicit build/upgrade SFX trigger currently wired in board build action path. |
| 7) Dice sound remap to reward fill only | **PASS (technically feasible)** | `roll` and `reward_bar_fill` are separate named events; remap possible by changing asset map bindings only. |
| 8) Movement sound remap to building upgrade | **PASS (technically feasible)** | `token_move` and `stop_land` currently use `sfx_tile_land.mp3`; build path currently has no sound call. Can map tile sound asset to a new build event or reuse existing event in follow-up. |
| 9) Proposed new SFX asset names | **PASS** | Suggested naming provided below, consistent with existing `sfx_*` convention. |
| 10) Smallest safe implementation plan | **PASS** | Provided below; keeps existing architecture and audio toggle. |

---

## Current Music Wiring Map

## 1) Music controller/service

- File: `src/features/gamification/level-worlds/services/islandRunMusic.ts`
- Named track map (`ISLAND_RUN_MUSIC_TRACKS`):
  - `market-lounge`
  - `luxury-reward`
  - `new-island-celebration`
  - `event-jackpot`
  - `boss-rhythm-duel`
- Controller behavior:
  - Lazy-creates `HTMLAudioElement` per track.
  - Forces `loop = true`, volume `0.28`, preload `none`.
  - Maintains **single-owner** semantics via `ownedIslandRunMusicTrackId` and `playingIslandRunMusicTrackId`.
  - `playIslandRunMusic(trackId)` stops previously owned track before acquiring new one.
  - `stopIslandRunMusic(trackId?)` stops one named track or all owned playback.
  - Handles autoplay rejections silently (no hard failure).

## 2) Where music is started/stopped in Island Run board

In `IslandRunBoardPrototype.tsx`:

- Shop panel lifecycle:
  - When `showShopPanel && audioEnabled` → `playIslandRunMusic('market-lounge')`
  - Otherwise → `stopIslandRunMusic('market-lounge')`
- Island clear celebration lifecycle:
  - When `showIslandClearCelebration && audioEnabled` → `playIslandRunMusic('new-island-celebration')`
  - Otherwise and on cleanup → `stopIslandRunMusic('new-island-celebration')`
- Component unmount cleanup stops both above tracks.

## 3) Main board open finding

No effect/hook currently starts any persistent board ambient track when the core 120-island board/game overlay opens. Based on wiring, this explains “SFX works, travel/celebration music works, but no persistent board loop”.

---

## Current SFX Wiring Map

Service: `src/features/gamification/level-worlds/services/islandRunAudio.ts`

- `playIslandRunSound(eventId)` dispatches mapped SFX from `SOUND_ASSET_MAP`.
- Uses shared toggle (`islandRunAudioEnabled`) and throttles fast events.
- Missing file / autoplay failures are safe no-ops.

## Requested trigger points

1. **Dice roll**
   - Trigger: `playIslandRunSound('roll')`
   - Location: roll handler start in `IslandRunBoardPrototype.tsx`

2. **Tile movement / board hops**
   - Trigger: `playIslandRunSound('token_move')`
   - Location: `BoardStage` callback `onTokenHop` in `IslandRunBoardPrototype.tsx`

3. **Tile landing (extra note)**
   - Trigger: `playIslandRunSound('stop_land')` + haptic
   - Location: `onTokenLand` callback

4. **Reward bar fill / progress gain**
   - Trigger: `playIslandRunSound('reward_bar_fill')`
   - Locations:
     - Tile reward apply path when bar reaches full and auto-claim delay begins
     - Encounter reward path where reward bar progress increments

5. **Building upgrade / build button**
   - Finding: **No explicit build-specific sound trigger is currently called** in the core `handleStopBuildTap` build spend path.
   - Build updates landing text and state, but does not call `playIslandRunSound(...)` for build progression.

---

## Existing Asset Inventory

## Music assets (`public/assets/audio/music/`)

1. `Egg_hatched.mp3`
2. `Island dreamy relaxing night islands.mp3`
3. `Lantern Tide.mp3`
4. `boss-rhythm-duel-loop-v1.mp3`
5. `event-jackpot-loop-v1.mp3`
6. `luxury-reward-loop-v1.mp3`
7. `market-lounge-loop-v1.mp3`
8. `new-island-celebration-loop-v1.mp3`

## SFX assets (`public/assets/audio/sfx/`)

1. `sfx_dice_roll.mp3`
2. `sfx_egg_open.mp3`
3. `sfx_island_clear.mp3`
4. `sfx_market_success.mp3`
5. `sfx_reward_bar_claim_burst.mp3`
6. `sfx_shop_open.mp3`
7. `sfx_tile_land.mp3`

---

## Market/Shop Track and Swap Safety

- Current Shop/Market music track selection:
  - named track: `market-lounge`
  - asset path: `/assets/audio/music/market-lounge-loop-v1.mp3`
- Wired via Shop-panel `useEffect` in board component.

### Swap safety assessment

Safe to swap in follow-up if done by replacing the mapped file path for `market-lounge` in `ISLAND_RUN_MUSIC_TRACKS`, because:
- existing callsites keep same named track contract,
- no gameplay coupling,
- audio toggle and autoplay handling remain intact.

Caveats:
- Validate loop boundary quality and perceived loudness against current `0.28` music volume.
- Validate mobile decode size/perf for larger files.

---

## Remap Feasibility Checks

## A) Can current dice sound be remapped to reward bar fill only?

Yes.

Reason:
- `roll` and `reward_bar_fill` are distinct event IDs in `SOUND_ASSET_MAP`.
- You can point `reward_bar_fill` to the existing dice asset and point `roll` to a new dice asset (or mute/alternate) without changing gameplay logic.

## B) Can current movement sound be remapped to building upgrade?

Yes, with a small follow-up wiring step.

Reason:
- `token_move`/`stop_land` currently map to `sfx_tile_land.mp3`.
- Build flow currently has no build SFX call, so a follow-up should either:
  1. introduce a dedicated build sound event in `IslandRunSoundEvent` + `SOUND_ASSET_MAP`, then fire it in `handleStopBuildTap`, or
  2. temporarily reuse an existing event ID (less clear; not recommended long-term).

Recommended minimal-safe route: add dedicated event in existing audio service (not a new architecture).

---

## Recommended Audio Remap Table (Follow-up PR)

| Gameplay moment | Current event → asset | Proposed event → asset |
|---|---|---|
| Roll button / dice roll | `roll` → `sfx_dice_roll.mp3` | `roll` → `sfx_dice_roll_real.mp3` *(new)* |
| Tile hop / movement | `token_move` / `stop_land` → `sfx_tile_land.mp3` | `token_move` / `stop_land` → `sfx_tile_hop_soft_wood.mp3` *(new)* |
| Reward bar fill pop | `reward_bar_fill` → `sfx_reward_bar_fill.mp3` *(missing file currently)* | `reward_bar_fill` → `sfx_dice_roll.mp3` *(existing remap target per request)* |
| Build tap/upgrade | no explicit trigger | new `build_upgrade` (or `build_tap`) → `sfx_tile_land.mp3` (interim) or dedicated build asset later |

---

## Proposed New SFX Asset Names

For requested new sounds:

1. **Real dice roll sound**
   - `sfx_dice_roll_real.mp3`

2. **Muted wooden board movement / soft tile hop**
   - `sfx_tile_hop_soft_wood.mp3`

Naming rationale:
- Matches existing `sfx_*` pattern,
- Self-descriptive,
- Allows future variants (`..._v2.mp3`) without semantic rename.

---

## Smallest Safe Implementation Plan (Follow-up PR)

1. **Add persistent board music using existing named-track service only**
   - Reuse `playIslandRunMusic/stopIslandRunMusic`.
   - Add one `useEffect` tied to main board-open visibility + `audioEnabled`.
   - Start chosen ambient named track on board open; stop on overlay close/unmount.
   - Ensure shop/celebration still pre-empt via single-owner music semantics.

2. **Keep music track names stable; adjust mappings**
   - If needed, map selected ambient asset to an existing unused named track (`luxury-reward` or `event-jackpot`) to avoid expanding architecture.

3. **SFX remap only inside `SOUND_ASSET_MAP`**
   - `reward_bar_fill` → current dice file (per request).
   - `roll` → new real dice asset.
   - `token_move`/`stop_land` → new soft hop asset.

4. **Add one explicit build SFX trigger in build action UI path**
   - In `handleStopBuildTap`, call existing sound dispatcher on successful spend/level-up.
   - Prefer a new typed event name in existing service for clarity.

5. **No changes to gameplay state/economy/persistence**
   - Audio-only, UI-side trigger/mapping changes.

6. **Validation**
   - Build + existing Island Run service tests + quick manual autoplay/toggle checks on mobile/PWA contexts.

---

## Risks / Browser Autoplay Notes

- HTMLAudio playback can reject before user gesture; current services already swallow errors and remain safe no-op.
- Persistent board music should start after user interaction or from interaction-driven overlay open to avoid autoplay failures.
- PWA/background tab behavior may pause/resume audio unpredictably; ensure cleanup on unmount/overlay close remains explicit.
- Existing audio toggle must remain the single gate for both music and SFX behavior.

---

## Exact Files/Functions Likely to Change in Follow-up Implementation PR

1. `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
   - Music lifecycle `useEffect` blocks near existing shop/celebration wiring.
   - Build action handler: `handleStopBuildTap` for new build SFX trigger.

2. `src/features/gamification/level-worlds/services/islandRunAudio.ts`
   - `IslandRunSoundEvent` union (if adding `build_upgrade` / `build_tap`).
   - `SOUND_ASSET_MAP` remaps for roll/movement/reward fill/build.

3. `src/features/gamification/level-worlds/services/islandRunMusic.ts`
   - `ISLAND_RUN_MUSIC_TRACKS` mapping only (if swapping chosen ambient/market assets).

4. `public/assets/audio/sfx/`
   - Add `sfx_dice_roll_real.mp3`
   - Add `sfx_tile_hop_soft_wood.mp3`

(Optionally) relevant tests to update/add:
- `src/features/gamification/level-worlds/services/__tests__/islandRunAudio.test.ts`
- any Island Run board interaction tests covering new build SFX event call.
