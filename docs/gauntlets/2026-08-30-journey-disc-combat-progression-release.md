# Journey Disc combat and progression release — 2026-08-30

Status: approved for main, production PWA, and the locally buildable Capacitor iOS target.

## Mission

Release the verified Journey Disc Arena improvements so players can understand the campaign, build a team directly, claim upgrades clearly, and experience more forceful autonomous combat with a rechargeable freeze attack.

## Sources of truth

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- Journey Disc services, controller, component, CSS, and tests in this change

## Release boundary

Authorized: commit, merge to current `main`, production build, Capacitor iOS sync, unsigned simulator build, push `main`, and verify the GitHub Pages deployment.

Excluded: App Store review submission, purchases, Apple account or agreement changes, production database changes, and deletion of unrelated work.

## Acceptance evidence

1. Mobile visual QA at 390 × 844 shows one dominant next-battle flow, optional journey/reward detail, explicit Add/Remove controls, and understandable upgrade copy.
2. Freeze, pursuit, collision chip damage, and deterministic drive-off behavior pass service tests.
3. The complete Island Run suite passes with zero failures.
4. The Island Run architecture guard reports zero violations.
5. `npm run build`, Capacitor iOS sync, and an unsigned iOS Simulator build pass from the exact release commit.
6. `main` is pushed and the production Pages workflow completes successfully.

## Rollback and stopping rules

- Preserve the pre-release `main` commit as the immediate rollback point.
- Do not overwrite or include unrelated dirty work from the primary checkout.
- Stop before App Store/TestFlight submission if Apple enrollment, policy, signing, privacy, or physical-device gates remain unresolved.
