# Compass Book visual situation questions Gauntlet

Date: 2026-08-21
Status: Active vertical slice
Reference activity: The Ikigai Map, Island 62

## Mission and player outcome

Replace abstract “pick the word that describes you” moments with concrete, recognisable situations wherever seeing and assessing is cognitively easier than generating an example from nothing.

The player should be able to look at a set of scenes, notice which one pulls their attention, understand the distinction without specialist vocabulary, and answer without pretending certainty.

## Sources of truth

- `docs/product/compass-book-question-method-v2.md`
- `docs/gauntlets/2026-08-21-compass-book-cognitive-experience.md`
- EJ-Jarvis Wisdom and Growth principles
- Existing Compass Book IDs, saved answer shapes, and Island Run contracts

## Non-negotiables

1. Images carry situations, not personality verdicts.
2. Every image has a visible scenario caption and an accessible text equivalent.
3. The option remains understandable when images fail, are disabled, or cannot be seen.
4. A scene may help recognition but may not imply that one answer is morally superior.
5. “I don’t know yet” is a valid required-block answer and must not look like failure.
6. No shame, timer, random reward, artificial scarcity, or pressure to choose quickly.
7. Delight comes from exploration, tactile selection, and meaningful reveal—not gambling mechanics.
8. Preserve canonical question IDs and existing canonical option IDs.
9. Production images use a consistent book-diorama language and stay readable at phone size.
10. Decorative imagery is excluded; a visual must materially reduce abstraction or support comparison.

## Representative vertical slice

Island 62 becomes the reference pattern:

- Eight situation cards replace eight abstract word chips.
- Each card shows a concrete everyday scene, a plain-language situation title, and the underlying category as secondary language.
- The scene choice comes before the optional personal-evidence phrase.
- A ninth “Not sure yet” card provides a playful telescope/reshuffle metaphor without requiring a false answer.
- Selection produces a quiet “scene marked” state and an invitation to notice what part of the situation pulled attention.

## Reusable implementation

- Add optional visual-scenario metadata to `CompassBlockOption`.
- Render visual options as accessible image cards when metadata exists; retain the ordinary chip renderer otherwise.
- Support sprite-sheet crops so a coherent set can load as one optimised asset.
- Keep answer persistence unchanged (`choice.optionId`).

## Acceptance evidence

- Generated sprite contains eight distinct, correctly mapped situations with no text or accidental moral hierarchy.
- Cards show player-readable scenario copy even before selection.
- Keyboard/button semantics and `aria-pressed` remain correct.
- “Not sure yet” completes the required question.
- Missing image asset still leaves captions usable.
- Layout is legible in the current narrow in-app preview.
- Compass tests, full TypeScript build, and launch contract pass.
- Browser log contains no new warnings or errors.

## Budgets

- One image request for the coherent Island 62 sprite, followed by at most two targeted visual iterations.
- One production image asset for the vertical slice.
- No new runtime dependency.
- Reuse the browser-native image cache; no canvas or runtime image processing.
- Visual cards must not increase answer count or add persistence fields.

## Rollback and recovery

- Removing option visual metadata restores the existing text-chip UI.
- The generated sprite is additive and versioned.
- Canonical option IDs and saved answers remain readable throughout.

## Scale-up gate

Do not generate imagery for every question automatically. After Island 62 passes, audit the book and classify each prompt as:

- visual recognition helps materially;
- text/behavioural recall is stronger;
- an interactive comparison is better than imagery;
- imagery would be merely decorative.

Only the first class enters the image-production backlog.

## Stop conditions

Stop and revise if scenes repeatedly collapse two categories into one, rely on stereotypes, become unreadable at card size, imply a correct/moral answer, or slow the activity enough that text captions become the real interface.

## Handoff

Leave the working visual-option schema, final sprite and prompt, Island 62 browser evidence, and a prioritised audit of other candidate questions. Founder playthrough decides whether the pattern scales unchanged or needs another interaction model.
