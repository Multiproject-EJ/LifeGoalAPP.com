# Twilight — real transformation, not three similar seeds

User correction: the previous progression was too boring. The requested arc is **little → middle → powerful actualised creature**. This supersedes the batch-v1 Twilight evolution direction, not the other ten family studies.

## New visual arc

| Stage | Anatomy / silhouette | Emotional development |
|---|---|---|
| 1 · Little / potential | Retained compact enclosed seed; tucked supports; single curled shoot | Open wonder; baby eyes are appropriate here |
| 2 · Middle / emergence | New lifted mobile body, four root limbs, folded shoulder-mantle buds, active lifted forelimb | Daring curiosity, learning to act on interest |
| 3 · Powerful / actualisation | New substantial weight-bearing body, wide stance, large fully opened leaf canopy, smaller head-to-body ratio | Assured wonder and commanding presence, not generic aggression |

Violet botanical anatomy, cyan gaze and the spiral crest preserve the family identity. Rendering remains cinematic and materially believable on the card, rounded clay for the figure study. Stage labels are art-direction labels only; existing form data and progression rules are unchanged.

## Files and provenance

Built-in image generation via the imagegen skill; four individual generated assets, no mesh generation. First form retained unchanged in both treatments. Exact prompts and original generator paths: [twilight-evolution-v2-prompts.json](twilight-evolution-v2-prompts.json).

Workspace asset directory: `/Users/ejmac/Documents/Codex/2026-09-13/i-x20/work/habitgame-system-upgrade/public/assets/creatures/twilight-evolution-v2/`.

- `f13-level-2-card.png`
- `f13-level-2-clay.png`
- `f13-level-3-card.png`
- `f13-level-3-clay.png`

Retained stage 1: `public/assets/creatures/batch-ten-v1/f13-level-1-card.png` and `f13-level-1-clay.png`. Prior stages 2/3 remain on disk; current candidates resolve to v2. Ten other families, live ownership, matching and rewards are unchanged.

## Visual review — candidates, not approvals

The strongest improvement is readable anatomical transformation: compact seed, folded mobile form, open commanding form. The new mature body carries weight; the canopy is an anatomical development rather than decorative glow. Cinematic and clay poses broadly correspond, but exact registration needs real modelling later.

Remaining issues: form 2 eyes are still rounder/younger than the brief intended; tighten the focused-curiosity expression before approval. The final canopy is wing-like and its four-limbed stance has a general fantasy-beast association. Do not claim exhaustive Pokémon differentiation or originality clearance. Avoid spreading this anatomy across other families. Final cinematic canopy framing is tight at the upper edge. Clay form 2 has a different background treatment from form 3; standardise when exporting approved assets.

The new all-family gate is silhouette separation at equal display height, plus family-specific emotional maturity. A bigger crop, lighting or more ornament alone does not pass. Approval, production models and other family evolutions remain unfinished.

## Verification

- Targeted TypeScript compile and 33 behavioural tests pass.
- Isolated review build passes and packages 110 assets, including all four new files. Existing lazy Three.js chunk warning remains.
- Gallery checks pass at 1440, 700, 390 and 320px: revised stages load in both treatments; stable lineage, 5:7 cards, paired-image dialogs, focus return, scroll lock, greyscale, hidden hints and no horizontal overflow. No browser errors or failed requests.
- Evidence: `docs/qa/creature-system/twilight-evolution-v2/report.json` and sibling screenshots. Desktop cinematic progression screenshot visually inspected. `git diff --check` passes. Full unrelated gameplay regression and actual-model tests were not rerun in this art-only slice.
