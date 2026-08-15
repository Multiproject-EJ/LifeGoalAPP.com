import * as THREE from 'three';
import { getJourneyDiscArenaFighterStats } from '../../level-worlds/services/journeyDiscArenaGame';
import { buildJourneyDiscArenaRivalRoster, resolveJourneyDiscArenaCameraFit } from '../../level-worlds/services/journeyDiscArenaPresentation';
import { resolvePlayerPiece, type PlayerPieceId } from '../../level-worlds/services/islandRunPlayerPieces';
import type { JourneyDiscArenaPreviewSnapshot } from './JourneyDiscArenaPreviewController';

interface FighterVisual {
  root: THREE.Group;
  spinner: THREE.Group;
  trail: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  shield: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  energyRail: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  selectionRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  lifeBar: THREE.Group;
  lifeFill: THREE.Sprite;
  freezeAura: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  damageShell: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  rank: number;
  bossTier: number;
  weaponLevel: number;
  phaseOffset: number;
  damageFlashUntil: number;
  baseScale: number;
  knockoutAt: number | null;
  knockoutOrigin: THREE.Vector3;
  knockoutDirection: THREE.Vector3;
}

interface ImpactFlash {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  bornAt: number;
}

interface ShockRing {
  mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  bornAt: number;
}

const PLAYER_COLOR = 0x00f078;
const RIVAL_COLOR = 0xff173d;
const ICE_COLOR = 0x00cfff;
const ECHO_COLOR = 0xaa35ff;
const SPEED_COLOR = 0xcaff18;
const RANK_METALS = [0xb45528, 0x91bddd, 0xffbd19] as const;
const FIGHTER_VISUAL_SCALE = 1.27;
const PREVIEW_FORMATION_POSITIONS = Object.freeze([
  { x: -4.8, z: -2.7 },
  { x: -2.75, z: -2.7 },
  { x: -4.8, z: -0.35 },
  { x: -2.75, z: -0.35 },
  { x: -4.8, z: 2.0 },
  { x: -2.75, z: 2.0 },
]);

function createMaterial(color: THREE.ColorRepresentation, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.72, ...options });
}

function makeRelic(pieceId: PlayerPieceId, accentColor: string): THREE.Group {
  const root = new THREE.Group();
  const accent = new THREE.Color(accentColor);
  const dark = createMaterial(0x151b2a, { roughness: 0.46, metalness: 0.6 });
  const glow = createMaterial(accent, { emissive: accent, emissiveIntensity: 1.15, roughness: 0.22 });
  const ivory = createMaterial(0xe8ddc2, { roughness: 0.58, metalness: 0.18 });
  const gold = createMaterial(0xd8ab55, { roughness: 0.25, metalness: 0.82 });

  switch (pieceId) {
    case 'explorer_ship': {
      const hull = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.15, 5), dark);
      hull.rotation.z = -Math.PI / 2;
      hull.position.y = 0.5;
      const sail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 3), glow);
      sail.rotation.z = Math.PI / 2;
      sail.position.set(-0.12, 0.78, 0);
      root.add(hull, sail);
      break;
    }
    case 'world_seed': {
      const seed = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), glow);
      seed.scale.set(0.8, 1.28, 0.8);
      seed.position.y = 0.63;
      root.add(seed);
      for (let index = 0; index < 3; index += 1) {
        const rootArc = new THREE.Mesh(new THREE.TorusGeometry(0.45 + index * 0.08, 0.035, 5, 22, Math.PI * 0.7), gold);
        rootArc.rotation.set(Math.PI / 2, index * 2.1, index * 0.7);
        rootArc.position.y = 0.36;
        root.add(rootArc);
      }
      break;
    }
    case 'living_compass': {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 8, 28), gold);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.52;
      const needle = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.86, 3), glow);
      needle.rotation.z = Math.PI / 2;
      needle.position.y = 0.55;
      root.add(rim, needle);
      break;
    }
    case 'ancient_egg': {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 16), ivory);
      egg.scale.set(0.82, 1.18, 0.82);
      egg.position.y = 0.63;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 6, 22), glow);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.62;
      root.add(egg, band);
      break;
    }
    case 'quest_journal': {
      const cover = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.9), dark);
      cover.position.y = 0.58;
      cover.rotation.y = -0.18;
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.8), ivory);
      pages.position.y = 0.69;
      pages.rotation.y = -0.18;
      const sigil = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), glow);
      sigil.position.set(0, 0.79, 0);
      root.add(cover, pages, sigil);
      break;
    }
    case 'ancient_key': {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 7, 24), gold);
      bow.rotation.x = Math.PI / 2;
      bow.position.set(-0.2, 0.7, 0);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.12), glow);
      shaft.position.set(0.25, 0.7, 0);
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.25, 0.12), gold);
      tooth.position.set(0.56, 0.59, 0);
      root.add(bow, shaft, tooth);
      break;
    }
    case 'guardian_idol': {
      const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), dark);
      body.scale.set(0.85, 1.15, 0.85);
      body.position.y = 0.62;
      const eyeGeometry = new THREE.SphereGeometry(0.07, 8, 8);
      for (const x of [-0.16, 0.16]) {
        const eye = new THREE.Mesh(eyeGeometry, glow);
        eye.position.set(x, 0.7, 0.42);
        root.add(eye);
      }
      root.add(body);
      break;
    }
    case 'fallen_star': {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), glow);
      star.scale.y = 1.25;
      star.position.y = 0.68;
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 5, 24), gold);
      halo.rotation.x = Math.PI / 2.4;
      halo.position.y = 0.66;
      root.add(star, halo);
      break;
    }
    case 'keepers_lantern': {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.38, 0.62, 8), glow);
      lamp.position.y = 0.64;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.28, 8), dark);
      cap.position.y = 1.05;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 6, 20, Math.PI), gold);
      handle.position.y = 1.02;
      root.add(lamp, cap, handle);
      break;
    }
    case 'oris_shell': {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.48, 18, 16), ivory);
      shell.scale.set(1, 0.8, 0.42);
      shell.position.y = 0.65;
      const spiral = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 24, Math.PI * 1.65), glow);
      spiral.position.set(0, 0.67, 0.22);
      root.add(shell, spiral);
      break;
    }
    default: {
      const relic = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), glow);
      relic.position.y = 0.64;
      root.add(relic);
    }
  }
  root.rotation.y = Math.PI * 0.15;
  return root;
}

function createFighterVisual(pieceId: PlayerPieceId, rank: number, bossTier: number, moduleId: string | null, weaponLevel: number, team: 'player' | 'rival', id: string): FighterVisual {
  const definition = resolvePlayerPiece(pieceId);
  const teamColor = team === 'player' ? PLAYER_COLOR : RIVAL_COLOR;
  const root = new THREE.Group();
  const spinner = new THREE.Group();
  root.add(spinner);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.04, 24),
    new THREE.MeshBasicMaterial({ color: 0x020819, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.35;
  root.add(shadow);

  const rankIndex = Math.max(0, Math.min(2, rank - 1));
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.79 + rankIndex * 0.06, 0.86 + rankIndex * 0.07, 0.24 + rankIndex * 0.035, 32),
    createMaterial(RANK_METALS[rankIndex], { roughness: 0.24, metalness: 0.9 }),
  );
  disc.castShadow = true;
  disc.receiveShadow = true;
  spinner.add(disc);

  const inset = new THREE.Mesh(
    new THREE.CylinderGeometry(0.59, 0.62, 0.29, 28),
    createMaterial(0x10182b, { emissive: teamColor, emissiveIntensity: 0.18, roughness: 0.28 }),
  );
  inset.position.y = 0.05;
  spinner.add(inset);

  const teamPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.63, 0.63, 0.055, 30),
    new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: 0.72, toneMapped: false }),
  );
  teamPlate.position.y = 0.22;
  spinner.add(teamPlate);

  for (let rail = 0; rail < rank; rail += 1) {
    const energyRail = new THREE.Mesh(
      new THREE.TorusGeometry(0.69 + rail * 0.09, 0.025, 5, 30),
      new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: 0.62 + rail * 0.08 }),
    );
    energyRail.rotation.x = Math.PI / 2;
    energyRail.position.y = 0.18 + rail * 0.035;
    spinner.add(energyRail);
  }

  const relic = makeRelic(pieceId, definition.accentColor);
  relic.position.y = 0.12;
  spinner.add(relic);

  const moduleMaterial = createMaterial(teamColor, { emissive: teamColor, emissiveIntensity: 1.35, roughness: 0.2 });
  if (moduleId === 'ram_fin') {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.72, 3), moduleMaterial);
    fin.rotation.z = -Math.PI / 2;
    fin.position.set(0.88, 0.12, 0);
    spinner.add(fin);
  } else if (moduleId === 'aegis_ring') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.055, 6, 32), moduleMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.09;
    spinner.add(ring);
  } else if (moduleId === 'pulse_vane') {
    for (const side of [-1, 1]) {
      const vane = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 3), moduleMaterial);
      vane.rotation.set(0, side * Math.PI / 2, Math.PI / 2);
      vane.position.set(0, 0.14, side * 0.83);
      spinner.add(vane);
    }
  }
  for (let levelPip = 1; levelPip < weaponLevel; levelPip += 1) {
    const angle = (levelPip / Math.max(1, weaponLevel - 1)) * Math.PI * 2;
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), moduleMaterial);
    pip.position.set(Math.cos(angle) * 0.72, 0.27, Math.sin(angle) * 0.72);
    spinner.add(pip);
  }

  const shield = new THREE.Mesh(
    new THREE.TorusGeometry(1.03, 0.065, 6, 40),
    new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  shield.rotation.x = Math.PI / 2;
  shield.position.y = 0.32;
  root.add(shield);

  const energyRail = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.018, 4, 36),
    new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  energyRail.rotation.x = Math.PI / 2;
  energyRail.position.y = 0.04;
  root.add(energyRail);

  const selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.075, 6, 44),
    new THREE.MeshBasicMaterial({ color: 0xffe33a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  selectionRing.rotation.x = Math.PI / 2;
  selectionRing.position.y = -0.26;
  selectionRing.visible = false;
  root.add(selectionRing);

  root.userData.fighterId = id;
  const baseScale = FIGHTER_VISUAL_SCALE * (0.9 + rankIndex * 0.07) * (bossTier > 0 ? 1.16 + bossTier * 0.12 : 1);
  root.scale.setScalar(baseScale);
  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 2.35, 5, 1, true),
    new THREE.MeshBasicMaterial({
      color: teamColor,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  trail.visible = false;
  const lifeBar = new THREE.Group();
  const lifeShadow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x10202a, depthTest: false, depthWrite: false, toneMapped: false }));
  lifeShadow.scale.set(2.08, 0.34, 1);
  lifeShadow.renderOrder = 20;
  const lifeBack = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, toneMapped: false }));
  lifeBack.scale.set(1.94, 0.21, 1);
  lifeBack.position.z = 0.002;
  lifeBack.renderOrder = 21;
  const lifeFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: team === 'player' ? PLAYER_COLOR : RIVAL_COLOR, depthTest: false, depthWrite: false, toneMapped: false }));
  lifeFill.scale.set(1.84, 0.14, 1);
  lifeFill.position.z = 0.004;
  lifeFill.renderOrder = 22;
  lifeBar.add(lifeShadow, lifeBack, lifeFill);
  const freezeAura = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 1),
    new THREE.MeshBasicMaterial({ color: ICE_COLOR, transparent: true, opacity: 0.24, wireframe: true, depthWrite: false }),
  );
  freezeAura.visible = false;
  root.add(freezeAura);
  const damageShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.22, 1),
    new THREE.MeshBasicMaterial({ color: 0xff173d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  damageShell.visible = false;
  root.add(damageShell);
  return {
    root,
    spinner,
    trail,
    shield,
    energyRail,
    selectionRing,
    lifeBar,
    lifeFill,
    freezeAura,
    damageShell,
    rank,
    bossTier,
    weaponLevel,
    phaseOffset: (id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100) / 100,
    damageFlashUntil: 0,
    baseScale,
    knockoutAt: null,
    knockoutOrigin: new THREE.Vector3(),
    knockoutDirection: new THREE.Vector3(),
  };
}

export class JourneyDiscArenaThreeScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly arenaRoot = new THREE.Group();
  private readonly fightersRoot = new THREE.Group();
  private readonly fieldRoot = new THREE.Group();
  private readonly crowdRoot = new THREE.Group();
  private readonly fighterVisuals = new Map<string, FighterVisual>();
  private readonly impactFlashes: ImpactFlash[] = [];
  private readonly shockRings: ShockRing[] = [];
  private readonly startedAtMs = performance.now();
  private animationFrame = 0;
  private resizeObserver: ResizeObserver;
  private snapshot: JourneyDiscArenaPreviewSnapshot | null = null;
  private lastEventSignature = '';
  private reducedMotion = false;
  private currentTheme: 'pearl' | 'eclipse' | null = null;
  private arenaSideMaterial: THREE.MeshStandardMaterial | null = null;
  private arenaFloorMaterial: THREE.MeshStandardMaterial | null = null;
  private arenaFloorDecalMaterial: THREE.MeshBasicMaterial | null = null;
  private arenaFloorTexture: THREE.Texture | null = null;
  private readonly cameraBasePosition = new THREE.Vector3();
  private readonly cameraFitTarget = new THREE.Vector3();
  private readonly cameraTarget = new THREE.Vector3();
  private portraitComposition = false;
  private cameraShakeUntil = 0;
  private cameraShakeStrength = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0xffffff, 0);
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0xe9f7ff, 0.015);
    this.scene.add(this.arenaRoot, this.fightersRoot, this.fieldRoot, this.crowdRoot);
    this.createEnvironment();
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.animate();
  }

  update(snapshot: JourneyDiscArenaPreviewSnapshot) {
    this.snapshot = snapshot;
    this.applyCameraComposition();
    this.applyTheme(snapshot.battle?.arenaProfile.theme ?? (snapshot.progress.eventPoints >= 900 ? 'eclipse' : 'pearl'));
    const desired = snapshot.battle?.fighters.map((fighter) => ({
      id: fighter.id,
      pieceId: fighter.pieceId,
      rank: fighter.rank,
      bossTier: fighter.bossTier,
      moduleId: fighter.moduleId,
      weaponLevel: fighter.weaponLevel,
      team: fighter.team,
      deployed: true,
      formationSlot: undefined as number | undefined,
    })) ?? [
      ...snapshot.playerLineup.map((fighter, index) => ({
        ...fighter,
        bossTier: 0,
        team: 'player' as const,
        deployed: snapshot.formationSlots[index] === true,
      })),
      ...buildJourneyDiscArenaRivalRoster(snapshot.encounter).map((rival, index) => ({
        id: rival.id,
        pieceId: rival.pieceId,
        rank: snapshot.encounter.rivalRankFloor,
        bossTier: snapshot.encounter.bossTier,
        moduleId: index % 2 === 0 ? 'ram_fin' : 'aegis_ring',
        weaponLevel: Math.min(5, snapshot.encounter.bossTier > 0 ? snapshot.encounter.bossTier + 2 : snapshot.encounter.rivalRankFloor),
        team: 'rival' as const,
        deployed: true,
        formationSlot: undefined as number | undefined,
      })),
    ];
    const desiredIds = new Set(desired.map((fighter) => fighter.id));
    for (const [id, visual] of this.fighterVisuals) {
      if (desiredIds.has(id)) continue;
      this.fightersRoot.remove(visual.root);
      this.fightersRoot.remove(visual.lifeBar);
      this.fightersRoot.remove(visual.trail);
      this.disposeObject(visual.root);
      this.disposeObject(visual.lifeBar);
      this.disposeObject(visual.trail);
      this.fighterVisuals.delete(id);
    }
    for (const fighter of desired) {
      const current = this.fighterVisuals.get(fighter.id);
      if (current && current.rank === fighter.rank && current.bossTier === fighter.bossTier && current.weaponLevel === fighter.weaponLevel) {
        current.root.userData.formationSlot = fighter.formationSlot;
        current.root.userData.deployed = fighter.deployed;
        continue;
      }
      if (current) {
        this.fightersRoot.remove(current.root);
        this.fightersRoot.remove(current.lifeBar);
        this.fightersRoot.remove(current.trail);
        this.disposeObject(current.root);
        this.disposeObject(current.lifeBar);
        this.disposeObject(current.trail);
      }
      const visual = createFighterVisual(fighter.pieceId, fighter.rank, fighter.bossTier, fighter.moduleId, fighter.weaponLevel, fighter.team, fighter.id);
      visual.root.userData.formationSlot = fighter.formationSlot;
      visual.root.userData.deployed = fighter.deployed;
      this.fighterVisuals.set(fighter.id, visual);
      this.fightersRoot.add(visual.trail, visual.root, visual.lifeBar);
    }

    const eventSignature = snapshot.recentEvents.map((event) => JSON.stringify(event)).join('|');
    if (eventSignature && eventSignature !== this.lastEventSignature) {
      for (const event of snapshot.recentEvents) {
        if (event.type === 'impact') {
          const leftVisual = this.fighterVisuals.get(event.fighterAId);
          const rightVisual = this.fighterVisuals.get(event.fighterBId);
          const left = leftVisual?.root.position;
          const right = rightVisual?.root.position;
          if (!left || !right) continue;
          const nowSeconds = (performance.now() - this.startedAtMs) / 1000;
          if (leftVisual) leftVisual.damageFlashUntil = nowSeconds + 0.17;
          if (rightVisual) rightVisual.damageFlashUntil = nowSeconds + 0.17;
          this.punchCamera(nowSeconds, event.strength >= 8 ? 0.2 : 0.09, event.strength >= 8 ? 0.22 : 0.1);
          this.spawnImpactFlash(new THREE.Vector3().addVectors(left, right).multiplyScalar(0.5), event.strength >= 8 ? 0xffcf68 : 0xffffff);
        }
        if (event.type === 'surge') {
          const fighter = this.fighterVisuals.get(event.fighterId)?.root.position;
          if (fighter) this.spawnShockRing(fighter.clone(), PLAYER_COLOR);
          this.punchCamera((performance.now() - this.startedAtMs) / 1000, 0.16, 0.16);
        }
        if (event.type === 'speed_field') {
          const fighter = this.fighterVisuals.get(event.fighterId)?.root.position;
          if (fighter) this.spawnShockRing(fighter.clone(), SPEED_COLOR);
        }
        if (event.type === 'freeze') {
          const fighter = this.fighterVisuals.get(event.targetFighterId)?.root.position;
          if (fighter) this.spawnShockRing(fighter.clone(), ICE_COLOR);
        }
        if (event.type === 'echo_spawn') {
          const fighter = this.fighterVisuals.get(event.collectorFighterId)?.root.position;
          if (fighter) this.spawnShockRing(fighter.clone(), ECHO_COLOR);
        }
        if (event.type === 'shield_break' || event.type === 'knockout') {
          const visual = this.fighterVisuals.get(event.fighterId);
          const fighter = visual?.root.position;
          if (fighter) {
            this.spawnShockRing(fighter.clone(), event.type === 'knockout' ? 0xffcf68 : 0xff5dad);
            if (event.type === 'knockout' && visual && visual.knockoutAt === null) {
              visual.knockoutAt = (performance.now() - this.startedAtMs) / 1000;
              visual.knockoutOrigin.copy(fighter);
              visual.knockoutDirection.set(fighter.x >= 0 ? 1 : -1, 0, fighter.z >= 0 ? 0.55 : -0.55).normalize();
              visual.damageFlashUntil = visual.knockoutAt + 0.38;
              this.punchCamera(visual.knockoutAt, 0.32, 0.36);
              for (let burst = 0; burst < 6; burst += 1) {
                const burstPosition = fighter.clone().add(new THREE.Vector3(Math.cos(burst) * 0.22, 0.1, Math.sin(burst) * 0.22));
                this.spawnImpactFlash(burstPosition, burst % 2 === 0 ? 0xff173d : 0xffcf68);
              }
            }
          }
        }
      }
    }
    this.lastEventSignature = eventSignature;
  }

  private createEnvironment() {
    const hemisphere = new THREE.HemisphereLight(0x38dfff, 0x030b32, 0.82);
    const key = new THREE.DirectionalLight(0xe9ffff, 2.1);
    key.position.set(-7, 12, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    const rim = new THREE.PointLight(RIVAL_COLOR, 7, 24, 2);
    rim.position.set(8, 4, -6);
    const playerRim = new THREE.PointLight(PLAYER_COLOR, 7, 22, 2);
    playerRim.position.set(-8, 3, 5);
    this.scene.add(hemisphere, key, rim, playerRim);

    this.arenaSideMaterial = createMaterial(0x031348, { emissive: 0x00145c, emissiveIntensity: 0.58, roughness: 0.2 });
    const arenaSide = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 10.2, 1.4, 64),
      this.arenaSideMaterial,
    );
    arenaSide.position.y = -0.72;
    arenaSide.receiveShadow = true;
    arenaSide.castShadow = true;
    this.arenaRoot.add(arenaSide);

    this.arenaFloorMaterial = createMaterial(0x031963, { emissive: 0x001866, emissiveIntensity: 0.42, roughness: 0.22, metalness: 0.54 });
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(8.95, 9, 0.22, 64),
      this.arenaFloorMaterial,
    );
    floor.receiveShadow = true;
    floor.position.y = 0.02;
    this.arenaRoot.add(floor);

    this.arenaFloorTexture = new THREE.TextureLoader().load('/assets/event-games/journey-disc-arena/arena-floor-v1.webp');
    this.arenaFloorTexture.colorSpace = THREE.SRGBColorSpace;
    this.arenaFloorTexture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.arenaFloorDecalMaterial = new THREE.MeshBasicMaterial({
      map: this.arenaFloorTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      toneMapped: false,
    });
    const authoredFloor = new THREE.Mesh(new THREE.CircleGeometry(8.84, 96), this.arenaFloorDecalMaterial);
    authoredFloor.name = 'authored-arena-floor';
    authoredFloor.rotation.x = -Math.PI / 2;
    authoredFloor.position.y = 0.145;
    authoredFloor.renderOrder = 1;
    this.arenaRoot.add(authoredFloor);

    const energySweep = new THREE.Group();
    energySweep.name = 'arena-energy-sweep';
    for (let arc = 0; arc < 3; arc += 1) {
      const sweep = new THREE.Mesh(
        new THREE.TorusGeometry(5.05 + arc * 0.32, 0.055, 5, 30, Math.PI * 0.35),
        new THREE.MeshBasicMaterial({
          color: arc === 1 ? 0xff26db : 0x28e9ff,
          transparent: true,
          opacity: 0.72 - arc * 0.13,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      sweep.rotation.x = Math.PI / 2;
      sweep.rotation.z = arc * Math.PI * 0.66;
      sweep.position.y = 0.19 + arc * 0.008;
      energySweep.add(sweep);
    }
    this.arenaRoot.add(energySweep);

    for (const [radius, color, opacity] of [[8.6, 0x2fc3d7, 0.66], [6.2, 0x9b62ff, 0.31], [3.2, 0xf4b738, 0.43]] as const) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, radius === 8.6 ? 0.09 : 0.045, 6, 80),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.18;
      this.arenaRoot.add(ring);
    }

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 2),
      createMaterial(0xffc65d, { emissive: 0xff8a3d, emissiveIntensity: 2.1, roughness: 0.15 }),
    );
    core.name = 'arena-core';
    core.position.y = -1.12;
    this.arenaRoot.add(core);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.6, 2.7, 8), createMaterial(0xb8d6df));
    pedestal.position.y = -2.2;
    this.arenaRoot.add(pedestal);

    const speedField = new THREE.Group();
    speedField.name = 'speed-field';
    speedField.position.set(0, 0.22, 0);
    const speedDisc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ color: SPEED_COLOR, transparent: true, opacity: 0.22, depthWrite: false }));
    speedDisc.rotation.x = -Math.PI / 2;
    const speedRing = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.085, 8, 48), new THREE.MeshBasicMaterial({ color: SPEED_COLOR, transparent: true, opacity: 0.92, depthWrite: false }));
    speedRing.rotation.x = Math.PI / 2;
    speedField.add(speedDisc, speedRing);
    this.fieldRoot.add(speedField);

    const freezePickup = new THREE.Group();
    freezePickup.name = 'powerup-freeze';
    freezePickup.position.set(-2.4, 0.75, -1.4);
    const iceCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), createMaterial(0xd9f6ff, { emissive: ICE_COLOR, emissiveIntensity: 1.35, metalness: 0.25, roughness: 0.12 }));
    const iceRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 6, 28), new THREE.MeshBasicMaterial({ color: ICE_COLOR }));
    iceRing.rotation.x = Math.PI / 2;
    freezePickup.add(iceCrystal, iceRing);
    this.fieldRoot.add(freezePickup);

    const echoPickup = new THREE.Group();
    echoPickup.name = 'powerup-echo';
    echoPickup.position.set(2.4, 0.75, 1.4);
    const echoCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.44, 0), createMaterial(0xffffff, { emissive: ECHO_COLOR, emissiveIntensity: 1.45, metalness: 0.45, roughness: 0.12 }));
    const echoRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 6, 28), new THREE.MeshBasicMaterial({ color: ECHO_COLOR }));
    echoRing.rotation.x = Math.PI / 2;
    echoPickup.add(echoCore, echoRing);
    this.fieldRoot.add(echoPickup);

    this.createSpectators();
  }

  /** Decorative only: these island spectators never enter simulation state or hit testing. */
  private createSpectators() {
    const headGeometry = new THREE.SphereGeometry(0.17, 8, 6);
    const bodyGeometry = new THREE.CapsuleGeometry(0.18, 0.34, 3, 6);
    const armGeometry = new THREE.CapsuleGeometry(0.045, 0.32, 2, 5);
    const skin = createMaterial(0xe7bd92, { metalness: 0.02, roughness: 0.78 });
    const tunic = createMaterial(0xffffff, { metalness: 0.04, roughness: 0.7 });
    const tunicColors = [0x31a6a0, 0xf3a44a, 0x7759b8, 0x3d78bd, 0xd55872];
    const heads = new THREE.InstancedMesh(headGeometry, skin, 16);
    const bodies = new THREE.InstancedMesh(bodyGeometry, tunic, 16);
    const arms = new THREE.InstancedMesh(armGeometry, tunic, 32);
    heads.name = 'island-spectator-heads';
    bodies.name = 'island-spectator-bodies';
    arms.name = 'island-spectator-arms';
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3(1, 1, 1);
    const localPosition = (angle: number, radius: number, x: number, y: number, z: number) => position.set(
      Math.cos(angle) * radius - Math.sin(angle) * x + Math.cos(angle) * z,
      y,
      Math.sin(angle) * radius + Math.cos(angle) * x + Math.sin(angle) * z,
    );
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2 + 0.1;
      const radius = 10.35 + (index % 2) * 0.28;
      const baseY = 0.08 + (index % 3) * 0.035;
      quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
      matrix.compose(localPosition(angle, radius, 0, baseY + 0.34, 0), quaternion, scale);
      bodies.setMatrixAt(index, matrix);
      bodies.setColorAt(index, new THREE.Color(tunicColors[index % tunicColors.length]));
      matrix.compose(localPosition(angle, radius, 0, baseY + 0.82, 0), quaternion, scale);
      heads.setMatrixAt(index, matrix);
      for (const [armOffset, tilt] of [[-0.23, -0.62], [0.23, 0.62]] as const) {
        quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, tilt, 'YXZ'));
        const armIndex = index * 2 + (armOffset > 0 ? 1 : 0);
        matrix.compose(localPosition(angle, radius, armOffset, baseY + 0.58, 0), quaternion, scale);
        arms.setMatrixAt(armIndex, matrix);
        arms.setColorAt(armIndex, new THREE.Color(tunicColors[index % tunicColors.length]));
      }
    }
    heads.instanceMatrix.needsUpdate = true;
    bodies.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
    if (arms.instanceColor) arms.instanceColor.needsUpdate = true;
    this.crowdRoot.add(heads, bodies, arms);
  }

  private applyTheme(theme: 'pearl' | 'eclipse') {
    if (theme === this.currentTheme && this.arenaFloorMaterial) return;
    this.currentTheme = theme;
    if (theme === 'eclipse') {
      this.scene.fog = new THREE.FogExp2(0x07101d, 0.0038);
      this.arenaSideMaterial?.color.setHex(0x142a42);
      this.arenaSideMaterial?.emissive.setHex(0x174567);
      this.arenaFloorMaterial?.color.setHex(0x13213a);
      this.arenaFloorMaterial?.emissive.setHex(0x07111f);
      this.arenaFloorDecalMaterial?.color.setHex(0xc4ceff);
      if (this.arenaFloorDecalMaterial) this.arenaFloorDecalMaterial.opacity = 0.96;
      return;
    }
    this.scene.fog = new THREE.FogExp2(0x4ad8ed, 0.0045);
    this.arenaSideMaterial?.color.setHex(0x031348);
    this.arenaSideMaterial?.emissive.setHex(0x00145c);
    this.arenaFloorMaterial?.color.setHex(0x031963);
    this.arenaFloorMaterial?.emissive.setHex(0x001866);
    this.arenaFloorDecalMaterial?.color.setHex(0xffffff);
    if (this.arenaFloorDecalMaterial) this.arenaFloorDecalMaterial.opacity = 1;
  }

  private spawnImpactFlash(position: THREE.Vector3, color: number) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    mesh.position.copy(position).setY(0.72);
    this.scene.add(mesh);
    this.impactFlashes.push({ mesh, bornAt: (performance.now() - this.startedAtMs) / 1000 });
  }

  private spawnShockRing(position: THREE.Vector3, color: number) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.07, 6, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(position).setY(0.82);
    this.scene.add(mesh);
    this.shockRings.push({ mesh, bornAt: (performance.now() - this.startedAtMs) / 1000 });
  }

  private punchCamera(nowSeconds: number, durationSeconds: number, strength: number) {
    if (this.reducedMotion) return;
    this.cameraShakeUntil = Math.max(this.cameraShakeUntil, nowSeconds + durationSeconds);
    this.cameraShakeStrength = Math.max(this.cameraShakeStrength, strength);
  }

  private resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const fit = resolveJourneyDiscArenaCameraFit(width, height);
    this.portraitComposition = fit.isPortrait;
    this.camera.aspect = width / height;
    // Portrait uses the narrow horizontal FOV as the limiting dimension. This
    // high, distant fit keeps the complete 10.2-unit outer board visible on a
    // 390×844 phone with safe space above and below for the HUD.
    this.cameraBasePosition.set(fit.position.x, fit.position.y, fit.position.z);
    this.cameraFitTarget.set(fit.target.x, fit.target.y, fit.target.z);
    this.applyCameraComposition();
    this.camera.position.copy(this.cameraBasePosition);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
    const cap = fit.isPortrait ? 1.75 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this.renderer.setSize(width, height, false);
  }

  private applyCameraComposition() {
    this.cameraTarget.copy(this.cameraFitTarget);
    if (this.portraitComposition && this.snapshot?.mode === 'prep') {
      // Lift the setup arena above the formation sheet so both 3D lineups are
      // actually visible on a phone instead of staged behind the controls.
      this.cameraTarget.z += 4.35;
    }
    this.camera.position.copy(this.cameraBasePosition);
    this.camera.lookAt(this.cameraTarget);
  }

  private animate = () => {
    this.animationFrame = window.requestAnimationFrame(this.animate);
    const elapsed = (performance.now() - this.startedAtMs) / 1000;
    if (elapsed < this.cameraShakeUntil && !this.reducedMotion) {
      const remaining = Math.max(0, Math.min(1, (this.cameraShakeUntil - elapsed) / 0.32));
      const strength = this.cameraShakeStrength * remaining;
      this.camera.position.copy(this.cameraBasePosition).add(new THREE.Vector3(
        Math.sin(elapsed * 116) * strength,
        Math.cos(elapsed * 89) * strength * 0.35,
        Math.sin(elapsed * 73) * strength * 0.28,
      ));
      this.camera.lookAt(this.cameraTarget);
    } else if (this.camera.position.distanceToSquared(this.cameraBasePosition) > 0.0001) {
      this.camera.position.copy(this.cameraBasePosition);
      this.camera.lookAt(this.cameraTarget);
      this.cameraShakeStrength = 0;
    }
    const snapshot = this.snapshot;
    if (snapshot) {
      if (snapshot.battle) {
        const lifeBarScreenOffset = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).multiplyScalar(1.7);
        for (const fighter of snapshot.battle.fighters) {
          const visual = this.fighterVisuals.get(fighter.id);
          if (!visual) continue;
          const stats = getJourneyDiscArenaFighterStats(fighter);
          const knockoutAge = visual.knockoutAt === null ? -1 : elapsed - visual.knockoutAt;
          if (!fighter.active && knockoutAge >= 0) {
            visual.trail.visible = false;
            const launch = Math.min(1, knockoutAge / 0.68);
            visual.root.position.copy(visual.knockoutOrigin).addScaledVector(visual.knockoutDirection, launch * 4.8);
            visual.root.position.y = 0.45 + Math.sin(launch * Math.PI) * 3.25 - launch * 2.4;
            visual.root.rotation.x += this.reducedMotion ? 0 : 0.25;
            visual.root.rotation.z += this.reducedMotion ? 0 : 0.32;
            const knockoutScale = Math.max(0.01, 1 - Math.max(0, launch - 0.52) * 2.08);
            visual.root.scale.setScalar(knockoutScale * visual.baseScale);
            visual.root.visible = knockoutAge < 0.7;
          } else {
            visual.root.visible = true;
            visual.root.scale.setScalar(visual.baseScale);
            visual.root.position.x = THREE.MathUtils.lerp(visual.root.position.x, fighter.position.x, 0.44);
            visual.root.position.z = THREE.MathUtils.lerp(visual.root.position.z, fighter.position.z, 0.44);
            visual.root.position.y = THREE.MathUtils.lerp(visual.root.position.y, fighter.active ? 0.45 : -3.8, fighter.active ? 0.28 : 0.08);
          }
          visual.lifeBar.position.copy(visual.root.position).add(lifeBarScreenOffset);
          visual.lifeBar.quaternion.copy(this.camera.quaternion);
          visual.lifeBar.visible = fighter.active;
          const speed = Math.hypot(fighter.velocity.x, fighter.velocity.z);
          const frozen = fighter.frozenUntilTick > snapshot.battle.tick;
          if (fighter.active && speed > 1.4 && !frozen) {
            const direction = new THREE.Vector3(fighter.velocity.x / speed, 0, fighter.velocity.z / speed);
            visual.trail.visible = true;
            visual.trail.position.copy(visual.root.position).addScaledVector(direction, -1.15).setY(0.36);
            visual.trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            visual.trail.scale.set(0.84 + speed * 0.025, 0.62 + speed * 0.055, 0.84 + speed * 0.025);
            visual.trail.material.opacity = Math.min(0.66, 0.12 + speed * 0.065);
            visual.trail.material.color.setHex(fighter.speedBoostUntilTick > snapshot.battle.tick ? SPEED_COLOR : fighter.team === 'player' ? PLAYER_COLOR : RIVAL_COLOR);
          } else {
            visual.trail.visible = false;
          }
          visual.spinner.rotation.y += (frozen ? 0.005 : this.reducedMotion ? 0.025 : 0.06 + speed * 0.018) * (fighter.team === 'player' ? 1 : -1);
          visual.root.rotation.z = THREE.MathUtils.lerp(visual.root.rotation.z, fighter.active ? clampTilt(fighter.velocity.z * -0.025) : 0.55, 0.08);
          const shieldRatio = fighter.shield / stats.maxShield;
          visual.lifeFill.scale.x = Math.max(0.02, shieldRatio * 1.84);
          visual.lifeFill.position.x = -(1 - shieldRatio) * 0.92;
          visual.shield.material.opacity = fighter.shieldBroken ? 0.05 : 0.24 + shieldRatio * 0.64;
          visual.shield.scale.setScalar(0.92 + Math.sin(elapsed * 4 + visual.phaseOffset * 6) * 0.035);
          visual.energyRail.material.opacity = 0.3 + (fighter.spin / stats.maxSpin) * 0.55;
          visual.energyRail.material.color.setHex(fighter.speedBoostUntilTick > snapshot.battle.tick ? SPEED_COLOR : fighter.team === 'player' ? PLAYER_COLOR : RIVAL_COLOR);
          const selected = fighter.active && fighter.id === snapshot.selectedFighterId;
          visual.selectionRing.visible = selected;
          if (selected) {
            visual.selectionRing.rotation.z = this.reducedMotion ? 0 : -elapsed * 1.85;
            visual.selectionRing.scale.setScalar(1 + Math.sin(elapsed * 7) * 0.08);
            visual.selectionRing.material.opacity = 0.72 + Math.sin(elapsed * 9) * 0.22;
          }
          visual.freezeAura.visible = frozen;
          if (frozen && !this.reducedMotion) visual.freezeAura.rotation.y += 0.015;
          const damageFlashing = elapsed < visual.damageFlashUntil;
          visual.damageShell.visible = damageFlashing;
          visual.damageShell.material.opacity = damageFlashing ? 0.48 + Math.sin(elapsed * 75) * 0.2 : 0;
          visual.damageShell.scale.setScalar(damageFlashing ? 1 + Math.sin(elapsed * 45) * 0.1 : 1);
        }
      } else {
        const visuals = Array.from(this.fighterVisuals.entries());
        const playerVisuals = visuals.filter(([id]) => id.startsWith('player-'));
        const rivalVisuals = visuals.filter(([id]) => id.startsWith('rival-'));
        for (const [index, [id, visual]] of playerVisuals.entries()) {
          const slot = typeof visual.root.userData.formationSlot === 'number' ? visual.root.userData.formationSlot : index;
          const position = PREVIEW_FORMATION_POSITIONS[slot] ?? PREVIEW_FORMATION_POSITIONS[index];
          const deployed = visual.root.userData.deployed === true;
          const previewScale = visual.baseScale * (deployed ? 1 : 0.8);
          visual.root.visible = true;
          visual.root.scale.setScalar(previewScale);
          visual.root.position.set(position.x + (deployed ? 0 : -0.28), (deployed ? 0.48 : 0.35) + Math.sin(elapsed * 1.5 + index) * 0.07, position.z);
          visual.spinner.rotation.y += this.reducedMotion ? 0 : (deployed ? 0.026 : 0.012) + index * 0.003;
          visual.shield.material.opacity = deployed ? 0.72 : 0.12;
          visual.energyRail.material.opacity = deployed ? 0.8 : 0.2;
          const selected = id === snapshot.selectedFighterId;
          visual.selectionRing.visible = deployed || selected;
          visual.selectionRing.material.color.setHex(selected ? 0xffd21f : PLAYER_COLOR);
          visual.selectionRing.material.opacity = deployed || selected ? 0.62 + Math.sin(elapsed * 5 + index) * 0.14 : 0;
          if ((deployed || selected) && !this.reducedMotion) visual.selectionRing.rotation.z = -elapsed * (selected ? 1.35 : 0.82);
          visual.lifeBar.visible = false;
          visual.trail.visible = false;
        }
        for (const [index, [, visual]] of rivalVisuals.entries()) {
          const columnCount = rivalVisuals.length > 3 ? 2 : 1;
          const rowCount = Math.ceil(rivalVisuals.length / columnCount);
          const column = index % columnCount;
          const row = Math.floor(index / columnCount);
          visual.root.visible = true;
          visual.root.scale.setScalar(visual.baseScale);
          visual.root.position.set(
            4.5 - column * 2.05,
            0.48 + Math.sin(elapsed * 1.5 + index + 2) * 0.07,
            (row - (rowCount - 1) / 2) * 2.15 - 1.05,
          );
          visual.spinner.rotation.y -= this.reducedMotion ? 0 : 0.026 + index * 0.003;
          visual.shield.material.opacity = 0.72;
          visual.energyRail.material.opacity = 0.8;
          visual.selectionRing.visible = true;
          visual.selectionRing.material.color.setHex(RIVAL_COLOR);
          visual.selectionRing.material.opacity = 0.62 + Math.sin(elapsed * 5 + index) * 0.14;
          if (!this.reducedMotion) visual.selectionRing.rotation.z = elapsed * 0.82;
          visual.lifeBar.visible = false;
          visual.trail.visible = false;
        }
      }
    }

    const core = this.arenaRoot.getObjectByName('arena-core');
    if (core && !this.reducedMotion) {
      core.rotation.y = elapsed * 0.6;
      core.rotation.x = elapsed * 0.25;
      core.scale.setScalar(0.92 + Math.sin(elapsed * 2.2) * 0.08);
    }
    if (!this.reducedMotion) this.arenaRoot.rotation.y = Math.sin(elapsed * 0.11) * 0.015;
    const energySweep = this.arenaRoot.getObjectByName('arena-energy-sweep');
    if (energySweep && !this.reducedMotion) energySweep.rotation.y = elapsed * 0.42;
    const speedField = this.fieldRoot.getObjectByName('speed-field');
    if (speedField && !this.reducedMotion) speedField.rotation.y = elapsed * 0.5;
    const freezePickup = this.fieldRoot.getObjectByName('powerup-freeze');
    const echoPickup = this.fieldRoot.getObjectByName('powerup-echo');
    const freezeActive = snapshot?.battle?.powerups.find((powerup) => powerup.type === 'freeze')?.active ?? true;
    const echoActive = snapshot?.battle?.powerups.find((powerup) => powerup.type === 'echo')?.active ?? true;
    if (freezePickup) {
      freezePickup.visible = freezeActive;
      freezePickup.rotation.y = this.reducedMotion ? 0 : elapsed * 1.2;
    }
    if (echoPickup) {
      echoPickup.visible = echoActive;
      echoPickup.rotation.y = this.reducedMotion ? 0 : -elapsed * 1.1;
    }
    if (!this.reducedMotion) {
      this.crowdRoot.position.y = Math.max(0, Math.sin(elapsed * 3.2)) * 0.08;
      this.crowdRoot.rotation.y = Math.sin(elapsed * 0.8) * 0.004;
    }

    for (let index = this.impactFlashes.length - 1; index >= 0; index -= 1) {
      const flash = this.impactFlashes[index];
      const age = elapsed - flash.bornAt;
      flash.mesh.scale.setScalar(1 + age * 8);
      flash.mesh.material.opacity = Math.max(0, 0.9 - age * 3.4);
      if (age > 0.3) {
        this.scene.remove(flash.mesh);
        flash.mesh.geometry.dispose();
        flash.mesh.material.dispose();
        this.impactFlashes.splice(index, 1);
      }
    }
    for (let index = this.shockRings.length - 1; index >= 0; index -= 1) {
      const ring = this.shockRings[index];
      const age = elapsed - ring.bornAt;
      ring.mesh.scale.setScalar(1 + age * 6.5);
      ring.mesh.material.opacity = Math.max(0, 0.95 - age * 2.4);
      if (age > 0.42) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
        this.shockRings.splice(index, 1);
      }
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    window.cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry?.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material?.dispose();
      }
      if (object instanceof THREE.Sprite) object.material.dispose();
    });
    this.arenaFloorTexture?.dispose();
    this.arenaFloorTexture = null;
    this.renderer.dispose();
  }

  private disposeObject(root: THREE.Object3D) {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
      if (object instanceof THREE.Sprite) object.material.dispose();
    });
  }
}

function clampTilt(value: number): number {
  return Math.max(-0.12, Math.min(0.12, value));
}
