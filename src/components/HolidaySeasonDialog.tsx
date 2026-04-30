import type { ActiveAdventMetaResult } from '../services/treatCalendarService';
import { getHolidayGreetingLabel } from '../services/treatCalendarService';
import { getHolidayThemeAssets } from '../services/holidayThemeAssets';

type HolidaySeasonDialogProps = {
  activeHoliday: ActiveAdventMetaResult | null;
  isOpen: boolean;
  isPreview?: boolean;
  onClose: () => void;
  onOpenCalendar: () => void;
};

export function HolidaySeasonDialog({
  activeHoliday,
  isOpen,
  isPreview = false,
  onClose,
  onOpenCalendar,
}: HolidaySeasonDialogProps) {
  if (!isOpen || !activeHoliday) return null;

  const { meta, daysRemaining } = activeHoliday;
  const greetingLabel = getHolidayGreetingLabel(meta, new Date(), { isPreview });
  const { introBackgroundUrl } = getHolidayThemeAssets(meta.holiday_key);

  const countdownLabel =
    isPreview
      ? `Developer preview for ${meta.displayName}.`
      : daysRemaining === 0
      ? `Today is ${greetingLabel}!`
      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until ${greetingLabel}.`;

  return (
    <div className="holiday-season-dialog" role="dialog" aria-modal="true" aria-label={`${meta.displayName} holiday season`}>
      <div className="holiday-season-dialog__backdrop" onClick={onClose} role="presentation" />
      <div className="holiday-season-dialog__panel">
        <button
          type="button"
          className="holiday-season-dialog__close"
          aria-label="Close holiday season dialog"
          onClick={onClose}
        >
          ×
        </button>
        {introBackgroundUrl && (
          <img
            className="holiday-season-dialog__hero"
            src={introBackgroundUrl}
            alt={`${meta.displayName} holiday season`}
          />
        )}
        <div className="holiday-season-dialog__content">
          <h2 className="holiday-season-dialog__title">
            {meta.emojis[0]} {meta.theme_name}
          </h2>
          <p className="holiday-season-dialog__copy">{countdownLabel}</p>
          <div className="holiday-season-dialog__actions">
            <button type="button" className="holiday-season-dialog__button holiday-season-dialog__button--primary" onClick={onOpenCalendar}>
              Open {meta.displayName} Calendar →
            </button>
            <button type="button" className="holiday-season-dialog__button holiday-season-dialog__button--secondary" onClick={onClose}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
