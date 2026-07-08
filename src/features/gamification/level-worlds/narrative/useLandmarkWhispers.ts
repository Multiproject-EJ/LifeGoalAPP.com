import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiCoachDataAccess } from '../../../../types/aiCoach';
import type { LandmarkWhisperPayload, LandmarkWhisperStopId } from './landmarkWhispers';
import { buildArenaTransferWhisperFromRewardBundle, buildLandmarkWhisperForStop, consumeArenaTransferWhisperBundle } from './landmarkWhispers';
import { resolveWisdomKeeperAiWhisper, type WisdomKeeperAiContext, type WisdomKeeperAiGenerator } from './wisdomKeeperAi';

export interface UseLandmarkWhispersInput {
  activeStopId: string | null;
  hasHydratedRuntimeState: boolean;
  isNarrativeSurfaceBlocked: boolean;
  hasActiveEgg: boolean;
  isEggReady: boolean;
  hasHabitProgress: boolean;
  seed: string;
  userId?: string | null;
  wisdomKeeperAi?: {
    enabled: boolean;
    access: AiCoachDataAccess;
    context?: WisdomKeeperAiContext;
    generate?: WisdomKeeperAiGenerator;
  };
}

function isLandmarkWhisperStopId(value: string | null): value is LandmarkWhisperStopId {
  return value === 'hatchery' || value === 'habit' || value === 'mystery' || value === 'wisdom' || value === 'boss';
}

export function useLandmarkWhispers({
  activeStopId,
  hasHydratedRuntimeState,
  isNarrativeSurfaceBlocked,
  hasActiveEgg,
  isEggReady,
  hasHabitProgress,
  seed,
  userId = null,
  wisdomKeeperAi,
}: UseLandmarkWhispersInput) {
  const [activeWhisper, setActiveWhisper] = useState<LandmarkWhisperPayload | null>(null);
  const lastOpenKeyRef = useRef<string | null>(null);
  const activeWisdomAiRequestRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      lastOpenKeyRef.current = null;
      setActiveWhisper(null);
      return;
    }
    if (!isLandmarkWhisperStopId(activeStopId)) return;
    if (activeStopId === 'mystery' || activeStopId === 'boss') return;
    const openKey = `${seed}:${activeStopId}`;
    if (lastOpenKeyRef.current === openKey) return;
    if (isNarrativeSurfaceBlocked) return;
    lastOpenKeyRef.current = openKey;
    const whisper = buildLandmarkWhisperForStop(activeStopId, {
      hatchery: { hasActiveEgg, isEggReady },
      habit: { hasTodayProgress: hasHabitProgress },
      seed: openKey,
    });
    if (whisper) setActiveWhisper(whisper);

    if (activeStopId === 'wisdom' && wisdomKeeperAi?.enabled && wisdomKeeperAi.generate) {
      activeWisdomAiRequestRef.current = openKey;
      void resolveWisdomKeeperAiWhisper({
        aiEnabled: true,
        access: wisdomKeeperAi.access,
        context: wisdomKeeperAi.context,
        generate: wisdomKeeperAi.generate,
        seed: openKey,
      }).then((result) => {
        if (result.source !== 'ai') return;
        if (activeWisdomAiRequestRef.current !== openKey) return;
        setActiveWhisper((current) => {
          if (!current || current.keeperId !== 'wisdom') return current;
          return result.whisper;
        });
      }).catch(() => {
        // Resolver is fallback-first; keep the static Wisdom Keeper whisper on any late failure.
      });
    }
  }, [activeStopId, hasActiveEgg, hasHabitProgress, hasHydratedRuntimeState, isEggReady, isNarrativeSurfaceBlocked, seed, wisdomKeeperAi]);

  useEffect(() => {
    if (activeStopId !== 'wisdom') activeWisdomAiRequestRef.current = null;
  }, [activeStopId]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || isNarrativeSurfaceBlocked || activeWhisper || !userId) return;
    const bundle = consumeArenaTransferWhisperBundle(userId);
    if (!bundle) return;
    const whisper = buildArenaTransferWhisperFromRewardBundle(bundle, `${seed}:${bundle.id}`);
    if (whisper) setActiveWhisper(whisper);
  }, [activeWhisper, hasHydratedRuntimeState, isNarrativeSurfaceBlocked, seed, userId]);

  const handleWhisperDismiss = useCallback(() => {
    setActiveWhisper(null);
  }, []);

  return { activeWhisper, handleWhisperDismiss };
}
