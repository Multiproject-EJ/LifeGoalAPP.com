import { useEffect, useMemo, useRef, useState } from 'react';
import {
  recordTimerTelemetryEvent,
  recordTimerSourceAnalytics,
  type TimerSourceType,
} from './timerSession';

export type SessionSegmentType = 'focus' | 'break';
export type SessionPlanStatus = 'idle' | 'running' | 'paused' | 'completed';

type SessionSegmentStatus = 'pending' | 'running' | 'completed' | 'skipped';

type SessionSegment = {
  id: string;
  type: SessionSegmentType;
  label: string;
  notes: string;
  plannedMinutes: number;
  plannedSeconds: number;
  remainingSeconds: number;
  actualSeconds: number;
  status: SessionSegmentStatus;
};

type SessionPlanState = {
  mode: 'session-plan';
  planId: string;
  createdAt: number;
  completedAt: number | null;
  status: SessionPlanStatus;
  activeSegmentIndex: number;
  autoStartNext: boolean;
  reflectionNote: string;
  segments: SessionSegment[];
};

type SessionPlannerProps = {
  sourceLabel: string;
  sourceType: TimerSourceType;
  onSourceAnalyticsUpdated?: () => void;
};

const STORAGE_KEY = 'lifegoal_timer_session_plan_v1';
const CUSTOM_TEMPLATE_STORAGE_KEY = 'lifegoal_timer_session_custom_templates_v1';
const MIN_SEGMENT_MINUTES = 1;
const MAX_SEGMENT_MINUTES = 180;
const MAX_CUSTOM_TEMPLATES = 6;
const SESSION_HISTORY_STORAGE_KEY = 'lifegoal_timer_session_history_v1';
const MAX_SESSION_HISTORY_ITEMS = 12;
const ENABLE_TIMER_DIAL = true;



type SessionHistoryItem = {
  id: string;
  completedAt: number;
  sourceType: TimerSourceType;
  sourceLabel: string;
  plannedFocusSeconds: number;
  actualFocusSeconds: number;
  completionRatio: number;
  segmentCount: number;
};
type SessionPlanTemplate = {
  id: string;
  name: string;
  description: string;
  segments: Array<{ type: SessionSegmentType; label: string; minutes: number }>;
};



type SessionPlanTemplateInput = {
  type: SessionSegmentType;
  label: string;
  minutes: number;
};

function readCustomTemplates(): SessionPlanTemplate[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SessionPlanTemplate[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => Boolean(item?.id && item?.name && Array.isArray(item?.segments)))
      .slice(0, MAX_CUSTOM_TEMPLATES)
      .map((template) => ({
        ...template,
        description: template.description || 'Custom plan',
        segments: template.segments.map((segment) => ({
          type: segment.type === 'break' ? 'break' : 'focus',
          label: segment.label || (segment.type === 'break' ? 'Break' : 'Focus task'),
          minutes: Math.min(MAX_SEGMENT_MINUTES, Math.max(MIN_SEGMENT_MINUTES, Math.round(segment.minutes))),
        })),
      }));
  } catch {
    return [];
  }
}

function writeCustomTemplates(templates: SessionPlanTemplate[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(templates.slice(0, MAX_CUSTOM_TEMPLATES)));
}


function readSessionHistory(): SessionHistoryItem[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(SESSION_HISTORY_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SessionHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => Boolean(item?.id && Number.isFinite(item.completedAt) && Number.isFinite(item.plannedFocusSeconds)))
      .slice(0, MAX_SESSION_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

function writeSessionHistory(items: SessionHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_SESSION_HISTORY_ITEMS)));
}

function buildSegmentsFromTemplate(templateSegments: SessionPlanTemplateInput[]): SessionSegment[] {
  return templateSegments.map((segment) => {
    const minutes = Math.min(MAX_SEGMENT_MINUTES, Math.max(MIN_SEGMENT_MINUTES, Math.round(segment.minutes)));
    return {
      id: `segment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: segment.type,
      label: segment.label,
      notes: '',
      plannedMinutes: minutes,
      plannedSeconds: minutes * 60,
      remainingSeconds: minutes * 60,
      actualSeconds: 0,
      status: 'pending',
    };
  });
}
const SESSION_PLAN_TEMPLATES: SessionPlanTemplate[] = [
  {
    id: 'pomodoro-classic',
    name: 'Pomodoro classic',
    description: '2 focus blocks with a short break',
    segments: [
      { type: 'focus', label: 'Focus 1', minutes: 25 },
      { type: 'break', label: 'Short break', minutes: 5 },
      { type: 'focus', label: 'Focus 2', minutes: 25 },
    ],
  },
  {
    id: 'study-sprint',
    name: 'Study sprint',
    description: '3 short focus sprints',
    segments: [
      { type: 'focus', label: 'Sprint 1', minutes: 20 },
      { type: 'focus', label: 'Sprint 2', minutes: 20 },
      { type: 'focus', label: 'Sprint 3', minutes: 20 },
    ],
  },
  {
    id: 'deep-work-90',
    name: 'Deep work 90',
    description: 'Sustained focus with recharge break',
    segments: [
      { type: 'focus', label: 'Deep work', minutes: 45 },
      { type: 'break', label: 'Reset break', minutes: 10 },
      { type: 'focus', label: 'Deep work 2', minutes: 35 },
    ],
  },
];

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function createSegment(type: SessionSegmentType): SessionSegment {
  const plannedMinutes = type === 'break' ? 5 : 25;
  return {
    id: `segment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label: type === 'break' ? 'Break' : 'Focus task',
    notes: '',
    plannedMinutes,
    plannedSeconds: plannedMinutes * 60,
    remainingSeconds: plannedMinutes * 60,
    actualSeconds: 0,
    status: 'pending',
  };
}

function defaultPlanState(): SessionPlanState {
  return {
    mode: 'session-plan',
    planId: `plan-${Date.now()}`,
    createdAt: Date.now(),
    completedAt: null,
    status: 'idle',
    activeSegmentIndex: 0,
    autoStartNext: false,
    reflectionNote: '',
    segments: [createSegment('focus')],
  };
}

function coerceSegmentStatus(input: unknown): SessionSegmentStatus {
  return input === 'running' || input === 'completed' || input === 'skipped' ? input : 'pending';
}

function readPlanState(): SessionPlanState {
  if (typeof window === 'undefined') return defaultPlanState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultPlanState();

  try {
    const parsed = JSON.parse(raw) as Partial<SessionPlanState>;
    if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      return defaultPlanState();
    }

    const segments = parsed.segments
      .filter((segment): segment is SessionSegment => Boolean(segment?.id && segment.type && Number.isFinite(segment.plannedSeconds)))
      .map((segment) => {
        const plannedSeconds = Math.max(MIN_SEGMENT_MINUTES * 60, Math.min(MAX_SEGMENT_MINUTES * 60, Math.floor(segment.plannedSeconds)));
        const remainingSeconds = Math.max(0, Math.min(plannedSeconds, Math.floor(segment.remainingSeconds ?? plannedSeconds)));
        return {
          ...segment,
          plannedMinutes: Math.round(plannedSeconds / 60),
          plannedSeconds,
          remainingSeconds,
          actualSeconds: Math.max(0, Math.floor(segment.actualSeconds ?? 0)),
          status: coerceSegmentStatus(segment.status),
          label: segment.label || (segment.type === 'break' ? 'Break' : 'Focus task'),
        };
      });

    return {
      mode: 'session-plan',
      planId: parsed.planId || `plan-${Date.now()}`,
      createdAt: parsed.createdAt || Date.now(),
      completedAt: parsed.completedAt ?? null,
      status: parsed.status === 'running' || parsed.status === 'paused' || parsed.status === 'completed' ? parsed.status : 'idle',
      activeSegmentIndex: Math.min(Math.max(0, parsed.activeSegmentIndex ?? 0), Math.max(segments.length - 1, 0)),
      autoStartNext: Boolean(parsed.autoStartNext),
      reflectionNote: typeof parsed.reflectionNote === 'string' ? parsed.reflectionNote : '',
      segments,
    };
  } catch {
    return defaultPlanState();
  }
}

function writePlanState(state: SessionPlanState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function SessionPlanner({ sourceLabel, sourceType, onSourceAnalyticsUpdated }: SessionPlannerProps) {
  const [plan, setPlan] = useState<SessionPlanState>(() => readPlanState());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [customTemplates, setCustomTemplates] = useState<SessionPlanTemplate[]>(() => readCustomTemplates());
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>(() => readSessionHistory());
  const recordedCompletionRef = useRef<string | null>(null);
  const recordedSourceAnalyticsRef = useRef<string | null>(null);

  useEffect(() => {
    writePlanState(plan);
  }, [plan]);

  useEffect(() => {
    writeCustomTemplates(customTemplates);
  }, [customTemplates]);

  useEffect(() => {
    writeSessionHistory(sessionHistory);
  }, [sessionHistory]);

  useEffect(() => {
    if (plan.status !== 'running') return;

    const interval = window.setInterval(() => {
      setPlan((current) => {
        if (current.status !== 'running') return current;
        const active = current.segments[current.activeSegmentIndex];
        if (!active) return current;

        if (active.remainingSeconds <= 1) {
          const updatedSegments = current.segments.map((segment, index) => {
            if (index !== current.activeSegmentIndex) return segment;
            return {
              ...segment,
              remainingSeconds: 0,
              actualSeconds: segment.actualSeconds + 1,
              status: 'completed' as const,
            };
          });

          const nextIndex = current.activeSegmentIndex + 1;
          if (nextIndex >= updatedSegments.length) {
            return {
              ...current,
              status: 'completed',
              completedAt: Date.now(),
              segments: updatedSegments,
            };
          }

          const withNext = updatedSegments.map((segment, index) => {
            if (index !== nextIndex) return segment;
            return {
              ...segment,
              status: (current.autoStartNext ? 'running' : 'pending') as SessionSegmentStatus,
            };
          });

          return {
            ...current,
            status: current.autoStartNext ? 'running' : 'paused',
            activeSegmentIndex: nextIndex,
            segments: withNext,
          };
        }

        const nextSegments = current.segments.map((segment, index) => {
          if (index !== current.activeSegmentIndex) return segment;
          return {
            ...segment,
            remainingSeconds: segment.remainingSeconds - 1,
            actualSeconds: segment.actualSeconds + 1,
            status: 'running' as const,
          };
        });

        return {
          ...current,
          segments: nextSegments,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [plan.status]);

  const totalPlannedSeconds = useMemo(() => plan.segments.reduce((total, segment) => total + segment.plannedSeconds, 0), [plan.segments]);
  const totalRemainingSeconds = useMemo(() => plan.segments.reduce((total, segment) => total + segment.remainingSeconds, 0), [plan.segments]);
  const focusPlannedSeconds = useMemo(() => plan.segments.filter((segment) => segment.type === 'focus').reduce((t, s) => t + s.plannedSeconds, 0), [plan.segments]);
  const focusActualSeconds = useMemo(() => plan.segments.filter((segment) => segment.type === 'focus').reduce((t, s) => t + s.actualSeconds, 0), [plan.segments]);
  const completedSegments = useMemo(() => plan.segments.filter((segment) => segment.status === 'completed').length, [plan.segments]);
  const completionRatio = plan.segments.length > 0 ? Math.round((completedSegments / plan.segments.length) * 100) : 0;

  const activeSegment = plan.segments[plan.activeSegmentIndex] ?? null;
  const progress = totalPlannedSeconds > 0 ? ((totalPlannedSeconds - totalRemainingSeconds) / totalPlannedSeconds) * 100 : 0;

  useEffect(() => {
    if (plan.status !== 'completed') return;
    const completionKey = `${plan.planId}:${plan.completedAt ?? 0}`;
    if (recordedCompletionRef.current === completionKey) return;

    recordTimerTelemetryEvent({
      type: 'session_plan_completed',
      sourceType,
      durationSeconds: totalPlannedSeconds,
      metadata: {
        segments: plan.segments.length,
        completionRatio,
        focusPlannedSeconds,
        focusActualSeconds,
      },
    });
    recordedCompletionRef.current = completionKey;
  }, [completionRatio, focusActualSeconds, focusPlannedSeconds, plan.completedAt, plan.planId, plan.segments.length, plan.status, sourceType, totalPlannedSeconds]);

  useEffect(() => {
    if (plan.status !== 'completed') return;
    const completionKey = `${plan.planId}:${plan.completedAt ?? 0}`;
    if (recordedSourceAnalyticsRef.current === completionKey) return;

    if (focusActualSeconds > 0) {
      recordTimerSourceAnalytics(sourceType, focusActualSeconds);
      onSourceAnalyticsUpdated?.();
    }
    recordedSourceAnalyticsRef.current = completionKey;
  }, [focusActualSeconds, onSourceAnalyticsUpdated, plan.completedAt, plan.planId, plan.status, sourceType]);


  useEffect(() => {
    if (plan.status !== 'completed') return;
    const completedAt = plan.completedAt;
    if (!completedAt) return;
    const completionKey = `${plan.planId}:${completedAt}`;

    setSessionHistory((current) => {
      if (current.some((item) => item.id === completionKey)) return current;
      const next: SessionHistoryItem = {
        id: completionKey,
        completedAt,
        sourceType,
        sourceLabel,
        plannedFocusSeconds: focusPlannedSeconds,
        actualFocusSeconds: focusActualSeconds,
        completionRatio,
        segmentCount: plan.segments.length,
      };
      return [next, ...current].slice(0, MAX_SESSION_HISTORY_ITEMS);
    });
  }, [completionRatio, focusActualSeconds, focusPlannedSeconds, plan.completedAt, plan.planId, plan.segments.length, plan.status, sourceLabel, sourceType]);

  const clearSessionHistory = () => {
    setSessionHistory([]);
    recordTimerTelemetryEvent({
      type: 'session_plan_history_cleared',
      sourceType,
      durationSeconds: 0,
    });
  };

  const updateSegment = (segmentId: string, patch: Partial<SessionSegment>) => {
    setPlan((current) => ({
      ...current,
      segments: current.segments.map((segment) => (segment.id === segmentId ? { ...segment, ...patch } : segment)),
    }));
  };

  const addSegment = (type: SessionSegmentType) => {
    setPlan((current) => ({
      ...current,
      segments: [...current.segments, createSegment(type)],
    }));
  };

  const removeSegment = (segmentId: string) => {
    setPlan((current) => {
      if (current.segments.length <= 1) return current;
      const nextSegments = current.segments.filter((segment) => segment.id !== segmentId);
      return {
        ...current,
        activeSegmentIndex: Math.min(current.activeSegmentIndex, nextSegments.length - 1),
        segments: nextSegments,
      };
    });
  };

  const moveSegment = (index: number, direction: -1 | 1) => {
    setPlan((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.segments.length) return current;
      const segments = [...current.segments];
      const [item] = segments.splice(index, 1);
      segments.splice(nextIndex, 0, item);
      const activeIndex = current.activeSegmentIndex === index ? nextIndex : current.activeSegmentIndex === nextIndex ? index : current.activeSegmentIndex;

      return {
        ...current,
        activeSegmentIndex: activeIndex,
        segments,
      };
    });
  };

  const duplicateSegment = (segmentId: string) => {
    setPlan((current) => {
      const index = current.segments.findIndex((segment) => segment.id === segmentId);
      if (index < 0) return current;
      const source = current.segments[index];
      const clone: SessionSegment = {
        ...source,
        id: `segment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: source.type === 'break' ? `${source.label} copy` : `${source.label} copy`,
        remainingSeconds: source.plannedSeconds,
        actualSeconds: 0,
        status: 'pending',
      };
      const next = [...current.segments];
      next.splice(index + 1, 0, clone);
      return {
        ...current,
        segments: next,
      };
    });
  };

  const startPlan = () => {
    setStatusMessage(null);
    recordTimerTelemetryEvent({
      type: 'session_plan_started',
      sourceType,
      durationSeconds: totalPlannedSeconds,
      metadata: {
        segments: plan.segments.length,
      },
    });
    setPlan((current) => ({
      ...current,
      completedAt: null,
      status: 'running',
      segments: current.segments.map((segment, index) => ({
        ...segment,
        status: (index === current.activeSegmentIndex ? 'running' : segment.status) as SessionSegmentStatus,
      })),
    }));
  };

  const pausePlan = () => {
    recordTimerTelemetryEvent({
      type: 'session_plan_paused',
      sourceType,
      durationSeconds: totalPlannedSeconds,
    });
    setPlan((current) => ({ ...current, status: 'paused' }));
  };

  const resumePlan = () => {
    recordTimerTelemetryEvent({
      type: 'session_plan_resumed',
      sourceType,
      durationSeconds: totalPlannedSeconds,
    });
    setPlan((current) => ({ ...current, status: 'running' }));
  };

  const resetPlan = () => {
    setStatusMessage(null);
    recordTimerTelemetryEvent({
      type: 'session_plan_reset',
      sourceType,
      durationSeconds: totalPlannedSeconds,
    });
    setPlan((current) => ({
      ...current,
      status: 'idle',
      completedAt: null,
      activeSegmentIndex: 0,
      segments: current.segments.map((segment) => ({
        ...segment,
        remainingSeconds: segment.plannedSeconds,
        actualSeconds: 0,
        status: 'pending',
      })),
    }));
  };

  const skipToNext = () => {
    setPlan((current) => {
      const activeIndex = current.activeSegmentIndex;
      const nextIndex = activeIndex + 1;
      const nextSegments = current.segments.map((segment, index) => {
        if (index === activeIndex) {
          return {
            ...segment,
            status: 'skipped' as const,
            remainingSeconds: 0,
          };
        }
        if (index === nextIndex) {
          return {
            ...segment,
            status: (current.status === 'running' ? 'running' : 'pending') as SessionSegmentStatus,
          };
        }
        return segment;
      });

      if (nextIndex >= nextSegments.length) {
        return {
          ...current,
          status: 'completed',
          completedAt: Date.now(),
          segments: nextSegments,
        };
      }

      return {
        ...current,
        activeSegmentIndex: nextIndex,
        segments: nextSegments,
      };
    });
  };

  const extendActive = (minutes: number) => {
    const safeSeconds = Math.max(60, Math.floor(minutes * 60));
    setPlan((current) => {
      const active = current.segments[current.activeSegmentIndex];
      if (!active) return current;

      const segments = current.segments.map((segment, index) => {
        if (index !== current.activeSegmentIndex) return segment;
        const plannedSeconds = Math.min(MAX_SEGMENT_MINUTES * 60, segment.plannedSeconds + safeSeconds);
        const remainingSeconds = Math.min(MAX_SEGMENT_MINUTES * 60, segment.remainingSeconds + safeSeconds);
        return {
          ...segment,
          plannedSeconds,
          plannedMinutes: Math.round(plannedSeconds / 60),
          remainingSeconds,
        };
      });

      return {
        ...current,
        segments,
      };
    });
    setStatusMessage(`Extended current segment by ${minutes} min.`);
  };


  const applyTemplate = (templateId: string) => {
    const template = [...SESSION_PLAN_TEMPLATES, ...customTemplates].find((item) => item.id === templateId);
    if (!template) return;

    const templateSegments = buildSegmentsFromTemplate(template.segments);

    recordTimerTelemetryEvent({
      type: 'session_plan_template_applied',
      sourceType,
      durationSeconds: templateSegments.reduce((sum, segment) => sum + segment.plannedSeconds, 0),
      metadata: {
        templateId: template.id,
        templateName: template.name,
        segmentCount: templateSegments.length,
      },
    });

    setStatusMessage(`Loaded template: ${template.name}.`);
    setPlan((current) => ({
      ...current,
      planId: `plan-${Date.now()}`,
      createdAt: Date.now(),
      completedAt: null,
      status: 'idle',
      activeSegmentIndex: 0,
      segments: templateSegments,
    }));
  };


  const handleSaveCustomTemplate = () => {
    const trimmedName = customTemplateName.trim();
    if (!trimmedName) {
      setStatusMessage('Add a template name first.');
      return;
    }

    const template: SessionPlanTemplate = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      description: `${plan.segments.length} segment custom plan`,
      segments: plan.segments.map((segment) => ({
        type: segment.type,
        label: segment.label,
        minutes: Math.round(segment.plannedSeconds / 60),
      })),
    };

    setCustomTemplates((current) => [template, ...current].slice(0, MAX_CUSTOM_TEMPLATES));
    setCustomTemplateName('');
    setStatusMessage(`Saved custom template: ${template.name}.`);
    recordTimerTelemetryEvent({
      type: 'session_plan_custom_template_saved',
      sourceType,
      durationSeconds: totalPlannedSeconds,
      metadata: { templateName: template.name, segmentCount: template.segments.length },
    });
  };

  const summaryText = useMemo(() => {
    return [
      `Session summary (${sourceLabel})`,
      `Focus planned: ${formatClock(focusPlannedSeconds)}`,
      `Focus actual: ${formatClock(focusActualSeconds)}`,
      `Completion: ${completionRatio}% (${completedSegments}/${plan.segments.length})`,
      `Focus delta: ${focusActualSeconds >= focusPlannedSeconds
        ? `+${formatClock(focusActualSeconds - focusPlannedSeconds)} over plan`
        : `-${formatClock(focusPlannedSeconds - focusActualSeconds)} under plan`}`,
    ].join('\n');
  }, [completedSegments, completionRatio, focusActualSeconds, focusPlannedSeconds, plan.segments.length, sourceLabel]);

  const handleCopySummary = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
        setStatusMessage('Session summary copied.');
        return;
      }

      setStatusMessage('Clipboard is not available on this device.');
    } catch {
      setStatusMessage('Could not copy summary right now.');
    }
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    setCustomTemplates((current) => current.filter((template) => template.id !== templateId));
    recordTimerTelemetryEvent({
      type: 'session_plan_custom_template_deleted',
      sourceType,
      durationSeconds: totalPlannedSeconds,
      metadata: { templateId },
    });
  };

  return (
    <>
      <section className="timer-tab__main-card" aria-label="Session plan">
        <div className="timer-tab__clock">{activeSegment ? formatClock(activeSegment.remainingSeconds) : '00:00'}</div>
        <div className="timer-tab__progress-track" aria-hidden="true">
          <div className="timer-tab__progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
        <p className="timer-tab__meta">
          {activeSegment ? `${activeSegment.type === 'break' ? '☕ Break' : '🎯 Focus'} • ${activeSegment.label}` : 'No active segment'}
          {' • '}
          {sourceLabel}
        </p>
        <div className="timer-tab__analytics-list">
          <div className="timer-tab__analytics-item">
            <span className="timer-tab__analytics-source">Total planned</span>
            <span className="timer-tab__analytics-value">{formatClock(totalPlannedSeconds)}</span>
          </div>
          <div className="timer-tab__analytics-item">
            <span className="timer-tab__analytics-source">Focus planned</span>
            <span className="timer-tab__analytics-value">{formatClock(focusPlannedSeconds)}</span>
          </div>
        </div>
        <div className="timer-tab__controls">
          {plan.status === 'idle' && <button type="button" className="timer-tab__btn timer-tab__btn--primary" onClick={startPlan}>Start plan</button>}
          {plan.status === 'running' && <button type="button" className="timer-tab__btn timer-tab__btn--primary" onClick={pausePlan}>Pause</button>}
          {plan.status === 'paused' && <button type="button" className="timer-tab__btn timer-tab__btn--primary" onClick={resumePlan}>Resume</button>}
          {plan.status === 'completed' && <button type="button" className="timer-tab__btn timer-tab__btn--primary" onClick={resetPlan}>Run again</button>}
          {(plan.status === 'running' || plan.status === 'paused') && (
            <>
              <button type="button" className="timer-tab__btn" onClick={skipToNext}>Skip</button>
              <button type="button" className="timer-tab__btn" onClick={() => extendActive(5)}>+5 min</button>
              <button type="button" className="timer-tab__btn" onClick={resetPlan}>Reset</button>
            </>
          )}
        </div>
        {statusMessage && <p className="timer-tab__status">{statusMessage}</p>}
      </section>

      <section className="timer-tab__setup" aria-label="Session plan builder">
        <h3>Session plan builder</h3>
        <div className="timer-tab__field">
          <span>Quick templates</span>
          <div className="timer-tab__template-grid">
            {SESSION_PLAN_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="timer-tab__source-card"
                onClick={() => applyTemplate(template.id)}
                aria-label={`Apply ${template.name} template`}
              >
                <span className="timer-tab__source-title">{template.name}</span>
                <span className="timer-tab__source-description">{template.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="timer-tab__field">
          <span>Save current plan as template</span>
          <div className="timer-tab__field-row">
            <input
              className="timer-tab__input"
              value={customTemplateName}
              onChange={(event) => setCustomTemplateName(event.target.value)}
              placeholder="e.g. Evening study flow"
              aria-label="Custom template name"
            />
            <button type="button" className="timer-tab__btn" onClick={handleSaveCustomTemplate}>Save template</button>
          </div>
          {customTemplates.length > 0 && (
            <div className="timer-tab__template-grid">
              {customTemplates.map((template) => (
                <div key={template.id} className="timer-tab__source-card">
                  <button
                    type="button"
                    className="timer-tab__chip"
                    onClick={() => applyTemplate(template.id)}
                    aria-label={`Apply ${template.name} custom template`}
                  >
                    Apply {template.name}
                  </button>
                  <button
                    type="button"
                    className="timer-tab__saved-preset-remove"
                    onClick={() => handleDeleteCustomTemplate(template.id)}
                    aria-label={`Delete ${template.name} custom template`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="timer-tab__field-row timer-tab__field-row--wrap">
          <button type="button" className="timer-tab__btn" onClick={() => addSegment('focus')}>+ Focus task</button>
          <button type="button" className="timer-tab__btn" onClick={() => addSegment('break')}>+ Break</button>
          <label className="timer-tab__toggle">
            <input
              type="checkbox"
              checked={plan.autoStartNext}
              onChange={(event) => setPlan((current) => ({ ...current, autoStartNext: event.target.checked }))}
            />
            Auto-start next segment
          </label>
        </div>

        <div className="timer-tab__plan-list">
          {plan.segments.map((segment, index) => (
            <div key={segment.id} className={`timer-tab__plan-item ${index === plan.activeSegmentIndex ? 'timer-tab__plan-item--active' : ''}`}>
              <div className="timer-tab__plan-item-top">
                <strong>{index + 1}. {segment.type === 'break' ? 'Break' : 'Focus'}</strong>
                <small>{segment.status} • {formatClock(segment.remainingSeconds)} left</small>
              </div>
              <div className="timer-tab__field-row">
                <input
                  className="timer-tab__input"
                  value={segment.label}
                  onChange={(event) => updateSegment(segment.id, { label: event.target.value })}
                  placeholder={segment.type === 'break' ? 'Break label' : 'Task label'}
                />
                <input
                  className="timer-tab__input timer-tab__input--minutes"
                  inputMode="numeric"
                  value={segment.plannedMinutes}
                  onChange={(event) => {
                    const parsed = Number(event.target.value.replace(/[^0-9]/g, ''));
                    const minutes = Math.min(MAX_SEGMENT_MINUTES, Math.max(MIN_SEGMENT_MINUTES, Number.isFinite(parsed) ? parsed : 1));
                    updateSegment(segment.id, {
                      plannedMinutes: minutes,
                      plannedSeconds: minutes * 60,
                      remainingSeconds: segment.status === 'pending' || segment.status === 'running' ? minutes * 60 : segment.remainingSeconds,
                    });
                  }}
                  aria-label="Planned minutes"
                />
              </div>
              <input
                className="timer-tab__input"
                value={segment.notes}
                onChange={(event) => updateSegment(segment.id, { notes: event.target.value })}
                placeholder="Optional notes for this segment"
                aria-label={`Notes for ${segment.label || 'segment'}`}
              />
              {ENABLE_TIMER_DIAL && (
                <div className="timer-tab__dial-wrap">
                  <input
                    type="range"
                    min={MIN_SEGMENT_MINUTES}
                    max={MAX_SEGMENT_MINUTES}
                    step={1}
                    value={segment.plannedMinutes}
                    onChange={(event) => {
                      const minutes = Number(event.target.value);
                      updateSegment(segment.id, {
                        plannedMinutes: minutes,
                        plannedSeconds: minutes * 60,
                        remainingSeconds: segment.status === 'pending' || segment.status === 'running' ? minutes * 60 : segment.remainingSeconds,
                      });
                    }}
                    className="timer-tab__dial"
                    aria-label={`Dial minutes for ${segment.label || 'segment'}`}
                  />
                  <span className="timer-tab__dial-value">{segment.plannedMinutes}m</span>
                </div>
              )}
              <div className="timer-tab__duration-adjust">
                <button
                  type="button"
                  className="timer-tab__btn"
                  onClick={() => {
                    const minutes = Math.max(MIN_SEGMENT_MINUTES, segment.plannedMinutes - 1);
                    updateSegment(segment.id, {
                      plannedMinutes: minutes,
                      plannedSeconds: minutes * 60,
                      remainingSeconds: segment.status === 'pending' || segment.status === 'running' ? minutes * 60 : segment.remainingSeconds,
                    });
                  }}
                  aria-label={`Decrease ${segment.label || 'segment'} by one minute`}
                >
                  −1m
                </button>
                <input
                  type="range"
                  min={MIN_SEGMENT_MINUTES}
                  max={MAX_SEGMENT_MINUTES}
                  step={1}
                  value={segment.plannedMinutes}
                  onChange={(event) => {
                    const minutes = Number(event.target.value);
                    updateSegment(segment.id, {
                      plannedMinutes: minutes,
                      plannedSeconds: minutes * 60,
                      remainingSeconds: segment.status === 'pending' || segment.status === 'running' ? minutes * 60 : segment.remainingSeconds,
                    });
                  }}
                  className="timer-tab__range"
                  aria-label={`Planned minutes slider for ${segment.label || 'segment'}`}
                />
                <button
                  type="button"
                  className="timer-tab__btn"
                  onClick={() => {
                    const minutes = Math.min(MAX_SEGMENT_MINUTES, segment.plannedMinutes + 1);
                    updateSegment(segment.id, {
                      plannedMinutes: minutes,
                      plannedSeconds: minutes * 60,
                      remainingSeconds: segment.status === 'pending' || segment.status === 'running' ? minutes * 60 : segment.remainingSeconds,
                    });
                  }}
                  aria-label={`Increase ${segment.label || 'segment'} by one minute`}
                >
                  +1m
                </button>
              </div>
              <div className="timer-tab__field-row timer-tab__field-row--wrap">
                <button type="button" className="timer-tab__btn" onClick={() => moveSegment(index, -1)} disabled={index === 0}>↑</button>
                <button type="button" className="timer-tab__btn" onClick={() => moveSegment(index, 1)} disabled={index === plan.segments.length - 1}>↓</button>
                <button type="button" className="timer-tab__btn" onClick={() => duplicateSegment(segment.id)}>Duplicate</button>
                <button type="button" className="timer-tab__btn" onClick={() => removeSegment(segment.id)} disabled={plan.segments.length === 1}>Remove</button>
                <small>Actual: {formatClock(segment.actualSeconds)}</small>
              </div>
            </div>
          ))}
        </div>
      </section>


      <section className="timer-tab__setup" aria-label="Session plan history">
        <h3>Recent session history</h3>
        {sessionHistory.length > 0 ? (
          <>
            <div className="timer-tab__analytics-list">
              {sessionHistory.map((item) => (
                <div key={item.id} className="timer-tab__analytics-item">
                  <span className="timer-tab__analytics-source">
                    {new Date(item.completedAt).toLocaleDateString()} • {item.sourceLabel}
                  </span>
                  <span className="timer-tab__analytics-value">
                    {formatClock(item.actualFocusSeconds)} / {formatClock(item.plannedFocusSeconds)} • {item.completionRatio}%
                  </span>
                </div>
              ))}
            </div>
            <div className="timer-tab__field-row">
              <button type="button" className="timer-tab__btn" onClick={clearSessionHistory}>Clear history</button>
            </div>
          </>
        ) : (
          <small className="timer-tab__hint">Complete a session plan to build your recent history.</small>
        )}
      </section>

      {plan.status === 'completed' && (
        <section className="timer-tab__setup" aria-label="Session summary">
          <h3>Session summary</h3>
          <div className="timer-tab__analytics-list">
            <div className="timer-tab__analytics-item">
              <span className="timer-tab__analytics-source">Focus planned</span>
              <span className="timer-tab__analytics-value">{formatClock(focusPlannedSeconds)}</span>
            </div>
            <div className="timer-tab__analytics-item">
              <span className="timer-tab__analytics-source">Focus actual</span>
              <span className="timer-tab__analytics-value">{formatClock(focusActualSeconds)}</span>
            </div>
            <div className="timer-tab__analytics-item">
              <span className="timer-tab__analytics-source">Segment completion</span>
              <span className="timer-tab__analytics-value">{completionRatio}% ({completedSegments}/{plan.segments.length})</span>
            </div>
            <div className="timer-tab__analytics-item">
              <span className="timer-tab__analytics-source">Focus delta</span>
              <span className="timer-tab__analytics-value">
                {focusActualSeconds >= focusPlannedSeconds
                  ? `+${formatClock(focusActualSeconds - focusPlannedSeconds)} over plan`
                  : `-${formatClock(focusPlannedSeconds - focusActualSeconds)} under plan`}
              </span>
            </div>
          </div>
          <div className="timer-tab__field-row timer-tab__field-row--wrap">
            <button type="button" className="timer-tab__btn" onClick={handleCopySummary}>Copy summary</button>
          </div>
          <label className="timer-tab__field">
            Reflection note (optional)
            <textarea
              className="timer-tab__input timer-tab__input--textarea"
              value={plan.reflectionNote}
              onChange={(event) => setPlan((current) => ({ ...current, reflectionNote: event.target.value }))}
              placeholder="What worked well, and what would you improve next session?"
            />
          </label>
        </section>
      )}
    </>
  );
}
