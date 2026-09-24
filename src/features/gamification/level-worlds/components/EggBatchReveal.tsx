import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CREATURE_CATALOG } from '../services/creatureCatalog';
import { resolveCreatureArtManifest } from '../services/creatureImageManifest';
import { getIslandRunAudioEnabled, playIslandRunHatchRevealSound } from '../services/islandRunAudio';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { CreatureHatchRevealModal } from './CreatureHatchRevealModal';
import { CreatureCard } from './CreatureCard';
import './EggBatchReveal.css';

// Original short filtered-noise brush; no sampled or third-party opening audio.
function playCardBrush() {
  if (!getIslandRunAudioEnabled() || typeof AudioContext === 'undefined') return;
  const context = new AudioContext();
  void context.resume().then(() => {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .16), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / data.length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass'; filter.frequency.value = 1800;
    gain.gain.value = .07;
    source.connect(filter).connect(gain).connect(context.destination);
    source.onended = () => { void context.close(); };
    source.start();
  }).catch(() => { void context.close(); });
}

/** Presentation-only receipts. Advancing, skipping or closing never grants anything. */
export function EggBatchReveal({ creatureIds, onClose }: { creatureIds: string[]; onClose: () => void }) {
  const [hatchIndex, setHatchIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const revealIdentity = useRef(`egg-batch:${Date.now()}:${Math.random()}`);
  const moving = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const nextButton = useRef<HTMLButtonElement>(null);
  const creatures = creatureIds.flatMap((id) => {
    const creature = CREATURE_CATALOG.find((entry) => entry.id === id);
    return creature ? [creature] : [];
  });
  const hatching = hatchIndex < creatures.length;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockPageScroll(['body', 'documentElement']);
    return () => { clearTimeout(timer.current); unlock(); previous?.focus(); };
  }, []);
  useEffect(() => { if (!hatching) nextButton.current?.focus(); }, [hatching]);
  useEffect(() => {
    if (hatching) playIslandRunHatchRevealSound(`${revealIdentity.current}:${hatchIndex}`);
  }, [hatching, hatchIndex]);

  const advance = () => {
    if (moving.current) return;
    moving.current = true;
    playCardBrush();
    setLeaving(true);
    timer.current = setTimeout(() => {
      if (cardIndex + 1 >= creatures.length) onClose();
      else setCardIndex((index) => index + 1);
      moving.current = false;
      setLeaving(false);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
  };

  if (!creatures.length) return null;
  if (hatching) {
    const creature = creatures[hatchIndex];
    const art = resolveCreatureArtManifest(creature);
    return <CreatureHatchRevealModal key={hatchIndex} open creatureId={creature.id}
      creatureName={creature.name} rarity={creature.tier} creatureScore={0}
      imageSrc={art.cutoutSrc} pngFallbackSrc={art.cutoutPngSrc} silhouetteSrc={art.silhouetteSrc}
      fallbackEmoji={art.emojiFallback} progressLabel={`Egg ${hatchIndex + 1} of ${creatures.length}`}
      continueLabel={hatchIndex + 1 < creatures.length ? 'Next egg' : 'Reveal card stack'}
      onClose={() => setHatchIndex((index) => index + 1)} />;
  }
  return createPortal(<div className="egg-card-stack" role="dialog" aria-modal="true" aria-label="Your hatched creature cards"
    onKeyDown={(event) => {
      if (event.key === 'ArrowUp') { event.preventDefault(); advance(); }
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') { event.preventDefault(); nextButton.current?.focus(); }
    }}>
    <p role="status">Card {cardIndex + 1} of {creatures.length} · All creatures saved to Sanctuary</p>
    <div className={`egg-card-stack__cards${leaving ? ' is-leaving' : ''}`}
      onPointerDown={(event) => { start.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerCancel={() => { start.current = null; }}
      onPointerUp={(event) => {
        const origin = start.current; start.current = null;
        if (origin && origin.y - event.clientY > 55 && origin.y - event.clientY > Math.abs(origin.x - event.clientX)) advance();
      }}>
      {cardIndex + 1 < creatures.length ? <div className="egg-card-stack__back" aria-hidden="true" /> : null}
      <div className="egg-card-stack__front" key={cardIndex}><CreatureCard creature={creatures[cardIndex]} owned foil="premium" /></div>
    </div>
    <p>Swipe up to reveal the next card</p>
    <button ref={nextButton} type="button" onClick={advance} disabled={leaving}>
      {cardIndex + 1 === creatures.length ? 'Done' : 'Next card ↑'}
    </button>
  </div>, document.body);
}
