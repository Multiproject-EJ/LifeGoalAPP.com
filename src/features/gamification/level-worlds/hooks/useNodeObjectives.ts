// useNodeObjectives Hook
// Map node objectives to real user data

import { useMemo, useCallback } from 'react';
import type { WorldNode, NodeObjective } from '../types/levelWorlds';

// This hook will integrate with actual user data services
// For Phase 1, we'll provide basic structure and validation

export function useNodeObjectives(userId: string) {
  // Check if a habit node objective is complete
  const checkHabitObjective = useCallback(async (objective: NodeObjective): Promise<boolean> => {
    if (objective.type !== 'habit') return false;
    
    // TODO: Phase 2 - Check actual habit completion status
    // For now, we'll return false to require manual completion
    console.log('Checking habit objective:', objective);
    return false;
  }, [userId]);

  // Check if a goal node objective is complete
  const checkGoalObjective = useCallback(async (objective: NodeObjective): Promise<boolean> => {
    if (objective.type !== 'goal') return false;
    
    // TODO: Phase 2 - Check actual goal progress
    console.log('Checking goal objective:', objective);
    return false;
  }, [userId]);

  // Check if a journal node objective is complete
  const checkJournalObjective = useCallback(async (objective: NodeObjective): Promise<boolean> => {
    if (objective.type !== 'journal') return false;
    
    // TODO: Phase 2 - Check if journal entry exists for today
    console.log('Checking journal objective:', objective);
    return false;
  }, [userId]);

  // Check if a personality node objective is complete
  const checkPersonalityObjective = useCallback(async (objective: NodeObjective): Promise<boolean> => {
    if (objective.type !== 'personality') return false;
    
    // TODO: Phase 2 - Check personality test completion
    console.log('Checking personality objective:', objective);
    return false;
  }, [userId]);

  // Get detailed description for objective
  const getObjectiveDescription = useCallback((objective: NodeObjective): string => {
    switch (objective.type) {
      case 'mini_game':
        return `Play ${formatMiniGameName(objective.game)}`;
      
      case 'habit':
        if (objective.specificHabitId) {
          return `Complete a specific habit`;
        }
        return `Complete ${objective.habitCount} ${objective.habitCount === 1 ? 'habit' : 'habits'} today`;
      
      case 'goal':
        if (objective.goalId) {
          return `Make progress on your goal`;
        }
        return `Work on any of your goals`;
      
      case 'personality':
        return objective.testType === 'micro_test' 
          ? 'Complete a personality micro-test' 
          : 'Reflect on your personality';
      
      case 'journal':
        switch (objective.journalType) {
          case 'entry':
            return 'Write a journal entry';
          case 'checkin':
            return 'Complete a check-in';
          case 'intentions':
            return 'Set your intentions';
          default:
            return 'Complete a journal activity';
        }
      
      case 'boss':
        return 'Complete the boss challenge';
      
      default:
        return 'Complete this objective';
    }
  }, []);

  // Get action button text for objective
  const getObjectiveActionText = useCallback((objective: NodeObjective): string => {
    switch (objective.type) {
      case 'mini_game':
        return 'Play Game';
      case 'habit':
        return 'View Habits';
      case 'goal':
        return 'View Goals';
      case 'personality':
        return 'Start Test';
      case 'journal':
        return 'Open Journal';
      case 'boss':
        return 'Start Challenge';
      default:
        return 'Start';
    }
  }, []);

  return {
    checkHabitObjective,
    checkGoalObjective,
    checkJournalObjective,
    checkPersonalityObjective,
    getObjectiveDescription,
    getObjectiveActionText
  };
}

// Helper to format mini-game names
function formatMiniGameName(game: string): string {
  switch (game) {
    case 'task_tower':
      return 'Task Tower';
    case 'pomodoro_sprint':
      return 'Pomodoro Sprint';
    case 'vision_quest':
      return 'Vision Quest';
    case 'wheel_of_wins':
      return 'Wheel of Wins';
    default:
      return game;
  }
}
