# HabitGame — iOS App Store Listing Draft

> Status: working draft for the first iOS release. The app record and metadata may be created now and left in **Prepare for Submission**. Do not add the version to App Review until the release-readiness blockers near the end of this document are resolved and the final build is tested.
>
> Bundle identifier: `com.lifegoalapp.habitgame`
>
> Customer-facing app name: `HabitGame`

## Recommended product positioning

HabitGame is a cozy self-improvement RPG that turns real-life goals, habits, reflection, and wellbeing check-ins into visible game progress. The listing should lead with the self-improvement benefit and use the game world as the differentiator.

The copy below intentionally avoids claiming full offline support, native reminders, AI behavior, subscriptions, or purchases until those capabilities are verified in the App Store build.

## App information

| Field | Recommended draft | Notes |
|---|---|---|
| App name | HabitGame | 9/30 characters. App Store availability will be confirmed when the draft app record is created. |
| Subtitle | The Self-Improvement RPG | 24/30 characters. |
| Primary category | Health & Fitness | The core purpose is healthy routines, reflection, motivation, and personal growth. |
| Secondary category | Games — Role Playing | Reflects the progression world without presenting HabitGame as entertainment only. |
| Content rights | No third-party content requiring distribution rights, subject to a final asset/licensing audit | Confirm before submission. |
| Age rating target | 13+ | The Terms currently require users to be at least 13. Apple says the store rating should be overridden when an EULA requires a higher age. Complete the questionnaire accurately for fantasy content and chance-based rewards. |
| Price | Free | Do not expose Stripe purchases for digital content in the iOS build. |
| Version | 1.0 | Build number starts at 1. |
| Copyright | 2026 Eivind Josefsen | Confirm whether this should instead use a registered business/entity name. |

### Alternative subtitles

- Level Up Your Real Life
- Build Habits. Earn Progress.
- A Cozy Game for Real Growth

## Promotional text

> Turn small real-life actions into progress you can see. Build habits, complete quests, reflect, earn rewards, and keep moving forward—without a perfect streak.

Apple limit: 170 characters. Recheck the final localized value in App Store Connect.

## Full description

HabitGame turns personal growth into a cozy adventure.

Choose what matters to you, build realistic habits, and let small real-life actions move your journey forward. Your goals, routines, reflections, and wellbeing become part of a progression system designed to make growth feel more visible and rewarding.

BUILD MOMENTUM

Create goals, habits, and routines that fit your life. Check off meaningful actions, build consistency, and see your progress develop over time.

TURN PROGRESS INTO PLAY

Earn XP and rewards from real effort. Explore a cozy game world where the actions you take outside the game help your adventure grow.

REFLECT AND ADJUST

Use journals, check-ins, and life-balance tools to notice what is working. HabitGame is designed for restarts as well as streaks, so a missed day never has to become the end of your journey.

GROW YOUR WAY

Move between practical planning, daily action, reflection, and optional game systems. Use the parts that motivate you and keep your personal progress at the center.

HabitGame is a self-improvement tool, not a medical service. It does not provide medical advice, diagnosis, or treatment.

Level up your life—one real action at a time.

## Keywords

Recommended draft, excluding the app name because Apple already indexes it:

`habits,goals,routines,productivity,wellness,journal,streaks,motivation,self improvement,RPG`

Apple limit: 100 bytes. Do not include competitor names or repeat the app/company name.

## URLs

| Field | Draft URL | Readiness note |
|---|---|---|
| Marketing URL | https://lifegoalapp.com/ | Verify the production domain and native-app messaging. |
| Privacy Policy URL | https://lifegoalapp.com/privacy | Required. Update the policy before submission. |
| Support URL | https://lifegoalapp.com/support | Required. Must contain current contact information and native-app help. |
| Terms URL | https://lifegoalapp.com/terms | Not a dedicated App Store field, but link it from the app and website. |
| Support email | hello@lifegoalapp.com | Verify that the mailbox is active and monitored. |

## App Privacy working draft

Do not publish these answers without a release-build data-flow audit. The likely declarations are:

| Apple data type | Likely use | Linked to identity? | Tracking? |
|---|---|---:|---:|
| Contact Info — Email Address | Account creation, authentication, support | Yes | No |
| User Content — Other User Content | Goals, habits, routines, journal entries, reflections, check-ins | Yes | No |
| User Content — Photos or Videos | Vision Board uploads, if included in the release | Yes | No |
| Identifiers — User ID | Account and cross-device synchronization | Yes | No |
| Usage Data — Product Interaction | Only if production telemetry leaves the device | Usually yes | No |
| Diagnostics | Only if production logs/crash data leave the device | Determine by audit | No |

The final answers must include data handled by Supabase, OpenAI or other AI services, payment providers, analytics, and any other third-party SDKs in the release build. Do not select “data not collected” merely because a third party stores the data.

## App Review information draft

### Contact

- First name: Eivind
- Last name: Josefsen
- Email: `[CONFIRM REVIEW CONTACT EMAIL]`
- Phone: `[ADD REVIEW CONTACT PHONE]`

### Sign-in

- Sign-in required: Yes, if the submitted build does not expose a complete guest/demo experience.
- Demo username: `[CREATE NON-EXPIRING REVIEW ACCOUNT]`
- Demo password: `[ADD IN APP STORE CONNECT ONLY — NEVER COMMIT]`

### Review notes

> HabitGame is a self-improvement RPG that connects real-life goals, habits, routines, journals, and wellbeing check-ins to an optional game progression experience.
>
> The app is built with Capacitor and ships its web interface inside the signed iOS bundle. It does not load executable app code from a remote website. Supabase provides account authentication and synchronized user data.
>
> Use the review account supplied above to access the complete experience. Suggested review path: sign in, open Today, complete a sample habit, view the resulting progress feedback, open the Game area, then open Journal or a wellbeing check-in.
>
> No digital purchase flow is available in this build unless Apple In-App Purchase has been implemented and submitted with the app. Notification permission is requested only after a user explicitly enables reminders.

Update these notes to match the exact submitted build. Never claim native reminders, IAP, offline behavior, or AI functionality that is not enabled and tested.

## Screenshot plan

Apple currently accepts one to ten screenshots. Prepare a consistent portrait set for the 6.9-inch iPhone class. Use real screens from the submitted build, with representative demo data and no personal information.

| Order | Screen to capture | Optional overlay headline | What it proves |
|---:|---|---|---|
| 1 | Today / daily focus | Level Up Your Real Life | Immediately explains the benefit. |
| 2 | Habit or routine progress | Small Actions Build Momentum | Shows the practical habit experience. |
| 3 | Island Run / game world | Your Progress Powers the Adventure | Establishes the RPG differentiator. |
| 4 | Journal or reflection | Reflect. Adjust. Keep Going. | Shows the gentle self-improvement loop. |
| 5 | Life Wheel / check-in | See the Bigger Picture | Shows wellbeing awareness and balance. |
| 6 | Rewards, achievements, or companion | Make Growth Feel Rewarding | Adds emotional payoff without implying cash value. |

Screenshot rules for this release:

- Capture the final native build, not the PWA browser chrome.
- Use only features available to every user shown in the listing.
- Do not show development panels, fake notifications, future-feature overlays, test payment screens, or personal journal content.
- Keep overlays accurate, readable, and subordinate to the real interface.
- If the iPad destination remains enabled, prepare and verify the required iPad screenshots too. Otherwise, make an explicit iPhone-only release decision before upload.

## First-release launch copy options

### Short store pitch

> Build real habits, explore a cozy world, and turn small actions into progress you can see.

### Website/App Store announcement

> HabitGame is coming to iPhone. Plan what matters, build momentum, reflect without judgment, and let your real-life progress power a cozy adventure.

## Release-readiness blockers before submission

### Legal, privacy, and account controls

- [x] Update the public privacy/support copy to cover the native app, Supabase, local/native storage, telemetry, optional AI data flows, image uploads, and in-app deletion more accurately. Complete a legal/final-release review before submission.
- [x] Provide an easy-to-find in-app flow that initiates deletion of the account and associated user-owned data. Live-schema testing remains blocked by the current Supabase cap.
- [ ] Confirm Terms, minimum user age, copyright owner, support email, and any required legal address/contact details.
- [ ] Complete a release-build App Privacy data-flow audit.

### Store policy and product scope

- [ ] Hide or disable Stripe/external checkout for digital content in the iOS build, or replace it with Apple In-App Purchase.
- [ ] Decide exactly which AI features are enabled and disclose their data handling and limitations.
- [ ] Complete the age-rating questionnaire accurately, including chance-based rewards, loot boxes if applicable, fantasy themes, and wellbeing content.
- [ ] Decide whether v1 is iPhone-only or fully supports iPad.

### Native quality

- [x] Replace the temporary Capacitor icon and splash screen with HabitGame assets; verify the final brand choice before submission.
- [x] Restrict the first release to iPhone and portrait orientation.
- [ ] Test sign-up, sign-in, sign-out, session restoration, password reset, and account deletion on a physical iPhone.
- [ ] Test haptics, alerts/reminders, permission denial, offline behavior, reconnection, and background/foreground transitions on a physical iPhone.
- [ ] Verify all public URLs and reviewer credentials against the production backend.
- [ ] Run TestFlight internal testing before App Review.

## Metadata limits used for this draft

- App name: 30 characters maximum.
- Subtitle: 30 characters maximum.
- Promotional text: 170 characters maximum.
- Description: 4,000 characters maximum, plain text.
- Keywords: 100 bytes maximum.
- Screenshots: one to ten per device class/localization.

Recheck limits and screenshot dimensions in current App Store Connect Help immediately before upload because Apple can change submission requirements.
