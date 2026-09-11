import * as THREE from 'three';
import {
  createIsland15CrystalPalaceLoader,
  Island15CrystalPalaceLoaderDisposedError,
  type Island15CrystalPalaceFetchResponse,
  type Island15CrystalPalaceParsedAsset,
} from '../../dev/island15/Island15CrystalPalaceLoader';
import {
  ISLAND_15_CRYSTAL_PALACE_NODE_NAMES,
  ISLAND_15_CRYSTAL_PALACE_ROOMS,
  Island15CrystalPalaceAssetValidationError,
} from '../../dev/island15/Island15CrystalPalaceRuntime';
import { assert, assertEqual, type TestCase } from './testHarness';

function group(name: string): THREE.Group {
  const result = new THREE.Group();
  result.name = name;
  return result;
}

function renderableGroup(name: string): THREE.Group {
  const result = group(name);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial(),
  );
  mesh.name = `${name}_TEST_MESH`;
  result.add(mesh);
  return result;
}

function buildValidAsset(): THREE.Group {
  const scene = group('TEST_PARSED_GLTF_SCENE');
  const palace = group(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.root);
  scene.add(palace);
  palace.add(renderableGroup(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.exterior));
  palace.add(renderableGroup(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.rear));
  palace.add(renderableGroup(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.crown));
  palace.add(renderableGroup(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.roof));
  palace.add(renderableGroup(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.southNearWall));

  ISLAND_15_CRYSTAL_PALACE_ROOMS.forEach((room) => {
    const names = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms[room];
    const roomRoot = group(names.root);
    roomRoot.add(renderableGroup(names.levels[1]));
    roomRoot.add(renderableGroup(names.levels[2]));
    roomRoot.add(renderableGroup(names.levels[3]));
    roomRoot.add(group(names.hitAnchor));
    roomRoot.add(group(names.occluders));
    palace.add(roomRoot);
  });
  return scene;
}

function successfulResponse(source = new ArrayBuffer(8)): Island15CrystalPalaceFetchResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: async () => source,
  };
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function captureFailure(action: Promise<unknown>): Promise<unknown> {
  try {
    await action;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}

export const island15CrystalPalaceLoaderTests: TestCase[] = [
  {
    name: 'fetches, parses, validates, then atomically attaches one owned palace scene',
    run: async () => {
      const attachmentRoot = group('ATTACHMENT_ROOT');
      const parsedScene = buildValidAsset();
      const bytes = new ArrayBuffer(16);
      const receivedSignal: { current: AbortSignal | null } = { current: null };
      let receivedResourcePath = '';
      let receivedBytes: ArrayBuffer | null = null;
      let disposeCount = 0;
      const loader = createIsland15CrystalPalaceLoader({
        url: '/assets/islands/island-015/palace/crystal-palace.glb?v=13',
        attachmentRoot,
        dependencies: {
          fetchAsset: async (_url, init) => {
            receivedSignal.current = init.signal;
            return successfulResponse(bytes);
          },
          parseAsset: async (source, resourcePath) => {
            receivedBytes = source;
            receivedResourcePath = resourcePath;
            assertEqual(attachmentRoot.children.length, 0, 'unvalidated parsed content is never mounted');
            return { scene: parsedScene };
          },
          disposeAsset: () => { disposeCount += 1; },
        },
      });

      assertEqual(loader.getStatus(), 'idle', 'loader begins idle');
      const runtime = await loader.load();
      assertEqual(loader.getStatus(), 'ready', 'successful validation advances loader to ready');
      assertEqual(receivedSignal.current?.aborted, false, 'active fetch receives a live abort signal');
      assertEqual(receivedBytes, bytes, 'parser receives the fetched ArrayBuffer by identity');
      assertEqual(receivedResourcePath, '/assets/islands/island-015/palace/', 'parser receives the GLB resource directory');
      assertEqual(attachmentRoot.children.length, 1, 'one parsed scene is attached after validation');
      assertEqual(attachmentRoot.children[0], parsedScene, 'the loader attaches its single owned scene container');
      assertEqual(loader.getOwnedAssetRoot(), parsedScene, 'loader exposes the one resource root it owns');
      assertEqual(loader.getRuntime(), runtime, 'loader exposes the bound presentation runtime');

      loader.dispose();
      loader.dispose();
      assertEqual(loader.getStatus(), 'disposed', 'disposal is terminal');
      assertEqual(attachmentRoot.children.length, 0, 'disposal detaches the owned scene');
      assertEqual(disposeCount, 1, 'owned resources are disposed exactly once');
      assertEqual(loader.getOwnedAssetRoot(), null, 'disposed loader releases its owned root reference');
      assertEqual(loader.getRuntime(), null, 'disposed loader releases its runtime reference');
    },
  },
  {
    name: 'dispose aborts an in-flight fetch and never starts parsing or attachment',
    run: async () => {
      const attachmentRoot = group('ATTACHMENT_ROOT');
      let parseCount = 0;
      const observedSignal: { current: AbortSignal | null } = { current: null };
      const loader = createIsland15CrystalPalaceLoader({
        url: '/palace.glb',
        attachmentRoot,
        dependencies: {
          fetchAsset: async (_url, init) => {
            observedSignal.current = init.signal;
            return new Promise<Island15CrystalPalaceFetchResponse>((_resolve, reject) => {
              init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
            });
          },
          parseAsset: async () => {
            parseCount += 1;
            return { scene: buildValidAsset() };
          },
        },
      });

      const pending = loader.load();
      assertEqual(loader.getStatus(), 'loading', 'load exposes loading state synchronously');
      loader.dispose();
      const failure = await captureFailure(pending);
      assertEqual(observedSignal.current?.aborted, true, 'dispose aborts the fetch signal');
      assert(failure instanceof DOMException && failure.name === 'AbortError', 'fetch abort rejection reaches the caller');
      assertEqual(loader.getStatus(), 'disposed', 'abort caused by disposal cannot overwrite terminal status');
      assertEqual(parseCount, 0, 'aborted fetch never reaches parser');
      assertEqual(attachmentRoot.children.length, 0, 'aborted load never attaches a scene');
    },
  },
  {
    name: 'disposes a parser result that resolves after teardown without mounting it',
    run: async () => {
      const attachmentRoot = group('ATTACHMENT_ROOT');
      const parseResult = deferred<Island15CrystalPalaceParsedAsset>();
      const lateScene = buildValidAsset();
      let disposedScene: THREE.Object3D | null = null;
      let disposeCount = 0;
      const loader = createIsland15CrystalPalaceLoader({
        url: '/palace.glb',
        attachmentRoot,
        dependencies: {
          fetchAsset: async () => successfulResponse(),
          parseAsset: async () => parseResult.promise,
          disposeAsset: (scene) => {
            disposedScene = scene;
            disposeCount += 1;
          },
        },
      });

      const pending = loader.load();
      await Promise.resolve();
      await Promise.resolve();
      loader.dispose();
      parseResult.resolve({ scene: lateScene });
      const failure = await captureFailure(pending);

      assert(failure instanceof Island15CrystalPalaceLoaderDisposedError, 'late parse rejects with typed disposal error');
      assertEqual(disposedScene, lateScene, 'late parser result is explicitly disposed');
      assertEqual(disposeCount, 1, 'late parser result is disposed once');
      assertEqual(attachmentRoot.children.length, 0, 'late parser result is never attached');
      assertEqual(loader.getOwnedAssetRoot(), null, 'late parser result never becomes the loader resource root');
    },
  },
  {
    name: 'validation failure disposes the rejected scene and leaves attachment atomic',
    run: async () => {
      const attachmentRoot = group('ATTACHMENT_ROOT');
      const invalidScene = buildValidAsset();
      invalidScene.getObjectByName(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms.HATCHERY.levels[2])?.removeFromParent();
      let disposedScene: THREE.Object3D | null = null;
      const loader = createIsland15CrystalPalaceLoader({
        url: '/palace.glb',
        attachmentRoot,
        dependencies: {
          fetchAsset: async () => successfulResponse(),
          parseAsset: async () => ({ scene: invalidScene }),
          disposeAsset: (scene) => { disposedScene = scene; },
        },
      });

      const failure = await captureFailure(loader.load());
      assert(failure instanceof Island15CrystalPalaceAssetValidationError, 'semantic binder rejects malformed GLB hierarchy');
      assertEqual(loader.getStatus(), 'failed', 'validation rejection exposes failed status');
      assertEqual(loader.getError(), failure, 'loader exposes the original validation error');
      assertEqual(disposedScene, invalidScene, 'rejected parsed scene is disposed by its sole owner');
      assertEqual(attachmentRoot.children.length, 0, 'validation failure cannot partially attach content');
      assertEqual(loader.getRuntime(), null, 'validation failure cannot publish a runtime');
    },
  },
  {
    name: 'repeated load calls share one operation and cannot double attach',
    run: async () => {
      const attachmentRoot = group('ATTACHMENT_ROOT');
      const fetchResult = deferred<Island15CrystalPalaceFetchResponse>();
      let fetchCount = 0;
      let parseCount = 0;
      const loader = createIsland15CrystalPalaceLoader({
        url: '/palace.glb',
        attachmentRoot,
        dependencies: {
          fetchAsset: async () => {
            fetchCount += 1;
            return fetchResult.promise;
          },
          parseAsset: async () => {
            parseCount += 1;
            return { scene: buildValidAsset() };
          },
        },
      });

      const first = loader.load();
      const second = loader.load();
      assertEqual(first, second, 'repeated load returns the same promise');
      fetchResult.resolve(successfulResponse());
      const [firstRuntime, secondRuntime] = await Promise.all([first, second]);
      assertEqual(firstRuntime, secondRuntime, 'shared load resolves one runtime instance');
      assertEqual(fetchCount, 1, 'shared load fetches once');
      assertEqual(parseCount, 1, 'shared load parses once');
      assertEqual(attachmentRoot.children.length, 1, 'shared load attaches exactly one scene');
      assertEqual(await loader.load(), firstRuntime, 'ready loader retains the same resolved operation');
      assertEqual(attachmentRoot.children.length, 1, 'load after ready cannot attach again');
    },
  },
];
