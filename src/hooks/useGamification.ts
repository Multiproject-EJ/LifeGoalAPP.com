// React hook for gamification features
// Manages profile loading, XP earning, notifications, and real-time updates

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, canUseSupabaseData } from '../lib/supabaseClient';
import type {
  GamificationProfile,
  GamificationNotification,
  LevelInfo,
} from '../types/gamification';
import {
  fetchGamificationProfile,
  fetchGamificationEnabled,
} from '../services/gamificationPrefs';
import {
  awardXP,
  updateStreak,
  getLevelInfo,
} from '../services/gamification';

export function useGamification(session: Session | null) {
  const instanceId = useRef(`gamification-${Math.random().toString(36).slice(2)}`);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [notifications, setNotifications] = useState<GamificationNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [xpToasts, setXpToasts] = useState<Array<{
    id: string;
    amount: number;
    source?: string;
    celebration?: string;
  }>>([]);
  const [levelUpEvent, setLevelUpEvent] = useState<{ newLevel: number; xp: number } | null>(null);

  const userId = session?.user?.id;
  const refreshEventName = 'gamificationProfileUpdated';

  const broadcastRefresh = useCallback(() => {
    if (typeof window === 'undefined' || !userId) return;
    window.dispatchEvent(
      new CustomEvent(refreshEventName, {
        detail: { userId, sourceId: instanceId.current },
      })
    );
  }, [userId, refreshEventName]);

  const loadGamificationData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    try {
      // Fetch enabled status
      const { data: enabledData } = await fetchGamificationEnabled(userId);
      if (enabledData !== null) {
        setEnabled(enabledData);
      }

      // Fetch profile
      const { data: profileData } = await fetchGamificationProfile(userId);
      if (profileData) {
        setProfile(profileData);
        setLevelInfo(getLevelInfo(profileData.total_xp));
      }

      // Fetch notifications (Supabase only)
      if (canUseSupabaseData()) {
        const supabase = getSupabaseClient();
        const { data: notificationsData } = await supabase
          .from('gamification_notifications')
          .select('*')
          .eq('user_id', userId)
          .eq('is_dismissed', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (notificationsData) {
          setNotifications(notificationsData as GamificationNotification[]);
        }
      }
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load initial data
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadGamificationData();
  }, [userId, loadGamificationData]);

  // Subscribe to real-time notifications (Supabase only)
  useEffect(() => {
    if (!userId || !canUseSupabaseData()) {
      return;
    }

    const supabase = getSupabaseClient();

    // Subscribe to notifications
    const notificationChannel = supabase
      .channel('gamification_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gamification_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as GamificationNotification;
          setNotifications((prev) => [...prev, newNotification]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') {
      return;
    }

    const handleSpinComplete = () => {
      loadGamificationData();
    };

    window.addEventListener('dailySpinComplete', handleSpinComplete);

    return () => {
      window.removeEventListener('dailySpinComplete', handleSpinComplete);
    };
  }, [userId, loadGamificationData]);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') {
      return;
    }

    const handleProfileRefresh = (event: Event) => {
      const payload = event as CustomEvent<{ userId?: string; sourceId?: string }>;
      if (!payload.detail || payload.detail.userId !== userId) {
        return;
      }
      if (payload.detail.sourceId === instanceId.current) {
        return;
      }
      void loadGamificationData();
    };

    window.addEventListener(refreshEventName, handleProfileRefresh);
    return () => {
      window.removeEventListener(refreshEventName, handleProfileRefresh);
    };
  }, [userId, loadGamificationData, refreshEventName]);

  const refreshProfile = useCallback(async () => {
    await loadGamificationData();
    broadcastRefresh();
  }, [loadGamificationData, broadcastRefresh]);

  const earnXP = useCallback(
    async (xpAmount: number, sourceType: string, sourceId?: string, description?: string) => {
      if (!userId || !enabled) return;

      const result = await awardXP(userId, xpAmount, sourceType, sourceId, description);

      if (result.success) {
        // Add XP toast notification
        const toastId = `xp-${Date.now()}`;
        const celebration = result.leveledUp ? '🎉🥳✨' : undefined;
        setXpToasts(prev => [
          ...prev,
          { id: toastId, amount: xpAmount, source: sourceType, celebration },
        ]);
        
        // Trigger level-up event if applicable
        if (result.leveledUp && result.newLevel) {
          setLevelUpEvent({ newLevel: result.newLevel, xp: xpAmount });
        }
        
        // Refresh profile
        await refreshProfile();
      }

      return result;
    },
    [userId, enabled, refreshProfile]
  );

  const recordActivity = useCallback(async () => {
    if (!userId || !enabled) return;

    const result = await updateStreak(userId);

    if (result.success) {
      // Refresh profile
      await refreshProfile();
    }

    return result;
  }, [userId, enabled, refreshProfile]);

  const dismissNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      // Update local state immediately
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      // Update in database (Supabase only)
      if (canUseSupabaseData()) {
        const supabase = getSupabaseClient();
        await supabase
          .from('gamification_notifications')
          .update({ is_dismissed: true })
          .eq('id', notificationId);
      }
    },
    [userId]
  );

  const dismissXPToast = useCallback((toastId: string) => {
    setXpToasts(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  const dismissLevelUpEvent = useCallback(() => {
    setLevelUpEvent(null);
  }, []);

  return {
    enabled,
    profile,
    levelInfo,
    notifications,
    loading,
    earnXP,
    recordActivity,
    dismissNotification,
    dismissXPToast,
    xpToasts,
    levelUpEvent,
    dismissLevelUpEvent,
    refreshProfile,
  };
}
