import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { StoryPlayer } from '../../../story/StoryPlayer';
import type { StoryEpisodeManifest, StoryPanel } from '../../../story/storyTypes';
import { lockPageScroll } from '../../../../utils/scrollLock';

import './IslandStoryReader.css';

// Re-exported for back-compat; the canonical definitions live in the shared
// story module (src/features/story) so the island story and the vision board
// story use one content model.
export type { StoryPanel, StorySoundtrackConfig, StoryEpisodeManifest } from '../../../story/storyTypes';

interface IslandStoryReaderProps {
  manifestPath: string;
  isOpen: boolean;
  onClose: () => void;
  onRewardClaim?: (coins: number) => void;
  completionTitle?: string;
  completionText?: string;
  completionButtonLabel?: string;
}

/**
 * Island story reader. Owns manifest loading and the reward/completion flow,
 * and delegates all scene rendering and navigation to the shared StoryPlayer
 * engine (themed via the `island-story-theme` class). The vision board uses the
 * same StoryPlayer with different content.
 */
export function IslandStoryReader({
  manifestPath,
  isOpen,
  onClose,
  onRewardClaim,
  completionTitle = 'Episode complete',
  completionText = 'Ready for the next episode.',
  completionButtonLabel = 'Done',
}: IslandStoryReaderProps) {
  const [manifest, setManifest] = useState<StoryEpisodeManifest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(manifestPath)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load story manifest (${response.status})`);
        }
        const payload = (await response.json()) as StoryEpisodeManifest;
        if (!payload || !Array.isArray(payload.panels)) {
          throw new Error('Story manifest is invalid.');
        }
        if (!isCancelled) {
          setManifest(payload);
          setRewardClaimed(false);
        }
      })
      .catch((loadError: unknown) => {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load story episode.');
          setManifest(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, manifestPath]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    return lockPageScroll(['body', 'documentElement']);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const rewardCoins = manifest?.reward?.coins ?? 0;
  const completionMessage = rewardCoins > 0 ? `Reward: +${rewardCoins} coins` : completionText;
  const completionCtaLabel = rewardClaimed
    ? 'Reward claimed'
    : rewardCoins > 0
      ? `Claim +${rewardCoins} coins`
      : completionButtonLabel;

  const handleCompletion = () => {
    if (rewardClaimed) return;
    if (rewardCoins > 0) {
      onRewardClaim?.(rewardCoins);
      setRewardClaimed(true);
      return;
    }
    onClose();
  };

  if (isLoading || error || !manifest) {
    const shell = (
      <div
        className="island-story-theme island-story-reader-shell"
        role="dialog"
        aria-modal="true"
        aria-label="Island story reader"
      >
        <p
          className={`island-story-reader-shell__status ${
            error ? 'island-story-reader-shell__status--error' : ''
          }`}
        >
          {error ?? 'Loading episode…'}
        </p>
        <button
          type="button"
          className="island-story-reader-shell__close"
          onClick={onClose}
          aria-label="Close story reader"
        >
          Close
        </button>
      </div>
    );
    if (typeof document === 'undefined') return shell;
    return createPortal(shell, document.body);
  }

  // Append a final scene carrying the completion copy so the CTA (reward claim
  // or "done") lands on it, preserving the reader's end-card semantics.
  const completionScene: StoryPanel = {
    id: '__story-completion__',
    type: 'text',
    text: completionTitle,
    caption: completionMessage,
  };
  const panels: StoryPanel[] = [...manifest.panels, completionScene];

  return (
    <StoryPlayer
      isOpen={isOpen}
      panels={panels}
      title={manifest.title}
      className="island-story-theme"
      soundtrack={manifest.soundtrack}
      completionLabel={completionCtaLabel}
      completionDisabled={rewardClaimed}
      closeLabel="Skip story"
      onComplete={handleCompletion}
      onClose={onClose}
    />
  );
}
