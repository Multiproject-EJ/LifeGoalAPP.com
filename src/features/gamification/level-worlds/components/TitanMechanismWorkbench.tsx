import React from 'react';
import { TITAN_EYE_TARGET, TITAN_TEETH_TARGET, type TitanAwakening, type TitanPuzzleInput } from '../services/island17Awakening';

/** Presentation geometry shared by pointer mapping, engraving and feedback. */
export function titanEyeDetent(x: number, y: number) {
  return (Math.round(Math.atan2(x, -y) / (Math.PI / 2)) + 4) % 4;
}
export function titanToothDetent(start: number, deltaY: number) {
  return Math.max(0, Math.min(2, start - Math.round(deltaY / 28)));
}
export function titanToothTrackDetent(y: number) {
  return y < 111 ? 2 : y < 181 ? 1 : 0;
}
export function titanChannelReach(teeth: number[]) {
  let connected = 0;
  while (connected < 3 && teeth[connected] === TITAN_TEETH_TARGET[connected]) connected++;
  return connected;
}
type Drag = { kind: 'eye' | 'tooth' | 'jaw'; index: number; start: number; y: number; value: number; pointer: number };
export function TitanMechanismWorkbench({ progress, busy, onInput, onBack }: {
  progress: TitanAwakening; busy: boolean; onInput: (input: TitanPuzzleInput) => void; onBack: () => void;
}) {
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [observation, setObservation] = React.useState('');
  const svg = React.useRef<SVGSVGElement>(null);
  const eyes = progress.eyes.map((v, i) => drag?.kind === 'eye' && drag.index === i ? drag.value : v);
  const teeth = progress.teeth.map((v, i) => drag?.kind === 'tooth' && drag.index === i ? drag.value : v);
  const eyesReady = eyes.every((v, i) => v === TITAN_EYE_TARGET[i]);
  const reach = titanChannelReach(teeth);
  const point = (event: React.PointerEvent) => {
    const matrix = svg.current?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : new DOMPoint();
  };
  const start = (event: React.PointerEvent<SVGGElement>, kind: Drag['kind'], index = 0) => {
    if (busy || drag || event.button !== 0) return;
    setObservation('');
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    const value = kind === 'eye' ? titanEyeDetent(p.x - (index === 0 ? 90 : 250), p.y - 112)
      : kind === 'tooth' ? titanToothTrackDetent(p.y) : 0;
    const startValue = kind === 'eye' ? progress.eyes[index] : kind === 'tooth' ? progress.teeth[index] : 0;
    setDrag({ kind, index, start: startValue, value, y: p.y, pointer: event.pointerId });
  };
  const move = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const p = point(event);
    const value = drag.kind === 'eye' ? titanEyeDetent(p.x - (drag.index === 0 ? 90 : 250), p.y - 112)
      : drag.kind === 'tooth' ? titanToothDetent(drag.start, p.y - drag.y) : Math.max(0, Math.min(35, p.y - drag.y));
    setDrag({ ...drag, value });
  };
  const pull = () => {
    if (busy) return;
    if (progress.eyes.every((v, i) => v === TITAN_EYE_TARGET[i])) onInput({ kind: 'test' });
    else setObservation('The jaw catches on two pins. Each pin connects to an empty sun-shaped receiver beside an eye.');
  };
  const finish = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!busy) {
      if (drag.kind === 'jaw') { if (drag.value >= 18 || eyesReady) pull(); else setObservation('Hook your finger under the brass lip and pull down.'); }
      else if (drag.value !== drag.start) onInput({ kind: drag.kind, index: drag.index, value: drag.value });
      else setObservation(drag.kind === 'eye' ? 'The brass ring turns. Drag its bright mark around the socket; watch where its beam lands.' : 'This tooth slides vertically in a worn track. Its groove is part of the channel.');
    }
    setDrag(null);
  };
  const key = (event: React.KeyboardEvent, kind: 'eye' | 'tooth', index: number) => {
    if (busy || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); setObservation('');
    const delta = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1;
    const value = kind === 'eye' ? (progress.eyes[index] + delta + 4) % 4 : Math.max(0, Math.min(2, progress.teeth[index] + delta));
    onInput({ kind, index, value });
  };
  const teethView = progress.phase === 3;
  return <div className="titan-workbench">
    <div className="titan-workbench__bar"><button onClick={onBack}>← Whole skull</button><span>{teethView ? 'INSIDE THE JAW' : 'INSIDE THE SOCKETS'}</span></div>
    <p>{teethView ? 'A glowing inlet. A dark outlet. Three loose teeth between them.' : 'Two beams, two sun-shaped receivers, and a latch beneath them.'}</p>
    <svg ref={svg} viewBox="0 0 340 292" className="titan-workbench__mechanism" aria-label={teethView ? 'Sliding tooth channel inside the jaw' : 'Rotating eye mechanisms inside the skull'}
      onPointerMove={move} onPointerUp={finish} onPointerCancel={() => setDrag(null)} onLostPointerCapture={() => setDrag(null)}>
      <path d="M30 45 Q170 5 310 45 L322 220 Q170 290 18 220 Z" fill="#233b3b" stroke="#8b8264" strokeWidth="3"/>
      {teethView ? <>
        <path d="M30 162 H310" stroke="#050f14" strokeWidth="18"/>
        <path d={`M30 162 H${58 + reach * 76}`} stroke="#9cffe0" strokeWidth="7"/>
        <circle cx="30" cy="162" r="12" fill="#9cffe0"/><circle cx="310" cy="162" r="12" fill={reach === 3 ? '#9cffe0' : '#172629'} stroke="#dfcd97" strokeWidth="3"/>
        {teeth.map((value, i) => {
          const x = 58 + i * 76, y = 100 - value * 28, groove = 162 + (TITAN_TEETH_TARGET[i] - value) * 28;
          return <g key={i} role="slider" tabIndex={busy ? -1 : 0} aria-label={`${['Left','Middle','Right'][i]} tooth`} aria-valuemin={0} aria-valuemax={2} aria-valuenow={value} aria-valuetext={value === TITAN_TEETH_TARGET[i] ? 'Groove level with inlet' : 'Groove above or below inlet'} aria-orientation="vertical" aria-disabled={busy}
            onPointerDown={event => start(event, 'tooth', i)} onKeyDown={event => key(event, 'tooth', i)}>
            <rect x={x} y="42" width="72" height="207" rx="12" fill="#0c2025" stroke="#63796c"/>
            <rect x={x + 5} y={y} width="62" height="139" rx="13" fill="#c6ba92" stroke="#f0dfad" strokeWidth="2"/>
            <path d={`M${x + 11} ${y + 15} h50 M${x + 11} ${y + 21} h50`} stroke="#847653" strokeWidth="2"/>
            <path d={`M${x} ${groove} h72`} stroke="#485643" strokeWidth="13"/>
            <path d={`M${x} ${groove} h72`} stroke={i < reach ? '#a0ffdb' : '#ede0b3'} strokeWidth="5"/>
          </g>;
        })}
      </> : <>
        {[0,1].map(i => {
          const cx = i === 0 ? 90 : 250, matched = eyes[i] === TITAN_EYE_TARGET[i], receiverX = i === 0 ? 150 : 190;
          return <React.Fragment key={i}>
            <path d={`M${receiverX} 112 V192 H170 V223`} fill="none" stroke={matched ? '#9cffe0' : '#607066'} strokeWidth="4"/>
            <g role="slider" tabIndex={busy ? -1 : 0} aria-label={`Rotate ${i === 0 ? 'left' : 'right'} eye ring`} aria-valuemin={0} aria-valuemax={3} aria-valuenow={eyes[i]} aria-valuetext={['Beam up','Beam right','Beam down','Beam left'][eyes[i]]} aria-disabled={busy}
              onPointerDown={event => start(event, 'eye', i)} onKeyDown={event => key(event, 'eye', i)}>
              <circle cx={cx} cy="112" r="56" fill="#0a1a20" stroke="#bba16b" strokeWidth="6"/>
              {[0,1,2,3].map(v => <path key={v} d={`M${cx} 62 v8`} transform={`rotate(${v * 90} ${cx} 112)`} stroke="#c7ba8a" strokeWidth="4"/>)}
              <g transform={`rotate(${eyes[i] * 90} ${cx} 112)`}>
                <path d={`M${cx} 112 V53`} stroke="#73f5d4" strokeWidth="5"/>
                <circle cx={cx} cy="72" r="10" fill="#e7d197" stroke="#fff0c2" strokeWidth="2"/>
              </g>
              <circle cx={cx} cy="112" r="14" fill="#a2ffe5"/>
            </g>
            <g role="button" tabIndex={0} aria-label={`Inspect ${i === 0 ? 'left' : 'right'} sun receiver`} onClick={() => setObservation('A sun is carved into this receiver. A narrow channel runs from it to one of the jaw’s locking pins. The eye’s beam fits its opening.')} onKeyDown={e => {if(e.key === 'Enter' || e.key === ' '){e.preventDefault();setObservation('The sun-shaped receiver connects the eye beam to a jaw locking pin.');}}}>
              <circle cx={receiverX} cy="112" r="19" fill="transparent"/>
              <path d={`M${receiverX} 99 v26 M${receiverX - 13} 112 h26 M${receiverX - 9} 103 l18 18 M${receiverX + 9} 103 l-18 18`} stroke={matched ? '#baffdf' : '#d9bd7b'} strokeWidth="2"/>
              <circle cx={receiverX} cy="112" r="7" fill={matched ? '#baffdf' : '#182a2c'} stroke="#e4cb8c" strokeWidth="2"/>
            </g>
          </React.Fragment>;
        })}
        <g role="button" tabIndex={busy ? -1 : 0} aria-label="Pull the jaw down" aria-disabled={busy} onPointerDown={event => start(event, 'jaw')} onKeyDown={e => {if(e.key === 'Enter' || e.key === ' '){e.preventDefault();pull();}}} transform={`translate(0 ${eyesReady && drag?.kind === 'jaw' ? drag.value : 0})`}>
          <path d="M104 222 Q170 248 236 222 L232 244 Q170 267 108 244 Z" fill={eyesReady ? '#b4ddbe' : '#bda16e'} stroke="#efdbac" strokeWidth="3"/>
          <path d="M148 228 H192" stroke="#33443b" strokeWidth="4"/>
          <path d="M170 250 v16 m-6 -6 l6 6 6 -6" fill="none" stroke="#f7e6bd" strokeWidth="2"/>
        </g>
      </>}
    </svg>
    <p className="titan-workbench__observation" role="status">{observation || (teethView ? reach === 3 ? 'The light reaches the outlet. A latch clicks free above the jaw.' : 'Drag a tooth up or down. Light travels only as far as the connected grooves.' : eyesReady ? 'Both pins have withdrawn. The jaw is loose—pull the brass lip down.' : 'Drag the brass marks around the eyes. Tap a carving to inspect it.')}</p>
    {teethView && <button disabled={busy || reach !== 3} className="titan-puzzle__primary" onClick={() => onInput({kind:'test'})}>{reach === 3 ? 'Lift the released crown latch' : 'Crown latch held by the broken channel'}</button>}
    <small>Tap a ring position or tooth level, or drag it. Keyboard: focus a mechanism and use arrow keys.</small>
  </div>;
}
