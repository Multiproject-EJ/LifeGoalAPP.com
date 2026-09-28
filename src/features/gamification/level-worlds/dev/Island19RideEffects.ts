import * as THREE from 'three';

/**
 * Island 019 Wonder Express presentation effects: chase lights that race
 * along the underground track, and soft smoke/steam puffs at the foot of the
 * super-speed drop and in the Gold Forge. Procedural, no textures loaded, and
 * safe to build in Node tests (no canvas).
 */
export interface Island19ChaseLightsRuntime {
  root: THREE.InstancedMesh;
  animate: (elapsedSeconds: number, reducedMotion: boolean) => void;
}

export function createIsland19ChaseLights(options: {
  frames: readonly { position: THREE.Vector3; side: THREE.Vector3; up: THREE.Vector3 }[];
  sideOffset?: number;
}): Island19ChaseLightsRuntime {
  const sideOffset = options.sideOffset ?? 0.66;
  const count = options.frames.length * 2;
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), material, Math.max(1, count));
  bulbs.name = 'ISLAND_19_WONDER_EXPRESS_CHASE_LIGHTS';
  const matrix = new THREE.Matrix4();
  let index = 0;
  options.frames.forEach((frame) => {
    for (const side of [-1, 1]) {
      const position = frame.position.clone().addScaledVector(frame.side, side * sideOffset).addScaledVector(frame.up, 0.08);
      matrix.makeTranslation(position.x, position.y, position.z);
      bulbs.setMatrixAt(index, matrix);
      index += 1;
    }
  });
  bulbs.count = index;
  const warm = new THREE.Color(0xffc24a);
  const hot = new THREE.Color(0xfff6d8);
  const dim = new THREE.Color(0x5a2a10);
  const color = new THREE.Color();
  const paint = (elapsedSeconds: number, reducedMotion: boolean) => {
    for (let i = 0; i < index; i += 1) {
      const along = Math.floor(i / 2);
      // A bright wave races down the track every ~1.6 s.
      const wave = reducedMotion ? 0.5 : (Math.sin(along * 0.55 - elapsedSeconds * 7.5) + 1) / 2;
      color.copy(dim).lerp(warm, 0.35 + wave * 0.65);
      if (wave > 0.92) color.lerp(hot, (wave - 0.92) / 0.08);
      bulbs.setColorAt(i, color);
    }
    if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
  };
  paint(0, true);
  bulbs.instanceMatrix.needsUpdate = true;
  return { root: bulbs, animate: paint };
}

function createSmokeTexture(): THREE.DataTexture {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5) / size * 2 - 1;
      const dy = (y + 0.5) / size * 2 - 1;
      const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
      const offset = (y * size + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(255 * falloff * falloff);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export interface Island19SmokeRuntime {
  root: THREE.Group;
  animate: (elapsedSeconds: number, reducedMotion: boolean) => void;
  puffCount: number;
}

/** Looping smoke/steam puffs that rise, swell and fade above each source. */
export function createIsland19Smoke(options: {
  sources: readonly { position: THREE.Vector3; tint: number; rise: number }[];
  puffsPerSource?: number;
}): Island19SmokeRuntime {
  const puffsPerSource = options.puffsPerSource ?? 6;
  const root = new THREE.Group();
  root.name = 'ISLAND_19_WONDER_EXPRESS_SMOKE';
  const texture = createSmokeTexture();
  const puffs: { sprite: THREE.Sprite; origin: THREE.Vector3; phase: number; rise: number; drift: number }[] = [];
  options.sources.forEach((source, sourceIndex) => {
    for (let i = 0; i < puffsPerSource; i += 1) {
      const material = new THREE.SpriteMaterial({
        map: texture, color: source.tint, transparent: true, depthWrite: false, opacity: 0,
      });
      const sprite = new THREE.Sprite(material);
      sprite.name = `ISLAND_19_SMOKE_PUFF_${sourceIndex + 1}_${i + 1}`;
      root.add(sprite);
      puffs.push({
        sprite,
        origin: source.position.clone(),
        phase: i / puffsPerSource,
        rise: source.rise,
        drift: (i % 2 === 0 ? 1 : -1) * (0.25 + (i % 3) * 0.1),
      });
    }
  });
  const animate = (elapsedSeconds: number, reducedMotion: boolean) => {
    puffs.forEach((puff) => {
      const life = reducedMotion ? 0.45 : (elapsedSeconds * 0.32 + puff.phase) % 1;
      const scale = 0.6 + life * 1.9;
      puff.sprite.position.set(
        puff.origin.x + Math.sin(life * Math.PI) * puff.drift,
        puff.origin.y + life * puff.rise,
        puff.origin.z + Math.cos(life * 2.1) * puff.drift * 0.4,
      );
      puff.sprite.scale.set(scale, scale, 1);
      (puff.sprite.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.55;
    });
  };
  animate(0, true);
  return { root, animate, puffCount: puffs.length };
}
