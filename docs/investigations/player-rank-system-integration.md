# HabitGame Player Rank System — Integration Investigation

> Investigation only. No production code, schema, migrations, scoring formulas,
> reward paths, entitlement behaviour, feature flags, telemetry, or assets were
> changed by this report. All claims below are backed by direct inspection of
> the files cited.

Date: 2026-06-22
Branch: `claude/quirky-noether-kaly53`

---

## 1. Executive Summary

**Recommended architecture.** Treat rank as a *derived* label on an existing
progression metric, not a new system and not a stored value. Add a small pure
`rankForLevel()` / `rankForXp()` utility plus a badge **asset registry**, and
persist exactly **one** new piece of state: the highest rank the player has
*acknowledged* (for celebration de-duplication). Everything else is computed.

**Source of truth — and the one real decision to make.** The codebase currently
has **two** progression metrics, and they do not agree:

1. **Stored / accrued** — `gamification_profiles.total_xp` + `current_level` +
   `total_points` (`src/services/gamification.ts`, migration
   `supabase/migrations/0115_gamification_system.sql`). Persisted server-side,
   survives device changes, **drives the leaderboard** and reward grants.
2. **Derived / milestone** — the **Combined Journey Level**
   (`src/features/gamification/level-worlds/services/combinedJourneyLevel.ts`).
   Pure, monotonic, recomputed from durable milestones (islands, goals, habits).
   It is the **center spine of the dual-track My Quest / Game Progress overlay**
   and already has a server-authoritative threshold-chest claim ledger
   (`supabase/migrations/0257_combined_journey_reward_claims.sql`).

These are the two candidate anchors for rank. They measure different things and
will produce different rank numbers for the same user. **Choosing which one owns
rank is the single blocking product/architecture decision** (see §6, §7, §17).

**Primary UX flow.** Rank badge lives on the player popup header *and* on the
dual-track center spine → tapping it opens a **Rank Journey** modal → crossing a
threshold queues a **promotion celebration** that fires at the next safe
game-progress moment, never mid-reflection or mid-animation.

**Schema changes needed?** The first implementation (PR 1–PR 3, see §15) needs
**none** — rank is derived and `highestAcknowledgedRank` can live in existing
local/profile state initially. Celebration persistence and any rank rewards
(PR 4+) should reuse the existing idempotency-ledger pattern from migration
0257 rather than inventing a parallel ledger.

**Major risks.** (a) The two-level ambiguity above; (b) existing active users
instantly jumping several ranks on launch (multi-rank-jump handling required);
(c) oversized PNG badge assets (1.2–1.9 MB each) shipping to mobile; (d)
"Member" has **no definition anywhere in code** and must not be guessed.

**Verdict: PASS WITH CONDITIONS** (see §18).

---

## 2. Existing Systems Map

| Concept | Current implementation | File paths | Persistence | Canonical / legacy | Relevance to ranks |
|---|---|---|---|---|---|
| Accrued player level / XP / points | `total_xp`, `current_level`, `total_points`; curve via `calculateXPForLevel` / `calculateLevelFromXP` / `getLevelInfo` | `src/services/gamification.ts`; `src/hooks/useGamification.ts`; `src/types/gamification.ts` | `gamification_profiles` (Supabase, migration `0115_gamification_system.sql`) — cross-device | **Canonical (persisted)** | Candidate rank anchor #1; already cross-device + drives leaderboard |
| Combined Journey Level | Pure derivation `deriveCombinedJourneyLevel()` from islands/goals/habits + balance multiplier; monotonic | `.../level-worlds/services/combinedJourneyLevel.ts` | None — **derived**, recomputed each render | **Canonical (derived, newer)** | Candidate rank anchor #2; the dual-track spine metric |
| Dual-track overlay (My Quest / Game Progress) | `DualTrackOverlayViewModel` with real-life + game ladders, center spine, `journeyLevel`, "next chest at Lv N" | `.../level-worlds/services/dualTrackOverlayAdapter.ts`; consumed in `src/App.tsx`, `src/components/GameBoardOverlay.tsx` | Display-only | Canonical | Where the rank badge surfaces (center spine) |
| Combined-journey threshold chests | Idempotency ledger; one reward per `(user_id, threshold_level)`; writes only via server RPC (R4) | `supabase/migrations/0257_combined_journey_reward_claims.sql` | `combined_journey_reward_claims` | Canonical | **The pattern rank acknowledgement/rewards should mirror** |
| Leaderboard | `level` + `combinedWealth = total_points + total_xp` + `archetype` per entry | `src/services/leaderboard.ts` | Reads `gamification_profiles` + `profiles` | Canonical | Public surface for rank badge |
| Pro entitlement | `is_pro` boolean + `source` + `effective_to`; written by Stripe webhook | `src/services/billing.ts` (`BillingEntitlementRow`); `supabase/functions/stripe-webhook/index.ts`; migration `0213_billing_and_wallet_foundation.sql` | `billing_entitlements` | **Canonical for Pro** | Pro badge source of truth |
| AI tier (separate from Pro) | `VITE_AI_TIER === 'premium'` env gate | `src/services/aiEntitlementService.ts` | Build-time env | Separate concern | **Not** the Pro source; do not conflate |
| "Member" status | **Not found anywhere** | — | — | **Undefined** | Must be defined before Member badge ships (see §11) |
| Canonical reward paths | Currency/reward grant services + combined-journey claim RPC | `src/services/gameRewards.ts`, `src/services/gameCurrencies.ts`, R4 claim RPC (migration 0257) | Supabase | Canonical | Any rank reward must use these |
| Player identity (name/avatar/level) | Rendered in Score tab; `display_name` from `profiles` | `src/features/gamification/ScoreTab.tsx`; `src/services/leaderboard.ts` (`ProfileLeaderboardRow.display_name`) | `profiles` table | Canonical | Likely home of the popup rank header |
| Celebration / animation primitives | Confetti, celebration overlay, XP/achievement toasts, island win modal | `src/components/CelebrationAnimation.tsx`, `src/components/XPToast.tsx`, `src/components/AchievementToast.tsx`, `.../level-worlds/components/ConfettiBurst.tsx`, `.../IslandRunWinCelebrationModal.tsx` | n/a | Reusable | Reuse for promotion celebration |
| Quest Journey visual system | Existing journey/path visual framework | `src/features/quest-journey/QuestJourneyVisualSystem.tsx` | n/a | Reusable | Candidate base for Rank Journey modal |

**Most important answer:** Yes, a canonical long-term progression metric already
exists — in fact *two*. Do **not** add a third. The open question is only *which
of the two* drives rank (§6/§17).

---

## 3. Rank Asset Audit

Folder: `public/assets/ranks/`. Dimensions/sizes measured directly.

| Filename | Format | Dimensions | Size | Notes | Keep / change |
|---|---|---|---|---|---|
| `1_deckhand.png` | PNG | 1113×1178 | 1759 KB | **Oversized**, non-square | Convert→WebP, downscale |
| `2_crewmate.webp` | WebP | 557×589 | 27 KB | Good | Keep |
| `3_pathfinder.webp` | WebP | 557×589 | 25 KB | Good | Keep |
| `4_Navigator.webp` | WebP | 557×589 | 29 KB | **Capital N** breaks naming convention | Keep file, normalize name |
| `5_flight_operator.png` | PNG | 1113×1178 | 1318 KB | Oversized; underscore vs hyphen inconsistency | Convert→WebP, downscale |
| `6_senior-operator.webp` | WebP | 557×589 | 23 KB | Good | Keep |
| `7_lieutenant.png` | PNG | 1113×1178 | 1220 KB | Oversized | Convert→WebP, downscale |
| `8_commander.webp` | WebP | 557×589 | 36 KB | Good | Keep |
| `9_wing-commander.png` | PNG | 1113×1178 | 1343 KB | Oversized | Convert→WebP, downscale |
| `10_captain.png` | PNG | 1113×1178 | 1645 KB | Oversized | Convert→WebP, downscale |
| `11_fleet-captain.webp` | WebP | 557×589 | 34 KB | Good | Keep |
| `12_sky-marshal.png` | PNG | 1113×1178 | 1927 KB | **Largest**, oversized | Convert→WebP, downscale |
| `Member_badge.webp` | WebP | 557×589 | 29 KB | Membership, not a rank | Keep, separate registry |
| `Pro_memberbadge.webp` | WebP | 557×589 | 41 KB | Membership, not a rank | Keep, separate registry |
| `IMG_9896.webp` | WebP | 557×589 | 39 KB | **Orphan / unrenamed upload** (the prompt called it IMG_9880; the actual stray is `IMG_9896.webp`) | Identify, then rename or remove in a *separate* asset task — not here |

**Findings:**
- **Format split correlates with size**: every odd rank that is a PNG is
  1.2–1.9 MB; every WebP is 23–41 KB. The PNGs are ~40–80× heavier for the same
  display purpose. Shipping ~9 MB of badge PNGs to mobile is a real perf issue.
- **Dimension split**: PNGs are 1113×1178, WebPs are 557×589. Standardize to one
  square canvas (e.g. 512×512) with a small thumbnail variant (96×96 or 128×128)
  for list/leaderboard use.
- **Naming inconsistencies**: `4_Navigator.webp` (capital), hyphen vs underscore
  mix (`flight_operator` vs `senior-operator`), `Pro_memberbadge` vs
  `Member_badge`.
- **Orphan**: `IMG_9896.webp` is the stray. Per constraints, it was **not**
  renamed or deleted here.

**Proposed canonical naming convention** (apply in a later, separate asset PR —
not in the rank-logic PRs):

```
rank-01-deckhand.webp        rank-07-lieutenant.webp
rank-02-crewmate.webp        rank-08-commander.webp
rank-03-pathfinder.webp      rank-09-wing-commander.webp
rank-04-navigator.webp       rank-10-captain.webp
rank-05-flight-operator.webp rank-11-fleet-captain.webp
rank-06-senior-operator.webp rank-12-sky-marshal.webp
membership-member.webp       membership-pro.webp
```
Zero-padded index, lowercase, hyphen-separated, `.webp` only. Because filenames
should never be hard-coded in components (see §13/L), an **asset registry**
mapping `rankId → { badge, thumb, title }` lets the eventual rename happen in one
place.

---

## 4. Current Player / Profile UI

- **Player identity surface today:** `src/features/gamification/ScoreTab.tsx`
  renders the player name/avatar/level cluster (it is among the files matching
  `playerName` and the celebration/level vocabulary). This is the most natural
  home for the popup rank header.
- **Display name source:** `profiles.display_name`
  (`ProfileLeaderboardRow.display_name` in `src/services/leaderboard.ts`).
- **Level shown today:** the accrued `current_level` from `gamification_profiles`
  via `useGamification` / `getLevelInfo`.
- **No existing rank concept** exists in the UI — a `grep` for `playerRank`,
  `rankBadge`, `deckhand`, `sky marshal`, `expedition` across `src` returned
  nothing in component code. Clean slate.

**Proposed header hierarchy (mobile):**
```
[rank badge ~56px]  Player Name
                    Captain · Level 42
                    [Member|Pro mark ~18px]   Progress → Fleet Captain ▓▓▓░░
```
- Rank badge is the visual hero; tap → Rank Journey modal.
- Member/Pro is a *small* secondary mark; tap → membership info (separate action).
- On desktop/tablet, the same cluster can sit horizontally with the progress bar
  inline rather than stacked. Keep the header ≤ ~96px tall on mobile so it does
  not push content; the progress line is the only optional row.

---

## 5. Dual-Ladder Integration (My Quest vs Game Progress)

Evidence: `dualTrackOverlayAdapter.ts` builds a `DualTrackOverlayViewModel` with
`realLifeTrack` (goals/habits), `gameTrack` (islands/collectibles), and a
**`centerSpine` + `journeyLevel`** computed from `deriveCombinedJourneyLevel()`.
The plan doc `docs/investigations/my-quest-dual-track-progress-overlay-v2-plan.md`
confirms the center divider is the "shared progress spine."

**Ownership recommendation:** Rank belongs to the **center spine**, *not*
exclusively to the Game Progress ladder. The ChatGPT brief assumes rank is a
Game-Progress-only concept, but the code's own model unifies both sides into the
Combined Journey Level on the spine, and the balance multiplier explicitly
rewards advancing *both* sides ("rise together"). Mapping rank onto the unified
spine is the only choice consistent with that design — and it correctly lets a
free, real-life-focused player earn a prestigious rank.

- Game Progress ladder: shows the current rank badge as a spine milestone /
  promotion node; unacknowledged promotions pulse.
- My Quest ladder: unchanged — stays focused on Compass/curriculum. No
  regression there.

---

## 6. Rank Calculation Options

| Option | Description | Reliability | Migration risk | Duplicate-state risk | Offline | Exploit risk | Cross-device | Tuning | Retroactive |
|---|---|---|---|---|---|---|---|---|---|
| 1. Derive from accrued `current_level` | Map level bands → rank | High | None | Low | Works (reads cached profile) | Inherits XP system's | Yes (profile is server-side) | Easy (band table) | Free |
| 2. Derive from cumulative points/XP | Rank from lifetime XP directly | High | None | Low | Works | Inherits | Yes | Easy | Free |
| 3. Store rank explicitly on threshold cross | Write rank to DB | Medium | **Needs schema** | **High** (rank can desync from level) | Risky (write may fail offline) | Higher (client writes) | Only if server-written | Hard (stored values lag re-tunes) | Needs backfill |
| 4. Hybrid: canonical metric derives rank, separately persist acknowledged promotions | Derive rank; store only celebration ack | High | **None for rank** (ack reuses 0257 pattern) | Low | Works | Low | Yes | Easy | Free; ack ledger de-dupes |

**Anchor sub-choice (orthogonal to the option above):** whichever option, the
*input metric* is either the **accrued `gamification_profiles` level/XP** (anchor
#1) or the **derived Combined Journey Level** (anchor #2). See §7/§17.

---

## 7. Recommended Rank Model

**Recommend Option 4 (hybrid), anchored on the Combined Journey Level**, with
this reasoning and one explicit condition:

- **Derive rank** from the progression metric via a pure utility. This matches
  the existing, deliberate design of `combinedJourneyLevel.ts` ("XP is derived,
  not accrued… so the level can always be recomputed and never silently
  corrupts"). Re-deriving means rank can never desync and re-tuning thresholds is
  free.
- **Persist only acknowledgement** — the highest rank whose promotion
  celebration the player has seen — using the **same idempotency-ledger pattern
  already shipped in migration 0257** (`combined_journey_reward_claims`:
  `PRIMARY KEY (user_id, threshold_level)`, server-only writes). A
  `rank_acknowledgements` table (or reuse of the threshold ledger keyed by the
  rank's threshold level) gives duplicate-celebration protection for free and
  needs **no client write authority**.

**Conceptual shape (illustrative, not schema):**
```ts
// rankModel.ts (new, pure)
type RankId = 1..12;
interface RankDef { id: RankId; key: string; title: string;
  minLevel: number; badge: string; thumb: string; }
const RANKS: RankDef[];                    // single source of truth for thresholds
rankForLevel(level): RankDef;              // pure derive
nextRank(level): RankDef | null;
progressToNextRank(summary): { current, next, remaining, percent };
```
Threshold ownership: **one table of constants** in `rankModel.ts`, keyed off the
chosen metric's *level* (not raw XP) — mirroring how `combinedJourneyLevel.ts`
already keys "chests" off threshold level so the SQL ladder is unaffected by XP
re-tuning.

**The condition:** the chosen anchor metric (Combined Journey Level vs accrued
`current_level`) must be fixed *before* PR 1, because the leaderboard
(`src/services/leaderboard.ts`) currently shows the **accrued** level. If rank is
anchored on the Combined Journey Level but the leaderboard shows accrued level,
two different "levels" become visible to the player. Resolve by either anchoring
rank on the accrued level too, or by switching the leaderboard to display rank.
This is the one genuine architectural fork (see §17).

---

## 8. Threshold and Progression Proposal *(PROVISIONAL)*

The existing economy cannot yet validate per-day point rates from static
inspection — `combinedJourneyLevel.ts` derives XP from milestone *counts*
(islands ×100, current-island % ×1, completed goals ×60, consistent habits ×15,
capped at 8), not from a per-day rate, and no historical telemetry of daily
generation was found in code. **Daily/weekly rates are therefore UNKNOWN and
must not be fabricated.**

Provisional band table (anchored on Combined Journey Level; tune after observing
real distributions):

| Rank | Title | Min level (provisional) |
|---|---|---|
| 1 | Deckhand | 1 |
| 2 | Crewmate | 3 |
| 3 | Pathfinder | 6 |
| 4 | Navigator | 10 |
| 5 | Flight Operator | 15 |
| 6 | Senior Operator | 21 |
| 7 | Lieutenant | 28 |
| 8 | Commander | 36 |
| 9 | Wing Commander | 45 |
| 10 | Captain | 55 |
| 11 | Fleet Captain | 70 |
| 12 | Sky Marshal | 90 |

Shape: fast early bands (ranks 1–4 reachable quickly so new players feel
movement), widening mid bands, and a deliberately steep climb to Captain → Fleet
Captain → Sky Marshal for prestige. Because rank is derived, these numbers can be
re-tuned in one file with no migration. **Existing high-activity users will
likely land mid-ladder immediately** → multi-rank-jump handling (§10/§H) and a
single condensed recognition moment are required at launch, not optional.

---

## 9. Rank Journey Modal

Reuse `src/features/quest-journey/QuestJourneyVisualSystem.tsx` as the visual
base rather than building a new path renderer.

Structure (mobile-first, **vertical ladder** — matches the dual-track spine
metaphor and scrolls naturally on phones; a horizontal carousel fights one-handed
use):
1. **Current rank hero** — large badge, title, current level, total progression,
   progress bar to next rank, remaining points, one-line description.
2. **Rank journey** — all 12 ranks as a vertical path: completed (full badge),
   current (highlighted), next (badge + threshold), locked (dimmed). Tap any node
   to inspect.
3. **Next promotion** — next badge, threshold, progress bar, reward preview (if
   rewards are adopted), and what activity contributes ("islands, goals, habits —
   both ladders count").
4. **Past promotions** *(optional, lightweight)* — derived from the
   acknowledgement ledger; date + old rank.

Relationship clarity:
- **Game Progress ladder** = the live spine in the overlay (shows current rank
  node).
- **Rank Journey modal** = the dedicated full 12-rank screen (opened from the
  badge anywhere).
- **Player popup** = compact identity entry point.
- **Promotion celebration** = the transient moment; on "Continue" it can deep-link
  into the Rank Journey modal.

---

## 10. Promotion Celebration

**Reusable pieces (confirmed):** `CelebrationAnimation.tsx`, `ConfettiBurst.tsx`,
`IslandRunWinCelebrationModal.tsx` (a full-screen celebration precedent),
`XPToast.tsx` / `AchievementToast.tsx` (the lightweight "notification first"
option). No bespoke video is needed — the badge assets support CSS scale / glow /
crossfade / light-sweep.

**Safe-timing principle (adopt):** never interrupt a reflection, habit
completion, purchase, or active game animation. **Queue** the promotion and
surface it at the next safe game-progress moment (opening Game Progress / the
overlay). Concretely, the recommended trigger is **option 3→4 hybrid**: drop a
small "new rank!" pulse on the spine node immediately; play the full celebration
when the player taps it or next lands on a safe surface.

**Acknowledgement-state model (conceptual, no schema here):**
- `currentRank` — derived from the metric.
- `highestAcknowledgedRank` — persisted via the 0257-style ledger.
- `pendingPromotionQueue` — `currentRank − highestAcknowledgedRank`, computed.
- `lastCelebrationAt` — for throttling.

**Sequence:** dim → previous badge → crossfade to new badge → enlarge + particles
→ "Promotion Earned" → new title → short in-world line → reward (if any) →
Continue → Rank Journey or return to prior safe context.

**Multi-rank jumps — recommend CONDENSED (with hybrid presentation):** show the
*final* rank prominently ("You advanced 3 ranks — you're now Lieutenant") with
the skipped ranks as small earned cards underneath. Never chain 3–5 full modals.
Then set `highestAcknowledgedRank = currentRank` in one write. This also covers
offline rank-ups and login-time reconciliation: on next safe surface, the queue
is whatever the ledger hasn't acknowledged.

---

## 11. Member and Pro Status

**Pro — source of truth confirmed:** `billing_entitlements.is_pro`
(`src/services/billing.ts` `BillingEntitlementRow`; written by
`supabase/functions/stripe-webhook/index.ts`; migration
`0213_billing_and_wallet_foundation.sql`). Also carries `source` and
`effective_to`. **Note:** `VITE_AI_TIER === 'premium'` in
`src/services/aiEntitlementService.ts` is a *separate* AI-feature gate and is
**not** the Pro source of truth — do not conflate them.

**Member — UNDEFINED.** A search for `isMember` / `membership` / "Member" found
**no product definition in code** (only the `Member_badge.webp` asset and Pro
billing rows). Per the hard constraints, its meaning must not be assumed.
Candidate meanings to decide (§17): any signed-in account, completed onboarding,
non-Pro tier, or an earned loyalty status. **Blocking for the Member badge only**
— the rank system and Pro badge can ship without resolving it.

**Separation rule (enforce in UI):** rank = earned progression; Member/Pro =
account/entitlement status. The membership mark must render *smaller* than the
rank badge and never at hero size. A free Captain must visually outrank a new Pro
subscriber.

**Placement — recommend ONE primary + limited secondary:**
- Primary: player popup header (small mark beside identity).
- Secondary: account page (`src/features/account/MyAccountPanel.tsx`), and
  optionally the leaderboard row.
- Avoid: Score Hub, lobbies, every player card → badge spam.

---

## 12. Rewards and Economy Safety

**Recommendation: cosmetic-only, or none at first.** If rewards are adopted:
- They **must** flow through the existing canonical paths —
  `src/services/gameRewards.ts`, `src/services/gameCurrencies.ts`, and the
  server-authoritative combined-journey claim RPC (R4) backed by migration
  0257's `(user_id, threshold_level)` idempotency ledger. **Do not create a
  parallel reward ledger** (the brief and the 0257 design both forbid this).
- **Retroactive-grant hazard:** existing users jumping multiple ranks at launch
  would trigger mass back-grants of dice/essence and disrupt the Island Run
  economy. The idempotency ledger prevents *double* claims but does not prevent
  the *first* mass grant. Safest launch: ship promotions as **pure cosmetic
  celebration** (title/frame/identity), defer currency rewards until thresholds
  are validated against real distributions (§8).

---

## 13. Accessibility and Performance

- **Always render the rank name as text** alongside the badge — meaning must
  never depend on stars/stripes or colour alone (Fleet Captain = 2 stars, Sky
  Marshal = 3 stars are visual-only cues).
- Alt text per badge from the registry (`"Rank: Captain"`); screen-reader live
  announcement on promotion.
- Respect reduced-motion: the celebration must have a static fallback (the
  existing celebration components should be checked for a `prefers-reduced-motion`
  path).
- **Performance:** convert the six 1.2–1.9 MB PNG badges to WebP and standardize
  dimensions (§3). Provide a small thumbnail set (~96–128px) for list/leaderboard
  contexts so 24–48px renders don't download a 512px (or worse, 1113px) image.
  Asset paths should resolve through a registry, not hard-coded `/public/...`
  strings, so format/size swaps are one-line changes.

Legibility targets to validate per badge: 24 / 32 / 48 / 72 / 120 px + modal hero.

---

## 14. Risks and Edge Cases

- **Two-level ambiguity** — rank anchor vs leaderboard level mismatch (§7/§17). Top risk.
- **Duplicate celebrations** — solved by acknowledgement ledger (0257 pattern).
- **Data mismatch / stale local state** — rank is derived, so it self-heals on recompute; only the ack ledger is authoritative for "seen."
- **Offline rank-ups** — derive on reconnect; queue surfaces at next safe moment.
- **Returning / retroactive users** — condensed multi-jump moment (§10).
- **Multiple promotions in one session** — single condensed celebration, one ack write.
- **Entitlement delay** — Pro badge may lag a Stripe webhook; show last-known `is_pro`, reconcile on `fetchBillingSnapshot`.
- **Missing / failed badge image** — registry should provide a text-title fallback (ties to accessibility rule).
- **Threshold retuning** — free, single-file, no migration (because derived).
- **Downgrade / rollback** — rank is monotonic by design on the Combined Journey Level; do not let a retune *lower* a displayed rank without an explicit product call.
- **Account switching** — rank and ack must key off `user_id`; never cache across accounts.

---

## 15. Recommended Implementation Plan (small PRs)

The brief's proposed 6-PR sequence is sound for this codebase. Minor refinement:
insert an asset-hygiene PR and make the anchor decision a PR-0 gate.

- **PR 0 (decision, not code):** Resolve the rank anchor (§17 Q1) and "Member"
  meaning (§17 Q2). Blocking for PR 1.
- **PR 1 — Rank domain model + asset registry.** `RANKS` table, thresholds,
  `rankForLevel`, `nextRank`, `progressToNextRank`, badge/thumb paths via
  registry, unit tests. No UI. No schema.
- **PR 2 — Player popup identity header.** Badge + title + level/progress +
  small Member/Pro mark + tap action, in `ScoreTab.tsx` cluster.
- **PR 3 — Rank Journey modal.** Reuse `QuestJourneyVisualSystem`; full 12-rank
  vertical ladder, current/next/locked, responsive.
- **PR 4 — Spine integration + queued promotion celebration.** Current-rank
  node on the dual-track spine; pending-promotion pulse; condensed multi-jump
  celebration; `highestAcknowledgedRank` persisted via 0257-style ledger;
  reduced-motion fallback.
- **PR 5 — Leaderboard / public identity badge.** Add rank to
  `LeaderboardEntry`; reuse the compact badge.
- **PR 6 (separate, optional) — Asset hygiene.** Rename to canonical scheme,
  convert PNG→WebP, downscale, generate thumbnails, resolve `IMG_9896.webp`.

---

## 16. Files Likely to Change

- New: `src/features/.../rank/rankModel.ts`, `rankAssets.ts` (registry),
  `RankBadge.tsx`, `RankJourneyModal.tsx`, `PromotionCelebration.tsx`, tests.
- Edit: `src/features/gamification/ScoreTab.tsx` (popup header),
  `src/features/gamification/level-worlds/services/dualTrackOverlayAdapter.ts`
  (spine rank node), `src/services/leaderboard.ts` (rank in entries).
- Reuse: `src/features/quest-journey/QuestJourneyVisualSystem.tsx`,
  `src/components/CelebrationAnimation.tsx`,
  `.../level-worlds/components/ConfettiBurst.tsx` / `IslandRunWinCelebrationModal.tsx`.
- Read-only reference: `src/services/billing.ts` (Pro), `src/services/gameRewards.ts`
  / `gameCurrencies.ts` (reward paths), `combinedJourneyLevel.ts` (anchor).
- Assets: `public/assets/ranks/*` (PR 6 only).
- Possible new schema (PR 4 only): a `rank_acknowledgements` table *mirroring*
  `supabase/migrations/0257_combined_journey_reward_claims.sql`.

---

## 17. Open Product Decisions

1. **Rank anchor (BLOCKING):** derive rank from the **Combined Journey Level**
   (dual-track, derived) or the **accrued `gamification_profiles.current_level`**
   (persisted, drives leaderboard)? They disagree; the leaderboard currently
   shows the accrued level.
2. **"Member" definition (blocks Member badge only):** signed-in / onboarded /
   non-Pro tier / earned loyalty?
3. **Do promotions grant rewards** at launch, or cosmetic-only first?
4. **Final threshold table** — needs validation against real progression
   distributions before locking (§8 is provisional).
5. **Leaderboard:** show rank, level, or both?

---

## 18. Final Verdict

**PASS WITH CONDITIONS.**

The architecture is ready: a canonical derived progression metric exists
(`combinedJourneyLevel.ts`), the dual-track spine is the correct home, reusable
celebration/journey components exist, the Pro entitlement source is confirmed
(`billing_entitlements.is_pro`), and an idempotency-ledger pattern (migration
0257) already exists for rank acknowledgement/rewards to mirror. The first three
PRs need **no schema changes**.

It is **not an unconditional PASS** because two decisions must be made before
PR 1: (a) **which level metric anchors rank** (the two existing levels disagree,
and the leaderboard exposes the accrued one), and (b) **what "Member" means**
(undefined in code; must not be guessed). Asset hygiene (oversized PNGs +
`IMG_9896.webp` orphan) is a real but non-blocking follow-up.

---

### Appendix — Validation performed

- Read in full or part: `combinedJourneyLevel.ts`, `dualTrackOverlayAdapter.ts`,
  `src/services/leaderboard.ts`, `src/services/billing.ts`,
  `src/services/gamification.ts`, `src/services/aiEntitlementService.ts`,
  `supabase/migrations/0257_combined_journey_reward_claims.sql`,
  `my-quest-dual-track-progress-overlay-v2-plan.md`.
- `grep` sweeps for: progression vocab (level/xp/points/lifetime), dual-ladder
  terms, Pro/membership/entitlement, celebration/confetti/level-up, reward/grant,
  analytics/telemetry, and any pre-existing rank concept (none found in `src`).
- Measured all 15 files in `public/assets/ranks/` for format, dimensions, size.
- **No production behaviour, schema, scoring, entitlement, telemetry, feature
  flag, storage key, or asset was changed by this investigation.**
