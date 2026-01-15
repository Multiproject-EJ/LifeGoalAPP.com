import { useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useGamification } from '../../../hooks/useGamification';
import type { Action, ActionCategory } from '../../../types/actions';
import { ACTIONS_XP_REWARDS, getActionXpReward } from '../../../types/actions';

/**
 * Hook for awarding XP when actions are completed
 */
export function useActionXP(session: Session | null) {
  const { earnXP, recordActivity, levelUpEvent, dismissLevelUpEvent } = useGamification(session);

  /**
   * Award XP for completing an action based on its category
   */
  const awardActionXP = useCallback(async (action: Action): Promise<number> => {
    const xpReward = getActionXpReward(action.category);
    
    if (xpReward > 0) {
      await earnXP(xpReward, 'action_complete', action.id, `Completed: ${action.title}`);
      await recordActivity();
    }
    
    return xpReward;
  }, [earnXP, recordActivity]);

  /**
   * Award bonus XP when all MUST DO items are cleared
   */
  const awardClearAllMustDoBonus = useCallback(async (): Promise<number> => {
    const bonusXP = ACTIONS_XP_REWARDS.CLEAR_ALL_MUST_DO;
    
    await earnXP(
      bonusXP,
      'action_clear_must_do',
      undefined,
      'Cleared all MUST DO items!'
    );
    
    return bonusXP;
  }, [earnXP]);

  /**
   * Check if bonus should be awarded after completing a MUST DO action
   * Returns true if all remaining MUST DO items are completed
   */
  const shouldAwardClearBonus = useCallback((
    completedAction: Action,
    allActions: Action[]
  ): boolean => {
    if (completedAction.category !== 'must_do') {
      return false;
    }

    // Check if all other must_do items are completed
    const remainingMustDo = allActions.filter(
      (a) => a.category === 'must_do' && !a.completed && a.id !== completedAction.id
    );

    return remainingMustDo.length === 0;
  }, []);

  return {
    awardActionXP,
    awardClearAllMustDoBonus,
    shouldAwardClearBonus,
    levelUpEvent,
    dismissLevelUpEvent,
  };
}
