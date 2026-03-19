import type { HolidayKey } from './treatCalendarService';

export type HolidayThemeAssets = {
  introBackgroundUrl: string | null;
  calendarBackgroundUrl: string | null;
};

const HOLIDAY_THEME_ASSETS: Record<HolidayKey, HolidayThemeAssets> = {
  new_year: {
    introBackgroundUrl: '/Holiday%20Themes/Bg/happy_newyear.webp',
    calendarBackgroundUrl: null,
  },
  valentines_day: {
    introBackgroundUrl: '/Holiday%20Themes/Bg/valentines_countdown.webp',
    calendarBackgroundUrl: null,
  },
  st_patricks_day: {
    introBackgroundUrl: '/Holiday%20Themes/Bg/st_patricksday.webp',
    calendarBackgroundUrl: null,
  },
  easter: {
    introBackgroundUrl: '/Holiday%20Themes/Bg/easter_countdown.webp',
    calendarBackgroundUrl: null,
  },
  eid_mubarak: {
    introBackgroundUrl: '/Holiday%20Themes/Bg/eidmubarak.webp',
    calendarBackgroundUrl: null,
  },
  halloween: {
    introBackgroundUrl: '/Holiday%20Themes/Bg/halloween2.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/calendarBG/calendarBG_HalloweenNight.webp',
  },
  thanksgiving: {
    introBackgroundUrl: null,
    calendarBackgroundUrl: null,
  },
  hanukkah: {
    introBackgroundUrl: '/Holiday%20Themes/Bg/hanukkha.webp',
    calendarBackgroundUrl: null,
  },
  christmas: {
    introBackgroundUrl: '/Holiday%20Themes/Bg/chistmas.webp',
    calendarBackgroundUrl: null,
  },
};

export function getHolidayThemeAssets(holidayKey: HolidayKey): HolidayThemeAssets {
  return HOLIDAY_THEME_ASSETS[holidayKey];
}
