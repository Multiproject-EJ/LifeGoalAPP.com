import * as THREE from 'three';
import {
  buildIsland15CrystalGlacierLandmark,
  createIsland15CrystalGlacierLivingAmbience,
  createIsland15CrystalGlacierMaterials,
  createIsland15UnifiedCrystalPalaceAsset,
  ISLAND_15_CITADEL_PRESENTATION_MODE,
  ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS,
  resolveIsland15AuroraCurtainComposition,
  resolveIsland15AuroraPhase,
  resolveIsland15AuroraOpacity,
} from '../../dev/Island15CrystalGlacierThreeWorld';
import { buildIsland15CastleRooflineSpireSystemPart } from '../../dev/island15/Island15CastleRooflineSpireSystemPart';
import { buildIsland15CastleExteriorShellPart } from '../../dev/island15/Island15CastleExteriorShellPart';
import { buildIsland15CastleConnectorPart } from '../../dev/island15/Island15CastleConnectorPart';
import { buildIsland15SharedInteriorCirculationPart } from '../../dev/island15/Island15SharedInteriorCirculationPart';
import {
  buildIsland15GlacierTerrainPart,
  ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY,
} from '../../dev/island15/Island15GlacierTerrainPart';
import { buildIsland15SourceTracedCitadelShellPart } from '../../dev/island15/Island15SourceTracedCitadelShellPart';
import {
  bindIsland15CrystalPalaceRuntime,
  ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS,
} from '../../dev/island15/Island15CrystalPalaceRuntime';
import { prepareIslandConstructionLevelDelta } from '../../dev/IslandConstructionLevelDelta';
import {
  ISLAND_3D_QUALITY_PROFILES,
  ISLAND_5_LANDMARKS,
} from '../../dev/island5ThreePilotContract';
import { assert, assertEqual, type TestCase } from './testHarness';

export const island15CrystalGlacierThreeWorldContractTests: TestCase[] = [
  {
    name: 'seats the complete R17 palace on one widened glacier foundation without taking route ownership',
    run: () => {
      const materials = createIsland15CrystalGlacierMaterials();
      const terrain = buildIsland15GlacierTerrainPart(materials, ISLAND_3D_QUALITY_PROFILES.low);
      const authority = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY;
      const foundation = terrain.getObjectByName('ISLAND_15_CITADEL_MONUMENTAL_GLACIER_FOUNDATION');
      const snowSeat = terrain.getObjectByName('ISLAND_15_R17_CONTINUOUS_FOUNDATION_SNOW_SEAT') as THREE.Mesh | undefined;
      const glacierBody = terrain.getObjectByName('ISLAND_15_GLACIER_FACETED_BODY') as THREE.Mesh | undefined;

      assert(Boolean(foundation && snowSeat && glacierBody), 'one glacier body and one continuous R17 bearing foundation must be present');
      assertEqual(terrain.userData.r17FoundationAuthority, authority.id, 'terrain publishes the frozen R17 foundation authority');
      assertEqual(terrain.userData.r17PalaceSeatBounds, authority.palaceBounds, 'terrain publishes exact palace seat bounds');
      assertEqual(terrain.userData.r17FoundationBounds, authority.foundationBounds, 'terrain publishes exact foundation bounds');
      assertEqual(terrain.userData.r17FoundationRadiusXZ, authority.foundationRadiusXZ, 'terrain publishes exact foundation radii');
      assertEqual(foundation?.userData.continuousSeatStratumCount, 3, 'the foundation uses three connected visual strata under one island');
      assertEqual(foundation?.userData.ownsLiveTileGeometry, false, 'the widened foundation cannot own gameplay route geometry');
      assert(Number(foundation?.userData.foundationMaximumY) < Number(foundation?.userData.liveRouteSurfaceMinimumY), 'the entire foundation remains below live route surfaces');

      const [seatRadiusX, seatRadiusZ] = authority.upperSeatHalfExtentsXZ;
      const seatCenterZ = authority.seatCenterXZ[1];
      const [palaceMinX, , palaceMinZ] = authority.palaceBounds.minimum;
      const [palaceMaxX, , palaceMaxZ] = authority.palaceBounds.maximum;
      for (const x of [palaceMinX, palaceMaxX]) {
        for (const z of [palaceMinZ, palaceMaxZ]) {
          const occupancy = Math.pow(Math.abs(x) / seatRadiusX, authority.superellipsePower)
            + Math.pow(Math.abs(z - seatCenterZ) / seatRadiusZ, authority.superellipsePower);
          assert(occupancy < 0.75, `R17 corner ${x},${z} retains a real scenic/foundation rim`);
        }
      }
      snowSeat?.geometry.computeBoundingBox();
      assert((snowSeat?.geometry.boundingBox?.min.x ?? 0) <= -14, 'upper seat reaches west of the R17 wall line');
      assert((snowSeat?.geometry.boundingBox?.max.x ?? 0) >= 14, 'upper seat reaches east of the R17 wall line');
      assert((snowSeat?.geometry.boundingBox?.min.z ?? 0) <= -15.5, 'upper seat retains a north scenic rim');
      assert((snowSeat?.geometry.boundingBox?.max.z ?? 0) >= 17.5, 'upper seat retains a south scenic rim beyond z14');

      let meshCount = 0;
      let triangleCount = 0;
      terrain.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshCount += 1;
        triangleCount += object.geometry.index
          ? object.geometry.index.count / 3
          : object.geometry.getAttribute('position').count / 3;
      });
      assert(meshCount <= 80, `widening changes dimensions rather than exploding draw families (${meshCount})`);
      assert(triangleCount <= 6_000, `the R17 glacier foundation remains a bounded mobile mesh (${triangleCount})`);
    },
  },
  {
    name: 'keeps every Island 015 interior construction transition additive from L0 through L3',
    run: () => {
      const palace = createIsland15UnifiedCrystalPalaceAsset(createIsland15CrystalGlacierMaterials());
      const runtime = bindIsland15CrystalPalaceRuntime(palace);
      const transitions = [[0, 1], [1, 2], [2, 3]] as const;

      ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((roomId) => {
        transitions.forEach(([currentLevel, targetLevel]) => {
          const current = runtime.cloneRoomAtLevel(roomId, currentLevel);
          const target = runtime.cloneRoomAtLevel(roomId, targetLevel);
          current.updateWorldMatrix(true, true);
          target.updateWorldMatrix(true, true);
          const delta = prepareIslandConstructionLevelDelta({ currentRoot: current, targetRoot: target });

          assert(delta.additiveMeshCount > 0, `${roomId} L${currentLevel}->L${targetLevel} must reveal newly funded interior geometry`);
          if (currentLevel > 0) {
            assert(delta.retainedMeshCount > 0, `${roomId} L${currentLevel}->L${targetLevel} must preserve its funded room interior`);
          }
          delta.applyProgress(1, { working: false });
          assert(
            delta.revealParts.filter((part) => !part.temporary).every((part) => part.mesh.visible),
            `${roomId} L${targetLevel} permanent reveal must be visible after the transition completes`,
          );
        });
      });
    },
  },
  {
    name: 'preserves the retired source-traced V4 evidence without mounting it over the live rollback blockout',
    run: () => {
      const materials = createIsland15CrystalGlacierMaterials();
      const rooms = new Map(ISLAND_5_LANDMARKS.map((landmark) => [
        landmark.id,
        buildIsland15CrystalGlacierLandmark(landmark, 3, 'high', materials),
      ]));

      const boss = rooms.get('boss');
      const shell = buildIsland15SourceTracedCitadelShellPart(materials);
      assertEqual(shell?.userData.partId, 'source-traced-citadel-shell', 'the fresh citadel keeps one explicit part owner');
      assertEqual(shell?.userData.floorPlanVersion, 4, 'the shell consumes the approved single-citadel Floor Plan V4');
      assertEqual(shell?.userData.presentationOnly, true, 'the shell remains presentation-only');
      assertEqual(shell?.userData.buildingCount, 1, 'V4 renders exactly one central building');
      assertEqual(shell?.userData.externalLandmarkBuildingCount, 0, 'V4 renders no satellite landmark buildings');
      assertEqual(shell?.userData.externalConnectorCount, 0, 'V4 renders no connector or return network');
      assertEqual(shell?.userData.usesRoomAabbGeometry, false, 'room AABBs remain clearance metadata rather than exterior boxes');
      assertEqual(shell?.userData.meshCount, 51, 'the hollow source-traced family keeps its exact naked mesh count');
      assert(Number(shell?.userData.triangleCount) <= 1_200, 'the hollow source-traced family stays under 1,200 triangles');
      assertEqual(shell?.userData.bounds.minimum.join(','), '-1.6,-0.2,-2.05', 'the shell begins at the exact visible V4 envelope minimum');
      assertEqual(shell?.userData.bounds.maximum.join(','), '1.6,10.55,2.05', 'the hero crystal uses the full authoritative height');
      assertEqual(shell?.userData.connectivity.connectedComponentCount, 1, 'the citadel is one connected construction');
      assertEqual(shell?.userData.connectivity.detachedMeshCount, 0, 'the citadel has no detached shell pieces');
      assertEqual(shell?.userData.clearanceChecks.protectedVolumeCount, 12, 'five rooms, atrium, throne interface and five focus accesses are audited');
      assertEqual(shell?.userData.clearanceChecks.intersectionCount, 0, 'all protected interior volumes remain physically clear');
      assertEqual(shell?.userData.clearanceChecks.allFiveRoomAabbsClear, true, 'all five exact room AABBs stay hollow');
      assertEqual(shell?.userData.clearanceChecks.atriumClear, true, 'the shared atrium stays hollow');
      assertEqual(shell?.userData.clearanceChecks.throneInterfaceClear, true, 'the throne stair interface stays hollow');
      assertEqual(shell?.userData.clearanceChecks.allFiveFocusAccessesClear, true, 'all five room focus approaches remain clear');
      assertEqual(shell?.userData.sourceAuthorityRatios.widthDepth, 0.7805, 'the shell keeps the source-authority width/depth ratio');
      assertEqual(shell?.userData.sourceAuthorityRatios.heroCrystalHeightFractionOfMaximumY, 0.2104, 'the hero crystal owns the final 21 percent of height');
      assertEqual(shell?.userData.sourceAuthorityRatios.belfryTopFractionOfMaximumY, 0.7896, 'the occupied belfry reaches the normalized 0.79 band');
      assertEqual(shell?.userData.authoritativeGoal, '.img2threejs/island-015-crystal-glacier/gauntlet/goals/exact/015-source.png', 'the exact source remains geometry authority');
      assertEqual(shell?.userData.secondaryMoodReferenceIsGeometryAuthority, false, 'the generated mood sheet cannot authorize geometry');
      assert(Boolean(shell?.getObjectByName('ISLAND_15_SOURCE_TRACED_HERO_CRYSTAL')), 'the source-sized hero crystal must be modeled in 3D');

      const expectedRoomBounds = {
        hatchery: ['-1.48,0.42,-1.45', '-0.28,2.08,0.18'],
        habit: ['0.28,0.42,-1.45', '1.48,2.08,0.18'],
        wisdom: ['-1.48,2.32,-1.2', '-0.28,4.16,1.28'],
        event: ['0.28,2.32,-1.2', '1.48,4.16,1.28'],
        boss: ['-1.26,4.42,-1.52', '1.26,6.26,1.32'],
      } as const;
      const clearances = new Map<string, { minimum: number[]; maximum: number[] }>(
        (shell?.userData.interiorClearances ?? []).map((clearance: { canonicalStopId: string; minimum: number[]; maximum: number[] }) => [clearance.canonicalStopId, clearance]),
      );
      assertEqual(clearances.size, 5, 'all five canonical stops map to one internal clearance record');
      Object.entries(expectedRoomBounds).forEach(([id, [minimum, maximum]]) => {
        const clearance = clearances.get(id);
        assert(Boolean(clearance), `${id} must have one V4 room clearance`);
        assertEqual(clearance?.minimum.join(','), minimum, `${id} V4 minimum bound`);
        assertEqual(clearance?.maximum.join(','), maximum, `${id} V4 maximum bound`);
      });

      (['hatchery', 'habit', 'wisdom', 'event'] as const).forEach((id) => {
        const anchor = rooms.get(id);
        let renderableLeafCount = 0;
        anchor?.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
            renderableLeafCount += 1;
          }
        });
        assertEqual(renderableLeafCount, 0, `${id} retains identity but no detached rendered building`);
        assertEqual(anchor?.userData.island15V4EmbeddedRoomAnchor, true, `${id} declares an embedded V4 room anchor`);
      });
      ISLAND_5_LANDMARKS.forEach((landmark) => {
        const room = rooms.get(landmark.id);
        assertEqual(room?.userData.landmarkId, landmark.id, `${landmark.id} keeps its canonical gameplay identity`);
        assertEqual(room?.userData.island15RoomIdentity, ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS[landmark.id], `${landmark.id} keeps its authored room identity`);
      });
      assert(Boolean(boss?.getObjectByName('ISLAND_15_SINGLE_CITADEL_BLOCKOUT_PART')), 'the pre-attempt rollback blockout remains mounted after the new family is retired');
      assert(!boss?.getObjectByName('ISLAND_15_SOURCE_TRACED_CITADEL_SHELL_PART'), 'the Quality-Lord-rejected source-traced family stays unmounted');
      assert(!boss?.getObjectByName('ISLAND_15_CASTLE_WING_CONNECTOR_SYSTEM'), 'the boss assembly contains no V3 connector system');
      assert(!boss?.getObjectByName('ISLAND_15_SHARED_INTERIOR_CIRCULATION_PART'), 'the boss assembly contains no V3 architectural return');
      assert(!boss?.getObjectByName('ISLAND_15_CASTLE_EXTERIOR_SHELL_PART'), 'the accepted detailed shell stays unmounted during the naked macro gate');
      assertEqual(
        ISLAND_15_CITADEL_PRESENTATION_MODE,
        'unified-procedural-crystal-palace',
        'the validated unified procedural palace owns production while V4 remains a rollback artifact',
      );

      const palace = createIsland15UnifiedCrystalPalaceAsset(materials);
      assertEqual(palace.name, 'ISLAND_15_CRYSTAL_PALACE_ROOT', 'production exposes one strict semantic palace root');
      (['HATCHERY', 'HABIT', 'MYSTERY', 'WISDOM', 'BOSS'] as const).forEach((room) => {
        assert(Boolean(palace.getObjectByName(`ISLAND_15_CRYSTAL_PALACE_ROOM_${room}`)), `${room} is one internal palace room`);
        ([1, 2, 3] as const).forEach((stage) => {
          assert(Boolean(palace.getObjectByName(`ISLAND_15_CRYSTAL_PALACE_ROOM_${room}_L${stage}`)), `${room} owns semantic L${stage}`);
        });
      });
      const frostEggs = new Set<string>();
      let duplicatedRouteTiles = 0;
      palace.traverse((object) => {
        if (/^ISLAND_15_FROST_NEST_EGG_[1-5]$/.test(object.name)) frostEggs.add(object.name);
        if (object.name.startsWith('ISLAND_15_BOSS_HALL_ROUTE_TILE_')) duplicatedRouteTiles += 1;
      });
      assertEqual(frostEggs.size, 5, 'the Frost Nest contains exactly five commissioned eggs');
      assert(Boolean(palace.getObjectByName('ISLAND_15_FROST_NEST_FIREPLACE_FIREBOX')), 'the Frost Nest owns a black firebox');
      assert(Boolean(palace.getObjectByName('ISLAND_15_FROST_NEST_FIREPLACE_ORANGE_FLAME')), 'the Frost Nest owns a warm orange flame');
      assertEqual(duplicatedRouteTiles, 0, 'the palace never duplicates the canonical 36 gameplay tiles');
    },
  },
  {
    name: 'authors a monumental one-building floor plan with the Boss Hall hub and four internal corner rooms',
    run: () => {
      const palace = createIsland15UnifiedCrystalPalaceAsset(createIsland15CrystalGlacierMaterials());
      palace.updateMatrixWorld(true);
      assertEqual(palace.userData.island15UnifiedPalace, true, 'the full floor plan belongs to one palace asset');

      const expectedRoomPositions = {
        HATCHERY: [-3.48, 0.42, 3.48],
        HABIT: [3.48, 0.42, 3.48],
        MYSTERY: [3.48, 0.42, -3.48],
        WISDOM: [-3.48, 0.42, -3.48],
        BOSS: [0, 0, 0],
      } as const;
      Object.entries(expectedRoomPositions).forEach(([roomId, expectedPosition]) => {
        const room = palace.getObjectByName(`ISLAND_15_CRYSTAL_PALACE_ROOM_${roomId}`);
        assert(Boolean(room), `${roomId} must exist inside the shared palace root`);
        assertEqual(room?.parent, palace, `${roomId} must be directly owned by the one palace assembly`);
        assertEqual(room?.userData.island15InternalPalaceRoom, true, `${roomId} declares an internal room rather than a detached landmark`);
        assertEqual(
          room?.position.toArray().join(','),
          expectedPosition.join(','),
          `${roomId} keeps its approved floor-plan position`,
        );
      });

      const palaceBounds = new THREE.Box3().setFromObject(palace);
      const palaceSize = palaceBounds.getSize(new THREE.Vector3());
      assert(palaceSize.x >= 11.2 && palaceSize.z >= 11.2, 'the palace keeps a massive island-filling footprint');
      assert(palaceSize.y >= 10, 'the palace keeps its monumental occupied crystal-citadel height');

      const structuralRoots = [
        'ISLAND_15_CRYSTAL_PALACE_PERMANENT_EXTERIOR',
        'ISLAND_15_CRYSTAL_PALACE_PERMANENT_REAR',
        'ISLAND_15_CRYSTAL_PALACE_PERMANENT_CROWN',
        'ISLAND_15_CRYSTAL_PALACE_OVERVIEW_ROOF',
        'ISLAND_15_CRYSTAL_PALACE_OVERVIEW_SOUTH_NEAR_WALL',
      ];
      structuralRoots.forEach((name) => {
        const structuralRoot = palace.getObjectByName(name);
        assert(Boolean(structuralRoot), `${name} remains part of the stable monumental exterior`);
        structuralRoot?.traverse((object) => {
          assert(
            !/^ISLAND_15_CRYSTAL_PALACE_ROOM_(HATCHERY|HABIT|MYSTERY|WISDOM|BOSS)_L[123]$/.test(object.name),
            `${name} cannot absorb room progression geometry`,
          );
        });
      });
    },
  },
  {
    name: 'keeps the restored shell broad, many-tiered, socket-safe, and authored on every facade',
    run: () => {
      const materials = createIsland15CrystalGlacierMaterials();
      const shells = ([0, 1, 2, 3] as const).map((level) => buildIsland15CastleExteriorShellPart(materials, level));
      const namesByLevel = shells.map((shell) => {
        const names = new Set<string>();
        shell.traverse((object) => {
          if (object.name) names.add(object.name);
          if (object !== shell) assertEqual(object.userData.partId, 'castle-exterior-shell', `${object.name} must retain shell ownership`);
        });
        return names;
      });
      for (let level = 1; level < namesByLevel.length; level += 1) {
        namesByLevel[level - 1].forEach((name) => {
          assert(namesByLevel[level].has(name), `shell L${level} must preserve earlier geometry ${name}`);
        });
      }

      const restored = shells[3];
      restored.updateMatrixWorld(true);
      assert(Boolean(restored.getObjectByName('ISLAND_15_CASTLE_BROAD_LOWER_SHOULDER_COURSE')), 'shell needs a substantial broad lower shoulder');
      assert(Boolean(restored.getObjectByName('ISLAND_15_CASTLE_MIDDLE_GOTHIC_SHOULDER')), 'shell needs a distinct middle shoulder tier');
      assert(Boolean(restored.getObjectByName('ISLAND_15_CASTLE_UPPER_GALLERY_SAPPHIRE_RISER')), 'shell needs a stepped upper gallery transition');
      assert(Boolean(restored.getObjectByName('ISLAND_15_CASTLE_TOWER_BROAD_BEARING_DRUM')), 'central tower needs a broad structural bearing tier');
      assert(Boolean(restored.getObjectByName('ISLAND_15_CASTLE_REAR_CLERESTORY_LANCET_1_INHABITED_APERTURE')), 'rear facade needs an authored inhabited clerestory rhythm');
      assert(Boolean(restored.getObjectByName('ISLAND_15_CASTLE_FRONT_CLERESTORY_LANCET_2_INHABITED_APERTURE')), 'front facade needs secondary inhabited bays beyond the gate');
      assert(Boolean(restored.getObjectByName('ISLAND_15_CASTLE_WEST_BAY_RELIEF_1')), 'west facade needs sapphire/silver/gold bay relief');
      assert(Boolean(restored.getObjectByName('ISLAND_15_CASTLE_EAST_BAY_RELIEF_2')), 'east facade needs sapphire/silver/gold bay relief');

      const buttressTowers = restored.children
        .flatMap((stage) => stage.children)
        .filter((object) => /^ISLAND_15_CASTLE_CORNER_BUTTRESS_TOWER_\d$/.test(object.name));
      assertEqual(buttressTowers.length, 4, 'shell owns exactly four low corner buttress-towers');
      buttressTowers.forEach((tower) => {
        assertEqual(tower.userData.shellRole, 'physically-attached-corner-buttress-tower', `${tower.name} needs explicit structural ownership`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_BROAD_BEARING_FOOT`)), `${tower.name} needs a broad attached bearing foot`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_SAPPHIRE_BUTTRESS_SHAFT`)), `${tower.name} needs a volumetric sapphire shaft`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_OUTWARD_SIDE_LANCET_INHABITED_APERTURE`)), `${tower.name} needs an inhabited side face`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_OUTWARD_END_LANCET_INHABITED_APERTURE`)), `${tower.name} needs an inhabited end face`);
        const towerBounds = new THREE.Box3().setFromObject(tower);
        assert(towerBounds.max.y <= 3.46 + 0.0001, `${tower.name} must remain below the frozen roofline assembly`);
      });

      const shellBounds = new THREE.Box3().setFromObject(restored);
      assert(shellBounds.min.x >= -1.7 && shellBounds.max.x <= 1.7, 'restored shell must remain inside the 3.4-wide boss envelope');
      assert(shellBounds.min.z >= -2.15 && shellBounds.max.z <= 2.15, 'restored shell must remain inside the 4.3-deep boss envelope');
      assert(shellBounds.max.y <= 6.65 + 0.0001, 'shell geometry must end below the unchanged crown socket');
      assertEqual(restored.userData.maximumShellY, 6.65, 'shell metadata must expose its accepted physical cap');

      const socket = restored.getObjectByName('ISLAND_15_CASTLE_HERO_CROWN_SOCKET');
      assertEqual(socket?.position.toArray().join(','), '0,6.66,-0.1', 'shell must preserve the accepted crown socket exactly');
      const drumWall = restored.getObjectByName('ISLAND_15_CASTLE_CROWN_SOCKET_DRUM_SAPPHIRE_WALL');
      const drumBearing = restored.getObjectByName('ISLAND_15_CASTLE_CROWN_SOCKET_DRUM_SILVER_BEARING');
      const drumLip = restored.getObjectByName('ISLAND_15_CASTLE_CROWN_SOCKET_DRUM_GOLD_LIP');
      assert(Boolean(drumWall && drumBearing && drumLip), 'shell must physically fill the roof-to-crown bearing gap');
      if (drumWall && drumBearing && drumLip) {
        const drumBounds = new THREE.Box3();
        [drumWall, drumBearing, drumLip].forEach((object) => drumBounds.union(new THREE.Box3().setFromObject(object)));
        assert(drumBounds.min.y <= 6.24 + 0.0001, 'socket bearing begins at the accepted roof aperture elevation');
        assert(drumBounds.max.y >= 6.65 - 0.0001, 'socket bearing reaches the unchanged crown collar');
        assert(drumBounds.min.x >= -0.575 && drumBounds.max.x <= 0.575, 'socket bearing stays inside the accepted aperture width');
        assert(drumBounds.min.z >= -0.75 && drumBounds.max.z <= 0.55, 'socket bearing stays inside the accepted aperture depth around z=-0.1');
      }

      const forbiddenOwnershipLeaks: string[] = [];
      restored.traverse((object) => {
        if (/ROOFLINE|CROWN_PINNACLE|CENTRAL_NEEDLE|CONNECTOR_BRANCH|ROOM_INTERIOR/.test(object.name)) forbiddenOwnershipLeaks.push(object.name);
      });
      assertEqual(forbiddenOwnershipLeaks.length, 0, 'shell must not absorb roofline, crown, connector, or room geometry');
    },
  },
  {
    name: 'keeps the accepted four-arm connector buried while strengthening every endpoint gallery portal',
    run: () => {
      const materials = createIsland15CrystalGlacierMaterials();
      const connector = buildIsland15CastleConnectorPart(materials);
      connector.updateMatrixWorld(true);

      assertEqual(connector.userData.partId, 'castle-wing-connector-system', 'connector keeps its accepted one-part ownership');
      assertEqual(connector.userData.floorPlanVersion, 3, 'connector must consume Floor Plan V3');
      assertEqual(connector.userData.primaryBranchCount, 4, 'connector owns exactly four primary branches');
      assertEqual(connector.userData.endpointPortalCount, 8, 'four branches need masonry portals at both ends');
      assertEqual(connector.userData.returnBranchCount, 0, 'connector must not absorb the separate gallery-return network');
      assertEqual(connector.userData.buriedConnectorTopMaximumY, -0.25, 'protected-board spans remain buried');
      assertEqual(connector.userData.minimumSocketOverlap, 0.16, 'connector preserves minimum socket overlap');
      assertEqual(connector.userData.maximumAssemblyGap, 0.01, 'connector preserves the maximum assembly gap');
      assertEqual(connector.userData.routeAndTileClearancePreserved, true, 'connector declares unchanged route/tile clearance');
      assertEqual(connector.userData.roomAndBossTransformsPreserved, true, 'connector must not move any room or boss');

      const expectedBranches = [
        {
          id: 'north-west-bridge',
          socket: 'rear-left-wing',
          start: [-1.35, -0.52, -1.75],
          end: [-2.86, -0.52, -2.7],
          yaw: -122.2,
          fromYaw: -122.2,
          toYaw: 57.8,
          clearWidth: 0.72,
        },
        {
          id: 'north-east-bridge',
          socket: 'rear-right-wing',
          start: [1.35, -0.52, -1.75],
          end: [2.91, -0.52, -2.7],
          yaw: 121.3,
          fromYaw: 121.3,
          toYaw: -58.7,
          clearWidth: 0.82,
        },
        {
          id: 'south-west-bridge',
          socket: 'front-left-wing',
          start: [-1.35, -0.52, 1.75],
          end: [-2.95, -0.52, 2.7],
          yaw: -59.3,
          fromYaw: -59.3,
          toYaw: 120.7,
          clearWidth: 0.74,
        },
        {
          id: 'south-east-bridge',
          socket: 'front-right-wing',
          start: [1.35, -0.52, 1.75],
          end: [2.96, -0.52, 2.7],
          yaw: 59.4,
          fromYaw: 59.4,
          toYaw: -120.6,
          clearWidth: 0.74,
        },
      ] as const;

      const assertNear = (actual: number, expected: number, label: string) => {
        assert(Math.abs(actual - expected) < 0.0001, `${label} must remain ${expected}, received ${actual}`);
      };
      const assertPoint = (actual: unknown, expected: readonly number[], label: string) => {
        assert(Array.isArray(actual), `${label} must expose a numeric point`);
        if (!Array.isArray(actual)) return;
        assertEqual(actual.length, expected.length, `${label} dimensionality`);
        expected.forEach((value, index) => assertNear(Number(actual[index]), value, `${label}[${index}]`));
      };

      let elevatedMeshCount = 0;
      connector.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const bounds = new THREE.Box3().setFromObject(object);
        if (bounds.max.y <= -0.25 + 0.0001) return;
        elevatedMeshCount += 1;
        let ancestor: THREE.Object3D | null = object.parent;
        let belongsToEndpointRiser = false;
        while (ancestor && ancestor !== connector) {
          if (ancestor.userData.endpointRole === 'from' || ancestor.userData.endpointRole === 'to') {
            belongsToEndpointRiser = true;
            break;
          }
          ancestor = ancestor.parent;
        }
        assert(belongsToEndpointRiser, `${object.name} may emerge only inside a contracted endpoint footprint`);
      });
      assert(elevatedMeshCount > 0, 'endpoint portals need visible above-burial masonry and conduit geometry');

      expectedBranches.forEach((expected) => {
        const token = expected.id.toUpperCase().replace(/-/g, '_');
        const branch = connector.getObjectByName(`ISLAND_15_CONNECTOR_BRANCH_${token}`);
        const spine = connector.getObjectByName(`ISLAND_15_CONNECTOR_${token}_SPINE`);
        const fromRiser = connector.getObjectByName(`ISLAND_15_CONNECTOR_${token}_FROM_RISER`);
        const toRiser = connector.getObjectByName(`ISLAND_15_CONNECTOR_${token}_TO_RISER`);
        assert(Boolean(branch && spine && fromRiser && toRiser), `${expected.id} must retain its spine and two endpoint risers`);
        if (!branch || !spine || !fromRiser || !toRiser) return;

        assertEqual(branch.userData.assemblySocket, expected.socket, `${expected.id} socket`);
        assertEqual(branch.userData.minimumClearWidth, expected.clearWidth, `${expected.id} clear width`);
        assertEqual(branch.userData.endpointPortalCount, 2, `${expected.id} endpoint portal count`);
        assertEqual(branch.userData.returnBranchCount, 0, `${expected.id} return branch count`);
        assertPoint(spine.userData.spineStart, expected.start, `${expected.id} spine start`);
        assertPoint(spine.userData.spineEnd, expected.end, `${expected.id} spine end`);
        assertNear(spine.userData.spineYawDegrees, expected.yaw, `${expected.id} spine yaw`);
        assertEqual(spine.userData.coveredGallery, true, `${expected.id} must read as a covered gallery`);
        assertEqual(spine.userData.sapphireConduitCount, 2, `${expected.id} buried sapphire conduit count`);
        assertEqual(spine.userData.transverseArchCount, 4, `${expected.id} transverse arch count`);
        const spineBounds = new THREE.Box3().setFromObject(spine);
        assert(spineBounds.max.y <= -0.25 + 0.0001, `${expected.id} must remain below the protected-board top limit`);

        ([['from', fromRiser, expected.start, expected.fromYaw], ['to', toRiser, expected.end, expected.toYaw]] as const).forEach(([
          endpoint,
          riser,
          point,
          yaw,
        ]) => {
          assertPoint(riser.userData.bottom, point, `${expected.id} ${endpoint} riser bottom`);
          assertPoint(riser.userData.top, [point[0], 0.68, point[2]], `${expected.id} ${endpoint} riser top`);
          assertNear(riser.userData.yawDegrees, yaw, `${expected.id} ${endpoint} riser yaw`);
          assertEqual(riser.userData.pitchDegrees, 90, `${expected.id} ${endpoint} riser pitch`);
          assertEqual(riser.userData.clearWidth, expected.clearWidth, `${expected.id} ${endpoint} clear width`);
          assertEqual(riser.userData.topCollarExtentIntoShell, 0.18, `${expected.id} ${endpoint} shell overlap`);
          assertEqual(riser.userData.bottomCollarExtentIntoSpine, 0.18, `${expected.id} ${endpoint} spine overlap`);
          assertEqual(riser.userData.masonryCollarCount, 2, `${expected.id} ${endpoint} masonry collar count`);
          assertEqual(riser.userData.sapphireConduitCount, 4, `${expected.id} ${endpoint} sapphire conduit count`);
          assertEqual(riser.userData.silverButtressCount, 4, `${expected.id} ${endpoint} silver buttress count`);
          assertEqual(riser.userData.goldButtressInlayCount, 4, `${expected.id} ${endpoint} gold buttress count`);
          const riserBounds = new THREE.Box3().setFromObject(riser);
          assert(riserBounds.max.y <= 0.68 + 0.0001, `${expected.id} ${endpoint} portal must not exceed its accepted riser top`);
          assert(Boolean(riser.getObjectByName(`${riser.name}_MASONRY_SHELL_COLLAR`)), `${expected.id} ${endpoint} needs a shell collar`);
          assert(Boolean(riser.getObjectByName(`${riser.name}_MASONRY_SPINE_COLLAR`)), `${expected.id} ${endpoint} needs a spine collar`);
          assert(Boolean(riser.getObjectByName(`${riser.name}_LEFT_SAPPHIRE_RISER_CONDUIT`)), `${expected.id} ${endpoint} needs visible sapphire continuity`);
          assert(Boolean(riser.getObjectByName(`${riser.name}_REAR_SILVER_FLYING_BUTTRESS`)), `${expected.id} ${endpoint} needs authored rear circulation detail`);
        });
      });

      const forbiddenReturnNames: string[] = [];
      connector.traverse((object) => {
        if (/GALLERY_RETURN|SERVICE_RETURN/.test(object.name)) forbiddenReturnNames.push(object.name);
      });
      assertEqual(forbiddenReturnNames.length, 0, 'primary connector builder must not create gallery return branches');
    },
  },
  {
    name: 'builds only the Floor Plan V3 front-left architectural return as a buried service branch with two occupied towers',
    run: () => {
      const materials = createIsland15CrystalGlacierMaterials();
      const circulation = buildIsland15SharedInteriorCirculationPart(materials);
      circulation.updateMatrixWorld(true);

      assertEqual(circulation.userData.partId, 'shared-interior-circulation', 'return family keeps separate circulation ownership');
      assertEqual(circulation.userData.partFamily, 'architectural-return-system', 'return family declares its bounded architectural role');
      assertEqual(circulation.userData.floorPlanVersion, 3, 'return family consumes Floor Plan V3');
      assertEqual(circulation.userData.branchId, 'front-left-return', 'only the approved front-left representative branch is built');
      assertEqual(circulation.userData.returnBranchCount, 1, 'representative build owns exactly one return branch');
      assertEqual(circulation.userData.expansionBranchCount, 0, 'representative build cannot expand to sibling wings');
      assertEqual(circulation.userData.meshCount, 49, 'front-left return keeps the exact corrected mesh count');
      assertEqual(circulation.userData.triangleCount, 1636, 'front-left return keeps its deterministic corrected triangle count');
      assert(Number(circulation.userData.meshCount) <= 52, 'front-left return must stay inside its mesh hard cap');
      assert(Number(circulation.userData.triangleCount) <= 2200, 'front-left return must stay inside its triangle hard cap');
      assertEqual(circulation.userData.buriedSpineTopMaximumY, -0.56, 'horizontal return remains below the protected route');
      assertEqual(circulation.userData.maximumVisibleY, 3.45, 'service towers stop at the exact gallery socket elevation');
      assertEqual(circulation.userData.minimumClearWidth, 0.55, 'service return preserves its clear width');
      assertEqual(circulation.userData.minimumSocketOverlap, 0.16, 'service return preserves shell/spine collar overlap');
      assertEqual(circulation.userData.maximumAssemblyGap, 0.01, 'service return preserves the maximum assembly gap');
      assertEqual(circulation.userData.cutawayVisibilityWrites, 0, 'service return never owns cutaway visibility');

      const spine = circulation.getObjectByName('ISLAND_15_FRONT_LEFT_ARCHITECTURAL_RETURN_BURIED_SPINE');
      const oracleTower = circulation.getObjectByName('ISLAND_15_FRONT_LEFT_RETURN_ORACLE_SERVICE_TOWER');
      const coreTower = circulation.getObjectByName('ISLAND_15_FRONT_LEFT_RETURN_CORE_SERVICE_TOWER');
      assert(Boolean(spine && oracleTower && coreTower), 'front-left return needs its exact buried spine and two facing towers');
      if (!spine || !oracleTower || !coreTower) return;

      assertEqual(spine.userData.start.join(','), '-3.12,-0.78,2.92', 'buried return starts at the Oracle riser exactly');
      assertEqual(spine.userData.end.join(','), '-1.15,-0.78,1.45', 'buried return ends at the core riser exactly');
      assertEqual(spine.userData.yawDegrees, 126.7, 'buried return preserves its exact yaw');
      assertEqual(oracleTower.userData.socket.join(','), '-3.12,3.45,2.92', 'Oracle service socket remains exact');
      assertEqual(coreTower.userData.socket.join(','), '-1.15,3.45,1.45', 'core service socket remains exact');
      assertEqual(oracleTower.userData.yawDegrees, 126.7, 'Oracle service tower faces the core');
      assertEqual(coreTower.userData.yawDegrees, -53.3, 'core service tower faces the Oracle');
      ([oracleTower, coreTower] as const).forEach((tower) => {
        assertEqual(tower.userData.occupiedTierCount, 3, `${tower.name} must read as three stepped occupied tiers`);
        assertEqual(tower.userData.recessedLancetBayCount, 4, `${tower.name} needs four recessed cold-lit bays`);
        assertEqual(tower.userData.upperRiseSetback, 0.09, `${tower.name} upper rise must narrow into its host silhouette`);
        assertEqual(tower.userData.shouldersExpandTowardRoute, false, `${tower.name} shoulders may expand only into the host foundation`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_LOWER_OCCUPIED_TIER`)), `${tower.name} needs a lower occupied tier`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_MIDDLE_SETBACK_OCCUPIED_TIER`)), `${tower.name} needs a middle setback`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_UPPER_POROUS_OCCUPIED_TIER`)), `${tower.name} needs a porous upper rise`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_UPPER_RISE_RECESSED_LANCET_FRAME`)), `${tower.name} upper rise needs a real lancet opening`);
        assert(Boolean(tower.getObjectByName(`${tower.name}_SILVER_SNOW_CAPPED_GABLE`)), `${tower.name} needs a legible silver snow-capped gable`);
        assert(!tower.getObjectByName(`${tower.name}_COMPACT_CRYSTAL_KEYSTONE`), `${tower.name} correction must not retain a gem-like keystone`);
      });

      const spineBounds = new THREE.Box3().setFromObject(spine);
      const oracleBounds = new THREE.Box3().setFromObject(oracleTower);
      const coreBounds = new THREE.Box3().setFromObject(coreTower);
      assert(spineBounds.max.y <= -0.56 + 0.0001, 'no horizontal return geometry may emerge through the route');
      assert(oracleBounds.max.y <= 3.45 + 0.0001, 'Oracle service tower respects the gallery cap');
      assert(coreBounds.max.y <= 3.45 + 0.0001, 'core service tower respects the gallery cap');
      assert(Math.abs(oracleBounds.min.x - -3.7578963775987817) < 0.0001, 'Oracle tower keeps its tested world envelope');
      assert(Math.abs(coreBounds.max.x - -0.5121036224012183) < 0.0001, 'core tower keeps its tested world envelope');

      let countedMeshes = 0;
      let countedTriangles = 0;
      const forbiddenSiblingBranches: string[] = [];
      circulation.traverse((object) => {
        if (/FRONT_RIGHT_RETURN|REAR_LEFT_RETURN|REAR_RIGHT_RETURN/.test(object.name)) forbiddenSiblingBranches.push(object.name);
        if (!(object instanceof THREE.Mesh)) return;
        countedMeshes += 1;
        countedTriangles += object.geometry.index
          ? object.geometry.index.count / 3
          : object.geometry.getAttribute('position').count / 3;
        assertEqual(object.userData.partId, 'shared-interior-circulation', `${object.name} keeps return-system ownership`);
      });
      assertEqual(countedMeshes, 49, 'runtime geometry matches the declared corrected mesh count');
      assertEqual(countedTriangles, 1636, 'runtime geometry matches the declared corrected triangle count');
      assertEqual(forbiddenSiblingBranches.length, 0, 'representative build contains no unapproved sibling return');
    },
  },
  {
    name: 'integrates the accepted V6 cascading inhabited roofline while preserving V5 towers and ridge crystals',
    run: () => {
      const materials = createIsland15CrystalGlacierMaterials();
      const roofline = buildIsland15CastleRooflineSpireSystemPart(materials);
      roofline.updateMatrixWorld(true);

      let meshCount = 0;
      let triangleCount = 0;
      let allOpaque = true;
      let allDoubleSide = true;
      const meshNames = new Set<string>();
      roofline.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshCount += 1;
        assert(!meshNames.has(object.name), `roofline mesh name must be stable and unique: ${object.name}`);
        meshNames.add(object.name);
        const triangles = object.geometry.index
          ? object.geometry.index.count / 3
          : object.geometry.getAttribute('position').count / 3;
        triangleCount += triangles;
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        allOpaque = allOpaque && meshMaterials.every((material) => !material.transparent && material.opacity === 1);
        allDoubleSide = allDoubleSide && meshMaterials.every((material) => material.side === THREE.DoubleSide);
        assertEqual(object.userData.partId, 'castle-roofline-spire-system-v2', `${object.name} must retain roofline ownership`);
        assertEqual(object.userData.triangleCount, triangles, `${object.name} must expose stable triangle metadata`);
      });

      assertEqual(meshCount, 372, 'roofline must match the accepted V6 mesh count');
      assertEqual(triangleCount, 6704, 'roofline must match the accepted V6 triangle count');
      assertEqual(roofline.userData.meshCount, meshCount, 'root metadata must match measured mesh count');
      assertEqual(roofline.userData.triangleCount, triangleCount, 'root metadata must match measured triangle count');
      assertEqual(roofline.userData.sourcePacketVersion, 6, 'roofline must expose the accepted V6 packet version');
      assertEqual(roofline.userData.geometrySourceVersion, 6, 'roofline must expose the accepted V6 geometry version');
      assertEqual(roofline.userData.geometrySourceSha256, '7c5874eb6873470ddd330d23dc740ee86ffe1986fc62f2b0f99007936d216443', 'roofline must expose the accepted V6 source SHA');
      assertEqual(roofline.userData.geometryManifestSha256, '4afe3f7534d8ce8b3c1201d983b9cfb5d97797f63c471e6b720cdfdac07b5472', 'roofline must expose the accepted V6 geometry-manifest SHA');
      assertEqual(roofline.userData.preservedBaselineSourceSha256, '9eb0f93124233655864a6efdf4e13f55392d23deebeb820032da848b1d05e409', 'roofline must expose the frozen inherited V4 geometry-source SHA');
      assertEqual(roofline.userData.protectedV5MeshCount, 100, 'roofline metadata must record all 100 protected V5 tower/ridge meshes');
      assertEqual(roofline.userData.invalidatedV5CentralMeshCount, 116, 'roofline metadata must record the invalidated V5 central mesh family');
      assertEqual(roofline.userData.v6CentralMeshCount, 272, 'roofline metadata must record the complete V6 central replacement');
      assert(allOpaque, 'every roofline mesh must remain opaque');
      assert(allDoubleSide, 'every roofline surface must remain DoubleSide');

      const bounds = new THREE.Box3().setFromObject(roofline);
      const assertNear = (actual: number, expected: number, label: string) => {
        assert(Math.abs(actual - expected) < 0.0001, `${label} must remain ${expected}, received ${actual}`);
      };
      assertNear(bounds.min.x, -1.58600000469765, 'roofline min X');
      assertNear(bounds.max.x, 1.58600000469765, 'roofline max X');
      assertNear(bounds.min.y, 3.549999952316284, 'roofline base Y');
      assertNear(bounds.max.y, 6.82000000705719, 'roofline max Y');
      assertNear(bounds.min.z, -2.048799991607666, 'roofline min Z');
      assertNear(bounds.max.z, 2.048799991607666, 'roofline max Z');
      assert(bounds.getSize(new THREE.Vector3()).x > 3 && bounds.getSize(new THREE.Vector3()).z > 4, 'roofline must be a true-3D assembly, not a facade card');

      const apertureRay = new THREE.Raycaster(
        new THREE.Vector3(0, 10, -0.1),
        new THREE.Vector3(0, -1, 0),
        0,
        20,
      );
      assertEqual(apertureRay.intersectObject(roofline, true).length, 0, 'central crown aperture must remain physically open');
      assertEqual(meshNames.has('ridge-crystal-a-body'), true, 'roofline owns low ridge crystal A');
      assertEqual(meshNames.has('ridge-crystal-b-body'), true, 'roofline owns low ridge crystal B');
      const towerSpecs = [
        { id: 'T1', name: 'turret-north-west', socket: [-1.15, 3.78, -1.82], capY: 5.7 },
        { id: 'T2', name: 'turret-north-east', socket: [1.15, 3.78, -1.82], capY: 5.66 },
        { id: 'T3', name: 'turret-south-east', socket: [1.15, 3.78, 1.82], capY: 5.7 },
        { id: 'T4', name: 'turret-south-west', socket: [-1.15, 3.78, 1.82], capY: 5.66 },
      ] as const;
      const protectedV5Names = [...meshNames].filter((name) => (
        (name.startsWith('turret-') && name.includes('-v5-')) || name.startsWith('ridge-crystal-')
      ));
      const v6CentralNames = [...meshNames].filter((name) => name.startsWith('v6-'));
      assertEqual(protectedV5Names.length, 100, 'V6 must preserve all 100 accepted V5 T1-T4/A-B meshes');
      assertEqual(v6CentralNames.length, 272, 'V6 must replace the invalidated central family with exactly 272 meshes');
      assertEqual([...meshNames].filter((name) => name.startsWith('v6-lower-clerestory-lancet-') && name.endsWith('-glowing-glass')).length, 8, 'V6 lower occupied drum needs eight inhabited lancets');
      assertEqual([...meshNames].filter((name) => name.startsWith('v6-upper-drum-lancet-') && name.endsWith('-glowing-glass')).length, 8, 'V6 upper occupied drum needs eight inhabited lancets');
      assertEqual([...meshNames].filter((name) => /^v6-transept-(north|east|south|west)-occupied-body$/.test(name)).length, 4, 'V6 needs four attached transept shoulders');
      assertEqual([...meshNames].filter((name) => /^v6-turret-.*-inhabited-shoulder-web$/.test(name)).length, 4, 'V6 needs four tower integration webs');
      const towerBounds: THREE.Box3[] = [];
      towerSpecs.forEach(({ id, name, socket, capY }) => {
        const towerMeshes: THREE.Mesh[] = [];
        roofline.traverse((object) => {
          if (object instanceof THREE.Mesh && object.name.startsWith(`${name}-`)) towerMeshes.push(object);
        });
        assertEqual(towerMeshes.length, 23, `${id} must contain the accepted 23-mesh promoted-tower family`);
        assertEqual(towerMeshes.filter((mesh) => mesh.userData.family === 'promoted-shoulder-tower-silver-rib').length, 6, `${id} must expose six silver drum ribs`);
        assertEqual(towerMeshes.filter((mesh) => mesh.userData.family === 'promoted-shoulder-tower-gold-band').length, 3, `${id} must expose three restrained gold bands`);
        assertEqual(towerMeshes.filter((mesh) => mesh.userData.family === 'promoted-shoulder-tower-inhabited-lancet-glass').length, 2, `${id} must expose two inhabited glowing lancets`);
        assertEqual(towerMeshes.filter((mesh) => mesh.userData.family === 'promoted-shoulder-tower-inhabited-lancet-frame').length, 2, `${id} must expose two silver lancet frames`);
        assertEqual(towerMeshes.filter((mesh) => mesh.userData.family === 'promoted-shoulder-tower-cap-cradle').length, 4, `${id} must expose a four-brace silver cap cradle`);
        assertEqual(towerMeshes.filter((mesh) => mesh.userData.family === 'promoted-shoulder-tower-medium-cap').length, 2, `${id} must expose one two-mesh faceted crystal cap`);
        assert(towerMeshes.every((mesh) => mesh.userData.turretletId === id), `${id} meshes must retain stable tower ownership`);
        assert(towerMeshes.every((mesh) => mesh.userData.socket.join(',') === socket.join(',')), `${id} meshes must retain the exact inherited socket`);

        const plinth = roofline.getObjectByName(`${name}-v5-stepped-bearing-plinth`);
        const drum = roofline.getObjectByName(`${name}-v5-broad-sapphire-drum`);
        assert(Boolean(plinth && drum), `${id} must include its stepped plinth and broad sapphire drum`);
        if (!plinth || !drum) return;
        const plinthBounds = new THREE.Box3().setFromObject(plinth);
        const plinthSize = plinthBounds.getSize(new THREE.Vector3());
        assertNear(plinthSize.x, 0.74, `${id} plinth X envelope`);
        assertNear(plinthSize.z, 0.68, `${id} plinth Z envelope`);
        assertNear(plinthBounds.min.y, 3.56, `${id} bearing seat base`);
        assert(plinthBounds.max.y >= 3.78, `${id} bearing seat must physically overlap the unchanged eave shoulder`);
        const drumSize = new THREE.Box3().setFromObject(drum).getSize(new THREE.Vector3());
        assertNear(drumSize.x, 0.6068, `${id} broad drum X envelope`);
        assertNear(drumSize.z, 0.5576, `${id} broad drum Z envelope`);

        const promotedBounds = towerMeshes.reduce((union, mesh) => union.union(new THREE.Box3().setFromObject(mesh)), new THREE.Box3());
        assertNear(promotedBounds.max.y, capY, `${id} cap height`);
        const crownKeepout = new THREE.Box3(
          new THREE.Vector3(-0.575, -Infinity, -0.6),
          new THREE.Vector3(0.575, Infinity, 0.4),
        );
        assert(!promotedBounds.intersectsBox(crownKeepout), `${id} must preserve zero overlap with the central crown keepout`);
        towerBounds.push(promotedBounds);
      });
      towerBounds.forEach((towerBox, index) => {
        towerBounds.slice(index + 1).forEach((otherTowerBox) => {
          assert(!towerBox.intersectsBox(otherTowerBox), 'promoted tower XZ/Y envelopes must remain collision-free');
        });
      });
      assert(![...meshNames].some((name) => /^turret-(north-west|north-east|south-east|south-west)-(eave-seat|root-seat|eave-tether|gold-brace|crystal-(body|tip))$/.test(name)), 'V5 must retire all 24 inherited compact-turret meshes');
      assert(![...meshNames].some((name) => name.includes('CENTRAL_NEEDLE') || name.includes('CROWN_PINNACLE')), 'roofline must not leak accepted crown geometry');
    },
  },
  {
    name: 'keeps the rollback V4 blockout stable across canonical build levels without detached cutaways',
    run: () => {
      const materials = createIsland15CrystalGlacierMaterials();
      const bossDefinition = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'boss');
      const frostDefinition = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'hatchery');
      assert(Boolean(bossDefinition && frostDefinition), 'canonical boss and Frost Nest definitions must exist');
      if (!bossDefinition || !frostDefinition) return;

      const bossLevels = ([0, 1, 2, 3] as const).map((level) => (
        buildIsland15CrystalGlacierLandmark(bossDefinition, level, 'high', materials)
          .getObjectByName('ISLAND_15_SINGLE_CITADEL_BLOCKOUT_PART')
      ));
      bossLevels.forEach((blockout, level) => {
        assert(Boolean(blockout), `boss L${level} keeps the persistent rollback V4 blockout`);
        assertEqual(blockout?.userData.meshCount, 14, `boss L${level} keeps the exact rollback mesh count`);
        assertEqual(blockout?.userData.roomCount, 5, `boss L${level} keeps all five internal room sockets`);
      });
      const frostAnchor = buildIsland15CrystalGlacierLandmark(frostDefinition, 3, 'high', materials);
      let frostRenderableLeafCount = 0;
      frostAnchor.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          frostRenderableLeafCount += 1;
        }
      });
      assertEqual(frostRenderableLeafCount, 0, 'the Frost Nest is no longer a detached cutaway building');
      assertEqual(frostAnchor.userData.island15RoomCutawayRuntime, undefined, 'no V3 satellite cutaway runtime remains live');
    },
  },
  {
    name: 'keeps the aurora fully absent between natural display events',
    run: () => {
      assertEqual(resolveIsland15AuroraPhase(0).phase, 'absent', 'the environmental cycle begins with a truly clear polar sky');
      assertEqual(resolveIsland15AuroraPhase(34).phase, 'local-onset', 'the first light appears locally before it surrounds the island');
      assertEqual(resolveIsland15AuroraPhase(48).phase, 'sky-expansion', 'the local display expands across the sky');
      assertEqual(resolveIsland15AuroraPhase(65).phase, 'full-sky', 'the active display reaches complete 360-degree coverage');
      assertEqual(resolveIsland15AuroraPhase(80).phase, 'fade', 'the display fades as one environment rather than leaving a permanent patch');
      assertEqual(resolveIsland15AuroraPhase(90).phase, 'absent', 'the deterministic cycle returns to exact absence');
      assertEqual(resolveIsland15AuroraOpacity(0, 0), 0, 'the first curtain begins in a true quiet period');
      assert(resolveIsland15AuroraOpacity(40, 0) > 0, 'the first curtain has a gradual onset after its quiet period');
      const activeOpacity = resolveIsland15AuroraOpacity(65, 0);
      assert(activeOpacity > 0.24, 'the first curtain reaches a visible sustained active display');
      assert(activeOpacity <= 0.28, 'the active aurora remains a restrained atmospheric layer');
      assertEqual(resolveIsland15AuroraOpacity(90, 0), 0, 'the first curtain returns to a fully absent sky state');
      assertEqual(resolveIsland15AuroraOpacity(0, 1), 0, 'the second curtain has its own independent quiet schedule');
    },
  },
  {
    name: 'composes a varied full-sky aurora instead of one uniform luminous belt',
    run: () => {
      const total = 7;
      const spacing = Math.PI * 2 / total;
      const compositions = Array.from({ length: total }, (_, index) => resolveIsland15AuroraCurtainComposition(index, total));
      const range = (values: number[]) => Math.max(...values) - Math.min(...values);
      assert(range(compositions.map((composition) => composition.skyRadius)) > 7, 'curtains occupy visibly different depth layers');
      assert(range(compositions.map((composition) => composition.baseY)) > 5, 'curtains do not share one horizontal base band');
      assert(range(compositions.map((composition) => composition.height)) > 7, 'curtains mix tall falls with shorter rays');
      assert(range(compositions.map((composition) => composition.opacityCeiling)) > 0.12, 'primary curtains dominate quieter secondary rays');
      assertEqual(
        compositions.filter((composition) => composition.arcSpan > spacing * 1.45).length,
        2,
        'the composition owns exactly two long primary curtains',
      );
      for (let sample = 0; sample < 720; sample += 1) {
        const angle = sample / 720 * Math.PI * 2;
        const covered = compositions.some((composition) => {
          const distance = Math.abs(Math.atan2(
            Math.sin(angle - composition.centerAngle),
            Math.cos(angle - composition.centerAngle),
          ));
          return distance <= composition.arcSpan * 0.5;
        });
        assert(covered, `full-sky composition must retain azimuth coverage at sample ${sample}`);
      }
    },
  },
  {
    name: 'centres the intermittent 360 aurora on every authored camera and lights the same world',
    run: () => {
      const materials = createIsland15CrystalGlacierMaterials();
      const scene = new THREE.Scene();
      const sharedWater = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial(),
      );
      const runtime = createIsland15CrystalGlacierLivingAmbience(
        scene,
        ISLAND_3D_QUALITY_PROFILES.low,
        materials,
        sharedWater,
      );
      const skyDome = runtime.root.getObjectByName('ISLAND_15_AURORA_360_SKY_DOME');
      assert(Boolean(skyDome), 'the world owns one actual inside-view aurora sky shell');
      assertEqual(skyDome?.userData.island15AuroraSkyCoverage, '360-degree-inside-view', 'the dome declares complete azimuth coverage');
      assertEqual(skyDome?.userData.island15DarkSkyBreaks, true, 'the full display retains natural dark breaks');
      assertEqual(skyDome?.userData.island15AuroraForms.join(','), 'broad-wave,braided-rays,violet-pockets', 'the sky mixes several northern-light forms');
      const sparkleField = runtime.root.getObjectByName('ISLAND_15_CRYSTAL_SPARKLE_FIELD');
      assert(sparkleField instanceof THREE.Points, 'world-space glints make the glacier and palace crystals sparkle');
      assertEqual(
        sparkleField?.userData.island15CrystalSparkle,
        'independent-world-space-glints',
        'crystal sparkle remains a spatial layer instead of a full-screen effect',
      );
      const mountainField = runtime.root.getObjectByName('ISLAND_15_DISTANT_MOUNTAIN_MAIN_PEAKS') as THREE.InstancedMesh | undefined;
      assertEqual(
        mountainField?.geometry.userData.island15MountainFamily,
        'irregular-multi-summit-ridge',
        'the 360 basin uses authored ridge surfaces instead of repeated cone mountains',
      );

      runtime.animate(65);
      assertEqual(skyDome?.visible, true, 'the sky shell appears during the full-sky phase');
      const authoredCamera = new THREE.Vector3(-8.4, 18.6, 26.2);
      runtime.updateView?.(authoredCamera, new THREE.Vector3(0, 2.5, 0), true);
      assertEqual(
        skyDome?.position.toArray().join(','),
        authoredCamera.toArray().join(','),
        'the 360 shell follows the active authored camera instead of remaining a distant fixed spot',
      );
      assertEqual(skyDome?.userData.island15AzimuthExposureStabilized, true, 'authored POVs share one coherent distant-fold exposure');
      assertEqual(skyDome?.userData.island15ElevationExposureStabilized, true, 'survey and interior camera pitches retain the same northern-light canopy');
      const skyMaterial = (skyDome as THREE.Mesh | undefined)?.material as THREE.ShaderMaterial | undefined;
      const heroElevationOffset = Number(skyMaterial?.uniforms.uElevationOffset.value ?? 0);
      const heroRotation = skyDome?.rotation.y ?? 0;
      runtime.updateView?.(new THREE.Vector3(0, 27.5, 36.5), new THREE.Vector3(0, 2.2, 0), true);
      assert(
        Math.abs(Number(skyMaterial?.uniforms.uElevationOffset.value ?? 0) - heroElevationOffset) > 0.02,
        'the high survey compensates for its steeper downward pitch instead of losing the aurora above frame',
      );
      runtime.updateView?.(new THREE.Vector3(-27.5, 14.2, 2.6), new THREE.Vector3(0, 2.4, 0), true);
      assert(Math.abs((skyDome?.rotation.y ?? 0) - heroRotation) > 0.5, 'opposed cameras reorient the distant shell while physical curtains stay world-anchored');
      runtime.animate(65);
      assertEqual(skyMaterial?.uniforms.uTime.value, 0, 'reduced motion freezes only the sky deformation');
      assert(Number(skyMaterial?.uniforms.uOpacity.value ?? 0) > 0.6, 'reduced motion preserves the natural full-sky event schedule');
      const sparkleMaterial = (sparkleField as THREE.Points | undefined)?.material as THREE.ShaderMaterial | undefined;
      assert(Number(sparkleMaterial?.uniforms.uAuroraStrength.value ?? 0) > 0.9, 'the same aurora phase strengthens crystal glints');
      runtime.animate(0);
      assertEqual(skyDome?.visible, false, 'the same sky shell returns to exact absence during the quiet phase');

      runtime.root.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.InstancedMesh) {
          object.geometry.dispose();
        }
      });
      sharedWater.geometry.dispose();
      (sharedWater.material as THREE.Material).dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
];
