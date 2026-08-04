import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ArenaPerformance } from '../../../level-worlds/services/islandRunMinigameTypes';
import './arenaPuzzleShared.css';

export function useArenaPuzzleClock(options: {
  active: boolean;
  sessionSeconds: number | null;
  onExpire: () => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(options.sessionSeconds);
  const startedAtRef = useRef<number | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(options.onExpire);
  onExpireRef.current = options.onExpire;

  useEffect(() => {
    if (!options.active) {
      startedAtRef.current = null;
      return undefined;
    }
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const update = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
      setElapsedSeconds(elapsed);
      if (options.sessionSeconds !== null) {
        const remaining = Math.max(0, options.sessionSeconds - elapsed);
        setRemainingSeconds(remaining);
        if (remaining === 0 && !expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
      }
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [options.active, options.sessionSeconds]);

  return { elapsedSeconds, remainingSeconds };
}

export function ArenaPuzzleFrame(props: {
  icon: string;
  eyebrow: string;
  title: string;
  progress: string;
  remainingSeconds: number | null;
  onClose: () => void;
  message?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`arena-puzzle ${props.className ?? ''}`}>
      <div className="arena-puzzle__aurora" aria-hidden="true" />
      <header className="arena-puzzle__header">
        <button type="button" className="arena-puzzle__close" onClick={props.onClose} aria-label={`Close ${props.title}`}>×</button>
        <span className="arena-puzzle__crest" aria-hidden="true">{props.icon}</span>
        <div className="arena-puzzle__heading">
          <p>{props.eyebrow}</p>
          <h1>{props.title}</h1>
        </div>
        <div className="arena-puzzle__status">
          <strong>{props.progress}</strong>
          <small>{props.remainingSeconds === null ? 'Open play' : `${props.remainingSeconds}s`}</small>
        </div>
      </header>
      <div className="arena-puzzle__content">{props.children}</div>
      {props.message ? <p className="arena-puzzle__message" role="status">{props.message}</p> : null}
    </main>
  );
}

export function ArenaPuzzleResult(props: {
  icon: string;
  title: string;
  performance: ArenaPerformance;
  summary: string;
  detail: string;
  onContinue: () => void;
}) {
  return (
    <main className="arena-puzzle arena-puzzle--result">
      <div className="arena-puzzle__aurora" aria-hidden="true" />
      <div className="arena-puzzle-result__seal" aria-hidden="true">
        <span>{props.icon}</span>
        <i />
        <i />
        <i />
      </div>
      <p className="arena-puzzle-result__eyebrow">Arena report transmitted</p>
      <h1>{props.title}</h1>
      <div className="arena-puzzle-result__stars" aria-label={`${props.performance.stars} of 3 stars`}>
        {[1, 2, 3].map((star) => <span className={star <= props.performance.stars ? 'is-earned' : ''} key={star}>★</span>)}
      </div>
      <strong className="arena-puzzle-result__mastery">{props.performance.mastery}</strong>
      <span className="arena-puzzle-result__label">Arena mastery</span>
      <p className="arena-puzzle-result__summary">{props.summary}</p>
      <p className="arena-puzzle-result__detail">{props.detail}</p>
      <button type="button" className="arena-puzzle__primary" onClick={props.onContinue}>Add to event progress</button>
    </main>
  );
}
