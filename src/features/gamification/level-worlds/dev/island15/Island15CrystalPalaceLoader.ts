import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  bindIsland15CrystalPalaceRuntime,
  type Island15CrystalPalaceRuntime,
} from './Island15CrystalPalaceRuntime';

/**
 * Presentation-only async ownership boundary for the Island 015 palace GLB.
 *
 * The loader never reads or writes gameplay. It owns one parsed scene container,
 * attaches that container only after the semantic runtime binder accepts it, and
 * disposes that same container when the loader is torn down.
 */

export type Island15CrystalPalaceLoadStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'failed'
  | 'disposed';

export interface Island15CrystalPalaceFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface Island15CrystalPalaceParsedAsset {
  readonly scene: THREE.Object3D;
}

export interface Island15CrystalPalaceLoaderDependencies {
  readonly fetchAsset?: (
    url: string,
    init: { readonly signal: AbortSignal },
  ) => Promise<Island15CrystalPalaceFetchResponse>;
  readonly parseAsset?: (
    source: ArrayBuffer,
    resourcePath: string,
  ) => Promise<Island15CrystalPalaceParsedAsset>;
  readonly disposeAsset?: (source: THREE.Object3D) => void;
}

export interface Island15CrystalPalaceLoaderOptions {
  readonly url: string;
  readonly attachmentRoot: THREE.Object3D;
  readonly dependencies?: Island15CrystalPalaceLoaderDependencies;
}

export interface Island15CrystalPalaceLoader {
  getStatus(): Island15CrystalPalaceLoadStatus;
  getError(): unknown | null;
  getRuntime(): Island15CrystalPalaceRuntime | null;
  /** The one parsed scene container owned by this loader, or null before mount/after disposal. */
  getOwnedAssetRoot(): THREE.Object3D | null;
  load(): Promise<Island15CrystalPalaceRuntime>;
  dispose(): void;
}

export class Island15CrystalPalaceLoaderDisposedError extends Error {
  constructor() {
    super('Island 015 crystal palace loader was disposed before the asset became ready.');
    this.name = 'Island15CrystalPalaceLoaderDisposedError';
  }
}

export class Island15CrystalPalaceFetchError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number, statusText: string) {
    super(`Failed to fetch Island 015 crystal palace GLB (${status} ${statusText}) from ${url}`);
    this.name = 'Island15CrystalPalaceFetchError';
    this.url = url;
    this.status = status;
  }
}

function resolveResourcePath(url: string): string {
  const queryIndex = url.search(/[?#]/);
  const pathname = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
  const slashIndex = pathname.lastIndexOf('/');
  return slashIndex >= 0 ? pathname.slice(0, slashIndex + 1) : '';
}

async function defaultFetchAsset(
  url: string,
  init: { readonly signal: AbortSignal },
): Promise<Island15CrystalPalaceFetchResponse> {
  return fetch(url, { signal: init.signal });
}

async function defaultParseAsset(
  source: ArrayBuffer,
  resourcePath: string,
): Promise<Island15CrystalPalaceParsedAsset> {
  const gltf = await new GLTFLoader().parseAsync(source, resourcePath);
  return { scene: gltf.scene };
}

function disposeMaterialTextures(material: THREE.Material, textures: Set<THREE.Texture>): void {
  Object.values(material).forEach((candidate) => {
    if (candidate instanceof THREE.Texture) textures.add(candidate);
  });
}

/** Disposes shared GLB resources once even when several meshes reference them. */
export function disposeIsland15CrystalPalaceAsset(source: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  source.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => {
        materials.add(material);
        disposeMaterialTextures(material, textures);
      });
    } else if (object instanceof THREE.Sprite) {
      materials.add(object.material);
      disposeMaterialTextures(object.material, textures);
    }
  });

  textures.forEach((texture) => texture.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export function createIsland15CrystalPalaceLoader(
  options: Island15CrystalPalaceLoaderOptions,
): Island15CrystalPalaceLoader {
  const dependencies = options.dependencies ?? {};
  const fetchAsset = dependencies.fetchAsset ?? defaultFetchAsset;
  const parseAsset = dependencies.parseAsset ?? defaultParseAsset;
  const disposeAsset = dependencies.disposeAsset ?? disposeIsland15CrystalPalaceAsset;
  const abortController = new AbortController();

  let status: Island15CrystalPalaceLoadStatus = 'idle';
  let error: unknown | null = null;
  let runtime: Island15CrystalPalaceRuntime | null = null;
  let ownedAssetRoot: THREE.Object3D | null = null;
  let loadPromise: Promise<Island15CrystalPalaceRuntime> | null = null;
  const disposedAssets = new WeakSet<THREE.Object3D>();

  const disposeOnce = (source: THREE.Object3D) => {
    if (disposedAssets.has(source)) return;
    disposedAssets.add(source);
    source.removeFromParent();
    disposeAsset(source);
  };

  const assertAlive = () => {
    if (status === 'disposed') throw new Island15CrystalPalaceLoaderDisposedError();
  };

  const performLoad = async (): Promise<Island15CrystalPalaceRuntime> => {
    let parsedScene: THREE.Object3D | null = null;
    try {
      const response = await fetchAsset(options.url, { signal: abortController.signal });
      assertAlive();
      if (!response.ok) {
        throw new Island15CrystalPalaceFetchError(options.url, response.status, response.statusText);
      }

      const source = await response.arrayBuffer();
      assertAlive();
      const parsed = await parseAsset(source, resolveResourcePath(options.url));
      parsedScene = parsed.scene;

      // Some parsers cannot be cancelled once decoding begins. Their late result
      // is still owned and disposed here, never attached after teardown.
      assertAlive();
      const boundRuntime = bindIsland15CrystalPalaceRuntime(parsedScene);
      assertAlive();

      // This is the sole mount operation and occurs only after full validation.
      options.attachmentRoot.add(parsedScene);
      ownedAssetRoot = parsedScene;
      runtime = boundRuntime;
      parsedScene = null;
      status = 'ready';
      return boundRuntime;
    } catch (caught) {
      if (parsedScene) disposeOnce(parsedScene);
      if (status !== 'disposed') {
        error = caught;
        status = 'failed';
      }
      throw caught;
    }
  };

  return {
    getStatus: () => status,
    getError: () => error,
    getRuntime: () => runtime,
    getOwnedAssetRoot: () => ownedAssetRoot,
    load: () => {
      if (loadPromise) return loadPromise;
      if (status === 'disposed') return Promise.reject(new Island15CrystalPalaceLoaderDisposedError());
      status = 'loading';
      loadPromise = performLoad();
      return loadPromise;
    },
    dispose: () => {
      if (status === 'disposed') return;
      status = 'disposed';
      abortController.abort();
      if (ownedAssetRoot) disposeOnce(ownedAssetRoot);
      ownedAssetRoot = null;
      runtime = null;
    },
  };
}
