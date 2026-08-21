import { CompassBookScreen } from '../components/CompassBookScreen';
import { DEMO_ISLAND_NUMBER } from '../content/demoBook';
import { CompassBookDeviceProfiler } from './CompassBookDeviceProfiler';
import '../../../index.css';

/**
 * Internal-only native/LAN profiler route. It mounts the same production
 * CompassBookScreen and CompassBookThreeShell used by players, with demo data
 * and no account or gameplay writes.
 */
export default function CompassBookDeviceProfilerRoute() {
  return (
    <main className="compass-book-device-profiler-route">
      <CompassBookScreen
        currentIslandNumber={DEMO_ISLAND_NUMBER}
        session={null}
        initialChapterId="ikigai_map"
        presentationContext="island_run"
        initialPresentationMode="3d"
        allowDemo
        initialDemo
        onClose={() => undefined}
      />
      <CompassBookDeviceProfiler />
    </main>
  );
}
