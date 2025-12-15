# Secret Journal Quick Start Guide

## What is Secret Journal?

Secret Journal is a privacy-focused journaling mode where your entries automatically self-destruct after **10 minutes**. Perfect for processing difficult emotions, working through sensitive thoughts, or simply getting things off your chest without permanent storage.

## Quick Start

### 1. Access Secret Mode
- Open the **Journal** section in the app
- Select **"Secret"** from the journal type selector at the top
- Click **"+ New entry"**

### 2. Write Your Thoughts
- A 10-minute countdown timer appears (starts at `10:00`)
- Type anything you need to express
- Your content is saved locally but will self-destruct automatically

### 3. Timer Continues Across Sessions
- Close the app? The timer keeps running!
- Reopen the app and you'll see the countdown continuing from where it left off
- This uses browser localStorage with expiration timestamps

### 4. Auto-Destruct
- When the timer hits `0:00`, your entry fades out and is permanently deleted
- No recovery option - it's gone forever!

### 5. Manual Destroy (Optional)
- Don't want to wait? Click **"🔥 Destroy now"** at any time
- Immediate fade-out animation and deletion

## Visual Indicators

### Normal State (10:00 to 1:01)
- Red countdown timer
- Light red background
- Steady display

### Urgent State (1:00 to 0:00)
- **Pulsing red animation**
- Stronger border
- Visual emphasis that time is running out

### Auto-Destruct
- Smooth fade-out animation with blur effect
- Content becomes progressively transparent
- Permanent deletion after animation

## Important Notes

⚠️ **Privacy Considerations**
- Content is stored in browser localStorage (NOT encrypted)
- Can be accessed via browser dev tools if someone has physical access
- For maximum privacy, use private/incognito browsing mode

⚠️ **What is NOT Saved**
- Secret entries are NEVER sent to the server
- No Supabase database storage
- No backup or recovery mechanism

✅ **What IS Saved (Temporarily)**
- Content stored locally in your browser only
- Maximum lifespan: 10 minutes
- Automatically cleaned up when expired

## Testing the Feature

### Test 1: Basic Flow
1. Create a secret entry
2. Type some text
3. Watch the countdown
4. Wait for auto-destruct (or use destroy button)

### Test 2: Persistence
1. Create a secret entry with text
2. Note the remaining time (e.g., 8:30)
3. Close the browser tab completely
4. Wait 30 seconds
5. Reopen the app → Navigate to Journal → Create new secret entry
6. Timer should show approximately 8:00 (continuing from before)

### Test 3: Multiple Entries
1. Create first entry → Close editor
2. Create second entry → Each has independent timer
3. Verify both continue counting down separately

### Test 4: Manual Destroy
1. Create entry with some text
2. Click "Destroy now" button
3. Watch fade-out animation
4. Content is immediately deleted

## Manual Test Suite

We've included a standalone test page for developers:
- Open `test-secret-journal.html` in your browser
- No server required!
- Tests all core functionality:
  - Entry creation
  - Timer countdown
  - Persistence simulation
  - Manual destroy
  - Multiple entries
  - Live editor simulation

## Use Cases

✍️ **Emotional Processing**
- Work through difficult feelings
- No permanent record of raw emotions
- Safe space for honesty

🤔 **Decision Making**
- Brain dump all considerations
- Think through pros/cons
- No commitment to keeping the record

💭 **Stream of Consciousness**
- Free-form writing without consequences
- Capture fleeting thoughts
- No editing or judgment

🔐 **Sensitive Topics**
- Process sensitive information
- No digital footprint
- Peace of mind about privacy

## FAQ

**Q: What happens if I refresh the page?**
A: The timer continues! Content is in localStorage, not component state.

**Q: Can I pause the timer?**
A: Not currently. The timer runs continuously based on timestamps.

**Q: Can I extend the time?**
A: Not in the current version. It's fixed at 10 minutes.

**Q: What if I want to keep the entry?**
A: Before the timer expires, copy the text and create a regular journal entry.

**Q: Is it really secure?**
A: Content is in plain text localStorage. For sensitive data, use private browsing mode.

**Q: Can I have multiple secret entries?**
A: Yes! Each entry has its own independent 10-minute timer.

## Technical Details

For developers and technical users:

- **Storage**: Browser localStorage
- **Key**: `lifegoalapp-secret-journal-entries`
- **Format**: JSON array of entries
- **Timer**: Based on Unix timestamps (ms)
- **Duration**: 600,000ms (10 minutes)
- **Update Frequency**: Every 1 second
- **Cleanup**: Automatic on each read operation

## Feedback & Support

For feature requests or issues:
- Check the full documentation: `docs/SECRET_JOURNAL_FEATURE.md`
- Test with the manual test suite: `test-secret-journal.html`
- Report bugs via GitHub issues

---

**Remember**: Secret journal entries are intentionally ephemeral. Use them for processing, not for keeping records!
