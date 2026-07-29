import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { IslandRunLifePromptCard } from '../features/gamification/level-worlds/components/IslandRunLifePromptCard';
import type { HabitLandmarkChoice } from '../features/gamification/level-worlds/services/islandRunHabitLandmarkAction';
import '../features/gamification/level-worlds/LevelWorlds.css';

const PREVIEW_SESSION = {
  user: {
    id: 'habit-landmark-preview',
    user_metadata: { journey_day: 4 },
  },
} as unknown as Session;

const PREVIEW_HABITS: HabitLandmarkChoice[] = [
  {
    id: 'walk',
    title: 'Take a calm ten-minute walk',
    emoji: '🌿',
    type: 'duration',
    target_num: 10,
    target_unit: 'minutes',
    domain_key: 'health_fitness',
  },
  {
    id: 'breakfast',
    title: 'Prepare a balanced breakfast',
    emoji: '🥗',
    type: 'boolean',
    target_num: null,
    target_unit: null,
    domain_key: 'health_fitness',
  },
  {
    id: 'message',
    title: 'Send one kind message',
    emoji: '💬',
    type: 'quantity',
    target_num: 1,
    target_unit: 'message',
    domain_key: 'family_friends',
  },
  {
    id: 'focus',
    title: 'Finish one focused work block',
    emoji: '🧭',
    type: 'duration',
    target_num: 25,
    target_unit: 'minutes',
    domain_key: 'career_development',
  },
  {
    id: 'reset',
    title: 'Reset one small surface',
    emoji: '✨',
    type: 'boolean',
    target_num: null,
    target_unit: null,
    domain_key: 'living_spaces',
  },
  {
    id: 'journal',
    title: 'Write one honest sentence',
    emoji: '✍️',
    type: 'boolean',
    target_num: null,
    target_unit: null,
    domain_key: 'spirituality_community',
  },
];

export default function HabitLandmarkPreview() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
        background:
          'radial-gradient(circle at 50% 12%, rgba(52,211,153,.24), transparent 34%), linear-gradient(160deg, #0c3143, #061624 68%)',
      }}
    >
      <section
        className="island-stop-modal"
        style={{
          width: 'min(100%, 560px)',
          maxHeight: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
          padding: '1rem',
          border: '1px solid rgba(160,230,247,.34)',
          borderRadius: '24px',
          background: 'linear-gradient(160deg, rgba(13,42,58,.98), rgba(6,21,34,.98))',
          boxShadow: '0 28px 72px rgba(0,0,0,.48)',
          color: '#effcff',
        }}
      >
        <IslandRunLifePromptCard
          session={PREVIEW_SESSION}
          islandNumber={12}
          previewHabitChoices={PREVIEW_HABITS}
          onComplete={setMessage}
          onComeBackLater={() => setMessage('Come back later')}
        />
        {message ? <p role="status">{message}</p> : null}
      </section>
    </main>
  );
}
