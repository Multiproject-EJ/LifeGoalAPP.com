# Journey Disc Arena — Island 006 integration Gauntlet

Date: 2026-08-14  
Branch: `codex/journey-disc-arena`

## Product decision

- Journey Disc Arena is enabled on the island after each five-island chapter:
  Islands 6, 11, 16, and onward.
- While a canonical timed event is live and the Boss stop remains `locked`,
  the exhibition owns the centre-landmark presentation and interaction.
- When the mandatory Boss stop becomes available, the authored Moon Gate
  immediately regains priority. The timed exhibition cannot deadlock Island
  Run, complete a stop, or replace canonical boss progression.
- Entry reuses the existing Journey Disc launcher, event ticket bucket,
  canonical start/bank/claim actions, reward bar, and permanent armory profile.

## Implemented Island 006 presentation

- Authored Moonveil centre transformation with a circular battle deck, energy
  rails, four animated weapon discs, arena pylons, and cyan/violet lighting.
- Centre beacon redirects both the 2D Boss control and 3D centre landmark tap
  through the same pure ownership resolver.
- Viewport-portalled invitation sheet shows available weapon discs, permanent
  armory rank, event time remaining, and the boss-yield rule.
- The full-screen game stays transparent around the circular arena so the live
  Island 006 world remains visible underneath.
- Dev-only deterministic preview flags exist for centre composition QA:
  `journeyDiscArenaCenterPreview=1` and
  `journeyDiscArenaInvitationPreview=1`.

## Verification

- TypeScript `tsc --noEmit`: pass.
- Production TypeScript build + Vite build: pass.
- Island Run architecture guard: pass, 0 violations.
- Island Run deterministic service runner: pass.
- Pure ownership resolver tests cover:
  - eligible Island 006/11 event ownership;
  - zero-ticket invitation state;
  - Boss `ticket_required`, `active`, `accessible`, and `completed` priority;
  - ineligible and feature-disabled fallback.
- In-app browser, 390×844:
  - Island 006 document: 390×844, no horizontal or vertical overflow;
  - 3D world layer: 390×842.4;
  - invitation: 362×377.5, fully inside viewport;
  - centre beacon: 84.2×84.2, fully inside viewport;
  - standalone game canvas: 390×844;
  - standalone launch CTA bottom: 815 px;
  - full prep panel bottom: 830 px;
  - refreshed full round: launch, battle, power action, result; no console
    errors or warnings.

## Runtime defects caught and resolved

- Moved the prep-formation constant above runtime class initialization so the
  render loop cannot observe a temporal-dead-zone reference.
- Revalidated the current procedural audio class and a fresh minigame mount;
  launch and battle-bed methods execute without browser errors.

## Release sequencing

The source feature flag is enabled on this branch. Apply
`supabase/migrations/20260813183000_add_journey_disc_arena_progress.sql` to the
target environment before shipping the branch, because Journey Disc event
progress and permanent armory fields are persisted in the Island Run profile.
