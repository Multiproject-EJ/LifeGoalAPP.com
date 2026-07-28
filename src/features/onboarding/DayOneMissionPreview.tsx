import { useMemo } from 'react';
import { createDemoSession } from '../../services/demoSession';
import { IslandRunLifePromptCard } from '../gamification/level-worlds/components/IslandRunLifePromptCard';
import '../gamification/level-worlds/LevelWorlds.css';

export default function DayOneMissionPreview() {
  const session = useMemo(() => {
    const previewSession = createDemoSession();
    previewSession.user.user_metadata = {
      ...previewSession.user.user_metadata,
      journey_version: 1,
      journey_day: 1,
    };
    return previewSession;
  }, []);

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '18px',
        color: '#f3f8ff',
        background: 'radial-gradient(circle at 50% 10%, #17354a, #08121e 58%, #050a10)',
      }}
    >
      <section
        className="island-stop-modal"
        style={{ width: 'min(390px, 100%)', position: 'relative' }}
        aria-label="Day 1 island mission preview"
      >
        <IslandRunLifePromptCard
          session={session}
          islandNumber={1}
          forceDayOnePreview
          onComplete={() => undefined}
        />
      </section>
    </main>
  );
}
