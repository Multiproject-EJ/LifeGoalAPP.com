"use strict";
// React hook for gamification features
// Manages profile loading, XP earning, notifications, and real-time updates
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGamification = useGamification;
const react_1 = require("react");
const supabaseClient_1 = require("../lib/supabaseClient");
const gamificationPrefs_1 = require("../services/gamificationPrefs");
const gamification_1 = require("../services/gamification");
function useGamification(session) {
    const instanceId = (0, react_1.useRef)(`gamification-${Math.random().toString(36).slice(2)}`);
    const [enabled, setEnabled] = (0, react_1.useState)(true);
    const [profile, setProfile] = (0, react_1.useState)(null);
    const [levelInfo, setLevelInfo] = (0, react_1.useState)(null);
    const [notifications, setNotifications] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [xpToasts, setXpToasts] = (0, react_1.useState)([]);
    const [levelUpEvent, setLevelUpEvent] = (0, react_1.useState)(null);
    const userId = session?.user?.id;
    const refreshEventName = 'gamificationProfileUpdated';
    const broadcastRefresh = (0, react_1.useCallback)(() => {
        if (typeof window === 'undefined' || !userId)
            return;
        window.dispatchEvent(new CustomEvent(refreshEventName, {
            detail: { userId, sourceId: instanceId.current },
        }));
    }, [userId, refreshEventName]);
    const loadGamificationData = (0, react_1.useCallback)(async () => {
        if (!userId)
            return;
        setLoading(true);
        try {
            // Fetch enabled status
            const { data: enabledData } = await (0, gamificationPrefs_1.fetchGamificationEnabled)(userId);
            if (enabledData !== null) {
                setEnabled(enabledData);
            }
            // Fetch profile
            const { data: profileData } = await (0, gamificationPrefs_1.fetchGamificationProfile)(userId);
            if (profileData) {
                setProfile(profileData);
                setLevelInfo((0, gamification_1.getLevelInfo)(profileData.total_xp));
            }
            // Fetch notifications (Supabase only)
            if ((0, supabaseClient_1.canUseSupabaseData)()) {
                const supabase = (0, supabaseClient_1.getSupabaseClient)();
                const { data: notificationsData } = await supabase
                    .from('gamification_notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('is_dismissed', false)
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (notificationsData) {
                    setNotifications(notificationsData);
                }
            }
        }
        catch (error) {
            console.error('Failed to load gamification data:', error);
        }
        finally {
            setLoading(false);
        }
    }, [userId]);
    // Load initial data
    (0, react_1.useEffect)(() => {
        if (!userId) {
            setLoading(false);
            return;
        }
        loadGamificationData();
    }, [userId, loadGamificationData]);
    // Subscribe to real-time notifications (Supabase only)
    (0, react_1.useEffect)(() => {
        if (!userId || !(0, supabaseClient_1.canUseSupabaseData)()) {
            return;
        }
        const supabase = (0, supabaseClient_1.getSupabaseClient)();
        // Subscribe to notifications
        const notificationChannel = supabase
            .channel('gamification_notifications')
            .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'gamification_notifications',
            filter: `user_id=eq.${userId}`,
        }, (payload) => {
            const newNotification = payload.new;
            setNotifications((prev) => [...prev, newNotification]);
        })
            .subscribe();
        return () => {
            supabase.removeChannel(notificationChannel);
        };
    }, [userId]);
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        if (!userId || typeof window === 'undefined') {
            return;
        }
        const handleProfileRefresh = (event) => {
            const payload = event;
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
    // Temporary production timeout mitigation:
    // Automatic/background due-contract RPC sweeps were intentionally removed from
    // global app lifecycle hooks in this file. Due evaluations remain available
    // via Contracts-tab-driven paths.
    const refreshProfile = (0, react_1.useCallback)(async () => {
        await loadGamificationData();
        broadcastRefresh();
    }, [loadGamificationData, broadcastRefresh]);
    const earnXP = (0, react_1.useCallback)(async (xpAmount, sourceType, sourceId, description) => {
        if (!userId || !enabled)
            return;
        const result = await (0, gamification_1.awardXP)(userId, xpAmount, sourceType, sourceId, description);
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
    }, [userId, enabled, refreshProfile]);
    const recordActivity = (0, react_1.useCallback)(async () => {
        if (!userId || !enabled)
            return;
        const result = await (0, gamification_1.updateStreak)(userId);
        if (result.success) {
            // Refresh profile
            await refreshProfile();
        }
        return result;
    }, [userId, enabled, refreshProfile]);
    const dismissNotification = (0, react_1.useCallback)(async (notificationId) => {
        if (!userId)
            return;
        // Update local state immediately
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        // Update in database (Supabase only)
        if ((0, supabaseClient_1.canUseSupabaseData)()) {
            const supabase = (0, supabaseClient_1.getSupabaseClient)();
            await supabase
                .from('gamification_notifications')
                .update({ is_dismissed: true })
                .eq('id', notificationId);
        }
    }, [userId]);
    const dismissXPToast = (0, react_1.useCallback)((toastId) => {
        setXpToasts(prev => prev.filter(toast => toast.id !== toastId));
    }, []);
    const dismissLevelUpEvent = (0, react_1.useCallback)(() => {
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
