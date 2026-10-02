import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { suggestedReminderTime } from '../../services/quickItemReminders';
import './CompactReminderPopover.css';

export type CompactReminderTarget = {
  kind: 'habit' | 'todo';
  id: string;
  label: string;
  time: string | null;
  todoDate?: string;
  anchor: { left: number; right: number; top: number; bottom: number; width: number };
};

type CompactReminderPopoverProps = {
  target: CompactReminderTarget;
  busy?: boolean;
  error?: string | null;
  status?: string | null;
  onClose: () => void;
  onSave: (time: string) => void;
  onClear: () => void;
};

function formatDateLabel(dateISO: string | undefined): string {
  if (!dateISO) return '';
  const date = new Date(`${dateISO}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return '';
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (dateISO === todayKey) return 'today';
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  if (dateISO === tomorrowKey) return 'tomorrow';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CompactReminderPopover({
  target,
  busy = false,
  error = null,
  status = null,
  onClose,
  onSave,
  onClear,
}: CompactReminderPopoverProps) {
  const titleId = useId();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [time, setTime] = useState(() => target.time || suggestedReminderTime(target.kind, target.todoDate));

  useEffect(() => {
    setTime(target.time || suggestedReminderTime(target.kind, target.todoDate));
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  }, [target.id, target.kind, target.time, target.todoDate]);

  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) onClose();
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', closeFromOutside, true);
    window.addEventListener('keydown', closeFromKeyboard);
    return () => {
      window.removeEventListener('pointerdown', closeFromOutside, true);
      window.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [onClose]);

  const position = useMemo(() => {
    const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 844 : window.innerHeight;
    const width = Math.min(350, viewportWidth - 24);
    const left = Math.max(12, Math.min(viewportWidth - width - 12, target.anchor.right - width));
    const estimatedHeight = 166;
    const below = target.anchor.bottom + 8;
    const top = below + estimatedHeight <= viewportHeight - 12
      ? below
      : Math.max(12, target.anchor.top - estimatedHeight - 8);
    return { width, left, top };
  }, [target.anchor]);

  const cadence = target.kind === 'habit'
    ? 'Scheduled days'
    : `Once ${formatDateLabel(target.todoDate)}`;

  return (
    <div
      ref={popoverRef}
      className="compact-reminder"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      style={{ width: position.width, left: position.left, top: position.top }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="compact-reminder__heading">
        <span className="compact-reminder__bell" aria-hidden="true">🔔</span>
        <span className="compact-reminder__copy">
          <strong id={titleId}>Remind me</strong>
          <small title={target.label}>{target.label}</small>
        </span>
        <span className="compact-reminder__cadence">{cadence}</span>
        <button type="button" className="compact-reminder__close" onClick={onClose} aria-label="Close reminder picker">×</button>
      </div>
      <form
        className="compact-reminder__form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(time);
        }}
      >
        <label className="compact-reminder__time">
          <span className="sr-only">Reminder time</span>
          <input
            ref={inputRef}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            required
            disabled={busy}
            aria-label="Reminder time"
          />
        </label>
        {target.time ? (
          <button type="button" className="compact-reminder__clear" onClick={onClear} disabled={busy}>Clear</button>
        ) : null}
        <button type="submit" className="compact-reminder__save" disabled={busy || !time}>
          {busy ? 'Saving…' : 'Set alert'}
        </button>
      </form>
      {error ? <p className="compact-reminder__message compact-reminder__message--error" role="alert">{error}</p> : null}
      {!error && status ? <p className="compact-reminder__message" role="status">{status}</p> : null}
    </div>
  );
}
