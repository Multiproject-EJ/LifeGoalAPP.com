import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kitPath = path.join(repoRoot, 'src/features/gamification/level-worlds/dev/camera-locked-kit-v1.json');
const kit = JSON.parse(readFileSync(kitPath, 'utf8'));
const scene = kit.scene;
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(kit.version === 'camera-locked-v1', 'version must remain camera-locked-v1');
assert(scene.width === 1400 && scene.height === 1600, 'scene must remain 1400×1600');
assert(scene.finalAngleRatio === 0.73, 'final-angle ellipse ratio must remain 0.73');
assert(scene.playableBoard.x + scene.playableBoard.width / 2 === scene.centerX, 'board X center moved');
assert(scene.playableBoard.y + scene.playableBoard.height / 2 === scene.centerY, 'board Y center moved');
assert(scene.centerIsland.cx === scene.centerX && scene.centerIsland.cy === scene.centerY, 'center island moved off board anchor');
assert(scene.tileRing.cx === scene.centerX && scene.tileRing.cy === scene.centerY, 'tile ring moved off board anchor');
assert(scene.satellites.length === 4, 'exactly four satellite foundations are required');
assert(scene.satellites[0].cx + scene.satellites[1].cx === scene.width, 'top satellites lost mirror symmetry');
assert(scene.satellites[2].cx + scene.satellites[3].cx === scene.width, 'bottom satellites lost mirror symmetry');
assert(scene.satellites.every((satellite) => satellite.rx * 2 >= 550), 'satellite footprint is too small for L3');
assert(scene.landmarkEnvelope.levelSizes[1] === scene.landmarkEnvelope.levelSizes[0] * 2, 'L2 must be exactly 2× L1');
assert(scene.landmarkEnvelope.levelSizes[2] === scene.landmarkEnvelope.levelSizes[1] * 2, 'L3 must be exactly 2× L2');

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`[IslandTemplateKit][ERROR] ${failure}`));
  process.exit(1);
}

console.log(`[IslandTemplateKit] PASS. ${kit.version} geometry is camera-locked.`);
