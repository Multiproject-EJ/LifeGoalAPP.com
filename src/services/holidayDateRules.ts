export type HolidayKeyDateRule =
  | 'eid_al_fitr'
  | 'eid_al_adha'
  | 'hanukkah';

export type DateRangeYmd = {
  start: string;
  end: string;
};

export type YearlyHolidayDates = Record<number, DateRangeYmd>;

/**
 * NOTE:
 * Eid dates below follow common/expected Gregorian calendar mappings and can
 * vary by locale and moon-sighting authority by ±1 day.
 *
 * Product trust rule:
 * We only show precise religious greetings inside known configured windows.
 * Outside the table range we intentionally do not guess.
 */
export const EID_AL_FITR_DATES_2026_2045: YearlyHolidayDates = {
  2026: { start: '2026-03-20', end: '2026-03-22' },
  2027: { start: '2027-03-10', end: '2027-03-12' },
  2028: { start: '2028-02-27', end: '2028-02-29' },
  2029: { start: '2029-02-15', end: '2029-02-17' },
  2030: { start: '2030-02-05', end: '2030-02-07' },
  2031: { start: '2031-01-25', end: '2031-01-27' },
  2032: { start: '2032-01-14', end: '2032-01-16' },
  2033: { start: '2033-01-03', end: '2033-01-05' },
  2034: { start: '2034-12-23', end: '2034-12-25' },
  2035: { start: '2035-12-13', end: '2035-12-15' },
  2036: { start: '2036-12-01', end: '2036-12-03' },
  2037: { start: '2037-11-20', end: '2037-11-22' },
  2038: { start: '2038-11-09', end: '2038-11-11' },
  2039: { start: '2039-10-29', end: '2039-10-31' },
  2040: { start: '2040-10-17', end: '2040-10-19' },
  2041: { start: '2041-10-06', end: '2041-10-08' },
  2042: { start: '2042-09-25', end: '2042-09-27' },
  2043: { start: '2043-09-14', end: '2043-09-16' },
  2044: { start: '2044-09-02', end: '2044-09-04' },
  2045: { start: '2045-08-23', end: '2045-08-25' },
};

export const EID_AL_ADHA_DATES_2026_2045: YearlyHolidayDates = {
  2026: { start: '2026-05-27', end: '2026-05-29' },
  2027: { start: '2027-05-17', end: '2027-05-19' },
  2028: { start: '2028-05-05', end: '2028-05-07' },
  2029: { start: '2029-04-24', end: '2029-04-26' },
  2030: { start: '2030-04-14', end: '2030-04-16' },
  2031: { start: '2031-04-03', end: '2031-04-05' },
  2032: { start: '2032-03-22', end: '2032-03-24' },
  2033: { start: '2033-03-11', end: '2033-03-13' },
  2034: { start: '2034-02-28', end: '2034-03-02' },
  2035: { start: '2035-02-17', end: '2035-02-19' },
  2036: { start: '2036-02-07', end: '2036-02-09' },
  2037: { start: '2037-01-27', end: '2037-01-29' },
  2038: { start: '2038-01-16', end: '2038-01-18' },
  2039: { start: '2039-01-05', end: '2039-01-07' },
  2040: { start: '2040-12-25', end: '2040-12-27' },
  2041: { start: '2041-12-14', end: '2041-12-16' },
  2042: { start: '2042-12-03', end: '2042-12-05' },
  2043: { start: '2043-11-22', end: '2043-11-24' },
  2044: { start: '2044-11-10', end: '2044-11-12' },
  2045: { start: '2045-10-31', end: '2045-11-02' },
};

export const HANUKKAH_DATES_2026_2045: YearlyHolidayDates = {
  2026: { start: '2026-12-04', end: '2026-12-11' },
  2027: { start: '2027-12-24', end: '2027-12-31' },
  2028: { start: '2028-12-12', end: '2028-12-19' },
  2029: { start: '2029-12-01', end: '2029-12-08' },
  2030: { start: '2030-12-20', end: '2030-12-27' },
  2031: { start: '2031-12-10', end: '2031-12-17' },
  2032: { start: '2032-11-28', end: '2032-12-05' },
  2033: { start: '2033-12-18', end: '2033-12-25' },
  2034: { start: '2034-12-08', end: '2034-12-15' },
  2035: { start: '2035-11-26', end: '2035-12-03' },
  2036: { start: '2036-12-14', end: '2036-12-21' },
  2037: { start: '2037-12-04', end: '2037-12-11' },
  2038: { start: '2038-12-24', end: '2038-12-31' },
  2039: { start: '2039-12-13', end: '2039-12-20' },
  2040: { start: '2040-12-01', end: '2040-12-08' },
  2041: { start: '2041-12-20', end: '2041-12-27' },
  2042: { start: '2042-12-10', end: '2042-12-17' },
  2043: { start: '2043-11-29', end: '2043-12-06' },
  2044: { start: '2044-12-17', end: '2044-12-24' },
  2045: { start: '2045-12-07', end: '2045-12-14' },
};

export function getEasterSundayYmd(year: number): string {
  // Meeus/Jones/Butcher Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getUsThanksgivingYmd(year: number): string {
  // Fourth Thursday of November (month index 10)
  const nov1 = new Date(year, 10, 1);
  const dayOfWeek = nov1.getDay(); // 0=Sun, 4=Thu
  const offsetToFirstThursday = (4 - dayOfWeek + 7) % 7;
  const firstThursday = 1 + offsetToFirstThursday;
  const fourthThursday = firstThursday + 21;
  return `${year}-11-${String(fourthThursday).padStart(2, '0')}`;
}

function isYmdInsideRange(ymd: string, range: DateRangeYmd): boolean {
  return ymd >= range.start && ymd <= range.end;
}

export function isInsideYearlyTableRange(table: YearlyHolidayDates, date: Date): boolean {
  const year = date.getFullYear();
  const ymd = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const range = table[year];
  if (!range) return false;
  return isYmdInsideRange(ymd, range);
}

export function getEidGreetingLabelForDate(date: Date): 'Eid Mubarak' | 'Crescent & Lantern Theme' {
  const isGreetingActive =
    isInsideYearlyTableRange(EID_AL_FITR_DATES_2026_2045, date) ||
    isInsideYearlyTableRange(EID_AL_ADHA_DATES_2026_2045, date);
  return isGreetingActive ? 'Eid Mubarak' : 'Crescent & Lantern Theme';
}
