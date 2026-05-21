import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { FeatureStatusBadge } from '../../components/FeatureStatusBadge';
import {
  getFeatureAvailability,
  type FeatureAvailability,
  type FeatureAvailabilityId,
} from '../../config/featureAvailability';
import { getMyFeatureVote, upsertFeatureVote } from '../../services/featureVotes';
import { notifyFutureFeatureVoteSaved } from '../../services/futureFeatureEngagement';
import './FutureFeatureVotingPanel.css';

const SETTINGS_FEEDBACK_FEATURE_IDS = [
  'score.creatureSanctuary',
  'mind.meditation',
  'app.routines',
  'score.playerShop',
  'score.garage',
  'settings.notifications',
  'settings.holidayThemes',
] as const satisfies readonly FeatureAvailabilityId[];

type FutureFeatureVotingPanelProps = {
  session: Session;
  isAuthenticated: boolean;
};

function formatCategory(feature: FeatureAvailability) {
  const value = feature.voteCategory ?? feature.category ?? feature.surface ?? 'Future';
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSourceRoute() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

export function FutureFeatureVotingPanel({ session, isAuthenticated }: FutureFeatureVotingPanelProps) {
  const features = useMemo(
    () =>
      SETTINGS_FEEDBACK_FEATURE_IDS
        .map((featureId) => getFeatureAvailability(featureId))
        .filter((feature) => feature.votingEnabled),
    [],
  );
  const [votedByFeatureId, setVotedByFeatureId] = useState<Partial<Record<FeatureAvailabilityId, boolean>>>({});
  const [savingFeatureId, setSavingFeatureId] = useState<FeatureAvailabilityId | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setVotedByFeatureId({});
      return;
    }

    let active = true;
    Promise.all(
      features.map(async (feature) => {
        const { data } = await getMyFeatureVote(feature.id);
        return [feature.id, Boolean(data)] as const;
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
  }, [features, isAuthenticated, session.user.id]);

  const handleVote = async (feature: FeatureAvailability) => {
    if (votedByFeatureId[feature.id] || savingFeatureId) return;

    if (!isAuthenticated) {
      setStatusMessage('Sign in to save your vote.');
      return;
    }

    setSavingFeatureId(feature.id);
    setStatusMessage(null);
    const { error } = await upsertFeatureVote({
      featureId: feature.id,
      voteState: 'would_help_my_quest',
      sourceSurface: 'settings_feedback',
      sourceRoute: getSourceRoute(),
      featureCategory: feature.voteCategory ?? feature.category,
      metadata: {
        featureLabel: feature.label,
        status: feature.status,
        surface: feature.surface,
        category: feature.category,
        voteCategory: feature.voteCategory,
        source: 'settings_feedback_vote_panel',
      },
    });
    setSavingFeatureId(null);

    if (error) {
      setStatusMessage(error.message.includes('Sign in') ? 'Sign in to save your vote.' : 'Couldn’t save — try again.');
      return;
    }

    setVotedByFeatureId((current) => ({ ...current, [feature.id]: true }));
    notifyFutureFeatureVoteSaved(feature.id);
    setStatusMessage('Vote saved.');
  };

  return (
    <div className="future-feature-voting" aria-labelledby="future-feature-voting-heading">
      <div className="future-feature-voting__header">
        <p className="account-panel__eyebrow">Future features</p>
        <h4 id="future-feature-voting-heading">Help shape future features</h4>
        <p className="account-panel__hint">
          Vote for the future tools that would help your real-life quest most.
        </p>
      </div>

      <div className="future-feature-voting__grid">
        {features.map((feature) => {
          const isVoted = Boolean(votedByFeatureId[feature.id]);
          const isSaving = savingFeatureId === feature.id;
          return (
            <article key={feature.id} className={`future-feature-voting__card${isVoted ? ' future-feature-voting__card--voted' : ''}`}>
              <div className="future-feature-voting__card-header">
                <div>
                  <h5>{feature.label}</h5>
                  <span className="future-feature-voting__chip">{formatCategory(feature)}</span>
                </div>
                <FeatureStatusBadge status={feature.status} className="future-feature-voting__badge" />
              </div>
              <p>{feature.shortPitch ?? feature.description}</p>
              <button
                type="button"
                className="future-feature-voting__button"
                onClick={() => void handleVote(feature)}
                disabled={isSaving || isVoted}
              >
                {isSaving ? 'Saving…' : isVoted ? 'Voted' : 'This would help me'}
              </button>
            </article>
          );
        })}
      </div>

      {statusMessage ? (
        <p className="future-feature-voting__status" role="status">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
