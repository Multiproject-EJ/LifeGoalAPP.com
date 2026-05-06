import type { ZBand } from './islandBoardLayout';

export type IslandArtBossState = 'idle' | 'active' | 'attack' | 'defeated' | 'reward';

export interface IslandArtSceneManifest {
  ambientBackground?: string;
  /** @deprecated Use ambientBackground. Kept as a migration alias for older pilot manifests. */
  base?: string;
  boardCircle?: string;
}

export interface IslandArtLandmarkManifest {
  stopIndex: number;
  anchorId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  levels: string[];
  zBand?: ZBand;
}

export interface IslandArtSceneryManifest {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zBand?: ZBand;
}

export interface IslandArtBossManifest {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zBand?: ZBand;
  defaultState?: IslandArtBossState;
  images: Partial<Record<IslandArtBossState, string>>;
  animations?: Partial<Record<IslandArtBossState, string>>;
}

export interface IslandArtManifest {
  version: 2;
  islandNumber: number;
  basePath: string;
  coordinateSpace: {
    width: number;
    height: number;
  };
  scene?: IslandArtSceneManifest;
  landmarks: IslandArtLandmarkManifest[];
  scenery: IslandArtSceneryManifest[];
  boss?: IslandArtBossManifest;
}

export type IslandArtManifestFetcher = (input: string) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

const VALID_Z_BANDS = new Set<ZBand>(['back', 'mid', 'front']);
const VALID_BOSS_STATES = new Set<IslandArtBossState>(['idle', 'active', 'attack', 'defeated', 'reward']);
const DEFAULT_COORDINATE_SPACE = { width: 1000, height: 1000 } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeZBand(value: unknown): ZBand | undefined {
  return typeof value === 'string' && VALID_Z_BANDS.has(value as ZBand) ? value as ZBand : undefined;
}

function normalizeBossState(value: unknown): IslandArtBossState | undefined {
  return typeof value === 'string' && VALID_BOSS_STATES.has(value as IslandArtBossState)
    ? value as IslandArtBossState
    : undefined;
}

export function normalizeIslandArtIslandNumber(islandNumber: number): number {
  return Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;
}

export function getIslandArtFolderName(islandNumber: number): string {
  return `island-${String(normalizeIslandArtIslandNumber(islandNumber)).padStart(3, '0')}`;
}

export function getIslandArtManifestUrl(islandNumber: number): string {
  return `/assets/islands/${getIslandArtFolderName(islandNumber)}/island-art.json`;
}

export function clampIslandArtBuildLevel(buildLevel: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(buildLevel)) return 0;
  return Math.max(0, Math.min(3, Math.floor(buildLevel))) as 0 | 1 | 2 | 3;
}

export function resolveIslandArtAssetPath(basePath: string, assetPath?: string): string | undefined {
  const trimmed = optionalString(assetPath);
  if (!trimmed) return undefined;
  if (/^(?:https?:)?\/\//.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  return `${basePath.replace(/\/$/, '')}/${trimmed.replace(/^\.\//, '')}`;
}

function hasRenderableAsset(raw: Record<string, unknown>): boolean {
  const scene = isRecord(raw.scene) ? raw.scene : {};
  if (optionalString(scene.ambientBackground) || optionalString(scene.base) || optionalString(scene.boardCircle)) return true;

  if (Array.isArray(raw.landmarks)) {
    for (const entry of raw.landmarks) {
      if (!isRecord(entry)) continue;
      if (Array.isArray(entry.levels) && entry.levels.some((level) => optionalString(level))) return true;
    }
  }

  if (Array.isArray(raw.scenery)) {
    for (const entry of raw.scenery) {
      if (isRecord(entry) && optionalString(entry.src)) return true;
    }
  }

  if (isRecord(raw.boss) && isRecord(raw.boss.images)) {
    if (Object.values(raw.boss.images).some((image) => optionalString(image))) return true;
  }

  return false;
}

export function normalizeIslandArtManifest(raw: unknown, islandNumber: number): IslandArtManifest | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== 2) return null;
  if (!hasRenderableAsset(raw)) return null;

  const safeIsland = normalizeIslandArtIslandNumber(islandNumber);
  const basePath = `/assets/islands/${getIslandArtFolderName(safeIsland)}`;
  const coordinateSpace = isRecord(raw.coordinateSpace)
    ? {
      width: Math.max(1, finiteNumber(raw.coordinateSpace.width, DEFAULT_COORDINATE_SPACE.width)),
      height: Math.max(1, finiteNumber(raw.coordinateSpace.height, DEFAULT_COORDINATE_SPACE.height)),
    }
    : { ...DEFAULT_COORDINATE_SPACE };

  const rawScene = isRecord(raw.scene) ? raw.scene : {};
  const scene: IslandArtSceneManifest = {};
  const ambientBackground = resolveIslandArtAssetPath(basePath, optionalString(rawScene.ambientBackground))
    ?? resolveIslandArtAssetPath(basePath, optionalString(rawScene.base));
  const sceneBase = resolveIslandArtAssetPath(basePath, optionalString(rawScene.base));
  const boardCircle = resolveIslandArtAssetPath(basePath, optionalString(rawScene.boardCircle));
  if (ambientBackground) scene.ambientBackground = ambientBackground;
  if (sceneBase) scene.base = sceneBase;
  if (boardCircle) scene.boardCircle = boardCircle;

  const landmarks = Array.isArray(raw.landmarks)
    ? raw.landmarks.flatMap((entry): IslandArtLandmarkManifest[] => {
      if (!isRecord(entry)) return [];
      const levels = Array.isArray(entry.levels)
        ? entry.levels
          .map((level) => resolveIslandArtAssetPath(basePath, optionalString(level)))
          .filter((level): level is string => Boolean(level))
        : [];
      if (!levels.length) return [];
      return [{
        stopIndex: Math.max(0, Math.floor(finiteNumber(entry.stopIndex, 0))),
        anchorId: optionalString(entry.anchorId),
        x: finiteNumber(entry.x, 500),
        y: finiteNumber(entry.y, 500),
        width: Math.max(1, finiteNumber(entry.width, 120)),
        height: Math.max(1, finiteNumber(entry.height, 120)),
        levels,
        zBand: normalizeZBand(entry.zBand),
      }];
    })
    : [];

  const scenery = Array.isArray(raw.scenery)
    ? raw.scenery.flatMap((entry): IslandArtSceneryManifest[] => {
      if (!isRecord(entry)) return [];
      const src = resolveIslandArtAssetPath(basePath, optionalString(entry.src));
      const id = optionalString(entry.id);
      if (!src || !id) return [];
      return [{
        id,
        src,
        x: finiteNumber(entry.x, 500),
        y: finiteNumber(entry.y, 500),
        width: Math.max(1, finiteNumber(entry.width, 120)),
        height: Math.max(1, finiteNumber(entry.height, 120)),
        zBand: normalizeZBand(entry.zBand),
      }];
    })
    : [];

  let boss: IslandArtBossManifest | undefined;
  if (isRecord(raw.boss) && isRecord(raw.boss.images)) {
    const images: Partial<Record<IslandArtBossState, string>> = {};
    for (const state of VALID_BOSS_STATES) {
      const src = resolveIslandArtAssetPath(basePath, optionalString(raw.boss.images[state]));
      if (src) images[state] = src;
    }

    const animations: Partial<Record<IslandArtBossState, string>> = {};
    if (isRecord(raw.boss.animations)) {
      for (const state of VALID_BOSS_STATES) {
        const src = resolveIslandArtAssetPath(basePath, optionalString(raw.boss.animations[state]));
        if (src) animations[state] = src;
      }
    }

    if (Object.keys(images).length > 0) {
      boss = {
        id: optionalString(raw.boss.id) ?? 'boss',
        x: finiteNumber(raw.boss.x, 500),
        y: finiteNumber(raw.boss.y, 500),
        width: Math.max(1, finiteNumber(raw.boss.width, 220)),
        height: Math.max(1, finiteNumber(raw.boss.height, 220)),
        zBand: normalizeZBand(raw.boss.zBand),
        defaultState: normalizeBossState(raw.boss.defaultState) ?? 'idle',
        images,
        ...(Object.keys(animations).length > 0 ? { animations } : {}),
      };
    }
  }

  return {
    version: 2,
    islandNumber: safeIsland,
    basePath,
    coordinateSpace,
    ...(Object.keys(scene).length > 0 ? { scene } : {}),
    landmarks,
    scenery,
    ...(boss ? { boss } : {}),
  };
}

export function getIslandArtLandmarkImageSrc(landmark: IslandArtLandmarkManifest, buildLevel: number): string | null {
  const clampedLevel = clampIslandArtBuildLevel(buildLevel);
  if (clampedLevel < 1) return null;
  return landmark.levels[clampedLevel - 1] ?? landmark.levels[landmark.levels.length - 1] ?? null;
}

export function getIslandArtBossImageSrc(boss: IslandArtBossManifest | undefined, isDefeated: boolean): string | null {
  if (!boss) return null;
  if (isDefeated && boss.images.defeated) return boss.images.defeated;
  const defaultState = boss.defaultState ?? 'idle';
  return boss.images[defaultState] ?? boss.images.idle ?? Object.values(boss.images).find(Boolean) ?? null;
}

export function getIslandArtAmbientBackgroundSrc(manifest: IslandArtManifest | null | undefined): string | null {
  return manifest?.scene?.ambientBackground ?? manifest?.scene?.base ?? null;
}

export function getIslandArtBoardCircleImageSrc(manifest: IslandArtManifest | null | undefined): string | null {
  return manifest?.scene?.boardCircle ?? null;
}

export async function loadIslandArtManifest(
  islandNumber: number,
  fetcher?: IslandArtManifestFetcher,
): Promise<IslandArtManifest | null> {
  const manifestUrl = getIslandArtManifestUrl(islandNumber);
  const resolvedFetcher = fetcher ?? (typeof fetch === 'function' ? fetch.bind(globalThis) as IslandArtManifestFetcher : undefined);
  if (!resolvedFetcher) return null;

  try {
    const response = await resolvedFetcher(manifestUrl);
    if (!response.ok) return null;
    const raw = await response.json();
    return normalizeIslandArtManifest(raw, islandNumber);
  } catch {
    return null;
  }
}
