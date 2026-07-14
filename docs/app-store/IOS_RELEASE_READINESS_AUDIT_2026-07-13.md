# HabitGame iOS release-readiness audit

Audit date: 13 July 2026
Bundle ID: `com.lifegoalapp.habitgame`
Target: iPhone, portrait, iOS 15 or later

## Outcome

HabitGame is ready for an App Store Connect draft record and continued on-device development. It is not ready to submit to App Review yet. The native shell builds successfully, the app runs on a physical iPhone, and the first-release metadata draft exists. The blockers below should be resolved before uploading the review build.

## Completed in this branch

- Capacitor 8 and the iOS platform are installed and pinned.
- The native app uses bundle ID `com.lifegoalapp.habitgame` and display name `HabitGame`.
- Native plugins are installed for app lifecycle, dialogs, haptics, local notifications, network state, and preferences.
- Completion feedback uses native Capacitor haptics on iOS with a browser fallback.
- Service-worker registration is skipped inside the native app.
- The production web build and unsigned iOS Simulator build pass.
- The app has been installed and opened on a physical iPhone.
- Capacitor's placeholder icon and splash have been replaced with the HabitGame crest and dark launch screen.
- The icon pipeline flattens alpha, which App Store icons do not permit.
- Version 1 is configured as iPhone-only and portrait-only to reduce untested device scope and avoid mandatory iPad listing work.
- Account deletion is initiated in-app from My Account and handled by an authenticated Edge Function.
- A successful deletion now clears the cached local Supabase session immediately.
- The public privacy and support pages now describe native/local storage, queued sync, Supabase, optional AI processing, uploads, telemetry, and in-app deletion more accurately.
- A complete first-pass App Store listing draft is in `IOS_APP_STORE_LISTING_DRAFT.md`.

## Release blockers

### 1. Payments and digital goods — blocking

The web product contains Stripe checkout entry points for subscriptions, dice, eggs, creature packs, themes, and minigame tickets. These are digital goods or app functionality. Apple generally requires Apple In-App Purchase for these items and expects purchase functionality to be reviewable.

For version 1, choose one of these paths:

1. Recommended fast path: compile the iOS release with all purchase calls-to-action and pricing hidden, while preserving entitlements already attached to an account only if policy permits.
2. Full commerce path: implement StoreKit 2 / Apple In-App Purchase, configure products in App Store Connect, validate receipts server-side, add restore purchases, and submit the products with the app.

Do not submit while Stripe purchase buttons remain visible in the iOS build.

### 2. Supabase production validation — blocking

The current database cap prevents reliable end-to-end release testing. After service is restored:

- Test sign-up, sign-in, sign-out, session restoration, password reset, and email confirmation on iPhone.
- Test account deletion with a disposable account and confirm Auth, Postgres rows, Storage objects, local IndexedDB/localStorage records, and queued mutations are removed or made inaccessible as intended.
- Confirm every user-owned production table has a cascade, explicit deletion path, or documented legal retention rule.
- Verify RLS on all user-content, telemetry, billing, and Storage paths.
- Confirm support, privacy, and terms URLs are publicly reachable without signing in.

The migrations heavily use `ON DELETE CASCADE`, but this must be checked against the live schema because migrations and production can drift.

### 3. Native notifications — blocking if claimed

The Capacitor Local Notifications plugin is installed, but the existing reminder system is primarily web-push/server oriented. Before claiming native reminders:

- Define which reminders are local-on-device versus server push.
- Request permission only after a user enables reminders.
- Schedule, update, and cancel native notifications when reminder settings change.
- Handle permission denial and later Settings changes.
- Test foreground, background, terminated, timezone, daylight-saving, and device-restart behavior.
- Deep-link notification taps to the intended screen.

If this is not completed for version 1, hide native reminder claims and any broken controls in the submitted build.

### 4. App privacy and AI — blocking

The release includes account identifiers, user-created habits/goals/journals, optional image uploads, product-interaction telemetry, Supabase processing, and optional OpenAI-backed features. Complete a final feature-by-feature data-flow audit and App Privacy questionnaire using the exact submitted configuration.

Decide which AI features ship in version 1. For each enabled feature, document what user content is sent, why, which provider receives it, retention/control behavior, and whether explicit contextual disclosure is needed before use. Never include user-supplied API keys in logs or listing material.

### 5. Reviewer access and completeness — blocking

- Create a non-expiring review account with representative, non-personal demo data.
- Ensure all backend services are available during review.
- Remove admin/dev/test panels and future-feature surfaces from the review path.
- Supply exact review steps and explain all non-obvious game/progress systems.
- Run at least one internal TestFlight round before submission.

## Important improvements after blockers

- Replace prompt-based destructive confirmation with an accessible in-app modal that follows the repo's modal/scroll-lock guardrail.
- Add automated tests for native-platform checkout gating, session clearing after account deletion, and public legal/support content.
- Add native app lifecycle listeners to flush safe queued work on foreground/reconnection.
- Measure and reduce the main JavaScript bundle, currently reported at roughly 4.2 MB minified.
- Establish a documented retention schedule for telemetry, support cases, payment records, and backups.
- Perform an asset/content-rights audit for artwork, fonts, music, sound effects, demo images, and AI-generated content.
- Confirm the monitored support address, review contact phone, copyright owner, and legal entity name.

## Verification performed

- TypeScript project build: passed.
- Vite production build: passed; existing chunk-size warnings remain.
- Capacitor iOS sync: passed with six native plugins detected.
- iOS icon: 1024 × 1024 PNG with no alpha channel.
- iOS launch asset: 2732 × 2732 PNG with no alpha channel.
- `Info.plist`: valid.
- Unsigned iOS Simulator build using Xcode: passed.
- Physical-device install/open: passed earlier in this branch; rerun after each release-candidate change.

## Recommended order from here

1. Create the App Store Connect record in Prepare for Submission status.
2. Restore Supabase service and complete the production auth/deletion test pass.
3. Hide all external digital checkout in the iOS build or implement StoreKit.
4. Decide whether native reminders ship in 1.0 and implement/test accordingly.
5. Finish App Privacy answers, age rating, URLs, reviewer account, and screenshots.
6. Archive and upload a build, test it through internal TestFlight, then submit only after the checklist is clean.
