import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface VaultPremiumEnvironmentRuntime {
  texture: THREE.Texture;
  dispose: () => void;
}

export function installVaultPremiumEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  intensity = 0.42,
): VaultPremiumEnvironmentRuntime {
  const roomEnvironment = new RoomEnvironment();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const target = pmremGenerator.fromScene(roomEnvironment, 0.06);
  scene.environment = target.texture;
  scene.environmentIntensity = intensity;
  roomEnvironment.dispose();
  pmremGenerator.dispose();

  return {
    texture: target.texture,
    dispose: () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
    },
  };
}

export function createVaultSurfacePatternTexture(
  name: string,
  mode: 'hammered-metal' | 'marble-vein' | 'cut-stone',
  repeatX: number,
  repeatY = repeatX,
) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const noise = seed - Math.floor(seed);
      let value = 0.88 + noise * 0.1;
      if (mode === 'hammered-metal') {
        value = 0.82 + noise * 0.16 + Math.sin((x + y * 0.7) * 0.34) * 0.025;
      } else if (mode === 'marble-vein') {
        const vein = Math.abs(Math.sin(x * 0.075 + Math.sin(y * 0.055) * 2.8));
        value = vein > 0.94 ? 0.58 + noise * 0.12 : 0.9 + noise * 0.06;
      } else {
        const course = y % 32;
        const row = Math.floor(y / 32);
        const shiftedX = (x + (row % 2) * 18) % 36;
        const joint = course < 2 || shiftedX < 2;
        value = joint ? 0.46 : 0.82 + noise * 0.13;
      }
      const channel = Math.round(THREE.MathUtils.clamp(value, 0, 1) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = channel;
      data[offset + 1] = channel;
      data[offset + 2] = channel;
      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = name;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
