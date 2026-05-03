# Treasure Dig Bingo - Mobile Casual Excavation Game

A mobile-first React + TypeScript mini-game where players excavate hidden treasures by breaking tiles with limited tools. **Built as a transplantable feature module ready for PWA integration** with flexible prop models, lifecycle callbacks, and layout customization options.

**Experience Qualities**:
1. **Satisfying** - Every tap should feel rewarding with smooth animations, satisfying tile-break feedback, and delightful sparkle effects when uncovering treasures
2. **Approachable** - Clean, intuitive interface with large touch targets and clear visual hierarchy that makes the game mechanics immediately understandable
3. **Progressive** - Gradually increasing challenge across levels with new object patterns, blockers, and tighter tool budgets that create engaging difficulty curves

**Complexity Level**: Light Application (multiple features with basic state)
The game includes multiple interconnected features (level progression, tile states, object detection, tool management, rewards) with persistent game state, but maintains focused scope as a single-purpose mini-game suitable for embedding in a larger PWA.

## Essential Features

### Tile Breaking System
- **Functionality**: Player taps tiles to reveal what's underneath using hammer tools
- **Purpose**: Core interaction loop that drives discovery and strategic decision-making
- **Trigger**: Player taps any unrevealed tile on the board
- **Progression**: Tap tile → Tool count decreases → Breaking animation plays → Tile reveals content (empty/object/blocker) → Check for object completion → Check win/lose conditions
- **Success criteria**: Tile transitions smoothly through states (hidden → breaking → revealed), tool count updates, revealed content is visually distinct

### Hidden Object Detection
- **Functionality**: Multi-tile objects are placed on the board; when all tiles of an object are revealed, it's collected
- **Purpose**: Creates goal-oriented gameplay and satisfying completion moments
- **Trigger**: Any tile reveal that completes all cells of a hidden object
- **Progression**: Tile revealed → Check all objects → If object fully revealed → Play collection animation → Add to collected count → Check level completion
- **Success criteria**: Objects defined by shape patterns in config, detection works for any orientation/placement, visual celebration on collection

### Level Progression
- **Functionality**: 5+ distinct levels with varying board sizes (5x5 to 7x7), object patterns, and tool budgets
- **Purpose**: Maintains engagement through variety and escalating challenge
- **Trigger**: Player completes current level by revealing all required objects
- **Progression**: All objects collected → Level complete animation → Reward popup displays → Player taps "Next Level" → New level loads with fresh board
- **Success criteria**: Levels load from configuration data, difficulty increases, player can progress through all levels, state persists

### Tool Management
- **Functionality**: Limited hammer count that depletes with each tile break
- **Purpose**: Creates strategic tension and loss condition
- **Trigger**: Each tile break action
- **Progression**: Tool count displayed → Player breaks tile → Count decreases → Visual feedback on low tools → If zero before completion → Lose state triggers → Restart option shown
- **Success criteria**: Clear tool counter display, visual warning at low count, lose state prevents further play, restart restores level

### Reward & Milestone System
- **Functionality**: Progress header showing current level and milestone rewards (treasure chests)
- **Purpose**: Provides progression feedback and goal visualization
- **Trigger**: Level completion
- **Progression**: Level complete → Check milestones → If milestone reached → Special reward animation → Mock reward popup → Stats update
- **Success criteria**: Milestones visible in header, rewards feel special, callbacks fire for parent app integration

## Edge Case Handling

- **Rapid Tapping**: Debounce tile taps to prevent double-breaks and animation conflicts
- **Empty Boards**: Ensure at least one object per level; validate configuration on load
- **Impossible Levels**: Validate that tool count is sufficient for minimum completion path
- **Object Overlap**: Configuration validation prevents objects from overlapping in placement
- **Browser Refresh**: Game state persists using useKV so players don't lose progress
- **Small Screens**: Responsive grid sizing ensures playability on devices as small as 320px width

## Design Direction

The design should evoke a **cheerful archaeological adventure** - like discovering treasures in a whimsical dig site. The aesthetic balances playful casualness with polished refinement, using soft rounded shapes, warm earthy tones with pops of treasure-gold, and satisfying tactile interactions that feel like unearthing something special. Every interaction should feel like a small celebration.

## Color Selection

A warm, earthy palette with vibrant accent colors that reinforce the treasure-hunting theme while maintaining excellent readability on mobile.

- **Primary Color**: Deep Terracotta `oklch(0.48 0.12 35)` - Represents earth/dig site, grounds the interface with warmth and adventure
- **Secondary Colors**: 
  - Sandy Beige `oklch(0.88 0.03 75)` - Background tiles, creates soft canvas for the board
  - Rich Earth Brown `oklch(0.35 0.06 45)` - Borders and structural elements
- **Accent Color**: Treasure Gold `oklch(0.75 0.15 85)` - CTAs, rewards, object reveals - creates excitement and value perception
- **Foreground/Background Pairings**:
  - Background (Light Sand #F5F1E8): Dark text `oklch(0.25 0.02 45)` - Ratio 11.2:1 ✓
  - Primary (Terracotta): White text `oklch(1 0 0)` - Ratio 5.8:1 ✓
  - Accent (Gold): Dark brown text `oklch(0.25 0.06 45)` - Ratio 8.4:1 ✓
  - Tile Hidden (Warm Gray): Mid text `oklch(0.45 0.02 50)` - Ratio 4.6:1 ✓

## Font Selection

Typefaces should convey playful energy while maintaining clarity for quick mobile gameplay.

- **Primary Font**: Fredoka (Google Fonts) - Rounded, friendly sans-serif that feels approachable and game-like without being childish
- **Secondary Font**: Inter (already available) - For numerical displays and small UI text where clarity is paramount

- **Typographic Hierarchy**:
  - H1 (Level Title): Fredoka Bold/32px/tight letter-spacing (-0.5px) - Used sparingly for level complete screens
  - H2 (HUD Labels): Fredoka Medium/18px/normal - Tool count, level number
  - H3 (Popups): Fredoka Medium/24px/tight (-0.3px) - Reward dialogs
  - Body (Instructions): Inter Regular/14px/relaxed (0.02em) - Any helper text
  - Numbers (Counters): Fredoka Bold/20px/tabular-nums - Tool count, level display

## Animations

Animations should create satisfying feedback loops that reinforce successful actions without delaying gameplay. The motion language is **bouncy and celebratory** for positive events (reveals, completions) and **quick and snappy** for functional transitions.

Key animation moments:
- **Tile Break**: Scale down + rotate slightly (100ms) → reveal content with spring bounce (200ms)
- **Object Collection**: Collected tiles pulse with gold glow, then fly up to counter (400ms ease-out)
- **Tool Use**: Hammer icon bounces on tap (150ms)
- **Level Complete**: Confetti burst + board fade out + reward popup slide up (600ms choreographed)
- **Low Tools Warning**: Gentle shake on tool counter when ≤2 remaining (300ms)

All interactive elements use subtle scale transforms on press (95%) to reinforce tactility.

## Component Selection

- **Components**:
  - `Card` - For HUD panels (level info, tool counter) with subtle shadows for depth
  - `Dialog` - Reward popups, level complete screens, game over states
  - `Button` - Primary actions (Next Level, Restart) with `variant="default"` for primary, `variant="outline"` for secondary
  - `Progress` - Milestone indicator bar in header
  - `Badge` - Level number chip, object counter badges
  
- **Customizations**:
  - Custom `<TileGrid>` component using CSS Grid with dynamic columns based on board size
  - Custom `<Tile>` component with state-based styling (hidden/breaking/revealed variants)
  - Custom `<ObjectIcon>` component for rendering discovered treasures
  - Custom `<ProgressMilestones>` component showing treasure chest icons at key levels
  
- **States**:
  - Tiles: Idle (hidden pattern), Active (pressed scale), Breaking (animated), Revealed (static with content)
  - Buttons: Clear pressed states with 95% scale and slight shadow reduction
  - Dialogs: Slide up from bottom on mobile, scale from center on larger screens
  
- **Icon Selection**:
  - Hammer (tool): `@phosphor-icons/react` - `Hammer` (filled variant)
  - Treasure: `Coin`, `Diamond`, `Crown` for different object types
  - Blockers: `Warning`, `X` for hazards
  - Rewards: `Sparkle`, `Trophy`, `Star`
  - Actions: `ArrowClockwise` (restart), `ArrowRight` (next)
  
- **Spacing**:
  - HUD padding: `p-4` (16px) on mobile, `p-6` (24px) on tablet+
  - Grid gap: `gap-2` (8px) on small boards, `gap-1.5` (6px) on 7x7
  - Section spacing: `space-y-4` between major UI sections
  - Tile padding: Equal on all sides calculated dynamically based on viewport
  
- **Mobile**:
  - Single column layout with fixed header, scrollable center board (if needed), fixed footer tools
  - Board scales to fit viewport width minus safe margins (16px each side)
  - Minimum tile size: 48px for touch target accessibility
  - Dialogs: Full-width on mobile (<640px), max-w-md on larger screens
  - Font sizes: Increase by 10% on very small screens (<375px) for critical info

## PWA Integration Features

### Wrapper Props Model
The feature accepts external state control through `wrapperProps`:
- **playerToolCount**: Override internal tool management with parent app's resource system
- **currentLevel**: Set starting level from user's saved progress
- **rewardTheme**: Match reward visuals to parent app's currency ('coins', 'gems', 'stars')
- **islandTheme**: Customize visual aesthetics to match parent app theme ('tropical', 'desert', 'forest')

### Integration Callbacks
Lifecycle hooks for parent app integration:
- **onSpendTool(remaining)**: Fires when player uses a tool - sync to backend/update UI
- **onFinishLevel(levelId, success)**: Called when level completes or fails - save progress
- **onExitFeature()**: User requests to leave game - navigate back to parent app
- **onLevelComplete(result)**: Legacy callback with full result object
- **onRewardEarned(reward)**: Distribute rewards to user account
- **onProgressSync(state)**: Periodic state backup to backend

### Layout Customization
Flexible rendering options for embedding:
- **compactMode**: Mobile-optimized spacing for constrained viewports (modals, drawers, tabs)
- **showDefaultHUD**: Toggle built-in header (false if using custom HUD)
- **showDefaultToolbar**: Toggle built-in footer (false if using app's navigation)
- **customHUD**: Pass custom React component to replace default header
- **customToolbar**: Pass custom React component to replace default footer
- **maxWidth/maxHeight**: CSS constraints for container sizing

### State Management Modes
Three integration patterns supported:
1. **Self-contained**: Feature manages all state internally (default)
2. **Parent-controlled tools**: Parent provides tool count, feature notifies on spend
3. **Full external state**: Parent controls tools AND level progression via props + callbacks

### Migration-Ready Architecture
- All components in `/src/treasure-dig` folder - copy as single unit
- No hard dependencies on parent app structure
- Uses standard shadcn components (portable across projects)
- CSS custom properties for easy theme matching
- TypeScript interfaces exported for parent app type safety
