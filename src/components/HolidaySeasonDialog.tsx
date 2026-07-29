import type { CSSProperties } from 'react';
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
  const themeAssets = getHolidayThemeAssets(meta.holiday_key);
  const panelStyle = {
    '--holiday-primary': themeAssets.accentColor,
    '--holiday-secondary': themeAssets.secondaryColor,
    '--holiday-art': themeAssets.introBackgroundUrl
      ? `url("${themeAssets.introBackgroundUrl}")`
      : 'none',
  } as CSSProperties;

  const countdownLabel =
    isPreview
      ? `Developer preview for ${meta.displayName}.`
      : daysRemaining === 0
      ? `Today is ${greetingLabel}!`
      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until ${greetingLabel}.`;

  return (
    <div className="holiday-season-dialog" role="dialog" aria-modal="true" aria-label={`${meta.displayName} holiday season`}>
      <div className="holiday-season-dialog__backdrop" onClick={onClose} role="presentation" />
      <div
        className="holiday-season-dialog__panel"
        data-holiday={meta.holiday_key}
        style={panelStyle}
      >
        <button
          type="button"
          className="holiday-season-dialog__close"
          aria-label="Close holiday season dialog"
          onClick={onClose}
        >
          ×
        </button>
        <div className="holiday-season-dialog__hero" aria-hidden="true">
          <img
            className="holiday-season-dialog__medallion"
            src={themeAssets.medallionUrl}
            alt=""
          />
          <span className="holiday-season-dialog__sparkle holiday-season-dialog__sparkle--one">✦</span>
          <span className="holiday-season-dialog__sparkle holiday-season-dialog__sparkle--two">✧</span>
        </div>
        <div className="holiday-season-dialog__content">
          <p className="holiday-season-dialog__eyebrow">Seasonal event</p>
          <h2 className="holiday-season-dialog__title">
            {meta.theme_name}
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
