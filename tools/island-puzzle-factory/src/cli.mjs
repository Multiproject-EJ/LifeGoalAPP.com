#!/usr/bin/env node
import { access, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACTORY_MODE_RECTANGLE_PLACEHOLDER,
  SUPPORTED_OUTPUT_FORMATS,
  SUPPORTED_PLACEMENT_MODES,
  islandIdFromNumber,
  islandNumberFromIslandId,
  normalizeIslandNumber,
  normalizeSlug,
} from './naming.mjs';
import { runQualityChecks, writeQcReport } from './qc.mjs';
import { slicePuzzle } from './slice-3x3.mjs';
import { buildManifest, writeManifest } from './write-manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(factoryRoot, '..', '..');
const factoryOutputRoot = path.join(factoryRoot, 'output');

function usage() {
  return `Usage:\n  node tools/island-puzzle-factory/src/cli.mjs --config tools/island-puzzle-factory/config/island-001.example.json\n\nRequired config keys:\n  inputMaster, outputRoot, islandNumber, puzzleId, grid.rows, grid.columns, placementMode, outputFormat\n`;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--config') {
      args.config = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveFromRepo(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return path.resolve(repoRoot, value.trim());
}

function normalizeConfig(rawConfig) {
  const islandNumber = normalizeIslandNumber(rawConfig.islandNumber ?? islandNumberFromIslandId(rawConfig.islandId));
  const islandId = typeof rawConfig.islandId === 'string' && rawConfig.islandId.trim().length > 0
    ? rawConfig.islandId.trim()
    : islandIdFromNumber(islandNumber);
  const puzzleId = normalizeSlug(rawConfig.puzzleId ?? rawConfig.puzzleSlug, 'puzzle');
  const inputMaster = resolveFromRepo(rawConfig.inputMaster ?? rawConfig.source?.masterImage);
  const outputRoot = resolveFromRepo(rawConfig.outputRoot ?? rawConfig.output?.root);
  const rows = Number(rawConfig.grid?.rows);
  const columns = Number(rawConfig.grid?.columns);
  const placementMode = rawConfig.placementMode ?? (
    rawConfig.pieceStrategy?.type === 'full_canvas_transparent_overlay'
      ? 'full_canvas_overlay'
      : rawConfig.pieceStrategy?.type
  );
  const outputFormat = String(rawConfig.outputFormat ?? 'png').toLowerCase();

  return {
    islandNumber,
    islandId,
    puzzleId,
    inputMaster,
    outputRoot,
    grid: { rows, columns },
    placementMode,
    outputFormat,
  };
}

function validateConfig(config) {
  const errors = [];
  if (!config.inputMaster) errors.push('inputMaster is required.');
  if (!config.outputRoot) errors.push('outputRoot is required.');
  if (!Number.isInteger(config.grid.rows) || config.grid.rows <= 0) errors.push('grid.rows must be a positive integer.');
  if (!Number.isInteger(config.grid.columns) || config.grid.columns <= 0) errors.push('grid.columns must be a positive integer.');
  if (config.grid.rows !== 3 || config.grid.columns !== 3) errors.push('v1 only supports a 3x3 grid.');
  if (!SUPPORTED_PLACEMENT_MODES.has(config.placementMode)) errors.push(`placementMode must be one of: ${Array.from(SUPPORTED_PLACEMENT_MODES).join(', ')}.`);
  if (!SUPPORTED_OUTPUT_FORMATS.has(config.outputFormat)) errors.push(`outputFormat must be one of: ${Array.from(SUPPORTED_OUTPUT_FORMATS).join(', ')}.`);

  if (config.outputRoot) {
    const relativeToFactoryOutput = path.relative(factoryOutputRoot, config.outputRoot);
    const insideFactoryOutput = relativeToFactoryOutput === '' || (!relativeToFactoryOutput.startsWith('..') && !path.isAbsolute(relativeToFactoryOutput));
    if (!insideFactoryOutput) {
      errors.push(`For this PR, outputRoot must stay under tools/island-puzzle-factory/output. Received: ${path.relative(repoRoot, config.outputRoot)}`);
    }
    const publicPuzzleRoot = path.join(repoRoot, 'public', 'assets', 'puzzle');
    const relativeToPublicPuzzle = path.relative(publicPuzzleRoot, config.outputRoot);
    const insidePublicPuzzle = relativeToPublicPuzzle === '' || (!relativeToPublicPuzzle.startsWith('..') && !path.isAbsolute(relativeToPublicPuzzle));
    if (insidePublicPuzzle) {
      errors.push('Refusing to write to public/assets/puzzle in v1 tooling PR. Use tools/island-puzzle-factory/output instead.');
    }
  }

  return errors;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.config) {
    throw new Error(`Missing --config.\n${usage()}`);
  }

  const configPath = path.resolve(repoRoot, args.config);
  const rawConfig = JSON.parse(await readFile(configPath, 'utf8'));
  const config = normalizeConfig(rawConfig);
  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid config:\n- ${validationErrors.join('\n- ')}`);
  }
  if (!await exists(config.inputMaster)) {
    throw new Error(`inputMaster does not exist: ${path.relative(repoRoot, config.inputMaster)}. Provide an approved master image before running production slicing.`);
  }

  await mkdir(factoryOutputRoot, { recursive: true });
  if (await exists(config.outputRoot)) {
    await rm(config.outputRoot, { recursive: true, force: true });
  }

  console.log(`[IslandPuzzleFactory] Mode: ${FACTORY_MODE_RECTANGLE_PLACEHOLDER}`);
  console.warn('[IslandPuzzleFactory] NOT PRODUCTION READY FOR JIGSAW FIT: v1 uses rectangle-grid placeholder slicing, not exact jigsaw mask extraction.');
  console.log(`[IslandPuzzleFactory] Input: ${path.relative(repoRoot, config.inputMaster)}`);
  console.log(`[IslandPuzzleFactory] Output: ${path.relative(repoRoot, config.outputRoot)}`);

  const result = await slicePuzzle(config);
  const provisionalManifest = buildManifest({
    config,
    mode: result.mode,
    masterMetadata: result.masterMetadata,
    outputRoot: config.outputRoot,
    files: result.files,
    pieces: result.pieces,
    qcSummary: null,
  });
  await writeManifest({ outputRoot: config.outputRoot, manifestPath: result.files.manifest, manifest: provisionalManifest });

  let qcSummary = await runQualityChecks({ config, result, manifestPath: result.files.manifest });
  await writeQcReport({ config, result, qcSummary });

  const finalManifest = buildManifest({
    config,
    mode: result.mode,
    masterMetadata: result.masterMetadata,
    outputRoot: config.outputRoot,
    files: result.files,
    pieces: result.pieces,
    qcSummary,
  });
  await writeManifest({ outputRoot: config.outputRoot, manifestPath: result.files.manifest, manifest: finalManifest });
  qcSummary = await runQualityChecks({ config, result, manifestPath: result.files.manifest });
  await writeQcReport({ config, result, qcSummary });

  console.log(`[IslandPuzzleFactory] QC: ${qcSummary.status}`);
  console.log(`[IslandPuzzleFactory] Manifest: ${path.relative(repoRoot, result.files.manifest)}`);
  console.log(`[IslandPuzzleFactory] QC report: ${path.relative(repoRoot, result.files.qcReport)}`);

  if (qcSummary.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[IslandPuzzleFactory][ERROR] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
