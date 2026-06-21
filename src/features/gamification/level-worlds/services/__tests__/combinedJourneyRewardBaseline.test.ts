import { ensureJourneyBaseline } from '../combinedJourneyRewardBaseline';
import { assertEqual, type TestCase } from './testHarness';

function makeClient(response: { data: unknown; error: unknown }) {
  let lastArgs: { name: string; params: Record<string, unknown> } | null = null;
  const client = {
    rpc: async (name: string, params: Record<string, unknown>) => {
      lastArgs = { name, params };
      return response;
    },
    lastArgs: () => lastArgs,
  };
  return client;
}

export const combinedJourneyRewardBaselineTests: TestCase[] = [
  {
    name: 'returns null without a client',
    run: async () => {
      const result = await ensureJourneyBaseline(null, 5);
      assertEqual(result, null, 'no client yields a null baseline');
    },
  },
  {
    name: 'records the level and returns the effective baseline',
    run: async () => {
      const client = makeClient({ data: 4, error: null });
      const result = await ensureJourneyBaseline(client as never, 7);
      assertEqual(result, 4, 'returns the baseline reported by the RPC');
      assertEqual(client.lastArgs()?.name, 'ensure_combined_journey_baseline', 'calls the baseline RPC');
      assertEqual(client.lastArgs()?.params.p_level, 7, 'passes the sanitized level');
    },
  },
  {
    name: 'clamps a negative/fractional level when calling the RPC',
    run: async () => {
      const client = makeClient({ data: 0, error: null });
      await ensureJourneyBaseline(client as never, -3.9);
      assertEqual(client.lastArgs()?.params.p_level, 0, 'negative level clamps to 0');
    },
  },
  {
    name: 'degrades to null on RPC error',
    run: async () => {
      const client = makeClient({ data: null, error: { message: 'boom' } });
      const result = await ensureJourneyBaseline(client as never, 5);
      assertEqual(result, null, 'errors degrade to a null (not-ready) baseline');
    },
  },
];
