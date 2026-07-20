import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

for (const asset of [
  'public/assets/animations/creature-pack-opening.webm',
  'public/assets/animations/creature-pack-opening.mov',
]) {
  const absolutePath = path.join(root, asset);
  await access(absolutePath);
  const metadata = await stat(absolutePath);
  if (metadata.size < 100_000 || metadata.size > 500_000) {
    throw new Error(`Creature Pack animation asset is outside the expected mobile budget: ${asset} (${metadata.size} bytes)`);
  }
}

const componentSource = await readFile(path.join(root, 'src/components/CreaturePackOpeningAnimation.tsx'), 'utf8');
for (const snippet of [
  'video/quicktime; codecs="hvc1"',
  'video/webm; codecs="vp9"',
  "matchMedia('(prefers-reduced-motion: reduce)')",
  'CREATURE_PACK_OPENING_ASSET.durationMs + 900',
  'onError={complete}',
]) {
  if (!componentSource.includes(snippet)) {
    throw new Error(`Creature Pack animation component is missing required behavior: ${snippet}`);
  }
}

const integrations = [
  [
    'src/features/gamification/level-worlds/components/WelcomePackModal.tsx',
    ["type Phase = 'economy' | 'cards-intro' | 'pack-opening' | 'card-reveal'", '<CreaturePackOpeningAnimation', "setPhase('card-reveal')"],
  ],
  [
    'src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx',
    ['onOpeningAnimationComplete: () => void', '<CreaturePackOpeningAnimation onComplete={props.onOpeningAnimationComplete} />'],
  ],
  [
    'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
    ['handleFirstCreaturePackOpeningAnimationComplete', 'onOpeningAnimationComplete={handleFirstCreaturePackOpeningAnimationComplete}'],
  ],
  [
    'src/features/gamification/level-worlds/components/CreaturePackOpeningPrototypeModal.tsx',
    ["type CreaturePackOpeningPrototypePhase = 'intro' | 'opening' | 'revealing' | 'summary'", '<CreaturePackOpeningAnimation'],
  ],
  [
    'src/components/AnimationLab.tsx',
    ["id: 'creaturePack'", "src: '/assets/animations/creature-pack-opening.webm'", "appleSrc: '/assets/animations/creature-pack-opening.mov'"],
  ],
];

for (const [file, snippets] of integrations) {
  const source = await readFile(path.join(root, file), 'utf8');
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      throw new Error(`${file} is missing Creature Pack animation integration: ${snippet}`);
    }
  }
}

const boardSource = await readFile(
  path.join(root, 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx'),
  'utf8',
);
if (boardSource.includes('FIRST_CREATURE_PACK_REVEAL_DELAY_MS')) {
  throw new Error('The old timer-driven first Creature Pack reveal is still present.');
}

console.info('Creature Pack opening assets, playback safeguards, and reveal integrations passed.');
