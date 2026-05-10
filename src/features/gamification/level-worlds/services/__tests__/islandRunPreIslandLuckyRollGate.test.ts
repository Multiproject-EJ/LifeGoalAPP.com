import {
  getIslandRunLuckyRollSessionKey,
  type IslandRunLuckyRollSession,
  type IslandRunLuckyRollSessionsByMilestone,
} from '../islandRunGameStateStore';
import { resolveIslandRunPreIslandLuckyRollGate } from '../islandRunPreIslandLuckyRollGate';
import { assertEqual, type TestCase } from './testHarness';

function makeSession(status: IslandRunLuckyRollSession['status']): IslandRunLuckyRollSession {
  return {
    status,
    runId: `test-${status}`,
    targetIslandNumber: 60,
    cycleIndex: 2,
    position: status === 'completed' || status === 'banked' ? 29 : 0,
    rollsUsed: status === 'completed' || status === 'banked' ? 5 : 0,
    claimedTileIds: [],
    pendingRewards: [],
    bankedRewards: [],
    startedAtMs: 1000,
    bankedAtMs: status === 'banked' ? 2000 : null,
    updatedAtMs: 2000,
  };
}

function resolveWithLedger(ledger: IslandRunLuckyRollSessionsByMilestone, featureEnabled = true) {
  return resolveIslandRunPreIslandLuckyRollGate({
    featureEnabled,
    islandNumber: 60,
    cycleIndex: 2,
    luckyRollSessionsByMilestone: ledger,
  });
}

export const islandRunPreIslandLuckyRollGateTests: TestCase[] = [
  {
    name: 'feature off derives not_required even for pre-island metadata',
    run: () => {
      const gate = resolveWithLedger({}, false);
      assertEqual(gate.status, 'not_required', 'feature-off gate should not require Lucky Roll');
      assertEqual(gate.isRequired, false, 'feature-off gate should not be required');
      assertEqual(gate.blocksIslandStart, false, 'feature-off gate should not block island start');
      assertEqual(gate.sessionKey, null, 'feature-off gate should not expose a session key');
    },
  },
  {
    name: 'normal island derives not_required when feature is on',
    run: () => {
      const gate = resolveIslandRunPreIslandLuckyRollGate({
        featureEnabled: true,
        islandNumber: 12,
        cycleIndex: 0,
        luckyRollSessionsByMilestone: {},
      });
      assertEqual(gate.status, 'not_required', 'non-pre-island metadata should not require Lucky Roll');
      assertEqual(gate.blocksIslandStart, false, 'normal island should not block start');
    },
  },
  {
    name: 'pre-island target with no session derives required_missing_session',
    run: () => {
      const gate = resolveWithLedger({});
      assertEqual(gate.status, 'required_missing_session', 'missing pre-island session should require creation');
      assertEqual(gate.isRequired, true, 'pre-island gate should be required');
      assertEqual(gate.blocksIslandStart, true, 'missing session should block island start');
      assertEqual(gate.sessionKey, getIslandRunLuckyRollSessionKey(2, 60), 'session key should use cycle:island');
    },
  },
  {
    name: 'active session derives required_active',
    run: () => {
      const key = getIslandRunLuckyRollSessionKey(2, 60);
      const gate = resolveWithLedger({ [key]: makeSession('active') });
      assertEqual(gate.status, 'required_active', 'active session should be resumable and blocking');
      assertEqual(gate.blocksIslandStart, true, 'active session should block island start');
    },
  },
  {
    name: 'completed unbanked session derives required_completed_unbanked',
    run: () => {
      const key = getIslandRunLuckyRollSessionKey(2, 60);
      const gate = resolveWithLedger({ [key]: makeSession('completed') });
      assertEqual(gate.status, 'required_completed_unbanked', 'completed session should still require bank');
      assertEqual(gate.blocksIslandStart, true, 'completed unbanked session should block island start');
    },
  },
  {
    name: 'banked session derives satisfied_banked',
    run: () => {
      const key = getIslandRunLuckyRollSessionKey(2, 60);
      const gate = resolveWithLedger({ [key]: makeSession('banked') });
      assertEqual(gate.status, 'satisfied_banked', 'banked session should satisfy pre-island gate');
      assertEqual(gate.blocksIslandStart, false, 'banked session should not block island start');
    },
  },
  {
    name: 'expired session derives expired_or_blocked',
    run: () => {
      const key = getIslandRunLuckyRollSessionKey(2, 60);
      const gate = resolveWithLedger({ [key]: makeSession('expired') });
      assertEqual(gate.status, 'expired_or_blocked', 'expired session should derive blocked state');
      assertEqual(gate.blocksIslandStart, true, 'expired session should block pending product decision');
    },
  },
];
