# Echo and Bloom — distinct routes to actualisation

Continuation of the user-approved stronger Twilight progression. These are **review candidates**, not approved production artwork or new meshes. Cinematic card images and rounded clay figure-reference images remain separate interpretations.

## Delivered

- Echo Phoenix F40: forms 1, 2 and 3, each in cinematic and clay rendering. Compact curl → braced single resonator → expanded asymmetric resonant body. Intended emotion: determined hope, developing toward exhilaration and command without generic aggression.
- Bloom Mite F06: its existing forms 1 and 2, each in cinematic and clay rendering. Small enclosed bud → broad low sheltering organism. Intended emotion: tender affection and encouraging hope, expressed through inviting antennae and protective reach.
- Ten selected new images. One first mature Bloom attempt was rejected for repeating the previous body and worried expression; its generator reference and prompt are recorded but it is not registered as a candidate.
- Both lines are at the top of Art production, with cinematic/clay switching, greyscale, hidden emotion hints and paired-image dialogs. Cinematic editions are the current review candidates in the dex. Previous art remains on disk and in earlier comparisons.

Bloom currently has only two planned catalogue forms. No third form, unlock, reward or progression migration was invented. If the roster is standardised to three forms later, a separate middle-form design and migration decision are required. Current coverage is 18/130 planned candidate form slots, 13/50 mature families, 3 first forms and 0 approved production forms.

## Files / exact prompts

Built-in `image_gen` used through the imagegen skill. [Exact prompts and source paths](echo-bloom-evolution-v1-prompts.json).

Saved asset directory: `/Users/ejmac/Documents/Codex/2026-09-13/i-x20/work/habitgame-system-upgrade/public/assets/creatures/echo-bloom-evolution-v1/`.

| Family / form | Cinematic | Clay reference |
|---|---|---|
| Echo / 1 | echo-1-card.png | echo-1-clay.png |
| Echo / 2 | echo-2-card.png | echo-2-clay.png |
| Echo / 3 | echo-3-card.png | echo-3-clay.png |
| Bloom / 1 | bloom-1-card.png | bloom-1-clay.png |
| Bloom / 2 | bloom-2-card.png | bloom-2-clay.png |

## Visual review and remaining gates

Echo: stages have different structural silhouettes and retain copper/teal material placement and the single aperture. Eyeless emotional readability remains unproven: the first aperture may read as a mouth, and the later forms can still feel like sculpture. Rejecting generic baby eyes is not enough; determined hope must be legible without the label. The final form remains close to the previous mature anchor, but the new younger stages are structurally distinct.

Bloom: the revised adult has a smaller embedded face, broader body and a substantial protective hollow; its affection reads more clearly than the rejected worried version. Large forward folds could still suggest crab claws; supports and gesture must stay non-animal. The adult face is small at card scale. Young Bloom shares the broad bud category with young Twilight; differentiate antennae, contact anatomy, face and palette in future silhouette review.

All selected generated images were visually inspected. No Pokémon references were used, and no exhaustive similarity clearance is claimed. No automated test proves originality, emotion or artistic approval.

The clay images are references only. Bloom's actual interactive model remains the explicitly labelled older geometry prototype, not a mesh matching these new candidates. Card/model pose registration, animation and production asset approval remain open. Live account state, matching algorithms and rewards are untouched.

## Verification

- Targeted TypeScript compile and 34 behavioural tests pass. Coverage checks verify ten distinct asset paths, existing form IDs and no extra Bloom level or production approval.
- Isolated review build passes; 120 referenced/candidate/egg assets packaged. Existing lazy Three.js chunk-size warning remains.
- Desktop cinematic gallery screenshot visually inspected. Browser evidence is stored under `docs/qa/creature-system/echo-bloom-evolution-v1/`.
- Dedicated gallery and full existing browser regression pass at 1440/700/390/320px, with no browser errors or failed requests. Both rendering editions, five paired dialogs, focus return, scroll lock, 5:7 cards, hidden hints, greyscale and no overflow verified. Existing matching, sorting, egg and ownership/progression safeguards pass. Phone cinematic gallery also visually inspected.
- `git diff --check` passes. No merge, deployment, live-state migration or model rebuild was performed.
