import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ISLAND_3D_QUALITY_PROFILES,
  ISLAND_5_LANDMARKS,
} from '../features/gamification/level-worlds/dev/island5ThreePilotContract';
import {
  buildIsland22FishermansVillageLandmark,
  createIsland22FishermansVillageLivingAmbience,
  createIsland22FishermansVillageMaterials,
  resolveIsland22HarborWeatherState,
  type Island22FishingInteractionPhase,
  type Island22FishingInteractionPresentation,
} from '../features/gamification/level-worlds/dev/Island22FishermansVillageThreeWorld';
import '../features/gamification/level-worlds/LevelWorlds.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Island 016 fishing lab requires #app.');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.94;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.08);
scene.environment = environmentTarget.texture;
scene.environmentIntensity = 0.34;
roomEnvironment.dispose();
pmremGenerator.dispose();
// A plain clear colour is intentionally the only non-geometry fallback. The
// visible sky, clouds, sun, islets, gulls, ocean and weather all live in the
// Island 016 Three.js world so the lab cannot conceal a retired 2D plate.
scene.background = new THREE.Color(0x8ecdda);
// Match the production Island Run fog. The former 0.012 lab-only density
// flattened the sea, erased the authored horizon islets and made evidence
// materially harsher than the actual phone scene.
scene.fog = new THREE.FogExp2(0x8dbfc5, 0.0048);
scene.add(new THREE.HemisphereLight(0xffe0b7, 0x3e514c, 1.48));
const sun = new THREE.DirectionalLight(0xffbd72, 3.35);
sun.position.set(-12, 11, -8);
sun.castShadow = true;
scene.add(sun);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 140);
const sharedOcean = new THREE.Mesh(new THREE.CircleGeometry(42, 72), new THREE.MeshPhysicalMaterial());
sharedOcean.rotation.x = -Math.PI / 2;
const materials = createIsland22FishermansVillageMaterials();
const world = createIsland22FishermansVillageLivingAmbience(
  scene,
  ISLAND_3D_QUALITY_PROFILES.medium,
  materials,
  sharedOcean,
);

const params = new URLSearchParams(window.location.search);
const requestedView = params.get('view');
const requestedAzimuthParam = params.get('azimuth');
const requestedAzimuth = Number(requestedAzimuthParam);
const hasRequestedAzimuth = requestedAzimuthParam !== null && Number.isFinite(requestedAzimuth);
const isolateLandmark = params.get('isolate') === '1';
const clayReview = params.get('clay') === '1';
const macroReview = params.get('macro') === '1';
const dragonTime = Number(params.get('dragonTime'));
const weatherTimeParam = params.get('weatherTime');
const weatherTime = Number(weatherTimeParam);
const hasLockedWeatherTime = weatherTimeParam !== null && Number.isFinite(weatherTime);
const baselineView = requestedView && requestedView !== 'fishing' ? requestedView : null;
const landmarkObjectNames: Record<string, string> = {
  boss: 'ISLAND_22_BOSS_LANDMARK_ROOT',
  hatchery: 'ISLAND_22_HATCHERY_LANDMARK_ROOT',
  habit: 'ISLAND_22_HABIT_LANDMARK_ROOT',
  wisdom: 'ISLAND_22_WISDOM_LANDMARK_ROOT',
  event: 'ISLAND_22_EVENT_LANDMARK_ROOT',
  market: 'ISLAND_22_FISH_MARKET_HALL',
};
if (baselineView) {
  ISLAND_5_LANDMARKS.forEach((definition) => {
    world.root.add(buildIsland22FishermansVillageLandmark(definition, 3, 'medium', materials));
  });
}
let isolatedLandmark: THREE.Object3D | null = null;
if (isolateLandmark && baselineView && landmarkObjectNames[baselineView]) {
  const subject = world.root.getObjectByName(landmarkObjectNames[baselineView]);
  if (subject) {
    isolatedLandmark = subject;
    subject.removeFromParent();
    subject.position.set(0, 0.24, 0);
    subject.rotation.set(0, 0, 0);
    scene.add(subject);
    if (clayReview) {
      const clayMaterial = new THREE.MeshStandardMaterial({
        color: 0xa6a093,
        roughness: 0.78,
        metalness: 0,
      });
      subject.traverse((child) => {
        if (child instanceof THREE.Mesh) child.material = clayMaterial;
      });
    }
    if (macroReview) {
      const roofSurfaceDetail = subject.getObjectByName('ISLAND_22_GUILD_HALL_ROOF_SURFACE_DETAIL');
      if (roofSurfaceDetail) roofSurfaceDetail.visible = false;
    }
    world.root.visible = false;
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 4.12, 0.44, 48),
      materials.stone,
    );
    pedestal.position.y = 0;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
  }
}
const requestedPhase = params.get('phase') as Island22FishingInteractionPhase | null;
const staticPhase = requestedPhase && requestedPhase !== 'off' ? requestedPhase : null;
const catchKind = (params.get('catch') ?? 'colossal') as Island22FishingInteractionPresentation['catchKind'];
const successfulCatch = catchKind !== 'nothing';
const phases: Array<{ phase: Island22FishingInteractionPhase; duration: number }> = [
  { phase: 'approach', duration: 0.76 },
  { phase: 'casting', duration: 1.15 },
  { phase: 'waiting', duration: 1.55 },
  { phase: 'countdown', duration: 2.28 },
  { phase: 'bite', duration: 0.75 },
  ...(successfulCatch
    ? [{ phase: 'reeling' as const, duration: 3.2 }, { phase: 'caught' as const, duration: 2.8 }]
    : [{ phase: 'escaped' as const, duration: 2.8 }]),
];
const sequenceDuration = phases.reduce((sum, entry) => sum + entry.duration, 0);
const clock = new THREE.Clock();

const hudLayer = document.createElement('div');
hudLayer.className = 'fishermans-fishing-hud__layer';
const hud = document.createElement('section');
hud.className = 'fishermans-fishing-hud';
hud.innerHTML = `
  <header><h2 data-title>Watch the bobber…</h2></header>
  <div class="fishermans-fishing-hud__countdown" data-countdown hidden>3</div>
  <div class="fishermans-fishing-hud__meter"><div><strong data-kg>46 kg</strong><span>/ 100 kg</span><b data-lb>101.4 / 220.5 lb</b></div><div class="fishermans-fishing-hud__track"><span data-goal style="width:46%"></span></div></div>
  <div class="fishermans-fishing-hud__tension" data-tension hidden><span></span></div>
  <button class="fishermans-fishing-hud__pull" data-pull hidden><span>PULL! PULL!</span><small>keep tapping · don’t lose tension</small></button>
  <div class="fishermans-fishing-hud__result" data-result hidden></div>
`;
hudLayer.appendChild(hud);
app.appendChild(hudLayer);
hudLayer.hidden = Boolean(baselineView);
if (baselineView) hudLayer.style.display = 'none';

const title = hud.querySelector<HTMLElement>('[data-title]')!;
const countdown = hud.querySelector<HTMLElement>('[data-countdown]')!;
const tension = hud.querySelector<HTMLElement>('[data-tension]')!;
const pull = hud.querySelector<HTMLButtonElement>('[data-pull]')!;
const result = hud.querySelector<HTMLElement>('[data-result]')!;
const kilograms = hud.querySelector<HTMLElement>('[data-kg]')!;
const pounds = hud.querySelector<HTMLElement>('[data-lb]')!;
const goal = hud.querySelector<HTMLElement>('[data-goal]')!;

function resolvePresentation(elapsed: number): Island22FishingInteractionPresentation {
  if (staticPhase) {
    const resolvedStaticPhase = !successfulCatch && (staticPhase === 'caught' || staticPhase === 'reeling')
      ? 'escaped'
      : staticPhase;
    return {
      active: true,
      phase: resolvedStaticPhase,
      catchKind,
      countdown: resolvedStaticPhase === 'countdown' ? 2 : null,
      pullProgress: resolvedStaticPhase === 'reeling' ? 0.56 : resolvedStaticPhase === 'caught' ? 1 : 0,
      tension: resolvedStaticPhase === 'reeling' ? 0.66 : resolvedStaticPhase === 'caught' ? 1 : 0.58,
      reelPulse: resolvedStaticPhase === 'reeling' ? 4 : 0,
    };
  }
  let cursor = elapsed % sequenceDuration;
  for (const entry of phases) {
    if (cursor <= entry.duration) {
      const progress = cursor / entry.duration;
      return {
        active: true,
        phase: entry.phase,
        catchKind,
        countdown: entry.phase === 'countdown' ? Math.max(1, 3 - Math.floor(progress * 3)) : null,
        pullProgress: entry.phase === 'reeling' ? progress * 0.94 : entry.phase === 'caught' ? 1 : 0,
        tension: entry.phase === 'reeling' ? 0.48 + Math.sin(progress * Math.PI * 8) * 0.34 : 0.62,
        reelPulse: entry.phase === 'reeling' ? Math.floor(progress * 10) : 0,
      };
    }
    cursor -= entry.duration;
  }
  return {
    active: true,
    phase: successfulCatch ? 'caught' : 'escaped',
    catchKind,
    countdown: null,
    pullProgress: successfulCatch ? 1 : 0,
    tension: successfulCatch ? 1 : 0,
    reelPulse: successfulCatch ? 10 : 0,
  };
}

function updateHud(presentation: Island22FishingInteractionPresentation) {
  const catchTitles = {
    small: 'SMALL CATCH!',
    medium: 'FRESH CATCH!',
    large: 'BIG CATCH!',
    colossal: 'COLOSSAL CATCH!',
    nothing: 'NO BITE — TRY AGAIN',
  } as const;
  const labels: Record<Island22FishingInteractionPhase, string> = {
    off: '', approach: 'Get close to the water…', casting: 'Cast!', waiting: 'Watch the bobber…',
    countdown: 'Something is circling!', bite: 'BITE! Set the hook!', reeling: 'Keep the line tight!',
    caught: catchTitles[presentation.catchKind],
    escaped: presentation.catchKind === 'nothing' ? 'Only bubbles this time…' : 'It got away!',
  };
  hud.className = `fishermans-fishing-hud fishermans-fishing-hud--${presentation.phase}`;
  title.textContent = labels[presentation.phase];
  countdown.hidden = presentation.countdown === null;
  if (presentation.countdown !== null) countdown.textContent = String(presentation.countdown);
  const canPull = presentation.phase === 'bite' || presentation.phase === 'reeling';
  tension.hidden = !canPull;
  pull.hidden = !canPull;
  result.hidden = presentation.phase !== 'caught' && presentation.phase !== 'escaped';
  (tension.firstElementChild as HTMLElement).style.width = `${presentation.tension * 100}%`;
  result.textContent = presentation.phase === 'caught'
    ? `${catchTitles[presentation.catchKind]} The village cheers as it comes ashore.`
    : presentation.catchKind === 'nothing'
      ? 'The hook came back empty. Pick another glowing rod station and cast again.'
      : 'The fish snapped free.';
  const catchTotals = { nothing: 46, small: 49, medium: 55, large: 68, colossal: 78 } as const;
  const caughtTotal = presentation.phase === 'caught' ? catchTotals[presentation.catchKind] : 46;
  kilograms.textContent = `${caughtTotal} kg`;
  pounds.textContent = `${(caughtTotal * 2.2046226218).toFixed(1)} / 220.5 lb`;
  goal.style.width = `${caughtTotal}%`;
}

function frame() {
  const elapsed = clock.getElapsedTime();
  const weatherElapsed = hasLockedWeatherTime ? Math.max(0, weatherTime) : elapsed;
  const presentation = resolvePresentation(elapsed);
  world.updateFishingInteraction(baselineView
    ? { ...presentation, active: false, phase: 'off' }
    : presentation);
  const dragonActive = baselineView === 'dragon' && Number.isFinite(dragonTime);
  world.updateWaterDragonMission({
    fishCaughtKg: dragonActive ? 78 : 46,
    previewElapsedSeconds: dragonActive ? Math.max(0, dragonTime) : 0,
  });
  world.animate(weatherElapsed);
  const weather = resolveIsland22HarborWeatherState(weatherElapsed);
  document.body.dataset.weatherPhase = weather.phase;
  document.body.dataset.weatherIntensity = weather.intensity.toFixed(3);
  if (!baselineView) updateHud(presentation);
  if (baselineView === 'dragon') {
    const pose = world.getWaterDragonMissionCameraPose();
    if (Math.abs(camera.fov - pose.fov) > 0.01) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
  } else if (baselineView === 'overview' || baselineView === 'scenery') {
    // Reproduce the production Island Run phone overview. The prior diagonal
    // lab-only camera cropped both shoreline landmark families and made Guild
    // hierarchy impossible to judge against the canonical gameplay view.
    if (Math.abs(camera.fov - 42) > 0.01) {
      camera.fov = 42;
      camera.updateProjectionMatrix();
    }
    const portraitOverview = window.innerWidth / Math.max(1, window.innerHeight) < 0.75;
    const overviewAzimuth = hasRequestedAzimuth ? THREE.MathUtils.degToRad(requestedAzimuth) : 0;
    const overviewDistance = portraitOverview ? 36.5 : 33;
    camera.position.set(
      Math.sin(overviewAzimuth) * overviewDistance,
      portraitOverview ? 21.5 : 19.5,
      Math.cos(overviewAzimuth) * overviewDistance,
    );
    camera.lookAt(0, 0.25, 0);
  } else if (baselineView && landmarkObjectNames[baselineView]) {
    const subject = isolatedLandmark ?? world.root.getObjectByName(landmarkObjectNames[baselineView]);
    const bounds = subject ? new THREE.Box3().setFromObject(subject) : null;
    const target = bounds && !bounds.isEmpty()
      ? bounds.getCenter(new THREE.Vector3())
      : new THREE.Vector3(0, 1.4, 0);
    const size = bounds && !bounds.isEmpty()
      ? bounds.getSize(new THREE.Vector3())
      : new THREE.Vector3(3, 3, 3);
    const towardCenter = new THREE.Vector3(-target.x, 0, -target.z).normalize();
    if (towardCenter.lengthSq() < 0.01) towardCenter.set(0, 0, 1);
    // The market sits behind the lighthouse from the source-facing overview.
    // Frame that one study from the sea so its own hall/apron/dock stay visible.
    const viewDirection = baselineView === 'market'
      ? towardCenter.clone().negate()
      : towardCenter;
    const lockedGuildHallOrbit = baselineView === 'boss' && hasRequestedAzimuth;
    if (lockedGuildHallOrbit) {
      const orbitRadians = THREE.MathUtils.degToRad(requestedAzimuth);
      viewDirection.set(Math.sin(orbitRadians), 0, Math.cos(orbitRadians));
    }
    const tangent = new THREE.Vector3(-viewDirection.z, 0, viewDirection.x);
    const distance = Math.max(5.2, Math.max(size.x, size.z) * 2.1);
    const landmarkDistance = baselineView === 'boss' ? distance * 1.08 : distance;
    const landmarkTangent = lockedGuildHallOrbit ? 0 : baselineView === 'boss' ? distance * 0.46 : distance * 0.24;
    camera.position.copy(target)
      .addScaledVector(viewDirection, baselineView === 'market' ? distance * 0.65 : landmarkDistance)
      .addScaledVector(tangent, baselineView === 'market' ? -distance * 1.15 : landmarkTangent);
    camera.position.y = target.y + Math.max(2.8, size.y * (baselineView === 'boss' ? 0.82 : 0.74));
    camera.lookAt(target.x, target.y + size.y * 0.03, target.z);
  } else {
    const pose = world.getFishingInteractionCameraPose();
    camera.position.lerp(pose.position, 0.1);
    camera.lookAt(pose.target);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
