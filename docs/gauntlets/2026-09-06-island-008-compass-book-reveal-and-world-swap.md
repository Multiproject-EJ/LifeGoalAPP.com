# Island 008 Compass Book Reveal And World Swap

Date: 2026-09-06
Status: release candidate; focused playtest and full-project typecheck verified
Runtime islands: 008 and 018

## User Decision

Eivind moved Jungle Expedition and The Living Compass from runtime Island 018
to runtime Island 008. The Everblossom Kingdom and The Great Pollination move
from runtime Island 008 to runtime Island 018.

The authored source-pack identities do not change:

- source pack 018 remains Jungle Expedition;
- source pack 008 remains The Everblossom Kingdom;
- runtime 008 routes to source 018;
- runtime 018 routes to source 008.

This document supersedes earlier runtime-number decisions while preserving the
older documents as provenance for the visual work.

## Story Contract

Islands 001 through 008 gather personalisation and reflection as **First
Signals**. The player must not be told they are collecting Compass fragments
and must not receive a Compass Book entry point before the Island 008 mission
finale.

Runtime Island 008 is Jungle Expedition. Its five Wayfinder Glyphs awaken The
Living Compass. The fifth seal sends an energy column through the canopy; a
physical Compass Book descends from the sky, settles above the Lost City
Temple, and opens Chapter I: The Living Wheel.

The first eight curriculum activities remain durable and become the book's
eight First Signal pages. Visible Compass fragment language begins with Island
009. A player whose older save already passed Island 008 retains book access
even when no explicit Living Compass completion record exists.

## Runtime Contract

- Gameplay state remains owned by canonical Island Run services and actions.
- React presentation may read receipt state but may not write mission progress.
- `resolveStagedRestorationMissionProgress` transfers existing five-stage
  progress between the reassigned mission identities for Islands 008 and 018.
- The next canonical mission collection or activation persists the new mission
  identity without losing claimed pickups, charges, stages, or completion.
- The Compass Book receipt derives from committed Island 008 mission progress,
  with a compatibility grant for later-island and completed-cycle saves.
- The Compass Book floating control, Player Menu card, Today shortcut, and
  Quest Ledger deep link are gated by the same receipt policy.

## Cinematic Contract

The Emerald Zenith finale lasts 12.8 seconds in full motion:

1. Living Compass awakening.
2. Ruin ascension.
3. Waterfall reversal.
4. Energy rising through the canopy.
5. Compass Book descent.
6. Chapter awakening and temple rest.

The book is real procedural 3D geometry with a page block, layered covers,
brass spine, compass crest, emerald core, halo, and receipt sparks. It remains
visible in the completed afterglow at the `compassBookRest` scene socket.
Reduced motion applies the completed composition directly without removing the
reward object.

## Acceptance

- Runtime 008 renders Jungle Expedition and The Living Compass.
- Runtime 018 renders Everblossom and The Great Pollination.
- Existing Island 008/018 staged progress migrates monotonically.
- Islands 001-007 show First Signal/profile language, not Compass fragments.
- Arrival on Island 008 alone does not grant the book.
- Completing the fifth seal grants the book and opens the receipt ceremony.
- Island 009 and later can name visible Compass fragments.
- The full Jungle world remains within 175 authored draw calls and 180,000
  triangles at every production quality.
- Compass, Island Run, architecture, TypeScript, and visual phone checks pass.

## Rollback

The reassignment can be reversed through the explicit world-routing and mission
descriptor tables. Do not rename or move source-pack files. Do not delete old
mission records: the compatibility resolver is intentionally reversible for
the paired five-stage missions.

## September 7 Playtest Review

Played the canonical local demo on port 5240: five actual rolls and five seal
activations, first book receipt, Open Chapter I, and five construction parts
completing Hatchery level 1. This was not a complete island-clear playthrough.

The review corrected truncated mission labels, overly long actions, generic
honey-themed action presentation, and mismatched receipt/chapter naming.
The book now has a hinged cover, teal binding, gold fittings and first-page
wheel engraving. Its beam uses procedural soft volume shading. Camera shots
share endpoints, preserve an arrival hold, and widen for portrait framing.

Transient ceremony state blocks board input and premature book access without
introducing a gameplay mirror. Timer cleanup prevents stale receipts after
travel or unmount; reduced motion uses the matching shorter ceremony duration.

Verification: 52 focused mission/routing/receipt/world checks, architecture
guard, and targeted TypeScript checking of the new presentation/camera modules.
The broad TypeScript-backed suite was stopped after a long compiler stall
alongside other project compilers. Do not count its earlier 1,993-test pass as
verification of this newer visual pass. No deployment or push was performed.

Before/after images and comparison page:
`work/island-visual-library/island-018-jungle-expedition/evidence/2026-09-07-playtest/`.

Remaining visual critique: the distant forest reads too uniformly, and the
shared controller hides a substantial amount of the river. These were not
reworked during the mission/book review.

## September 7 Release Pass

User authorized continuing the polish and publishing to main/live.
The canopy now uses connected groves with blended jade, emerald and sunlit
foliage tones, plus three distinct existing crown proportions. Geometry count
is unchanged; the deterministic grove and board-clearance check passes.
The app-level book shortcut reads receipt eligibility directly through the
canonical store subscription, replacing the earlier local cached flag.

Release-candidate checks: 53 focused checks and full `tsc -b` pass. Architecture
guard passes with zero violations and three existing allowlisted warnings.
Production build and latest-main integration are separate release gates; this
entry does not itself certify deployment.
