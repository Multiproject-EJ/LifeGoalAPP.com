import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

for (const asset of [
  'public/assets/animations/gift-box-opening.webm',
  'public/assets/animations/gift-box-opening.mov',
]) {
  const absolutePath = path.join(root, asset);
  await access(absolutePath);
  const metadata = await stat(absolutePath);
  if (metadata.size < 80_000 || metadata.size > 300_000) {
    throw new Error(`Gift Box animation asset is outside the expected mobile budget: ${asset} (${metadata.size} bytes)`);
  }
}

const componentSource = await readFile(path.join(root, 'src/components/GiftBoxOpeningAnimation.tsx'), 'utf8');
for (const snippet of [
  'video/quicktime; codecs="hvc1"',
  'video/webm; codecs="vp9"',
  "matchMedia('(prefers-reduced-motion: reduce)')",
  'GIFT_BOX_OPENING_ASSET.durationMs + 900',
  'onError={handlePlaybackError}',
  'setSource(GIFT_BOX_OPENING_ASSET.webm)',
  'rewards?: readonly GiftBoxRewardItem[]',
  'onPlaying={() => setStarted(true)}',
]) {
  if (!componentSource.includes(snippet)) {
    throw new Error(`Gift Box animation component is missing required behavior: ${snippet}`);
  }
}

const componentStyles = await readFile(path.join(root, 'src/components/GiftBoxOpeningAnimation.css'), 'utf8');
for (const snippet of [
  'font-size: clamp(3.65rem, 17vw, 5rem)',
  '@keyframes gift-box-reward-pop',
  'var(--gift-reward-delay)',
  'z-index: 1',
]) {
  if (!componentStyles.includes(snippet)) {
    throw new Error(`Gift Box reward pop-out styling is missing required behavior: ${snippet}`);
  }
}

for (const forbidden of ['openTodayHatch', 'executeSpin', 'awardDailyTreat', 'applyEssenceAward']) {
  if (componentSource.includes(forbidden)) {
    throw new Error(`Gift Box animation component must remain UI-only: found ${forbidden}`);
  }
}

const integrations = [
  [
    'src/features/gamification/daily-treats/CountdownCalendarModal.tsx',
    [
      "if (doorType === 'bonus')",
      'rewards: [formatGiftReward(',
      '<GiftBoxOpeningAnimation',
      'rewards={pendingGiftReward.rewards}',
      'onComplete={handleGiftBoxOpeningComplete}',
    ],
  ],
  [
    'src/features/spin-wheel/NewDailySpinWheel.tsx',
    [
      "if (prize.type === 'mystery')",
      'setShowGiftOpening(true)',
      'const resolvedGiftRewards = toGiftBoxRewards(awardedRewards)',
      'rewards={giftRewards}',
      'isTreasureChest ? <CelebrationFireworks variant="rapid" /> : null',
    ],
  ],
  [
    'src/components/AnimationLab.tsx',
    [
      "id: 'giftBox'",
      "src: '/assets/animations/gift-box-opening.webm'",
      "appleSrc: '/assets/animations/gift-box-opening.mov'",
      'Preview reward pop',
      "amount: '500'",
    ],
  ],
];

const spinServiceSource = await readFile(path.join(root, 'src/services/dailySpin.ts'), 'utf8');
for (const snippet of [
  'const awardedRewards = await awardPrize(userId, prize, rewardMultiplier)',
  'awardedRewards.push({ ...pick.reward, amount: pick.amount })',
  'prize_details: { ...(prize.details || {}), awardedRewards }',
]) {
  if (!spinServiceSource.includes(snippet)) {
    throw new Error(`Daily Spin must return and persist the exact granted Mystery reward: ${snippet}`);
  }
}

for (const [file, snippets] of integrations) {
  const source = await readFile(path.join(root, file), 'utf8');
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      throw new Error(`${file} is missing Gift Box animation integration: ${snippet}`);
    }
  }
}

console.info('Gift Box assets, playback safeguards, and reward integrations passed.');
