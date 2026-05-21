import { useEffect, useMemo, useState } from 'react';
import type { FeatureAvailabilityId } from '../config/featureAvailability';
import { getMyFeatureVote } from '../services/featureVotes';
import {
  FUTURE_FEATURE_ENGAGEMENT_EVENT,
  readSeenFutureFeatures,
  type FutureFeatureEngagementEventDetail,
} from '../services/futureFeatureEngagement';

export type FutureFeatureCardState = {
  seen: boolean;
  voted: boolean;
};

type UseFutureFeatureCardStatesOptions = {
  loadVotes?: boolean;
};

function createSeenState(featureIds: readonly FeatureAvailabilityId[]) {
  const seenFeatures = readSeenFutureFeatures();
  return featureIds.reduce<Partial<Record<FeatureAvailabilityId, boolean>>>((state, featureId) => {
    state[featureId] = seenFeatures.has(featureId);
    return state;
  }, {});
}

export function useFutureFeatureCardStates(
  featureIds: readonly FeatureAvailabilityId[],
  options: UseFutureFeatureCardStatesOptions = {},
): Record<FeatureAvailabilityId, FutureFeatureCardState> {
  const featureKey = JSON.stringify(featureIds);
  const normalizedFeatureIds = useMemo(() => [...featureIds], [featureKey]);
  const [seenByFeatureId, setSeenByFeatureId] = useState<Partial<Record<FeatureAvailabilityId, boolean>>>(() =>
    createSeenState(normalizedFeatureIds),
  );
  const [votedByFeatureId, setVotedByFeatureId] = useState<Partial<Record<FeatureAvailabilityId, boolean>>>({});

  useEffect(() => {
    setSeenByFeatureId(createSeenState(normalizedFeatureIds));
  }, [normalizedFeatureIds]);

  useEffect(() => {
    const refreshSeenState = () => {
      setSeenByFeatureId(createSeenState(normalizedFeatureIds));
    };

    const handleEngagementChange = (event: Event) => {
      const detail = (event as CustomEvent<FutureFeatureEngagementEventDetail>).detail;
      refreshSeenState();
      if (detail?.featureId && detail.voted) {
        setVotedByFeatureId((current) => ({ ...current, [detail.featureId]: true }));
      }
    };

    window.addEventListener(FUTURE_FEATURE_ENGAGEMENT_EVENT, handleEngagementChange);
    window.addEventListener('storage', refreshSeenState);
    return () => {
      window.removeEventListener(FUTURE_FEATURE_ENGAGEMENT_EVENT, handleEngagementChange);
      window.removeEventListener('storage', refreshSeenState);
    };
  }, [normalizedFeatureIds]);

  useEffect(() => {
    if (!options.loadVotes || normalizedFeatureIds.length === 0) {
      setVotedByFeatureId({});
      return;
    }

    let active = true;
    Promise.all(
      normalizedFeatureIds.map(async (featureId) => {
        const result = await getMyFeatureVote(featureId);
        return [featureId, Boolean(result.data)] as const;
      }),
    ).then((voteEntries) => {
      if (!active) return;
      setVotedByFeatureId(
        voteEntries.reduce<Partial<Record<FeatureAvailabilityId, boolean>>>((state, [featureId, voted]) => {
          state[featureId] = voted;
          return state;
        }, {}),
      );
    });

    return () => {
      active = false;
    };
  }, [normalizedFeatureIds, options.loadVotes]);

  return useMemo(
    () =>
      normalizedFeatureIds.reduce<Record<FeatureAvailabilityId, FutureFeatureCardState>>((state, featureId) => {
        state[featureId] = {
          seen: Boolean(seenByFeatureId[featureId]),
          voted: Boolean(votedByFeatureId[featureId]),
        };
        return state;
      }, {} as Record<FeatureAvailabilityId, FutureFeatureCardState>),
    [normalizedFeatureIds, seenByFeatureId, votedByFeatureId],
  );
}

export function getFutureFeatureCardClassName(
  baseClassName: string,
  state?: FutureFeatureCardState,
) {
  return [
    baseClassName,
    state ? 'future-feature-card--demo' : '',
    state?.seen ? 'future-feature-card--seen' : '',
    state?.voted ? 'future-feature-card--voted' : '',
  ].filter(Boolean).join(' ');
}
