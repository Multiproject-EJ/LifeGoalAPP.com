# Motivation refinement — experimental contract

The end goal is a legible, chosen companionship loop: a player recognizes their motivations in a Kindred, broadens the approaches represented by their team through a Complement, and keeps a Favourite without having to justify that choice with a score. Emotions are the creature's authored expressive language, not a diagnosis or a claim that a personality always feels one way.

## Evidence stays separate

1. Foundation: retain the existing scenario answers and observed trait projection.
2. Refinement: rate 32 archetype motivations. A rating describes a current self-reported pull, not ability, virtue or a permanent identity.
3. Matching: use the complete direct motivation profile when refinement is applied. Never synthesize missing ratings from old answers, average unrelated scales together or award better rewards for particular personalities.

The lab's six preloaded samples are explicitly synthetic. Start with blank ratings to try personal answers. Apply updates the experimental profile only. Closing discards edits; reload clears fixture state. Live persistence is not implemented here.

## Exact prototype math

For each archetype i, rating r_i in {1,2,3,4,5} yields points w_i = r_i − 1. All 32 responses must be present and not identical. Normalize p_i = w_i / sum(w). There is no hidden temperature or strength bonus.

Each of the six authored creature targets uses three defining motivations rated 5,4,3; the other 29 are explicitly authored at 1. This is a deliberately sparse authoring fixture, not a measured creature profile or a final catalogue design.

- Kindred affinity = 100 × (1 − 0.5 × sum_i |p_i − c_i|).
- Current represented breadth = 25 × sum_i max(player_i, selected creature profiles_i).
- Complement contribution = breadth after adding the candidate − current breadth.
- Favourite is manual. No auto-equip, personality penalty, match-paid currency or rarity multiplier.

Every representation has an equal budget. Breadth begins at 25 for the player alone; 100 is the disjoint theoretical ceiling for player plus three creatures, not a personal-completeness target. Related creatures can add less breadth, which is fine. Close scores within two points are alternatives. No-overlap and incomplete evidence produce no Kindred suggestion.

## Known limitations / next gate

- One explicit statement per archetype is not a validated instrument. Positively framed statements, interpretation, response style and overlap need player testing.
- Broad real people should not be pushed into sparse authored stereotypes. The diagnostic produces many low affinities and ties; expand/review target breadth and catalogue coverage before release.
- Fifteen archetypes have no representation in the six-target pilot. Surface this gap rather than calling a player a bad fit.
- Showing an authored target self-match proves mapping consistency only. Independent mixed-profile examples and player comprehension are required next.
- Do not replace or migrate the live test, integrate saves, change rewards or mass-approve art on the strength of this prototype.

Implementation: `src/features/creature-system/refinement.ts`, `RefinementQuestionnaire.tsx`, `personality.ts`, `targets.ts`, `matching.ts`. Evidence: `docs/qa/creature-system/motivation-diagnostic-v1.json` and `browser-report.json`.

## Roster draft continuation

The six-target experiment above remains available as a diagnostic control. The preview now compares refinement answers against 50 draft targets using the same 5/4/3 authoring rule. Their 44 new ordered mixes and rationale bridges live in `rosterBriefs.ts`, separate from the audited snapshot. All 32 archetypes are represented, although Commander has no dominant family yet. No missing player responses are filled from these fixtures.

This addresses missing links, not the sparse-target limitation. The same-input comparison and complete family ledger are `docs/qa/creature-system/roster-diagnostic-v1.md`. Four mixed examples are available for review in the profile selector. Close alternatives are expandable; identity overlap between Hearth Hare and Sunring Staglet is explicitly flagged. Live saves, form paths and rewards are unchanged.
