import { playTone, playChime, playCoinJingle, playSweep, playClick, playCelebrationCascade } from '../../../utils/audioUtils';

// Dice rolling sounds
export function playDiceRoll(): void {
  // Tumbling dice - multiple quick taps
  for (let i = 0; i < 8; i++) {
    const delay = (i * 100) / 1000; // Convert ms to seconds
    playTone(200 + Math.random() * 100, 0.05, 'square', 0.15, delay);
  }
}

export function playDiceSettle(): void {
  // Final thud as dice settles
  playTone(150, 0.2, 'triangle', 0.2);
}

// Movement sounds
export function playTokenMove(): void {
  // Subtle hop
  playTone(400, 0.1, 'sine', 0.15);
}

// Tile landing sounds
export function playTileLandNeutral(): void {
  // Soft thud
  playTone(200, 0.15, 'triangle', 0.2);
}

export function playTileLandPositive(): void {
  // Warm chime
  playChime([523, 659], 60, 0.15, 0.25);
}

export function playTileLandNegative(): void {
  // Apologetic tone (descending)
  playChime([400, 350], 80, 0.15, 0.2);
}

// Reward sounds
export function playRewardCoins(amount: number): void {
  if (amount < 30) {
    // Single coin jingle
    playCoinJingle(2, 0.25);
  } else if (amount < 100) {
    // Coin cascade
    playCoinJingle(5, 0.3);
  } else {
    // Jackpot sound
    playCoinJingle(8, 0.35);
  }
}

export function playRewardDice(): void {
  // Crisp dice roll
  playTone(800, 0.15, 'square', 0.25);
  playTone(1000, 0.1, 'square', 0.2, 0.1);
}

export function playRewardTokens(): void {
  // Ticket dispense
  playTone(700, 0.2, 'sawtooth', 0.2);
}

// Near-miss sound
export function playNearMiss(): void {
  // Anticipatory whoosh
  playSweep(400, 800, 0.3, 0.2);
}

// Celebration sounds
export function playCelebrationSmall(): void {
  playCelebrationCascade('small');
}

export function playCelebrationMedium(): void {
  playCelebrationCascade('medium');
}

export function playCelebrationBig(): void {
  playCelebrationCascade('big');
}

export function playStreakActive(): void {
  // Fire crackle effect
  for (let i = 0; i < 5; i++) {
    const delay = (i * 100) / 1000; // Convert ms to seconds
    playTone(300 + Math.random() * 200, 0.1, 'sawtooth', 0.2, delay);
  }
}

// Lap celebration sound
export function playLapCelebration(): void {
  // Triumphant fanfare
  playChime([523, 659, 784, 1047], 100, 0.3, 0.3);
}

// Mystery reveal sound
export function playMysteryReveal(): void {
  // Magical unwrap - ascending sweep
  playSweep(200, 1200, 0.4, 0.25);
}

// Jackpot sound
export function playJackpot(): void {
  // Big win - warm and luxurious
  playChime([523, 659, 784, 1047, 1319], 80, 0.4, 0.35);
  playCoinJingle(10, 0.3); // Will start after chime with proper delay
}

// Mini-game trigger sound
export function playMiniGameTrigger(): void {
  // Anticipatory rising tone
  playSweep(400, 1200, 0.5, 0.25);
}

// Shop sounds
export function playShopOpen(): void {
  playChime([400, 500, 600], 60, 0.15, 0.25);
}

export function playShopClose(): void {
  playChime([600, 500, 400], 60, 0.15, 0.25);
}

export function playPackPurchase(): void {
  playChime([523, 659, 784], 80, 0.2, 0.3);
  playCoinJingle(3, 0.25); // Will start after chime with proper delay
}
