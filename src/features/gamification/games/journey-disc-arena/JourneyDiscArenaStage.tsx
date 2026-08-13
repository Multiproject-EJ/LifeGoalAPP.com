import { useEffect, useRef } from 'react';
import type { JourneyDiscArenaPreviewSnapshot } from './JourneyDiscArenaPreviewController';
import { JourneyDiscArenaThreeScene } from './JourneyDiscArenaThreeScene';

export default function JourneyDiscArenaStage({ snapshot }: { snapshot: JourneyDiscArenaPreviewSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<JourneyDiscArenaThreeScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const scene = new JourneyDiscArenaThreeScene(canvasRef.current);
    sceneRef.current = scene;
    scene.update(snapshot);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // One WebGL renderer per mount. Snapshot updates flow through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.update(snapshot);
  }, [snapshot]);

  return <canvas ref={canvasRef} className="journey-disc-arena__canvas" aria-label="3D Journey Disc battle arena" />;
}

