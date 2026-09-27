import { assert, assertEqual, type TestCase } from './testHarness';
import {
  FISHERMANS_DRAGON_CINEMATIC_SECONDS,
  FISHING_FORCE_CLOSE_STALLS,
  FISHING_PHASE_STALL_MS,
  resolveFishermansDragonElapsedSeconds,
  resolveFishingStall,
  type FishingPhase,
} from '../fishermansFishingWatchdog';

const stalled = (phase: FishingPhase, extra: Partial<Parameters<typeof resolveFishingStall>[0]> = {}) => resolveFishingStall({
  phase, stalledMs: FISHING_PHASE_STALL_MS[phase] + 1, stallCount: 0, pendingKind: 'small', actionInFlight: false, ...extra,
});

export const fishermansFishingWatchdogTests: TestCase[] = [
  {
    name: 'fishing watchdog: every phase has an exit, so the controller can never stay hidden',
    run: () => {
      const phases: FishingPhase[] = ['off', 'approach', 'casting', 'waiting', 'countdown', 'bite', 'reeling', 'caught', 'escaped'];
      for (const phase of phases) {
        assertEqual(resolveFishingStall({ phase, stalledMs: 100, stallCount: 0, pendingKind: 'small', actionInFlight: false }), 'wait', `${phase}: waits while fresh`);
        assert(stalled(phase) !== 'wait', `${phase}: acts once stalled`);
        assertEqual(stalled(phase, { stallCount: FISHING_FORCE_CLOSE_STALLS }), 'force_close', `${phase}: repeated stalls force-close`);
        assertEqual(stalled(phase, { stallCount: FISHING_FORCE_CLOSE_STALLS, actionInFlight: true }), 'force_close', `${phase}: even a hung request cannot block the force-close`);
      }
    },
  },
  {
    name: 'fishing watchdog: a stuck countdown reaches the bite, empty hooks release, walked-away bites escape',
    run: () => {
      assertEqual(stalled('countdown'), 'advance_to_bite', 'stuck countdown moves on to the bite');
      assertEqual(stalled('countdown', { pendingKind: 'nothing' }), 'release_empty', 'stuck empty hook releases');
      assertEqual(stalled('bite'), 'release_escaped', 'no taps for a long time: the fish escapes');
      assertEqual(stalled('caught', { pendingKind: null }), 'close', 'settled with nothing pending closes');
      assertEqual(stalled('escaped', { pendingKind: 'large' }), 'release_escaped', 'a settle that never landed is retried');
      assertEqual(stalled('reeling', { actionInFlight: true }), 'wait', 'waits for an in-flight reel');
    },
  },
  {
    name: 'fishing watchdog: the dragon plays once from its trigger time and is settled on later visits',
    run: () => {
      const trigger = 1_000_000;
      assertEqual(resolveFishermansDragonElapsedSeconds({ fishCaughtKg: 80, dragonTriggeredAtMs: trigger, nowMs: trigger + 5_000 }), 5, 'live: five seconds in');
      assert(resolveFishermansDragonElapsedSeconds({ fishCaughtKg: 80, dragonTriggeredAtMs: trigger, nowMs: trigger + 86_400_000 }) > FISHERMANS_DRAGON_CINEMATIC_SECONDS, 'a later visit is past the cinematic');
      assert(resolveFishermansDragonElapsedSeconds({ fishCaughtKg: 80, dragonTriggeredAtMs: null, nowMs: trigger }) > FISHERMANS_DRAGON_CINEMATIC_SECONDS, 'missing trigger time never locks the board');
      assertEqual(resolveFishermansDragonElapsedSeconds({ fishCaughtKg: 20, dragonTriggeredAtMs: null, nowMs: trigger }), 0, 'before the dragon');
    },
  },
  {
    name: 'fishing watchdog: the board wires the watchdog, and the countdown only restarts on phase changes',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('resolveFishingStall({'), 'the stall watchdog runs');
      assert(board.includes("  }, [fishingPhase, showFishermansFishing]);\n\n  useEffect(() => {\n    const pending = fishermansFishingProgress.pendingCatch;"), 'countdown deps are phase + visibility only');
      assert(board.includes('resolveFishermansDragonElapsedSeconds({'), 'dragon time is measured from its trigger');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes('< FISHERMANS_DRAGON_CINEMATIC_SECONDS)'), 'scene and board share the cinematic length');
    },
  },
];
