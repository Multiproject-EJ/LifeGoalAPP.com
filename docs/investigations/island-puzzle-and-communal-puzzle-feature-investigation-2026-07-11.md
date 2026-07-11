# Island Puzzle + Communal Puzzle Feature Investigation

Date: 2026-07-11
Status: investigation only — no runtime behavior changed by this document.

## 0. TL;DR verdict

1. **A 9-piece island-specific puzzle already exists** (the 3×3 Technology
   Collection) and its modal is already a snapping 3×3 grid — but it is only
   wired up on Island 1, its piece placement is static and dumb (all nine
   pieces sit on fixed tiles, visible from the first roll), and its artwork
   pipeline was never finished (islands 2–12 have empty asset folders).
2. **The "5 pieces" the player sees is a different, colliding system**: the
   reward-bar *sticker fragment* economy (5 fragments = 1 sticker) is labeled
   "🧩 puzzle pieces" in the UI. Two unrelated systems share the word
   "puzzle" and the 🧩 icon, which is why the feature "does not seem to work
   very well" — it is actually two half-features wearing the same costume.
3. **The communal puzzle does not exist anywhere** — no code, no schema, no
   design doc. It must be built. The right architecture is one large master
   image + one *generated* SVG jigsaw-lattice overlay whose unfound cells are
   blacked out — never 1,000 per-piece PNGs.

---

## 1. What exists today

### 1.1 The island-specific 9-piece puzzle (Technology Collection) — EXISTS

Core resolver: `src/features/gamification/level-worlds/services/islandRunTechCollection.ts`

- `TECH_COLLECTION_CELL_COUNT = 9` (3×3). Landing on a placed
  technology-fragment tile snaps a piece into a per-island 3×3 grid.
- Line rewards: 8 lines (3 rows, 3 cols, 2 diagonals) × **+10 dice** each;
  full-board completion pays **+100 dice** exactly once (idempotent 8→9
  transition guard).
- Persisted in canonical ledgers `techCollectionByIsland` /
  `techCollectionRewardedLinesByIsland` (migration 0264) — survives reloads,
  syncs across devices.
- Design contract already ratified in
  `docs/gameplay/island-run-nine-fragment-technology-contract.md`: *"Each
  island may contain one technology reconstructed from exactly nine distinct
  collectible fragments … each collected slot reveals one ninth of a coherent
  completed technology image."*

The 3×3 modal: `IslandTechCollectionModal.tsx` + `IslandTechGrid.tsx`

- Already a proper 3×3 grid with a **snap-into-place animation**: phase 1
  shows the recovered fragment large and glowing, phase 2 flies it (FLIP
  tween) into its exact grid slot, phase 3 lands it with a COLLECTED! stamp
  and line-completion callouts. The 9th piece triggers a separate
  full-completion celebration (`IslandTechCompletionCelebration`).
- Verdict: **the modal does not need a rebuild** — the requested "9 (3×3)
  grid so pieces snap into place" is implemented and polished. What's missing
  is content coverage and artwork.

### 1.2 What's broken / unfinished about it

| # | Problem | Where |
|---|---------|-------|
| 1 | **Only Island 1 has piece placements.** `PLACEMENTS_BY_ISLAND` contains exactly one entry (island 1). On islands 2–12, `listIslandTechnologyFragmentPlacements()` returns `[]` → the puzzle silently does not exist. | `islandTechnologyFragmentPlacements.ts:34–36` |
| 2 | **Placement is static, not intelligent.** Nine hand-picked tile indices (1, 6, 10, 13, 17, 21, 25, 29, 33), all visible from the first roll, no pacing, no drip-feed, no scarcity, no pity mechanics. Collecting is a passive by-product of rolling, not a chase. | `islandTechnologyFragmentPlacements.ts:22–32` |
| 3 | **Artwork pipeline abandoned midway.** `TECH_COLLECTION_IMAGE_SRC` points at `/assets/puzzle/island_001/tropical_island_puzzle_09_bottom_right.webp` — a single *bottom-right piece* used as the "whole image" fallback sprite. `public/assets/puzzle/island_002 … island_012` are **empty directories**; island_001 contains one piece plus a stray `Tesds/` folder. Island 1 works only because per-slot art exists separately at `/tech/Concord_frag1-9.webp`. | `islandRunTechCollection.ts:55`, `public/assets/puzzle/` |
| 4 | **The asset factory exists but was never run to completion.** `tools/island-puzzle-factory/` is a full deterministic 3×3 jigsaw cutter (SVG geometry authority → nine full-canvas overlay masks → QC'd pieces) with a production template already committed. Nothing runtime consumes its output yet. | `tools/island-puzzle-factory/` |

### 1.3 The "5 pieces, not 9" confusion — a second, colliding system

The reward bar (`islandRunContractV2RewardBar.ts`) rotates payouts
`dice → essence → minigame_tokens → sticker_fragments`, and:

- `STICKER_FRAGMENTS_PER_STICKER = 5` — **five** fragments complete one
  sticker (+100 dice, +50 essence).
- The board UI labels these fragments with the 🧩 emoji and the words
  "puzzle pieces" (`IslandRunBoardPrototype.tsx:5001`, `:13249`), the album
  button reads `🧩 X/5` (`:11642`), and the album dialog says *"Every 5
  fragments complete one sticker"* (`:13774`).
- The traffic-light coin flip also pays these fragments and calls them
  "puzzle pieces" (`:13227–13229`).
- On top of that, the Score hub has a third placeholder: a demo-status
  **"Puzzle Gallery"** card (`score.stickersGallery` in
  `featureAvailability.ts`) that describes *sticker collections* and has no
  implementation behind it.

**So the player experiences: a "puzzle" counter that maxes at 5, a separate
3×3 puzzle that only exists on one island, and a Puzzle Gallery that opens
nothing.** This is the root cause of "the puzzle feature does not work very
well" — it is a naming/identity collision, not a single broken system.

### 1.4 Communal puzzle — DOES NOT EXIST

Searched all of `src/` and `docs/` for communal/community puzzle mechanics:
nothing exists in code, schema, or design docs. The uploaded mock
("6. COMMUNITY EVENT PUZZLE — Everyone contributes pieces… 72,350 / 100,000
Pieces") is a concept image only. Everything below is a from-scratch build.

---

## 2. Recommended design

### 2.1 Fix the identity collision first (cheap, high leverage)

- Reserve 🧩 + the word "puzzle" exclusively for the 3×3 island puzzle and
  the future communal puzzle.
- Rebrand reward-bar sticker fragments to a sticker/album identity (e.g. 🎟️
  or ✨ "sticker shards") in the five UI strings listed above. No economy or
  persistence change — copy/icon only.
- Repoint the Score-hub "Puzzle Gallery" placeholder copy at the actual
  puzzle systems (completed island technologies + communal puzzle progress).

### 2.2 Intelligent placement engine for the nine island pieces

Replace the static per-island placement table with a deterministic engine
(`islandPuzzlePlacementEngine.ts`) that works for all 12 islands with zero
hand-authoring, following the addiction curve the codebase already uses for
the reward bar (fast early wins → stretch → breather → mega):

1. **Eligible-tile derivation.** Compute ordinary economy tiles by excluding
   the reserved specials (landmark doors 5/14/23/32, traffic light 19,
   build-discount 12, free-ticket 30, card station 22, encounters 5/9/27,
   start 0) instead of hand-avoiding them per island. The existing comment in
   `islandTechnologyFragmentPlacements.ts` documents exactly why fragments on
   special tiles are uncollectable — codify it.
2. **Drip-feed, not dump.** Only 2–3 pieces are spawned/visible at once. When
   one is collected, the next spawns after a short delay (1–2 rolls), so the
   board always shows a *reachable goal* without revealing the whole set.
3. **Ahead-of-player spawning.** Seeded RNG (reuse the existing
   `island × ISLAND_SEED_STRIDE + tile × TILE_SEED_STRIDE + roll` seed scheme,
   `IslandRunBoardPrototype.tsx:6670–6678`) places new pieces 5–12 tiles
   ahead of the player's current position — near-miss psychology: a visible
   piece is almost always 1–2 rolls away.
4. **Pacing curve.** Pieces 1–3 spawn close and frequent (onboarding dopamine),
   pieces 4–6 at medium spread, pieces 7–9 rarer/further (the chase), mirroring
   `REWARD_BAR_CURATED_TARGET_SEQUENCE`'s philosophy.
5. **Pity guarantee.** If the player has rolled N times (suggest N = 8) since
   a piece became visible without landing on it, relocate it into the
   player's next high-probability landing window (2–12 tiles ahead weighted by
   two-dice distribution). Never let a session end piece-less.
6. **Determinism + persistence.** Spawn state derives from persisted canonical
   state (collected slots + roll counter), so reload/device-sync cannot dupe
   or lose pieces. The resolver stays pure and unit-testable like
   `resolveTechCollection`.

The 3×3 modal, line rewards, +100 completion, and persistence ledgers all
stay exactly as they are.

### 2.3 Finish the 9-piece artwork with the existing factory

- Generate one master 900×900 artwork per island (ImageGen), run
  `svg-to-masks.mjs` + `PRODUCTION_EXACT_JIGSAW` per the committed production
  template, and promote QC-passed pieces to
  `public/assets/puzzle/island_XXX/<slug>/pieces/01-09.png` (the runtime
  layout the factory README already specifies).
- Extend `islandTechnologyFragmentVisuals.ts` from a hard-coded island-1 map
  to a manifest-driven lookup so each island's pieces resolve automatically.
- Fix `TECH_COLLECTION_IMAGE_SRC` (currently a single corner piece) to a
  per-island completed-image path with the existing emoji fallback.
- Clean up `public/assets/puzzle/island_001/Tesds/` and the stray loose piece.

### 2.4 Communal puzzle — architecture

**Rendering (the user's instinct is correct and is the only scalable way):**

- One large master image (e.g. 2400×1500) rendered once as an `<img>`.
- One **generated SVG lattice overlay** stacked on top: a seeded jigsaw-edge
  generator produces a grid of ~1000 cells (e.g. 40×25) as SVG paths.
  - Unfound cells: filled near-black (`#0b0e1a` at ~97% opacity) with the
    lattice stroke visible — this "mutes down" the image exactly as described.
  - Found cells: fill `transparent`, revealing the image beneath.
- **Never generate 1,000 piece PNGs.** The island factory's full-canvas
  overlay strategy is right for 9 pieces and catastrophically wrong for 1,000
  (1,000 × full-canvas images). One image + one SVG path layer is a few
  hundred KB total and renders in one paint.
- The existing factory's principle carries over: SVG geometry is the
  authority. New tool: `tools/communal-puzzle-factory/` (or an extension)
  that emits `lattice.svg` + `manifest.json` (seed, rows, cols, piece ids)
  so client and QC agree on geometry deterministically.

**Backend (Supabase — required, because it's shared across all players):**

```sql
communal_puzzles (
  id uuid pk, slug text, image_url text,
  cols int, rows int, total_pieces int,      -- e.g. 40 × 25 = 1000
  filled_count int default 0,
  status text check (status in ('active','completed','archived')),
  lattice_seed bigint, starts_at timestamptz, ends_at timestamptz
)
communal_puzzle_pieces (
  puzzle_id uuid fk, piece_index int,
  claimed_by uuid fk auth.users, claimed_at timestamptz,
  pk (puzzle_id, piece_index)
)
```

One atomic RPC `claim_communal_pieces(puzzle_id, n)` assigns the caller `n`
random unclaimed indices (row-locked), increments `filled_count`, and returns
the indices so the client can animate exactly those cells un-blacking.
Realtime subscription (or polling) updates the shared progress bar
(`72,350 / 100,000 Pieces` in the mock).

**Earning flow + per-island cap (per the request):**

- Completing an island's 9-piece puzzle awards communal pieces with a
  celebration: pieces burst from the completed 3×3 grid and fly (reuse the
  existing FLIP-tween pattern from `IslandTechCollectionModal`) into a
  communal-puzzle chip/banner, then the communal board shows those exact
  cells illuminating.
- **Hard cap: max 5 communal pieces per island.** New canonical ledger
  `communalPiecesAwardedByIsland: Record<islandKey, number>` (same pattern as
  the tech ledgers); the award action clamps at 5 and is idempotent, so
  replays/reloads can never exceed the cap. Once an island has awarded 5, it
  awards nothing further.
- Suggested distribution within the cap (keeps mid-island motivation):
  first completed line → 1 piece, third line → 1, sixth line → 1, full 3×3
  completion → 2 (total 5). Alternative: all 5 on full completion — simpler,
  but wastes the cap's pacing potential.

### 2.5 Suggested build order

| Phase | Scope | Size |
|-------|-------|------|
| 1 | Naming/icon de-collision + Puzzle Gallery copy fix | XS — string/icon edits in ~6 places |
| 2 | Placement engine (pure resolver + tests) replacing the static table; wire islands 1–12 | M — new service + board wiring; modal untouched |
| 3 | Run the puzzle factory for islands 1–12; manifest-driven visuals | M — mostly asset production; small visuals refactor |
| 4 | Communal puzzle backend (tables + claim RPC + RLS) | M |
| 5 | Lattice generator + communal puzzle screen (image + SVG overlay + progress bar) | M/L |
| 6 | Award flow: island completion → capped communal pieces + flight animation | S/M — reuses celebration patterns |

Phases 1–3 fix "the puzzle feature doesn't work well" on their own; 4–6 are
the new communal feature and depend on nothing in 2–3 except the award hook.

---

## 3. Key file map (for the implementation PRs)

- `src/features/gamification/level-worlds/services/islandRunTechCollection.ts` — pure 3×3 resolver (keep).
- `src/features/gamification/level-worlds/services/islandTechnologyFragmentPlacements.ts` — static placements (replace with engine).
- `src/features/gamification/level-worlds/services/islandTechnologyFragmentVisuals.ts` — island-1-only art map (make manifest-driven).
- `src/features/gamification/level-worlds/components/IslandTechCollectionModal.tsx`, `IslandTechGrid.tsx`, `IslandTechCompletionCelebration.tsx` — the snapping 3×3 modal (keep; reuse its flight tween for communal awards).
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:6576–6668` — landing/collection wiring; `:5001/:11642/:13227/:13591/:13742–13780` — sticker-fragment strings misbranded as "puzzle".
- `src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts` — sticker fragment economy (`STICKER_FRAGMENTS_PER_STICKER = 5`) — rebrand strings only, keep economy.
- `src/config/featureAvailability.ts:431` — `score.stickersGallery` "Puzzle Gallery" placeholder.
- `tools/island-puzzle-factory/` — deterministic 9-piece asset pipeline (run it; extend the SVG-authority pattern for the communal lattice).
- `public/assets/puzzle/` — island_002–012 empty; island_001 contains one stray piece + `Tesds/` typo dir.
