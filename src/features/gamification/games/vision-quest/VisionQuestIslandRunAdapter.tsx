import { useEffect } from 'react';
import { useSupabaseAuth } from '../../../auth/SupabaseAuthProvider';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import { VisionQuest } from './VisionQuest';

export function VisionQuestIslandRunAdapter({ onComplete }: IslandRunMinigameProps) {
  const { session } = useSupabaseAuth();

  useEffect(() => {
    if (!session) onComplete({ completed: false });
  }, [onComplete, session]);

  if (!session) return null;

  return (
    <VisionQuest
      session={session}
      rewardContext="island_run_landmark"
      onClose={() => onComplete({ completed: false })}
      onComplete={(rewards) => {
        onComplete({
          completed: true,
          reward: {
            dice: rewards.dice,
          },
        });
      }}
    />
  );
}
