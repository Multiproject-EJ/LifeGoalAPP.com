import { getEventRotationTemplates, parseEventId, type EventRotationTemplate } from './islandRunEventEngine';
import { STICKER_FRAGMENTS_PER_STICKER } from './islandRunContractV2RewardBar';

/**
 * Puzzle Collection (Island 015+, user request 2026-09-30): each event's
 * sticker is a five-piece picture puzzle. Reward-bar puzzle pieces fill the
 * current event's puzzle; five pieces complete it (the canonical sticker rule
 * in the reward bar is unchanged). Read-only presentation model.
 */
export const PUZZLE_PIECES_PER_PUZZLE = STICKER_FRAGMENTS_PER_STICKER;

export interface PuzzleCollectionEntry {
  template: EventRotationTemplate;
  completedCount: number;
  /** Stable hue for the puzzle picture. */
  hue: number;
}

export interface PuzzleCollectionView {
  current: PuzzleCollectionEntry;
  piecesPlaced: number;
  piecesPerPuzzle: number;
  entries: PuzzleCollectionEntry[];
  completedPuzzles: number;
  distinctCompleted: number;
}

function hueFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 360;
}

export function resolvePuzzleCollectionView(options: {
  fragments: number;
  stickerInventory: Readonly<Record<string, number>>;
  activeEventId: string | null | undefined;
  templates?: readonly EventRotationTemplate[];
}): PuzzleCollectionView {
  const templates = options.templates ?? getEventRotationTemplates();
  const entries = templates.map((template) => ({
    template,
    completedCount: Math.max(0, Math.floor(options.stickerInventory[template.stickerId] ?? 0)),
    hue: hueFor(template.eventId),
  }));
  // Claims pay the active event's sticker; with no event the first template pays.
  const activeTemplateId = parseEventId(options.activeEventId ?? null);
  const current = entries.find((entry) => entry.template.eventId === activeTemplateId) ?? entries[0]!;
  const fragments = Math.max(0, Math.floor(Number.isFinite(options.fragments) ? options.fragments : 0));
  return {
    current,
    // Claims roll full sets into stickers, so saved fragments stay below five.
    piecesPlaced: Math.min(PUZZLE_PIECES_PER_PUZZLE, fragments),
    piecesPerPuzzle: PUZZLE_PIECES_PER_PUZZLE,
    entries,
    completedPuzzles: entries.reduce((sum, entry) => sum + entry.completedCount, 0),
    distinctCompleted: entries.filter((entry) => entry.completedCount > 0).length,
  };
}

/**
 * SVG path for piece `index` of a five-piece panorama puzzle (viewBox
 * `0 0 500 220`). Pieces are 100 wide; the shared edges carry alternating
 * knobs so neighbours interlock.
 */
export function resolvePuzzlePiecePath(index: number): string {
  const w = 100;
  const h = 220;
  const x0 = index * w;
  const x1 = x0 + w;
  const knob = (x: number, dir: 1 | -1) => {
    // A classic round tab on a vertical edge going down, bulging by dir.
    const y0 = h * 0.38;
    const y1 = h * 0.62;
    const bulge = 22 * dir;
    return `L${x},${y0} C${x + bulge * 0.2},${y0 - 6} ${x + bulge},${y0 - 14} ${x + bulge},${h / 2} C${x + bulge},${y1 + 14} ${x + bulge * 0.2},${y1 + 6} ${x},${y1}`;
  };
  // Right edge of piece i bulges right when i is even, left when odd.
  const rightDir: 1 | -1 = index % 2 === 0 ? 1 : -1;
  const leftDir: 1 | -1 = (index - 1) % 2 === 0 ? 1 : -1;
  let d = `M${x0},0 L${x1},0`;
  d += index < PUZZLE_PIECES_PER_PUZZLE - 1 ? ` ${knob(x1, rightDir)} L${x1},${h}` : ` L${x1},${h}`;
  d += ` L${x0},${h}`;
  if (index > 0) {
    // Walk the left edge upwards: mirror of the neighbour's right edge.
    const y0 = h * 0.62;
    const y1 = h * 0.38;
    const bulge = 22 * leftDir;
    d += ` L${x0},${y0} C${x0 + bulge * 0.2},${y0 + 6} ${x0 + bulge},${y0 + 14} ${x0 + bulge},${h / 2} C${x0 + bulge},${y1 - 14} ${x0 + bulge * 0.2},${y1 - 6} ${x0},${y1}`;
  }
  return `${d} Z`;
}
