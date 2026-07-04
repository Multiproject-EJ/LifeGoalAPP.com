import type { HolidayKey } from './treatCalendarService';

export type HolidayThemeAssets = {
  introBackgroundUrl: string | null;
  calendarBackgroundUrl: string | null;
  /** Primary accent color for the holiday theme (hex) */
  accentColor: string;
  /** Secondary accent color (hex) */
  secondaryColor: string;
  /**
   * Text tone the calendar modal should use over `calendarBackgroundUrl`.
   * 'light' = background art is dark, render all copy in white/light.
   * 'dark'  = background art is light, render all copy in slate/dark.
   */
  calendarTextTone: 'light' | 'dark';
};

const HOLIDAY_THEME_ASSETS: Record<HolidayKey, HolidayThemeAssets> = {
  new_year: {
    introBackgroundUrl: '/Holiday%20Themes/happy_newyear.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/happy_newyear.webp',
    accentColor: '#4338ca',
    secondaryColor: '#ca8a04',
    calendarTextTone: 'light',
  },
  valentines_day: {
    introBackgroundUrl: '/Holiday%20Themes/valentines_countdown.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/valentines_countdown.webp',
    accentColor: '#e11d48',
    secondaryColor: '#f43f5e',
    calendarTextTone: 'light',
  },
  st_patricks_day: {
    introBackgroundUrl: '/Holiday%20Themes/st_patricksday.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/st_patricksday.webp',
    accentColor: '#166534',
    secondaryColor: '#ca8a04',
    calendarTextTone: 'dark',
  },
  easter: {
    introBackgroundUrl: '/Holiday%20Themes/easter_countdown.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/easter_countdown.webp',
    accentColor: '#a855f7',
    secondaryColor: '#4ade80',
    calendarTextTone: 'dark',
  },
  eid_mubarak: {
    introBackgroundUrl: '/Holiday%20Themes/eidmubarak.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/eidmubarak.webp',
    accentColor: '#312e81',
    secondaryColor: '#d97706',
    calendarTextTone: 'light',
  },
  halloween: {
    introBackgroundUrl: '/Holiday%20Themes/halloween2.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/calendarBG_HalloweenNight.webp',
    accentColor: '#c2410c',
    secondaryColor: '#7c3aed',
    calendarTextTone: 'light',
  },
  thanksgiving: {
    introBackgroundUrl: null,
    calendarBackgroundUrl: null,
    accentColor: '#b45309',
    secondaryColor: '#d97706',
    calendarTextTone: 'dark',
  },
  hanukkah: {
    introBackgroundUrl: '/Holiday%20Themes/hanukkha.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/hanukkha.webp',
    accentColor: '#0369a1',
    secondaryColor: '#0ea5e9',
    calendarTextTone: 'light',
  },
  christmas: {
    introBackgroundUrl: '/Holiday%20Themes/chistmas.webp',
    calendarBackgroundUrl: '/Holiday%20Themes/chistmas.webp',
    accentColor: '#166534',
    secondaryColor: '#ca8a04',
    calendarTextTone: 'light',
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
