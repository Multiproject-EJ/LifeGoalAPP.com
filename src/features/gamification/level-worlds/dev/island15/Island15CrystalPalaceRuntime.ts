import * as THREE from 'three';

/**
 * Presentation-only binding contract for the production Island 015 palace.
 *
 * The runtime deliberately has no knowledge of gameplay state or persistence.
 * Callers translate canonical state into build levels and focus modes, while
 * this binder only validates and presents an already-approved palace asset.
 */

export const ISLAND_15_CRYSTAL_PALACE_ROOMS = [
  'HATCHERY',
  'HABIT',
  'MYSTERY',
  'WISDOM',
  'BOSS',
] as const;

export type Island15CrystalPalaceRoom = typeof ISLAND_15_CRYSTAL_PALACE_ROOMS[number];
export type Island15CrystalPalaceBuildLevel = 0 | 1 | 2 | 3;
export type Island15CrystalPalaceRendererLandmarkId =
  | 'hatchery'
  | 'habit'
  | 'event'
  | 'wisdom'
  | 'boss';
export type Island15CrystalPalaceFocusMode =
  | 'overview'
  | Island15CrystalPalaceRendererLandmarkId;

export const ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS = [
  'hatchery',
  'habit',
  'event',
  'wisdom',
  'boss',
] as const satisfies readonly Island15CrystalPalaceRendererLandmarkId[];

export const ISLAND_15_CRYSTAL_PALACE_ROOM_BY_RENDERER_ID = Object.freeze({
  hatchery: 'HATCHERY',
  habit: 'HABIT',
  event: 'MYSTERY',
  wisdom: 'WISDOM',
  boss: 'BOSS',
} as const satisfies Record<Island15CrystalPalaceRendererLandmarkId, Island15CrystalPalaceRoom>);

const roomNodeNames = (room: Island15CrystalPalaceRoom) => Object.freeze({
  root: `ISLAND_15_CRYSTAL_PALACE_ROOM_${room}`,
  levels: Object.freeze({
    1: `ISLAND_15_CRYSTAL_PALACE_ROOM_${room}_L1`,
    2: `ISLAND_15_CRYSTAL_PALACE_ROOM_${room}_L2`,
    3: `ISLAND_15_CRYSTAL_PALACE_ROOM_${room}_L3`,
  }),
  hitAnchor: `ISLAND_15_CRYSTAL_PALACE_HIT_ANCHOR_${room}`,
  occluders: `ISLAND_15_CRYSTAL_PALACE_ROOM_${room}_OCCLUDERS`,
});

export const ISLAND_15_CRYSTAL_PALACE_NODE_NAMES = Object.freeze({
  root: 'ISLAND_15_CRYSTAL_PALACE_ROOT',
  permanent: Object.freeze({
    exterior: 'ISLAND_15_CRYSTAL_PALACE_PERMANENT_EXTERIOR',
    rear: 'ISLAND_15_CRYSTAL_PALACE_PERMANENT_REAR',
    crown: 'ISLAND_15_CRYSTAL_PALACE_PERMANENT_CROWN',
  }),
  overview: Object.freeze({
    roof: 'ISLAND_15_CRYSTAL_PALACE_OVERVIEW_ROOF',
    southNearWall: 'ISLAND_15_CRYSTAL_PALACE_OVERVIEW_SOUTH_NEAR_WALL',
  }),
  rooms: Object.freeze({
    HATCHERY: roomNodeNames('HATCHERY'),
    HABIT: roomNodeNames('HABIT'),
    MYSTERY: roomNodeNames('MYSTERY'),
    WISDOM: roomNodeNames('WISDOM'),
    BOSS: roomNodeNames('BOSS'),
  }),
  forbiddenReviewProxyToken: 'REVIEW_BOARD_PROXY',
} as const);

type RoomNodeSet = {
  readonly root: THREE.Object3D;
  readonly levels: Readonly<Record<1 | 2 | 3, THREE.Object3D>>;
  readonly hitAnchor: THREE.Object3D;
  readonly occluders: THREE.Object3D;
};

type Island15BuildRevealRule = {
  readonly rendererId: Island15CrystalPalaceRendererLandmarkId;
  readonly minimumLevel: Island15CrystalPalaceBuildLevel;
};

export interface Island15CrystalPalaceValidatedNodes {
  readonly root: THREE.Object3D;
  readonly permanent: {
    readonly exterior: THREE.Object3D;
    readonly rear: THREE.Object3D;
    readonly crown: THREE.Object3D;
  };
  readonly overview: {
    readonly roof: THREE.Object3D;
    readonly southNearWall: THREE.Object3D;
  };
  readonly rooms: Readonly<Record<Island15CrystalPalaceRoom, RoomNodeSet>>;
}

export type Island15CrystalPalaceBuildLevels = Readonly<
  Record<Island15CrystalPalaceRendererLandmarkId, Island15CrystalPalaceBuildLevel>
>;

export interface Island15CrystalPalaceRuntime {
  readonly root: THREE.Object3D;
  readonly nodes: Island15CrystalPalaceValidatedNodes;
  getBuildLevels(): Island15CrystalPalaceBuildLevels;
  getFocusMode(): Island15CrystalPalaceFocusMode;
  getHitAnchor(rendererId: Island15CrystalPalaceRendererLandmarkId): THREE.Object3D;
  setBuildLevels(levels: Partial<Island15CrystalPalaceBuildLevels>): void;
  setFocusMode(mode: Island15CrystalPalaceFocusMode): void;
  cloneRoomAtLevel(
    rendererId: Island15CrystalPalaceRendererLandmarkId,
    level: Island15CrystalPalaceBuildLevel,
  ): THREE.Object3D;
}

export class Island15CrystalPalaceAssetValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Island 015 crystal palace asset rejected:\n- ${issues.join('\n- ')}`);
    this.name = 'Island15CrystalPalaceAssetValidationError';
    this.issues = [...issues];
  }
}

function collectNamedNodes(source: THREE.Object3D): Map<string, THREE.Object3D[]> {
  const byName = new Map<string, THREE.Object3D[]>();
  source.traverse((object) => {
    if (!object.name) return;
    const matches = byName.get(object.name) ?? [];
    matches.push(object);
    byName.set(object.name, matches);
  });
  return byName;
}

function isDescendantOf(object: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (cursor === ancestor) return true;
    cursor = cursor.parent;
  }
  return false;
}

function hasRenderableDescendant(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((object) => {
    if (
      object instanceof THREE.Mesh
      || object instanceof THREE.Line
      || object instanceof THREE.Points
      || object instanceof THREE.Sprite
    ) found = true;
  });
  return found;
}

function readBuildRevealRule(object: THREE.Object3D): Island15BuildRevealRule | null {
  const rendererId = object.userData.island15BuildRevealRendererId;
  const minimumLevel = object.userData.island15BuildRevealMinLevel;
  if (
    typeof rendererId !== 'string'
    || !ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.includes(rendererId as Island15CrystalPalaceRendererLandmarkId)
    || !Number.isInteger(minimumLevel)
    || minimumLevel < 0
    || minimumLevel > 3
  ) return null;
  return {
    rendererId: rendererId as Island15CrystalPalaceRendererLandmarkId,
    minimumLevel: minimumLevel as Island15CrystalPalaceBuildLevel,
  };
}

function ensureRaycastableHitAnchor(anchor: THREE.Object3D): void {
  if (hasRenderableDescendant(anchor)) return;
  const configuredRadius = Number(anchor.userData.hitRadius);
  const radius = Number.isFinite(configuredRadius)
    ? THREE.MathUtils.clamp(configuredRadius, 0.28, 1.4)
    : 0.72;
  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 6),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  proxy.name = `${anchor.name}_RAYCAST_PROXY`;
  proxy.userData.island15CrystalPalaceHitProxy = true;
  proxy.userData.presentationOnly = true;
  anchor.add(proxy);
}

function disposeOwnedRenderableSubtree(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

function semanticNames(): readonly string[] {
  const names = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES;
  return [
    names.root,
    ...Object.values(names.permanent),
    ...Object.values(names.overview),
    ...ISLAND_15_CRYSTAL_PALACE_ROOMS.flatMap((room) => {
      const roomNames = names.rooms[room];
      return [roomNames.root, ...Object.values(roomNames.levels), roomNames.hitAnchor, roomNames.occluders];
    }),
  ];
}

/** Strictly validates an imported production scene before it can be mounted. */
export function validateIsland15CrystalPalaceAsset(
  source: THREE.Object3D,
): Island15CrystalPalaceValidatedNodes {
  const byName = collectNamedNodes(source);
  const issues: string[] = [];
  const requiredNames = semanticNames();

  requiredNames.forEach((name) => {
    const count = byName.get(name)?.length ?? 0;
    if (count === 0) issues.push(`missing required node ${name}`);
    if (count > 1) issues.push(`duplicate required node ${name} (${count} occurrences)`);
  });

  source.traverse((object) => {
    if (
      object.name.includes(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.forbiddenReviewProxyToken)
      || object.userData.reviewProxyOnly === true
    ) {
      issues.push(`production scene contains review-only node ${object.name || '<unnamed>'}`);
    }
    const hasRevealRenderer = object.userData.island15BuildRevealRendererId !== undefined;
    const hasRevealLevel = object.userData.island15BuildRevealMinLevel !== undefined;
    if ((hasRevealRenderer || hasRevealLevel) && !readBuildRevealRule(object)) {
      issues.push(`node ${object.name || '<unnamed>'} has an invalid Island 015 build-reveal tag pair`);
    }
    const focusOccluderRoom = object.userData.island15FocusOccluderForRoom;
    if (
      focusOccluderRoom !== undefined
      && !ISLAND_15_CRYSTAL_PALACE_ROOMS.includes(focusOccluderRoom as Island15CrystalPalaceRoom)
    ) {
      issues.push(`node ${object.name || '<unnamed>'} has an invalid Island 015 focus-occluder room`);
    }
  });

  if (issues.length > 0) throw new Island15CrystalPalaceAssetValidationError(issues);

  const one = (name: string) => byName.get(name)![0];
  const root = one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.root);
  requiredNames.slice(1).forEach((name) => {
    if (!isDescendantOf(one(name), root)) {
      issues.push(`required node ${name} is outside ${ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.root}`);
    }
  });

  const rooms = {} as Record<Island15CrystalPalaceRoom, RoomNodeSet>;
  ISLAND_15_CRYSTAL_PALACE_ROOMS.forEach((room) => {
    const names = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms[room];
    const roomRoot = one(names.root);
    const members = [
      one(names.levels[1]),
      one(names.levels[2]),
      one(names.levels[3]),
      one(names.hitAnchor),
      one(names.occluders),
    ];
    members.forEach((member) => {
      if (!isDescendantOf(member, roomRoot)) {
        issues.push(`node ${member.name} is outside its room root ${names.root}`);
      }
    });
    ([1, 2, 3] as const).forEach((stage) => {
      if (!hasRenderableDescendant(members[stage - 1])) {
        issues.push(`room ${room} L${stage} contains no renderable geometry`);
      }
    });
    rooms[room] = {
      root: roomRoot,
      levels: { 1: members[0], 2: members[1], 3: members[2] },
      hitAnchor: members[3],
      occluders: members[4],
    };
  });

  const structuralNodes = [
    one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.exterior),
    one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.rear),
    one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.crown),
    one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.roof),
    one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.southNearWall),
  ];
  structuralNodes.forEach((node) => {
    if (!hasRenderableDescendant(node)) issues.push(`structural node ${node.name} contains no renderable geometry`);
  });

  if (issues.length > 0) throw new Island15CrystalPalaceAssetValidationError(issues);

  return {
    root,
    permanent: {
      exterior: one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.exterior),
      rear: one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.rear),
      crown: one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.crown),
    },
    overview: {
      roof: one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.roof),
      southNearWall: one(ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.southNearWall),
    },
    rooms,
  };
}

export function resolveIsland15CrystalPalaceRoom(
  rendererId: Island15CrystalPalaceRendererLandmarkId,
): Island15CrystalPalaceRoom {
  const room = ISLAND_15_CRYSTAL_PALACE_ROOM_BY_RENDERER_ID[rendererId];
  if (!room) throw new Error(`Unknown Island 015 palace renderer landmark id: ${String(rendererId)}`);
  return room;
}

function assertBuildLevel(level: number): asserts level is Island15CrystalPalaceBuildLevel {
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new Error(`Island 015 palace build level must be 0, 1, 2, or 3; received ${String(level)}`);
  }
}

function deepCloneRenderableOwnership(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
    const renderable = object as THREE.Mesh | THREE.Line | THREE.Points;
    renderable.geometry = renderable.geometry.clone();
    renderable.material = Array.isArray(renderable.material)
      ? renderable.material.map((material) => material.clone())
      : renderable.material.clone();
  });
}

export function bindIsland15CrystalPalaceRuntime(
  source: THREE.Object3D,
): Island15CrystalPalaceRuntime {
  const nodes = validateIsland15CrystalPalaceAsset(source);
  ISLAND_15_CRYSTAL_PALACE_ROOMS.forEach((room) => {
    ensureRaycastableHitAnchor(nodes.rooms[room].hitAnchor);
  });
  const authoredVisibility = new Map<string, boolean>();
  nodes.root.traverse((object) => authoredVisibility.set(object.uuid, object.visible));
  const semanticOccluderIds = new Set<string>();
  ISLAND_15_CRYSTAL_PALACE_ROOMS.forEach((room) => {
    const occluders = nodes.rooms[room].occluders;
    // The named semantic node is itself an explicit focus-occluder contract.
    // Normalizing that tag here keeps imported and procedural assets identical.
    occluders.userData.island15FocusOccluderForRoom = room;
    semanticOccluderIds.add(occluders.uuid);
  });
  const currentLevels: Record<Island15CrystalPalaceRendererLandmarkId, Island15CrystalPalaceBuildLevel> = {
    hatchery: 0,
    habit: 0,
    event: 0,
    wisdom: 0,
    boss: 0,
  };
  let focusMode: Island15CrystalPalaceFocusMode = 'overview';

  const applyRoomLevel = (
    rendererId: Island15CrystalPalaceRendererLandmarkId,
    level: Island15CrystalPalaceBuildLevel,
  ) => {
    const room = nodes.rooms[resolveIsland15CrystalPalaceRoom(rendererId)];
    // Funded rooms remain physically present inside the one palace. Camera
    // focus never becomes an alternate visibility authority for construction;
    // the explicit occluder tags alone open the selected sightline.
    room.root.visible = true;
    room.levels[1].visible = level >= 1;
    room.levels[2].visible = level >= 2;
    room.levels[3].visible = level >= 3;
  };

  const isBuildRevealVisible = (rule: Island15BuildRevealRule) => (
    currentLevels[rule.rendererId] >= rule.minimumLevel
  );

  const applyPresentationVisibility = () => {
    ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((rendererId) => {
      applyRoomLevel(rendererId, currentLevels[rendererId]);
    });

    // Shared cathedral fabric remains mounted for every view. A focus change
    // is allowed to remove only descendants carrying the explicit room tag.
    Object.values(nodes.permanent).forEach((node) => { node.visible = true; });
    Object.values(nodes.overview).forEach((node) => { node.visible = true; });

    const focusedRoom = focusMode === 'overview'
      ? null
      : resolveIsland15CrystalPalaceRoom(focusMode);
    nodes.root.traverse((object) => {
      const revealRule = readBuildRevealRule(object);
      const occluderRoom = object.userData.island15FocusOccluderForRoom;
      if (revealRule) object.visible = isBuildRevealVisible(revealRule);
      if (
        typeof occluderRoom === 'string'
        && ISLAND_15_CRYSTAL_PALACE_ROOMS.includes(occluderRoom as Island15CrystalPalaceRoom)
      ) {
        const authorVisible = semanticOccluderIds.has(object.uuid)
          ? true
          : revealRule
            ? isBuildRevealVisible(revealRule)
            : authoredVisibility.get(object.uuid) ?? object.visible;
        object.visible = authorVisible && (focusedRoom === null || occluderRoom !== focusedRoom);
      }
    });
  };

  const setBuildLevels = (levels: Partial<Island15CrystalPalaceBuildLevels>) => {
    const pending: Array<[Island15CrystalPalaceRendererLandmarkId, Island15CrystalPalaceBuildLevel]> = [];
    Object.entries(levels).forEach(([rawId, rawLevel]) => {
      if (!ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.includes(rawId as Island15CrystalPalaceRendererLandmarkId)) {
        throw new Error(`Unknown Island 015 palace renderer landmark id: ${rawId}`);
      }
      assertBuildLevel(rawLevel as number);
      pending.push([
        rawId as Island15CrystalPalaceRendererLandmarkId,
        rawLevel as Island15CrystalPalaceBuildLevel,
      ]);
    });
    pending.forEach(([rendererId, level]) => {
      currentLevels[rendererId] = level;
    });
    applyPresentationVisibility();
  };

  const setFocusMode = (mode: Island15CrystalPalaceFocusMode) => {
    if (mode !== 'overview' && !ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.includes(mode)) {
      throw new Error(`Unknown Island 015 palace focus mode: ${String(mode)}`);
    }
    focusMode = mode;
    applyPresentationVisibility();
  };

  const cloneRoomAtLevel = (
    rendererId: Island15CrystalPalaceRendererLandmarkId,
    level: Island15CrystalPalaceBuildLevel,
  ) => {
    assertBuildLevel(level);
    const roomId = resolveIsland15CrystalPalaceRoom(rendererId);
    const clone = nodes.rooms[roomId].root.clone(true);
    deepCloneRenderableOwnership(clone);
    clone.name = `${nodes.rooms[roomId].root.name}_CLONE_L${level}`;
    const names = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms[roomId];
    ([1, 2, 3] as const).forEach((stage) => {
      const stageNode = clone.getObjectByName(names.levels[stage]);
      if (!stageNode) throw new Error(`Room clone lost required node ${names.levels[stage]}`);
      stageNode.visible = level >= stage;
    });
    clone.traverse((object) => {
      const revealRule = readBuildRevealRule(object);
      if (!revealRule) return;
      const comparisonLevel = revealRule.rendererId === rendererId
        ? level
        : currentLevels[revealRule.rendererId];
      object.visible = comparisonLevel >= revealRule.minimumLevel;
    });
    const localOccluders = clone.getObjectByName(names.occluders);
    if (localOccluders) localOccluders.visible = false;
    clone.traverse((object) => {
      if (object.userData.island15FocusOccluderForRoom === roomId) object.visible = false;
    });
    const localHitAnchor = clone.getObjectByName(names.hitAnchor);
    if (localHitAnchor) {
      disposeOwnedRenderableSubtree(localHitAnchor);
      localHitAnchor.removeFromParent();
    }
    clone.userData.island15CrystalPalaceRoomClone = true;
    clone.userData.rendererLandmarkId = rendererId;
    clone.userData.buildLevel = level;
    return clone;
  };

  setFocusMode('overview');

  return {
    root: nodes.root,
    nodes,
    getBuildLevels: () => ({ ...currentLevels }),
    getFocusMode: () => focusMode,
    getHitAnchor: (rendererId) => nodes.rooms[resolveIsland15CrystalPalaceRoom(rendererId)].hitAnchor,
    setBuildLevels,
    setFocusMode,
    cloneRoomAtLevel,
  };
}
