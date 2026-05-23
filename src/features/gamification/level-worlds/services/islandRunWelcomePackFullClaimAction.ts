import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  claimWelcomePackStarterCards,
  type ClaimWelcomePackStarterCardsResult,
} from './islandRunWelcomePackClaimAction';
import {
  claimWelcomePackRewardBundle,
  type ClaimWelcomePackRewardBundleResult,
} from './islandRunWelcomePackRewardBundleAction';

export type ClaimFullWelcomePackStatus =
  | 'claimed'
  | 'partially_claimed'
  | 'already_claimed'
  | 'error';

export interface ClaimFullWelcomePackResult {
  status: ClaimFullWelcomePackStatus;
  cards: ClaimWelcomePackStarterCardsResult;
  bundle: ClaimWelcomePackRewardBundleResult;
}

export interface ClaimFullWelcomePackOptions {
  session: Session;
  client: SupabaseClient | null;
  nowMs?: number;
  triggerSource?: string;
}

/**
 * Canonical full Welcome Pack orchestration helper.
 *
 * IMPORTANT lock strategy:
 * This helper intentionally does not wrap both sub-actions in an outer
 * `withIslandRunActionLock`. Both underlying actions are already lock-protected,
 * and nesting the same per-user lock would self-deadlock. We therefore call
 * them sequentially and rely on each action's own lock boundary.
 */
export async function claimFullWelcomePack(
  options: ClaimFullWelcomePackOptions,
): Promise<ClaimFullWelcomePackResult> {
  const { session, client, nowMs, triggerSource } = options;

  const cards = await claimWelcomePackStarterCards({
    session,
    client,
    nowMs,
    triggerSource: triggerSource
      ? `${triggerSource}:starter_cards`
      : 'claim_full_welcome_pack:starter_cards',
  });

  const bundle = await claimWelcomePackRewardBundle({
    session,
    client,
    nowMs,
    triggerSource: triggerSource
      ? `${triggerSource}:reward_bundle`
      : 'claim_full_welcome_pack:reward_bundle',
  });

  const status =
    cards.status === 'already_claimed' && bundle.status === 'already_claimed'
      ? 'already_claimed'
      : cards.status === 'claimed' && bundle.status !== 'already_claimed'
        ? 'claimed'
        : 'partially_claimed';

  return { status, cards, bundle };
}
