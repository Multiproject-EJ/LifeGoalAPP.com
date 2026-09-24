import React from 'react';
import {
  TITAN_LENS_TARGET,
  type TitanAwakening,
  type TitanPuzzleInput,
} from '../services/island17Awakening';
import './TitanDiscoveryWorkbenches.css';

const INGREDIENT_NAMES = ['Bone', 'Ember', 'Mist'] as const;
const INGREDIENT_GLYPHS = ['◈', '✹', '≈'] as const;

export function titanLensDetent(x: number, y: number) {
  return (Math.round(Math.atan2(x, -y) / (Math.PI / 4)) + 4) % 8;
}

export function titanStarAlignment(lens: number) {
  const rawDistance = Math.abs(lens - TITAN_LENS_TARGET);
  const distance = Math.min(rawDistance, 8 - rawDistance);
  return Math.max(0, 7 - distance * 2);
}

export function TitanPotionWorkbench({ progress, busy, onInput, onBack }: {
  progress: TitanAwakening;
  busy: boolean;
  onInput: (input: TitanPuzzleInput) => void;
  onBack: () => void;
}) {
  const [cleanedMask, setCleanedMask] = React.useState(0);
  const allClean = cleanedMask === 0b111;
  const cleanedCount = [0, 1, 2].filter(index => cleanedMask & (1 << index)).length;
  const clean = (index: number) => setCleanedMask(mask => mask | (1 << index));
  return <div className="titan-workbench titan-potion-workbench">
    <div className="titan-workbench__bar"><button onClick={onBack}>← Whole vessel</button><span>THE STONE BOWL</span></div>
    <p>Three ash-filled carvings circle the rim. Brush them clean, then match the bottles to what the bowl asks for.</p>
    <div className="titan-potion-workbench__bowl" aria-label="Carved stone summoning bowl">
      <div className="titan-potion-workbench__rim">
        {[0, 1, 2].map(index => {
          const cleanNow = Boolean(cleanedMask & (1 << index));
          return <button key={index} className={cleanNow ? 'clean' : ''} aria-label={cleanNow ? `${INGREDIENT_NAMES[index]} carving, position ${index + 1}` : `Brush ash from carving ${index + 1}`}
            onClick={() => clean(index)}>
            <strong>{cleanNow ? INGREDIENT_GLYPHS[index] : '✦'}</strong>
            <span>{cleanNow ? `${index + 1}` : 'ash'}</span>
          </button>;
        })}
        <svg viewBox="0 0 280 96" aria-hidden="true"><path d="M38 48 H242"/><path d="M224 34 l18 14 -18 14"/></svg>
      </div>
      <div className="titan-potion-workbench__liquid" data-filled={progress.ingredients.length}>{progress.ingredients.length ? progress.ingredients.map(i => INGREDIENT_GLYPHS[i]).join(' ') : 'empty'}</div>
    </div>
    <p className="titan-workbench__observation" role="status">{allClean
      ? `The rim reads ${INGREDIENT_GLYPHS.join('  →  ')}. The same marks are cut into the bottle seals.`
      : `${3 - cleanedCount} carving${cleanedCount === 2 ? '' : 's'} still hidden by ash.`}</p>
    <div className="titan-potion-workbench__bottles" aria-label="Ingredient bottles">
      {[2, 0, 1].map(index => <button key={index} disabled={busy || !allClean} onClick={() => onInput({kind:'ingredient', index})} aria-label={`Pour ${INGREDIENT_NAMES[index]} bottle`}>
        <span className="seal">{INGREDIENT_GLYPHS[index]}</span><span className="bottle">{INGREDIENT_NAMES[index]}</span>
      </button>)}
    </div>
    <small>Touch each carving to clean it. The bowl remembers every correct pour.</small>
  </div>;
}

type LensDrag = { pointer: number; value: number };
const STARS = [[110,168],[109,110],[150,78],[198,96],[214,162],[168,146],[136,198]] as const;

export function TitanConstellationWorkbench({ progress, busy, onInput, onBack }: {
  progress: TitanAwakening;
  busy: boolean;
  onInput: (input: TitanPuzzleInput) => void;
  onBack: () => void;
}) {
  const [side, setSide] = React.useState<'front'|'back'>('front');
  const [traced, setTraced] = React.useState(false);
  const [drag, setDrag] = React.useState<LensDrag | null>(null);
  const svg = React.useRef<SVGSVGElement>(null);
  const value = drag?.value ?? progress.lens;
  const aligned = titanStarAlignment(value);
  const point = (event: React.PointerEvent) => {
    const matrix = svg.current?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : new DOMPoint();
  };
  const updateDrag = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const p = point(event);
    setDrag({...drag, value: titanLensDetent(p.x - 170, p.y - 148)});
  };
  const finishDrag = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!busy && drag.value !== progress.lens) onInput({kind:'lens', value:drag.value});
    setDrag(null);
  };
  const nudge = (event: React.KeyboardEvent) => {
    if (busy || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : -1;
    onInput({kind:'lens', value:(progress.lens + delta + 8) % 8});
  };
  return <div className="titan-workbench titan-constellation-workbench">
    <div className="titan-workbench__bar"><button onClick={onBack}>← Whole skull</button><span>THE CROWN DISK</span></div>
    <p>{side === 'back' ? 'A faint seven-star creature is scratched into the back plate.' : 'The star lens turns, but its intended shape is missing from this face.'}</p>
    <svg ref={svg} viewBox="0 0 340 292" className="titan-workbench__mechanism" aria-label={side === 'back' ? 'Back of the crown disk with a faint etched constellation' : 'Rotating seven-star crown lens'}
      onPointerMove={updateDrag} onPointerUp={finishDrag} onPointerCancel={() => setDrag(null)}>
      <path d="M54 43 Q170 13 286 43 L302 235 Q170 278 38 235 Z" fill="#263a38" stroke="#9b8964" strokeWidth="4"/>
      {side === 'back' ? <>
        <path className="titan-constellation-workbench__etch" d="M110 168 L109 110 L150 78 L198 96 L214 162 L168 146 L136 198 Z"/>
        {STARS.map(([x,y], index) => <circle key={index} cx={x} cy={y} r="5" fill={traced ? '#a8ffe1' : '#746f58'}/>)}
        <path d="M105 220 Q170 245 235 220" fill="none" stroke="#736b55" strokeWidth="3" strokeDasharray="4 7"/>
      </> : <>
        {traced && <path className="titan-constellation-workbench__memory" d="M110 168 L109 110 L150 78 L198 96 L214 162 L168 146 L136 198 Z"/>}
        <g role="slider" tabIndex={busy ? -1 : 0} aria-label="Rotate the crown star lens" aria-valuemin={0} aria-valuemax={7} aria-valuenow={value} aria-valuetext={`${aligned} of 7 stars aligned`} aria-disabled={busy}
          onPointerDown={event => {if (busy) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const p=point(event); setDrag({pointer:event.pointerId,value:titanLensDetent(p.x-170,p.y-148)});}} onKeyDown={nudge}
          transform={`rotate(${(value - TITAN_LENS_TARGET) * 45} 170 148)`}>
          <circle cx="170" cy="148" r="104" fill="#0a1d22" stroke="#bc9d62" strokeWidth="8"/>
          {STARS.map(([x,y], index) => <circle key={index} cx={x} cy={y} r="8" fill="#9cffe0" stroke="#edffd1" strokeWidth="2"/>)}
          <path d="M170 44 v18" stroke="#f2daa2" strokeWidth="5"/>
        </g>
        <circle cx="170" cy="148" r="18" fill={traced && aligned === 7 ? '#d8ffbd' : '#31504b'} stroke="#dfc98e" strokeWidth="3"/>
      </>}
    </svg>
    <p className="titan-workbench__observation" role="status">{side === 'back'
      ? traced ? 'The traced pattern warms in your hand. You can carry its outline back to the lens.' : 'Run a finger over the dim scratches to remember their shape.'
      : !traced ? 'There is no guide on this face. Turn the disk over and inspect its back.' : aligned === 7 ? 'All seven remembered stars overlap. The center begins to breathe.' : `${aligned} of 7 stars overlap the remembered shape.`}</p>
    {side === 'back' ? <>
      <button className="titan-puzzle__primary" onClick={() => setTraced(true)}>{traced ? 'Pattern remembered' : 'Trace the scratched constellation'}</button>
      <button onClick={() => setSide('front')}>Turn disk to the lens →</button>
    </> : <>
      <button onClick={() => setSide('back')}>← Turn disk over</button>
      <button className="titan-puzzle__primary" disabled={busy || !traced || value !== TITAN_LENS_TARGET} onClick={() => onInput({kind:'test'})}>{traced && value === TITAN_LENS_TARGET ? 'Touch the awakened center' : 'The center remains asleep'}</button>
    </>}
    <small>Drag around the circular lens, or focus it and use arrow keys.</small>
  </div>;
}
