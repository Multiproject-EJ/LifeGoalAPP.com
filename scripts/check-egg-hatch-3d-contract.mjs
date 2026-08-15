import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const presentation = `${read('src/features/gamification/level-worlds/components/CreatureHatchThreeExperience.tsx')}\n${read('src/features/gamification/level-worlds/dev/EggHatchThreeModel.ts')}`;
const board = read('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
const reveal = read('src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx');

const fail = (message) => {
  throw new Error(message);
};

if (presentation.includes('persistIslandRunRuntimeStatePatch')) fail('3D hatch presentation must not persist runtime state.');
if (presentation.includes('resolveReadyEggTerminalTransition')) fail('3D hatch presentation must not resolve the egg again.');
if (presentation.includes('grantCreature')) fail('Replay and recolour must never grant a duplicate creature.');
if (!board.includes('setHatchedCreatureCardId(hatchReveal.creatureId)')) fail('The 3D ceremony must still hand off to the existing 2D creature card.');
if (!reveal.includes('Reveal Creature Card')) fail('The completed 3D ceremony must name the 2D card handoff.');
if (!reveal.includes('Skip to Creature Card')) fail('Players need a safe skip to the 2D creature card.');
if (reveal.includes('showPaletteControls')) fail('Production hatches must keep the rarity-authored shell material instead of exposing lab recolours.');
if (!reveal.includes('fallbackImageSrc={props.imageSrc}')) fail('Production 3D failure must fall back to the shipped creature artwork.');

console.log('PASS egg hatch 3D architecture and 2D card handoff contract');
