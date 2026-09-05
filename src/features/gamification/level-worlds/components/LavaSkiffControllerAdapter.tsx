import { useEffect, useRef, type PointerEvent } from 'react';

export interface LavaSkiffControllerState {
  steering: -1 | 0 | 1;
  throttle: 0 | 1;
}

interface LavaSkiffControllerAdapterProps {
  disabled?: boolean;
  onChange: (state: LavaSkiffControllerState) => void;
}

export function LavaSkiffControllerAdapter({ disabled = false, onChange }: LavaSkiffControllerAdapterProps) {
  const stateRef = useRef<LavaSkiffControllerState>({ steering: 0, throttle: 0 });
  const heldRef = useRef({ left: false, right: false, forward: false });

  const publish = () => {
    const steering: -1 | 0 | 1 = heldRef.current.left === heldRef.current.right
      ? 0
      : heldRef.current.left ? -1 : 1;
    const next: LavaSkiffControllerState = { steering, throttle: heldRef.current.forward ? 1 : 0 };
    if (next.steering === stateRef.current.steering && next.throttle === stateRef.current.throttle) return;
    stateRef.current = next;
    onChange(next);
  };

  const setHeld = (control: 'left' | 'right' | 'forward', held: boolean) => {
    if (disabled && held) return;
    heldRef.current[control] = held;
    publish();
  };

  useEffect(() => {
    const keyControl = (key: string): 'left' | 'right' | 'forward' | null => {
      if (key === 'ArrowLeft' || key.toLowerCase() === 'a') return 'left';
      if (key === 'ArrowRight' || key.toLowerCase() === 'd') return 'right';
      if (key === 'ArrowUp' || key === ' ' || key.toLowerCase() === 'w') return 'forward';
      return null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const control = keyControl(event.key);
      if (!control || event.repeat) return;
      event.preventDefault();
      setHeld(control, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const control = keyControl(event.key);
      if (!control) return;
      event.preventDefault();
      setHeld(control, false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      heldRef.current = { left: false, right: false, forward: false };
      if (stateRef.current.steering !== 0 || stateRef.current.throttle !== 0) onChange({ steering: 0, throttle: 0 });
    };
  }, [disabled, onChange]);

  useEffect(() => {
    if (!disabled) return;
    heldRef.current = { left: false, right: false, forward: false };
    publish();
  }, [disabled]);

  const holdProps = (control: 'left' | 'right' | 'forward') => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeld(control, true);
    },
    onPointerUp: () => setHeld(control, false),
    onPointerCancel: () => setHeld(control, false),
    onPointerLeave: () => setHeld(control, false),
  });

  return (
    <div className="island-run-skiff-controller" role="group" aria-label="Iron Skiff lava labyrinth controls">
      <div className="island-run-skiff-controller__status" aria-live="polite">
        <strong>ESCAPE RUN</strong>
        <span>Steer the glowing channel · hold forward for speed</span>
      </div>
      <button type="button" className="island-run-skiff-controller__paddle" {...holdProps('left')} disabled={disabled} aria-label="Steer Iron Skiff left">
        <span aria-hidden="true">◀</span> LEFT
      </button>
      <button type="button" className="island-run-skiff-controller__throttle" {...holdProps('forward')} disabled={disabled} aria-label="Hold to accelerate Iron Skiff forward">
        <span className="island-run-skiff-controller__stick" aria-hidden="true">▲</span>
        <span>HOLD FORWARD</span>
      </button>
      <button type="button" className="island-run-skiff-controller__paddle" {...holdProps('right')} disabled={disabled} aria-label="Steer Iron Skiff right">
        RIGHT <span aria-hidden="true">▶</span>
      </button>
    </div>
  );
}
