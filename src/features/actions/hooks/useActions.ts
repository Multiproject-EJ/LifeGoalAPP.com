import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Action, ActionCategory, CreateActionInput, UpdateActionInput } from '../../../types/actions';
import {
  fetchActiveActions,
  insertAction,
  updateAction as updateActionService,
  deleteAction as deleteActionService,
  completeAction as completeActionService,
  reorderActions as reorderActionsService,
} from '../../../services/actions';
import { DEMO_USER_ID } from '../../../services/demoData';
export function useActions(session: Session | null) {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id ?? DEMO_USER_ID;

  const loadActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await fetchActiveActions();
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setActions(data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load actions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const createAction = useCallback(async (input: CreateActionInput): Promise<void> => {
    try {
      const { data, error: insertError } = await insertAction(userId, input);
      if (insertError) {
        throw new Error(insertError.message);
      }
      if (data) {
        setActions((prev) => [...prev, data]);
      }
    } catch (err) {
      throw err;
    }
  }, [userId]);

  const updateAction = useCallback(async (id: string, input: UpdateActionInput): Promise<void> => {
    try {
      const { data, error: updateError } = await updateActionService(id, input);
      if (updateError) {
        throw new Error(updateError.message);
      }
      if (data) {
        setActions((prev) => prev.map((a) => (a.id === id ? data : a)));
      }
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteAction = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await deleteActionService(id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
      setActions((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  const completeAction = useCallback(async (id: string, xpAwarded: number = 0): Promise<Action | null> => {
    try {
      const { data, error: completeError } = await completeActionService(id, xpAwarded);
      if (completeError) {
        throw new Error(completeError.message);
      }
      if (data) {
        setActions((prev) => prev.map((a) => (a.id === id ? data : a)));
        return data;
      }
      return null;
    } catch (err) {
      throw err;
    }
  }, []);

  const reorderActionsByCategory = useCallback(async (category: ActionCategory, orderedIds: string[]): Promise<void> => {
    const idsInOrder = orderedIds.filter(Boolean);
    if (idsInOrder.length <= 1) {
      return;
    }

    const updates = idsInOrder.map((id, index) => ({
      id,
      order_index: index,
    }));

    const { success, error: reorderError } = await reorderActionsService(updates);
    if (!success) {
      throw new Error(reorderError?.message ?? 'Failed to reorder actions');
    }

    const orderLookup = new Map(updates.map((item) => [item.id, item.order_index]));
    setActions((prev) =>
      prev.map((action) => {
        if (action.category !== category) {
          return action;
        }
        const newOrder = orderLookup.get(action.id);
        return typeof newOrder === 'number' ? { ...action, order_index: newOrder } : action;
      })
    );
  }, []);

  return {
    actions,
    loading,
    error,
    createAction,
    updateAction,
    deleteAction,
    completeAction,
    reorderActionsByCategory,
    refresh: loadActions,
  };
}
