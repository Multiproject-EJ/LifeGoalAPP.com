# Hatchery and shipboard incubation — execution contract

User-approved rules: eggs begin on Island004. Every building must reach Level3 before the Hatchery grants its egg. The Hatchery activity comes after Habit, Event and Wisdom and immediately before the Boss. Each landmark requires Level3 before its activity is enterable. Existing Island001–003 beginner introductions remain egg-free. Eggs are earned at the Hatchery, then incubated in the spaceship and can be opened away from their source island.

Preserve immutable stop IDs and indexed save ownership; express player-facing activity order separately instead of relabeling old records. Preserve already-earned eggs, creature collection and completed activities. New one-time egg grants and incubation/collection changes use canonical actions and the canonical ledger, with idempotence and cross-island active-egg isolation. Island departure must not wait for shipboard incubation.

Landmark overlays: readable name, circular construction percentage, Ready to enter at Level3, and Complete after the activity. Avoid per-frame React state. Use existing projected-landmark DOM overlay path and canonical construction/activity view models.

Verification: fresh004, existing partial/completed save, beginner001–003, all-Level3 hatchery eligibility, exactly-once grant, off-island hatching/opening, preservation of other active eggs, previous-island reward attribution, boss/departure, label projection and phone layout. Publish and install only after the whole new progression path passes.

Implementation: Level3 activities use the shared resolver, with no additional entry ticket from Island004. Claiming the Hatchery egg starts incubation in the spaceship in the same canonical transaction. The spaceship sanctuary opens the incubator, including eggs earned on other islands. Beginner welcome activities remain available to older saves so disabling early egg placement cannot strand them.

Validation: 2,264 service tests passed; 252 focused progression checks passed; production Vite build passed; architecture guard passed with no new violations. Phone-sized Island004 preview verified projected names, circular percentages and collision spacing. Signed native build and live deployment are checked as release steps.
