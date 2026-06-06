import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { FACTORY_MODE_RECTANGLE_PLACEHOLDER } from './naming.mjs';

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function alphaStats(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let visiblePixels = 0;
  for (let index = 3; index < data.length; index += info.channels) {
    if (data[index] > 0) visiblePixels += 1;
  }
  return { visiblePixels, width: info.width, height: info.height, channels: info.channels };
}

async function imageDimensions(filePath) {
  const metadata = await sharp(filePath).metadata();
  return { width: metadata.width, height: metadata.height };
}

async function imagesExactlyMatch(leftPath, rightPath) {
  const left = await sharp(leftPath).ensureAlpha().raw().toBuffer();
  const right = await sharp(rightPath).ensureAlpha().raw().toBuffer();
  return left.length === right.length && left.equals(right);
}

function pushCheck(checks, name, passed, details) {
  checks.push({ name, passed, details });
}

export async function runQualityChecks({ config, result, manifestPath }) {
  const checks = [];
  const expectedFiles = [
    result.files.completedMaster,
    result.files.completedStrongOutline,
    result.files.emptyBoardOutline,
    result.files.reassembledCheck,
    result.files.qcReport,
    manifestPath,
    ...result.pieces.map((piece) => piece.outputPath),
  ];

  for (const filePath of expectedFiles) {
    if (filePath === result.files.qcReport) continue;
    pushCheck(checks, `exists:${path.basename(filePath)}`, await fileExists(filePath), filePath);
  }

  const expectedWidth = result.masterMetadata.width;
  const expectedHeight = result.masterMetadata.height;
  for (const piece of result.pieces) {
    const dimensions = await imageDimensions(piece.outputPath);
    pushCheck(
      checks,
      `piece_canvas:${piece.id}`,
      dimensions.width === expectedWidth && dimensions.height === expectedHeight,
      `${dimensions.width}x${dimensions.height}; expected ${expectedWidth}x${expectedHeight}`,
    );
    const stats = await alphaStats(piece.outputPath);
    pushCheck(
      checks,
      `piece_visible_pixels:${piece.id}`,
      stats.visiblePixels > 0,
      `${stats.visiblePixels} visible pixels`,
    );
  }

  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const manifestReferences = [
    manifest.assets?.completedMaster,
    manifest.assets?.completedStrongOutline,
    manifest.assets?.emptyBoardOutline,
    manifest.assets?.reassembledCheck,
    manifest.assets?.qcReport,
    ...(Array.isArray(manifest.pieces) ? manifest.pieces.map((piece) => piece.src) : []),
  ].filter(Boolean);

  for (const reference of manifestReferences) {
    const referencedPath = path.join(config.outputRoot, reference);
    pushCheck(checks, `manifest_reference:${reference}`, await fileExists(referencedPath), referencedPath);
  }

  pushCheck(
    checks,
    'reassembled_check_exists',
    await fileExists(result.files.reassembledCheck),
    result.files.reassembledCheck,
  );

  const reassembledMatchesMaster = await imagesExactlyMatch(result.files.completedMaster, result.files.reassembledCheck);
  pushCheck(
    checks,
    'reassembled_matches_completed_master_pixels',
    reassembledMatchesMaster,
    reassembledMatchesMaster ? 'exact raw RGBA pixel match' : 'pixel mismatch',
  );

  const passed = checks.every((check) => check.passed);
  return {
    status: passed ? 'PASS' : 'FAIL',
    mode: result.mode,
    productionReady: result.mode !== FACTORY_MODE_RECTANGLE_PLACEHOLDER && passed,
    warning: result.mode === FACTORY_MODE_RECTANGLE_PLACEHOLDER
      ? 'NOT PRODUCTION READY FOR JIGSAW FIT'
      : null,
    checks,
  };
}

export async function writeQcReport({ config, result, qcSummary }) {
  const lines = [];
  lines.push(`# Island Puzzle Factory QC Report`);
  lines.push('');
  lines.push(`Status: ${qcSummary.status}`);
  lines.push(`Mode: ${qcSummary.mode}`);
  lines.push(`Production ready: ${qcSummary.productionReady ? 'YES' : 'NO'}`);
  if (qcSummary.warning) {
    lines.push(`Warning: ${qcSummary.warning}`);
  }
  lines.push('');
  lines.push('## Puzzle');
  lines.push('');
  lines.push(`- Island: ${config.islandId} (${config.islandNumber})`);
  lines.push(`- Puzzle ID: ${config.puzzleId}`);
  lines.push(`- Placement mode: ${config.placementMode}`);
  lines.push(`- Output format: ${config.outputFormat}`);
  lines.push(`- Master canvas: ${result.masterMetadata.width}x${result.masterMetadata.height}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  for (const check of qcSummary.checks) {
    lines.push(`- ${check.passed ? 'PASS' : 'FAIL'} — ${check.name}: ${check.details}`);
  }
  lines.push('');
  if (result.mode === FACTORY_MODE_RECTANGLE_PLACEHOLDER) {
    lines.push('## Production Readiness Warning');
    lines.push('');
    lines.push('NOT PRODUCTION READY FOR JIGSAW FIT: this v1 run used deterministic rectangle-grid placeholder slicing. It does not extract exact jigsaw-shaped masks. Use it for pipeline validation only until exact jigsaw mask extraction is implemented and approved.');
    lines.push('');
  }
  lines.push('## Expected Outputs');
  lines.push('');
  lines.push(`- Completed master: ${path.relative(config.outputRoot, result.files.completedMaster)}`);
  lines.push(`- Strong-outline completed: ${path.relative(config.outputRoot, result.files.completedStrongOutline)}`);
  lines.push(`- Empty board / outline: ${path.relative(config.outputRoot, result.files.emptyBoardOutline)}`);
  lines.push(`- Reassembled check: ${path.relative(config.outputRoot, result.files.reassembledCheck)}`);
  lines.push(`- Manifest: ${path.relative(config.outputRoot, result.files.manifest)}`);
  lines.push(`- Pieces: ${result.pieces.length}`);
  lines.push('');
  await writeFile(result.files.qcReport, `${lines.join('\n')}\n`, 'utf8');
}
