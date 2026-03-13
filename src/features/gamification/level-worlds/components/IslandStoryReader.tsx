import { useEffect, useMemo, useRef, useState } from 'react';

import './IslandStoryReader.css';

export type StoryPanel =
  | {
      id?: string;
      type: 'image';
      src: string;
      alt?: string;
      width?: number;
      height?: number;
      caption?: string;
      soundtrack?: StorySoundtrackConfig;
    }
  | {
      id?: string;
      type: 'video';
      src: string;
      poster?: string;
      mutedAutoplay?: boolean;
      loop?: boolean;
      caption?: string;
      soundtrack?: StorySoundtrackConfig;
    }
  | {
      id?: string;
      type: 'text';
      text: string;
      caption?: string;
      soundtrack?: StorySoundtrackConfig;
    };

export interface StorySoundtrackConfig {
  src: string;
  loop?: boolean;
  volume?: number;
}

export interface StoryEpisodeManifest {
  id: string;
  title: string;
  autoLaunch?: boolean;
  panels: StoryPanel[];
  reward?: {
    coins?: number;
  };
  soundtrack?: StorySoundtrackConfig;
}

interface IslandStoryReaderProps {
  manifestPath: string;
  isOpen: boolean;
  onClose: () => void;
  onRewardClaim?: (coins: number) => void;
}

export function IslandStoryReader({ manifestPath, isOpen, onClose, onRewardClaim }: IslandStoryReaderProps) {
  const [manifest, setManifest] = useState<StoryEpisodeManifest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [activePanelSoundtrack, setActivePanelSoundtrack] = useState<StorySoundtrackConfig | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);

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
    if (!isOpen || !manifest) {
      return;
    }

    const root = containerRef.current;
    const videoNodes = Array.from(root?.querySelectorAll<HTMLVideoElement>('video[data-story-video="true"]') ?? []);
    if (videoNodes.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            if (video.dataset.autoplay === 'true') {
              void video.play().catch(() => {
                // no-op: autoplay can be blocked in some browser contexts
              });
            }
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: 0.55,
      },
    );

    videoNodes.forEach((video) => {
      observer.observe(video);
    });

    return () => {
      observer.disconnect();
      videoNodes.forEach((video) => {
        video.pause();
      });
    };
  }, [isOpen, manifest]);

  useEffect(() => {
    if (!isOpen || !manifest) {
      return;
    }

    const root = containerRef.current;
    const panelNodes = Array.from(root?.querySelectorAll<HTMLElement>('[data-story-panel-index]') ?? []);
    if (panelNodes.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let topCandidate: { index: number; config: StorySoundtrackConfig; ratio: number } | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const panelIndex = Number((entry.target as HTMLElement).dataset.storyPanelIndex);
          if (!Number.isFinite(panelIndex)) {
            continue;
          }

          const panel = manifest.panels[panelIndex];
          const soundtrack = panel?.soundtrack;
          if (!soundtrack?.src) {
            continue;
          }

          if (!topCandidate || entry.intersectionRatio > topCandidate.ratio) {
            topCandidate = {
              index: panelIndex,
              config: soundtrack,
              ratio: entry.intersectionRatio,
            };
          }
        }

        setActivePanelSoundtrack(topCandidate ? topCandidate.config : null);
      },
      {
        threshold: [0.35, 0.6, 0.85],
      },
    );

    panelNodes.forEach((panelNode) => observer.observe(panelNode));

    return () => {
      observer.disconnect();
      setActivePanelSoundtrack(null);
    };
  }, [isOpen, manifest]);

  useEffect(() => {
    const soundtrackConfig = activePanelSoundtrack ?? manifest?.soundtrack ?? null;

    if (!audioEnabled || !isOpen || !soundtrackConfig?.src) {
      if (soundtrackAudioRef.current) {
        soundtrackAudioRef.current.pause();
        soundtrackAudioRef.current.currentTime = 0;
      }
      return;
    }

    const desiredVolume = typeof soundtrackConfig.volume === 'number'
      ? Math.min(1, Math.max(0, soundtrackConfig.volume))
      : 0.65;

    const existing = soundtrackAudioRef.current;
    if (existing && existing.src.endsWith(soundtrackConfig.src)) {
      existing.loop = soundtrackConfig.loop ?? true;
      existing.volume = desiredVolume;
      void existing.play().catch(() => {
        // user may still be blocked by browser-level autoplay policy
      });
      return;
    }

    if (existing) {
      existing.pause();
      existing.currentTime = 0;
    }

    const nextAudio = new Audio(soundtrackConfig.src);
    nextAudio.loop = soundtrackConfig.loop ?? true;
    nextAudio.volume = desiredVolume;
    soundtrackAudioRef.current = nextAudio;
    void nextAudio.play().catch(() => {
      // user may still be blocked by browser-level autoplay policy
    });

    return () => {
      if (soundtrackAudioRef.current === nextAudio) {
        nextAudio.pause();
      }
    };
  }, [activePanelSoundtrack, audioEnabled, isOpen, manifest?.soundtrack]);

  useEffect(() => {
    if (!isOpen) {
      if (soundtrackAudioRef.current) {
        soundtrackAudioRef.current.pause();
        soundtrackAudioRef.current.currentTime = 0;
      }
      setActivePanelSoundtrack(null);
    }
  }, [isOpen]);

  const progressLabel = useMemo(() => {
    if (!manifest || manifest.panels.length === 0) return '0%';
    return `${manifest.panels.length} panels`;
  }, [manifest]);

  if (!isOpen) {
    return null;
  }

  const rewardCoins = manifest?.reward?.coins ?? 0;

  return (
    <div className="island-story-reader__backdrop" role="presentation">
      <section className="island-story-reader" role="dialog" aria-modal="true" aria-label="Island story reader">
        <header className="island-story-reader__header">
          <button type="button" className="island-story-reader__icon-btn" onClick={onClose} aria-label="Close story reader">
            ←
          </button>
          <div className="island-story-reader__meta">
            <p className="island-story-reader__eyebrow">Story</p>
            <h3 className="island-story-reader__title">{manifest?.title ?? 'Loading story...'}</h3>
          </div>
          <div className="island-story-reader__header-right">
            <span className="island-story-reader__progress">{progressLabel}</span>
            <button
              type="button"
              className="island-story-reader__icon-btn"
              onClick={() => setAudioEnabled((value) => !value)}
              aria-label={audioEnabled ? 'Mute story audio' : 'Enable story audio'}
              aria-pressed={audioEnabled}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </header>

        <div className="island-story-reader__content" ref={containerRef}>
          {isLoading ? <p className="island-story-reader__status">Loading episode…</p> : null}
          {error ? <p className="island-story-reader__status island-story-reader__status--error">{error}</p> : null}

          {!isLoading && !error && manifest?.panels.map((panel, index) => {
            const key = panel.id ?? `${panel.type}-${index}`;
            if (panel.type === 'image') {
              const ratio = panel.width && panel.height ? `${panel.width} / ${panel.height}` : undefined;
              return (
                <article key={key} className="island-story-reader__panel" data-story-panel-index={index}>
                  <div className="island-story-reader__media-shell" style={ratio ? { aspectRatio: ratio } : undefined}>
                    <img src={panel.src} alt={panel.alt ?? ''} loading="lazy" decoding="async" />
                  </div>
                  {panel.caption ? <p className="island-story-reader__caption">{panel.caption}</p> : null}
                </article>
              );
            }

            if (panel.type === 'video') {
              return (
                <article key={key} className="island-story-reader__panel" data-story-panel-index={index}>
                  <div className="island-story-reader__media-shell island-story-reader__media-shell--video">
                    <video
                      data-story-video="true"
                      data-autoplay={panel.mutedAutoplay ? 'true' : 'false'}
                      src={panel.src}
                      poster={panel.poster}
                      controls
                      playsInline
                      preload="metadata"
                      muted={!audioEnabled}
                      loop={panel.loop}
                    />
                  </div>
                  {panel.caption ? <p className="island-story-reader__caption">{panel.caption}</p> : null}
                </article>
              );
            }

            return (
              <article key={key} className="island-story-reader__panel island-story-reader__panel--text" data-story-panel-index={index}>
                <p>{panel.text}</p>
                {panel.caption ? <p className="island-story-reader__caption">{panel.caption}</p> : null}
              </article>
            );
          })}

          {!isLoading && !error && manifest ? (
            <footer className="island-story-reader__end-card">
              <h4>Episode complete</h4>
              {rewardCoins > 0 ? <p>Reward: +{rewardCoins} coins</p> : <p>Ready for the next episode.</p>}
              <button
                type="button"
                disabled={rewardClaimed}
                onClick={() => {
                  if (!rewardClaimed && rewardCoins > 0) {
                    onRewardClaim?.(rewardCoins);
                    setRewardClaimed(true);
                  }
                }}
              >
                {rewardClaimed ? 'Reward claimed' : rewardCoins > 0 ? `Claim +${rewardCoins} coins` : 'Done'}
              </button>
            </footer>
          ) : null}
        </div>
      </section>
    </div>
  );
}
