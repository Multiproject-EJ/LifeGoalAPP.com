export type DailyOfferClaimInFlightRef = {
  current: boolean;
};

export type DailyOfferClaimAward = () => void | Promise<void>;

export interface RunDailyOfferClaimOptions {
  isClaimed: boolean;
  isClaiming: boolean;
  inFlightRef: DailyOfferClaimInFlightRef;
  award: DailyOfferClaimAward;
  markClaimed: () => void;
  closeModal: () => void;
  setClaiming: (isClaiming: boolean) => void;
  setError: (errorMessage: string | null) => void;
  errorMessage: string;
}

export function buildDailyOfferClaimStorageKey(
  offerKey: 'zen_tree_water_claimed' | 'feed_creatures_claimed',
  userId: string,
  dayKey: string,
): string {
  return `lifegoal:${offerKey}:${userId}:${dayKey}`;
}

export async function runDailyOfferClaim(options: RunDailyOfferClaimOptions): Promise<boolean> {
  const {
    isClaimed,
    isClaiming,
    inFlightRef,
    award,
    markClaimed,
    closeModal,
    setClaiming,
    setError,
    errorMessage,
  } = options;

  if (isClaimed || isClaiming || inFlightRef.current) return false;

  inFlightRef.current = true;
  setClaiming(true);
  setError(null);

  try {
    await award();
    markClaimed();
    closeModal();
    return true;
  } catch (error) {
    setError(error instanceof Error && error.message ? error.message : errorMessage);
    return false;
  } finally {
    inFlightRef.current = false;
    setClaiming(false);
  }
}
