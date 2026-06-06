import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FACTORY_MODE_RECTANGLE_PLACEHOLDER, toPosixRelative } from './naming.mjs';

export function buildManifest({
  config,
  mode = FACTORY_MODE_RECTANGLE_PLACEHOLDER,
  masterMetadata,
  outputRoot,
  files,
  pieces,
  qcSummary,
}) {
  return {
    version: 1,
    generator: 'island-puzzle-factory',
    generatedAt: new Date().toISOString(),
    mode,
    productionReady: mode === 'PRODUCTION_EXACT_JIGSAW',
    warnings: mode === FACTORY_MODE_RECTANGLE_PLACEHOLDER
      ? ['NOT PRODUCTION READY FOR JIGSAW FIT: v1 used deterministic rectangle-grid placeholder slicing, not exact jigsaw mask extraction.']
      : [],
    islandNumber: config.islandNumber,
    islandId: config.islandId,
    puzzleId: config.puzzleId,
    placementMode: config.placementMode,
    outputFormat: config.outputFormat,
    source: {
      inputMaster: config.inputMaster,
      geometryAuthority: 'approved source master image',
      width: masterMetadata.width,
      height: masterMetadata.height,
      channels: masterMetadata.channels,
      hasAlpha: Boolean(masterMetadata.hasAlpha),
    },
    grid: {
      rows: config.grid.rows,
      columns: config.grid.columns,
      pieceCount: pieces.length,
      numbering: 'top-left to bottom-right',
    },
    assets: {
      completedMaster: toPosixRelative(outputRoot, files.completedMaster),
      completedStrongOutline: toPosixRelative(outputRoot, files.completedStrongOutline),
      emptyBoardOutline: toPosixRelative(outputRoot, files.emptyBoardOutline),
      reassembledCheck: toPosixRelative(outputRoot, files.reassembledCheck),
      qcReport: toPosixRelative(outputRoot, files.qcReport),
    },
    pieces: pieces.map((piece) => ({
      index: piece.index,
      id: piece.id,
      row: piece.row,
      column: piece.column,
      position: piece.position,
      filename: path.basename(piece.outputPath),
      src: toPosixRelative(outputRoot, piece.outputPath),
      bounds: piece.bounds,
      canvas: {
        width: masterMetadata.width,
        height: masterMetadata.height,
      },
    })),
    qc: qcSummary ?? null,
  };
}

export async function writeManifest({ outputRoot, manifestPath, manifest }) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
