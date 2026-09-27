import { IslandRunVoyageMap } from './IslandRunVoyageMap';

/** Development-only preview: ?island=26&stops=2. */
export default function IslandRunVoyageMapPreview() {
  const params = new URLSearchParams(window.location.search);
  const island = Math.max(1, Math.min(120, Number(params.get('island')) || 26));
  const stops = Math.max(0, Math.min(5, Number(params.get('stops')) || 2));
  const completed = Array.from({ length: island - 1 }, (_, i) => i + 1);
  return (
    <IslandRunVoyageMap
      currentIslandNumber={island}
      currentIslandCompletedStopCount={stops}
      completedIslandNumbers={completed}
      visitedIslandNumbers={completed}
      onClose={() => undefined}
    />
  );
}
