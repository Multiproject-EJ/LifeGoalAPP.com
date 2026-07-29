import { useState } from 'react';

import { WisdomTreeCardEncounter } from '../features/gamification/level-worlds/components/WisdomTreeCardEncounter';
import { WISDOM_TREE_CARDS } from '../features/gamification/level-worlds/services/wisdomTreeCards';
import '../features/gamification/level-worlds/LevelWorlds.css';

export default function WisdomStopPreview() {
  const [message, setMessage] = useState<string | null>(null);
  const card = WISDOM_TREE_CARDS.find((entry) => entry.id === 'hearth-soft-corner')
    ?? WISDOM_TREE_CARDS[0];

  if (!card) return null;

  return (
    <main className="wisdom-stop-preview">
      <section className="island-stop-modal wisdom-stop-preview__modal">
        <WisdomTreeCardEncounter card={card} islandNumber={12} onComplete={setMessage} />
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
