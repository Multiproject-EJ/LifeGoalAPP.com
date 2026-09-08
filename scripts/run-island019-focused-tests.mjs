import { createServer } from 'vite';

// Fresh-source regression runner for this bounded presentation module. The
// complete Island Run harness remains the release gate for main integration.
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, logLevel: 'error' });
try {
  const { island19CoasterCarnivalRepresentativeSliceTests: tests } = await server.ssrLoadModule('/src/features/gamification/level-worlds/services/__tests__/island19CoasterCarnivalRepresentativeSlice.test.ts');
  let failed = 0;
  for (const test of tests) {
    try { await test.run(); console.log('PASS', test.name); }
    catch (error) { failed += 1; console.error('FAIL', test.name, error); }
  }
  console.log(`${tests.length - failed}/${tests.length} Island 019 tests passed`);
  if (failed) process.exitCode = 1;
} finally { await server.close(); }
