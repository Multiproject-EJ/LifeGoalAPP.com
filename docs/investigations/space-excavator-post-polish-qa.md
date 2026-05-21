# Space Excavator Post-Polish QA Audit (No-Code)

Date: 2026-05-21  
Scope: code/CSS/tests/mobile-layout audit after polish + hard-block + bomb + artifact-preview slices.

## Reviewed surfaces
- `SpaceExcavatorMinigame.tsx` gameplay/minigame UI flow.
- `spaceExcavator.css` visual system + responsive/safe-area behavior.
- Space Excavator service tests in `islandRunStateActions.test.ts` and supporting clue/reward/depth tests.

---

## 1) Mobile UX findings

### 1.1 Vertical crowding is improved but still borderline on short devices
- The screen now stacks: HUD chips, depth banner, artifact preview, clue legend, clue/bomb feedback, board, event progress, actions, and footer ticket pill.
- Layout is technically responsive (`overflow-y: auto`, reduced spacing at <=420px and <=700px height), so hard clipping risk is low.
- However, information density is high before the board, especially once the clue legend and artifact preview are both visible.

**QA read:** survivable on modern phones, but cognitively crowded for first-time users and physically crowded on short-height devices.

### 1.2 Close button + ticket footer safe-area handling is mostly correct
- Root container and footer both account for safe-area insets.
- Bottom elements should sit above home indicator on iOS-class devices.
- Remaining risk is *stacking fatigue*: users may need extra scroll to access Close when board shell takes more height on smaller screens.

### 1.3 Hard blocks are present but affordance is still subtle
- Hard blocks use border and glow changes; cracked state uses a small crack glyph.
- Functionally clear once learned, but first-glance distinction from normal covered tiles is modest (especially in high visual noise).
- Clue text "Hard Block Cracked" helps only after first interaction.

### 1.4 Bomb impact readability is strong
- Bomb has origin pulse + wave + cleared/cracked post-states + textual summary line.
- This is one of the clearest mechanics in the current pass.
- Minor UX risk: summary wording is dense for very fast repeated digs.

### 1.5 Artifact progress is good but emotional payoff remains mid-tier
- New artifact silhouette + mini assembly grid + percentage clearly communicates objective progress.
- The piece-found pulse is nice, but still small compared to the amount of screen it consumes.
- "Excitement" is better than prior state, but not yet "moment-defining" per board clear.

---

## 2) Gameplay clarity findings

### 2.1 Cold / warm / hot / relic comprehension: likely mixed for brand-new users
- Clue legend exists and terminology is explicit.
- But it is static text-only and competes with many other UI blocks.
- No first-run guided step or progressive reveal to teach sequence.

**QA read:** users who read labels will understand; skimmers may not internalize quickly.

### 2.2 Cracked 2-hit blocks: understandable after first encounter, not before
- State model supports first-hit crack then second-hit reveal correctly.
- In-UI teaching relies on post-action clue feedback; there is no pre-action visual legend item specifically for hard blocks.

**QA read:** mechanic is solid but onboarding still implicit.

### 2.3 Ticket spending is mostly obvious at failure moments, less obvious pre-spend
- Tickets are visible in both top HUD and footer.
- Out-of-ticket modal explains one-ticket-per-dig clearly.
- Pre-dig cost is implied (not explicitly attached to dig action area), so first ticket spend can still feel "silent" for some players.

### 2.4 Board completion + reward flow is clear but modal-heavy
- Board complete notice is clear.
- Auto-advance timer plus claim modal gating behavior is deterministic.
- Reward claim flow is explicit and robust, but introduces additional interruption layers (clear panel + reward sheet + possible out-of-tickets sheet).

---

## 3) Technical safety findings

### 3.1 State authority is reasonably clean for this surface
- Minigame UI consumes launchConfig callbacks and local transient UI state.
- Gameplay writes are delegated through provided request handlers, not direct persistence calls inside this component.
- This aligns with current Island Run architecture guardrails.

### 3.2 Known transient/timer fragility points (moderate risk, not critical)
- Ticket polling interval runs every 350ms while mounted.
- Bomb FX timeout + auto-advance timeout + polling coexist; cleanup exists, but this remains a multi-timer surface.
- `advancingBoardKeyRef` guard prevents duplicate advance, which helps race safety.

### 3.3 Ticket polling risk profile
- Polling is simple and likely acceptable at current scale.
- Main risk is needless wakeups and jitter if container lifecycle churns; no immediate logic correctness issue observed.

### 3.4 Canonical compatibility after hard-block fields appears covered
- Tests explicitly cover hard-block first hit/second hit behavior and bomb interaction with hard tiles.
- Remote hydration mapping for Space Excavator progress is also covered.

### 3.5 Testing gaps
- Strong service-level coverage exists for progress logic, rewards, hard blocks, bombs, claims, and hydration.
- Missing/limited coverage area appears to be **component-level mobile/UI regression** (layout crowding, safe-area overlap, readability under narrow/short viewports, modal layering).
- No obvious visual snapshot/e2e assertions tied to this component were found in the reviewed set.

---

## 4) Recommended next PRs (safest order)

### PR 1 — Mobile readability + density pass (no mechanic changes)
- Goal: reduce above-board cognitive load.
- Candidate scope: collapse clue legend behind inline "How clues work" toggle on small screens; tighten copy lengths; promote most important row only.
- Why first: highest UX impact with low gameplay risk.

### PR 2 — Hard-block readability polish (visual semantics only)
- Goal: make hard vs cracked vs normal instantly distinguishable.
- Candidate scope: stronger iconography/texture contrast + optional one-line persistent hint while hard blocks remain.
- Why second: mechanic already works; this is clarity polish with low state risk.

### PR 3 — Ticket spend affordance clarification
- Goal: make spend explicit before first dig.
- Candidate scope: inline "1 ticket per dig" near board/actions + brief first-run helper badge.
- Why third: closes comprehension gap without touching economy logic.

### PR 4 — Timer/polling resiliency cleanup
- Goal: lower transient complexity and reduce potential race/jitter surprises.
- Candidate scope: centralize tick sources or move to event-driven sync where possible; keep current behavior unchanged.
- Why fourth: technical hardening after UX wins.

### PR 5 — Add UI-focused regression coverage
- Goal: prevent future crowding/safe-area regressions from polish PRs.
- Candidate scope: targeted component tests for modal layering + safe-area classes + small viewport render assertions.
- Why fifth: locks in improvements after refinement work.

---

## Overall QA verdict
Space Excavator is now materially more complete and readable than pre-polish, with bomb/hard-block gameplay logic appearing robust at service level. The biggest remaining issue is not core mechanics; it is **mobile information density + first-time teaching clarity**. Next safest work is UI comprehension and viewport-focused regression hardening, not new mechanics.
