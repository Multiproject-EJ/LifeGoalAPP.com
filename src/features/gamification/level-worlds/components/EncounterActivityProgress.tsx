import type { EncounterChallenge } from '../services/encounterService';
import { ActivityProgress } from './ActivityProgress';

/** Read-only projection of the existing encounter flow; never grants a reward. */
export function EncounterActivityProgress({ challenge, complete, secondsLeft, taps, response }: {
  challenge: EncounterChallenge; complete: boolean; secondsLeft: number; taps: number; response: string;
}) {
  let total = 1;
  let completed = complete ? 1 : 0;
  let unit = challenge.type === 'focus' ? 'action' : 'answer';
  if (challenge.type === 'breathing') {
    total = challenge.durationSeconds;
    completed = complete ? total : total - Math.max(0, secondsLeft);
    unit = 'second';
  } else if (challenge.type === 'tap') {
    total = challenge.tapsRequired;
    completed = complete ? total : taps;
    unit = 'tap';
  } else if (challenge.type === 'gratitude' && response.trim()) {
    completed = 1; // A filled draft is ready to submit, not saved/completed.
  }
  return <ActivityProgress completed={completed} total={total} unit={unit} saved={complete}
    readyLabel={challenge.type === 'breathing' ? 'Finishing exercise…' : 'Ready to submit'} />;
}
