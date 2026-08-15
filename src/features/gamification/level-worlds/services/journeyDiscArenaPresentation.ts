import type { JourneyDiscArenaEncounterProfile } from './journeyDiscArenaGame';
import { resolvePlayerPiece, type PlayerPieceId } from './islandRunPlayerPieces';

/** Pure responsive framing shared by the Three.js scene and phone-fit tests. */
export const JOURNEY_DISC_ARENA_CAMERA_VERTICAL_FOV_DEGREES = 36;
export const JOURNEY_DISC_ARENA_VISUAL_LIP_RADIUS = 10.2;

export const JOURNEY_DISC_ARENA_RIVAL_PIECES: readonly PlayerPieceId[] = [
  'guardian_idol',
  'fallen_star',
  'keepers_lantern',
  'oris_shell',
] as const;

export interface JourneyDiscArenaRivalRosterEntry {
  id: string;
  pieceId: PlayerPieceId;
  name: string;
  role: 'rival' | 'boss' | 'boss_escort';
}

export interface JourneyDiscArenaCampaignStage {
  id: 'scout' | 'challenger' | 'elite' | 'guardian_1' | 'guardian_2' | 'guardian_3';
  label: string;
  shortLabel: string;
  points: number;
}

export const JOURNEY_DISC_ARENA_CAMPAIGN_STAGES: readonly JourneyDiscArenaCampaignStage[] = Object.freeze([
  { id: 'scout', label: 'Scout Exhibition', shortLabel: 'Scout', points: 0 },
  { id: 'challenger', label: 'Challenger Wave', shortLabel: 'Wave', points: 160 },
  { id: 'elite', label: 'Elite Concourse', shortLabel: 'Elite', points: 560 },
  { id: 'guardian_1', label: 'Island Guardian I', shortLabel: 'G I', points: 900 },
  { id: 'guardian_2', label: 'Island Guardian II', shortLabel: 'G II', points: 1050 },
  { id: 'guardian_3', label: 'Island Guardian III', shortLabel: 'G III', points: 1200 },
] as const);

export function resolveJourneyDiscArenaCampaign(eventPoints: number) {
  const points = Math.max(0, Math.floor(eventPoints));
  let currentIndex = 0;
  for (let index = 1; index < JOURNEY_DISC_ARENA_CAMPAIGN_STAGES.length; index += 1) {
    if (points < JOURNEY_DISC_ARENA_CAMPAIGN_STAGES[index].points) break;
    currentIndex = index;
  }
  const current = JOURNEY_DISC_ARENA_CAMPAIGN_STAGES[currentIndex];
  const next = JOURNEY_DISC_ARENA_CAMPAIGN_STAGES[currentIndex + 1] ?? null;
  return {
    points,
    current,
    next,
    pointsToNext: next ? Math.max(0, next.points - points) : 0,
    stages: JOURNEY_DISC_ARENA_CAMPAIGN_STAGES.map((stage, index) => ({
      ...stage,
      state: index < currentIndex ? 'cleared' as const : index === currentIndex ? 'current' as const : 'locked' as const,
    })),
  };
}

/** The exact deterministic rival models staged in setup and used by battle seeds. */
export function buildJourneyDiscArenaRivalRoster(
  encounter: Pick<JourneyDiscArenaEncounterProfile, 'class' | 'rivalCount'>,
): JourneyDiscArenaRivalRosterEntry[] {
  return Array.from({ length: Math.max(0, encounter.rivalCount) }, (_, index) => {
    const pieceId = JOURNEY_DISC_ARENA_RIVAL_PIECES[index % JOURNEY_DISC_ARENA_RIVAL_PIECES.length];
    return {
      id: `rival-${index + 1}`,
      pieceId,
      name: resolvePlayerPiece(pieceId).name,
      role: encounter.class === 'guardian' ? (index === 0 ? 'boss' : 'boss_escort') : 'rival',
    };
  });
}

export interface JourneyDiscArenaCameraFit {
  isPortrait: boolean;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  visibleHalfWidthAtArena: number;
  lipWidthPercent: number;
}

export function resolveJourneyDiscArenaCameraFit(width: number, height: number): JourneyDiscArenaCameraFit {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const isPortrait = safeHeight > safeWidth * 1.18;
  const position = isPortrait ? { x: 0, y: 60, z: 40 } : { x: 0, y: 15, z: 15.5 };
  const target = { x: 0, y: 0, z: isPortrait ? -0.15 : 0 };
  const distance = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
  const halfVerticalFovRadians = JOURNEY_DISC_ARENA_CAMERA_VERTICAL_FOV_DEGREES * Math.PI / 360;
  const visibleHalfWidthAtArena = distance * Math.tan(halfVerticalFovRadians) * (safeWidth / safeHeight);
  return {
    isPortrait,
    position,
    target,
    visibleHalfWidthAtArena,
    lipWidthPercent: JOURNEY_DISC_ARENA_VISUAL_LIP_RADIUS / visibleHalfWidthAtArena * 100,
  };
}
