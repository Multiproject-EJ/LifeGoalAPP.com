# Habit and todo quick reminders + loading screen — execution contract

Date: 2026-10-02
Baseline: `bcb66992e2f9d481f311bc78045fa3fee5b28974` (`origin/main`)
Branch: `codex/habit-todo-reminders-loading-20261002`

## Mission

Ship two immediately usable HabitGame improvements:

1. A compact reminder control for individual habits and todos. An
   always-accessible bell opens a small anchored picker, and scheduled items
   show the bell and time inline. Todo long-press remains reserved for its
   existing reorder gesture.
2. Replace the ineffective Island Run loading treatment with one static,
   branded portrait illustration and a legible progress bar that finishes only
   when the destination is ready.

The existing Capacitor Local Notifications path that already delivers egg
updates is the canonical native delivery mechanism.

## Non-negotiables

- No large reminder modal and no full settings detour.
- Reminder access must not steal the existing todo long-press reorder gesture,
  scrolling, swiping, completion taps, or editing.
- The compact picker is keyboard/screen-reader operable and can be dismissed
  without changing a reminder.
- Permission is requested only when the user saves an enabled reminder.
- Reminder scheduling and cancellation are serialized and use stable integer
  notification IDs; another user's pending reminders cannot leak across sign-in.
- Habit reminders use the selected local time on the canonical habit schedule:
  daily and single-weekday schedules recur natively, while complex/multi-day
  schedules keep the next valid occurrence and refresh whenever HabitGame is
  active. Todo reminders are a one-time local date/time. This is intentionally
  not a recurrence editor, and each selected item owns only one native slot so
  the iOS pending-notification ceiling remains compatible with egg alerts.
- Todo reminder metadata is device-local because iOS local notifications are
  device-local; existing habit reminder preferences continue to use their
  canonical synced preference service. No database migration is introduced.
- The loading illustration contains no text. Runtime text and the progress bar
  remain HTML/CSS for localization, accessibility, and accurate completion.
- Respect reduced-motion, safe areas, and the 390 x 844 full-frame gate.
- Existing egg notifications, habit/todo completion, swipe behavior, Island Run
  gameplay state, and loading completion semantics must remain intact.

## Scope

- A shared reminder preference/scheduling service.
- A shared compact reminder popover and inline bell trigger.
- Wiring to the primary mobile habit and todo rows only.
- Inline reminder status (bell + local time).
- Focused service/interaction regression coverage.
- One generated loading illustration, at most one targeted generation edit.
- Static loading-screen composition and staged progress tied to readiness.
- TypeScript, focused tests, production build, 390 x 844 visual QA, Capacitor
  sync, and connected-iPhone smoke verification.
- If all gates pass, update live main/PWA and the connected iPhone; the user's
  “this needs to work now” is treated as deployment authorization for this
  bounded slice.

## Explicit exclusions

- Server push, cross-device reminder sync, snooze actions, location alerts,
  custom sounds, multiple reminders per item, and a general calendar UI.
- Redesigning habit/todo cards or Island Run gameplay.
- More than one loading-art direction.

## Evidence and gates

- Unit-level proof for time normalization, persistence, stable IDs, next-fire
  calculation, schedule/cancel behavior, and gesture movement cancellation.
- Existing today-todo, habit swipe, app boot, Island Run architecture, and
  relevant loading regressions pass.
- Production bundle succeeds with no new architecture guard violations.
- 390 x 844 capture proves the picker remains compact and the loading image,
  title, progress bar, safe areas, and contrast fit the full frame.
- On the connected iPhone: tap bell, save, see inline time, confirm pending
  native notification, cancel it, and confirm Island Run loading transition.

## Resource envelope and stop conditions

This is an agent-imposed safety cap because the user supplied no numeric budget:

- Wall clock: 90 minutes for this non-persistent run.
- Workers: root plus at most three bounded read-only audit workers.
- Paid external/API credits: zero. Use only the built-in image generator.
- Visual generation: one candidate plus at most one targeted edit; at most three
  visual reviews total.
- Implementation: one vertical slice and one bounded correction cycle.

Stop and ask for a new checkpoint if the slice requires a schema migration,
server notification infrastructure, a second UI redesign, more than the visual
review ceiling, or cannot pass native/device verification inside the envelope.
Do not keep a background loop alive and do not treat missing limits as unlimited
authority.

## Rollback

All changes remain isolated on the branch until gates pass. The loading screen
keeps the existing readiness event and can revert to the baseline component.
Reminder notification ownership is namespaced so scheduled reminders from this
slice can be enumerated and cancelled without touching egg or life alerts.

## Release checkpoint — 03:22 CEST

- Elapsed: approximately 78 minutes; approximately 12 minutes remained in the
  90-minute execution envelope at the release checkpoint.
- Resources: root plus no more than three bounded workers; zero paid external
  credits; one generated loading-art candidate and no regeneration.
- Reviews: three visual reviews total (source composition, native launch image,
  and the 390 x 844 compact reminder/loading composition). The review ceiling
  is exhausted; no further visual iteration was performed.
- Loading asset: `island-run-voyage-loading-v1.webp`, 852 x 1846, 221 KB,
  SHA-256 `6057d4e6023661b0b5e44f1fe55b965ce33daaecb4bd68111e0ab94438dc9187`.
- Verification: focused reminder/native/cache tests, TypeScript build, production
  Vite build, mobile-image gate, Island Run suite/architecture guard, diff
  whitespace check, Capacitor sync/copy, and signed arm64 iOS build passed.
- Device: build `2027.1.1` installed successfully on the paired iPhone. The
  automated launch was deferred because iOS reported that the device was locked;
  this does not affect the completed installation.
