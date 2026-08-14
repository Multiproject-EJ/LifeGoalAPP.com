# Journey Disc Arena — battle setup redesign Gauntlet

Date: 2026-08-14
Branch: `codex/journey-disc-arena`
Status: Implementation and exact-phone Gauntlet passed locally. Approved for
implementation by Eivind after the revised six-slot setup concept was accepted
as “much better”.

## Mission and user outcome

Replace the confusing four-card prototype preparation flow with a premium,
mobile-first setup screen where collection, selection, active formation and
ticket commitment are visibly separate. The player must know exactly which
discs will enter battle before any ticket is spent.

## Sources of truth

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- Existing Journey Disc deterministic engine, event progression, permanent
  armory and canonical Island Run action services.
- Approved 2026-08-14 visual concept:
  `/Users/ejmac/.codex/generated_images/019ffbf2-4c3b-7c13-84cd-3e55ffaa7a08/exec-f022b995-5a7e-4e15-aef3-68e16e1a7ff2.png`

## Non-negotiables

- A roster card selects a disc; it never silently places or launches it.
- Active team capacity and owned collection are different concepts.
- The active team supports one through six real fighters.
- Every occupied team socket shows the fighter identity and has an explicit
  remove action.
- Tickets remain the canonical active-event wallet, at one ticket per active
  fighter, and are spent only by the canonical start-round action.
- The battle CTA states both active-disc count and ticket cost.
- Rival count may be asymmetric and is previewed before battle.
- No React gameplay write path, runtime mirror or second event economy is added.
- The complete circular board remains visible during battle at 390×844.

## Scope

### Included

1. Six distinct player relic fighters using the existing procedural Journey
   Disc model system.
2. Scrollable collection cards, selected-fighter detail, explicit Add to Team,
   six active-team sockets and explicit removal.
3. Clear rival-squad preview and reduced setup information density.
4. Canonical one-to-six ticket validation and deterministic encounter scaling.
5. Six-fighter preview/battle positions, captain controls and unique missing
   procedural relic stand-ins.
6. Service tests, typecheck, production build, architecture guard and exact
   phone browser playthrough.

### Deferred

- New Supabase schema for individual fighter XP or per-fighter ownership.
- Drag-and-drop reordering; the first implementation uses explicit accessible
  select/add/remove controls.
- New bitmap or GLB production assets. Existing procedural 3D models remain the
  runtime source for this reversible slice.

## Acceptance evidence

- At 390×844, setup has no page overflow and the Start Battle control is fully
  visible above the safe area.
- Selecting a collection card changes selection only.
- Add to Team visibly fills a socket without spending tickets.
- Removing a socket visibly removes that fighter without spending tickets.
- Starting a six-disc battle with six or more tickets succeeds and spends
  exactly six; seven discs are rejected by the canonical action.
- A six-disc battle renders, allows captain selection/Surge and reaches a
  terminal result.
- Existing lower-count battles, score banking, reward claims and permanent
  armory tests continue to pass.

## Verification record

Completed locally on 2026-08-14 against the 390×844 Journey Disc developer
route with an eight-ticket wallet and the Island Guardian III encounter.

- Exact-phone geometry: `390×844`, document width `390`, document height `844`,
  no horizontal or page overflow. The full Start Battle control remained above
  the safe area with both three- and six-disc formations.
- Selection semantics: selecting Quest Journal changed the inspected disc only;
  the active team stayed at `3/6`, the CTA stayed at three discs and the wallet
  stayed at eight tickets.
- Formation semantics: explicit add/remove controls produced a full `6/6`
  lineup. Every occupied socket retained fighter identity and a remove action.
  The CTA stated `START BATTLE · 6 DISCS · 6 TICKETS` before commitment.
- Ticket accounting: the six-disc launch changed the wallet from eight to two
  only when Start Battle was pressed.
- Asymmetric encounter: the live battle HUD rendered six player fighters versus
  two Island Guardian III rivals.
- Combat loop: captain controls rendered for active survivors, captain switching
  worked, Comet Ram fired at full charge and returned to its bounded recharge
  state, damage bars followed fighters, a ringed-out fighter disappeared, and
  the round reached the centered result modal.
- Result/economy: the victory banked `+270 DISC POINTS`, advanced event total
  from `1200` to `1470`, and awarded one crown in the developer fixture.
- Existing effect systems were audited and remain active: central speed field,
  freeze pickup and bounded thaw, echo spawn/expiry, three weapon-specific
  surges, impact flashes, knockout bursts, audio event cues and Island Run
  haptics.
- Deterministic service tests cover speed-field activation, freeze targeting and
  expiry, echo spawn/expiry, all weapon surge effects and recharge, encounters,
  and two-through-six fighter terminal resolution.
- Canonical action tests cover exact six-ticket spend and rejection of a seventh
  fighter without ticket spend.
- Full Island Run service suite: `1787 passed, 0 failed`.
- TypeScript project build: passed.
- Production Vite build: passed.
- Island Run architecture guard: passed with zero violations (only pre-existing
  allowlisted warnings).
- `git diff --check`: passed.

Local QA captures (not production assets):

- `/private/tmp/journey-disc-setup-six.png`
- `/private/tmp/journey-disc-team-six.png`
- `/private/tmp/journey-disc-battle-six-v-two.png`
- `/private/tmp/journey-disc-result.png`

## Rollback and stopping rules

- Keep the work isolated on `codex/journey-disc-arena`.
- Revert the capacity increase if exact-phone rendering, deterministic terminal
  resolution or canonical ticket accounting cannot be made to pass.
- Do not deploy or change Supabase schema as part of this redesign without a
  separate explicit release decision.

## Handoff

Continue from this file, then inspect the Journey Disc controller, minigame,
Three.js scene, canonical start action and Journey Disc service tests. Record
final screenshots and verification results here before release.
