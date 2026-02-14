// useLevelWorlds Hook
// Main hook for Level Worlds state management

import { useState, useCallback, useEffect } from 'react';
import type { LevelWorldsState, WorldBoard, WorldNode } from '../types/levelWorlds';
import {
  loadState,
  saveState,
  getCurrentBoard,
  completeNode as completeNodeState,
  completeBoard as completeBoardState,
  isBoardComplete
} from '../services/levelWorldsState';
import { awardNodeReward, awardBoardCompletionReward } from '../services/levelWorldsRewards';

export function useLevelWorlds(userId: string) {
  const [state, setState] = useState<LevelWorldsState>(() => loadState(userId));
  const [isLoading, setIsLoading] = useState(false);

  // Get current board
  const currentBoard = getCurrentBoard(state);

  // Refresh state from localStorage
  const refreshState = useCallback(() => {
    const newState = loadState(userId);
    setState(newState);
  }, [userId]);

  // Complete a node
  const completeNode = useCallback(async (boardId: string, nodeId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Find the node to get its reward
      const board = state.boards.find(b => b.id === boardId);
      const node = board?.nodes.find(n => n.id === nodeId);
      
      if (!node || node.status !== 'active') {
        console.warn('Cannot complete node:', nodeId);
        setIsLoading(false);
        return;
      }
      
      // Award node reward
      await awardNodeReward(userId, node.nodeReward);
      
      // Update state
      const newState = completeNodeState(state, boardId, nodeId);
      setState(newState);
      
      // Check if board is complete
      const updatedBoard = newState.boards.find(b => b.id === boardId);
      if (updatedBoard && isBoardComplete(updatedBoard)) {
        // Auto-complete the board
        await completeBoard(boardId);
      }
    } catch (error) {
      console.error('Error completing node:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, state, isLoading]);

  // Complete a board
  const completeBoard = useCallback(async (boardId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const board = state.boards.find(b => b.id === boardId);
      
      if (!board) {
        console.error('Board not found:', boardId);
        setIsLoading(false);
        return;
      }
      
      if (!isBoardComplete(board)) {
        console.warn('Cannot complete board with incomplete nodes:', boardId);
        setIsLoading(false);
        return;
      }
      
      // Award board completion reward
      await awardBoardCompletionReward(userId, board.completionReward, board.level);
      
      // Update state and generate next board
      const newState = completeBoardState(state, boardId);
      setState(newState);
      
      return newState.boards.find(b => b.level === board.level + 1); // Return next board
    } catch (error) {
      console.error('Error completing board:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, state, isLoading]);

  return {
    state,
    currentBoard,
    isLoading,
    refreshState,
    completeNode,
    completeBoard
  };
}
