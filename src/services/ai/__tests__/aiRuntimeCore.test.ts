import type { AiTaskKey } from '../../aiTaskKeys';
import { createAiRuntime, extractJson, type AiRuntimeAdapters, type AiTaskRequest } from '../aiRuntimeCore';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

type Calls = { onDevice: number; server: number; entitled: number };

function makeRuntime(overrides: Partial<AiRuntimeAdapters> = {}) {
  const calls: Calls = { onDevice: 0, server: 0, entitled: 0 };
  const runtime = createAiRuntime({
    isOnDeviceTask: (task: AiTaskKey) => !task.startsWith('conflict_'),
    isOnDeviceAvailable: async () => true,
    generateOnDevice: async () => {
      calls.onDevice += 1;
      return 'device text';
    },
    isServerAvailable: () => true,
    isServerEntitled: () => {
      calls.entitled += 1;
      return true;
    },
    callServer: async () => {
      calls.server += 1;
      return { text: 'server text', model: 'gpt-4o-mini', tokenInput: 10, tokenOutput: 5 };
    },
    now: () => 0,
    onDeviceTimeoutMs: 50,
    ...overrides,
  });
  return { runtime, calls };
}

const baseRequest: AiTaskRequest = {
  task: 'habit_rationale_rewrite',
  instructions: 'Be kind.',
  prompt: 'Data',
  maxTokens: 100,
  temperature: 0.5,
  timeoutMs: 50,
};

async function testOnDeviceFirst() {
  const { runtime, calls } = makeRuntime();
  const result = await runtime.runAiTask(baseRequest);
  assertEqual(result?.source, 'on_device', 'uses the device model when available');
  assertEqual(result?.text, 'device text', 'returns device text');
  assertEqual(calls.server, 0, 'does not call the server when the device answered');
  assertEqual(calls.entitled, 0, 'on-device use does not consume server quota');
}

async function testFallsBackWhenDeviceUnavailable() {
  const { runtime, calls } = makeRuntime({ isOnDeviceAvailable: async () => false });
  const result = await runtime.runAiTask(baseRequest);
  assertEqual(result?.source, 'server', 'falls back to the server');
  assertEqual(calls.onDevice, 0, 'does not try generation on an ineligible device');
  assertEqual(result?.model, 'gpt-4o-mini', 'reports the server model');
}

async function testFallsBackWhenDeviceFails() {
  const { runtime } = makeRuntime({
    generateOnDevice: async () => {
      throw new Error('GENERATION_FAILED');
    },
  });
  const result = await runtime.runAiTask(baseRequest);
  assertEqual(result?.source, 'server', 'a device error falls back to the server');
}

async function testDeviceTimeout() {
  const { runtime } = makeRuntime({
    generateOnDevice: () => new Promise<string>(() => undefined),
  });
  const result = await runtime.runAiTask(baseRequest);
  assertEqual(result?.source, 'server', 'a hung device call times out and falls back');
}

async function testServerOnlyTask() {
  const { runtime, calls } = makeRuntime();
  const result = await runtime.runAiTask({ ...baseRequest, task: 'conflict_shared_mediation', entitlementChecked: true });
  assertEqual(result?.source, 'server', 'server-only tasks skip the device');
  assertEqual(calls.onDevice, 0, 'device never called for server-only tasks');
  assertEqual(calls.entitled, 0, 'pre-checked entitlement is not consumed twice');
}

async function testNothingAvailable() {
  const { runtime } = makeRuntime({
    isOnDeviceAvailable: async () => false,
    isServerAvailable: () => false,
  });
  assertEqual(await runtime.runAiTask(baseRequest), null, 'returns null so callers use their fallback');
  assertEqual(await runtime.isAiAvailableFor('habit_rationale_rewrite'), false, 'reports AI unavailable');
}

async function testNotEntitled() {
  const { runtime, calls } = makeRuntime({
    isOnDeviceAvailable: async () => false,
    isServerEntitled: () => false,
  });
  assertEqual(await runtime.runAiTask(baseRequest), null, 'no server call without entitlement');
  assertEqual(calls.server, 0, 'server not called when quota is exhausted');
}

async function testJsonRetriesOnServer() {
  const { runtime, calls } = makeRuntime({
    generateOnDevice: async () => 'Sure! Here is an idea without JSON.',
    callServer: async () => ({ text: '{"title":"Walk"}', model: 'gpt-4o-mini', tokenInput: null, tokenOutput: null }),
  });
  const result = await runtime.runAiJsonTask(baseRequest, (value) => {
    const title = (value as { title?: unknown } | null)?.title;
    return typeof title === 'string' ? { title } : null;
  });
  assertEqual(result?.source, 'server', 'invalid device JSON is retried on the server');
  assertEqual(result?.value.title, 'Walk', 'returns the validated server value');
  assertEqual(calls.entitled, 1, 'the server retry is gated by entitlement');
}

async function testJsonOnDevice() {
  const { runtime } = makeRuntime({
    generateOnDevice: async () => '```json\n{"title":"Stretch"}\n```',
  });
  const result = await runtime.runAiJsonTask(baseRequest, (value) => {
    const title = (value as { title?: unknown } | null)?.title;
    return typeof title === 'string' ? { title } : null;
  });
  assertEqual(result?.source, 'on_device', 'fenced device JSON is accepted');
  assertEqual(result?.value.title, 'Stretch', 'parses fenced JSON');
}

function testExtractJson() {
  assertEqual((extractJson('{"a":1}') as { a: number }).a, 1, 'parses plain JSON');
  assertEqual((extractJson('Here you go: {"a":2} Enjoy!') as { a: number }).a, 2, 'extracts embedded JSON');
  assertEqual(extractJson('no json here'), null, 'returns null without JSON');
  assert(extractJson('{broken') === null, 'returns null for broken JSON');
}

export async function runAiRuntimeCoreTests(): Promise<void> {
  testExtractJson();
  await testOnDeviceFirst();
  await testFallsBackWhenDeviceUnavailable();
  await testFallsBackWhenDeviceFails();
  await testDeviceTimeout();
  await testServerOnlyTask();
  await testNothingAvailable();
  await testNotEntitled();
  await testJsonRetriesOnServer();
  await testJsonOnDevice();
}
