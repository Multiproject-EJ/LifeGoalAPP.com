import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR_ASSET =
  '/assets/islands/island-019/coaster-carnival-exterior-v009.glb?v=009';
export const ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR_DECISION = 'd016+d017+d018+d019';

export interface Island19AtlasExteriorOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  onReady?: (loaded: THREE.Object3D) => void;
  onError?: (error: unknown) => void;
}

export interface Island19AtlasExteriorRuntime {
  root: THREE.Group;
  release: () => void;
}

function disposeLoadedExterior(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial && material.map) material.map.dispose();
      material.dispose();
    });
  });
}

export function createIsland19CoasterCarnivalAtlasExterior(
  options: Island19AtlasExteriorOptions = {},
): Island19AtlasExteriorRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR_RUNTIME';
  root.userData = {
    decisionId: ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR_DECISION,
    representation: 'local-blender-three-material-single-atlas-static-exterior',
    asset: ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR_ASSET,
    ready: false,
    gameplayAuthority: false,
    boardGeometryOwned: false,
    wonderExpressRouteOwned: false,
    purposeBuiltRailPortalOwned: true,
    staticDrawCalls: 0,
    staticTriangles: 0,
    error: '',
  };

  let disposed = false;
  let loaded: THREE.Object3D | null = null;
  // Island Run contract tests construct presentation worlds in Node.  Loading
  // the browser-relative GLB there would make Node's fetch reject the URL.
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { root, release: () => undefined };
  }

  const loader = new GLTFLoader();
  loader.load(
    ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR_ASSET,
    (gltf) => {
      if (disposed) {
        disposeLoadedExterior(gltf.scene);
        return;
      }
      loaded = gltf.scene;
      loaded.name = 'ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR';
      let triangles = 0;
      let drawCalls = 0;
      loaded.traverse((object) => {
        object.userData.gameplayAuthority = false;
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = options.castShadow ?? true;
        object.receiveShadow = options.receiveShadow ?? true;
        const geometry = object.geometry;
        triangles += geometry.index
          ? geometry.index.count / 3
          : (geometry.getAttribute('position')?.count ?? 0) / 3;
        drawCalls += Array.isArray(object.material) ? object.material.length : 1;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial) {
            // Preserve Blender's rock/paint/metal response instead of flattening
            // every atlas slot back to the old Circuit H plastic finish.
            material.envMapIntensity = 0.92;
          }
        });
      });
      root.add(loaded);
      Object.assign(root.userData, {
        ready: true,
        staticTriangles: Math.round(triangles),
        staticDrawCalls: drawCalls,
        requiredStaticBatchPresent: Boolean(loaded.getObjectByName('ISLAND_19_CIRCUIT_I_STATIC_BATCH')),
      });
      options.onReady?.(loaded);
    },
    undefined,
    (error) => {
      if (disposed) return;
      root.userData.ready = false;
      root.userData.error = error instanceof Error ? error.message : String(error);
      options.onError?.(error);
    },
  );

  return {
    root,
    release: () => {
      disposed = true;
      if (loaded) {
        root.remove(loaded);
        disposeLoadedExterior(loaded);
        loaded = null;
      }
    },
  };
}
