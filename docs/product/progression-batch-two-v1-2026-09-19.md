# Progression batch two v1 — Cinder, Celest and Lux

Date: 2026-09-19. Status: **review candidates, not approved production art or finished 3D models**.

## What this slice delivers

This batch completes reviewable progression lines for the next three preferred families while preserving the existing catalogue counts:

| Family | Existing forms | Transformation mechanism | Dominant emotional progression |
|---|---:|---|---|
| F25 Cinder | 2 | sealed ember-seed → opened load-bearing shelter arch | guarded alarm → protective resolve |
| F35 Celest | 2 | hooded core with tethered shard → upright broken frame around an off-centre core | forbidden curiosity → knowing disruption |
| F36 Lux | 3 | compact observing keel → articulated controlled body → monumental three-arch organism | quiet calculation → stable command → designed balance |

Eight new images fill the four missing form slots: cinematic card art and rounded-clay reference for Cinder 1, Celest 1, Lux 1 and Lux 3. The already selected Cinder 2, Celest 2 and Lux 2 cinematic/clay pairs are retained, giving fourteen references across seven form slots. No form was added or removed.

The Art production gallery now compares five complete review lines—Echo, Bloom, Cinder, Celest and Lux—across twelve catalogue form slots. It defaults to cinematic card art and can switch every slot to its clay interpretation. Greyscale and hidden-hint checks expose silhouette and emotional dependence on labels.

## Identity and progression review

- **Cinder:** the new first form is a sealed charcoal wedge wrapped by a diagonal brick-red mantle, with a vulnerable apricot side chamber. Its mature three-contact arch changes body organisation and negative space rather than merely growing larger. Risk: rectangular attention notches can feel mechanical; protection must retain tenderness rather than defaulting to anger.
- **Celest:** the first form is a low plum core under one oversized drooping shard with a smaller tethered side shard. The mature broken crescent is structurally distinct. Risk: the lower triangular notch may be mistaken for a mouth, so knowing mischief still needs a label-free face/attention test.
- **Lux:** the little form is a continuous runner with two folded dorsal planes; the middle form lengthens and orders the keel; the final form becomes an immense three-arch living structure with six ascending planes. Risk: forms 1 and 2 are comparatively close, while form 3 may read as bridge, vehicle or statue rather than living composure.

These mechanisms are family-specific. They are not templates to reuse. Cinder does not borrow Twilight's canopy or Bloom's embracing folds; Celest does not use paired animal eyes; Lux does not use legs, fins or a familiar animal head. No Pokémon or other named franchise design was used as a visual reference. This is an originality direction and bounded review, not legal clearance or proof that no similar design exists anywhere.

## Style contract

- Card image: realistic, cinematic and dramatic, with the creature treated as a plausible living material.
- Figure interpretation: small, rounded clay maquette with simplified surfaces and the same identifying pose/anatomy.
- The clay images are reference renders only. They are **not** interactive meshes and the gallery deliberately does not present a 3D model control.
- Form 1 may carry softer attention cues. Forms 2 and 3 must express emotion through family-specific structure, posture, tension, apertures, frames or planes rather than generic baby-animal eyes.
- A transition must change at least two structural dimensions and remain legible in a same-scale greyscale silhouette.

## Coverage after this slice

- 22 / 130 planned form slots have review candidates.
- 13 / 50 families have a mature-form candidate.
- 6 families have a first-form candidate.
- 0 forms are approved for production.

These numbers measure candidate coverage, not completion. Matching can use the authored personality targets now, but release-quality creature matching still depends on broader visual coverage, expression QA and calibration.

## Provenance

Exact prompts, selected generated source paths, project asset paths and rejected attempts are recorded in `progression-batch-two-v1-prompts.json`. The rejected Cinder attempt repeated too much of the mature shelter arch. The rejected Celest attempt repeated the mature crescent too early. Neither was registered as a candidate.

## Verification

Passed after implementation:

- targeted TypeScript compile;
- 34 / 34 creature-system behavioural tests;
- isolated creature-system production build and explicit packaging of 128 referenced assets;
- dedicated five-family evolution gallery checks at 1440, 700, 390 and 320px: twelve correct form slots, both visual editions, paired-image dialogs, 5:7 cards, focus return, scroll lock, greyscale, hidden hints and no overflow;
- full existing creature-system browser regression at the same widths, with no browser errors or failed requests;
- manual inspection of the desktop and phone gallery captures in `docs/qa/creature-system/progression-five-v1/`.

Manual inspection confirms that all five families remain distinguishable in the gallery and that the narrow layout does not clip cards. It does not close the art gates above: Celest still needs a label-free attention test, Lux 1→2 needs stronger separation, and Lux 3 needs a living-versus-architecture check.

No deployment, production save migration, economy change, unlock-rule change or live account write is part of this slice.
