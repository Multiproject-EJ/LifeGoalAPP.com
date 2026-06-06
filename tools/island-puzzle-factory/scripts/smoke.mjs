#!/usr/bin/env node
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getExpectedMaskName } from '../src/masks.mjs';
import { getPiecePosition } from '../src/naming.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(factoryRoot, '..', '..');
const tmpRoot = path.join(factoryRoot, 'tmp', 'smoke');
const fixtureRoot = path.join(tmpRoot, 'fixtures');
const outputRoot = path.join(factoryRoot, 'output', 'smoke');
const width = 90;
const height = 60;
const rows = 3;
const columns = 3;

function runFactory(configPath) {
  const result = spawnSync(
    process.execPath,
    [path.join(factoryRoot, 'src', 'cli.mjs'), '--config', configPath],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Factory smoke command failed for ${path.relative(repoRoot, configPath)} with exit ${result.status}`);
  }
}

async function writeMaster(masterPath) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((y * width) + x) * 4;
      rgba[offset] = (x * 3) % 256;
      rgba[offset + 1] = (y * 5) % 256;
      rgba[offset + 2] = ((x + y) * 7) % 256;
      rgba[offset + 3] = 255;
    }
  }
  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(masterPath);
}

async function writeMasks(masksDir) {
  await mkdir(masksDir, { recursive: true });
  let index = 1;
  for (let row = 0; row < rows; row += 1) {
    const top = Math.floor((row * height) / rows);
    const bottom = Math.floor(((row + 1) * height) / rows);
    for (let column = 0; column < columns; column += 1) {
      const left = Math.floor((column * width) / columns);
      const right = Math.floor(((column + 1) * width) / columns);
      const position = getPiecePosition(row, column, rows, columns);
      const filename = getExpectedMaskName(index, position);
      const rgba = Buffer.alloc(width * height * 4);
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const offset = ((y * width) + x) * 4;
          rgba[offset] = 255;
          rgba[offset + 1] = 255;
          rgba[offset + 2] = 255;
          rgba[offset + 3] = 255;
        }
      }
      await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(path.join(masksDir, filename));
      index += 1;
    }
  }
}

async function writeConfig(configPath, config) {
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

async function main() {
  await rm(tmpRoot, { recursive: true, force: true });
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(fixtureRoot, { recursive: true });

  const masterPath = path.join(fixtureRoot, 'master.png');
  const masksDir = path.join(fixtureRoot, 'masks');
  await writeMaster(masterPath);
  await writeMasks(masksDir);

  const baseConfig = {
    inputMaster: path.relative(repoRoot, masterPath),
    islandNumber: 1,
    puzzleId: 'smoke_exact_masks',
    grid: { rows, columns },
    placementMode: 'full_canvas_overlay',
    outputFormat: 'png',
  };

  const rectangleConfigPath = path.join(tmpRoot, 'rectangle.config.json');
  await writeConfig(rectangleConfigPath, {
    ...baseConfig,
    mode: 'V1_RECTANGLE_PLACEHOLDER',
    expectedMode: 'V1_RECTANGLE_PLACEHOLDER',
    outputRoot: path.relative(repoRoot, path.join(outputRoot, 'rectangle')),
  });

  const exactConfigPath = path.join(tmpRoot, 'exact.config.json');
  await writeConfig(exactConfigPath, {
    ...baseConfig,
    mode: 'PRODUCTION_EXACT_JIGSAW',
    expectedMode: 'PRODUCTION_EXACT_JIGSAW',
    masksDir: path.relative(repoRoot, masksDir),
    outputRoot: path.relative(repoRoot, path.join(outputRoot, 'exact')),
  });

  runFactory(rectangleConfigPath);
  runFactory(exactConfigPath);
  console.log('[IslandPuzzleFactory][Smoke] PASS: rectangle placeholder and production exact mask modes produced QC PASS.');
}

main().catch((error) => {
  console.error(`[IslandPuzzleFactory][Smoke][ERROR] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
