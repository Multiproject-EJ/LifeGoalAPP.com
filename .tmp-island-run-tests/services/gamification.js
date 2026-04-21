"use strict";
// Core gamification service for XP, levels, achievements, and streaks
// Supports both demo mode (localStorage) and Supabase mode
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateXPForLevel = calculateXPForLevel;
exports.fetchXPTransactions = fetchXPTransactions;
exports.calculateLevelFromXP = calculateLevelFromXP;
exports.getLevelInfo = getLevelInfo;
exports.awardXP = awardXP;
exports.updateStreak = updateStreak;
exports.checkAchievements = checkAchievements;
exports.fetchAchievementsWithProgress = fetchAchievementsWithProgress;
exports.resetXP = resetXP;
const supabaseClient_1 = require("../lib/supabaseClient");
const economy_1 = require("../constants/economy");
const gamification_1 = require("../types/gamification");
const telemetry_1 = require("./telemetry");
const impactTrees_1 = require("./impactTrees");
// =====================================================
// LEVEL CALCULATION FUNCTIONS
// =====================================================
/**
 * Calculate XP required for a specific level
 * Formula: level^1.5 * 1000
 */
function calculateXPForLevel(level) {
    return Math.floor(Math.pow(level, 1.5) * 1000);
}
// =====================================================
// XP TRANSACTION HISTORY
// =====================================================
async function fetchXPTransactions(userId, limit = 6) {
    try {
        if (!(0, supabaseClient_1.canUseSupabaseData)()) {
            const transactions = JSON.parse(localStorage.getItem(gamification_1.DEMO_TRANSACTIONS_KEY) || '[]')
                .filter((transaction) => transaction.user_id === userId)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, limit);
            return { data: transactions, error: null };
        }
        const supabase = (0, supabaseClient_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from('xp_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
        return { data: data ?? [], error: null };
    }
    catch (error) {
        console.error('Failed to fetch XP transactions:', error);
        return {
            data: [],
            error: error instanceof Error ? error.message : 'Unable to load transactions',
        };
    }
}
/**
 * Calculate current level from total XP
 */
function calculateLevelFromXP(totalXP) {
    let level = 1;
    while (calculateXPForLevel(level + 1) <= totalXP) {
        level++;
    }
    return level;
}
/**
 * Get detailed level info including progress to next level
 */
function getLevelInfo(totalXP) {
    const currentLevel = calculateLevelFromXP(totalXP);
    const xpForCurrentLevel = calculateXPForLevel(currentLevel);
    const xpForNextLevel = calculateXPForLevel(currentLevel + 1);
    const xpProgress = totalXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100));
    return {
        currentLevel,
        currentXP: totalXP,
        xpForCurrentLevel,
        xpForNextLevel,
        xpProgress,
        progressPercentage,
    };
}
// =====================================================
// XP AWARD FUNCTION
// =====================================================
/**
 * Award XP to a user, handle level-ups, and check for achievements
 */
async function awardXP(userId, xpAmount, sourceType, sourceId, description) {
    try {
        // Apply XP multiplier from active power-ups (if not from power-up itself)
        let finalXPAmount = xpAmount;
        if (!description?.includes('Power-up:') && !description?.includes('Mystery Chest')) {
            // Dynamically import to avoid circular dependency
            const { getActiveXPMultiplier } = await Promise.resolve().then(() => __importStar(require('./powerUps')));
            const multiplier = await getActiveXPMultiplier(userId);
            finalXPAmount = Math.floor(xpAmount * multiplier);
        }
        // Demo mode
        if (!(0, supabaseClient_1.canUseSupabaseData)()) {
            const result = await awardXPDemo(userId, finalXPAmount, sourceType, sourceId, description);
            if (result.success) {
                void (0, telemetry_1.recordTelemetryEvent)({
                    userId,
                    eventType: 'economy_earn',
                    metadata: {
                        currency: 'xp',
                        xpAmount: finalXPAmount,
                        goldAwarded: (0, economy_1.convertXpToGold)(finalXPAmount),
                        sourceType,
                        sourceId: sourceId ?? null,
                        description: description ?? null,
                    },
                });
            }
            return result;
        }
        // Supabase mode
        const supabase = (0, supabaseClient_1.getSupabaseClient)();
        // Get or create profile
        const { data: profile, error: profileError } = await supabase
            .from('gamification_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        if (profileError)
            throw profileError;
        let currentProfile = profile;
        if (!currentProfile) {
            const { data: newProfile, error: insertError } = await supabase
                .from('gamification_profiles')
                .insert({ user_id: userId })
                .select()
                .single();
            if (insertError)
                throw insertError;
            currentProfile = newProfile;
        }
        const oldXP = currentProfile.total_xp;
        const newXP = oldXP + finalXPAmount;
        const oldLevel = currentProfile.current_level;
        const newLevel = calculateLevelFromXP(newXP);
        const leveledUp = newLevel > oldLevel;
        const goldAwarded = (0, economy_1.convertXpToGold)(finalXPAmount);
        // Update profile
        const { error: updateError } = await supabase
            .from('gamification_profiles')
            .update({
            total_xp: newXP,
            current_level: newLevel,
            total_points: currentProfile.total_points + goldAwarded,
        })
            .eq('user_id', userId);
        if (updateError)
            throw updateError;
        // Log transaction
        await supabase.from('xp_transactions').insert({
            user_id: userId,
            xp_amount: finalXPAmount,
            source_type: sourceType,
            source_id: sourceId || null,
            description: description || null,
        });
        // Create level-up notification if needed
        if (leveledUp) {
            await supabase.from('gamification_notifications').insert({
                user_id: userId,
                notification_type: 'level_up',
                title: `Level ${newLevel} Reached! 🎉`,
                message: `You've reached level ${newLevel}! Keep up the great work!`,
                icon: '🆙',
                xp_reward: 0,
            });
            (0, impactTrees_1.awardLevelUpTreeMilestones)(userId, Array.from({ length: newLevel - oldLevel }, (_, index) => oldLevel + index + 1), new Date());
        }
        // Check for achievement unlocks
        const achievementsUnlocked = await checkAchievements(userId);
        void (0, telemetry_1.recordTelemetryEvent)({
            userId,
            eventType: 'economy_earn',
            metadata: {
                currency: 'xp',
                xpAmount: finalXPAmount,
                goldAwarded,
                sourceType,
                sourceId: sourceId ?? null,
                description: description ?? null,
            },
        });
        return {
            success: true,
            xpAwarded: finalXPAmount,
            newTotalXP: newXP,
            leveledUp,
            oldLevel,
            newLevel,
            achievementsUnlocked,
        };
    }
    catch (error) {
        console.error('Failed to award XP:', error);
        return {
            success: false,
            xpAwarded: 0,
            newTotalXP: 0,
            leveledUp: false,
            oldLevel: 1,
            newLevel: 1,
            achievementsUnlocked: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Demo mode version of awardXP
 */
async function awardXPDemo(userId, xpAmount, sourceType, sourceId, description) {
    // Get current profile
    const profileJson = localStorage.getItem(gamification_1.DEMO_PROFILE_KEY);
    const profile = profileJson ? JSON.parse(profileJson) : {
        total_xp: 0,
        current_level: 1,
        total_points: 0,
        zen_tokens: 0,
    };
    const oldXP = profile.total_xp || 0;
    const newXP = oldXP + xpAmount;
    const oldLevel = profile.current_level || 1;
    const newLevel = calculateLevelFromXP(newXP);
    const leveledUp = newLevel > oldLevel;
    const goldAwarded = (0, economy_1.convertXpToGold)(xpAmount);
    // Update profile
    profile.total_xp = newXP;
    profile.current_level = newLevel;
    profile.total_points = (profile.total_points || 0) + goldAwarded;
    localStorage.setItem(gamification_1.DEMO_PROFILE_KEY, JSON.stringify(profile));
    // Log transaction
    const transactions = JSON.parse(localStorage.getItem(gamification_1.DEMO_TRANSACTIONS_KEY) || '[]');
    transactions.push({
        id: `demo-${Date.now()}`,
        user_id: userId,
        xp_amount: xpAmount,
        source_type: sourceType,
        source_id: sourceId || null,
        description: description || null,
        created_at: new Date().toISOString(),
    });
    localStorage.setItem(gamification_1.DEMO_TRANSACTIONS_KEY, JSON.stringify(transactions));
    if (leveledUp) {
        (0, impactTrees_1.awardLevelUpTreeMilestones)(userId, Array.from({ length: newLevel - oldLevel }, (_, index) => oldLevel + index + 1), new Date());
    }
    return {
        success: true,
        xpAwarded: xpAmount,
        newTotalXP: newXP,
        leveledUp,
        oldLevel,
        newLevel,
        achievementsUnlocked: [],
    };
}
// =====================================================
// STREAK FUNCTIONS
// =====================================================
/**
 * Update user's streak based on daily activity
 */
async function updateStreak(userId) {
    try {
        // Demo mode
        if (!(0, supabaseClient_1.canUseSupabaseData)()) {
            return await updateStreakDemo(userId);
        }
        // Supabase mode
        const supabase = (0, supabaseClient_1.getSupabaseClient)();
        const { data: profile, error: profileError } = await supabase
            .from('gamification_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        if (profileError)
            throw profileError;
        if (!profile) {
            throw new Error('Profile not found');
        }
        const typedProfile = profile;
        const today = new Date().toISOString().split('T')[0];
        const lastActivityDate = typedProfile.last_activity_date;
        // If already active today, no change
        if (lastActivityDate === today) {
            return {
                success: true,
                currentStreak: typedProfile.current_streak,
                longestStreak: typedProfile.longest_streak,
                streakMilestoneReached: false,
                xpAwarded: 0,
            };
        }
        // Calculate new streak
        let newStreak = 1;
        if (lastActivityDate) {
            const lastDate = new Date(lastActivityDate);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                // Consecutive day
                newStreak = typedProfile.current_streak + 1;
            }
            // If diffDays > 1, streak is broken, reset to 1
        }
        const newLongest = Math.max(newStreak, typedProfile.longest_streak);
        let xpAwarded = 0;
        let streakMilestoneReached = false;
        // Check for streak milestones using object mapping
        const STREAK_MILESTONES = {
            7: gamification_1.XP_REWARDS.STREAK_7_DAYS,
            14: gamification_1.XP_REWARDS.STREAK_14_DAYS,
            30: gamification_1.XP_REWARDS.STREAK_30_DAYS,
            100: gamification_1.XP_REWARDS.STREAK_100_DAYS,
        };
        if (newStreak in STREAK_MILESTONES) {
            streakMilestoneReached = true;
            xpAwarded = STREAK_MILESTONES[newStreak];
            // Award XP
            await awardXP(userId, xpAwarded, 'streak_milestone', `${newStreak}_days`);
            // Create notification
            await supabase.from('gamification_notifications').insert({
                user_id: userId,
                notification_type: 'streak_milestone',
                title: `${newStreak}-Day Streak! 🔥`,
                message: `Amazing! You've maintained a ${newStreak}-day streak and earned ${xpAwarded} XP!`,
                icon: '🔥',
                xp_reward: xpAwarded,
            });
        }
        (0, impactTrees_1.awardStreakTreeMilestone)(userId, newStreak, new Date());
        // Update profile
        await supabase
            .from('gamification_profiles')
            .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_activity_date: today,
        })
            .eq('user_id', userId);
        return {
            success: true,
            currentStreak: newStreak,
            longestStreak: newLongest,
            streakMilestoneReached,
            xpAwarded,
        };
    }
    catch (error) {
        console.error('Failed to update streak:', error);
        return {
            success: false,
            currentStreak: 0,
            longestStreak: 0,
            streakMilestoneReached: false,
            xpAwarded: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Demo mode version of updateStreak
 */
async function updateStreakDemo(userId) {
    const profileJson = localStorage.getItem(gamification_1.DEMO_PROFILE_KEY);
    const profile = profileJson ? JSON.parse(profileJson) : {
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: null,
    };
    const today = new Date().toISOString().split('T')[0];
    const lastActivityDate = profile.last_activity_date;
    if (lastActivityDate === today) {
        return {
            success: true,
            currentStreak: profile.current_streak || 0,
            longestStreak: profile.longest_streak || 0,
            streakMilestoneReached: false,
            xpAwarded: 0,
        };
    }
    let newStreak = 1;
    if (lastActivityDate) {
        const lastDate = new Date(lastActivityDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            newStreak = (profile.current_streak || 0) + 1;
        }
    }
    const newLongest = Math.max(newStreak, profile.longest_streak || 0);
    profile.current_streak = newStreak;
    profile.longest_streak = newLongest;
    profile.last_activity_date = today;
    localStorage.setItem(gamification_1.DEMO_PROFILE_KEY, JSON.stringify(profile));
    (0, impactTrees_1.awardStreakTreeMilestone)(userId, newStreak, new Date());
    return {
        success: true,
        currentStreak: newStreak,
        longestStreak: newLongest,
        streakMilestoneReached: false,
        xpAwarded: 0,
    };
}
// =====================================================
// ACHIEVEMENT FUNCTIONS
// =====================================================
/**
 * Check and unlock achievements for a user
 */
async function checkAchievements(userId) {
    // For demo mode, return empty array (simplified)
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return [];
    }
    try {
        const supabase = (0, supabaseClient_1.getSupabaseClient)();
        // Fetch all achievements
        const { data: achievements, error: achievementsError } = await supabase
            .from('achievements')
            .select('*');
        if (achievementsError)
            throw achievementsError;
        if (!achievements || achievements.length === 0) {
            return [];
        }
        // Fetch user's current profile
        const { data: profile } = await supabase
            .from('gamification_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        // Fetch habit count
        const { count: habitsCount } = await supabase
            .from('habits_v2')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('completed', true);
        // Fetch goals count
        const { count: goalsCount } = await supabase
            .from('goals')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status_tag', 'achieved');
        const unlockedAchievements = [];
        for (const achievement of achievements) {
            let progress = 0;
            let qualified = false;
            // Check qualification based on requirement type
            switch (achievement.requirement_type) {
                case 'streak':
                    progress = profile?.current_streak || 0;
                    qualified = (profile?.current_streak || 0) >= achievement.requirement_value;
                    break;
                case 'habits_completed':
                    progress = habitsCount || 0;
                    qualified = (habitsCount || 0) >= achievement.requirement_value;
                    break;
                case 'goals_achieved':
                    progress = goalsCount || 0;
                    qualified = (goalsCount || 0) >= achievement.requirement_value;
                    break;
                case 'journal_entries':
                    // Count all journal entries
                    const { count: journalCount } = await supabase
                        .from('journal_entries')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', userId);
                    progress = journalCount || 0;
                    qualified = (journalCount || 0) >= achievement.requirement_value;
                    break;
                case 'journal_long_entries':
                    // Count journal entries with 500+ words
                    const { data: journalEntries } = await supabase
                        .from('journal_entries')
                        .select('content')
                        .eq('user_id', userId);
                    const longEntries = (journalEntries || []).filter(entry => {
                        const content = entry.content?.trim() || '';
                        const wordCount = content ? content.split(/\s+/).length : 0;
                        return wordCount >= 500;
                    });
                    progress = longEntries.length;
                    qualified = longEntries.length >= achievement.requirement_value;
                    break;
                case 'checkins_completed':
                    const { count: checkinsCount } = await supabase
                        .from('checkins')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', userId);
                    progress = checkinsCount || 0;
                    qualified = (checkinsCount || 0) >= achievement.requirement_value;
                    break;
                case 'vision_uploads':
                    const { count: visionCount } = await supabase
                        .from('vision_images')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', userId);
                    progress = visionCount || 0;
                    qualified = (visionCount || 0) >= achievement.requirement_value;
                    break;
                case 'spins_used':
                    // Count total spins used
                    const { data: spinState } = await supabase
                        .from('daily_spin_state')
                        .select('total_spins_used')
                        .eq('user_id', userId)
                        .maybeSingle();
                    progress = spinState?.total_spins_used || 0;
                    qualified = (spinState?.total_spins_used || 0) >= achievement.requirement_value;
                    break;
                case 'mystery_wins':
                    // Count mystery prize wins
                    const { count: mysteryCount } = await supabase
                        .from('spin_history')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', userId)
                        .eq('prize_type', 'mystery');
                    progress = mysteryCount || 0;
                    qualified = (mysteryCount || 0) >= achievement.requirement_value;
                    break;
                default:
                    // Unknown requirement type, skip
                    continue;
            }
            // Check if user already has this achievement
            const { data: existing } = await supabase
                .from('user_achievements')
                .select('*')
                .eq('user_id', userId)
                .eq('achievement_id', achievement.id)
                .maybeSingle();
            if (existing) {
                // Update progress if not unlocked yet
                if (!existing.unlocked && qualified) {
                    await supabase
                        .from('user_achievements')
                        .update({
                        progress,
                        unlocked: true,
                        unlocked_at: new Date().toISOString(),
                    })
                        .eq('id', existing.id);
                    // Award XP for achievement
                    await awardXP(userId, achievement.xp_reward, 'achievement', achievement.id);
                    // Create notification
                    await supabase.from('gamification_notifications').insert({
                        user_id: userId,
                        notification_type: 'achievement_unlock',
                        title: `Achievement Unlocked! ${achievement.icon}`,
                        message: `${achievement.name}: ${achievement.description}`,
                        icon: achievement.icon,
                        xp_reward: achievement.xp_reward,
                        achievement_id: achievement.id,
                    });
                    unlockedAchievements.push(achievement);
                }
                else if (!existing.unlocked) {
                    // Just update progress
                    await supabase
                        .from('user_achievements')
                        .update({ progress })
                        .eq('id', existing.id);
                }
            }
            else {
                // Create new user achievement record
                await supabase
                    .from('user_achievements')
                    .insert({
                    user_id: userId,
                    achievement_id: achievement.id,
                    progress,
                    unlocked: qualified,
                    unlocked_at: qualified ? new Date().toISOString() : null,
                });
                if (qualified) {
                    // Award XP for achievement
                    await awardXP(userId, achievement.xp_reward, 'achievement', achievement.id);
                    // Create notification
                    await supabase.from('gamification_notifications').insert({
                        user_id: userId,
                        notification_type: 'achievement_unlock',
                        title: `Achievement Unlocked! ${achievement.icon}`,
                        message: `${achievement.name}: ${achievement.description}`,
                        icon: achievement.icon,
                        xp_reward: achievement.xp_reward,
                        achievement_id: achievement.id,
                    });
                    unlockedAchievements.push(achievement);
                }
            }
        }
        return unlockedAchievements;
    }
    catch (error) {
        console.error('Failed to check achievements:', error);
        return [];
    }
}
/**
 * Fetch all achievements with user progress
 */
async function fetchAchievementsWithProgress(userId) {
    try {
        if (!(0, supabaseClient_1.canUseSupabaseData)()) {
            // Demo mode: return empty array for now
            return { data: [], error: null };
        }
        const supabase = (0, supabaseClient_1.getSupabaseClient)();
        // Fetch all achievements
        const { data: achievements, error: achievementsError } = await supabase
            .from('achievements')
            .select('*')
            .order('tier', { ascending: true });
        if (achievementsError)
            throw achievementsError;
        // Fetch user progress
        const { data: userAchievements, error: userError } = await supabase
            .from('user_achievements')
            .select('*')
            .eq('user_id', userId);
        if (userError)
            throw userError;
        // Combine data
        const typedAchievements = (achievements || []);
        const typedUserAchievements = (userAchievements || []);
        const achievementsWithProgress = typedAchievements.map((achievement) => {
            const userAchievement = typedUserAchievements.find((ua) => ua.achievement_id === achievement.id);
            return {
                ...achievement,
                progress: userAchievement?.progress || 0,
                unlocked: userAchievement?.unlocked || false,
                unlocked_at: userAchievement?.unlocked_at || null,
            };
        });
        return { data: achievementsWithProgress, error: null };
    }
    catch (error) {
        console.error('Failed to fetch achievements:', error);
        return {
            data: [],
            error: error instanceof Error ? error : new Error('Unknown error'),
        };
    }
}
// =====================================================
// XP RESET
// =====================================================
/**
 * Resets the user's XP to 0 and current level to 1.
 *
 * This only affects the `gamification_profiles` record (or its demo-mode
 * localStorage equivalent). It does NOT touch journals, habits, streaks,
 * achievements, or any other app data.
 *
 * XP transaction history is intentionally preserved as a historical log.
 */
async function resetXP(userId) {
    try {
        if (!(0, supabaseClient_1.canUseSupabaseData)()) {
            // Demo mode — patch the localStorage profile in place.
            const profileJson = localStorage.getItem(gamification_1.DEMO_PROFILE_KEY);
            const profile = profileJson ? JSON.parse(profileJson) : {};
            profile.total_xp = 0;
            profile.current_level = 1;
            localStorage.setItem(gamification_1.DEMO_PROFILE_KEY, JSON.stringify(profile));
            return { ok: true };
        }
        const supabase = (0, supabaseClient_1.getSupabaseClient)();
        const { error } = await supabase
            .from('gamification_profiles')
            .update({ total_xp: 0, current_level: 1 })
            .eq('user_id', userId);
        if (error)
            throw error;
        return { ok: true };
    }
    catch (error) {
        console.error('Failed to reset XP:', error);
        return {
            ok: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
