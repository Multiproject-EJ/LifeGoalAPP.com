# Capacitor and Storage Architecture Plan

> **Status: planned — not implemented yet.**
>
> This document describes the intended migration of HabitGame from the current React/Vite PWA into iOS and Android applications using Capacitor, together with the storage architecture required to keep Supabase lean, preserve offline support, and avoid unbounded database growth.

## Purpose

HabitGame currently runs as a PWA backed by Supabase and browser storage. The native app should preserve the same web codebase while adding:

- iOS and Android app shells
- reliable local storage
- offline-first behavior
- local asset packs for pictures, animations, audio, and island content
- controlled synchronization with Supabase
- explicit retention limits for telemetry and logs
- server authority for purchases, entitlements, and valuable game state

The target is one shared application with platform adapters rather than separate web, iOS, and Android products.

---

# Part 1 — Capacitor installation plan

## Current repository assumptions

The current application uses:

- React
- Vite
- TypeScript
- Supabase
- IndexedDB through `idb`
- `dist` as the Vite production output directory

Before installation, confirm:

```bash
npm run build
```

The build must complete successfully and produce `dist/index.html`.

## Native development requirements

### iOS

Required:

- macOS
- current supported Xcode
- Apple Developer account for physical-device signing and App Store release
- CocoaPods or Swift Package Manager support as required by the selected Capacitor version/plugins

An iOS binary cannot be built locally on Windows. Development can continue on Windows, but final iOS build/signing requires a Mac or a cloud macOS build service.

### Android

Required:

- Android Studio
- Android SDK
- Java version supported by the selected Capacitor/Android release
- Google Play Console account for release

Android development can be performed on Windows or macOS.

## Step 1 — Install Capacitor

Use one matching Capacitor major version for Core, CLI, iOS, Android, and official plugins.

```bash
npm install @capacitor/core @capacitor/ios @capacitor/android
npm install --save-dev @capacitor/cli
```

Do not independently mix major versions.

## Step 2 — Initialize Capacitor

```bash
npx cap init
```

Proposed initial values:

```text
App name: HabitGame
App ID: com.habitgame.app
Web directory: dist
```

The final application ID must be confirmed before store submission because changing it later creates migration and signing complications.

Expected configuration shape:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.habitgame.app',
  appName: 'HabitGame',
  webDir: 'dist',
  bundledWebRuntime: false,
};

export default config;
```

Do not configure the native production app to load the public website through a remote `server.url`. Production builds should ship the compiled local web bundle.

## Step 3 — Add platforms

```bash
npx cap add ios
npx cap add android
```

This creates:

```text
ios/
android/
```

These native projects should normally be committed to the repository so native settings, permissions, signing configuration references, plugin setup, and store metadata changes can be reviewed.

Secrets, signing keys, provisioning profiles, keystores, and service credentials must not be committed.

## Step 4 — Add development scripts

Add scripts similar to:

```json
{
  "scripts": {
    "cap:sync": "npm run build && npx cap sync",
    "cap:copy": "npm run build && npx cap copy",
    "cap:ios": "npm run build && npx cap sync ios && npx cap open ios",
    "cap:android": "npm run build && npx cap sync android && npx cap open android",
    "cap:run:ios": "npm run build && npx cap sync ios && npx cap run ios",
    "cap:run:android": "npm run build && npx cap sync android && npx cap run android"
  }
}
```

Use `sync` after adding/updating plugins or native dependencies. `copy` may be used for web-only changes, but `sync` is the safer default during early implementation.

## Step 5 — Standard development workflow

After changing the web application:

```bash
npm run build
npx cap sync
```

Open the native projects:

```bash
npx cap open ios
npx cap open android
```

Or run directly:

```bash
npx cap run ios
npx cap run android
```

## Step 6 — Initial native checks

Before adding advanced plugins, verify:

- app launches without a network connection
- authentication opens and returns correctly
- Supabase requests work in the native WebView
- safe-area insets are correct
- keyboard does not cover inputs
- portrait behavior matches product intent
- back navigation behaves correctly on Android
- external links open safely
- file/image uploads work
- Stripe checkout return/deep links work
- PWA behavior remains unchanged in browsers

## Step 7 — Planned official plugins

Install only when the corresponding adapter is implemented.

### Preferences

Small settings and flags:

```bash
npm install @capacitor/preferences
npx cap sync
```

Examples:

- theme
- sound preference
- onboarding flags
- last selected tab
- last successful sync timestamp
- asset manifest version

Do not use Preferences for large JSON, images, telemetry collections, or game history.

### Filesystem

Large local files and downloaded content:

```bash
npm install @capacitor/filesystem
npx cap sync
```

Examples:

- island asset packs
- animations
- audio
- cached user images
- staged uploads
- exported diagnostics
- temporary files

### App lifecycle

```bash
npm install @capacitor/app
npx cap sync
```

Use lifecycle events to:

- flush important pending writes when the app backgrounds
- checkpoint Island Run state
- pause timers safely
- resume synchronization
- process deep links

### Network

```bash
npm install @capacitor/network
npx cap sync
```

Use network state as a hint for synchronization. Network availability does not guarantee Supabase is reachable, so normal retry/error handling remains required.

### Splash Screen, Status Bar, Haptics, Keyboard, Push Notifications

Add individually only when needed and test on both platforms.

## SQLite decision

Capacitor does not provide an official general-purpose SQLite database plugin. Select a maintained Capacitor-compatible SQLite plugin only after checking:

- compatibility with the chosen Capacitor major version
- iOS and Android maintenance activity
- web fallback behavior
- encryption requirements
- transaction and migration support
- backup behavior
- binary size

Until that decision is made, preserve the current IndexedDB implementation behind a storage interface. Do not couple feature code directly to a specific SQLite package.

## Platform adapter structure

Planned layout:

```text
src/platform/
  platform.ts
  storage/
    preferences.ts
    database.ts
    filesystem.ts
    assetCache.ts
    syncQueue.ts
    web/
      indexedDbDatabase.ts
      browserPreferences.ts
      browserAssetCache.ts
    capacitor/
      nativeDatabase.ts
      capacitorPreferences.ts
      capacitorFilesystem.ts
```

Feature code should depend on interfaces such as:

```ts
export interface LocalDatabase {
  get<T>(store: string, key: string): Promise<T | null>;
  put<T>(store: string, value: T): Promise<void>;
  delete(store: string, key: string): Promise<void>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
}
```

Browser/PWA implementation:

```text
IndexedDB
Cache Storage
localStorage only for tiny legacy preferences
```

Native implementation:

```text
SQLite or equivalent structured store
Capacitor Preferences
Capacitor Filesystem
```

---

# Part 2 — Storage classification

## Core rule

Store data according to authority and durability, not convenience.

| Class | Primary location | Reason |
|---|---|---|
| Durable user/account truth | Supabase Postgres | Must survive reinstall and sync across devices |
| User-owned binary files | Supabase Storage/object storage | Durable cloud copy without bloating Postgres |
| App-owned essential assets | Bundled app | Instant and offline |
| App-owned optional assets | Downloaded phone cache + CDN/object storage | Avoid enormous app bundle |
| High-frequency working state | Phone database | Fast and cheap writes |
| Disposable logs/telemetry | Phone database with retention | Prevent database growth |
| Daily analytics aggregates | Supabase | Compact long-term product metrics |
| Purchases/economy authority | Supabase/server | Prevent tampering and loss |

## Supabase Postgres — authoritative structured data

Keep server-side:

### Identity and access

- profiles
- memberships
- subscription state
- feature entitlements
- device registrations

### User-created life data

- habits
- habit completions
- goals and steps
- routines
- journal entries
- check-ins
- projects
- contracts and pacts
- campaigns
- life-wheel/realm scores
- annual plans and reviews

### Valuable game progress

- authoritative current Island Run checkpoint
- permanent creature ownership
- unlocked islands
- achievements
- account XP
- rare inventory
- event tickets
- server-confirmed rewards
- premium and purchased currency balances

### AI data intentionally retained by the user

- AI coach threads
- saved plans
- saved summaries
- messages that are part of the product history

Do not retain every prompt assembly, retry payload, debug trace, or intermediate model response indefinitely.

### Billing and security

- Stripe customer references
- subscriptions
- webhook idempotency
- purchase fulfillment
- entitlement records
- audit records required for financial correctness

## Supabase Storage or external object storage

Store binary files outside Postgres:

- vision-board images
- profile images
- journal attachments
- audio recordings
- generated personalized artwork
- exported PDFs
- remote island packs
- seasonal packs
- large story images
- video/transparent animations

Postgres should hold only metadata:

```text
id
user_id or asset_id
storage_path
content_type
bytes
width/height or duration
checksum
version
created_at
```

Never store image/video bytes or base64 payloads in ordinary Postgres JSON/text columns.

## Bundled native assets

Bundle assets required before or immediately after first launch:

- app icons
- splash/loading UI
- global navigation icons
- controller graphics
- essential fonts
- onboarding art
- first island
- offline/error screens
- common sound effects
- foundational animations

Bundled assets are available offline and do not consume per-user Supabase storage.

## Downloaded phone asset packs

Download and cache optional content:

- later islands
- unlocked creature artwork
- event animations
- story chapters
- seasonal themes
- large music/audio tracks
- high-resolution backgrounds
- cutscenes

Each pack should use a manifest:

```json
{
  "packId": "island-007",
  "version": 3,
  "minimumAppVersion": "1.2.0",
  "totalBytes": 12500000,
  "files": [
    {
      "path": "background.webp",
      "url": "https://cdn.example/...",
      "bytes": 842231,
      "sha256": "..."
    }
  ]
}
```

Local asset index:

```text
asset_id
pack_id
version
local_path
checksum
bytes
downloaded_at
last_accessed_at
required
```

Cache policy:

- never automatically evict essential bundled content
- retain the active and next island packs
- retain recently used content
- evict least-recently-used optional packs under pressure
- expose “Clear downloaded assets” in Settings
- verify checksums before activating downloaded files

## User-uploaded pictures

User images should use two copies:

```text
Cloud object = durable source of truth
Phone file = cache or pending upload
```

Current Vision Board behavior already optimizes uploads to WebP and uses Supabase Storage. Preserve that model.

For offline uploads, replace long-lived base64-in-IndexedDB staging with:

```text
Filesystem: staged image file
Local database: mutation metadata and file path
```

After successful upload:

- write server metadata
- remove the pending mutation
- retain or discard the local cached file according to cache policy

## Phone structured storage

Store locally:

- offline action queue
- telemetry queue
- temporary diagnostics
- cached habits/goals/journals
- unsynced drafts
- current live Island Run working state
- cached authoritative server snapshot
- asset manifest and pack index
- pending image uploads
- daily telemetry aggregation counters
- synchronization metadata

Every store must define:

- maximum rows or bytes
- retention duration
- sync behavior
- conflict strategy
- deletion behavior
- whether data is safe to lose

## Telemetry policy

Raw telemetry must not grow without limit in Supabase.

### Phone

Keep raw events locally for a short period, initially:

```text
7–14 days
maximum 5,000 raw events per installation
maximum local telemetry bytes to be defined and enforced
```

Aggregate common events locally by day and event type.

Instead of uploading 100 rows:

```text
economy_earn × 100
```

Upload one compact record:

```json
{
  "day": "2026-07-11",
  "eventType": "economy_earn",
  "count": 100,
  "totalAmount": 2840
}
```

### Supabase

Keep:

- daily rollups
- business-critical events
- sampled diagnostic sessions
- critical errors
- data-integrity alarms

Upload immediately when relevant:

- failed payment fulfillment
- corrupted runtime state
- impossible economy transition
- fatal startup error
- authentication/data-loss failure
- detected persistence loop

Raw server telemetry should have an explicit retention job, initially 14–30 days.

## Island Run state

Target flow:

```text
Live state in memory
  -> immediate local checkpoint after meaningful changes
  -> debounced cloud upsert
  -> one authoritative current Supabase row
```

Cloud save triggers:

- several seconds after meaningful state settles
- app backgrounding
- island completion
- significant reward/economy mutation
- explicit game exit
- recovery from offline mode

Do not create a permanent full-snapshot action-log row for every autosave.

Action logs, if retained at all, should contain minimal metadata:

```text
user_id
device_session_id
client_action_id
action_type
status
expected_version
applied_version
created_at
small error metadata
```

They must not duplicate complete request and response snapshots.

## Journals and drafts

Cloud remains authoritative because journals are valuable personal data.

Local behavior:

- save drafts locally frequently
- synchronize after a pause
- keep a small recovery history
- support offline editing
- resolve conflicts explicitly
- never generate an unlimited version row on each keystroke

## Purchases and economy

Never make the phone the sole authority for:

- subscriptions
- purchased dice/tickets/currency
- premium entitlements
- marketplace purchases
- rare rewards that affect account value

The phone may cache/display balances, but server confirmation is required for authoritative mutations.

## Preferences

Capacitor Preferences or browser local storage adapter may hold only small values:

- theme
- sound/haptics preference
- onboarding completion
- last tab
- last sync time
- current manifest version
- debug enabled

Do not store collections or large snapshots there.

---

# Part 3 — Synchronization contract

## Every synchronized record should have

Where appropriate:

```text
id
user_id
updated_at
server_version or revision
origin_device_id
client_action_id
```

## Idempotency

Retries of the same logical action must reuse the same `client_action_id`.

A rerender, reconnect, or retry must not create a new logical action ID and duplicate the mutation.

## Conflict handling

Suggested defaults:

| Data | Strategy |
|---|---|
| Preferences | Latest timestamp wins |
| Habit completion | Idempotent by habit/day/action ID |
| Journal text | Detect conflict; preserve both copies |
| Island runtime state | Versioned compare-and-apply |
| Purchases | Server/webhook authoritative |
| Asset cache | Manifest version authoritative |
| Telemetry | Append locally, aggregate, then discard |

## Offline queue states

```text
pending
processing
failed
confirmed
```

Requirements:

- bounded retries
- exponential backoff
- permanent-failure classification
- user-visible recovery only when action matters
- queue size limit
- stale-item cleanup
- no recursive telemetry about telemetry failures

---

# Part 4 — Retention and size budgets

Every log-like table requires a defined retention policy before launch.

Initial proposal:

| Data | Retention |
|---|---|
| Raw phone telemetry | 7–14 days, bounded by rows and bytes |
| Raw Supabase telemetry | 14–30 days |
| Daily telemetry rollups | Long-term |
| Cron execution history | 7 days unless investigating |
| Runtime action logs | Disabled for normal saves, otherwise 1–7 days |
| Failed reminder delivery logs | 30–90 days |
| AI debug traces | Short temporary retention |
| Billing/webhook idempotency | Long retention according to billing needs |
| Local debug logs | Ring buffer plus manual export |
| Downloaded optional assets | LRU cache, user-clearable |

## Storage observability

Add a development/admin storage report showing:

- Supabase database size
- largest tables
- live row counts
- table/index/TOAST split
- raw telemetry rows per user/day
- Island Run saves per session
- local queue counts
- local asset cache bytes
- pending upload bytes

Add alarms for:

- more than a reasonable number of runtime saves per session
- telemetry volume spikes
- repeated identical events
- queue growth without successful synchronization
- database tables exceeding expected growth budgets

---

# Part 5 — Implementation phases

## Phase 0 — Planning and safeguards

- [ ] Confirm app name and permanent bundle/application IDs
- [ ] Confirm target Capacitor major version
- [ ] Confirm iOS build-machine strategy
- [ ] Confirm Android development environment
- [ ] Add database/log retention policies
- [ ] Fix the Island Run snapshot loop before native rollout
- [ ] Add write-rate tests and storage monitoring

## Phase 1 — Capacitor shell

- [ ] Install Capacitor Core, CLI, iOS, and Android
- [ ] Add `capacitor.config.ts` with `webDir: 'dist'`
- [ ] Add `ios/` and `android/`
- [ ] Add build/sync/open scripts
- [ ] Launch unchanged app on simulators and physical devices
- [ ] Verify browser/PWA remains functional

## Phase 2 — Platform abstraction

- [ ] Add platform detection
- [ ] Add Preferences adapter
- [ ] Add Filesystem adapter
- [ ] Add local database interface
- [ ] Preserve IndexedDB web implementation
- [ ] Select and implement native structured storage
- [ ] Add app lifecycle integration

## Phase 3 — Move high-volume data local

- [ ] Raw telemetry
- [ ] Debug logs
- [ ] Runtime working snapshots
- [ ] Offline mutation queues
- [ ] Image-upload staging
- [ ] Local daily aggregation

## Phase 4 — Asset packs

- [ ] Define pack manifest schema
- [ ] Bundle essential app/first-island content
- [ ] Host optional packs on object storage/CDN
- [ ] Implement download, checksum, activation, and rollback
- [ ] Add cache size controls and LRU eviction
- [ ] Add user setting to clear downloaded assets

## Phase 5 — Offline-first feature migration

- [ ] Habits and completions
- [ ] Goals
- [ ] Journal drafts
- [ ] Island Run
- [ ] Vision Board pending uploads
- [ ] AI message drafts and retry behavior

## Phase 6 — Native product capabilities

- [ ] Push notifications
- [ ] Deep links
- [ ] Native sharing/export
- [ ] Haptics
- [ ] App Store/Play billing integration decision
- [ ] App icons and splash screens
- [ ] Privacy declarations and permission copy

## Phase 7 — Release readiness

- [ ] Offline test matrix
- [ ] Reinstall/device-change tests
- [ ] Multi-device conflict tests
- [ ] Interrupted upload/sync tests
- [ ] Database growth load test
- [ ] Local storage pressure test
- [ ] iOS privacy manifest review
- [ ] Android permissions review
- [ ] TestFlight release
- [ ] Google Play internal testing release

---

# Definition of done

Capacitor migration is not complete merely because the web app opens inside Xcode or Android Studio.

It is complete when:

- one codebase supports PWA, iOS, and Android
- essential functionality works offline
- local writes do not flood Supabase
- server-authoritative state remains protected
- pictures/animations are bundled or cached appropriately
- user-uploaded media survives reinstall through cloud object storage
- telemetry and logs are bounded by retention rules
- synchronization is idempotent and recoverable
- app lifecycle events cannot cause save loops
- database growth is measured and remains within expected per-user budgets

---

# External references

Use the current official Capacitor documentation when implementation begins:

- Installing Capacitor
- Capacitor development workflow
- iOS setup and deployment
- Android setup and deployment
- Preferences plugin
- Filesystem plugin
- App lifecycle plugin
- Network plugin
- platform privacy and permission guidance

Because Capacitor, Xcode, Android SDK, and store requirements change, revalidate all versions and platform prerequisites at implementation time rather than treating commands in this plan as permanently fixed.