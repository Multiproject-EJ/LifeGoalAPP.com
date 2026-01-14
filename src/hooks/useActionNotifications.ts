// src/hooks/useActionNotifications.ts

import { useEffect, useCallback, useRef } from 'react';
import type { Action } from '../types/actions';

interface ActionNotification {
  id: string;
  actionId: string;
  type: 'expiring_soon' | 'expired' | 'migrated' | 'deleted';
  message: string;
  actionTitle: string;
  timestamp: Date;
}

interface UseActionNotificationsOptions {
  actions: Action[];
  onNotification?: (notification: ActionNotification) => void;
  checkIntervalMs?: number;
}

/**
 * Hook to monitor actions and trigger notifications for:
 * - Actions expiring within 24 hours
 * - Actions that have expired
 * - Actions that were migrated to projects
 */
export function useActionNotifications({
  actions,
  onNotification,
  checkIntervalMs = 60000, // Check every minute
}: UseActionNotificationsOptions) {
  const notifiedActionsRef = useRef<Set<string>>(new Set());

  const checkForNotifications = useCallback(() => {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const action of actions) {
      // Skip MUST DO actions (they don't expire)
      if (action.category === 'must_do') continue;
      
      // Skip completed actions
      if (action.completed) continue;

      const expiresAt = new Date(action.expires_at);
      const notificationKey = `${action.id}-${action.expires_at}`;

      // Check if expiring within 24 hours (but not yet expired)
      if (expiresAt > now && expiresAt <= twentyFourHoursFromNow) {
        const warningKey = `${notificationKey}-warning`;
        if (!notifiedActionsRef.current.has(warningKey)) {
          notifiedActionsRef.current.add(warningKey);
          
          const hoursLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          onNotification?.({
            id: warningKey,
            actionId: action.id,
            type: 'expiring_soon',
            message: `"${action.title}" expires in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`,
            actionTitle: action.title,
            timestamp: now,
          });
        }
      }

      // Check if expired
      if (expiresAt <= now) {
        const expiredKey = `${notificationKey}-expired`;
        if (!notifiedActionsRef.current.has(expiredKey)) {
          notifiedActionsRef.current.add(expiredKey);
          
          const notificationType = action.category === 'project' ? 'migrated' : 'deleted';
          const message = action.category === 'project'
            ? `"${action.title}" has been migrated to Projects`
            : `"${action.title}" has been removed (expired)`;
          
          onNotification?.({
            id: expiredKey,
            actionId: action.id,
            type: notificationType,
            message,
            actionTitle: action.title,
            timestamp: now,
          });
        }
      }
    }
  }, [actions, onNotification]);

  useEffect(() => {
    // Check immediately on mount and when actions change
    checkForNotifications();

    // Set up interval for periodic checks
    const interval = setInterval(checkForNotifications, checkIntervalMs);

    return () => clearInterval(interval);
  }, [checkForNotifications, checkIntervalMs]);

  // Clean up old notification keys when actions are removed
  useEffect(() => {
    const currentActionIds = new Set(actions.map((a) => a.id));
    
    for (const key of notifiedActionsRef.current) {
      const actionId = key.split('-')[0];
      if (!currentActionIds.has(actionId)) {
        notifiedActionsRef.current.delete(key);
      }
    }
  }, [actions]);

  return {
    checkNow: checkForNotifications,
  };
}
