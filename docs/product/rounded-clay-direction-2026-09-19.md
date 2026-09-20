# Rounded clay direction — 2026-09-19

**Superseded interpretation:** the user clarified that clay is the physical/3D interpretation, while card artwork should be more realistic, cinematic and dramatic. Do not apply this historical document's blanket clay preference to all cards. Current authority and new batch: `creature-batch-ten-v1-2026-09-19.md`.

## Decision and scope

The user prefers the rounded clay treatment to the original illustration treatment and asked to proceed. This is the preferred rendering direction, not blanket approval of every creature, automatic approval of the new Echo alternative, or authorisation to replace all existing assets without review.

The lab now leads Art production with three actual 5:7 CreatureCard components using the existing clay images. The comparison archive defaults to clay. Original images and all active collection candidates remain intact. Form counts, ownership, personality scoring and approved-production registry are unchanged.

## Shared style contract

- Soft matte clay, rounded edges and substantial connected volumes. Tiny readable forms; low detail is intentional, not an invitation to generic bodies.
- Quiet warm-grey studio, soft shadow, consistent three-quarter presentation. Final background/cutout treatment still requires review in the card.
- Reserve each family's distinct proportions, body topology, colour placement and attention anatomy; no ordinary animal with decorative accessories.
- Form 1 may share some baby-eye vocabulary. Form 2+ must express the dominant emotional direction in its own gaze/aperture, posture and asymmetry. Rounded material does not imply infant personality.
- Keep emotions authored: Bloom = tender affection / encouraging hope / concern; Twilight = curious wonder / hope / perplexity; Echo = determined hope / exhilaration / frustration.
- Rarity uses the card frame, lineage uses family code and form path, personality uses emotional direction and art mix. Do not reinterpret clay colour as rarity or matching strength.
- No invented affinity scores in art review. A raster that looks 3D is not a model.
- The future pop-out poster must come from the actual model with the same pose, camera and framing. Do not open the older Bloom model from a newly generated image.

## Current cards and new alternate

The three preserved clay images are at:
`/Users/ejmac/Documents/Codex/2026-09-13/i-x20/work/habitgame-system-upgrade/public/assets/creatures/comparisons/mature-trio-v2/bloom-clay.png`
`/Users/ejmac/Documents/Codex/2026-09-13/i-x20/work/habitgame-system-upgrade/public/assets/creatures/comparisons/mature-trio-v2/twilight-clay.png`
`/Users/ejmac/Documents/Codex/2026-09-13/i-x20/work/habitgame-system-upgrade/public/assets/creatures/comparisons/mature-trio-v2/echo-clay.png`

One new built-in imagegen candidate:
`/Users/ejmac/Documents/Codex/2026-09-13/i-x20/work/habitgame-system-upgrade/public/assets/creatures/style-studies/rounded-clay-v1/echo-grounded-alternative.png`

Source: `/Users/ejmac/.codex/generated_images/01a09804-1202-7ac3-af05-9038935a9915/exec-d328a22e-6a58-41cd-8932-b14a7060388b.png`.

The alternative is compact and grounded, with three substantial lobes and an off-centre amber aperture. It reads more alert/focused to me than the earlier ornament-like design; this is an artistic judgment, not a measured result. Its aperture can read as one large eye, and determination is clearer than hope. Body identity changed materially; it is an optional proposal, never silently selected in place of the version the user liked. No production approval claimed.

## Exact new prompt

Input: existing `echo-clay.png`, viewed before generation, used as material/palette reference rather than an anatomy lock. Built-in image generation through the imagegen skill; no CLI/API fallback.

```text
Use case: stylized-concept.
Asset type: one alternate mature Echo creature design in the user's preferred rounded clay style.
Input image 1: palette and material reference, NOT anatomy to copy literally. Preserve matte coral-copper outer clay, muted teal inner clay, subtle hand-shaped surface, warm grey studio and soft contact shadow.
Primary request: convert the ornamental ribbon organism into a small, unmistakably living invented creature with an expressive central attention organ. No familiar animal anatomy.
Body: compact squat asymmetric three-lobed body, about as wide as tall, thick soft rounded folded membranes, one larger upper lobe leaning decisively forward, two lower fleshy contact lobes braced against the ground. The core is substantial and connected, NOT hollow flowing filigree. Remove long ornamental tail and thin curling spikes. Only three major lobes, with broad rounded edges.
Expression: dominant determined hope, supporting exhilaration and frustration. A single broad OFF-CENTRE teal aperture integrated into the front core, NOT an eye pair, NOT a mouth. Its upper coral rim is compressed like a focused brow while its lower rim opens upwards; a small warm amber interior crescent directs attention forward and slightly upward. The organism feels alert and trying again after difficulty through the forward lean and braced contact pads. The aperture is a grown sensory membrane, not glass, lens or an instrument horn.
Style: tiny rounded matte clay maquette, simple 4/10 prototype detail, not polished jewellery. Broad volumes, no fine veins or texture noise.
Composition: whole creature at front three-quarter view, square canvas, generous 15% quiet margins, plain warm-grey background and floor.
Constraints: no baby eyes, no human face, no ears, nose, beak, feathers, fur, paws, humanoid arms or legs; no text, labels, pedestal, props, metal rivets, glitter, flames or floating ornament. Retain an unusual identity clearly distinct from a seed creature and a petal crawler. This is an alternate design proposal; not a same-pose reconstruction.
```

## Prioritised continuation

1. Review the three clay cards and choose Echo's anatomy; refine warmth/curiosity/hope where the label outruns the visual.
2. Extend to the next small contrasting mature-family batch under the existing identity reservations, avoiding repeated body/eye templates.
3. Complete family form progressions with preserved visual landmarks, not generic size-only evolution.
4. Rebuild accepted identities as real low-complexity models and capture matching card posters.
5. Continue roster completion and matching/player-comprehension review. A style preference does not resolve the unfinished scoring, assets or live migration work.

## Implementation boundaries

Art-production preview only. Added an explicit art-caption prop to the shared card so flat clay images cannot be mislabeled as rough 3D blockouts. Preserved the older model and its poster, matching code, original image references and all live saved state.

## Verification

- 31 behaviour tests and targeted TypeScript compile pass.
- Isolated Vite build passes; 81 referenced assets packaged. Existing lazy Three.js chunk-size warning remains.
- Updated comparison/browser test passes at 1440/390/320px: three 5:7 clay cards, correct raster captions, reversible Echo selection, matching enlarged image, no mismatched model, focus return, preferred clay default, archive comparisons, greyscale/thumbnail/hidden-hint modes and no overflow. No browser errors or failed requests. The test was adjusted to scroll lazy-loaded phone cards into view before waiting for all images.
- Full existing browser regression passes at 1440/700/390/320px, including cards, matching, questionnaire, roster, egg settlement, retained Favourite and modals.
- Evidence: `docs/qa/creature-system/contrast-v2/report.json`, `clay-cards-1440.png`, `clay-cards-390.png`, `clay-cards-320.png` and `docs/qa/creature-system/browser-report.json`.
- No production deployment, account writes or real-model rebuild.
