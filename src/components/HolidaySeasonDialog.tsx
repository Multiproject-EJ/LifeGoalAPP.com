import type { ActiveAdventMetaResult } from '../services/treatCalendarService';
import { getHolidayThemeAssets } from '../services/holidayThemeAssets';

type HolidaySeasonDialogProps = {
  activeHoliday: ActiveAdventMetaResult | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCalendar: () => void;
};

export function HolidaySeasonDialog({
  activeHoliday,
  isOpen,
  onClose,
  onOpenCalendar,
}: HolidaySeasonDialogProps) {
  if (!isOpen || !activeHoliday) return null;

  const { meta, daysRemaining } = activeHoliday;
  const { introBackgroundUrl } = getHolidayThemeAssets(meta.holiday_key);
  const backgroundStyle = introBackgroundUrl
    ? { backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.15), rgba(2, 6, 23, 0.78)), url(${introBackgroundUrl})` }
    : undefined;

  const countdownLabel =
    daysRemaining === 0
      ? `Today is ${meta.displayName}!`
      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until ${meta.displayName}.`;

  return (
    <div className="holiday-season-dialog" role="dialog" aria-modal="true" aria-label={`${meta.displayName} holiday season`}>
      <div className="holiday-season-dialog__backdrop" onClick={onClose} role="presentation" />
      <div className="holiday-season-dialog__panel" style={backgroundStyle}>
        <button
          type="button"
          className="holiday-season-dialog__close"
          aria-label="Close holiday season dialog"
          onClick={onClose}
        >
          ×
        </button>
        <div className="holiday-season-dialog__content">
          <p className="holiday-season-dialog__eyebrow">Holiday season is here</p>
          <h2 className="holiday-season-dialog__title">
            {meta.emojis[0]} {meta.theme_name}
          </h2>
          <p className="holiday-season-dialog__copy">
            {countdownLabel} Your seasonal countdown is now live, and today&apos;s holiday rewards are ready when you are.
          </p>
          <div className="holiday-season-dialog__actions">
            <button type="button" className="holiday-season-dialog__button holiday-season-dialog__button--primary" onClick={onOpenCalendar}>
              Open Countdown Calendar
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
