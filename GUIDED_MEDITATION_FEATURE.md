# Guided Meditation Feature Documentation

## Overview

The Guided Meditation feature provides a text-based meditation experience integrated into the Breathing Space tab. This feature allows users to engage with progressively revealed meditation content at their own pace, with customizable reveal modes and durations.

## Features

### 1. Meditation Content Library

The feature includes:
- **4 Complete Meditations:**
  - "Attempting to Stay With the Breath" - Focus on breath awareness
  - "Body Scan: Gentle Awareness" - Progressive body relaxation
  - "Brief Loving-Kindness Practice" - Compassion meditation
  - "Arriving in the Present Moment" - Grounding practice

- **4 Placeholder Meditations** (for future content):
  - Mountain Meditation
  - Walking Meditation
  - Sound Meditation
  - Gratitude Practice

### 2. Reveal Modes

Users can choose how meditation text is revealed:

- **Word Mode**: Reveals one word at a time (minimum 1 second per word)
  - Best for: Rhythmic grounding and focused attention
  - Pacing: Faster, more concentrated

- **Sentence Mode** (Default): Reveals one sentence at a time (minimum 2 seconds per sentence)
  - Best for: Readable, reflective engagement
  - Pacing: Balanced between detail and flow

- **Paragraph Mode**: Reveals one paragraph at a time (minimum 3 seconds per paragraph)
  - Best for: Deeper reflection and integration
  - Pacing: Slower, more contemplative

### 3. Duration Options

Users can select from three meditation durations:
- **2 minutes**: Quick reset or introduction
- **5 minutes**: Standard practice session
- **10 minutes**: Extended practice

### 4. Time-Based Pacing

The system automatically distributes meditation content across the selected duration:
- **90% of time**: Progressive text reveal
- **10% of time**: Silent reflection period at the end
- Gentle pauses between chunks (500ms-1500ms based on mode)
- Minimum time per chunk ensures comfortable reading pace

### 5. Session Controls

- **Start**: Begin meditation from the beginning
- **Pause**: Freeze progress at current point
- **Resume**: Continue from where paused
- **Restart**: Reset entire session (text, timer, progress)

### 6. Auto-Restart Behavior

Changing any of these settings automatically restarts the session:
- Meditation selection
- Duration
- Reveal mode

This ensures users always start fresh with their chosen configuration.

## User Interface

### Main Controls Section
Located in the "Guided Meditations" section:
- Meditation dropdown selector
- Duration dropdown (2/5/10 minutes)
- Reveal mode dropdown (Word/Sentence/Paragraph)
- "Begin Meditation" button
- Theme preview showing meditation description

### Meditation Player Modal
When a meditation is active:
- Title and theme at the top
- Large centered text area displaying current chunk
- Timer countdown (MM:SS format)
- Progress bar showing session completion
- Chunk counter (e.g., "15 of 45")
- Control buttons (Start/Pause/Resume/Restart/Complete)

## Technical Implementation

### Component Architecture

```
BreathingSpace (Parent)
├── Guided Meditation Controls
│   ├── Meditation Selector
│   ├── Duration Selector
│   └── Reveal Mode Selector
└── GuidedMeditationPlayer (Modal)
    ├── Header (Title + Theme)
    ├── Text Display Area
    ├── Timer & Progress
    └── Control Buttons
```

### Key Files

- **src/types/meditation.ts**: TypeScript type definitions
- **src/data/meditationContent.ts**: Meditation library and text processing utilities
- **src/features/meditation/GuidedMeditationPlayer.tsx**: Core player component
- **src/features/meditation/GuidedMeditationPlayer.css**: Player styling
- **src/features/meditation/BreathingSpace.tsx**: Integration with Breathing Space
- **src/features/meditation/BreathingSpace.css**: Additional UI styles

### Text Processing

The `splitIntoChunks()` function in `meditationContent.ts` handles text segmentation:
- **Word mode**: Splits by whitespace
- **Sentence mode**: Splits by sentence-ending punctuation (., !, ?)
- **Paragraph mode**: Splits by double newlines

### Timing Algorithm

1. Calculate total duration in milliseconds
2. Reserve 10% for silence period
3. Divide content duration by number of chunks
4. Apply minimum time per chunk based on reveal mode
5. Add inter-chunk pause duration
6. Use the maximum of calculated and minimum time

### State Management

The player maintains several state variables:
- `chunks`: Array of text segments
- `currentChunkIndex`: Current position in meditation
- `isRunning`: Whether meditation is active
- `isPaused`: Whether meditation is paused
- `isComplete`: Whether meditation has finished
- `timeElapsed`: Milliseconds elapsed since start

### Session Tracking

Completed meditations are saved to the database:
- Session type: 'guided'
- Duration in seconds
- User ID
- Completion status

## Accessibility Features

- Keyboard navigable controls
- ARIA labels on interactive elements
- Reduced motion support for animations
- High contrast text display
- Focus management for modal

## Mobile Responsiveness

- Adaptive layouts for different screen sizes
- Touch-friendly button sizes
- Readable text sizes across devices
- Optimized spacing for mobile viewing

## Theme Support

The feature supports all existing app themes:
- Dark Glass theme
- Bright Sky theme
- Consistent with existing design system
- Gradient backgrounds and glows

## Future Enhancements

Potential additions for future releases:
1. User-created custom meditations
2. Audio guidance option
3. Background ambient sounds
4. Meditation history and favorites
5. Guided breathing visualization during silence
6. Progress tracking and streaks
7. Shareable meditation sessions

## Usage Example

1. Navigate to Breathing Space tab
2. Select a meditation from the dropdown
3. Choose desired duration (2, 5, or 10 minutes)
4. Select reveal mode (Sentence recommended for beginners)
5. Click "Begin Meditation"
6. Follow the text as it appears
7. Use Pause/Resume as needed
8. Complete or close when finished

## Design Philosophy

The guided meditation feature is designed with these principles:
- **Non-judgmental**: Users are invited to "try" rather than achieve
- **Gentle pacing**: Encourages mindfulness without rushing
- **Present-focused**: One chunk visible at a time
- **Accessible**: Simple controls, clear feedback
- **Calming aesthetics**: Minimal visual clutter, soothing colors
