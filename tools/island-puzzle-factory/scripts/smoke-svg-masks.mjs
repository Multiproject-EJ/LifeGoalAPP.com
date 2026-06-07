#!/usr/bin/env node
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(factoryRoot, '..', '..');
const tmpRoot = path.join(factoryRoot, 'tmp', 'smoke-svg-masks');
const fixtureRoot = path.join(tmpRoot, 'fixtures');
const outputRoot = path.join(factoryRoot, 'output', 'smoke-svg-masks');
const width = 90;
const height = 60;
const rows = 3;
const columns = 3;

function runNode(args, label) {
  const result = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8' });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`${label} failed with exit ${result.status}`);
}

async function writeMaster(masterPath) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((y * width) + x) * 4;
      rgba[offset] = (40 + (x * 2)) % 256;
      rgba[offset + 1] = (90 + (y * 4)) % 256;
      rgba[offset + 2] = (130 + ((x + y) * 3)) % 256;
      rgba[offset + 3] = 255;
    }
  }
  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(masterPath);
}

async function writeConfig(configPath, config) {
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

async function main() {
  await rm(tmpRoot, { recursive: true, force: true });
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(fixtureRoot, { recursive: true });
  await mkdir(outputRoot, { recursive: true });

  const masksDir = path.join(outputRoot, 'masks');
  const exportConfigPath = path.join(tmpRoot, 'svg-mask-export.config.json');
  await writeConfig(exportConfigPath, {
    inputSvg: 'tools/island-puzzle-factory/templates/canonical-3x3-jigsaw-template.example.svg',
    outputMasksDir: path.relative(repoRoot, masksDir),
    canvas: { width, height },
    expectedPieces: 9,
    puzzleId: 'smoke_svg_masks',
    templateId: 'canonical_3x3_jigsaw_template_example',
    clearOutputMasksDir: true,
  });

  runNode([
    path.join(factoryRoot, 'src', 'svg-to-masks.mjs'),
    '--config',
    exportConfigPath,
  ], 'SVG mask export smoke command');

  const masterPath = path.join(fixtureRoot, 'synthetic-master.png');
  await writeMaster(masterPath);

  const factoryConfigPath = path.join(tmpRoot, 'production-exact.config.json');
  await writeConfig(factoryConfigPath, {
    inputMaster: path.relative(repoRoot, masterPath),
    outputRoot: path.relative(repoRoot, path.join(outputRoot, 'factory-production-exact')),
    islandNumber: 1,
    puzzleId: 'smoke_svg_masks',
    grid: { rows, columns },
    placementMode: 'full_canvas_overlay',
    outputFormat: 'png',
    mode: 'PRODUCTION_EXACT_JIGSAW',
    expectedMode: 'PRODUCTION_EXACT_JIGSAW',
    masksDir: path.relative(repoRoot, masksDir),
  });

  runNode([
    path.join(factoryRoot, 'src', 'cli.mjs'),
    '--config',
    factoryConfigPath,
  ], 'PRODUCTION_EXACT_JIGSAW smoke command');

  console.log('[IslandPuzzleFactory][SvgMaskSmoke] PASS: SVG exporter produced masks and PRODUCTION_EXACT_JIGSAW QC passed with a synthetic master.');
}

main().catch((error) => {
  console.error(`[IslandPuzzleFactory][SvgMaskSmoke][ERROR] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
