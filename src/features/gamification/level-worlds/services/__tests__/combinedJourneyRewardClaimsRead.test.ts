import { fetchClaimedJourneyThresholds } from '../combinedJourneyRewardClaimsRead';
import { assert, assertEqual, type TestCase } from './testHarness';

function makeClient(response: { data: unknown; error: unknown }) {
  let selectedTable: string | null = null;
  const client = {
    from(table: string) {
      selectedTable = table;
      return {
        select: async (_columns: string) => response,
      };
    },
    selectedTable: () => selectedTable,
  };
  return client;
}

export const combinedJourneyRewardClaimsReadTests: TestCase[] = [
  {
    name: 'returns an empty list when there is no client',
    run: async () => {
      const result = await fetchClaimedJourneyThresholds(null);
      assertEqual(result.length, 0, 'null client yields no claims');
    },
  },
  {
    name: 'reads threshold levels from the claims table',
    run: async () => {
      const client = makeClient({ data: [{ threshold_level: 2 }, { threshold_level: 5 }], error: null });
      const result = await fetchClaimedJourneyThresholds(client as never);
      assertEqual(client.selectedTable(), 'combined_journey_reward_claims', 'reads the claims ledger');
      assert(result.includes(2) && result.includes(5), 'returns the claimed thresholds');
      assertEqual(result.length, 2, 'returns exactly the claimed rows');
    },
  },
  {
    name: 'degrades to an empty list on query error',
    run: async () => {
      const client = makeClient({ data: null, error: { message: 'boom' } });
      const result = await fetchClaimedJourneyThresholds(client as never);
      assertEqual(result.length, 0, 'errors degrade gracefully to no claims');
    },
  },
  {
    name: 'skips malformed rows',
    run: async () => {
      const client = makeClient({ data: [{ threshold_level: 3 }, { threshold_level: 'x' }, {}], error: null });
      const result = await fetchClaimedJourneyThresholds(client as never);
      assertEqual(result.length, 1, 'only well-formed thresholds are returned');
      assertEqual(result[0], 3, 'keeps the valid threshold');
    },
  },
];
