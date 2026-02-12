// Weekly Activity Calendar Strip Component
import { useMemo } from 'react';
import type { ExerciseLog } from './types';

interface WeeklyCalendarProps {
  logs: ExerciseLog[];
}

interface DayData {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  logCount: number;
  logs: ExerciseLog[];
}

export function WeeklyCalendar({ logs }: WeeklyCalendarProps) {
  const weekData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get Monday of current week
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust when day is Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    
    // Generate 7 days from Monday to Sunday
    const days: DayData[] = [];
    const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      
      // Filter logs for this day
      const dayLogs = logs.filter((log) => {
        const logDate = new Date(log.logged_at);
        return logDate >= date && logDate < nextDay;
      });
      
      const isToday = date.toDateString() === today.toDateString();
      
      days.push({
        date,
        dayName: dayNames[i],
        dayNumber: date.getDate(),
        isToday,
        logCount: dayLogs.length,
        logs: dayLogs,
      });
    }
    
    return days;
  }, [logs]);

  return (
    <div className="weekly-calendar">
      {weekData.map((day, index) => (
        <div
          key={index}
          className={`weekly-calendar__day ${
            day.isToday ? 'weekly-calendar__day--today' : ''
          } ${day.logCount > 0 ? 'weekly-calendar__day--has-activity' : ''}`}
        >
          <span className="weekly-calendar__day-name">{day.dayName}</span>
          <span className="weekly-calendar__day-number">{day.dayNumber}</span>
          <div
            className={`weekly-calendar__dot ${
              day.logCount > 0 ? 'weekly-calendar__dot--active' : ''
            }`}
          />
          {day.logCount > 0 && (
            <div className="weekly-calendar__count">{day.logCount}</div>
          )}
        </div>
      ))}
    </div>
  );
}
