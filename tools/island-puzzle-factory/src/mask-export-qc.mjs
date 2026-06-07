import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getExpectedMasks, readMaskAlpha } from './masks.mjs';

function pushCheck(checks, name, passed, details) {
  checks.push({ name, passed, details });
}

export async function runMaskExportQc({ masksDir, width, height, expectedPieces = 9, rows = 3, columns = 3, expectedCoverage = null }) {
  const checks = [];
  const expectedMasks = getExpectedMasks({ masksDir, rows, columns });
  pushCheck(checks, 'expected_piece_count', expectedMasks.length === expectedPieces, `${expectedMasks.length}; expected ${expectedPieces}`);

  const files = await readdir(masksDir).catch(() => []);
  const pngFiles = files.filter((file) => file.toLowerCase().endsWith('.png')).sort();
  const expectedFilenames = expectedMasks.map((mask) => mask.filename);
  const extraPngFiles = pngFiles.filter((file) => !expectedFilenames.includes(file));
  const missingPngFiles = expectedFilenames.filter((file) => !pngFiles.includes(file));

  pushCheck(checks, 'no_missing_mask_files', missingPngFiles.length === 0, missingPngFiles.length ? missingPngFiles.join(', ') : 'all expected masks exist');
  pushCheck(checks, 'no_extra_mask_png_files', extraPngFiles.length === 0, extraPngFiles.length ? extraPngFiles.join(', ') : 'no extra mask PNG files');

  const pixelCount = width * height;
  const coverage = new Uint8Array(pixelCount);
  let totalVisiblePixels = 0;

  for (const mask of expectedMasks) {
    try {
      const read = await readMaskAlpha({ maskPath: mask.path, expectedWidth: width, expectedHeight: height });
      pushCheck(checks, `mask_canvas:${mask.filename}`, read.ok, read.error ?? `${read.width}x${read.height}`);
      pushCheck(checks, `mask_visible_pixels:${mask.filename}`, read.visiblePixels > 0, `${read.visiblePixels} visible pixels`);

      let nonBinaryPixels = 0;
      if (read.ok) {
        for (let pixel = 0; pixel < read.alpha.length; pixel += 1) {
          const alpha = read.alpha[pixel];
          if (alpha !== 0 && alpha !== 255) nonBinaryPixels += 1;
          if (alpha > 0) {
            coverage[pixel] += 1;
            totalVisiblePixels += 1;
          }
        }
      }
      pushCheck(checks, `mask_binary_alpha:${mask.filename}`, nonBinaryPixels === 0, `${nonBinaryPixels} non-binary mask pixels`);
    } catch (error) {
      pushCheck(checks, `mask_readable:${mask.filename}`, false, error instanceof Error ? error.message : String(error));
    }
  }

  let uncoveredPixels = 0;
  let overlapPixels = 0;
  let outsideExpectedCoveragePixels = 0;
  let expectedCoveragePixels = 0;
  for (const count of coverage) {
    if (count === 0) uncoveredPixels += 1;
    if (count > 1) overlapPixels += 1;
  }

  pushCheck(checks, 'masks_no_overlaps', overlapPixels === 0, `${overlapPixels} pixels covered by more than one mask`);
  if (expectedCoverage?.alpha) {
    let expectedCoverageGaps = 0;
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const shouldBeCovered = expectedCoverage.alpha[pixel] > 0;
      if (shouldBeCovered) {
        expectedCoveragePixels += 1;
        if (coverage[pixel] === 0) expectedCoverageGaps += 1;
      } else if (coverage[pixel] > 0) {
        outsideExpectedCoveragePixels += 1;
      }
    }
    pushCheck(
      checks,
      'expected_coverage_visible_pixels',
      expectedCoveragePixels > 0,
      expectedCoveragePixels > 0
        ? `${expectedCoveragePixels} visible pixels in ${expectedCoverage.id}`
        : `Coverage element ${expectedCoverage.id} rendered with no visible pixels; silhouette must be non-empty`,
    );
    pushCheck(checks, 'masks_cover_expected_coverage_once', expectedCoverageGaps === 0, `${expectedCoverageGaps} uncovered pixels inside ${expectedCoverage.id}`);
    pushCheck(checks, 'masks_do_not_cover_outside_expected_coverage', outsideExpectedCoveragePixels === 0, `${outsideExpectedCoveragePixels} pixels covered outside ${expectedCoverage.id}`);
    pushCheck(checks, 'visible_pixel_total_matches_expected_coverage', totalVisiblePixels === expectedCoveragePixels, `${totalVisiblePixels}; expected ${expectedCoveragePixels}`);
  } else {
    pushCheck(checks, 'masks_cover_full_canvas_once', uncoveredPixels === 0, `${uncoveredPixels} uncovered pixels across ${pixelCount} canvas pixels`);
    pushCheck(checks, 'visible_pixel_total_matches_canvas', totalVisiblePixels === pixelCount, `${totalVisiblePixels}; expected ${pixelCount}`);
  }

  const status = checks.every((check) => check.passed) ? 'PASS' : 'FAIL';
  return {
    status,
    width,
    height,
    expectedPieces,
    masksDir,
    checks,
  };
}

export async function writeMaskExportReport({ reportPath, config, source, outputs, qcSummary }) {
  const lines = [];
  lines.push('# Island Puzzle Factory Mask Export Report');
  lines.push('');
  lines.push(`Status: ${qcSummary.status}`);
  lines.push('');
  lines.push('## Template');
  lines.push('');
  lines.push(`- Puzzle ID: ${config.puzzleId}`);
  lines.push(`- Template ID: ${config.templateId}`);
  lines.push(`- Input SVG: ${config.inputSvg}`);
  lines.push(`- Canvas: ${source.width}x${source.height}`);
  lines.push(`- ViewBox: ${source.viewBox.join(' ')}`);
  if (config.coverageElementId) lines.push(`- Coverage element: ${config.coverageElementId}`);
  lines.push(`- Expected pieces: ${config.expectedPieces}`);
  lines.push('');
  lines.push('## Output Masks');
  lines.push('');
  lines.push(`- Output masks directory: ${config.outputMasksDir}`);
  for (const output of outputs) {
    lines.push(`- ${path.basename(output.path)} — ${output.pieceId} (${output.visiblePixels} visible pixels)`);
  }
  lines.push('');
  lines.push('## QC Checks');
  lines.push('');
  for (const check of qcSummary.checks) {
    lines.push(`- ${check.passed ? 'PASS' : 'FAIL'} — ${check.name}: ${check.details}`);
  }
  lines.push('');
  lines.push('## Geometry Authority Note');
  lines.push('');
  lines.push('The canonical SVG template and these exported full-canvas mask PNGs are the puzzle-piece geometry authority. They do not create artwork; the approved completed master image remains the artwork authority.');
  lines.push('');
  await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8');
}
