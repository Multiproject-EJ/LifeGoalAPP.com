# Momentum Matrix — production slice

Status: implemented gameplay vertical slice
Runtime ID: `momentum_matrix`
Arena role: preference-aware exhibition game

## Player promise

Momentum Matrix is the ship's peaceful navigation technology. The player places
route fragments on an 8×8 holographic matrix, completes rows or columns to
stabilize corridors, and tries to route a clear through the gold Mission
Beacon. It borrows the immediate readability of block-placement puzzles without
copying third-party names, assets, sound, UI, or exact presentation.

The early game calls the mode **Chart the Course**. It does not reveal the
Drift. The later story can reinterpret all stored route energy after the player
learns that the stars did not move—the ship did.

## Arena and economy contract

- Momentum Matrix is an Arena exhibition, not a fifth timed-event clock.
- Exactly one canonical timed event remains active.
- A new course costs one ticket from that active event's
  `minigameTicketsByEvent[recordEventId]` bucket.
- Reopening an active course resumes it without another ticket.
- Every successful placement saves through `islandRunStateActions` and the
  canonical Island Run commit path.
- A completed Arena report contributes one normal event-minigame completion to
  the existing reward bar. It does not create a second reward bar.
- Preference rank controls the same full / 45-second quick / 15-second flash
  pacing contract as the four rotation games.

## Original game rules

- Grid: 8×8.
- Tray: three deterministic route fragments.
- Interaction: select a fragment, then tap its top-left destination.
- Corridor: any complete row or column clears.
- Score: fragment cells + squared corridor bonus + chain bonus.
- Mission Beacon: placing across or clearing through it grants +250 and moves
  the beacon to a new open navigation cell.
- Natural stop: a run ends when none of the remaining tray fragments fit.
- Safe stop: closing at any earlier point keeps the exact board, tray, RNG,
  score, mission choice, and beacon position for resume.

## Canonical persistence

Supabase migration:

`20260728223000_add_momentum_matrix_progress.sql`

Column:

`island_run_runtime_state.momentum_matrix_progress_by_event`

The JSON ledger is keyed by the active timed-event runtime ID. Each entry stores
the resumable run plus monotonic best score, total score, corridors, beacon
alignments, runs started, and runs completed. The existing self-only runtime
state RLS and grants continue to apply.

## Runtime art and mobile budget

Runtime hero:

`public/assets/event-games/momentum-matrix/momentum-matrix-hero.webp`

- 768×768 WebP
- approximately 70 KB
- no text, logo, watermark, or baked UI
- all playable cells, fragments, hit targets, scan lines, score effects, and
  beacon effects are code-native

Final generation prompt:

> Create one premium square mobile-game hero icon for an original sci-fi habit
> game called Momentum Matrix. No text, no letters, no numbers, no logos, no
> watermark, no UI mockup. Scene: a luminous 8-by-8 holographic navigation
> matrix viewed at a slightly elevated three-quarter angle inside an elegant
> peaceful exploration spaceship; several chunky route-fragment tiles in cyan,
> violet, coral, and warm gold are being placed into a glowing stable corridor;
> one central Mission Beacon shines like a small gold star-compass; tiny energy
> motes and a soft celebratory shockwave suggest a satisfying line clear. Art
> direction: polished stylized 3D mobile game key art, clean silhouettes at
> 64px, dark midnight navy background, crisp rim lighting, optimistic
> diplomatic exploration rather than combat, original visual identity,
> balanced centered composition, generous safe margins, high contrast, no
> readable interface, no characters, no third-party resemblance. Output square
> 1:1, richly rendered but visually uncluttered.

## Motion system

The implementation contains more than five custom, reduced-motion-safe
animations:

1. hero arrival;
2. briefing copy rise;
3. holographic hero scan;
4. live grid scan;
5. Mission Beacon pulse;
6. route-fragment float;
7. placed-cell pop;
8. stabilized-corridor flash;
9. score rise;
10. result-orbit arrival and orbiting energy.

The original raster hero was generated as one optimized art input. Runtime
motion stays in CSS and the shared minigame particle layer so the experience is
small, responsive, and compatible with `prefers-reduced-motion`.

## Validation gates

- pure 8×8 rules and deterministic RNG tests;
- canonical ticket-spend / free-resume / persistence action tests;
- manifest and timed-event completion routing tests;
- TypeScript build;
- Vite production build;
- mobile image guard;
- 390×844 phone interaction and screenshot inspection;
- Supabase migration apply plus post-DDL security/performance advisors.
