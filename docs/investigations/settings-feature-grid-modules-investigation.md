# Settings feature grid/modules investigation

Date: 2026-05-21

## 1. Current Settings architecture

**PASS — investigation completed.** No app behavior, feature gating, Supabase, auth, storage, payments, RLS, rewards, Island Run, habit logic, or settings functionality was changed.

Settings is not a standalone route. It is the `account` workspace surface:

- Desktop account/settings entry is selected through `activeWorkspaceNav === 'account'` and renders `MyAccountPanel`.
- Mobile menu maps the `account` nav item to the visible label `Settings` with `ariaLabel: 'Settings and profile'`.
- The bottom mobile menu also includes a Settings utility button that calls `handleMobileNavSelect('account')`.
- `MyAccountPanel` owns most Settings UI state, including module popup state, admin detection, billing snapshot loading, support modals, and future-feature preview overlay state.

Primary files inspected:

- `src/App.tsx`
- `src/features/account/MyAccountPanel.tsx`
- `src/components/SettingsFolderPopup.tsx`
- `src/components/SettingsFolderButton.tsx`
- `src/styles/settings-folders.css`
- `src/config/featureAvailability.ts`
- `src/services/featureAccess.ts`
- `src/components/FeatureStatusBadge.tsx`
- `src/components/FeaturePreviewOverlay.tsx`
- `src/hooks/useFutureFeatureCardStates.ts`
- `src/features/account/HolidayPreferencesSection.tsx`
- `src/features/notifications/NotificationSettingsSection.tsx`
- `src/features/notifications/DailyReminderPreferences.tsx`
- `src/features/notifications/PerHabitReminderPrefs.tsx`
- `src/features/account/ExperimentalFeaturesSection.tsx`
- `src/features/account/AiSettingsSection.tsx`
- `src/features/gamification/GamificationSettings.tsx`
- `src/features/account/TelemetrySettingsSection.tsx`
- `src/features/account/YesterdayRecapSettings.tsx`
- `src/features/account/DreamJournalReminderSettings.tsx`
- `src/features/account/TodaysWinsReminderSettings.tsx`
- `src/features/account/FutureFeatureVotingPanel.tsx`
- `src/features/cases/MyCasesPanel.tsx`
- `src/features/admin/AdminInboxPanel.tsx`
- `src/features/account/GameDebugLogSection.tsx`
- `src/features/account/SupabaseConnectionTest.tsx`
- `src/features/notifications/PushNotificationTestPanel.tsx`
- `package.json`

Current component structure:

- `MyAccountPanel` contains a local `SettingsModuleCard` component.
- `SettingsModuleCard` is currently hardcoded inside `MyAccountPanel`, not exported as a reusable shared component.
- `SettingsFolderPopup` is a reusable dialog wrapper for focused settings panels.
- `SettingsFolderButton` exists as a reusable folder-style button, but current Settings hub cards use the local `SettingsModuleCard` instead.
- `FeatureStatusBadge` is shared and renders no badge for `live`, but renders `Future Feature` for `demo`, `Coming Soon` for `comingSoon`, `Locked` for `locked`, and `Hidden` for `hidden`.
- `FeaturePreviewOverlay` is shared for public preview/future-feature feedback.
- `resolveFeatureAccess` checks `featureAvailabilityRegistry` and returns public or admin access.

## 2. Current visible Settings content map

| Current visible area | Current location | Visibility/access | Current status | Notes |
| --- | --- | --- | --- | --- |
| Demo account notice | `MyAccountPanel` top | Demo experience only | Demo notice | Informational, should stay inline. |
| Appearance / `ThemeSelector` | Top account card | All signed-in/demo users | Live | Normal settings control. Good card candidate. |
| Onboarding tools | Summary grid card | When launch handler exists | Live/internal launcher | Launches/restarts onboarding and Day Zero. Keep cautious because it can reset local onboarding progress. |
| Subscription / Plan overview | Summary grid card | All signed-in/demo users | Live/account-critical | Stripe billing state and checkout/portal actions. Should not be treated like a playful feature card. |
| Haptic feedback / vibration intensity | Summary grid card | All users | Live/local preference | Safe modular candidate. |
| Menu Icon / Display Preferences | Summary grid card | All users; checkbox disabled without profile/full name or in demo | Live/profile preference | Safe modular candidate. |
| Birthday gift | Summary grid card | All users; disabled in demo | Live/reward preference | Safe modular candidate, but keep reward eligibility details. |
| Holiday Themes | Settings modules grid | Card visible to all; public preview-only, admin open | Registry `demo`; public label `Future Feature`; admin label `Demo Mode` | Existing module card opens popup only for admin/creator; public users see preview overlay. |
| Notifications | Settings modules grid | Card visible to all; public preview-only, admin open | Registry `demo`; public label `Future Feature`; admin label `Demo Mode` | Existing module card opens live notification settings only for admin/creator; public users see preview overlay. |
| Advanced Tools | Settings modules grid | Admin only | Admin-only/internal | Opens advanced tools popup. |
| Experimental Features | Settings modules grid | Card visible to all; public preview-only, admin open | Registry `demo`; public label `Future Feature`; admin label `Demo Mode` | Existing module card opens local experimental toggles only for admin/creator; public users see preview overlay. |
| AI Settings | Inline account card | All users | Live/privacy-sensitive | Includes AI model and coach data-access toggles. Should become a careful privacy-labeled module, not hidden. |
| Game of Life / Gamification | Inline section | All users | Live; has demo badge when Supabase unavailable | Includes gamification toggle and Island Run progress reset. Reset is dangerous and should stay behind confirmation inside a module. |
| Adaptive telemetry | Inline account card | All users | Live/privacy-sensitive; demo mode stores locally | Privacy-sensitive opt-in. Should not be mixed with playful future cards. |
| Daily catch-up prompt | Inline section | All users | Live/local; demo mode stores locally | Reminder/launcher candidate, likely grouped under reminders. |
| Daily dream journal reminder | Inline account card | All users | Live/local with preview modal | Reminder candidate, includes preview overlay/modal. |
| Daily Today’s Wins reminder | Inline account card | All users | Live/local | Reminder candidate, likely grouped under reminders. |
| Feedback & Support | Inline account card | All users | Live/support-critical | Includes future feature voting and opens feedback/support case modals. |
| My feedback & support requests | Inline account card via `MyCasesPanel` | All users | Live/support-critical | Case timeline with replies. Better as Support module or kept near Support card. |
| Admin inbox tools | Inline account card | Admin only | Admin-only | Opens admin inbox popup. Could merge with Admin Tools module; should stay admin-only. |
| Weekly habit review | Inline account card | All users | Live launcher | Opens planning workspace via callback. Good card candidate if labeled launcher. |
| Advanced Tools popup: Ship data | Popup content | Admin only | Admin-only/internal | Shows member since, last sign-in, account ID. Keep admin-only. |
| Advanced Tools popup: Clear app cache | Popup content | Admin only | Admin-only/dangerous-ish | Clears caches and unregisters service workers. Keep admin-only with clear warning. |
| Advanced Tools popup: Legacy alias sunset readiness | Popup content | Admin only | Admin-only/migration diagnostics | Keep admin-only. |
| Advanced Tools popup: Island Run debug log | Popup content | Admin only | Admin-only/debug | Keep admin-only. |
| Advanced Tools popup: Reminder analytics | Popup content | Admin only | Admin-only/preview analytics | Keep admin-only. |
| Advanced Tools popup: Push notification test panel | Popup content | Admin only | Admin-only/developer tool | Keep admin-only. |
| Advanced Tools popup: Reminder action logs | Popup content | Admin only | Admin-only/debug | Keep admin-only. |
| Advanced Tools popup: Supabase connection test | Popup content | Admin only | Admin-only/developer tool | Keep admin-only. |
| Advanced Tools popup: Daily Treat Calendar launcher | Popup content | Admin only and only if handler exists | Admin preview | Keep admin-only. |
| Admin Inbox popup | Popup content | Admin only | Admin-only/live ops | Keep admin-only. |
| Session / Sign out | Bottom account actions | Authenticated users | Auth-critical | Should not become a decorative card; keep predictable and prominent. |

## 3. Existing feature-card/card-grid pattern findings

The existing Settings hub pattern is already partially implemented:

- `MyAccountPanel` renders a `settings-modules` section with a `settings-modules__grid`.
- Cards use a local `SettingsModuleCard` with:
  - icon
  - title
  - subtitle
  - metadata line
  - optional `featureId`
  - optional `FeatureStatusBadge`
  - button click handler
- The three requested examples are part of this local grid:
  - Holiday Themes
  - Notifications
  - Experimental Features
- `Advanced Tools` is also a module card, but has no `featureId` and therefore no `FeatureStatusBadge`.

Hardcoded vs reusable:

- The visual card pattern is **hardcoded locally** in `MyAccountPanel`.
- The popup wrapper is reusable (`SettingsFolderPopup`).
- The older folder button is reusable (`SettingsFolderButton`) but is not the current premium/grid card used by the three example cards.
- Status badge and preview overlay are reusable.
- Feature availability is reusable, but only three Settings ids exist today:
  - `settings.holidayThemes`
  - `settings.notifications`
  - `settings.experimentalFeatures`

Feature availability behavior:

- Public users get `previewOnly` for the three registered Settings features.
- Admin/creator users get `open`.
- `handleSettingsModuleClick` silently ignores `hidden`, opens the popup for `open`, and opens `FeaturePreviewOverlay` for `previewOnly`.
- `FeaturePreviewOverlay` persists seen/vote engagement via the future-feature feedback system.

Important label issue:

- `FeatureStatusBadge` maps registry status `demo` to the visible label `Future Feature`.
- Registry entries also include `adminLabel: 'Demo Mode'`, but `SettingsModuleCard` currently displays only `FeatureStatusBadge(status)`, so admin-specific labels are not shown on the card.
- The preview overlay uses `publicLabel` as `statusLabelOverride`, so public users see `Future Feature`.

## 4. Recommended modular card taxonomy

Use a single taxonomy for Settings hub modules:

| Taxonomy | Purpose | Examples |
| --- | --- | --- |
| Core account | Identity, auth, billing, session, profile-critical controls | Subscription, sign out, account details |
| Personalization | UI and experience preferences | Appearance, haptics, menu icon, holiday themes |
| Reminders | Notification and in-app reminder preferences | Notifications, daily reminder window, per-habit reminders, catch-up, dream journal, Today’s Wins |
| AI & privacy | AI model, coach data access, telemetry | AI Settings, adaptive telemetry |
| Game & rewards | Game of Life preferences and reward settings | Gamification, birthday gift, weekly habit review |
| Support | Feedback, support requests, case timeline | Feedback & Support, My Cases |
| Admin / developer | Diagnostics, previews, debug tools, admin inbox | Advanced Tools, Admin Inbox |
| Future / experimental | Public preview or admin demo features | Experimental Features, gated Holiday Themes/Notifications if they remain preview-only |

Recommended hub layout:

1. Keep a short Settings header.
2. Keep account-critical actions visually separate from feature modules.
3. Render module cards in grouped grids by taxonomy.
4. Use dense but calm mobile cards: 2-column grid for small cards, 1-column for text-heavy or dangerous modules.
5. Use a consistent status label slot on every card, including explicit `LIVE` for live cards if the design goal is to make live vs future unmistakable.

## 5. Recommended status labels per feature

| Feature/module | Recommended label | Source of truth recommendation |
| --- | --- | --- |
| Appearance | LIVE | New local module metadata or registry if added. |
| Onboarding tools | LIVE / ACCOUNT TOOL | Local metadata; do not use future-feature registry unless gating is needed. |
| Subscription / Plan overview | LIVE / BILLING | Local metadata; keep outside playful module grid or use a high-priority account card. |
| Haptic feedback | LIVE | Local metadata. |
| Menu icon display | LIVE | Local metadata. |
| Birthday gift | LIVE | Local metadata. |
| Holiday Themes | PUBLIC: FUTURE FEATURE; ADMIN: DEMO MODE | Existing `FeatureAvailability` should control this. |
| Notifications | PUBLIC: FUTURE FEATURE; ADMIN: DEMO MODE, unless product decides notifications are now public-live | Existing `FeatureAvailability` should control this until access policy changes. |
| Advanced Tools | ADMIN ONLY | Local admin module metadata. |
| Experimental Features | PUBLIC: FUTURE FEATURE; ADMIN: DEMO MODE / ADMIN PREVIEW | Existing `FeatureAvailability` should control this. |
| AI Settings | LIVE / PRIVACY | Local metadata, possibly new registry id only if future gating is needed. |
| Game of Life | LIVE; DEMO MODE when Supabase unavailable | Local state from `canUseSupabaseData()`. Do not route through feature availability unless gating is introduced. |
| Adaptive telemetry | LIVE / PRIVACY; DEMO MODE when demo experience | Local metadata/state. |
| Daily catch-up prompt | LIVE / LOCAL | Local metadata. |
| Dream Journal reminder | LIVE / LOCAL PREVIEW | Local metadata. |
| Today’s Wins reminder | LIVE / LOCAL | Local metadata. |
| Feedback & Support | LIVE | Local metadata. |
| My Cases | LIVE | Local metadata. |
| Admin inbox | ADMIN ONLY | Local admin state. |
| Weekly habit review | LIVE / LAUNCHER | Local metadata. |
| Ship data | ADMIN ONLY | Local admin state. |
| Clear app cache | ADMIN TOOL / DANGER | Local admin state with warning. |
| Legacy alias scan | ADMIN TOOL | Local admin state. |
| Island Run debug log | ADMIN TOOL | Local admin state. |
| Reminder analytics/action logs/test panel | ADMIN PREVIEW / ADMIN TOOL | Local admin state. |
| Supabase connection test | ADMIN TOOL | Local admin state. |
| Daily Treat Calendar launcher | ADMIN PREVIEW | Local admin state and handler presence. |
| Sign out | AUTH ACTION | Keep as action, not a feature card. |

## 6. Recommended click/open behavior per module

| Module | Recommended open behavior | Rationale |
| --- | --- | --- |
| Appearance | Nested settings panel or compact popup | Small, safe settings content; can remain inline initially. |
| Onboarding tools | Nested settings panel | Contains multiple launch/restart actions; avoid accidental reset-like taps. |
| Subscription / Plan overview | Existing inline card or dedicated billing panel | Billing is account-critical and should stay highly predictable. |
| Haptic feedback | Bottom sheet on mobile, modal/nested panel on desktop | Small controls fit mobile-first sheet. |
| Menu icon display | Bottom sheet or nested panel | Small profile preference. |
| Birthday gift | Bottom sheet or nested panel | Small reward preference with eligibility metadata. |
| Holiday Themes | Existing popup for admin/open; preview overlay for public preview-only | Preserve current FeatureAvailability behavior. |
| Notifications | Existing popup for admin/open; preview overlay for public preview-only | Preserve current FeatureAvailability behavior. If later public-live, open nested Reminders panel. |
| Advanced Tools | Existing popup | Admin diagnostics are long-form and internal. |
| Experimental Features | Existing popup for admin/open; preview overlay for public preview-only | Preserve current FeatureAvailability behavior. |
| AI Settings | Nested settings panel | Privacy/data-access toggles need context and space. |
| Game of Life | Nested settings panel with danger zone | Contains Island Run reset; avoid direct card action beyond opening panel. |
| Adaptive telemetry | Nested privacy panel | Privacy consent and export controls need context. |
| Daily catch-up prompt | Group under Reminders panel | Related to reminder settings; avoid separate clutter. |
| Dream Journal reminder | Group under Reminders panel; keep its preview modal inside | Already has a preview modal. |
| Today’s Wins reminder | Group under Reminders panel | Related to reminders. |
| Feedback & Support | Existing modal actions from a Support module | Feedback/support submission are modal flows already. |
| My Cases | Nested support panel or existing route/view inside Support module | Timeline can be long and should not be compressed into a tiny card. |
| Admin inbox | Existing popup or nested admin panel | Admin-only workflow; existing popup is acceptable. |
| Weekly habit review | Existing callback/route switch to planning | It is a launcher, not a settings editor. |
| Sign out | Keep bottom action | Auth-critical. |

## 7. Reusable component proposal

Create a reusable `SettingsFeatureCard` / `SettingsModuleButton` pattern rather than expanding the local `SettingsModuleCard`.

Recommended component responsibilities:

- Accept display metadata:
  - `icon`
  - `title`
  - `description`
  - `meta`
  - `statusLabel`
  - `statusTone`
  - `disabledReason`
  - `adminOnly`
  - `danger`
  - `privacy`
- Accept optional feature availability metadata:
  - `featureId?: FeatureAvailabilityId`
  - `actorContext?: { isAdminOrCreator?: boolean }`
  - `onOpen`
  - `onPreview`
- Resolve label safely:
  - `live` should be able to show `LIVE` if the module taxonomy wants explicit live badges.
  - `demo` should use `publicLabel` for public users and `adminLabel` for admin users.
  - `previewOnly` should never open real content for public users.
  - `hidden` should not reveal internal details.
- Render as a semantic `button` for interactive modules.
- Support a non-clickable/disabled card state if a module is visible but unavailable.
- Keep the existing `FeaturePreviewOverlay` for future/demos instead of inventing new preview behavior.
- Keep `SettingsFolderPopup` as the first implementation target for opened modules, then optionally add a mobile bottom-sheet variant later.

Suggested data shape:

- Define module metadata in a local `settingsModules.ts` or near `MyAccountPanel` during the first slice.
- Start with existing module cards only, then migrate current inline sections into modules one small group at a time.
- Do not add registry ids for every live setting unless those settings need centralized availability/gating. The registry is best for product availability, future labels, voting, and preview gating, not every local preference.

## 8. Risks and edge cases

- **Public gating regression:** Holiday Themes, Notifications, and Experimental Features are visible to public users but not open to public users. Public clicks must keep opening `FeaturePreviewOverlay`, not real settings.
- **Admin label mismatch:** Existing cards show `Future Feature` for admin users because `FeatureStatusBadge` ignores `adminLabel`. A reusable card should support actor-specific labels.
- **Live notifications vs registry status:** Notifications has substantial live settings code, but the registry marks it `demo` and public `previewOnly`. Do not change access semantics without a separate product decision.
- **Account-critical actions:** Billing, sign out, auth/session, privacy/telemetry, and support should not be hidden behind playful cards without clear labels.
- **Dangerous actions:** Island Run reset and cache clearing must stay protected by confirmation/warning and should never be exposed as single-tap card actions.
- **Demo persistence:** Some settings write to local browser storage in demo mode; others are disabled in demo. Cards need metadata that does not imply cloud persistence when unavailable.
- **Admin-only leakage:** Admin modules should remain gated by `isAdminUser`; hidden/admin tools should not reveal internal implementation details to public users.
- **Long content in modals:** Notification settings, telemetry reports, support timelines, and admin tools can be long. Mobile bottom sheets need scroll, focus management, and escape/back behavior.
- **Accessibility:** Card buttons need specific accessible names and status labels should not be the only availability signal.
- **Visual clutter:** Moving every section to a card could create a different kind of clutter. Group cards by taxonomy and keep account-critical areas separate.

## 9. Suggested implementation PR plan

### PR 1 — Extract the existing Settings card safely

- Extract the local `SettingsModuleCard` into a reusable component.
- Preserve the exact current cards and click behavior.
- Add actor-aware status label support without changing access.
- Keep Holiday Themes, Notifications, Experimental Features, and Advanced Tools visually unchanged unless needed for the extraction.

### PR 2 — Introduce Settings module metadata

- Create a small settings module metadata list for the current grid.
- Keep the current `handleSettingsModuleClick` behavior.
- Add tests or smoke coverage for public preview-only vs admin open behavior if a suitable test pattern exists.

### PR 3 — Group reminder settings

- Add a `Reminders` module card.
- Move Daily catch-up, Dream Journal reminder, Today’s Wins reminder, and any public-open notification/reminder panels allowed by existing gating into a focused popup/nested panel.
- Do not make the existing gated Notifications module public-open unless `FeatureAvailability` changes in a separate PR.

### PR 4 — Group personalization settings

- Add cards/panels for Appearance, Haptics, Menu Icon, Birthday Gift.
- Preserve all existing saving behavior and demo disabled states.

### PR 5 — Group AI/privacy settings

- Add AI & Privacy module card/panel.
- Move AI Settings and Adaptive telemetry into a clearly labeled privacy panel.
- Keep data-access and telemetry copy visible before toggles.

### PR 6 — Group game/rewards settings with danger zone

- Add Game & Rewards module card/panel.
- Move Gamification and Weekly habit review into the panel.
- Keep Island Run reset inside a clearly labeled danger zone with existing confirmation.

### PR 7 — Support/admin cleanup

- Add Support module panel for Feedback & Support and My Cases.
- Consolidate Admin Inbox and Advanced Tools into a clear admin-only group if desired.
- Keep admin-only gating unchanged.

## 10. Validation commands to run before implementation

Before implementation:

```bash
npm ci
npm run build
```

For implementation PRs that touch feature availability, future-feature voting, or preview overlays:

```bash
npm run build
```

For implementation PRs that touch Island Run reset wiring or gameplay-adjacent settings:

```bash
npm run check:island-run-architecture-guards
npm run test:island-run
```

For implementation PRs that touch notification/reminder settings, run any existing relevant smoke checks discovered in that PR and always run:

```bash
npm run build
```

No validation command was run for this investigation report because the delivered change is documentation-only.

## Concise PR/comment summary

- **Investigation status:** PASS
- **Files inspected:** `src/App.tsx`, `src/features/account/MyAccountPanel.tsx`, settings popup/card components, settings styles, feature availability/access files, feature preview/status components, notification/reminder settings, holiday settings, experimental settings, AI settings, gamification settings, telemetry settings, support/admin panels, and `package.json`.
- **Key recommendation:** Extract the current hardcoded `SettingsModuleCard` into a reusable actor-aware `SettingsFeatureCard`/`SettingsModuleButton`, keep FeatureAvailability in control of demo/future/preview behavior for registered future features, and migrate inline Settings sections into grouped modules over small PRs.
- **Follow-up implementation safety:** Safe as a follow-up if PRs preserve existing gating, keep account/auth/billing/privacy/danger actions clearly separated, and do not make public preview-only features open real settings without an explicit FeatureAvailability/product change.
