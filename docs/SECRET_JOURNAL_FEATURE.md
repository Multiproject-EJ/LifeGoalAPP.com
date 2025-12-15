# Secret Journal Feature Documentation

## Overview

The Secret Journal feature provides users with a private, ephemeral journaling mode where entries automatically self-destruct after 10 minutes. This feature is designed to enhance user privacy and security by ensuring that sensitive thoughts and reflections are never permanently stored.

## Key Features

### 1. **10-Minute Self-Destruct Timer**
- Each secret journal entry has a 10-minute lifespan from creation
- Timer counts down in real-time with MM:SS format display
- Visual countdown indicator shows remaining time

### 2. **Persistent Timer Across Sessions**
- Timer continues even if the user closes and reopens the app
- Entries are stored in browser localStorage with expiration timestamps
- Each entry maintains its own independent timer

### 3. **Auto-Deletion**
- Entries automatically delete when the timer reaches zero
- Smooth fade-out animation when content is destroyed
- Old expired entries are cleaned up automatically

### 4. **Manual Destroy Option**
- Users can manually destroy entries at any time using the "Destroy now" button
- Instant fade-out animation followed by permanent deletion

### 5. **Visual Feedback**
- Urgent state styling when less than 1 minute remains (red pulsing effect)
- Clear notifications about the transient nature of entries
- Real-time countdown display

## User Flow

### Creating a Secret Entry

1. Navigate to the Journal section
2. Select "Secret" mode from the journal type selector
3. Click "+ New entry" button
4. The editor opens with:
   - A notice explaining that nothing is saved permanently
   - A countdown timer showing 10:00 (10 minutes)
   - A text area for writing secret thoughts
   - A "Destroy now" button for immediate deletion

### Writing Secret Content

1. Type your thoughts in the text area
2. Content is automatically saved to temporary storage (localStorage)
3. The timer counts down in the background
4. You can close and reopen the app - the timer will continue from where it left off

### Timer Behavior

- **10:00 to 1:01**: Normal state with standard red timer display
- **1:00 to 0:00**: Urgent state with pulsing animation and stronger visual emphasis
- **0:00**: Automatic fade-out and deletion

### Manual Destruction

1. Click the "🔥 Destroy now" button at any time
2. Content fades out with blur effect (0.5 seconds)
3. Entry is permanently removed from storage
4. Editor returns to clean state

### Closing and Reopening the App

1. Create a secret entry and start writing
2. Close the browser tab or app
3. Reopen the app and navigate back to Journal → Secret mode
4. Click "+ New entry"
5. The timer continues from where it left off based on the original creation time

## Technical Implementation

### Service Layer: `secretJournal.ts`

The service provides the following functions:

```typescript
// Create a new secret entry
createSecretEntry(content: string): SecretJournalEntry

// Get a specific entry by ID
getSecretEntry(id: string): SecretJournalEntry | null

// Get all active (non-expired) entries
getActiveSecretEntries(): SecretJournalEntry[]

// Update entry content
updateSecretEntry(id: string, content: string): SecretJournalEntry | null

// Manually destroy an entry
destroySecretEntry(id: string): void

// Get remaining time in seconds
getRemainingTime(id: string): number

// Format time as MM:SS
formatRemainingTime(seconds: number): string

// Subscribe to timer updates (returns unsubscribe function)
subscribeToEntry(id: string, callback: (remainingSeconds: number) => void): () => void
```

### Data Structure

```typescript
type SecretJournalEntry = {
  id: string;                // Unique identifier
  content: string;           // Entry text
  createdAt: number;         // Unix timestamp (ms)
  expiresAt: number;         // Unix timestamp (ms)
}
```

### Storage

- **Key**: `lifegoalapp-secret-journal-entries`
- **Location**: Browser localStorage
- **Format**: JSON array of SecretJournalEntry objects
- **Cleanup**: Automatic removal of expired entries on each read

### Component Integration: `JournalEntryEditor.tsx`

The editor component:
1. Creates a new secret entry when opening in secret mode
2. Subscribes to timer updates using `subscribeToEntry()`
3. Updates UI every second with remaining time
4. Triggers urgent state when < 60 seconds remain
5. Auto-destroys content when timer reaches 0
6. Saves changes to localStorage on every keystroke

## Security & Privacy

### What is NOT Saved
- Secret entries are NEVER saved to the Supabase database
- No server-side storage of secret content
- No backup or recovery mechanism

### What IS Saved (Temporarily)
- Content is stored in browser localStorage only
- Entries persist for maximum 10 minutes
- Storage is local to the specific browser/device

### User Privacy Considerations
- Users should be aware that localStorage can be accessed by:
  - Browser developer tools (if someone has physical access)
  - Browser extensions with appropriate permissions
  - JavaScript code running on the same domain
- For maximum security, users should:
  - Use private/incognito browsing mode
  - Clear browser data after sensitive journaling
  - Not write extremely sensitive information (e.g., passwords, SSNs)

## Testing Scenarios

### Normal Flow
1. Create a secret entry
2. Write some content
3. Wait for 10 minutes
4. Verify entry auto-deletes

### Manual Destroy
1. Create a secret entry
2. Write some content
3. Click "Destroy now"
4. Verify immediate deletion with fade animation

### App Closure/Reopening
1. Create a secret entry
2. Write some content
3. Note the remaining time (e.g., 8:30)
4. Close the browser tab completely
5. Wait 1 minute
6. Reopen the app and navigate to Journal
7. Open a new secret entry
8. Verify timer shows approximately 7:30 (continuing from before)

### Multiple Entries
1. Create first secret entry (Entry A)
2. Close editor
3. Create second secret entry (Entry B)
4. Both entries should have independent timers
5. Verify Entry A timer is less than Entry B timer

### Urgent State
1. Create a secret entry
2. Wait until < 1 minute remaining (or manually set expiration time for testing)
3. Verify pulsing red animation appears
4. Verify countdown continues to 0:00
5. Verify auto-destruction

### Edge Cases
1. **Corrupted localStorage**: App should handle gracefully and return empty array
2. **Browser back button**: Timer should continue correctly
3. **Multiple browser tabs**: Each tab manages its own timer display but shares localStorage
4. **System clock changes**: Timer is based on system time, so clock changes affect it

## User Interface

### Timer Display
- **Format**: `MM:SS` (e.g., "10:00", "5:43", "0:15")
- **Normal state**: Red text on light red background
- **Urgent state** (< 1 min): Red text with pulsing red border and box-shadow animation

### Notice Banner
```
🔒 Secret mode: Your entry will self-destruct in 10 minutes. 
Close and reopen the app - the timer continues. 
Nothing is saved permanently.
```

### Destroy Button
- Label: "🔥 Destroy now"
- Hover effect: Darker red background with slight upward translation
- Immediate action without confirmation (since content is already ephemeral)

## Future Enhancements

Potential improvements for future versions:

1. **Pause Timer**: Allow users to pause/resume the countdown
2. **Adjustable Duration**: Let users choose 5, 10, 15, or 30-minute timers
3. **Notification on Expiry**: Browser notification when entry is about to expire
4. **Auto-save Drafts**: Optionally save to permanent storage before destruction
5. **Encrypted Storage**: Encrypt localStorage content for additional security
6. **Timer Extension**: "Add 5 more minutes" button before expiration
7. **Entry History Count**: Show how many secret entries were created/destroyed
8. **Write-Only Mode**: Option to prevent re-reading content after writing

## Accessibility

- Timer has `aria-live="polite"` for screen reader announcements
- All interactive elements are keyboard accessible
- Color contrast meets WCAG AA standards
- Focus states clearly visible on all buttons

## Browser Compatibility

Works in all modern browsers that support:
- localStorage API
- ES6+ JavaScript features
- CSS animations and transitions

Tested in:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## FAQ

**Q: What happens if I accidentally close the browser?**
A: The timer continues! When you reopen the app, the countdown picks up where it left off.

**Q: Can I recover a secret entry after it's destroyed?**
A: No. Secret entries are permanently deleted with no recovery option.

**Q: Is the content encrypted?**
A: Currently, content is stored in plain text in localStorage. For maximum security, use private browsing mode.

**Q: Can I have multiple secret entries at once?**
A: Yes, each entry has its own independent 10-minute timer.

**Q: What if my system clock changes?**
A: Since the timer is based on system timestamps, changing your clock will affect the countdown.

**Q: Does the timer continue if I switch to a different tab?**
A: Yes, the timer runs based on timestamps, not active JavaScript intervals.
