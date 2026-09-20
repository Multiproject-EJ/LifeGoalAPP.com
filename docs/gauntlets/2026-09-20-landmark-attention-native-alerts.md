# Landmark attention and native alerts

User outcome: incomplete landmarks communicate actionable progress without permanent labels; controller/rail dots indicate real claimable rewards or an affordable full next building level; the installed iOS app can request system notification authorization and schedule useful alerts.

Authority: requested HabitGame implementation and the existing main/PWA/iPhone release workflow. Preserve saves, completed tasks and notification choices. Never accept the iOS permission dialog for the player. No schema changes or new paid services are planned.

Presentation: faint light for multiple remaining construction/activity steps, blue major outlines for one remaining activity, no glow when fully complete. Hatchery only glows once every building reaches Level3 (other activities need not be solved). Latest clarification: statistics stay hidden even with blue outlines, appear only on explicit selection or a completed entry-tile landing, and fade out as movement starts. Passing a tile never reveals statistics. Use bounded geometry and reduced-motion-safe dots.

Notifications: native Capacitor Local Notifications delivery, contextual egg opt-in and settings entry with test alert, separate optional smart life reminders, explicit OS permission result, cancel completed/stale schedules and avoid duplicate egg alerts. Quiet hours and bounded one-shot scheduling; cancel habit alerts whenever canonical Today health becomes Stalled or Needs review; resume only when eligible again, without an ignored-alert counter. PWA delivery remains compatible.

Milestones: canonical attention policy and visual proof; native notification bridge and contextual consent; useful habit/goal/todo scheduling with canonical Stalled suppression; tests, typecheck, web build, signed iOS build and live/device verification. Record any device permission action the user must take.

Evidence: state boundary/idempotency tests, representative mobile visual check, native pending/permission diagnostics plus test notification, regression and architecture checks. Rollback through a scoped revert; never erase user saves or unrelated notification settings. Native delivery cannot be declared observed until the device reports authorization and the user/device confirms a delivered alert.

Additional user direction: Island001 reveals the mission phone only after the first completed throw, then queues the dynamite / Diplomatic Peace Signing Assembly briefing. Reuse the canonical cycle-scoped narrative beat for persistence and deduplication.

Validation evidence:
- Mobile 419×829 actual Three.js preview: default labels absent; a Hatchery landing reveals only its label; starting movement and passing an entry leave labels absent. Authored outline overlays are visible after static-world batching, with no change to original materials.
- Service regression run covered 2,270 cases. Two old mission expectations were updated for the new user instruction; the focused 53-case mission/roll/policy rerun passed. Build/attention policy checks also passed after the final outline-state refinement.
- Native adapter checks passed for permission, idempotent reconciliation, batch eggs, collection cancellation, Stalled cancellation, account isolation, denied permission and web isolation. Reminder integration passed for active opportunities, Stalled/completed suppression and quiet hours.
- Architecture guard: zero violations, three existing allowlisted warnings. Audio asset validation passed. Production web bundling passed.
- Device delivery requires actual iOS permission and a delivered test alert; a successful build/install alone is not evidence of notification delivery.

Latest authorized additions: default Island001 mission phone (overrides first-throw icon reveal); first tutorial throw lands on dynamite; door overlays preserve collectible metadata; ordinary landmark entry passes retired at UI/resolver/purchase-action/advisor boundaries; Arena launch requires event tickets and plays a brief pass animation without extra debit; board ticket keeps canonical active-event payout. Preserve Level3 activity gates from004 and beginner finales. Rebuild both distributions after these changes.

Latest validation: 302 focused cases passed (resolver, stop action, advisor, topology, roll, construction, state actions, beginner progression). The broad run passed 2,258 cases; its 13 failures were obsolete ticket/locked-stop expectations and were corrected and covered by the focused rerun. Added coverage for out-of-order beginner completion, free orientation, stale pass callbacks, first dynamite landing, and preserving all ten cache markers through expanded door overlays. Native bridge/integration checks pass; architecture guard reports zero violations (three existing allowlisted warnings). Presentation now defers hiding collected dynamite until movement completes; gameplay still commits immediately.
