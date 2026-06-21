import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../../lib/supabaseClient';
import { isIslandRunFeatureEnabled } from '../../../../config/islandRunFeatureFlags';
import {
  deriveCombinedJourneyLevel,
  type CombinedJourneyLevelInput,
} from '../services/combinedJourneyLevel';
import {
  buildJourneyChestClaim,
  type JourneyChestClaimViewModel,
} from '../services/combinedJourneyChestClaim';
import { claimCombinedJourneyReward } from '../services/combinedJourneyRewardClaimAction';
import { fetchClaimedJourneyThresholds } from '../services/combinedJourneyRewardClaimsRead';

/**
 * Combined Journey Level — claimable chest wiring (R5).
 *
 * Glue hook for the dual-track overlay spine: derives the level, loads the
 * caller's claimed thresholds when the overlay opens, exposes the next claimable
 * chest, and runs the server-authoritative claim on demand. All grants go
 * through the claim action; this hook never writes runtime state directly.
 */
export interface UseCombinedJourneyChestResult {
  /** Claimable chest view model, or null when the feature is off. */
  chest: JourneyChestClaimViewModel | null;
  /** True while a claim is in flight. */
  pending: boolean;
  /** Transient "+N dice" style feedback after a successful claim. */
  feedback: string | null;
  /** Claim a specific threshold chest. */
  claim: (thresholdLevel: number) => void;
}

export function useCombinedJourneyChest(params: {
  session: Session | null;
  isOpen: boolean;
  milestoneInputs: CombinedJourneyLevelInput;
}): UseCombinedJourneyChestResult {
  const { session, isOpen, milestoneInputs } = params;
  const enabled = isIslandRunFeatureEnabled('combinedJourneyRewardsEnabled');
  const userId = session?.user?.id ?? null;

  const [claimedThresholds, setClaimedThresholds] = useState<number[]>([]);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Keep the latest milestone inputs available to the claim callback without
  // making it churn on every render.
  const milestoneInputsRef = useRef(milestoneInputs);
  milestoneInputsRef.current = milestoneInputs;

  useEffect(() => {
    if (!enabled || !isOpen || !userId) {
      setClaimedThresholds([]);
      setFeedback(null);
      return;
    }
    let cancelled = false;
    fetchClaimedJourneyThresholds(getSupabaseClient()).then((thresholds) => {
      if (!cancelled) setClaimedThresholds(thresholds);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, isOpen, userId]);

  const level = deriveCombinedJourneyLevel(milestoneInputs).level;
  const chest = enabled
    ? buildJourneyChestClaim({ enabled, level, claimedThresholds })
    : null;

  const claim = useCallback(
    (thresholdLevel: number) => {
      if (!enabled || !session || pending) return;
      setPending(true);
      setFeedback(null);
      void claimCombinedJourneyReward({
        session,
        client: getSupabaseClient(),
        thresholdLevel,
        milestoneInputs: milestoneInputsRef.current,
        triggerSource: 'dual_track_overlay_chest',
      })
        .then((result) => {
          if (result.status === 'claimed' && result.reward) {
            setFeedback(`+${result.reward.amount} ${result.reward.kind}`);
          }
          if (result.status === 'claimed' || result.status === 'already_claimed') {
            setClaimedThresholds((prev) =>
              prev.includes(thresholdLevel) ? prev : [...prev, thresholdLevel],
            );
          }
        })
        .finally(() => {
          setPending(false);
        });
    },
    [enabled, session, pending],
  );

  return { chest, pending, feedback, claim };
}
