# Post-content roadmap: Drift Voyage, expansion packs, Mega Museum (2026-10-01)

## Decisions (from the 2026-10-01 discussion)

| Topic | Decision |
| --- | --- |
| Build first | **Drift Voyage**: the post-120 endgame loop |
| Expansion packs | **Side voyage, any time**: owned packs are switched to from the voyage map, keep their own progress and never block the main path |
| Pack availability | **Dev only until production ready** (user decision 2026-10-01): packs, their catalog and purchase stay behind the dev-mode gate and must not show for regular players |
| Mega Museum mini-game | Open: decide later |

## Phase 1: Drift Voyage (shipped in this change)

- Finishing Island 120 still wraps to Island 1 on the next cycle. Costs and rewards keep scaling with the effective island number, as before.
- Every cycle after the Great Drift is a **Drift Voyage**. Each island visit carries a deterministic **drift current**, and its bonus is applied in the canonical boss-reward resolver (`getIslandRunBossReward(island, { cycleIndex })`):
  - 🌅 Golden Tide: +50% essence
  - 🍃 Lucky Winds: +10 dice
  - ✨ Starlit Current: +2 Lucky Spin tokens
  - 🌊 Treasure Swell: +25% essence and +5 dice
- Rotation rules: neighbouring islands never share a current, and the same island gets a different one each voyage.
- **Presentation:**
  - The trip home from 120 to 1 has its own travel-interlude caption.
  - A one-time **Drift Voyage intro** on Island 1 explains the currents and teases the Mega Museum.
  - The island affirmation names the current.
  - The island-clear celebration shows "… bonus included".
- Code:
  - rules: `services/islandRunDriftVoyage.ts`
  - intro modal: `components/DriftVoyageIntroModal.tsx`
  - preview: `/dev/travel-interlude-preview?driftIntro=1`

## Phase 2: Shuffled drift order (proposed)

The original idea was that players "play random islands again". Visiting islands in a shuffled order needs:
- a deterministic per-cycle permutation that replaces `pendingNextIsland = island + 1`;
- the voyage map to show voyage progress rather than `island < current`;
- feature gates (traffic light, puzzle collection, Island 002 campaign) to treat Drift Voyages as fully unlocked.

This should be a separate, tested slice.

## Phase 3: Expansion pack foundation (proposed)

> **Dev only.** Everything in this phase stays behind the existing dev-mode gate (`isDevModeEnabled`). The voyage switcher, pack catalog, shop entries and feature-pack offers render only in dev until a deliberate production-ready flip with its own tests.

- **Voyage dimension.** Add a canonical `voyageId` (`main`, `beach-party`, `christmas-feels`, `meditation`, …) with per-voyage progress. Island numbers stay local to their voyage. Everything keyed by island number today (signature missions, stop plans, the voyage map) gains the voyage prefix.
- **Pack catalog.** Each pack has an id, a title, an island count (15–20, or 5 for feature packs), a price (around 25 kr), an optional seasonal sale window and an unlock source:
  - shop purchase; or
  - feature unlock, e.g. Meditation, which offers 5 islands that teach it through the game loop and nudge habit suggestions.
- **Purchase.** Bought through the existing shop and entitlement path, owned forever. Seasonal packs are only sold in season.
- **Play.** Switching voyage from the voyage map keeps the main-path state intact.

## Phase 4: Mega Museum, Vol 2 (proposed)

- 120 museum rooms played with the same core loop: dice, stops, and exhibits built instead of landmarks, with stories and tasks per room.
- Treasures found on the voyage go on display. The existing Vault Rush museum collection (`islandRunVaultCollection.ts`) is the seed.
- A new alternative event mini-game: still to be decided.
