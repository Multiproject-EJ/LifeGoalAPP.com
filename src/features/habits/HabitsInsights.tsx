import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listHabitLogsForRangeV2, type HabitV2Row, type HabitLogV2Row } from '../../services/habitsV2';

type HabitsInsightsProps = {
  session: Session;
  habits: HabitV2Row[];
};

type DayData = {
  date: string;
  hasLog: boolean;
};

export function HabitsInsights({ session, habits }: HabitsInsightsProps) {
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [logs, setLogs] = useState<HabitLogV2Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<DayData[]>([]);

  // Load logs when habit is selected
  useEffect(() => {
    if (!selectedHabitId || !session) {
      setLogs([]);
      setHeatmapData([]);
      return;
    }

    const loadLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        // Calculate date range (last 31 days including today)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        // Fetch logs for this habit and date range
        const { data: logsData, error: logsError } = await listHabitLogsForRangeV2({
          userId: session.user.id,
          habitId: selectedHabitId,
          startDate,
          endDate,
        });

        if (logsError) {
          throw new Error(logsError.message);
        }

        setLogs(logsData ?? []);

        // Build heatmap data
        const heatmap = buildHeatmapData(logsData ?? []);
        setHeatmapData(heatmap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load insights');
        console.error('Error loading habit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [selectedHabitId, session]);

  // Build 31-day heatmap data
  const buildHeatmapData = (logs: HabitLogV2Row[]): DayData[] => {
    // Create a map of dates to completion status
    const completionMap: Record<string, boolean> = {};
    logs.forEach((log) => {
      if (log.done) {
        completionMap[log.date] = true;
      }
    });

    // Generate array for last 31 days
    const today = new Date();
    const days: DayData[] = [];

    for (let i = 0; i < 31; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (30 - i));
      const dateStr = date.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        hasLog: completionMap[dateStr] ?? false,
      });
    }

    return days;
  };

  const handleHabitSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedHabitId(e.target.value);
  };

  return (
    <div
      style={{
        background: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>
        Habit Insights
      </h2>

      {/* Habit selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="insights-habit-select"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          Select a habit
        </label>
        <select
          id="insights-habit-select"
          value={selectedHabitId}
          onChange={handleHabitSelect}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.875rem',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="">Choose a habit...</option>
          {habits.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.emoji ? `${habit.emoji} ` : ''}{habit.title}
            </option>
          ))}
        </select>
      </div>

      {/* Content area */}
      {!selectedHabitId && (
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Select a habit to view insights.
        </p>
      )}

      {selectedHabitId && loading && (
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Loading insights...
        </p>
      )}

      {selectedHabitId && error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.875rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {selectedHabitId && !loading && !error && heatmapData.length > 0 && (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
            31-Day Heatmap
          </h4>
          
          {/* Labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}
          >
            <span>31 days ago</span>
            <span>Today</span>
          </div>

          {/* Heatmap grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(31, 1fr)',
              gap: '4px',
              width: '100%',
            }}
          >
            {heatmapData.map((day) => (
              <div
                key={day.date}
                title={day.date}
                style={{
                  aspectRatio: '1',
                  background: day.hasLog ? '#10b981' : '#e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
            }}
          >
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                {logs.filter((l) => l.done).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Completions (31 days)
              </div>
            </div>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                {Math.round((logs.filter((l) => l.done).length / 31) * 100)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Success rate
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
