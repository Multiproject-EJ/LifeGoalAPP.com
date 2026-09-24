# Island-paired controller cosmetics

## Outcome / authority
User requested island-specific themes, an explicit default-theme choice independent of OS appearance, cosmetic purchasing/default selection, an Island003 tile palette pass, and developer daily-wheel reset. Local implementation/testing authorised; no deployment or live account reset in this slice.

## Rules
- Island002: Light. Island003: Snow & Gold. Special Treasure/Vault surface: Gold, initially tucked with explicit swipe-up affordance.
- Ordinary islands (including001/004/005): selected owned default, otherwise Default Day. Default Dark is explicit, never derived from OS mode.
- Island theme overrides the player's saved default without overwriting it. Developer preview selection is temporary and cannot create ownership.
- Preserve canonical gameplay, rewards, one-time claims, authored mission and tile geometry.
- Purchase pricing/currency and repeat Treasure-entry collapse behaviour require confirmation. Do not invent paid entitlements or prices.

## Slices and gates
1. Pure theme policy + explicit preference UI; tests cover overrides, default restoration, dev isolation and OS independence.
2. Island003 pearl/glacier/champagne material experiment; inspect real game at phone width, no topology changes.
3. Developer daily spin tooling; gated both at entry and service, preserve history and jackpots, avoid production reward bypass.
4. Shop ownership/purchase persistence after agreed economy; atomic canonical spend, idempotency and ownership validation; no cosmetic ownership in UI-only storage.
5. Treasure surface adapter after inspecting its distinct roll flow; preserve the special roll action, do not wire ordinary island rolls.

## Recovery / handoff
Worktree `/private/tmp/habitgame-controller-map-release-20260924`. Prior personality work is uncommitted and must be preserved. Small additive files and scoped hunks permit rollback. Do not copy the stale original-root board. Run policy tests, architecture guard, TypeScript, build, service suite and browser checks. Stop purchasing work for unresolved economy/access decisions; do not substitute fake ownership or expose ungated daily rewards.

## User clarifications and delivered local slice
- Confirmed Vault Island collection world, not Treasure Path or Island019. Tuck on every re-entry.
- Follow-up requested smaller, clearer multiplier HUD and two extra rapid MAX taps before wrap; after a 1-second gap the next click wraps normally. Pure input guard preserves canonical multiplier tiers and jump lock. The real browser verified reaching MAX and wrapping after a pause; the rapid timing cases are deterministic unit tests (browser automation latency is unsuitable for that timing assertion).
- Public002 Light,003 Snow & Gold, Vault Gold; ordinary Day/Dark preference is explicit and owner-scoped **on this device**. Paid ownership/cross-device preference persistence is not yet implemented.
- Vault's middle control explicitly says BACK TO ISLAND and spends nothing; its other controls return to the ordinary island before opening their existing panels. No normal roll executes under the collection modal. Initial tucked view has a swipe-up hint and keyboard restoration.
- Island003 route materials changed from violet/periwinkle to pearl/glacier/champagne, leaving geometry and gameplay untouched. Seen in real Island003 scene at desktop and 390px viewport. Visual preview now themes the controller using its displayed island rather than the underlying demo-save island.
- Developer menu Reset daily spin opens a **no-payout rehearsal**, not a production eligibility/history reset. Browser completed a 50-dice preview and reset; real dice stayed180, Money600, shards0. The helper can repeat50 times without persistence and rejects calls when developer mode is off. Real reward-grant reset is deliberately not implemented without a separate authorization/entitlement design.
- Theme purchase remains blocked on currency/price decision. No purchase button with invented pricing or local fake entitlement was added.

## Verification
- Pure theme policy, MAX guard, pillar geometry/framing and replay tests pass.
- Architecture:0 violations,3 pre-existing allowlisted warnings.
- TypeScript initial full pass:exit0. Final production rebuild passed.
- Browser:002 Light,003 Snow override despite selected Dark,004 restored Dark; Vault Gold initial tuck/open/re-entry tuck; developer wheel/replay and unchanged wallets; real island palette inspected.
- Full service suite rerun after updating the old structural MAX-lock assertion:2,302 passed,0 failed.
- No push, deployment, live DB write or phone install in this pass.
