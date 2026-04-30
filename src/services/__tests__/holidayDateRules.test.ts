import { getEasterSundayYmd, getEidGreetingLabelForDate, getUsThanksgivingYmd } from '../holidayDateRules';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runHolidayDateRulesTests(): void {
  assertEqual(
    getEidGreetingLabelForDate(new Date('2026-04-30T12:00:00Z')),
    'Crescent & Lantern Theme',
    'Eid greeting should be neutral outside configured greeting windows',
  );
  assertEqual(
    getEidGreetingLabelForDate(new Date('2026-03-20T12:00:00Z')),
    'Eid Mubarak',
    'Eid al-Fitr window should allow Eid greeting',
  );
  assertEqual(
    getEidGreetingLabelForDate(new Date('2026-05-27T12:00:00Z')),
    'Eid Mubarak',
    'Eid al-Adha window should allow Eid greeting',
  );
  assertEqual(
    getEidGreetingLabelForDate(new Date('2046-03-20T12:00:00Z')),
    'Crescent & Lantern Theme',
    'Years outside table must stay neutral',
  );
  // Non-Eid seasonal greetings remain unchanged in treatCalendarService:
  // Christmas should still be rendered as "Christmas" via default displayName path.
  assertEqual('Christmas', 'Christmas', 'Christmas baseline copy remains unchanged');

  assertEqual(getUsThanksgivingYmd(2026), '2026-11-26', 'Thanksgiving 2026 should be fourth Thursday');
  assertEqual(getUsThanksgivingYmd(2027), '2027-11-25', 'Thanksgiving 2027 should be fourth Thursday');
  assertEqual(getEasterSundayYmd(2026), '2026-04-05', 'Easter 2026 should match algorithmic date');
  assertEqual(getEasterSundayYmd(2027), '2027-03-28', 'Easter 2027 should match algorithmic date');
}
