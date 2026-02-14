// useWorldProgress Hook
// Track progress across all boards

import { useMemo } from 'react';
import type { LevelWorldsState, WorldBoard } from '../types/levelWorlds';

export function useWorldProgress(state: LevelWorldsState) {
  // Calculate progress statistics
  const progress = useMemo(() => {
    const totalBoards = state.boards.length;
    const completedBoards = state.totalBoardsCompleted;
    const currentBoard = state.boards.find(b => b.level === state.currentBoardLevel);
    
    let completedNodes = 0;
    let totalNodes = 0;
    
    if (currentBoard) {
      totalNodes = currentBoard.nodes.length;
      completedNodes = currentBoard.nodes.filter(n => n.status === 'completed').length;
    }
    
    const currentBoardProgress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;
    
    return {
      totalBoards,
      completedBoards,
      currentBoardLevel: state.currentBoardLevel,
      currentBoardProgress,
      completedNodes,
      totalNodesInCurrentBoard: totalNodes,
      lastPlayedAt: state.lastPlayedAt
    };
  }, [state]);

  // Get all completed boards
  const completedBoardsList = useMemo(() => {
    return state.boards.filter(b => b.status === 'completed');
  }, [state.boards]);

  // Check if a specific board is unlocked
  const isBoardUnlocked = (level: number): boolean => {
    return level <= state.currentBoardLevel;
  };

  return {
    progress,
    completedBoardsList,
    isBoardUnlocked
  };
}
