import { useMemo, useState } from 'react';
import { HolidaySeasonDialog } from '../components/HolidaySeasonDialog';
import { CountdownCalendarModal } from '../features/gamification/daily-treats/CountdownCalendarModal';
import {
  buildPreviewAdventMeta,
  type HolidayKey,
} from '../services/treatCalendarService';

const HOLIDAYS: Array<{ key: HolidayKey; label: string }> = [
  { key: 'new_year', label: 'New Year' },
  { key: 'valentines_day', label: "Valentine's" },
  { key: 'st_patricks_day', label: "St Patrick's" },
  { key: 'easter', label: 'Easter' },
  { key: 'eid_mubarak', label: 'Eid' },
  { key: 'halloween', label: 'Halloween' },
  { key: 'thanksgiving', label: 'Thanksgiving' },
  { key: 'hanukkah', label: 'Hanukkah' },
  { key: 'christmas', label: 'Christmas' },
];

type PreviewMode = 'intro' | 'calendar';

function readInitialHoliday(): HolidayKey {
  const requested = new URLSearchParams(window.location.search).get('holiday') as HolidayKey | null;
  return HOLIDAYS.some((holiday) => holiday.key === requested) ? requested! : 'thanksgiving';
}

function readInitialMode(): PreviewMode {
  return new URLSearchParams(window.location.search).get('mode') === 'calendar'
    ? 'calendar'
    : 'intro';
}

export default function HolidayModalPreview() {
  const [holidayKey, setHolidayKey] = useState<HolidayKey>(readInitialHoliday);
  const [mode, setMode] = useState<PreviewMode>(readInitialMode);
  const activeHoliday = useMemo(() => buildPreviewAdventMeta(holidayKey), [holidayKey]);

  const updatePreview = (nextHoliday: HolidayKey, nextMode: PreviewMode) => {
    setHolidayKey(nextHoliday);
    setMode(nextMode);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('holiday', nextHoliday);
    nextUrl.searchParams.set('mode', nextMode);
    window.history.replaceState(null, '', nextUrl);
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#06162f',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <HolidaySeasonDialog
        activeHoliday={activeHoliday}
        isOpen={mode === 'intro'}
        isPreview
        onClose={() => undefined}
        onOpenCalendar={() => updatePreview(holidayKey, 'calendar')}
      />
      <CountdownCalendarModal
        isOpen={mode === 'calendar'}
        onClose={() => updatePreview(holidayKey, 'intro')}
        previewHolidayKey={holidayKey}
        mode="holiday"
      />
      <aside
        aria-label="Holiday modal preview controls"
        style={{
          position: 'fixed',
          zIndex: 2000,
          right: '0.65rem',
          bottom: '0.65rem',
          left: '0.65rem',
          display: 'flex',
          gap: '0.45rem',
          padding: '0.55rem',
          overflowX: 'auto',
          border: '1px solid rgba(255,255,255,.22)',
          borderRadius: '16px',
          background: 'rgba(3, 12, 28, .78)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 12px 28px rgba(0,0,0,.34)',
        }}
      >
        <button type="button" onClick={() => updatePreview(holidayKey, mode === 'intro' ? 'calendar' : 'intro')}>
          {mode === 'intro' ? 'Calendar' : 'Intro'}
        </button>
        {HOLIDAYS.map((holiday) => (
          <button
            key={holiday.key}
            type="button"
            aria-pressed={holiday.key === holidayKey}
            onClick={() => updatePreview(holiday.key, mode)}
          >
            {holiday.label}
          </button>
        ))}
      </aside>
    </main>
  );
}
