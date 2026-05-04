# Planning Guide

A gamified productivity app that uses personality trait cards as a core identity system, creating an emotionally engaging and visually stunning mobile experience where users collect, view, and interact with their character traits like a card game.

**Experience Qualities**:
1. **Premium**: Every interaction should feel polished and high-quality, with smooth animations and satisfying feedback that makes users feel their traits are valuable
2. **Game-like**: The card mechanics should evoke the excitement of opening card packs and managing a collection, with rewarding animations and progression systems
3. **Emotionally Engaging**: Cards represent personal traits, so interactions should feel meaningful and create a sense of ownership and pride in one's character

**Complexity Level**: Light Application (multiple features with basic state)
  - Focuses on a core card interaction system with state management for card collections, selection, and flip states

## Essential Features

### Interactive Card Hand Display
- **Functionality**: Displays 3-7 personality trait cards in a curved fan layout like a poker/card game hand
- **Purpose**: Creates an immediately recognizable game metaphor that makes abstract traits feel tangible and collectible
- **Trigger**: Component mounts with user's trait collection
- **Progression**: Cards appear → arrange in fan → center card highlighted → user can navigate
- **Success criteria**: Cards arrange smoothly in <500ms, center card clearly emphasized, all cards visible and identifiable

### Card Navigation (Swipe/Tap)
- **Functionality**: Swipe left/right or tap to cycle through cards, bringing different cards to center focus
- **Purpose**: Allows users to browse their trait collection in an intuitive, mobile-first way
- **Trigger**: User swipes horizontally or taps a side card
- **Progression**: User swipes → spring animation → cards reposition → new center card scales up → previous center scales down
- **Success criteria**: <200ms response time, smooth 60fps animation, clear visual feedback, works on touch and mouse

### Card Flip Interaction
- **Functionality**: Tap the centered card to flip it, revealing description on back
- **Purpose**: Progressive disclosure - lets users dive deeper into trait details without cluttering the interface
- **Trigger**: User taps the currently centered/active card
- **Progression**: User taps center card → 3D flip animation (rotateY) → back side revealed with description → tap again to flip back
- **Success criteria**: Smooth 3D perspective, readable text on both sides, clear affordance that card is flippable

### New Card Draw Animation
- **Functionality**: When user earns a new trait, card animates in from bottom with dramatic reveal
- **Purpose**: Creates a rewarding moment that celebrates progress and new trait acquisition
- **Trigger**: Call to `drawNewCard(trait)` function from parent component
- **Progression**: Trigger fired → card slides up from bottom → flips mid-air → joins hand → subtle glow/emphasis
- **Success criteria**: Animation feels exciting (1-2s total), card clearly joins collection, doesn't disrupt existing hand

### Personality Test Questionnaire
- **Functionality**: Interactive 8-question personality assessment that determines user's trait card collection
- **Purpose**: Provides personalized trait selection based on user's responses, creating investment in their card collection
- **Trigger**: User clicks floating brain icon button in bottom-right corner
- **Progression**: Button clicked → modal opens → user answers questions with radio options → progress bar updates → calculating animation → results applied to trait collection → success toast
- **Success criteria**: Smooth question transitions, clear progress indication, results feel personalized and accurate, seamless integration with existing card collection

## Edge Case Handling
- **Empty State**: Shows placeholder with encouraging message to earn first trait card
- **Single Card**: Centers the card without rotation, still allows flip interaction
- **Maximum Cards (7+)**: Increases overlap and decreases rotation to fit all cards in viewport
- **Rapid Interactions**: Debounces swipe/tap to prevent animation conflicts and janky behavior
- **Card Draw During Interaction**: Queues the new card draw until current animation completes

## Design Direction

The design should evoke a futuristic card game with holographic elements - think premium mobile games like Hearthstone or Gwent, but with a sleeker, more minimal aesthetic. Users should feel like powerful cards are literally in their hands, with satisfying tactile feedback and magical glow effects that make each trait feel special.

## Color Selection

The color scheme creates depth and premium feel through dark backgrounds with vibrant neon accents based on card rarity, establishing clear visual hierarchy and game-like reward psychology.

- **Primary Color**: Deep space blue `oklch(0.15 0.05 250)` - Creates mysterious, premium backdrop that makes cards pop
- **Secondary Colors**: Dark charcoal `oklch(0.18 0.02 260)` for card backs and UI elements, establishing depth layers
- **Accent Color**: Rarity-based neon glows - Common: `oklch(0.65 0.05 260)` grey, Rare: `oklch(0.65 0.15 240)` blue, Epic: `oklch(0.65 0.20 300)` purple, Legendary: `oklch(0.75 0.18 85)` gold
- **Foreground/Background Pairings**: 
  - Background (Deep space blue #0A0C1D): White text `oklch(0.98 0 0)` - Ratio 13.2:1 ✓
  - Card surface (Dark charcoal #1A1C2E): White text `oklch(0.98 0 0)` - Ratio 11.8:1 ✓
  - Accent glows: Always paired with white or very light text for maximum contrast and readability

## Font Selection

Typefaces should blend futuristic gaming aesthetics with clean readability - think premium sci-fi UI that's still approachable and mobile-friendly.

- **Typographic Hierarchy**: 
  - Card Title (Trait Name): Orbitron Bold / 18px / tight tracking (-0.02em) - futuristic, premium feel
  - Card Description: Inter Regular / 14px / normal tracking / 1.5 line-height - clean readability
  - Level Indicator: Orbitron SemiBold / 12px / uppercase / wide tracking (0.1em)
  - UI Labels: Inter Medium / 13px / subtle weight for secondary info

## Animations

Animations are core to the premium feel - every interaction should have satisfying physics-based motion that feels responsive yet weighty, like handling premium game cards. Use spring animations for card movements (tension: 300, friction: 30), smooth easing for flips (0.6s cubic-bezier), and subtle continuous animations (float, glow pulse) to create life and energy without distraction.

## Component Selection

- **Components**: Custom card component with shadcn Badge for level/rarity indicators, no heavy component dependencies
- **Customizations**: 
  - Custom Card3D component with front/back faces using CSS transforms
  - CardHand container with absolute positioning for fan layout
  - Framer Motion wrapper for all gesture and animation logic
- **States**: 
  - Cards: default (side position, scaled down, rotated, partially hidden), focused (center, scaled up, rotation 0, full visibility), flipped (back face visible)
  - Buttons/interactions: Immediate visual scale feedback on touch, glow intensification on active card
- **Icon Selection**: Phosphor icons for trait symbols - bold weight for visibility, contextual icons (Lightning, Heart, Brain, Sword, Shield, etc.)
- **Spacing**: Tight spacing within cards (p-4), generous negative space around hand (px-6 py-8), card overlap controlled by index (-40px to -60px based on screen size)
- **Mobile**: Cards sized for thumb reach (280px max width), swipe gestures prioritized, touch targets minimum 44px, fan curve optimized for portrait orientation, automatic reflow for landscape
