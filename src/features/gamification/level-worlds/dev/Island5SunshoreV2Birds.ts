import * as THREE from 'three';
import type { Island2WorldMaterials } from './Island2ThreeWorld';
import type { Island3DQuality } from './island5ThreePilotContract';

/** Articulated, solid silhouettes; local +Z is the direction of flight. */
export function createSunshoreBirds(m: Island2WorldMaterials, quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'SUNSHORE_PARROTS_AND_SEABIRDS';
  const sphere = new THREE.SphereGeometry(1, 8, 6);
  const birds = Array.from({ length: quality === 'high' ? 12 : quality === 'medium' ? 8 : 4 }, (_, i) => {
    const parrot = i % 3 === 0, tern = i % 3 === 2;
    const bodyMaterial = parrot ? (i % 2 ? m.oceanCloth : m.flowerCoral) : m.paper;
    const bird = new THREE.Group(); bird.name = parrot ? 'MACAW_PARROT' : tern ? 'WHITE_TERN' : 'WHITE_SEAGULL'; root.add(bird);
    const part = (parent: THREE.Object3D, name: string, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const mesh = new THREE.Mesh(sphere, material); mesh.name = name;
      mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
    };
    part(bird, 'BODY', bodyMaterial, 0, 0, 0, .12, .13, .28);
    part(bird, 'BREAST', parrot ? m.mangoGold : m.paper, 0, -.045, .07, .105, .105, .19);
    part(bird, 'HEAD', bodyMaterial, 0, .085, .25, .105, .11, .12);
    for (const side of [-1, 1]) {
      if (parrot) part(bird, 'PALE_FACE', m.paper, side * .084, .095, .28, .025, .055, .065);
      part(bird, 'EYE', m.ink, side * .1, .12, .295, .014, .014, .014);
    }
    const beak = part(bird, 'BEAK', parrot ? m.ink : m.mangoGold, 0, .07, .375, .045, .04, parrot ? .07 : .105);
    if (parrot) beak.rotation.x = -.45;
    if (tern) part(bird, 'DARK_CAP', m.ink, 0, .153, .25, .093, .045, .105);
    for (let t = 0; t < 3; t++) {
      const tail = part(bird, 'TAIL_FEATHER', parrot ? m.oceanCloth : m.paper, (t - 1) * .045, -.02, -.31 - (parrot ? .12 : 0), .037, .025, parrot ? .28 : .14);
      tail.rotation.y = (t - 1) * (tern ? .35 : .12);
    }
    const wings = [-1, 1].map(side => {
      const wing = new THREE.Group(); wing.name = side < 0 ? 'LEFT_WING' : 'RIGHT_WING'; wing.position.x = side * .09; bird.add(wing);
      const shoulder = part(wing, 'WING_SHOULDER', bodyMaterial, side * .2, 0, -.02, .25, .045, .14); shoulder.rotation.y = side * .2;
      for (let f = 0; f < 5; f++) {
        const feather = part(wing, 'PRIMARY_FEATHER', parrot ? (f < 2 ? m.mangoGold : m.oceanCloth) : (f > 2 ? m.ink : m.paper), side * (.34 + f * .047), -.01, -.045 - f * .039, .23 - f * .019, .024, .048);
        feather.rotation.y = side * (.18 + f * .14);
      }
      return wing;
    });
    bird.scale.setScalar(tern ? .58 : parrot ? .72 : .76);
    return { bird, wings, parrot, i };
  });
  const position = (t: number, i: number, parrot: boolean, out: THREE.Vector3) => {
    const speed = .095 + i * .0041, a = t * speed + i * 2.399963;
    const r = (parrot ? 7.4 : 11.5) + i % 3 + .85 * Math.sin(t * .041 + i);
    return out.set(Math.cos(a) * r, (parrot ? 4.1 : 5.1) + i % 3 * .55 + .35 * Math.sin(t * .19 + i), Math.sin(a) * r * (parrot ? .83 : 1.08));
  };
  const ahead = new THREE.Vector3();
  const update = (elapsed: number) => birds.forEach(({ bird, wings, parrot, i }) => {
    position(elapsed, i, parrot, bird.position); position(elapsed + .05, i, parrot, ahead).sub(bird.position);
    bird.rotation.set(-Math.atan2(ahead.y, Math.hypot(ahead.x, ahead.z)), Math.atan2(ahead.x, ahead.z), .12 * Math.sin(elapsed * .23 + i));
    const activity = parrot ? .8 : Math.max(0, Math.sin(elapsed * .63 + i * 1.7));
    const flap = Math.sin(elapsed * (parrot ? 9 : 5.5) + i * 2.1) * .65 * activity;
    wings[0].rotation.z = -.12 - flap; wings[1].rotation.z = .12 + flap;
  });
  update(0);
  return { root, update };
}
