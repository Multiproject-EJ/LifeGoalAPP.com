function envFlagEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isPlayersHandSparkResultEnabled(): boolean {
  return envFlagEnabled(import.meta.env.VITE_PLAYERS_HAND_SPARK_RESULT_ENABLED);
}

export function isPlayersHandSparkComparisonEnabled(): boolean {
  return import.meta.env.DEV && envFlagEnabled(import.meta.env.VITE_PLAYERS_HAND_SPARK_COMPARE_ENABLED);
}
