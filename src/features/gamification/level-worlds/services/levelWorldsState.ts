// Level Worlds State Management Service
// Handles localStorage persistence and state operations

import type { LevelWorldsState, WorldBoard } from '../types/levelWorlds';
import { generateBoard } from './levelWorldsGenerator';

const STORAGE_KEY_PREFIX = 'levelWorlds_';

/**
 * Load Level Worlds state from localStorage
 * Initializes with first board if no state exists
 */
export function loadState(userId: string): LevelWorldsState {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      const state = JSON.parse(stored) as LevelWorldsState;
      return state;
    }
    
    // Initialize with first board
    return initializeFirstBoard(userId);
  } catch (error) {
    console.error('Error loading Level Worlds state:', error);
    return initializeFirstBoard(userId);
  }
}

/**
 * Save Level Worlds state to localStorage
 */
export function saveState(userId: string, state: LevelWorldsState): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving Level Worlds state:', error);
  }
}

/**
 * Initialize a new Level Worlds state with the first board
 */
export function initializeFirstBoard(userId: string): LevelWorldsState {
  const firstBoard = generateBoard(1, userId);
  
  const state: LevelWorldsState = {
    userId,
    currentBoardLevel: 1,
    boards: [firstBoard],
    totalBoardsCompleted: 0,
    lastPlayedAt: new Date().toISOString()
  };
  
  saveState(userId, state);
  return state;
}

/**
 * Get the current active board
 */
export function getCurrentBoard(state: LevelWorldsState): WorldBoard | undefined {
  return state.boards.find(board => board.level === state.currentBoardLevel);
}

/**
 * Complete a node and unlock the next one
 */
export function completeNode(
  state: LevelWorldsState,
  boardId: string,
  nodeId: string
): LevelWorldsState {
  const newState = { ...state };
  const board = newState.boards.find(b => b.id === boardId);
  
  if (!board) {
    console.error('Board not found:', boardId);
    return state;
  }
  
  const node = board.nodes.find(n => n.id === nodeId);
  
  if (!node) {
    console.error('Node not found:', nodeId);
    return state;
  }
  
  if (node.status !== 'active') {
    console.warn('Cannot complete non-active node:', nodeId);
    return state;
  }
  
  // Mark current node as completed
  node.status = 'completed';
  node.completedAt = new Date().toISOString();
  
  // Unlock next node if exists
  const nextNodeIndex = node.index + 1;
  const nextNode = board.nodes.find(n => n.index === nextNodeIndex);
  
  if (nextNode && nextNode.status === 'locked') {
    nextNode.status = 'active';
  }
  
  newState.lastPlayedAt = new Date().toISOString();
  saveState(state.userId, newState);
  
  return newState;
}

/**
 * Check if all nodes on a board are completed
 */
export function isBoardComplete(board: WorldBoard): boolean {
  return board.nodes.every(node => node.status === 'completed');
}

/**
 * Complete a board and generate the next one
 */
export function completeBoard(state: LevelWorldsState, boardId: string): LevelWorldsState {
  const newState = { ...state };
  const board = newState.boards.find(b => b.id === boardId);
  
  if (!board) {
    console.error('Board not found:', boardId);
    return state;
  }
  
  if (!isBoardComplete(board)) {
    console.warn('Cannot complete board with incomplete nodes:', boardId);
    return state;
  }
  
  // Mark board as completed
  board.status = 'completed';
  board.completedAt = new Date().toISOString();
  newState.totalBoardsCompleted += 1;
  
  // Generate next board
  const nextLevel = board.level + 1;
  const nextBoard = generateBoard(nextLevel, state.userId);
  newState.boards.push(nextBoard);
  newState.currentBoardLevel = nextLevel;
  
  newState.lastPlayedAt = new Date().toISOString();
  saveState(state.userId, newState);
  
  return newState;
}

/**
 * Reset Level Worlds state (for testing or user reset)
 */
export function resetState(userId: string): LevelWorldsState {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  localStorage.removeItem(key);
  return initializeFirstBoard(userId);
}
