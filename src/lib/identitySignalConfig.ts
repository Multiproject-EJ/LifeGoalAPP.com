// Centralized configuration for Identity Signals
// Single source of truth for all identity vector copy, labels, icons, and reflections

export interface IdentitySignalConfig {
  key: string;                    // internal vector name
  label: string;                  // user-facing friendly name
  icon: string;                   // emoji icon
  description: string;            // 1-line explanation
  reflectionHigh: string;         // reflection message when signal is strong
  reflectionGrowing: string;      // reflection message when signal is emerging
  color: string;                  // accent color for UI badges
}

export const IDENTITY_SIGNALS: IdentitySignalConfig[] = [
  {
    key: 'discipline',
    label: 'Follow-Through',
    icon: '🎯',
    description: 'You keep promises to yourself.',
    reflectionHigh: 'You show up consistently, even when it\'s hard.',
    reflectionGrowing: 'You\'re building the habit of keeping promises.',
    color: '#4A90D9',
  },
  {
    key: 'resilience',
    label: 'Bounce-Back',
    icon: '🛡️',
    description: 'You recover with grace.',
    reflectionHigh: 'You bounce back stronger after setbacks.',
    reflectionGrowing: 'You\'re learning to recover without shame.',
    color: '#E67E22',
  },
  {
    key: 'care',
    label: 'Kindness',
    icon: '💛',
    description: 'You treat yourself with warmth.',
    reflectionHigh: 'You treat yourself with genuine kindness, and it works.',
    reflectionGrowing: 'You\'re discovering how self-care fuels growth.',
    color: '#F39C12',
  },
  {
    key: 'courage',
    label: 'Bravery',
    icon: '🦁',
    description: 'You\'re willing to begin.',
    reflectionHigh: 'You start even when it feels uncertain.',
    reflectionGrowing: 'You\'re finding the courage to try new things.',
    color: '#E74C3C',
  },
  {
    key: 'creativity',
    label: 'Curiosity',
    icon: '🎨',
    description: 'You thrive with variety and play.',
    reflectionHigh: 'You bring curiosity and freshness to your growth.',
    reflectionGrowing: 'You\'re opening up to new approaches.',
    color: '#9B59B6',
  },
  {
    key: 'balance',
    label: 'Harmony',
    icon: '⚖️',
    description: 'You build a life that doesn\'t tilt too far.',
    reflectionHigh: 'You maintain rhythm across all areas of life.',
    reflectionGrowing: 'You\'re learning to balance effort and rest.',
    color: '#2ECC71',
  },
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get config by internal key
 */
export function getSignalConfig(key: string): IdentitySignalConfig | undefined {
  return IDENTITY_SIGNALS.find((signal) => signal.key === key);
}

/**
 * Get the user-facing label for a vector key
 */
export function getSignalLabel(key: string): string {
  const config = getSignalConfig(key);
  return config?.label ?? key;
}

/**
 * Get reflection message based on signal strength
 */
export function getSignalReflection(key: string, strength: 'high' | 'growing'): string {
  const config = getSignalConfig(key);
  if (!config) {
    return '';
  }
  return strength === 'high' ? config.reflectionHigh : config.reflectionGrowing;
}

/**
 * Get top N signals from a vectors object (for UI display)
 * @param vectors - Record of vector keys to their numeric values
 * @param count - Number of top signals to return (default: 3)
 * @returns Array of signal configs with their values, sorted by value descending
 */
export function getTopSignals(
  vectors: Record<string, number>,
  count: number = 3
): { config: IdentitySignalConfig; value: number }[] {
  const signalsWithValues = Object.entries(vectors)
    .map(([key, value]) => {
      const config = getSignalConfig(key);
      return config ? { config, value } : null;
    })
    .filter((item): item is { config: IdentitySignalConfig; value: number } => item !== null);

  // Sort by value descending
  signalsWithValues.sort((a, b) => b.value - a.value);

  // Return top N
  return signalsWithValues.slice(0, count);
}
