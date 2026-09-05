# Vault Casino 2.0 Prototype Gauntlet

Date: 2026-08-30
Status: production rotation complete; visual and device embellishment continues

## Mission

Create a phone-sized Vault Casino lab containing five distinct, bounded,
high-quality game prototypes that reuse the existing Vault Palace language.
Expose the casino as an inspect-only destination inside Vault Island while
keeping actual eligibility, play entry, and rewards inside the canonical
Island Run loop.

## Sources of truth

- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`
- Existing `islandRunDormantDoorMinigame`, `islandRunVaultRush`, and
  `claimVaultRushReward` services.
- Existing Vault atrium, museum, treasures, materials, and modal portal.
- `docs/visual-references/island-special-vault-treasure/casino-concepts/2026-08-30/`.

## Closed-loop product boundary

The Vault follows the closed-loop social-game structure used by games such as
Monopoly GO rather than the legal structure of a cash casino. Rewards can be
cashed out into in-game cash but cannot leave the virtual economy or transfer
for external value. Players earn Vault attempts through the canonical Island
Run loop; there is no direct purchase of a Vault attempt. Microtransactions may
coexist elsewhere in the wider game economy, including repeat purchases that
can add up to substantial player spend.

This boundary does not make the games visually timid. Repeatable play loops,
bounded automatic sequences, jackpots, multipliers, dramatic suspense,
naturally occurring close results, bonus rounds, and reward celebrations are
allowed. Each round and five-game session must still reach a clear end.
Unattended infinite automatic play and fabricated near-misses that misrepresent
the resolved outcome remain prohibited.

Research:

- https://pmc.ncbi.nlm.nih.gov/articles/PMC5663799/
- https://www.gamblingcommission.gov.uk/news/article/gambling-commission-announces-package-of-changes-which-make-online-games
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7044556/
- https://www.gamblingcommission.gov.uk/news/article/loot-boxes-within-video-games
- https://www.scopely.com/en/legal?id=tos

## Non-negotiables

- Virtual cash-out into the in-game economy is part of the reward loop. There is
  no real-money cash-out, external item market, real-world-value prize, direct
  purchase of a Vault attempt, purchased retry, or pay-to-refresh route.
- The wider game may contain repeatable microtransactions and permit substantial
  aggregate spend; this Vault surface does not sell attempts or disguise a
  purchase as a cash-out.
- Automatic play is allowed only as a short, finite authored sequence. It may
  never create an unattended infinite reward loop.
- Close calls must arise from the honestly resolved game state; presentation
  cannot fabricate a near-miss or disguise a negative outcome as a win.
- Every prototype is one bounded round and states its outcome clearly. All five
  machine cash-outs end in the Grand Coffer ceremony; replay starts a new finite
  session rather than silently continuing the old one.
- Vault Island permits inspection and tour access only. Production play remains
  game-loop-granted.
- No gameplay write from React. `claimVaultCasinoReward` is the single reward
  authority for all five machines and derives the expected game and payout.
- No new runtime-state mirror, reward ledger, event clock, or ticket wallet.
- Modals remain viewport-portaled and lock background scrolling.
- Reduced motion preserves game state and readability.

## Prototype suite

1. Vault Rush: reveal until three figures match.
2. Crown Dice: keep/reroll gemstone dice with one crown-turn action.
3. Solar Orrery: stop three rings to align a solar path.
4. Prism Cascade: position mirror bumpers, then release one crystal.
5. Treasury Organ: repeat a short musical-cylinder sequence.

## Milestones and evidence

### M1: Pure game model

- Five stable game IDs, metadata, deterministic seeded rounds, and bounded
  result tiers.
- Rotation maps the five per-island claims to five non-repeating games.
- Unit tests cover determinism, bounds, rotation, and inspect/play policy.

### M2: Phone lab

- `/dev/vault-casino-lab` renders all five prototypes at 390x844.
- Every game can be selected, reset, completed, virtually cashed out, and
  inspected without spending currency in the lab.
- Native circular icons remain recognizable at 38-44px.
- No layout shift, overlap, or clipped controls.

### M3: Vault inspection

- The production Vault modal can open the casino showroom and return.
- The showroom has no play, buy, ticket, retry-purchase, or reward-claim path.
- Current availability may be indicated but cannot be consumed there.

### M4: Verification

- Focused service tests pass.
- Island Run architecture guard passes without a new allowlist entry.
- TypeScript and production build pass.
- Browser screenshots pass at 390x844 and a desktop viewport.
- Reduced-motion and keyboard operation receive spot checks.

## Production integration

- Dormant landmark doors resolve one deterministic, non-repeating machine from
  the effective island and persisted claim count.
- Production results are normalized by the service. Machine-supplied tiers are
  ignored, scores are bounded, and cash payouts are derived canonically.
- One state commit credits current Essence, lifetime earned Essence, and the
  existing per-island five-claim ledger. A repeat cash-out is rejected after
  the rotation advances.
- The fifth cash-out opens the finite Grand Coffer ceremony. Production mode
  has no retry, autoplay, ticket purchase, or new-session control.
- Crown Dice no longer uses its flat CSS placeholder. It renders an actual
  Three.js casting machine with rounded gemstone dice, physical gold and marble
  materials, inset pips, raycast selection, held-die halos, and bounded roll
  animation.
- No new Supabase field is required: the existing conflict-merged
  `vaultRushClaimsByIsland` ledger persists the five seals.

## Deferred

- Full Three.js casino machinery, authored audio, and haptics.
- Physical-device iOS QA and live deployment.

## Completion evidence

- Five deterministic prototype cores and the shared phone lab are implemented.
- The closed-loop product boundary is encoded as a typed service policy and
  protected by unit and contract tests.
- Prototype results convert to bounded virtual cash payouts. The lab wallet
  retains those payouts across finite sessions without writing gameplay state.
- Vault Island opens the casino in inspect mode and derives its availability
  dot from the existing canonical Vault Rush state.
- Browser play-through completed all five rounds and filled the five-seal
  coffer. Five explicit cash-outs produced 1,440 virtual cash, the Grand Coffer
  ceremony ended the session, and Play again reset all seals while retaining
  the wallet. A rapid Cash out double-tap credited once and left the completed
  machine locked as Secured. Inspect mode disabled all play controls and the
  tour cycled machines.
- Production-integration QA replayed Prism Cascade at phone size, changed two
  mirrors, resolved an honest standard result, and verified that a rapid double
  cash-out credited exactly 170 once. Crown Dice showroom inspection confirmed
  disabled controls, a visible next-game indicator, no clipped text or controls,
  and no browser warnings or errors.
- QA captures live in
  `docs/visual-references/island-special-vault-treasure/casino-concepts/2026-08-30/qa/`.
- Island Run service suite: 1,984 passed, 0 failed.
- Island Run architecture guard: 0 violations.
- Vault Casino contract guard: passed.
- Repository-wide TypeScript build: passed.
- Production Vite bundle: passed. The repository-wide `tsc -b` produced no
  diagnostics before the host terminated the unusually long check at its
  execution limit; the focused strict check covers the changed type surface.

## Rollback

The dev route, showroom switch, pure service, and new component files are an
isolated slice. Removing those additions restores current Vault Rush behavior;
no migration or player-state rollback is required.
