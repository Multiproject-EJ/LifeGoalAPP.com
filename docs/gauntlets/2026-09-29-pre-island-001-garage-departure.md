# Pre-Island-001 "Departure Day": garage send-off and piece picker

Status: **first playable slice built 2026-09-30** (picker + hangar film wired into first run); concept frames still to be stored
Date: 2026-09-29
Parent contracts: `2026-08-23-expedition-ship-and-garage-visual-production.md`,
`docs/design/expedition-ship/README.md`, `AGENTS.md` Island Run rules,
`docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`.

## Story (Eivind, 2026-09-29)

- The travellers are **the crew and their robots**. They are leaving on a
  long, noble **diplomatic mission** to the islands, and the whole garage
  applauds them for it.
- **The player is one of the crew**, a new member who will rise through the
  crew ranks over the journey (see the rank system in
  `2026-09-26-ranks-and-island40-portal.md`).
- **The caretaker is never here.** Caretakers live on (or appear on) the
  islands and are unknown to the crew at the start; the Island 001 first-arrival
  contract already moves the caretaker introduction to Island 008. No
  caretaker may appear in, be mentioned by, or supply anything in the
  departure, the ship naming or the first-run gifts.

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

## Sequence (≈15 s total, first viewing is required, then skippable)

It must be short: the first session is where players drop off. Target the
whole send-off at about 15 seconds after the piece is confirmed. It plays in
full the first time; any replay (garage "Relive departure") is skippable at
once.

1. **Piece picker (modal, 0–N s).** Opens the moment the ship is named, over
   a still of the hangar. Three starter pieces (Explorer Ship, Ancient Egg,
   World Seed) plus locked earned/premium pieces shown with their unlock hint.
   While it is open, the heavy scene loads in the background (see Loading).
   Confirm stays enabled; if loading is not done yet, confirm turns into a
   short "Preparing the hangar…" progress state instead of blocking the choice.
2. **Reveal (2 s).** Lights come up across the balconies; banners carry the
   player's ship name. The ship stands in its closed controller shell.
3. **Transformation (4 s).** The heavy controller → expanded-living
   transform plays: shells lift, terraces deploy, the atrium glass reveals the
   Great Tree. The crowd noise swells on the tree reveal.
4. **The crew walk (4 s, overlaps the transform's end).** The crew and their
   robots walk the causeway through two lines of marshals while the crowd
   applauds and waves flags. The player walks among them as the newest crew
   member, carrying their chosen piece like a relic.
5. **Boarding (2 s).** The crew and robots step onto the landing-keel lift;
   the keel telescopes up into the belly cassette (never into the tree volume).
6. **Departure (3 s).** Terraces retract, the rolling door opens, the ship
   lifts and leaves through it. No hard cut: the last frame hands off to the
   existing Island 001 descent/briefing.

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

## Built (2026-09-30)

- `services/islandRunDepartureDay.ts`: the 15 s timeline (beats, per-frame ship pose, crowd energy, crew walk, boarding, door, lift-off, hand-off), skip rule and reduced-motion stills, with tests.
- `dev/DepartureDayHangarThree.ts`: the closed hangar in code: three balcony tiers per side with instanced crowd cards (4 poses, per-instance wave phase, flags and phones), ship-name banners with the gold crest, amber practicals, gantry and cab, causeway with bollards and 12 marshals, service carts, the rolling door and the blue launch tunnel behind it. The ship is the real `ExpeditionShipThreeModel`, starting in the closed controller shell, opening to living mode for the crowd and closing to leave. Six crew officers, the player (white uniform, gold ring, carrying the chosen piece) and the three family robots walk the causeway and ride the keel lift. Shaders are warmed with `compileAsync` before the film.
- `dev/PlayerPieceRelicThree.ts` + `components/PlayerPieceIcon.tsx`: original procedural 3D relics and SVG portraits for the pieces.
- `components/DepartureDayScene.tsx`: the picker opens over the dim hangar while it loads; confirm calls canonical `selectPlayerPiece`, waits with "Preparing the hangar…" if needed, then plays with captions, a synthesised crowd and a lift-off haptic. First viewing is required; replays show Skip. A 3D failure never traps the first run.
- First run: `celebration → ship-name → departure → mission → launch` (guest-named ships go straight to `departure`).
- Dev seam: `?departureDayPreview=1` (add `&departureDayTime=<s>` to hold a frame). Evidence: `docs/design/departure-day/`.

Still open: a garage "Relive departure" button; the concept frames.

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

## Copy changed 2026-09-30 (caretaker is unknown at the start)

Now reads: "The garage crew is ready to hand over your ship", "The garage crew loaded three supply packs of dice", "three 500-dice crew supply packs". Previously:

- `IslandRunBoardPrototype.tsx` first-run step `ship-name`: "The caretaker is
  ready to hand over your ship" → the ship is handed over by the crew/garage.
- First-run `mission` step: "The caretaker has loaded three emergency dice
  packs" and the gifts line "three 500-dice caretaker packs" → crew/garage
  supply packs.

## Open questions for Eivind

1. ~~Who are the travellers?~~ The crew and robots; the player is one of them.
2. Should the ship start in the closed controller shell and transform in
   front of the crowd (as sequenced above), or already stand in living mode
   and transform only on departure?
3. ~~Skippable on first viewing?~~ No: required once, kept to about 15 s.
4. Banner emblem: reuse the gold star-in-circle from the concepts as the
   HabitGame fleet crest, or design a new one?
5. Replay: add a "Relive departure" button in the garage?
