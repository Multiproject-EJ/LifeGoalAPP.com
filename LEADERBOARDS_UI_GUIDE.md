# Leaderboards UI Documentation

## Overview
The Leaderboards feature provides competitive rankings across multiple categories and time periods, implemented as part of Phase 2 Gamification.

## UI Components

### 1. Leaderboard Button in Gamification Header
**Location:** `src/components/GamificationHeader.tsx`

A new button has been added next to the Level badge:
- **Icon:** 🏆
- **Label:** "Leaderboards"
- **Sub-label:** "Compete"
- **Action:** Opens the leaderboards modal overlay

### 2. Leaderboards Modal
**Component:** `src/features/gamification/Leaderboards.tsx`

Full-screen modal overlay with:

#### Header Section
- **Title:** "🏆 Leaderboards"
- **Close Button:** X button (top-right)
- **Refresh Button:** Manual refresh with loading state

#### Scope Tabs
Three tabs for time period selection:
- **All-Time** - Lifetime rankings
- **Weekly** - Current week rankings (Monday-Sunday)
- **Monthly** - Current month rankings

Active tab is highlighted with:
- Purple color (#667eea)
- Purple background tint
- Bottom border accent

#### Category Selector
Dropdown menu with 5 options:
1. 🆙 Highest Level
2. 💰 Most XP
3. 🔥 Longest Streak
4. 🏆 Most Achievements
5. 💎 Most Points

#### Leaderboard Table

**Header Row:**
- Rank (centered)
- User (left-aligned)
- Score (right-aligned with category icon)

**Data Rows:**
Each row displays:
- Rank number (#1, #2, etc.)
- Username
- Score (formatted with locale thousands separator)

**Special Features:**

1. **Top 3 Podium Positions:**
   - Rank #1: 🥇 Gold medal + gold gradient background
   - Rank #2: 🥈 Silver medal + silver gradient background
   - Rank #3: 🥉 Bronze medal + bronze gradient background
   - Left border accent in matching color

2. **Current User Highlight:**
   - Purple gradient background
   - Purple left border
   - Bold font weight
   - "(You)" badge next to username

3. **Hover Effects:**
   - Light gray background on row hover
   - Smooth transition animation

#### Load More Button
- Appears when 50+ entries exist
- Loads additional 50 entries per click
- Centered below table

#### User Rank Card (Sticky)
**Displays when user is outside top 50:**
- Position: Sticky at bottom of modal
- Purple gradient background
- Shows: "Your Rank: #127 | 💰 450"
- Format: Rank number, divider, category icon + score

#### Friend Leaderboard Placeholder
Info box at bottom:
- Dashed border
- Light purple tint
- Text: "👥 Friend Leaderboards coming soon!"
- Description: "Add friends to compete with people you know."

### 3. Leaderboard Preview Widget
**Component:** `src/features/gamification/LeaderboardPreview.tsx`

Mini dashboard widget showing top 5:
- Compact row format
- Rank (with medals for top 3)
- Username
- Score (right-aligned in purple)
- "View Full Leaderboard" button at bottom

Can be embedded in dashboard cards.

## Visual Design

### Color Scheme
- **Primary Purple:** #667eea to #764ba2 gradient
- **Gold (1st place):** #FFD700
- **Silver (2nd place):** #C0C0C0
- **Bronze (3rd place):** #CD7F32
- **Current User:** Purple gradient with #667eea accent

### Typography
- **Header Title:** 1.75rem, bold
- **Tab Text:** 0.875rem, semi-bold
- **Rank Numbers:** Bold, large for emphasis
- **Usernames:** 0.875-1rem, semi-bold
- **Scores:** 1.125rem, bold

### Spacing & Layout
- **Modal Max Width:** 900px
- **Padding:** 1.5rem standard, 1rem on mobile
- **Row Height:** Comfortable spacing for readability
- **Grid Layout:** 80px | 1fr | 150px (rank | user | score)

### Responsive Design
**Desktop (>768px):**
- Full width modal with max-width constraint
- Three-column grid layout
- Side-by-side tabs

**Tablet (≤768px):**
- Reduced padding
- Narrower rank column (60px)
- Smaller score column (100px)

**Mobile (≤480px):**
- Stacked header elements
- Category selector takes full width
- Reduced font sizes
- Smaller badges

## Interactions

### Opening Leaderboards
1. User clicks 🏆 button in gamification header
2. Modal overlay fades in with backdrop blur
3. Leaderboards component loads with default scope (All-Time) and category (XP)

### Switching Scopes
1. User clicks a tab (All-Time/Weekly/Monthly)
2. Active tab highlights
3. Loading spinner appears
4. New data fetches and populates table
5. User rank card updates if applicable

### Changing Categories
1. User selects from dropdown
2. Loading state activates
3. Table re-renders with new rankings
4. Score column header updates with category icon

### Loading More Results
1. User clicks "Load More" button
2. Button shows loading state
3. Additional 50 entries append to table
4. Button disappears if no more data

### Refreshing Data
1. User clicks 🔄 Refresh button
2. Button text changes to "🔄 Refreshing..."
3. Server recalculates rankings
4. Table updates with fresh data
5. Button returns to normal state

### Closing Modal
1. User clicks X button, or
2. User clicks outside modal on backdrop
3. Modal fades out
4. Returns to main view

## Prize Distribution

### Automatic Awards
- **Weekly:** Checked every Monday at 00:01 UTC
- **Monthly:** Checked on 1st of month at 00:01 UTC
- **Client-side:** Prize check runs on component mount

### Prize Notification
When prizes are distributed:
1. XP is automatically added via `awardXP()` service
2. Entry created in `leaderboard_rewards` table
3. User sees XP gain in their profile
4. Badge (if applicable) awarded for rank #1-3

## Demo Mode

In demo mode (localStorage-based):
- Generates 50-100 mock users with realistic names
- User's actual stats determine their rank among mock data
- Scores scale relative to user's performance
- All features functional without backend
- Data cached in localStorage per scope/category/period

## Accessibility

- **Keyboard Navigation:** Tab through buttons and dropdowns
- **Screen Readers:** Proper ARIA labels on interactive elements
- **Focus Indicators:** Visible focus outlines
- **Color Contrast:** WCAG AA compliant text contrast
- **Responsive Touch:** Large touch targets on mobile

## Database Integration

### Tables Used
- `leaderboard_entries`: Rankings by scope/category/period
- `leaderboard_rewards`: Prize award records
- `gamification_profiles`: User stats (level, XP, streak, points)
- `user_achievements`: Achievement counts

### Period Keys
- All-time: `'all_time'`
- Weekly: `'2026-W01'` (ISO week)
- Monthly: `'2026-01'` (YYYY-MM)

### Ranking Calculation
Handled by `refresh_leaderboard_entries()` PostgreSQL function:
1. Deletes old entries for scope/period/category
2. Queries gamification_profiles for scores
3. Orders by score descending
4. Assigns ranks with ROW_NUMBER()
5. Handles ties appropriately
6. Limits to top 1000 per category

## Future Enhancements (Phase 3)

1. **Friend Leaderboards:**
   - Filter by friend connections
   - Private competitions

2. **Achievement Integration:**
   - "Top 10 Finish" achievement
   - "Leaderboard Champion" for #1 rank
   - "Podium Finisher" for top 3

3. **Advanced Filters:**
   - Country/region filtering
   - Age group brackets
   - Team leaderboards

4. **Live Updates:**
   - Real-time rank changes
   - WebSocket updates
   - Animated position shifts
