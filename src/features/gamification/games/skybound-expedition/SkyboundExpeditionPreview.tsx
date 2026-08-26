import { useState } from 'react';
import SkyboundExpeditionMinigame from './SkyboundExpeditionMinigame';

/** Development-only in-memory flight lab. It never touches canonical event state. */
export default function SkyboundExpeditionPreview() {
  const [session, setSession] = useState(0);
  return (
    <SkyboundExpeditionMinigame
      key={session}
      islandNumber={1}
      onComplete={() => setSession((value) => value + 1)}
    />
  );
}
