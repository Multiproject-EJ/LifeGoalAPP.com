# HabitGame Public Identity and Age Policy

Status: product decision for implementation  
Last reviewed: 2026-07-30  
Applies to: HabitGame / LifeGoalApp web, PWA, iOS, and Android builds

## Decision

HabitGame has one public-surface safety policy.

- Free, Pro, and Collab use the same public-name rules.
- A purchase or subscription is not age assurance.
- Public leaderboards, winner tables, crew labels, and future community
  surfaces must remain suitable for the app's broadest permitted audience.
- Private journaling and private coaching text are not automatically public.
  If a private label is later shared, it must pass through the public identity
  boundary at share/render time.

The launch product is **not child-directed** and is **not an adult-content
product**. The intended minimum audience is **13+**, subject to the rating
calculated by the live Apple and Google submission questionnaires. If a store
assigns a higher regional rating, the product accepts that rating rather than
weakening the declaration.

Do not infer a user's age from Free, Pro, Collab, payment status, writing style,
or story choices. If a later feature genuinely needs age-aware behavior, add a
separate, explicit age-assurance design and legal review. Do not hide adult
content behind Pro.

## First-run naming

The first-run path uses four deterministic, on-device captain/ship pairs:

1. Show four one-tap pairs.
2. Let the player request another local set.
3. Let the player write a custom pair.
4. Validate custom labels before entering a public game surface.

This path deliberately avoids network or native generative AI. First-run naming
must remain instant, offline-capable, inexpensive, and predictable to moderate.
The app does not need 100,000 stored full names: a reviewed local word bank can
generate many combinations while preserving the same four-choice interaction.

## Canonical code boundary

`src/services/publicIdentity.ts` is the shared boundary.

- Authoring forms use `validatePublicIdentityLabel`.
- Public-table writes use `cleanPublicIdentityLabel`.
- Public-table reads use `cleanPublicIdentityLabel` again because old, imported,
  or externally changed data cannot be trusted.
- Unsafe or empty public labels render a neutral fallback such as `Explorer`.
- Subscription tier must never be passed into these functions.

The current cross-user public table is Adventure League. Its Supabase write and
read mapping both use the shared boundary before `ScoreTab` receives a
`LeaderboardEntry`. Any future winner table must do the same in its service
mapper rather than adding local filtering inside React.

## Story and content

The secret-recruit story can become mysterious, tense, and surprising without
becoming explicit. First-person hands, boots, shadows, creature reveals, and
branching transmissions do not require the app to identify the player's age,
gender, or appearance.

Keep public story text and shared player labels 13+-appropriate. Private
reflection prompts may be emotionally mature, but must remain non-explicit and
must not be treated as proof that the user is an adult.

## Store-rating implementation note

Apple states that age rating is an app-level property applied across platforms,
derived from the App Store Connect questionnaire, with regional results where
required. Google Play separately requires an accurate target-audience
declaration and applies additional Families requirements when children are
included.

Before each production submission:

1. Re-answer the store questionnaires against the features actually shipping.
2. Include chance-based activities, purchases, health/wellness content,
   user-generated labels, and any social capabilities that are present.
3. Do not reuse an old rating after adding chat, unrestricted web content,
   social media, or materially stronger mature themes.
4. Keep the in-app minimum-audience copy consistent with the store declaration
   and privacy policy.

Official references:

- Apple: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- Apple app-level property: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- Google Play target audience and content: https://support.google.com/googleplay/android-developer/answer/9859655

This document records a product implementation decision, not legal advice.
