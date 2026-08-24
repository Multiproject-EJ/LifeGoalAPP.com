import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
})

try {
  const module = await server.ssrLoadModule(
    '/src/features/gamification/level-worlds/services/__tests__/island5ThreePilotContract.test.ts',
  )
  const test = module.island5ThreePilotContractTests.find((candidate) => (
    candidate.name === 'requires authored five-stage landmark construction across Islands 002 through 010'
  ))
  assert.ok(test, 'focused island construction contract test is missing')
  await test.run()
  console.log(`PASS ${test.name}`)
} finally {
  await server.close()
}
