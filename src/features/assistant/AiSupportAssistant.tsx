import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

const MOMENTUM_RESET_SEQUENCE = [
  {
    title: 'Pause all goal pushes',
    detail:
      'Temporarily park goals in reflection-only mode so you can regroup without feeling behind.',
  },
  {
    title: 'Snooze habit streaks',
    detail:
      'Habits stay visible but stop the streak counter, signalling this is a reset window not a failure.',
  },
  {
    title: 'Choose one micro-habit',
    detail:
      'Design a single, friendly action that rebuilds confidence (ex: 5 minute walk, inbox zero, gratitude).',
  },
  {
    title: 'Restart with a win',
    detail:
      'After three consecutive days with the micro-habit, re-activate the rest of your system.',
  },
];

const STRATEGY_LIBRARY = [
  {
    id: 'momentum-reset',
    title: 'Momentum Reset',
    emoji: '🧭',
    description:
      'Use when life happens and you fall off the track. Pauses goals and rituals, then relaunches with a gentle daily win.',
    highlights: ['Pauses all goals', 'Pauses all habits', 'Creates one simple anchor habit'],
  },
  {
    id: 'vacation-mode',
    title: 'Vacation Mode',
    emoji: '🏖️',
    description:
      'Tell the assistant about upcoming travel or life events. It softens expectations, schedules a return buffer, and sets an intention.',
    highlights: ['Flexible schedule', 'Re-entry checklist', 'Automatic grace period'],
  },
  {
    id: 'goal-drafting',
    title: 'Goal Draft Partner',
    emoji: '✍️',
    description:
      'Guided prompts to fill out goal or habit fields. The assistant asks “why”, “how will it feel”, and “what is the next tiny action?”.',
    highlights: ['Clarify motivations', 'Spot missing success metrics', 'Suggest habit ideas'],
  },
  {
    id: 'future-forecast',
    title: 'Future Scenario Forecast',
    emoji: '🔮',
    description:
      'Projects likely outcomes based on your track record. Shows best, probable, and minimum wins so you can adjust expectations.',
    highlights: ['Evidence-based coaching', 'What-if comparisons', 'Keeps hopes grounded'],
  },
];

const VACATION_LENGTHS = {
  weekend: {
    label: 'Long weekend (3-4 days)',
    prep: 'wrap up critical tasks and mark "vacation" on shared calendars',
    returnBuffer: '1 day of inbox triage + light planning',
  },
  week: {
    label: 'Full week (5-7 days)',
    prep: 'share auto-replies and switch recurring tasks to standby mode',
    returnBuffer: '2 transition days with gentle routines',
  },
  sabbatical: {
    label: 'Extended reset (8+ days)',
    prep: 'close loops, communicate expectations, log core habits to revisit later',
    returnBuffer: '3 days of soft launch with limited commitments',
  },
} as const;

type VacationLength = keyof typeof VACATION_LENGTHS;

type ReturnEnergy = 'rested' | 'steady' | 'depleted';

type FocusArea = 'foundations' | 'creative' | 'relationships';

const RETURN_ENERGY_MAP: Record<ReturnEnergy, string> = {
  rested: 'Lean into ambitious goals, you are coming back with enthusiasm.',
  steady: 'Protect your mornings, let afternoons ramp slowly.',
  depleted: 'Focus on hydration, sleep, and 1 micro-habit before tackling anything big.',
};

const FOCUS_AREA_MAP: Record<FocusArea, { microHabit: string; reminder: string }> = {
  foundations: {
    microHabit: '10-minute grounding walk + hydration check-in',
    reminder: 'Foundational energy makes every other habit easier.',
  },
  creative: {
    microHabit: '5-minute idea dump or sketch before checking messages',
    reminder: 'Creative momentum thrives on tiny daily sparks.',
  },
  relationships: {
    microHabit: 'Send one thoughtful message or voice note each day',
    reminder: 'Re-connection removes guilt and boosts motivation fast.',
  },
};

const FUTURE_SCENARIOS = [
  {
    id: 'steady-progress',
    title: 'Steady 80% weeks',
    timeframe: 'Next 12 weeks',
    focus: 'Complete 4 habits per week and a weekly review',
    payoff: 'Expect 2 milestone wins and measurable habit streaks.',
  },
  {
    id: 'momentum-surge',
    title: 'Momentum Surge',
    timeframe: 'Next 30 days',
    focus: 'Use the anchor habit daily plus two flexible habits on weekdays.',
    payoff: 'Confidence spikes and you prime yourself for bigger pushes.',
  },
  {
    id: 'compassion-mode',
    title: 'Compassion Mode',
    timeframe: 'Next 14 days',
    focus: 'Log what derails you, celebrate any completion, skip judgment.',
    payoff: 'You learn how to prevent repeat dips and keep the lights on.',
  },
];

const REFLECTION_PROMPTS = [
  'When do you notice the earliest signs that a derailment is coming?',
  'What routines are most fragile during travel, illness, or busy seasons?',
  'Who can you notify (or ask for help) before the dip happens?',
  'What permission do you need to give yourself so resets feel intentional?',
];

interface AiSupportAssistantProps {
  session: Session | null;
}

export function AiSupportAssistant({ session }: AiSupportAssistantProps) {
  const [vacationLength, setVacationLength] = useState<VacationLength>('weekend');
  const [returnEnergy, setReturnEnergy] = useState<ReturnEnergy>('steady');
  const [focusArea, setFocusArea] = useState<FocusArea>('foundations');
  const [obstacleNote, setObstacleNote] = useState('');

  const displayName =
    (session?.user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'friend';

  const vacationPlan = useMemo(() => {
    const lengthConfig = VACATION_LENGTHS[vacationLength];
    const focusConfig = FOCUS_AREA_MAP[focusArea];
    const energyNote = RETURN_ENERGY_MAP[returnEnergy];

    return {
      prep: lengthConfig.prep,
      during: `${lengthConfig.label} • Keep only the anchor habit + daily reflection photo.`,
      returnBuffer: lengthConfig.returnBuffer,
      anchorHabit: focusConfig.microHabit,
      reminder: `${energyNote} ${focusConfig.reminder}`,
    };
  }, [vacationLength, focusArea, returnEnergy]);

  const reflectionInsight = useMemo(() => {
    const note = obstacleNote.trim().toLowerCase();
    if (!note) {
      return 'Describe a derailment (ex: vacation, illness, busy launch). The assistant will surface pattern notes.';
    }
    if (note.includes('travel') || note.includes('vacation')) {
      return 'Consider activating Vacation Mode 48 hours before departure so the pause feels proactive.';
    }
    if (note.includes('sick') || note.includes('ill') || note.includes('health')) {
      return 'Health setbacks crave extra sleep + hydration. Keep only the micro-habit until your energy score is back.';
    }
    if (note.includes('work') || note.includes('deadline')) {
      return 'High-pressure work cycles respond well to “companion habits” like inbox triage + 5 deep breaths before meetings.';
    }
    return 'Notice what triggered the drop and capture the first signal you can act on sooner next time.';
  }, [obstacleNote]);

  return (
    <section className="ai-assistant">
      <div className="ai-assistant__hero">
        <p className="ai-assistant__eyebrow">AI strategy beta</p>
        <h2>Adaptive assistant for real-life detours</h2>
        <p>
          Hi {displayName}! This tab contains pre-built coaching sequences the assistant can pull
          depending on what life throws at you. Use it to pause, reset, or imagine what success looks
          like before you start typing in your goals and habits.
        </p>
      </div>

      <div className="ai-assistant__grid">
        {STRATEGY_LIBRARY.map((strategy) => (
          <article key={strategy.id} className="ai-assistant__card">
            <header className="ai-assistant__card-header">
              <span className="ai-assistant__card-emoji" aria-hidden="true">
                {strategy.emoji}
              </span>
              <div>
                <h3>{strategy.title}</h3>
                <p>{strategy.description}</p>
              </div>
            </header>
            <ul>
              {strategy.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="ai-assistant__panel">
        <div>
          <h3>Momentum reset playbook</h3>
          <p>Use the four-step sequence the moment you fall off the track.</p>
        </div>
        <ol className="ai-assistant__sequence">
          {MOMENTUM_RESET_SEQUENCE.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="ai-assistant__panel">
        <div>
          <h3>Vacation mode planner</h3>
          <p>
            Tell the assistant how long you will unplug, how you expect to feel, and where you want
            an easy win. It designs the buffer and daily anchor.
          </p>
        </div>
        <div className="ai-assistant__planner">
          <label>
            Trip length
            <select value={vacationLength} onChange={(event) => setVacationLength(event.target.value as VacationLength)}>
              {Object.entries(VACATION_LENGTHS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Energy on return
            <select value={returnEnergy} onChange={(event) => setReturnEnergy(event.target.value as ReturnEnergy)}>
              <option value="rested">Rested and excited</option>
              <option value="steady">Calm but realistic</option>
              <option value="depleted">Tired or jet-lagged</option>
            </select>
          </label>
          <label>
            Anchor focus
            <select value={focusArea} onChange={(event) => setFocusArea(event.target.value as FocusArea)}>
              <option value="foundations">Energy foundations</option>
              <option value="creative">Creative confidence</option>
              <option value="relationships">Relationships</option>
            </select>
          </label>
        </div>
        <div className="ai-assistant__plan">
          <p>
            <strong>Prep:</strong> {vacationPlan.prep}
          </p>
          <p>
            <strong>During:</strong> {vacationPlan.during}
          </p>
          <p>
            <strong>Return buffer:</strong> {vacationPlan.returnBuffer}
          </p>
          <p>
            <strong>Anchor habit:</strong> {vacationPlan.anchorHabit}
          </p>
          <p>{vacationPlan.reminder}</p>
        </div>
      </section>

      <section className="ai-assistant__panel">
        <div>
          <h3>Reflection log</h3>
          <p>Capture what tends to make you slip so the assistant can spot the next pattern.</p>
        </div>
        <textarea
          placeholder="Example: Whenever I travel I lose my morning routine and then dread restarting."
          value={obstacleNote}
          onChange={(event) => setObstacleNote(event.target.value)}
        />
        <p className="ai-assistant__insight">{reflectionInsight}</p>
        <ul className="ai-assistant__prompts">
          {REFLECTION_PROMPTS.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
      </section>

      <section className="ai-assistant__panel">
        <div>
          <h3>Future scenario preview</h3>
          <p>Quick glimpses of what the next stretch might feel like depending on the strategy.</p>
        </div>
        <div className="ai-assistant__scenarios">
          {FUTURE_SCENARIOS.map((scenario) => (
            <article key={scenario.id}>
              <h4>{scenario.title}</h4>
              <p className="ai-assistant__scenario-meta">{scenario.timeframe}</p>
              <p>{scenario.focus}</p>
              <p className="ai-assistant__scenario-payoff">{scenario.payoff}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
