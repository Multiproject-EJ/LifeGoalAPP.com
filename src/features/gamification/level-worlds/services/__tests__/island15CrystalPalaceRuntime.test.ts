import * as THREE from 'three';
import {
  bindIsland15CrystalPalaceRuntime,
  ISLAND_15_CRYSTAL_PALACE_NODE_NAMES,
  ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS,
  ISLAND_15_CRYSTAL_PALACE_ROOM_BY_RENDERER_ID,
  ISLAND_15_CRYSTAL_PALACE_ROOMS,
  Island15CrystalPalaceAssetValidationError,
  resolveIsland15CrystalPalaceRoom,
  validateIsland15CrystalPalaceAsset,
} from '../../dev/island15/Island15CrystalPalaceRuntime';
import { assert, assertEqual, type TestCase } from './testHarness';

function group(name: string): THREE.Group {
  const result = new THREE.Group();
  result.name = name;
  return result;
}

function mesh(name: string, useMaterialArray = false): THREE.Mesh {
  const material = useMaterialArray
    ? [new THREE.MeshStandardMaterial({ color: 0x66ddff }), new THREE.MeshStandardMaterial({ color: 0xa85cff })]
    : new THREE.MeshStandardMaterial({ color: 0x66ddff });
  const result = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  result.name = name;
  return result;
}

function buildValidAsset(): THREE.Group {
  const scene = group('TEST_IMPORT_SCENE');
  const palace = group(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.root);
  scene.add(palace);

  const permanentExterior = mesh(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.exterior);
  palace.add(permanentExterior);
  palace.add(mesh(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.rear));
  palace.add(mesh(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.crown));
  palace.add(mesh(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.roof));
  palace.add(mesh(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.southNearWall));

  ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((rendererId) => {
    ([1, 2, 3] as const).forEach((minimumLevel) => {
      const reveal = mesh(`TEST_EXTERIOR_REVEAL_${rendererId.toUpperCase()}_L${minimumLevel}`);
      reveal.userData.island15BuildRevealRendererId = rendererId;
      reveal.userData.island15BuildRevealMinLevel = minimumLevel;
      permanentExterior.add(reveal);
    });
  });
  const dormantAuthorDetail = mesh('TEST_UNTAGGED_AUTHOR_DORMANT_DETAIL');
  dormantAuthorDetail.visible = false;
  permanentExterior.add(dormantAuthorDetail);

  ISLAND_15_CRYSTAL_PALACE_ROOMS.forEach((room) => {
    const names = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms[room];
    const roomRoot = group(names.root);
    ([1, 2, 3] as const).forEach((stage) => {
      const stageRoot = group(names.levels[stage]);
      stageRoot.add(mesh(`${names.levels[stage]}_TEST_MESH`, stage === 2));
      roomRoot.add(stageRoot);
    });
    roomRoot.add(group(names.hitAnchor));
    const occluders = mesh(names.occluders);
    occluders.userData.island15FocusOccluderForRoom = room;
    roomRoot.add(occluders);
    palace.add(roomRoot);
  });
  return scene;
}

function expectValidationFailure(source: THREE.Object3D, expectedMessage: string): void {
  let failure: unknown;
  try {
    validateIsland15CrystalPalaceAsset(source);
  } catch (error) {
    failure = error;
  }
  assert(failure instanceof Island15CrystalPalaceAssetValidationError, 'invalid palace must fail with the typed validation error');
  assert((failure as Error).message.includes(expectedMessage), `validation failure must mention ${expectedMessage}`);
}

function isDescendantOf(object: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (cursor === ancestor) return true;
    cursor = cursor.parent;
  }
  return false;
}

export const island15CrystalPalaceRuntimeTests: TestCase[] = [
  {
    name: 'validates one complete semantic palace and maps renderer event to Mystery',
    run: () => {
      const source = buildValidAsset();
      const nodes = validateIsland15CrystalPalaceAsset(source);
      const runtime = bindIsland15CrystalPalaceRuntime(source);

      assertEqual(nodes.root.name, ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.root, 'binder resolves exactly one palace root');
      assertEqual(resolveIsland15CrystalPalaceRoom('event'), 'MYSTERY', 'renderer event maps to the Mystery room');
      assertEqual(ISLAND_15_CRYSTAL_PALACE_ROOM_BY_RENDERER_ID.event, 'MYSTERY', 'typed mapping preserves the renderer adapter');
      assertEqual(
        runtime.getHitAnchor('event'),
        nodes.rooms.MYSTERY.hitAnchor,
        'event interaction uses the named Mystery hit anchor',
      );
      ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((rendererId) => {
        const room = ISLAND_15_CRYSTAL_PALACE_ROOM_BY_RENDERER_ID[rendererId];
        assertEqual(
          runtime.getHitAnchor(rendererId).name,
          ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms[room].hitAnchor,
          `${rendererId} resolves its stable named hit anchor`,
        );
        const hitAnchor = runtime.getHitAnchor(rendererId);
        const raycastProxy = hitAnchor.children.find((child) => child.userData.island15CrystalPalaceHitProxy === true);
        assert(raycastProxy instanceof THREE.Mesh, `${rendererId} receives a bounded raycastable proxy when its authored anchor is empty`);
      });
    },
  },
  {
    name: 'rejects missing, duplicate, misplaced, and review-only production nodes',
    run: () => {
      const missing = buildValidAsset();
      const missingName = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms.HABIT.levels[3];
      missing.getObjectByName(missingName)?.removeFromParent();
      expectValidationFailure(missing, `missing required node ${missingName}`);

      const duplicate = buildValidAsset();
      const duplicateName = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.crown;
      duplicate.getObjectByName(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.root)?.add(group(duplicateName));
      expectValidationFailure(duplicate, `duplicate required node ${duplicateName}`);

      const misplaced = buildValidAsset();
      const misplacedNode = misplaced.getObjectByName(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms.WISDOM.hitAnchor);
      misplacedNode?.removeFromParent();
      if (misplacedNode) misplaced.getObjectByName(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.root)?.add(misplacedNode);
      expectValidationFailure(misplaced, 'is outside its room root');

      const namedReviewProxy = buildValidAsset();
      namedReviewProxy.add(group('ISLAND_15_REVIEW_BOARD_PROXY_DIAGNOSTIC'));
      expectValidationFailure(namedReviewProxy, 'review-only node');

      const taggedReviewProxy = buildValidAsset();
      const tagged = group('DIAGNOSTIC_TILE_RING');
      tagged.userData.reviewProxyOnly = true;
      taggedReviewProxy.add(tagged);
      expectValidationFailure(taggedReviewProxy, 'review-only node');

      const malformedReveal = buildValidAsset();
      const malformed = mesh('MALFORMED_BUILD_REVEAL');
      malformed.userData.island15BuildRevealRendererId = 'not-a-room';
      malformed.userData.island15BuildRevealMinLevel = 2;
      malformedReveal.getObjectByName(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.root)?.add(malformed);
      expectValidationFailure(malformedReveal, 'invalid Island 015 build-reveal tag pair');
    },
  },
  {
    name: 'keeps every canonically funded room physically present across focus modes',
    run: () => {
      const runtime = bindIsland15CrystalPalaceRuntime(buildValidAsset());
      const expectedLevels = {
        hatchery: 1,
        habit: 2,
        event: 3,
        wisdom: 0,
        boss: 2,
      } as const;
      runtime.setBuildLevels(expectedLevels);

      ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((rendererId) => {
        const room = ISLAND_15_CRYSTAL_PALACE_ROOM_BY_RENDERER_ID[rendererId];
        const level = expectedLevels[rendererId];
        ([1, 2, 3] as const).forEach((stage) => {
          assertEqual(
            runtime.nodes.rooms[room].levels[stage].visible,
            stage <= level,
            `${rendererId} L${stage} respects its canonical build level in overview`,
          );
        });
      });

      (['hatchery', 'habit', 'event', 'wisdom'] as const).forEach((rendererId) => {
        runtime.setFocusMode(rendererId);
        ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((candidate) => {
          const room = ISLAND_15_CRYSTAL_PALACE_ROOM_BY_RENDERER_ID[candidate];
          const level = expectedLevels[candidate];
          ([1, 2, 3] as const).forEach((stage) => {
            assertEqual(
              runtime.nodes.rooms[room].levels[stage].visible,
              stage <= level,
              `${rendererId} focus cannot hide ${candidate} funded L${stage}`,
            );
          });
        });
      });

      runtime.setBuildLevels({ wisdom: 3 });
      assertEqual(runtime.getBuildLevels().wisdom, 3, 'partial updates advance the requested room');
      assertEqual(runtime.getBuildLevels().habit, 2, 'partial updates preserve all other room levels');

      let rejected = false;
      try {
        runtime.setBuildLevels({ boss: 4 } as never);
      } catch {
        rejected = true;
      }
      assert(rejected, 'out-of-contract build levels are rejected at runtime boundaries');
      assertEqual(runtime.getBuildLevels().boss, 2, 'a rejected update cannot mutate the current presentation level');
    },
  },
  {
    name: 'models one Boss Hall hub plus four internal landmark rooms with room-only progression',
    run: () => {
      const runtime = bindIsland15CrystalPalaceRuntime(buildValidAsset());
      assertEqual(
        ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.join(','),
        'hatchery,habit,event,wisdom,boss',
        'the palace exposes exactly four landmark rooms and one Boss Hall hub',
      );
      assertEqual(new Set(ISLAND_15_CRYSTAL_PALACE_ROOMS).size, 5, 'the semantic floor plan contains exactly five unique rooms');
      assertEqual(resolveIsland15CrystalPalaceRoom('boss'), 'BOSS', 'the canonical 36-stop room remains the Boss Hall hub');

      ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((rendererId) => {
        const roomId = resolveIsland15CrystalPalaceRoom(rendererId);
        const room = runtime.nodes.rooms[roomId];
        assert(isDescendantOf(room.root, runtime.nodes.root), `${rendererId} is physically nested in the one palace root`);
        ([1, 2, 3] as const).forEach((stage) => {
          assert(isDescendantOf(room.levels[stage], room.root), `${rendererId} L${stage} belongs only to its interior room`);
        });
      });

      const permanentNodes = Object.values(runtime.nodes.permanent);
      const permanentIdentity = permanentNodes.map((node) => node.uuid).join(',');
      const permanentChildCounts = permanentNodes.map((node) => node.children.length).join(',');
      const overviewIdentity = Object.values(runtime.nodes.overview).map((node) => node.uuid).join(',');
      ([0, 1, 2, 3] as const).forEach((level) => {
        runtime.setBuildLevels({
          hatchery: level,
          habit: level,
          event: level,
          wisdom: level,
          boss: level,
        });
        assertEqual(
          permanentNodes.map((node) => node.uuid).join(','),
          permanentIdentity,
          `L${level} preserves the same monumental exterior objects`,
        );
        assertEqual(
          permanentNodes.map((node) => node.children.length).join(','),
          permanentChildCounts,
          `L${level} cannot add or remove exterior architecture`,
        );
        assertEqual(
          Object.values(runtime.nodes.overview).map((node) => node.uuid).join(','),
          overviewIdentity,
          `L${level} preserves the complete overview shell`,
        );
        assert(permanentNodes.every((node) => node.visible), `L${level} keeps all permanent exterior families visible`);
      });
    },
  },
  {
    name: 'keeps permanent architecture visible and opens only the focused room cutaway',
    run: () => {
      const runtime = bindIsland15CrystalPalaceRuntime(buildValidAsset());
      assertEqual(runtime.nodes.overview.roof.visible, true, 'overview preserves the complete palace roof silhouette');
      assertEqual(runtime.nodes.overview.southNearWall.visible, true, 'overview preserves the complete camera-near facade');
      ISLAND_15_CRYSTAL_PALACE_ROOMS.forEach((room) => {
        assertEqual(runtime.nodes.rooms[room].occluders.visible, true, `${room} occluders close in overview`);
      });

      runtime.nodes.permanent.crown.visible = false;
      runtime.setFocusMode('habit');
      assertEqual(runtime.getFocusMode(), 'habit', 'runtime records the active presentation focus');
      assertEqual(runtime.nodes.rooms.HABIT.occluders.visible, false, 'Habit focus opens the Habit room facade');
      assertEqual(runtime.nodes.rooms.HATCHERY.occluders.visible, true, 'Habit focus keeps the Frost room fabric closed');
      assertEqual(runtime.nodes.rooms.MYSTERY.occluders.visible, true, 'Habit focus keeps the Mystery room fabric closed');
      assertEqual(runtime.nodes.overview.roof.visible, true, 'focus never removes the complete shared roof');
      assertEqual(runtime.nodes.overview.southNearWall.visible, true, 'focus never removes the south wall wholesale');
      assertEqual(runtime.nodes.permanent.rear.visible, true, 'focus never removes the rear shell wholesale');
      assertEqual(runtime.nodes.permanent.crown.visible, true, 'focus changes restore the permanent crown');

      runtime.setFocusMode('event');
      assertEqual(runtime.nodes.rooms.MYSTERY.occluders.visible, false, 'event focus opens the Mystery room facade');
      assertEqual(runtime.nodes.rooms.HABIT.occluders.visible, true, 'changing focus closes the prior room veil');
    },
  },
  {
    name: 'reveals tagged exterior descendants from canonical L0-L3 inputs without losing focus state',
    run: () => {
      const runtime = bindIsland15CrystalPalaceRuntime(buildValidAsset());
      const reveal = (rendererId: string, level: number) => runtime.root.getObjectByName(
        `TEST_EXTERIOR_REVEAL_${rendererId.toUpperCase()}_L${level}`,
      );
      ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((rendererId) => {
        ([1, 2, 3] as const).forEach((level) => {
          assertEqual(reveal(rendererId, level)?.visible, false, `${rendererId} L${level} exterior reveal starts hidden at L0`);
        });
      });
      assertEqual(runtime.root.getObjectByName('TEST_UNTAGGED_AUTHOR_DORMANT_DETAIL')?.visible, false, 'untagged author visibility is preserved');

      runtime.setFocusMode('habit');
      ([1, 2, 3] as const).forEach((level) => {
        runtime.setBuildLevels({ habit: level });
        ([1, 2, 3] as const).forEach((minimumLevel) => {
          assertEqual(
            reveal('habit', minimumLevel)?.visible,
            minimumLevel <= level,
            `Habit L${level} applies its exterior reveal threshold L${minimumLevel}`,
          );
        });
        assertEqual(runtime.nodes.rooms.HABIT.occluders.visible, false, `Habit focus persists through L${level}`);
        assertEqual(runtime.nodes.rooms.HATCHERY.occluders.visible, true, `unfocused Frost fabric persists through Habit L${level}`);
      });
      assertEqual(reveal('hatchery', 1)?.visible, false, 'a Habit update cannot reveal Frost exterior descendants');

      runtime.setBuildLevels({ hatchery: 3, event: 2, wisdom: 1, boss: 3 });
      assertEqual(reveal('hatchery', 3)?.visible, true, 'Frost reaches its L3 exterior reveal');
      assertEqual(reveal('event', 2)?.visible, true, 'Observatory reaches its L2 exterior reveal');
      assertEqual(reveal('event', 3)?.visible, false, 'Observatory L3 remains hidden at L2');
      assertEqual(reveal('wisdom', 1)?.visible, true, 'Oracle reaches its L1 exterior reveal');
      assertEqual(reveal('boss', 3)?.visible, true, 'Boss reaches its L3 exterior reveal');
      runtime.setFocusMode('overview');
      ISLAND_15_CRYSTAL_PALACE_ROOMS.forEach((room) => {
        assertEqual(runtime.nodes.rooms[room].occluders.visible, true, `${room} fabric closes again in overview`);
      });
    },
  },
  {
    name: 'clones a cumulative room level with independent geometry and material ownership',
    run: () => {
      const runtime = bindIsland15CrystalPalaceRuntime(buildValidAsset());
      runtime.setBuildLevels({ hatchery: 1 });
      const roomNames = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms.HATCHERY;
      const first = runtime.cloneRoomAtLevel('hatchery', 2);
      const second = runtime.cloneRoomAtLevel('hatchery', 2);

      assertEqual(first.getObjectByName(roomNames.levels[1])?.visible, true, 'clone L2 includes additive L1 geometry');
      assertEqual(first.getObjectByName(roomNames.levels[2])?.visible, true, 'clone L2 includes additive L2 geometry');
      assertEqual(first.getObjectByName(roomNames.levels[3])?.visible, false, 'clone L2 excludes additive L3 geometry');
      assertEqual(first.getObjectByName(roomNames.occluders)?.visible, false, 'room-local facade does not hide the construction clone');
      assertEqual(first.getObjectByName(roomNames.hitAnchor), undefined, 'construction clones exclude interaction hit anchors');
      assertEqual(runtime.nodes.rooms.HATCHERY.levels[2].visible, false, 'cloning does not mutate live room visibility');

      const sourceMesh = runtime.nodes.rooms.HATCHERY.levels[2].getObjectByName(`${roomNames.levels[2]}_TEST_MESH`) as THREE.Mesh;
      const firstMesh = first.getObjectByName(`${roomNames.levels[2]}_TEST_MESH`) as THREE.Mesh;
      const secondMesh = second.getObjectByName(`${roomNames.levels[2]}_TEST_MESH`) as THREE.Mesh;
      assert(sourceMesh.geometry !== firstMesh.geometry, 'clone owns a new BufferGeometry');
      assert(firstMesh.geometry !== secondMesh.geometry, 'separate clones do not share BufferGeometry');
      assert(Array.isArray(sourceMesh.material) && Array.isArray(firstMesh.material), 'test stage preserves material arrays');
      if (Array.isArray(sourceMesh.material) && Array.isArray(firstMesh.material) && Array.isArray(secondMesh.material)) {
        assert(sourceMesh.material[0] !== firstMesh.material[0], 'clone owns a new first material');
        assert(sourceMesh.material[1] !== firstMesh.material[1], 'clone owns a new second material');
        assert(firstMesh.material[0] !== secondMesh.material[0], 'separate clones do not share materials');
      }
      assertEqual(first.userData.island15CrystalPalaceRoomClone, true, 'clone declares presentation-only room ownership');
      assertEqual(first.userData.rendererLandmarkId, 'hatchery', 'clone retains renderer identity');
      assertEqual(first.userData.buildLevel, 2, 'clone records its isolated build level');
    },
  },
];
