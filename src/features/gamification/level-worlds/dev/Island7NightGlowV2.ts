import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** DEV night presentation: high-luminance light diffusion, preserving dark water. */
export function createIsland7NightGlowV2(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Math.min(4, renderer.capabilities.maxSamples) });
  const composer = new EffectComposer(renderer, target);
  const render = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .32, .38, 1.05);
  const output = new OutputPass();
  composer.addPass(render); composer.addPass(bloom); composer.addPass(output);
  const previousAutoReset = renderer.info.autoReset;
  renderer.info.autoReset = false;
  let disposed = false;
  return {
    setSize: (width: number, height: number) => composer.setSize(width, height),
    render: (activeCamera: THREE.Camera) => {
      renderer.info.reset(); render.camera = activeCamera; composer.render();
    },
    dispose: () => {
      if (disposed) return; disposed = true;
      bloom.dispose(); output.dispose(); render.dispose(); composer.dispose();
      renderer.info.autoReset = previousAutoReset;
    },
  };
}
