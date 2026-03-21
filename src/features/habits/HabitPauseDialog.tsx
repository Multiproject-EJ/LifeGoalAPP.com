import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './HabitPauseDialog.css';

export type PausePreset = {
  id: string;
  label: string;
  description: string;
  computeResumeOn: () => string | null;
};

type HabitPauseDialogProps = {
  open: boolean;
  habitTitle: string;
  initialReason?: string;
  initialResumeOn?: string;
  confirmLabel?: string;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (options: { reason?: string; resumeOn?: string | null }) => Promise<void> | void;
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, amount: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(base: Date, amount: number): Date {
  const next = new Date(base);
  next.setMonth(next.getMonth() + amount);
  return next;
}

const PAUSE_PRESETS: PausePreset[] = [
  {
    id: '3d',
    label: '3 days',
    description: 'Quick short break',
    computeResumeOn: () => formatLocalDate(addDays(new Date(), 3)),
  },
  {
    id: '1w',
    label: '1 week',
    description: 'Back next week',
    computeResumeOn: () => formatLocalDate(addDays(new Date(), 7)),
  },
  {
    id: '2w',
    label: '2 weeks',
    description: 'Useful for travel',
    computeResumeOn: () => formatLocalDate(addDays(new Date(), 14)),
  },
  {
    id: '1m',
    label: '1 month',
    description: 'Longer reset',
    computeResumeOn: () => formatLocalDate(addMonths(new Date(), 1)),
  },
  {
    id: 'custom',
    label: 'Pick a date',
    description: 'Choose exact return date',
    computeResumeOn: () => null,
  },
  {
    id: 'indefinite',
    label: 'Indefinitely',
    description: 'Until resumed manually',
    computeResumeOn: () => null,
  },
];

function getPresetIdForResumeOn(resumeOn?: string): string {
  if (!resumeOn) {
    return 'indefinite';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(resumeOn);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 3) return '3d';
  if (diffDays === 7) return '1w';
  if (diffDays === 14) return '2w';
  if (diffDays >= 28 && diffDays <= 31) return '1m';
  return 'custom';
}

export function HabitPauseDialog({
  open,
  habitTitle,
  initialReason = '',
  initialResumeOn = '',
  confirmLabel = 'Pause habit',
  saving = false,
  onClose,
  onConfirm,
}: HabitPauseDialogProps) {
  const [reason, setReason] = useState(initialReason);
  const [selectedPreset, setSelectedPreset] = useState(getPresetIdForResumeOn(initialResumeOn || undefined));
  const [customResumeOn, setCustomResumeOn] = useState(initialResumeOn);

  useEffect(() => {
    if (!open) return;
    setReason(initialReason);
    setCustomResumeOn(initialResumeOn);
    setSelectedPreset(getPresetIdForResumeOn(initialResumeOn || undefined));
  }, [open, initialReason, initialResumeOn]);

  const minDate = useMemo(() => formatLocalDate(new Date()), []);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const selectedResumeOn =
    selectedPreset === 'indefinite'
      ? null
      : selectedPreset === 'custom'
        ? customResumeOn || null
        : PAUSE_PRESETS.find((preset) => preset.id === selectedPreset)?.computeResumeOn() ?? null;

  return createPortal(
    <div className="habit-pause-dialog__overlay" onClick={saving ? undefined : onClose}>
      <div
        className="habit-pause-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-pause-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="habit-pause-dialog__handle" aria-hidden="true" />
        <div className="habit-pause-dialog__header">
          <div>
            <h3 id="habit-pause-dialog-title" className="habit-pause-dialog__title">Pause habit</h3>
            <p className="habit-pause-dialog__subtitle">
              Pause <strong>{habitTitle}</strong> and let it return automatically on the date you choose.
            </p>
          </div>
          <button
            type="button"
            className="habit-pause-dialog__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close pause dialog"
          >
            ✕
          </button>
        </div>

        <div className="habit-pause-dialog__callout">
          Choose a quick return window for fast mobile use, or pause indefinitely until you manually resume it from Habits.
        </div>

        <div className="habit-pause-dialog__preset-grid">
          {PAUSE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`habit-pause-dialog__preset${selectedPreset === preset.id ? ' habit-pause-dialog__preset--active' : ''}`}
              onClick={() => setSelectedPreset(preset.id)}
              disabled={saving}
            >
              <span className="habit-pause-dialog__preset-label">{preset.label}</span>
              <span className="habit-pause-dialog__preset-description">{preset.description}</span>
            </button>
          ))}
        </div>

        {selectedPreset === 'custom' ? (
          <label className="habit-pause-dialog__field">
            <span className="habit-pause-dialog__label">Resume date</span>
            <input
              type="date"
              value={customResumeOn}
              min={minDate}
              onChange={(event) => setCustomResumeOn(event.target.value)}
              className="habit-pause-dialog__input"
              disabled={saving}
            />
          </label>
        ) : null}

        <label className="habit-pause-dialog__field">
          <span className="habit-pause-dialog__label">Reason (optional)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Helpful note for future you"
            className="habit-pause-dialog__textarea"
            disabled={saving}
          />
        </label>

        <div className="habit-pause-dialog__summary">
          {selectedResumeOn
            ? `This habit will auto-resume on ${new Date(`${selectedResumeOn}T00:00:00`).toLocaleDateString()}.`
            : 'This habit will stay paused until you resume it manually from the Habits tab.'}
        </div>

        <div className="habit-pause-dialog__actions">
          <button type="button" className="habit-pause-dialog__secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="habit-pause-dialog__primary"
            onClick={() => void onConfirm({ reason: reason.trim() || undefined, resumeOn: selectedResumeOn })}
            disabled={saving || (selectedPreset === 'custom' && !customResumeOn)}
          >
            {saving ? 'Pausing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
