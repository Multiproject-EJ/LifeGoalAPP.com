import { assert } from './testHarness';
import type { TestCase } from './testHarness';

declare const process: { cwd: () => string };

async function readBoardSource(): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  // @ts-ignore island-run test tsconfig omits node type libs
  const pathMod = await import('path');
  const boardPath = pathMod.resolve(process.cwd(), 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
  return fsMod.readFileSync(boardPath, 'utf8');
}

async function readBoardStageSource(): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  // @ts-ignore island-run test tsconfig omits node type libs
  const pathMod = await import('path');
  const stagePath = pathMod.resolve(process.cwd(), 'src/features/gamification/level-worlds/components/board/BoardStage.tsx');
  return fsMod.readFileSync(stagePath, 'utf8');
}

export const islandRunBoardEssenceParityTests: TestCase[] = [
  {
    name: 'encounter/boss/sanctuary/wisdom essence awards remain direct runtime-state increments (legacy parity)',
    run: async () => {
      const source = await readBoardSource();

      assert(
        source.includes("essence: prev.essence + totalEncounterEssence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + totalEncounterEssence"),
        'Encounter reward should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes("essence: prev.essence + bossReward.essence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + bossReward.essence"),
        'Boss reward should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes("essence: prev.essence + rewardEssence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + rewardEssence"),
        'Sanctuary bond rewards should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes('essence: prev.essence + WISDOM_ESSENCE_BONUS_AMOUNT') &&
          source.includes('essenceLifetimeEarned: prev.essenceLifetimeEarned + WISDOM_ESSENCE_BONUS_AMOUNT'),
        'Wisdom bonus should preserve direct runtime-state essence increment semantics.',
      );
    },
  },
  {
    name: 'legacy parity guard: board essence reward paths do not call awardContractV2Essence',
    run: async () => {
      const source = await readBoardSource();
      assert(
        !source.includes("awardContractV2Essence(totalEncounterEssence, 'encounter_reward')"),
        'Encounter reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(bossReward.essence, 'boss_trial_reward')"),
        'Boss reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(rewardEssence, 'sanctuary_bond_reward_claim')"),
        'Sanctuary bond reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(WISDOM_ESSENCE_BONUS_AMOUNT, 'wisdom_essence_bonus')"),
        'Wisdom bonus should not route via canonical helper in parity mode.',
      );
    },
  },
  {
    name: 'story and sanctuary duplicate handlers remain removed; active sanctuary/story wiring is kept',
    run: async () => {
      const source = await readBoardSource();
      assert(
        !source.includes('const handleStoryRewardClaim ='),
        'Duplicate local story reward handler should remain removed to prevent split wiring.',
      );
      assert(
        source.includes('onRewardClaim={sanctuaryHandlers.storyRewardClaim}'),
        'IslandStoryReader should remain wired to sanctuaryHandlers.storyRewardClaim.',
      );
      assert(
        !source.includes('const handleClaimSanctuaryBondReward ='),
        'Duplicate sanctuary bond-claim handler should remain removed to prevent split wiring.',
      );
      assert(
        !source.includes('const closeSanctuaryPanel ='),
        'Duplicate sanctuary close handler should remain removed to prevent split wiring.',
      );
      assert(
        !source.includes('const handleSetActiveCompanion ='),
        'Duplicate sanctuary set-active handler should remain removed to prevent split wiring.',
      );
      assert(
        !source.includes('const handleOpenSanctuaryCreature ='),
        'Duplicate sanctuary open handler should remain removed to prevent split wiring.',
      );
      assert(
        !source.includes('const handleFeedSanctuaryCreature ='),
        'Duplicate sanctuary feed handler should remain removed to prevent split wiring.',
      );
      assert(
        source.includes('onClick={() => sanctuaryHandlers.claimBondReward('),
        'Sanctuary claim UI should remain wired to sanctuaryHandlers.claimBondReward.',
      );
      assert(
        source.includes('onClick={() => sanctuaryHandlers.feedCreature('),
        'Sanctuary feed UI should remain wired to sanctuaryHandlers.feedCreature.',
      );
      assert(
        source.includes('onClick={() => sanctuaryHandlers.openCreature('),
        'Sanctuary open UI should remain wired to sanctuaryHandlers.openCreature.',
      );
      assert(
        source.includes('onClick={() => sanctuaryHandlers.setActiveCompanion('),
        'Sanctuary set-active UI should remain wired to sanctuaryHandlers.setActiveCompanion.',
      );
      assert(
        source.includes('onClick={sanctuaryHandlers.closePanel}'),
        'Sanctuary close UI should remain wired to sanctuaryHandlers.closePanel.',
      );
    },
  },
  {
    name: 'roll sync guard: passive regen is gated while roll/hop sync is in-flight',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes("const isRollSyncPendingRef = useRef(false);"),
        'Board should track roll-sync pending window for stale-writer gating.',
      );
      assert(
        source.includes("if (reason !== 'pre_roll' && (isAnimatingRollRef.current || isRollSyncPendingRef.current))"),
        'Passive regen should skip interval/focus/visibility ticks while roll/hop sync is active.',
      );
      assert(
        source.includes('isRollSyncPendingRef.current = true;') &&
          source.includes('isRollSyncPendingRef.current = false;'),
        'Roll handler should bracket post-roll sync window with pending flag set/clear.',
      );
    },
  },
  {
    name: 'roll sync guard: hydration/reconcile paths skip token snapshot publish while roll sync is pending',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes('if (isAnimatingRollRef.current || isRollSyncPendingRef.current) {'),
        'Reconcile guard should block while roll animation OR roll-sync pending is active.',
      );
      assert(
        source.includes("logIslandRunEntryDebug('island_run_runtime_reconcile_skipped_roll_sync_pending'"),
        'Roll-sync reconcile skip should emit diagnostics for token overwrite investigations.',
      );
      assert(
        source.includes("skipReason: 'roll_sync_pending'"),
        'Roll-sync reconcile skip diagnostics should label the reason as roll_sync_pending.',
      );
    },
  },
  {
    name: 'tile reward success path updates visible runtimeState essence mirror (not only error path)',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes("if (result.status !== 'ok') return;"),
        'Tile reward success path guard should exist before runtime mirror sync.',
      );
      assert(
        source.includes('essence: result.essence') &&
          source.includes('essenceLifetimeEarned: result.essenceLifetimeEarned') &&
          source.includes('essenceLifetimeSpent: result.essenceLifetimeSpent'),
        'Tile reward success path should hydrate runtimeState essence fields from result.',
      );
      assert(
        source.includes('runtimeStateRef.current = nextRuntimeState;'),
        'Tile reward success path should sync runtimeStateRef immediately for read-after-write safety.',
      );
      assert(
        source.includes('refreshIslandRunStateFromLocal(session);'),
        'Tile reward success path should refresh the canonical store mirror so later store commits cannot replay stale essence.',
      );
      assert(
        source.includes('setRuntimeState(readIslandRunRuntimeState(session));'),
        'Error path fallback sync should remain present (separate from success-path mirror sync).',
      );
    },
  },
  {
    name: 'passive regen pre-roll no-op should return fresh store dice for immediate roll affordability',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes('if (!regenTick.changed) {') &&
          source.includes("logIslandRunEntryDebug('dice_regen_noop_skipped_runtime_sync'"),
        'Passive regen should explicitly short-circuit no-op ticks before full runtime mirror writes.',
      );
      assert(
        source.includes('const ISLAND_RUN_REGEN_INTERVAL_NOOP_LOG_THROTTLE_MS = 45_000;') &&
          source.includes('const isIntervalNoop = reason === \'interval\';') &&
          source.includes('suppressedIntervalNoopLogs'),
        'Passive regen interval no-op diagnostics should be throttled and report suppressed counts to reduce log spam.',
      );
      assert(
        source.includes('runtimeStateRef.current = nextRuntimeState;') &&
          source.includes('return nextRuntimeState.dicePool;'),
        'Passive regen no-op should return fresh store dice so immediate post-purchase roll checks cannot read stale zero dice.',
      );
    },
  },
  {
    name: 'build spend UI path serializes taps/hold and uses canonical latest snapshot checks',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes('const isBuildSpendInFlightRef = useRef(false);') &&
          source.includes('if (isBuildSpendInFlightRef.current) return false;'),
        'Build spend should include an in-flight guard to prevent overlapping stop_build_spend commits.',
      );
      assert(
        source.includes('const batchResult = await applyStopBuildSpendBatch({') &&
          source.includes('const latestRuntimeState = getIslandRunStateSnapshot(session);'),
        'Build spend should await the canonical batch action and recompute from latest store snapshot before each spend.',
      );
      assert(
        source.includes('while (holdBuildSpendActiveRef.current) {') &&
          source.includes('const holdBatchSteps = resolveBuildHoldBatchSteps(heldMs);') &&
          source.includes('const spendApplied = await handleSpendEssenceOnBuild(idx, holdBatchSteps);') &&
          source.includes('await wait(BUILD_HOLD_INITIAL_DELAY_MS);') &&
          source.includes('await wait(resolveBuildHoldRepeatDelayMs(heldMs));') &&
          !source.includes('holdInterval = window.setInterval(() => {'),
        'Hold-to-build should sequence spends by awaiting each spend result rather than firing blind interval commits.',
      );
      assert(
        source.includes('const BUILD_HOLD_INITIAL_DELAY_MS = 400;') &&
          source.includes('if (heldMs >= 3_000) return 4;') &&
          source.includes('if (heldMs >= 1_500) return 2;') &&
          source.includes('if (heldMs >= 3_000) return 95;') &&
          source.includes('if (heldMs >= 1_500) return 150;') &&
          source.includes('return 250;'),
        'Hold-to-build should use accelerating batch and delay curves as hold duration increases.',
      );
      assert(
        source.includes('aria-disabled={isBuildDisabled}') &&
          source.includes('const isBuildDisabled = isFullyBuilt || !canAfford || isBuildSpendInFlight;') &&
          source.includes('⚒️ Max build…'),
        'Build button should expose a busy/disabled state while build spend is in-flight and provide hold feedback.',
      );
    },
  },
  {
    name: 'hydration/reconcile runtime sync should publish hydrated record to store mirror (no stale local refresh)',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes('resetIslandRunStateSnapshot(session, hydrationResult.state);'),
        'Hydration/reconcile flows should publish hydrated record directly to store mirror.',
      );
    },
  },
  {
    name: 'completed-stop sync effect pre-dispatch guard prevents no-op action calls',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes('const normalizedCompletedStops = normalizeCompletedStopsForSync(completedStops);') &&
          source.includes('if (areStringArraysEqual(persistedStops, normalizedCompletedStops)) {'),
        'Completed-stop sync effect should short-circuit semantic no-op BEFORE dispatch.',
      );
      assert(
        source.includes('const dispatchKey = `${islandKey}::${normalizedCompletedStops.join(\'|\')}`;'),
        'Completed-stop sync effect should build a stable dispatch key for rerender dedupe.',
      );
      assert(
        source.includes('const completedStopsSyncRequestedRef = useRef(false);') &&
          source.includes('if (!completedStopsSyncRequestedRef.current) return;'),
        'Completed-stop sync effect should require an explicit sync request before dispatching.',
      );
      assert(
        source.includes('const changed = !areStringArraysEqual(current, next);') &&
          source.includes('if (changed && options?.requestSync !== false) {'),
        'updateCompletedStops should request sync only when completedStops actually changed.',
      );
      assert(
        source.includes('const [hasCompletedStopsHydrationGate, setHasCompletedStopsHydrationGate] = useState(false);') &&
          source.includes('if (!hasCompletedStopsHydrationGate) return;') &&
          source.includes('completedStopsSyncRequestedRef.current = false;'),
        'Completed-stop sync effect should remain blocked until hydration gate opens and should drop hydration-time sync requests.',
      );
      assert(
        source.includes('if (completedStopsSyncDispatchKeyRef.current === dispatchKey) {') &&
          source.includes('completedStopsSyncDispatchKeyRef.current = dispatchKey;'),
        'Completed-stop sync effect should suppress repeated dispatch while the same target sync is in flight.',
      );
      assert(
        source.includes('const nextRuntimeState = syncCompletedStopsForIsland({'),
        'Completed-stop sync effect should still dispatch once when a semantic difference exists.',
      );
    },
  },
  {
    name: 'market-owned bundle sync effect pre-dispatch guard prevents no-op action calls',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes('const marketOwnedBundleSyncRequestedRef = useRef(false);') &&
          source.includes('if (!marketOwnedBundleSyncRequestedRef.current) return;'),
        'Market-owned bundle sync effect should require an explicit sync request before dispatching.',
      );
      assert(
        source.includes('const [hasMarketOwnedBundleHydrationGate, setHasMarketOwnedBundleHydrationGate] = useState(false);') &&
          source.includes('if (!hasMarketOwnedBundleHydrationGate) return;') &&
          source.includes('marketOwnedBundleSyncRequestedRef.current = false;'),
        'Market-owned bundle sync effect should remain blocked until hydration gate opens and should drop hydration-time sync requests.',
      );
      assert(
        source.includes('const dispatchKey = `${islandKey}::dice_bundle:${localOwned ? 1 : 0}`;') &&
          source.includes('if (marketOwnedBundleSyncDispatchKeyRef.current === dispatchKey) {') &&
          source.includes('marketOwnedBundleSyncDispatchKeyRef.current = dispatchKey;'),
        'Market-owned bundle sync effect should suppress repeated dispatch while the same target sync is in flight.',
      );
      assert(
        source.includes('if (persistedOwned === localOwned) {'),
        'Market-owned bundle sync effect should short-circuit semantic no-op BEFORE dispatch.',
      );
    },
  },
  {
    name: 'landing burst FX should be anchored to landing tile position (not stale token anim state)',
    run: async () => {
      const stageSource = await readBoardStageSource();
      assert(
        stageSource.includes('setBurstPos({ x: pos.x, y: pos.y });'),
        'Landing burst should use resolved landing-tile screen position.',
      );
      assert(
        !stageSource.includes('setBurstPos({ x: tokenAnim.animState.x, y: tokenAnim.animState.y });'),
        'Landing burst should not read tokenAnim.animState in onLand callback (can be one frame stale).',
      );
    },
  },
];
