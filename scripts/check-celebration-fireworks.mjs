import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const requiredAssets = [
  'public/assets/animations/fireworks-rapid.webm',
  'public/assets/animations/fireworks-rapid.mov',
  'public/assets/animations/fireworks-hero.webm',
  'public/assets/animations/fireworks-hero.mov',
  'public/assets/animations/fireworks-capstone.webm',
  'public/assets/animations/fireworks-capstone.mov',
  'public/assets/animations/crystal-egg-reveal.webm',
  'public/assets/animations/crystal-egg-reveal.mov',
];

for (const asset of requiredAssets) {
  const absolutePath = path.join(root, asset);
  await access(absolutePath);
  const metadata = await stat(absolutePath);
  if (metadata.size < 100_000) {
    throw new Error(`Celebration asset looks incomplete: ${asset} (${metadata.size} bytes)`);
  }
}

const fireworksSource = await readFile(path.join(root, 'src/components/CelebrationFireworks.tsx'), 'utf8');
const expectedComponentSnippets = [
  'video/quicktime; codecs="hvc1"',
  'video/webm; codecs="vp9"',
  "matchMedia('(prefers-reduced-motion: reduce)')",
  'scheduleRapidFireworksPreload',
  "connection?.saveData",
];

for (const snippet of expectedComponentSnippets) {
  if (!fireworksSource.includes(snippet)) {
    throw new Error(`CelebrationFireworks is missing required behavior: ${snippet}`);
  }
}

const integrations = [
  ['src/components/CelebrationAnimation.tsx', 'variant="hero"'],
  ['src/features/spin-wheel/NewDailySpinWheel.tsx', 'isSpecialPrize ? <CelebrationFireworks variant="rapid"'],
  ['src/features/gamification/level-worlds/components/WelcomePackModal.tsx', '<CelebrationFireworks variant="hero"'],
  ['src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx', "props.rarity === 'mythic' ? 'hero' : 'rapid'"],
  ['src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', "isCycleCapstone ? 'capstone' : 'hero'"],
];

for (const [file, snippet] of integrations) {
  const source = await readFile(path.join(root, file), 'utf8');
  if (!source.includes(snippet)) {
    throw new Error(`${file} is missing celebration integration: ${snippet}`);
  }
}

console.info('Celebration fireworks assets and integrations passed.');
