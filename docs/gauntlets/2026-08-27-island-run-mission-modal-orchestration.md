# Island Run Mission Modal Orchestration Gauntlet

Date: 2026-08-27

## Mission

Make Island Run mission presentation predictable across every island: only one full-attention popup is visible at a time, a queued mission popup opens after the current popup closes, persistent mission access is a compact HUD launcher, and every mission modal renders above the top bar and reward bar.

## Authoritative sources

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`

## Non-negotiable invariants

- Gameplay progress remains owned by canonical Island Run services and state actions.
- React may own only presentation state: which modal is visible and which presentation is queued.
- A mission popup may never stack behind or on top of another full-attention pickup popup.
- Mission dialogs render through `document.body`, use a viewport-fixed backdrop, lock page scroll, respect safe areas, and sit above the board HUD.
- Persistent mission information is not rendered as a large in-world panel. It is reachable from one compact mission launcher in the reward-bar side rail.
- Closing the current popup advances the queued popup; it must not discard already-earned gameplay progress.
- Existing island mechanics and progress values are unchanged.

## In scope

- Queue the Island 001 Assembly Crater presentation behind a Concord pickup earned on the same roll.
- Use the same presentation handoff for other signature pickups resolved during the same landing.
- Move the universal mission-phone launcher beneath the timed-event / minigame actions in the reward-bar side rail.
- Remove the large persistent Frostwell, Rootheart, Canyon Spiral, Great Honeyfall, and Sunken Sands in-world mission pills.
- Give the mission phone and signature mission dialogs one foreground overlay layer.
- Verify Island 001 and Island 013 as representative queue and train-mission slices.

## Exclusions

- New mission mechanics, rewards, or persistence fields.
- A repo-wide rewrite of unrelated modal systems.
- Island artwork or 3D manifest changes.
- Automatic publishing to production.

## Milestones

1. Inventory existing mission launchers, overlay roots, and competing pickup paths.
2. Add a presentation-only queued signature mission handoff.
3. Place the compact mission launcher in the reward-bar side rail and remove large scene pills.
4. Standardize mission portal layers and scroll behavior.
5. Add source/presentation tests and run Island Run architecture and build verification.

## Evidence required

- Tests prove a queued signature mission is dispatched only after the Concord popup closes.
- Tests prove the compact launcher exists in the reward-bar side rail and the legacy scene pills are absent.
- Tests prove mission overlays use the foreground mission layer.
- Island Run gameplay tests and architecture guard pass.
- Production Vite build passes.

## Rollback

The change remains a presentation-only, reversible slice. Existing canonical gameplay services and ledgers are untouched; rollback removes the queue state, restores the old launcher placement, and restores the previous overlay classes.

## Stop conditions

Stop and report if implementing the queue requires a new gameplay write from React, changing canonical roll order, or altering a persisted mission schema.
