import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createServer } from 'vite'

const worldSourceNumber = Number(process.argv[2] ?? 4)
assert.ok(Number.isInteger(worldSourceNumber), 'world source number must be an integer')

const server = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
})

try {
  const robotModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/RobotFamilyThreeModel.ts')
  const theatreModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/RobotConstructionTheatre.ts')
  const authoringModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/IslandConstructionAuthoring.ts')
  const pilotModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx')
  const sunshoreModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2ThreeWorld.ts')
  const moonveilModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island6MoonveilThreeWorld.ts')
  const abyssalModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island7UnderwaterThreeWorld.ts')
  const everblossomModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island8EverblossomThreeWorld.ts')
  const heartshaftModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island9HeartshaftThreeWorld.ts')
  const rootheartModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island10RootheartThreeWorld.ts')
  const contractModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts')

  assert.ok([4, 5, 6, 7, 8, 9, 10].includes(worldSourceNumber), 'the current exact-envelope trace supports world sources 4 through 10')
  const materials = worldSourceNumber === 5
    ? sunshoreModule.createIsland2WorldMaterials('low')
    : worldSourceNumber === 6
      ? moonveilModule.createIsland6MoonveilMaterials('low')
      : worldSourceNumber === 7
        ? abyssalModule.createIsland7UnderwaterMaterials('low')
        : worldSourceNumber === 8
          ? everblossomModule.createIsland8EverblossomMaterials('low')
          : worldSourceNumber === 9
            ? heartshaftModule.createIsland9HeartshaftMaterials('low')
            : worldSourceNumber === 10
              ? rootheartModule.createIsland10RootheartMaterials('low')
              : pilotModule.createPilotMaterials('low', worldSourceNumber)
  const phases = ['foundation', 'frame', 'assemble', 'finish']
  const results = []

  for (const landmark of contractModule.ISLAND_5_LANDMARKS) {
    const profile = authoringModule.resolveIslandLandmarkConstructionProfile(worldSourceNumber, landmark.id)
    assert.ok(profile, `missing construction profile for world ${worldSourceNumber} ${landmark.id}`)

    const target = worldSourceNumber === 5
      ? sunshoreModule.buildIsland2Landmark(
          landmark,
          3,
          'low',
          materials,
          { constructionPreview: 'target' },
        )
      : worldSourceNumber === 6
        ? moonveilModule.buildIsland6MoonveilLandmark(
            landmark,
            3,
            'low',
            materials,
            false,
            { constructionPreview: 'target' },
          )
        : worldSourceNumber === 7
          ? abyssalModule.buildIsland7UnderwaterLandmark(
              landmark,
              3,
              'low',
              materials,
              { constructionPreview: 'target' },
            )
          : worldSourceNumber === 8
            ? everblossomModule.buildIsland8EverblossomLandmark(
                landmark,
                3,
                'low',
                materials,
                { constructionPreview: 'target' },
              )
            : worldSourceNumber === 9
              ? heartshaftModule.buildIsland9HeartshaftLandmark(
                  landmark,
                  3,
                  'low',
                  materials,
                  { constructionPreview: 'target' },
                )
              : worldSourceNumber === 10
                ? rootheartModule.buildIsland10RootheartLandmark(
                    landmark,
                    3,
                    'low',
                    materials,
                    { constructionPreview: 'target' },
                  )
                : pilotModule.buildLandmark(
          landmark,
          3,
          'low',
          materials,
          worldSourceNumber,
          { constructionPreview: 'target' },
        )
    const bounds = new THREE.Box3().setFromObject(target)
    const size = bounds.getSize(new THREE.Vector3())
    const horizontalSize = Math.max(size.x, size.z, 0.001)
    const verticalFit = THREE.MathUtils.clamp((horizontalSize * 1.38) / Math.max(size.y, 0.001), 0.72, 1)
    // This is the exact local-space transform used by the live Build modal.
    const stageScale = (0.58 / 0.34) * verticalFit
    const envelope = {
      radius: horizontalSize * stageScale * 0.5,
      height: size.y * stageScale,
    }

    const family = robotModule.createRobotFamilyModel({ quality: 'low' })
    const theatre = theatreModule.createRobotConstructionTheatre({
      family,
      quality: 'low',
      showBuildingEnvelope: false,
    })
    const crewVisualScale = THREE.MathUtils.clamp(0.19 * (size.y / horizontalSize), 0.084, 0.2)
    theatre.setCrewScale(crewVisualScale)
    theatre.setTargetEnvelope(envelope.radius, envelope.height)

    let elapsed = 0
    let sampledFrames = 0
    let maxPairViolations = 0
    let maxBuildingViolations = 0
    let minPairClearance = Number.POSITIVE_INFINITY
    let minBuildingClearance = Number.POSITIVE_INFINITY
    let maxTargetCorrections = 0
    let maxActualCorrections = 0
    let maxPhoneForecourtAngle = 0
    const samples = []

    const sample = (phase, frame) => {
      const occupancy = theatre.root.userData.constructionOccupancy ?? {}
      maxPairViolations = Math.max(maxPairViolations, occupancy.pairViolations ?? 0)
      maxBuildingViolations = Math.max(maxBuildingViolations, occupancy.buildingViolations ?? 0)
      if (typeof occupancy.minimumPairClearance === 'number') {
        minPairClearance = Math.min(minPairClearance, occupancy.minimumPairClearance)
      }
      if (typeof occupancy.minimumBuildingClearance === 'number') {
        minBuildingClearance = Math.min(minBuildingClearance, occupancy.minimumBuildingClearance)
      }
      maxTargetCorrections = Math.max(maxTargetCorrections, occupancy.targetCorrections ?? 0)
      maxActualCorrections = Math.max(maxActualCorrections, occupancy.actualCorrections ?? 0)
      for (const member of Object.values(family.members)) {
        maxPhoneForecourtAngle = Math.max(
          maxPhoneForecourtAngle,
          Math.abs(Math.atan2(member.position.x, member.position.z)),
        )
      }
      if ((occupancy.pairViolations ?? 0) > 0 || (occupancy.buildingViolations ?? 0) > 0) {
        if (samples.length < 20) samples.push({ phase, frame, ...occupancy })
      }
      sampledFrames += 1
    }

    for (const [phaseIndex, phase] of phases.entries()) {
      theatre.setPresentation({
        active: true,
        working: true,
        phase,
        progress: (phaseIndex + 1) / 5,
        sequence: phaseIndex,
        cloudCover: 0.68,
        choreography: profile.choreography,
      })
      for (let frame = 0; frame < 900; frame += 1) {
        elapsed += 1 / 60
        theatre.update(elapsed, 1 / 60, false)
        sample(phase, frame)
      }
    }

    theatre.setPresentation({
      active: true,
      working: false,
      phase: 'finish',
      progress: 0.96,
      sequence: phases.length,
      cloudCover: 0,
      choreography: profile.choreography,
    })
    for (let frame = 0; frame < 3600; frame += 1) {
      elapsed += 1 / 60
      theatre.update(elapsed, 1 / 60, false)
      sample('resting', frame)
    }

    assert.equal(maxPairViolations, 0, `${profile.label} robot overlap: ${JSON.stringify(samples)}`)
    assert.equal(maxBuildingViolations, 0, `${profile.label} building penetration: ${JSON.stringify(samples)}`)
    assert.ok(minBuildingClearance >= -0.001, `${profile.label} shell clearance regressed: ${minBuildingClearance}`)
    assert.ok(maxPhoneForecourtAngle <= 1.02, `${profile.label} miniature crew left the phone forecourt: ${maxPhoneForecourtAngle}`)

    family.root.updateWorldMatrix(true, true)
    const crewHeightRatios = Object.fromEntries(Object.entries(family.members).map(([role, member]) => {
      const memberHeight = new THREE.Box3().setFromObject(member).getSize(new THREE.Vector3()).y
      return [role, Number((memberHeight / envelope.height).toFixed(4))]
    }))
    assert.ok(crewHeightRatios['heavy-worker'] >= 0.04 && crewHeightRatios['heavy-worker'] <= 0.16, `${profile.label} heavy worker must read as a small builder beside the landmark: ${JSON.stringify(crewHeightRatios)}`)
    assert.ok(crewHeightRatios['project-manager'] >= 0.023 && crewHeightRatios['project-manager'] <= 0.1, `${profile.label} project manager must remain readable but subordinate: ${JSON.stringify(crewHeightRatios)}`)
    assert.ok(crewHeightRatios['mini-artist'] >= 0.012 && crewHeightRatios['mini-artist'] <= 0.055, `${profile.label} mini artist must remain the smallest readable builder: ${JSON.stringify(crewHeightRatios)}`)

    results.push({
      landmarkId: landmark.id,
      label: profile.label,
      styleId: profile.choreography.styleId,
      stationOffset: profile.choreography.stationOffset,
      stationStep: profile.choreography.stationStep,
      phaseStationOffsets: profile.choreography.phaseStationOffsets,
      envelope: {
        radius: Number(envelope.radius.toFixed(4)),
        height: Number(envelope.height.toFixed(4)),
      },
      crewVisualScale: Number(crewVisualScale.toFixed(4)),
      crewHeightRatios,
      sampledFrames,
      maxPairViolations,
      maxBuildingViolations,
      minPairClearance: Number.isFinite(minPairClearance) ? minPairClearance : null,
      minBuildingClearance,
      maxTargetCorrections,
      maxActualCorrections,
      maxPhoneForecourtAngle,
    })

    theatre.dispose()
    family.dispose()
    target.traverse((entry) => {
      if (!(entry instanceof THREE.Mesh)) return
      entry.geometry.dispose()
    })
  }

  assert.equal(new Set(results.map((entry) => entry.styleId)).size, 5, 'all five landmarks need distinct choreography identities')
  assert.equal(results.reduce((sum, entry) => sum + entry.sampledFrames, 0), 36_000, 'trace must cover 36,000 frames')
  console.log(`ISLAND_CONSTRUCTION_TRACE ${JSON.stringify({ worldSourceNumber, totalFrames: 36_000, results })}`)
} finally {
  await server.close()
}
