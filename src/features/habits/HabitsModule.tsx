import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';

type HabitsModuleProps = {
  session: Session;
};

const FEATURE_CARDS = [
  {
    emoji: '🧙',
    title: '3-step wizard',
    description: 'Capture basics, schedule, and reminders in a streamlined flow.',
  },
  {
    emoji: '📋',
    title: 'Curated templates',
    description: 'Jumpstart with prebuilt routines for meditation, hydration, focus, and more.',
  },
  {
    emoji: '✅',
    title: 'Smart tracking',
    description: 'Support boolean, quantity, and duration habits with streak awareness.',
  },
  {
    emoji: '🔥',
    title: 'Insights & streaks',
    description: 'Visualize 31-day heatmaps, rolling success rates, and best streaks.',
  },
  {
    emoji: '🔔',
    title: 'Web push reminders',
    description: 'Send contextual nudges with quick complete/skip actions.',
  },
  {
    emoji: '🏆',
    title: 'Challenges',
    description: 'Invite friends, compete on leaderboards, and share progress.',
  },
  {
    emoji: '📈',
    title: 'Auto-progression',
    description: 'Automate difficulty adjustments after sustaining success rates.',
  },
  {
    emoji: '💾',
    title: 'Offline support',
    description: 'Queue habit logs offline and sync them instantly when you reconnect.',
  },
];

const NEXT_STEPS = [
  {
    title: 'Run SQL migrations',
    detail: 'Execute 0001-0003 in supabase/migrations to create habits tables and triggers.',
  },
  {
    title: 'Generate VAPID keys',
    detail: 'Run `npx web-push generate-vapid-keys` and store keys in Supabase plus .env.',
  },
  {
    title: 'Deploy edge functions',
    detail: 'Publish `send-reminders` and `auto-progression` to orchestrate push delivery.',
  },
  {
    title: 'Load optional demo data',
    detail: 'Populate sample habits via supabase/migrations/demo_data.sql after replacing YOUR_USER_ID_HERE.',
  },
];

const RESOURCE_LINKS = [
  {
    href: '/supabase/functions/send-reminders.ts',
    title: 'Edge function • send-reminders',
    description: 'Schedules push notifications for habits due today.',
  },
  {
    href: '/supabase/functions/auto-progression.ts',
    title: 'Edge function • auto-progression',
    description: 'Increments targets when streak and success metrics are met.',
  },
  {
    href: '/supabase/migrations',
    title: 'SQL migrations',
    description: 'Review schema definitions for habits, logs, and challenges.',
  },
  {
    href: '/app/habits/README.md',
    title: 'Habits module README',
    description: 'Integration notes, architecture decisions, and customization tips.',
  },
];

export function HabitsModule({ session: _session }: HabitsModuleProps) {
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <section className="habits-module card glass" data-draggable draggable="true">
      <header className="habits-module__hero">
        <div>
          <span className="habits-module__badge">Habits workspace</span>
          <h2>Comprehensive habits system</h2>
          <p>
            Install the vanilla module or port it to React to unlock habit templates, auto-progression, and real-time
            insights across your teams.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost habits-module__toggle"
          onClick={() => setShowInstructions((value) => !value)}
        >
          {showInstructions ? 'Hide setup checklist' : 'Show setup checklist'}
        </button>
      </header>

      {showInstructions && (
        <div className="habits-module__panel card glass">
          <div className="habits-module__panel-header">
            <h3>Start here</h3>
            <p>
              The habits module ships with database migrations, web push edge functions, and a full vanilla implementation in
              <code>/app/habits/</code>.
            </p>
          </div>
          <ol className="habits-module__steps">
            {NEXT_STEPS.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </li>
            ))}
          </ol>
          <p className="habits-module__note">
            Documentation lives in <code>/app/habits/README.md</code> with architecture diagrams and API contracts.
          </p>
        </div>
      )}

      <div className="habits-module__features grid">
        {FEATURE_CARDS.map((feature) => (
          <article key={feature.title} className="card glass habits-module__feature" data-draggable="false">
            <header className="habits-module__feature-header">
              <span className="habits-module__feature-emoji" aria-hidden>
                {feature.emoji}
              </span>
              <h4>{feature.title}</h4>
            </header>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>

      <div className="habits-module__callouts">
        <section className="card glass habits-module__callout">
          <h3>Implementation status</h3>
          <p>
            The vanilla module is production ready. Integrate it by serving <code>/app/habits/</code> on its own route or
            gradually port the components into React for native rendering.
          </p>
          <ul>
            <li>Option 1: mount the vanilla bundle at <code>/habits</code> for an instant preview.</li>
            <li>Option 2: port UI and state machines to React for long-term maintainability.</li>
          </ul>
        </section>
        <section className="card glass habits-module__callout">
          <h3>Integration quick wins</h3>
          <ul>
            <li>Add a link from the dashboard to launch the habits workspace.</li>
            <li>Pipe habit log events into the Progress dashboard for streak analytics.</li>
            <li>Share notification preferences with the push reminder edge functions.</li>
          </ul>
        </section>
      </div>

      <div className="habits-module__resources">
        <h3>Key resources</h3>
        <div className="habits-module__links">
          {RESOURCE_LINKS.map((link) => (
            <a key={link.title} className="habits-module__link card glass" href={link.href} target="_blank" rel="noreferrer">
              <strong>{link.title}</strong>
              <p>{link.description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
