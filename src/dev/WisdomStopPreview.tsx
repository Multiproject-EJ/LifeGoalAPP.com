import { lazy, Suspense, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { WisdomCaretakerCompassEncounter } from '../features/gamification/level-worlds/components/WisdomCaretakerCompassEncounter';
import '../features/gamification/level-worlds/LevelWorlds.css';
import '../features/gamification/level-worlds/dev/IslandTemplateKitPage.css';

const IslandThreeScene = lazy(() => import('../features/gamification/level-worlds/dev/Island5ThreePilot'));

const PREVIEW_SESSION = {
  user: {
    id: 'wisdom-caretaker-preview',
    user_metadata: { journey_day: 4 },
  },
} as unknown as Session;

export default function WisdomStopPreview() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <main className="wisdom-stop-preview">
      <div className="wisdom-stop-preview__world" aria-hidden="true">
        <Suspense fallback={<div className="wisdom-stop-preview__world-loading">Opening Island 001…</div>}>
          <IslandThreeScene
            islandNumber={1}
            worldSourceNumber={1}
            buildLevel={3}
            presentation="embedded"
            qualityOverride="high"
            caretakerEncounterOpen
            interactionPaused
          />
        </Suspense>
      </div>
      <section className="island-stop-modal wisdom-stop-preview__modal">
        <WisdomCaretakerCompassEncounter
          session={PREVIEW_SESSION}
          islandNumber={1}
          previewMode
          onComplete={setMessage}
          onComeBackLater={() => setMessage('Come back later')}
        />
        {message ? (
          <div className="wisdom-stop-preview__message" role="status">
            <span aria-hidden="true">✦</span>
            <p>{message}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
