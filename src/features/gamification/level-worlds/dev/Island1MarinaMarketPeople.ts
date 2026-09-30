import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { MarketPersonSocket } from './Island1MarinaMarketDetails';
import { MARINA_DECK_Y, MARINA_MARKET_WALK_RADIUS, marinaMarketSurfaceY, marinaPolar } from './Island1MarinaMarketLayout';

/** Small, instanced market guests; independent of the Assembly's assigned-seat delegates. */
export function createMarinaMarketPeople(root: THREE.Group, quality: Island3DQuality, sockets: MarketPersonSocket[]) {
  const stationary = sockets.filter((_, i) => quality !== 'low' || i % 2 === 0);
  const walkers = quality === 'high' ? 22 : quality === 'medium' ? 16 : 10;
  const count = stationary.length + walkers;
  const material = new THREE.MeshStandardMaterial({ roughness: .85 });
  const make = (name: string, g: THREE.BufferGeometry, n = count) => {
    const m = new THREE.InstancedMesh(g, material, n); m.name = name;
    m.castShadow = quality !== 'low'; m.frustumCulled = false; root.add(m); return m;
  };
  const torso = make('MARKET_GUEST_JACKETS', new THREE.CapsuleGeometry(.085, .16, 2, 4));
  const heads = make('MARKET_GUEST_FACES', new THREE.SphereGeometry(1, 6, 4));
  const hair = make('MARKET_GUEST_HAIR', new THREE.SphereGeometry(.087, 6, 3, 0, Math.PI * 2, 0, 1.45));
  const limbs = make('MARKET_GUEST_LIMBS', new THREE.CylinderGeometry(.026, .031, 1, 5, 1, true), count * 6);
  const shoes = make('MARKET_GUEST_SHOES', new THREE.BoxGeometry(.07, .047, .14), count * 2);
  const clothes = [0x28415b, 0xd2ac83, 0x637b77, 0xa86259, 0xddd4bc, 0x715b81];
  const skins = [0xc79572, 0xe7b994, 0x815439, 0xb87752];
  for (let i = 0; i < count; i++) {
    torso.setColorAt(i, new THREE.Color(clothes[i % clothes.length]));
    heads.setColorAt(i, new THREE.Color(skins[i % skins.length]));
    hair.setColorAt(i, new THREE.Color([0x33271f, 0x765038, 0xb59a6b][i % 3]));
    for (let j = 0; j < 6; j++) limbs.setColorAt(i * 6 + j, new THREE.Color(j < 4 ? 0x304052 : clothes[i % clothes.length]));
    for (let j = 0; j < 2; j++) shoes.setColorAt(i * 2 + j, new THREE.Color(0x252c32));
  }
  const batches = [torso, heads, hair, limbs, shoes];
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), base = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Quaternion();
  const unit = new THREE.Vector3(1, 1, 1);
  const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let lastTime = NaN;
  function update(elapsed: number) {
    const time = reducedMotion?.matches ? 0 : Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
    if (time === lastTime) return;
    lastTime = time;
    for (let i = 0; i < count; i++) {
      const socket = stationary[i], walking = !socket, seated = !!socket?.seated;
      const w = i - stationary.length, direction = w % 2 ? -1 : 1;
      const angle = walking ? w / walkers * Math.PI * 2 + direction * time * .32 / MARINA_MARKET_WALK_RADIUS : socket.angle;
      if (walking) {
        base.fromArray(marinaPolar(MARINA_MARKET_WALK_RADIUS + direction * .27, angle));
        base.y = marinaMarketSurfaceY(base.x, base.z) ?? base.y;
      } else base.fromArray(socket.position);
      base.y -= MARINA_DECK_Y;
      const facing = walking ? angle - direction * Math.PI / 2 : socket.angle;
      const stride = walking ? Math.sin(time * 4.4 + w) * .16 : 0;
      const hip = seated ? .31 : .32;
      const put = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, scale = unit, rotation?: THREE.Quaternion) => {
        dummy.position.set(x, y, z).applyAxisAngle(up, facing).add(base);
        dummy.quaternion.setFromAxisAngle(up, facing); if (rotation) dummy.quaternion.multiply(rotation);
        dummy.scale.copy(scale); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
      };
      const limb = (index: number, from: THREE.Vector3, to: THREE.Vector3) => {
        d.copy(to).sub(from); q.setFromUnitVectors(up, d.clone().normalize());
        const mid = from.clone().add(to).multiplyScalar(.5);
        put(limbs, index, mid.x, mid.y, mid.z, new THREE.Vector3(1, d.length(), 1), q);
      };
      put(torso, i, 0, hip + .17, 0);
      put(heads, i, 0, hip + .405, -.013, new THREE.Vector3(.081, .102, .077));
      put(hair, i, 0, hip + .425, -.008);
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1, swing = stride * sign;
        a.set(sign * .055, hip, 0); b.set(sign * .055, seated ? .29 : .17, seated ? -.17 : swing * .55);
        limb(i * 6 + side * 2, a, b);
        a.copy(b); b.set(sign * .055, .045, seated ? -.17 : swing);
        limb(i * 6 + side * 2 + 1, a, b); put(shoes, i * 2 + side, b.x, .025, b.z - .035);
        a.set(sign * .11, hip + .245, 0); b.set(sign * .13, hip + (seated ? .04 : -.015), seated ? -.16 : -swing);
        limb(i * 6 + 4 + side, a, b);
      }
    }
    batches.forEach(m => { m.instanceMatrix.needsUpdate = true; });
  }
  update(0);
  return { update, count, walkers };
}
