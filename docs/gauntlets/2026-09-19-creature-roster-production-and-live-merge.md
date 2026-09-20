# Creature roster production and live merge

Date: 2026-09-19
Status: active, user-authorised
Branch: `codex/creature-system-upgrade-20260919`

## Mission and observable outcome

Extend the personality-creature system from the current five-family evolution review with the remaining preferred reference families F08, F34 and F41–F44. Each existing catalogue form must have a reviewable cinematic card image and a rounded-clay figure reference. After the batch passes the code, visual, browser and repository gates, preserve it in a normal commit and merge the verified creature-system scope to the local live `main` branch.

## Sources of truth

- `src/features/creature-system/content.snapshot.json` owns family IDs and existing form counts.
- `src/features/creature-system/visualIdentity.ts` owns reserved silhouettes, attention anatomy, materials, palette placement and movement.
- `src/features/creature-system/rosterBriefs.ts` owns draft personality/archetype rationale.
- `docs/product/creature-production-workflow-2026-09-19.md` owns the current art acceptance contract and queue.
- This file owns the batch and merge gates. Repository history and the target main worktree own integration truth.

## Non-negotiables

- Preserve existing family IDs and form counts: F08=2, F34=4, F41=3, F42=4, F43=2, F44=2.
- Do not derive anatomy from the legacy animal noun in a name.
- Do not copy an existing Pokémon or other named character. Do not claim exhaustive legal clearance.
- Card art is cinematic, realistic and dramatic. Clay is a small rounded modelling reference, not a claimed mesh.
- At least 40/50 roster families must be creature-bodied; at most 10/50 may be deliberate abstract organisms. Creature-bodied requires locomotion, attention and expressive posture without copying a real animal.
- Every family has a different transformation mechanism. Forms must change body organisation, stance/contact, proportions or negative space—not only size, glow, ornament or angry eyebrows.
- Form 1 may be softer. Mature forms must use family-specific attention anatomy rather than generic paired baby eyes.
- No gameplay rewards, ownership, unlock levels, economy, production saves or live questionnaire data change in this batch.
- Real procedural/mesh 3D production is excluded. Stop and ask Eivind to switch to Astra before that phase.

## Family mechanisms

| Family | Existing forms | Reserved transformation mechanism |
|---|---:|---|
| F08 Fern | 2 | compact three-foot root-runner → long runner with three deployed sail groups |
| F34 Dreamroot | 4 | covered seed → suspended canopy → split-canopy corridor → vast open root observatory around a directed core |
| F41 Nightbloom | 3 | compact four-foot mantle-crawler → raised split-mantle prow → broad guardian with three shelter fans |
| F42 Prism | 4 | one curved shelter wall → three-wall refuge → walls rotate into an open triangular orbit → wide outward-facing prism sanctuary |
| F43 Aurora | 2 | coiled spring-ribbon companion → tall turning strider with balance ribbons and an immense expression plume |
| F44 Cosmos | 2 | three-pad resonant hopper → broad five-support bounding resonator with five listening reeds |

## Milestones and evidence

1. **Clay identity gate:** generate and inspect every missing form as a plain-background rounded maquette. Reject animal, franchise, repeated-body or inanimate-prop readings.
2. **Cinematic translation gate:** use each admitted clay form as the identity/pose reference for its card image. Preserve topology, attention organs, palette landmarks and pose.
3. **System gate:** register the existing catalogue forms in the review gallery without inventing levels; update candidate coverage and asset packaging.
4. **Visual/browser gate:** inspect same-scale cinematic and clay galleries, greyscale/hidden-label behavior, paired dialogs and 1440/700/390/320px layouts.
5. **Repository gate:** targeted TypeScript, behavioural tests, isolated build, asset package, full creature-system browser regression and `git diff --check` pass.
6. **Live merge gate:** commit only after gates 1–5 pass. Inspect the target main worktree for unrelated changes; integrate without overwriting them; re-run proportionate checks on the merged state.

## Rollback and recovery

- Generated files use a new versioned asset directory. Existing candidates are preserved.
- Rejected images remain provenance records but are not registered in UI data.
- The work is checkpointed on the named branch before integration.
- If the target main worktree is dirty or has diverged incompatibly, do not force/reset/overwrite; report the exact conflict and keep the verified branch ready.
- No deployment beyond the local main merge is implied unless an existing repository workflow proves that local main is the live authority.

## Stop conditions

- Stop before any real 3D figure/mesh production and request Astra.
- Stop before destructive conflict resolution, overwriting unrelated main-worktree changes, or remote deployment not already covered by the user's explicit merge authority.
- Do not mark art approved merely because generation, code or browser checks pass.
