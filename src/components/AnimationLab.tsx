import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './AnimationLab.css';

type AnimationAsset = {
  id: 'fireworks' | 'egg';
  name: string;
  cadence: string;
  usage: string;
  src: string;
  poster: string;
  delivery: string;
  savings: string;
  dimensions: string;
  fps: string;
};

type StageBackground = 'checker' | 'dark' | 'light' | 'coral' | 'green';

const LAB_STORAGE_KEY = 'habitgame.animationLab.enabled';

const ANIMATIONS: AnimationAsset[] = [
  {
    id: 'fireworks',
    name: 'Celebration fireworks',
    cadence: 'Frequent',
    usage: 'Wins, streaks, rewards and milestone moments',
    src: '/assets/animation-lab/fireworks.webm',
    poster: '/assets/animation-lab/fireworks-poster.png',
    delivery: '2.1 MB WebM',
    savings: '86% smaller than the 15 MB transparent test export',
    dimensions: '360 × 592',
    fps: '15 fps',
  },
  {
    id: 'egg',
    name: 'Crystal egg reveal',
    cadence: 'Occasional',
    usage: 'Hatches, mystery rewards and special discoveries',
    src: '/assets/animation-lab/crystal-egg.webm',
    poster: '/assets/animation-lab/crystal-egg-poster.png',
    delivery: '637 KB WebM',
    savings: '89% smaller than the 5.6 MB transparent test export',
    dimensions: '320 × 288',
    fps: '15 fps',
  },
];

const BACKGROUNDS: Array<{ id: StageBackground; label: string }> = [
  { id: 'checker', label: 'Transparency grid' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'coral', label: 'Coral' },
  { id: 'green', label: 'Green' },
];

export function AnimationLab() {
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [backgrounds, setBackgrounds] = useState<Record<string, StageBackground>>({
    fireworks: 'dark',
    egg: 'checker',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedByQuery = params.get('animationLab') === '1';
    const previouslyEnabled = window.localStorage.getItem(LAB_STORAGE_KEY) === '1';
    if (requestedByQuery || previouslyEnabled) {
      setEnabled(true);
    }
    if (requestedByQuery) {
      setOpen(true);
      window.localStorage.setItem(LAB_STORAGE_KEY, '1');
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(motionQuery.matches);
    updateMotionPreference();
    motionQuery.addEventListener('change', updateMotionPreference);

    const handleShortcut = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setEnabled(true);
        setOpen((current) => !current);
        window.localStorage.setItem(LAB_STORAGE_KEY, '1');
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => {
      motionQuery.removeEventListener('change', updateMotionPreference);
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || reducedMotion) return;
    ANIMATIONS.forEach(({ id }) => {
      void videoRefs.current[id]?.play().catch(() => undefined);
    });
  }, [open, reducedMotion]);

  const togglePlayback = (id: AnimationAsset['id']) => {
    const video = videoRefs.current[id];
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const restart = (id: AnimationAsset['id']) => {
    const video = videoRefs.current[id];
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  const setAllPlayback = (shouldPlay: boolean) => {
    ANIMATIONS.forEach(({ id }) => {
      const video = videoRefs.current[id];
      if (!video) return;
      if (shouldPlay) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  };

  const hideLauncher = () => {
    window.localStorage.removeItem(LAB_STORAGE_KEY);
    setOpen(false);
    setEnabled(false);
  };

  const launcher = enabled && !open ? (
    <button
      type="button"
      className="animation-lab-launcher"
      onClick={() => setOpen(true)}
      aria-label="Open animation lab"
      title="Animation lab · Alt + Shift + A"
    >
      ✦
    </button>
  ) : null;

  const modal = open ? (
    <div className="animation-lab-modal" role="dialog" aria-modal="true" aria-labelledby="animation-lab-title">
      <button
        type="button"
        className="animation-lab-modal__backdrop"
        onClick={() => setOpen(false)}
        aria-label="Close animation lab"
      />
      <section className="animation-lab-modal__panel">
        <header className="animation-lab-modal__header">
          <div>
            <p className="animation-lab-modal__eyebrow">Hidden test surface</p>
            <h2 id="animation-lab-title">Animation lab</h2>
            <p>Compare transparency, scale, colour contrast and repeat behaviour before wiring animations into rewards.</p>
          </div>
          <button type="button" className="animation-lab-modal__close" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
        </header>

        <div className="animation-lab-modal__toolbar" aria-label="Animation controls">
          <button type="button" onClick={() => setAllPlayback(true)}>Play all</button>
          <button type="button" onClick={() => setAllPlayback(false)}>Pause all</button>
          <span>Assets load only when this hidden lab opens.</span>
        </div>

        <div className="animation-lab-modal__table-wrap">
          <table className="animation-lab-table">
            <thead>
              <tr>
                <th scope="col">Preview</th>
                <th scope="col">Animation</th>
                <th scope="col">App delivery</th>
                <th scope="col">Test controls</th>
              </tr>
            </thead>
            <tbody>
              {ANIMATIONS.map((animation) => (
                <tr key={animation.id}>
                  <td className="animation-lab-table__preview-cell">
                    <div className={`animation-lab-stage animation-lab-stage--${backgrounds[animation.id]}`}>
                      <video
                        ref={(node) => { videoRefs.current[animation.id] = node; }}
                        poster={animation.poster}
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        onPlay={() => setPlaying((current) => ({ ...current, [animation.id]: true }))}
                        onPause={() => setPlaying((current) => ({ ...current, [animation.id]: false }))}
                      >
                        <source src={animation.src} type="video/webm" />
                      </video>
                    </div>
                  </td>
                  <td>
                    <span className={`animation-lab-table__cadence animation-lab-table__cadence--${animation.id}`}>
                      {animation.cadence}
                    </span>
                    <strong>{animation.name}</strong>
                    <p>{animation.usage}</p>
                  </td>
                  <td>
                    <strong>{animation.delivery}</strong>
                    <p>{animation.dimensions} · {animation.fps}</p>
                    <span className="animation-lab-table__savings">{animation.savings}</span>
                    <small>Transparent VP9 · muted · loopable · lazy entry</small>
                  </td>
                  <td>
                    <div className="animation-lab-table__buttons">
                      <button type="button" onClick={() => togglePlayback(animation.id)}>
                        {playing[animation.id] ? 'Pause' : 'Play'}
                      </button>
                      <button type="button" onClick={() => restart(animation.id)}>Restart</button>
                    </div>
                    <fieldset className="animation-lab-backgrounds">
                      <legend>Background</legend>
                      {BACKGROUNDS.map((background) => (
                        <button
                          key={background.id}
                          type="button"
                          className={`animation-lab-backgrounds__swatch animation-lab-backgrounds__swatch--${background.id}`}
                          aria-label={background.label}
                          aria-pressed={backgrounds[animation.id] === background.id}
                          title={background.label}
                          onClick={() => setBackgrounds((current) => ({ ...current, [animation.id]: background.id }))}
                        />
                      ))}
                    </fieldset>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="animation-lab-modal__footer">
          <p>Open with <code>?animationLab=1</code> or <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>.</p>
          <button type="button" onClick={hideLauncher}>Hide lab shortcut</button>
        </footer>
      </section>
    </div>
  ) : null;

  if (typeof document === 'undefined') return null;
  return createPortal(<>{launcher}{modal}</>, document.body);
}
