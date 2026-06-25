# Island 001 Narrative Vertical Slice Implementation Plan

Status: implementation planning only  
Date: 2026-06-25  
Target package: `public/islands/001/`  
Final verdict: **PASS WITH CONDITIONS**

## 1. Executive implementation summary

The smallest safe implementation is a feature-flagged, Island-1-only narrative observer that reads canonical Island Run state, queues at most one story surface at a time, and presents either the existing `IslandStoryReader` or a new lightweight dialogue sheet. It must not write gameplay state, rewards, stop completion, boss state, build state, travel state, creature inventory, economy values, or persisted stop IDs.

The highest-risk integration point is `IslandRunBoardPrototype.tsx`, because it is the live board shell and still owns mixed modal, build, boss, story-reader, travel, and legacy compatibility state. Runtime inspection confirms that the board mounts the story reader, stop modals, boss trial, build spend, clear celebration, and travel CTA in one large component.

Defer everything that would imply a second progression engine: all 30 beats, branching, durable story ledger, world archive, crew systems, non-combat boss mechanics, story rewards, reward/economy changes, tile-index triggers, and a generalized modal manager.

The first release proves value by showing only six capabilities: arrival, one reusable dialogue surface, one Hatchery intro, one first-restored-structure reaction, finale framing, and post-boss resolution. This demonstrates that Island Run can feel authored without changing gameplay authority.

Recommendation: begin with a **small PR stack**, not one large PR. No investigation prerequisite is required before PR 1, but PR 3 must re-check modal collisions against the then-current board code before runtime display is enabled.

## 2. Confirm runtime entry points

Current code is stronger evidence than prior plans. The runtime entry points inspected are:

| Runtime event | Current files / symbols | Current behavior | Safest narrative insertion point |
|---|---|---|---|
| Entering Island Run | `LevelWorldsHub` imports and renders `IslandRunBoardPrototype`; it logs mount/unmount via `logIslandRunEntryDebug`. | Level Worlds is the production shell for Island Run. | Do not insert narrative here except passing future feature flag/debug props if needed. Keep the board-local observer closer to gameplay state. |
| Mounting board | `IslandRunBoardPrototype` is rendered with `session`, `initialPanel`, `onExitBoard`, `showTopBackButton`, and `isAdmin`. | Board owns Island Run UI and modals. | Add a board-local hook inside the board after hydration/state derivation, behind `islandRunNarrativePilotEnabled`. |
| Resolving current island | Board reads canonical store via `useIslandRunState(session, client)` for core fields and keeps legacy `islandNumber` local state; `effectiveIslandNumber = cycleIndex * 120 + islandNumber`. | Current island is initialized/hydrated from `runtimeState.currentIslandNumber`; `effectiveIslandNumber` accounts for cycles. | Observer should read `__storeState.currentIslandNumber` or the board's canonical/hydrated state adapter, not infer from UI labels. Only activate for island `1` / effective island `1` in v1. |
| Auto-opening current prologue | Board effect checks `runtimeState.storyPrologueSeen` plus `localStorage` key `island_run_story_seen_prologue_${userId}` and opens `setShowStoryReader(true)`. | Existing global prologue auto-opens once. | Arrival must not fight this effect. For v1, arrival waits until prologue reader is closed/seen, or disabled when `showStoryReader` is already true. |
| Opening `IslandStoryReader` | Board mounts `<IslandStoryReader manifestPath="/storyline/episode-001/manifest.json" isOpen={showStoryReader} onClose={handleCloseStoryReader} onRewardClaim={sanctuaryHandlers.storyRewardClaim} />`. | Current reader path is global prologue and still wires a reward callback. | Reuse this reader by adding an episode kind/path state later; for Island narrative manifests pass no reward callback or a no-op and validate no reward fields. Do not create a second reader. |
| Opening stop modals | `handleStopOpenRequest(stopId)` resolves status with `resolveIslandRunStopTapOutcome`, clears other stop prompt state, calls `requestActiveStopTransition(stopId, 'orbit_stop_click')`, focuses camera. Door landings use `handleLandmarkDoorLanding`. | Stop UI opens from orbit taps and landmark-door tiles. | For Hatchery intro, observe `activeStopId === 'hatchery'` plus status/open source after the stop opens; do not intercept or complete stop. |
| Detecting stop completion | `handleCompleteActiveStop` validates active stop, calls `applyStopObjectiveProgress`, awards existing shards, syncs completed stops, and handles boss clear. | Stop completion remains gameplay authority. | Derive `stop_completed` by comparing canonical `stopStatesByIndex[index].objectiveComplete` false→true. Never call completion from story UI. |
| Detecting build-level changes | Build spend path calls `applyStopBuildSpendBatch`, updates runtime state, plays `build_upgrade`, then compares `nextBuildState.buildLevel > currentBuildState.buildLevel` for feedback. | Build state lives in `stopBuildStateByIndex[].buildLevel`. | Derive `build_level_changed` from previous/current canonical build arrays. Prefer first level-up on any stop for MVP; no mutation. |
| Boss eligibility | Board derives `bossStopStatus` from `contractV2Stops.statusesByIndex[4]`; `canChallengeCurrentBoss = canChallengeBoss({ stopBuildStateByIndex, isBossDefeated })`; lock reason from `getBossChallengeLockReason`. | Boss requires build/boss state conditions. | Finale setup should trigger when boss stop active/eligible and `canChallengeCurrentBoss` becomes true, not from tile indices. |
| Starting boss challenge | `handleStartBossTrial` rechecks `getBossChallengeLockReason`; island 1 may launch `Shooter Blitz` through minigame descriptor, otherwise the inline trial starts. | Start is an existing gameplay action. | Narrative may show finale framing before user starts, then return to existing CTA. Story UI must not call boss resolve. |
| Resolving boss | `handleResolveBossTrial` marks local phase, grants existing boss rewards, plays SFX/haptic, then calls `applyBossTrialResolvedMarker`. | Boss trial resolved marker is authoritative. | Resolution trigger should observe `bossTrialResolvedIslandNumber === islandNumber` or false→true boss resolved state after the action completes. |
| Determining island clear | Boss stop completion branch calls `isIslandRunFullyClearedV2` with stop states, build states, and hatchery egg resolved; `showIslandClearCelebrationFromAnywhere` opens celebration. | Island clear is separate from boss trial resolution and can require all builds. | Resolution should wait until boss is resolved and avoid covering the island-clear celebration. Queue after celebration closes or show only after reward claim if product chooses. |
| Performing travel | Clear celebration CTA calls `handleTravelFromCelebration`; after travel overlay timeout it calls `performIslandTravel`, which uses canonical `travelToNextIsland` under action lock. | Travel is explicit CTA, not automatic. | Travel copy may wrap/augment CTA only after clear; story skip must leave travel available and call existing CTA only through approved UI callback if used. |

Additional verified foundations: Island 1 art already exists at `public/assets/islands/island-001/island-art.json`, including ambient background, board art, Hatchery L3, battle scenery, and Noctyra-compatible idle/defeated boss images. Existing global prologue remains at `public/storyline/episode-001/manifest.json` and currently contains a placeholder reward field that must not be copied into Island 1 content.

## 3. Minimal vertical slice

MVP v1 includes only:

1. Island 1 arrival story using `IslandStoryReader`.
2. Reusable lightweight dialogue surface.
3. One Hatchery intro dialogue.
4. One first construction milestone reaction.
5. Finale introduction/framing before boss challenge.
6. Resolution episode after boss completion.

Recommended exact MVP beats: `I001-B02`, `I001-B03`, `I001-B04`, `I001-B24`, `I001-B26`, `I001-B27`, `I001-B29`, and `I001-B30` as copy-only travel wrapping. If schedule compresses, merge `I001-B26` and `I001-B27` into one finale surface and keep `I001-B30` as text in the resolution manifest rather than runtime UI.

## 4. Story-beat priority model

| Tier | Included beat classes | Auto-launch | Stacking | Suppression | Board pause | Fallback |
|---|---|---:|---|---|---|---|
| Tier A — Major cinematic | Prologue, arrival, finale intro, resolution, travel transition | Yes, only if queue is empty and gameplay modals are closed | Never stack; one active major only | Once per user/island/beat locally | Yes, modal reader/dialog owns attention | If manifest/media fails, show text-only fallback or skip to board |
| Tier B — Short interactive | First stop intros, Wisdom wrapper, Great Drift reveal | Yes for first stop intro only; otherwise user-triggered or queued | Never over another modal; may wait behind Tier A | Once unless marked repeatable | Yes for modal/bottom sheet; brief | If component fails, degrade to landing text/toast |
| Tier C — Ambient | Build reactions, companion comments, SFX, toasts | May fire when board idle; should not interrupt gameplay | Do not stack; coalesce latest by beat ID | Once for authored build reactions; repeatable for generic comments | No | Toast/landing text only; drop if another modal owns attention |

Rule: the pilot cannot turn 30 beats into 30 blocking modals. Only Tier A beats may block, Tier B is brief and sparse, and Tier C degrades or drops under load.

## 5. Proposed minimal data types

Place pilot types under a future `src/features/gamification/level-worlds/narrative/` folder or equivalent Island Run domain folder.

```ts
type IslandNarrativeDefinition = {
  islandNumber: number;
  characters: IslandNarrativeCharacter[];
  arrivalEpisode?: string;
  resolutionEpisode?: string;
  beats: IslandDialogueBeat[];
};

type IslandNarrativeCharacter = {
  id: string;
  displayName: string;
  portraitSrc?: string;
};

type IslandDialogueBeat = {
  id: string;
  trigger: IslandNarrativeTrigger;
  speakerId: string;
  text: string;
  secondaryText?: string;
  priority: 'major' | 'short' | 'ambient';
  repeatPolicy: 'once' | 'repeatable';
  surface: 'story_reader' | 'dialogue_sheet' | 'toast';
};

type IslandNarrativeTrigger =
  | { kind: 'island_entered'; islandNumber: number }
  | { kind: 'stop_opened'; islandNumber: number; stopId: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss' }
  | { kind: 'build_level_changed'; islandNumber: number; stopId: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss'; minLevel: number }
  | { kind: 'boss_eligible'; islandNumber: number }
  | { kind: 'boss_resolved'; islandNumber: number }
  | { kind: 'island_clear_travel_ready'; islandNumber: number };
```

Why necessary now: definition, characters, beats, and triggers are enough to validate content and render the six MVP capabilities. Deliberately excluded: quest graphs, branching, rewards, economy fields, tile indices, NPC movement, gameplay state machines, inventory, and duplicate island progress. Later evolution can add optional localization, multi-panel dialogue, remote ledger IDs, or archive unlock metadata without changing gameplay authority.

## 6. Narrative observer/orchestrator boundary

First version should be a **custom React hook with small pure helper functions**, mounted board-locally. A standalone service is premature except for validation/trigger matching helpers used by tests.

Reads:

- `currentIslandNumber`, `cycleIndex`, `storyPrologueSeen`.
- `activeStopId` / open stop UI state from board-local UI state as a presentation event.
- `stopStatesByIndex` objective completion booleans.
- `stopBuildStateByIndex` build levels.
- `bossTrialResolvedIslandNumber` and `canChallengeCurrentBoss`.
- modal-open booleans needed only for queue gating.

Derived events: `island_entered`, `stop_opened`, `build_level_changed`, `boss_eligible`, `boss_resolved`, `island_clear_travel_ready`.

Queue: keep a tiny in-memory queue of beat IDs, sorted `major > short > ambient`, with one active surface. If gameplay modal ownership is true, major/short wait and ambient degrades to toast or drops. Repeat suppression is checked before enqueue and again before display.

Hard no-writes: the hook must not mark stops complete, award rewards, resolve bosses, mutate build state, travel, write creatures, or patch runtime gameplay state. Its only writes are UI state and local non-critical suppression.

## 7. Dialogue component plan

Use a viewport-anchored **modal bottom sheet hybrid** for the pilot: fixed full-screen transparent/dim backdrop, content aligned bottom on phones and centered narrow card on larger viewports. It should reuse existing modal CSS patterns from Island Run stop/clear modals, but be a new component because no dedicated world-character dialogue primitive exists.

Required behavior:

- Optional portrait image with empty alt when decorative; works without portrait.
- Speaker name, one short text block, optional second bubble.
- Continue and Skip/Close with minimum 44px touch targets.
- `role="dialog"`, `aria-modal="true"`, labelled title, Escape/Close support.
- Reduced-motion disables entrance bounce/parallax.
- Viewport-safe `position: fixed`, full-screen backdrop, no nested scroll traps.
- Background scroll locked while open using existing `lockPageScroll` pattern.
- No gameplay mutation props; callbacks are `onContinue`, `onSkip`, `onClose` only.

## 8. Story reader integration

Reuse `IslandStoryReader` for arrival and resolution. Do not create a second reader.

Plan:

- Add future board state like `activeStoryEpisode: { kind: 'prologue' | 'arrival' | 'resolution'; manifestPath: string } | null` rather than a boolean-only `showStoryReader`.
- Content paths:
  - Arrival: `/islands/001/story/arrival/manifest.json`.
  - Resolution: `/islands/001/story/resolution/manifest.json`.
  - Existing prologue remains `/storyline/episode-001/manifest.json` for now.
- For Island 1 narrative episodes, validator rejects `reward`; board passes no `onRewardClaim`.
- Skip/close marks only local narrative suppression, not gameplay persistence.
- Media failure: reader already surfaces manifest load errors; PR 1/3 should add text-only fallback panels or a wrapper fallback path for Island content.
- Audio preferences: story audio must respect existing music/audio settings and browser autoplay; if not user-enabled, it is silent.
- Resolution conflict: do not auto-open resolution while island-clear celebration is active; queue it after boss resolved and no clear modal/story/minigame is open, or show after clear reward claim in PR 5.

## 9. Content package structure

Recommended pilot structure:

```text
public/islands/001/
  narrative.json
  characters/
    miri.webp
    sava.webp
    poko.webp
    ivo.webp
    noctyra.webp
  story/
    arrival/
      manifest.json
    resolution/
      manifest.json
  clues/
    great-drift-symbol.webp
```

Keep the global prologue in `public/storyline/episode-001/` for now to avoid file moves and preserve existing behavior.

Validation rules:

- `narrative.json.islandNumber === 1`.
- All character IDs unique; beat speaker references must exist.
- Beat IDs unique and match `I001-B##` for authored beats.
- Only supported triggers and priority values.
- Stop IDs restricted to canonical IDs, including internal `mystery` and `boss`.
- No tile index fields.
- No `reward`, economy, probability, stat, or inventory fields.
- Manifest paths resolve under `/islands/001/` for Island 1 episodes.
- Media path values are relative to package or absolute public paths and valid in tests where possible.

## 10. Repeat suppression

No database migration. Use local, non-critical suppression only.

Storage convention:

- Aggregate key: `island_run_narrative_seen_v1_${userId || 'anonymous'}_island_${islandNumber}`.
- Value: JSON object `{ beats: Record<string, number>, episodes: Record<string, number> }` with timestamps.
- Optional per-beat fallback key if JSON corruption occurs: `island_run_narrative_seen_v1_${userId || 'anonymous'}_island_${islandNumber}_${beatId}`.

Suppressed once: arrival seen, dialogue beat seen, build reaction seen, finale intro seen, resolution seen. Corrupted or unavailable localStorage fails open safely, but an in-memory displayed-this-session set prevents infinite auto-launch loops. This is separate from canonical gameplay persistence and separate from existing prologue persistence (`storyPrologueSeen` plus `island_run_story_seen_prologue_${userId}`).

## 11. Modal collision and queue behavior

Current board owns many modal booleans: story reader, active stop modal, build panel, minigame launcher, island-clear celebration, shop/market panels, reward details, sanctuary, dormant door, traffic light, tech collection, encounter, journal, claim modal, and others.

Simple rule:

1. Only one narrative surface active.
2. Tier A and B wait while any gameplay modal/minigame/story/clear celebration/build panel is open.
3. Tier C ambient beats become landing text/toast if no modal is open; otherwise drop or coalesce.
4. Finale intro waits until boss eligible and no stop/modal collision exists; if the boss modal is already open, show the dialogue before trial start only if it can be inserted without hiding the existing CTA.
5. Resolution waits until canonical boss resolved; it must not block boss reward grant or island clear.
6. If user closes the app mid-story, local suppression is written only on close/skip/complete, so it may replay once; gameplay remains unaffected.
7. Travel remains available if story is skipped.

Do not add a general-purpose modal manager in the pilot.

## 12. Exact MVP beat list

| Beat | Trigger source | Surface | Content source | Repeat | Fallback | Test case |
|---|---|---|---|---|---|---|
| `I001-B02` arrival | `island_entered` for island 1 after prologue not active | Story reader | `/islands/001/story/arrival/manifest.json` | Once | Text-only arrival dialogue | First Island 1 entry opens arrival once; skip opens board |
| `I001-B03` first objective | Arrival close or first board idle after arrival | Dialogue sheet, Captain Ivo/Miri | `narrative.json` | Once | Landing text | Closing arrival queues one objective hint only |
| `I001-B04` Hatchery intro | `stop_opened` with `stopId: 'hatchery'` | Dialogue sheet, Miri/Poko | `narrative.json` | Once | Existing Hatchery modal only | Intro does not set egg or complete stop |
| `I001-B24` first restored structure | first `build_level_changed` to level >= 1 | Ambient toast/dialogue | `narrative.json` | Once | Existing build toast only | Beat does not mutate build state |
| `I001-B26` finale setup | `boss_eligible` true | Dialogue sheet, Elder Sava/Miri | `narrative.json` | Once | Existing boss CTA | Boss intro does not resolve boss |
| `I001-B27` finale framing | Immediately after setup or before Start challenge | Dialogue sheet or merged with B26 | `narrative.json` | Once | Existing boss copy | User can continue to existing boss flow |
| `I001-B29` resolution | `boss_resolved` after canonical marker and no clear modal active | Story reader | `/islands/001/story/resolution/manifest.json` | Once | Text resolution | Boss completion can trigger resolution after reward/clear |
| `I001-B30` travel copy | `island_clear_travel_ready` | Copy wrapper/CTA helper, not new travel action | `narrative.json` | Once | Existing Travel CTA | Skip/close leaves travel CTA usable |

Deferred beats: `I001-B01`, `I001-B05` through `I001-B23`, `I001-B25`, `I001-B28`, any repeat companion comments beyond the one build reaction, Wisdom wrapper unless it replaces a selected MVP beat, Great Drift reveal beyond resolution clue copy, and all optional sound-only/visual-only beats not needed for MVP.

## 13. Feature flags

Add two flags to existing Island Run feature flag config:

- `islandRunNarrativePilotEnabled`: default `false` for PR 1 and production safety. Demo/staging can override by code/config when ready.
- `islandRunNarrativePilotDebugEnabled`: optional, default `false`, development-only UI diagnostics.

Disabled mode must return exactly to current behavior: no new content fetches, no observer, no new modals, no suppression writes, no audio calls, no StoryReader path change, and no copy changes.

## 14. Asset-minimization plan

Use existing assets first:

- Island 1 ambient background: `public/assets/islands/island-001/background/ambient-background.webp`.
- Battle scenery: `public/assets/islands/island-001/scenery/battle-arena-crystal.webp`.
- Noctyra idle/defeated stand-ins: `black-crystal-dragon-idle.webp`, `black-crystal-dragon-defeated.webp`.
- Existing board and landmark art for restored-structure context.

Blocking new assets to begin implementation: none if text-only manifests and optional portraits are allowed.

Replaceable placeholders, target 5–6 assets:

1. Miri portrait.
2. Elder Sava portrait.
3. Poko portrait.
4. Captain Ivo portrait.
5. Noctyra restored/softened portrait or crop.
6. Great Drift symbol/clue image.

Optional polish, keep total under 8–10:

7. Arrival composition using existing island background.
8. Resolution composition using defeated/restored Noctyra crop.
9. Subtle corrupted-crystal overlay.
10. Travel route card/background.

## 15. Audio integration

Existing services:

- `islandRunAudio.ts` provides typed SFX and haptics, gated by `setIslandRunAudioEnabled`, user choice, missing asset no-ops, and reduced-motion-aware haptics.
- `islandRunMusic.ts` owns board/shop/clear music contexts, playlist/track playback, fade/reset, and avoids duplicate owned tracks.
- Board already applies music context from `musicEnabled`, `effectiveIslandNumber`, `showShopPanel`, and `showIslandClearCelebration`.

Pilot plan:

- Arrival ambience: use `IslandStoryReader` manifest soundtrack only if audio is enabled; silent fallback.
- Construction reaction cue: reuse `build_upgrade` only from existing build path; narrative should not replay duplicate SFX unless a new event is explicitly added later.
- Finale intro cue: no new blocking audio in MVP; optionally use existing boss music context when boss modal opens.
- Resolution music: use reader soundtrack only if music enabled; stop/restore via existing reader cleanup.

Audio must never block UI, must tolerate autoplay failure, and must not introduce simultaneous duplicate tracks.

## 16. Test plan

Unit tests:

- Narrative definition validation.
- Trigger matching.
- Suppression-key generation.
- Repeat policy.
- Disabled feature flag behavior.
- Reward fields rejected.
- Tile-index triggers rejected.

Component tests:

- Dialogue renders without portrait.
- Continue/close/skip works.
- Reduced-motion class/behavior.
- Keyboard and screen-reader labels.
- Media failure fallback for reader wrapper.

Integration tests:

- First Island 1 entry shows arrival once.
- Skip opens board.
- Stop intro does not complete stop.
- Build reaction does not mutate build state.
- Boss intro does not resolve boss.
- Boss completion can trigger resolution.
- Resolution skip does not block island clear or travel.
- Disabled flag preserves current behavior.

Manual mobile QA:

- Small iPhone viewport.
- iPad.
- PWA standalone.
- Audio disabled.
- Reduced motion.
- Offline/missing asset.
- App closed mid-scene.
- No active companion.
- Repeated island entry.

## 17. Instrumentation and debug support

Development-only diagnostics behind `islandRunNarrativePilotDebugEnabled`:

- Current Island 1 narrative definition ID/version.
- Last derived narrative event.
- Queued beat IDs.
- Active surface.
- Local suppression state.
- Replay selected beat.
- Clear Island 1 local narrative suppression.

No production UI and no new telemetry without separate approval.

## 18. Implementation PR stack

### PR 1 — Narrative content contract and Island 1 definitions

Goal: define read-only content contract.  
Likely files: feature flag config, new narrative types/validator/tests, `public/islands/001/narrative.json`, story manifest placeholders.  
Dependencies: none.  
Tests: validator, no reward fields, no tile-index triggers, fixture validity.  
Rollback: remove content/types/flag; no runtime behavior changed.  
Non-goals: no board integration, no UI display.

### PR 2 — Reusable dialogue surface

Goal: accessible dialogue component.  
Likely files: new component/CSS/tests near Island Run components.  
Dependencies: PR 1 optional for fixture copy.  
Tests: render, no portrait, close/skip, accessibility, reduced motion.  
Rollback: remove component; no gameplay behavior changed.  
Non-goals: no Island Run trigger wiring.

### PR 3 — Arrival and first stop wrapper

Goal: board-local observer for arrival, first objective, Hatchery intro with local suppression.  
Likely files: board hook/helper, minimal board adapter, story-reader episode state.  
Dependencies: PRs 1–2.  
Tests: arrival once, skip opens board, Hatchery intro does not complete stop, disabled flag exact current behavior.  
Rollback: flag off or remove hook; no save migration.  
Non-goals: no build or boss integration.

### PR 4 — Build reaction and finale introduction

Goal: add first restored structure ambient beat and boss-eligible finale setup/framing.  
Likely files: observer trigger helpers, narrative copy, tests.  
Dependencies: PR 3.  
Tests: build reaction does not mutate build state; boss intro does not resolve boss; collision tests.  
Rollback: flag off; suppression ignored.  
Non-goals: no boss mechanics changes.

### PR 5 — Resolution and travel wrapper

Goal: post-boss resolution episode and travel copy that never blocks clear/travel.  
Likely files: observer trigger helper, resolution manifest, StoryReader path integration, mobile QA notes.  
Dependencies: PR 4.  
Tests: boss resolved triggers resolution after gameplay result; skip does not block clear/travel; disabled flag.  
Rollback: flag off; existing clear/travel unchanged.  
Non-goals: no durable ledger, rewards, or travel action replacement.

## 19. Risk register

| Risk | Likelihood | Impact | Mitigation | Validation |
|---|---|---|---|---|
| `IslandRunBoardPrototype` size/mixed authority | High | High | Thin board-local hook; no gameplay writes | Architecture guard tests and code review |
| Modal stacking | High | High | One active narrative surface; wait on board modal flags | Integration collision tests |
| Duplicate auto-launch | Medium | Medium | Local suppression + in-session guard + queue dedupe | Repeated entry tests |
| Stale local suppression | Medium | Low | Fail open; debug clear | Manual storage corruption QA |
| Story reads mirrored state | Medium | High | Prefer canonical store/hydrated adapter; no new mirrors | Tests around store snapshots |
| Boss timing | Medium | High | Trigger only after `bossTrialResolvedIslandNumber` marker | Boss integration test |
| Island-clear conflict | High | High | Resolution waits until clear modal not active or is user-triggered | Clear/travel integration tests |
| Missing assets | High | Low | Text-only fallback; existing Island 1 art | Offline/missing asset QA |
| Mobile performance | Medium | Medium | Few assets, lazy fetch, no heavy animation | iPhone/iPad QA |
| Offline media failure | Medium | Low | Text fallback and skip | Offline QA |
| Audio overlap | Medium | Medium | Use existing services; avoid extra SFX | Audio disabled/enabled QA |
| Placeholder assets feel unfinished | High | Medium | Limit scope; identify replaceable placeholders | Product review |
| Accidental reward wiring | Medium | High | Validator rejects reward fields; pass no reward callback | Unit tests/source review |
| Tile-index trigger regression | Low | High | Trigger type excludes tile indices; validator rejects | Unit tests |

## 20. Deferred work

Explicitly deferred:

- Implementing all 30 beats.
- Full prologue rewrite unless later needed.
- Durable Supabase story ledger.
- Permanent branching.
- Crew system.
- Ship communications.
- Artefact inventory.
- World archive persistence.
- NPC movement.
- Non-combat finale mechanics.
- Layered music stems.
- All 120-island content.
- Story rewards.
- Schema migrations.
- Economy, reward, egg probability, creature-stat, boss-completion, stop-ID, save-format, or tile-index changes.

## Required final verdict

**PASS WITH CONDITIONS**

Conditions before PR 1 implementation:

1. Keep `islandRunNarrativePilotEnabled` default `false` until PR 3 integration tests pass.
2. PR 1 validator must reject reward/economy/tile-index fields before content lands.
3. PR 3 must revalidate current `IslandRunBoardPrototype` modal booleans immediately before adding the observer.
4. Arrival must not auto-open over the existing prologue reader.
5. Resolution must not open over island-clear celebration or block travel.
