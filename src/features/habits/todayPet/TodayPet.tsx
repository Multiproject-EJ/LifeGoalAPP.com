import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCreatureById } from '../../gamification/level-worlds/services/creatureCatalog';
import { resolveCreatureArtManifest } from '../../gamification/level-worlds/services/creatureImageManifest';
import {
  planTodayPetAction,
  todayPetBubbles,
  TODAY_PET_SIZE_PX,
  type TodayPetAction,
  type TodayPetBubble,
  type TodayPetCompanion,
} from './todayPetBehaviour';
import './today-pet.css';

type Props = {
  companion: TodayPetCompanion;
  fedToday: boolean;
  feeding: boolean;
  onFeed: () => void;
  onPair: (creatureId: string) => void;
};

type Mood = 'walk' | 'idle' | 'sleep' | 'play' | 'away' | 'happy' | 'eat' | 'chase';

/**
 * A small living pet on the Today screen. Walks, idles, naps, plays, wanders
 * off and returns. Tap it for three bubbles: Feed (daily dice) or Make my pet,
 * Pet (hearts) and Play (it chases a ball).
 */
export function TodayPet({ companion, fedToday, feeding, onFeed, onPair }: Props) {
  const creature = getCreatureById(companion.creatureId);
  const art = creature ? resolveCreatureArtManifest(creature) : null;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [x, setX] = useState(0.7);
  const [mood, setMood] = useState<Mood>('idle');
  const [walkMs, setWalkMs] = useState(0);
  const [facing, setFacing] = useState<1 | -1>(-1);
  const [bubbles, setBubbles] = useState(false);
  const [effect, setEffect] = useState<{ id: number; kind: 'hearts' | 'dice' | 'pair' } | null>(null);
  const [ball, setBall] = useState<{ id: number; x: number } | null>(null);
  // webp cutout → png cutout → emoji fallback.
  const [artStep, setArtStep] = useState(0);
  const xRef = useRef(x);
  xRef.current = x;
  const timer = useRef(0);
  const busy = useRef(false);

  const schedule = useCallback((ms: number, fn: () => void) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  }, []);

  const runNext = useCallback(() => {
    if (busy.current) return;
    const action: TodayPetAction = planTodayPetAction(xRef.current, Math.random, reduced);
    if (action.kind === 'walk') {
      setFacing(action.toX < xRef.current ? -1 : 1);
      setWalkMs(action.ms); setMood('walk'); setX(action.toX);
      schedule(action.ms, () => { setMood('idle'); schedule(400, runNext); });
    } else if (action.kind === 'away') {
      const target = action.side === 'left' ? -0.2 : 1.2;
      const outMs = Math.abs(target - xRef.current) / 0.16 * 1000;
      setFacing(action.side === 'left' ? -1 : 1);
      setWalkMs(outMs); setMood('walk'); setX(target);
      schedule(outMs, () => {
        setMood('away');
        schedule(action.ms, () => {
          // Comes back in from the side it left.
          const back = action.side === 'left' ? 0.18 : 0.82;
          setFacing(action.side === 'left' ? 1 : -1);
          setWalkMs(2_400); setMood('walk'); setX(back);
          schedule(2_400, () => { setMood('happy'); schedule(900, runNext); });
        });
      });
    } else {
      setMood(action.kind);
      schedule(action.ms, runNext);
    }
  }, [reduced, schedule]);

  useEffect(() => {
    schedule(1_200, runNext);
    return () => window.clearTimeout(timer.current);
  }, [runNext, schedule]);

  const react = (nextMood: Mood, ms: number, fx?: 'hearts' | 'dice' | 'pair') => {
    busy.current = true;
    window.clearTimeout(timer.current);
    setBubbles(false); setMood(nextMood);
    if (fx) setEffect({ id: Date.now(), kind: fx });
    timer.current = window.setTimeout(() => { busy.current = false; setMood('idle'); schedule(700, runNext); }, ms);
  };

  const choose = (bubble: TodayPetBubble) => {
    if (bubble === 'feed') {
      if (fedToday || feeding) { react('happy', 900); return; }
      onFeed();
      react('eat', 2_200, 'dice');
    } else if (bubble === 'pair') {
      onPair(companion.creatureId);
      react('happy', 1_600, 'pair');
    } else if (bubble === 'pet') {
      react('happy', 1_800, 'hearts');
    } else {
      busy.current = true;
      window.clearTimeout(timer.current);
      setBubbles(false);
      const target = xRef.current > 0.5 ? 0.12 + Math.random() * 0.3 : 0.58 + Math.random() * 0.3;
      setBall({ id: Date.now(), x: target });
      setFacing(target < xRef.current ? -1 : 1);
      timer.current = window.setTimeout(() => {
        const ms = Math.max(500, Math.abs(target - xRef.current) / 0.32 * 1000);
        setWalkMs(ms); setMood('chase'); setX(target);
        timer.current = window.setTimeout(() => {
          setBall(null); setMood('happy');
          timer.current = window.setTimeout(() => { busy.current = false; setMood('idle'); schedule(600, runNext); }, 1_100);
        }, ms);
      }, 550);
    }
  };

  useEffect(() => {
    if (!bubbles) return undefined;
    const close = window.setTimeout(() => setBubbles(false), 5_000);
    return () => window.clearTimeout(close);
  }, [bubbles]);

  if (!creature || !art || typeof document === 'undefined') return null;
  const name = creature.name;
  return createPortal(
    <div className="today-pet-yard" aria-live="polite">
      {ball ? <span key={ball.id} className="today-pet__ball" style={{ left: `${ball.x * 100}%` }} aria-hidden="true" /> : null}
      <div
        className={`today-pet today-pet--${mood}`}
        style={{ left: `${x * 100}%`, transitionDuration: `${mood === 'walk' || mood === 'chase' ? walkMs : 0}ms`, ['--pet-size' as string]: `${TODAY_PET_SIZE_PX}px` }}
      >
        {bubbles ? (
          <div className={`today-pet__bubbles${x < 0.3 ? ' today-pet__bubbles--from-left' : x > 0.7 ? ' today-pet__bubbles--from-right' : ''}`} role="menu" aria-label={`${name}`}>
            {todayPetBubbles(companion.paired).map((bubble) => (
              <button key={bubble} type="button" role="menuitem" className={`today-pet__bubble today-pet__bubble--${bubble}`}
                disabled={bubble === 'feed' && feeding}
                onClick={(event) => { event.stopPropagation(); choose(bubble); }}>
                <span aria-hidden="true">{bubble === 'feed' ? (fedToday ? '✓' : '🍖') : bubble === 'pair' ? '⭐' : bubble === 'pet' ? '❤️' : '🎾'}</span>
                <small>{bubble === 'feed' ? (fedToday ? 'Fed today' : 'Feed · +15 🎲') : bubble === 'pair' ? 'Make my pet' : bubble === 'pet' ? 'Pet' : 'Play'}</small>
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="today-pet__body"
          aria-label={`${name}, your ${companion.paired ? 'pet' : 'creature'}. Tap to interact.`}
          onClick={() => setBubbles((open) => !open)}
        >
          <span className="today-pet__shadow" aria-hidden="true" />
          {artStep < 2 ? (
            <img
              src={artStep === 0 ? art.cutoutSrc : art.cutoutPngSrc}
              alt=""
              draggable={false}
              style={{ transform: `scaleX(${facing === 1 ? -1 : 1})` }}
              onError={() => setArtStep((step) => step + 1)}
            />
          ) : (
            <span className="today-pet__emoji" aria-hidden="true">{art.emojiFallback}</span>
          )}
          {mood === 'sleep' ? <span className="today-pet__zzz" aria-hidden="true">z<i>z</i><b>z</b></span> : null}
        </button>
        {effect ? (
          <span key={effect.id} className={`today-pet__fx today-pet__fx--${effect.kind}`} aria-hidden="true">
            {effect.kind === 'hearts' ? '❤️ 💕 ❤️' : effect.kind === 'dice' ? '+15 🎲' : '⭐ Paired!'}
          </span>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
