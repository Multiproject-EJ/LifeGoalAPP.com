import { getWelcomePackEligibility, isWelcomePackClaimed } from '../islandRunWelcomePackEligibility';
import { readIslandRunGameStateRecord } from '../islandRunGameStateStore';
import { assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'welcome-pack-state-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: USER_ID, user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

export const islandRunWelcomePackEligibilityTests: TestCase[] = [
  {
    name: 'default/fresh state is unclaimed and eligible',
    run: () => {
      installWindowWithStorage(createMemoryStorage());
      const record = readIslandRunGameStateRecord(makeSession());
      assertEqual(isWelcomePackClaimed(record), false, 'fresh record should default to unclaimed');
      assertEqual(getWelcomePackEligibility(record), 'eligible', 'fresh record should be eligible');
    },
  },
  {
    name: 'claimed state is not eligible',
    run: () => {
      assertEqual(isWelcomePackClaimed({ welcomePackClaimed: true }), true, 'claimed marker should be true');
      assertEqual(getWelcomePackEligibility({ welcomePackClaimed: true }), 'already_claimed', 'claimed marker should not be eligible');
    },
  },
  {
    name: 'legacy saved state without welcomePackClaimed stays backward-compatible',
    run: () => {
      installWindowWithStorage(createMemoryStorage());
      const session = makeSession();
      window.localStorage.setItem(`island_run_runtime_state_${USER_ID}`, JSON.stringify({ runtimeVersion: 7, dicePool: 9 }));
      const record = readIslandRunGameStateRecord(session);
      assertEqual(record.welcomePackClaimed, false, 'missing field should sanitize to false');
      assertEqual(getWelcomePackEligibility(record), 'eligible', 'legacy row should remain eligible');
    },
  },
];
