# Island Signature Mission Expansion Gauntlet — 2026-08-27

## Mission and outcome

Turn the five currently planned Island Run signature missions into durable, playable, visually legible 3D experiences:

- Island 004 — Broken Causeway
- Island 006 — Moon Mirrors
- Island 007 — Breathline
- Island 008 — Great Pollination
- Island 009 — Ignition Chain

The outcome is a shared canonical mission system with collision-safe route pickups, additive underlying tile rewards, honest mission-phone progress, and bespoke world transformations culminating in a satisfying finale on every island.

## Context

Island 014 proved the Great Honeyfall loop: route pickups feed a persistent staged build, the world changes immediately, and the final spend produces a large spectacle. Islands 004 and 006–009 already contain much of their authored scenery, but their mission briefings are still marked `planned_signature` and have no canonical playable progression.

The current board also permits authored signature pickups to overlap fixed functional tiles. Island 013 demonstrates the problem: one dynamite cache resolves to the Traffic Light tile. Successful signature pickups can also pre-empt the underlying normal tile reward in the UI orchestration path.

## Non-negotiables

- Gameplay state is read through canonical Island Run state and mutated only through canonical action services.
- Presentation factories never write gameplay state.
- Signature pickups are claim-once, persisted, merge-safe, and additive to the tile's ordinary reward.
- Reserved tile classes cannot silently overwrite each other.
- Placement derives from the active board topology rather than assuming 36 forever.
- Mission progression remains optional to ordinary island completion unless a future product decision explicitly changes that rule.
- Existing players receive a compatible incomplete mission on revisit; no retroactive auto-completion.
- Every mission remains understandable in reduced-motion mode.
- Building beats use pop, flash, sparkles, and construction helpers where they materially improve readability; final beats spend the largest visual budget.
- No new wallet reward is granted merely for mission completion in this slice. The mission's pickups and their underlying tile rewards are the economy payoff.

## Scope

### Included

- A deterministic tile-reservation and nearest-free-slot resolver with explicit priority.
- Published-map validation and removal of Island 013's dynamite/Traffic Light overlap.
- One shared persisted staged-restoration mission record with five authored descriptors.
- Route collection, pity/progress safeguards, activation actions, sanitizer and merge semantics.
- Mission phone, briefing, board pickup identity, and generic playable mission controller integration.
- Bespoke presentation progress and finales in the Island 004, 006, 007, 008, and 009 3D worlds.
- Focused service/UI contracts, full Island Run tests, production build, and browser evidence.
- Canonical documentation updates for the resulting rules.

### Excluded

- Changing the island-completion contract or making these missions Boss prerequisites.
- New App Store or external deployment work.
- Rebuilding the underlying island art from scratch.
- Migrating unrelated legacy UI orchestration in the same change.
- A separate mission-completion currency payout.

## Assumptions and authority

- The user's approval authorizes implementation and local verification.
- It does not by itself authorize a new publication to `main`; publication remains a separate explicit gate.
- Existing canonical Island Run contracts and `AGENTS.md` control architecture decisions.
- The visual production contract controls world-factory responsibilities and evidence quality.

## Mission specifications

| Island | Route objects | Player spend | Persistent world transformation | Finale |
|---|---:|---:|---|---|
| 004 Broken Causeway | 6 masonry sparks | 2 per span, 3 spans | Three bridge sections pop into place with construction flashes | Causeway lights race end-to-end and the crown beacon ignites |
| 006 Moon Mirrors | 5 moon lenses | 1 per mirror, 5 mirrors | Mirrors rise and align, adding successive light links | A complete moonbeam circuit floods the observatory |
| 007 Breathline | 4 pressure pearls | 1 per district, 4 districts | Air pipes pressurize and bubble lanes awaken | A giant clean-air pulse travels through the city |
| 008 Great Pollination | 5 pollen lights | 1 per garden family, 5 families | Five color families bloom with pollinator swarms | The central crown flower opens in a pollen aurora |
| 009 Ignition Chain | 8 ignition cores | 1 per mechanism, 8 mechanisms | Each mechanism joins a visible energy chain | The whole kinetic city fires in one synchronized cascade |

## Phases and gates

1. **Contract gate** — document invariants, mission descriptors, compatibility, and publication boundary.
2. **Topology gate** — deterministic collision-free placement with tests across published islands and multiple route lengths.
3. **State gate** — persisted collect/spend/complete loop, sanitization, merge behavior, and pity with service tests.
4. **Interaction gate** — phone and controller are playable; pickups remain additive to normal rewards; modal viewport rules hold.
5. **Visual gate** — each island shows every stage in the world, including reduced motion and an unmistakable finale.
6. **Verification gate** — focused tests, full Island Run suite, architecture guard, production build, and browser play-through/evidence.
7. **Publication gate** — local commit first; push to `main` only after explicit user approval.

## Evidence required

- Unit coverage for placement priority, collision resolution, persistence, idempotency, merge, pity, and completion.
- Contract coverage for mission-phone truthfulness and presentation-only world updates.
- A stage-zero, mid-progress, and completed capture for each island; at least one orbit/alternate view where geometry can hide.
- A successful production build and full Island Run service suite.
- `git diff --check` and an explicit list of intentionally changed files.

## Budgets

- Reuse the existing Three.js procedural factories and shared materials.
- Keep mission route objects within 4–8 per island.
- Avoid new large bitmap or binary assets unless visual QA proves code-native geometry insufficient.
- Prefer one shared mission engine and one reusable controller over five divergent gameplay implementations.
- Cap world-stage meshes and particles according to existing low/high quality and reduced-motion switches.

## Rollback and recovery

- Mission state is isolated by island key and mission id; removing a presentation leaves canonical board play intact.
- Tile placement is deterministic and derived at map construction time; rollback restores prior fractions without a data migration.
- Mission activation actions are idempotent and spend only committed charges.
- Each phase lands as a reviewable slice where practical; unrelated user evidence and working-tree files remain untouched.

## Stop conditions

Stop and report rather than publish if any of the following remains true:

- a reserved tile collision exists on a published island;
- a mission pickup loses its underlying tile reward;
- mission progress can double-claim, overspend, or regress during merge;
- the phone reports progress that the world does not visibly reflect;
- a required test/build/architecture gate fails;
- publication would require authority not yet given.

## Handoff definition

The slice is ready for publication approval when all five missions can be started, progressed, completed, revisited, and visually understood in the local browser; canonical tests and build pass; evidence is stored in the project; and the verified changes are committed locally with the publication boundary clearly reported.
