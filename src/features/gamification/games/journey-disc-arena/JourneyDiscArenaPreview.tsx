import JourneyDiscArenaMinigame from './JourneyDiscArenaMinigame';
import { createJourneyDiscArenaProgress } from '../../level-worlds/services/journeyDiscArenaProgression';

/** Development-only full-screen preview. It never reads or writes player data. */
export default function JourneyDiscArenaPreview() {
  const params = new URLSearchParams(window.location.search);
  const previewPoints = Number.parseInt(params.get('points') ?? '', 10);
  const previewTickets = Number.parseInt(params.get('tickets') ?? '', 10);
  const previewPhoneFrame = params.get('phone') === '1';
  const initialProgress = Number.isFinite(previewPoints) && previewPoints > 0
    ? { ...createJourneyDiscArenaProgress(0), eventPoints: previewPoints }
    : null;
  return <JourneyDiscArenaMinigame
    islandNumber={1}
    onComplete={() => undefined}
    launchConfig={{
      ...(initialProgress ? { initialProgress } : {}),
      ...(Number.isFinite(previewTickets) ? { initialTickets: Math.max(0, previewTickets) } : {}),
      ...(previewPhoneFrame ? { previewPhoneFrame: true } : {}),
    }}
  />;
}
