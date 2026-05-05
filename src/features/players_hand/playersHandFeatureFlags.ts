function envFlagEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function envFlagDisabled(value: string | undefined): boolean {
  if (!value) return false;
  return ['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
}

export function isPlayersHandSparkResultEnabled(): boolean {
  const flag = import.meta.env.VITE_PLAYERS_HAND_SPARK_RESULT_ENABLED;
  if (envFlagDisabled(flag)) return false;
  return true;
}

export function isPlayersHandSparkComparisonEnabled(): boolean {
  return import.meta.env.DEV && envFlagEnabled(import.meta.env.VITE_PLAYERS_HAND_SPARK_COMPARE_ENABLED);
}
