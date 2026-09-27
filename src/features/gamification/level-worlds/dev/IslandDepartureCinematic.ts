import * as THREE from 'three';
import { createExpeditionShipThreeModel } from './ExpeditionShipThreeModel';
import { ISLAND_DEPARTURE_DURATION, resolveIslandDepartureShot } from '../services/islandRunDepartureCinematic';

const ease = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const easeIn = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * x; };
const segment = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Island departure: the camera leaves the island overview for the expedition
 * ship waiting at the shore, the ship folds into travel mode, lifts off seen
 * from the ground, then streaks away in a side tracking shot into space.
 * Mirrors the Island 001 first arrival. Never writes gameplay state.
 */
export function createIslandDepartureCinematic(
  scene: THREE.Scene,
  start: { position: THREE.Vector3; target: THREE.Vector3; fov: number },
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_DEPARTURE_CINEMATIC';
  scene.add(root);
  const dock = v(-15.5, 0.9, 8.5);
  const ship = createExpeditionShipThreeModel('low');
  const shipPivot = new THREE.Group();
  shipPivot.add(ship.root);
  shipPivot.scale.setScalar(1.05);
  shipPivot.position.copy(dock);
  shipPivot.rotation.y = Math.PI * 0.5;
  root.add(shipPivot);

  const glowMaterial = new THREE.MeshBasicMaterial({ color: '#79ecff', transparent: true, opacity: 0.75, depthWrite: false });
  const thrusters = [-2, 0, 2].map((x) => {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 3, 16, 1, true), glowMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -0.3, -2.8);
    shipPivot.add(mesh);
    return mesh;
  });
  const liftRings = Array.from({ length: 3 }, (_, index) => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1, 96),
      new THREE.MeshBasicMaterial({ color: '#c6fbff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(dock.x, 0.06 + index * 0.004, dock.z);
    root.add(mesh);
    return mesh;
  });
  const streakPositions = new Float32Array(140 * 6);
  for (let i = 0; i < 140; i += 1) {
    const a = i * 2.39996;
    const r = 5 + (i % 13) * 1.7;
    streakPositions.set([(i % 17) * 4 - 34, Math.sin(a) * r, Math.cos(a) * r, (i % 17) * 4 - 31, Math.sin(a) * r, Math.cos(a) * r], i * 6);
  }
  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
  const streakMaterial = new THREE.LineBasicMaterial({ color: '#a7edff', transparent: true, opacity: 0 });
  const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
  root.add(streaks);

  const originalBackground = scene.background;
  const originalFog = scene.fog;
  const sky = originalBackground instanceof THREE.Color ? originalBackground.clone() : new THREE.Color('#a6dbe6');
  const space = new THREE.Color('#030e23');
  const liftHeight = 14;
  const departureDirection = v(1, 0.18, 0).normalize();

  const shipPositionAt = (t: number) => {
    const lift = easeIn((t - 3.4) / 1.8) * liftHeight;
    const cruise = t > 5.2 ? easeIn((t - 5.2) / 2.2) * 70 : 0;
    const hover = t < 3.4 ? Math.sin(t * 2.2) * 0.12 : 0;
    return dock.clone().add(v(0, lift + hover, 0)).addScaledVector(departureDirection, cruise);
  };

  function update(t: number, camera: THREE.PerspectiveCamera, reducedMotion: boolean): boolean {
    const shipPosition = shipPositionAt(t);
    shipPivot.position.copy(shipPosition);
    // Nose swings from the shoreline heading onto the departure heading as it climbs.
    shipPivot.rotation.set(
      -0.22 * segment(t, 3.4, 5.2) + 0.22 * segment(t, 5.2, 6),
      THREE.MathUtils.lerp(Math.PI * 0.5, Math.PI * 0.5 + 0.0, segment(t, 3.2, 5.2)),
      Math.sin(segment(t, 5.2, 7) * Math.PI) * -0.18,
    );
    const fold = segment(t, 1.7, 3.1);
    ship.update({
      timeSeconds: t,
      pose: 'flight',
      poseProgress: fold,
      thrust: t < 3.3 ? 0.08 : t < 5.2 ? 0.75 : 1,
      boost: t > 5.4 ? 1 : 0,
      hover: t < 5.2 ? 0.55 : 0.05,
      reducedMotion: true,
    });
    thrusters.forEach((mesh) => {
      mesh.visible = t > 3.3;
      mesh.scale.y = (t > 5.2 ? 1.8 : 1) + (reducedMotion ? 0 : Math.sin(t * 20) * 0.08);
    });
    liftRings.forEach((mesh, index) => {
      const age = t - 3.3 - index * 0.35;
      const p = age < 0 ? 0 : (age % 1.6) / 1.6;
      mesh.scale.setScalar(2 + p * 7);
      (mesh.material as THREE.MeshBasicMaterial).opacity = t > 3.3 && t < 5.4 ? 0.4 * (1 - p) : 0;
    });
    streaks.position.copy(shipPosition);
    streaks.position.x -= (t * 45) % 4;
    streakMaterial.opacity = 0.7 * segment(t, 5.8, 6.6);
    streaks.visible = t > 5.8;
    scene.background = sky.clone().lerp(space, segment(t, 5.6, 7.2));
    scene.fog = t > 5.6 ? null : originalFog;

    let eye: THREE.Vector3;
    let target = shipPosition.clone().add(v(0, 0.6, 0));
    let lens = 42;
    const shot = resolveIslandDepartureShot(t);
    if (shot === 'zoom-to-ship') {
      // Leave the island overview and push in on the ship waiting at the shore.
      const u = segment(t, 0, 1.6);
      const close = dock.clone().add(v(13, 6, 18));
      eye = start.position.clone().lerp(close, u);
      target = start.target.clone().lerp(target, u);
      lens = THREE.MathUtils.lerp(start.fov, 42, u);
    } else if (shot === 'travel-mode') {
      // Slow orbit while the ship folds into travel mode.
      const a = 0.62 - segment(t, 1.6, 3.2) * 0.5;
      eye = dock.clone().add(v(Math.sin(a) * 22, 5.5, Math.cos(a) * 22));
      lens = 40;
    } else if (shot === 'ground-takeoff') {
      // Ground-level POV looking up as the ship climbs out.
      eye = dock.clone().add(v(14, -0.2, 18));
      target = shipPosition.clone().add(v(0, 0.2, 0));
      lens = 46;
      if (!reducedMotion) eye.y += Math.sin(t * 38) * 0.03 * segment(t, 3.4, 4.2);
    } else {
      // Side tracking shot: the ship streaks across into space.
      const lag = segment(t, 5.2, 7.4) * 10;
      eye = shipPosition.clone().add(v(-lag, 2.5, 26));
      target = shipPosition.clone().add(v(2.5, 0.3, 0));
      lens = 44;
    }
    // Keep the ship inside a narrow phone frame without changing shot direction.
    eye.sub(target).multiplyScalar(Math.max(1, 0.78 / camera.aspect)).add(target);
    camera.position.copy(eye);
    camera.lookAt(target);
    camera.fov = lens;
    camera.updateProjectionMatrix();
    root.userData.shot = shot;
    return t >= ISLAND_DEPARTURE_DURATION;
  }

  return {
    root,
    update,
    dispose() {
      scene.background = originalBackground;
      scene.fog = originalFog;
      scene.remove(root);
      ship.dispose();
      streakGeometry.dispose();
      streakMaterial.dispose();
      glowMaterial.dispose();
      thrusters.forEach((mesh) => mesh.geometry.dispose());
      liftRings.forEach((mesh) => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); });
    },
  };
}
