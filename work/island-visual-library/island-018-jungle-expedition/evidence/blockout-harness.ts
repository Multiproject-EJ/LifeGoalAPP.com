import * as THREE from 'three';
import {
  configureIsland018JungleExpeditionRenderer,
  createIsland018JungleExpeditionEnvironment,
  createIsland018JungleExpeditionLookDevLights,
  createIsland018JungleExpeditionModel,
  frameIsland018JungleExpeditionCamera,
} from './Island18JungleExpeditionBlockoutFactory';

type CaptureRequest = {
  id?: string;
  azimuthDegrees?: number;
  elevationDegrees?: number;
  role?: string;
};

declare global {
  interface Window {
    __IMG2THREEJS_READY__?: boolean;
    __IMG2THREEJS_CAPTURE__?: (request: CaptureRequest) => Promise<Record<string, unknown>>;
    __IMG2THREEJS_SNAPSHOT__?: () => Record<string, unknown>;
  }
}

const mount = document.querySelector<HTMLDivElement>('#app');
if (!mount) throw new Error('Missing #app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd9ff);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
configureIsland018JungleExpeditionRenderer(renderer);
mount.appendChild(renderer.domElement);

const model = createIsland018JungleExpeditionModel({
  castShadow: true,
  receiveShadow: true,
  qualityPriority: 'reference-fidelity',
});
scene.add(model);
scene.add(createIsland018JungleExpeditionLookDevLights('reference'));
scene.environment = createIsland018JungleExpeditionEnvironment(renderer);

function renderFrames(count = 3) {
  for (let index = 0; index < count; index += 1) {
    renderer.render(scene, camera);
  }
}

function frame(request: CaptureRequest = {}) {
  frameIsland018JungleExpeditionCamera(camera, model, {
    margin: request.role === 'head-closeup' ? 0.82 : 1.18,
    azimuthDeg: request.azimuthDegrees ?? 0,
    elevationDeg: request.elevationDegrees ?? 7,
  });
  renderFrames();
}

function sampleCanvas() {
  const canvas = renderer.domElement;
  const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  const pixels = new Uint8Array(4 * 80 * 80);
  if (!context) return { sampled: false };
  context.readPixels(
    Math.max(0, Math.floor(canvas.width / 2 - 40)),
    Math.max(0, Math.floor(canvas.height / 2 - 40)),
    80,
    80,
    context.RGBA,
    context.UNSIGNED_BYTE,
    pixels,
  );
  let nonSky = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    if (Math.abs(red - 143) + Math.abs(green - 217) + Math.abs(blue - 255) > 38) {
      nonSky += 1;
    }
  }
  return { sampled: true, nonSkyPixels: nonSky, samplePixels: pixels.length / 4 };
}

function snapshot() {
  const runtime = model.userData.sculptRuntime as
    | { meshes?: Record<string, THREE.Mesh>; nodes?: Record<string, THREE.Object3D> }
    | undefined;
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  return {
    ready: window.__IMG2THREEJS_READY__ === true,
    meshCount: runtime?.meshes ? Object.keys(runtime.meshes).length : 0,
    nodeCount: runtime?.nodes ? Object.keys(runtime.nodes).length : 0,
    bounds: [size.x, size.y, size.z],
    camera: camera.position.toArray(),
    canvas: { width: renderer.domElement.width, height: renderer.domElement.height },
    pixels: sampleCanvas(),
  };
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  frame();
});

window.__IMG2THREEJS_CAPTURE__ = async (request: CaptureRequest = {}) => {
  frame(request);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  renderFrames();
  return snapshot();
};
window.__IMG2THREEJS_SNAPSHOT__ = snapshot;
frame();
window.__IMG2THREEJS_READY__ = true;
