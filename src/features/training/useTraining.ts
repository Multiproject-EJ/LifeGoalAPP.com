// React hook for Training / Exercise feature
import { useState, useEffect, useCallback } from 'react';
import { getActiveSupabaseSession } from '../../lib/supabaseClient';
import type { ExerciseLog, TrainingStrategy, StrategyProgress, TodaySummary } from './types';
import * as trainingService from './trainingService';
import { calculateProgress } from './strategyEngine';

interface UseTrainingReturn {
  // Data
  logs: ExerciseLog[];
  strategies: TrainingStrategy[];
  strategyProgress: Map<string, StrategyProgress>;
  todaySummary: TodaySummary;
  
  // Loading state
  loading: boolean;
  
  // Actions
  addLog: (log: Omit<ExerciseLog, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  addStrategy: (strategy: Omit<TrainingStrategy, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  editStrategy: (id: string, updates: Partial<TrainingStrategy>) => Promise<void>;
  removeStrategy: (id: string) => Promise<void>;
  toggleStrategy: (id: string, isActive: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTraining(): UseTrainingReturn {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [strategies, setStrategies] = useState<TrainingStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  const session = getActiveSupabaseSession();
  const userId = session?.user?.id;

  // Load data on mount
  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [logsData, strategiesData] = await Promise.all([
        trainingService.fetchExerciseLogs(userId),
        trainingService.fetchStrategies(userId),
      ]);
      setLogs(logsData);
      setStrategies(strategiesData);
    } catch (error) {
      console.error('Error loading training data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate strategy progress
  const strategyProgress = new Map<string, StrategyProgress>();
  strategies.forEach((strategy) => {
    if (strategy.is_active) {
      const progress = calculateProgress(strategy, logs);
      strategyProgress.set(strategy.id, progress);
    }
  });

  // Calculate today's summary
  const todaySummary: TodaySummary = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      return logDate >= today && logDate < tomorrow;
    });

    return {
      totalExercises: todayLogs.length,
      totalReps: todayLogs.reduce(
        (sum, log) => sum + (log.reps || 0) * (log.sets || 1),
        0
      ),
      totalDuration: todayLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0),
    };
  })();

  // Add exercise log
  const addLog = useCallback(
    async (logData: Omit<ExerciseLog, 'id' | 'user_id' | 'created_at'>) => {
      if (!userId) return;

      const newLog = await trainingService.createExerciseLog({
        ...logData,
        user_id: userId,
      });
      setLogs((prev) => [newLog, ...prev]);
    },
    [userId]
  );

  // Remove exercise log
  const removeLog = useCallback(async (id: string) => {
    await trainingService.deleteExerciseLog(id);
    setLogs((prev) => prev.filter((log) => log.id !== id));
  }, []);

  // Add training strategy
  const addStrategy = useCallback(
    async (strategyData: Omit<TrainingStrategy, 'id' | 'user_id' | 'created_at'>) => {
      if (!userId) return;

      const newStrategy = await trainingService.createStrategy({
        ...strategyData,
        user_id: userId,
      });
      setStrategies((prev) => [newStrategy, ...prev]);
    },
    [userId]
  );

  // Edit training strategy
  const editStrategy = useCallback(
    async (id: string, updates: Partial<TrainingStrategy>) => {
      const updated = await trainingService.updateStrategy(id, updates);
      setStrategies((prev) =>
        prev.map((strategy) => (strategy.id === id ? updated : strategy))
      );
    },
    []
  );

  // Remove training strategy
  const removeStrategy = useCallback(async (id: string) => {
    await trainingService.deleteStrategy(id);
    setStrategies((prev) => prev.filter((strategy) => strategy.id !== id));
  }, []);

  // Toggle strategy active state
  const toggleStrategy = useCallback(async (id: string, isActive: boolean) => {
    const updated = await trainingService.toggleStrategyActive(id, isActive);
    setStrategies((prev) =>
      prev.map((strategy) => (strategy.id === id ? updated : strategy))
    );
  }, []);

  return {
    logs,
    strategies,
    strategyProgress,
    todaySummary,
    loading,
    addLog,
    removeLog,
    addStrategy,
    editStrategy,
    removeStrategy,
    toggleStrategy,
    refresh: loadData,
  };
}
