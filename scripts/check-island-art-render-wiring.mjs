#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const boardStagePath = 'src/features/gamification/level-worlds/components/board/BoardStage.tsx';
const prototypePath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';

const boardStage = readFileSync(boardStagePath, 'utf8');
const prototype = readFileSync(prototypePath, 'utf8');
const failures = [];

const forbiddenSymbols = [
  'setIsIslandArtV2Available',
  'onIslandArtAvailabilityChange',
];
for (const symbol of forbiddenSymbols) {
  if (boardStage.includes(symbol) || prototype.includes(symbol)) {
    failures.push(`Remove stale Island Art v2 availability symbol: ${symbol}`);
  }
}

const islandArtLayerCalls = [...boardStage.matchAll(/<IslandArtLayers[\s\S]*?\/>/g)].map((match) => match[0]);
if (islandArtLayerCalls.length !== 1) {
  failures.push(`Expected BoardStage to render exactly one IslandArtLayers call, found ${islandArtLayerCalls.length}.`);
}

const islandArtLayerCall = islandArtLayerCalls[0] ?? '';
if (!/manifest=\{islandArtManifest\}/.test(islandArtLayerCall)) {
  failures.push('BoardStage IslandArtLayers must receive manifest={islandArtManifest}.');
}
if (/islandNumber=|onAvailabilityChange=/.test(islandArtLayerCall)) {
  failures.push('BoardStage IslandArtLayers must not use legacy islandNumber/onAvailabilityChange props.');
}

const artStageMatch = boardStage.match(/className="island-run-board__art-camera-stage"[\s\S]*?style=\{\{ transform: ([^,}]+)/);
if (!artStageMatch || artStageMatch[1].trim() !== 'artCameraTransform') {
  failures.push('Art camera stage must use artCameraTransform without gameplay rotateX/rotateZ.');
}

const gameplayStageMatch = boardStage.match(/className="island-run-board__camera-stage"[\s\S]*?style=\{\{ transform: ([^,}]+)/);
if (!gameplayStageMatch || gameplayStageMatch[1].trim() !== 'cameraStageTransform') {
  failures.push('Gameplay camera stage must use cameraStageTransform with board tilt/rotation.');
}

if (!/const artCameraTransform = camera\.cameraTransform;/.test(boardStage)) {
  failures.push('BoardStage must keep artCameraTransform equal to camera.cameraTransform.');
}
if (!/const cameraStageTransform = `\$\{camera\.cameraTransform\} rotateX\(\$\{boardTiltXDeg\}deg\) rotateZ\(\$\{boardRotateZDeg\}deg\)`;/.test(boardStage)) {
  failures.push('BoardStage must keep gameplay camera transform as camera pan/zoom plus rotateX/rotateZ.');
}

if (failures.length > 0) {
  console.error('Island Art render wiring check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Island Art render wiring check passed.');
