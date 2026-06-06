import path from 'node:path';

export const FACTORY_MODE_RECTANGLE_PLACEHOLDER = 'V1_RECTANGLE_PLACEHOLDER';
export const FACTORY_MODE_EXACT_JIGSAW = 'PRODUCTION_EXACT_JIGSAW';
export const SUPPORTED_OUTPUT_FORMATS = new Set(['png', 'webp']);
export const SUPPORTED_PLACEMENT_MODES = new Set(['full_canvas_overlay']);

export const PIECE_POSITIONS_3X3 = [
  'top_left',
  'top_center',
  'top_right',
  'middle_left',
  'middle_center',
  'middle_right',
  'bottom_left',
  'bottom_center',
  'bottom_right',
];

export function padPieceNumber(index) {
  return String(index).padStart(2, '0');
}

export function normalizeSlug(value, fallback = 'puzzle') {
  const raw = typeof value === 'string' ? value.trim() : '';
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
}

export function normalizeIslandNumber(value) {
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) return Math.floor(number);
  return 1;
}

export function islandIdFromNumber(islandNumber) {
  return `island_${String(normalizeIslandNumber(islandNumber)).padStart(3, '0')}`;
}

export function islandNumberFromIslandId(islandId) {
  if (typeof islandId !== 'string') return 1;
  const match = islandId.match(/(\d+)/);
  return match ? normalizeIslandNumber(match[1]) : 1;
}

export function getPiecePosition(row, column, rows, columns) {
  if (rows === 3 && columns === 3) {
    return PIECE_POSITIONS_3X3[(row * columns) + column];
  }
  return `row_${row + 1}_column_${column + 1}`;
}

export function getPieceFilename({ index, outputFormat }) {
  return `${padPieceNumber(index)}.${outputFormat}`;
}

export function getFactoryOutputNames(outputFormat) {
  return {
    completedMaster: `completed_master.${outputFormat}`,
    completedStrongOutline: `completed_strong_outline.${outputFormat}`,
    emptyBoardOutline: `empty_board_outline.${outputFormat}`,
    reassembledCheck: `reassembled_check.${outputFormat}`,
    manifest: 'manifest.json',
    qcReport: 'qc_report.md',
    piecesDirectory: 'pieces',
    qaDirectory: 'qa',
  };
}

export function toPosixRelative(fromDirectory, targetPath) {
  return path.relative(fromDirectory, targetPath).split(path.sep).join('/');
}
