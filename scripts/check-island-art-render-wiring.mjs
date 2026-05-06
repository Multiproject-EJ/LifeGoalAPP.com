#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const boardStagePath = 'src/features/gamification/level-worlds/components/board/BoardStage.tsx';
const prototypePath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const levelWorldsCssPath = 'src/features/gamification/level-worlds/LevelWorlds.css';

const boardStage = readFileSync(boardStagePath, 'utf8');
const prototype = readFileSync(prototypePath, 'utf8');
const levelWorldsCss = readFileSync(levelWorldsCssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const failures = [];


function selectorPartMatches(part, selector) {
  return part === selector
    || part.endsWith(` ${selector}`)
    || part.includes(` ${selector}:`)
    || part.includes(` ${selector}.`);
}

function getCssRulesForSelector(css, selector) {
  const rules = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(css)) !== null) {
    const selectorText = match[1] ?? '';
    if (selectorText.split(',').map((part) => part.trim()).some((part) => selectorPartMatches(part, selector))) {
      rules.push({ selectorText, body: match[2] ?? '' });
    }
  }
  return rules;
}

function cssDeclarationValue(ruleBody, property) {
  const declaration = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i').exec(ruleBody);
  return declaration?.[1]?.trim() ?? null;
}

function hasTransitionNone(selector) {
  return getCssRulesForSelector(levelWorldsCss, selector).some((rule) => {
    const transition = cssDeclarationValue(rule.body, 'transition');
    return transition?.toLowerCase() === 'none';
  });
}

function hasTransformTransition(selector) {
  return getCssRulesForSelector(levelWorldsCss, selector).some((rule) => {
    const transition = cssDeclarationValue(rule.body, 'transition')?.toLowerCase();
    if (transition && transition !== 'none' && transition.includes('transform')) return true;
    const transitionProperty = cssDeclarationValue(rule.body, 'transition-property')?.toLowerCase();
    return Boolean(transitionProperty && transitionProperty !== 'none' && transitionProperty.includes('transform'));
  });
}

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

if (hasTransformTransition('.island-run-board__art-camera-stage')) {
  failures.push('Island Art camera stage must not define a transform transition; it must track camera updates immediately.');
}
if (!hasTransitionNone('.island-run-board__art-camera-stage')) {
  failures.push('Island Art camera stage must have a transition: none CSS override.');
}
if (!hasTransitionNone('.island-art-layers')) {
  failures.push('Island Art layer wrapper must have transition: none.');
}
if (!hasTransitionNone('.island-art-layers__image')) {
  failures.push('Island Art images must have transition: none.');
}

if (failures.length > 0) {
  console.error('Island Art render wiring check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Island Art render wiring check passed.');
