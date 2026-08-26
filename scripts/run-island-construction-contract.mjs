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
  const requiredTests = [
    'builds Island 014 as a source-specific Honeycomb Kingdom with five additive landmarks',
    'finishes landmark levels with one bounded pop and reduced-motion-safe sparkle beat',
    'requires authored five-stage landmark construction across Islands 002 through 010 and Island 014',
  ]

  for (const testName of requiredTests) {
    const test = module.island5ThreePilotContractTests.find((candidate) => candidate.name === testName)
    assert.ok(test, `focused Island 014 contract test is missing: ${testName}`)
    await test.run()
    console.log(`PASS ${test.name}`)
  }

  const missionModule = await server.ssrLoadModule(
    '/src/features/gamification/level-worlds/services/__tests__/islandRunSignatureMissions.test.ts',
  )
  const requiredMissionTests = [
    'Honeycomb Kingdom places four visible royal-nectar pickups away from landmark doors and caps collection',
    'Great Honeyfall activation spends one nectar per reservoir and completes exactly once',
    'Great Honeyfall sanitizer and conflict merge preserve furthest coronation stage',
  ]
  for (const testName of requiredMissionTests) {
    const test = missionModule.islandRunSignatureMissionTests.find((candidate) => candidate.name === testName)
    assert.ok(test, `focused Island 014 signature mission test is missing: ${testName}`)
    await test.run()
    console.log(`PASS ${test.name}`)
  }
} finally {
  await server.close()
}
