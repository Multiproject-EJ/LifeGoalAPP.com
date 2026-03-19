import type { HolidayKey } from './treatCalendarService';

export const HOLIDAY_PREVIEW_LAUNCH_EVENT = 'lifegoal:holiday-preview-launch';

export type HolidayPreviewLaunchDetail = {
  holidayKey: HolidayKey;
  mode: 'intro' | 'calendar';
};

export function dispatchHolidayPreviewLaunch(detail: HolidayPreviewLaunchDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<HolidayPreviewLaunchDetail>(HOLIDAY_PREVIEW_LAUNCH_EVENT, { detail }));
}
