#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = process.cwd();
const staleSymbolChecks = [
  {
    file: 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
    patterns: ['setIsIslandArtV2Available'],
  },
  {
    file: 'src/features/gamification/level-worlds/components/board/BoardStage.tsx',
    patterns: ['onIslandArtAvailabilityChange'],
  },
  {
    file: 'src/features/gamification/level-worlds/components/board/IslandArtLayers.tsx',
    patterns: ['onAvailabilityChange', 'islandNumber: number'],
  },
];

const errors = [];

function readProjectFile(file) {
  return readFileSync(resolve(repoRoot, file), 'utf8');
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

for (const check of staleSymbolChecks) {
  const source = readProjectFile(check.file);
  for (const pattern of check.patterns) {
    const offset = source.indexOf(pattern);
    if (offset !== -1) {
      errors.push(`${check.file}:${lineForOffset(source, offset)} contains stale Island Art render wiring symbol: ${pattern}`);
    }
  }
}

const boardStageFile = 'src/features/gamification/level-worlds/components/board/BoardStage.tsx';
const boardStageSource = readProjectFile(boardStageFile);
const islandArtLayerMatches = [...boardStageSource.matchAll(/<IslandArtLayers[\s\S]*?\/>/g)];

if (islandArtLayerMatches.length === 0) {
  errors.push(`${boardStageFile}: missing IslandArtLayers render in the art camera stage`);
}

for (const match of islandArtLayerMatches) {
  const block = match[0];
  const startLine = lineForOffset(boardStageSource, match.index ?? 0);
  if (!/manifest=\{islandArtManifest\}/.test(block)) {
    errors.push(`${boardStageFile}:${startLine} IslandArtLayers must receive manifest={islandArtManifest}`);
  }
  if (/\bislandNumber=|onAvailabilityChange=|onIslandArtAvailabilityChange=/.test(block)) {
    errors.push(`${boardStageFile}:${startLine} IslandArtLayers is still using old islandNumber/onAvailabilityChange props`);
  }
}

if (!/const artCameraTransform = camera\.cameraTransform;/.test(boardStageSource)) {
  errors.push(`${boardStageFile}: art camera stage must use camera.cameraTransform only`);
}

if (!/const cameraStageTransform = `\$\{camera\.cameraTransform\} rotateX\(\$\{boardTiltXDeg\}deg\) rotateZ\(\$\{boardRotateZDeg\}deg\)`;/.test(boardStageSource)) {
  errors.push(`${boardStageFile}: gameplay camera stage must keep camera transform plus rotateX/rotateZ`);
}

if (errors.length > 0) {
  console.error('[IslandArtRenderWiring] FAIL');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`[IslandArtRenderWiring] PASS. Checked ${relative(repoRoot, resolve(repoRoot, boardStageFile))} render-plane wiring.`);
