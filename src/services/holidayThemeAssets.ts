import type { HolidayKey } from './treatCalendarService';

export type HolidayThemeAssets = {
  introBackgroundUrl: string | null;
  medallionUrl: string;
  /** Primary accent color for the holiday theme (hex) */
  accentColor: string;
  /** Secondary accent color (hex) */
  secondaryColor: string;
};

const HOLIDAY_THEME_ASSETS: Record<HolidayKey, HolidayThemeAssets> = {
  new_year: {
    introBackgroundUrl: '/Holiday%20Themes/happy_newyear.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-new-year.webp',
    accentColor: '#4338ca',
    secondaryColor: '#ca8a04',
  },
  valentines_day: {
    introBackgroundUrl: '/Holiday%20Themes/valentines_countdown.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-valentines-day.webp',
    accentColor: '#e11d48',
    secondaryColor: '#f43f5e',
  },
  st_patricks_day: {
    introBackgroundUrl: '/Holiday%20Themes/st_patricksday.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-st-patricks-day.webp',
    accentColor: '#166534',
    secondaryColor: '#ca8a04',
  },
  easter: {
    introBackgroundUrl: '/Holiday%20Themes/easter_countdown.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-easter.webp',
    accentColor: '#a855f7',
    secondaryColor: '#4ade80',
  },
  eid_mubarak: {
    introBackgroundUrl: '/Holiday%20Themes/eidmubarak.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-eid-mubarak.webp',
    accentColor: '#312e81',
    secondaryColor: '#d97706',
  },
  halloween: {
    introBackgroundUrl: '/Holiday%20Themes/halloween2.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-halloween.webp',
    accentColor: '#c2410c',
    secondaryColor: '#7c3aed',
  },
  thanksgiving: {
    introBackgroundUrl: '/Holiday%20Themes/thanksgiving.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-thanksgiving.webp',
    accentColor: '#b45309',
    secondaryColor: '#d97706',
  },
  hanukkah: {
    introBackgroundUrl: '/Holiday%20Themes/hanukkha.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-hanukkah.webp',
    accentColor: '#0369a1',
    secondaryColor: '#0ea5e9',
  },
  christmas: {
    introBackgroundUrl: '/Holiday%20Themes/chistmas.webp',
    medallionUrl: '/assets/themes/first-light-kingdom/today/holiday-circles/holiday-christmas.webp',
    accentColor: '#166534',
    secondaryColor: '#ca8a04',
  },
};

export function getHolidayThemeAssets(holidayKey: HolidayKey): HolidayThemeAssets {
  return HOLIDAY_THEME_ASSETS[holidayKey];
}

/** Get accent colors for scratch layer theming */
export function getHolidayAccentColors(holidayKey: HolidayKey | null): {
  primary: string;
  secondary: string;
} {
  if (!holidayKey) {
    return { primary: '#3b82f6', secondary: '#06b6d4' }; // Default blue
  }
  const assets = HOLIDAY_THEME_ASSETS[holidayKey];
  return { primary: assets.accentColor, secondary: assets.secondaryColor };
}
