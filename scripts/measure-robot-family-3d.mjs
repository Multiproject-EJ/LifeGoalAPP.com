import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
})

try {
  const module = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/RobotFamilyThreeModel.ts')
  const theatreModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/RobotConstructionTheatre.ts')
  const familyMetrics = {}
  for (const quality of ['high', 'low']) {
    const model = module.createRobotFamilyModel({ quality })
    familyMetrics[quality] = { ...model.metrics }
    console.log(`${quality.toUpperCase()} ${JSON.stringify(model.metrics)}`)
    model.dispose()
  }

  assert.ok(familyMetrics.low.triangles <= 40_000, `low family exceeds 40k triangle ceiling: ${familyMetrics.low.triangles}`)
  assert.ok(familyMetrics.low.drawCalls <= 60, `low family exceeds 60 draw-call ceiling: ${familyMetrics.low.drawCalls}`)

  const family = module.createRobotFamilyModel({ quality: 'low' })
  const theatre = theatreModule.createRobotConstructionTheatre({
    family,
    quality: 'low',
    showBuildingEnvelope: false,
  })
  theatre.setPresentation({ active: false, working: false, phase: 'arrive', progress: 0, sequence: 0 })
  assert.equal(theatre.root.visible, false, 'inactive construction theatre must remain outside renderer traversal')
  assert.equal(theatre.metrics.visibleTriangles, 0, 'inactive construction theatre must report zero visible triangles')
  assert.equal(theatre.metrics.visibleDrawCalls, 0, 'inactive construction theatre must report zero visible draw calls')
  theatre.setCrewScale(0.34)
  assert.equal(theatre.root.userData.crewScale, 0.34, 'live miniature crew scale must be honored exactly')

  const envelopes = [
    { id: 'hatchery', radius: 2.8, height: 2.6 },
    { id: 'habit', radius: 2.6, height: 4 },
    { id: 'mystery', radius: 2.4, height: 3.5 },
    { id: 'wisdom', radius: 2.7, height: 3.8 },
    { id: 'boss', radius: 3.4, height: 2.4 },
  ]
  const phases = ['arrive', 'survey', 'foundation', 'frame', 'assemble', 'finish', 'reveal']
  let elapsed = 0
  let maxTheatreTriangles = 0
  let maxTheatreDrawCalls = 0
  let sampledFrames = 0
  let pairViolations = 0
  let buildingViolations = 0
  const violationSamples = []

  for (const envelope of envelopes) {
    theatre.setTargetEnvelope(envelope.radius, envelope.height)
    for (const [phaseIndex, phase] of phases.entries()) {
      theatre.setPresentation({
        active: true,
        working: phase !== 'arrive' && phase !== 'reveal',
        phase,
        progress: phaseIndex / (phases.length - 1),
        sequence: phaseIndex,
        cloudCover: 0.68,
      })
      maxTheatreTriangles = Math.max(maxTheatreTriangles, theatre.metrics.visibleTriangles)
      maxTheatreDrawCalls = Math.max(maxTheatreDrawCalls, theatre.metrics.visibleDrawCalls)
      for (let frame = 0; frame < 360; frame += 1) {
        elapsed += 1 / 60
        theatre.update(elapsed, 1 / 60, false)
        const occupancy = theatre.root.userData.constructionOccupancy
        pairViolations += occupancy?.pairViolations ?? 0
        buildingViolations += occupancy?.buildingViolations ?? 0
        if ((occupancy?.pairViolations ?? 0) > 0 || (occupancy?.buildingViolations ?? 0) > 0) {
          if (violationSamples.length < 20) violationSamples.push({ envelope: envelope.id, phase, frame, ...occupancy })
        }
        sampledFrames += 1
      }
    }
  }

  // Survey is a working phase without relocation. Once damped into place,
  // robot roots must remain stabilized; rapid vibration belongs to the active
  // tool tip, never to all three bodies.
  theatre.setTargetEnvelope(2.8, 3.2)
  theatre.setPresentation({ active: true, working: true, phase: 'survey', progress: 0.14, sequence: 0, cloudCover: 0.18 })
  for (let frame = 0; frame < 600; frame += 1) {
    elapsed += 1 / 60
    theatre.update(elapsed, 1 / 60, false)
  }
  const yRanges = Object.fromEntries(Object.keys(family.members).map((role) => [role, { min: Infinity, max: -Infinity }]))
  for (let frame = 0; frame < 120; frame += 1) {
    elapsed += 1 / 60
    theatre.update(elapsed, 1 / 60, false)
    for (const [role, member] of Object.entries(family.members)) {
      yRanges[role].min = Math.min(yRanges[role].min, member.position.y)
      yRanges[role].max = Math.max(yRanges[role].max, member.position.y)
    }
  }
  const maximumSettledRootDrift = Math.max(...Object.values(yRanges).map((range) => range.max - range.min))

  assert.equal(pairViolations, 0, `crew overlap detected across ${sampledFrames} sampled frames: ${JSON.stringify(violationSamples)}`)
  assert.equal(buildingViolations, 0, `building penetration detected across ${sampledFrames} sampled frames: ${JSON.stringify(violationSamples)}`)
  assert.ok(maximumSettledRootDrift < 0.0001, `working roots still vibrate: drift=${maximumSettledRootDrift}`)
  assert.ok(maxTheatreTriangles <= 8_000, `theatre exceeds 8k visible triangle ceiling: ${maxTheatreTriangles}`)
  assert.ok(maxTheatreDrawCalls <= 18, `theatre exceeds 18 visible draw-call ceiling: ${maxTheatreDrawCalls}`)
  assert.ok(familyMetrics.low.triangles + maxTheatreTriangles <= 48_000, 'combined live modal exceeds 48k triangle ceiling')
  assert.ok(familyMetrics.low.drawCalls + maxTheatreDrawCalls <= 72, 'combined live modal exceeds 72 draw-call ceiling')

  console.log(`LIVE_MODAL ${JSON.stringify({
    crewScale: theatre.root.userData.crewScale,
    sampledFrames,
    pairViolations,
    buildingViolations,
    maximumSettledRootDrift,
    maxTheatreTriangles,
    maxTheatreDrawCalls,
    combinedTriangles: familyMetrics.low.triangles + maxTheatreTriangles,
    combinedDrawCalls: familyMetrics.low.drawCalls + maxTheatreDrawCalls,
  })}`)
  theatre.dispose()
  family.dispose()
} finally {
  await server.close()
}
