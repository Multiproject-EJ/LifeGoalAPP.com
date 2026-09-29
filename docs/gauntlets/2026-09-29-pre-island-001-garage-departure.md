# Pre-Island-001 "Departure Day": garage send-off and piece picker

Status: **brief, user-directed — awaiting reference intake and answers to open questions**
Date: 2026-09-29
Parent contracts: `2026-08-23-expedition-ship-and-garage-visual-production.md`,
`docs/design/expedition-ship/README.md`, `AGENTS.md` Island Run rules,
`docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`.

## Mission

Make the first minute of Island Run feel like a send-off, not a form. Before
Island 001, the player sees their newly named ship in an upgraded garage, a
crowd celebrates the crew, the travellers board, and the ship leaves for the
first island. The heavy ship transformation loads while the player chooses the
piece they will move on the board, so nobody waits on a spinner.

## Visual authority (Eivind, 2026-09-29)

Three concept frames were shared in chat. They need to be stored as
`docs/design/expedition-ship/references/garage/18-departure-celebration-*.png`
(the files only exist as chat attachments; they are not in the repo yet).

Approved from those frames:

- the ship in **expanded living mode** at the centre: white controller-grip
  shoulders, dark bridge, glass atrium with the Great Tree lit from within,
  side terraces deployed, standing on the service/landing column;
- a **grand enclosed hangar**: tiered balconies stacked on both walls, packed
  with cheering people; tall blue banners with a gold emblem; warm amber
  practical lights; overhead gantry cranes and a suspended service cab;
- floor life: service carts, small vehicles, marshals in lines, a clear
  processional causeway from the camera toward the landing keel;
- foreground crowd silhouettes with raised arms, flags and phones, framing the
  ship from the lower corners.

Rejected from those frames:

- **no planet, open sky, space view or outdoor valley behind the ship.** The
  hangar is closed. The far end is the garage's segmented rolling door (goal
  image 16/17 language), closed during the ceremony and opening only at
  departure. Anything seen beyond it at lift-off is the launch tunnel, not a
  vista.
- waterfalls and hanging jungle on the hangar walls (one frame) — keep the
  garage architectural: graphite, warm light, banners, a few planters at most.

## Where it goes in the first-run flow

Today (`IslandRunBoardPrototype.tsx`, `firstRunStep`):
`celebration` (starter gifts) → `ship-name` → `mission` (briefing) → `launch`.

Proposed:
`celebration` → `ship-name` → **`departure`** → `mission` → `launch`.

Players with a guest-funnel ship name skip `ship-name` today; they still get
`departure`. Returning players never see it again automatically, but can
replay it from the garage later.

## Sequence (≈25 s, skippable after the first beat)

1. **Piece picker (modal, 0–N s).** Opens the moment the ship is named, over
   a still of the hangar. Three starter pieces (Explorer Ship, Ancient Egg,
   World Seed) plus locked earned/premium pieces shown with their unlock hint.
   While it is open, the heavy scene loads in the background (see Loading).
   Confirm stays enabled; if loading is not done yet, confirm turns into a
   short "Preparing the hangar…" progress state instead of blocking the choice.
2. **Reveal (3 s).** Lights come up across the balconies; banners carry the
   player's ship name. The ship stands in its closed controller shell.
3. **Transformation (6–8 s).** The heavy controller → expanded-living
   transform plays: shells lift, terraces deploy, the atrium glass reveals the
   Great Tree. The crowd noise swells on the tree reveal.
4. **The crew walk (5 s).** A small group of travellers (the caretaker plus
   the crew; the player's chosen piece is carried by the lead traveller, like
   a relic) walks the causeway through two lines of marshals. The crowd waves
   flags as they pass.
5. **Boarding (3 s).** The crew steps onto the landing-keel lift; the keel
   telescopes up into the belly cassette (it never rises into the tree volume).
6. **Departure (4 s).** Terraces retract, the rolling door opens, the ship
   lifts and leaves through it. Hard cut is not allowed: the last frame
   hands off to the existing Island 001 descent/briefing.

Reduced motion: four held stills (reveal, living mode, crew at the keel, door
open) with crossfades; no camera moves, no crowd animation.

## Loading strategy for the heavy transform

The picker is the loading screen. When `departure` starts:

- dynamic-import `ExpeditionShipThreeModel` and build the **same persistent
  ship scene graph** used in the garage and travel (never a garage copy —
  non-negotiable in the parent contract);
- pre-compute the transform clip (pivot tracks for shells, terraces, legs,
  keel) and warm shaders with `renderer.compileAsync(scene, camera)` so the
  first transform frame does not hitch;
- load the crowd atlas and banner textures (banner text is rendered once to a
  canvas texture with the ship name);
- expose progress `0–1` to the picker; target: done before a typical player
  confirms (≈4–6 s on a mid-range phone).

Crowds must stay cheap: instanced impostor cards (a few poses in one atlas,
per-instance phase offset for waving), no skinned meshes for the crowd,
balconies as merged geometry. Budget belongs to the ship, per the garage
contract. Auto / Smooth / Ultra quality tiers reuse
`expeditionShipGarageQuality.ts`; Smooth halves crowd density.

## Architecture rules

- The whole sequence is presentation. It must not write gameplay state except
  through canonical actions.
- The only gameplay write is the piece choice:
  `selectPlayerPiece` in `islandRunStateActions.ts` (added in this PR, with
  ownership checks and tests).
- First-run step advancement stays in the existing onboarding path; `departure`
  is a new presentational step, persisted only so a reload resumes at the
  picker instead of replaying gifts.

## Prerequisites found while scoping (not yet built)

- **No player-piece art.** `islandRunPlayerPieces.ts` points at
  `public/assets/player-pieces/*`, which does not exist. The picker needs
  original art (no attribution-required assets — `AGENTS.md`). Option: render
  the starter pieces procedurally in three.js, as Journey Disc Arena already
  does, and bake thumbnails.
- **The board token ignores the selected piece.** `BoardToken.tsx` always
  draws the spaceship. Picking a piece is pointless until the token renders
  `selectedPlayerPieceId`.
- **No hangar crowd/banner assets** and no crew/traveller rig yet (the ship
  README already asks for a reusable avatar rig separate from ship geometry).

## Slices

0. Store the three concept frames with the authority notes above. *(needs the
   image files)*
1. Piece foundation: canonical `selectPlayerPiece` ✅ (this PR); starter piece
   art; board token renders the selected piece; tests.
2. Picker modal + background loader with progress (portal, viewport-centred,
   scroll-locked per the modal guardrail).
3. Hangar dressing: tiered balconies, banners with ship name, instanced crowd,
   floor vehicles and marshals, closed rolling door.
4. Choreography timeline: transform, crew walk, boarding, door, lift-off,
   handoff into the Island 001 descent. Skip button after beat 1.
5. Evidence: iPhone-sized capture of the full sequence at Smooth and Ultra,
   frame-time profile during the transform, reduced-motion stills.

## Open questions for Eivind

1. Who are the travellers? Caretaker + player avatar + three crew, or
   something else?
2. Should the ship start in the closed controller shell and transform in
   front of the crowd (as sequenced above), or already stand in living mode
   and transform only on departure?
3. Skippable on first viewing, or only after the reveal beat?
4. Banner emblem: reuse the gold star-in-circle from the concepts as the
   HabitGame fleet crest, or design a new one?
5. Replay: add a "Relive departure" button in the garage?
