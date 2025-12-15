# Secret Journal Feature with Self-Destruction Timers

## Overview

The Secret Journal feature provides users with a completely private, ephemeral journaling experience. All content written in secret mode is never saved to the database and automatically self-destructs after a configurable timer expires. This feature is ideal for processing sensitive thoughts, emotional venting, or temporary reflections that users don't want to persist.

## Key Features

### 1. Configurable Self-Destruction Timers

Users can choose between two timer options to match their journaling needs:

- **25 Seconds (Default)**: For quick, immediate thoughts that need to be processed and released rapidly
- **10 Minutes**: For deeper reflection sessions where users need more time to work through their thoughts

### 2. Privacy Guarantees

- **Never Saved**: Content is stored only in component state, never persisted to the database
- **Auto-Destruction**: Content automatically disappears when the timer expires
- **Manual Destruction**: Users can immediately destroy content with the "Destroy now" button
- **Session Reset**: Content is cleared when the editor is closed

### 3. User Interface

#### Timer Configuration
- Radio button selector for choosing between 25-second and 10-minute timers
- Can be changed at any time before content destruction
- Visual indication of selected timer option

#### Timer Display
- Dynamic time formatting:
  - Under 60 seconds: "25s", "10s", etc.
  - 60+ seconds: "10:00", "5:30", "0:45", etc.
- Live countdown updates every second
- Visual styling with red/warning theme to emphasize temporary nature

#### Destruction Controls
- Automatic destruction when timer reaches zero
- Manual "🔥 Destroy now" button for immediate destruction
- Smooth fade-out animation (500ms) when content is destroyed

## How to Use

### Accessing Secret Mode

1. Open the Journal feature
2. Click on the journal type selector
3. Select "Secret" mode
4. The editor opens with the default 25-second timer

### Writing in Secret Mode

1. Choose your preferred timer duration (25 seconds or 10 minutes)
2. Start writing in the text area
3. The countdown begins automatically
4. Write freely knowing your content won't be saved

### Timer Options

#### 25-Second Timer (Default)
- **Best for**: Quick venting, immediate emotional release, rapid brain dumps
- **Use case**: "I need to get this off my chest right now"
- Countdown begins as soon as you open the editor
- Content automatically disappears after 25 seconds

#### 10-Minute Timer
- **Best for**: Extended reflection, processing complex emotions, working through difficult situations
- **Use case**: "I need time to explore these thoughts more deeply"
- Provides 10 minutes (600 seconds) for reflection
- Countdown begins as soon as you select this option
- Display shows "10:00" and counts down to "0:00"

### Switching Timers

You can switch between timer options at any time:
1. Click on a different timer option (25 seconds or 10 minutes)
2. The timer immediately resets to the newly selected duration
3. Your written content remains intact (until you destroy it or the timer expires)

### Manual Destruction

To immediately destroy your content:
1. Click the "🔥 Destroy now" button
2. Content fades out over 500ms
3. Timer resets to the selected duration
4. Text area is cleared and ready for new content

## Technical Implementation

### Component State

The secret mode maintains several state variables in `JournalEntryEditor.tsx`:

```typescript
const [secretText, setSecretText] = useState('');
const [secretTimerDuration, setSecretTimerDuration] = useState(DEFAULT_SECRET_DURATION);
const [secretTimeLeft, setSecretTimeLeft] = useState(DEFAULT_SECRET_DURATION);
const [isFading, setIsFading] = useState(false);
```

### Timer Constants

```typescript
const SECRET_DURATION_25_SECONDS = 25;
const SECRET_DURATION_10_MINUTES = 600; // 10 minutes in seconds
const DEFAULT_SECRET_DURATION = SECRET_DURATION_25_SECONDS;
```

### Timer Logic

1. **Countdown Timer**: Updates every second using `setInterval`
2. **Auto-Destruct**: Triggers when `secretTimeLeft` reaches 0
3. **Manual Destruct**: Can be triggered anytime via the destroy button
4. **Timer Reset**: Occurs when duration is changed or after destruction

### Time Formatting

The timer display uses smart formatting based on remaining time:

```typescript
const formatTimeLeft = (seconds: number): string => {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
};
```

### Data Persistence

Secret mode content is **never** saved to the database:

```typescript
const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // In secret mode, just close the editor without saving
  if (isSecretMode) {
    onClose();
    return;
  }
  onSave(draft);
};
```

## Styling

The secret mode UI uses a distinctive red/warning color scheme to emphasize the temporary nature of the content:

- **Background**: Gradient with red tones (`rgba(239, 68, 68, 0.1)` to `rgba(220, 38, 38, 0.05)`)
- **Text Color**: Warning red (`#dc2626`)
- **Destroy Button**: Red gradient with hover effects
- **Fade Animation**: Smooth opacity and blur transition

## Use Cases

### Emotional Processing
- Quick venting after a frustrating situation (25 seconds)
- Processing grief or difficult emotions (10 minutes)
- Releasing anger or stress without judgment

### Private Thoughts
- Ideas you're not ready to commit to
- Thoughts you want to explore but not save
- Personal reflections you want to keep completely private

### Temporary Brainstorming
- Quick idea capture that may not be valuable later
- Stream-of-consciousness writing
- Exploring thoughts without commitment

## Testing Scenarios

The implementation has been tested for:

1. ✅ **Timer Accuracy**: Both 25-second and 10-minute timers count down correctly
2. ✅ **Timer Switching**: Users can switch between durations without losing content
3. ✅ **Auto-Destruction**: Content automatically disappears when timer reaches zero
4. ✅ **Manual Destruction**: Destroy button immediately clears content
5. ✅ **Session Reset**: Closing and reopening the editor resets everything
6. ✅ **No Persistence**: Content is never saved to the database
7. ✅ **Time Display**: Formatting changes appropriately based on remaining time

## Future Enhancements

Potential improvements for future versions:

1. **Custom Timer Duration**: Allow users to set their own timer duration
2. **Pause/Resume**: Add ability to pause the countdown timer
3. **Sound Alerts**: Optional audio notification before auto-destruction
4. **Timer Presets**: Additional preset options (1 minute, 5 minutes, etc.)
5. **Destruction Confirmation**: Optional confirmation before auto-destruction
6. **Character Counter**: Show how much has been written
7. **Writing Prompts**: Suggest prompts specific to secret/private journaling

## Accessibility

- ✅ Clear visual timer display with `aria-live="polite"` for screen readers
- ✅ Radio buttons properly labeled for keyboard navigation
- ✅ Destroy button has descriptive `aria-label`
- ✅ Color contrast meets WCAG AA standards
- ✅ Keyboard accessible (all controls can be operated without a mouse)

## Privacy & Security

### What is NOT saved:
- ❌ The secret journal content itself
- ❌ Any metadata about when you used secret mode
- ❌ How long you spent writing
- ❌ What timer duration you selected

### What IS saved:
- ✅ Only the fact that you opened the journal editor (standard app analytics)
- ✅ No content or usage patterns from secret mode

## Related Documentation

- [Journal Modes Documentation](./journal-modes.md) - Overview of all journal modes
- [JOURNAL_MODES_IMPLEMENTATION.md](../JOURNAL_MODES_IMPLEMENTATION.md) - Implementation details
- [Journal Feature Documentation](../README.md) - General journal feature documentation
