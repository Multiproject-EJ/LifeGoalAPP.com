# Vault Island production integration gauntlet

## Mission

Ship the approved Vault Island v073 exterior, palace atrium, museum interior, and eight authored treasure models as a real fullscreen Island Run collection experience.

## Authority and boundaries

- Base: latest `main` at `29ecd586`.
- Visual authority: approved v073 runtime captures and immutable Vault Island source packet.
- Gameplay authority: canonical `vaultRushClaimsByIsland` ledger and `claimVaultRushReward` action.
- Presentation rule: one distinct island with at least one successful Vault Rush claim unlocks one museum relic in canonical order.
- Repeat claims on the same island retain their existing economy behavior and do not mint duplicate museum relics.
- The modal, lab, and Three.js models remain read-only and may not persist gameplay state.

## Acceptance gates

1. Empty, partial, and complete collections resolve deterministically from sanitized claims.
2. Locked displays retain an authored pedestal and glass case but are not clickable or valued.
3. Owned treasures retain premium metal, stone, enamel, gem, glass, sparkle, reveal, and inspection behavior.
4. The live board exposes Vault Island through its menu and pauses gameplay attention while the fullscreen modal is open.
5. The modal is viewport-fixed, centered, Escape-dismissable, and locks body, document, and root scrolling.
6. The standalone island and treasure labs remain available for future asset production.
7. Focused service tests, architecture checks, Vite build, and matched desktop/mobile runtime captures pass.
8. A first claim on a new distinct island opens directly on the newly earned relic; repeat claims never replay a museum unlock.
9. The museum reads canonical money holdings without writing gameplay state and maps them into bounded, visibly distinct reserve tiers.
10. Vault Island remains absent from the toolbar, board menu, modal tree, and relic ceremony until canonical Island 004 `broken-causeway` completion grants the special-island gift.
11. Island 004 completion opens a dedicated fullscreen gift reveal with fireworks, scroll lock, reduced-motion support, and the new launcher spotlighted at its permanent toolbar coordinates; either primary entry opens the real collection.

## Evidence target

- Standalone exterior, atrium, and museum captures at phone and desktop sizes.
- Production collection captures for empty and partial ownership states.
- Matched zero-balance and legendary-reserve phone captures with exact scene counts.
- Contract output for model runtime, lab behavior, and gameplay architecture.

## Island 004 gift reveal evidence

- Phone unlock reveal: `docs/visual-references/island-special-vault-treasure/gauntlet/qa/raw/browser-captures-v082/gift-unlock-phone-390x844-viewport.jpg`.
- Phone handoff: `docs/visual-references/island-special-vault-treasure/gauntlet/qa/raw/browser-captures-v082/gift-to-vault-phone-390x844-viewport.jpg`.
- Quality review: `docs/visual-references/island-special-vault-treasure/gauntlet/qa/reviews/v082-island-004-gift-reveal.md`.
- Canonical Island Run suite: 1896 passed, 0 failed.
- Island Run architecture guard: 0 violations.
- Vite production bundle: passed.
