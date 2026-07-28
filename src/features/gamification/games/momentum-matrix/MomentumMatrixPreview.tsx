import { useMemo, useRef } from 'react';
import {
  createEmptyMomentumMatrixProgress,
  createMomentumMatrixRun,
  placeMomentumMatrixPiece,
  settleMomentumMatrixRun,
  type MomentumMatrixProgressEntry,
} from '../../level-worlds/services/momentumMatrixGame';
import MomentumMatrixMinigame from './MomentumMatrixMinigame';

/**
 * Development-only phone preview used for visual and interaction QA.
 * This deliberately stays in memory and never touches the canonical store.
 */
export default function MomentumMatrixPreview() {
  const progressRef = useRef<MomentumMatrixProgressEntry>(createEmptyMomentumMatrixProgress(Date.now()));
  const ticketsRef = useRef(20);
  const launchConfig = useMemo(() => ({
    getTicketsRemaining: () => ticketsRef.current,
    requestStartRun: (missionDirection: 'focus' | 'energy' | 'reset') => {
      const activeRun = progressRef.current.activeRun;
      if (activeRun?.status === 'active') {
        return {
          ok: true,
          resumed: true,
          ticketsRemaining: ticketsRef.current,
          progress: progressRef.current,
        };
      }
      if (ticketsRef.current < 1) {
        return {
          ok: false,
          resumed: false,
          ticketsRemaining: ticketsRef.current,
          progress: progressRef.current,
          failureReason: 'insufficient_tickets',
        };
      }
      const nowMs = Date.now();
      ticketsRef.current -= 1;
      progressRef.current = {
        ...progressRef.current,
        activeRun: createMomentumMatrixRun({
          seed: 20260728 + progressRef.current.runsStarted,
          runId: `preview-${nowMs}`,
          missionDirection,
          nowMs,
        }),
        runsStarted: progressRef.current.runsStarted + 1,
        updatedAtMs: nowMs,
      };
      return {
        ok: true,
        resumed: false,
        ticketsRemaining: ticketsRef.current,
        progress: progressRef.current,
      };
    },
    requestPlacement: (trayIndex: number, row: number, column: number) => {
      const run = progressRef.current.activeRun;
      if (!run) {
        return {
          ok: false,
          ticketsRemaining: ticketsRef.current,
          progress: progressRef.current,
          placement: null,
          failureReason: 'run_missing',
        };
      }
      const placement = placeMomentumMatrixPiece({ run, trayIndex, row, column, nowMs: Date.now() });
      if (!placement.ok) {
        return {
          ok: false,
          ticketsRemaining: ticketsRef.current,
          progress: progressRef.current,
          placement,
          failureReason: placement.failureReason,
        };
      }
      progressRef.current = settleMomentumMatrixRun(progressRef.current, placement.run, Date.now());
      return {
        ok: true,
        ticketsRemaining: ticketsRef.current,
        progress: progressRef.current,
        placement,
      };
    },
  }), []);

  return (
    <MomentumMatrixMinigame
      islandNumber={1}
      launchConfig={launchConfig}
      onComplete={() => undefined}
    />
  );
}
