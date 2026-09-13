import { useCallback, useEffect, useRef, useState } from 'react';

export type FrostwellSequencePhase = 'ready' | 'arming' | 'spinning' | 'drilling' | 'commissioning' | 'complete';
type Receipt = { metersBefore: number; metersAfter: number; commissioned: boolean };
/** Presentation only. The action has committed before this timeline can play. */
export function useFrostwellMissionSequence(onCommission: () => void) {
  const [phase, setPhase] = useState<FrostwellSequencePhase>('ready');
  const [held, setHeld] = useState<{ meters: number; built: boolean } | null>(null);
  const generation = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const commission = useRef(onCommission);
  commission.current = onCommission;
  const cancel = useCallback(() => {
    generation.current += 1;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const settle = useCallback(() => { cancel(); setHeld(null); setPhase('ready'); }, [cancel]);
  useEffect(() => cancel, [cancel]);
  const prepare = useCallback((meters: number, built: boolean) => {
    cancel(); setHeld({ meters, built }); setPhase('arming'); return generation.current;
  }, [cancel]);
  const play = useCallback((token: number, receipt: Receipt) => {
    if (token !== generation.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setHeld(null); setPhase('complete'); return;
    }
    setPhase('spinning');
    const at = (ms: number, task: () => void) => timers.current.push(setTimeout(() => {
      if (token === generation.current) task();
    }, ms));
    at(1800, () => { setHeld({ meters: receipt.metersAfter, built: false }); setPhase('drilling'); });
    at(6000, () => {
      if (receipt.commissioned) {
        setHeld({ meters: receipt.metersAfter, built: true }); setPhase('commissioning'); commission.current();
      } else { setHeld(null); setPhase('complete'); }
    });
    if (receipt.commissioned) at(11500, () => { setHeld(null); setPhase('complete'); });
  }, []);
  return { phase, held, prepare, play, settle, isCurrent: (token: number) => token === generation.current };
}
