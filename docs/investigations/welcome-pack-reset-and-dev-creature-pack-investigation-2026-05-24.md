# Welcome Pack reset + dev creature pack investigation (2026-05-24)

## Scope
Investigate post-rollout behavior where:
1. User resets Island Run from Settings.
2. Welcome Pack does not auto-show afterwards.
3. Dev creature pack buttons appear to do nothing.

## Root cause summary
- The **Settings reset flow does reset both Welcome Pack markers to `false`** (`welcomePackClaimed`, `welcomePackRewardBundleClaimed`) by rebuilding a fresh runtime record in `buildFreshIslandRunRecord` and persisting it. This indicates the reset path itself is not preserving stale Welcome Pack claim markers.
- The Welcome Pack modal auto-show gate only depends on:
  - welcome pack eligibility (`welcomePackClaimed === false`),
  - same-session dismiss suppression,
  - current visibility,
  - and whether first-session creature pack modal is visible.
- Therefore, if reset really succeeded and modal still did not auto-show, the most likely causes are:
  1) reset did not persist/refresh as expected for that user session, or
  2) first-session creature pack modal priority blocked it at that moment, or
  3) same-session dismiss flag remained true inside the same mounted board session.
- Dev creature pack buttons are **working via canonical action services**, but are **idempotent per island+cycle grantId**, so repeated clicks quickly return `already_granted` (no new rewards), which can look like “nothing happened.”

## Question-by-question findings

### 1) What Settings “reset 120 islands” currently resets

`resetIslandRunProgress` creates and writes a fresh record via `buildFreshIslandRunRecord`.

**It resets to fresh defaults:**
- `welcomePackClaimed: false`
- `welcomePackRewardBundleClaimed: false`
- `creatureCollection: []`
- `minigameTicketsByEvent: {}`
- `dicePool: 30`
- `essence: 0`
- `firstSessionTutorialState: ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE`
- plus eggs/stops/boss/reward-bar/progression fields.

It also clears persisted creature collection and treat inventory localStorage keys.

### 2) If reset did not reset Welcome Pack markers, intentional or bug?

Current code **does reset them** in production reset flow.

Interpretation:
- If product wants “full fresh start” semantics, current behavior is intentional and aligned.
- If product wants “real users only claim once ever,” then current production reset semantics are likely too permissive and should move to dev-only or dedicated admin reset behavior.

Given current Settings copy (“reset your 120-island progress… fresh start”), resetting Welcome Pack markers appears consistent with messaging.

### 3) Why Welcome Pack did not auto-show after reset

Auto-show logic is straightforward:
- eligibility from `getWelcomePackEligibility(record)` returns `'eligible'` iff `welcomePackClaimed === false`.
- `shouldAutoShowWelcomePackModal` then requires:
  - eligible,
  - not dismissed this session,
  - not already visible,
  - no higher-priority onboarding modal visible.

In `IslandRunBoardPrototype`, higher-priority is wired to `showFirstCreaturePackModal`.

So exact blocking reasons in code are limited to:
- `welcomePackClaimed` true,
- `welcomePackDismissedThisSession` true,
- `showWelcomePackModal` already true,
- `showFirstCreaturePackModal` true.

There is no separate “island freshness” predicate inside Welcome Pack eligibility today.

### 4) Why dev creature pack buttons appear to do nothing

Debug panel buttons call board handlers that call canonical actions:
- “Grant demo Creature Pack” -> `grantDevDemoCreaturePack`
- “Open Creature Pack prototype” -> `grantDevDemoCreaturePackOpeningPrototype`
- “Grant demo Egg Reward Pack” -> `grantDevDemoEggRewardPack`

All route through `grantAdminDevCreaturePack` with:
- `allowGrant: isDevModeEnabled`
- strict validation and idempotency marker detection.

Key behavior that can look like no-op:
- grantIds are deterministic and include island+cycle (e.g. `dev_demo_creature_pack_v1:${island}:${cycle}`),
- once granted, subsequent clicks return `already_granted` and grant zero new rewards.

So this is likely expected idempotent behavior, not disconnected buttons.

### 5) Welcome Pack dev preview discoverability after rename

Still present:
- Debug panel has **“Open Welcome Pack prototype”** button.
- It calls `onOpenDevWelcomePackPrototype` -> board `handleOpenWelcomePackModal`.
- That opens `WelcomePackModal` and labels it as dev preview.

So the preview path exists and is wired.

## Current behavior conclusions

- **Reset flow behavior:** currently resets Welcome Pack markers and creature/ticket/economy/tutorial state as a full fresh start.
- **Welcome Pack auto-show failure likely source:** runtime gating state during/after reset session (dismiss or first-session pack modal priority), or reset persistence/hydration not reflecting expected post-reset record in that user run.
- **Dev creature pack “nothing happened”:** likely idempotent `already_granted` responses for same island+cycle grant ids.

## Recommended safest fix path

### Recommendation: combine **C + D** (smallest risk)

1. **C: Add explicit dev/admin “Reset Welcome Pack claim markers” control**
   - Keeps production idempotency guarantees intact.
   - Improves deterministic QA/repro workflows.
   - Avoids changing semantics of user-facing Settings reset unless product explicitly wants that.

2. **D: Improve dev pack UX feedback for `already_granted`**
   - Surface `already_granted` message more prominently in debug panel and optionally include current creature deltas.
   - Reduces false perception that buttons are broken.

### Optional product decision
- If PM wants full fresh-start in production to include Welcome Pack replay, keep current behavior (A).
- If PM wants anti-abuse “once lifetime” semantics even after user reset, switch production reset to preserve markers and move replay ability behind dev/admin controls only (B + C).

## Minimal PR plan (no economy changes)
1. Add a dedicated debug/admin action to clear only `welcomePackClaimed` + `welcomePackRewardBundleClaimed` and optionally session-dismiss UI flag.
2. Add debug panel button for that action (dev mode only).
3. Improve debug panel action result copy for dev pack grants (especially `already_granted`).
4. Add/adjust tests for:
   - marker reset action idempotency,
   - grant buttons showing expected statuses,
   - onboarding auto-show gate behavior when first-session modal active.

## Files inspected
- `src/features/gamification/GamificationSettings.tsx`
- `src/features/gamification/level-worlds/services/islandRunProgressReset.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackEligibility.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackOnboardingUi.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackClaimAction.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackRewardBundleAction.ts`
- `src/features/gamification/level-worlds/services/islandRunWelcomePackFullClaimAction.ts`
- `src/features/gamification/level-worlds/services/islandRunAdminDevPackGrantAction.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/IslandRunDebugPanel.tsx`
- `src/features/gamification/level-worlds/components/WelcomePackModal.tsx`
