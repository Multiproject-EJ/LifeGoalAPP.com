# Testing Guide: Inline Habits Submenu

## Feature Overview
The QuickActionsFAB launcher's "✅" button now opens an inline submenu showing today's habits, allowing users to quickly check them off without navigating away from their current page.

## Prerequisites for Testing
1. User must be logged in (not in demo mode for full functionality)
2. User should have at least one habit created
3. Application should be running in development or production mode

## Test Scenarios

### Test 1: Opening the Habits Submenu
**Steps:**
1. Navigate to any page in the application
2. Look for the floating action button (FAB) in the bottom-right corner (✨ icon)
3. Click the FAB to expand the menu
4. Click the "✅" (Check off habit) button

**Expected Result:**
- An inline submenu appears to the left of the button
- Submenu animates smoothly (fade in + slide from right)
- Loading indicator (⏳) appears briefly while habits are being fetched

### Test 2: Viewing Habits List (With Habits)
**Prerequisites:** User has at least one habit

**Steps:**
1. Follow Test 1 to open the submenu
2. Wait for loading to complete

**Expected Result:**
- Submenu shows "TODAY'S HABITS:" header
- Each habit appears as a button with:
  - Checkbox icon (☐ for unchecked, ✅ for checked)
  - Habit name
- Habits are displayed in a scrollable list (max 400px height)
- Completed habits have a green background gradient
- Hovering over a habit shows a border highlight and slight slide effect

### Test 3: Viewing Empty State
**Prerequisites:** User has no habits created

**Steps:**
1. Follow Test 1 to open the submenu
2. Wait for loading to complete

**Expected Result:**
- Submenu shows "TODAY'S HABITS:" header
- Empty state message appears:
  - "No habits scheduled for today."
  - "Add habits to your goals to track them here."
- No habit items are displayed

### Test 4: Checking Off a Habit
**Prerequisites:** User has at least one unchecked habit

**Steps:**
1. Follow Test 1 to open the submenu
2. Click on an unchecked habit (☐ icon)

**Expected Result:**
1. Checkbox immediately changes to loading (⏳)
2. Habit button shows disabled state
3. After successful save:
   - Checkbox changes to checked (✅)
   - Background changes to green gradient
   - Border appears in green

### Test 5: Unchecking a Habit
**Prerequisites:** User has at least one checked habit

**Steps:**
1. Follow Test 1 to open the submenu
2. Click on a checked habit (✅ icon)

**Expected Result:**
1. Checkbox immediately changes to loading (⏳)
2. Habit button shows disabled state
3. After successful save:
   - Checkbox changes to unchecked (☐)
   - Background reverts to default
   - Green border disappears

### Test 6: Closing the Submenu
**Steps:**
1. Follow Test 1 to open the submenu
2. Try each of these methods to close:
   a. Click outside the submenu
   b. Click the main FAB button (✨)
   c. Click another action button (📔 or 🤖)

**Expected Result:**
- Submenu closes smoothly (fade out + slide right)
- User remains on the same page (no navigation)
- FAB returns to closed state

### Test 7: Multiple Rapid Clicks
**Steps:**
1. Follow Test 1 to open the submenu
2. Rapidly click a habit multiple times before it finishes saving

**Expected Result:**
- Only one save operation occurs (duplicate prevention)
- Habit shows loading state throughout
- Final state reflects the intended completion status

### Test 8: Reopening the Submenu
**Steps:**
1. Follow Test 1 to open and interact with habits
2. Close the submenu
3. Open it again by clicking the ✅ button

**Expected Result:**
- Submenu opens immediately (no loading on second open)
- Habits show current completion status
- All previously checked habits remain checked

### Test 9: Dark Theme Compatibility
**Steps:**
1. Switch to "Dark Glass" theme (or "Midnight Purple")
2. Follow Test 1 to open the submenu

**Expected Result:**
- Submenu has appropriate dark theme styling
- Text is readable with good contrast
- Hover effects work correctly
- Animations are smooth

### Test 10: Long Habit Names
**Prerequisites:** User has a habit with a very long name

**Steps:**
1. Follow Test 1 to open the submenu
2. Observe how long habit names are displayed

**Expected Result:**
- Long habit names are truncated with ellipsis (...)
- Hover shows full name (if tooltip is implemented)
- Layout doesn't break
- All habits fit within the submenu width

### Test 11: Many Habits (Scrolling)
**Prerequisites:** User has more than 10 habits

**Steps:**
1. Follow Test 1 to open the submenu
2. Try to scroll within the submenu

**Expected Result:**
- Submenu shows scrollbar (or scrollable area)
- Can scroll to see all habits
- Header stays visible while scrolling
- Scroll behavior is smooth

### Test 12: No Navigation Occurs
**Steps:**
1. Note your current page/URL
2. Follow Test 1 to open the submenu
3. Check off some habits
4. Close the submenu

**Expected Result:**
- URL remains the same throughout
- No page refresh or navigation
- User stays on the same view
- All other page content remains intact

## Visual Checklist

When testing, verify these visual elements:

**FAB Button:**
- [ ] Visible in bottom-right corner
- [ ] Has gradient background
- [ ] Shows ✨ icon
- [ ] Hover effect works (slight scale up)
- [ ] Click animation works (rotation when open)

**Action Buttons:**
- [ ] Fan out smoothly when FAB opens
- [ ] Each has distinct color
- [ ] Labels appear on hover
- [ ] ✅ button is green (#10b981)

**Habits Submenu:**
- [ ] Appears to the left of ✅ button
- [ ] Has white/dark background (theme-dependent)
- [ ] Has rounded corners (16px)
- [ ] Has shadow effect
- [ ] Animates smoothly (200ms)

**Habit Items:**
- [ ] Have rounded corners (10px)
- [ ] Show checkbox on left
- [ ] Show habit name on right
- [ ] Hover effect: border highlight + slide left
- [ ] Completed: green gradient background
- [ ] Loading: spinner emoji, disabled
- [ ] Proper spacing between items

## Performance Checklist

- [ ] Submenu opens quickly (< 200ms)
- [ ] Habits load within 1-2 seconds
- [ ] Animations are smooth (60fps)
- [ ] No lag when checking/unchecking
- [ ] No memory leaks (test with dev tools)
- [ ] Works with 50+ habits

## Accessibility Checklist

- [ ] Buttons have proper aria-labels
- [ ] Loading state is announced
- [ ] Checkbox state changes are announced
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG standards

## Browser Compatibility

Test in these browsers:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Known Limitations

1. **Habits are not automatically refreshed**: If you add a new habit in another tab, you need to close and reopen the submenu to see it
2. **Mobile viewport**: FAB is hidden on very small screens (< 720px) as per existing design
3. **Offline mode**: Requires online connection for initial load and saves

## Debugging Tips

**If habits don't load:**
- Check browser console for errors
- Verify user is authenticated
- Check network tab for API calls
- Ensure Supabase is configured

**If checkbox doesn't toggle:**
- Check console for save errors
- Verify database permissions
- Check if habit still exists
- Look for duplicate call prevention logs

**If styling looks wrong:**
- Clear browser cache
- Check if CSS file loaded
- Verify theme is applied
- Check for CSS conflicts

## Reporting Issues

When reporting issues, please include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots/video if possible
5. Console errors if any
6. Network requests if relevant
